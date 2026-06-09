import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { SqliteWorkspaceFactStore } from '../../src/main/memory/SqliteWorkspaceFactStore.js'
import {
  createWorkspaceFact,
  type WorkspaceFact,
  type WorkspaceFactCategory,
  type WorkspaceFactSource,
} from '../../src/main/memory/memoryTypes.js'

function makeFact(overrides: Partial<WorkspaceFact> = {}): WorkspaceFact {
  return createWorkspaceFact({
    id: 'fact_test_123',
    key: 'architecture.runtime',
    value: 'AgentRuntime',
    category: 'architecture',
    source: 'config',
    confidence: 'high',
    ...overrides,
  })
}

describe('SqliteWorkspaceFactStore persistence guards', () => {
  let store: SqliteWorkspaceFactStore
  let tempDir: string

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'workspace-facts-test-'))
    store = new SqliteWorkspaceFactStore(join(tempDir, 'test.db'))
    await store.init()
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe('upsertFact', () => {
    it('inserts a new fact and preserves id', async () => {
      const fact = makeFact({ id: 'fact_sqlite_new' })
      const result = await store.upsertFact(fact)

      expect(result.id).toBe('fact_sqlite_new')
      expect(result.key).toBe('architecture.runtime')
    })

    it('updates an existing fact by id', async () => {
      const fact = makeFact({ id: 'fact_sqlite_update', value: 'Original' })
      await store.upsertFact(fact)

      const updated = makeFact({ id: 'fact_sqlite_update', value: 'Updated' })
      const result = await store.upsertFact(updated)

      expect(result.value).toBe('Updated')

      const retrieved = await store.getFact('fact_sqlite_update')
      expect(retrieved?.value).toBe('Updated')
    })
  })

  describe('getFact', () => {
    it('returns null for non-existent fact', async () => {
      const result = await store.getFact('non_existent')
      expect(result).toBeNull()
    })

    it('returns the fact when it exists', async () => {
      const fact = makeFact({ id: 'fact_sqlite_get' })
      await store.upsertFact(fact)

      const result = await store.getFact('fact_sqlite_get')
      expect(result?.id).toBe('fact_sqlite_get')
      expect(result?.key).toBe('architecture.runtime')
    })
  })

  describe('listFacts', () => {
    beforeEach(async () => {
      await store.upsertFact(makeFact({ id: 'fact_sqlite_1', category: 'architecture' }))
      await store.upsertFact(makeFact({ id: 'fact_sqlite_2', category: 'dependency', source: 'runtime' }))
      await store.upsertFact(makeFact({ id: 'fact_sqlite_3', category: 'architecture', confidence: 'low' }))
    })

    it('lists all facts when no filter provided', async () => {
      const facts = await store.listFacts()
      expect(facts.length).toBe(3)
    })

    it('filters by category', async () => {
      const facts = await store.listFacts({ category: 'architecture' })
      expect(facts.length).toBe(2)
      expect(facts.every((f) => f.category === 'architecture')).toBe(true)
    })

    it('filters by source', async () => {
      const facts = await store.listFacts({ source: 'runtime' })
      expect(facts.length).toBe(1)
      expect(facts[0].source).toBe('runtime')
    })

    it('filters by confidence', async () => {
      const facts = await store.listFacts({ confidence: 'low' })
      expect(facts.length).toBe(1)
      expect(facts[0].confidence).toBe('low')
    })

    it('filters by keyPrefix', async () => {
      await store.upsertFact(makeFact({ id: 'fact_sqlite_4', key: 'database.primary' }))
      const facts = await store.listFacts({ keyPrefix: 'database' })
      expect(facts.length).toBe(1)
      expect(facts[0].key).toBe('database.primary')
    })

    it('combines multiple filters', async () => {
      const facts = await store.listFacts({
        category: 'architecture',
        confidence: 'high',
      })
      expect(facts.length).toBe(1)
      expect(facts[0].id).toBe('fact_sqlite_1')
    })
  })

  describe('deleteFact', () => {
    it('returns false for non-existent fact', async () => {
      const result = await store.deleteFact('non_existent')
      expect(result).toBe(false)
    })

    it('deletes an existing fact and returns true', async () => {
      const fact = makeFact({ id: 'fact_sqlite_delete' })
      await store.upsertFact(fact)

      const result = await store.deleteFact('fact_sqlite_delete')
      expect(result).toBe(true)

      const retrieved = await store.getFact('fact_sqlite_delete')
      expect(retrieved).toBeNull()
    })
  })

  describe('findFactByKey', () => {
    it('returns null when no fact matches', async () => {
      const result = await store.findFactByKey('non.existent.key')
      expect(result).toBeNull()
    })

    it('finds a fact by exact key match', async () => {
      const fact = makeFact({ id: 'fact_sqlite_key', key: 'runtime.primary' })
      await store.upsertFact(fact)

      const result = await store.findFactByKey('runtime.primary')
      expect(result?.id).toBe('fact_sqlite_key')
    })

    it('finds a fact by partial key prefix', async () => {
      const fact = makeFact({ id: 'fact_sqlite_prefix', key: 'architecture.ui' })
      await store.upsertFact(fact)

      const result = await store.findFactByKey('architecture.u')
      expect(result?.id).toBe('fact_sqlite_prefix')
    })

    it('finds a fact by key after update by id', async () => {
      const fact = makeFact({ id: 'fact_sqlite_versioned', key: 'versioned.key', value: 'v1' })
      await store.upsertFact(fact)

      const updated = makeFact({ id: 'fact_sqlite_versioned', key: 'versioned.key', value: 'v2' })
      await store.upsertFact(updated)

      const result = await store.findFactByKey('versioned.key')
      expect(result?.value).toBe('v2')
    })
  })

  describe('persistence guards', () => {
    it('upsertFact preserves the original id', async () => {
      const fact = makeFact({ id: 'fact_sqlite_preserve_id' })
      const result = await store.upsertFact(fact)

      expect(result.id).toBe('fact_sqlite_preserve_id')
    })

    it('confidence persists through upsert and get', async () => {
      const fact = makeFact({ id: 'fact_sqlite_confidence', confidence: 'low' })
      await store.upsertFact(fact)

      const retrieved = await store.getFact('fact_sqlite_confidence')
      expect(retrieved?.confidence).toBe('low')
    })

    it('category persists through upsert and get', async () => {
      const fact = makeFact({ id: 'fact_sqlite_category', category: 'dependency' })
      await store.upsertFact(fact)

      const retrieved = await store.getFact('fact_sqlite_category')
      expect(retrieved?.category).toBe('dependency')
    })

    it('source persists through upsert and get', async () => {
      const fact = makeFact({ id: 'fact_sqlite_source', source: 'proof' })
      await store.upsertFact(fact)

      const retrieved = await store.getFact('fact_sqlite_source')
      expect(retrieved?.source).toBe('proof')
    })

    it('timestamps persist through upsert and get', async () => {
      const createdAt = '2026-01-01T00:00:00.000Z'
      const updatedAt = '2026-01-01T01:00:00.000Z'
      const fact = makeFact({ id: 'fact_sqlite_timestamps', created_at: createdAt, updated_at: updatedAt })
      await store.upsertFact(fact)

      const retrieved = await store.getFact('fact_sqlite_timestamps')
      expect(retrieved?.created_at).toBe(createdAt)
      expect(retrieved?.updated_at).toBe(updatedAt)
    })

    it('last_verified_at persists through upsert and get', async () => {
      const verifiedAt = '2026-02-15T10:30:00.000Z'
      const fact = makeFact({ id: 'fact_sqlite_verified', last_verified_at: verifiedAt })
      await store.upsertFact(fact)

      const retrieved = await store.getFact('fact_sqlite_verified')
      expect(retrieved?.last_verified_at).toBe(verifiedAt)
    })
  })

  describe('duplicate key behavior', () => {
    it('upsertFact updates existing fact by id, not by key', async () => {
      const fact1 = makeFact({ id: 'fact_sqlite_dup', key: 'shared.key', value: 'value1' })
      const fact2 = makeFact({ id: 'fact_sqlite_dup', key: 'shared.key', value: 'value2' })

      await store.upsertFact(fact1)
      await store.upsertFact(fact2)

      const all = await store.listFacts()
      expect(all.length).toBe(1)
      expect(all[0].value).toBe('value2')
    })
  })
})