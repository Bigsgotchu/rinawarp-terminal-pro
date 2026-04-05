import type { MemoryEntry, TaskOutcomeInput } from './memoryTypes.js'

export interface MemoryEngine {
  init(): Promise<void>
  retrieveRelevantMemory(input: {
    userId: string
    workspaceId?: string
    sessionId?: string
    query: string
    limit?: number
  }): Promise<MemoryEntry[]>
  captureConversationTurn(input: {
    sessionId: string
    userId: string
    workspaceId?: string | null
    userMessage: string
    assistantMessage: string
  }): Promise<void>
  processTurnMemory(input: {
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
  }): Promise<MemoryEntry[]>
  recordTaskOutcome(input: TaskOutcomeInput): Promise<MemoryEntry>
  approveMemory(memoryId: string, reviewerUserId: string): Promise<void>
  rejectMemory(memoryId: string, reviewerUserId: string): Promise<void>
  getRecentMessages(sessionId: string): Promise<Array<{
    role: 'user' | 'assistant'
    text: string
    createdAt: string
  }>>
}
