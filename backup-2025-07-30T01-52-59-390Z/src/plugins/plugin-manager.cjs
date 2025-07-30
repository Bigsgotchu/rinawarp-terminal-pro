/**
 * Plugin Manager for RinaWarp Terminal
 * Provides extensible architecture for custom features and third-party integrations
 */

const fs = require('fs');
const path = require('path');
const config = require('../config/unified-config.cjs');

class PluginManager {
  constructor(terminal, aiAssistant, voiceEngine, themeManager) {
    this.terminal = terminal;
    this.aiAssistant = aiAssistant;
    this.voiceEngine = voiceEngine;
    this.themeManager = themeManager;

    this.plugins = new Map();
    this.pluginHooks = new Map();
    this.pluginAPI = this.createPluginAPI();

    this.pluginsDirectory = path.join(__dirname, '../../plugins');
    this.userPluginsDirectory = path.join(
      process.env.HOME || process.env.USERPROFILE,
      '.rinawarp-terminal',
      'plugins'
    );

    this.ensurePluginDirectories();
    this.initializePluginSystem();
  }

  ensurePluginDirectories() {
    // Create plugin directories if they don't exist
    for (const dir of [this.pluginsDirectory, this.userPluginsDirectory]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  createPluginAPI() {
    return {
      // Terminal API
      terminal: {
        write: data => this.terminal?.terminal?.write(data),
        writeln: data => this.terminal?.terminal?.writeln(data),
        clear: () => this.terminal?.terminal?.clear(),
        focus: () => this.terminal?.terminal?.focus(),
        getSelection: () => this.terminal?.terminal?.getSelection(),
        onData: callback => this.terminal?.terminal?.onData(callback),
        onResize: callback => this.terminal?.terminal?.onResize(callback),
      },

      // AI API
      ai: {
        getSuggestions: input => this.aiAssistant?.getSmartSuggestions(input),
        showHelp: () => this.aiAssistant?.showAIHelpDialog(),
        addKnowledge: (command, description) =>
          this.aiAssistant?.addKnowledge(command, description),
        isEnabled: () => this.aiAssistant?.aiEnabled,
      },

      // Voice API
      voice: {
        speak: (text, options) => this.voiceEngine?.speak(text, options),
        addCommand: (phrase, command) => this.voiceEngine?.addCustomCommand(phrase, command),
        removeCommand: phrase => this.voiceEngine?.removeCustomCommand(phrase),
        isListening: () => this.voiceEngine?.isListening,
        isEnabled: () => this.voiceEngine?.voiceEnabled,
      },

      // Theme API
      theme: {
        getCurrentTheme: () => this.themeManager?.currentTheme,
        setTheme: themeName => this.themeManager?.setTheme(themeName),
        addTheme: (name, themeData) => this.themeManager?.addCustomTheme(name, themeData),
        getThemes: () => this.themeManager?.getThemeNames(),
      },

      // UI API
      ui: {
        showNotification: this.showNotification.bind(this),
        addMenuItem: this.addMenuItem.bind(this),
        addButton: this.addButton.bind(this),
        addPanel: this.addPanel.bind(this),
        addStatusItem: this.addStatusItem.bind(this),
      },

      // Configuration API
      config: {
        get: key => config.get(key),
        set: (key, value) => config.set(key, value),
        getPluginConfig: pluginId => config.get(`plugins.${pluginId}`) || {},
        setPluginConfig: (pluginId, pluginConfig) =>
          config.set(`plugins.${pluginId}`, pluginConfig),
      },

      // Hooks API
      hooks: {
        register: this.registerHook.bind(this),
        trigger: this.triggerHook.bind(this),
        remove: this.removeHook.bind(this),
      },

      // Utils API
      utils: {
        executeCommand: this.executeCommand.bind(this),
        getWorkingDirectory: () => process.cwd(),
        getPlatform: () => process.platform,
        showDialog: this.showDialog.bind(this),
        loadResource: this.loadResource.bind(this),
      },
    };
  }

  initializePluginSystem() {
    this.loadBuiltinPlugins();
    this.loadUserPlugins();
    this.createPluginUI();
  }

  loadBuiltinPlugins() {
    try {
      const builtinPath = this.pluginsDirectory;
      if (fs.existsSync(builtinPath)) {
        const pluginDirs = fs
          .readdirSync(builtinPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

        for (const pluginDir of pluginDirs) {
          this.loadPlugin(path.join(builtinPath, pluginDir), 'builtin');
        }
      }
    } catch (error) {
      console.warn('Failed to load builtin plugins:', error);
    }
  }

  loadUserPlugins() {
    try {
      const userPath = this.userPluginsDirectory;
      if (fs.existsSync(userPath)) {
        const pluginDirs = fs
          .readdirSync(userPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);

        for (const pluginDir of pluginDirs) {
          this.loadPlugin(path.join(userPath, pluginDir), 'user');
        }
      }
    } catch (error) {
      console.warn('Failed to load user plugins:', error);
    }
  }

  loadPlugin(pluginPath, type = 'user') {
    try {
      const manifestPath = path.join(pluginPath, 'plugin.json');
      const mainPath = path.join(pluginPath, 'main.cjs');

      if (!fs.existsSync(manifestPath) || !fs.existsSync(mainPath)) {
        console.warn(`Invalid plugin at ${pluginPath}: missing plugin.json or main.cjs`);
        return false;
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      // Validate manifest
      if (!this.validatePluginManifest(manifest)) {
        console.warn(`Invalid plugin manifest at ${pluginPath}`);
        return false;
      }

      // Check if plugin is enabled
      const pluginConfig = config.get(`plugins.${manifest.id}`) || {};
      if (pluginConfig.enabled === false) {
        console.log(`Plugin ${manifest.id} is disabled`);
        return false;
      }

      // Load plugin main file
      delete require.cache[require.resolve(mainPath)]; // Clear cache
      const PluginClass = require(mainPath);

      // Create plugin instance
      const plugin = new PluginClass(this.pluginAPI, manifest);

      // Store plugin
      this.plugins.set(manifest.id, {
        instance: plugin,
        manifest: manifest,
        path: pluginPath,
        type: type,
        enabled: true,
      });

      // Initialize plugin
      if (typeof plugin.initialize === 'function') {
        plugin.initialize();
      }

      console.log(`✅ Loaded plugin: ${manifest.name} v${manifest.version}`);
      return true;
    } catch (error) {
      console.error(`Failed to load plugin at ${pluginPath}:`, error);
      return false;
    }
  }

  validatePluginManifest(manifest) {
    const required = ['id', 'name', 'version', 'description', 'author'];
    return required.every(field => manifest[field]);
  }

  unloadPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    try {
      // Call plugin cleanup
      if (typeof plugin.instance.destroy === 'function') {
        plugin.instance.destroy();
      }

      // Remove hooks
      this.removePluginHooks(pluginId);

      // Remove from plugins map
      this.plugins.delete(pluginId);

      console.log(`✅ Unloaded plugin: ${plugin.manifest.name}`);
      return true;
    } catch (error) {
      console.error(`Failed to unload plugin ${pluginId}:`, error);
      return false;
    }
  }

  enablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.enabled = true;
      config.set(`plugins.${pluginId}.enabled`, true);
      return true;
    }
    return false;
  }

  disablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.enabled = false;
      config.set(`plugins.${pluginId}.enabled`, false);

      // Call plugin disable
      if (typeof plugin.instance.disable === 'function') {
        plugin.instance.disable();
      }
      return true;
    }
    return false;
  }

  getPlugins() {
    return Array.from(this.plugins.entries()).map(([id, plugin]) => ({
      id,
      name: plugin.manifest.name,
      version: plugin.manifest.version,
      description: plugin.manifest.description,
      author: plugin.manifest.author,
      type: plugin.type,
      enabled: plugin.enabled,
    }));
  }

  getPlugin(pluginId) {
    return this.plugins.get(pluginId);
  }

  // Hook system
  registerHook(event, callback, pluginId = 'unknown') {
    if (!this.pluginHooks.has(event)) {
      this.pluginHooks.set(event, []);
    }

    this.pluginHooks.get(event).push({
      callback,
      pluginId,
    });
  }

  triggerHook(event, ...args) {
    const hooks = this.pluginHooks.get(event);
    if (!hooks) return;

    hooks.forEach(hook => {
      try {
        hook.callback(...args);
      } catch (error) {
        console.error(`Hook error in plugin ${hook.pluginId}:`, error);
      }
    });
  }

  removeHook(event, pluginId) {
    const hooks = this.pluginHooks.get(event);
    if (!hooks) return;

    const filtered = hooks.filter(hook => hook.pluginId !== pluginId);
    this.pluginHooks.set(event, filtered);
  }

  removePluginHooks(pluginId) {
    for (const [event] of this.pluginHooks) {
      this.removeHook(event, pluginId);
    }
  }

  // UI Helper methods
  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `plugin-notification plugin-notification-${type}`;
    notification.textContent = message;

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--accent-color, #00ff88);
      color: var(--bg-primary, #1a1a1a);
      padding: 10px 15px;
      border-radius: 5px;
      z-index: 10000;
      font-size: 0.9rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideInRight 0.3s ease;
      max-width: 300px;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }

  addMenuItem(label, callback, _icon = '') {
    // Add to context menu or main menu
    console.log(`Adding menu item: ${label}`);
  }

  addButton(label, callback, container = 'header') {
    const button = document.createElement('button');
    button.textContent = label;
    button.className = 'plugin-button';
    button.onclick = callback;

    button.style.cssText = `
      background: var(--border-color, #3a3a3a);
      color: var(--fg-primary, #ffffff);
      border: 1px solid var(--border-color, #3a3a3a);
      border-radius: 3px;
      padding: 5px 10px;
      margin: 0 5px;
      cursor: pointer;
      font-size: 0.8rem;
    `;

    // Add to specified container
    const targetContainer =
      document.querySelector(`.${container}-controls`) ||
      document.querySelector('.header-controls');
    if (targetContainer) {
      targetContainer.appendChild(button);
    }

    return button;
  }

  addPanel(id, title, content) {
    const panel = document.createElement('div');
    panel.id = `plugin-panel-${id}`;
    panel.className = 'plugin-panel';
    panel.innerHTML = `
      <div class="plugin-panel-header">
        <h3>${title}</h3>
        <button class="close-plugin-panel">×</button>
      </div>
      <div class="plugin-panel-content">${content}</div>
    `;

    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--bg-primary, #1a1a1a);
      border: 1px solid var(--border-color, #3a3a3a);
      border-radius: 10px;
      width: 400px;
      max-height: 600px;
      z-index: 10000;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
    `;

    document.body.appendChild(panel);

    panel.querySelector('.close-plugin-panel').onclick = () => panel.remove();

    return panel;
  }

  addStatusItem(text, icon = '') {
    const statusBar = document.querySelector('.status-bar .status-right');
    if (statusBar) {
      const item = document.createElement('span');
      item.className = 'plugin-status-item';
      item.innerHTML = `${icon} ${text}`;
      item.style.marginLeft = '10px';
      statusBar.appendChild(item);
      return item;
    }
    return null;
  }

  executeCommand(command) {
    if (this.terminal?.terminal) {
      this.terminal.terminal.write(command + '\r');
    }
  }

  showDialog(title, message, buttons = ['OK']) {
    return new Promise(resolve => {
      const dialog = document.createElement('div');
      dialog.className = 'plugin-dialog';
      dialog.innerHTML = `
        <div class="plugin-dialog-content">
          <h3>${title}</h3>
          <p>${message}</p>
          <div class="plugin-dialog-buttons">
            ${buttons.map((btn, i) => `<button data-index="${i}">${btn}</button>`).join('')}
          </div>
        </div>
      `;

      dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      `;

      document.body.appendChild(dialog);

      dialog.addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON') {
          const index = parseInt(e.target.dataset.index);
          dialog.remove();
          resolve(index);
        }
      });
    });
  }

  loadResource(url) {
    return fetch(url).then(response => response.text());
  }

  createPluginUI() {
    this.createPluginManagerButton();
  }

  createPluginManagerButton() {
    const button = document.createElement('button');
    button.innerHTML = '🔌 Plugins';
    button.className = 'plugin-manager-button';
    button.title = 'Manage Plugins';
    button.onclick = () => this.showPluginManager();

    button.style.cssText = `
      background: var(--border-color, #3a3a3a);
      color: var(--fg-primary, #ffffff);
      border: 1px solid var(--border-color, #3a3a3a);
      border-radius: 3px;
      padding: 5px 10px;
      margin: 0 5px;
      cursor: pointer;
      font-size: 0.8rem;
    `;

    const headerControls = document.querySelector('.header-controls');
    if (headerControls) {
      headerControls.insertBefore(button, headerControls.firstChild);
    }
  }

  showPluginManager() {
    const plugins = this.getPlugins();
    const content = `
      <div class="plugin-manager">
        <div class="plugin-list">
          <h4>Installed Plugins (${plugins.length})</h4>
          ${plugins
    .map(
      plugin => `
            <div class="plugin-item" data-plugin-id="${plugin.id}">
              <div class="plugin-info">
                <strong>${plugin.name}</strong> v${plugin.version}
                <br><small>${plugin.description}</small>
                <br><small>by ${plugin.author} • ${plugin.type}</small>
              </div>
              <div class="plugin-actions">
                <button onclick="pluginManager.${plugin.enabled ? 'disablePlugin' : 'enablePlugin'}('${plugin.id}')">
                  ${plugin.enabled ? 'Disable' : 'Enable'}
                </button>
                ${plugin.type === 'user' ? `<button onclick="pluginManager.unloadPlugin('${plugin.id}')">Remove</button>` : ''}
              </div>
            </div>
          `
    )
    .join('')}
        </div>
        <div class="plugin-actions-section">
          <button onclick="pluginManager.refreshPlugins()">🔄 Refresh</button>
          <button onclick="pluginManager.openPluginDirectory()">📁 Open Plugin Folder</button>
          <button onclick="pluginManager.createSamplePlugin()">➕ Create Sample Plugin</button>
        </div>
      </div>
    `;

    this.addPanel('plugin-manager', '🔌 Plugin Manager', content);

    // Make plugin manager available globally for button callbacks
    window.pluginManager = this;
  }

  refreshPlugins() {
    // Reload all plugins
    this.plugins.clear();
    this.pluginHooks.clear();
    this.loadBuiltinPlugins();
    this.loadUserPlugins();

    // Close and reopen plugin manager
    const panel = document.getElementById('plugin-panel-plugin-manager');
    if (panel) {
      panel.remove();
      this.showPluginManager();
    }

    this.showNotification('Plugins refreshed!', 'success');
  }

  openPluginDirectory() {
    const { shell } = require('electron');
    shell.openPath(this.userPluginsDirectory);
  }

  createSamplePlugin() {
    this.createSamplePluginFiles();
    this.showNotification('Sample plugin created in user plugins directory!', 'success');
  }

  createSamplePluginFiles() {
    const samplePluginDir = path.join(this.userPluginsDirectory, 'sample-plugin');

    if (!fs.existsSync(samplePluginDir)) {
      fs.mkdirSync(samplePluginDir, { recursive: true });
    }

    // Create plugin.json
    const manifest = {
      id: 'sample-plugin',
      name: 'Sample Plugin',
      version: '1.0.0',
      description: 'A sample plugin demonstrating RinaWarp Terminal plugin capabilities',
      author: 'RinaWarp Developer',
      main: 'main.cjs',
      permissions: ['terminal', 'ui', 'config'],
      hooks: ['terminal:command', 'ui:ready'],
    };

    fs.writeFileSync(path.join(samplePluginDir, 'plugin.json'), JSON.stringify(manifest, null, 2));

    // Create main.cjs
    const mainCode = `/**
 * Sample Plugin for RinaWarp Terminal
 * Demonstrates plugin API usage
 */

class SamplePlugin {
  constructor(api, manifest) {
    this.api = api;
    this.manifest = manifest;
    this.name = manifest.name;
  }
  
  initialize() {
    console.log(\`\${this.name} initialized!\`);
    
    // Add a sample button
    this.api.ui.addButton('Sample', () => {
      this.api.ui.showNotification('Hello from Sample Plugin!', 'success');
    });
    
    // Add a voice command
    this.api.voice.addCommand('sample plugin', 'echo "Sample plugin activated!"');
    
    // Register for terminal commands
    this.api.hooks.register('terminal:command', this.onTerminalCommand.bind(this), this.manifest.id);
    
    // Add sample status item
    this.api.ui.addStatusItem('Sample: Active', '🔌');
  }
  
  onTerminalCommand(command) {
    if (command.startsWith('sample')) {
      this.api.terminal.writeln('🔌 Sample plugin received command: ' + command);
    }
  }
  
  disable() {
    console.log(\`\${this.name} disabled\`);
  }
  
  destroy() {
    console.log(\`\${this.name} destroyed\`);
  }
}

module.exports = SamplePlugin;`;

    fs.writeFileSync(path.join(samplePluginDir, 'main.cjs'), mainCode);
  }
}

module.exports = PluginManager;
