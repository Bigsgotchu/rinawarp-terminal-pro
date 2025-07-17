/**
 * RinaWarp Terminal Plugin Integration
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * Integrates the plugin system with the main terminal application
 */

import { PluginLoader } from './plugins/plugin-loader.js';
import { PredictiveCompletionPlugin } from './plugins/predictive-completion.js';
import { AIDebuggingAssistantPlugin } from './plugins/ai-debugging-assistant.js';
import { _SafeAIWrapper } from './ai/safe-ai-wrapper.js';

export class TerminalPluginManager {
  constructor() {
    this.pluginLoader = new PluginLoader();
    this.plugins = new Map();
    this.isInitialized = false;

    console.log('🔌 Terminal Plugin Manager initialized');
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
      throw error;
    }
  }

  async registerCorePlugins() {
    console.log('📦 Registering core plugins...');

    // Register Predictive Completion Plugin
    const predictivePlugin = new PredictiveCompletionPlugin();
    this.pluginLoader.register(predictivePlugin);
    this.plugins.set('PredictiveCompletion', predictivePlugin);

    // Register AI Debugging Assistant Plugin
    const debuggingPlugin = new AIDebuggingAssistantPlugin();
    this.pluginLoader.register(debuggingPlugin);
    this.plugins.set('AIDebuggingAssistant', debuggingPlugin);

    console.log('✅ Core plugins registered');
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
