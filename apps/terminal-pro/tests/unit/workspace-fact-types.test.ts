import { describe, expect, it } from 'vitest'

import {
  classifyWorkspaceFact,
  createWorkspaceFact,
  isWorkspaceFact,
  isWorkspaceFactCategory,
  isWorkspaceFactConfidence,
  isWorkspaceFactSource,
  WORKSPACE_FACT_CATEGORIES,
  WORKSPACE_FACT_CONFIDENCE_LEVELS,
  WORKSPACE_FACT_SOURCES,
  type WorkspaceFact,
} from '../../src/main/memory/memoryTypes.js'

function validWorkspaceFact(overrides: Partial<WorkspaceFact> = {}): WorkspaceFact {
  return {
    id: 'fact_123',
    key: 'architecture.primary_ui',
    value: 'Agent Thread',
    category: 'architecture',
    source: 'proof',
    confidence: 'high',
    last_verified_at: '2026-06-09T00:00:00.000Z',
    created_at: '2026-06-09T00:00:00.000Z',
    updated_at: '2026-06-09T00:00:00.000Z',
    ...overrides,
  }
}

describe('WorkspaceFact type guards', () => {
  it('accepts the locked WorkspaceFact categories', () => {
    expect(WORKSPACE_FACT_CATEGORIES).toEqual([
      'architecture',
      'dependency',
      'convention',
      'preference',
      'recurring_failure',
      'runtime_fact',
    ])
    for (const category of WORKSPACE_FACT_CATEGORIES) {
      expect(isWorkspaceFactCategory(category)).toBe(true)
    }
    expect(isWorkspaceFactCategory('conversation_fact')).toBe(false)
  })

  it('accepts the locked WorkspaceFact sources', () => {
    expect(WORKSPACE_FACT_SOURCES).toEqual(['user', 'runtime', 'proof', 'config', 'inferred'])
    for (const source of WORKSPACE_FACT_SOURCES) {
      expect(isWorkspaceFactSource(source)).toBe(true)
    }
    expect(isWorkspaceFactSource('chat')).toBe(false)
  })

  it('accepts the locked WorkspaceFact confidence levels', () => {
    expect(WORKSPACE_FACT_CONFIDENCE_LEVELS).toEqual(['high', 'medium', 'low'])
    for (const confidence of WORKSPACE_FACT_CONFIDENCE_LEVELS) {
      expect(isWorkspaceFactConfidence(confidence)).toBe(true)
    }
    expect(isWorkspaceFactConfidence(0.95)).toBe(false)
  })

  it('validates a complete WorkspaceFact payload', () => {
    expect(isWorkspaceFact(validWorkspaceFact())).toBe(true)
    expect(isWorkspaceFact(validWorkspaceFact({ last_verified_at: null }))).toBe(true)
  })

  it('rejects malformed WorkspaceFact payloads', () => {
    expect(isWorkspaceFact(null)).toBe(false)
    expect(isWorkspaceFact({ ...validWorkspaceFact(), category: 'conversation_fact' })).toBe(false)
    expect(isWorkspaceFact({ ...validWorkspaceFact(), source: 'assistant_inferred' })).toBe(false)
    expect(isWorkspaceFact({ ...validWorkspaceFact(), confidence: 0.95 })).toBe(false)
    expect(isWorkspaceFact({ ...validWorkspaceFact(), last_verified_at: undefined })).toBe(false)
    expect(isWorkspaceFact({ ...validWorkspaceFact(), updated_at: null })).toBe(false)
  })
})

describe('createWorkspaceFact', () => {
  it('normalizes key and value while preserving validated fields', () => {
    const fact = createWorkspaceFact({
      id: ' fact_456 ',
      key: ' architecture.runtime ',
      value: ' AgentRuntime ',
      category: 'runtime_fact',
      source: 'runtime',
      confidence: 'high',
      last_verified_at: '2026-06-09T00:00:00.000Z',
      created_at: '2026-06-09T00:00:00.000Z',
      updated_at: '2026-06-09T00:00:00.000Z',
    })

    expect(fact).toEqual({
      id: 'fact_456',
      key: 'architecture.runtime',
      value: 'AgentRuntime',
      category: 'runtime_fact',
      source: 'runtime',
      confidence: 'high',
      last_verified_at: '2026-06-09T00:00:00.000Z',
      created_at: '2026-06-09T00:00:00.000Z',
      updated_at: '2026-06-09T00:00:00.000Z',
    })
  })

  it('defaults confidence and timestamps for valid facts', () => {
    const fact = createWorkspaceFact({
      key: 'dependency.sqlite',
      value: 'better-sqlite3',
      category: 'dependency',
      source: 'config',
    })

    expect(fact.id).toMatch(/^workspace_fact_/)
    expect(fact.confidence).toBe('medium')
    expect(fact.last_verified_at).toBeNull()
    expect(new Date(fact.created_at).toString()).not.toBe('Invalid Date')
    expect(new Date(fact.updated_at).toString()).not.toBe('Invalid Date')
    expect(isWorkspaceFact(fact)).toBe(true)
  })

  it('rejects empty key and empty value', () => {
    expect(() =>
      createWorkspaceFact({
        key: ' ',
        value: 'Agent Thread',
        category: 'architecture',
        source: 'user',
      })
    ).toThrow(/key is required/)

    expect(() =>
      createWorkspaceFact({
        key: 'architecture.ui',
        value: ' ',
        category: 'architecture',
        source: 'user',
      })
    ).toThrow(/value is required/)
  })

  it('rejects invalid category, source, and confidence', () => {
    expect(() =>
      createWorkspaceFact({
        key: 'architecture.ui',
        value: 'Agent Thread',
        category: 'conversation_fact' as never,
        source: 'user',
      })
    ).toThrow(/Invalid WorkspaceFact category/)

    expect(() =>
      createWorkspaceFact({
        key: 'architecture.ui',
        value: 'Agent Thread',
        category: 'architecture',
        source: 'chat' as never,
      })
    ).toThrow(/Invalid WorkspaceFact source/)

    expect(() =>
      createWorkspaceFact({
        key: 'architecture.ui',
        value: 'Agent Thread',
        category: 'architecture',
        source: 'user',
        confidence: 'certain' as never,
      })
    ).toThrow(/Invalid WorkspaceFact confidence/)
  })
})

describe('classifyWorkspaceFact', () => {
  it('classifies architecture facts deterministically', () => {
    expect(classifyWorkspaceFact({ key: 'runtime.primary', value: 'AgentRuntime' })).toEqual({
      category: 'architecture',
      confidence: 'medium',
    })
    expect(
      classifyWorkspaceFact({ key: 'framework.renderer', value: 'Electron Agent Shell', source: 'config' })
    ).toEqual({
      category: 'architecture',
      confidence: 'high',
    })
  })

  it('classifies dependency facts deterministically', () => {
    expect(classifyWorkspaceFact({ key: 'database.local', value: 'SQLite' })).toEqual({
      category: 'dependency',
      confidence: 'medium',
    })
    expect(classifyWorkspaceFact({ key: 'auth.provider', value: 'Clerk', source: 'config' })).toEqual({
      category: 'dependency',
      confidence: 'high',
    })
  })

  it('classifies convention facts deterministically', () => {
    expect(classifyWorkspaceFact({ key: 'formatting.style', value: 'Use Prettier' })).toEqual({
      category: 'convention',
      confidence: 'medium',
    })
    expect(classifyWorkspaceFact({ key: 'commit.convention', value: 'Use focused commits', source: 'user' })).toEqual({
      category: 'convention',
      confidence: 'high',
    })
  })

  it('classifies preference facts deterministically', () => {
    expect(classifyWorkspaceFact({ key: 'user preference.package_manager', value: 'pnpm' })).toEqual({
      category: 'preference',
      confidence: 'medium',
    })
    expect(
      classifyWorkspaceFact({ key: 'workflow preference.approval', value: 'Ask before write actions', source: 'user' })
    ).toEqual({
      category: 'preference',
      confidence: 'high',
    })
  })

  it('classifies recurring failure facts deterministically', () => {
    expect(
      classifyWorkspaceFact({ key: 'repeated build errors.typescript', value: 'tsc fails on stale dist' })
    ).toEqual({
      category: 'recurring_failure',
      confidence: 'high',
    })
    expect(
      classifyWorkspaceFact({ key: 'failures.tests', value: 'repeated test failures in planner approval' })
    ).toEqual({
      category: 'recurring_failure',
      confidence: 'high',
    })
  })

  it('classifies runtime and proof sourced facts as runtime facts', () => {
    expect(classifyWorkspaceFact({ key: 'execution.command', value: 'npm test passed', source: 'runtime' })).toEqual({
      category: 'runtime_fact',
      confidence: 'high',
    })
    expect(classifyWorkspaceFact({ key: 'proof.verification', value: 'Proof verified', source: 'proof' })).toEqual({
      category: 'runtime_fact',
      confidence: 'high',
    })
  })

  it('falls back to low-confidence runtime_fact for unknown facts', () => {
    expect(classifyWorkspaceFact({ key: 'misc.note', value: 'Something observed' })).toEqual({
      category: 'runtime_fact',
      confidence: 'low',
    })
  })
})
