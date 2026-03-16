/**
 * Rina OS Control Layer - Conversation Memory (Short-Term)
 *
 * Stores recent conversation context for immediate recall.
 * This is the short-term memory layer that maintains dialogue history
 * within the current conversation session.
 *
 * Additive architecture - does not modify existing core functionality.
 */

export interface ConversationEntry {
  role: 'user' | 'rina'
  text: string
  timestamp: number
  intent?: string
}

/**
 * ConversationMemory - Short-term memory for current conversation
 *
 * Features:
 * - Stores recent conversation entries (user and Rina)
 * - Configurable max entries to prevent memory bloat
 * - Quick access to conversation history
 * - Clear functionality for starting fresh
 */
export class ConversationMemory {
  private history: ConversationEntry[] = []
  private maxEntries: number

  constructor(maxEntries: number = 50) {
    this.maxEntries = maxEntries
  }

  /**
   * Add an entry to conversation history
   */
  add(role: 'user' | 'rina', text: string, intent?: string): void {
    this.history.push({
      role,
      text,
      timestamp: Date.now(),
      intent,
    })

    // Maintain maximum size
    if (this.history.length > this.maxEntries) {
      this.history.shift()
    }
  }

  /**
   * Add user message
   */
  addUser(text: string, intent?: string): void {
    this.add('user', text, intent)
  }

  /**
   * Add Rina response
   */
  addRina(text: string, intent?: string): void {
    this.add('rina', text, intent)
  }

  /**
   * Get full conversation history
   */
  getHistory(): ConversationEntry[] {
    return [...this.history]
  }

  /**
   * Get recent conversation entries
   */
  getRecent(count: number = 10): ConversationEntry[] {
    return this.history.slice(-count)
  }

  /**
   * Get the last user message
   */
  getLastUserMessage(): string | null {
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].role === 'user') {
        return this.history[i].text
      }
    }
    return null
  }

  /**
   * Get the last Rina response
   */
  getLastRinaResponse(): string | null {
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].role === 'rina') {
        return this.history[i].text
      }
    }
    return null
  }

  /**
   * Get conversation as formatted string for AI context
   */
  getContextString(): string {
    return this.history
      .slice(-20) // Last 20 entries
      .map((entry) => `[${entry.role}]: ${entry.text}`)
      .join('\n')
  }

  /**
   * Search conversation history
   */
  search(keyword: string): ConversationEntry[] {
    const lower = keyword.toLowerCase()
    return this.history.filter((entry) => entry.text.toLowerCase().includes(lower))
  }

  /**
   * Get total entry count
   */
  getCount(): number {
    return this.history.length
  }

  /**
   * Clear conversation history
   */
  clear(): void {
    this.history = []
  }

  /**
   * Set maximum entries
   */
  setMaxEntries(max: number): void {
    this.maxEntries = max
    while (this.history.length > this.maxEntries) {
      this.history.shift()
    }
  }
}

// Singleton instance for easy access
export const conversationMemory = new ConversationMemory()
