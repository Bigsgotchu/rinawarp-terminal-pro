import { describe, expect, it } from 'vitest'

import {
  extractWorkspaceFacts,
  type WorkspaceFactExtractInput,
} from '../../src/main/memory/workspaceFactExtractor.js'
import {
  isWorkspaceFact,
  type WorkspaceFact,
} from '../../src/main/memory/memoryTypes.js'

function validWorkspaceFact(overrides: Partial<WorkspaceFact> = {}): WorkspaceFact {
  return {
    id: 'fact_123',
    key: 'architecture.runtime',
    value: 'AgentRuntime',
    category: 'architecture',
    source: 'runtime',
    confidence: 'high',
    last_verified_at: '2026-06-09T00:00:00.000Z',
    created_at: '2026-06-09T00:00:00.000Z',
    updated_at: '2026-06-09T00:00:00.000Z',
    ...overrides,
  }
}

describe('extractWorkspaceFacts', () => {
  it('extracts architecture facts from project config', () => {
    const input: WorkspaceFactExtractInput = {
      projectConfig: {
        projectRoot: '/test/project',
        runtime: 'Node.js',
        shell: 'Bash',
        agent: 'Rina',
        ui: 'Agent Thread',
        framework: 'Electron',
      },
    }

    const facts = extractWorkspaceFacts(input)

    expect(facts.some((f) => f.key === 'runtime.primary' && f.value === 'Node.js')).toBe(true)
    expect(facts.some((f) => f.key === 'shell.primary' && f.value === 'Bash')).toBe(true)
    expect(facts.some((f) => f.key === 'agent.runtime' && f.value === 'Rina')).toBe(true)
    expect(facts.some((f) => f.key === 'ui.primary' && f.value === 'Agent Thread')).toBe(true)
  })

  it('extracts dependency facts from project config', () => {
    const input: WorkspaceFactExtractInput = {
      projectConfig: {
        projectRoot: '/test/project',
        database: 'SQLite',
        authProvider: 'Clerk',
        modelProvider: 'OpenAI',
        packageManager: 'pnpm',
      },
    }

    const facts = extractWorkspaceFacts(input)

    expect(facts.some((f) => f.key === 'database.primary' && f.value === 'SQLite')).toBe(true)
    expect(facts.some((f) => f.key === 'auth.provider' && f.value === 'Clerk')).toBe(true)
    expect(facts.some((f) => f.key === 'model.provider' && f.value === 'OpenAI')).toBe(true)
    expect(facts.some((f) => f.key === 'package.manager' && f.value === 'pnpm')).toBe(true)
  })

  it('extracts runtime facts from successful execution records', () => {
    const input: WorkspaceFactExtractInput = {
      executionRecords: [
        {
          command: 'npm test',
          exitCode: 0,
          success: true,
          output: 'All tests passed',
          startedAt: '2026-06-09T00:00:00.000Z',
          endedAt: '2026-06-09T00:01:00.000Z',
          proofId: 'proof_123',
        },
      ],
    }

    const facts = extractWorkspaceFacts(input)

    const successFact = facts.find((f) => f.key === 'execution.proof_123.success')
    expect(successFact).toBeDefined()
    expect(successFact?.value).toBe('true')
    expect(successFact?.source).toBe('runtime')
    expect(successFact?.confidence).toBe('high')
  })

  it('extracts runtime facts from failed execution records', () => {
    const input: WorkspaceFactExtractInput = {
      executionRecords: [
        {
          command: 'npm build',
          exitCode: 1,
          success: false,
          output: 'Build failed',
          startedAt: '2026-06-09T00:00:00.000Z',
          endedAt: '2026-06-09T00:01:00.000Z',
          proofId: 'proof_456',
        },
      ],
    }

    const facts = extractWorkspaceFacts(input)

    const exitCodeFact = facts.find((f) => f.key === 'execution.proof_456.exit_code')
    expect(exitCodeFact).toBeDefined()
    expect(exitCodeFact?.value).toBe('1')
    expect(exitCodeFact?.source).toBe('runtime')
  })

  it('extracts facts from proof records', () => {
    const input: WorkspaceFactExtractInput = {
      proofRecords: [
        {
          proofId: 'proof_789',
          verificationStatus: 'verified',
          evidenceCount: 5,
          successfulCommands: 5,
          failedCommands: 0,
        },
      ],
    }

    const facts = extractWorkspaceFacts(input)

    const statusFact = facts.find((f) => f.key === 'proof.proof_789.verification_status')
    expect(statusFact).toBeDefined()
    expect(statusFact?.value).toBe('verified')
    expect(statusFact?.source).toBe('proof')

    const evidenceFact = facts.find((f) => f.key === 'proof.proof_789.evidence_count')
    expect(evidenceFact).toBeDefined()
    expect(evidenceFact?.value).toBe('5')
  })

  it('extracts facts from memory entries', () => {
    const input: WorkspaceFactExtractInput = {
      memoryEntries: [
        {
          id: 'mem_123',
          scope: 'user',
          kind: 'preference',
          content: 'Use pnpm by default',
          salience: 0.95,
          tags: ['pnpm'],
          source: 'conversation',
          createdAt: '2026-06-09T00:00:00.000Z',
          updatedAt: '2026-06-09T00:00:00.000Z',
        },
        {
          id: 'mem_456',
          scope: 'project',
          kind: 'project_fact',
          content: 'Project uses TypeScript',
          salience: 0.8,
          tags: ['typescript'],
          source: 'conversation',
          createdAt: '2026-06-09T00:00:00.000Z',
          updatedAt: '2026-06-09T00:00:00.000Z',
        },
      ],
    }

    const facts = extractWorkspaceFacts(input)

    expect(facts.length).toBeGreaterThan(0)
    expect(facts.every((f) => isWorkspaceFact(f))).toBe(true)
  })

  it('returns empty array when no input provided', () => {
    const facts = extractWorkspaceFacts({})
    expect(facts).toEqual([])
  })

  it('extracts facts from all sources combined', () => {
    const input: WorkspaceFactExtractInput = {
      projectConfig: {
        projectRoot: '/test/project',
        runtime: 'Node.js',
        packageManager: 'npm',
      },
      executionRecords: [
        {
          command: 'npm test',
          exitCode: 0,
          success: true,
          startedAt: '2026-06-09T00:00:00.000Z',
          endedAt: '2026-06-09T00:01:00.000Z',
          proofId: 'proof_1',
        },
      ],
      proofRecords: [
        {
          proofId: 'proof_1',
          verificationStatus: 'verified',
          evidenceCount: 3,
        },
      ],
      memoryEntries: [
        {
          id: 'mem_1',
          scope: 'project',
          kind: 'project_fact',
          content: 'Uses TypeScript',
          salience: 0.9,
          tags: [],
          source: 'conversation',
          createdAt: '2026-06-09T00:00:00.000Z',
          updatedAt: '2026-06-09T00:00:00.000Z',
        },
      ],
    }

    const facts = extractWorkspaceFacts(input)

    // Should have facts from all sources
    expect(facts.some((f) => f.key === 'runtime.primary')).toBe(true)
    expect(facts.some((f) => f.key === 'package.manager')).toBe(true)
    expect(facts.some((f) => f.key === 'execution.proof_1.success')).toBe(true)
    expect(facts.some((f) => f.key === 'proof.proof_1.verification_status')).toBe(true)
    expect(facts.length).toBeGreaterThanOrEqual(5)
  })

  it('produces valid WorkspaceFact objects', () => {
    const input: WorkspaceFactExtractInput = {
      projectConfig: {
        projectRoot: '/test/project',
        runtime: 'Node.js',
        packageManager: 'pnpm',
      },
    }

    const facts = extractWorkspaceFacts(input)

    facts.forEach((fact) => {
      expect(isWorkspaceFact(fact)).toBe(true)
      expect(fact.id).toMatch(/^workspace_fact_/)
      expect(fact.created_at).toBeDefined()
      expect(fact.updated_at).toBeDefined()
    })
  })

  it('handles partial project config gracefully', () => {
    const input: WorkspaceFactExtractInput = {
      projectConfig: {
        projectRoot: '/test/project',
        // No other fields
      },
    }

    const facts = extractWorkspaceFacts(input)
    expect(facts).toEqual([])
  })

  it('handles empty arrays gracefully', () => {
    const input: WorkspaceFactExtractInput = {
      executionRecords: [],
      proofRecords: [],
      memoryEntries: [],
    }

    const facts = extractWorkspaceFacts(input)
    expect(facts).toEqual([])
  })
})