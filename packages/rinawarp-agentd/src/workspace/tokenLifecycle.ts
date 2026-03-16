import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { paths } from '../daemon/state.js'

type RefreshSession = {
  jti: string
  user_id: string
  email: string
  token_hash: string
  issued_at: number
  expires_at: number
  revoked_at?: number
  rotated_to_jti?: string
  reason?: string
}

type TokenLifecycleState = {
  version: 1
  revocation_window_sec: number
  refresh_max_age_sec: number
  sessions: Record<string, RefreshSession>
  updated_at: string
}

function filePath(): string {
  return path.join(paths().baseDir, 'token-lifecycle.json')
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000)
}

function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(String(token || ''), 'utf8')
    .digest('hex')
}

function loadState(): TokenLifecycleState {
  const fp = filePath()
  if (!fs.existsSync(fp)) {
    return {
      version: 1,
      revocation_window_sec: 600,
      refresh_max_age_sec: 30 * 24 * 60 * 60,
      sessions: {},
      updated_at: new Date().toISOString(),
    }
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, 'utf8')) as TokenLifecycleState
    if (!parsed || parsed.version !== 1) throw new Error('invalid')
    return {
      version: 1,
      revocation_window_sec: Math.max(60, Number(parsed.revocation_window_sec || 600)),
      refresh_max_age_sec: Math.max(60 * 60, Number(parsed.refresh_max_age_sec || 30 * 24 * 60 * 60)),
      sessions: parsed.sessions || {},
      updated_at: parsed.updated_at || new Date().toISOString(),
    }
  } catch {
    return {
      version: 1,
      revocation_window_sec: 600,
      refresh_max_age_sec: 30 * 24 * 60 * 60,
      sessions: {},
      updated_at: new Date().toISOString(),
    }
  }
}

function saveState(state: TokenLifecycleState): void {
  state.updated_at = new Date().toISOString()
  const fp = filePath()
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.writeFileSync(fp, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

function prune(state: TokenLifecycleState): void {
  const now = nowSec()
  for (const [jti, session] of Object.entries(state.sessions)) {
    if (session.expires_at < now - state.revocation_window_sec) {
      delete state.sessions[jti]
    }
  }
}

export function configureTokenLifecycle(args: { revocation_window_sec?: number; refresh_max_age_sec?: number }) {
  const state = loadState()
  if (Number.isFinite(args.revocation_window_sec))
    state.revocation_window_sec = Math.max(60, Number(args.revocation_window_sec))
  if (Number.isFinite(args.refresh_max_age_sec))
    state.refresh_max_age_sec = Math.max(60 * 60, Number(args.refresh_max_age_sec))
  prune(state)
  saveState(state)
  return {
    revocation_window_sec: state.revocation_window_sec,
    refresh_max_age_sec: state.refresh_max_age_sec,
    active_sessions: Object.values(state.sessions).filter((s) => !s.revoked_at && s.expires_at > nowSec()).length,
  }
}

export function getTokenLifecycleStatus() {
  const state = loadState()
  prune(state)
  saveState(state)
  const now = nowSec()
  const sessions = Object.values(state.sessions)
  return {
    revocation_window_sec: state.revocation_window_sec,
    refresh_max_age_sec: state.refresh_max_age_sec,
    active_sessions: sessions.filter((s) => !s.revoked_at && s.expires_at > now).length,
    revoked_sessions: sessions.filter((s) => !!s.revoked_at).length,
  }
}

export function registerRefreshSession(args: {
  jti: string
  token: string
  user_id: string
  email: string
  issued_at: number
  expires_at: number
}) {
  const state = loadState()
  prune(state)
  state.sessions[args.jti] = {
    jti: args.jti,
    user_id: args.user_id,
    email: args.email.toLowerCase(),
    token_hash: hashToken(args.token),
    issued_at: args.issued_at,
    expires_at: args.expires_at,
  }
  saveState(state)
}

export function validateRefreshSession(args: {
  jti: string
  token: string
  user_id: string
}): { ok: true } | { ok: false; error: string } {
  const state = loadState()
  prune(state)
  const session = state.sessions[args.jti]
  if (!session) return { ok: false, error: 'refresh_session_not_found' }
  if (session.user_id !== args.user_id) return { ok: false, error: 'refresh_user_mismatch' }
  if (session.token_hash !== hashToken(args.token)) return { ok: false, error: 'refresh_token_hash_mismatch' }
  const now = nowSec()
  if (session.expires_at <= now) return { ok: false, error: 'refresh_expired' }
  if (session.issued_at + state.refresh_max_age_sec <= now) return { ok: false, error: 'refresh_max_age_exceeded' }
  if (session.revoked_at) {
    if (now - session.revoked_at <= state.revocation_window_sec) {
      return { ok: false, error: 'refresh_revoked_recently' }
    }
    return { ok: false, error: 'refresh_revoked' }
  }
  return { ok: true }
}

export function rotateRefreshSession(args: {
  old_jti: string
  new_jti: string
  new_token: string
  user_id: string
  email: string
  issued_at: number
  expires_at: number
}) {
  const state = loadState()
  prune(state)
  const old = state.sessions[args.old_jti]
  const now = nowSec()
  if (old) {
    old.revoked_at = now
    old.rotated_to_jti = args.new_jti
    old.reason = 'rotated'
  }
  state.sessions[args.new_jti] = {
    jti: args.new_jti,
    user_id: args.user_id,
    email: args.email.toLowerCase(),
    token_hash: hashToken(args.new_token),
    issued_at: args.issued_at,
    expires_at: args.expires_at,
  }
  saveState(state)
}

export function revokeRefreshSession(args: { jti: string; reason?: string }): { ok: boolean } {
  const state = loadState()
  const session = state.sessions[args.jti]
  if (!session) return { ok: false }
  session.revoked_at = nowSec()
  session.reason = args.reason || 'manual_revoke'
  saveState(state)
  return { ok: true }
}
