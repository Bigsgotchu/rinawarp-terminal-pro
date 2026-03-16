export class ToolRegistry {
  tools = new Map<string, any>()

  register(name: string, tool: any) {
    this.tools.set(name, tool)
    console.log(`[ToolRegistry] Registered tool: ${name}`)
  }

  get(name: string) {
    return this.tools.get(name)
  }

  list(): string[] {
    return [...this.tools.keys()]
  }

  has(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * Get all registered tools with their metadata
   */
  getAll(): Array<{ name: string; available: boolean }> {
    return [...this.tools.entries()].map(([name, tool]) => ({
      name,
      available: tool !== undefined && tool !== null,
    }))
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    return this.tools.delete(name)
  }

  /**
   * Clear all tools
   */
  clear() {
    this.tools.clear()
  }
}

export const toolRegistry = new ToolRegistry()

// Import and register tools
// Note: These are registered lazily to avoid circular dependencies
let toolsInitialized = false

export function initializeTools() {
  if (toolsInitialized) return

  // Terminal tool
  try {
    const { terminalTool } = require('../tools/terminal.js')
    toolRegistry.register('terminal', terminalTool)
  } catch (e) {
    console.warn('[ToolRegistry] Could not register terminal tool:', e)
  }

  // Filesystem tool
  try {
    const { filesystemTool } = require('../tools/filesystem.js')
    toolRegistry.register('filesystem', filesystemTool)
  } catch (e) {
    console.warn('[ToolRegistry] Could not register filesystem tool:', e)
  }

  // Git tool
  try {
    const { gitTool } = require('../tools/git.js')
    toolRegistry.register('git', gitTool)
  } catch (e) {
    console.warn('[ToolRegistry] Could not register git tool:', e)
  }

  // Docker tool
  try {
    const { dockerTool } = require('../tools/docker.js')
    toolRegistry.register('docker', dockerTool)
  } catch (e) {
    console.warn('[ToolRegistry] Could not register docker tool:', e)
  }

  // System tool
  try {
    const { systemTool } = require('../tools/system.js')
    toolRegistry.register('system', systemTool)
  } catch (e) {
    console.warn('[ToolRegistry] Could not register system tool:', e)
  }

  toolsInitialized = true
  console.log('[ToolRegistry] Tools initialized:', toolRegistry.list())
}
