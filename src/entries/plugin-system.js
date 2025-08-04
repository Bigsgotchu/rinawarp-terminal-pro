/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Plugin System Entry Point
 * Lazy-loaded plugin management and extensibility functionality
 */

import { PluginManager } from '@/plugins/plugin-manager.js';
import { PluginLoader } from '@/plugins/plugin-loader.js';
import { PluginSystem } from '@/plugins/pluginSystem.js';

class RinaWarpPluginFeature {
  constructor(terminal) {
    this.terminal = terminal;
    this.pluginManager = null;
    this.pluginLoader = null;
    this.pluginSystem = null;
    this.loadedPlugins = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize plugin components
      this.pluginManager = new PluginManager();
      this.pluginLoader = new PluginLoader();
      this.pluginSystem = new PluginSystem();

      // Set up commands
      this.setupCommands();

      // Initialize components
      await this.pluginManager.initialize();
      await this.pluginLoader.initialize();
      await this.pluginSystem.initialize();

      // Load built-in plugins
      await this.loadBuiltinPlugins();

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Plugin System:', error);
      throw new Error(new Error(error));
    }
  }

  setupCommands() {
    this.terminal.addCommand('plugins', action => this.handlePluginCommand(action));
    this.terminal.addCommand('plugin', (action, ...args) =>
      this.handleSinglePluginCommand(action, ...args)
    );
    this.terminal.addCommand('install-plugin', url => this.installPlugin(url));
    this.terminal.addCommand('uninstall-plugin', name => this.uninstallPlugin(name));
    this.terminal.addCommand('plugin-help', () => this.showPluginHelp());
  }

  async loadBuiltinPlugins() {
    const builtinPlugins = ['predictive-completion', 'ai-debugging-assistant'];

    for (const pluginName of builtinPlugins) {
      try {
        await this.loadPlugin(pluginName);
      } catch (error) {
        console.warn(`Failed to load builtin plugin ${pluginName}:`, error);
      }
    }
  }

  async handlePluginCommand(action) {
    switch (action) {
    case 'list':
      this.listPlugins();
      break;

    case 'loaded':
      this.listLoadedPlugins();
      break;

    case 'available':
      this.listAvailablePlugins();
      break;

    case 'reload':
      await this.reloadAllPlugins();
      break;

    case 'status':
      this.showPluginStatus();
      break;

    default:
      this.showPluginHelp();
    }
  }

  async handleSinglePluginCommand(action, pluginName, ...args) {
    if (!pluginName) {
      this.terminal.writeLine('Usage: plugin \u003caction\u003e \u003cplugin-name\u003e [args...]');
      return;
    }

    switch (action) {
    case 'load':
      await this.loadPlugin(pluginName);
      break;

    case 'unload':
      await this.unloadPlugin(pluginName);
      break;

    case 'reload':
      await this.reloadPlugin(pluginName);
      break;

    case 'info':
      this.showPluginInfo(pluginName);
      break;

    case 'config':
      await this.configurePlugin(pluginName, args);
      break;

    default:
      this.terminal.writeLine(`Unknown plugin action: ${action}`);
    }
  }

  async loadPlugin(pluginName) {
    if (this.loadedPlugins.has(pluginName)) {
      this.terminal.writeLine(`Plugin '${pluginName}' is already loaded`);
      return;
    }

    try {
      this.terminal.showLoadingIndicator(`Loading plugin: ${pluginName}...`);

      const plugin = await this.pluginLoader.loadPlugin(pluginName);

      // Initialize plugin with terminal context
      if (plugin.initialize) {
        await plugin.initialize(this.terminal);
      }

      this.loadedPlugins.set(pluginName, plugin);
      this.terminal.hideLoadingIndicator();
      this.terminal.writeSuccess(`✅ Plugin '${pluginName}' loaded successfully!`);

      // Register plugin commands if available
      if (plugin.commands) {
        Object.entries(plugin.commands).forEach(([command, handler]) => {
          this.terminal.addCommand(`${pluginName}:${command}`, handler.bind(plugin));
        });
      }
    } catch (error) {
      this.terminal.hideLoadingIndicator();
      this.terminal.writeError(`❌ Failed to load plugin '${pluginName}': ${error.message}`);
    }
  }

  async unloadPlugin(pluginName) {
    const plugin = this.loadedPlugins.get(pluginName);
    if (!plugin) {
      this.terminal.writeLine(`Plugin '${pluginName}' is not loaded`);
      return;
    }

    try {
      // Cleanup plugin
      if (plugin.cleanup) {
        await plugin.cleanup();
      }

      // Remove plugin commands
      if (plugin.commands) {
        Object.keys(plugin.commands).forEach(command => {
          this.terminal.removeCommand(`${pluginName}:${command}`);
        });
      }

      this.loadedPlugins.delete(pluginName);
      this.terminal.writeSuccess(`✅ Plugin '${pluginName}' unloaded successfully!`);
    } catch (error) {
      this.terminal.writeError(`❌ Failed to unload plugin '${pluginName}': ${error.message}`);
    }
  }

  async reloadPlugin(pluginName) {
    if (this.loadedPlugins.has(pluginName)) {
      await this.unloadPlugin(pluginName);
    }
    await this.loadPlugin(pluginName);
  }

  async reloadAllPlugins() {
    const pluginNames = Array.from(this.loadedPlugins.keys());

    this.terminal.writeLine(`Reloading ${pluginNames.length} plugins...`);

    for (const pluginName of pluginNames) {
      await this.reloadPlugin(pluginName);
    }

    this.terminal.writeSuccess('✅ All plugins reloaded!');
  }

  listPlugins() {
    const loaded = Array.from(this.loadedPlugins.keys());
    const available = this.pluginSystem.getAvailablePlugins();

    this.terminal.writeLine(`
🔌 Plugin System Overview:
=========================
Loaded Plugins (${loaded.length}):
${loaded.map(name => `  ✅ ${name}`).join('\\n') || '  (none)'}

Available Plugins (${available.length}):
${available.map(name => `  📦 ${name}${loaded.includes(name) ? ' (loaded)' : ''}`).join('\\n')}
    `);
  }

  listLoadedPlugins() {
    const loaded = Array.from(this.loadedPlugins.entries());

    if (loaded.length === 0) {
      this.terminal.writeLine('No plugins are currently loaded');
      return;
    }

    this.terminal.writeLine(`
🔌 Loaded Plugins (${loaded.length}):
${'='.repeat(25)}
    `);

    loaded.forEach(([name, plugin]) => {
      const info = plugin.getInfo ? plugin.getInfo() : { version: 'unknown' };
      this.terminal.writeLine(`  ✅ ${name} v${info.version}`);
      if (info.description) {
        this.terminal.writeLine(`     ${info.description}`);
      }
    });
  }

  listAvailablePlugins() {
    const available = this.pluginSystem.getAvailablePlugins();
    const loaded = Array.from(this.loadedPlugins.keys());

    this.terminal.writeLine(`
📦 Available Plugins (${available.length}):
${'='.repeat(30)}
    `);

    available.forEach(plugin => {
      const status = loaded.includes(plugin.name) ? '✅ Loaded' : '⏳ Available';
      this.terminal.writeLine(`  ${status} ${plugin.name} v${plugin.version}`);
      this.terminal.writeLine(`     ${plugin.description}`);
    });
  }

  showPluginInfo(pluginName) {
    const plugin = this.loadedPlugins.get(pluginName);

    if (!plugin) {
      this.terminal.writeError(`Plugin '${pluginName}' is not loaded`);
      return;
    }

    const info = plugin.getInfo ? plugin.getInfo() : {};

    this.terminal.writeLine(`
🔌 Plugin Information: ${pluginName}
${'='.repeat(35)}
Name: ${info.name || pluginName}
Version: ${info.version || 'unknown'}
Author: ${info.author || 'unknown'}
Description: ${info.description || 'No description available'}
Commands: ${
  plugin.commands
    ? Object.keys(plugin.commands)
      .map(cmd => `${pluginName}:${cmd}`)
      .join(', ')
    : 'none'
}
Status: ${this.loadedPlugins.has(pluginName) ? '✅ Loaded' : '❌ Not Loaded'}
    `);
  }

  async configurePlugin(pluginName, args) {
    const plugin = this.loadedPlugins.get(pluginName);

    if (!plugin) {
      this.terminal.writeError(`Plugin '${pluginName}' is not loaded`);
      return;
    }

    if (!plugin.configure) {
      this.terminal.writeLine(`Plugin '${pluginName}' does not support configuration`);
      return;
    }

    try {
      await plugin.configure(args);
      this.terminal.writeSuccess(`✅ Plugin '${pluginName}' configured successfully!`);
    } catch (error) {
      this.terminal.writeError(`❌ Failed to configure plugin '${pluginName}': ${error.message}`);
    }
  }

  showPluginStatus() {
    const stats = {
      loaded: this.loadedPlugins.size,
      available: this.pluginSystem.getAvailablePlugins().length,
      system: this.pluginSystem.isEnabled(),
      loader: this.pluginLoader.isReady(),
    };

    this.terminal.writeLine(`
🔌 Plugin System Status:
=======================
Loaded Plugins: ${stats.loaded}
Available Plugins: ${stats.available}
System Status: ${stats.system ? '✅ Enabled' : '❌ Disabled'}
Loader Status: ${stats.loader ? '✅ Ready' : '❌ Not Ready'}
Plugin Directory: ${this.pluginSystem.getPluginDirectory()}
    `);
  }

  async installPlugin(url) {
    if (!url) {
      this.terminal.writeLine('Usage: install-plugin \u003curl\u003e');
      return;
    }

    try {
      this.terminal.showLoadingIndicator(`Installing plugin from: ${url}...`);
      await this.pluginManager.installPlugin(url);
      this.terminal.hideLoadingIndicator();
      this.terminal.writeSuccess('✅ Plugin installed successfully!');
    } catch (error) {
      this.terminal.hideLoadingIndicator();
      this.terminal.writeError(`❌ Failed to install plugin: ${error.message}`);
    }
  }

  async uninstallPlugin(name) {
    if (!name) {
      this.terminal.writeLine('Usage: uninstall-plugin \u003cname\u003e');
      return;
    }

    try {
      // Unload if currently loaded
      if (this.loadedPlugins.has(name)) {
        await this.unloadPlugin(name);
      }

      await this.pluginManager.uninstallPlugin(name);
      this.terminal.writeSuccess(`✅ Plugin '${name}' uninstalled successfully!`);
    } catch (error) {
      this.terminal.writeError(`❌ Failed to uninstall plugin '${name}': ${error.message}`);
    }
  }

  showPluginHelp() {
    this.terminal.writeLine(`
🔌 Plugin System Commands:
==========================
  plugins list           - List all plugins
  plugins loaded         - List loaded plugins
  plugins available      - List available plugins
  plugins reload         - Reload all plugins
  plugins status         - Show plugin system status
  
  plugin load \u003cname\u003e      - Load a plugin
  plugin unload \u003cname\u003e    - Unload a plugin
  plugin reload \u003cname\u003e    - Reload a plugin
  plugin info \u003cname\u003e      - Show plugin information
  plugin config \u003cname\u003e    - Configure a plugin
  
  install-plugin \u003curl\u003e    - Install plugin from URL
  uninstall-plugin \u003cname\u003e - Uninstall a plugin

Examples:
  plugins list
  plugin load ai-debugging-assistant
  plugin info predictive-completion
  install-plugin https://example.com/my-plugin.js
    `);
  }

  async cleanup() {
    // Unload all plugins
    const pluginNames = Array.from(this.loadedPlugins.keys());
    for (const pluginName of pluginNames) {
      await this.unloadPlugin(pluginName);
    }

    if (this.pluginManager) {
      await this.pluginManager.cleanup();
    }
    if (this.pluginLoader) {
      await this.pluginLoader.cleanup();
    }
    if (this.pluginSystem) {
      await this.pluginSystem.cleanup();
    }

    this.initialized = false;
  }

  // Public API
  getPluginManager() {
    return this.pluginManager;
  }

  getPluginLoader() {
    return this.pluginLoader;
  }

  getPluginSystem() {
    return this.pluginSystem;
  }

  getLoadedPlugins() {
    return Array.from(this.loadedPlugins.keys());
  }

  getPlugin(name) {
    return this.loadedPlugins.get(name);
  }

  isPluginLoaded(name) {
    return this.loadedPlugins.has(name);
  }
}

export default RinaWarpPluginFeature;
