import { describe, expect, it } from 'vitest'

import {
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
