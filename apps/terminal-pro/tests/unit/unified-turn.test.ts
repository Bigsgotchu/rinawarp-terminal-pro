import { describe, expect, it } from 'vitest'

import { assertAgentTransition } from '../../src/main/orchestration/agentStateMachine.js'
import {
  buildConstraintSentence,
  composeRinaReply,
  naturalizeReply,
  selectInteractionMode,
} from '../../src/main/orchestration/personalityAdapter.js'
import { handleUnifiedConversationTurn } from '../../src/main/orchestration/unifiedTurn.js'
import { createBuildPlanHelpers } from '../../src/main/planning/buildPlan.js'

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

    expect(result.turn.mode).toBe('mixed')
    expect(result.turn.requiresAction).toBe(true)
    expect(result.turn.constraints).toContain('do_not_touch_tests')
    expect(result.turn.assistantReply).toMatch(/tests/i)
    expect(result.turn.planPreview?.steps).toHaveLength(1)
    expect(result.result.intent.type).toBe('mixed')
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

    expect(result.turn.assistantReply).toMatch(/Got it\. I’m on it\.|Got it\. I'm on it\./)
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
