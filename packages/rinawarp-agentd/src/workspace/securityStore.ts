import fs from 'node:fs'
import path from 'node:path'
import { paths } from '../daemon/state.js'

type LocalSecurityState = {
  version: 1
  inviteAttempt: Record<string, { count: number; windowStartMs: number }>
  inviteFail: Record<string, { count: number; windowStartMs: number; cooldownUntilMs?: number }>
}

function stateFile(): string {
  return path.join(paths().baseDir, 'security-state.json')
}

function loadLocalState(): LocalSecurityState {
  const fp = stateFile()
  if (!fs.existsSync(fp)) {
    return { version: 1, inviteAttempt: {}, inviteFail: {} }
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, 'utf8')) as LocalSecurityState
    if (!parsed || parsed.version !== 1) return { version: 1, inviteAttempt: {}, inviteFail: {} }
    return {
      version: 1,
      inviteAttempt: parsed.inviteAttempt || {},
      inviteFail: parsed.inviteFail || {},
    }
  } catch {
    return { version: 1, inviteAttempt: {}, inviteFail: {} }
  }
}

function saveLocalState(state: LocalSecurityState): void {
  const fp = stateFile()
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.writeFileSync(fp, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

async function redisCommand(args: string[]): Promise<any | null> {
  const base = String(process.env.RINAWARP_REDIS_REST_URL || '').trim()
  const token = String(process.env.RINAWARP_REDIS_REST_TOKEN || '').trim()
  if (!base || !token) return null
  try {
    const resp = await fetch(`${base}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([args]),
    })
    if (!resp.ok) return null
    const body = (await resp.json()) as { result?: Array<{ result?: any }> }
    return body?.result?.[0]?.result ?? null
  } catch {
    return null
  }
}

function redisConfigured(): boolean {
  return (
    !!String(process.env.RINAWARP_REDIS_REST_URL || '').trim() &&
    !!String(process.env.RINAWARP_REDIS_REST_TOKEN || '').trim()
  )
}

function requireRedisInProduction(): void {
  if (process.env.NODE_ENV === 'production' && !redisConfigured()) {
    const err = new Error('redis_required_in_production')
    ;(err as Error & { code?: string }).code = 'redis_required_in_production'
    throw err
  }
}

async function redisGetInt(key: string): Promise<number | null> {
  const val = await redisCommand(['GET', key])
  if (val == null) return null
  const num = Number(val)
  return Number.isFinite(num) ? num : null
}

async function redisIncrWithTtl(key: string, ttlSec: number): Promise<number | null> {
  const base = String(process.env.RINAWARP_REDIS_REST_URL || '').trim()
  const token = String(process.env.RINAWARP_REDIS_REST_TOKEN || '').trim()
  if (!base || !token) return null
  try {
    const resp = await fetch(`${base}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(Math.max(1, ttlSec))],
      ]),
    })
    if (!resp.ok) return null
    const body = (await resp.json()) as { result?: Array<{ result?: any }> }
    const num = Number(body?.result?.[0]?.result)
    return Number.isFinite(num) ? num : null
  } catch {
    return null
  }
}

async function redisSetEx(key: string, value: string, ttlSec: number): Promise<boolean> {
  const result = await redisCommand(['SETEX', key, String(Math.max(1, ttlSec)), value])
  return result === 'OK'
}

export async function enforceInviteCreateRate(args: {
  email: string
  maxPerMinute: number
}): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  requireRedisInProduction()
  const email = args.email.trim().toLowerCase()
  const key = `invite_attempt:${email}`
  const maxPerMinute = Math.max(1, args.maxPerMinute)

  const redisCount = await redisIncrWithTtl(key, 60)
  if (redisCount != null) {
    if (redisCount > maxPerMinute) return { ok: false, retryAfterSec: 60 }
    return { ok: true }
  }

  const state = loadLocalState()
  const now = Date.now()
  const current = state.inviteAttempt[key]
  if (!current || now - current.windowStartMs >= 60_000) {
    state.inviteAttempt[key] = { count: 1, windowStartMs: now }
    saveLocalState(state)
    return { ok: true }
  }
  current.count += 1
  state.inviteAttempt[key] = current
  saveLocalState(state)
  if (current.count > maxPerMinute) {
    const retryAfterSec = Math.max(1, Math.ceil((60_000 - (now - current.windowStartMs)) / 1000))
    return { ok: false, retryAfterSec }
  }
  return { ok: true }
}

export async function enforceInviteAcceptCooldown(args: {
  ip: string
}): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  requireRedisInProduction()
  const key = `invite_cooldown:${args.ip}`
  const redisValue = await redisGetInt(key)
  if (redisValue != null && redisValue > Date.now()) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((redisValue - Date.now()) / 1000)) }
  }
  const state = loadLocalState()
  const current = state.inviteFail[args.ip]
  if (current?.cooldownUntilMs && current.cooldownUntilMs > Date.now()) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((current.cooldownUntilMs - Date.now()) / 1000)) }
  }
  return { ok: true }
}

export async function recordInviteAcceptFailure(args: {
  ip: string
  threshold: number
  cooldownMinutes: number
}): Promise<void> {
  requireRedisInProduction()
  const threshold = Math.max(1, args.threshold)
  const cooldownMinutes = Math.max(1, args.cooldownMinutes)
  const failKey = `invite_fail:${args.ip}`
  const cooldownKey = `invite_cooldown:${args.ip}`

  const redisCount = await redisIncrWithTtl(failKey, 60)
  if (redisCount != null) {
    if (redisCount >= threshold) {
      const until = Date.now() + cooldownMinutes * 60_000
      await redisSetEx(cooldownKey, String(until), cooldownMinutes * 60)
    }
    return
  }

  const state = loadLocalState()
  const now = Date.now()
  const existing = state.inviteFail[args.ip]
  if (!existing || now - existing.windowStartMs >= 60_000) {
    state.inviteFail[args.ip] = { count: 1, windowStartMs: now }
  } else {
    existing.count += 1
    if (existing.count >= threshold) {
      existing.cooldownUntilMs = now + cooldownMinutes * 60_000
    }
    state.inviteFail[args.ip] = existing
  }
  saveLocalState(state)
}
