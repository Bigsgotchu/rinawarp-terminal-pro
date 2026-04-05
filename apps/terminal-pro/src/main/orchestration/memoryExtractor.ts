type ExtractMemoryInput = {
  userMessage: string
  assistantMessage: string
  taskResult?: {
    title?: string
    summary?: string
    success?: boolean
  }
  workspaceId?: string
}

type ExtractedMemory = {
  scope: 'session' | 'user' | 'project' | 'episode'
  kind: 'preference' | 'constraint' | 'project_fact' | 'task_outcome' | 'conversation_fact'
  content: string
  workspaceId?: string
  salience: number
  tags: string[]
  source: 'behavior' | 'conversation'
  metadata?: Record<string, unknown>
}

export interface MemoryExtractor {
  extract(input: ExtractMemoryInput): ExtractedMemory[]
}

export function createRuleBasedMemoryExtractor(): MemoryExtractor {
  return {
    extract(input) {
      const userMessage = String(input.userMessage || '').trim()
      const assistantMessage = String(input.assistantMessage || '').trim()
      const lower = userMessage.toLowerCase()
      const memories: ExtractedMemory[] = []

      if (/\b(use pnpm|prefer pnpm)\b/.test(lower)) {
        memories.push({
          scope: 'user',
          kind: 'preference',
          content: 'Use pnpm by default.',
          salience: 0.95,
          tags: ['pnpm', 'package-manager'],
          source: 'conversation',
        })
      }
      if (/\b(keep responses short|keep it short|be concise|prefer concise|short answers)\b/.test(lower)) {
        memories.push({
          scope: 'user',
          kind: 'preference',
          content: 'Prefer concise responses.',
          salience: 0.9,
          tags: ['verbosity', 'concise'],
          source: 'conversation',
        })
      }
      if (/\b(don't touch tests|do not touch tests|don't edit tests|do not edit tests|without touching tests|without editing tests)\b/.test(lower)) {
        memories.push({
          scope: 'user',
          kind: 'constraint',
          content: 'Avoid modifying test files without explicit approval.',
          salience: 0.98,
          tags: ['tests', 'approval'],
          source: 'conversation',
        })
      }

      if (input.taskResult?.summary) {
        memories.push({
          scope: 'episode',
          kind: 'task_outcome',
          content: `${input.taskResult.title || 'Task'}: ${input.taskResult.summary}`,
          workspaceId: input.workspaceId,
          salience: input.taskResult.success ? 0.72 : 0.82,
          tags: ['task-outcome', input.taskResult.success ? 'success' : 'failure'],
          source: 'behavior',
          metadata: { success: input.taskResult.success },
        })
      }

      if (userMessage && assistantMessage) {
        memories.push({
          scope: 'session',
          kind: 'conversation_fact',
          content: `User: ${userMessage}\nAssistant: ${assistantMessage}`,
          workspaceId: input.workspaceId,
          salience: 0.35,
          tags: ['conversation'],
          source: 'conversation',
        })
      }

      return memories
    },
  }
}
