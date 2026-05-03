import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { dialog } from "electron";
import { redactText as defaultRedactText } from "@rinawarp/safety/redaction";
import { doctorCollect, doctorExecuteFix, doctorExportTranscript, doctorGetTranscript, doctorInspect, doctorInterpret, doctorVerify } from "../../doctor-bridge.js";
import { chatRouter } from "../../chat-router.js";
import { runInlineRina, type InlineRinaRequest } from "../inline-rina.js";
import { executeTool } from "../rina-tools.js";
import { getRinaUsageStatus } from "../rina-usage-meter.js";
import type { Role, ShareRecord, TeamInviteRecord } from "../team-storage.js";

type ExportPreviewKind = "runbook_markdown" | "audit_json";
type Risk = "read" | "safe-write" | "high-impact";
type ExportPreviewRecord = any;
type SharePreviewRecord = any;
type PersistedInlineRinaAction = any;
type InlineRinaTriggerType = any;

export function createMainIpcHandlers(deps: any) {
  const {
    ptySessions,
    getDefaultPtyCwd,
    resolveProjectRootSafe,
    listProjectFilesSafe,
    readProjectFileSafe,
    importShellHistory,
    diagnoseHotLinux,
    addTranscriptEntry,
    makePlan,
    PLAYBOOKS,
    structuredSessionStoreRef,
    buildAuditExportText,
    pruneExportPreviewTokens,
    newExportPreviewId,
    exportPreviewTokens,
    EXPORT_PREVIEW_TTL_MS,
    getCurrentUserEmail,
    hashText,
    pruneSharePreviewTokens,
    newSharePreviewId,
    SHARE_PREVIEW_TTL_MS,
    sharePreviewTokens,
    getCurrentRole,
    hasRoleAtLeast,
    loadSharesDb,
    saveSharesDb,
    appendTeamActivity,
    currentPlanHasFeature,
    loadTeamDb,
    saveTeamDb,
    loadTeamInvitesDb,
    saveTeamInvitesDb,
    loadTeamActivity,
    gateProfileCommand,
    evaluatePolicyGate,
    redactForModel,
    sanitizeForPersistence,
    defaultProfileForProject,
    loadProjectRules,
    rulesToSystemBlock,
    summarizeProfile,
    getCurrentPlanId,
    inlineRinaRunStoreRef,
    pendingInlineRinaRuns
  } = deps;
  const structuredSessionStore = structuredSessionStoreRef?.();
  const inlineRinaRunStore = inlineRinaRunStoreRef?.();
// IPC Handlers

// ============================================================
async function workspacePickDirectoryForIpc() {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Select Project Root",
    buttonLabel: "Select Folder"
  });
  
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  
  return result.filePaths[0];
}

async function workspacePickForIpc() {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Select Workspace Folder",
    buttonLabel: "Select"
  });
  
  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false };
  }
  
  return { ok: true, path: result.filePaths[0] };
}

async function workspaceDefaultForIpc(senderId: number) {
  const existing = ptySessions.get(senderId);
  const path = existing?.cwd || getDefaultPtyCwd();
  return { ok: true, path };
}

async function codeListFilesForIpc(args?: { projectRoot?: string; limit?: number }) {
  try {
    const projectRoot = resolveProjectRootSafe(args?.projectRoot);
    const files = listProjectFilesSafe(projectRoot, args?.limit);
    return { ok: true, files };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function codeReadFileForIpc(args?: { projectRoot?: string; relativePath?: string; maxBytes?: number }) {
  try {
    const projectRoot = resolveProjectRootSafe(args?.projectRoot);
    return readProjectFileSafe({
      projectRoot,
      relativePath: String(args?.relativePath || ""),
      maxBytes: args?.maxBytes,
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function pingForIpc() {
  return { pong: true, timestamp: new Date().toISOString() };
}

async function historyImportForIpc(limit?: number) {
  try {
    const data = importShellHistory(Number(limit || 300));
    return { ok: true, ...data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function diagnoseHotForIpc() {
  if (process.platform === "linux") return await diagnoseHotLinux();
  return { platform: process.platform, message: "Tuned for Kali/Linux." };
}

async function planForIpc(intent: string) {
  addTranscriptEntry({ type: "intent", timestamp: new Date().toISOString(), intent });
  const plan = makePlan(intent);
  addTranscriptEntry({ type: "plan", timestamp: new Date().toISOString(), plan });
  return plan;
}

async function playbooksGetForIpc() {
  return PLAYBOOKS.map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    signals: p.signals,
    fixOptions: p.fixOptions.map((f: any) => ({
      name: f.name,
      description: f.description,
      risk: f.risk
    }))
  }));
}

async function playbookExecuteForIpc(playbookId: string, fixIndex: number) {
  const playbook = PLAYBOOKS.find((p: any) => p.id === playbookId);
  if (!playbook) throw new Error("Playbook not found");

  const fix = playbook.fixOptions[fixIndex];
  if (!fix) throw new Error("Fix option not found");

  addTranscriptEntry({ type: "playbook", timestamp: new Date().toISOString(), playbookId, playbookName: playbook.name });
  
  return {
    playbook,
    fix,
    steps: fix.commands.map((cmd: string, i: number) => ({
      id: `f${fixIndex}_s${i + 1}`,
      tool: "terminal",
      command: cmd,
      risk: fix.risk,
      description: fix.verification
    }))
  };
}

async function redactionPreviewForIpc(text: string) {
  const out = defaultRedactText(String(text || ""));
  return {
    redactedText: out.redactedText,
    hits: out.hits,
    redactionCount: out.hits.length,
  };
}
async function exportPreviewForIpc(args: { kind: ExportPreviewKind; sessionId?: string }) {
  const kind = String(args?.kind || "") as ExportPreviewKind;
  let payload = "";
  let redactionCount = 0;
  let hits: Array<{ start: number; end: number; kind: string; level: string; preview: string }> = [];
  let mime = "text/plain";
  let fileName = `rina-export-${Date.now()}.txt`;

  if (kind === "runbook_markdown") {
    const markdown = structuredSessionStore
      ? structuredSessionStore.exportRunbookMarkdown(args?.sessionId)
      : "# RinaWarp Runbook\n\nStructured session store is disabled.\n";
    const redacted = defaultRedactText(markdown);
    payload = redacted.redactedText;
    redactionCount = redacted.hits.length;
    hits = redacted.hits;
    mime = "text/markdown";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fileName = `rina-structured-runbook-${stamp}.md`;
  } else if (kind === "audit_json") {
    payload = buildAuditExportText();
    redactionCount = (payload.match(/\[REDACTED\]/g) || []).length;
    hits = [];
    mime = "application/json";
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    fileName = `rina-audit-${stamp}.json`;
  } else {
    return { ok: false, error: "Unsupported export kind" };
  }

  if (!payload.trim()) return { ok: false, error: "Empty export payload" };

  const now = Date.now();
  pruneExportPreviewTokens(now);
  const previewId = newExportPreviewId();
  const rec: ExportPreviewRecord = {
    id: previewId,
    kind,
    createdAtMs: now,
    expiresAtMs: now + EXPORT_PREVIEW_TTL_MS,
    createdBy: getCurrentUserEmail(),
    payload,
    mime,
    fileName,
    redactionCount,
    contentHash: hashText(payload),
  };
  exportPreviewTokens.set(previewId, rec);
  return {
    ok: true,
    previewId,
    kind,
    redactedText: payload,
    redactionCount,
    hits,
    mime,
    fileName,
    contentHash: rec.contentHash,
    expiresAt: new Date(rec.expiresAtMs).toISOString(),
  };
}

async function exportPublishForIpc(args: { previewId?: string; typedConfirm?: string; expectedHash?: string }) {
  const previewId = String(args?.previewId || "").trim();
  if (!previewId) return { ok: false, error: "Export publish requires previewId." };
  if (String(args?.typedConfirm || "") !== "PUBLISH") {
    return { ok: false, error: 'Export publish requires typed confirmation "PUBLISH".' };
  }

  pruneExportPreviewTokens();
  const rec = exportPreviewTokens.get(previewId);
  if (!rec) return { ok: false, error: "Export preview expired. Generate a new preview before publish." };
  if (rec.createdBy !== getCurrentUserEmail()) {
    return { ok: false, error: "Export preview is not valid for the active user." };
  }
  if (rec.expiresAtMs <= Date.now()) {
    exportPreviewTokens.delete(previewId);
    return { ok: false, error: "Export preview expired. Generate a new preview before publish." };
  }
  if (args?.expectedHash && String(args.expectedHash) !== rec.contentHash) {
    return { ok: false, error: "Export payload changed since preview; regenerate preview." };
  }

  exportPreviewTokens.delete(previewId);
  return {
    ok: true,
    kind: rec.kind,
    content: rec.payload,
    mime: rec.mime,
    fileName: rec.fileName,
    redactionCount: rec.redactionCount,
  };
}
async function sharePreviewForIpc(args: { content: string }) {
  const actorRole = getCurrentRole();
  if (!hasRoleAtLeast(actorRole, "operator")) {
    return { ok: false, error: "Only owner/operator can preview published shares." };
  }
  const content = String(args?.content || "");
  if (!content.trim()) return { ok: false, error: "Empty share content" };
  const redacted = defaultRedactText(content);
  const now = Date.now();
  pruneSharePreviewTokens(now);
  const previewId = newSharePreviewId();
  const rec: SharePreviewRecord = {
    id: previewId,
    createdAtMs: now,
    expiresAtMs: now + SHARE_PREVIEW_TTL_MS,
    createdBy: getCurrentUserEmail(),
    redactedContent: redacted.redactedText,
    redactionCount: redacted.hits.length,
    contentHash: hashText(redacted.redactedText),
  };
  sharePreviewTokens.set(previewId, rec);
  return {
    ok: true,
    previewId,
    redactedText: rec.redactedContent,
    hits: redacted.hits,
    redactionCount: rec.redactionCount,
    expiresAt: new Date(rec.expiresAtMs).toISOString(),
  };
}

async function shareCreateForIpc(args: {
  title?: string;
  content?: string;
  expiresDays?: number;
  requiredRole?: Role;
  previewId?: string;
}) {
  const actorRole = getCurrentRole();
  if (!hasRoleAtLeast(actorRole, "operator")) {
    return { ok: false, error: "Only owner/operator can publish shares." };
  }
  const previewId = String(args?.previewId || "").trim();
  if (!previewId) return { ok: false, error: "Publish requires a redaction preview confirmation." };
  pruneSharePreviewTokens();
  const preview = sharePreviewTokens.get(previewId);
  if (!preview) return { ok: false, error: "Share preview expired. Generate a new preview before publish." };
  if (preview.createdBy !== getCurrentUserEmail()) {
    return { ok: false, error: "Share preview is not valid for the active user." };
  }
  if (preview.expiresAtMs <= Date.now()) {
    sharePreviewTokens.delete(previewId);
    return { ok: false, error: "Share preview expired. Generate a new preview before publish." };
  }
  if (args?.content && String(args.content).trim()) {
    const supplied = defaultRedactText(String(args.content)).redactedText;
    if (hashText(supplied) !== preview.contentHash) {
      return { ok: false, error: "Publish payload does not match the approved preview." };
    }
  }
  const expiresDays = Math.max(1, Math.min(90, Number(args?.expiresDays || 7)));
  const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString();
  const requiredRole =
    args?.requiredRole && ["owner", "operator", "viewer"].includes(args.requiredRole)
      ? args.requiredRole
      : "viewer";
  const db = loadSharesDb();
  const rec: ShareRecord = {
    id: `shr_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    createdBy: getCurrentUserEmail(),
    title: args?.title ? String(args.title).slice(0, 120) : undefined,
    content: preview.redactedContent,
    revoked: false,
    expiresAt,
    requiredRole,
  };
  db.shares.unshift(rec);
  db.shares = db.shares.slice(0, 500);
  saveSharesDb(db);
  sharePreviewTokens.delete(previewId);
  appendTeamActivity("share_created", rec.id, {
    requiredRole: rec.requiredRole,
    expiresAt: rec.expiresAt,
    title: rec.title || null,
  });
  return { ok: true, share: rec };
}

async function shareListForIpc() {
  const db = loadSharesDb();
  const role = getCurrentRole();
  return db.shares
    .filter((s: ShareRecord) => hasRoleAtLeast(role, s.requiredRole))
    .map((s: ShareRecord) => ({
      id: s.id,
      createdAt: s.createdAt,
      createdBy: s.createdBy,
      title: s.title,
      revoked: s.revoked,
      expiresAt: s.expiresAt,
      requiredRole: s.requiredRole,
    }));
}

async function shareGetForIpc(id: string) {
  const db = loadSharesDb();
  const found = db.shares.find((s: ShareRecord) => s.id === id);
  if (!found) return { ok: false, error: "Share not found" };
  if (found.revoked) return { ok: false, error: "Share revoked" };
  if (Date.now() > Date.parse(found.expiresAt)) return { ok: false, error: "Share expired" };
  const role = getCurrentRole();
  if (!hasRoleAtLeast(role, found.requiredRole)) {
    appendTeamActivity("share_access_denied", found.id, {
      requiredRole: found.requiredRole,
      actorRole: role,
    });
    return { ok: false, error: "Insufficient role for share" };
  }
  appendTeamActivity("share_accessed", found.id, {
    requiredRole: found.requiredRole,
  });
  return { ok: true, share: found };
}

async function shareRevokeForIpc(id: string) {
  const role = getCurrentRole();
  if (!hasRoleAtLeast(role, "operator")) {
    return { ok: false, error: "Only owner/operator can revoke shares." };
  }
  const db = loadSharesDb();
  const idx = db.shares.findIndex((s: ShareRecord) => s.id === id);
  if (idx === -1) return { ok: false, error: "Share not found" };
  db.shares[idx] = { ...db.shares[idx], revoked: true };
  saveSharesDb(db);
  appendTeamActivity("share_revoked", id);
  return { ok: true };
}
async function teamGetForIpc() {
  if (!currentPlanHasFeature("team_rollout")) {
    return { ok: false, error: "Power / Team plan required for seat-based team features." };
  }
  return loadTeamDb();
}

async function teamCreateInviteForIpc(args: { email?: string; role?: Role; expiresHours?: number }) {
  if (!currentPlanHasFeature("role_aware_invites")) {
    return { ok: false, error: "Power / Team plan required for role-aware invites." };
  }
  if (getCurrentRole() !== "owner") return { ok: false, error: "Only owner can create invites" };
  const email = String(args?.email || "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Email required" };
  const role = args?.role;
  if (!role || !["owner", "operator", "viewer"].includes(role)) return { ok: false, error: "Invalid role" };
  const expiresHours = Math.max(1, Math.min(24 * 14, Number(args?.expiresHours || 72)));
  const invites = loadTeamInvitesDb();
  const token = `rwi_${crypto.randomBytes(18).toString("hex")}`;
  const rec: TeamInviteRecord = {
    id: `inv_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    token,
    email,
    role,
    createdAt: new Date().toISOString(),
    createdBy: getCurrentUserEmail(),
    expiresAt: new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString(),
    status: "pending",
  };
  invites.invites.unshift(rec);
  invites.invites = invites.invites.slice(0, 1000);
  saveTeamInvitesDb(invites);
  appendTeamActivity("invite_created", rec.id, { email: rec.email, role: rec.role, expiresAt: rec.expiresAt });
  return {
    ok: true,
    invite: {
      ...rec,
      inviteCode: `${rec.id}.${rec.token}`,
    },
  };
}

async function teamListInvitesForIpc(args?: { includeSecrets?: boolean }) {
  if (!currentPlanHasFeature("role_aware_invites")) {
    return { ok: false, error: "Power / Team plan required for role-aware invites." };
  }
  if (!hasRoleAtLeast(getCurrentRole(), "operator")) {
    return { ok: false, error: "Only owner/operator can list invites." };
  }
  const includeSecrets = !!args?.includeSecrets && getCurrentRole() === "owner";
  const invites = loadTeamInvitesDb().invites.map((inv: TeamInviteRecord) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    createdAt: inv.createdAt,
    createdBy: inv.createdBy,
    expiresAt: inv.expiresAt,
    status: inv.status,
    acceptedAt: inv.acceptedAt || null,
    acceptedBy: inv.acceptedBy || null,
    ...(includeSecrets ? { inviteCode: `${inv.id}.${inv.token}` } : {}),
  }));
  return { ok: true, invites };
}

async function teamAcceptInviteForIpc(args: { inviteCode?: string }) {
  if (!currentPlanHasFeature("role_aware_invites")) {
    return { ok: false, error: "Power / Team plan required for role-aware invites." };
  }
  const inviteCode = String(args?.inviteCode || "").trim();
  if (!inviteCode.includes(".")) return { ok: false, error: "Invalid invite code format" };
  const [id, token] = inviteCode.split(".", 2);
  const invites = loadTeamInvitesDb();
  const idx = invites.invites.findIndex((inv: TeamInviteRecord) => inv.id === id);
  if (idx === -1) return { ok: false, error: "Invite not found" };
  const target = invites.invites[idx];
  if (target.status !== "pending") return { ok: false, error: `Invite is ${target.status}` };
  if (target.token !== token) return { ok: false, error: "Invite code mismatch" };
  if (Date.parse(target.expiresAt) <= Date.now()) {
    invites.invites[idx] = { ...target, status: "expired" };
    saveTeamInvitesDb(invites);
    return { ok: false, error: "Invite expired" };
  }
  const currentUser = getCurrentUserEmail();
  if (currentUser !== target.email) {
    return { ok: false, error: `Invite is for ${target.email}; switch current user first.` };
  }
  const team = loadTeamDb();
  const memberIdx = team.members.findIndex((m: { email: string; role: Role }) => m.email === currentUser);
  if (memberIdx >= 0) {
    team.members[memberIdx] = { email: currentUser, role: target.role };
  } else {
    team.members.push({ email: currentUser, role: target.role });
  }
  saveTeamDb(team);
  invites.invites[idx] = {
    ...target,
    status: "accepted",
    acceptedAt: new Date().toISOString(),
    acceptedBy: currentUser,
  };
  saveTeamInvitesDb(invites);
  appendTeamActivity("invite_accepted", target.id, { email: currentUser, role: target.role });
  return { ok: true, role: target.role };
}

async function teamRevokeInviteForIpc(idRaw: string) {
  if (!currentPlanHasFeature("role_aware_invites")) {
    return { ok: false, error: "Power / Team plan required for role-aware invites." };
  }
  if (getCurrentRole() !== "owner") return { ok: false, error: "Only owner can revoke invites" };
  const id = String(idRaw || "").trim();
  if (!id) return { ok: false, error: "Invite id required" };
  const invites = loadTeamInvitesDb();
  const idx = invites.invites.findIndex((inv: TeamInviteRecord) => inv.id === id);
  if (idx === -1) return { ok: false, error: "Invite not found" };
  if (invites.invites[idx].status === "accepted") return { ok: false, error: "Accepted invite cannot be revoked" };
  invites.invites[idx] = { ...invites.invites[idx], status: "revoked" };
  saveTeamInvitesDb(invites);
  appendTeamActivity("invite_revoked", id);
  return { ok: true };
}

async function teamSetCurrentUserForIpc(email: string) {
  if (!currentPlanHasFeature("team_rollout")) {
    return { ok: false, error: "Power / Team plan required for seat-based team features." };
  }
  const team = loadTeamDb();
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return { ok: false, error: "Email required" };
  if (!team.members.some((m: { email: string; role: Role }) => m.email === normalized)) {
    team.members.push({ email: normalized, role: "viewer" });
  }
  const previousUser = team.currentUser || null;
  team.currentUser = normalized;
  saveTeamDb(team);
  appendTeamActivity("current_user_changed", normalized, { previousUser });
  return { ok: true, role: team.members.find((m: { email: string; role: Role }) => m.email === normalized)?.role || "viewer" };
}

async function teamUpsertMemberForIpc(member: { email: string; role: Role }) {
  if (!currentPlanHasFeature("team_rollout")) {
    return { ok: false, error: "Power / Team plan required for seat-based team features." };
  }
  if (getCurrentRole() !== "owner") return { ok: false, error: "Only owner can change team roles" };
  const team = loadTeamDb();
  const email = String(member?.email || "").trim().toLowerCase();
  const role = member?.role;
  if (!email) return { ok: false, error: "Email required" };
  if (!["owner", "operator", "viewer"].includes(role)) return { ok: false, error: "Invalid role" };
  const idx = team.members.findIndex((m: { email: string; role: Role }) => m.email === email);
  if (idx >= 0) team.members[idx] = { email, role };
  else team.members.push({ email, role });
  saveTeamDb(team);
  appendTeamActivity("member_upserted", email, { role });
  return { ok: true };
}

async function teamRemoveMemberForIpc(emailRaw: string) {
  if (!currentPlanHasFeature("team_rollout")) {
    return { ok: false, error: "Power / Team plan required for seat-based team features." };
  }
  if (getCurrentRole() !== "owner") return { ok: false, error: "Only owner can remove team members" };
  const team = loadTeamDb();
  const email = String(emailRaw || "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Email required" };
  const target = team.members.find((m: { email: string; role: Role }) => m.email === email);
  if (!target) return { ok: false, error: "Member not found" };
  if (target.role === "owner") {
    const ownerCount = team.members.filter((m: { email: string; role: Role }) => m.role === "owner").length;
    if (ownerCount <= 1) return { ok: false, error: "Cannot remove last owner" };
  }
  team.members = team.members.filter((m: { email: string; role: Role }) => m.email !== email);
  if (team.currentUser === email) {
    team.currentUser = team.members[0]?.email || "owner@local";
    if (!team.members.some((m: { email: string; role: Role }) => m.email === team.currentUser)) {
      team.members.unshift({ email: team.currentUser, role: "owner" });
    }
  }
  saveTeamDb(team);
  appendTeamActivity("member_removed", email);
  return { ok: true };
}

async function teamActivityForIpc(args?: { limit?: number }) {
  if (!currentPlanHasFeature("shared_team_workflows")) {
    return { ok: false, error: "Power / Team plan required for shared team workflows." };
  }
  if (!hasRoleAtLeast(getCurrentRole(), "operator")) {
    return { ok: false, error: "Only owner/operator can access team activity." };
  }
  const limit = Math.max(1, Math.min(500, Number(args?.limit || 100)));
  return { ok: true, events: loadTeamActivity(limit) };
}

async function auditExportForIpc() {
  if (!hasRoleAtLeast(getCurrentRole(), "operator")) {
    return { ok: false, error: "Only owner/operator can export audit logs." };
  }
  return buildAuditExportText();
}
// --- System Doctor IPC ---
async function doctorInspectForIpc(intent: string) {
  return await doctorInspect(intent);
}

async function doctorCollectForIpc(steps: any[], _streamCallback?: unknown) {
  for (const step of Array.isArray(steps) ? steps : []) {
    const command = step?.input?.command;
    if (typeof command !== "string" || !command.trim()) continue;
    const gate = evaluatePolicyGate(command, false, "");
    if (!gate.ok) {
      throw new Error(gate.message || `Blocked by policy: ${command}`);
    }
  }
  return await doctorCollect(steps, undefined);
}

async function doctorInterpretForIpc(payload: { intent: string; evidence: any }) {
  const safePayload = {
    ...payload,
    intent: redactForModel(payload.intent),
    evidence: sanitizeForPersistence(payload.evidence),
  };
  return await doctorInterpret(safePayload);
}

async function doctorVerifyForIpc(payload: { intent: string; before: any; after: any; diagnosis?: any }) {
  const safePayload = {
    ...payload,
    intent: redactForModel(payload.intent),
    before: sanitizeForPersistence(payload.before),
    after: sanitizeForPersistence(payload.after),
    diagnosis: sanitizeForPersistence(payload.diagnosis),
  };
  return await doctorVerify(safePayload);
}

async function doctorExecuteFixForIpc(plan: any, confirmed: boolean, confirmationText: string) {
  const steps = Array.isArray(plan?.steps) ? plan.steps : [];
  const projectRoot = resolveProjectRootSafe(process.cwd());
  for (const step of steps) {
    const command = step?.input?.command;
    if (typeof command !== "string" || !command.trim()) continue;
    const stepRisk: Risk = step?.risk === "high-impact" ? "high-impact" : step?.risk === "read" ? "read" : "safe-write";
    const profileGate = gateProfileCommand({
      projectRoot,
      command,
      risk: stepRisk,
      confirmed,
      confirmationText: confirmationText ?? "",
    });
    if (!profileGate.ok) {
      return { ok: false, haltedBecause: profileGate.message, steps: [] };
    }
    const gate = evaluatePolicyGate(command, confirmed, confirmationText ?? "");
    if (!gate.ok) {
      return { ok: false, haltedBecause: gate.message || "Blocked by policy.", steps: [] };
    }
  }
  return await doctorExecuteFix(plan, confirmed, confirmationText);
}

async function doctorTranscriptGetForIpc() {
  return doctorGetTranscript();
}

async function doctorTranscriptExportForIpc(format: "json" | "text") {
  return doctorExportTranscript(format);
}

// ============================================================
// Chat-Only Control Protocol - Conversation Orchestrator
// ============================================================

type ConversationStage =
  | "idle"
  | "inspecting"
  | "interpreting"
  | "awaiting-fix-choice"
  | "awaiting-confirmation"
  | "executing-fix"
  | "verifying"
  | "cancelled"
  | "done";

type ConversationState = {
  caseId: string;
  intent: string;
  stage: ConversationStage;
  evidenceBefore?: any;
  diagnosis?: any;
  fixOptions?: any[];
  pendingFix?: any;
  pendingRisk?: "safe-write" | "high-impact";
  activeStreamId?: string;
  startTime: string;
};

// Per-window conversation state
const conversations = new Map<Electron.BrowserWindow, ConversationState>();

function getConversation(win: Electron.BrowserWindow): ConversationState | null {
  return conversations.get(win) ?? null;
}

function setConversation(win: Electron.BrowserWindow, state: ConversationState | null) {
  if (state) {
    conversations.set(win, state);
  } else {
    conversations.delete(win);
  }
}

// Helper: classify message intent
function classifyIntent(text: string): {
  type: "system-doctor" | "dev-fixer" | "builder" | "chat";
  confidence: number;
  intent: string;
} {
  const s = text.toLowerCase();
  
  // System Doctor keywords
  const doctorKeywords = [
    "running hot", "overheat", "slow", "disk", "wifi", "network",
    "temperature", "cpu", "memory", "fan", "thermal", "disk full",
    "no space", "connection", "port", "service"
  ];
  
  for (const kw of doctorKeywords) {
    if (s.includes(kw)) {
      return { type: "system-doctor", confidence: 0.9, intent: text };
    }
  }
  
  // Dev fixer keywords
  const devKeywords = ["build", "compile", "error", "failed", "bug", "crash", "debug"];
  for (const kw of devKeywords) {
    if (s.includes(kw)) {
      return { type: "dev-fixer", confidence: 0.7, intent: text };
    }
  }
  
  // Builder keywords
  const builderKeywords = ["create", "scaffold", "project", "setup", "new file"];
  for (const kw of builderKeywords) {
    if (s.includes(kw)) {
      return { type: "builder", confidence: 0.6, intent: text };
    }
  }
  
  return { type: "chat", confidence: 0.5, intent: text };
}

// Helper: format findings for chat
function formatFindingsForChat(findings: any[]): string {
  if (!findings?.length) return "No significant issues found.";
  
  const critical = findings.filter(f => f.severity === "critical");
  const warnings = findings.filter(f => f.severity === "warn");
  const info = findings.filter(f => f.severity === "info");
  
  let parts: string[] = [];
  if (critical.length) {
    parts.push(`🚨 **Critical**: ${critical.map(f => f.title).join(", ")}`);
  }
  if (warnings.length) {
    parts.push(`⚠️ **Warnings**: ${warnings.map(f => f.title).join(", ")}`);
  }
  if (info.length) {
    parts.push(`ℹ️ **Info**: ${info.map(f => f.title).join(", ")}`);
  }
  
  return parts.join("\n");
}

// Helper: format diagnosis for chat
function formatDiagnosisForChat(diagnosis: any): string {
  if (!diagnosis?.primary) return "Unable to determine root cause.";
  
  const p = diagnosis.primary;
  const conf = Math.round(p.probability * 100);
  let msg = `**Most likely**: ${p.label} (${conf}% confidence)\n`;
  
  if (diagnosis.notes) {
    msg += `\n${diagnosis.notes}`;
  }
  
  if (diagnosis.differential?.length) {
    msg += `\n\n**Other possibilities**: ${diagnosis.differential.slice(0,3).map((d: any) => `${d.label} (${Math.round(d.probability * 100)}%)`).join(", ")}`;
  }
  
  return msg;
}

// Helper: format fix options for chat
function formatFixOptionsForChat(fixOptions: any[]): string {
  if (!fixOptions?.length) return "No fix options available.";
  
  return fixOptions.map((opt, i) => {
    const riskIcon = opt.risk === "high-impact" ? "🔴" : opt.risk === "safe-write" ? "🟡" : "🟢";
    return `${i + 1}. ${riskIcon} **${opt.label}** - ${opt.why || ""}\n   Expected: ${opt.expectedOutcome?.join(", ") || "issue resolved"}`;
  }).join("\n\n");
}

// Helper: format outcome for chat
function formatOutcomeForChat(outcome: any, verification: any): string {
  const status = outcome?.status || (verification?.ok ? "resolved" : "unknown");
  const statusEmoji = status === "resolved" ? "✅" : status === "improved" ? "📈" : status === "failed" ? "❌" : "⚠️";
  
  let msg = `${statusEmoji} **${status.toUpperCase()}**`;
  
  if (outcome?.rootCause) {
    msg += `\nRoot cause: ${outcome.rootCause}`;
  }
  
  if (outcome?.confidence) {
    msg += `\nConfidence: ${Math.round(outcome.confidence * 100)}%`;
  }
  
  if (outcome?.preventionTips?.length) {
    msg += `\n\n**Prevention**: ${outcome.preventionTips.join(", ")}`;
  }
  
  return msg;
}

async function chatSendForIpc(text: string, projectRoot?: string) {
  const safeText = defaultRedactText(String(text || "")).redactedText;
  const root = resolveProjectRootSafe(projectRoot || getDefaultPtyCwd());
  const profile = defaultProfileForProject(root);
  const rules = loadProjectRules(root, { parentLevels: 2 });
  return await chatRouter.handle(safeText, {
    projectRoot: root,
    rulesBlock: rulesToSystemBlock(rules),
    rulesWarnings: rules.warnings,
    profileSummary: summarizeProfile(profile),
  });
}

async function inlineRinaAskForIpc(payload: InlineRinaRequest, senderId: number) {
  const session = ptySessions.get(senderId);
  const projectRoot = resolveProjectRootSafe(payload?.projectRoot || session?.cwd || getDefaultPtyCwd());
  const result = await runInlineRina({
    request: {
      prompt: String(payload?.prompt || ""),
      projectRoot,
      entitlementPlan: getCurrentPlanId(),
      action: payload?.action,
      selectedText: payload?.selectedText,
    },
    session,
  });
  const triggerType = (payload?.triggerType || "input") as InlineRinaTriggerType;
  const action = (payload?.action || "generateCommand") as PersistedInlineRinaAction;
  const sourceText = String(payload?.selectedText || payload?.sourceText || payload?.prompt || "").trim();
  const run = inlineRinaRunStore?.createRun({
    workspacePath: projectRoot,
    sessionId: `wc_${senderId}`,
    triggerType,
    action,
    sourceText,
    explanation: result.explanation,
    command: result.command,
    risk: result.risk,
    confirmationRequired: result.confirmation,
    llmModel: result.usage?.model ?? null,
    promptTokens: result.usage?.promptTokens ?? null,
    responseTokens: result.usage?.responseTokens ?? null,
    totalTokens: result.usage?.totalTokens ?? null,
  });
  return {
    ...result,
    runId: run?.id || null,
  };
}

async function getRinaUsageStatusForIpc() {
  return await getRinaUsageStatus(getCurrentPlanId());
}

async function inlineRinaApproveForIpc(payload: {
  runId?: string;
  command?: string;
  approvalKind?: "command" | "file_patch";
  patch?: { path?: string; newContent?: string; rerunCommand?: string };
}, senderId: number) {
  const session = ptySessions.get(senderId);
  if (!session) return { ok: false, error: "PTY not started" };
  const runId = String(payload?.runId || "").trim();
  const approvalKind = payload?.approvalKind || "command";
  const command = String(payload?.command || "").trim();
  if (!runId) return { ok: false, error: "Missing inline run id" };

  if (approvalKind === "file_patch") {
    const patchPath = String(payload?.patch?.path || "").trim();
    const newContent = typeof payload?.patch?.newContent === "string" ? payload.patch.newContent : "";
    if (!patchPath) return { ok: false, error: "Missing patch path" };
    if (!newContent) return { ok: false, error: "Missing patch content" };

    const applyResult = await executeTool({
      tool: "applyPatch",
      path: patchPath,
      newContent,
    }, {
      cwd: session.cwd || getDefaultPtyCwd(),
    });
    if (!applyResult.ok) return { ok: false, error: applyResult.error };

    inlineRinaRunStore?.updateRun(runId, {
      approved: true,
      executed: true,
    });

    const rerunCommand = String(payload?.patch?.rerunCommand || "").trim();
    let rerunOutput = "";
    if (rerunCommand) {
      const rerunResult = await executeTool({
        tool: "runCommand",
        command: rerunCommand,
        cwd: session.cwd || getDefaultPtyCwd(),
      }, {
        cwd: session.cwd || getDefaultPtyCwd(),
      });
      rerunOutput = rerunResult.ok
        ? String((rerunResult.output as { output?: string } | null)?.output || "")
        : String(rerunResult.error || "");
    }

    return { ok: true, rerunCommand, rerunOutput };
  }

  if (!command) return { ok: false, error: "Missing inline command" };
  inlineRinaRunStore?.updateRun(runId, {
    approved: true,
    executed: true,
  });
  const queue = pendingInlineRinaRuns.get(senderId) || [];
  queue.push({ runId, command });
  pendingInlineRinaRuns.set(senderId, queue);
  session.metrics.bytesIn += Buffer.byteLength(`${command}\n`, "utf8");
  session.proc.write(`${command}\n`);
  return { ok: true };
}

async function inlineRinaListRunsForIpc(payload?: {
  triggerType?: InlineRinaTriggerType | "";
  approved?: "yes" | "no" | "";
  executed?: "yes" | "no" | "";
  limit?: number;
}) {
  return inlineRinaRunStore?.listRuns(payload || {}) || [];
}

async function inlineRinaExportRunsForIpc(payload?: {
  format?: "json" | "csv";
  triggerType?: InlineRinaTriggerType | "";
  approved?: "yes" | "no" | "";
  executed?: "yes" | "no" | "";
  limit?: number;
}) {
  const format = payload?.format === "csv" ? "csv" : "json";
  return {
    ok: true,
    format,
    content: inlineRinaRunStore?.exportRuns(format, payload || {}) || (format === "json" ? "[]" : ""),
  };
}

async function chatExportForIpc() {
  return doctorExportTranscript("text");
}

// ============================================================
// Warp-like Block Handlers
// ============================================================

// Doctor v1: Read-only evidence collection for diagnosing system issues
type DoctorPlanStep = {
  stepId: string;
  tool: string;
  input: any;
  confirmationScope?: string;
};

async function doctorPlanForIpc(args: { projectRoot: string; symptom: string }) {
  // Read-only evidence collection only (safe, no confirmation needed)
  const steps: DoctorPlanStep[] = [
    { stepId: "uptime", tool: "terminal.write", input: { command: "uptime", cwd: args.projectRoot } },
    { stepId: "cpu_top", tool: "terminal.write", input: { command: "ps -Ao pid,ppid,%cpu,%mem,etime,comm --sort=-%cpu | head -n 15", cwd: args.projectRoot } },
    { stepId: "mem_top", tool: "terminal.write", input: { command: "ps -Ao pid,ppid,%cpu,%mem,etime,comm --sort=-%mem | head -n 15", cwd: args.projectRoot } },
    { stepId: "disk_df", tool: "terminal.write", input: { command: "df -h", cwd: args.projectRoot } },
    { stepId: "disk_big", tool: "terminal.write", input: { command: "du -h -d 1 . 2>/dev/null | sort -h | tail -n 12", cwd: args.projectRoot } },
    { stepId: "sensors", tool: "terminal.write", input: { command: "sensors 2>/dev/null || echo \"sensors not available\"", cwd: args.projectRoot } },
  ];

  return {
    id: `doctor_${Date.now()}`,
    intent: args.symptom,
    reasoning: "I'll collect read-only evidence first (CPU, memory, disk, sensors). No changes yet.",
    steps,
    playbookId: "doctor.running_hot.v1",
  };
}


  return {
    workspacePickDirectoryForIpc,
    workspacePickForIpc,
    workspaceDefaultForIpc,
    codeListFilesForIpc,
    codeReadFileForIpc,
    historyImportForIpc,
    exportPreviewForIpc,
    exportPublishForIpc,
    auditExportForIpc,
    sharePreviewForIpc,
    shareCreateForIpc,
    shareListForIpc,
    shareGetForIpc,
    shareRevokeForIpc,
    teamGetForIpc,
    teamActivityForIpc,
    teamCreateInviteForIpc,
    teamListInvitesForIpc,
    teamAcceptInviteForIpc,
    teamRevokeInviteForIpc,
    teamSetCurrentUserForIpc,
    teamUpsertMemberForIpc,
    teamRemoveMemberForIpc,
    pingForIpc,
    diagnoseHotForIpc,
    planForIpc,
    playbooksGetForIpc,
    playbookExecuteForIpc,
    redactionPreviewForIpc,
    doctorPlanForIpc,
    doctorInspectForIpc,
    doctorCollectForIpc,
    doctorInterpretForIpc,
    doctorVerifyForIpc,
    doctorExecuteFixForIpc,
    doctorTranscriptGetForIpc,
    doctorTranscriptExportForIpc,
    chatSendForIpc,
    inlineRinaAskForIpc,
    inlineRinaApproveForIpc,
    inlineRinaListRunsForIpc,
    inlineRinaExportRunsForIpc,
    getRinaUsageStatusForIpc,
    chatExportForIpc
  };
}
