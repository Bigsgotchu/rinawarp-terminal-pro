import type { MemoryExtractor } from './MemoryExtractor.js'
import { rankMemories } from './MemoryRetrieval.js'
import type { MemoryStore } from './MemoryStoreContract.js'
import type { MemoryEngine } from './MemoryEngine.js'
import type { MemoryEntry, TaskOutcomeInput } from './memoryTypes.js'

export class SqliteMemoryEngine implements MemoryEngine {
  constructor(
    private readonly store: MemoryStore,
    private readonly extractor: MemoryExtractor,
  ) {}

  async init(): Promise<void> {
    await this.store.init()
  }

  async retrieveRelevantMemory(input: {
    userId: string
    workspaceId?: string
    sessionId?: string
    query: string
    limit?: number
  }): Promise<MemoryEntry[]> {
    const candidates = await this.store.queryMemory({
      userId: input.userId,
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      text: input.query,
      statuses: ['approved', 'suggested'],
      scopes: ['user', 'workspace', 'episode', 'session'],
      limit: Math.max((input.limit ?? 8) * 3, 20),
    })
    const ranked = rankMemories({
      items: candidates,
      workspaceId: input.workspaceId,
      query: input.query,
    }).slice(0, input.limit ?? 8)

    for (const item of ranked) {
      await this.store.markMemoryUsed(item.id)
    }

    return ranked
  }

  async captureConversationTurn(input: {
    sessionId: string
    userId: string
    workspaceId?: string | null
    userMessage: string
    assistantMessage: string
  }): Promise<void> {
    await this.store.saveConversationTurn(input)
  }

  async processTurnMemory(input: {
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
  }): Promise<MemoryEntry[]> {
    const suggestions = await this.extractor.extract({
      userId: input.userId,
      workspaceId: input.workspaceId,
      sessionId: input.sessionId,
      userMessage: input.userMessage,
      assistantMessage: input.assistantMessage,
      taskResult: input.taskResult,
    })
    const saved: MemoryEntry[] = []

    for (const suggestion of suggestions) {
      const entry = await this.store.upsertMemory({
        scope: suggestion.scope,
        kind: suggestion.kind,
        status: suggestion.status,
        userId: input.userId,
        workspaceId: input.workspaceId ?? null,
        sessionId: input.sessionId ?? null,
        content: suggestion.content,
        normalizedKey: suggestion.normalizedKey ?? null,
        salience: suggestion.salience,
        confidence: suggestion.confidence,
        source: suggestion.source,
        tags: suggestion.tags,
        metadata: suggestion.metadata,
      })
      saved.push(entry)
    }

    return saved
  }

  async recordTaskOutcome(input: TaskOutcomeInput): Promise<MemoryEntry> {
    return this.store.recordTaskOutcome(input)
  }

  async approveMemory(memoryId: string, reviewerUserId: string): Promise<void> {
    await this.store.approveMemory(memoryId, reviewerUserId)
  }

  async rejectMemory(memoryId: string, reviewerUserId: string): Promise<void> {
    await this.store.rejectMemory(memoryId, reviewerUserId)
  }

  async getRecentMessages(sessionId: string): Promise<Array<{
    role: 'user' | 'assistant'
    text: string
    createdAt: string
  }>> {
    const turns = await this.store.getRecentConversationTurns(sessionId, 20)
    const messages: Array<{ role: 'user' | 'assistant'; text: string; createdAt: string }> = []
    for (const turn of turns) {
      messages.push({ role: 'user', text: turn.userMessage, createdAt: turn.createdAt })
      messages.push({ role: 'assistant', text: turn.assistantMessage, createdAt: turn.createdAt })
    }
    return messages
  }
}
