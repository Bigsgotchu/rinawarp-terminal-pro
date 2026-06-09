import { describe, expect, it, beforeEach } from 'vitest'

import {
  createMemoryWorkspaceFactStore,
  resetMemoryWorkspaceFactStore,
  type WorkspaceFactStore,
} from '../../src/main/memory/workspaceFactStore.js'
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

describe('WorkspaceFactStore interface', () => {
  let store: WorkspaceFactStore

  beforeEach(() => {
    resetMemoryWorkspaceFactStore()
    store = createMemoryWorkspaceFactStore()
  })

  describe('upsertFact', () => {
    it('inserts a new fact', async () => {
      const fact = makeFact({ id: 'fact_new' })
      const result = await store.upsertFact(fact)

      expect(result.id).toBe('fact_new')
      expect(result.key).toBe('architecture.runtime')
    })

    it('updates an existing fact', async () => {
      const fact = makeFact({ id: 'fact_update', value: 'Original' })
      await store.upsertFact(fact)

      const updated = makeFact({ id: 'fact_update', value: 'Updated' })
      const result = await store.upsertFact(updated)

      expect(result.value).toBe('Updated')

      const retrieved = await store.getFact('fact_update')
      expect(retrieved?.value).toBe('Updated')
    })
  })

  describe('getFact', () => {
    it('returns null for non-existent fact', async () => {
      const result = await store.getFact('non_existent')
      expect(result).toBeNull()
    })

    it('returns the fact when it exists', async () => {
      const fact = makeFact({ id: 'fact_get' })
      await store.upsertFact(fact)

      const result = await store.getFact('fact_get')
      expect(result).toEqual(fact)
    })
  })

  describe('listFacts', () => {
    beforeEach(async () => {
      await store.upsertFact(makeFact({ id: 'fact_1', category: 'architecture' }))
      await store.upsertFact(makeFact({ id: 'fact_2', category: 'dependency', source: 'runtime' }))
      await store.upsertFact(makeFact({ id: 'fact_3', category: 'architecture', confidence: 'low' }))
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
      await store.upsertFact(makeFact({ id: 'fact_4', key: 'database.primary' }))
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
      expect(facts[0].id).toBe('fact_1')
    })
  })

  describe('deleteFact', () => {
    it('returns false for non-existent fact', async () => {
      const result = await store.deleteFact('non_existent')
      expect(result).toBe(false)
    })

    it('deletes an existing fact and returns true', async () => {
      const fact = makeFact({ id: 'fact_delete' })
      await store.upsertFact(fact)

      const result = await store.deleteFact('fact_delete')
      expect(result).toBe(true)

      const retrieved = await store.getFact('fact_delete')
      expect(retrieved).toBeNull()
    })
  })

  describe('findFactByKey', () => {
    it('returns null when no fact matches', async () => {
      const result = await store.findFactByKey('non.existent.key')
      expect(result).toBeNull()
    })

    it('finds a fact by exact key match', async () => {
      const fact = makeFact({ id: 'fact_key', key: 'runtime.primary' })
      await store.upsertFact(fact)

      const result = await store.findFactByKey('runtime.primary')
      expect(result).toEqual(fact)
    })

    it('finds a fact by partial key prefix', async () => {
      const fact = makeFact({ id: 'fact_prefix', key: 'architecture.ui' })
      await store.upsertFact(fact)

      const result = await store.findFactByKey('architecture.u')
      expect(result).toEqual(fact)
    })
  })

  describe('isolation', () => {
    it('returns copies of facts, not references', async () => {
      const fact = makeFact({ id: 'fact_isolation' })
      await store.upsertFact(fact)

      const retrieved = await store.getFact('fact_isolation')
      expect(retrieved).not.toBe(fact)
      expect(retrieved).toEqual(fact)

      retrieved.value = 'Modified'
      const fresh = await store.getFact('fact_isolation')
      expect(fresh?.value).toBe('AgentRuntime')
    })
  })

  describe('persistence guards', () => {
    it('upsertFact preserves the original id', async () => {
      const fact = makeFact({ id: 'fact_preserve_id' })
      const result = await store.upsertFact(fact)

      expect(result.id).toBe('fact_preserve_id')
      expect(result).toHaveProperty('id')
    })

    it('confidence persists through upsert and get', async () => {
      const fact = makeFact({ id: 'fact_confidence', confidence: 'low' })
      await store.upsertFact(fact)

      const retrieved = await store.getFact('fact_confidence')
      expect(retrieved?.confidence).toBe('low')
    })

    it('category persists through upsert and get', async () => {
      const fact = makeFact({ id: 'fact_category', category: 'dependency' })
      await store.upsertFact(fact)

      const retrieved = await store.getFact('fact_category')
      expect(retrieved?.category).toBe('dependency')
    })

    it('source persists through upsert and get', async () => {
      const fact = makeFact({ id: 'fact_source', source: 'proof' })
      await store.upsertFact(fact)

      const retrieved = await store.getFact('fact_source')
      expect(retrieved?.source).toBe('proof')
    })

    it('timestamps persist through upsert and get', async () => {
      const createdAt = '2026-01-01T00:00:00.000Z'
      const updatedAt = '2026-01-01T01:00:00.000Z'
      const fact = makeFact({ id: 'fact_timestamps', created_at: createdAt, updated_at: updatedAt })
      await store.upsertFact(fact)

      const retrieved = await store.getFact('fact_timestamps')
      expect(retrieved?.created_at).toBe(createdAt)
      expect(retrieved?.updated_at).toBe(updatedAt)
    })

    it('last_verified_at persists through upsert and get', async () => {
      const verifiedAt = '2026-02-15T10:30:00.000Z'
      const fact = makeFact({ id: 'fact_verified', last_verified_at: verifiedAt })
      await store.upsertFact(fact)

      const retrieved = await store.getFact('fact_verified')
      expect(retrieved?.last_verified_at).toBe(verifiedAt)
    })
  })

  describe('invalid fact rejection', () => {
    it('throws on empty key during creation (invalid fact cannot be stored)', async () => {
      expect(() => createWorkspaceFact({
        key: '',
        value: 'test',
        category: 'architecture',
        source: 'config',
      })).toThrow('WorkspaceFact key is required')
    })

    it('throws on empty value during creation (invalid fact cannot be stored)', () => {
      expect(() => createWorkspaceFact({
        key: 'test.key',
        value: '',
        category: 'architecture',
        source: 'config',
      })).toThrow('WorkspaceFact value is required')
    })

    it('throws on invalid category during creation (invalid fact cannot be stored)', () => {
      expect(() => createWorkspaceFact({
        key: 'test.key',
        value: 'test',
        category: 'invalid' as WorkspaceFactCategory,
        source: 'config',
      })).toThrow('Invalid WorkspaceFact category')
    })

    it('throws on invalid source during creation (invalid fact cannot be stored)', () => {
      expect(() => createWorkspaceFact({
        key: 'test.key',
        value: 'test',
        category: 'architecture',
        source: 'invalid' as WorkspaceFactSource,
      })).toThrow('Invalid WorkspaceFact source')
    })
  })

  describe('duplicate key behavior', () => {
    it('allows multiple facts with different ids but same key', async () => {
      const fact1 = makeFact({ id: 'fact_dup_1', key: 'duplicate.key', value: 'value1' })
      const fact2 = makeFact({ id: 'fact_dup_2', key: 'duplicate.key', value: 'value2' })

      await store.upsertFact(fact1)
      await store.upsertFact(fact2)

      const all = await store.listFacts()
      expect(all.length).toBe(2)
      expect(all.every(f => f.key === 'duplicate.key')).toBe(true)
    })

    it('findFactByKey returns first match when multiple facts share same key', async () => {
      const fact1 = makeFact({ id: 'fact_dup_find_1', key: 'shared.key', value: 'value1' })
      const fact2 = makeFact({ id: 'fact_dup_find_2', key: 'shared.key', value: 'value2' })

      await store.upsertFact(fact1)
      await store.upsertFact(fact2)

      const result = await store.findFactByKey('shared.key')
      expect(result?.key).toBe('shared.key')
    })

    it('upsertFact updates existing fact by id, not by key', async () => {
      const fact1 = makeFact({ id: 'fact_update_by_id', key: 'shared.key', value: 'value1' })
      const fact2 = makeFact({ id: 'fact_update_by_id', key: 'shared.key', value: 'value2' })

      await store.upsertFact(fact1)
      await store.upsertFact(fact2)

      const all = await store.listFacts()
      expect(all.length).toBe(1)
      expect(all[0].value).toBe('value2')
    })

    it('findFactByKey returns latest version when fact updated by id', async () => {
      const fact1 = makeFact({ id: 'fact_latest', key: 'versioned.key', value: 'v1' })
      const fact2 = makeFact({ id: 'fact_latest', key: 'versioned.key', value: 'v2' })

      await store.upsertFact(fact1)
      await store.upsertFact(fact2)

      const result = await store.findFactByKey('versioned.key')
      expect(result?.value).toBe('v2')
    })
  })
})