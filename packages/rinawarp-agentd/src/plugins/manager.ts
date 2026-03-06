/**
 * Plugin Manager
 * 
 * Loads and manages plugins.
 */

import type { Plugin, PluginManifest, PluginSuggestion, PluginContext } from "./api.js";
import { hasPermission } from "./api.js";

export interface PluginManagerConfig {
  pluginDirs: string[];
  disabledPlugins: string[];
}

const DEFAULT_CONFIG: PluginManagerConfig = {
  pluginDirs: ["./plugins", "~/.rinawarp/plugins"],
  disabledPlugins: [],
};

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private config: PluginManagerConfig;

  constructor(config: Partial<PluginManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Load a plugin
   */
  async load(plugin: Plugin): Promise<void> {
    // Skip if disabled
    if (this.config.disabledPlugins.includes(plugin.manifest.name)) {
      return;
    }

    // Check for onLoad hook
    if (plugin.onLoad) {
      await plugin.onLoad();
    }

    this.plugins.set(plugin.manifest.name, plugin);
  }

  /**
   * Unload a plugin
   */
  async unload(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) return;

    if (plugin.onUnload) {
      await plugin.onUnload();
    }

    this.plugins.delete(name);
  }

  /**
   * Get plugin by name
   */
  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * List all plugins
   */
  list(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get suggestions from all plugins
   */
  async getSuggestions(context: PluginContext): Promise<PluginSuggestion[]> {
    const suggestions: PluginSuggestion[] = [];

    for (const plugin of this.plugins.values()) {
      // Check permission
      if (!hasPermission(plugin, "suggestions")) continue;

      try {
        const result = await plugin.onSuggest?.(context);
        if (result) {
          for (const cmd of result) {
            suggestions.push({
              command: cmd,
              reason: `Plugin: ${plugin.manifest.name}`,
            });
          }
        }
      } catch {
        // Skip plugins that error
      }
    }

    return suggestions;
  }

  /**
   * Process command through plugins
   */
  async processCommand(command: string): Promise<PluginSuggestion | null> {
    for (const plugin of this.plugins.values()) {
      // Check permission
      if (!hasPermission(plugin, "terminal")) continue;

      try {
        const result = await plugin.onCommand?.(command);
        if (result) {
          return result;
        }
      } catch {
        // Skip plugins that error
      }
    }

    return null;
  }

  /**
   * Load plugins from directory (stub - would load from filesystem)
   */
  async loadFromDir(_dir: string): Promise<void> {
    // This would read the directory and load plugins
    // For now, just a stub
  }
}

// Singleton
let pluginManager: PluginManager | null = null;

export function getPluginManager(): PluginManager {
  if (!pluginManager) {
    pluginManager = new PluginManager();
  }
  return pluginManager;
}
