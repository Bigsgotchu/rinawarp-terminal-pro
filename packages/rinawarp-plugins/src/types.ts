/**
 * RinaWarp Plugin Types
 *
 * Core interfaces for RinaWarp plugins.
 * These types are shared across all plugins.
 */

/**
 * Represents a RinaWarp plugin that can be loaded into the terminal
 */
export interface RinaPlugin {
  /** Unique identifier for the plugin */
  name: string

  /** Semantic version string */
  version: string

  /** Human-readable description */
  description: string

  /** Activation hook - called when plugin is loaded */
  activate(ctx: PluginContext): Promise<void>

  /** Cleanup hook - called when plugin is unloaded */
  deactivate(): Promise<void>
}

/**
 * Context provided to plugins during activation
 */
export interface PluginContext {
  /** Current workspace root path */
  workspacePath: string

  /** Register a tool that can be called by agents */
  registerTool(name: string, tool: any): void

  /** Register an agent that can be invoked */
  registerAgent(name: string, agent: any): void

  /** Subscribe to terminal events */
  on(event: string, handler: (data: any) => void): void

  /** Unsubscribe from events */
  off(event: string, handler: (data: any) => void): void

  /** Get plugin settings */
  getSetting<T>(key: string, defaultValue?: T): T

  /** Set plugin settings */
  setSetting<T>(key: string, value: T): void

  /** Logger instance */
  logger: PluginLogger
}

/**
 * Logger interface for plugins
 */
export interface PluginLogger {
  info(message: string, ...args: any[]): void
  warn(message: string, ...args: any[]): void
  error(message: string, ...args: any[]): void
  debug(message: string, ...args: any[]): void
}

/**
 * Configuration for plugin loading
 */
export interface PluginConfig {
  /** Path to plugin directory or npm package name */
  path: string

  /** Whether to auto-activate on load */
  autoActivate?: boolean

  /** Plugin-specific settings */
  settings?: Record<string, any>
}

/**
 * Metadata about a loaded plugin
 */
export interface PluginMetadata {
  name: string
  version: string
  description: string
  author?: string
  homepage?: string
}

/**
 * Extension point types that plugins can provide
 */
export const PLUGIN_EXTENSIONS = {
  TOOL: 'tool',
  AGENT: 'agent',
  COMMAND: 'command',
  THEME: 'theme',
  KEYBINDING: 'keybinding',
} as const

export type PluginExtensionType = (typeof PLUGIN_EXTENSIONS)[keyof typeof PLUGIN_EXTENSIONS]
