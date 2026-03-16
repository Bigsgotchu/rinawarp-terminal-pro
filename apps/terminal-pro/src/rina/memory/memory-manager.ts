/**
 * Rina OS Control Layer - Memory Manager
 *
 * Unified interface for all three memory layers:
 * - Conversation (short-term): Current conversation context
 * - Workspace (session): Current workspace/project information
 * - Long-term (persistent): Learned preferences and patterns
 *
 * Additive architecture - does not modify existing core functionality.
 */

import { ConversationMemory, conversationMemory } from './conversation.js'
import { WorkspaceMemory, workspaceMemory } from './workspace.js'
import { LongTermMemory, longtermMemory } from './longterm.js'

export interface MemoryStats {
  conversation: {
    entries: number
    userMessages: number
    rinaResponses: number
  }
  workspace: {
    hasRoot: boolean
    root?: string
    projectType?: string
    commandCount: number
  }
  longterm: {
    preferredCommands: number
    knownProjects: number
    preferences: number
    sessions: number
  }
}

/**
 * MemoryManager - Unified memory system
 *
 * Provides a single interface to access all memory layers:
 * - conversation: Short-term conversation memory
 * - workspace: Session-based workspace memory
 * - longterm: Persistent learning memory
 */
export class MemoryManager {
  conversation: ConversationMemory
  workspace: WorkspaceMemory
  longterm: LongTermMemory

  constructor() {
    // Use singleton instances for each layer
    this.conversation = conversationMemory
    this.workspace = workspaceMemory
    this.longterm = longtermMemory

    // Record session start in long-term memory
    this.longterm.recordSession()
  }

  /**
   * Get comprehensive memory statistics
   */
  getStats(): MemoryStats {
    const convHistory = this.conversation.getHistory()
    const userMessages = convHistory.filter((e) => e.role === 'user').length
    const rinaResponses = convHistory.filter((e) => e.role === 'rina').length
    const workspaceData = this.workspace.get()
    const longtermData = this.longterm.get()

    return {
      conversation: {
        entries: convHistory.length,
        userMessages,
        rinaResponses,
      },
      workspace: {
        hasRoot: !!workspaceData.root,
        root: workspaceData.root,
        projectType: workspaceData.projectType,
        commandCount: workspaceData.lastCommands.length,
      },
      longterm: {
        preferredCommands: Object.keys(longtermData.preferredCommands).length,
        knownProjects: longtermData.knownProjects.length,
        preferences: Object.keys(longtermData.userPreferences).length,
        sessions: longtermData.sessionCount,
      },
    }
  }

  /**
   * Get complete context string for AI
   */
  getContextString(): string {
    const parts: string[] = []

    // Add conversation context
    const convContext = this.conversation.getContextString()
    if (convContext) {
      parts.push('=== Conversation Context ===')
      parts.push(convContext)
    }

    // Add workspace context
    const workspaceContext = this.workspace.getContextString()
    if (workspaceContext) {
      parts.push('\n=== Workspace Context ===')
      parts.push(workspaceContext)
    }

    // Add long-term context
    const longtermContext = this.longterm.getContextString()
    if (longtermContext) {
      parts.push('\n=== Learned Context ===')
      parts.push(longtermContext)
    }

    return parts.join('\n')
  }

  /**
   * Learn from successful command execution
   */
  learnFromCommand(intent: string, command: string, success: boolean = true): void {
    if (success) {
      // Learn in long-term memory
      this.longterm.rememberCommand(intent, command)

      // Also record in workspace
      this.workspace.recordCommand(command, intent, success)
    }
  }

  /**
   * Learn project information
   */
  learnProject(root: string, projectType?: string): void {
    // Set workspace root
    this.workspace.setWorkspace(root)

    // Remember in long-term
    this.longterm.rememberProject(root)

    if (projectType) {
      this.workspace.setProjectType(projectType)
    }
  }

  /**
   * Clear all memory layers
   */
  clearAll(): void {
    this.conversation.clear()
    this.workspace.clear()
    // Don't clear long-term - it's persistent
  }

  /**
   * Clear only session-based memory (conversation + workspace)
   */
  clearSession(): void {
    this.conversation.clear()
    this.workspace.clear()
  }

  /**
   * Check if this is a returning user
   */
  isReturningUser(): boolean {
    return this.longterm.getSessionCount() > 1
  }

  /**
   * Get welcome message based on memory
   */
  getWelcomeMessage(): string {
    const sessions = this.longterm.getSessionCount()
    const projects = this.longterm.getKnownProjects()
    const workspaceRoot = this.workspace.getWorkspace()

    if (sessions <= 1) {
      return "Welcome! I'm Rina, your AI assistant. Let's get started!"
    }

    const parts: string[] = [`Welcome back! You've had ${sessions} sessions with me.`]

    if (projects.length > 0) {
      const lastProject = projects[projects.length - 1]
      parts.push(`You were working on: ${lastProject}`)
    }

    if (workspaceRoot) {
      parts.push(`Current workspace: ${workspaceRoot}`)
    }

    return parts.join(' ')
  }

  /**
   * Get preferred command if learned
   */
  getLearnedCommand(intent: string): string | null {
    return this.longterm.getPreferredCommand(intent)
  }

  /**
   * Search across all memory layers
   */
  search(keyword: string): {
    conversation: import('./conversation.js').ConversationEntry[]
    workspace: import('./workspace.js').CommandRecord[]
    longterm: { commands: Record<string, string>; projects: string[] }
  } {
    return {
      conversation: this.conversation.search(keyword),
      workspace: this.workspace
        .getAllCommands()
        .filter(
          (c) =>
            c.command.toLowerCase().includes(keyword.toLowerCase()) ||
            c.intent.toLowerCase().includes(keyword.toLowerCase())
        ),
      longterm: {
        commands: Object.fromEntries(
          Object.entries(this.longterm.getAllPreferredCommands()).filter(
            ([k, v]) => k.includes(keyword.toLowerCase()) || v.toLowerCase().includes(keyword.toLowerCase())
          )
        ),
        projects: this.longterm.getKnownProjects().filter((p) => p.toLowerCase().includes(keyword.toLowerCase())),
      },
    }
  }
}

// Singleton instance for easy access
export const memoryManager = new MemoryManager()

// Re-export all memory types for convenience
export { conversationMemory, workspaceMemory, longtermMemory }
export type { ConversationMemory as ConversationMemoryClass } from './conversation.js'
export type { WorkspaceMemory as WorkspaceMemoryClass, CommandRecord } from './workspace.js'
export type { LongTermMemory as LongTermMemoryClass } from './longterm.js'
