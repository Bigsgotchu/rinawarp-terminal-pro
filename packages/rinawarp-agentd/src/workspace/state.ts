import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { paths } from '../daemon/state.js'

export type WorkspaceRole = 'owner' | 'admin' | 'member'

export type WorkspaceSummary = {
  id: string
  name: string
  region: string
  owner_id: string
  members: number
  seats_allowed: number
  seats_used: number
  billing_status: 'active' | 'past_due' | 'canceled'
  billing_enforced: boolean
  billing_locked: boolean
  created_at: string
  updated_at: string
}

type WorkspaceMember = {
  user_id: string
  email: string
  role: WorkspaceRole
  added_at: string
}

type WorkspaceInvite = {
  invite_id: string
  workspace_id: string
  email: string
  role: WorkspaceRole
  token_hash: string
  token_hint: string
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  created_at: string
  created_by: string
  expires_at: string
  accepted_at?: string
  accepted_by?: string
}

type WorkspaceAuditEntry = {
  id: string
  workspace_id: string
  type: string
  actor_id: string
  metadata: Record<string, unknown>
  timestamp: string
}

type InviteSecurityConfig = {
  one_time: boolean
  hash_tokens: boolean
  rotate_on_use: boolean
  rate_limit_per_min: number
  brute_force_threshold: number
  cooldown_minutes: number
  key_version: number
  secret_salt: string
}

type AuditRetentionConfig = {
  retention_days: number
  rotation: 'daily' | 'weekly'
  max_size_mb: number
  archive_provider?: string
  archive_bucket?: string
}

type FailedInviteAttempts = {
  count: number
  first_ts: number
  locked_until_ms?: number
}

type WorkspaceEvent = {
  event_id: string
  version: number
  workspace_id: string
  type: string
  payload: Record<string, unknown>
  ts: string
}

type WorkspaceRecord = {
  id: string
  name: string
  region: string
  owner_id: string
  billing_locked: boolean
  billing_status: 'active' | 'past_due' | 'canceled'
  billing_enforced: boolean
  seats_allowed: number
  created_at: string
  updated_at: string
  members: WorkspaceMember[]
  sync_version: number
}

type WorkspaceDb = {
  version: 1
  workspaces: Record<string, WorkspaceRecord>
  invites: Record<string, WorkspaceInvite>
  events: Record<string, WorkspaceEvent[]>
  invite_security: InviteSecurityConfig
  invite_failures: Record<string, FailedInviteAttempts>
  audit_retention: AuditRetentionConfig
  updated_at: string
}

const DEFAULT_INVITE_SECURITY: InviteSecurityConfig = {
  one_time: true,
  hash_tokens: true,
  rotate_on_use: true,
  rate_limit_per_min: 5,
  brute_force_threshold: 5,
  cooldown_minutes: 30,
  key_version: 1,
  secret_salt: crypto.randomBytes(16).toString('hex'),
}

const DEFAULT_AUDIT_RETENTION: AuditRetentionConfig = {
  retention_days: 90,
  rotation: 'daily',
  max_size_mb: 500,
}

function workspaceDbFile(): string {
  return path.join(paths().baseDir, 'workspace-state.json')
}

function workspaceAuditFile(): string {
  return path.join(paths().baseDir, 'workspace-audit.ndjson')
}

function nowIso(): string {
  return new Date().toISOString()
}

function loadDb(): WorkspaceDb {
  const fp = workspaceDbFile()
  if (!fs.existsSync(fp)) {
    return {
      version: 1,
      workspaces: {},
      invites: {},
      events: {},
      invite_security: { ...DEFAULT_INVITE_SECURITY },
      invite_failures: {},
      audit_retention: { ...DEFAULT_AUDIT_RETENTION },
      updated_at: nowIso(),
    }
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, 'utf8')) as WorkspaceDb
    if (!parsed || parsed.version !== 1) throw new Error('invalid db')
    return {
      ...parsed,
      invite_security: {
        ...DEFAULT_INVITE_SECURITY,
        ...(parsed.invite_security || {}),
      },
      audit_retention: {
        ...DEFAULT_AUDIT_RETENTION,
        ...(parsed.audit_retention || {}),
      },
      invite_failures: parsed.invite_failures || {},
      events: parsed.events || {},
      invites: parsed.invites || {},
      workspaces: parsed.workspaces || {},
    }
  } catch {
    return {
      version: 1,
      workspaces: {},
      invites: {},
      events: {},
      invite_security: { ...DEFAULT_INVITE_SECURITY },
      invite_failures: {},
      audit_retention: { ...DEFAULT_AUDIT_RETENTION },
      updated_at: nowIso(),
    }
  }
}

function saveDb(db: WorkspaceDb): void {
  db.updated_at = nowIso()
  const fp = workspaceDbFile()
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.writeFileSync(fp, `${JSON.stringify(db, null, 2)}\n`, 'utf8')
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`
}

function hashInviteToken(token: string, security: InviteSecurityConfig): string {
  return crypto
    .createHash('sha256')
    .update(`${security.secret_salt}:${security.key_version}:${token}`, 'utf8')
    .digest('hex')
}

function toSummary(ws: WorkspaceRecord): WorkspaceSummary {
  return {
    id: ws.id,
    name: ws.name,
    region: ws.region,
    owner_id: ws.owner_id,
    members: ws.members.length,
    seats_allowed: ws.seats_allowed,
    seats_used: ws.members.length,
    billing_status: ws.billing_status,
    billing_enforced: ws.billing_enforced,
    billing_locked: ws.billing_locked,
    created_at: ws.created_at,
    updated_at: ws.updated_at,
  }
}

function appendAudit(entry: Omit<WorkspaceAuditEntry, 'id' | 'timestamp'>): WorkspaceAuditEntry {
  const full: WorkspaceAuditEntry = {
    id: newId('audit'),
    timestamp: nowIso(),
    ...entry,
  }
  const fp = workspaceAuditFile()
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.appendFileSync(fp, `${JSON.stringify(full)}\n`, 'utf8')
  return full
}

function appendEvent(
  db: WorkspaceDb,
  workspaceId: string,
  type: string,
  payload: Record<string, unknown>
): WorkspaceEvent {
  const ws = db.workspaces[workspaceId]
  ws.sync_version += 1
  ws.updated_at = nowIso()
  const evt: WorkspaceEvent = {
    event_id: newId('evt'),
    version: ws.sync_version,
    workspace_id: workspaceId,
    type,
    payload,
    ts: nowIso(),
  }
  const current = db.events[workspaceId] || []
  current.push(evt)
  db.events[workspaceId] = current.slice(-5000)
  return evt
}

function purgeExpiredInvites(db: WorkspaceDb): void {
  const now = Date.now()
  for (const invite of Object.values(db.invites)) {
    if (invite.status === 'pending' && Date.parse(invite.expires_at) <= now) {
      invite.status = 'expired'
    }
  }
}

function mutationBlocked(ws: WorkspaceRecord): boolean {
  return ws.billing_locked || (ws.billing_enforced && ws.billing_status !== 'active')
}

export function createWorkspace(args: {
  name: string
  region?: string
  ownerId: string
  ownerEmail: string
}): WorkspaceSummary {
  const db = loadDb()
  const id = newId('ws')
  const createdAt = nowIso()
  db.workspaces[id] = {
    id,
    name: args.name.trim(),
    region: args.region?.trim() || 'us-east-1',
    owner_id: args.ownerId,
    billing_locked: false,
    billing_status: 'active',
    billing_enforced: false,
    seats_allowed: Number(process.env.RINAWARP_ACCOUNT_SEATS_ALLOWED || 10),
    created_at: createdAt,
    updated_at: createdAt,
    members: [
      {
        user_id: args.ownerId,
        email: args.ownerEmail.toLowerCase(),
        role: 'owner',
        added_at: createdAt,
      },
    ],
    sync_version: 0,
  }
  appendEvent(db, id, 'workspace_created', { name: args.name, region: args.region || 'us-east-1' })
  appendAudit({
    workspace_id: id,
    type: 'workspace_created',
    actor_id: args.ownerId,
    metadata: { name: args.name, region: args.region || 'us-east-1' },
  })
  saveDb(db)
  return toSummary(db.workspaces[id])
}

export function getWorkspace(workspaceId: string): WorkspaceSummary | null {
  const db = loadDb()
  purgeExpiredInvites(db)
  const ws = db.workspaces[workspaceId]
  if (!ws) return null
  return toSummary(ws)
}

export function setBillingEnforcement(args: {
  workspaceId: string
  actorId: string
  requireActivePlan: boolean
}): WorkspaceSummary | null {
  const db = loadDb()
  const ws = db.workspaces[args.workspaceId]
  if (!ws) return null
  ws.billing_enforced = !!args.requireActivePlan
  ws.updated_at = nowIso()
  appendEvent(db, ws.id, 'billing_enforcement_updated', { require_active_plan: ws.billing_enforced })
  appendAudit({
    workspace_id: ws.id,
    type: 'billing_enforcement_updated',
    actor_id: args.actorId,
    metadata: { require_active_plan: ws.billing_enforced },
  })
  saveDb(db)
  return toSummary(ws)
}

export function lockWorkspace(args: { workspaceId: string; actorId: string; reason: string }): WorkspaceSummary | null {
  const db = loadDb()
  const ws = db.workspaces[args.workspaceId]
  if (!ws) return null
  ws.billing_locked = true
  ws.updated_at = nowIso()
  appendEvent(db, ws.id, 'workspace_locked', { reason: args.reason })
  appendAudit({
    workspace_id: ws.id,
    type: 'workspace_locked',
    actor_id: args.actorId,
    metadata: { reason: args.reason },
  })
  saveDb(db)
  return toSummary(ws)
}

export function unlockWorkspace(args: { workspaceId: string; actorId: string }): WorkspaceSummary | null {
  const db = loadDb()
  const ws = db.workspaces[args.workspaceId]
  if (!ws) return null
  ws.billing_locked = false
  ws.updated_at = nowIso()
  appendEvent(db, ws.id, 'workspace_unlocked', {})
  appendAudit({
    workspace_id: ws.id,
    type: 'workspace_unlocked',
    actor_id: args.actorId,
    metadata: {},
  })
  saveDb(db)
  return toSummary(ws)
}

export function createInvite(args: {
  workspaceId: string
  email: string
  role: WorkspaceRole
  expiresInHours: number
  sendEmail: boolean
  actorId: string
}): { invite_id: string; expires_at: string; invite_token?: string } | null {
  const db = loadDb()
  purgeExpiredInvites(db)
  const ws = db.workspaces[args.workspaceId]
  if (!ws) return null
  if (mutationBlocked(ws)) {
    throw new Error('workspace_locked')
  }
  if (ws.members.length >= ws.seats_allowed) {
    throw new Error('seat_limit_reached')
  }
  const token = `inv_${crypto.randomBytes(24).toString('base64url')}`
  const tokenHash = hashInviteToken(token, db.invite_security)
  const inviteId = newId('inv')
  const expiresAt = new Date(
    Date.now() + Math.max(1, Math.min(24 * 14, args.expiresInHours)) * 60 * 60 * 1000
  ).toISOString()
  db.invites[inviteId] = {
    invite_id: inviteId,
    workspace_id: args.workspaceId,
    email: args.email.trim().toLowerCase(),
    role: args.role,
    token_hash: tokenHash,
    token_hint: token.slice(-6),
    status: 'pending',
    created_at: nowIso(),
    created_by: args.actorId,
    expires_at: expiresAt,
  }
  appendEvent(db, ws.id, 'invite_created', {
    invite_id: inviteId,
    email: args.email,
    role: args.role,
    send_email: args.sendEmail,
  })
  appendAudit({
    workspace_id: ws.id,
    type: 'invite_created',
    actor_id: args.actorId,
    metadata: { invite_id: inviteId, email: args.email, role: args.role, send_email: args.sendEmail },
  })
  saveDb(db)
  return {
    invite_id: inviteId,
    expires_at: expiresAt,
    invite_token: token,
  }
}

export function listInvites(workspaceId: string): Array<{
  invite_id: string
  email: string
  role: WorkspaceRole
  status: string
  expires_at: string
  created_at: string
}> {
  const db = loadDb()
  purgeExpiredInvites(db)
  saveDb(db)
  return Object.values(db.invites)
    .filter((inv) => inv.workspace_id === workspaceId)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .map((inv) => ({
      invite_id: inv.invite_id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      expires_at: inv.expires_at,
      created_at: inv.created_at,
    }))
}

export function revokeInvite(args: { inviteId: string; actorId: string }): boolean {
  const db = loadDb()
  const inv = db.invites[args.inviteId]
  if (!inv) return false
  if (inv.status === 'accepted') return false
  inv.status = 'revoked'
  appendEvent(db, inv.workspace_id, 'invite_revoked', { invite_id: inv.invite_id })
  appendAudit({
    workspace_id: inv.workspace_id,
    type: 'invite_revoked',
    actor_id: args.actorId,
    metadata: { invite_id: inv.invite_id },
  })
  saveDb(db)
  return true
}

function recordInviteFailure(db: WorkspaceDb, tokenHash: string): { locked: boolean; retry_after_sec?: number } {
  const now = Date.now()
  const sec = db.invite_security
  const key = tokenHash
  const rec = db.invite_failures[key] || { count: 0, first_ts: now }
  if (rec.locked_until_ms && rec.locked_until_ms > now) {
    return { locked: true, retry_after_sec: Math.ceil((rec.locked_until_ms - now) / 1000) }
  }
  if (now - rec.first_ts > 60_000) {
    rec.count = 0
    rec.first_ts = now
    rec.locked_until_ms = undefined
  }
  rec.count += 1
  if (rec.count >= sec.brute_force_threshold) {
    rec.locked_until_ms = now + sec.cooldown_minutes * 60_000
  }
  db.invite_failures[key] = rec
  return {
    locked: !!rec.locked_until_ms && rec.locked_until_ms > now,
    retry_after_sec: rec.locked_until_ms ? Math.ceil((rec.locked_until_ms - now) / 1000) : undefined,
  }
}

export function acceptInvite(args: { token: string; actorId: string; actorEmail: string }): {
  ok: boolean
  statusCode?: number
  error?: string
  workspace_id?: string
  role?: WorkspaceRole
} {
  const db = loadDb()
  purgeExpiredInvites(db)
  const tokenHash = hashInviteToken(args.token, db.invite_security)
  const failure = db.invite_failures[tokenHash]
  if (failure?.locked_until_ms && failure.locked_until_ms > Date.now()) {
    return { ok: false, statusCode: 423, error: 'locked' }
  }
  const invite = Object.values(db.invites).find((inv) => inv.token_hash === tokenHash)
  if (!invite) {
    const state = recordInviteFailure(db, tokenHash)
    saveDb(db)
    if (state.locked) return { ok: false, statusCode: 423, error: 'locked' }
    return { ok: false, statusCode: 401, error: 'invalid' }
  }
  if (invite.status !== 'pending') {
    saveDb(db)
    return { ok: false, statusCode: 410, error: invite.status }
  }
  if (Date.parse(invite.expires_at) <= Date.now()) {
    invite.status = 'expired'
    saveDb(db)
    return { ok: false, statusCode: 410, error: 'expired' }
  }
  if (invite.email !== args.actorEmail.toLowerCase()) {
    return { ok: false, statusCode: 401, error: 'email_mismatch' }
  }
  const ws = db.workspaces[invite.workspace_id]
  if (!ws) return { ok: false, statusCode: 404, error: 'workspace_not_found' }
  if (ws.billing_locked) return { ok: false, statusCode: 423, error: 'workspace_locked' }
  const memberIdx = ws.members.findIndex((m) => m.email === invite.email)
  if (memberIdx >= 0) ws.members[memberIdx].role = invite.role
  else ws.members.push({ user_id: args.actorId, email: invite.email, role: invite.role, added_at: nowIso() })
  invite.status = 'accepted'
  invite.accepted_at = nowIso()
  invite.accepted_by = args.actorId
  if (db.invite_security.rotate_on_use) {
    db.invite_security.key_version += 1
    db.invite_security.secret_salt = crypto.randomBytes(16).toString('hex')
  }
  appendEvent(db, ws.id, 'invite_accepted', { invite_id: invite.invite_id, actor_id: args.actorId })
  appendAudit({
    workspace_id: ws.id,
    type: 'invite_accepted',
    actor_id: args.actorId,
    metadata: { invite_id: invite.invite_id, email: invite.email, role: invite.role },
  })
  saveDb(db)
  return { ok: true, workspace_id: ws.id, role: invite.role }
}

export function updateInviteSecurityConfig(args: {
  actorId: string
  one_time?: boolean
  hash_tokens?: boolean
  rotate_on_use?: boolean
  rate_limit_per_min?: number
  brute_force_threshold?: number
  cooldown_minutes?: number
}): InviteSecurityConfig {
  const db = loadDb()
  db.invite_security = {
    ...db.invite_security,
    ...(typeof args.one_time === 'boolean' ? { one_time: args.one_time } : {}),
    ...(typeof args.hash_tokens === 'boolean' ? { hash_tokens: args.hash_tokens } : {}),
    ...(typeof args.rotate_on_use === 'boolean' ? { rotate_on_use: args.rotate_on_use } : {}),
    ...(Number.isFinite(args.rate_limit_per_min)
      ? { rate_limit_per_min: Math.max(1, Number(args.rate_limit_per_min)) }
      : {}),
    ...(Number.isFinite(args.brute_force_threshold)
      ? { brute_force_threshold: Math.max(1, Number(args.brute_force_threshold)) }
      : {}),
    ...(Number.isFinite(args.cooldown_minutes) ? { cooldown_minutes: Math.max(1, Number(args.cooldown_minutes)) } : {}),
  }
  appendAudit({
    workspace_id: 'system',
    type: 'invite_security_updated',
    actor_id: args.actorId,
    metadata: {
      one_time: db.invite_security.one_time,
      hash_tokens: db.invite_security.hash_tokens,
      rotate_on_use: db.invite_security.rotate_on_use,
      rate_limit_per_min: db.invite_security.rate_limit_per_min,
      brute_force_threshold: db.invite_security.brute_force_threshold,
      cooldown_minutes: db.invite_security.cooldown_minutes,
    },
  })
  saveDb(db)
  return db.invite_security
}

export function rotateInviteSecurityKeys(actorId: string): InviteSecurityConfig {
  const db = loadDb()
  db.invite_security.key_version += 1
  db.invite_security.secret_salt = crypto.randomBytes(16).toString('hex')
  appendAudit({
    workspace_id: 'system',
    type: 'invite_security_rotated',
    actor_id: actorId,
    metadata: { key_version: db.invite_security.key_version },
  })
  saveDb(db)
  return db.invite_security
}

export function queryAudit(args: {
  workspaceId: string
  type?: string
  from?: string
  to?: string
  limit?: number
}): WorkspaceAuditEntry[] {
  const fp = workspaceAuditFile()
  if (!fs.existsSync(fp)) return []
  const fromMs = args.from ? Date.parse(args.from) : Number.NEGATIVE_INFINITY
  const toMs = args.to ? Date.parse(args.to) : Number.POSITIVE_INFINITY
  const limit = Number.isFinite(args.limit) ? Math.max(1, Math.min(1000, Number(args.limit))) : 100
  const lines = fs.readFileSync(fp, 'utf8').split(/\r?\n/).filter(Boolean)
  const entries = lines
    .map((line) => {
      try {
        return JSON.parse(line) as WorkspaceAuditEntry
      } catch {
        return null
      }
    })
    .filter((e): e is WorkspaceAuditEntry => !!e)
    .filter((e) => e.workspace_id === args.workspaceId)
    .filter((e) => (args.type ? e.type === args.type : true))
    .filter((e) => {
      const ts = Date.parse(e.timestamp)
      return ts >= fromMs && ts <= toMs
    })
  return entries.slice(-limit).reverse()
}

export function setAuditRetentionConfig(args: {
  actorId: string
  retention_days?: number
  rotation?: 'daily' | 'weekly'
  max_size_mb?: number
  archive_provider?: string
  archive_bucket?: string
}): AuditRetentionConfig {
  const db = loadDb()
  db.audit_retention = {
    ...db.audit_retention,
    ...(Number.isFinite(args.retention_days) ? { retention_days: Math.max(1, Number(args.retention_days)) } : {}),
    ...(args.rotation ? { rotation: args.rotation } : {}),
    ...(Number.isFinite(args.max_size_mb) ? { max_size_mb: Math.max(1, Number(args.max_size_mb)) } : {}),
    ...(args.archive_provider ? { archive_provider: args.archive_provider } : {}),
    ...(args.archive_bucket ? { archive_bucket: args.archive_bucket } : {}),
  }
  appendAudit({
    workspace_id: 'system',
    type: 'audit_retention_updated',
    actor_id: args.actorId,
    metadata: db.audit_retention as unknown as Record<string, unknown>,
  })
  saveDb(db)
  return db.audit_retention
}

export function getAuditRetentionConfig(): AuditRetentionConfig {
  const db = loadDb()
  return db.audit_retention
}

export function runAuditCleanup(force = false): { removed: number; kept: number } {
  const db = loadDb()
  const fp = workspaceAuditFile()
  if (!fs.existsSync(fp)) return { removed: 0, kept: 0 }
  const now = Date.now()
  const ttlMs = db.audit_retention.retention_days * 24 * 60 * 60 * 1000
  const lines = fs.readFileSync(fp, 'utf8').split(/\r?\n/).filter(Boolean)
  const kept: string[] = []
  let removed = 0
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as WorkspaceAuditEntry
      const ts = Date.parse(parsed.timestamp)
      if (!force && now - ts <= ttlMs) kept.push(line)
      else if (force || now - ts > ttlMs) removed += 1
    } catch {
      removed += 1
    }
  }
  const maxBytes = db.audit_retention.max_size_mb * 1024 * 1024
  let blob = kept.join('\n')
  if (blob.length > maxBytes) {
    // Trim oldest lines until under size.
    while (blob.length > maxBytes && kept.length > 0) {
      kept.shift()
      removed += 1
      blob = kept.join('\n')
    }
  }
  fs.writeFileSync(fp, kept.length ? `${kept.join('\n')}\n` : '', 'utf8')
  return { removed, kept: kept.length }
}

export function getSyncState(workspaceId: string): { version: number; last_event_id: string | null } | null {
  const db = loadDb()
  const ws = db.workspaces[workspaceId]
  if (!ws) return null
  const events = db.events[workspaceId] || []
  return {
    version: ws.sync_version,
    last_event_id: events.length ? events[events.length - 1].event_id : null,
  }
}

export function syncPull(args: {
  workspaceId: string
  sinceVersion: number
}): { events: WorkspaceEvent[]; new_version: number } | null {
  const db = loadDb()
  const ws = db.workspaces[args.workspaceId]
  if (!ws) return null
  const events = (db.events[args.workspaceId] || []).filter((evt) => evt.version > args.sinceVersion)
  return { events, new_version: ws.sync_version }
}

export function syncPush(args: {
  workspaceId: string
  baseVersion: number
  events: Array<{ type: string; payload?: Record<string, unknown> }>
  actorId: string
}):
  | { ok: true; new_version: number; conflicts: [] }
  | { ok: false; error: 'version_conflict'; server_version: number }
  | null {
  const db = loadDb()
  const ws = db.workspaces[args.workspaceId]
  if (!ws) return null
  if (mutationBlocked(ws)) {
    throw new Error('workspace_locked')
  }
  if (args.baseVersion !== ws.sync_version) {
    return { ok: false, error: 'version_conflict', server_version: ws.sync_version }
  }
  for (const evt of args.events || []) {
    appendEvent(db, args.workspaceId, evt.type || 'client_event', evt.payload || {})
    appendAudit({
      workspace_id: args.workspaceId,
      type: 'sync_push_event',
      actor_id: args.actorId,
      metadata: { type: evt.type || 'client_event' },
    })
  }
  saveDb(db)
  return { ok: true, new_version: ws.sync_version, conflicts: [] }
}

export function getWorkspaceActorRole(args: {
  workspaceId: string
  actorId: string
  actorEmail: string
}): WorkspaceRole | null {
  const db = loadDb()
  const ws = db.workspaces[args.workspaceId]
  if (!ws) return null
  const byId = ws.members.find((m) => m.user_id === args.actorId)?.role
  if (byId) return byId
  const byEmail = ws.members.find((m) => m.email === args.actorEmail.toLowerCase())?.role
  return byEmail || null
}

export function applyStripeWebhookEvent(args: {
  workspaceId: string
  type: string
  seatsAllowed?: number
}): WorkspaceSummary | null {
  const db = loadDb()
  const ws = db.workspaces[args.workspaceId]
  if (!ws) return null
  const t = args.type
  if (t === 'customer.subscription.updated') {
    ws.billing_status = 'active'
    ws.billing_locked = false
    if (Number.isFinite(args.seatsAllowed)) ws.seats_allowed = Math.max(1, Number(args.seatsAllowed))
  } else if (t === 'invoice.payment_failed') {
    ws.billing_status = 'past_due'
    ws.billing_locked = true
  } else if (t === 'customer.subscription.deleted') {
    ws.billing_status = 'canceled'
    ws.billing_locked = true
  } else {
    return toSummary(ws)
  }
  ws.updated_at = nowIso()
  appendEvent(db, ws.id, 'billing_webhook_applied', {
    type: t,
    billing_status: ws.billing_status,
    billing_locked: ws.billing_locked,
    seats_allowed: ws.seats_allowed,
  })
  appendAudit({
    workspace_id: ws.id,
    type: 'billing_webhook_applied',
    actor_id: 'stripe_webhook',
    metadata: {
      type: t,
      billing_status: ws.billing_status,
      billing_locked: ws.billing_locked,
      seats_allowed: ws.seats_allowed,
    },
  })
  saveDb(db)
  return toSummary(ws)
}
