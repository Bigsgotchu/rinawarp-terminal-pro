import fs from 'node:fs'
import path from 'node:path'
import { paths } from '../daemon/state.js'

type ResearchConfig = {
  version: 1
  enabled: boolean
  allowed_domains: string[]
  timeout_ms: number
  max_bytes: number
  max_excerpt_chars: number
  updated_at: string
  last_fetch_at?: string
}

type Citation = {
  source_url: string
  title?: string
  excerpt: string
}

function stateFile(): string {
  return path.join(paths().baseDir, 'research-state.json')
}

function defaultState(): ResearchConfig {
  return {
    version: 1,
    enabled: false,
    allowed_domains: [],
    timeout_ms: 8_000,
    max_bytes: 100_000,
    max_excerpt_chars: 280,
    updated_at: new Date().toISOString(),
  }
}

function normalizeDomains(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of input) {
    const entry = String(value || '')
      .trim()
      .toLowerCase()
    if (!entry) continue
    if (seen.has(entry)) continue
    seen.add(entry)
    out.push(entry)
  }
  return out
}

function readState(): ResearchConfig {
  const fp = stateFile()
  if (!fs.existsSync(fp)) return defaultState()
  try {
    const raw = fs.readFileSync(fp, 'utf8')
    const parsed = JSON.parse(raw) as Partial<ResearchConfig> | null
    if (!parsed || parsed.version !== 1) return defaultState()
    return {
      version: 1,
      enabled: parsed.enabled === true,
      allowed_domains: normalizeDomains(parsed.allowed_domains),
      timeout_ms: Number.isFinite(parsed.timeout_ms)
        ? Math.max(500, Math.min(60_000, Number(parsed.timeout_ms)))
        : 8_000,
      max_bytes: Number.isFinite(parsed.max_bytes)
        ? Math.max(1_024, Math.min(1_000_000, Number(parsed.max_bytes)))
        : 100_000,
      max_excerpt_chars: Number.isFinite(parsed.max_excerpt_chars)
        ? Math.max(64, Math.min(2_000, Number(parsed.max_excerpt_chars)))
        : 280,
      updated_at: String(parsed.updated_at || new Date().toISOString()),
      ...(parsed.last_fetch_at ? { last_fetch_at: String(parsed.last_fetch_at) } : {}),
    }
  } catch {
    return defaultState()
  }
}

function writeState(next: ResearchConfig): void {
  const fp = stateFile()
  fs.mkdirSync(path.dirname(fp), { recursive: true })
  fs.writeFileSync(fp, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
}

function isHostAllowed(hostname: string, allowlist: string[]): boolean {
  const host = hostname.toLowerCase()
  if (!host) return false
  for (const allowed of allowlist) {
    if (allowed.startsWith('*.')) {
      const suffix = allowed.slice(1)
      if (host.endsWith(suffix)) return true
      continue
    }
    if (host === allowed) return true
  }
  return false
}

function pickTitle(body: string): string | undefined {
  const titleMatch = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = String(titleMatch?.[1] || '')
    .replace(/\s+/g, ' ')
    .trim()
  return title || undefined
}

function stripHtml(body: string): string {
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
}

export function configureResearch(input: {
  enabled?: boolean
  allowed_domains?: string[]
  timeout_ms?: number
  max_bytes?: number
  max_excerpt_chars?: number
}): ResearchConfig {
  const current = readState()
  const next: ResearchConfig = {
    ...current,
    ...(typeof input.enabled === 'boolean' ? { enabled: input.enabled } : {}),
    ...(Array.isArray(input.allowed_domains) ? { allowed_domains: normalizeDomains(input.allowed_domains) } : {}),
    ...(Number.isFinite(input.timeout_ms)
      ? { timeout_ms: Math.max(500, Math.min(60_000, Number(input.timeout_ms))) }
      : {}),
    ...(Number.isFinite(input.max_bytes)
      ? { max_bytes: Math.max(1_024, Math.min(1_000_000, Number(input.max_bytes))) }
      : {}),
    ...(Number.isFinite(input.max_excerpt_chars)
      ? { max_excerpt_chars: Math.max(64, Math.min(2_000, Number(input.max_excerpt_chars))) }
      : {}),
    updated_at: new Date().toISOString(),
  }
  writeState(next)
  return next
}

export function getResearchState(): ResearchConfig {
  return readState()
}

export async function runResearchFetch(input: { url: string }): Promise<{
  ok: boolean
  error?: string
  status_code?: number
  url?: string
  content_type?: string
  bytes?: number
  truncated?: boolean
  citations?: Citation[]
}> {
  const state = readState()
  const rawUrl = String(input.url || '').trim()
  if (!state.enabled) return { ok: false, error: 'research fetch is disabled' }
  if (!rawUrl) return { ok: false, error: 'url is required' }
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return { ok: false, error: 'invalid url' }
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return { ok: false, error: 'unsupported protocol' }
  if (!isHostAllowed(parsed.hostname, state.allowed_domains)) {
    return { ok: false, error: 'domain is not allowlisted' }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), state.timeout_ms)
  try {
    const res = await fetch(parsed.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'user-agent': 'rinawarp-agentd-research/1.0',
      },
    })
    const body = await res.text()
    const bodyBytes = Buffer.byteLength(body, 'utf8')
    const truncated = bodyBytes > state.max_bytes
    const limited = truncated ? Buffer.from(body, 'utf8').subarray(0, state.max_bytes).toString('utf8') : body
    const text = stripHtml(limited).replace(/\s+/g, ' ').trim()
    const excerpt = text.slice(0, state.max_excerpt_chars).trim()
    const citations: Citation[] = [
      {
        source_url: parsed.toString(),
        ...(pickTitle(limited) ? { title: pickTitle(limited) } : {}),
        excerpt,
      },
    ]
    const next = { ...state, last_fetch_at: new Date().toISOString() }
    writeState(next)
    return {
      ok: true,
      status_code: res.status,
      url: parsed.toString(),
      content_type: String(res.headers.get('content-type') || ''),
      bytes: Math.min(bodyBytes, state.max_bytes),
      truncated,
      citations,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'request failed',
    }
  } finally {
    clearTimeout(timer)
  }
}
