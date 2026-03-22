import type {
  CommandSearchHit,
  CommandSearchRecord,
  IndexDoc,
  InvertedIndex,
  SearchFilters,
} from './structured-session-types.js'

export function tokenize(text: string): string[] {
  const tokens = String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9_./:-]+/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length >= 2)
    .slice(0, 200)
  return Array.from(new Set(tokens))
}

export function makeSnippet(command: string, output: string, max = 220): string {
  const merged = `${command}\n${output}`.trim()
  if (merged.length <= max) return merged
  return `${merged.slice(0, max)}…`
}

export function parseSearchQuery(rawQuery: string): SearchFilters {
  const out: SearchFilters = { terms: [] }
  const raw = String(rawQuery || '')
    .trim()
    .toLowerCase()
  if (!raw) return out
  for (const part of raw.split(/\s+/g)) {
    if (!part) continue
    const idx = part.indexOf(':')
    if (idx <= 0) {
      out.terms.push(part)
      continue
    }
    const k = part.slice(0, idx)
    const v = part.slice(idx + 1)
    if (!v) continue
    if (k === 'status' && (v === 'ok' || v === 'failed' || v === 'unknown')) {
      out.status = v
      continue
    }
    if (k === 'risk') {
      out.risk = v
      continue
    }
    if (k === 'cwd') {
      out.cwd = v
      continue
    }
    if (k === 'session') {
      out.session = v
      continue
    }
    if (k === 'after') {
      const ts = Date.parse(v)
      if (!Number.isNaN(ts)) out.afterTs = ts
      continue
    }
    if (k === 'before') {
      const ts = Date.parse(v)
      if (!Number.isNaN(ts)) out.beforeTs = ts
      continue
    }
    out.terms.push(part)
  }
  return out
}

export function docMatchesFilters(doc: IndexDoc, filters: SearchFilters): boolean {
  if (filters.status) {
    const status = doc.ok === true ? 'ok' : doc.ok === false ? 'failed' : 'unknown'
    if (status !== filters.status) return false
  }
  if (filters.risk && String(doc.risk || '').toLowerCase() !== filters.risk) return false
  if (
    filters.cwd &&
    !String(doc.cwd || '')
      .toLowerCase()
      .includes(filters.cwd)
  )
    return false
  if (
    filters.session &&
    !String(doc.session_id || '')
      .toLowerCase()
      .includes(filters.session)
  )
    return false
  if (filters.afterTs || filters.beforeTs) {
    const ts = Date.parse(doc.started_at)
    if (Number.isNaN(ts)) return false
    if (filters.afterTs && ts < filters.afterTs) return false
    if (filters.beforeTs && ts > filters.beforeTs) return false
  }
  return true
}

export function buildSearchHits(index: InvertedIndex, query: string, limit = 25): CommandSearchHit[] {
  const parsed = parseSearchQuery(query)
  const qTokens = tokenize(parsed.terms.join(' '))
  if (!index.docCount) return []
  const k1 = 1.2
  const b = 0.75
  const avgDocLen = index.docCount > 0 ? index.totalDocLen / index.docCount : 1
  const scoreByDoc = new Map<string, number>()

  if (qTokens.length > 0) {
    for (const token of qTokens) {
      const postings = index.postings[token]
      if (!postings || !postings.length) continue
      const df = postings.length
      const idf = Math.log(1 + (index.docCount - df + 0.5) / (df + 0.5))
      for (const posting of postings) {
        const doc = index.docs[posting.docId]
        if (!doc || !docMatchesFilters(doc, parsed)) continue
        const docLen = doc.doc_len || 1
        const tf = posting.tf || 1
        const tfWeight = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / Math.max(1, avgDocLen))))
        const current = scoreByDoc.get(posting.docId) || 0
        scoreByDoc.set(posting.docId, current + idf * tfWeight)
      }
    }
  } else {
    for (const [docId, doc] of Object.entries(index.docs)) {
      if (!docMatchesFilters(doc, parsed)) continue
      scoreByDoc.set(docId, 0.01)
    }
  }

  const hits: CommandSearchHit[] = []
  for (const [docId, score] of scoreByDoc.entries()) {
    const doc = index.docs[docId]
    if (!doc) continue
    const boosted = doc.ok === false ? score + 0.2 : score
    hits.push({
      sessionId: doc.session_id,
      commandId: doc.command_id,
      command: doc.command,
      cwd: doc.cwd,
      risk: doc.risk,
      ok: doc.ok,
      exitCode: doc.exit_code,
      durationMs: doc.duration_ms,
      startedAt: doc.started_at,
      score: Number(boosted.toFixed(4)),
      snippet: makeSnippet(doc.command, doc.output_excerpt),
    })
  }

  return hits
    .sort((a, b) => b.score - a.score || (a.startedAt < b.startedAt ? 1 : -1))
    .slice(0, Math.max(1, Math.min(limit, 200)))
}

export function upsertSearchIndex(index: InvertedIndex, row: CommandSearchRecord): InvertedIndex {
  const next = index
  const docId = row.command_id
  const prev = next.docs[docId]
  if (prev) {
    next.totalDocLen = Math.max(0, next.totalDocLen - (prev.doc_len || 0))
    for (const token of prev.tokens || []) {
      const posting = next.postings[token]
      if (!posting) continue
      next.postings[token] = posting.filter((p) => p.docId !== docId)
      if (next.postings[token].length === 0) delete next.postings[token]
    }
  } else {
    next.docCount += 1
  }

  const tfMap = new Map<string, number>()
  for (const token of row.tokens || []) {
    tfMap.set(token, (tfMap.get(token) || 0) + 1)
  }
  for (const [token, tf] of tfMap.entries()) {
    if (!next.postings[token]) next.postings[token] = []
    next.postings[token].push({ docId, tf })
  }

  const doc: IndexDoc = {
    ...row,
    doc_id: docId,
    doc_len: Math.max(1, (row.tokens || []).length),
  }
  next.docs[docId] = doc
  next.totalDocLen += doc.doc_len
  return next
}
