import crypto from 'node:crypto'

type RedactedDiagnosticInput = {
  generatedAt: string
  appVersion: string
  platform: string
  arch: string
  installId: string | null
  workspaceIdentity?: string | null
  snapshot?: Record<string, unknown> | null
  telemetryCounters?: Record<string, number>
}

type RedactedDiagnosticManifest = {
  generatedAt: string
  appVersion: string
  platform: string
  arch: string
  installId: string | null
  workspaceIdentity: {
    redacted: string
    sha256: string | null
  }
  activeView: unknown
  mode: string | null
  recentRunIds: string[]
  recentProofIds: string[]
  recentErrorSummaries: string[]
  sanitizedLogSnippets: string[]
  telemetryCounters: Record<string, number>
}

const SECRET_PATTERNS = [
  /sk_live_[a-zA-Z0-9_]+/g,
  /sk_test_[a-zA-Z0-9_]+/g,
  /api[_-]?key\s*[=:]\s*["']?[^"'\s]+/gi,
  /bearer\s+[a-zA-Z0-9._-]+/gi,
  /password\s*[=:]\s*["']?[^"'\s]+/gi,
  /secret\s*[=:]\s*["']?[^"'\s]+/gi,
  /token\s*[=:]\s*["']?[^"'\s]+/gi,
  /private[_-]?key(?:\s*[=:]\s*["']?[^"'\s]+)?/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
]

const PATH_PATTERNS = [
  /\/(?:home|Users)\/[^\s"'`<>:,)]+(?:\/[^\s"'`<>:,)]*)*/g,
  /[A-Za-z]:\\Users\\[^\s"'`<>:,)]+(?:\\[^\s"'`<>:,)]*)*/g,
]

function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function clip(value: string, max = 240): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value
}

export function redactDiagnosticText(input: unknown): string {
  let text = String(input ?? '')
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, '[REDACTED_SECRET]')
  }
  for (const pattern of PATH_PATTERNS) {
    text = text.replace(pattern, (match) => `[REDACTED_PATH:${hashValue(match).slice(0, 12)}]`)
  }
  return clip(text)
}

export function redactedWorkspaceIdentity(workspaceIdentity?: string | null): RedactedDiagnosticManifest['workspaceIdentity'] {
  const value = String(workspaceIdentity || '').trim()
  if (!value || value === '__none__') {
    return { redacted: 'none', sha256: null }
  }
  return {
    redacted: `[REDACTED_WORKSPACE:${hashValue(value).slice(0, 12)}]`,
    sha256: hashValue(value),
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function stringList(values: unknown[]): string[] {
  return Array.from(new Set(values.map(asString).filter((value): value is string => Boolean(value)))).slice(-25)
}

function collectRecentRunIds(snapshot: Record<string, unknown>): string[] {
  const recentRuns = Array.isArray(snapshot.recentRuns) ? snapshot.recentRuns : []
  const fromRuns = recentRuns.map((run) => asString(asRecord(run).id))
  const lastRunId = asString(asRecord(snapshot.lastRun).id)
  return stringList([...fromRuns, lastRunId])
}

function collectRecentProofIds(snapshot: Record<string, unknown>): string[] {
  const recentRuns = Array.isArray(snapshot.recentRuns) ? snapshot.recentRuns : []
  const fromRuns = recentRuns.flatMap((run) => {
    const record = asRecord(run)
    return [record.receiptId, record.latestReceiptId, record.proofId]
  })
  const lastRun = asRecord(snapshot.lastRun)
  return stringList([...fromRuns, lastRun.receiptId, snapshot.receiptId])
}

function collectRecentErrorSummaries(snapshot: Record<string, unknown>): string[] {
  const recentErrors = Array.isArray(snapshot.recentErrors) ? snapshot.recentErrors : []
  return recentErrors
    .slice(-20)
    .map((entry) => {
      const record = asRecord(entry)
      const detail = asRecord(record.detail)
      return redactDiagnosticText(detail.message || record.name || record.category || 'error')
    })
    .filter(Boolean)
}

function collectSanitizedLogSnippets(snapshot: Record<string, unknown>): string[] {
  const streams = [
    ...(Array.isArray(snapshot.recentEvents) ? snapshot.recentEvents : []),
    ...(Array.isArray(snapshot.recentIpcCalls) ? snapshot.recentIpcCalls : []),
    ...(Array.isArray(snapshot.recentErrors) ? snapshot.recentErrors : []),
  ]
  return streams.slice(-80).map((entry) => {
    const record = asRecord(entry)
    const detail = asRecord(record.detail)
    const parts = [
      asString(record.ts),
      asString(record.category),
      asString(record.name),
      asString(detail.message),
      asString(detail.channel),
    ].filter(Boolean)
    return redactDiagnosticText(parts.join(' '))
  })
}

export function buildRedactedDiagnosticManifest(input: RedactedDiagnosticInput): RedactedDiagnosticManifest {
  const snapshot = asRecord(input.snapshot)
  return {
    generatedAt: input.generatedAt,
    appVersion: input.appVersion,
    platform: input.platform,
    arch: input.arch,
    installId: input.installId,
    workspaceIdentity: redactedWorkspaceIdentity(input.workspaceIdentity || asString(snapshot.workspaceRoot)),
    activeView: snapshot.activeView || null,
    mode: asString(snapshot.mode),
    recentRunIds: collectRecentRunIds(snapshot),
    recentProofIds: collectRecentProofIds(snapshot),
    recentErrorSummaries: collectRecentErrorSummaries(snapshot),
    sanitizedLogSnippets: collectSanitizedLogSnippets(snapshot),
    telemetryCounters: { ...(input.telemetryCounters || {}) },
  }
}

export function buildRedactedDiagnosticBundleFiles(input: RedactedDiagnosticInput): Array<{ name: string; data: Buffer }> {
  const manifest = buildRedactedDiagnosticManifest(input)
  return [
    {
      name: 'diagnostic-manifest.json',
      data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'),
    },
    {
      name: 'sanitized-log-snippets.txt',
      data: Buffer.from(manifest.sanitizedLogSnippets.join('\n'), 'utf8'),
    },
    {
      name: 'telemetry-counters.json',
      data: Buffer.from(JSON.stringify(manifest.telemetryCounters, null, 2), 'utf8'),
    },
  ]
}
