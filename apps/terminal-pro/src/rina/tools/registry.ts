/**
 * Rina OS Control Layer - Tool Registry
 *
 * Registry of available tools for Rina to use.
 * Integrates with existing @rinawarp/core system while providing additional
 * tool wrappers specific to Rina OS.
 *
 * Additive architecture - does not modify existing core functionality.
 */

import type { RinaTask } from '../brain.js'
import type { ExecutionMode } from '../safety.js'
import { safetyCheck } from '../safety.js'

/**
 * Tool definition
 */
export interface RinaTool {
  name: string
  description: string
  safe?: boolean // Mark tool as safe for auto-discovery

  /**
   * Check if this tool can handle the given task
   */
  canHandle(task: RinaTask): boolean

  /**
   * Execute the task
   */
  execute(task: RinaTask, context: ToolContext): Promise<ToolResult>

  /**
   * Validate input before execution
   */
  validate?(input: Record<string, unknown>): ValidationResult
}

/**
 * Context passed to tool execution
 */
export interface ToolContext {
  mode: ExecutionMode
  workspaceRoot?: string
  userId?: string
  sessionId?: string
}

/**
 * Tool execution result
 */
export interface ToolResult {
  ok: boolean
  output?: unknown
  error?: string
  requiresConfirmation?: boolean
  blocked?: boolean
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Built-in tools
 */
import { terminalTool } from './terminal.js'
import { filesystemTool } from './filesystem.js'
import { systemTool } from './system.js'
import { gitTool } from './git.js'
import { dockerTool } from './docker.js'

/**
 * Tool registry
 */
export const RinaTools: Record<string, RinaTool> = {
  terminal: terminalTool,
  filesystem: filesystemTool,
  system: systemTool,
  git: gitTool,
  docker: dockerTool,
  search: createSearchTool(),
}

/**
 * Create a search tool (placeholder for full implementation)
 */
function createSearchTool(): RinaTool {
  return {
    name: 'search',
    description: 'Search for files or content',
    canHandle(task: RinaTask) {
      return task.tool === 'search'
    },
    async execute(task: RinaTask) {
      return {
        ok: true,
        output: {
          message: 'Search tool ready. Connect to workspace for full search functionality.',
          query: task.input.query,
        },
      }
    },
  }
}

/**
 * Get tool by name
 */
export function getTool(name: string): RinaTool | undefined {
  return RinaTools[name]
}

/**
 * Get all available tools
 */
export function getAvailableTools(): string[] {
  return Object.keys(RinaTools)
}

/**
 * Find tool for a task
 */
export function findToolForTask(task: RinaTask): RinaTool | undefined {
  if (task.tool === 'none') return undefined

  const tool = RinaTools[task.tool]
  if (tool && tool.canHandle(task)) {
    return tool
  }

  return undefined
}

/**
 * Execute a task through the appropriate tool with safety checks
 */
export async function executeToolTask(task: RinaTask, context: ToolContext): Promise<ToolResult> {
  // Find the tool
  const tool = findToolForTask(task)
  if (!tool) {
    return {
      ok: false,
      error: `Tool not found: ${task.tool}`,
    }
  }

  // Safety check for terminal commands
  if (task.tool === 'terminal' && task.input.command) {
    const safety = safetyCheck(task.input.command as string, context.mode)

    if (safety.blocked) {
      return {
        ok: false,
        error: safety.reason || 'Command blocked for safety',
        blocked: true,
      }
    }

    if (safety.requiresConfirmation) {
      return {
        ok: false,
        error: safety.reason || 'Confirmation required',
        requiresConfirmation: true,
      }
    }
  }

  // Validate input if validator exists
  if (tool.validate) {
    const validation = tool.validate(task.input)
    if (!validation.valid) {
      return {
        ok: false,
        error: validation.error || 'Validation failed',
      }
    }
  }

  // Execute
  try {
    const result = await tool.execute(task, context)
    return result
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
