/**
 * RinaWarp Terminal - Plugin System Integration
 * Integrates the comprehensive plugin system with the main terminal
 */

import { PluginManager } from '../plugin-manager.js';
import { PluginManagerUI } from '../ui/plugin-manager-ui.js';
import { PluginPerformanceMonitor } from '../performance/plugin-performance-monitor.js';
import { PluginCommunityManager } from '../community/plugin-community-manager.js';

export class RinaWarpPluginIntegration {
  constructor(terminalInstance, electronAPI) {
    this.terminal = terminalInstance;
    this.electronAPI = electronAPI;
    this.pluginManager = null;
    this.pluginUI = null;
    this.performanceMonitor = null;
    this.communityManager = null;

    // Terminal manager interface for plugins
    this.terminalManager = this.createTerminalManager();

    this.initialized = false;
    this.initializationPromise = null;
  }

  /**
   * Initialize the plugin system
   */
  async init() {
    if (this.initialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = this._performInit();
    return this.initializationPromise;
  }

  async _performInit() {
    try {
      console.log('🔌 Initializing RinaWarp Plugin System...');

      // Initialize core plugin manager
      this.pluginManager = new PluginManager(this.terminalManager);

      // Initialize UI
      this.pluginUI = new PluginManagerUI(this.pluginManager);

      // Initialize performance monitoring
      this.performanceMonitor = new PluginPerformanceMonitor(this.pluginManager);

      // Initialize community features
      this.communityManager = new PluginCommunityManager(this.pluginManager);

      // Setup integration hooks
      this.setupIntegrationHooks();

      // Setup menu integration
      this.setupMenuIntegration();

      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();

      // Load CSS styles
      await this.loadPluginStyles();

      // Auto-load enabled plugins
      await this.autoLoadPlugins();

      this.initialized = true;
      console.log('✅ Plugin System initialized successfully');

      // Emit initialization event
      this.terminalManager.emit('plugin-system-initialized');

      return true;
    } catch (error) {
      console.error('❌ Plugin System initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create terminal manager interface for plugins
   */
  createTerminalManager() {
    const self = this;

    return {
      // Terminal output methods
      writeToTerminal(text) {
        if (self.terminal && self.terminal.write) {
          self.terminal.write(text);
        }
      },

      // Command execution
      async executeCommand(command) {
        if (self.electronAPI && self.electronAPI.ipcRenderer) {
          return await self.electronAPI.ipcRenderer.invoke('execute-command', command);
        }
        return { success: false, error: 'Command execution not available' };
      },

      // Terminal state
      getCurrentDirectory() {
        return process.cwd ? process.cwd() : '/';
      },

      getHistory() {
        return window.commandHistory || [];
      },

      // Event handling
      on(event, callback) {
        if (typeof window.addEventListener === 'function') {
          window.addEventListener(`terminal-${event}`, callback);
        }
      },

      emit(event, data) {
        if (typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent(`terminal-${event}`, { detail: data }));
        }
      },

      // Terminal output listening
      onOutput(callback) {
        this.on('output', callback);
      },

      // UI extension methods
      addMenuItem(label, callback) {
        self.addMenuItem(label, callback);
      },

      addStatusBarItem(content) {
        self.addStatusBarItem(content);
      },

      showNotification(message, type = 'info') {
        self.showNotification(message, type);
      },

      createPanel(id, content) {
        self.createPanel(id, content);
      },

      addTheme(name, theme) {
        self.addTheme(name, theme);
      },
    };
  }

  /**
   * Setup integration hooks with the main terminal
   */
  setupIntegrationHooks() {
    // Hook into terminal command execution
    if (this.terminal && this.terminal.onData) {
      this.terminal.onData(data => {
        this.terminalManager.emit('terminal-input', data);
      });
    }

    // Hook into terminal resize
    if (this.terminal && this.terminal.onResize) {
      this.terminal.onResize(size => {
        this.terminalManager.emit('terminal-resize', size);
      });
    }

    // Hook into directory changes
    if (this.electronAPI && this.electronAPI.ipcRenderer) {
      this.electronAPI.ipcRenderer.on('directory-changed', (event, directory) => {
        this.terminalManager.emit('directory-changed', directory);
      });
    }
  }

  /**
   * Setup menu integration
   */
  setupMenuIntegration() {
    // Add plugin manager menu item
    this.addMenuItem('Plugin Manager', () => {
      this.pluginUI.show();
    });

    // Add plugin-specific menu items
    this.pluginManager.on('plugin-loaded', pluginName => {
      const plugin = this.pluginManager.plugins.get(pluginName);
      if (plugin && plugin.manifest.menuItems) {
        plugin.manifest.menuItems.forEach(item => {
          this.addMenuItem(item.label, item.callback);
        });
      }
    });
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', event => {
      // Ctrl+Shift+P or Cmd+Shift+P to open plugin manager
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        this.pluginUI.show();
      }

      // Ctrl+Shift+R or Cmd+Shift+R to reload plugins
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        this.reloadAllPlugins();
      }
    });
  }

  /**
   * Load plugin CSS styles
   */
  async loadPluginStyles() {
    const cssPath = new URL('../ui/plugin-manager-ui.css', import.meta.url).href;

    // Check if styles are already loaded
    if (document.querySelector('link[href*="plugin-manager-ui.css"]')) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssPath;
    link.onload = () => {
      console.log('✅ Plugin styles loaded');
    };
    link.onerror = () => {
      console.warn('⚠️ Failed to load plugin styles');
    };

    document.head.appendChild(link);
  }

  /**
   * Auto-load enabled plugins
   */
  async autoLoadPlugins() {
    try {
      const enabledPlugins = JSON.parse(localStorage.getItem('enabled-plugins') || '[]');

      for (const pluginId of enabledPlugins) {
        try {
          await this.pluginManager.marketplace.installPlugin(pluginId);
        } catch (error) {
          console.warn(`Failed to auto-load plugin ${pluginId}:`, error);
        }
      }
    } catch (error) {
      console.warn('Failed to auto-load plugins:', error);
    }
  }

  /**
   * UI extension methods
   */
  addMenuItem(label, callback) {
    // Add to terminal menu if available
    if (window.terminalMenu) {
      window.terminalMenu.addItem(label, callback);
    } else {
      // Create a simple menu if none exists
      this.createSimpleMenu(label, callback);
    }
  }

  createSimpleMenu(label, callback) {
    let menu = document.getElementById('plugin-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'plugin-menu';
      menu.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #2d2d2d;
        border: 1px solid #444;
        border-radius: 6px;
        padding: 8px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      document.body.appendChild(menu);
    }

    const menuItem = document.createElement('button');
    menuItem.textContent = label;
    menuItem.style.cssText = `
      display: block;
      width: 100%;
      padding: 8px 12px;
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
      border-radius: 4px;
      margin-bottom: 4px;
      text-align: left;
    `;
    menuItem.addEventListener('click', callback);
    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.background = '#404040';
    });
    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.background = 'none';
    });

    menu.appendChild(menuItem);
  }

  addStatusBarItem(content) {
    let statusBar = document.getElementById('terminal-status-bar');
    if (!statusBar) {
      statusBar = document.createElement('div');
      statusBar.id = 'terminal-status-bar';
      statusBar.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 24px;
        background: #1a1a1a;
        border-top: 1px solid #333;
        display: flex;
        align-items: center;
        padding: 0 12px;
        font-size: 12px;
        color: #ccc;
        z-index: 999;
      `;
      document.body.appendChild(statusBar);
    }

    const statusItem = document.createElement('span');
    statusItem.innerHTML = content;
    statusItem.style.marginRight = '16px';
    statusBar.appendChild(statusItem);
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `terminal-notification terminal-notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#4a9eff'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      opacity: 0;
      transition: all 0.3s ease;
      max-width: 400px;
      word-wrap: break-word;
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }

  createPanel(id, content) {
    let panel = document.getElementById(id);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = id;
      panel.className = 'terminal-plugin-panel';
      panel.style.cssText = `
        position: fixed;
        right: 20px;
        top: 80px;
        width: 300px;
        max-height: 400px;
        background: #2d2d2d;
        border: 1px solid #444;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 1000;
        overflow-y: auto;
        padding: 16px;
        color: #fff;
      `;
      document.body.appendChild(panel);
    }

    panel.innerHTML = content;
  }

  addTheme(name, theme) {
    // Add theme to terminal theme manager
    if (window.terminalThemeManager) {
      window.terminalThemeManager.addTheme(name, theme);
    } else {
      // Store theme for later use
      window.pluginThemes = window.pluginThemes || {};
      window.pluginThemes[name] = theme;
    }
  }

  /**
   * Plugin management methods
   */
  async reloadAllPlugins() {
    try {
      console.log('🔄 Reloading all plugins...');

      // Get list of active plugins
      const activePlugins = Array.from(this.pluginManager.plugins.keys());

      // Unload all plugins
      for (const pluginName of activePlugins) {
        await this.pluginManager.unloadPlugin(pluginName);
      }

      // Reload all plugins
      for (const pluginName of activePlugins) {
        await this.pluginManager.loadPlugin(pluginName);
      }

      this.showNotification('All plugins reloaded successfully', 'success');
    } catch (error) {
      console.error('Failed to reload plugins:', error);
      this.showNotification('Failed to reload plugins', 'error');
    }
  }

  /**
   * Get plugin system status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      pluginCount: this.pluginManager?.plugins.size || 0,
      activePlugins: this.pluginManager ? Array.from(this.pluginManager.plugins.keys()) : [],
      performanceMonitoring: !!this.performanceMonitor,
      communityFeatures: !!this.communityManager,
    };
  }

  /**
   * Plugin development utilities
   */
  async installLocalPlugin(pluginPath) {
    try {
      const result = await this.pluginManager.loadPlugin(pluginPath);
      if (result) {
        this.showNotification('Plugin installed successfully', 'success');
      } else {
        this.showNotification('Failed to install plugin', 'error');
      }
      return result;
    } catch (error) {
      console.error('Failed to install local plugin:', error);
      this.showNotification('Failed to install plugin: ' + error.message, 'error');
      return false;
    }
  }

  /**
   * Export plugin system for debugging
   */
  exportForDebugging() {
    return {
      pluginManager: this.pluginManager,
      pluginUI: this.pluginUI,
      performanceMonitor: this.performanceMonitor,
      communityManager: this.communityManager,
      terminalManager: this.terminalManager,
    };
  }

  /**
   * Cleanup method
   */
  async cleanup() {
    if (this.performanceMonitor) {
      this.performanceMonitor.stopMonitoring();
    }

    if (this.communityManager) {
      this.communityManager.stopPeriodicSync();
    }

    if (this.pluginManager) {
      // Unload all plugins
      const activePlugins = Array.from(this.pluginManager.plugins.keys());
      for (const pluginName of activePlugins) {
        await this.pluginManager.unloadPlugin(pluginName);
      }
    }

    this.initialized = false;
  }
}

// Global integration instance
let globalPluginIntegration = null;

/**
 * Initialize plugin system integration
 */
export async function initializePluginSystem(terminal, electronAPI) {
  if (globalPluginIntegration) {
    return globalPluginIntegration;
  }

  globalPluginIntegration = new RinaWarpPluginIntegration(terminal, electronAPI);
  await globalPluginIntegration.init();

  // Make available globally for debugging
  window.rinaWarpPluginSystem = globalPluginIntegration.exportForDebugging();

  return globalPluginIntegration;
}

/**
 * Get the global plugin integration instance
 */
export function getPluginSystem() {
  return globalPluginIntegration;
}

export default RinaWarpPluginIntegration;
