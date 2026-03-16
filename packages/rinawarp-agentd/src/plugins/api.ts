/**
 * Plugin API
 *
 * Defines the plugin interface and permissions.
 */

export interface PluginManifest {
  name: string
  version: string
  description?: string
  entry: string
  permissions: PluginPermission[]
}

export type PluginPermission = 'terminal' | 'suggestions' | 'events' | 'config'

export interface Plugin {
  manifest: PluginManifest
  onCommand?(command: string): Promise<PluginSuggestion | null>
  onSuggest?(context: PluginContext): Promise<string[]>
  onLoad?(): Promise<void>
  onUnload?(): Promise<void>
}

export interface PluginSuggestion {
  command: string
  reason: string
}

export interface PluginContext {
  workingDirectory: string
  gitBranch?: string
  packageManager?: string
  shell?: string
}

/**
 * Create a plugin manifest
 */
export function createManifest(
  name: string,
  version: string,
  entry: string,
  permissions: PluginPermission[],
  description?: string
): PluginManifest {
  return { name, version, description, entry, permissions }
}

/**
 * Validate permissions
 */
export function hasPermission(plugin: Plugin, permission: PluginPermission): boolean {
  return plugin.manifest.permissions.includes(permission)
}
