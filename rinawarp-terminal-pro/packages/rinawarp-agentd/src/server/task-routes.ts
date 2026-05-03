import http from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addTask, clearPid, clearState, isPidAlive, readPid, writePid, writeState } from "../daemon/state.js";
import { validateTaskPayload } from "../daemon/task-contracts.js";
import { getWorkspaceRegion } from "../platform/regions.js";
import { appendRemoteRunLog, cancelRemoteRun, createRemoteRun, getRemoteRun, listRemoteRuns, resumeRemoteRun } from "../platform/remoteRuns.js";
import { enqueueRuntimeTask, getRuntimeTask, listRuntimeTasks } from "../platform/runtime.js";
import { readJson, sendJson } from "./response-helpers.js";

type WorkspaceRole = "owner" | "admin" | "member";
type WorkspaceRoleGuard = (
  req: http.IncomingMessage,
  workspaceId: string,
  minRole: WorkspaceRole,
) => { actorId: string; actorEmail: string; role: WorkspaceRole };
type Soc2Logger = (args: {
  req: http.IncomingMessage;
  workspaceId?: string;
  action: string;
  result: string;
  details?: Record<string, unknown>;
}) => void;
type WorkspacePublisher = (event: {
  workspace_id: string;
  type: string;
  payload: Record<string, unknown>;
  version?: number;
}) => Promise<unknown>;

function daemonRunnerPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, "..", "daemon", "runner.js");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startDaemonProcess(): Promise<{ ok: boolean; alreadyRunning?: boolean; pid?: number; error?: string }> {
  const existingPid = readPid();
  if (existingPid && isPidAlive(existingPid)) {
    return { ok: true, alreadyRunning: true, pid: existingPid };
  }
  const child = spawn(process.execPath, [daemonRunnerPath()], {
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      RINAWARP_AGENT_MODE: "daemon",
    },
  });
  child.unref();
  if (typeof child.pid !== "number") {
    return { ok: false, error: "failed to spawn daemon process" };
  }
  await sleep(250);
  if (!isPidAlive(child.pid)) {
    return { ok: false, error: "daemon process exited immediately" };
  }
  const now = new Date().toISOString();
  writePid(child.pid);
  writeState({
    version: 1,
    pid: child.pid,
    port: Number(process.env.RINAWARP_AGENTD_PORT || 5055),
    mode: "local",
    startedAt: now,
    updatedAt: now,
  });
  return { ok: true, alreadyRunning: false, pid: child.pid };
}

function stopDaemonProcess(): { ok: boolean; pid?: number; stale?: boolean; error?: string } {
  const pid = readPid();
  if (!pid) return { ok: true, stale: true };
  if (!isPidAlive(pid)) {
    clearPid();
    clearState();
    return { ok: true, stale: true, pid };
  }
  try {
    process.kill(pid, "SIGTERM");
    clearPid();
    clearState();
    return { ok: true, pid };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, pid, error: message };
  }
}

export async function handleTaskRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  deps: {
    ensureWorkspaceRole: WorkspaceRoleGuard;
    logSoc2: Soc2Logger;
    publishWorkspaceEvent: WorkspacePublisher;
  },
): Promise<boolean> {
  if (req.method === "POST" && url.pathname === "/v1/daemon/start") {
    const start = await startDaemonProcess();
    if (!start.ok) {
      sendJson(res, 500, { ok: false, error: start.error || "failed to start daemon" });
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      started: !start.alreadyRunning,
      alreadyRunning: !!start.alreadyRunning,
      pid: start.pid ?? null,
    });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/v1/daemon/stop") {
    const stop = stopDaemonProcess();
    if (!stop.ok) {
      sendJson(res, 500, { ok: false, error: stop.error || "failed to stop daemon" });
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      stopped: !stop.stale,
      stale: !!stop.stale,
      pid: stop.pid ?? null,
    });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/v1/daemon/tasks") {
    const body = (await readJson(req)) as { type?: string; payload?: Record<string, unknown>; maxAttempts?: number } | null;
    const type = String(body?.type || "").trim();
    const payload = (body?.payload && typeof body.payload === "object" ? body.payload : {}) as Record<string, unknown>;
    if (!type) {
      sendJson(res, 400, { ok: false, error: "type is required" });
      return true;
    }
    const validationError = validateTaskPayload(type, payload);
    if (validationError) {
      sendJson(res, 400, { ok: false, error: validationError });
      return true;
    }
    const maxAttempts = body?.maxAttempts;
    if (maxAttempts !== undefined && (!Number.isFinite(maxAttempts) || maxAttempts < 1)) {
      sendJson(res, 400, { ok: false, error: "maxAttempts must be >= 1 when provided" });
      return true;
    }
    const task = addTask({ type, payload, maxAttempts });
    sendJson(res, 200, { ok: true, task });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/v1/remote-runs") {
    const body = (await readJson(req)) as {
      workspace_id?: string;
      type?: string;
      payload?: Record<string, unknown>;
    } | null;
    const run = createRemoteRun({
      workspace_id: body?.workspace_id,
      type: String(body?.type || "generic"),
      payload: body?.payload || {},
    });
    deps.logSoc2({
      req,
      workspaceId: run.workspace_id,
      action: "remote_run_create",
      result: "ok",
      details: { run_id: run.id, type: run.type },
    });
    sendJson(res, 200, { ok: true, run });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/v1/remote-runs") {
    const workspaceId = String(url.searchParams.get("workspace_id") || "").trim();
    const status = String(url.searchParams.get("status") || "").trim() as "queued" | "running" | "completed" | "failed" | "canceled";
    const limit = Number(url.searchParams.get("limit") || 100);
    const runs = listRemoteRuns({
      ...(workspaceId ? { workspace_id: workspaceId } : {}),
      ...(status ? { status } : {}),
      ...(Number.isFinite(limit) ? { limit } : {}),
    });
    sendJson(res, 200, { ok: true, runs });
    return true;
  }

  const remoteRunMatch = url.pathname.match(/^\/v1\/remote-runs\/([^/]+)$/);
  if (req.method === "GET" && remoteRunMatch) {
    const runId = decodeURIComponent(remoteRunMatch[1] || "");
    const run = getRemoteRun(runId);
    if (!run) {
      sendJson(res, 404, { ok: false, error: "not_found" });
      return true;
    }
    sendJson(res, 200, { ok: true, run });
    return true;
  }

  const remoteRunCancelMatch = url.pathname.match(/^\/v1\/remote-runs\/([^/]+)\/cancel$/);
  if (req.method === "POST" && remoteRunCancelMatch) {
    const runId = decodeURIComponent(remoteRunCancelMatch[1] || "");
    const run = cancelRemoteRun(runId);
    if (!run) {
      sendJson(res, 404, { ok: false, error: "not_found" });
      return true;
    }
    deps.logSoc2({
      req,
      workspaceId: run.workspace_id,
      action: "remote_run_cancel",
      result: "ok",
      details: { run_id: run.id },
    });
    sendJson(res, 200, { ok: true, run });
    return true;
  }

  const remoteRunResumeMatch = url.pathname.match(/^\/v1\/remote-runs\/([^/]+)\/resume$/);
  if (req.method === "POST" && remoteRunResumeMatch) {
    const runId = decodeURIComponent(remoteRunResumeMatch[1] || "");
    const run = resumeRemoteRun(runId);
    if (!run) {
      sendJson(res, 404, { ok: false, error: "not_found" });
      return true;
    }
    deps.logSoc2({
      req,
      workspaceId: run.workspace_id,
      action: "remote_run_resume",
      result: "ok",
      details: { run_id: run.id, attempts: run.attempts },
    });
    sendJson(res, 200, { ok: true, run });
    return true;
  }

  const remoteRunLogsMatch = url.pathname.match(/^\/v1\/remote-runs\/([^/]+)\/logs$/);
  if (req.method === "POST" && remoteRunLogsMatch) {
    const runId = decodeURIComponent(remoteRunLogsMatch[1] || "");
    const body = (await readJson(req)) as { line?: string } | null;
    const run = appendRemoteRunLog(runId, String(body?.line || ""));
    if (!run) {
      sendJson(res, 404, { ok: false, error: "not_found" });
      return true;
    }
    sendJson(res, 200, { ok: true, run });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/v1/runtime/tasks") {
    const body = (await readJson(req)) as {
      workspace_id?: string;
      command?: string;
      requested_region?: string;
      allow_cross_region?: boolean;
      max_attempts?: number;
      initial_delay_sec?: number;
      timeout_sec?: number;
    } | null;
    const workspaceId = String(body?.workspace_id || "").trim();
    const command = String(body?.command || "").trim();
    if (!workspaceId || !command) {
      sendJson(res, 400, { ok: false, error: "workspace_id and command are required" });
      return true;
    }
    deps.ensureWorkspaceRole(req, workspaceId, "member");
    const homeRegion = getWorkspaceRegion(workspaceId);
    const requestedRegion = String(body?.requested_region || homeRegion).trim() || homeRegion;
    const allowCrossRegion = body?.allow_cross_region === true;
    if (requestedRegion !== homeRegion && !allowCrossRegion) {
      sendJson(res, 403, {
        ok: false,
        error: "cross_region_execution_disabled",
        workspace_region: homeRegion,
        requested_region: requestedRegion,
      });
      return true;
    }
    const task = enqueueRuntimeTask({
      workspace_id: workspaceId,
      workspace_region: homeRegion,
      requested_region: requestedRegion,
      command,
      max_attempts: Number(body?.max_attempts || 0) || undefined,
      initial_delay_sec: Number(body?.initial_delay_sec || 0) || undefined,
      timeout_sec: Number(body?.timeout_sec || 0) || undefined,
    });
    deps.logSoc2({
      req,
      workspaceId,
      action: "runtime_task_enqueue",
      result: "ok",
      details: { task_id: task.id, workspace_region: homeRegion, requested_region: requestedRegion },
    });
    await deps.publishWorkspaceEvent({
      workspace_id: workspaceId,
      type: "runtime_task_enqueued",
      payload: { task_id: task.id, requested_region: requestedRegion, workspace_region: homeRegion },
    });
    sendJson(res, 200, { ok: true, task });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/v1/runtime/tasks") {
    const workspaceId = String(url.searchParams.get("workspace_id") || "").trim();
    if (workspaceId) deps.ensureWorkspaceRole(req, workspaceId, "member");
    const tasks = listRuntimeTasks(workspaceId || undefined);
    sendJson(res, 200, { ok: true, tasks });
    return true;
  }

  const runtimeTaskMatch = url.pathname.match(/^\/v1\/runtime\/tasks\/([^/]+)$/);
  if (req.method === "GET" && runtimeTaskMatch) {
    const id = decodeURIComponent(runtimeTaskMatch[1] || "");
    const task = getRuntimeTask(id);
    if (!task) {
      sendJson(res, 404, { ok: false, error: "not_found" });
      return true;
    }
    deps.ensureWorkspaceRole(req, task.workspace_id, "member");
    sendJson(res, 200, { ok: true, task });
    return true;
  }

  return false;
}
