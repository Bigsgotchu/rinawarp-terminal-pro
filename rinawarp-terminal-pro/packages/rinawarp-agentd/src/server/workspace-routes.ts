import http from "node:http";
import {
  acceptInvite,
  createInvite,
  createWorkspace,
  getWorkspaceActorRole,
  getSyncState,
  getWorkspace,
  listInvites,
  lockWorkspace,
  queryAudit,
  revokeInvite,
  setBillingEnforcement,
  syncPull,
  syncPush,
  unlockWorkspace,
} from "../workspace/state.js";
import { enqueueEmail } from "../workspace/email.js";
import { getIdempotentReplay, storeIdempotentResponse } from "../workspace/idempotency.js";
import { enforceInviteAcceptCooldown, enforceInviteCreateRate, recordInviteAcceptFailure } from "../workspace/securityStore.js";
import { appendSoc2Event } from "../platform/soc2Log.js";
import { assignWorkspaceRegion } from "../platform/regions.js";
import { publishWorkspaceEvent } from "../platform/eventBus.js";
import { createWorkspaceObject, getWorkspaceObject, listWorkspaceObjects, updateWorkspaceObject } from "../platform/workspaceObjects.js";
import { actorFromRequest, clientIp, readJson, requestId, sendJson } from "./response-helpers.js";

type WorkspaceRole = "owner" | "admin" | "member";

function roleRank(role: WorkspaceRole): number {
  if (role === "owner") return 3;
  if (role === "admin") return 2;
  return 1;
}

function ensureWorkspaceRole(req: http.IncomingMessage, workspaceId: string, minRole: WorkspaceRole): {
  actorId: string;
  actorEmail: string;
  role: WorkspaceRole;
} {
  const actor = actorFromRequest(req);
  const role = getWorkspaceActorRole({
    workspaceId,
    actorId: actor.actorId,
    actorEmail: actor.actorEmail,
  });
  if (!role || roleRank(role) < roleRank(minRole)) {
    const e = new Error("forbidden");
    (e as Error & { statusCode?: number }).statusCode = 403;
    throw e;
  }
  return { ...actor, role };
}

function requireIdempotency(req: http.IncomingMessage): string {
  const key = String(req.headers["idempotency-key"] || "").trim();
  if (!key) {
    const e = new Error("idempotency_key_required");
    (e as Error & { statusCode?: number }).statusCode = 400;
    throw e;
  }
  return key;
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

export async function handleWorkspaceRoutes(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
): Promise<boolean> {
  if (req.method === "POST" && url.pathname === "/v1/workspaces") {
    const idempotencyKey = requireIdempotency(req);
    const body = (await readJson(req)) as { name?: string; region?: string } | null;
    const name = String(body?.name || "").trim();
    if (!name) {
      sendJson(res, 400, { ok: false, error: "name is required" });
      return true;
    }
    const { actorId, actorEmail } = actorFromRequest(req);
    const replay = getIdempotentReplay({ key: idempotencyKey, userId: actorId, route: "POST:/v1/workspaces" });
    if (replay) {
      sendJson(res, replay.status, replay.response);
      return true;
    }
    const created = createWorkspace({
      name,
      region: body?.region,
      ownerId: actorId,
      ownerEmail: actorEmail,
    });
    assignWorkspaceRegion(created.id, created.region);
    const response = { workspace_id: created.id, owner_id: created.owner_id };
    logSoc2({
      req,
      workspaceId: created.id,
      action: "workspace_create",
      result: "ok",
      details: { region: created.region },
    });
    storeIdempotentResponse({
      key: idempotencyKey,
      userId: actorId,
      route: "POST:/v1/workspaces",
      status: 200,
      response,
    });
    sendJson(res, 200, response);
    return true;
  }

  const workspaceGetMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)$/);
  if (req.method === "GET" && workspaceGetMatch) {
    const workspaceId = decodeURIComponent(workspaceGetMatch[1] || "");
    ensureWorkspaceRole(req, workspaceId, "member");
    const ws = getWorkspace(workspaceId);
    if (!ws) {
      sendJson(res, 404, { ok: false, error: "workspace_not_found" });
      return true;
    }
    sendJson(res, 200, ws);
    return true;
  }

  const workspaceRegionMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/region$/);
  if (req.method === "PUT" && workspaceRegionMatch) {
    const workspaceId = decodeURIComponent(workspaceRegionMatch[1] || "");
    ensureWorkspaceRole(req, workspaceId, "owner");
    const body = (await readJson(req)) as { region?: string } | null;
    const assigned = assignWorkspaceRegion(workspaceId, String(body?.region || ""));
    if (!assigned) {
      sendJson(res, 400, { ok: false, error: "invalid_region" });
      return true;
    }
    logSoc2({ req, workspaceId, action: "workspace_region_set", result: "ok", details: { region: assigned } });
    sendJson(res, 200, { ok: true, workspace_id: workspaceId, region: assigned });
    return true;
  }

  const workspaceInviteCreateMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/invites$/);
  if (req.method === "POST" && workspaceInviteCreateMatch) {
    const workspaceId = decodeURIComponent(workspaceInviteCreateMatch[1] || "");
    const actor = ensureWorkspaceRole(req, workspaceId, "admin");
    const idempotencyKey = requireIdempotency(req);
    const replay = getIdempotentReplay({ key: idempotencyKey, userId: actor.actorId, route: `POST:/v1/workspaces/${workspaceId}/invites` });
    if (replay) {
      sendJson(res, replay.status, replay.response);
      return true;
    }
    const body = (await readJson(req)) as {
      email?: string;
      role?: WorkspaceRole;
      expires_in_hours?: number;
      send_email?: boolean;
    } | null;
    const email = String(body?.email || "").trim().toLowerCase();
    const role = String(body?.role || "member").trim().toLowerCase() as WorkspaceRole;
    if (!email) {
      sendJson(res, 400, { ok: false, error: "email is required" });
      return true;
    }
    if (!["owner", "admin", "member"].includes(role)) {
      sendJson(res, 400, { ok: false, error: "role must be owner|admin|member" });
      return true;
    }
    let inviteRate: { ok: true } | { ok: false; retryAfterSec: number };
    try {
      inviteRate = await enforceInviteCreateRate({
        email,
        maxPerMinute: Number(process.env.RINAWARP_INVITE_CREATE_RATE_LIMIT_PER_MIN || 5),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "redis_required_in_production") {
        sendJson(res, 503, { ok: false, error: "redis_required_in_production" });
        return true;
      }
      throw error;
    }
    if (!inviteRate.ok) {
      res.setHeader("Retry-After", String(inviteRate.retryAfterSec));
      sendJson(res, 429, { ok: false, error: "rate_limited", retry_after_sec: inviteRate.retryAfterSec });
      return true;
    }
    try {
      const created = createInvite({
        workspaceId,
        email,
        role,
        expiresInHours: Number(body?.expires_in_hours || 72),
        sendEmail: body?.send_email === true,
        actorId: actor.actorId,
      });
      if (!created) {
        sendJson(res, 404, { ok: false, error: "workspace_not_found" });
        return true;
      }
      let emailDelivery: { queued: boolean; job_id?: string } | undefined;
      if (body?.send_email === true && created.invite_token) {
        const acceptUrl = `https://www.rinawarptech.com/login/?invite_token=${encodeURIComponent(created.invite_token)}`;
        const queued = enqueueEmail({
          to: email,
          subject: "Your RinaWarp workspace invite",
          text: [
            `You were invited to workspace ${workspaceId} as ${role}.`,
            "",
            `Invite ID: ${created.invite_id}`,
            `Accept URL: ${acceptUrl}`,
            "",
            "If you did not expect this invite, ignore this message.",
          ].join("\n"),
        });
        emailDelivery = { queued: true, job_id: queued.job_id };
      }
      const response = {
        invite_id: created.invite_id,
        expires_at: created.expires_at,
        invite_token: created.invite_token || undefined,
        email: emailDelivery || undefined,
      };
      storeIdempotentResponse({
        key: idempotencyKey,
        userId: actor.actorId,
        route: `POST:/v1/workspaces/${workspaceId}/invites`,
        status: 200,
        response,
      });
      logSoc2({
        req,
        workspaceId,
        action: "invite_create",
        result: "ok",
        details: { invite_id: created.invite_id, role, send_email: body?.send_email === true },
      });
      await publishWorkspaceEvent({
        workspace_id: workspaceId,
        type: "invite_created",
        payload: { invite_id: created.invite_id, role, email },
      });
      sendJson(res, 200, response);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "workspace_locked") {
        sendJson(res, 423, { ok: false, error: "workspace_locked" });
        return true;
      }
      if (message === "seat_limit_reached") {
        sendJson(res, 402, { ok: false, error: "payment_required" });
        return true;
      }
      sendJson(res, 400, { ok: false, error: message });
      return true;
    }
  }

  const workspaceInviteListMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/invites$/);
  if (req.method === "GET" && workspaceInviteListMatch) {
    const workspaceId = decodeURIComponent(workspaceInviteListMatch[1] || "");
    ensureWorkspaceRole(req, workspaceId, "admin");
    const ws = getWorkspace(workspaceId);
    if (!ws) {
      sendJson(res, 404, { ok: false, error: "workspace_not_found" });
      return true;
    }
    sendJson(res, 200, { invites: listInvites(workspaceId) });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/v1/invites/accept") {
    const body = (await readJson(req)) as { token?: string } | null;
    const token = String(body?.token || "").trim();
    if (!token) {
      sendJson(res, 400, { ok: false, error: "token is required" });
      return true;
    }
    const { actorId, actorEmail } = actorFromRequest(req);
    const ip = clientIp(req);
    let cooldown: { ok: true } | { ok: false; retryAfterSec: number };
    try {
      cooldown = await enforceInviteAcceptCooldown({ ip });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "redis_required_in_production") {
        sendJson(res, 503, { ok: false, error: "redis_required_in_production" });
        return true;
      }
      throw error;
    }
    if (!cooldown.ok) {
      res.setHeader("Retry-After", String(cooldown.retryAfterSec));
      sendJson(res, 423, { ok: false, error: "locked", retry_after_sec: cooldown.retryAfterSec });
      return true;
    }
    const accepted = acceptInvite({ token, actorId, actorEmail });
    if (!accepted.ok) {
      if (accepted.statusCode === 401) {
        try {
          await recordInviteAcceptFailure({
            ip,
            threshold: Number(process.env.RINAWARP_INVITE_BRUTE_FORCE_THRESHOLD || 10),
            cooldownMinutes: Number(process.env.RINAWARP_INVITE_COOLDOWN_MINUTES || 30),
          });
        } catch {
          // do not fail response path if counter update fails
        }
      }
      sendJson(res, accepted.statusCode || 400, { ok: false, error: accepted.error || "invite_accept_failed" });
      return true;
    }
    logSoc2({
      req,
      workspaceId: accepted.workspace_id,
      action: "invite_accept",
      result: "ok",
      details: { role: accepted.role },
    });
    await publishWorkspaceEvent({
      workspace_id: String(accepted.workspace_id),
      type: "invite_accepted",
      payload: { role: accepted.role, actor_id: actorId },
    });
    sendJson(res, 200, {
      workspace_id: accepted.workspace_id,
      role: accepted.role,
    });
    return true;
  }

  const inviteRevokeMatch = url.pathname.match(/^\/v1\/invites\/([^/]+)\/revoke$/);
  if (req.method === "POST" && inviteRevokeMatch) {
    const inviteId = decodeURIComponent(inviteRevokeMatch[1] || "");
    const { actorId } = actorFromRequest(req);
    const ok = revokeInvite({ inviteId, actorId });
    if (!ok) {
      sendJson(res, 404, { ok: false, error: "invite_not_found_or_not_revokeable" });
      return true;
    }
    sendJson(res, 200, { ok: true });
    return true;
  }

  const billingEnforceMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/billing\/enforce$/);
  if (req.method === "PUT" && billingEnforceMatch) {
    const workspaceId = decodeURIComponent(billingEnforceMatch[1] || "");
    const actor = ensureWorkspaceRole(req, workspaceId, "owner");
    const body = (await readJson(req)) as { require_active_plan?: boolean } | null;
    const updated = setBillingEnforcement({
      workspaceId,
      actorId: actor.actorId,
      requireActivePlan: !!body?.require_active_plan,
    });
    if (!updated) {
      sendJson(res, 404, { ok: false, error: "workspace_not_found" });
      return true;
    }
    sendJson(res, 200, { ok: true, workspace: updated });
    return true;
  }

  const workspaceLockMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/lock$/);
  if (req.method === "POST" && workspaceLockMatch) {
    const workspaceId = decodeURIComponent(workspaceLockMatch[1] || "");
    const actor = ensureWorkspaceRole(req, workspaceId, "owner");
    const idempotencyKey = requireIdempotency(req);
    const replay = getIdempotentReplay({ key: idempotencyKey, userId: actor.actorId, route: `POST:/v1/workspaces/${workspaceId}/lock` });
    if (replay) {
      sendJson(res, replay.status, replay.response);
      return true;
    }
    const body = (await readJson(req)) as { reason?: string } | null;
    const updated = lockWorkspace({
      workspaceId,
      actorId: actor.actorId,
      reason: String(body?.reason || "manual_lock"),
    });
    if (!updated) {
      sendJson(res, 404, { ok: false, error: "workspace_not_found" });
      return true;
    }
    const response = { ok: true, workspace: updated };
    storeIdempotentResponse({
      key: idempotencyKey,
      userId: actor.actorId,
      route: `POST:/v1/workspaces/${workspaceId}/lock`,
      status: 200,
      response,
    });
    sendJson(res, 200, response);
    return true;
  }

  const workspaceUnlockMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/unlock$/);
  if (req.method === "POST" && workspaceUnlockMatch) {
    const workspaceId = decodeURIComponent(workspaceUnlockMatch[1] || "");
    const actor = ensureWorkspaceRole(req, workspaceId, "owner");
    const idempotencyKey = requireIdempotency(req);
    const replay = getIdempotentReplay({ key: idempotencyKey, userId: actor.actorId, route: `POST:/v1/workspaces/${workspaceId}/unlock` });
    if (replay) {
      sendJson(res, replay.status, replay.response);
      return true;
    }
    const updated = unlockWorkspace({ workspaceId, actorId: actor.actorId });
    if (!updated) {
      sendJson(res, 404, { ok: false, error: "workspace_not_found" });
      return true;
    }
    const response = { ok: true, workspace: updated };
    storeIdempotentResponse({
      key: idempotencyKey,
      userId: actor.actorId,
      route: `POST:/v1/workspaces/${workspaceId}/unlock`,
      status: 200,
      response,
    });
    sendJson(res, 200, response);
    return true;
  }

  const workspaceAuditMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/audit$/);
  if (req.method === "GET" && workspaceAuditMatch) {
    const workspaceId = decodeURIComponent(workspaceAuditMatch[1] || "");
    ensureWorkspaceRole(req, workspaceId, "admin");
    const type = String(url.searchParams.get("type") || "");
    const from = String(url.searchParams.get("from") || "");
    const to = String(url.searchParams.get("to") || "");
    const limit = Number(url.searchParams.get("limit") || 100);
    const entries = queryAudit({ workspaceId, type: type || undefined, from: from || undefined, to: to || undefined, limit });
    sendJson(res, 200, { entries });
    return true;
  }

  const syncStateMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/sync\/state$/);
  if (req.method === "GET" && syncStateMatch) {
    const workspaceId = decodeURIComponent(syncStateMatch[1] || "");
    ensureWorkspaceRole(req, workspaceId, "member");
    const state = getSyncState(workspaceId);
    if (!state) {
      sendJson(res, 404, { ok: false, error: "workspace_not_found" });
      return true;
    }
    sendJson(res, 200, state);
    return true;
  }

  const syncPullMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/sync\/pull$/);
  if (req.method === "POST" && syncPullMatch) {
    const workspaceId = decodeURIComponent(syncPullMatch[1] || "");
    ensureWorkspaceRole(req, workspaceId, "member");
    const body = (await readJson(req)) as { since_version?: number } | null;
    const pulled = syncPull({ workspaceId, sinceVersion: Number(body?.since_version || 0) });
    if (!pulled) {
      sendJson(res, 404, { ok: false, error: "workspace_not_found" });
      return true;
    }
    sendJson(res, 200, pulled);
    return true;
  }

  const syncPushMatch = url.pathname.match(/^\/v1\/workspaces\/([^/]+)\/sync\/push$/);
  if (req.method === "POST" && syncPushMatch) {
    const workspaceId = decodeURIComponent(syncPushMatch[1] || "");
    const actor = ensureWorkspaceRole(req, workspaceId, "member");
    const body = (await readJson(req)) as {
      base_version?: number;
      events?: Array<{ type?: string; payload?: Record<string, unknown> }>;
    } | null;
    try {
      const pushed = syncPush({
        workspaceId,
        baseVersion: Number(body?.base_version || 0),
        events: Array.isArray(body?.events)
          ? body.events.map((evt) => ({ type: String(evt?.type || "client_event"), payload: evt?.payload || {} }))
          : [],
        actorId: actor.actorId,
      });
      if (!pushed) {
        sendJson(res, 404, { ok: false, error: "workspace_not_found" });
        return true;
      }
      if (!pushed.ok) {
        sendJson(res, 409, pushed);
        return true;
      }
      await publishWorkspaceEvent({
        workspace_id: workspaceId,
        type: "sync_pushed",
        payload: { new_version: pushed.new_version, event_count: Array.isArray(body?.events) ? body.events.length : 0 },
        version: pushed.new_version,
      });
      sendJson(res, 200, pushed);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "workspace_locked") {
        sendJson(res, 423, { ok: false, error: "workspace_locked" });
        return true;
      }
      sendJson(res, 400, { ok: false, error: message });
      return true;
    }
  }

  if (req.method === "POST" && url.pathname === "/v1/workspace/objects") {
    const body = (await readJson(req)) as {
      workspace_id?: string;
      type?: "prompt" | "workflow" | "snippet";
      name?: string;
      content?: Record<string, unknown>;
    } | null;
    const workspaceId = String(body?.workspace_id || "").trim();
    if (!workspaceId) {
      sendJson(res, 400, { ok: false, error: "workspace_id is required" });
      return true;
    }
    const actor = ensureWorkspaceRole(req, workspaceId, "member");
    const obj = createWorkspaceObject({
      workspace_id: workspaceId,
      type: body?.type,
      name: String(body?.name || "").trim(),
      content: body?.content || {},
      actor_id: actor.actorId,
    });
    logSoc2({
      req,
      workspaceId,
      action: "workspace_object_create",
      result: "ok",
      details: { object_id: obj.id, object_type: obj.type },
    });
    await publishWorkspaceEvent({
      workspace_id: workspaceId,
      type: "workspace_object_created",
      payload: { object_id: obj.id, object_type: obj.type },
    });
    sendJson(res, 200, { ok: true, object: obj });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/v1/workspace/objects") {
    const workspaceId = String(url.searchParams.get("workspace_id") || "").trim();
    if (!workspaceId) {
      sendJson(res, 400, { ok: false, error: "workspace_id is required" });
      return true;
    }
    ensureWorkspaceRole(req, workspaceId, "member");
    const type = String(url.searchParams.get("type") || "").trim();
    const archivedParam = String(url.searchParams.get("archived") || "").trim();
    const archived = archivedParam ? archivedParam === "true" : undefined;
    const limit = Number(url.searchParams.get("limit") || 200);
    const objects = listWorkspaceObjects({
      workspace_id: workspaceId,
      ...(type ? { type } : {}),
      ...(typeof archived === "boolean" ? { archived } : {}),
      ...(Number.isFinite(limit) ? { limit } : {}),
    });
    sendJson(res, 200, { ok: true, objects });
    return true;
  }

  const workspaceObjectMatch = url.pathname.match(/^\/v1\/workspace\/objects\/([^/]+)$/);
  if (req.method === "GET" && workspaceObjectMatch) {
    const objectId = decodeURIComponent(workspaceObjectMatch[1] || "");
    const obj = getWorkspaceObject(objectId);
    if (!obj) {
      sendJson(res, 404, { ok: false, error: "not_found" });
      return true;
    }
    ensureWorkspaceRole(req, obj.workspace_id, "member");
    sendJson(res, 200, { ok: true, object: obj });
    return true;
  }

  if (req.method === "PUT" && workspaceObjectMatch) {
    const objectId = decodeURIComponent(workspaceObjectMatch[1] || "");
    const existing = getWorkspaceObject(objectId);
    if (!existing) {
      sendJson(res, 404, { ok: false, error: "not_found" });
      return true;
    }
    const actor = ensureWorkspaceRole(req, existing.workspace_id, "member");
    const body = (await readJson(req)) as {
      name?: string;
      content?: Record<string, unknown>;
      archived?: boolean;
    } | null;
    const updated = updateWorkspaceObject({
      id: objectId,
      actor_id: actor.actorId,
      ...(body?.name ? { name: body.name } : {}),
      ...(body?.content ? { content: body.content } : {}),
      ...(typeof body?.archived === "boolean" ? { archived: body.archived } : {}),
    });
    if (!updated) {
      sendJson(res, 404, { ok: false, error: "not_found" });
      return true;
    }
    logSoc2({
      req,
      workspaceId: updated.workspace_id,
      action: "workspace_object_update",
      result: "ok",
      details: { object_id: updated.id, version: updated.version, archived: updated.archived },
    });
    await publishWorkspaceEvent({
      workspace_id: updated.workspace_id,
      type: "workspace_object_updated",
      payload: { object_id: updated.id, version: updated.version, archived: updated.archived },
    });
    sendJson(res, 200, { ok: true, object: updated });
    return true;
  }

  return false;
}
