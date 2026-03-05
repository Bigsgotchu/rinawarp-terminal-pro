import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { paths } from "../daemon/state.js";

export type RemoteRunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "canceled";

export type RemoteRunRecord = {
  id: string;
  workspace_id: string;
  type: string;
  payload: Record<string, unknown>;
  status: RemoteRunStatus;
  logs: string[];
  created_at: string;
  updated_at: string;
  attempts: number;
};

type RemoteRunRegistry = {
  version: 1;
  runs: RemoteRunRecord[];
  updated_at: string;
};

function stateFile(): string {
  return path.join(paths().baseDir, "remote-runs.json");
}

function defaultRegistry(): RemoteRunRegistry {
  return {
    version: 1,
    runs: [],
    updated_at: new Date().toISOString(),
  };
}

function readRegistry(): RemoteRunRegistry {
  const fp = stateFile();
  if (!fs.existsSync(fp)) return defaultRegistry();
  try {
    const raw = fs.readFileSync(fp, "utf8");
    const parsed = JSON.parse(raw) as RemoteRunRegistry;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.runs)) return defaultRegistry();
    return {
      version: 1,
      runs: parsed.runs,
      updated_at: String(parsed.updated_at || new Date().toISOString()),
    };
  } catch {
    return defaultRegistry();
  }
}

function writeRegistry(next: RemoteRunRegistry): void {
  const fp = stateFile();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

export function createRemoteRun(input: {
  workspace_id?: string;
  type: string;
  payload?: Record<string, unknown>;
}): RemoteRunRecord {
  const now = new Date().toISOString();
  const registry = readRegistry();
  const run: RemoteRunRecord = {
    id: `rr_${randomUUID()}`,
    workspace_id: String(input.workspace_id || "ws_local").trim() || "ws_local",
    type: String(input.type || "").trim() || "generic",
    payload: input.payload || {},
    status: "queued",
    logs: [],
    created_at: now,
    updated_at: now,
    attempts: 0,
  };
  registry.runs.push(run);
  registry.updated_at = now;
  writeRegistry(registry);
  return run;
}

export function listRemoteRuns(args?: {
  workspace_id?: string;
  status?: RemoteRunStatus;
  limit?: number;
}): RemoteRunRecord[] {
  const registry = readRegistry();
  const workspace = String(args?.workspace_id || "").trim();
  const status = String(args?.status || "").trim();
  const limit = Number.isFinite(args?.limit) ? Math.max(1, Math.min(500, Number(args?.limit))) : 100;
  return registry.runs
    .filter((run) => (workspace ? run.workspace_id === workspace : true))
    .filter((run) => (status ? run.status === status : true))
    .slice(-limit)
    .reverse();
}

export function getRemoteRun(id: string): RemoteRunRecord | null {
  const key = String(id || "").trim();
  if (!key) return null;
  const registry = readRegistry();
  return registry.runs.find((run) => run.id === key) || null;
}

export function cancelRemoteRun(id: string): RemoteRunRecord | null {
  const key = String(id || "").trim();
  if (!key) return null;
  const registry = readRegistry();
  const idx = registry.runs.findIndex((run) => run.id === key);
  if (idx < 0) return null;
  const current = registry.runs[idx];
  const next: RemoteRunRecord = {
    ...current,
    status: "canceled",
    updated_at: new Date().toISOString(),
  };
  registry.runs[idx] = next;
  registry.updated_at = next.updated_at;
  writeRegistry(registry);
  return next;
}

export function resumeRemoteRun(id: string): RemoteRunRecord | null {
  const key = String(id || "").trim();
  if (!key) return null;
  const registry = readRegistry();
  const idx = registry.runs.findIndex((run) => run.id === key);
  if (idx < 0) return null;
  const current = registry.runs[idx];
  const next: RemoteRunRecord = {
    ...current,
    status: "queued",
    attempts: Number(current.attempts || 0) + 1,
    updated_at: new Date().toISOString(),
  };
  registry.runs[idx] = next;
  registry.updated_at = next.updated_at;
  writeRegistry(registry);
  return next;
}

export function appendRemoteRunLog(id: string, line: string): RemoteRunRecord | null {
  const key = String(id || "").trim();
  if (!key) return null;
  const registry = readRegistry();
  const idx = registry.runs.findIndex((run) => run.id === key);
  if (idx < 0) return null;
  const current = registry.runs[idx];
  const logLine = String(line || "").trim();
  if (!logLine) return current;
  const next: RemoteRunRecord = {
    ...current,
    logs: [...current.logs, logLine].slice(-500),
    updated_at: new Date().toISOString(),
  };
  registry.runs[idx] = next;
  registry.updated_at = next.updated_at;
  writeRegistry(registry);
  return next;
}
