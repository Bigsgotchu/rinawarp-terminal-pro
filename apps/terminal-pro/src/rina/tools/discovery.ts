/**
 * Rina OS Control Layer - Tool Discovery
 *
 * Allows Rina to discover and register new tools at runtime.
 * Only safe tools can be auto-registered.
 *
 * Additive architecture - does not modify existing core functionality.
 */

import { RinaTools, type RinaTool, type ToolResult } from './registry.js'

/**
 * Tool discovery result
 */
export type ToolDiscoveryResult = {
  success: boolean
  tool?: RinaTool
  error?: string
}

/**
 * Tool Discovery - Discovers and registers new tools safely
 */
class ToolDiscoveryImpl {
  private discoveredTools: Map<string, RinaTool> = new Map()

  /**
   * Discover and register a new tool
   * Only allows safe tools to be auto-registered
   */
  async discover(tool: RinaTool): Promise<ToolDiscoveryResult> {
    // Validate tool structure
    if (!tool.name || !tool.canHandle || !tool.execute) {
      return {
        success: false,
        error: 'Invalid tool: missing required properties (name, canHandle, execute)',
      }
    }

    // Check if tool is marked as safe
    // Tools without explicit safe flag are rejected for auto-discovery
    const isExplicitlySafe = (tool as { safe?: boolean }).safe === true

    if (!isExplicitlySafe) {
      // Check if it's a built-in tool
      const isBuiltIn = !!RinaTools[tool.name]

      if (!isBuiltIn) {
        console.warn(`[ToolDiscovery] Rejected unsafe tool: ${tool.name}. Set safe: true to allow.`)
        return {
          success: false,
          tool,
          error: `Tool '${tool.name}' is not marked as safe. Set safe: true to enable.`,
        }
      }
    }

    // Register the tool
    const existingTool = this.discoveredTools.get(tool.name)
    if (existingTool) {
      console.warn(`[ToolDiscovery] Tool '${tool.name}' already discovered, skipping.`)
      return {
        success: false,
        tool,
        error: `Tool '${tool.name}' already registered`,
      }
    }

    this.discoveredTools.set(tool.name, tool)
    console.log(`[ToolDiscovery] Discovered new tool: ${tool.name}`)

    return {
      success: true,
      tool,
    }
  }

  /**
   * Discover multiple tools at once
   */
  async discoverMany(tools: RinaTool[]): Promise<ToolDiscoveryResult[]> {
    const results: ToolDiscoveryResult[] = []

    for (const tool of tools) {
      const result = await this.discover(tool)
      results.push(result)
    }

    return results
  }

  /**
   * Get all discovered tools
   */
  getDiscoveredTools(): RinaTool[] {
    return Array.from(this.discoveredTools.values())
  }

  /**
   * Check if a tool is discovered
   */
  hasTool(name: string): boolean {
    return this.discoveredTools.has(name)
  }

  /**
   * Remove a discovered tool
   */
  removeTool(name: string): boolean {
    return this.discoveredTools.delete(name)
  }

  /**
   * Clear all discovered tools
   */
  clear(): void {
    this.discoveredTools.clear()
  }

  /**
   * Get discovery statistics
   */
  getStats(): {
    totalDiscovered: number
    tools: string[]
  } {
    return {
      totalDiscovered: this.discoveredTools.size,
      tools: Array.from(this.discoveredTools.keys()),
    }
  }
}

// Singleton instance
export const toolDiscovery = new ToolDiscoveryImpl()

/**
 * Helper to create a safe tool
 */
export function createSafeTool<T extends Record<string, unknown>>(
  name: string,
  description: string,
  canHandle: (task: { tool: string; input: T }) => boolean,
  execute: (task: { tool: string; input: T }, context: unknown) => Promise<ToolResult>
): RinaTool {
  return {
    name,
    description,
    canHandle: canHandle as (task: { intent: string; tool: string; input: Record<string, unknown> }) => boolean,
    execute: execute as (
      task: { intent: string; tool: string; input: Record<string, unknown> },
      context: unknown
    ) => Promise<ToolResult>,
    safe: true,
  }
}
