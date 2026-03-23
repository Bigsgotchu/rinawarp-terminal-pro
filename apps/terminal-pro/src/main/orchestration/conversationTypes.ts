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

export type AllowedNextAction = 'reply_only' | 'inspect' | 'plan' | 'execute' | 'clarify'

export type RoutedTurn = {
  rawText: string
  mode: ConversationMode
  confidence: number
  workspaceId?: string
  references: {
    runId?: string
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
}

export type ConversationRunReference = {
  runId?: string
  sessionId?: string
  latestCommand?: string
  latestExitCode?: number | null
  latestReceiptId?: string
  interrupted?: boolean
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
