/**
 * RinaWarp Plugin System - Main Export
 *
 * Unified export for all plugin system components.
 */

export * from './pluginTypes.js'
export * from './pluginRegistry.js'
export * from './pluginContext.js'
export * from './pluginLoader.js'

// Import and re-export for convenience
import { pluginRegistry } from './pluginRegistry.js'
import { loadPlugins, loadPluginFromPackage, unloadPlugin, reloadPlugin } from './pluginLoader.js'
import { createPluginContext, getGlobalPluginContext } from './pluginContext.js'

export {
  pluginRegistry,
  loadPlugins,
  loadPluginFromPackage,
  unloadPlugin,
  reloadPlugin,
  createPluginContext,
  getGlobalPluginContext,
}

/**
 * Initialize the plugin system
 */
export async function initPluginSystem(workspacePath: string): Promise<void> {
  console.log('[PluginSystem] Initializing...')

  // Load plugins from workspace
  await loadPlugins(workspacePath)

  // Log stats
  const stats = pluginRegistry.getStats()
  console.log(`[PluginSystem] Ready: ${stats.total} plugins, ${stats.tools} tools, ${stats.agents} agents`)
}
