/**
 * This is the core: plan endpoint, execute endpoint, cancel, stream.
 */
import http from "node:http";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ExecutionEngine } from "@rinawarp/core/enforcement/index.js";
import { createStandardRegistry } from "@rinawarp/core/tools/registry.js";
import { executeViaEngine } from "@rinawarp/core/adapters/unify-execution.js";
import type { ConfirmationToken, ExecutionReport, LicenseTier, PlanStep as CorePlanStep, ToolEvent } from "@rinawarp/core/enforcement/types.js";
import { normalizeProjectRoot } from "./projectRoot.js";
import { requireAuth } from "./auth.js";
import { handlePreflight, setCors } from "./cors.js";
import { sseInit, sseSend } from "./streaming.js";
import { resolveRequestLicense } from "./license.js";
import type { AgentPlanRequest, ExecutePlanRequest, CancelRequest, AgentPlan, PlanStep, Risk } from "./types.js";
import { addTask, clearPid, clearState, isPidAlive, paths, readPid, readState, readTaskRegistry, writePid, writeState } from "./daemon/state.js";
import { validateTaskPayload } from "./daemon/task-contracts.js";
import {
  createIssueToPrWorkflow,
  queueRevisionFromReview,
  readWorkspaceGraph,
  recordCiStatus,
  recordPullRequestStatus,
} from "./orchestrator/workspaceGraph.js";
import { createPullRequest } from "./orchestrator/githubAdapter.js";
import { createOrSwitchBranch, currentBranch, ensureGitRepo } from "./orchestrator/gitProvider.js";
import {
  acceptInvite,
  createInvite,
  createWorkspace,
  getAuditRetentionConfig,
  getSyncState,
  getWorkspace,
  listInvites,
  lockWorkspace,
  queryAudit,
  revokeInvite,
  rotateInviteSecurityKeys,
  runAuditCleanup,
  setAuditRetentionConfig,
  setBillingEnforcement,
  syncPull,
  syncPush,
  unlockWorkspace,
  updateInviteSecurityConfig,
} from "./workspace/state.js";

const engine = new ExecutionEngine(createStandardRegistry());

function expectedSafety(risk: Risk): Pick<PlanStep, "risk_level" | "requires_confirmation"> {
  if (risk === "high-impact") {
    return { risk_level: "high", requires_confirmation: true };
  }
  if (risk === "safe-write") {
    return { risk_level: "medium", requires_confirmation: false };
  }
  return { risk_level: "low", requires_confirmation: false };
}

function validatePlanStep(step: PlanStep, index: number): string[] {
  const errors: string[] = [];
  const prefix = `plan[${index}]`;
  const allowedRisks: Risk[] = ["inspect", "safe-write", "high-impact"];
  if (!allowedRisks.includes(step.risk)) {
    errors.push(`${prefix}.risk must be one of: inspect, safe-write, high-impact`);
    return errors;
  }
  const expected = expectedSafety(step.risk);

  if (!step.stepId?.trim()) {
    errors.push(`${prefix}.stepId is required`);
  }
  if (!step.description?.trim()) {
    errors.push(`${prefix}.description is required`);
  }
  if (step.tool !== "terminal.write") {
    errors.push(`${prefix}.tool must be terminal.write`);
  }
  if (!step.input?.command?.trim()) {
    errors.push(`${prefix}.input.command is required`);
  }
  if (step.risk_level !== expected.risk_level) {
    errors.push(`${prefix}.risk_level must be ${expected.risk_level} for risk=${step.risk}`);
  }
  if (step.requires_confirmation !== expected.requires_confirmation) {
    errors.push(`${prefix}.requires_confirmation must be ${String(expected.requires_confirmation)} for risk=${step.risk}`);
  }
  if (!step.verification_plan || !Array.isArray(step.verification_plan.steps)) {
    errors.push(`${prefix}.verification_plan.steps must be an array`);
  }
  if (step.requires_confirmation && !step.confirmationScope?.trim()) {
    errors.push(`${prefix}.confirmationScope is required when requires_confirmation=true`);
  }

  return errors;
}

function validatePlanForExecution(plan: PlanStep[]): string[] {
  if (!Array.isArray(plan) || plan.length === 0) {
    return ["plan must contain at least one step"];
  }
  const errors: string[] = [];
  for (let i = 0; i < plan.length; i++) {
    errors.push(...validatePlanStep(plan[i], i));
  }
  return errors;
}

// --- minimal "plan" generator (replace with LLM planner later)
function makePlan(intentText: string, projectRoot: string): AgentPlan {
  const planId = randomUUID();
  const steps: PlanStep[] = [
    {
      stepId: "inspect:git",
      description: "Inspect git working tree state",
      tool: "terminal.write",
      input: { command: "git status", cwd: projectRoot, timeoutMs: 60_000, stepId: "inspect:git" },
      risk: "inspect",
      risk_level: "low",
      requires_confirmation: false,
      verification_plan: { steps: [] }
    },
    {
      stepId: "build",
      description: "Run project build command",
      tool: "terminal.write",
      input: { command: "npm -v && npm run build", cwd: projectRoot, timeoutMs: 60_000, stepId: "build" },
      risk: "safe-write",
      risk_level: "medium",
      requires_confirmation: false,
      verification_plan: { steps: [] }
    }
  ];

  return {
    planId,
    intentText,
    projectRoot,
    reasoning: `I'll inspect repo state then run the build and report failures.`,
    steps
  };
}

// --- runtime state
const runningStreams = new Map<string, { cancelled: boolean }>();
const runningPlans = new Map<string, { cancelled: boolean; currentStreamId?: string }>();
const completedReports = new Map<string, unknown>();
const metrics = {
  runs_total: 0,
  runs_completed: 0,
  runs_failed: 0,
  runs_cancelled: 0,
  interventions_total: 0,
  confirmation_denied_total: 0,
  failure_classes: {} as Record<string, number>,
  duration_ms_total: 0,
  unblock_runs: 0,
  unblock_duration_ms_total: 0
};
const webhookDeliveryCache = new Map<string, number>();
const WEBHOOK_DELIVERY_TTL_MS = 24 * 60 * 60 * 1000;
const webhookRateCounters = new Map<string, { windowStartMs: number; count: number }>();
let webhookDeliveriesLoaded = false;

function webhookRateWindowMs(): number {
  const raw = Number(process.env.RINAWARP_WEBHOOK_RATE_WINDOW_MS || 60_000);
  return Number.isFinite(raw) ? Math.max(1_000, raw) : 60_000;
}

function webhookRateLimitPerWindow(): number {
  const raw = Number(process.env.RINAWARP_WEBHOOK_RATE_LIMIT_PER_WINDOW || process.env.RINAWARP_WEBHOOK_RATE_LIMIT_PER_MIN || 120);
  return Number.isFinite(raw) ? Math.max(1, raw) : 120;
}

function webhookMaxBytes(): number {
  const raw = Number(process.env.RINAWARP_WEBHOOK_MAX_BYTES || 262_144);
  return Number.isFinite(raw) ? Math.max(1024, raw) : 262_144;
}

type WebhookDeliveryRegistry = {
  version: 1;
  deliveries: Record<string, number>;
  updatedAt: string;
};

function webhookDeliveryFile(): string {
  return path.join(paths().baseDir, "webhook-deliveries.json");
}

function readWebhookDeliveryRegistry(): WebhookDeliveryRegistry {
  const fp = webhookDeliveryFile();
  if (!fs.existsSync(fp)) {
    return { version: 1, deliveries: {}, updatedAt: new Date().toISOString() };
  }
  try {
    const raw = fs.readFileSync(fp, "utf8");
    const parsed = JSON.parse(raw) as WebhookDeliveryRegistry;
    if (!parsed || parsed.version !== 1 || typeof parsed.deliveries !== "object") {
      return { version: 1, deliveries: {}, updatedAt: new Date().toISOString() };
    }
    return parsed;
  } catch {
    return { version: 1, deliveries: {}, updatedAt: new Date().toISOString() };
  }
}

function writeWebhookDeliveryRegistry(registry: WebhookDeliveryRegistry): void {
  const fp = webhookDeliveryFile();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

function loadWebhookDeliveriesIntoCache(): void {
  if (webhookDeliveriesLoaded) return;
  const stored = readWebhookDeliveryRegistry();
  for (const [id, ts] of Object.entries(stored.deliveries || {})) {
    if (Number.isFinite(ts)) webhookDeliveryCache.set(id, Number(ts));
  }
  webhookDeliveriesLoaded = true;
}

function pruneWebhookDeliveries(now = Date.now()): void {
  loadWebhookDeliveriesIntoCache();
  for (const [id, ts] of webhookDeliveryCache.entries()) {
    if (now - ts > WEBHOOK_DELIVERY_TTL_MS) webhookDeliveryCache.delete(id);
  }
  const deliveries = Object.fromEntries(webhookDeliveryCache.entries());
  writeWebhookDeliveryRegistry({
    version: 1,
    deliveries,
    updatedAt: new Date(now).toISOString(),
  });
}

function rememberWebhookDelivery(deliveryId: string, now = Date.now()): { ok: true } | { ok: false; error: string } {
  loadWebhookDeliveriesIntoCache();
  // Merge on-disk state to catch deliveries recorded by another process.
  const stored = readWebhookDeliveryRegistry();
  for (const [id, ts] of Object.entries(stored.deliveries || {})) {
    if (Number.isFinite(ts) && !webhookDeliveryCache.has(id)) webhookDeliveryCache.set(id, Number(ts));
  }
  pruneWebhookDeliveries(now);
  if (webhookDeliveryCache.has(deliveryId)) {
    return { ok: false, error: "duplicate delivery id" };
  }
  webhookDeliveryCache.set(deliveryId, now);
  const deliveries = Object.fromEntries(webhookDeliveryCache.entries());
  writeWebhookDeliveryRegistry({
    version: 1,
    deliveries,
    updatedAt: new Date(now).toISOString(),
  });
  return { ok: true };
}

async function readJson(req: http.IncomingMessage) {
  const parsed = await readRawJson(req);
  return parsed.json;
}

async function readRawJson(req: http.IncomingMessage, opts?: { maxBytes?: number }): Promise<{ raw: string; json: any | null }> {
  const chunks: Buffer[] = [];
  const maxBytes = Number.isFinite(opts?.maxBytes) ? Number(opts?.maxBytes) : Number.POSITIVE_INFINITY;
  let total = 0;
  for await (const c of req) {
    const chunk = Buffer.from(c);
    total += chunk.length;
    if (total > maxBytes) {
      const error = new Error(`payload too large (max ${maxBytes} bytes)`) as Error & { statusCode?: number };
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return { raw: "", json: null };
  return { raw, json: JSON.parse(raw) };
}

function webhookClientIp(req: http.IncomingMessage): string {
  const forwarded = String(req.headers["x-forwarded-for"] || "").trim();
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.socket.remoteAddress || "unknown";
}

function webhookAuditFile(): string {
  return path.join(paths().baseDir, "webhook-audit.ndjson");
}

async function appendWebhookAudit(event: Record<string, unknown>): Promise<void> {
  const line = `${JSON.stringify({ ts: new Date().toISOString(), ...event })}\n`;
  const fp = webhookAuditFile();
  await mkdir(path.dirname(fp), { recursive: true });
  await appendFile(fp, line, "utf8");
}

function readWebhookAudit(args?: {
  limit?: number;
  outcome?: string;
  mapped?: string;
}): Array<Record<string, unknown>> {
  const fp = webhookAuditFile();
  if (!fs.existsSync(fp)) return [];
  const raw = fs.readFileSync(fp, "utf8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const parsed = lines
    .map((line) => {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is Record<string, unknown> => entry !== null);
  const outcome = (args?.outcome || "").trim();
  const mapped = (args?.mapped || "").trim();
  const filtered = parsed.filter((entry) => {
    if (outcome && String(entry.outcome || "") !== outcome) return false;
    if (mapped && String(entry.mapped || "") !== mapped) return false;
    return true;
  });
  const limit = Number.isFinite(args?.limit) ? Math.max(1, Math.min(500, Number(args?.limit))) : 100;
  return filtered.slice(-limit).reverse();
}

function checkWebhookRateLimit(clientIp: string, now = Date.now()): { ok: true } | { ok: false; retryAfterSec: number } {
  const windowMs = webhookRateWindowMs();
  const maxCount = webhookRateLimitPerWindow();
  const current = webhookRateCounters.get(clientIp);
  if (!current || now - current.windowStartMs >= windowMs) {
    webhookRateCounters.set(clientIp, { windowStartMs: now, count: 1 });
    return { ok: true };
  }
  if (current.count >= maxCount) {
    const retryAfterMs = windowMs - (now - current.windowStartMs);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  current.count += 1;
  webhookRateCounters.set(clientIp, current);
  return { ok: true };
}

function verifyGithubSignature(rawBody: string, signatureHeader: string | undefined, secret: string): boolean {
  if (!secret) return true;
  const header = String(signatureHeader || "").trim();
  if (!header.startsWith("sha256=")) return false;
  const receivedHex = header.slice("sha256=".length).trim();
  if (!/^[a-fA-F0-9]{64}$/.test(receivedHex)) return false;
  const expectedHex = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(receivedHex, "hex");
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function actorFromRequest(req: http.IncomingMessage): { actorId: string; actorEmail: string } {
  const actorId = String(req.headers["x-rina-actor-id"] || "usr_local").trim() || "usr_local";
  const actorEmail = String(req.headers["x-rina-actor-email"] || "owner@local").trim().toLowerCase() || "owner@local";
  return { actorId, actorEmail };
}

function daemonRunnerPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, "daemon", "runner.js");
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

async function persistRunReport(projectRoot: string, planRunId: string, report: unknown): Promise<string> {
  const reportDir = path.join(projectRoot, ".rinawarp", "reports");
  await mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `${planRunId}.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  return reportPath;
}

async function appendMetricEvent(projectRoot: string, event: Record<string, unknown>): Promise<void> {
  const metricDir = path.join(projectRoot, ".rinawarp", "metrics");
  await mkdir(metricDir, { recursive: true });
  const file = path.join(metricDir, "events.ndjson");
  const line = `${JSON.stringify({ ts: Date.now(), ...event })}\n`;
  await writeFile(file, line, { encoding: "utf8", flag: "a" });
}

function incFailureClass(name: string | undefined): void {
  if (!name) return;
  metrics.failure_classes[name] = (metrics.failure_classes[name] ?? 0) + 1;
}

export function createServer(opts: { port: number }) {
  const { port } = opts;

  const server = http.createServer(async (req, res) => {
    try {
      setCors(req, res);

      if (req.method === "OPTIONS") return handlePreflight(req, res);

      // simple routing
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

      // auth
      requireAuth(req);

      // --- SSE stream for a plan run
      if (req.method === "GET" && url.pathname === "/v1/stream") {
        const planRunId = url.searchParams.get("planRunId");
        if (!planRunId) return sendJson(res, 400, { ok: false, error: "planRunId required" });

        sseInit(res);
        // we don't store client list; we just keep this connection open
        // and send events during execution using closure (below).
        // For simplicity, we attach the res to plan state:
        (runningPlans.get(planRunId) as any).sseRes = res;

        req.on("close", () => {
          // client disconnected; keep executing but stop emitting
          const st = runningPlans.get(planRunId);
          if (st) (st as any).sseRes = undefined;
        });
        return;
      }

      // --- PLAN
      if (req.method === "POST" && url.pathname === "/v1/plan") {
        const body = (await readJson(req)) as AgentPlanRequest;
        if (!body?.intentText?.trim()) {
          return sendJson(res, 400, { ok: false, error: "intentText is required" });
        }
        if (!body?.projectRoot?.trim()) {
          return sendJson(res, 400, { ok: false, error: "projectRoot is required" });
        }
        const projectRoot = normalizeProjectRoot(body.projectRoot);
        const plan = makePlan(body.intentText, projectRoot);
        const validationErrors = validatePlanForExecution(plan.steps);
        if (validationErrors.length > 0) {
          return sendJson(res, 500, { ok: false, error: `planner produced invalid safety contract: ${validationErrors.join("; ")}` });
        }
        return sendJson(res, 200, { ok: true, plan });
      }

      // --- EXECUTE PLAN (sequential)
      if (req.method === "POST" && url.pathname === "/v1/execute-plan") {
        const body = (await readJson(req)) as ExecutePlanRequest;
        if (!Array.isArray(body?.plan) || body.plan.length === 0) {
          return sendJson(res, 400, { ok: false, error: "plan is required and must contain at least one step" });
        }
        if (!body?.projectRoot?.trim()) {
          return sendJson(res, 400, { ok: false, error: "projectRoot is required" });
        }
        const validationErrors = validatePlanForExecution(body.plan);
        if (validationErrors.length > 0) {
          return sendJson(res, 400, { ok: false, error: `invalid plan safety contract: ${validationErrors.join("; ")}` });
        }
        const projectRoot = normalizeProjectRoot(body.projectRoot);
        const license: LicenseTier = resolveRequestLicense(req);

        const planRunId = randomUUID();
        runningPlans.set(planRunId, { cancelled: false });
        const runStartedAt = Date.now();
        metrics.runs_total += 1;

        // respond immediately (client can open /v1/stream?planRunId=...)
        sendJson(res, 200, { ok: true, planRunId });

        // execute async but in-process (still "now", not background promises to user)
        const planState = runningPlans.get(planRunId)!;

        const sse = (event: string, data: unknown) => {
          const sseRes = (planState as any).sseRes as http.ServerResponse | undefined;
          if (!sseRes) return;
          sseSend(sseRes, event, data);
        };

        sse("plan_run_start", { planRunId, license });
        const stepReports: Array<{ stepId: string; report: ExecutionReport }> = [];
        let runSuccessful = true;
        let devFixerSignal = false;

        for (const step of body.plan) {
          if (planState.cancelled) break;
          if (
            /build|fix|deps|unblock/i.test(step.stepId ?? "") ||
            /build|fix|dependency|unblock/i.test(step.description ?? "")
          ) {
            devFixerSignal = true;
          }

          if (step.requires_confirmation) {
            metrics.interventions_total += 1;
          }

          // confirmation gate if needed
          if (step.requires_confirmation) {
            if (!body.confirmed || body.confirmationText !== "YES") {
              metrics.confirmation_denied_total += 1;
              runSuccessful = false;
              await appendMetricEvent(projectRoot, {
                type: "confirmation_denied",
                planRunId,
                stepId: step.stepId,
                tool: step.tool
              });
              sse("plan_halt", { planRunId, reason: "confirmation_required" });
              break;
            }
          }

          const streamId = randomUUID();
          planState.currentStreamId = streamId;
          runningStreams.set(streamId, { cancelled: false });

          sse("plan_step_start", { planRunId, streamId, step });

          const report = await executeViaEngine({
            engine,
            plan: [
              {
                tool: step.tool,
                risk_level: step.risk_level,
                requires_confirmation: step.requires_confirmation,
                verification_plan: step.verification_plan,
                input: {
                  ...step.input,
                  cwd: step.input.cwd ?? projectRoot,
                  stepId: step.stepId
                },
                description: step.description,
                stepId: step.stepId,
                ...(step.confirmationScope ? { confirmationScope: step.confirmationScope } : {})
              }
            ] as CorePlanStep[],
            projectRoot,
            license,
            confirmationToken: step.requires_confirmation
              ? ({ kind: "explicit", approved: true, scope: step.confirmationScope } as ConfirmationToken)
              : undefined,
            emit: (evt: ToolEvent) => {
              const st = runningStreams.get(streamId);
              if (!st || st.cancelled || planState.cancelled) return;

              if (evt.type === "chunk") {
                sse("chunk", { planRunId, streamId, stream: evt.stream, data: evt.data });
              }
              if ((evt as any).type === "timeout") {
                sse("timeout", { planRunId, streamId });
              }
              if ((evt as any).type === "cancel") {
                sse("cancel", { planRunId, streamId, reason: (evt as any).reason ?? "soft" });
              }
            }
          });

          const last = report.steps.at(-1)?.result;
          const ok = report.ok && (last?.success ?? false);
          const lastError = last && !last.success ? last.error : undefined;
          stepReports.push({ stepId: step.stepId, report });
          if (!ok) {
            runSuccessful = false;
            incFailureClass(report.haltedBecause);
            await appendMetricEvent(projectRoot, {
              type: "step_failure",
              planRunId,
              stepId: step.stepId,
              haltedBecause: report.haltedBecause ?? "unknown"
            });
          }

          sse("plan_step_end", {
            planRunId,
            streamId,
            ok,
            report
          });

          runningStreams.delete(streamId);

          // stop-on-fail
          if (!ok) {
            sse("plan_halt", { planRunId, reason: report.haltedBecause ?? lastError ?? "Execution failed" });
            break;
          }
        }

        const cancelled = runningPlans.get(planRunId)?.cancelled ?? false;
        const runEndedAt = Date.now();
        const runDurationMs = runEndedAt - runStartedAt;
        metrics.duration_ms_total += runDurationMs;
        if (cancelled) metrics.runs_cancelled += 1;
        else if (runSuccessful) metrics.runs_completed += 1;
        else metrics.runs_failed += 1;
        if (!cancelled && runSuccessful && devFixerSignal) {
          metrics.unblock_runs += 1;
          metrics.unblock_duration_ms_total += runDurationMs;
        }

        const finalReport = {
          planRunId,
          projectRoot,
          license,
          cancelled,
          startedAt: runStartedAt,
          finishedAt: runEndedAt,
          durationMs: runEndedAt - runStartedAt,
          steps: stepReports
        };
        completedReports.set(planRunId, finalReport);
        await appendMetricEvent(projectRoot, {
          type: "run_end",
          planRunId,
          cancelled,
          ok: runSuccessful && !cancelled,
          durationMs: runEndedAt - runStartedAt,
          license
        });
        try {
          const reportPath = await persistRunReport(projectRoot, planRunId, finalReport);
          sse("plan_report", { planRunId, reportPath });
        } catch (err: any) {
          sse("plan_report_error", { planRunId, error: err?.message ?? "failed to persist report" });
        }
        sse("plan_run_end", { planRunId, cancelled });

        // close SSE if open
        const sseRes = (runningPlans.get(planRunId) as any)?.sseRes as http.ServerResponse | undefined;
        if (sseRes) sseRes.end();

        runningPlans.delete(planRunId);
        return;
      }

      // --- GET MACHINE REPORT
      if (req.method === "GET" && url.pathname === "/v1/report") {
        const planRunId = url.searchParams.get("planRunId");
        if (!planRunId) return sendJson(res, 400, { ok: false, error: "planRunId required" });
        const report = completedReports.get(planRunId);
        if (!report) return sendJson(res, 404, { ok: false, error: "report not found" });
        return sendJson(res, 200, { ok: true, report });
      }

      // --- METRICS SUMMARY
      if (req.method === "GET" && url.pathname === "/v1/metrics") {
        const completedOrFailed = metrics.runs_completed + metrics.runs_failed;
        const completionRate = completedOrFailed === 0 ? 0 : metrics.runs_completed / completedOrFailed;
        const avgDurationMs = metrics.runs_total === 0 ? 0 : Math.round(metrics.duration_ms_total / metrics.runs_total);
        const mttrUnblockMs = metrics.unblock_runs === 0 ? 0 : Math.round(metrics.unblock_duration_ms_total / metrics.unblock_runs);
        return sendJson(res, 200, {
          ok: true,
          metrics: {
            ...metrics,
            completion_rate: completionRate,
            avg_duration_ms: avgDurationMs,
            mttr_unblock_ms: mttrUnblockMs
          }
        });
      }

      // --- DAEMON STATUS
      if (req.method === "GET" && url.pathname === "/v1/daemon/status") {
        const state = readState();
        const pid = readPid();
        const running = !!(pid && isPidAlive(pid));
        const registry = readTaskRegistry();
        const counts = registry.tasks.reduce<Record<string, number>>((acc, task) => {
          acc[task.status] = (acc[task.status] ?? 0) + 1;
          if (task.deadLetter) acc.dead_letter = (acc.dead_letter ?? 0) + 1;
          return acc;
        }, {});
        return sendJson(res, 200, {
          ok: true,
          daemon: {
            running,
            pid: running ? pid : null,
            startedAt: state?.startedAt ?? null,
            updatedAt: state?.updatedAt ?? null,
            storeDir: paths().baseDir,
          },
          tasks: {
            total: registry.tasks.length,
            counts,
          },
        });
      }

      if (req.method === "POST" && url.pathname === "/v1/daemon/start") {
        const start = await startDaemonProcess();
        if (!start.ok) return sendJson(res, 500, { ok: false, error: start.error || "failed to start daemon" });
        return sendJson(res, 200, {
          ok: true,
          started: !start.alreadyRunning,
          alreadyRunning: !!start.alreadyRunning,
          pid: start.pid ?? null,
        });
      }

      if (req.method === "POST" && url.pathname === "/v1/daemon/stop") {
        const stop = stopDaemonProcess();
        if (!stop.ok) return sendJson(res, 500, { ok: false, error: stop.error || "failed to stop daemon" });
        return sendJson(res, 200, {
          ok: true,
          stopped: !stop.stale,
          stale: !!stop.stale,
          pid: stop.pid ?? null,
        });
      }

      // --- DAEMON TASK LIST
      if (req.method === "GET" && url.pathname === "/v1/daemon/tasks") {
        const status = url.searchParams.get("status");
        const deadOnly = url.searchParams.get("deadLetter") === "1";
        const registry = readTaskRegistry();
        const tasks = registry.tasks.filter((task) => {
          if (status && task.status !== status) return false;
          if (deadOnly && task.deadLetter !== true) return false;
          return true;
        });
        return sendJson(res, 200, { ok: true, tasks, updatedAt: registry.updatedAt });
      }

      // --- DAEMON TASK REGISTER
      if (req.method === "POST" && url.pathname === "/v1/daemon/tasks") {
        const body = (await readJson(req)) as { type?: string; payload?: Record<string, unknown>; maxAttempts?: number } | null;
        const type = String(body?.type || "").trim();
        const payload = (body?.payload && typeof body.payload === "object" ? body.payload : {}) as Record<string, unknown>;
        if (!type) return sendJson(res, 400, { ok: false, error: "type is required" });
        const validationError = validateTaskPayload(type, payload);
        if (validationError) return sendJson(res, 400, { ok: false, error: validationError });
        const maxAttempts = body?.maxAttempts;
        if (maxAttempts !== undefined && (!Number.isFinite(maxAttempts) || maxAttempts < 1)) {
          return sendJson(res, 400, { ok: false, error: "maxAttempts must be >= 1 when provided" });
        }
        const task = addTask({ type, payload, maxAttempts });
        return sendJson(res, 200, { ok: true, task });
      }

      // --- WORKSPACE / TEAM BACKEND SURFACE (v1)
      if (req.method === "POST" && url.pathname === "/v1/workspaces") {
        const body = (await readJson(req)) as { name?: string; region?: string } | null;
        const name = String(body?.name || "").trim();
        if (!name) return sendJson(res, 400, { ok: false, error: "name is required" });
        const { actorId, actorEmail } = actorFromRequest(req);
        const created = createWorkspace({
          name,
          region: body?.region,
          ownerId: actorId,
          ownerEmail: actorEmail,
        });
        return sendJson(res, 200, { workspace_id: created.id, owner_id: created.owner_id });
      }

      const workspaceGetMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)$/);
      if (req.method === "GET" && workspaceGetMatch) {
        const workspaceId = decodeURIComponent(workspaceGetMatch[1] || "");
        const ws = getWorkspace(workspaceId);
        if (!ws) return sendJson(res, 404, { ok: false, error: "workspace_not_found" });
        return sendJson(res, 200, ws);
      }

      const workspaceInviteCreateMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/invites$/);
      if (req.method === "POST" && workspaceInviteCreateMatch) {
        const workspaceId = decodeURIComponent(workspaceInviteCreateMatch[1] || "");
        const body = (await readJson(req)) as {
          email?: string;
          role?: "owner" | "admin" | "member";
          expires_in_hours?: number;
          send_email?: boolean;
        } | null;
        const email = String(body?.email || "").trim().toLowerCase();
        const role = String(body?.role || "member").trim().toLowerCase() as "owner" | "admin" | "member";
        if (!email) return sendJson(res, 400, { ok: false, error: "email is required" });
        if (!["owner", "admin", "member"].includes(role)) {
          return sendJson(res, 400, { ok: false, error: "role must be owner|admin|member" });
        }
        const { actorId } = actorFromRequest(req);
        try {
          const created = createInvite({
            workspaceId,
            email,
            role,
            expiresInHours: Number(body?.expires_in_hours || 72),
            sendEmail: body?.send_email === true,
            actorId,
          });
          if (!created) return sendJson(res, 404, { ok: false, error: "workspace_not_found" });
          return sendJson(res, 200, {
            invite_id: created.invite_id,
            expires_at: created.expires_at,
            // For local agentd only, return token to allow manual testing.
            invite_token: created.invite_token || undefined,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message === "workspace_locked") return sendJson(res, 423, { ok: false, error: "workspace_locked" });
          return sendJson(res, 400, { ok: false, error: message });
        }
      }

      const workspaceInviteListMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/invites$/);
      if (req.method === "GET" && workspaceInviteListMatch) {
        const workspaceId = decodeURIComponent(workspaceInviteListMatch[1] || "");
        const ws = getWorkspace(workspaceId);
        if (!ws) return sendJson(res, 404, { ok: false, error: "workspace_not_found" });
        return sendJson(res, 200, { invites: listInvites(workspaceId) });
      }

      if (req.method === "POST" && url.pathname === "/v1/invites/accept") {
        const body = (await readJson(req)) as { token?: string } | null;
        const token = String(body?.token || "").trim();
        if (!token) return sendJson(res, 400, { ok: false, error: "token is required" });
        const { actorId, actorEmail } = actorFromRequest(req);
        const accepted = acceptInvite({ token, actorId, actorEmail });
        if (!accepted.ok) {
          return sendJson(res, accepted.statusCode || 400, { ok: false, error: accepted.error || "invite_accept_failed" });
        }
        return sendJson(res, 200, {
          workspace_id: accepted.workspace_id,
          role: accepted.role,
        });
      }

      const inviteRevokeMatch = url.pathname.match(/^\/v1\/invites\/([^/]+)\/revoke$/);
      if (req.method === "POST" && inviteRevokeMatch) {
        const inviteId = decodeURIComponent(inviteRevokeMatch[1] || "");
        const { actorId } = actorFromRequest(req);
        const ok = revokeInvite({ inviteId, actorId });
        if (!ok) return sendJson(res, 404, { ok: false, error: "invite_not_found_or_not_revokeable" });
        return sendJson(res, 200, { ok: true });
      }

      const billingEnforceMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/billing\/enforce$/);
      if (req.method === "PUT" && billingEnforceMatch) {
        const workspaceId = decodeURIComponent(billingEnforceMatch[1] || "");
        const body = (await readJson(req)) as { require_active_plan?: boolean } | null;
        const { actorId } = actorFromRequest(req);
        const updated = setBillingEnforcement({
          workspaceId,
          actorId,
          requireActivePlan: !!body?.require_active_plan,
        });
        if (!updated) return sendJson(res, 404, { ok: false, error: "workspace_not_found" });
        return sendJson(res, 200, { ok: true, workspace: updated });
      }

      const workspaceLockMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/lock$/);
      if (req.method === "POST" && workspaceLockMatch) {
        const workspaceId = decodeURIComponent(workspaceLockMatch[1] || "");
        const body = (await readJson(req)) as { reason?: string } | null;
        const { actorId } = actorFromRequest(req);
        const updated = lockWorkspace({
          workspaceId,
          actorId,
          reason: String(body?.reason || "manual_lock"),
        });
        if (!updated) return sendJson(res, 404, { ok: false, error: "workspace_not_found" });
        return sendJson(res, 200, { ok: true, workspace: updated });
      }

      const workspaceUnlockMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/unlock$/);
      if (req.method === "POST" && workspaceUnlockMatch) {
        const workspaceId = decodeURIComponent(workspaceUnlockMatch[1] || "");
        const { actorId } = actorFromRequest(req);
        const updated = unlockWorkspace({ workspaceId, actorId });
        if (!updated) return sendJson(res, 404, { ok: false, error: "workspace_not_found" });
        return sendJson(res, 200, { ok: true, workspace: updated });
      }

      const workspaceAuditMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/audit$/);
      if (req.method === "GET" && workspaceAuditMatch) {
        const workspaceId = decodeURIComponent(workspaceAuditMatch[1] || "");
        const type = String(url.searchParams.get("type") || "");
        const from = String(url.searchParams.get("from") || "");
        const to = String(url.searchParams.get("to") || "");
        const limit = Number(url.searchParams.get("limit") || 100);
        const entries = queryAudit({ workspaceId, type: type || undefined, from: from || undefined, to: to || undefined, limit });
        return sendJson(res, 200, { entries });
      }

      if (req.method === "PUT" && url.pathname === "/v1/admin/security/invites") {
        const body = (await readJson(req)) as {
          one_time?: boolean;
          hash_tokens?: boolean;
          rotate_on_use?: boolean;
          rate_limit_per_min?: number;
          brute_force_threshold?: number;
          cooldown_minutes?: number;
        } | null;
        const { actorId } = actorFromRequest(req);
        const config = updateInviteSecurityConfig({ actorId, ...(body || {}) });
        return sendJson(res, 200, { status: "updated", config });
      }

      if (req.method === "POST" && url.pathname === "/v1/admin/security/invites/rotate-keys") {
        const { actorId } = actorFromRequest(req);
        const config = rotateInviteSecurityKeys(actorId);
        return sendJson(res, 200, { status: "rotated", key_version: config.key_version });
      }

      if (req.method === "PUT" && url.pathname === "/v1/admin/audit/retention") {
        const body = (await readJson(req)) as {
          retention_days?: number;
          rotation?: "daily" | "weekly";
          max_size_mb?: number;
          archive_provider?: string;
          archive_bucket?: string;
        } | null;
        const { actorId } = actorFromRequest(req);
        const config = setAuditRetentionConfig({ actorId, ...(body || {}) });
        return sendJson(res, 200, { status: "updated", config });
      }

      if (req.method === "GET" && url.pathname === "/v1/admin/audit/status") {
        const config = getAuditRetentionConfig();
        return sendJson(res, 200, { status: "ok", config });
      }

      if (req.method === "POST" && url.pathname === "/v1/admin/audit/cleanup") {
        const body = (await readJson(req)) as { force?: boolean } | null;
        const result = runAuditCleanup(body?.force === true);
        return sendJson(res, 200, { status: "ok", ...result });
      }

      const syncStateMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/sync\/state$/);
      if (req.method === "GET" && syncStateMatch) {
        const workspaceId = decodeURIComponent(syncStateMatch[1] || "");
        const state = getSyncState(workspaceId);
        if (!state) return sendJson(res, 404, { ok: false, error: "workspace_not_found" });
        return sendJson(res, 200, state);
      }

      const syncPullMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/sync\/pull$/);
      if (req.method === "POST" && syncPullMatch) {
        const workspaceId = decodeURIComponent(syncPullMatch[1] || "");
        const body = (await readJson(req)) as { since_version?: number } | null;
        const pulled = syncPull({ workspaceId, sinceVersion: Number(body?.since_version || 0) });
        if (!pulled) return sendJson(res, 404, { ok: false, error: "workspace_not_found" });
        return sendJson(res, 200, pulled);
      }

      const syncPushMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/sync\/push$/);
      if (req.method === "POST" && syncPushMatch) {
        const workspaceId = decodeURIComponent(syncPushMatch[1] || "");
        const body = (await readJson(req)) as {
          base_version?: number;
          events?: Array<{ type?: string; payload?: Record<string, unknown> }>;
        } | null;
        const { actorId } = actorFromRequest(req);
        try {
          const pushed = syncPush({
            workspaceId,
            baseVersion: Number(body?.base_version || 0),
            events: Array.isArray(body?.events)
              ? body.events.map((evt) => ({ type: String(evt?.type || "client_event"), payload: evt?.payload || {} }))
              : [],
            actorId,
          });
          if (!pushed) return sendJson(res, 404, { ok: false, error: "workspace_not_found" });
          if (!pushed.ok) return sendJson(res, 409, pushed);
          return sendJson(res, 200, pushed);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message === "workspace_locked") return sendJson(res, 423, { ok: false, error: "workspace_locked" });
          return sendJson(res, 400, { ok: false, error: message });
        }
      }

      // --- ORCHESTRATOR ISSUE -> PR (MVP)
      if (req.method === "POST" && url.pathname === "/v1/orchestrator/issue-to-pr") {
        const body = (await readJson(req)) as {
          issueId?: string;
          repoPath?: string;
          branchName?: string;
          command?: string;
          repoSlug?: string;
          push?: boolean;
          prDryRun?: boolean;
          baseBranch?: string;
          prTitle?: string;
          prBody?: string;
          commitMessage?: string;
        } | null;
        const issueId = String(body?.issueId || "").trim();
        const repoPath = String(body?.repoPath || "").trim();
        if (!issueId) return sendJson(res, 400, { ok: false, error: "issueId is required" });
        if (!repoPath) return sendJson(res, 400, { ok: false, error: "repoPath is required" });
        const created = createIssueToPrWorkflow({
          issueId,
          repoPath,
          branchName: body?.branchName,
          command: body?.command,
          repoSlug: body?.repoSlug,
          push: body?.push === true,
          prDryRun: body?.prDryRun !== false,
          baseBranch: body?.baseBranch,
          prTitle: body?.prTitle,
          prBody: body?.prBody,
          commitMessage: body?.commitMessage,
        });
        return sendJson(res, 200, created);
      }

      if (req.method === "GET" && url.pathname === "/v1/orchestrator/workspace-graph") {
        const graph = readWorkspaceGraph();
        return sendJson(res, 200, { ok: true, graph });
      }

      if (req.method === "POST" && url.pathname === "/v1/orchestrator/ci/status") {
        const body = (await readJson(req)) as {
          workflowId?: string;
          provider?: string;
          status?: "queued" | "running" | "passed" | "failed";
          url?: string;
          autoRetry?: boolean;
          repoPath?: string;
          issueId?: string;
          branchName?: string;
          command?: string;
          repoSlug?: string;
          baseBranch?: string;
          prDryRun?: boolean;
        } | null;
        const workflowId = String(body?.workflowId || "").trim();
        const provider = String(body?.provider || "ci").trim();
        const status = body?.status;
        if (!workflowId) return sendJson(res, 400, { ok: false, error: "workflowId is required" });
        if (!status || !["queued", "running", "passed", "failed"].includes(status)) {
          return sendJson(res, 400, { ok: false, error: "status must be queued|running|passed|failed" });
        }
        const saved = recordCiStatus({ workflowId, provider, status, url: body?.url });
        let autoRevision: null | { ok: true; taskId: string; reviewNodeId: string; graph: { nodes: number; edges: number } } = null;
        if (status === "failed" && body?.autoRetry === true) {
          const repoPath = String(body?.repoPath || "").trim();
          const issueId = String(body?.issueId || "").trim();
          const branchName = String(body?.branchName || "").trim();
          if (repoPath && issueId && branchName) {
            autoRevision = queueRevisionFromReview({
              workflowId,
              repoPath,
              issueId,
              branchName,
              comment: `CI failure detected from ${provider}${body?.url ? ` (${body.url})` : ""}`,
              command: body?.command,
              repoSlug: body?.repoSlug,
              baseBranch: body?.baseBranch,
              prDryRun: body?.prDryRun !== false,
            });
          }
        }
        return sendJson(res, 200, { ...saved, autoRevision });
      }

      if (req.method === "POST" && url.pathname === "/v1/orchestrator/review/comment") {
        const body = (await readJson(req)) as {
          workflowId?: string;
          repoPath?: string;
          issueId?: string;
          branchName?: string;
          comment?: string;
          command?: string;
          repoSlug?: string;
          baseBranch?: string;
          prDryRun?: boolean;
        } | null;
        const workflowId = String(body?.workflowId || "").trim();
        const repoPath = String(body?.repoPath || "").trim();
        const issueId = String(body?.issueId || "").trim();
        const branchName = String(body?.branchName || "").trim();
        const comment = String(body?.comment || "").trim();
        if (!workflowId || !repoPath || !issueId || !branchName || !comment) {
          return sendJson(res, 400, {
            ok: false,
            error: "workflowId, repoPath, issueId, branchName, and comment are required",
          });
        }
        const queued = queueRevisionFromReview({
          workflowId,
          repoPath,
          issueId,
          branchName,
          comment,
          command: body?.command,
          repoSlug: body?.repoSlug,
          baseBranch: body?.baseBranch,
          prDryRun: body?.prDryRun !== false,
        });
        return sendJson(res, 200, queued);
      }

      if (req.method === "POST" && url.pathname === "/v1/orchestrator/git/prepare-branch") {
        const body = (await readJson(req)) as { repoPath?: string; issueId?: string; branchName?: string } | null;
        const repoPath = String(body?.repoPath || "").trim();
        const issueId = String(body?.issueId || "").trim();
        if (!repoPath) return sendJson(res, 400, { ok: false, error: "repoPath is required" });
        if (!issueId && !body?.branchName) {
          return sendJson(res, 400, { ok: false, error: "issueId or branchName is required" });
        }
        const branchName = String(body?.branchName || `rina/fix-${issueId}`).replace(/[^\w./-]+/g, "-");
        await ensureGitRepo(repoPath);
        const before = await currentBranch(repoPath);
        await createOrSwitchBranch(repoPath, branchName);
        const after = await currentBranch(repoPath);
        return sendJson(res, 200, { ok: true, before, after, branchName });
      }

      if (req.method === "POST" && url.pathname === "/v1/orchestrator/github/create-pr") {
        const body = (await readJson(req)) as {
          repoSlug?: string;
          head?: string;
          base?: string;
          title?: string;
          body?: string;
          draft?: boolean;
          dryRun?: boolean;
          workflowId?: string;
          issueId?: string;
          branchName?: string;
        } | null;
        const repoSlug = String(body?.repoSlug || "").trim();
        const head = String(body?.head || "").trim();
        const base = String(body?.base || "main").trim();
        const title = String(body?.title || "").trim();
        if (!repoSlug || !head || !title) {
          return sendJson(res, 400, { ok: false, error: "repoSlug, head, and title are required" });
        }
        const result = await createPullRequest(
          {
            repoSlug,
            head,
            base,
            title,
            body: body?.body,
            draft: !!body?.draft,
          },
          { dryRun: body?.dryRun !== false },
        );
        if (!result.ok) return sendJson(res, 400, result);
        const workflowId = String(body?.workflowId || "").trim();
        if (workflowId) {
          recordPullRequestStatus({
            workflowId,
            issueId: body?.issueId ? String(body.issueId) : undefined,
            branchName: body?.branchName ? String(body.branchName) : head,
            repoSlug,
            status: result.mode === "live" ? "opened" : "planned",
            mode: result.mode,
            number: result.mode === "live" ? result.number : null,
            url: result.mode === "live" ? result.url : null,
          });
        }
        return sendJson(res, 200, result);
      }

      if (req.method === "POST" && url.pathname === "/v1/orchestrator/github/pr-status") {
        const body = (await readJson(req)) as {
          workflowId?: string;
          status?: "planned" | "opened" | "merged" | "closed" | "failed";
          issueId?: string;
          branchName?: string;
          repoSlug?: string;
          mode?: "dry_run" | "live";
          number?: number;
          url?: string;
          error?: string;
        } | null;
        const workflowId = String(body?.workflowId || "").trim();
        const status = body?.status;
        if (!workflowId) return sendJson(res, 400, { ok: false, error: "workflowId is required" });
        if (!status || !["planned", "opened", "merged", "closed", "failed"].includes(status)) {
          return sendJson(res, 400, { ok: false, error: "status must be planned|opened|merged|closed|failed" });
        }
        const saved = recordPullRequestStatus({
          workflowId,
          status,
          issueId: body?.issueId ? String(body.issueId) : undefined,
          branchName: body?.branchName ? String(body.branchName) : undefined,
          repoSlug: body?.repoSlug ? String(body.repoSlug) : undefined,
          mode: body?.mode,
          number: typeof body?.number === "number" ? body.number : null,
          url: body?.url ? String(body.url) : null,
          error: body?.error ? String(body.error) : null,
        });
        return sendJson(res, 200, saved);
      }

      if (req.method === "POST" && url.pathname === "/v1/orchestrator/github/event") {
        const body = (await readJson(req)) as {
          event?: "pull_request" | "ci" | "review_comment";
          workflowId?: string;
          action?: string;
          merged?: boolean;
          issueId?: string;
          branchName?: string;
          repoSlug?: string;
          mode?: "dry_run" | "live";
          number?: number;
          url?: string;
          error?: string;
          ciProvider?: string;
          ciStatus?: string;
          comment?: string;
          repoPath?: string;
          command?: string;
          baseBranch?: string;
          prDryRun?: boolean;
        } | null;
        const event = body?.event;
        const workflowId = String(body?.workflowId || "").trim();
        if (!workflowId) return sendJson(res, 400, { ok: false, error: "workflowId is required" });
        if (!event || !["pull_request", "ci", "review_comment"].includes(event)) {
          return sendJson(res, 400, { ok: false, error: "event must be pull_request|ci|review_comment" });
        }

        if (event === "pull_request") {
          const action = String(body?.action || "").trim().toLowerCase();
          let status: "planned" | "opened" | "merged" | "closed" | "failed" = "opened";
          if (action === "closed" && body?.merged === true) status = "merged";
          else if (action === "closed") status = "closed";
          else if (action === "failed") status = "failed";
          else if (action === "planned") status = "planned";
          const saved = recordPullRequestStatus({
            workflowId,
            status,
            issueId: body?.issueId ? String(body.issueId) : undefined,
            branchName: body?.branchName ? String(body.branchName) : undefined,
            repoSlug: body?.repoSlug ? String(body.repoSlug) : undefined,
            mode: body?.mode,
            number: typeof body?.number === "number" ? body.number : null,
            url: body?.url ? String(body.url) : null,
            error: body?.error ? String(body.error) : null,
          });
          return sendJson(res, 200, { event, mapped: "pr_status", ...saved });
        }

        if (event === "ci") {
          const raw = String(body?.ciStatus || "").trim().toLowerCase();
          let status: "queued" | "running" | "passed" | "failed" = "running";
          if (["queued", "pending", "requested", "waiting"].includes(raw)) status = "queued";
          else if (["running", "in_progress"].includes(raw)) status = "running";
          else if (["passed", "success", "completed_success", "neutral", "skipped"].includes(raw)) status = "passed";
          else if (["failed", "failure", "timed_out", "cancelled", "completed_failure"].includes(raw)) status = "failed";
          const saved = recordCiStatus({
            workflowId,
            provider: String(body?.ciProvider || "github-actions"),
            status,
            url: body?.url ? String(body.url) : undefined,
          });
          return sendJson(res, 200, { event, mapped: "ci_status", ...saved });
        }

        const comment = String(body?.comment || "").trim();
        const repoPath = String(body?.repoPath || "").trim();
        const issueId = String(body?.issueId || "").trim();
        const branchName = String(body?.branchName || "").trim();
        if (!comment || !repoPath || !issueId || !branchName) {
          return sendJson(res, 400, {
            ok: false,
            error: "review_comment event requires comment, repoPath, issueId, and branchName",
          });
        }
        const queued = queueRevisionFromReview({
          workflowId,
          repoPath,
          issueId,
          branchName,
          comment,
          command: body?.command,
          repoSlug: body?.repoSlug,
          baseBranch: body?.baseBranch,
          prDryRun: body?.prDryRun !== false,
        });
        return sendJson(res, 200, { event, mapped: "review_revision", ...queued });
      }

      if (req.method === "POST" && url.pathname === "/v1/orchestrator/github/webhook") {
        const secret = String(process.env.GITHUB_WEBHOOK_SECRET || "").trim();
        const clientIp = webhookClientIp(req);
        const limiter = checkWebhookRateLimit(clientIp);
        if (!limiter.ok) {
          res.setHeader("Retry-After", String(limiter.retryAfterSec));
          await appendWebhookAudit({ outcome: "rejected", reason: "rate_limited", retryAfterSec: limiter.retryAfterSec, clientIp });
          return sendJson(res, 429, { ok: false, error: "webhook rate limit exceeded" });
        }
        let raw = "";
        let json: any = null;
        try {
          const parsed = await readRawJson(req, { maxBytes: webhookMaxBytes() });
          raw = parsed.raw;
          json = parsed.json;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await appendWebhookAudit({ outcome: "rejected", reason: "payload_too_large", error: message, clientIp });
          const statusCode = (error as { statusCode?: number })?.statusCode || 400;
          return sendJson(res, statusCode, { ok: false, error: message });
        }
        const eventName = String(req.headers["x-github-event"] || "").trim().toLowerCase();
        const deliveryId = String(req.headers["x-github-delivery"] || "").trim();
        if (!deliveryId) {
          await appendWebhookAudit({ outcome: "rejected", reason: "missing_delivery_id", eventName, clientIp });
          return sendJson(res, 400, { ok: false, error: "x-github-delivery header is required" });
        }
        const remembered = rememberWebhookDelivery(deliveryId);
        if (!remembered.ok) {
          await appendWebhookAudit({ outcome: "rejected", reason: "duplicate_delivery_id", eventName, deliveryId, clientIp });
          return sendJson(res, 409, { ok: false, error: remembered.error });
        }
        if (process.env.NODE_ENV === "production" && !secret) {
          await appendWebhookAudit({ outcome: "rejected", reason: "missing_secret_production", eventName, deliveryId, clientIp });
          return sendJson(res, 503, { ok: false, error: "GITHUB_WEBHOOK_SECRET is required in production" });
        }
        if (secret) {
          const signature = String(req.headers["x-hub-signature-256"] || "");
          const verified = verifyGithubSignature(raw, signature, secret);
          if (!verified) {
            await appendWebhookAudit({ outcome: "rejected", reason: "invalid_signature", eventName, deliveryId, clientIp });
            return sendJson(res, 401, { ok: false, error: "invalid webhook signature" });
          }
        }
        const body = json as Record<string, any> | null;
        if (!eventName) {
          await appendWebhookAudit({ outcome: "rejected", reason: "missing_event_name", deliveryId, clientIp });
          return sendJson(res, 400, { ok: false, error: "x-github-event header is required" });
        }
        const payload = body || {};
        const repoSlug =
          typeof payload?.repository?.full_name === "string" ? String(payload.repository.full_name).trim() : undefined;
        const workflowId = String(payload?.workflowId || payload?.workflow_id || payload?.external_id || "").trim();
        if (!workflowId) {
          await appendWebhookAudit({ outcome: "rejected", reason: "missing_workflow_id", eventName, deliveryId, clientIp });
          return sendJson(res, 400, {
            ok: false,
            error: "workflowId is required in webhook payload (workflowId|workflow_id|external_id)",
          });
        }

        if (eventName === "pull_request") {
          const action = String(payload?.action || "").toLowerCase();
          const pr = payload?.pull_request || {};
          const merged = Boolean(pr?.merged);
          let status: "planned" | "opened" | "merged" | "closed" | "failed" = "opened";
          if (action === "closed" && merged) status = "merged";
          else if (action === "closed") status = "closed";
          else if (action === "opened" || action === "reopened" || action === "synchronize") status = "opened";

          const saved = recordPullRequestStatus({
            workflowId,
            status,
            issueId: payload?.issue?.number ? String(payload.issue.number) : undefined,
            branchName: typeof pr?.head?.ref === "string" ? String(pr.head.ref) : undefined,
            repoSlug,
            mode: "live",
            number: typeof pr?.number === "number" ? pr.number : null,
            url: typeof pr?.html_url === "string" ? String(pr.html_url) : null,
          });
          await appendWebhookAudit({
            outcome: "accepted",
            mapped: "pr_status",
            eventName,
            deliveryId,
            workflowId,
            status,
            clientIp,
          });
          return sendJson(res, 200, { event: "pull_request", mapped: "pr_status", ...saved });
        }

        if (eventName === "workflow_run" || eventName === "check_run" || eventName === "check_suite" || eventName === "status") {
          let raw = "";
          let url = "";
          if (eventName === "workflow_run") {
            raw = String(payload?.workflow_run?.conclusion || payload?.workflow_run?.status || "").toLowerCase();
            url = String(payload?.workflow_run?.html_url || "");
          } else if (eventName === "check_run") {
            raw = String(payload?.check_run?.conclusion || payload?.check_run?.status || "").toLowerCase();
            url = String(payload?.check_run?.html_url || payload?.check_run?.details_url || "");
          } else if (eventName === "check_suite") {
            raw = String(payload?.check_suite?.conclusion || payload?.check_suite?.status || "").toLowerCase();
            url = String(payload?.check_suite?.url || "");
          } else {
            raw = String(payload?.state || "").toLowerCase();
            url = String(payload?.target_url || "");
          }
          let status: "queued" | "running" | "passed" | "failed" = "running";
          if (["queued", "pending", "requested", "waiting"].includes(raw)) status = "queued";
          else if (["running", "in_progress"].includes(raw)) status = "running";
          else if (["success", "passed", "completed_success", "neutral", "skipped"].includes(raw)) status = "passed";
          else if (["failed", "failure", "timed_out", "cancelled", "completed_failure", "error"].includes(raw)) status = "failed";

          const saved = recordCiStatus({
            workflowId,
            provider: eventName,
            status,
            url: url || undefined,
          });
          await appendWebhookAudit({
            outcome: "accepted",
            mapped: "ci_status",
            eventName,
            deliveryId,
            workflowId,
            status,
            clientIp,
          });
          return sendJson(res, 200, { event: eventName, mapped: "ci_status", ...saved });
        }

        if (eventName === "pull_request_review" || eventName === "pull_request_review_comment") {
          const reviewBody =
            typeof payload?.review?.body === "string"
              ? String(payload.review.body).trim()
              : typeof payload?.comment?.body === "string"
                ? String(payload.comment.body).trim()
                : "";
          const branchName =
            typeof payload?.pull_request?.head?.ref === "string" ? String(payload.pull_request.head.ref).trim() : "";
          const issueId =
            payload?.pull_request?.number != null ? String(payload.pull_request.number).trim() : "";
          const repoPath = String(payload?.repoPath || "").trim();
        if (!reviewBody || !branchName || !issueId || !repoPath) {
          await appendWebhookAudit({
            outcome: "rejected",
            reason: "missing_review_fields",
            eventName,
            deliveryId,
            workflowId,
            clientIp,
          });
          return sendJson(res, 400, {
            ok: false,
            error: "review webhook requires review/comment body, pull_request head.ref, pull_request number, and repoPath",
          });
        }
          const queued = queueRevisionFromReview({
            workflowId,
            repoPath,
            issueId,
            branchName,
            comment: reviewBody,
            repoSlug,
            prDryRun: true,
          });
          await appendWebhookAudit({
            outcome: "accepted",
            mapped: "review_revision",
            eventName,
            deliveryId,
            workflowId,
            issueId,
            branchName,
            clientIp,
          });
          return sendJson(res, 200, { event: eventName, mapped: "review_revision", ...queued });
        }

        await appendWebhookAudit({
          outcome: "rejected",
          reason: "unsupported_event",
          eventName,
          deliveryId,
          workflowId,
          clientIp,
        });
        return sendJson(res, 400, { ok: false, error: `unsupported github webhook event: ${eventName}` });
      }

      if (req.method === "GET" && url.pathname === "/v1/orchestrator/github/webhook-audit") {
        const limitRaw = Number(url.searchParams.get("limit") || 100);
        const outcome = String(url.searchParams.get("outcome") || "");
        const mapped = String(url.searchParams.get("mapped") || "");
        const entries = readWebhookAudit({ limit: limitRaw, outcome, mapped });
        return sendJson(res, 200, { ok: true, entries, count: entries.length });
      }

      // --- CANCEL (plan or stream)
      if (req.method === "POST" && url.pathname === "/v1/cancel") {
        const body = (await readJson(req)) as CancelRequest;

        if (body.planRunId) {
          const st = runningPlans.get(body.planRunId);
          if (st) st.cancelled = true;
        }
        if (body.streamId) {
          const st = runningStreams.get(body.streamId);
          if (st) st.cancelled = true;
        }
        return sendJson(res, 200, { ok: true });
      }

      return sendJson(res, 404, { ok: false, error: "Not found" });
    } catch (e: any) {
      const code = e?.statusCode ?? 500;
      return sendJson(res, code, { ok: false, error: e?.message ?? "Server error" });
    }
  });

  return {
    listen(): Promise<number> {
      return new Promise((resolve) => {
        server.listen(port, "127.0.0.1", () => {
          const addr = server.address();
          const boundPort = typeof addr === "object" && addr ? addr.port : port;
          // eslint-disable-next-line no-console
          console.log(`[agentd] listening on http://127.0.0.1:${boundPort}`);
          resolve(boundPort);
        });
      });
    },
    close(): Promise<void> {
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }
  };
}
