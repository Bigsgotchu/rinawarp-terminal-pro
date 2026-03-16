/**
 * RinaWarp Plugin Registry
 *
 * Central registry for all loaded plugins.
 * Provides methods to register, list, and manage plugins.
 */

import { EventEmitter } from 'events'
import { RinaPlugin, PluginMetadata, PluginState, PluginEvent, PluginLogger } from './pluginTypes.js'

/**
 * Internal logger for plugin system
 */
class PluginSystemLogger implements PluginLogger {
  private prefix = '[PluginSystem]'

  info(message: string, ...args: any[]): void {
    console.log(`${this.prefix} ℹ️ ${message}`, ...args)
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`${this.prefix} ⚠️ ${message}`, ...args)
  }

  error(message: string, ...args: any[]): void {
    console.error(`${this.prefix} ❌ ${message}`, ...args)
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG) {
      console.debug(`${this.prefix} 🔍 ${message}`, ...args)
    }
  }
}

/**
 * Plugin Registry - manages all plugins in RinaWarp
 */
export class PluginRegistry extends EventEmitter {
  private plugins: Map<string, PluginState> = new Map()
  private toolRegistry: Map<string, any> = new Map()
  private agentRegistry: Map<string, any> = new Map()
  private ipcHandlers: Map<string, Function> = new Map()
  public logger: PluginLogger = new PluginSystemLogger()

  constructor() {
    super()
    this.logger.info('PluginRegistry initialized')
  }

  /**
   * Register a plugin with the registry
   */
  async register(plugin: RinaPlugin, path: string): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      this.logger.warn(`Plugin "${plugin.name}" is already registered, skipping`)
      return
    }

    const metadata: PluginMetadata = {
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      path,
      enabled: true,
    }

    const state: PluginState = {
      metadata,
      instance: plugin,
      status: 'loaded',
    }

    this.plugins.set(plugin.name, state)
    this.logger.info(`Registered plugin: ${plugin.name} v${plugin.version}`)
    this.emit(PluginEvent.PLUGIN_LOADED, metadata)
  }

  /**
   * Activate a registered plugin
   */
  async activate(name: string, context: any): Promise<void> {
    const state = this.plugins.get(name)

    if (!state) {
      throw new Error(`Plugin "${name}" not found in registry`)
    }

    if (state.status === 'active') {
      this.logger.warn(`Plugin "${name}" is already active`)
      return
    }

    try {
      if (state.instance) {
        await state.instance.activate(context)
        state.status = 'active'
        state.loadedAt = new Date()
        this.logger.info(`Activated plugin: ${name}`)
        this.emit(PluginEvent.PLUGIN_ACTIVATED, state.metadata)
      }
    } catch (error) {
      state.status = 'error'
      this.logger.error(`Failed to activate plugin "${name}":`, error)
      this.emit(PluginEvent.PLUGIN_ERROR, { name, error })
      throw error
    }
  }

  /**
   * Deactivate a plugin
   */
  async deactivate(name: string): Promise<void> {
    const state = this.plugins.get(name)

    if (!state || state.status !== 'active') {
      return
    }

    try {
      if (state.instance?.deactivate) {
        await state.instance.deactivate()
      }
      state.status = 'inactive'
      this.logger.info(`Deactivated plugin: ${name}`)
      this.emit(PluginEvent.PLUGIN_DEACTIVATED, state.metadata)
    } catch (error) {
      this.logger.error(`Failed to deactivate plugin "${name}":`, error)
      throw error
    }
  }

  /**
   * Register a tool from a plugin
   */
  registerTool(name: string, tool: any): void {
    if (this.toolRegistry.has(name)) {
      this.logger.warn(`Tool "${name}" already registered, overwriting`)
    }
    this.toolRegistry.set(name, tool)
    this.logger.info(`Tool registered: ${name}`)
    this.emit(PluginEvent.TOOL_REGISTERED, { name, tool })
  }

  /**
   * Register an agent from a plugin
   */
  registerAgent(name: string, agent: any): void {
    if (this.agentRegistry.has(name)) {
      this.logger.warn(`Agent "${name}" already registered, overwriting`)
    }
    this.agentRegistry.set(name, agent)
    this.logger.info(`Agent registered: ${name}`)
    this.emit(PluginEvent.AGENT_REGISTERED, { name, agent })
  }

  /**
   * Register an IPC handler from a plugin
   */
  registerIpcHandler(channel: string, handler: Function): void {
    if (this.ipcHandlers.has(channel)) {
      this.logger.warn(`IPC handler "${channel}" already registered, overwriting`)
    }
    this.ipcHandlers.set(channel, handler)
    this.logger.info(`IPC handler registered: ${channel}`)
  }

  /**
   * Get a registered tool
   */
  getTool(name: string): any {
    return this.toolRegistry.get(name)
  }

  /**
   * Get a registered agent
   */
  getAgent(name: string): any {
    return this.agentRegistry.get(name)
  }

  /**
   * Get an IPC handler
   */
  getIpcHandler(channel: string): Function | undefined {
    return this.ipcHandlers.get(channel)
  }

  /**
   * List all registered plugin names
   */
  list(): string[] {
    return [...this.plugins.keys()]
  }

  /**
   * List all plugins with their states
   */
  listAll(): PluginState[] {
    return [...this.plugins.values()]
  }

  /**
   * Get plugin by name
   */
  get(name: string): PluginState | undefined {
    return this.plugins.get(name)
  }

  /**
   * Get all registered tools
   */
  getTools(): Map<string, any> {
    return new Map(this.toolRegistry)
  }

  /**
   * Get all registered agents
   */
  getAgents(): Map<string, any> {
    return new Map(this.agentRegistry)
  }

  /**
   * Get all IPC handlers
   */
  getIpcHandlers(): Map<string, Function> {
    return new Map(this.ipcHandlers)
  }

  /**
   * Check if a plugin is loaded
   */
  has(name: string): boolean {
    return this.plugins.has(name)
  }

  /**
   * Check if a plugin is active
   */
  isActive(name: string): boolean {
    const state = this.plugins.get(name)
    return state?.status === 'active'
  }

  /**
   * Unregister a plugin
   */
  async unregister(name: string): Promise<void> {
    const state = this.plugins.get(name)

    if (!state) {
      return
    }

    if (state.status === 'active') {
      await this.deactivate(name)
    }

    this.plugins.delete(name)
    this.logger.info(`Unregistered plugin: ${name}`)
  }

  /**
   * Enable a plugin
   */
  enable(name: string): void {
    const state = this.plugins.get(name)
    if (state) {
      state.metadata.enabled = true
      this.logger.info(`Enabled plugin: ${name}`)
    }
  }

  /**
   * Disable a plugin
   */
  async disable(name: string): Promise<void> {
    const state = this.plugins.get(name)
    if (state) {
      if (state.status === 'active') {
        await this.deactivate(name)
      }
      state.metadata.enabled = false
      this.logger.info(`Disabled plugin: ${name}`)
    }
  }

  /**
   * Get statistics about loaded plugins
   */
  getStats(): {
    total: number
    active: number
    inactive: number
    error: number
    tools: number
    agents: number
  } {
    const states = [...this.plugins.values()]
    return {
      total: states.length,
      active: states.filter((s) => s.status === 'active').length,
      inactive: states.filter((s) => s.status === 'inactive').length,
      error: states.filter((s) => s.status === 'error').length,
      tools: this.toolRegistry.size,
      agents: this.agentRegistry.size,
    }
  }

  /**
   * Clear all plugins (for testing)
   */
  async clear(): Promise<void> {
    const names = [...this.plugins.keys()]
    for (const name of names) {
      await this.unregister(name)
    }
    this.toolRegistry.clear()
    this.agentRegistry.clear()
    this.ipcHandlers.clear()
    this.logger.info('Plugin registry cleared')
  }
}

/**
 * Singleton instance of the plugin registry
 */
export const pluginRegistry = new PluginRegistry()
