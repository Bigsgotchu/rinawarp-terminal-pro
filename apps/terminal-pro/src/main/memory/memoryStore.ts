import Database from 'better-sqlite3'
import type { Database as BetterSqlite3Database } from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import path, { dirname } from 'node:path'
import { RuleBasedMemoryExtractor } from './RuleBasedMemoryExtractor.js'
import { MEMORY_SCHEMA_SQL } from './memorySchema.js'
import type { OwnerMemoryStoreDeps } from '../startup/runtimeTypes.js'

type TonePreference = 'concise' | 'balanced' | 'detailed'
type HumorPreference = 'low' | 'medium' | 'high'

type RinaMemoryProfile = {
  preferredName?: string
  tonePreference?: TonePreference
  humorPreference?: HumorPreference
  likes?: string[]
  dislikes?: string[]
}

type WorkspaceMemory = {
  workspaceId: string
  label?: string
  preferredResponseStyle?: string[]
  preferredProofStyle?: string[]
  conventions?: Array<{
    key: string
    value: string
  }>
  updatedAt: string
}

type InferredMemoryKind = 'preference' | 'habit' | 'project' | 'relationship'

type InferredMemoryEntry = {
  id: string
  kind: InferredMemoryKind
  summary: string
  confidence: number
  source: 'behavior' | 'conversation'
  workspaceId?: string
  runId?: string
  status: 'suggested' | 'approved' | 'dismissed'
  createdAt: string
  updatedAt: string
}

type OperationalMemoryScope = 'session' | 'user' | 'project' | 'episode'
type OperationalMemoryKind = 'preference' | 'constraint' | 'project_fact' | 'task_outcome' | 'conversation_fact'

type OperationalMemoryEntry = {
  id: string
  scope: OperationalMemoryScope
  kind: OperationalMemoryKind
  content: string
  status?: 'approved' | 'suggested' | 'rejected'
  salience: number
  confidence?: number
  workspaceId?: string
  source?: 'behavior' | 'conversation' | 'user_explicit' | 'assistant_inferred' | 'task_outcome' | 'system_derived'
  tags?: string[]
  createdAt: string
  updatedAt: string
  lastUsedAt?: string
  metadata?: Record<string, unknown>
}

type ConversationTurnEntry = {
  id: string
  sessionId: string
  workspaceId?: string
  userMessage: string
  assistantMessage: string
  createdAt: string
}

type RecentRunSignal = {
  sessionId: string
  projectRoot?: string
  latestCommand?: string
  latestReceiptId?: string
  failedCount?: number
  interrupted?: boolean
}

type OwnerMemoryRecord = {
  ownerId: string
  profile: RinaMemoryProfile
  workspaces: Record<string, WorkspaceMemory>
  inferredMemories: InferredMemoryEntry[]
  operationalMemories?: OperationalMemoryEntry[]
  conversationTurns?: ConversationTurnEntry[]
  updatedAt: string
}

type MemoryFile = {
  version: 1
  owners: Record<string, OwnerMemoryRecord>
}

type OwnerIdentity = {
  ownerId: string
  mode: 'licensed' | 'local-fallback'
  customerId: string | null
  email: string | null
}

export function createOwnerMemoryStore(deps: OwnerMemoryStoreDeps) {
  const pathApi = deps.path || path
  const extractor = new RuleBasedMemoryExtractor()
  const isE2E = process.env.RINAWARP_E2E === '1'

  if (isE2E) {
    process.env.RINAWARP_E2E_MEMORY_PHASE = 'owner-store:start'
  }

  const filePath = () => pathApi.join(deps.app.getPath('userData'), 'rina-memory-v1.json')
  const sqlitePath = () => pathApi.join(deps.app.getPath('userData'), 'rina-memory.sqlite')

  let sqlite: BetterSqlite3Database | null = null
  let sqliteUnavailableReason: string | null = null

  function getSqlite(): BetterSqlite3Database {
    if (sqlite) return sqlite
    if (sqliteUnavailableReason) {
      throw new Error(sqliteUnavailableReason)
    }
    mkdirSync(dirname(sqlitePath()), { recursive: true })
    if (isE2E) {
      process.env.RINAWARP_E2E_MEMORY_PHASE = 'owner-store:mkdir-ready'
    }
    try {
      sqlite = new Database(sqlitePath())
      if (isE2E) {
        process.env.RINAWARP_E2E_MEMORY_PHASE = 'owner-store:db-open'
      }
      sqlite.exec(MEMORY_SCHEMA_SQL)
      if (isE2E) {
        process.env.RINAWARP_E2E_MEMORY_PHASE = 'owner-store:schema-ready'
      }
    } catch (error) {
      sqlite = null
      sqliteUnavailableReason = error instanceof Error ? error.message : String(error)
      if (isE2E) {
        process.env.RINAWARP_E2E_MEMORY_PHASE = 'owner-store:fallback-json'
      }
      console.warn(
        `[memory] SQLite unavailable; falling back to JSON-backed operational memory. ${sqliteUnavailableReason}`,
      )
      throw error
    }
    return sqlite
  }

  function hasSqlite(): boolean {
    try {
      getSqlite()
      return true
    } catch {
      return false
    }
  }

  function parseJson<T>(value: string | null | undefined, fallback: T): T {
    if (!value) return fallback
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }

  function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value))
  }

  function scopeToDb(scope: OperationalMemoryScope): 'session' | 'user' | 'workspace' | 'episode' {
    return scope === 'project' ? 'workspace' : scope
  }

  function scopeFromDb(scope: unknown): OperationalMemoryScope {
    return scope === 'workspace' ? 'project' : (scope as OperationalMemoryScope)
  }

  function rowToOperationalMemoryEntry(row: Record<string, unknown>): OperationalMemoryEntry {
    return {
      id: String(row.id || '').trim(),
      scope: scopeFromDb(row.scope),
      kind: row.kind as OperationalMemoryKind,
      content: String(row.content || '').trim(),
      status: (row.status as 'approved' | 'suggested' | 'rejected' | undefined) || 'approved',
      salience: clamp01(Number(row.salience || 0.5)),
      confidence: clamp01(Number(row.confidence || 0.5)),
      workspaceId: row.workspace_id ? String(row.workspace_id).trim() || undefined : undefined,
      source: (row.source as OperationalMemoryEntry['source']) || 'conversation',
      tags: parseJson<string[]>(typeof row.tags_json === 'string' ? row.tags_json : null, []),
      createdAt: String(row.created_at || new Date().toISOString()),
      updatedAt: String(row.updated_at || new Date().toISOString()),
      lastUsedAt: row.last_used_at ? String(row.last_used_at).trim() || undefined : undefined,
      metadata: parseJson<Record<string, unknown>>(typeof row.metadata_json === 'string' ? row.metadata_json : null, {}),
    }
  }

  function readOperationalMemories(ownerId: string, limit = 200): OperationalMemoryEntry[] {
    const rows = getSqlite().prepare(`
      SELECT *
      FROM memory_entries
      WHERE user_id = ?
      ORDER BY
        COALESCE(last_used_at, updated_at) DESC,
        salience DESC
      LIMIT ?
    `).all(ownerId, limit) as Record<string, unknown>[]

    return rows.map(rowToOperationalMemoryEntry)
  }

  function queryOperationalMemories(args: {
    ownerId: string
    workspaceId?: string
    sessionId?: string
    query: string
    limit?: number
  }): OperationalMemoryEntry[] {
    const query = String(args.query || '').toLowerCase().trim()
    const workspaceId = String(args.workspaceId || '').trim() || undefined
    const sessionId = String(args.sessionId || '').trim() || undefined
    const limit = Math.max(1, args.limit || 8)
    const tokens = query.split(/[^a-z0-9]+/i).filter(Boolean)
    const where = ['user_id = ?', "status IN ('approved', 'suggested')"]
    const params: unknown[] = [args.ownerId]

    if (workspaceId) {
      where.push('(workspace_id = ? OR workspace_id IS NULL)')
      params.push(workspaceId)
    }
    if (sessionId) {
      where.push('(session_id = ? OR session_id IS NULL)')
      params.push(sessionId)
    }
    if (tokens.length > 0) {
      where.push(`(${tokens.map(() => '(LOWER(content) LIKE LOWER(?) OR LOWER(tags_json) LIKE LOWER(?))').join(' OR ')})`)
      params.push(...tokens.flatMap((token) => [`%${token}%`, `%${token}%`]))
    }

    const rows = getSqlite().prepare(`
      SELECT *
      FROM memory_entries
      WHERE ${where.join(' AND ')}
      ORDER BY
        (CASE WHEN workspace_id = ? THEN 1 ELSE 0 END) DESC,
        salience DESC,
        updated_at DESC
      LIMIT ?
    `).all(...params, workspaceId ?? null, Math.max(limit * 3, 20)) as Record<string, unknown>[]

    return rows
      .map((row) => {
        const entry = rowToOperationalMemoryEntry(row)
        let score = entry.salience
        if (workspaceId && entry.workspaceId === workspaceId) score += 0.5
        if (workspaceId && !entry.workspaceId) score += 0.1
        if (query && entry.content.toLowerCase().includes(query)) score += 0.5
        if (tokens.some((token) => entry.content.toLowerCase().includes(token))) score += 0.25
        if (tokens.some((token) => (entry.tags || []).some((tag) => tag.toLowerCase().includes(token)))) score += 0.2
        if (entry.kind === 'constraint') score += 0.3
        if (entry.kind === 'preference') score += 0.2
        return { entry, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ entry }) => {
        const timestamp = new Date().toISOString()
        getSqlite().prepare('UPDATE memory_entries SET last_used_at = ?, updated_at = ? WHERE id = ?').run(timestamp, timestamp, entry.id)
        return entry
      })
  }

  function saveExtractedMemory(input: {
    scope: OperationalMemoryScope
    kind: OperationalMemoryKind
    status: 'approved' | 'suggested' | 'rejected'
    content: string
    workspaceId?: string | null
    sessionId?: string | null
    salience?: number
    confidence?: number
    source?: 'user_explicit' | 'assistant_inferred' | 'task_outcome' | 'system_derived'
    normalizedKey?: string | null
    tags?: string[]
    metadata?: Record<string, unknown>
  }): void {
    const owner = resolveOwnerIdentity()
    const file = readFile()
    const record = ensureOwner(file, owner.ownerId)
    const now = new Date().toISOString()
    const scope = scopeToDb(input.scope)
    const workspaceId = String(input.workspaceId || '').trim() || null
    const sessionId = String(input.sessionId || '').trim() || null
    const normalizedKey =
      input.normalizedKey || `${input.scope}:${input.kind}:${workspaceId || 'global'}:${String(input.content || '').trim().toLowerCase()}`
    if (!hasSqlite()) {
      const entries = normalizeOperationalMemories(record.operationalMemories)
      const existingIndex = entries.findIndex(
        (entry) =>
          entry.scope === input.scope &&
          entry.kind === input.kind &&
          (entry.workspaceId || null) === (workspaceId || null) &&
          entry.content.trim().toLowerCase() === String(input.content || '').trim().toLowerCase()
      )
      const nextEntry: OperationalMemoryEntry = {
        id: existingIndex >= 0 ? entries[existingIndex]!.id : randomUUID(),
        scope: input.scope,
        kind: input.kind,
        content: String(input.content || '').trim(),
        status: input.status,
        salience:
          existingIndex >= 0
            ? Math.max(entries[existingIndex]!.salience, clamp01(Number(input.salience ?? entries[existingIndex]!.salience ?? 0.5)))
            : clamp01(Number(input.salience ?? 0.5)),
        confidence:
          existingIndex >= 0
            ? Math.max(entries[existingIndex]!.confidence ?? 0.5, clamp01(Number(input.confidence ?? entries[existingIndex]!.confidence ?? 0.5)))
            : clamp01(Number(input.confidence ?? 0.5)),
        workspaceId: workspaceId || undefined,
        source: input.source,
        tags: normalizeStringList(input.tags),
        metadata: input.metadata || {},
        createdAt: existingIndex >= 0 ? entries[existingIndex]!.createdAt : now,
        updatedAt: now,
        lastUsedAt: existingIndex >= 0 ? entries[existingIndex]!.lastUsedAt : undefined,
      }
      if (existingIndex >= 0) {
        entries[existingIndex] = {
          ...entries[existingIndex]!,
          ...nextEntry,
          tags: normalizeStringList([...(entries[existingIndex]!.tags || []), ...(nextEntry.tags || [])]),
          metadata: {
            ...(entries[existingIndex]!.metadata || {}),
            ...(nextEntry.metadata || {}),
          },
        }
      } else {
        entries.push(nextEntry)
      }
      record.operationalMemories = entries
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.salience - a.salience)
        .slice(0, 400)
      record.updatedAt = now
      writeFile(file)
      return
    }
    const existing = getSqlite().prepare(`
      SELECT *
      FROM memory_entries
      WHERE user_id = ?
        AND scope = ?
        AND kind = ?
        AND COALESCE(workspace_id, '') = COALESCE(?, '')
        AND COALESCE(session_id, '') = COALESCE(?, '')
        AND normalized_key = ?
        AND status != 'rejected'
      LIMIT 1
    `).get(owner.ownerId, scope, input.kind, workspaceId, sessionId, normalizedKey) as Record<string, unknown> | undefined

    if (existing) {
      const mergedTags = normalizeStringList([
        ...parseJson<string[]>(typeof existing.tags_json === 'string' ? existing.tags_json : null, []),
        ...normalizeStringList(input.tags),
      ])
      const mergedMetadata = {
        ...parseJson<Record<string, unknown>>(typeof existing.metadata_json === 'string' ? existing.metadata_json : null, {}),
        ...(input.metadata || {}),
      }
      getSqlite().prepare(`
        UPDATE memory_entries
        SET
          content = ?,
          status = ?,
          salience = ?,
          confidence = ?,
          source = ?,
          tags_json = ?,
          metadata_json = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        String(input.content || '').trim(),
        input.status,
        Math.max(Number(existing.salience || 0.5), clamp01(Number(input.salience ?? existing.salience ?? 0.5))),
        Math.max(Number(existing.confidence || 0.5), clamp01(Number(input.confidence ?? existing.confidence ?? 0.5))),
        input.source || 'assistant_inferred',
        JSON.stringify(mergedTags),
        JSON.stringify(mergedMetadata),
        now,
        existing.id,
      )
      return
    }

    getSqlite().prepare(`
      INSERT INTO memory_entries (
        id, scope, kind, status,
        user_id, workspace_id, session_id,
        content, normalized_key,
        salience, confidence, source,
        tags_json, metadata_json,
        created_at, updated_at, last_used_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `).run(
      randomUUID(),
      scope,
      input.kind,
      input.status,
      owner.ownerId,
      workspaceId,
      sessionId,
      String(input.content || '').trim(),
      normalizedKey,
      clamp01(Number(input.salience ?? 0.5)),
      clamp01(Number(input.confidence ?? 0.5)),
      input.source || 'assistant_inferred',
      JSON.stringify(normalizeStringList(input.tags)),
      JSON.stringify(input.metadata || {}),
      now,
      now,
    )
  }

  function emptyFile(): MemoryFile {
    return { version: 1, owners: {} }
  }

  function readFile(): MemoryFile {
    const parsed = deps.readJsonIfExists(filePath()) as MemoryFile | null
    if (!parsed || parsed.version !== 1 || typeof parsed.owners !== 'object' || parsed.owners === null) {
      return emptyFile()
    }
    return parsed
  }

  function writeFile(next: MemoryFile): void {
    deps.writeJsonFile(filePath(), next)
  }

  function normalizeStringList(values: unknown): string[] {
    if (!Array.isArray(values)) return []
    return values
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .slice(0, 24)
  }

  function normalizeConventions(values: unknown): Array<{ key: string; value: string }> {
    if (!Array.isArray(values)) return []
    return values
      .map((entry) => {
        const record = (entry || {}) as Record<string, unknown>
        const key = String(record.key || '').trim()
        const value = String(record.value || '').trim()
        if (!key || !value) return null
        return { key, value }
      })
      .filter(Boolean) as Array<{ key: string; value: string }>
  }

  function defaultProfile(): RinaMemoryProfile {
    return {
      preferredName: '',
      tonePreference: 'balanced',
      humorPreference: 'medium',
      likes: [],
      dislikes: [],
    }
  }

  function normalizeOperationalMemories(values: unknown): OperationalMemoryEntry[] {
    if (!Array.isArray(values)) return []
    return values
      .map((entry) => {
        const record = (entry || {}) as Record<string, unknown>
        const id = String(record.id || '').trim()
        const content = String(record.content || '').trim()
        const scope = record.scope
        const kind = record.kind
        if (!id || !content) return null
        if (scope !== 'session' && scope !== 'user' && scope !== 'project' && scope !== 'episode') return null
        if (
          kind !== 'preference' &&
          kind !== 'constraint' &&
          kind !== 'project_fact' &&
          kind !== 'task_outcome' &&
          kind !== 'conversation_fact'
        ) return null
        const salience = Number(record.salience)
        const confidence = Number(record.confidence)
        const status = record.status
        const source = record.source
        return {
          id,
          scope,
          kind,
          content,
          status: status === 'approved' || status === 'suggested' || status === 'rejected' ? status : 'approved',
          salience: Number.isFinite(salience) ? Math.max(0, Math.min(1, salience)) : 0.5,
          workspaceId: String(record.workspaceId || '').trim() || undefined,
          confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.5,
          source:
            source === 'behavior' ||
            source === 'conversation' ||
            source === 'user_explicit' ||
            source === 'assistant_inferred' ||
            source === 'task_outcome' ||
            source === 'system_derived'
              ? source
              : 'conversation',
          tags: normalizeStringList(record.tags),
          createdAt: String(record.createdAt || new Date().toISOString()),
          updatedAt: String(record.updatedAt || new Date().toISOString()),
          lastUsedAt: String(record.lastUsedAt || '').trim() || undefined,
          metadata: typeof record.metadata === 'object' && record.metadata !== null ? { ...(record.metadata as Record<string, unknown>) } : undefined,
        } satisfies OperationalMemoryEntry
      })
      .filter(Boolean) as OperationalMemoryEntry[]
  }

  function normalizeConversationTurns(values: unknown): ConversationTurnEntry[] {
    if (!Array.isArray(values)) return []
    return values
      .map((entry) => {
        const record = (entry || {}) as Record<string, unknown>
        const id = String(record.id || '').trim()
        const sessionId = String(record.sessionId || '').trim()
        const userMessage = String(record.userMessage || '').trim()
        const assistantMessage = String(record.assistantMessage || '').trim()
        const createdAt = String(record.createdAt || '').trim() || new Date().toISOString()
        if (!id || !sessionId || (!userMessage && !assistantMessage)) return null
        return {
          id,
          sessionId,
          workspaceId: String(record.workspaceId || '').trim() || undefined,
          userMessage,
          assistantMessage,
          createdAt,
        } satisfies ConversationTurnEntry
      })
      .filter(Boolean) as ConversationTurnEntry[]
  }

  function resolveOwnerIdentity(): OwnerIdentity {
    const customerId = deps.getCurrentLicenseCustomerId()
    const email = deps.getCachedEmail()
    if (customerId) {
      return {
        ownerId: `license:${customerId}`,
        mode: 'licensed',
        customerId,
        email,
      }
    }
    return {
      ownerId: `local:${deps.getDeviceId()}`,
      mode: 'local-fallback',
      customerId: null,
      email,
    }
  }

  function ensureOwner(file: MemoryFile, ownerId: string): OwnerMemoryRecord {
    const existing = file.owners[ownerId]
    if (existing) return existing
    const created: OwnerMemoryRecord = {
      ownerId,
      profile: defaultProfile(),
      workspaces: {},
      inferredMemories: [],
      operationalMemories: [],
      conversationTurns: [],
      updatedAt: new Date().toISOString(),
    }
    file.owners[ownerId] = created
    return created
  }

  function normalizeInferredMemories(values: unknown): InferredMemoryEntry[] {
    if (!Array.isArray(values)) return []
    return values
      .map((entry) => {
        const record = (entry || {}) as Record<string, unknown>
        const id = String(record.id || '').trim()
        const summary = String(record.summary || '').trim()
        const kind = record.kind
        const source = record.source
        const status = record.status
        if (!id || !summary) return null
        if (kind !== 'preference' && kind !== 'habit' && kind !== 'project' && kind !== 'relationship') return null
        if (source !== 'behavior' && source !== 'conversation') return null
        if (status !== 'suggested' && status !== 'approved' && status !== 'dismissed') return null
        const confidenceValue = Number(record.confidence)
        return {
          id,
          kind,
          summary,
          confidence: Number.isFinite(confidenceValue) ? Math.max(0, Math.min(1, confidenceValue)) : 0.5,
          source,
          workspaceId: String(record.workspaceId || '').trim() || undefined,
          runId: String(record.runId || '').trim() || undefined,
          status,
          createdAt: String(record.createdAt || new Date().toISOString()),
          updatedAt: String(record.updatedAt || new Date().toISOString()),
        } satisfies InferredMemoryEntry
      })
      .filter(Boolean) as InferredMemoryEntry[]
  }

  function classifyRunIntent(command: string): 'build' | 'test' | 'deploy' | 'fix' | 'command' {
    const normalized = String(command || '').toLowerCase()
    if (normalized.includes('build')) return 'build'
    if (normalized.includes('test')) return 'test'
    if (normalized.includes('deploy')) return 'deploy'
    if (/\bfix|repair\b/.test(normalized)) return 'fix'
    return 'command'
  }

  function buildSuggestedInferences(record: OwnerMemoryRecord): InferredMemoryEntry[] {
    const existing = new Map(normalizeInferredMemories(record.inferredMemories).map((entry) => [entry.id, entry]))
    const recentRuns = Array.isArray(deps.listRecentRuns?.(40)) ? deps.listRecentRuns!(40) : []
    if (recentRuns.length === 0) return Array.from(existing.values())

    const grouped = new Map<string, { workspaceId: string; build: number; test: number; deploy: number; fix: number; latestRunId?: string }>()
    for (const run of recentRuns) {
      const workspaceId = String(run.projectRoot || '').trim()
      if (!workspaceId) continue
      const group = grouped.get(workspaceId) || {
        workspaceId,
        build: 0,
        test: 0,
        deploy: 0,
        fix: 0,
        latestRunId: undefined,
      }
      const kind = classifyRunIntent(String(run.latestCommand || ''))
      if (kind === 'build') group.build += 1
      if (kind === 'test') group.test += 1
      if (kind === 'deploy') group.deploy += 1
      if (kind === 'fix') group.fix += 1
      group.latestRunId = group.latestRunId || String(run.latestReceiptId || run.sessionId || '').trim() || undefined
      grouped.set(workspaceId, group)
    }

    const now = new Date().toISOString()
    for (const group of grouped.values()) {
      const workspaceLabel = pathApi.basename(group.workspaceId)
      const suggestions: Array<Omit<InferredMemoryEntry, 'status' | 'createdAt' | 'updatedAt'>> = []
      if (group.build >= 2) {
        suggestions.push({
          id: `habit:${group.workspaceId}:build-first`,
          kind: 'habit',
          summary: `${workspaceLabel} usually starts with a build check before broader verification.`,
          confidence: 0.72,
          source: 'behavior',
          workspaceId: group.workspaceId,
          runId: group.latestRunId,
        })
      }
      if (group.test >= 2) {
        suggestions.push({
          id: `habit:${group.workspaceId}:test-gate`,
          kind: 'habit',
          summary: `${workspaceLabel} tends to use tests as the main proof gate after changes.`,
          confidence: 0.78,
          source: 'behavior',
          workspaceId: group.workspaceId,
          runId: group.latestRunId,
        })
      }
      if (group.deploy >= 1) {
        suggestions.push({
          id: `project:${group.workspaceId}:deploy-aware`,
          kind: 'project',
          summary: `${workspaceLabel} includes a real deploy path, so release-target proof is worth surfacing early.`,
          confidence: 0.66,
          source: 'behavior',
          workspaceId: group.workspaceId,
          runId: group.latestRunId,
        })
      }
      if (group.fix >= 2) {
        suggestions.push({
          id: `habit:${group.workspaceId}:repair-loop`,
          kind: 'habit',
          summary: `${workspaceLabel} often moves through repair loops, so concise recovery guidance should stay prominent.`,
          confidence: 0.7,
          source: 'behavior',
          workspaceId: group.workspaceId,
          runId: group.latestRunId,
        })
      }

      for (const suggestion of suggestions) {
        if (existing.has(suggestion.id)) continue
        existing.set(suggestion.id, {
          ...suggestion,
          status: 'suggested',
          createdAt: now,
          updatedAt: now,
        })
      }
    }

    return Array.from(existing.values()).sort((a, b) => {
      if (a.status === b.status) return a.summary.localeCompare(b.summary)
      if (a.status === 'approved') return -1
      if (b.status === 'approved') return 1
      if (a.status === 'suggested') return -1
      if (b.status === 'suggested') return 1
      return 0
    })
  }

  function getState(): {
    owner: OwnerIdentity
    memory: OwnerMemoryRecord & {
      operationalStore: {
        backend: 'sqlite' | 'json-fallback'
        reason?: string
      }
    }
  } {
    const owner = resolveOwnerIdentity()
    const file = readFile()
    const memory = ensureOwner(file, owner.ownerId)
    if (!file.owners[owner.ownerId]) {
      writeFile(file)
    }
    const sqliteReady = hasSqlite()
    const operationalMemories = sqliteReady
      ? readOperationalMemories(owner.ownerId, 200)
      : normalizeOperationalMemories(memory.operationalMemories)
    return {
      owner,
      memory: {
        ...memory,
        profile: {
          ...defaultProfile(),
        ...memory.profile,
      },
      workspaces: memory.workspaces || {},
      inferredMemories: buildSuggestedInferences(memory),
      operationalMemories,
      conversationTurns: normalizeConversationTurns(memory.conversationTurns),
      operationalStore: {
        backend: sqliteReady ? 'sqlite' : 'json-fallback',
        reason: sqliteReady ? undefined : sqliteUnavailableReason || undefined,
      },
      },
    }
  }

  function updateProfile(input: Partial<RinaMemoryProfile>): { owner: OwnerIdentity; memory: OwnerMemoryRecord } {
    const owner = resolveOwnerIdentity()
    const file = readFile()
    const record = ensureOwner(file, owner.ownerId)
    record.profile = {
      preferredName: String(input.preferredName || '').trim(),
      tonePreference:
        input.tonePreference === 'concise' || input.tonePreference === 'balanced' || input.tonePreference === 'detailed'
          ? input.tonePreference
          : record.profile.tonePreference || 'balanced',
      humorPreference:
        input.humorPreference === 'low' || input.humorPreference === 'medium' || input.humorPreference === 'high'
          ? input.humorPreference
          : record.profile.humorPreference || 'medium',
      likes: normalizeStringList(input.likes),
      dislikes: normalizeStringList(input.dislikes),
    }
    record.updatedAt = new Date().toISOString()
    writeFile(file)
    return getState()
  }

  function updateWorkspace(
    workspaceId: string,
    input: {
      label?: string
      preferredResponseStyle?: string[]
      preferredProofStyle?: string[]
      conventions?: Array<{ key: string; value: string }>
    }
  ): { owner: OwnerIdentity; memory: OwnerMemoryRecord } {
    const normalizedWorkspaceId = String(workspaceId || '').trim()
    if (!normalizedWorkspaceId) {
      throw new Error('workspaceId is required')
    }
    const owner = resolveOwnerIdentity()
    const file = readFile()
    const record = ensureOwner(file, owner.ownerId)
    record.workspaces[normalizedWorkspaceId] = {
      workspaceId: normalizedWorkspaceId,
      label: String(input.label || '').trim() || pathApi.basename(normalizedWorkspaceId),
      preferredResponseStyle: normalizeStringList(input.preferredResponseStyle),
      preferredProofStyle: normalizeStringList(input.preferredProofStyle),
      conventions: normalizeConventions(input.conventions),
      updatedAt: new Date().toISOString(),
    }
    record.updatedAt = new Date().toISOString()
    writeFile(file)
    return getState()
  }

  function resetWorkspace(workspaceId: string): { owner: OwnerIdentity; memory: OwnerMemoryRecord } {
    const normalizedWorkspaceId = String(workspaceId || '').trim()
    if (!normalizedWorkspaceId) {
      throw new Error('workspaceId is required')
    }
    const owner = resolveOwnerIdentity()
    const file = readFile()
    const record = ensureOwner(file, owner.ownerId)
    delete record.workspaces[normalizedWorkspaceId]
    if (hasSqlite()) {
      getSqlite().prepare('DELETE FROM memory_entries WHERE user_id = ? AND workspace_id = ?').run(owner.ownerId, normalizedWorkspaceId)
      getSqlite().prepare('DELETE FROM conversation_turns WHERE user_id = ? AND workspace_id = ?').run(owner.ownerId, normalizedWorkspaceId)
    } else {
      record.operationalMemories = normalizeOperationalMemories(record.operationalMemories).filter(
        (entry) => entry.workspaceId !== normalizedWorkspaceId
      )
      record.conversationTurns = normalizeConversationTurns(record.conversationTurns).filter(
        (entry) => entry.workspaceId !== normalizedWorkspaceId
      )
    }
    record.updatedAt = new Date().toISOString()
    writeFile(file)
    return getState()
  }

  function resetAll(): { owner: OwnerIdentity; memory: OwnerMemoryRecord } {
    const owner = resolveOwnerIdentity()
    const file = readFile()
    file.owners[owner.ownerId] = {
      ownerId: owner.ownerId,
      profile: defaultProfile(),
      workspaces: {},
      inferredMemories: [],
      operationalMemories: [],
      conversationTurns: [],
      updatedAt: new Date().toISOString(),
    }
    if (hasSqlite()) {
      getSqlite().prepare('DELETE FROM memory_entries WHERE user_id = ?').run(owner.ownerId)
      getSqlite().prepare('DELETE FROM conversation_turns WHERE user_id = ?').run(owner.ownerId)
    }
    writeFile(file)
    return getState()
  }

  function deleteEntry(args: {
    scope: 'profile' | 'workspace'
    field: 'likes' | 'dislikes' | 'preferredResponseStyle' | 'preferredProofStyle' | 'conventions' | 'inferredMemories'
    workspaceId?: string
    value?: string
    key?: string
  }): { owner: OwnerIdentity; memory: OwnerMemoryRecord } {
    const owner = resolveOwnerIdentity()
    const file = readFile()
    const record = ensureOwner(file, owner.ownerId)
    if (args.scope === 'profile') {
      if (args.field === 'likes' || args.field === 'dislikes') {
        const next = normalizeStringList(record.profile[args.field]).filter((entry) => entry !== String(args.value || '').trim())
        record.profile[args.field] = next
      }
      if (args.field === 'inferredMemories') {
        record.inferredMemories = normalizeInferredMemories(record.inferredMemories).filter(
          (entry) => entry.id !== String(args.value || args.key || '').trim()
        )
      }
    } else {
      const workspaceId = String(args.workspaceId || '').trim()
      if (!workspaceId || !record.workspaces[workspaceId]) {
        throw new Error('workspaceId is required')
      }
      const workspace = record.workspaces[workspaceId]
      if (args.field === 'preferredResponseStyle' || args.field === 'preferredProofStyle') {
        workspace[args.field] = normalizeStringList(workspace[args.field]).filter((entry) => entry !== String(args.value || '').trim())
      }
      if (args.field === 'conventions') {
        workspace.conventions = normalizeConventions(workspace.conventions).filter((entry) => entry.key !== String(args.key || '').trim())
      }
      workspace.updatedAt = new Date().toISOString()
    }
    record.updatedAt = new Date().toISOString()
    writeFile(file)
    return getState()
  }

  function setInferredMemoryStatus(
    id: string,
    status: 'approved' | 'dismissed'
  ): { owner: OwnerIdentity; memory: OwnerMemoryRecord } {
    const normalizedId = String(id || '').trim()
    if (!normalizedId) throw new Error('id is required')
    const owner = resolveOwnerIdentity()
    const file = readFile()
    const record = ensureOwner(file, owner.ownerId)
    const current = buildSuggestedInferences(record)
    const target = current.find((entry) => entry.id === normalizedId)
    if (!target) throw new Error('inferred memory not found')
    const persisted = normalizeInferredMemories(record.inferredMemories).filter((entry) => entry.id !== normalizedId)
    const now = new Date().toISOString()
    persisted.push({
      ...target,
      status,
      updatedAt: now,
      createdAt: target.createdAt || now,
    })
    record.inferredMemories = persisted
    record.updatedAt = now
    writeFile(file)
    return getState()
  }

  function upsertOperationalMemory(input: {
    scope: OperationalMemoryScope
    kind: OperationalMemoryKind
    content: string
    workspaceId?: string
    source?: 'behavior' | 'conversation'
    salience?: number
    tags?: string[]
    metadata?: Record<string, unknown>
  }): { owner: OwnerIdentity; memory: OwnerMemoryRecord } {
    const content = String(input.content || '').trim()
    if (!content) throw new Error('content is required')
    const owner = resolveOwnerIdentity()
    const file = readFile()
    const record = ensureOwner(file, owner.ownerId)
    const now = new Date().toISOString()
    const workspaceId = String(input.workspaceId || '').trim() || null
    const normalizedKey = `${input.scope}:${input.kind}:${workspaceId || 'global'}:${content.toLowerCase()}`
    if (!hasSqlite()) {
      const existingEntries = normalizeOperationalMemories(record.operationalMemories)
      const existingIndex = existingEntries.findIndex(
        (entry) =>
          entry.scope === input.scope &&
          entry.kind === input.kind &&
          (entry.workspaceId || null) === (workspaceId || null) &&
          entry.content.trim().toLowerCase() === content.toLowerCase()
      )
      const nextEntry: OperationalMemoryEntry = {
        id: existingIndex >= 0 ? existingEntries[existingIndex]!.id : randomUUID(),
        scope: input.scope,
        kind: input.kind,
        content,
        status: 'approved',
        salience:
          existingIndex >= 0
            ? Math.max(existingEntries[existingIndex]!.salience, clamp01(Number(input.salience ?? existingEntries[existingIndex]!.salience ?? 0.6)))
            : clamp01(Number(input.salience ?? 0.6)),
        confidence: input.kind === 'conversation_fact' ? 0.6 : 0.95,
        workspaceId: workspaceId || undefined,
        source: input.source,
        tags: normalizeStringList(input.tags),
        metadata: input.metadata || {},
        createdAt: existingIndex >= 0 ? existingEntries[existingIndex]!.createdAt : now,
        updatedAt: now,
        lastUsedAt: now,
      }
      if (existingIndex >= 0) {
        existingEntries[existingIndex] = {
          ...existingEntries[existingIndex]!,
          ...nextEntry,
          tags: normalizeStringList([...(existingEntries[existingIndex]!.tags || []), ...(nextEntry.tags || [])]),
          metadata: {
            ...(existingEntries[existingIndex]!.metadata || {}),
            ...(nextEntry.metadata || {}),
          },
        }
      } else {
        existingEntries.push(nextEntry)
      }
      record.operationalMemories = existingEntries
        .sort((a, b) => {
          const aTime = a.lastUsedAt || a.updatedAt
          const bTime = b.lastUsedAt || b.updatedAt
          return bTime.localeCompare(aTime) || b.salience - a.salience
        })
        .slice(0, 400)
      record.updatedAt = now
      writeFile(file)
      return getState()
    }

    const existing = getSqlite().prepare(`
      SELECT *
      FROM memory_entries
      WHERE user_id = ?
        AND scope = ?
        AND kind = ?
        AND COALESCE(workspace_id, '') = COALESCE(?, '')
        AND normalized_key = ?
        AND status != 'rejected'
      LIMIT 1
    `).get(owner.ownerId, scopeToDb(input.scope), input.kind, workspaceId, normalizedKey) as Record<string, unknown> | undefined

    if (existing) {
      const mergedTags = normalizeStringList([
        ...parseJson<string[]>(typeof existing.tags_json === 'string' ? existing.tags_json : null, []),
        ...normalizeStringList(input.tags),
      ])
      const mergedMetadata = {
        ...parseJson<Record<string, unknown>>(typeof existing.metadata_json === 'string' ? existing.metadata_json : null, {}),
        ...(input.metadata || {}),
      }
      getSqlite().prepare(`
        UPDATE memory_entries
        SET
          content = ?,
          salience = ?,
          confidence = ?,
          source = ?,
          tags_json = ?,
          metadata_json = ?,
          updated_at = ?,
          last_used_at = ?
        WHERE id = ?
      `).run(
        content,
        Math.max(Number(existing.salience || 0.5), clamp01(Number(input.salience ?? existing.salience ?? 0.6))),
        Math.max(Number(existing.confidence || 0.9), input.kind === 'conversation_fact' ? 0.6 : 0.95),
        input.source === 'behavior' ? 'system_derived' : 'user_explicit',
        JSON.stringify(mergedTags),
        JSON.stringify(mergedMetadata),
        now,
        now,
        existing.id,
      )
    } else {
      getSqlite().prepare(`
        INSERT INTO memory_entries (
          id, scope, kind, status,
          user_id, workspace_id, session_id,
          content, normalized_key,
          salience, confidence, source,
          tags_json, metadata_json,
          created_at, updated_at, last_used_at
        ) VALUES (?, ?, ?, 'approved', ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        scopeToDb(input.scope),
        input.kind,
        owner.ownerId,
        workspaceId,
        content,
        normalizedKey,
        clamp01(Number(input.salience ?? 0.6)),
        input.kind === 'conversation_fact' ? 0.6 : 0.95,
        input.source === 'behavior' ? 'system_derived' : 'user_explicit',
        JSON.stringify(normalizeStringList(input.tags)),
        JSON.stringify(input.metadata || {}),
        now,
        now,
        now,
      )
    }
    getSqlite().prepare(`
      DELETE FROM memory_entries
      WHERE user_id = ?
        AND id NOT IN (
          SELECT id FROM memory_entries
          WHERE user_id = ?
          ORDER BY COALESCE(last_used_at, updated_at) DESC, salience DESC
          LIMIT 400
        )
    `).run(owner.ownerId, owner.ownerId)
    return getState()
  }

  function retrieveRelevantMemories(input: {
    query: string
    workspaceId?: string
    limit?: number
  }): OperationalMemoryEntry[] {
    const query = String(input.query || '').toLowerCase().trim()
    const workspaceId = String(input.workspaceId || '').trim() || undefined
    const owner = resolveOwnerIdentity()
    const tokens = query.split(/[^a-z0-9]+/i).filter(Boolean)
    if (!hasSqlite()) {
      const record = ensureOwner(readFile(), owner.ownerId)
      return normalizeOperationalMemories(record.operationalMemories)
        .filter((entry) => entry.status !== 'rejected')
        .map((entry) => {
          let score = entry.salience
          if (workspaceId && entry.workspaceId === workspaceId) score += 0.35
          if (workspaceId && !entry.workspaceId) score += 0.1
          if (query && entry.content.toLowerCase().includes(query)) score += 0.5
          if (tokens.some((token) => entry.content.toLowerCase().includes(token))) score += 0.25
          if (tokens.some((token) => (entry.tags || []).some((tag) => tag.toLowerCase().includes(token)))) score += 0.2
          if (entry.kind === 'constraint' || entry.kind === 'preference') score += 0.15
          return { entry, score }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(1, input.limit || 10))
        .map(({ entry }) => entry)
    }
    const searchRows = query
      ? getSqlite().prepare(`
          SELECT me.*
          FROM memory_entries me
          LEFT JOIN memory_entries_fts fts ON me.id = fts.id
          WHERE me.user_id = ?
            AND me.status IN ('approved', 'suggested')
            AND (
              me.content LIKE ?
              OR fts.content MATCH ?
              OR fts.tags MATCH ?
            )
          ORDER BY me.salience DESC, me.updated_at DESC
          LIMIT ?
        `).all(owner.ownerId, `%${query}%`, query, query, Math.max((input.limit || 10) * 4, 20)) as Record<string, unknown>[]
      : getSqlite().prepare(`
          SELECT *
          FROM memory_entries
          WHERE user_id = ?
            AND status IN ('approved', 'suggested')
          ORDER BY salience DESC, updated_at DESC
          LIMIT ?
        `).all(owner.ownerId, Math.max((input.limit || 10) * 4, 20)) as Record<string, unknown>[]

    return searchRows
      .map((row) => {
        const entry = rowToOperationalMemoryEntry(row)
        let score = entry.salience
        if (workspaceId && entry.workspaceId === workspaceId) score += 0.35
        if (workspaceId && !entry.workspaceId) score += 0.1
        if (query && entry.content.toLowerCase().includes(query)) score += 0.5
        if (tokens.some((token) => entry.content.toLowerCase().includes(token))) score += 0.25
        if (tokens.some((token) => (entry.tags || []).some((tag) => tag.toLowerCase().includes(token)))) score += 0.2
        if (entry.kind === 'constraint' || entry.kind === 'preference') score += 0.15
        return { entry, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, input.limit || 10))
      .map(({ entry }) => {
        getSqlite().prepare('UPDATE memory_entries SET last_used_at = ?, updated_at = ? WHERE id = ?').run(new Date().toISOString(), new Date().toISOString(), entry.id)
        return entry
      })
  }

  function setOperationalMemoryStatus(
    id: string,
    status: 'approved' | 'rejected',
  ): { owner: OwnerIdentity; memory: OwnerMemoryRecord } {
    const normalizedId = String(id || '').trim()
    if (!normalizedId) throw new Error('id is required')
    const owner = resolveOwnerIdentity()
    if (hasSqlite()) {
      getSqlite().prepare(`
        UPDATE memory_entries
        SET status = ?, updated_at = ?
        WHERE id = ?
          AND user_id = ?
      `).run(status, new Date().toISOString(), normalizedId, owner.ownerId)
    } else {
      const file = readFile()
      const record = ensureOwner(file, owner.ownerId)
      record.operationalMemories = normalizeOperationalMemories(record.operationalMemories).map((entry) =>
        entry.id === normalizedId ? { ...entry, status, updatedAt: new Date().toISOString() } : entry
      )
      record.updatedAt = new Date().toISOString()
      writeFile(file)
    }
    return getState()
  }

  function deleteOperationalMemory(id: string): { owner: OwnerIdentity; memory: OwnerMemoryRecord } {
    const normalizedId = String(id || '').trim()
    if (!normalizedId) throw new Error('id is required')
    const owner = resolveOwnerIdentity()
    if (hasSqlite()) {
      getSqlite().prepare('DELETE FROM memory_entries WHERE id = ? AND user_id = ?').run(normalizedId, owner.ownerId)
    } else {
      const file = readFile()
      const record = ensureOwner(file, owner.ownerId)
      record.operationalMemories = normalizeOperationalMemories(record.operationalMemories).filter((entry) => entry.id !== normalizedId)
      record.updatedAt = new Date().toISOString()
      writeFile(file)
    }
    return getState()
  }

  function recordConversationTurn(input: {
    sessionId?: string
    workspaceId?: string
    userMessage: string
    assistantReply: string
  }): { owner: OwnerIdentity; memory: OwnerMemoryRecord } {
    const userMessage = String(input.userMessage || '').trim()
    const assistantReply = String(input.assistantReply || '').trim()
    if (!userMessage && !assistantReply) return getState()
    const owner = resolveOwnerIdentity()
    const createdAt = new Date().toISOString()
    const sessionId = String(input.sessionId || input.workspaceId || 'local-session')
    if (hasSqlite()) {
      getSqlite().prepare(`
        INSERT INTO conversation_turns (
          id, session_id, user_id, workspace_id, user_message, assistant_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        sessionId,
        owner.ownerId,
        String(input.workspaceId || '').trim() || null,
        userMessage,
        assistantReply,
        createdAt,
      )
    } else {
      const file = readFile()
      const record = ensureOwner(file, owner.ownerId)
      const turns = normalizeConversationTurns(record.conversationTurns)
      turns.push({
        id: randomUUID(),
        sessionId,
        workspaceId: String(input.workspaceId || '').trim() || undefined,
        userMessage,
        assistantMessage: assistantReply,
        createdAt,
      })
      record.conversationTurns = turns.slice(-40)
      record.updatedAt = createdAt
      writeFile(file)
    }
    upsertOperationalMemory({
      scope: 'session',
      kind: 'conversation_fact',
      content: `User: ${userMessage}\nAssistant: ${assistantReply}`,
      workspaceId: input.workspaceId,
      source: 'conversation',
      salience: 0.35,
      tags: ['conversation'],
    })
    return getState()
  }

  function recordTaskOutcome(input: {
    workspaceId?: string
    taskTitle: string
    summary: string
    success: boolean
  }): { owner: OwnerIdentity; memory: OwnerMemoryRecord } {
    const taskTitle = String(input.taskTitle || '').trim()
    const summary = String(input.summary || '').trim()
    if (!taskTitle && !summary) return getState()
    const owner = resolveOwnerIdentity()
    if (hasSqlite()) {
      getSqlite().prepare(`
        INSERT INTO memory_entries (
          id, scope, kind, status,
          user_id, workspace_id, session_id,
          content, normalized_key,
          salience, confidence, source,
          tags_json, metadata_json,
          created_at, updated_at, last_used_at
        ) VALUES (?, 'episode', 'task_outcome', 'approved', ?, ?, NULL, ?, NULL, ?, 1, 'task_outcome', ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        owner.ownerId,
        String(input.workspaceId || '').trim() || null,
        `${taskTitle}: ${summary}`.trim(),
        input.success ? 0.72 : 0.82,
        JSON.stringify(['task-outcome', input.success ? 'success' : 'failure']),
        JSON.stringify({ success: input.success, taskTitle, summary }),
        new Date().toISOString(),
        new Date().toISOString(),
        new Date().toISOString(),
      )
    } else {
      upsertOperationalMemory({
        scope: 'episode',
        kind: 'task_outcome',
        content: `${taskTitle}: ${summary}`.trim(),
        workspaceId: input.workspaceId,
        source: 'behavior',
        salience: input.success ? 0.72 : 0.82,
        tags: ['task-outcome', input.success ? 'success' : 'failure'],
        metadata: { success: input.success, taskTitle, summary },
      })
    }
    return getState()
  }

  function retrieveRelevantMemory(input: {
    userId?: string
    workspaceId?: string
    sessionId?: string
    query: string
    limit?: number
  }): OperationalMemoryEntry[] {
    const owner = resolveOwnerIdentity()
    if (!hasSqlite()) {
      return retrieveRelevantMemories({
        query: input.query,
        workspaceId: input.workspaceId,
        limit: input.limit,
      })
    }
    return queryOperationalMemories({
      ownerId: input.userId || owner.ownerId,
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      query: input.query,
      limit: input.limit,
    })
  }

  async function processTurnMemory(input: {
    userId?: string
    workspaceId?: string | null
    sessionId?: string | null
    userMessage: string
    assistantMessage?: string
    taskResult?: {
      success: boolean
      summary: string
      filesChanged?: string[]
      commandsRun?: string[]
    }
  }): Promise<OperationalMemoryEntry[]> {
    const owner = resolveOwnerIdentity()
    const suggestions = await extractor.extract({
      userId: input.userId || owner.ownerId,
      workspaceId: input.workspaceId ?? null,
      sessionId: input.sessionId ?? null,
      userMessage: input.userMessage,
      assistantMessage: input.assistantMessage,
      taskResult: input.taskResult,
    })
    for (const suggestion of suggestions) {
      saveExtractedMemory({
        scope: suggestion.scope === 'workspace' ? 'project' : suggestion.scope,
        kind: suggestion.kind,
        status: suggestion.status,
        content: suggestion.content,
        workspaceId: input.workspaceId ?? null,
        sessionId: input.sessionId ?? null,
        normalizedKey: suggestion.normalizedKey ?? null,
        salience: suggestion.salience,
        confidence: suggestion.confidence,
        source: suggestion.source,
        tags: suggestion.tags,
        metadata: suggestion.metadata,
      })
    }
    return retrieveRelevantMemory({
      userId: input.userId || owner.ownerId,
      workspaceId: input.workspaceId ?? undefined,
      sessionId: input.sessionId ?? undefined,
      query: input.userMessage,
      limit: 12,
    })
  }

  function getRecentMessages(sessionId: string): Array<{
    role: 'user' | 'assistant'
    text: string
    createdAt: string
  }> {
    const owner = resolveOwnerIdentity()
    if (!hasSqlite()) {
      const record = ensureOwner(readFile(), owner.ownerId)
      return normalizeConversationTurns(record.conversationTurns)
        .filter((entry) => entry.sessionId === String(sessionId || ''))
        .slice(-20)
        .flatMap((entry) => [
          {
            role: 'user' as const,
            text: entry.userMessage,
            createdAt: entry.createdAt,
          },
          {
            role: 'assistant' as const,
            text: entry.assistantMessage,
            createdAt: entry.createdAt,
          },
        ])
    }
    const rows = getSqlite().prepare(`
      SELECT *
      FROM conversation_turns
      WHERE session_id = ?
        AND user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(String(sessionId || ''), owner.ownerId) as Record<string, unknown>[]

    return rows.reverse().flatMap((row) => [
      {
        role: 'user' as const,
        text: String(row.user_message || ''),
        createdAt: String(row.created_at || ''),
      },
      {
        role: 'assistant' as const,
        text: String(row.assistant_message || ''),
        createdAt: String(row.created_at || ''),
      },
    ])
  }

  return {
    resolveOwnerIdentity,
    getState,
    updateProfile,
    updateWorkspace,
    resetWorkspace,
    resetAll,
    deleteEntry,
    setInferredMemoryStatus,
    setOperationalMemoryStatus,
    deleteOperationalMemory,
    upsertOperationalMemory,
    retrieveRelevantMemories,
    retrieveRelevantMemory,
    recordConversationTurn,
    recordTaskOutcome,
    processTurnMemory,
    getRecentMessages,
  }
}
