/**
 * Rina OS Control Layer - User Preferences Memory
 *
 * Stores user preferences and learning data.
 * Remembers which tools users prefer and their execution mode.
 *
 * Additive architecture - does not modify existing core functionality.
 */

import type { ExecutionMode } from '../brain.js'

/**
 * User memory data
 */
export type UserMemory = {
  lastUsedTools: string[]
  preferredExecutionMode: ExecutionMode
  commandHistory: string[]
  successfulCommands: string[]
  failedCommands: string[]
  totalSessions: number
  lastSessionTimestamp: number
}

/**
 * Default user memory
 */
const DEFAULT_USER_MEMORY: UserMemory = {
  lastUsedTools: [],
  preferredExecutionMode: 'assist',
  commandHistory: [],
  successfulCommands: [],
  failedCommands: [],
  totalSessions: 0,
  lastSessionTimestamp: 0,
}

/**
 * User Memory Store - Persists user preferences
 */
export class UserMemoryStore {
  private memory: UserMemory
  private storageKey = 'rinawarp:user_memory:v1'
  private maxHistoryLength = 100
  private maxToolHistory = 20

  constructor() {
    this.memory = this.loadFromStorage()
  }

  /**
   * Load memory from localStorage
   */
  private loadFromStorage(): UserMemory {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_USER_MEMORY, ...parsed }
      }
    } catch (err) {
      console.error('Failed to load user memory:', err)
    }
    return { ...DEFAULT_USER_MEMORY }
  }

  /**
   * Save memory to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.memory))
    } catch (err) {
      console.error('Failed to save user memory:', err)
    }
  }

  /**
   * Get all memory
   */
  getMemory(): Readonly<UserMemory> {
    return { ...this.memory }
  }

  /**
   * Record tool usage
   */
  recordToolUse(toolId: string): void {
    // Add to front of list
    this.memory.lastUsedTools = [toolId, ...this.memory.lastUsedTools.filter((t) => t !== toolId)].slice(
      0,
      this.maxToolHistory
    )

    this.saveToStorage()
  }

  /**
   * Record multiple tool usages (from agent results)
   */
  recordToolUses(toolIds: string[]): void {
    for (const toolId of toolIds) {
      this.recordToolUse(toolId)
    }
  }

  /**
   * Set preferred execution mode
   */
  setPreferredMode(mode: ExecutionMode): void {
    this.memory.preferredExecutionMode = mode
    this.saveToStorage()
  }

  /**
   * Record command execution
   */
  recordCommand(command: string, success: boolean): void {
    // Add to history
    this.memory.commandHistory = [command, ...this.memory.commandHistory].slice(0, this.maxHistoryLength)

    if (success) {
      this.memory.successfulCommands = [command, ...this.memory.successfulCommands.filter((c) => c !== command)].slice(
        0,
        this.maxHistoryLength
      )
    } else {
      this.memory.failedCommands = [command, ...this.memory.failedCommands.filter((c) => c !== command)].slice(
        0,
        this.maxHistoryLength
      )
    }

    this.saveToStorage()
  }

  /**
   * Get most used tools
   */
  getPreferredTools(count: number = 5): string[] {
    return this.memory.lastUsedTools.slice(0, count)
  }

  /**
   * Get most successful commands
   */
  getSuccessfulCommands(count: number = 10): string[] {
    return this.memory.successfulCommands.slice(0, count)
  }

  /**
   * Get commands to avoid (failed ones)
   */
  getCommandsToAvoid(count: number = 10): string[] {
    return this.memory.failedCommands.slice(0, count)
  }

  /**
   * Increment session count
   */
  recordSession(): void {
    this.memory.totalSessions++
    this.memory.lastSessionTimestamp = Date.now()
    this.saveToStorage()
  }

  /**
   * Get preferred execution mode
   */
  getPreferredMode(): ExecutionMode {
    return this.memory.preferredExecutionMode
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalSessions: number
    preferredTools: string[]
    commandCount: number
    successRate: number
  } {
    const totalCommands = this.memory.commandHistory.length
    const successCount = this.memory.successfulCommands.length
    const successRate = totalCommands > 0 ? successCount / totalCommands : 0

    return {
      totalSessions: this.memory.totalSessions,
      preferredTools: this.memory.lastUsedTools.slice(0, 5),
      commandCount: totalCommands,
      successRate,
    }
  }

  /**
   * Clear all memory
   */
  clearMemory(): void {
    this.memory = { ...DEFAULT_USER_MEMORY }
    this.saveToStorage()
  }
}

// Singleton instance
export const userMemory = new UserMemoryStore()
