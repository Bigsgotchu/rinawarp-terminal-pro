/**
 * RinaWarp Plugin Context
 *
 * Provides the context API that plugins use to interact
 * with the RinaWarp core system.
 */

import { EventEmitter } from 'events'
import { PluginContext, PluginConfig, PluginLogger } from './pluginTypes.js'
import { pluginRegistry } from './pluginRegistry.js'

export function resolvePluginWorkspacePath(explicit?: string): string {
  const candidate = String(explicit || process.env.RINA_WORKSPACE_ROOT || '').trim()
  if (!candidate) {
    throw new Error('Missing workspace path for plugin context')
  }
  return candidate
}

/**
 * Plugin context implementation
 */
export function createPluginContext(workspacePath: string, settings: Record<string, any> = {}): PluginContext {
  const pluginEmitter = new EventEmitter()

  const context: PluginContext = {
    workspacePath,

    registerTool(name: string, tool: any): void {
      pluginRegistry.registerTool(name, tool)
    },

    registerAgent(name: string, agent: any): void {
      pluginRegistry.registerAgent(name, agent)
    },

    registerIpcHandler(channel: string, handler: Function): void {
      pluginRegistry.registerIpcHandler(channel, handler)
    },

    getConfig(): PluginConfig {
      return {
        name: 'plugin',
        enabled: true,
        settings,
      }
    },

    on(event: string, handler: (...args: any[]) => void): void {
      pluginEmitter.on(event, handler)
      // Also forward to global registry
      pluginRegistry.on(event, handler)
    },

    emit(event: string, data: any): void {
      pluginEmitter.emit(event, data)
    },

    logger: createPluginLogger(),
  }

  return context
}

/**
 * Create a logger for a specific plugin
 */
function createPluginLogger(): PluginLogger {
  return {
    info(message: string, ...args: any[]): void {
      console.log(`[Plugin] ℹ️ ${message}`, ...args)
    },

    warn(message: string, ...args: any[]): void {
      console.warn(`[Plugin] ⚠️ ${message}`, ...args)
    },

    error(message: string, ...args: any[]): void {
      console.error(`[Plugin] ❌ ${message}`, ...args)
    },

    debug(message: string, ...args: any[]): void {
      if (process.env.DEBUG) {
        console.debug(`[Plugin] 🔍 ${message}`, ...args)
      }
    },
  }
}

/**
 * Get the global plugin context for RinaWarp core
 */
export function getGlobalPluginContext(): PluginContext {
  return createPluginContext(resolvePluginWorkspacePath())
}
