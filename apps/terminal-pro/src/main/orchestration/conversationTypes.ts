export type ConversationMode =
  | 'chat'
  | 'help'
  | 'question'
  | 'inspect'
  | 'execute'
  | 'mixed'
  | 'self_check'
  | 'follow_up'
  | 'recovery'
  | 'settings'
  | 'memory_update'
  | 'unclear'

export type TurnType = 'greeting' | 'help' | 'follow_up' | 'diagnose' | 'action' | 'explain' | 'frustration' | 'clarify_needed'

export type ReplyMode = 'reply_only' | 'explain_verified' | 'ask_once' | 'plan' | 'run'

export type Tone = 'normal' | 'supportive' | 'corrective'

export type AllowedNextAction = 'reply_only' | 'inspect' | 'plan' | 'execute' | 'clarify'

export type ConversationRunIntent = 'self_check' | 'build' | 'test' | 'deploy' | 'fix' | 'inspect' | 'command' | 'unknown'

export type ConversationOutcome = 'succeeded' | 'failed' | 'interrupted' | 'running' | 'unknown' | 'none'

export type ConversationAnchor = {
  workspaceRoot: string | null
  runId: string | null
  receiptId: string | null
}

export type ConversationContext = {
  workspaceRoot: string | null
  latestRunId: string | null
  latestReceiptId: string | null
  latestRecoverySessionId: string | null
  latestIntent: ConversationRunIntent
  latestOutcome: ConversationOutcome
  latestActionSummary: string | null
  hasVerifiedRun: boolean
  hasAnyAnchor: boolean
}

export type ReplyPlan = {
  turnType: TurnType
  anchor: ConversationAnchor
  mode: ReplyMode
  tone: Tone
  shouldStartRun: boolean
}

export type RoutedTurn = {
  rawText: string
  mode: ConversationMode
  turnType?: TurnType
  confidence: number
  workspaceId?: string
  references: {
    runId?: string
    receiptId?: string
    priorMessageId?: string
    restoredSessionId?: string
  }
  allowedNextAction: AllowedNextAction
  clarification?: {
    required: boolean
    reason?: string
    question?: string
  }
  requiresAction?: boolean
  userGoal?: string
  constraints?: string[]
  executionCandidate?: {
    goal: string
    target?: string
    constraints?: string[]
    risk: 'low' | 'medium' | 'high'
  }
  context?: ConversationContext
  replyPlan?: ReplyPlan
}

export type ConversationPlanStep = {
  stepId: string
  tool: string
  input: {
    command: string
    cwd?: string
    timeoutMs?: number
  }
  risk: 'inspect' | 'safe-write' | 'high-impact'
  risk_level: 'low' | 'medium' | 'high'
  requires_confirmation: boolean
  description: string
}

export type ConversationPlanPreview = {
  id: string
  reasoning: string
  steps: ConversationPlanStep[]
}

export type IntentResult = {
  type: ConversationMode
  confidence: number
  requiresAction: boolean
  userGoal?: string
  constraints?: string[]
}

export type AgentState =
  | 'idle'
  | 'thinking'
  | 'responding'
  | 'planning'
  | 'awaiting_permission'
  | 'executing'
  | 'completed'
  | 'error'

export type BaseTimelineEvent = {
  id: string
  sessionId: string
  taskId?: string
  stepId?: string
  correlationId: string
  timestamp: string
}

export type AgentTimelineEvent =
  | (BaseTimelineEvent & { type: 'message.received'; message: string; workspaceId?: string })
  | (BaseTimelineEvent & { type: 'agent.mode.changed'; mode: AgentState })
  | (BaseTimelineEvent & { type: 'intent.resolved'; intent: ConversationMode; confidence: number; requiresAction: boolean })
  | (BaseTimelineEvent & {
      type: 'memory.context.applied'
      backend: 'sqlite' | 'json-fallback'
      constraintCount: number
      constraints: string[]
    })
  | (BaseTimelineEvent & { type: 'plan.created'; planId: string; goal: string; stepCount: number })
  | (BaseTimelineEvent & { type: 'permission.required'; reason: string; actions: string[] })
  | (BaseTimelineEvent & { type: 'task.completed'; summary: string })
  | (BaseTimelineEvent & { type: 'task.failed'; error: string })

export type ConversationTurnResult = RoutedTurn & {
  assistantReply: string
  planPreview?: ConversationPlanPreview
  taskStarted?: boolean
  permissionRequest?: {
    required: boolean
    reason: string
    actions?: string[]
  }
}

export interface HandleUserTurnResult {
  assistantReply: string
  intent: IntentResult
  task?: {
    id: string
    started: boolean
    planPreview?: ConversationPlanPreview
  }
  permissionRequest?: {
    reason: string
    actions: string[]
  }
}

export type ConversationRunReference = {
  runId?: string
  sessionId?: string
  latestCommand?: string
  latestExitCode?: number | null
  latestReceiptId?: string
  interrupted?: boolean
  source?: string
}

export type RouteConversationTurnArgs = {
  rawText: string
  workspaceId?: string
  latestRun?: ConversationRunReference | null
}

export type BuildConversationReplyArgs = {
  routedTurn: RoutedTurn
  workspaceLabel?: string
  latestRun?: ConversationRunReference | null
}
