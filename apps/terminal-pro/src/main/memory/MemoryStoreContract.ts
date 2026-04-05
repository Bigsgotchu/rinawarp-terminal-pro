import type {
  ConversationTurnInput,
  MemoryEntry,
  MemoryQuery,
  MemorySaveInput,
  TaskOutcomeInput,
} from './memoryTypes.js'

export interface MemoryStore {
  init(): Promise<void>
  saveMemory(input: MemorySaveInput): Promise<MemoryEntry>
  upsertMemory(input: MemorySaveInput): Promise<MemoryEntry>
  getMemoryById(id: string): Promise<MemoryEntry | null>
  queryMemory(query: MemoryQuery): Promise<MemoryEntry[]>
  markMemoryUsed(id: string): Promise<void>
  approveMemory(memoryId: string, reviewerUserId: string): Promise<void>
  rejectMemory(memoryId: string, reviewerUserId: string): Promise<void>
  saveConversationTurn(input: ConversationTurnInput): Promise<void>
  getRecentConversationTurns(sessionId: string, limit: number): Promise<Array<{
    id: string
    sessionId: string
    userId: string
    workspaceId?: string | null
    userMessage: string
    assistantMessage: string
    createdAt: string
  }>>
  recordTaskOutcome(input: TaskOutcomeInput): Promise<MemoryEntry>
}
