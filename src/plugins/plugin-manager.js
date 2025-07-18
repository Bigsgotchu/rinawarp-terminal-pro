/**
 * RinaWarp Terminal - Advanced Plugin Manager
 * Secure plugin architecture with sandboxing and rich API
 */

import { EventEmitter } from 'events';
import { VM } from 'vm2';

export class PluginManager extends EventEmitter {
  constructor(terminalManager) {
    super();
    this.terminalManager = terminalManager;
    this.plugins = new Map();
    this.sandboxes = new Map();
    this.pluginAPI = this.createPluginAPI();
    this.marketplace = new PluginMarketplace(this);
    this.security = new PluginSecurity(this);

    this.init();
  }

  async init() {
    await this.loadInstalledPlugins();
    this.setupEventHandlers();
    this.emit('initialized');
    console.log('🔌 Plugin Manager initialized');
  }

  createPluginAPI() {
    return {
      // Core terminal access
      terminal: {
        write: text => this.terminalManager.writeToTerminal(text),
        execute: command => this.terminalManager.executeCommand(command),
        onOutput: callback => this.terminalManager.onOutput(callback),
        getCurrentDirectory: () => this.terminalManager.getCurrentDirectory(),
        getHistory: () => this.terminalManager.getHistory(),
      },

      async validateNetworkCalls(code) {
        const disallowedUrls = [/evil\.com/];
        const forbiddenMethods = [/fetch\(["']http/];

        const errors = [];
        for (const urlPattern of disallowedUrls) {
          if (urlPattern.test(code)) {
            errors.push(`Disallowed URL pattern: ${urlPattern}`);
          }
        }

        for (const methodPattern of forbiddenMethods) {
          if (methodPattern.test(code)) {
            errors.push(`Forbidden network method: ${methodPattern}`);
          }
        }

        if (errors.length) {
          throw new Error(`Network validation failed: ${errors.join(', ')}`);
        }
      },

      // UI extensions
      ui: {
        addMenuItem: (label, callback) => this.addMenuItem(label, callback),
        addStatusBarItem: content => this.addStatusBarItem(content),
        showNotification: (message, type) => this.showNotification(message, type),
        createPanel: (id, content) => this.createPanel(id, content),
        addTheme: (name, theme) => this.addTheme(name, theme),
      },

      // Settings and storage
      storage: {
        get: key => this.getPluginStorage(key),
        set: (key, value) => this.setPluginStorage(key, value),
        remove: key => this.removePluginStorage(key),
      },

      // Events
      events: {
        on: (event, callback) => this.on(event, callback),
        emit: (event, data) => this.emit(event, data),
        off: (event, callback) => this.off(event, callback),
      },

      // Network requests (sandboxed)
      http: {
        get: (url, options) => this.secureRequest('GET', url, options),
        post: (url, data, options) => this.secureRequest('POST', url, data, options),
        put: (url, data, options) => this.secureRequest('PUT', url, data, options),
        delete: (url, options) => this.secureRequest('DELETE', url, options),
      },

      // File system (restricted)
      fs: {
        readFile: path => this.secureFileRead(path),
        writeFile: (path, content) => this.secureFileWrite(path, content),
        exists: path => this.secureFileExists(path),
        mkdir: path => this.secureFileCreate(path),
      },

      // Utility functions
      utils: {
        debounce: (func, wait) => this.debounce(func, wait),
        throttle: (func, limit) => this.throttle(func, limit),
        uuid: () => this.generateUUID(),
        formatDate: date => this.formatDate(date),
      },
    };
  }

  async loadPlugin(pluginPath, trusted = false) {
    try {
      const pluginCode = await this.loadPluginCode(pluginPath);
      const pluginManifest = await this.loadPluginManifest(pluginPath);

      // Security validation
      await this.security.validatePlugin(pluginManifest, pluginCode);

      // Create secure sandbox
      const sandbox = this.createSandbox(pluginManifest.name, trusted);

      // Execute plugin in sandbox
      const plugin = await this.executePlugin(pluginCode, sandbox);

      // Register plugin
      this.plugins.set(pluginManifest.name, {
        manifest: pluginManifest,
        instance: plugin,
        sandbox: sandbox,
        trusted: trusted,
        active: true,
      });

      this.emit('plugin-loaded', pluginManifest.name);
      return true;
    } catch (error) {
      this.emit('plugin-error', { plugin: pluginPath, error });
      return false;
    }
  }

  createSandbox(pluginName, trusted) {
    const sandbox = {
      console: {
        log: (...args) => console.log(`[${pluginName}]`, ...args),
        warn: (...args) => console.warn(`[${pluginName}]`, ...args),
        error: (...args) => console.error(`[${pluginName}]`, ...args),
      },

      // Restricted global access
      setTimeout: (callback, delay) => setTimeout(callback, Math.min(delay, 5000)),
      setInterval: (callback, delay) => setInterval(callback, Math.max(delay, 100)),

      // Plugin API access
      RinaWarp: this.pluginAPI,

      // Limited Node.js modules for trusted plugins
      ...(trusted
        ? {
            Buffer: Buffer,
            process: {
              env: process.env,
              platform: process.platform,
              version: process.version,
            },
          }
        : {}),
    };

    const vm = new VM({
      timeout: 10000,
      sandbox: sandbox,
      require: {
        external: trusted ? ['fs', 'path', 'crypto'] : false,
        builtin: trusted ? ['fs', 'path', 'crypto'] : [],
      },
    });

    this.sandboxes.set(pluginName, vm);
    return vm;
  }

  async executePlugin(pluginCode, sandbox) {
    try {
      const result = sandbox.run(pluginCode);

      // Ensure plugin exports the required interface
      if (typeof result.init === 'function') {
        await result.init();
      }

      return result;
    } catch (error) {
      throw new Error(`Plugin execution failed: ${error.message}`);
    }
  }

  async unloadPlugin(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    try {
      // Call plugin cleanup
      if (plugin.instance.cleanup) {
        await plugin.instance.cleanup();
      }

      // Remove from sandbox
      this.sandboxes.delete(pluginName);

      // Remove from plugins
      this.plugins.delete(pluginName);

      this.emit('plugin-unloaded', pluginName);
      return true;
    } catch (error) {
      this.emit('plugin-error', { plugin: pluginName, error });
      return false;
    }
  }

  async loadPluginCode(pluginPath) {
    // Load plugin code from file system or remote source
    // Implementation depends on plugin source
    return '';
  }

  async loadPluginManifest(pluginPath) {
    // Load plugin manifest (package.json equivalent)
    return {
      name: 'example-plugin',
      version: '1.0.0',
      description: 'Example plugin',
      author: 'Plugin Author',
      permissions: ['terminal:read', 'ui:modify'],
    };
  }

  async loadInstalledPlugins() {
    try {
      const installedPlugins = await this.getInstalledPlugins();

      for (const pluginPath of installedPlugins) {
        await this.loadPlugin(pluginPath);
      }
    } catch (error) {
      console.error('Failed to load installed plugins:', error);
    }
  }

  async getInstalledPlugins() {
    // Return list of installed plugin paths
    return [];
  }

  // Security methods
  async secureRequest(method, url, dataOrOptions, options = {}) {
    // Implement secure HTTP requests with domain whitelist
    const allowedDomains = ['api.rinawarp.com', 'plugins.rinawarp.com'];
    const urlObj = new URL(url);

    if (!allowedDomains.includes(urlObj.hostname)) {
      throw new Error('Domain not whitelisted for plugin requests');
    }

    // Make request with timeout and size limits
    return fetch(url, {
      method,
      body: method !== 'GET' ? JSON.stringify(dataOrOptions) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: 10000,
    });
  }

  async secureFileRead(path) {
    // Implement secure file reading with path validation
    if (!this.security.validatePath(path)) {
      throw new Error('File path not allowed');
    }
    // Implementation here
  }

  async secureFileWrite(path, content) {
    // Implement secure file writing with path validation
    if (!this.security.validatePath(path)) {
      throw new Error('File path not allowed');
    }
    // Implementation here
  }

  // UI extension methods
  addMenuItem(label, callback) {
    // Add menu item to terminal UI
    this.terminalManager.addMenuItem(label, callback);
  }

  addStatusBarItem(content) {
    // Add status bar item
    this.terminalManager.addStatusBarItem(content);
  }

  showNotification(message, type = 'info') {
    // Show notification
    this.terminalManager.showNotification(message, type);
  }

  createPanel(id, content) {
    // Create UI panel
    this.terminalManager.createPanel(id, content);
  }

  addTheme(name, theme) {
    // Add custom theme
    this.terminalManager.addTheme(name, theme);
  }

  // Storage methods
  getPluginStorage(key) {
    const storageKey = `plugin-${this.currentPlugin}-${key}`;
    return localStorage.getItem(storageKey);
  }

  setPluginStorage(key, value) {
    const storageKey = `plugin-${this.currentPlugin}-${key}`;
    localStorage.setItem(storageKey, JSON.stringify(value));
  }

  removePluginStorage(key) {
    const storageKey = `plugin-${this.currentPlugin}-${key}`;
    localStorage.removeItem(storageKey);
  }

  // Utility methods
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  throttle(func, limit) {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  formatDate(date) {
    return new Date(date).toLocaleString();
  }

  setupEventHandlers() {
    // Setup event handlers for terminal events
    this.terminalManager.on('command-executed', command => {
      this.emit('terminal-command', command);
    });

    this.terminalManager.on('directory-changed', directory => {
      this.emit('terminal-directory-changed', directory);
    });
  }

  getPluginStatus() {
    const status = {};

    for (const [name, plugin] of this.plugins) {
      status[name] = {
        active: plugin.active,
        version: plugin.manifest.version,
        trusted: plugin.trusted,
        permissions: plugin.manifest.permissions,
      };
    }

    return status;
  }
}

// Plugin Security Manager
export class PluginSecurity {
  constructor(pluginManager) {
    this.pluginManager = pluginManager;
    this.allowedPaths = ['/tmp/rinawarp-plugins', '~/.rinawarp/plugins'];
  }

  async validatePlugin(manifest, code) {
    // Validate plugin manifest
    if (!manifest.name || !manifest.version) {
      throw new Error('Invalid plugin manifest');
    }

    // Check permissions
    const requiredPermissions = this.extractRequiredPermissions(code);
    const declaredPermissions = manifest.permissions || [];

    for (const permission of requiredPermissions) {
      if (!declaredPermissions.includes(permission)) {
        throw new Error(`Missing permission: ${permission}`);
      }
    }

    // Static code analysis
    await this.analyzeCode(code);
  }

  extractRequiredPermissions(code) {
    const permissions = [];

    // Simple pattern matching for required permissions
    if (code.includes('RinaWarp.terminal')) {
      permissions.push('terminal:access');
    }

    if (code.includes('RinaWarp.fs')) {
      permissions.push('filesystem:access');
    }

    if (code.includes('RinaWarp.http')) {
      permissions.push('network:access');
    }

    return permissions;
  }

  async analyzeCode(code) {
    // Basic security analysis
    const dangerousPatterns = [
      /eval\(/,
      /new Function\(/,
      /document\.write/,
      /innerHTML\s*=/,
      /exec\(/,
      /spawn\(/,
      /\bexecFile\(/,
      /\bshelljs\/exec/,
      /child_process\//,
      /fs\/(unlink|write|append)/,
      /readFileSync/,
      /write\s*:\s*=\s*function\(/,
      /innerHTML\s*:[^=]/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(`Potentially dangerous code detected: ${pattern}`);
      }
    }
  }

  validatePath(path) {
    // Validate file system paths
    const normalizedPath = path.replace(/\\/g, '/');

    return this.allowedPaths.some(allowedPath => normalizedPath.startsWith(allowedPath));
  }
}

// Plugin Marketplace
export class PluginMarketplace {
  constructor(pluginManager) {
    this.pluginManager = pluginManager;
    this.apiEndpoint = 'https://plugins.rinawarp.com/api';
  }

  async searchPlugins(query) {
    try {
      const response = await fetch(`${this.apiEndpoint}/search?q=${query}`);
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to search plugins: ${error.message}`);
    }
  }

  async getPlugin(pluginId) {
    try {
      const response = await fetch(`${this.apiEndpoint}/plugins/${pluginId}`);
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get plugin: ${error.message}`);
    }
  }

  async installPlugin(pluginId) {
    try {
      const plugin = await this.getPlugin(pluginId);

      // Download plugin
      const pluginCode = await this.downloadPlugin(plugin.downloadUrl);

      // Install plugin
      await this.pluginManager.loadPlugin(pluginCode, plugin.trusted);

      // Save to installed plugins
      await this.saveInstalledPlugin(pluginId);

      return true;
    } catch (error) {
      throw new Error(`Failed to install plugin: ${error.message}`);
    }
  }

  async downloadPlugin(url) {
    const response = await fetch(url);
    return await response.text();
  }

  async saveInstalledPlugin(pluginId) {
    const installed = JSON.parse(localStorage.getItem('installed-plugins') || '[]');
    installed.push(pluginId);
    localStorage.setItem('installed-plugins', JSON.stringify(installed));
  }
}
