/**
 * RinaWarp Terminal - Phase 2 Main Integration
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * This file handles the main integration between the traditional terminal
 * interface and the Phase 2 Next-Generation UI system.
 *
 * Licensed under the MIT License.
 * See LICENSE file for detailed terms and conditions.
 */

import Phase2UIManager from './phase2-ui-manager.js';

// Simple EventEmitter implementation for TerminalManager compatibility
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  once(event, listener) {
    const onceWrapper = (...args) => {
      listener(...args);
      this.removeListener(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }

  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }

  removeListener(event, listener) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(l => l !== listener);
    }
  }

  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

class Phase2MainIntegration {
  constructor() {
    this.phase2UIManager = null;
    this.terminalManager = null;
    this.isPhase2Active = false;
    this.uiMode = 'adaptive'; // Default mode
    this.initialized = false;
  }

  async initialize(terminalManager) {
    try {
      console.log('🔗 Starting Phase 2 Main Integration...');

      this.terminalManager = terminalManager;

      // Initialize Phase 2 UI Manager
      this.phase2UIManager = new Phase2UIManager(terminalManager);

      // Wait for Phase 2 UI to be ready
      await this.waitForPhase2Ready();

      // Setup integration event handlers
      this.setupIntegrationHandlers();

      // Setup UI mode switching
      this.setupUIModeControls();

      // Setup seamless terminal embedding
      this.setupTerminalEmbedding();

      // Apply user preferences
      await this.applyUserPreferences();

      this.initialized = true;
      console.log('✅ Phase 2 Main Integration completed successfully');

      // Notify success
      this.showIntegrationSuccess();
    } catch (error) {
      console.error('❌ Phase 2 Main Integration failed:', error);
      this.handleIntegrationFailure(error);
    }
  }

  async waitForPhase2Ready() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Phase 2 UI initialization timeout'));
      }, 30000);

      this.phase2UIManager.on('phase2-ready', () => {
        clearTimeout(timeout);
        this.isPhase2Active = true;
        resolve();
      });

      this.phase2UIManager.on('phase2-error', error => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  setupIntegrationHandlers() {
    // Terminal Manager Events
    if (this.terminalManager) {
      // When new terminals are created, embed them in Phase 2 UI
      this.terminalManager.on('terminal-created', terminalData => {
        this.embedNewTerminal(terminalData);
      });

      // When terminals are closed, handle cleanup
      this.terminalManager.on('terminal-closed', terminalId => {
        this.handleTerminalClosed(terminalId);
      });

      // When active terminal changes, update Phase 2 UI focus
      this.terminalManager.on('terminal-focused', terminalId => {
        this.updatePhase2Focus(terminalId);
      });
    }

    // Phase 2 UI Manager Events
    if (this.phase2UIManager) {
      // When UI mode changes, sync with terminal manager
      this.phase2UIManager.on('mode-changed', mode => {
        this.syncUIMode(mode);
      });

      // Handle Phase 2 UI notifications
      this.phase2UIManager.on('notification', notification => {
        this.handlePhase2Notification(notification);
      });
    }

    // Global window events
    window.addEventListener('resize', () => {
      this.handleWindowResize();
    });
  }

  setupUIModeControls() {
    // Add UI mode switching controls to the terminal interface
    const statusBar = document.querySelector('.status-right');
    if (statusBar && this.terminalManager?.pluginAPI) {
      this.terminalManager.pluginAPI.addStatusBarItem(
        'phase2-mode-switch',
        `
          <div class="phase2-mode-controls">
            <label for="ui-mode-select" style="color: var(--text-secondary); font-size: 12px;">UI Mode:</label>
            <select id="ui-mode-select" style="background: var(--surface-secondary); color: var(--text-primary); border: 1px solid var(--border-secondary); border-radius: 3px; padding: 2px 4px; font-size: 11px; margin: 0 4px;">
              <option value="adaptive">🧠 Adaptive</option>
              <option value="guided">🎯 Guided</option>
              <option value="visual">🎨 Visual</option>
              <option value="traditional">⚙️ Traditional</option>
              <option value="expert">🚀 Expert</option>
            </select>
          </div>
        `,
        'right'
      );

      // Setup mode selector event handler
      setTimeout(() => {
        const modeSelect = document.getElementById('ui-mode-select');
        if (modeSelect) {
          modeSelect.value = this.uiMode;
          modeSelect.addEventListener('change', e => {
            this.switchUIMode(e.target.value);
          });
        }
      }, 500);
    }
  }

  async switchUIMode(mode) {
    try {
      console.log(`🔄 Switching to ${mode} UI mode...`);

      this.uiMode = mode;

      // Update Phase 2 UI Manager mode
      if (this.phase2UIManager) {
        await this.phase2UIManager.switchMode(mode);
      }

      // Update terminal manager settings
      if (this.terminalManager) {
        this.terminalManager.settings.uiMode = mode;
        this.terminalManager.saveSettings();
      }

      // Save user preference
      localStorage.setItem('rinawarp-ui-mode', mode);

      console.log(`✅ UI mode switched to ${mode}`);
    } catch (error) {
      console.error(`❌ Failed to switch UI mode to ${mode}:`, error);

      if (this.terminalManager?.pluginAPI) {
        this.terminalManager.pluginAPI.showNotification(
          `Failed to switch to ${mode} mode`,
          'error'
        );
      }
    }
  }

  setupTerminalEmbedding() {
    // Embed existing terminals into Phase 2 UI
    if (this.terminalManager && this.phase2UIManager) {
      this.terminalManager.terminals.forEach((terminalData, terminalId) => {
        this.embedExistingTerminal(terminalId, terminalData);
      });
    }
  }

  embedNewTerminal(terminalData) {
    if (!this.isPhase2Active || !this.phase2UIManager) return;

    try {
      const terminalElement = terminalData.element;
      if (terminalElement) {
        this.phase2UIManager.embedTerminal(terminalElement);
        console.log(`🖥️ Terminal ${terminalData.terminalId} embedded in Phase 2 UI`);
      }
    } catch (error) {
      console.error('Failed to embed new terminal:', error);
    }
  }

  embedExistingTerminal(terminalId, terminalData) {
    if (!this.isPhase2Active || !this.phase2UIManager) return;

    try {
      const terminalElement = document.getElementById(`terminal-${terminalId}`);
      if (terminalElement) {
        this.phase2UIManager.embedTerminal(terminalElement);
        console.log(`🖥️ Existing terminal ${terminalId} embedded in Phase 2 UI`);
      }
    } catch (error) {
      console.error('Failed to embed existing terminal:', error);
    }
  }

  handleTerminalClosed(terminalId) {
    // Phase 2 UI Manager will handle terminal cleanup automatically
    console.log(`🗑️ Terminal ${terminalId} closed, Phase 2 UI updated`);
  }

  updatePhase2Focus(terminalId) {
    if (!this.isPhase2Active || !this.phase2UIManager) return;

    try {
      // Phase 2 UI Manager will handle focus management
      console.log(`🎯 Terminal ${terminalId} focused in Phase 2 UI`);
    } catch (error) {
      console.error('Failed to update Phase 2 focus:', error);
    }
  }

  syncUIMode(mode) {
    this.uiMode = mode;

    // Update terminal manager
    if (this.terminalManager) {
      this.terminalManager.settings.uiMode = mode;
      this.terminalManager.saveSettings();
    }

    // Update UI mode selector
    const modeSelect = document.getElementById('ui-mode-select');
    if (modeSelect) {
      modeSelect.value = mode;
    }

    // Save preference
    localStorage.setItem('rinawarp-ui-mode', mode);

    console.log(`🔄 UI mode synced: ${mode}`);
  }

  handlePhase2Notification(notification) {
    // Forward Phase 2 notifications to terminal manager
    if (this.terminalManager?.pluginAPI) {
      this.terminalManager.pluginAPI.showNotification(
        notification.message,
        notification.type,
        notification.duration
      );
    }
  }

  handleWindowResize() {
    // Ensure both terminal manager and Phase 2 UI handle resize properly
    if (this.terminalManager) {
      this.terminalManager.resizeActiveTerminal();
    }

    if (this.phase2UIManager) {
      // Phase 2 UI Manager should handle its own resize logic
    }
  }

  async applyUserPreferences() {
    try {
      // Load saved UI mode
      const savedMode = localStorage.getItem('rinawarp-ui-mode') || 'adaptive';
      if (savedMode !== this.uiMode) {
        await this.switchUIMode(savedMode);
      }

      // Apply other Phase 2 specific preferences
      const phase2Preferences = this.loadPhase2Preferences();
      if (phase2Preferences && this.phase2UIManager) {
        // Apply theme
        if (phase2Preferences.theme) {
          this.phase2UIManager.applyTheme(phase2Preferences.theme);
        }

        // Apply layout preferences
        if (phase2Preferences.layout) {
          // Apply layout preferences through Phase 2 UI Manager
        }
      }
    } catch (error) {
      console.error('Failed to apply user preferences:', error);
    }
  }

  loadPhase2Preferences() {
    try {
      const saved = localStorage.getItem('rinawarp-phase2-preferences');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load Phase 2 preferences:', error);
      return null;
    }
  }

  savePhase2Preferences(preferences) {
    try {
      localStorage.setItem('rinawarp-phase2-preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save Phase 2 preferences:', error);
    }
  }

  showIntegrationSuccess() {
    if (this.terminalManager?.pluginAPI) {
      this.terminalManager.pluginAPI.showNotification(
        '🎉 Phase 2 Next-Generation UI Successfully Integrated!',
        'success',
        5000
      );
    }
  }

  handleIntegrationFailure(error) {
    console.error('Phase 2 Integration failure details:', error);

    if (this.terminalManager?.pluginAPI) {
      this.terminalManager.pluginAPI.showNotification(
        '⚠️ Phase 2 UI integration failed. Using standard interface.',
        'warning',
        5000
      );
    }

    // Ensure terminal still works without Phase 2 UI
    this.isPhase2Active = false;
  }

  // Public API Methods
  isPhase2UIActive() {
    return this.isPhase2Active;
  }

  getCurrentUIMode() {
    return this.uiMode;
  }

  getPhase2UIManager() {
    return this.phase2UIManager;
  }

  async togglePhase2UI() {
    if (this.isPhase2Active) {
      await this.disablePhase2UI();
    } else {
      await this.enablePhase2UI();
    }
  }

  async enablePhase2UI() {
    try {
      if (!this.phase2UIManager) {
        await this.initialize(this.terminalManager);
      } else {
        // Re-enable if previously disabled
        this.isPhase2Active = true;
        this.setupTerminalEmbedding();
      }
    } catch (error) {
      console.error('Failed to enable Phase 2 UI:', error);
    }
  }

  async disablePhase2UI() {
    try {
      this.isPhase2Active = false;

      // Move terminals back to standard container
      if (this.terminalManager) {
        this.terminalManager.terminals.forEach((terminalData, terminalId) => {
          const terminalElement = document.getElementById(`terminal-${terminalId}`);
          const standardContainer = document.querySelector('.terminal-container');

          if (terminalElement && standardContainer) {
            standardContainer.appendChild(terminalElement);
          }
        });
      }

      // Hide Phase 2 UI container
      const phase2Container = document.getElementById('phase2-ui-container');
      if (phase2Container) {
        phase2Container.style.display = 'none';
      }

      if (this.terminalManager?.pluginAPI) {
        this.terminalManager.pluginAPI.showNotification(
          'Phase 2 UI disabled. Using standard interface.',
          'info'
        );
      }
    } catch (error) {
      console.error('Failed to disable Phase 2 UI:', error);
    }
  }

  destroy() {
    try {
      if (this.phase2UIManager) {
        this.phase2UIManager.destroy();
      }

      // Clean up event listeners
      window.removeEventListener('resize', this.handleWindowResize);

      // Reset state
      this.phase2UIManager = null;
      this.terminalManager = null;
      this.isPhase2Active = false;
      this.initialized = false;

      console.log('🧹 Phase 2 Main Integration cleaned up');
    } catch (error) {
      console.error('Failed to destroy Phase 2 integration:', error);
    }
  }
}

export default Phase2MainIntegration;
