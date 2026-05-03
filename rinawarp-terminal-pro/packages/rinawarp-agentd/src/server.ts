/**
 * This is the core: plan endpoint, execute endpoint, cancel, stream.
 */
import http from "node:http";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ExecutionEngine } from "@rinawarp/core/enforcement/index.js";
import { createStandardRegistry } from "@rinawarp/core/tools/registry.js";
import { executeViaEngine } from "@rinawarp/core/adapters/unify-execution.js";
import type { ConfirmationToken, ExecutionReport, LicenseTier, PlanStep as CorePlanStep, ToolEvent } from "@rinawarp/core/enforcement/types.js";
import { normalizeProjectRoot } from "./projectRoot.js";
import { createSignedAuthToken, requireAuth, verifySignedAuthToken } from "./auth.js";
import { handlePreflight, setCors } from "./cors.js";
import { sseInit, sseSend } from "./streaming.js";
import { resolveRequestLicense } from "./license.js";
import type { ExecutePlanRequest, CancelRequest } from "./types.js";
import { paths } from "./daemon/state.js";
import {
  applyStripeWebhookEvent,
  getAuditRetentionConfig,
  getWorkspaceActorRole,
  rotateInviteSecurityKeys,
  runAuditCleanup,
  setAuditRetentionConfig,
  updateInviteSecurityConfig,
} from "./workspace/state.js";
import { enqueueEmail, getMaskedEmailConfig, setEmailConfig, startEmailWorker } from "./workspace/email.js";
import { appendSoc2Event } from "./platform/soc2Log.js";
import { configureResearch, getResearchState, runResearchFetch } from "./platform/research.js";
import { vaultRetrieve, vaultRotate, vaultStore } from "./platform/vault.js";
import { configureArchive, getArchiveState, provisionArchiveBucket, runArchiveJob } from "./platform/archive.js";
import { initEventBus, publishWorkspaceEvent } from "./platform/eventBus.js";
import { attachWorkspaceWebSocketServer } from "./platform/websocket.js";
import { configureAttestation, getAttestationState, runAttestation, verifyAttestationChain } from "./platform/attestation.js";
import { configureTrafficManager, getTrafficManagerState, reconcileTrafficManager } from "./platform/trafficManager.js";
import { activeActiveWrite, configureActiveActive, getActiveActiveState, replayWorkspaceEvents, runReplicationDrill } from "./platform/activeActive.js";
import { configureReconciler, getReconcilerState, runFullReconcile } from "./platform/reconciler.js";
import { configureTokenLifecycle, getTokenLifecycleStatus, registerRefreshSession, revokeRefreshSession, rotateRefreshSession, validateRefreshSession } from "./workspace/tokenLifecycle.js";
import { configureSecurityControls, getSecurityControlsState, runControlEvidenceDrill } from "./platform/securityControls.js";
import { handleAgentRoutes, validatePlanForExecution } from "./server/agent-routes.js";
import { handleDiagnosticsRoutes } from "./server/diagnostics-routes.js";
import { handleFileRoutes } from "./server/file-routes.js";
import { handleHealthRoutes } from "./server/health-routes.js";
import { actorFromRequest, clientIp, readJson, requestId, sendJson } from "./server/response-helpers.js";
import { handleSearchRoutes } from "./server/search-routes.js";
import { handleTaskRoutes } from "./server/task-routes.js";
import { handleWorkflowRoutes } from "./server/workflow-routes.js";
import { handleWorkspaceRoutes } from "./server/workspace-routes.js";

const engine = new ExecutionEngine(createStandardRegistry());

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
function accountPlanFromEnv() {
  const plan = String(process.env.RINAWARP_ACCOUNT_PLAN || "pro").trim();
  const status = String(process.env.RINAWARP_ACCOUNT_STATUS || "active").trim();
  const seatsAllowed = Number(process.env.RINAWARP_ACCOUNT_SEATS_ALLOWED || 10);
  const seatsUsed = Number(process.env.RINAWARP_ACCOUNT_SEATS_USED || 1);
  const renewsAt = String(process.env.RINAWARP_ACCOUNT_RENEWS_AT || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
  return {
    plan,
    status,
    seats_allowed: Number.isFinite(seatsAllowed) ? seatsAllowed : 10,
    seats_used: Number.isFinite(seatsUsed) ? seatsUsed : 1,
    renews_at: renewsAt,
  };
}

function roleRank(role: "owner" | "admin" | "member"): number {
  if (role === "owner") return 3;
  if (role === "admin") return 2;
  return 1;
}

function ensureWorkspaceRole(req: http.IncomingMessage, workspaceId: string, minRole: "owner" | "admin" | "member"): {
  actorId: string;
  actorEmail: string;
  role: "owner" | "admin" | "member";
} {
  const actor = actorFromRequest(req);
  const role = getWorkspaceActorRole({
    workspaceId,
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
  });
  if (!role) {
    const e = new Error("forbidden");
    (e as Error & { statusCode?: number }).statusCode = 403;
    throw e;
  }
  if (roleRank(role) < roleRank(minRole)) {
    const e = new Error("forbidden");
    (e as Error & { statusCode?: number }).statusCode = 403;
    throw e;
  }
  return { ...actor, role };
}

function logSoc2(args: {
  req: http.IncomingMessage;
  workspaceId?: string;
  action: string;
  result: string;
  details?: Record<string, unknown>;
}): void {
  const actor = actorFromRequest(args.req);
  appendSoc2Event({
    request_id: requestId(args.req),
    user_id: actor.actorId,
    workspace_id: String(args.workspaceId || "system"),
    ip: clientIp(args.req),
    action: args.action,
    result: args.result,
    timestamp: new Date().toISOString(),
    details: args.details,
  });
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
  const bindHost = String(process.env.RINAWARP_AGENTD_BIND_HOST || "127.0.0.1").trim() || "127.0.0.1";
  startEmailWorker();
  initEventBus().catch(() => {
    const required =
      String(process.env.RINAWARP_NATS_REQUIRED || "").trim().toLowerCase() === "true" ||
      (process.env.NODE_ENV === "production" && String(process.env.RINAWARP_NATS_MODE || "").trim().toLowerCase() === "jetstream");
    if (required) {
      throw new Error("event_bus_init_failed");
    }
  });

  const server = http.createServer(async (req, res) => {
    try {
      setCors(req, res);

      if (req.method === "OPTIONS") return handlePreflight(req, res);

      // simple routing
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

      // --- AUTH ROUTES (anonymous)
      if (req.method === "POST" && url.pathname === "/v1/auth/login") {
        const body = (await readJson(req)) as { email?: string; password?: string } | null;
        const email = String(body?.email || "").trim().toLowerCase();
        const password = String(body?.password || "");
        if (!email) return sendJson(res, 400, { ok: false, error: "email is required" });
        const requiredPassword = String(process.env.RINAWARP_AGENTD_ADMIN_PASSWORD || "").trim();
        if (requiredPassword && password !== requiredPassword) {
          return sendJson(res, 401, { ok: false, error: "invalid_credentials" });
        }
        const secret = String(process.env.RINAWARP_AGENTD_AUTH_SECRET || "").trim();
        if (!secret) {
          return sendJson(res, 503, { ok: false, error: "auth_secret_not_configured" });
        }
        const sub = `usr_${Buffer.from(email).toString("hex").slice(0, 12)}`;
        const role = email.startsWith("owner@") || email.endsWith("@rinawarptech.com") ? "owner" : "member";
        const accessToken = createSignedAuthToken({
          sub,
          email,
          role,
          kind: "access",
          jti: randomUUID(),
          ttlSec: 60 * 60,
          secret,
        });
        const refreshJti = randomUUID();
        const refreshToken = createSignedAuthToken({
          sub,
          email,
          role,
          kind: "refresh",
          jti: refreshJti,
          ttlSec: 7 * 24 * 60 * 60,
          secret,
        });
        const refreshClaims = verifySignedAuthToken(refreshToken, secret);
        if (refreshClaims?.jti) {
          registerRefreshSession({
            jti: refreshClaims.jti,
            token: refreshToken,
            user_id: sub,
            email,
            issued_at: refreshClaims.iat,
            expires_at: refreshClaims.exp,
          });
        }
        return sendJson(res, 200, {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 3600,
        });
      }

      if (req.method === "POST" && url.pathname === "/v1/auth/refresh") {
        const body = (await readJson(req)) as { refresh_token?: string } | null;
        const refreshToken = String(body?.refresh_token || "").trim();
        if (!refreshToken) return sendJson(res, 400, { ok: false, error: "refresh_token is required" });
        const secret = String(process.env.RINAWARP_AGENTD_AUTH_SECRET || "").trim();
        if (!secret) return sendJson(res, 503, { ok: false, error: "auth_secret_not_configured" });
        const claims = verifySignedAuthToken(refreshToken, secret);
        if (!claims || claims.kind !== "refresh" || !claims.jti) {
          return sendJson(res, 401, { ok: false, error: "invalid_refresh_token" });
        }
        const sessionCheck = validateRefreshSession({
          jti: claims.jti,
          token: refreshToken,
          user_id: claims.sub,
        });
        if (!sessionCheck.ok) {
          return sendJson(res, 401, { ok: false, error: sessionCheck.error });
        }
        const newRefreshJti = randomUUID();
        const accessToken = createSignedAuthToken({
          sub: claims.sub,
          email: claims.email,
          role: claims.role,
          kind: "access",
          jti: randomUUID(),
          ttlSec: 60 * 60,
          secret,
        });
        const nextRefreshToken = createSignedAuthToken({
          sub: claims.sub,
          email: claims.email,
          role: claims.role,
          kind: "refresh",
          jti: newRefreshJti,
          ttlSec: 7 * 24 * 60 * 60,
          secret,
        });
        const nextRefreshClaims = verifySignedAuthToken(nextRefreshToken, secret);
        if (nextRefreshClaims?.jti) {
          rotateRefreshSession({
            old_jti: claims.jti,
            new_jti: nextRefreshClaims.jti,
            new_token: nextRefreshToken,
            user_id: claims.sub,
            email: claims.email,
            issued_at: nextRefreshClaims.iat,
            expires_at: nextRefreshClaims.exp,
          });
        }
        return sendJson(res, 200, {
          access_token: accessToken,
          refresh_token: nextRefreshToken,
          expires_in: 3600,
        });
      }

      if (req.method === "POST" && url.pathname === "/v1/auth/revoke") {
        const body = (await readJson(req)) as { refresh_token?: string; reason?: string } | null;
        const refreshToken = String(body?.refresh_token || "").trim();
        if (!refreshToken) return sendJson(res, 400, { ok: false, error: "refresh_token is required" });
        const secret = String(process.env.RINAWARP_AGENTD_AUTH_SECRET || "").trim();
        if (!secret) return sendJson(res, 503, { ok: false, error: "auth_secret_not_configured" });
        const claims = verifySignedAuthToken(refreshToken, secret);
        if (!claims || claims.kind !== "refresh" || !claims.jti) {
          return sendJson(res, 401, { ok: false, error: "invalid_refresh_token" });
        }
        const out = revokeRefreshSession({ jti: claims.jti, reason: String(body?.reason || "manual_revoke").trim() || "manual_revoke" });
        return sendJson(res, out.ok ? 200 : 404, { ok: out.ok, ...(out.ok ? {} : { error: "refresh_session_not_found" }) });
      }

      if (req.method === "POST" && url.pathname === "/v1/webhooks/stripe") {
        const payload = await readJson(req) as {
          type?: string;
          data?: { object?: { metadata?: { workspace_id?: string }; seats_allowed?: number } };
          workspace_id?: string;
          seats_allowed?: number;
        } | null;
        const type = String(payload?.type || "").trim();
        const workspaceId = String(payload?.data?.object?.metadata?.workspace_id || payload?.workspace_id || "").trim();
        if (!type || !workspaceId) return sendJson(res, 400, { ok: false, error: "type and workspace_id are required" });
        const updated = applyStripeWebhookEvent({
          workspaceId,
          type,
          seatsAllowed: Number(payload?.data?.object?.seats_allowed ?? payload?.seats_allowed),
        });
        if (!updated) return sendJson(res, 404, { ok: false, error: "workspace_not_found" });
        return sendJson(res, 200, { ok: true, workspace: updated });
      }

      // auth for protected routes
      requireAuth(req);

      if (req.method === "GET" && url.pathname === "/v1/account/plan") {
        return sendJson(res, 200, accountPlanFromEnv());
      }

      if (await handleHealthRoutes(req, res, url, { logSoc2 })) return;
      if (await handleSearchRoutes(req, res, url, { logSoc2 })) return;
      if (await handleFileRoutes(req, res, url)) return;
      if (req.method === "PUT" && url.pathname === "/v1/platform/research/config") {
        const body = (await readJson(req)) as {
          enabled?: boolean;
          allowed_domains?: string[];
          timeout_ms?: number;
          max_bytes?: number;
          max_excerpt_chars?: number;
        } | null;
        const cfg = configureResearch(body || {});
        logSoc2({
          req,
          action: "research_config_update",
          result: "ok",
          details: cfg as unknown as Record<string, unknown>,
        });
        return sendJson(res, 200, { ok: true, config: cfg });
      }
      if (req.method === "GET" && url.pathname === "/v1/platform/research/status") {
        return sendJson(res, 200, { ok: true, config: getResearchState() });
      }
      if (req.method === "POST" && url.pathname === "/v1/platform/research/fetch") {
        const body = (await readJson(req)) as { url?: string } | null;
        const out = await runResearchFetch({ url: String(body?.url || "") });
        logSoc2({
          req,
          action: "research_fetch",
          result: out.ok ? "ok" : "error",
          details: out as unknown as Record<string, unknown>,
        });
        return sendJson(res, out.ok ? 200 : 400, out);
      }
      if (req.method === "PUT" && url.pathname === "/v1/platform/traffic/config") {
        const body = (await readJson(req)) as {
          enabled?: boolean;
          provider?: "route53" | "cloudflare";
          hosted_zone_id?: string;
          record_name?: string;
          primary_dns?: string;
          secondary_dns?: string;
          ttl?: number;
          region_primary?: "us-east-1" | "eu-west-1";
          cloudflare_api_token?: string;
          cloudflare_zone_id?: string;
        } | null;
        const cfg = configureTrafficManager(body || {});
        logSoc2({
          req,
          action: "traffic_manager_config_update",
          result: "ok",
          details: cfg as unknown as Record<string, unknown>,
        });
        return sendJson(res, 200, { ok: true, config: cfg });
      }
      if (req.method === "GET" && url.pathname === "/v1/platform/traffic/status") {
        return sendJson(res, 200, { ok: true, config: getTrafficManagerState() });
      }
      if (req.method === "POST" && url.pathname === "/v1/platform/traffic/reconcile") {
        const body = (await readJson(req)) as { force?: boolean } | null;
        const out = await reconcileTrafficManager(body?.force === true);
        logSoc2({
          req,
          action: "traffic_manager_reconcile",
          result: out.ok ? "ok" : "error",
          details: out as unknown as Record<string, unknown>,
        });
        return sendJson(res, out.ok ? 200 : 400, out);
      }
      if (req.method === "PUT" && url.pathname === "/v1/platform/active-active/config") {
        const body = (await readJson(req)) as { enabled?: boolean; strict_conflicts?: boolean } | null;
        const cfg = configureActiveActive(body || {});
        logSoc2({
          req,
          action: "active_active_config_update",
          result: "ok",
          details: cfg as unknown as Record<string, unknown>,
        });
        return sendJson(res, 200, { ok: true, config: cfg });
      }
      if (req.method === "GET" && url.pathname === "/v1/platform/active-active/status") {
        return sendJson(res, 200, { ok: true, config: getActiveActiveState() });
      }
      if (req.method === "POST" && url.pathname === "/v1/platform/active-active/write") {
        const body = (await readJson(req)) as {
          workspace_id?: string;
          region?: string;
          base_vector?: { "us-east-1"?: number; "eu-west-1"?: number };
          event_id?: string;
          mutations?: Array<{ type?: string; entity?: string; payload?: Record<string, unknown> }>;
        } | null;
        const workspaceId = String(body?.workspace_id || "").trim();
        const region = String(body?.region || "").trim();
        if (!workspaceId || !region) return sendJson(res, 400, { ok: false, error: "workspace_id and region are required" });
        const out = activeActiveWrite({
          workspace_id: workspaceId,
          region,
          base_vector: body?.base_vector,
          event_id: body?.event_id,
          mutations: (body?.mutations || []).map((m) => ({
            type: String(m?.type || "mutation"),
            ...(m?.entity ? { entity: m.entity } : {}),
            ...(m?.payload ? { payload: m.payload } : {}),
          })),
        });
        logSoc2({
          req,
          workspaceId,
          action: "active_active_write",
          result: out.ok ? "ok" : "error",
          details: out as unknown as Record<string, unknown>,
        });
        return sendJson(res, out.ok ? 200 : out.error === "conflict" ? 409 : 400, out);
      }
      if (req.method === "POST" && url.pathname === "/v1/platform/active-active/replication/drill") {
        const body = (await readJson(req)) as { workspace_id?: string } | null;
        const out = runReplicationDrill({ workspace_id: String(body?.workspace_id || "").trim() || undefined });
        logSoc2({
          req,
          action: "active_active_replication_drill",
          result: out.ok ? "ok" : "error",
          details: out as unknown as Record<string, unknown>,
        });
        return sendJson(res, out.ok ? 200 : 409, out);
      }
      if (req.method === "POST" && url.pathname === "/v1/platform/active-active/replay") {
        const body = (await readJson(req)) as { workspace_id?: string; from_event_id?: string } | null;
        const workspaceId = String(body?.workspace_id || "").trim();
        if (!workspaceId) return sendJson(res, 400, { ok: false, error: "workspace_id is required" });
        const out = replayWorkspaceEvents({
          workspace_id: workspaceId,
          ...(body?.from_event_id ? { from_event_id: String(body.from_event_id) } : {}),
        });
        logSoc2({
          req,
          workspaceId,
          action: "active_active_replay",
          result: "ok",
          details: out as unknown as Record<string, unknown>,
        });
        return sendJson(res, 200, out);
      }
      if (req.method === "PUT" && url.pathname === "/v1/platform/reconciler/config") {
        const body = (await readJson(req)) as {
          enabled?: boolean;
          runtime_queue_stuck_after_sec?: number;
          runtime_running_stuck_grace_sec?: number;
          runtime_auto_remediate?: boolean;
          max_runtime_remediations?: number;
          archive_interval_sec?: number;
        } | null;
        const cfg = configureReconciler(body || {});
        logSoc2({
          req,
          action: "reconciler_config_update",
          result: "ok",
          details: cfg as unknown as Record<string, unknown>,
        });
        return sendJson(res, 200, { ok: true, config: cfg });
      }
      if (req.method === "GET" && url.pathname === "/v1/platform/reconciler/status") {
        return sendJson(res, 200, { ok: true, config: getReconcilerState() });
      }
      if (req.method === "POST" && url.pathname === "/v1/platform/reconciler/run") {
        const body = (await readJson(req)) as { force?: boolean } | null;
        const out = await runFullReconcile(body?.force === true);
        logSoc2({
          req,
          action: "reconciler_run",
          result: out.ok ? "ok" : "error",
          details: out as unknown as Record<string, unknown>,
        });
        return sendJson(res, out.ok ? 200 : 409, out);
      }
      if (req.method === "PUT" && url.pathname === "/v1/platform/security/controls/config") {
        const body = (await readJson(req)) as {
          mtls_mode?: "off" | "permissive" | "strict";
          mesh_provider?: "istio" | "linkerd" | "none";
          evidence_interval_sec?: number;
        } | null;
        const cfg = configureSecurityControls(body || {});
        logSoc2({
          req,
          action: "security_controls_config_update",
          result: "ok",
          details: cfg as unknown as Record<string, unknown>,
        });
        return sendJson(res, 200, { ok: true, config: cfg });
      }
      if (req.method === "GET" && url.pathname === "/v1/platform/security/controls/status") {
        return sendJson(res, 200, { ok: true, config: getSecurityControlsState() });
      }
      if (req.method === "POST" && url.pathname === "/v1/platform/security/controls/drill") {
        const body = (await readJson(req)) as { force?: boolean } | null;
        const out = await runControlEvidenceDrill(body?.force === true);
        logSoc2({
          req,
          action: "security_controls_drill",
          result: out.ok ? "ok" : "error",
          details: out as unknown as Record<string, unknown>,
        });
        return sendJson(res, out.ok ? 200 : 409, out);
      }

      if (req.method === "POST" && url.pathname === "/v1/vault/store") {
        const body = (await readJson(req)) as { id?: string; workspace_id?: string; token?: string } | null;
        const workspaceId = String(body?.workspace_id || "").trim();
        const token = String(body?.token || "");
        if (!workspaceId || !token) return sendJson(res, 400, { ok: false, error: "workspace_id and token are required" });
        const actor = ensureWorkspaceRole(req, workspaceId, "admin");
        const stored = await vaultStore({ id: body?.id, workspace_id: workspaceId, token });
        logSoc2({
          req,
          workspaceId,
          action: "vault_store",
          result: "ok",
          details: { vault_id: stored.id, key_version: stored.key_version, actor_role: actor.role },
        });
        return sendJson(res, 200, { ok: true, id: stored.id, key_version: stored.key_version });
      }

      if (req.method === "GET" && url.pathname === "/v1/vault/retrieve") {
        const id = String(url.searchParams.get("id") || "").trim();
        const workspaceId = String(url.searchParams.get("workspace_id") || "").trim();
        if (!id || !workspaceId) return sendJson(res, 400, { ok: false, error: "id and workspace_id are required" });
        ensureWorkspaceRole(req, workspaceId, "admin");
        const rec = await vaultRetrieve(id);
        if (!rec) return sendJson(res, 404, { ok: false, error: "not_found" });
        logSoc2({ req, workspaceId, action: "vault_retrieve", result: "ok", details: { vault_id: id } });
        return sendJson(res, 200, { ok: true, id: rec.id, token: rec.token, key_version: rec.key_version });
      }

      if (req.method === "POST" && url.pathname === "/v1/vault/rotate") {
        const rotated = await vaultRotate();
        logSoc2({ req, action: "vault_rotate", result: "ok", details: rotated });
        return sendJson(res, 200, { ok: true, ...rotated });
      }

      if (req.method === "PUT" && url.pathname === "/v1/platform/archive/config") {
        const body = (await readJson(req)) as {
          enabled?: boolean;
          bucket?: string;
          region?: string;
          object_lock_mode?: "GOVERNANCE" | "COMPLIANCE";
          object_lock_days?: number;
        } | null;
        const cfg = configureArchive(body || {});
        logSoc2({ req, action: "archive_config_update", result: "ok", details: cfg as unknown as Record<string, unknown> });
        return sendJson(res, 200, { ok: true, config: cfg });
      }

      if (req.method === "GET" && url.pathname === "/v1/platform/archive/status") {
        return sendJson(res, 200, { ok: true, config: getArchiveState() });
      }

      if (req.method === "PUT" && url.pathname === "/v1/platform/attestation/config") {
        const body = (await readJson(req)) as {
          enabled?: boolean;
          bucket?: string;
          region?: string;
          webhook_url?: string;
        } | null;
        const cfg = configureAttestation(body || {});
        logSoc2({
          req,
          action: "attestation_config_update",
          result: "ok",
          details: cfg as unknown as Record<string, unknown>,
        });
        return sendJson(res, 200, { ok: true, config: cfg });
      }

      if (req.method === "GET" && url.pathname === "/v1/platform/attestation/status") {
        return sendJson(res, 200, { ok: true, config: getAttestationState() });
      }

      if (req.method === "POST" && url.pathname === "/v1/platform/attestation/run") {
        const body = (await readJson(req)) as { force?: boolean } | null;
        const out = await runAttestation(body?.force === true);
        logSoc2({
          req,
          action: "attestation_run",
          result: out.ok ? "ok" : "error",
          details: out as unknown as Record<string, unknown>,
        });
        return sendJson(res, out.ok ? 200 : 400, out);
      }
      if (req.method === "POST" && url.pathname === "/v1/platform/attestation/verify") {
        const out = await verifyAttestationChain();
        logSoc2({
          req,
          action: "attestation_verify",
          result: out.ok ? "ok" : "error",
          details: out as unknown as Record<string, unknown>,
        });
        return sendJson(res, out.ok ? 200 : 409, out);
      }

      if (req.method === "POST" && url.pathname === "/v1/platform/archive/run") {
        const body = (await readJson(req)) as { force?: boolean } | null;
        const out = await runArchiveJob(body?.force === true);
        logSoc2({
          req,
          action: "archive_run",
          result: out.ok ? "ok" : "error",
          details: out as unknown as Record<string, unknown>,
        });
        return sendJson(res, out.ok ? 200 : 400, out);
      }

      if (req.method === "POST" && url.pathname === "/v1/platform/archive/provision") {
        const body = (await readJson(req)) as {
          bucket?: string;
          region?: string;
          object_lock_mode?: "GOVERNANCE" | "COMPLIANCE";
          retention_days?: number;
        } | null;
        const bucket = String(body?.bucket || "").trim();
        if (!bucket) return sendJson(res, 400, { ok: false, error: "bucket is required" });
        const out = await provisionArchiveBucket({
          bucket,
          region: body?.region,
          objectLockMode: body?.object_lock_mode,
          retentionDays: Number(body?.retention_days || 90),
        });
        logSoc2({
          req,
          action: "archive_provision_bucket",
          result: out.ok ? "ok" : "error",
          details: out as unknown as Record<string, unknown>,
        });
        return sendJson(res, out.ok ? 200 : 400, out);
      }

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

      if (await handleAgentRoutes(req, res, url)) return;

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

      if (await handleDiagnosticsRoutes(req, res, url, { metrics })) return;

      if (await handleTaskRoutes(req, res, url, { ensureWorkspaceRole, logSoc2, publishWorkspaceEvent })) return;

      if (await handleWorkspaceRoutes(req, res, url)) return;

      if (req.method === "PUT" && url.pathname === "/v1/admin/email/config") {
        const body = (await readJson(req)) as {
          provider?: "smtp" | "sendmail" | "log";
          host?: string;
          port?: number;
          username?: string;
          password?: string;
          from?: string;
        } | null;
        const cfg = setEmailConfig({
          provider: body?.provider,
          host: body?.host,
          port: body?.port,
          username: body?.username,
          password: body?.password,
          from: body?.from,
        });
        return sendJson(res, 200, { status: "updated", config: { ...cfg, password: cfg.password ? "***" : null } });
      }

      if (req.method === "GET" && url.pathname === "/v1/admin/email/config") {
        return sendJson(res, 200, { config: getMaskedEmailConfig() });
      }

      if (req.method === "POST" && url.pathname === "/v1/admin/email/test") {
        const body = (await readJson(req)) as { to?: string } | null;
        const to = String(body?.to || "").trim().toLowerCase();
        if (!to) return sendJson(res, 400, { ok: false, error: "to is required" });
        const queued = enqueueEmail({
          to,
          subject: "RinaWarp email test",
          text: `RinaWarp email test sent at ${new Date().toISOString()}`,
        });
        return sendJson(res, 200, { ok: true, queued: true, job_id: queued.job_id });
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

      if (req.method === "PUT" && url.pathname === "/v1/admin/security/tokens/config") {
        const body = (await readJson(req)) as {
          revocation_window_sec?: number;
          refresh_max_age_sec?: number;
        } | null;
        const cfg = configureTokenLifecycle(body || {});
        logSoc2({
          req,
          action: "token_lifecycle_config_update",
          result: "ok",
          details: cfg as unknown as Record<string, unknown>,
        });
        return sendJson(res, 200, { status: "updated", config: cfg });
      }

      if (req.method === "GET" && url.pathname === "/v1/admin/security/tokens/status") {
        const status = getTokenLifecycleStatus();
        return sendJson(res, 200, { status: "ok", config: status });
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

      if (await handleWorkflowRoutes(req, res, url, { ensureWorkspaceRole, logSoc2, publishWorkspaceEvent })) return;

      if (req.method === "GET" && url.pathname === "/v1/ws") {
        return sendJson(res, 426, {
          ok: false,
          error: "upgrade_required",
          hint: "Connect with WebSocket upgrade on /v1/ws?workspace_id=...&access_token=...",
        });
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

  attachWorkspaceWebSocketServer({
    server,
    authorize: (token: string) => {
      const secret = String(process.env.RINAWARP_AGENTD_AUTH_SECRET || "").trim();
      if (secret) return !!verifySignedAuthToken(token, secret);
      const staticToken = String(process.env.RINAWARP_AGENTD_TOKEN || "").trim();
      return !!staticToken && token === staticToken;
    },
  });

  return {
    listen(): Promise<number> {
      return new Promise((resolve) => {
        server.listen(port, bindHost, () => {
          const addr = server.address();
          const boundPort = typeof addr === "object" && addr ? addr.port : port;
          // eslint-disable-next-line no-console
          console.log(`[agentd] listening on http://${bindHost}:${boundPort}`);
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
