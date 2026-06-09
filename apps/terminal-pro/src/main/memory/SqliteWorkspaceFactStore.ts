import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { WorkspaceFact } from './memoryTypes.js'
import type { WorkspaceFactFilter } from './workspaceFactStore.js'
import type { WorkspaceFactStore } from './workspaceFactStore.js'

export const WORKSPACE_FACT_SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspace_facts (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('architecture', 'dependency', 'convention', 'preference', 'recurring_failure', 'runtime_fact')),
  source TEXT NOT NULL CHECK(source IN ('user', 'runtime', 'proof', 'config', 'inferred')),
  confidence TEXT NOT NULL CHECK(confidence IN ('high', 'medium', 'low')),
  last_verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_facts_key
  ON workspace_facts(key);

CREATE INDEX IF NOT EXISTS idx_workspace_facts_category
  ON workspace_facts(category);

CREATE INDEX IF NOT EXISTS idx_workspace_facts_source
  ON workspace_facts(source);

CREATE INDEX IF NOT EXISTS idx_workspace_facts_confidence
  ON workspace_facts(confidence);

CREATE INDEX IF NOT EXISTS idx_workspace_facts_key_prefix
  ON workspace_facts(key);
`

function nowIso(): string {
  return new Date().toISOString()
}

function rowToWorkspaceFact(row: Record<string, unknown>): WorkspaceFact {
  return {
    id: String(row.id || ''),
    key: String(row.key || ''),
    value: String(row.value || ''),
    category: row.category as WorkspaceFact['category'],
    source: row.source as WorkspaceFact['source'],
    confidence: row.confidence as WorkspaceFact['confidence'],
    last_verified_at: row.last_verified_at ? String(row.last_verified_at) : null,
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || ''),
  }
}

export class SqliteWorkspaceFactStore implements WorkspaceFactStore {
  private readonly db: Database

  constructor(private readonly dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true })
    this.db = new Database(dbPath)
  }

  async init(): Promise<void> {
    this.db.exec(WORKSPACE_FACT_SCHEMA_SQL)
  }

  async upsertFact(fact: WorkspaceFact): Promise<WorkspaceFact> {
    this.db.prepare(`
      INSERT INTO workspace_facts (
        id, key, value, category, source, confidence,
        last_verified_at, created_at, updated_at
      ) VALUES (
        @id, @key, @value, @category, @source, @confidence,
        @last_verified_at, @created_at, @updated_at
      )
      ON CONFLICT(id) DO UPDATE SET
        key = excluded.key,
        value = excluded.value,
        category = excluded.category,
        source = excluded.source,
        confidence = excluded.confidence,
        last_verified_at = excluded.last_verified_at,
        updated_at = excluded.updated_at
    `).run({
      id: fact.id,
      key: fact.key,
      value: fact.value,
      category: fact.category,
      source: fact.source,
      confidence: fact.confidence,
      last_verified_at: fact.last_verified_at,
      created_at: fact.created_at,
      updated_at: fact.updated_at ?? nowIso(),
    })

    const row = this.db.prepare('SELECT * FROM workspace_facts WHERE id = ? LIMIT 1').get(fact.id) as Record<string, unknown> | undefined
    if (!row) throw new Error(`Failed to read upserted fact ${fact.id}`)
    return rowToWorkspaceFact(row)
  }

  async getFact(id: string): Promise<WorkspaceFact | null> {
    const row = this.db.prepare('SELECT * FROM workspace_facts WHERE id = ? LIMIT 1').get(id) as Record<string, unknown> | undefined
    return row ? rowToWorkspaceFact(row) : null
  }

  async listFacts(filter?: WorkspaceFactFilter): Promise<WorkspaceFact[]> {
    const where: string[] = []
    const params: unknown[] = []

    if (filter?.category) {
      where.push('category = ?')
      params.push(filter.category)
    }
    if (filter?.source) {
      where.push('source = ?')
      params.push(filter.source)
    }
    if (filter?.confidence) {
      where.push('confidence = ?')
      params.push(filter.confidence)
    }
    if (filter?.keyPrefix) {
      where.push('key LIKE ?')
      params.push(`${filter.keyPrefix}%`)
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

    const rows = this.db.prepare(`
      SELECT * FROM workspace_facts
      ${whereClause}
      ORDER BY updated_at DESC
    `).all(...params) as Record<string, unknown>[]

    return rows.map(rowToWorkspaceFact)
  }

  async deleteFact(id: string): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM workspace_facts WHERE id = ?').run(id)
    return result.changes > 0
  }

  async findFactByKey(key: string): Promise<WorkspaceFact | null> {
    const row = this.db.prepare('SELECT * FROM workspace_facts WHERE key LIKE ? LIMIT 1').get(`${key}%`) as Record<string, unknown> | undefined
    return row ? rowToWorkspaceFact(row) : null
  }
}