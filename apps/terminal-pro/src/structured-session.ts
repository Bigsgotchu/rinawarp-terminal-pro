import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { redactText } from '@rinawarp/safety/redaction'
import { extractParameterKeys } from './prompt-boundary.js'
import { buildSearchHits, tokenize, upsertSearchIndex } from './structured-session-search.js'
import {
  appendNdjson,
  artifactsFile,
  commandsFile,
  edgesFile,
  loadSearchIndexFile,
  nowIso,
  pickBestSessionIdForRunbook,
  randomId,
  readCommandRecords,
  safeWriteJson,
  searchFile,
  searchIndexFile,
  sessionDir,
  stableMachineId,
} from './structured-session-store-io.js'
import type {
  ArtifactRecord,
  CommandEnd,
  CommandRunRecord,
  CommandSearchHit,
  CommandSearchRecord,
  CommandStart,
  CommandStream,
  EdgeRecord,
  IndexState,
  InvertedIndex,
  RunbookJson,
  SessionMeta,
} from './structured-session-types.js'

export type { CommandSearchHit, RunbookJson } from './structured-session-types.js'

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
    this.idx.sessions.set(id, { meta })
    this.idx.latestSessionId = id

    const dir = sessionDir(this.rootDir, id)
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
    appendNdjson(commandsFile(this.rootDir, sessionId), record)

    const session = this.idx.sessions.get(sessionId)
    if (session?.lastCommandId) {
      const edge: EdgeRecord = {
        id: randomId('edge'),
        session_id: sessionId,
        from_command_id: session.lastCommandId,
        to_command_id: record.id,
        type: 'followed_by',
        created_at: nowIso(),
      }
      appendNdjson(edgesFile(this.rootDir, sessionId), edge)
    }
    if (session) {
      session.lastCommandId = record.id
      session.meta.updatedAt = nowIso()
      safeWriteJson(path.join(sessionDir(this.rootDir, sessionId), 'session.json'), session.meta)
    }
    return record.id
  }

  appendChunk(streamId: string, stream: CommandStream, data: string): void {
    if (!this.enabled || !data) return
    const command = this.idx.streams.get(streamId)
    if (!command) return
    const type = stream === 'stderr' ? 'stderr_chunk' : stream === 'meta' ? 'meta_chunk' : 'stdout_chunk'
    const artifact: ArtifactRecord = {
      id: randomId('art'),
      command_id: command.id,
      session_id: command.session_id,
      type,
      payload: redactText(data).redactedText,
      created_at: nowIso(),
    }
    appendNdjson(artifactsFile(this.rootDir, command.session_id), artifact)

    const buffer = this.idx.streamBuffers.get(streamId)
    if (!buffer) return
    if (stream === 'stderr') buffer.stderr = `${buffer.stderr}${artifact.payload}`.slice(-20_000)
    else if (stream === 'meta') buffer.meta = `${buffer.meta}${artifact.payload}`.slice(-6_000)
    else buffer.stdout = `${buffer.stdout}${artifact.payload}`.slice(-20_000)
    this.idx.streamBuffers.set(streamId, buffer)
  }

  endCommand(args: CommandEnd): void {
    if (!this.enabled) return
    const command = this.idx.streams.get(args.streamId)
    if (!command) return
    this.idx.streams.delete(args.streamId)

    const endedAt = nowIso()
    const endRecord: CommandRunRecord = {
      ...command,
      ended_at: endedAt,
      ok: args.ok,
      exit_code: args.code,
      cancelled: args.cancelled,
      error: args.error ? redactText(args.error).redactedText : null,
      duration_ms: this.computeDurationMs(command.started_at, endedAt),
    }
    appendNdjson(commandsFile(this.rootDir, command.session_id), endRecord)

    const buffer = this.idx.streamBuffers.get(args.streamId) || { stdout: '', stderr: '', meta: '' }
    this.idx.streamBuffers.delete(args.streamId)
    const searchRow: CommandSearchRecord = {
      session_id: command.session_id,
      command_id: command.id,
      command: endRecord.input,
      cwd: endRecord.cwd,
      risk: endRecord.risk,
      ok: endRecord.ok,
      exit_code: endRecord.exit_code,
      duration_ms: endRecord.duration_ms,
      started_at: endRecord.started_at,
      ended_at: endRecord.ended_at,
      output_excerpt: `${buffer.stdout}\n${buffer.stderr}`.trim().slice(0, 2500),
      tokens: tokenize(`${endRecord.input} ${endRecord.cwd || ''} ${buffer.stdout} ${buffer.stderr} ${endRecord.error || ''}`),
    }
    appendNdjson(searchFile(this.rootDir, command.session_id), searchRow)
    this.persistSearchRow(searchRow)

    const session = this.idx.sessions.get(command.session_id)
    if (session) {
      session.meta.updatedAt = endedAt
      safeWriteJson(path.join(sessionDir(this.rootDir, command.session_id), 'session.json'), session.meta)
    }
  }

  exportRunbookMarkdown(sessionId?: string): string {
    const sid = sessionId || this.pickBestSessionIdForRunbook()
    if (!sid) return '# RinaWarp Runbook\n\nNo session captured yet.\n'
    const sessionPath = path.join(sessionDir(this.rootDir, sid), 'session.json')
    const commandsPath = path.join(sessionDir(this.rootDir, sid), 'commands.ndjson')
    if (!fs.existsSync(sessionPath) || !fs.existsSync(commandsPath)) {
      return `# RinaWarp Runbook\n\nSession not found or empty: ${sid}\n`
    }

    const meta = JSON.parse(fs.readFileSync(sessionPath, 'utf8')) as SessionMeta
    const { starts, ends } = readCommandRecords(commandsPath)
    const ordered = Array.from(starts.values())
      .sort((a, b) => (a.started_at < b.started_at ? -1 : 1))
      .map((start) => ({ start, end: ends.get(start.id) }))

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
    const sessionPath = path.join(sessionDir(this.rootDir, sid), 'session.json')
    const commandsPath = path.join(sessionDir(this.rootDir, sid), 'commands.ndjson')
    if (!fs.existsSync(sessionPath) || !fs.existsSync(commandsPath)) return null

    const meta = JSON.parse(fs.readFileSync(sessionPath, 'utf8')) as SessionMeta
    const { starts } = readCommandRecords(commandsPath)
    const steps = Array.from(starts.values())
      .sort((a, b) => (a.started_at < b.started_at ? -1 : 1))
      .map((start, index) => ({
        stepId: start.id || `step_${index + 1}`,
        command: start.input,
        cwd: start.cwd,
        risk: start.risk,
      }))
    const parameters = Array.from(new Set(steps.flatMap((step) => extractParameterKeys(step.command))))

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
    return buildSearchHits(this.loadSearchIndex(), query, limit)
  }

  private computeDurationMs(startedAt: string, endedAt: string): number | undefined {
    const endedTs = new Date(endedAt).getTime()
    const startedTs = new Date(startedAt).getTime()
    return Number.isFinite(startedTs) ? Math.max(0, endedTs - startedTs) : undefined
  }

  private loadSearchIndex(): InvertedIndex {
    if (this.searchIndexCache) return this.searchIndexCache
    const parsed = loadSearchIndexFile(this.rootDir)
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

  private flushSearchIndex(): void {
    if (!this.searchIndexCache) return
    safeWriteJson(searchIndexFile(this.rootDir), this.searchIndexCache)
  }

  private persistSearchRow(row: CommandSearchRecord): void {
    this.searchIndexCache = upsertSearchIndex(this.loadSearchIndex(), row)
    this.flushSearchIndex()
  }

  private pickBestSessionIdForRunbook(): string | undefined {
    return pickBestSessionIdForRunbook({
      rootDir: this.rootDir,
      latestSessionId: this.idx.latestSessionId,
    })
  }
}
