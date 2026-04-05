import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { MEMORY_SCHEMA_SQL } from './memorySchema.js'
import type {
  ConversationTurnInput,
  MemoryEntry,
  MemoryQuery,
  MemorySaveInput,
  TaskOutcomeInput,
} from './memoryTypes.js'
import type { MemoryStore } from './MemoryStoreContract.js'

function nowIso(): string {
  return new Date().toISOString()
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function rowToMemoryEntry(row: Record<string, unknown>): MemoryEntry {
  return {
    id: String(row.id || ''),
    scope: row.scope as MemoryEntry['scope'],
    kind: row.kind as MemoryEntry['kind'],
    status: row.status as MemoryEntry['status'],
    userId: String(row.user_id || ''),
    workspaceId: row.workspace_id ? String(row.workspace_id) : null,
    sessionId: row.session_id ? String(row.session_id) : null,
    content: String(row.content || ''),
    normalizedKey: row.normalized_key ? String(row.normalized_key) : null,
    salience: Number(row.salience || 0.5),
    confidence: Number(row.confidence || 0.5),
    source: row.source as MemoryEntry['source'],
    tags: parseJson<string[]>(typeof row.tags_json === 'string' ? row.tags_json : null, []),
    metadata: parseJson<Record<string, unknown>>(typeof row.metadata_json === 'string' ? row.metadata_json : null, {}),
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
    lastUsedAt: row.last_used_at ? String(row.last_used_at) : null,
  }
}

export class SqliteMemoryStore implements MemoryStore {
  private readonly db: Database

  constructor(private readonly dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true })
    this.db = new Database(dbPath)
  }

  async init(): Promise<void> {
    this.db.exec(MEMORY_SCHEMA_SQL)
  }

  async saveMemory(input: MemorySaveInput): Promise<MemoryEntry> {
    const id = randomUUID()
    const timestamp = nowIso()
    this.db.prepare(`
      INSERT INTO memory_entries (
        id, scope, kind, status,
        user_id, workspace_id, session_id,
        content, normalized_key,
        salience, confidence, source,
        tags_json, metadata_json,
        created_at, updated_at, last_used_at
      ) VALUES (
        @id, @scope, @kind, @status,
        @user_id, @workspace_id, @session_id,
        @content, @normalized_key,
        @salience, @confidence, @source,
        @tags_json, @metadata_json,
        @created_at, @updated_at, NULL
      )
    `).run({
      id,
      scope: input.scope,
      kind: input.kind,
      status: input.status,
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      session_id: input.sessionId ?? null,
      content: input.content,
      normalized_key: input.normalizedKey ?? null,
      salience: clamp01(input.salience ?? 0.5),
      confidence: clamp01(input.confidence ?? 0.5),
      source: input.source,
      tags_json: JSON.stringify(input.tags ?? []),
      metadata_json: JSON.stringify(input.metadata ?? {}),
      created_at: timestamp,
      updated_at: timestamp,
    })
    const created = await this.getMemoryById(id)
    if (!created) throw new Error(`Failed to read saved memory ${id}`)
    return created
  }

  async upsertMemory(input: MemorySaveInput): Promise<MemoryEntry> {
    if (!input.normalizedKey) return this.saveMemory(input)
    const existing = this.db.prepare(`
      SELECT * FROM memory_entries
      WHERE user_id = ?
        AND COALESCE(workspace_id, '') = COALESCE(?, '')
        AND scope = ?
        AND kind = ?
        AND normalized_key = ?
        AND status != 'rejected'
      LIMIT 1
    `).get(input.userId, input.workspaceId ?? null, input.scope, input.kind, input.normalizedKey) as Record<string, unknown> | undefined
    if (!existing) return this.saveMemory(input)

    const existingTags = parseJson<string[]>(typeof existing.tags_json === 'string' ? existing.tags_json : null, [])
    const mergedTags = [...new Set([...existingTags, ...(input.tags ?? [])])]
    const existingMetadata = parseJson<Record<string, unknown>>(typeof existing.metadata_json === 'string' ? existing.metadata_json : null, {})
    const mergedMetadata = { ...existingMetadata, ...(input.metadata ?? {}) }

    this.db.prepare(`
      UPDATE memory_entries
      SET
        content = @content,
        status = @status,
        salience = @salience,
        confidence = @confidence,
        source = @source,
        tags_json = @tags_json,
        metadata_json = @metadata_json,
        updated_at = @updated_at
      WHERE id = @id
    `).run({
      id: existing.id,
      content: input.content,
      status: input.status,
      salience: Math.max(Number(existing.salience || 0.5), clamp01(input.salience ?? 0.5)),
      confidence: Math.max(Number(existing.confidence || 0.5), clamp01(input.confidence ?? 0.5)),
      source: input.source,
      tags_json: JSON.stringify(mergedTags),
      metadata_json: JSON.stringify(mergedMetadata),
      updated_at: nowIso(),
    })

    const updated = await this.getMemoryById(String(existing.id || ''))
    if (!updated) throw new Error(`Failed to read upserted memory ${String(existing.id || '')}`)
    return updated
  }

  async getMemoryById(id: string): Promise<MemoryEntry | null> {
    const row = this.db.prepare('SELECT * FROM memory_entries WHERE id = ? LIMIT 1').get(id) as Record<string, unknown> | undefined
    return row ? rowToMemoryEntry(row) : null
  }

  async queryMemory(query: MemoryQuery): Promise<MemoryEntry[]> {
    const where: string[] = ['user_id = ?']
    const params: unknown[] = [query.userId]
    if (query.workspaceId !== undefined) {
      where.push('(workspace_id = ? OR workspace_id IS NULL)')
      params.push(query.workspaceId)
    }
    if (query.sessionId !== undefined) {
      where.push('(session_id = ? OR session_id IS NULL)')
      params.push(query.sessionId)
    }
    if (query.scopes?.length) {
      where.push(`scope IN (${query.scopes.map(() => '?').join(', ')})`)
      params.push(...query.scopes)
    }
    if (query.kinds?.length) {
      where.push(`kind IN (${query.kinds.map(() => '?').join(', ')})`)
      params.push(...query.kinds)
    }
    if (query.statuses?.length) {
      where.push(`status IN (${query.statuses.map(() => '?').join(', ')})`)
      params.push(...query.statuses)
    }

    const limit = query.limit ?? 10
    let rows: Record<string, unknown>[]
    if (query.text?.trim()) {
      const terms = query.text.trim().split(/\s+/).filter(Boolean)
      const searchClauses = terms.map(() => '(LOWER(content) LIKE LOWER(?) OR LOWER(tags_json) LIKE LOWER(?))')
      rows = this.db.prepare(`
        SELECT *
        FROM memory_entries
        WHERE ${where.join(' AND ')}
          AND (${searchClauses.join(' OR ')})
        ORDER BY
          (CASE WHEN workspace_id = ? THEN 1 ELSE 0 END) DESC,
          salience DESC,
          updated_at DESC
        LIMIT ?
      `).all(
        ...params,
        ...terms.flatMap((term) => [`%${term}%`, `%${term}%`]),
        query.workspaceId ?? null,
        limit,
      ) as Record<string, unknown>[]
    } else {
      rows = this.db.prepare(`
        SELECT *
        FROM memory_entries
        WHERE ${where.join(' AND ')}
        ORDER BY
          (CASE WHEN workspace_id = ? THEN 1 ELSE 0 END) DESC,
          salience DESC,
          updated_at DESC
        LIMIT ?
      `).all(...params, query.workspaceId ?? null, limit) as Record<string, unknown>[]
    }
    return rows.map(rowToMemoryEntry)
  }

  async markMemoryUsed(id: string): Promise<void> {
    const timestamp = nowIso()
    this.db.prepare('UPDATE memory_entries SET last_used_at = ?, updated_at = ? WHERE id = ?').run(timestamp, timestamp, id)
  }

  async approveMemory(memoryId: string, reviewerUserId: string): Promise<void> {
    const timestamp = nowIso()
    const tx = this.db.transaction(() => {
      this.db.prepare(`UPDATE memory_entries SET status = 'approved', updated_at = ? WHERE id = ?`).run(timestamp, memoryId)
      this.db.prepare(`
        INSERT INTO memory_reviews (id, memory_id, reviewer_user_id, decision, created_at)
        VALUES (?, ?, ?, 'approved', ?)
      `).run(randomUUID(), memoryId, reviewerUserId, timestamp)
    })
    tx()
  }

  async rejectMemory(memoryId: string, reviewerUserId: string): Promise<void> {
    const timestamp = nowIso()
    const tx = this.db.transaction(() => {
      this.db.prepare(`UPDATE memory_entries SET status = 'rejected', updated_at = ? WHERE id = ?`).run(timestamp, memoryId)
      this.db.prepare(`
        INSERT INTO memory_reviews (id, memory_id, reviewer_user_id, decision, created_at)
        VALUES (?, ?, ?, 'rejected', ?)
      `).run(randomUUID(), memoryId, reviewerUserId, timestamp)
    })
    tx()
  }

  async saveConversationTurn(input: ConversationTurnInput): Promise<void> {
    this.db.prepare(`
      INSERT INTO conversation_turns (
        id, session_id, user_id, workspace_id,
        user_message, assistant_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      input.sessionId,
      input.userId,
      input.workspaceId ?? null,
      input.userMessage,
      input.assistantMessage,
      nowIso(),
    )
  }

  async getRecentConversationTurns(sessionId: string, limit: number): Promise<Array<{
    id: string
    sessionId: string
    userId: string
    workspaceId?: string | null
    userMessage: string
    assistantMessage: string
    createdAt: string
  }>> {
    const rows = this.db.prepare(`
      SELECT *
      FROM conversation_turns
      WHERE session_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(sessionId, limit) as Record<string, unknown>[]
    return rows.reverse().map((row) => ({
      id: String(row.id || ''),
      sessionId: String(row.session_id || ''),
      userId: String(row.user_id || ''),
      workspaceId: row.workspace_id ? String(row.workspace_id) : null,
      userMessage: String(row.user_message || ''),
      assistantMessage: String(row.assistant_message || ''),
      createdAt: String(row.created_at || ''),
    }))
  }

  async recordTaskOutcome(input: TaskOutcomeInput): Promise<MemoryEntry> {
    return this.saveMemory({
      scope: 'episode',
      kind: 'task_outcome',
      status: 'approved',
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      sessionId: input.sessionId ?? null,
      content: `${input.taskTitle}: ${input.success ? 'success' : 'failure'} - ${input.summary}`,
      normalizedKey: null,
      salience: input.success ? 0.65 : 0.8,
      confidence: 1,
      source: 'task_outcome',
      tags: ['task_outcome', ...(input.tags ?? [])],
      metadata: {
        taskTitle: input.taskTitle,
        success: input.success,
        summary: input.summary,
        filesChanged: input.filesChanged ?? [],
        commandsRun: input.commandsRun ?? [],
      },
    })
  }
}
