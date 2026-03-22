type SearchHit = {
  id: string
  source: 'transcript' | 'share' | 'structured'
  label: string
  meta: string
  snippet: string
  command?: string
  shareId?: string
  createdAt: string
  score: number
}

type UnifiedSearchDeps = {
  sessionEntries: any[]
  getCurrentRole: () => string
  hasRoleAtLeast: (current: string, required: string) => boolean
  loadSharesDb: () => { shares: any[] }
  structuredSessionStore: { searchCommands: (query: string, limit: number) => any[] } | null
  scoreTextMatch: (query: string, haystack: string) => number
}

function recencyBoost(iso: string): number {
  const ts = Date.parse(String(iso || ''))
  if (!Number.isFinite(ts)) return 0
  const ageHours = Math.max(0, (Date.now() - ts) / (1000 * 60 * 60))
  if (ageHours <= 1) return 2
  if (ageHours <= 24) return 1
  if (ageHours <= 24 * 7) return 0.5
  return 0
}

function searchTranscriptEntries(deps: UnifiedSearchDeps, query: string, limit: number): SearchHit[] {
  const out: SearchHit[] = []
  const q = String(query || '').trim()
  const entries = deps.sessionEntries.slice(-500).reverse()
  for (const entry of entries) {
    let label = ''
    let meta = `transcript • ${entry.type}`
    let haystack = ''
    let command: string | undefined
    if (entry.type === 'execution_start') {
      label = entry.command
      command = entry.command
      meta = `transcript • command • ${entry.stepId}`
      haystack = `${entry.command} ${entry.stepId}`
    } else if (entry.type === 'intent') {
      label = entry.intent
      haystack = entry.intent
      meta = 'transcript • intent'
    } else if (entry.type === 'signal') {
      label = entry.signal
      haystack = `${entry.signal} ${entry.interpretation}`
      meta = 'transcript • signal'
    } else if (entry.type === 'verification') {
      label = `${entry.check}: ${entry.status}`
      haystack = `${entry.check} ${entry.result} ${entry.status}`
      meta = 'transcript • verification'
    } else if (entry.type === 'outcome') {
      label = `Outcome: ${entry.rootCause}`
      haystack = `${entry.rootCause} ${entry.changes.join(' ')} ${entry.evidenceBefore} ${entry.evidenceAfter}`
      meta = `transcript • outcome • ${entry.confidence}`
    } else if (entry.type === 'playbook') {
      label = entry.playbookName
      haystack = `${entry.playbookName} ${entry.playbookId}`
      meta = 'transcript • playbook'
    } else if (entry.type === 'approval') {
      label = entry.command
      command = entry.command
      haystack = `${entry.command} ${entry.risk} ${entry.approved ? 'approved' : 'denied'}`
      meta = `transcript • approval • ${entry.risk}`
    } else if (entry.type === 'memory') {
      label = `${entry.category}: ${entry.key}`
      haystack = `${entry.category} ${entry.key} ${entry.value}`
      meta = 'transcript • memory'
    } else if (entry.type === 'execution_end') {
      label = entry.ok ? 'Execution success' : `Execution failed: ${entry.error || 'unknown'}`
      haystack = `${entry.error || ''} ${entry.ok ? 'success' : 'failed'}`
      meta = 'transcript • execution end'
    } else if (entry.type === 'plan') {
      label = entry.plan.intent || entry.plan.reasoning
      haystack = `${entry.plan.intent} ${entry.plan.reasoning} ${(entry.plan.steps || []).map((s: any) => s.command).join(' ')}`
      meta = 'transcript • plan'
    }

    if (!label) continue
    const score = deps.scoreTextMatch(q, haystack)
    if (q && score < 0) continue
    const total = (score > 0 ? score : 0.05) + recencyBoost(entry.timestamp)
    out.push({
      id: `transcript:${entry.timestamp}:${entry.type}:${out.length}`,
      source: 'transcript',
      label,
      meta,
      snippet: haystack.slice(0, 220),
      command,
      createdAt: entry.timestamp,
      score: Number(total.toFixed(4)),
    })
    if (out.length >= Math.max(5, limit * 2)) break
  }
  return out
}

function searchShareRecords(deps: UnifiedSearchDeps, query: string, limit: number): SearchHit[] {
  const out: SearchHit[] = []
  const q = String(query || '').trim()
  const role = deps.getCurrentRole()
  const shares = deps
    .loadSharesDb()
    .shares.filter((share) => deps.hasRoleAtLeast(role, share.requiredRole))
    .slice(0, 250)
  for (const share of shares) {
    const label = share.title || `Share ${share.id}`
    const summary = `${label}\n${share.content || ''}`
    const score = deps.scoreTextMatch(q, summary)
    if (q && score < 0) continue
    const status = share.revoked ? 'revoked' : Date.now() > Date.parse(share.expiresAt) ? 'expired' : 'active'
    const total = (score > 0 ? score : 0.05) + recencyBoost(share.createdAt)
    out.push({
      id: `share:${share.id}`,
      source: 'share',
      label,
      meta: `share • ${status} • ${share.requiredRole}`,
      snippet: String(share.content || '').slice(0, 220),
      shareId: share.id,
      createdAt: share.createdAt,
      score: Number(total.toFixed(4)),
    })
    if (out.length >= Math.max(5, limit * 2)) break
  }
  return out
}

function searchStructuredRecords(deps: UnifiedSearchDeps, query: string, limit: number): SearchHit[] {
  if (!deps.structuredSessionStore) return []
  const hits = deps.structuredSessionStore.searchCommands(String(query || ''), Math.max(10, limit * 2))
  return hits.map((hit) => {
    const status = hit.ok === true ? 'ok' : hit.ok === false ? 'failed' : 'unknown'
    const meta = `structured • ${status} • ${hit.risk || 'read'} • ${hit.cwd || '(default)'}`
    const total = Number((hit.score + recencyBoost(hit.startedAt)).toFixed(4))
    return {
      id: `structured:${hit.commandId}`,
      source: 'structured' as const,
      label: hit.command,
      meta,
      snippet: hit.snippet,
      command: hit.command,
      createdAt: hit.startedAt,
      score: total,
    }
  })
}

export function runUnifiedSearch(deps: UnifiedSearchDeps, query: string, limit = 20): SearchHit[] {
  const safeLimit = Math.max(1, Math.min(Number(limit || 20), 100))
  const sourceBoost: Record<SearchHit['source'], number> = {
    structured: 0.9,
    transcript: 0.45,
    share: 0.25,
  }
  const all = [
    ...searchStructuredRecords(deps, query, safeLimit),
    ...searchTranscriptEntries(deps, query, safeLimit),
    ...searchShareRecords(deps, query, safeLimit),
  ].map((hit) => ({
    ...hit,
    score: Number((hit.score + sourceBoost[hit.source]).toFixed(4)),
  }))

  return all
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return Date.parse(b.createdAt) - Date.parse(a.createdAt)
    })
    .slice(0, safeLimit)
}
