/**
 * RinaWarp Plugin System - Type Definitions
 *
 * Defines the core interfaces for the plugin architecture.
 * Plugins can register tools and agents to extend RinaWarp's capabilities.
 */

import { EventEmitter } from 'events'

/**
 * Main plugin interface that all RinaWarp plugins must implement
 */
export interface RinaPlugin {
  /** Unique identifier for the plugin */
  name: string

  /** Semantic version string */
  version: string

  /** Human-readable description */
  description?: string

  /** Activation hook - called when plugin is loaded */
  activate(ctx: PluginContext): Promise<void>

  /** Deactivation hook - called when plugin is unloaded */
  deactivate?(): Promise<void>
}

/**
 * Context provided to plugins to interact with RinaWarp core
 */
export interface PluginContext {
  /** Current workspace root path */
  workspacePath: string

  /** Register a tool with the tool registry */
  registerTool(name: string, tool: any): void

  /** Register an agent with the agent system */
  registerAgent(name: string, agent: any): void

  /** Register an IPC handler */
  registerIpcHandler(channel: string, handler: Function): void

  /** Get workspace configuration */
  getConfig(): PluginConfig

  /** Subscribe to RinaWarp events */
  on(event: string, handler: Function): void

  /** Emit events to RinaWarp */
  emit(event: string, data: any): void

  /** Logger for plugin output */
  logger: PluginLogger
}

/**
 * Plugin-specific configuration
 */
export interface PluginConfig {
  /** Plugin name */
  name: string

  /** Enabled state */
  enabled: boolean

  /** Custom settings from rinawarp.config.json */
  settings: Record<string, any>
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
 * Plugin metadata for registry
 */
export interface PluginMetadata {
  name: string
  version: string
  description?: string
  author?: string
  path: string
  enabled: boolean
  loadedAt?: Date
}

/**
 * Plugin loader result
 */
export interface LoadResult {
  success: boolean
  plugin?: RinaPlugin
  error?: string
}

/**
 * Internal plugin state
 */
export interface PluginState {
  metadata: PluginMetadata
  instance?: RinaPlugin
  context?: PluginContext
  status: 'loaded' | 'active' | 'inactive' | 'error'
  loadedAt?: Date
}

/**
 * Event types emitted by plugin system
 */
export enum PluginEvent {
  PLUGIN_LOADED = 'plugin:loaded',
  PLUGIN_ACTIVATED = 'plugin:activated',
  PLUGIN_DEACTIVATED = 'plugin:deactivated',
  PLUGIN_ERROR = 'plugin:error',
  TOOL_REGISTERED = 'tool:registered',
  AGENT_REGISTERED = 'agent:registered',
}

/**
 * Default plugin manifest filename
 */
export const PLUGIN_MANIFEST = 'plugin.json'

/**
 * Allowed file extensions for plugins
 */
export const PLUGIN_EXTENSIONS = ['.js', '.ts', '.mjs']
