export type MemoryScope = 'session' | 'user' | 'workspace' | 'episode'

export type MemoryKind = 'preference' | 'constraint' | 'project_fact' | 'task_outcome' | 'conversation_fact'

export type MemoryStatus = 'approved' | 'suggested' | 'rejected'

export type WorkspaceFactCategory =
  | 'architecture'
  | 'dependency'
  | 'convention'
  | 'preference'
  | 'recurring_failure'
  | 'runtime_fact'

export type WorkspaceFactSource = 'user' | 'runtime' | 'proof' | 'config' | 'inferred'

export type WorkspaceFactConfidence = 'high' | 'medium' | 'low'

export interface WorkspaceFact {
  id: string
  key: string
  value: string
  category: WorkspaceFactCategory
  source: WorkspaceFactSource
  confidence: WorkspaceFactConfidence
  last_verified_at: string | null
  created_at: string
  updated_at: string
}

export type WorkspaceFactInput = {
  id?: string
  key: string
  value: string
  category: WorkspaceFactCategory
  source: WorkspaceFactSource
  confidence?: WorkspaceFactConfidence
  last_verified_at?: string | null
  created_at?: string
  updated_at?: string
}

export type WorkspaceFactClassificationInput = {
  key: string
  value: string
  source?: WorkspaceFactSource
}

export type WorkspaceFactClassification = {
  category: WorkspaceFactCategory
  confidence: WorkspaceFactConfidence
}

export const WORKSPACE_FACT_CATEGORIES: readonly WorkspaceFactCategory[] = [
  'architecture',
  'dependency',
  'convention',
  'preference',
  'recurring_failure',
  'runtime_fact',
]

export const WORKSPACE_FACT_SOURCES: readonly WorkspaceFactSource[] = ['user', 'runtime', 'proof', 'config', 'inferred']

export const WORKSPACE_FACT_CONFIDENCE_LEVELS: readonly WorkspaceFactConfidence[] = ['high', 'medium', 'low']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function workspaceFactTimestamp(): string {
  return new Date().toISOString()
}

function workspaceFactId(): string {
  return `workspace_fact_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 10)}`
}

export function isWorkspaceFactCategory(value: unknown): value is WorkspaceFactCategory {
  return WORKSPACE_FACT_CATEGORIES.includes(value as WorkspaceFactCategory)
}

export function isWorkspaceFactSource(value: unknown): value is WorkspaceFactSource {
  return WORKSPACE_FACT_SOURCES.includes(value as WorkspaceFactSource)
}

export function isWorkspaceFactConfidence(value: unknown): value is WorkspaceFactConfidence {
  return WORKSPACE_FACT_CONFIDENCE_LEVELS.includes(value as WorkspaceFactConfidence)
}

export function isWorkspaceFact(value: unknown): value is WorkspaceFact {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.key === 'string' &&
    typeof value.value === 'string' &&
    isWorkspaceFactCategory(value.category) &&
    isWorkspaceFactSource(value.source) &&
    isWorkspaceFactConfidence(value.confidence) &&
    (typeof value.last_verified_at === 'string' || value.last_verified_at === null) &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string'
  )
}

function factText(input: WorkspaceFactClassificationInput): string {
  return `${input.key || ''} ${input.value || ''}`.toLowerCase()
}

function includesAny(text: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern))
}

export function classifyWorkspaceFact(input: WorkspaceFactClassificationInput): WorkspaceFactClassification {
  const text = factText(input)

  if (input.source === 'proof') {
    return { category: 'runtime_fact', confidence: 'high' }
  }
  if (input.source === 'runtime') {
    return { category: 'runtime_fact', confidence: 'high' }
  }

  if (
    includesAny(text, [
      'repeated build error',
      'repeated build errors',
      'repeated runtime failure',
      'repeated runtime failures',
      'repeated test failure',
      'repeated test failures',
    ])
  ) {
    return { category: 'recurring_failure', confidence: 'high' }
  }

  if (includesAny(text, ['user preference', 'coding preference', 'workflow preference'])) {
    return { category: 'preference', confidence: input.source === 'user' ? 'high' : 'medium' }
  }

  if (includesAny(text, ['naming', 'lint', 'formatting', 'commit', 'branch'])) {
    return { category: 'convention', confidence: input.source === 'user' ? 'high' : 'medium' }
  }

  if (includesAny(text, ['package', 'dependency', 'database', 'auth', 'provider'])) {
    return { category: 'dependency', confidence: input.source === 'config' ? 'high' : 'medium' }
  }

  if (includesAny(text, ['framework', 'runtime', 'architecture', 'ui', 'shell', 'agent'])) {
    return { category: 'architecture', confidence: input.source === 'config' ? 'high' : 'medium' }
  }

  return { category: 'runtime_fact', confidence: 'low' }
}

export function createWorkspaceFact(input: WorkspaceFactInput): WorkspaceFact {
  const key = String(input.key || '').trim()
  if (!key) throw new Error('WorkspaceFact key is required')

  const value = String(input.value || '').trim()
  if (!value) throw new Error('WorkspaceFact value is required')

  if (!isWorkspaceFactCategory(input.category)) {
    throw new Error(`Invalid WorkspaceFact category: ${String(input.category)}`)
  }
  if (!isWorkspaceFactSource(input.source)) {
    throw new Error(`Invalid WorkspaceFact source: ${String(input.source)}`)
  }

  const confidence = input.confidence ?? 'medium'
  if (!isWorkspaceFactConfidence(confidence)) {
    throw new Error(`Invalid WorkspaceFact confidence: ${String(confidence)}`)
  }

  const timestamp = workspaceFactTimestamp()
  return {
    id: String(input.id || '').trim() || workspaceFactId(),
    key,
    value,
    category: input.category,
    source: input.source,
    confidence,
    last_verified_at: input.last_verified_at ?? null,
    created_at: input.created_at ?? timestamp,
    updated_at: input.updated_at ?? timestamp,
  }
}

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
