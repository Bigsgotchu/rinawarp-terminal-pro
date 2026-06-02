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

// Patterns for sensitive data that should never be stored in memory
const SENSITIVE_PATTERNS = [
  /sk_live_[a-zA-Z0-9]+/,
  /sk_test_[a-zA-Z0-9]+/,
  /sk__[a-zA-Z0-9]+/,
  /api[_-]?key\s*[=:]\s*[a-zA-Z0-9_\-]+/i,
  /bearer\s+[a-zA-Z0-9_\-\.]+/i,
  /password\s*[=:]\s*\S+/i,
  /secret\s*[=:]\s*\S+/i,
  /token\s*[=:]\s*[a-zA-Z0-9_\-]+/i,
  /aws[_-]?access[_-]?key[_-]?id/i,
  /aws[_-]?secret[_-]?access[_-]?key/i,
  /private[_-]?key/i,
]

/**
 * Checks if content contains sensitive data that should be redacted
 */
function containsSensitiveData(content: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(content))
}

/**
 * Redacts sensitive data from content while preserving context
 */
function redactContent(content: string): string {
  let redacted = content
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]')
  }
  return redacted
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

      // Never store sensitive data
      if (containsSensitiveData(userMessage)) {
        return memories
      }

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
        // Redact sensitive data from task result summary
        const safeSummary = containsSensitiveData(input.taskResult.summary)
          ? redactContent(input.taskResult.summary)
          : input.taskResult.summary

        memories.push({
          scope: 'episode',
          kind: 'task_outcome',
          content: `${input.taskResult.title || 'Task'}: ${safeSummary}`,
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
