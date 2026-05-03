import http from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { appendFile, mkdir } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import { paths } from "../daemon/state.js";
import { createPullRequest } from "../orchestrator/githubAdapter.js";
import { createOrSwitchBranch, currentBranch, ensureGitRepo } from "../orchestrator/gitProvider.js";
import {
  createIssueToPrWorkflow,
  queueRevisionFromReview,
  readWorkspaceGraph,
  recordCiStatus,
  recordPullRequestStatus,
} from "../orchestrator/workspaceGraph.js";
import { createRemoteRun } from "../platform/remoteRuns.js";
import { createWorkflowTemplate, getWorkflowTemplate, listWorkflowTemplates, runWorkflowTemplate, updateWorkflowTemplate } from "../platform/workflowTemplates.js";
import { clientIp, readJson, readRawJson, sendJson } from "./response-helpers.js";

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

function checkWebhookRateLimit(clientIpAddress: string, now = Date.now()): { ok: true } | { ok: false; retryAfterSec: number } {
  const windowMs = webhookRateWindowMs();
  const maxCount = webhookRateLimitPerWindow();
  const current = webhookRateCounters.get(clientIpAddress);
  if (!current || now - current.windowStartMs >= windowMs) {
    webhookRateCounters.set(clientIpAddress, { windowStartMs: now, count: 1 });
    return { ok: true };
  }
  if (current.count >= maxCount) {
    const retryAfterMs = windowMs - (now - current.windowStartMs);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  current.count += 1;
  webhookRateCounters.set(clientIpAddress, current);
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

export async function handleWorkflowRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  deps: {
    ensureWorkspaceRole: WorkspaceRoleGuard;
    logSoc2: Soc2Logger;
    publishWorkspaceEvent: WorkspacePublisher;
  },
): Promise<boolean> {
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
        if (!issueId) {
          sendJson(res, 400, { ok: false, error: "issueId is required" });
          return true;
        }
        if (!repoPath) {
          sendJson(res, 400, { ok: false, error: "repoPath is required" });
          return true;
        }
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
        sendJson(res, 200, created);
        return true;
      }

      if (req.method === "GET" && url.pathname === "/v1/orchestrator/workspace-graph") {
        const graph = readWorkspaceGraph();
        sendJson(res, 200, { ok: true, graph });
        return true;
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
        if (!workflowId) {
          sendJson(res, 400, { ok: false, error: "workflowId is required" });
          return true;
        }
        if (!status || !["queued", "running", "passed", "failed"].includes(status)) {
          sendJson(res, 400, { ok: false, error: "status must be queued|running|passed|failed" });
        return true;
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
        sendJson(res, 200, { ...saved, autoRevision });
        return true;
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
          sendJson(res, 400, {
            ok: false,
            error: "workflowId, repoPath, issueId, branchName, and comment are required",
          });
        return true;
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
        sendJson(res, 200, queued);
        return true;
      }

      if (req.method === "POST" && url.pathname === "/v1/orchestrator/git/prepare-branch") {
        const body = (await readJson(req)) as { repoPath?: string; issueId?: string; branchName?: string } | null;
        const repoPath = String(body?.repoPath || "").trim();
        const issueId = String(body?.issueId || "").trim();
        if (!repoPath) {
          sendJson(res, 400, { ok: false, error: "repoPath is required" });
          return true;
        }
        if (!issueId && !body?.branchName) {
          sendJson(res, 400, { ok: false, error: "issueId or branchName is required" });
        return true;
        }
        const branchName = String(body?.branchName || `rina/fix-${issueId}`).replace(/[^\w./-]+/g, "-");
        await ensureGitRepo(repoPath);
        const before = await currentBranch(repoPath);
        await createOrSwitchBranch(repoPath, branchName);
        const after = await currentBranch(repoPath);
        sendJson(res, 200, { ok: true, before, after, branchName });
        return true;
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
          sendJson(res, 400, { ok: false, error: "repoSlug, head, and title are required" });
        return true;
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
        if (!result.ok) {
          sendJson(res, 400, result);
          return true;
        }
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
        sendJson(res, 200, result);
        return true;
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
        if (!workflowId) {
          sendJson(res, 400, { ok: false, error: "workflowId is required" });
          return true;
        }
        if (!status || !["planned", "opened", "merged", "closed", "failed"].includes(status)) {
          sendJson(res, 400, { ok: false, error: "status must be planned|opened|merged|closed|failed" });
        return true;
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
        sendJson(res, 200, saved);
        return true;
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
        if (!workflowId) {
          sendJson(res, 400, { ok: false, error: "workflowId is required" });
          return true;
        }
        if (!event || !["pull_request", "ci", "review_comment"].includes(event)) {
          sendJson(res, 400, { ok: false, error: "event must be pull_request|ci|review_comment" });
        return true;
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
          sendJson(res, 200, { event, mapped: "pr_status", ...saved });
        return true;
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
          sendJson(res, 200, { event, mapped: "ci_status", ...saved });
        return true;
        }

        const comment = String(body?.comment || "").trim();
        const repoPath = String(body?.repoPath || "").trim();
        const issueId = String(body?.issueId || "").trim();
        const branchName = String(body?.branchName || "").trim();
        if (!comment || !repoPath || !issueId || !branchName) {
          sendJson(res, 400, {
            ok: false,
            error: "review_comment event requires comment, repoPath, issueId, and branchName",
          });
        return true;
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
        sendJson(res, 200, { event, mapped: "review_revision", ...queued });
        return true;
      }

      if (req.method === "POST" && url.pathname === "/v1/orchestrator/github/webhook") {
        const secret = String(process.env.GITHUB_WEBHOOK_SECRET || "").trim();
        const clientIpAddress = clientIp(req);
        const limiter = checkWebhookRateLimit(clientIpAddress);
        if (!limiter.ok) {
          res.setHeader("Retry-After", String(limiter.retryAfterSec));
          await appendWebhookAudit({ outcome: "rejected", reason: "rate_limited", retryAfterSec: limiter.retryAfterSec, clientIp: clientIpAddress });
          sendJson(res, 429, { ok: false, error: "webhook rate limit exceeded" });
        return true;
        }
        let raw = "";
        let json: any = null;
        try {
          const parsed = await readRawJson(req, { maxBytes: webhookMaxBytes() });
          raw = parsed.raw;
          json = parsed.json;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await appendWebhookAudit({ outcome: "rejected", reason: "payload_too_large", error: message, clientIp: clientIpAddress });
          const statusCode = (error as { statusCode?: number })?.statusCode || 400;
          sendJson(res, statusCode, { ok: false, error: message });
        return true;
        }
        const eventName = String(req.headers["x-github-event"] || "").trim().toLowerCase();
        const deliveryId = String(req.headers["x-github-delivery"] || "").trim();
        if (!deliveryId) {
          await appendWebhookAudit({ outcome: "rejected", reason: "missing_delivery_id", eventName, clientIp: clientIpAddress });
          sendJson(res, 400, { ok: false, error: "x-github-delivery header is required" });
        return true;
        }
        const remembered = rememberWebhookDelivery(deliveryId);
        if (!remembered.ok) {
          await appendWebhookAudit({ outcome: "rejected", reason: "duplicate_delivery_id", eventName, deliveryId, clientIp: clientIpAddress });
          sendJson(res, 409, { ok: false, error: remembered.error });
        return true;
        }
        if (process.env.NODE_ENV === "production" && !secret) {
          await appendWebhookAudit({ outcome: "rejected", reason: "missing_secret_production", eventName, deliveryId, clientIp: clientIpAddress });
          sendJson(res, 503, { ok: false, error: "GITHUB_WEBHOOK_SECRET is required in production" });
        return true;
        }
        if (secret) {
          const signature = String(req.headers["x-hub-signature-256"] || "");
          const verified = verifyGithubSignature(raw, signature, secret);
          if (!verified) {
            await appendWebhookAudit({ outcome: "rejected", reason: "invalid_signature", eventName, deliveryId, clientIp: clientIpAddress });
            sendJson(res, 401, { ok: false, error: "invalid webhook signature" });
        return true;
          }
        }
        const body = json as Record<string, any> | null;
        if (!eventName) {
          await appendWebhookAudit({ outcome: "rejected", reason: "missing_event_name", deliveryId, clientIp: clientIpAddress });
          sendJson(res, 400, { ok: false, error: "x-github-event header is required" });
        return true;
        }
        const payload = body || {};
        const repoSlug =
          typeof payload?.repository?.full_name === "string" ? String(payload.repository.full_name).trim() : undefined;
        const workflowId = String(payload?.workflowId || payload?.workflow_id || payload?.external_id || "").trim();
        if (!workflowId) {
          await appendWebhookAudit({ outcome: "rejected", reason: "missing_workflow_id", eventName, deliveryId, clientIp: clientIpAddress });
          sendJson(res, 400, {
            ok: false,
            error: "workflowId is required in webhook payload (workflowId|workflow_id|external_id)",
          });
        return true;
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
            clientIp: clientIpAddress,
          });
          sendJson(res, 200, { event: "pull_request", mapped: "pr_status", ...saved });
        return true;
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
            clientIp: clientIpAddress,
          });
          sendJson(res, 200, { event: eventName, mapped: "ci_status", ...saved });
        return true;
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
            clientIp: clientIpAddress,
          });
          sendJson(res, 400, {
            ok: false,
            error: "review webhook requires review/comment body, pull_request head.ref, pull_request number, and repoPath",
          });
        return true;
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
            clientIp: clientIpAddress,
          });
          sendJson(res, 200, { event: eventName, mapped: "review_revision", ...queued });
        return true;
        }

        await appendWebhookAudit({
          outcome: "rejected",
          reason: "unsupported_event",
          eventName,
          deliveryId,
          workflowId,
          clientIp: clientIpAddress,
        });
        sendJson(res, 400, { ok: false, error: `unsupported github webhook event: ${eventName}` });
        return true;
      }

      if (req.method === "GET" && url.pathname === "/v1/orchestrator/github/webhook-audit") {
        const limitRaw = Number(url.searchParams.get("limit") || 100);
        const outcome = String(url.searchParams.get("outcome") || "");
        const mapped = String(url.searchParams.get("mapped") || "");
        const entries = readWebhookAudit({ limit: limitRaw, outcome, mapped });
        sendJson(res, 200, { ok: true, entries, count: entries.length });
        return true;
      }


  if (req.method === "POST" && url.pathname === "/v1/workflows/templates") {
    const body = (await readJson(req)) as {
      workspace_id?: string;
      name?: string;
      description?: string;
      parameters?: Array<{ name?: string; required?: boolean; default_value?: string; description?: string }>;
      steps?: Array<{ id?: string; command?: string; cwd?: string }>;
    } | null;
    const workspaceId = String(body?.workspace_id || "").trim();
    const name = String(body?.name || "").trim();
    if (!workspaceId) {
      sendJson(res, 400, { ok: false, error: "workspace_id is required" });
      return true;
    }
    if (!name) {
      sendJson(res, 400, { ok: false, error: "name is required" });
      return true;
    }
    const actor = deps.ensureWorkspaceRole(req, workspaceId, "member");
    const tpl = createWorkflowTemplate({
      workspace_id: workspaceId,
      name,
      ...(body?.description ? { description: String(body.description) } : {}),
      ...(Array.isArray(body?.parameters) ? { parameters: body.parameters } : {}),
      ...(Array.isArray(body?.steps) ? { steps: body.steps } : {}),
      actor_id: actor.actorId,
    });
    deps.logSoc2({
      req,
      workspaceId,
      action: "workflow_template_create",
      result: "ok",
      details: { template_id: tpl.id, version: tpl.version },
    });
    await deps.publishWorkspaceEvent({
      workspace_id: workspaceId,
      type: "workflow_template_created",
      payload: { template_id: tpl.id, version: tpl.version },
    });
    sendJson(res, 200, { ok: true, template: tpl });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/v1/workflows/templates") {
    const workspaceId = String(url.searchParams.get("workspace_id") || "").trim();
    if (!workspaceId) {
      sendJson(res, 400, { ok: false, error: "workspace_id is required" });
      return true;
    }
    deps.ensureWorkspaceRole(req, workspaceId, "member");
    const archivedParam = String(url.searchParams.get("archived") || "").trim();
    const archived = archivedParam ? archivedParam === "true" : undefined;
    const limit = Number(url.searchParams.get("limit") || 200);
    const templates = listWorkflowTemplates({
      workspace_id: workspaceId,
      ...(typeof archived === "boolean" ? { archived } : {}),
      ...(Number.isFinite(limit) ? { limit } : {}),
    });
    sendJson(res, 200, { ok: true, templates });
    return true;
  }

  const workflowTemplateMatch = url.pathname.match(/^\/v1\/workflows\/templates\/([^/]+)$/);
  if (req.method === "GET" && workflowTemplateMatch) {
    const templateId = decodeURIComponent(workflowTemplateMatch[1] || "");
    const tpl = getWorkflowTemplate(templateId);
    if (!tpl) {
      sendJson(res, 404, { ok: false, error: "not_found" });
      return true;
    }
    deps.ensureWorkspaceRole(req, tpl.workspace_id, "member");
    sendJson(res, 200, { ok: true, template: tpl });
    return true;
  }

  if (req.method === "PUT" && workflowTemplateMatch) {
    const templateId = decodeURIComponent(workflowTemplateMatch[1] || "");
    const existing = getWorkflowTemplate(templateId);
    if (!existing) {
      sendJson(res, 404, { ok: false, error: "not_found" });
      return true;
    }
    const actor = deps.ensureWorkspaceRole(req, existing.workspace_id, "member");
    const body = (await readJson(req)) as {
      name?: string;
      description?: string;
      parameters?: Array<{ name?: string; required?: boolean; default_value?: string; description?: string }>;
      steps?: Array<{ id?: string; command?: string; cwd?: string }>;
      archived?: boolean;
    } | null;
    const updated = updateWorkflowTemplate({
      id: templateId,
      actor_id: actor.actorId,
      ...(body?.name ? { name: body.name } : {}),
      ...(body?.description ? { description: body.description } : {}),
      ...(Array.isArray(body?.parameters) ? { parameters: body.parameters } : {}),
      ...(Array.isArray(body?.steps) ? { steps: body.steps } : {}),
      ...(typeof body?.archived === "boolean" ? { archived: body.archived } : {}),
    });
    if (!updated) {
      sendJson(res, 404, { ok: false, error: "not_found" });
      return true;
    }
    deps.logSoc2({
      req,
      workspaceId: updated.workspace_id,
      action: "workflow_template_update",
      result: "ok",
      details: { template_id: updated.id, version: updated.version, archived: updated.archived },
    });
    await deps.publishWorkspaceEvent({
      workspace_id: updated.workspace_id,
      type: "workflow_template_updated",
      payload: { template_id: updated.id, version: updated.version, archived: updated.archived },
    });
    sendJson(res, 200, { ok: true, template: updated });
    return true;
  }

  const workflowTemplateRunMatch = url.pathname.match(/^\/v1\/workflows\/templates\/([^/]+)\/run$/);
  if (req.method === "POST" && workflowTemplateRunMatch) {
    const templateId = decodeURIComponent(workflowTemplateRunMatch[1] || "");
    const body = (await readJson(req)) as { parameters?: Record<string, string> } | null;
    const run = runWorkflowTemplate({
      id: templateId,
      parameters: body?.parameters || {},
    });
    if (!run.ok) {
      sendJson(
        res,
        run.error === "template_not_found" ? 404 : run.error === "template_archived" ? 409 : 400,
        run,
      );
      return true;
    }
    deps.ensureWorkspaceRole(req, run.template.workspace_id, "member");
    const remote = createRemoteRun({
      workspace_id: run.template.workspace_id,
      type: "workflow_template_run",
      payload: {
        template_id: run.template.id,
        template_version: run.template.version,
        resolved_steps: run.resolved_steps,
      },
    });
    deps.logSoc2({
      req,
      workspaceId: run.template.workspace_id,
      action: "workflow_template_run",
      result: "ok",
      details: { template_id: run.template.id, remote_run_id: remote.id, resolved_steps: run.resolved_steps.length },
    });
    await deps.publishWorkspaceEvent({
      workspace_id: run.template.workspace_id,
      type: "workflow_template_run_enqueued",
      payload: { template_id: run.template.id, remote_run_id: remote.id },
    });
    sendJson(res, 200, { ok: true, template: run.template, resolved_steps: run.resolved_steps, remote_run: remote });
    return true;
  }

  return false;
}
