/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal Plugin Loader System
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * Modular plugin architecture for scalable feature development
 */

export class PluginLoader {
  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
    this.dependencies = new Map();
    this.loadedPlugins = new Set();
    this.failedPlugins = new Set();

    console.log('🔌 Plugin Loader initialized');
  }

  // Register a plugin
  register(plugin) {
    const { name, version, dependencies = [], hooks = [] } = plugin;

    this.plugins.set(name, {
      ...plugin,
      status: 'registered',
      loadTime: null,
      error: null,
    });

    // Register dependencies
    if (dependencies.length > 0) {
      this.dependencies.set(name, dependencies);
    }

    // Register hooks
    hooks.forEach(hook => {
      if (!this.hooks.has(hook)) {
        this.hooks.set(hook, []);
      }
      this.hooks.get(hook).push(name);
    });

    console.log(`🔌 Plugin "${name}" v${version} registered`);
  }

  // Load a plugin with dependency resolution
  async load(pluginName, context = {}) {
    const startTime = performance.now();

    try {
      const plugin = this.plugins.get(pluginName);
      if (!plugin) {
        throw new Error(new Error(`Plugin "${pluginName}" not found`));
      }

      if (this.loadedPlugins.has(pluginName)) {
        console.log(`🔌 Plugin "${pluginName}" already loaded`);
        return plugin;
      }

      // Load dependencies first
      const dependencies = this.dependencies.get(pluginName) || [];
      for (const dep of dependencies) {
        if (!this.loadedPlugins.has(dep)) {
          await this.load(dep, context);
        }
      }

      // Initialize plugin
      if (plugin.initialize) {
        await plugin.initialize(context);
      }

      // Execute plugin
      if (plugin.execute) {
        await plugin.execute(context);
      }

      const endTime = performance.now();
      plugin.loadTime = endTime - startTime;
      plugin.status = 'loaded';

      this.loadedPlugins.add(pluginName);
      console.log(`✅ Plugin "${pluginName}" loaded in ${Math.round(plugin.loadTime)}ms`);

      return plugin;
    } catch (error) {
      console.error(`❌ Failed to load plugin "${pluginName}":`, error);
      this.failedPlugins.add(pluginName);

      const plugin = this.plugins.get(pluginName);
      if (plugin) {
        plugin.status = 'failed';
        plugin.error = error.message;
      }

      throw new Error(error);
    }
  }

  // Load all plugins
  async loadAll(context = {}) {
    console.log('🔌 Loading all plugins...');

    const results = {
      loaded: [],
      failed: [],
      totalTime: 0,
    };

    const startTime = performance.now();

    for (const [name, _plugin] of this.plugins) {
      try {
        await this.load(name, context);
        results.loaded.push(name);
      } catch (error) {
        results.failed.push({ name, error: error.message });
      }
    }

    const endTime = performance.now();
    results.totalTime = endTime - startTime;

    console.log(
      `🎉 Plugin loading complete: ${results.loaded.length} loaded, ${results.failed.length} failed in ${Math.round(results.totalTime)}ms`
    );

    return results;
  }

  // Execute hook
  async executeHook(hookName, ...args) {
    const plugins = this.hooks.get(hookName) || [];
    const results = [];

    for (const pluginName of plugins) {
      if (this.loadedPlugins.has(pluginName)) {
        const plugin = this.plugins.get(pluginName);
        if (plugin.hooks && plugin.hooks[hookName]) {
          try {
            const result = await plugin.hooks[hookName](...args);
            results.push({ plugin: pluginName, result });
          } catch (error) {
            console.error(`❌ Hook "${hookName}" failed in plugin "${pluginName}":`, error);
            results.push({ plugin: pluginName, error: error.message });
          }
        }
      }
    }

    return results;
  }

  // Get plugin status
  getStatus() {
    const status = {
      total: this.plugins.size,
      loaded: this.loadedPlugins.size,
      failed: this.failedPlugins.size,
      plugins: {},
    };

    for (const [name, plugin] of this.plugins) {
      status.plugins[name] = {
        status: plugin.status,
        loadTime: plugin.loadTime,
        error: plugin.error,
        version: plugin.version,
      };
    }

    return status;
  }

  // Unload plugin
  async unload(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(new Error(`Plugin "${pluginName}" not found`));
    }

    if (plugin.cleanup) {
      await plugin.cleanup();
    }

    this.loadedPlugins.delete(pluginName);
    plugin.status = 'unloaded';

    console.log(`🔌 Plugin "${pluginName}" unloaded`);
  }

  // Reload plugin
  async reload(pluginName, context = {}) {
    if (this.loadedPlugins.has(pluginName)) {
      await this.unload(pluginName);
    }
    return await this.load(pluginName, context);
  }
}

// Plugin base class
export class Plugin {
  constructor(config = {}) {
    this.name = config.name || 'unnamed-plugin';
    this.version = config.version || '1.0.0';
    this.description = config.description || 'No description provided';
    this.dependencies = config.dependencies || [];
    this.hooks = config.hooks || [];
    this.enabled = config.enabled !== false;
  }

  async initialize(_context) {
    // Override in subclasses
  }

  async execute(_context) {
    // Override in subclasses
  }

  async cleanup() {
    // Override in subclasses
  }
}

export default PluginLoader;
