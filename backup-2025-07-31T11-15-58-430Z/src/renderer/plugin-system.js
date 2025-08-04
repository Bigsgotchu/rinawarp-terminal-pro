/**
 * Plugin System for RinaWarp Terminal
 * Allows users to extend terminal functionality with custom plugins
 */

export class PluginSystem {
  constructor(terminal) {
    this.terminal = terminal;
    this.plugins = {};
    this.pluginContext = {
      terminal: this.terminal,
      registerCommand: this.registerCommand.bind(this),
    };
  }

  // Load a plugin from URL or local path
  async loadPlugin(urlOrPath) {
    try {
      const module = await import(urlOrPath);
      if (module && typeof module.default === 'function') {
        module.default(this.pluginContext);
      }
    } catch (error) {
      console.error('Failed to load plugin:', error);
    }
  }

  // Register a command within the plugin system
  registerCommand(commandName, handler) {
    if (!commandName || typeof handler !== 'function') {
      console.error('Invalid command registration:', commandName);
      return;
    }
    this.plugins[commandName] = handler;
  }

  // Execute a registered command
  async executeCommand(commandName, ...args) {
    const handler = this.plugins[commandName];
    if (!handler) {
      console.error(`Command not found: ${commandName}`);
      return;
    }
    try {
      await handler(...args);
    } catch (error) {
      console.error('Command execution failed:', error);
    }
  }
}

// Export for use in terminal
window.PluginSystem = PluginSystem;
