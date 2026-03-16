import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { redactText } from '@rinawarp/safety/redaction'
import { extractParameterKeys } from './prompt-boundary.js'

type CommandStream = 'stdout' | 'stderr' | 'meta'

type SessionMeta = {
  id: string
  createdAt: string
  updatedAt: string
  machineId: string
  host: string
  platform: string
  source: string
  projectRoot?: string
}

type CommandStart = {
  sessionId?: string
  streamId: string
  command: string
  cwd?: string
  shell?: string
  risk?: string
  source?: string
}

type CommandEnd = {
  streamId: string
  ok: boolean
  code: number | null
  cancelled: boolean
  error?: string | null
}

type CommandRunRecord = {
  id: string
  session_id: string
  stream_id: string
  input: string
  shell?: string
  cwd?: string
  risk?: string
  source?: string
  started_at: string
  ended_at?: string
  exit_code?: number | null
  ok?: boolean
  cancelled?: boolean
  error?: string | null
  duration_ms?: number
}

type ArtifactRecord = {
  id: string
  command_id: string
  session_id: string
  type: 'stdout_chunk' | 'stderr_chunk' | 'meta_chunk'
  payload: string
  created_at: string
}

type EdgeRecord = {
  id: string
  session_id: string
  from_command_id: string
  to_command_id: string
  type: 'followed_by'
  created_at: string
}

type SessionState = {
  meta: SessionMeta
  lastCommandId?: string
}

type IndexState = {
  streams: Map<string, CommandRunRecord>
  streamBuffers: Map<string, { stdout: string; stderr: string; meta: string }>
  sessions: Map<string, SessionState>
  latestSessionId?: string
}

type CommandSearchRecord = {
  session_id: string
  command_id: string
  command: string
  cwd?: string
  risk?: string
  ok?: boolean
  exit_code?: number | null
  duration_ms?: number
  started_at: string
  ended_at?: string
  output_excerpt: string
  tokens: string[]
}

type IndexDoc = CommandSearchRecord & {
  doc_id: string
  doc_len: number
}

type InvertedIndex = {
  version: number
  docCount: number
  totalDocLen: number
  docs: Record<string, IndexDoc>
  postings: Record<string, Array<{ docId: string; tf: number }>>
}

export type CommandSearchHit = {
  sessionId: string
  commandId: string
  command: string
  cwd?: string
  risk?: string
  ok?: boolean
  exitCode?: number | null
  durationMs?: number
  startedAt: string
  score: number
  snippet: string
}

export type RunbookJson = {
  id: string
  sessionId: string
  createdAt: string
  source: string
  projectRoot?: string
  parameters: string[]
  steps: Array<{
    stepId: string
    command: string
    cwd?: string
    risk?: string
  }>
}

function nowIso(): string {
  return new Date().toISOString()
}

function randomId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
}

function appendNdjson(file: string, data: unknown): void {
  fs.appendFileSync(file, `${JSON.stringify(data)}\n`, 'utf8')
}

function safeWriteJson(file: string, data: unknown): void {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
}

function stableMachineId(): string {
  const seed = `${os.hostname()}|${os.platform()}|${os.arch()}`
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16)
}

function tokenize(text: string): string[] {
  const tokens = String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9_./:-]+/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length >= 2)
    .slice(0, 200)
  return Array.from(new Set(tokens))
}

function makeSnippet(command: string, output: string, max = 220): string {
  const merged = `${command}\n${output}`.trim()
  if (merged.length <= max) return merged
  return `${merged.slice(0, max)}…`
}

type SearchFilters = {
  terms: string[]
  status?: 'ok' | 'failed' | 'unknown'
  risk?: string
  cwd?: string
  session?: string
  afterTs?: number
  beforeTs?: number
}

function parseSearchQuery(rawQuery: string): SearchFilters {
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

function docMatchesFilters(doc: IndexDoc, f: SearchFilters): boolean {
  if (f.status) {
    const status = doc.ok === true ? 'ok' : doc.ok === false ? 'failed' : 'unknown'
    if (status !== f.status) return false
  }
  if (f.risk && String(doc.risk || '').toLowerCase() !== f.risk) return false
  if (
    f.cwd &&
    !String(doc.cwd || '')
      .toLowerCase()
      .includes(f.cwd)
  )
    return false
  if (
    f.session &&
    !String(doc.session_id || '')
      .toLowerCase()
      .includes(f.session)
  )
    return false
  if (f.afterTs || f.beforeTs) {
    const ts = Date.parse(doc.started_at)
    if (Number.isNaN(ts)) return false
    if (f.afterTs && ts < f.afterTs) return false
    if (f.beforeTs && ts > f.beforeTs) return false
  }
  return true
}

export class StructuredSessionStore {
  private readonly rootDir: string
  private readonly enabled: boolean
  private readonly idx: IndexState
  private searchIndexCache: InvertedIndex | null = null

  constructor(rootDir: string, enabled: boolean) {
    this.rootDir = rootDir
    this.enabled = enabled
    this.idx = { streams: new Map(), streamBuffers: new Map(), sessions: new Map() }
  }

  init(): void {
    if (!this.enabled) return
    fs.mkdirSync(this.rootDir, { recursive: true })
    fs.mkdirSync(path.join(this.rootDir, 'migrations'), { recursive: true })
    fs.mkdirSync(path.join(this.rootDir, 'sessions'), { recursive: true })
    fs.mkdirSync(path.join(this.rootDir, 'search'), { recursive: true })

    const migrationFile = path.join(this.rootDir, 'migrations', '001_structured_session_v1.json')
    if (!fs.existsSync(migrationFile)) {
      safeWriteJson(migrationFile, {
        version: 1,
        name: 'structured_session_v1',
        created_at: nowIso(),
        tables: ['sessions', 'command_runs', 'artifacts', 'edges'],
      })
    }
  }

  latestSessionId(): string | undefined {
    return this.idx.latestSessionId
  }

  startSession(args: { source: string; projectRoot?: string; preferredId?: string }): string {
    if (!this.enabled) return args.preferredId || randomId('session')
    const id = args.preferredId || randomId('session')
    if (this.idx.sessions.has(id)) return id

    const createdAt = nowIso()
    const meta: SessionMeta = {
      id,
      createdAt,
      updatedAt: createdAt,
      machineId: stableMachineId(),
      host: os.hostname(),
      platform: `${os.platform()}-${os.arch()}`,
      source: args.source,
      projectRoot: args.projectRoot,
    }
    const state: SessionState = { meta }
    this.idx.sessions.set(id, state)
    this.idx.latestSessionId = id

    const dir = this.sessionDir(id)
    fs.mkdirSync(dir, { recursive: true })
    safeWriteJson(path.join(dir, 'session.json'), meta)
    return id
  }

  beginCommand(args: CommandStart): string | null {
    if (!this.enabled) return null
    if (this.idx.streams.has(args.streamId)) {
      return this.idx.streams.get(args.streamId)!.id
    }
    const sessionId =
      args.sessionId ||
      this.idx.latestSessionId ||
      this.startSession({ source: args.source || 'unknown', projectRoot: args.cwd })

    if (!this.idx.sessions.has(sessionId)) {
      this.startSession({ source: args.source || 'unknown', projectRoot: args.cwd, preferredId: sessionId })
    }

    const record: CommandRunRecord = {
      id: randomId('cmd'),
      session_id: sessionId,
      stream_id: args.streamId,
      input: redactText(args.command || '').redactedText,
      shell: args.shell,
      cwd: args.cwd ? redactText(args.cwd).redactedText : args.cwd,
      risk: args.risk,
      source: args.source,
      started_at: nowIso(),
    }
    this.idx.streams.set(args.streamId, record)
    this.idx.streamBuffers.set(args.streamId, { stdout: '', stderr: '', meta: '' })
    appendNdjson(this.commandsFile(sessionId), record)

    const sess = this.idx.sessions.get(sessionId)
    if (sess?.lastCommandId) {
      const edge: EdgeRecord = {
        id: randomId('edge'),
        session_id: sessionId,
        from_command_id: sess.lastCommandId,
        to_command_id: record.id,
        type: 'followed_by',
        created_at: nowIso(),
      }
      appendNdjson(this.edgesFile(sessionId), edge)
    }
    if (sess) {
      sess.lastCommandId = record.id
      sess.meta.updatedAt = nowIso()
      safeWriteJson(path.join(this.sessionDir(sessionId), 'session.json'), sess.meta)
    }
    return record.id
  }

  appendChunk(streamId: string, stream: CommandStream, data: string): void {
    if (!this.enabled || !data) return
    const cmd = this.idx.streams.get(streamId)
    if (!cmd) return
    const type = stream === 'stderr' ? 'stderr_chunk' : stream === 'meta' ? 'meta_chunk' : 'stdout_chunk'
    const art: ArtifactRecord = {
      id: randomId('art'),
      command_id: cmd.id,
      session_id: cmd.session_id,
      type,
      payload: redactText(data).redactedText,
      created_at: nowIso(),
    }
    appendNdjson(this.artifactsFile(cmd.session_id), art)
    const b = this.idx.streamBuffers.get(streamId)
    if (b) {
      if (stream === 'stderr') b.stderr = `${b.stderr}${art.payload}`.slice(-20_000)
      else if (stream === 'meta') b.meta = `${b.meta}${art.payload}`.slice(-6_000)
      else b.stdout = `${b.stdout}${art.payload}`.slice(-20_000)
      this.idx.streamBuffers.set(streamId, b)
    }
  }

  endCommand(args: CommandEnd): void {
    if (!this.enabled) return
    const cmd = this.idx.streams.get(args.streamId)
    if (!cmd) return
    this.idx.streams.delete(args.streamId)

    const endedAt = nowIso()
    const endedTs = new Date(endedAt).getTime()
    const startedTs = new Date(cmd.started_at).getTime()
    const endRecord: CommandRunRecord = {
      ...cmd,
      ended_at: endedAt,
      ok: args.ok,
      exit_code: args.code,
      cancelled: args.cancelled,
      error: args.error ? redactText(args.error).redactedText : null,
      duration_ms: Number.isFinite(startedTs) ? Math.max(0, endedTs - startedTs) : undefined,
    }
    appendNdjson(this.commandsFile(cmd.session_id), endRecord)
    const b = this.idx.streamBuffers.get(args.streamId) || { stdout: '', stderr: '', meta: '' }
    this.idx.streamBuffers.delete(args.streamId)
    const outputExcerpt = `${b.stdout}\n${b.stderr}`.trim().slice(0, 2500)
    const searchRow: CommandSearchRecord = {
      session_id: cmd.session_id,
      command_id: cmd.id,
      command: endRecord.input,
      cwd: endRecord.cwd,
      risk: endRecord.risk,
      ok: endRecord.ok,
      exit_code: endRecord.exit_code,
      duration_ms: endRecord.duration_ms,
      started_at: endRecord.started_at,
      ended_at: endRecord.ended_at,
      output_excerpt: outputExcerpt,
      tokens: tokenize(`${endRecord.input} ${endRecord.cwd || ''} ${outputExcerpt} ${endRecord.error || ''}`),
    }
    appendNdjson(this.searchFile(cmd.session_id), searchRow)
    this.upsertSearchIndex(searchRow)

    const sess = this.idx.sessions.get(cmd.session_id)
    if (sess) {
      sess.meta.updatedAt = endedAt
      safeWriteJson(path.join(this.sessionDir(cmd.session_id), 'session.json'), sess.meta)
    }
  }

  exportRunbookMarkdown(sessionId?: string): string {
    const sid = sessionId || this.pickBestSessionIdForRunbook()
    if (!sid) return '# RinaWarp Runbook\n\nNo session captured yet.\n'
    const sessionPath = path.join(this.sessionDir(sid), 'session.json')
    const commandsPath = path.join(this.sessionDir(sid), 'commands.ndjson')
    if (!fs.existsSync(sessionPath) || !fs.existsSync(commandsPath)) {
      return `# RinaWarp Runbook\n\nSession not found or empty: ${sid}\n`
    }

    const meta = JSON.parse(fs.readFileSync(sessionPath, 'utf8')) as SessionMeta
    const raw = fs
      .readFileSync(commandsPath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const starts = new Map<string, CommandRunRecord>()
    const ends = new Map<string, CommandRunRecord>()
    for (const line of raw) {
      const row = JSON.parse(line) as CommandRunRecord
      if (row.ended_at) ends.set(row.id, row)
      else starts.set(row.id, row)
    }

    const ordered = Array.from(starts.values())
      .sort((a, b) => (a.started_at < b.started_at ? -1 : 1))
      .map((s) => ({ start: s, end: ends.get(s.id) }))

    let out = '# RinaWarp Runbook\n\n'
    out += `- Session: \`${meta.id}\`\n`
    out += `- Created: ${meta.createdAt}\n`
    if (meta.projectRoot) out += `- Project: \`${meta.projectRoot}\`\n`
    out += '\n## Steps\n\n'
    for (let i = 0; i < ordered.length; i += 1) {
      const row = ordered[i]
      out += `${i + 1}. \`${row.start.input}\`\n`
      out += `   - CWD: \`${row.start.cwd || '(default)'}\`\n`
      if (row.end) {
        out += `   - Result: ${row.end.ok ? 'ok' : 'failed'}\n`
        out += `   - Exit: ${row.end.exit_code ?? 'n/a'}\n`
        if (row.end.duration_ms != null) out += `   - Duration: ${row.end.duration_ms}ms\n`
      }
    }
    return out
  }

  exportRunbookJson(sessionId?: string): RunbookJson | null {
    const sid = sessionId || this.pickBestSessionIdForRunbook()
    if (!sid) return null
    const sessionPath = path.join(this.sessionDir(sid), 'session.json')
    const commandsPath = path.join(this.sessionDir(sid), 'commands.ndjson')
    if (!fs.existsSync(sessionPath) || !fs.existsSync(commandsPath)) return null
    const meta = JSON.parse(fs.readFileSync(sessionPath, 'utf8')) as SessionMeta
    const raw = fs
      .readFileSync(commandsPath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const starts = new Map<string, CommandRunRecord>()
    for (const line of raw) {
      const row = JSON.parse(line) as CommandRunRecord
      if (!row.ended_at) starts.set(row.id, row)
    }
    const steps = Array.from(starts.values())
      .sort((a, b) => (a.started_at < b.started_at ? -1 : 1))
      .map((s, i) => ({
        stepId: s.id || `step_${i + 1}`,
        command: s.input,
        cwd: s.cwd,
        risk: s.risk,
      }))
    const parameters = Array.from(new Set(steps.flatMap((s) => extractParameterKeys(s.command))))
    return {
      id: `runbook_${sid}`,
      sessionId: sid,
      createdAt: meta.createdAt,
      source: meta.source,
      projectRoot: meta.projectRoot,
      parameters,
      steps,
    }
  }

  searchCommands(query: string, limit = 25): CommandSearchHit[] {
    if (!this.enabled) return []
    const parsed = parseSearchQuery(query)
    const qTokens = tokenize(parsed.terms.join(' '))
    const idx = this.loadSearchIndex()
    if (!idx.docCount) return []
    const k1 = 1.2
    const b = 0.75
    const avgDocLen = idx.docCount > 0 ? idx.totalDocLen / idx.docCount : 1
    const scoreByDoc = new Map<string, number>()

    if (qTokens.length > 0) {
      for (const token of qTokens) {
        const postings = idx.postings[token]
        if (!postings || !postings.length) continue
        const df = postings.length
        const idf = Math.log(1 + (idx.docCount - df + 0.5) / (df + 0.5))
        for (const p of postings) {
          const doc = idx.docs[p.docId]
          if (!doc || !docMatchesFilters(doc, parsed)) continue
          const dl = doc.doc_len || 1
          const tf = p.tf || 1
          const tfWeight = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (dl / Math.max(1, avgDocLen))))
          const current = scoreByDoc.get(p.docId) || 0
          scoreByDoc.set(p.docId, current + idf * tfWeight)
        }
      }
    } else {
      for (const [docId, doc] of Object.entries(idx.docs)) {
        if (!docMatchesFilters(doc, parsed)) continue
        scoreByDoc.set(docId, 0.01)
      }
    }
    const hits: CommandSearchHit[] = []
    for (const [docId, score] of scoreByDoc.entries()) {
      const d = idx.docs[docId]
      if (!d) continue
      const boosted = d.ok === false ? score + 0.2 : score
      hits.push({
        sessionId: d.session_id,
        commandId: d.command_id,
        command: d.command,
        cwd: d.cwd,
        risk: d.risk,
        ok: d.ok,
        exitCode: d.exit_code,
        durationMs: d.duration_ms,
        startedAt: d.started_at,
        score: Number(boosted.toFixed(4)),
        snippet: makeSnippet(d.command, d.output_excerpt),
      })
    }
    return hits
      .sort((a, b) => b.score - a.score || (a.startedAt < b.startedAt ? 1 : -1))
      .slice(0, Math.max(1, Math.min(limit, 200)))
  }

  private loadSearchIndex(): InvertedIndex {
    if (this.searchIndexCache) return this.searchIndexCache
    const file = this.searchIndexFile()
    const parsed = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as InvertedIndex) : null
    if (parsed && parsed.version === 1 && parsed.docs && parsed.postings) {
      this.searchIndexCache = parsed
      return parsed
    }
    const fresh: InvertedIndex = {
      version: 1,
      docCount: 0,
      totalDocLen: 0,
      docs: {},
      postings: {},
    }
    this.searchIndexCache = fresh
    this.flushSearchIndex()
    return fresh
  }

  private flushSearchIndex() {
    if (!this.searchIndexCache) return
    safeWriteJson(this.searchIndexFile(), this.searchIndexCache)
  }

  private upsertSearchIndex(row: CommandSearchRecord) {
    const idx = this.loadSearchIndex()
    const docId = row.command_id
    const prev = idx.docs[docId]
    if (prev) {
      idx.totalDocLen = Math.max(0, idx.totalDocLen - (prev.doc_len || 0))
      for (const tok of prev.tokens || []) {
        const posting = idx.postings[tok]
        if (!posting) continue
        idx.postings[tok] = posting.filter((p) => p.docId !== docId)
        if (idx.postings[tok].length === 0) delete idx.postings[tok]
      }
    } else {
      idx.docCount += 1
    }

    const tfMap = new Map<string, number>()
    for (const tok of row.tokens || []) {
      tfMap.set(tok, (tfMap.get(tok) || 0) + 1)
    }
    for (const [tok, tf] of tfMap.entries()) {
      if (!idx.postings[tok]) idx.postings[tok] = []
      idx.postings[tok].push({ docId, tf })
    }
    const doc: IndexDoc = {
      ...row,
      doc_id: docId,
      doc_len: Math.max(1, (row.tokens || []).length),
    }
    idx.docs[docId] = doc
    idx.totalDocLen += doc.doc_len
    this.searchIndexCache = idx
    this.flushSearchIndex()
  }

  private pickBestSessionIdForRunbook(): string | undefined {
    const preferred = this.idx.latestSessionId
    if (preferred) {
      const f = path.join(this.sessionDir(preferred), 'commands.ndjson')
      if (fs.existsSync(f) && fs.statSync(f).size > 0) return preferred
    }

    const sessionsRoot = path.join(this.rootDir, 'sessions')
    if (!fs.existsSync(sessionsRoot)) return preferred

    const candidates = fs
      .readdirSync(sessionsRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .map((id) => {
        const sessionFile = path.join(this.sessionDir(id), 'session.json')
        const commandsFile = path.join(this.sessionDir(id), 'commands.ndjson')
        if (!fs.existsSync(sessionFile) || !fs.existsSync(commandsFile)) return null
        if (fs.statSync(commandsFile).size <= 0) return null
        try {
          const meta = JSON.parse(fs.readFileSync(sessionFile, 'utf8')) as SessionMeta
          return { id, updatedAt: meta.updatedAt || meta.createdAt || '' }
        } catch {
          return null
        }
      })
      .filter((x): x is { id: string; updatedAt: string } => !!x)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))

    return candidates[0]?.id ?? preferred
  }

  private sessionDir(sessionId: string): string {
    return path.join(this.rootDir, 'sessions', sessionId)
  }

  private commandsFile(sessionId: string): string {
    const dir = this.sessionDir(sessionId)
    fs.mkdirSync(dir, { recursive: true })
    return path.join(dir, 'commands.ndjson')
  }

  private artifactsFile(sessionId: string): string {
    const dir = this.sessionDir(sessionId)
    fs.mkdirSync(dir, { recursive: true })
    return path.join(dir, 'artifacts.ndjson')
  }

  private edgesFile(sessionId: string): string {
    const dir = this.sessionDir(sessionId)
    fs.mkdirSync(dir, { recursive: true })
    return path.join(dir, 'edges.ndjson')
  }

  private searchFile(sessionId: string): string {
    const dir = this.sessionDir(sessionId)
    fs.mkdirSync(dir, { recursive: true })
    return path.join(dir, 'search.ndjson')
  }

  private searchIndexFile(): string {
    const dir = path.join(this.rootDir, 'search')
    fs.mkdirSync(dir, { recursive: true })
    return path.join(dir, 'inverted-index.json')
  }
}
