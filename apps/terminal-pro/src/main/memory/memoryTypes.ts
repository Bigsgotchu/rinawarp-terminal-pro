export type MemoryScope = 'session' | 'user' | 'workspace' | 'episode'

export type MemoryKind =
  | 'preference'
  | 'constraint'
  | 'project_fact'
  | 'task_outcome'
  | 'conversation_fact'

export type MemoryStatus = 'approved' | 'suggested' | 'rejected'

export interface MemoryEntry {
  id: string
  scope: MemoryScope
  kind: MemoryKind
  status: MemoryStatus
  userId: string
  workspaceId?: string | null
  sessionId?: string | null
  content: string
  normalizedKey?: string | null
  salience: number
  confidence: number
  source: 'user_explicit' | 'assistant_inferred' | 'task_outcome' | 'system_derived'
  tags: string[]
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
  lastUsedAt?: string | null
}

export interface MemoryQuery {
  userId: string
  workspaceId?: string
  sessionId?: string
  text?: string
  scopes?: MemoryScope[]
  kinds?: MemoryKind[]
  statuses?: MemoryStatus[]
  limit?: number
}

export interface MemorySaveInput {
  scope: MemoryScope
  kind: MemoryKind
  status: MemoryStatus
  userId: string
  workspaceId?: string | null
  sessionId?: string | null
  content: string
  normalizedKey?: string | null
  salience?: number
  confidence?: number
  source: MemoryEntry['source']
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface TaskOutcomeInput {
  userId: string
  workspaceId?: string | null
  sessionId?: string | null
  taskTitle: string
  success: boolean
  summary: string
  filesChanged?: string[]
  commandsRun?: string[]
  tags?: string[]
}

export interface ExtractMemoryInput {
  userId: string
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
}

export interface MemorySuggestion {
  scope: MemoryScope
  kind: MemoryKind
  status: MemoryStatus
  content: string
  normalizedKey?: string | null
  salience: number
  confidence: number
  source: MemoryEntry['source']
  tags: string[]
  metadata: Record<string, unknown>
}

export interface ConversationTurnInput {
  sessionId: string
  userId: string
  workspaceId?: string | null
  userMessage: string
  assistantMessage: string
}
