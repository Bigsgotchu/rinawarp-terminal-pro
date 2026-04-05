import { buildConversationReply, routeConversationTurn } from './conversationRouter.js'
import { assertAgentTransition } from './agentStateMachine.js'
import { createRuleBasedMemoryExtractor } from './memoryExtractor.js'
import { createInMemoryTaskController } from './taskController.js'
import type {
  AgentState,
  AgentTimelineEvent,
  ConversationPlanPreview,
  ConversationRunReference,
  ConversationTurnResult,
  HandleUserTurnResult,
  IntentResult,
} from './conversationTypes.js'

type MemoryStoreLike = {
  getState: () => {
    memory: {
      profile?: {
        tonePreference?: 'concise' | 'balanced' | 'detailed'
      }
      operationalMemories?: Array<{
        scope: 'session' | 'user' | 'project' | 'episode'
        kind: 'preference' | 'constraint' | 'project_fact' | 'task_outcome' | 'conversation_fact'
        content: string
        workspaceId?: string
      }>
    }
  }
  updateProfile: (input: {
    tonePreference?: 'concise' | 'balanced' | 'detailed'
  }) => unknown
  upsertOperationalMemory: (input: {
    scope: 'session' | 'user' | 'project' | 'episode'
    kind: 'preference' | 'constraint' | 'project_fact' | 'task_outcome' | 'conversation_fact'
    content: string
    workspaceId?: string
    source?: 'behavior' | 'conversation'
    salience?: number
    tags?: string[]
    metadata?: Record<string, unknown>
  }) => unknown
  retrieveRelevantMemories: (input: {
    query: string
    workspaceId?: string
    limit?: number
  }) => Array<{
    id?: string
    content: string
    kind: 'preference' | 'constraint' | 'project_fact' | 'task_outcome' | 'conversation_fact'
    status?: 'approved' | 'suggested' | 'rejected'
  }>
  retrieveRelevantMemory?: (input: {
    userId?: string
    workspaceId?: string
    sessionId?: string
    query: string
    limit?: number
  }) => Array<{
    id?: string
    content: string
    kind: 'preference' | 'constraint' | 'project_fact' | 'task_outcome' | 'conversation_fact'
    status?: 'approved' | 'suggested' | 'rejected'
    metadata?: Record<string, unknown>
  }>
  processTurnMemory?: (input: {
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
  }) => Promise<Array<{
    id?: string
    content: string
    kind: 'preference' | 'constraint' | 'project_fact' | 'task_outcome' | 'conversation_fact'
    status?: 'approved' | 'suggested' | 'rejected'
  }>>
  getRecentMessages?: (sessionId: string) => Array<{
    role: 'user' | 'assistant'
    text: string
    createdAt: string
  }>
  recordConversationTurn: (input: {
    sessionId?: string
    workspaceId?: string
    userMessage: string
    assistantReply: string
  }) => unknown
}

type UnifiedTurnDeps = {
  rawText: string
  workspaceId?: string
  latestRun?: ConversationRunReference | null
  buildPlan: (intentText: string, projectRoot: string) => Promise<ConversationPlanPreview>
  memoryStore: MemoryStoreLike
}

const memoryExtractor = createRuleBasedMemoryExtractor()
const taskController = createInMemoryTaskController()

function retrieveRelevantMemories(rawText: string, memoryStore: MemoryStoreLike, workspaceId?: string, sessionId?: string) {
  return memoryStore.retrieveRelevantMemory
    ? memoryStore.retrieveRelevantMemory({ workspaceId, sessionId, query: rawText, limit: 8 })
    : memoryStore.retrieveRelevantMemories({ query: rawText, workspaceId, limit: 8 })
}

function mergeConstraints(rawText: string, memoryStore: MemoryStoreLike, workspaceId?: string, sessionId?: string): string[] {
  const constraints = new Set<string>()
  const lower = rawText.toLowerCase()
  if (/\b(don\'t touch tests|do not touch tests|don\'t edit tests|do not edit tests|without touching tests|without editing tests)\b/.test(lower)) {
    constraints.add('do_not_touch_tests')
  }
  const memory = retrieveRelevantMemories(rawText, memoryStore, workspaceId, sessionId)
  for (const entry of memory) {
    if (entry.status && entry.status !== 'approved') continue
    const content = entry.content.toLowerCase()
    if (entry.kind === 'constraint' && /\btests?\b/.test(content)) constraints.add('do_not_touch_tests')
    if (entry.kind === 'preference' && /\bpnpm\b/.test(content)) constraints.add('use_pnpm')
    if (entry.kind === 'preference' && /\bconcise\b/.test(content)) constraints.add('prefer_concise')
  }
  return Array.from(constraints)
}

function buildConstraintLead(constraints: string[]): string {
  if (constraints.length === 0) return ''
  const labels = constraints.map((constraint) => {
    switch (constraint) {
      case 'do_not_touch_tests':
        return 'I’ll leave tests alone unless you explicitly want them changed'
      case 'use_pnpm':
        return 'I’ll keep pnpm as the default'
      case 'prefer_concise':
        return 'I’ll keep this concise'
      default:
        return constraint.replace(/_/g, ' ')
    }
  })
  return `${labels.join('. ')}. `
}

function createEventFactory(sessionId: string, correlationId: string, taskId?: string) {
  return function buildEvent(event: Record<string, unknown>): AgentTimelineEvent {
    return {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      sessionId,
      taskId: (event.taskId as string | undefined) ?? taskId,
      correlationId,
      timestamp: new Date().toISOString(),
    } as AgentTimelineEvent
  }
}

function toIntentResult(turn: ConversationTurnResult): IntentResult {
  return {
    type: turn.mode,
    confidence: turn.confidence,
    requiresAction: Boolean(turn.requiresAction),
    userGoal: turn.userGoal,
    constraints: turn.constraints,
  }
}

export async function handleUnifiedConversationTurn(deps: UnifiedTurnDeps): Promise<{
  turn: ConversationTurnResult
  result: HandleUserTurnResult
  timelineEvents: AgentTimelineEvent[]
}> {
  const rawText = String(deps.rawText || '').trim()
  const sessionId = deps.latestRun?.sessionId || deps.workspaceId || 'session_local'
  const correlationId = `corr_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
  const buildEvent = createEventFactory(sessionId, correlationId)
  const timelineEvents: AgentTimelineEvent[] = []
  const recentMessages = deps.memoryStore.getRecentMessages?.(sessionId) || []
  let agentState: AgentState = 'idle'
  const moveState = (next: AgentState, taskId?: string) => {
    agentState = assertAgentTransition(agentState, next)
    timelineEvents.push(buildEvent({ type: 'agent.mode.changed', mode: next, taskId }))
  }

  timelineEvents.push(buildEvent({ type: 'message.received', message: rawText, workspaceId: deps.workspaceId }))
  moveState('thinking')

  if (deps.memoryStore.processTurnMemory) {
    await deps.memoryStore.processTurnMemory({
      workspaceId: deps.workspaceId,
      sessionId,
      userMessage: rawText,
      assistantMessage: '',
    })
  } else {
    const extractedMemories = memoryExtractor.extract({
      userMessage: rawText,
      assistantMessage: '',
      workspaceId: deps.workspaceId,
    })
    for (const entry of extractedMemories.filter((entry) => entry.kind !== 'conversation_fact')) {
      deps.memoryStore.upsertOperationalMemory({
        scope: entry.scope,
        kind: entry.kind,
        content: entry.content,
        workspaceId: entry.workspaceId,
        source: entry.source,
        salience: entry.salience,
        tags: entry.tags,
        metadata: entry.metadata,
      })
    }
  }
  if (/\b(keep responses short|keep it short|be concise|prefer concise|short answers)\b/.test(rawText.toLowerCase())) {
    deps.memoryStore.updateProfile({ tonePreference: 'concise' })
  }

  const routedTurn = routeConversationTurn({
    rawText,
    workspaceId: deps.workspaceId,
    latestRun: deps.latestRun || null,
  })
  const memoryHints = retrieveRelevantMemories(rawText, deps.memoryStore, deps.workspaceId, sessionId)
    .filter((entry) => !entry.status || entry.status === 'approved')
    .map((entry) => entry.content)
  const constraints = [...new Set([...(routedTurn.constraints || []), ...mergeConstraints(rawText, deps.memoryStore, deps.workspaceId, sessionId)])]
  const conversationReply = await buildConversationReply({
    routedTurn: {
      ...routedTurn,
      constraints,
    },
    workspaceLabel: deps.workspaceId || 'this workspace',
    latestRun: deps.latestRun || null,
  })

  timelineEvents.push(buildEvent({
    type: 'intent.resolved',
    intent: routedTurn.mode,
    confidence: routedTurn.confidence,
    requiresAction: Boolean(routedTurn.requiresAction),
  }))
  moveState('responding')

  const memoryLead = memoryHints.length > 0 || recentMessages.length > 0
    ? `${buildConstraintLead(constraints)}${constraints.includes('use_pnpm') || constraints.includes('do_not_touch_tests') || constraints.includes('prefer_concise') ? '' : recentMessages.length > 0 ? 'I’m continuing from our recent context here. ' : 'I’m using what I remember about this workspace and your preferences. '}`
    : buildConstraintLead(constraints)
  let assistantReply = `${memoryLead}${conversationReply.message}`.trim()
  let planPreview: ConversationPlanPreview | undefined
  let permissionRequest: { required: boolean; reason: string; actions: string[] } | undefined
  let task: Awaited<ReturnType<typeof taskController.start>> | undefined

  if (routedTurn.requiresAction && deps.workspaceId) {
    moveState('planning')
    planPreview = await deps.buildPlan(routedTurn.userGoal || rawText, deps.workspaceId)
    task = await taskController.start(planPreview)
    timelineEvents.push(buildEvent({
      taskId: task.id,
      type: 'plan.created',
      planId: planPreview.id,
      goal: routedTurn.userGoal || rawText,
      stepCount: Array.isArray(planPreview.steps) ? planPreview.steps.length : 0,
    }))
    const requiresApproval = planPreview.steps.some((step) => step.requires_confirmation) || constraints.includes('do_not_touch_tests')
    if (requiresApproval || routedTurn.allowedNextAction === 'plan') {
      permissionRequest = {
        required: true,
        reason: constraints.includes('do_not_touch_tests')
          ? 'This turn carries a test-edit constraint, so I’m keeping execution review-first.'
          : 'This plan includes steps that need approval before execution.',
        actions: ['review_plan', 'approve_execution'],
      }
      moveState('awaiting_permission', task.id)
      timelineEvents.push(buildEvent({
        taskId: task.id,
        type: 'permission.required',
        reason: permissionRequest.reason,
        actions: permissionRequest.actions,
      }))
    } else {
      moveState('executing', task.id)
    }
  } else {
    moveState('completed')
  }

  if (deps.memoryStore.processTurnMemory) {
    await deps.memoryStore.processTurnMemory({
      workspaceId: deps.workspaceId,
      sessionId,
      userMessage: rawText,
      assistantMessage: assistantReply,
    })
  } else {
    for (const entry of memoryExtractor.extract({
      userMessage: rawText,
      assistantMessage: assistantReply,
      workspaceId: deps.workspaceId,
    })) {
      deps.memoryStore.upsertOperationalMemory({
        scope: entry.scope,
        kind: entry.kind,
        content: entry.content,
        workspaceId: entry.workspaceId,
        source: entry.source,
        salience: entry.salience,
        tags: entry.tags,
        metadata: entry.metadata,
      })
    }
  }

  deps.memoryStore.recordConversationTurn({
    sessionId,
    workspaceId: deps.workspaceId,
    userMessage: rawText,
    assistantReply,
  })

  const turn: ConversationTurnResult = {
    ...routedTurn,
    constraints,
    assistantReply,
    planPreview,
    permissionRequest,
    taskStarted: Boolean(task?.started),
  }

  const result: HandleUserTurnResult = {
    assistantReply,
    intent: toIntentResult(turn),
    task: task
      ? {
          id: task.id,
          started: task.started,
          planPreview,
        }
      : undefined,
    permissionRequest: permissionRequest
      ? {
          reason: permissionRequest.reason,
          actions: permissionRequest.actions,
        }
      : undefined,
  }

  return {
    turn,
    result,
    timelineEvents,
  }
}
