/**
 * Rina OS Control Layer - Memory System
 *
 * Session memory that stores conversation history and context.
 * Used by the brain to maintain context across interactions.
 *
 * Additive architecture - does not modify existing core functionality.
 */

export type MemoryRole = 'user' | 'rina' | 'system'

export interface MemoryEntry {
  role: MemoryRole
  message: string
  timestamp: number
  metadata?: Record<string, unknown>
}

/**
 * In-memory session storage
 * In production, this could be persisted to localStorage or a database
 */
const sessionMemory: MemoryEntry[] = []

const MAX_MEMORY_ENTRIES = 100

/**
 * Add an entry to session memory
 */
export function remember(role: MemoryRole, message: string, metadata?: Record<string, unknown>): void {
  sessionMemory.push({
    role,
    message,
    timestamp: Date.now(),
    metadata,
  })

  // Maintain maximum size
  while (sessionMemory.length > MAX_MEMORY_ENTRIES) {
    sessionMemory.shift()
  }
}

/**
 * Get all memory entries
 */
export function getMemory(): readonly MemoryEntry[] {
  return [...sessionMemory]
}

/**
 * Get memory entries by role
 */
export function getMemoryByRole(role: MemoryRole): readonly MemoryEntry[] {
  return sessionMemory.filter((entry) => entry.role === role)
}

/**
 * Get recent memory entries
 */
export function getRecentMemory(count: number = 10): readonly MemoryEntry[] {
  return sessionMemory.slice(-count)
}

/**
 * Get the last user message
 */
export function getLastUserMessage(): string | null {
  for (let i = sessionMemory.length - 1; i >= 0; i--) {
    if (sessionMemory[i].role === 'user') {
      return sessionMemory[i].message
    }
  }
  return null
}

/**
 * Get the last Rina response
 */
export function getLastRinaResponse(): string | null {
  for (let i = sessionMemory.length - 1; i >= 0; i--) {
    if (sessionMemory[i].role === 'rina') {
      return sessionMemory[i].message
    }
  }
  return null
}

/**
 * Clear session memory
 */
export function clearMemory(): void {
  sessionMemory.length = 0
}

/**
 * Get memory as a formatted string for AI context
 */
export function getMemoryContext(): string {
  return sessionMemory
    .slice(-20) // Last 20 entries
    .map((entry) => `[${entry.role}]: ${entry.message}`)
    .join('\n')
}

/**
 * Memory statistics
 */
export function getMemoryStats(): {
  totalEntries: number
  userMessages: number
  rinaResponses: number
  oldestEntry: number | null
  newestEntry: number | null
} {
  const userMessages = sessionMemory.filter((e) => e.role === 'user').length
  const rinaResponses = sessionMemory.filter((e) => e.role === 'rina').length

  return {
    totalEntries: sessionMemory.length,
    userMessages,
    rinaResponses,
    oldestEntry: sessionMemory[0]?.timestamp ?? null,
    newestEntry: sessionMemory[sessionMemory.length - 1]?.timestamp ?? null,
  }
}

/**
 * Search memory for keyword
 */
export function searchMemory(keyword: string): readonly MemoryEntry[] {
  const lower = keyword.toLowerCase()
  return sessionMemory.filter((entry) => entry.message.toLowerCase().includes(lower))
}
