/**
 * RinaWarp Terminal Plugin System
 * Defines architecture, API, and implementation for plugins
 */

class PluginSystem {
  constructor() {
    this.plugins = new Map();
    this.api = this.createPluginAPI();
    this.init();
  }

  init() {
    // Load initial plugins
    // Check for updates
    this.loadInstalledPlugins();
    console.log('🧩 Plugin system initialized');
  }

  createPluginAPI() {
    return {
      register: (name, plugin) => this.registerPlugin(name, plugin),
      unregister: name => this.unregisterPlugin(name),
      get: name => this.plugins.get(name),
    };
  }

  registerPlugin(name, plugin) {
    if (this.plugins.has(name)) {
      console.warn(`Plugin ${name} is already registered.`);
      return;
    }
    this.plugins.set(name, plugin);
    console.log(`Plugin ${name} registered successfully!`);
    plugin.onRegister?.();
  }

  unregisterPlugin(name) {
    if (!this.plugins.has(name)) {
      console.warn(`Plugin ${name} is not registered.`);
      return;
    }
    const plugin = this.plugins.get(name);
    plugin.onUnregister?.();
    this.plugins.delete(name);
    console.log(`Plugin ${name} unregistered successfully!`);
  }

  loadInstalledPlugins() {
    // Auto-load plugins from a directory or storage
    // Example logic (implementation varies)
    console.log('Loading installed plugins...');
  }

  getPluginUI() {
    return `<div>
             <h3>Plugin Manager</h3>
             <div id="plugin-list"></div>
             <button onclick="loadPlugin()">Load Plugin</button>
           </div>`;
  }
}

window.RinaWarpPluginSystem = new PluginSystem();

document.addEventListener('DOMContentLoaded', () => {
  document.body.insertAdjacentHTML('beforeend', window.RinaWarpPluginSystem.getPluginUI());
});

function loadPlugin() {
  const pluginName = prompt('Enter plugin name:');
  // Simulate plugin loading
  if (pluginName) {
    window.RinaWarpPluginSystem.registerPlugin(pluginName, {
      onRegister: () => alert(`${pluginName} loaded successfully!`),
      onUnregister: () => alert(`${pluginName} unloaded successfully!`),
    });
  }
}
