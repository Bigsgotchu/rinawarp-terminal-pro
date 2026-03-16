/**
 * RinaWarp Plugin Loader
 *
 * Discovers and loads plugins from the filesystem.
 * Supports loading from a plugins directory.
 */

import * as fs from 'fs'
import * as path from 'path'
import { pluginRegistry } from './pluginRegistry.js'
import { createPluginContext } from './pluginContext.js'
import { RinaPlugin, PLUGIN_EXTENSIONS } from './pluginTypes.js'

/**
 * Load all plugins from a directory
 */
export async function loadPlugins(root: string): Promise<{ loaded: number; failed: number }> {
  const pluginsDir = path.join(root, 'plugins')

  pluginRegistry.logger.info(`Loading plugins from: ${pluginsDir}`)

  if (!fs.existsSync(pluginsDir)) {
    pluginRegistry.logger.info('No plugins directory found, skipping')
    return { loaded: 0, failed: 0 }
  }

  let loaded = 0
  let failed = 0

  try {
    const files = fs.readdirSync(pluginsDir)

    for (const file of files) {
      // Skip non-plugin files
      if (file.startsWith('.') || file.startsWith('_')) {
        continue
      }

      const ext = path.extname(file)
      if (!PLUGIN_EXTENSIONS.includes(ext)) {
        continue
      }

      const pluginPath = path.join(pluginsDir, file)

      try {
        await loadPlugin(pluginPath)
        loaded++
      } catch (error) {
        failed++
        pluginRegistry.logger.error(`Failed to load plugin from ${file}:`, error)
      }
    }
  } catch (error) {
    pluginRegistry.logger.error('Error reading plugins directory:', error)
  }

  pluginRegistry.logger.info(`Plugin loading complete: ${loaded} loaded, ${failed} failed`)
  return { loaded, failed }
}

/**
 * Load a single plugin from a file path
 */
export async function loadPlugin(pluginPath: string): Promise<void> {
  pluginRegistry.logger.debug(`Loading plugin from: ${pluginPath}`)

  // Dynamic import of the plugin
  const pluginModule = await import(pluginPath)

  // Support both default export and direct export
  const plugin: RinaPlugin = pluginModule.default || pluginModule

  if (!plugin || !plugin.name || !plugin.activate) {
    throw new Error('Invalid plugin format: must have name and activate method')
  }

  // Register the plugin
  await pluginRegistry.register(plugin, pluginPath)

  // Create context and activate
  const workspacePath = process.cwd()
  const context = createPluginContext(workspacePath)

  await pluginRegistry.activate(plugin.name, context)

  pluginRegistry.logger.info(`Successfully loaded plugin: ${plugin.name} v${plugin.version}`)
}

/**
 * Load plugin from npm package
 */
export async function loadPluginFromPackage(packageName: string): Promise<void> {
  pluginRegistry.logger.info(`Loading plugin from npm: ${packageName}`)

  try {
    // Dynamic import of the npm package
    const pluginModule = await import(packageName)

    const plugin: RinaPlugin = pluginModule.default || pluginModule

    if (!plugin || !plugin.name) {
      throw new Error('Invalid plugin package format')
    }

    // Register and activate
    await pluginRegistry.register(plugin, `npm:${packageName}`)
    const context = createPluginContext(process.cwd())
    await pluginRegistry.activate(plugin.name, context)

    pluginRegistry.logger.info(`Loaded npm plugin: ${plugin.name}`)
  } catch (error) {
    pluginRegistry.logger.error(`Failed to load npm plugin ${packageName}:`, error)
    throw error
  }
}

/**
 * Unload a plugin by name
 */
export async function unloadPlugin(name: string): Promise<void> {
  pluginRegistry.logger.info(`Unloading plugin: ${name}`)
  await pluginRegistry.unregister(name)
}

/**
 * Reload a plugin by name
 */
export async function reloadPlugin(name: string): Promise<void> {
  const state = pluginRegistry.get(name)

  if (!state) {
    throw new Error(`Plugin "${name}" not found`)
  }

  const pluginPath = state.metadata.path

  // Unload first
  await unloadPlugin(name)

  // Reload from same path
  await loadPlugin(pluginPath)
}

/**
 * Get list of available plugin files in directory
 */
export function discoverPlugins(root: string): string[] {
  const pluginsDir = path.join(root, 'plugins')

  if (!fs.existsSync(pluginsDir)) {
    return []
  }

  const files = fs.readdirSync(pluginsDir)

  return files
    .filter((file) => PLUGIN_EXTENSIONS.includes(path.extname(file)))
    .filter((file) => !file.startsWith('.') && !file.startsWith('_'))
    .map((file) => path.join(pluginsDir, file))
}
