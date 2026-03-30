export type ConversationMode =
  | 'chat'
  | 'help'
  | 'question'
  | 'inspect'
  | 'execute'
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
  executionCandidate?: {
    goal: string
    target?: string
    constraints?: string[]
    risk: 'low' | 'medium' | 'high'
  }
  context?: ConversationContext
  replyPlan?: ReplyPlan
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
