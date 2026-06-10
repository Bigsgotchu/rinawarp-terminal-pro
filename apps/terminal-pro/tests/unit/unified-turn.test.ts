import { describe, expect, it } from 'vitest'

import { assertAgentTransition } from '../../src/main/orchestration/agentStateMachine.js'
import {
  buildConstraintSentence,
  composeRinaReply,
  naturalizeReply,
  selectInteractionMode,
} from '../../src/main/orchestration/personalityAdapter.js'
import { routeConversationTurn } from '../../src/main/orchestration/conversationRouter.js'
import { handleUnifiedConversationTurn } from '../../src/main/orchestration/unifiedTurn.js'
import { createBuildPlanHelpers } from '../../src/main/planning/buildPlan.js'
import { createWorkspaceFact } from '../../src/main/memory/memoryTypes.js'

function createMemoryStoreStub() {
  const profile: { tonePreference?: 'concise' | 'balanced' | 'detailed' } = {}
  const operationalMemories: Array<{
    scope: 'session' | 'user' | 'project' | 'episode'
    kind: 'preference' | 'constraint' | 'project_fact' | 'task_outcome' | 'conversation_fact'
    content: string
    workspaceId?: string
  }> = []

  return {
    getState: () => ({ memory: { profile, operationalMemories, operationalStore: { backend: 'sqlite' as const } } }),
    updateProfile: (input: { tonePreference?: 'concise' | 'balanced' | 'detailed' }) => {
      Object.assign(profile, input)
      return { memory: { profile, operationalMemories } }
    },
    upsertOperationalMemory: (input: {
      scope: 'session' | 'user' | 'project' | 'episode'
      kind: 'preference' | 'constraint' | 'project_fact' | 'task_outcome' | 'conversation_fact'
      content: string
      workspaceId?: string
    }) => {
      operationalMemories.push(input)
      return { memory: { profile, operationalMemories } }
    },
    retrieveRelevantMemories: (input: { workspaceId?: string }) =>
      operationalMemories.filter((entry) => !input.workspaceId || !entry.workspaceId || entry.workspaceId === input.workspaceId),
    recordConversationTurn: (input: { workspaceId?: string; userMessage: string; assistantReply: string }) => {
      operationalMemories.push({
        scope: 'session',
        kind: 'conversation_fact',
        content: `User: ${input.userMessage}\nAssistant: ${input.assistantReply}`,
        workspaceId: input.workspaceId,
      })
      return { memory: { profile, operationalMemories } }
    },
  }
}

describe('unified conversation turn', () => {
  it('routes project understanding questions to workspace inspection instead of prior proof metadata', () => {
    const turn = routeConversationTurn({
      rawText: 'What is this project and how do I run it?',
      workspaceId: '/home/karina/rina-test-project',
      latestRun: {
        runId: 'run_stale',
        sessionId: 'session_stale',
        latestReceiptId: 'proof_stale',
        latestCommand: 'npm run build',
      },
    })

    expect(turn.mode).toBe('inspect')
    expect(turn.allowedNextAction).toBe('inspect')
    expect(turn.references.runId).toBeUndefined()
    expect(turn.references.receiptId).toBeUndefined()
  })

  it('answers small talk through the personality adapter instead of system language', async () => {
    const memoryStore = createMemoryStoreStub()
    const result = await handleUnifiedConversationTurn({
      rawText: 'how are you',
      workspaceId: '/tmp/rinawarp-terminal-pro',
      latestRun: {
        runId: 'run_123',
        sessionId: 'session_123',
        interrupted: true,
      },
      buildPlan: async () => ({ id: 'plan_0', reasoning: '', steps: [] }),
      memoryStore,
    })

    expect(result.turn.assistantReply).toMatch(/I’m good|I'm good/)
    expect(result.turn.assistantReply).toMatch(/recovered your last session/i)
    expect(result.turn.assistantReply).not.toMatch(/proof/i)
  })

  it('routes mixed prompts into reply plus plan mode', async () => {
    const memoryStore = createMemoryStoreStub()
    const result = await handleUnifiedConversationTurn({
      rawText: 'fix the build but do not touch tests and explain what happened',
      workspaceId: '/tmp/rinawarp-terminal-pro',
      latestRun: null,
      buildPlan: async (intentText, projectRoot) => ({
        id: 'plan_123',
        reasoning: `Plan for ${intentText}`,
        steps: [
          {
            stepId: 'inspect_git_status',
            tool: 'terminal',
            input: { command: 'git status --short', cwd: projectRoot, timeoutMs: 60_000 },
            risk: 'inspect',
            risk_level: 'low',
            requires_confirmation: false,
            description: 'Inspect workspace state',
          },
        ],
      }),
      memoryStore,
    })

    expect(result.turn.mode).toBe('execute')
    expect(result.turn.requiresAction).toBe(true)
    expect(result.turn.constraints).toContain('do_not_touch_tests')
    expect(result.turn.assistantReply).toMatch(/tests/i)
    expect(result.turn.planPreview?.steps).toHaveLength(1)
    expect(result.result.intent.type).toBe('execute')
    expect(result.result.task?.id).toBeTruthy()
    expect(result.result.permissionRequest?.actions).toContain('approve_execution')
    expect(
      result.timelineEvents.some(
        (event) =>
          event.type === 'memory.context.applied' &&
          event.backend === 'sqlite' &&
          event.constraintCount === 1
      )
    ).toBe(true)
    expect(result.timelineEvents.some((event) => event.type === 'plan.created')).toBe(true)
    expect(result.turn.permissionRequest?.required).toBe(true)
    expect(result.timelineEvents.every((event) => typeof event.correlationId === 'string' && event.correlationId.length > 0)).toBe(true)
  })

  it('stores explicit user preferences from the turn', async () => {
    const memoryStore = createMemoryStoreStub()
    await handleUnifiedConversationTurn({
      rawText: 'use pnpm and keep responses short',
      workspaceId: '/tmp/rinawarp-terminal-pro',
      latestRun: null,
      buildPlan: async () => ({ id: 'plan_0', reasoning: '', steps: [] }),
      memoryStore,
    })

    const state = memoryStore.getState()
    expect(state.memory.profile.tonePreference).toBe('concise')
    expect(state.memory.operationalMemories.some((entry) => /pnpm/i.test(entry.content))).toBe(true)
  })

  it('answers project knowledge questions from the hydrated workspace snapshot', async () => {
    const memoryStore = createMemoryStoreStub()
    const result = await handleUnifiedConversationTurn({
      rawText: 'Rina, what do you know about this project?',
      workspaceId: '/tmp/rinawarp-terminal-pro',
      latestRun: null,
      buildPlan: async () => ({ id: 'plan_0', reasoning: '', steps: [] }),
      memoryStore,
      workspaceKnowledge: {
        architecture: [
          createWorkspaceFact({
            id: 'arch_runtime',
            key: 'architecture.runtime',
            value: 'AgentRuntime',
            category: 'architecture',
            source: 'config',
            confidence: 'high',
          }),
        ],
        dependencies: [
          createWorkspaceFact({
            id: 'dep_sqlite',
            key: 'dependency.sqlite',
            value: 'SQLite',
            category: 'dependency',
            source: 'config',
            confidence: 'medium',
          }),
        ],
        conventions: [],
        preferences: [],
        recurring_failures: [],
        runtime_facts: [
          createWorkspaceFact({
            id: 'runtime_proof',
            key: 'runtime.proof',
            value: 'Proof enabled',
            category: 'runtime_fact',
            source: 'runtime',
            confidence: 'high',
          }),
        ],
        fact_count: 3,
        last_hydrated_at: '2026-06-09T00:00:00.000Z',
      },
    })

    expect(result.turn.mode).toBe('question')
    expect(result.turn.assistantReply).toContain('Workspace Knowledge')
    expect(result.turn.assistantReply).toContain('Architecture\n- AgentRuntime')
    expect(result.turn.assistantReply).toContain('Dependencies\n- SQLite')
    expect(result.turn.assistantReply).toContain('Runtime Facts\n- Proof enabled')
    expect(result.turn.assistantReply).toContain('Confidence\n- 2 high\n- 1 medium\n- 0 low')
    expect(result.turn.requiresAction).toBe(false)
  })

  it('answers task requests with teammate-first language while preserving constraints', async () => {
    const memoryStore = createMemoryStoreStub()
    const result = await handleUnifiedConversationTurn({
      rawText: 'fix it but do not touch tests',
      workspaceId: '/tmp/rinawarp-terminal-pro',
      latestRun: null,
      buildPlan: async () => ({
        id: 'plan_fix',
        reasoning: 'Repair plan',
        steps: [],
      }),
      memoryStore,
    })

    expect(result.turn.assistantReply).toMatch(/run the test check/i)
    expect(result.turn.assistantReply).toMatch(/avoid touching tests/i)
  })
})

describe('build plan helpers', () => {
  it('returns inspect-first executable steps with confirmation metadata', async () => {
    const helpers = createBuildPlanHelpers({
      fs: {},
      path: {},
      playbooks: [],
      topCpuCmdSafeShort: 'ps aux',
    } as any)

    const plan = await helpers.makePlan('build the app', '/tmp/rinawarp-terminal-pro')
    expect(Array.isArray(plan.steps)).toBe(true)
    expect(plan.steps[0]?.stepId).toBeTruthy()
    expect(plan.steps[0]?.input?.command).toBeTruthy()
    expect(plan.steps[0]?.risk_level).toBeTruthy()
    expect(typeof plan.steps[0]?.requires_confirmation).toBe('boolean')
  })

  it('builds the chat-first failed build recovery plan for pnpm projects', async () => {
    const helpers = createBuildPlanHelpers({
      fs: {},
      path: {},
      playbooks: [],
      topCpuCmdSafeShort: 'ps aux',
    } as any)

    const projectRoot = process.cwd().replace(/\/apps\/terminal-pro$/, '')
    const plan = await helpers.makePlan('My build is failing', projectRoot)

    expect(plan.reasoning).toMatch(/one safe build diagnostic/i)
    expect(plan.steps.map((step: any) => step.input.command)).toEqual([
      'pwd',
      'ls',
      'cat package.json',
      'pnpm build',
    ])
    expect(plan.steps.every((step: any) => step.requires_confirmation === false)).toBe(true)
    expect(plan.steps.at(-1)?.description).toContain('capture the first concrete error')
  })
})

describe('elite personality runtime', () => {
  it('selects social mode for casual check-ins', () => {
    expect(
      selectInteractionMode({
        message: 'how are you',
        recoveredSession: true,
        requiresAction: false,
      })
    ).toBe('social')
  })

  it('matches the small talk after recovery snapshot', () => {
    const reply = composeRinaReply({
      userMessage: 'how are you',
      requiresAction: false,
      recoveredSession: true,
      lastTaskStatus: 'failed',
      rememberedPreferences: [],
      rememberedConstraints: [],
      hasActiveTask: false,
    })

    expect(reply).toBe('I’m good. I recovered your last session cleanly. Want to continue where we left off?')
  })

  it('matches the remembered constraint snapshot', () => {
    const reply = composeRinaReply({
      userMessage: 'fix it',
      systemReply: 'Got it. I’m on it.',
      requiresAction: true,
      recoveredSession: false,
      rememberedPreferences: ['pnpm'],
      rememberedConstraints: ['test_approval'],
      hasActiveTask: true,
    })

    expect(reply).toBe('Got it. I’m on it. I’ll use pnpm, and avoid touching tests without asking.')
  })

  it('naturalizes robotic phrasing', () => {
    expect(naturalizeReply('I do not have proof yet. Receipt unavailable.')).toBe('I haven’t checked that yet. result unavailable.')
  })

  it('builds one natural constraint sentence', () => {
    expect(
      buildConstraintSentence({
        rememberedPreferences: ['pnpm', 'concise'],
        rememberedConstraints: ['test_approval'],
      })
    ).toBe('I’ll use pnpm, keep this short, and avoid touching tests without asking.')
  })
})

describe('agent state machine', () => {
  it('allows the planned conversational execution path', () => {
    expect(assertAgentTransition('idle', 'thinking')).toBe('thinking')
    expect(assertAgentTransition('thinking', 'responding')).toBe('responding')
    expect(assertAgentTransition('responding', 'planning')).toBe('planning')
    expect(assertAgentTransition('planning', 'awaiting_permission')).toBe('awaiting_permission')
  })

  it('rejects invalid state transitions', () => {
    expect(() => assertAgentTransition('idle', 'executing')).toThrow(/Invalid agent state transition/)
  })
})
