/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal Plugin Integration
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * Integrates the plugin system with the main terminal application
 */

// Import plugin components with error handling
import { safeImport, createFallback } from './utils/module-loader.js';

// Initialize plugin components
let PluginLoader = null;
let PredictiveCompletionPlugin = null;
let AIDebuggingAssistantPlugin = null;

// Load plugin components with fallbacks
(async () => {
  try {
    const pluginLoaderModule = await safeImport('./plugins/plugin-loader.js', {
      name: 'PluginLoader',
      fallback: createFallback('PluginLoader', {
        loadAll: async () => ({ success: true, loaded: [], failed: [] }),
        load: async () => ({ success: true }),
        unload: async () => ({ success: true }),
        reload: async () => ({ success: true }),
        getStatus: () => ({ total: 0, loaded: 0, failed: 0, plugins: {} }),
        executeHook: async () => [],
        register: () => {},
      }),
    });
    PluginLoader = pluginLoaderModule.PluginLoader || pluginLoaderModule.default;

    const predictiveModule = await safeImport('./plugins/predictive-completion.js', {
      name: 'PredictiveCompletionPlugin',
      fallback: createFallback('PredictiveCompletionPlugin'),
    });
    PredictiveCompletionPlugin =
      predictiveModule.PredictiveCompletionPlugin || predictiveModule.default;

    const debuggingModule = await safeImport('./plugins/ai-debugging-assistant.js', {
      name: 'AIDebuggingAssistantPlugin',
      fallback: createFallback('AIDebuggingAssistantPlugin'),
    });
    AIDebuggingAssistantPlugin =
      debuggingModule.AIDebuggingAssistantPlugin || debuggingModule.default;
  } catch (error) {
    console.warn('Some plugin components failed to load:', error.message);
  }
})();

export class TerminalPluginManager {
  constructor() {
    this.pluginLoader = null;
    this.plugins = new Map();
    this.isInitialized = false;
    this.initializationPromise = null;

    // Initialize with error handling
    this.initializeLoader();
    console.log('🔌 Terminal Plugin Manager initialized');
  }

  async initializeLoader() {
    try {
      // Wait for components to load
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (PluginLoader) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);

        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 5000);
      });

      if (PluginLoader) {
        this.pluginLoader = new PluginLoader();
        console.log('✅ PluginLoader initialized');
      } else {
        console.warn('⚠️ PluginLoader not available, using fallback');
        this.pluginLoader = this.createFallbackLoader();
      }
    } catch (error) {
      console.error('❌ Failed to initialize PluginLoader:', error);
      this.pluginLoader = this.createFallbackLoader();
    }
  }

  createFallbackLoader() {
    return {
      loadAll: async () => ({ success: true, loaded: [], failed: [] }),
      load: async () => ({ success: true }),
      unload: async () => ({ success: true }),
      reload: async () => ({ success: true }),
      getStatus: () => ({ total: 0, loaded: 0, failed: 0, plugins: {} }),
      executeHook: async () => [],
      register: () => {},
    };
  }

  async initialize(context) {
    console.log('🚀 Initializing Terminal Plugin System...');

    try {
      // Register core plugins
      await this.registerCorePlugins();

      // Load all plugins
      const results = await this.pluginLoader.loadAll(context);

      this.isInitialized = true;
      console.log('✅ Plugin system initialized successfully');

      return results;
    } catch (error) {
      console.error('❌ Plugin system initialization failed:', error);
      throw new Error(error);
    }
  }

  async registerCorePlugins() {
    console.log('📦 Registering core plugins...');

    const registerPlugin = (PluginClass, name) => {
      try {
        if (PluginClass && typeof PluginClass === 'function') {
          const plugin = new PluginClass();
          this.pluginLoader.register(plugin);
          this.plugins.set(name, plugin);
          console.log(`✅ Registered ${name} plugin`);
        } else {
          console.warn(`⚠️ ${name} plugin class not available`);
        }
      } catch (error) {
        console.error(`❌ Failed to register ${name} plugin:`, error.message);
      }
    };

    // Wait for plugin classes to be available
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (PredictiveCompletionPlugin && AIDebuggingAssistantPlugin) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
    });

    // Register Predictive Completion Plugin
    registerPlugin(PredictiveCompletionPlugin, 'PredictiveCompletion');

    // Register AI Debugging Assistant Plugin
    registerPlugin(AIDebuggingAssistantPlugin, 'AIDebuggingAssistant');

    console.log('✅ Core plugins registration complete');
  }

  async loadPlugin(pluginName, context) {
    return await this.pluginLoader.load(pluginName, context);
  }

  async unloadPlugin(pluginName) {
    return await this.pluginLoader.unload(pluginName);
  }

  async reloadPlugin(pluginName, context) {
    return await this.pluginLoader.reload(pluginName, context);
  }

  getPluginStatus() {
    return this.pluginLoader.getStatus();
  }

  async executeHook(hookName, ...args) {
    if (!this.isInitialized) {
      console.warn('Plugin system not initialized, skipping hook:', hookName);
      return [];
    }

    return await this.pluginLoader.executeHook(hookName, ...args);
  }

  // Helper methods for terminal integration
  async enhanceTerminal(terminal, aiWrapper) {
    console.log('🔧 Enhancing terminal with plugins...');

    const context = {
      terminal,
      aiWrapper,
      pluginManager: this,
    };

    // Initialize plugin system
    await this.initialize(context);

    // Add plugin management commands to terminal
    this.addPluginCommands(terminal);

    console.log('✅ Terminal enhanced with plugin system');
  }

  addPluginCommands(terminal) {
    // Add plugin status command
    terminal.addCommand('plugins', {
      description: 'Show plugin status',
      execute: () => {
        const status = this.getPluginStatus();
        terminal.log('\n🔌 Plugin Status:');
        terminal.log(
          `📊 Total: ${status.total} | Loaded: ${status.loaded} | Failed: ${status.failed}`
        );

        terminal.log('\n📋 Plugin Details:');
        for (const [name, plugin] of Object.entries(status.plugins)) {
          const statusIcon =
            plugin.status === 'loaded' ? '✅' : plugin.status === 'failed' ? '❌' : '⏳';
          terminal.log(`  ${statusIcon} ${name} v${plugin.version} - ${plugin.status}`);
          if (plugin.loadTime) {
            terminal.log(`     Load time: ${Math.round(plugin.loadTime)}ms`);
          }
          if (plugin.error) {
            terminal.log(`     Error: ${plugin.error}`);
          }
        }
      },
    });

    // Add plugin reload command
    terminal.addCommand('plugin-reload', {
      description: 'Reload a plugin',
      execute: async args => {
        const pluginName = args[0];
        if (!pluginName) {
          terminal.log('❌ Please specify a plugin name');
          return;
        }

        try {
          await this.reloadPlugin(pluginName, { terminal, aiWrapper: terminal.aiWrapper });
          terminal.log(`✅ Plugin "${pluginName}" reloaded successfully`);
        } catch (error) {
          terminal.log(`❌ Failed to reload plugin "${pluginName}": ${error.message}`);
        }
      },
    });
  }
}

export default TerminalPluginManager;
