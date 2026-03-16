/**
 * Rina OS Control Layer - Rina Agent
 *
 * Adaptive agent that learns user preferences and prioritizes familiar tools.
 * Combines agent loop, tool registry, and user memory.
 *
 * Additive architecture - does not modify existing core functionality.
 */

import { agentLoop, type AgentResult, type AgentEvent, type AgentEventCallback } from './agent-loop.js'
import { taskQueue } from './executor/task-queue.js'
import { userMemory, type UserMemory } from './memory/user-preferences.js'
import { toolDiscovery } from './tools/discovery.js'
import { remember } from './memory/session.js'

// Context Engine integration
let contextEngine: any = null
let isContextBuilt = false

/**
 * Initialize the context engine for a project
 */
export async function initContextEngine(projectRoot: string): Promise<void> {
  try {
    // Dynamic import to avoid circular dependencies
    const { ContextEngine } = await import('@rinawarp/context')
    contextEngine = new ContextEngine()
    
    console.log('[RinaAgent] Building context index...')
    const result = await contextEngine.build(projectRoot)
    
    if (result.success) {
      console.log(`[RinaAgent] Context indexed: ${result.filesIndexed} files, ${result.terminalBlocksIndexed} terminal blocks, ${result.gitItemsIndexed} git items`)
      isContextBuilt = true
    } else {
      console.warn('[RinaAgent] Context building had errors:', result.errors)
      isContextBuilt = result.totalIndexed > 0
    }
  } catch (error) {
    console.warn('[RinaAgent] Context engine not available:', error)
    contextEngine = null
    isContextBuilt = false
  }
}

/**
 * Get relevant context for a query
 */
export async function getRelevantContext(query: string): Promise<string> {
  if (!contextEngine || !isContextBuilt) {
    return ''
  }
  
  try {
    const result = await contextEngine.query(query, 5)
    return result.formattedContext
  } catch (error) {
    console.warn('[RinaAgent] Context query failed:', error)
    return ''
  }
}

/**
 * Check if context engine is ready
 */
export function isContextReady(): boolean {
  return isContextBuilt
}

/**
 * Agent configuration
 */
export type AgentConfig = {
  autoRecordUsage: boolean
  usePreferredTools: boolean
  adaptToUser: boolean
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AgentConfig = {
  autoRecordUsage: true,
  usePreferredTools: true,
  adaptToUser: true,
}

/**
 * Rina Agent - Adaptive controller combining all systems
 */
export class RinaAgent {
  private config: AgentConfig
  private eventCallbacks: AgentEventCallback[] = []

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // Record session on creation
    userMemory.recordSession()

    // Subscribe to agent events for learning
    agentLoop.onEvent((event) => {
      this.handleAgentEvent(event)
    })
  }

  /**
   * Handle agent events for learning
   */
  private handleAgentEvent(event: AgentEvent): void {
    // Forward to callbacks
    this.emit(event)

    // Learn from events
    if (this.config.autoRecordUsage) {
      if (event.type === 'step-completed') {
        const toolUsed = event.step.step.tool
        userMemory.recordToolUse(toolUsed)

        // Record successful command
        if (event.step.step.input?.command) {
          userMemory.recordCommand(event.step.step.input.command as string, true)
        }
      }

      if (event.type === 'step-failed') {
        // Record failed command
        if (event.step.step.input?.command) {
          userMemory.recordCommand(event.step.step.input.command as string, false)
        }
      }
    }
  }

  /**
   * Subscribe to agent events
   */
  onEvent(callback: AgentEventCallback): () => void {
    this.eventCallbacks.push(callback)
    return () => {
      const index = this.eventCallbacks.indexOf(callback)
      if (index > -1) {
        this.eventCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Emit event to all subscribers
   */
  private emit(event: AgentEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event)
      } catch (err) {
        console.error('RinaAgent event callback error:', err)
      }
    }
  }

  /**
   * Handle a user command
   */
  async handleUserCommand(command: string): Promise<AgentResult> {
    remember('user', `Agent: ${command}`)

    // Get user preferences
    const userPrefs = userMemory.getMemory()

    // Log preferred tools if available
    if (this.config.usePreferredTools && userPrefs.lastUsedTools.length > 0) {
      console.log(`[RinaAgent] Prioritizing preferred tools: ${userPrefs.lastUsedTools.join(', ')}`)
      remember('system', `Prioritizing tools: ${userPrefs.lastUsedTools.join(', ')}`)
    }

    // Get relevant context for the command
    const context = await getRelevantContext(command)
    if (context) {
      remember('system', `Context retrieved: ${context.slice(0, 200)}...`)
      // The context is stored in session memory for the planner to use
    }

    // Execute through agent loop
    const result = await agentLoop.run(command)

    // Emit completion event
    if (result.success) {
      this.emit({ type: 'completed', results: result.results })
    } else {
      this.emit({ type: 'error', error: 'One or more steps failed' })
    }

    remember('rina', `Agent completed: ${result.summary.successfulSteps}/${result.summary.totalSteps} steps successful`)

    return result
  }

  /**
   * Handle a user command with streaming (for live UI)
   */
  async *handleUserCommandStreaming(command: string): AsyncGenerator<AgentEvent, AgentResult, unknown> {
    remember('user', `Agent (streaming): ${command}`)

    const userPrefs = userMemory.getMemory()

    if (this.config.usePreferredTools && userPrefs.lastUsedTools.length > 0) {
      this.emit({
        type: 'planning',
        goal: `Using preferred tools: ${userPrefs.lastUsedTools.join(', ')}`,
      } as AgentEvent)
    }

    // Use streaming generator - iterate fully to get the final result
    // The result is returned after all events are yielded
    let finalResult: AgentResult | null = null

    for await (const event of agentLoop.runStreaming(command)) {
      this.emit(event)
      yield event

      // Track the last 'completed' or 'error' event to get the result
      if (event.type === 'completed') {
        finalResult = {
          goal: command,
          plan: { goal: command, steps: [] },
          results: event.results,
          success: true,
          summary: {
            totalSteps: event.results.length,
            successfulSteps: event.results.filter((r) => r.success).length,
            failedSteps: event.results.filter((r) => !r.success).length,
            durationMs: 0,
          },
        }
      } else if (event.type === 'error') {
        finalResult = {
          goal: command,
          plan: { goal: command, steps: [] },
          results: [],
          success: false,
          summary: {
            totalSteps: 0,
            successfulSteps: 0,
            failedSteps: 1,
            durationMs: 0,
          },
        }
      }
    }

    // Return the captured result, or a default if something went wrong
    if (finalResult) {
      return finalResult
    }

    // Fallback: should not reach here normally, but provide a valid result
    return {
      goal: command,
      plan: { goal: command, steps: [] },
      results: [],
      success: false,
      summary: {
        totalSteps: 0,
        successfulSteps: 0,
        failedSteps: 0,
        durationMs: 0,
      },
    }
  }

  /**
   * Discover a new safe tool
   */
  async discoverTool(tool: Parameters<typeof toolDiscovery.discover>[0]): Promise<boolean> {
    const result = await toolDiscovery.discover(tool)
    return result.success
  }

  /**
   * Get configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get user preferences
   */
  getUserPreferences(): Readonly<UserMemory> {
    return userMemory.getMemory()
  }

  /**
   * Get statistics
   */
  getStats(): {
    user: ReturnType<typeof userMemory.getStats>
    tools: ReturnType<typeof toolDiscovery.getStats>
    agent: { isRunning: boolean }
  } {
    return {
      user: userMemory.getStats(),
      tools: toolDiscovery.getStats(),
      agent: { isRunning: agentLoop.getRunning() },
    }
  }

  /**
   * Get progress
   */
  getProgress(): { current: number; total: number; percentage: number } {
    return agentLoop.getProgress()
  }

  /**
   * Pause execution
   */
  pause(): void {
    agentLoop.pause()
  }

  /**
   * Resume execution
   */
  resume(): void {
    agentLoop.resume()
  }

  /**
   * Stop execution
   */
  stop(): void {
    agentLoop.stop()
  }

  /**
   * Clear user memory
   */
  clearMemory(): void {
    userMemory.clearMemory()
  }
}

// Singleton instance
export const rinaAgent = new RinaAgent()
