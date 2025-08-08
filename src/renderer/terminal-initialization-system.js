import logger from '../utilities/logger.js';
/**
 * Terminal Initialization System
 * Complete initialization flow for RinaWarp Terminal with AI readiness checks,
 * ElevenLabs configuration, command input handling, and debug diagnostics
 */

class TerminalInitializationSystem {
  constructor() {
    this.components = {
      dom: { status: 'pending', timestamp: null, error: null },
      advancedAI: { status: 'pending', timestamp: null, error: null },
      elevenLabs: { status: 'pending', timestamp: null, error: null },
      commandInput: { status: 'pending', timestamp: null, error: null },
      globalIntegration: { status: 'pending', timestamp: null, error: null },
      processLifecycle: { status: 'pending', timestamp: null, error: null },
    };

    this.initStartTime = Date.now();
    this.debugMode =
      localStorage.getItem('rina-debug') === 'true' ||
      new URLSearchParams(window.location.search).has('debug');
    this.debugOverlay = null;

    // Bind methods to preserve context
    this.updateComponentStatus = this.updateComponentStatus.bind(this);
    this.createDebugOverlay = this.createDebugOverlay.bind(this);
    this.setupCommandInput = this.setupCommandInput.bind(this);
  }

  /**
   * Main initialization sequence
   */
  async initTerminal() {
    try {
      // Create debug overlay first if enabled
      if (this.debugMode) {
        this.createDebugOverlay();
      }

      // Wait for DOM to be ready
      await this.waitForDOM();

      // Initialize components in parallel where possible
      const initPromises = [
        this.setupCommandInput(),
        this.waitUntilAIReady(),
        this.initializeGlobalIntegration(),
        this.initializeProcessLifecycle(),
      ];

      await Promise.allSettled(initPromises);

      // Final setup
      this.setupGlobalErrorHandling();
      this.registerDebugCommands();

      const totalTime = Date.now() - this.initStartTime;
      logger.debug(`✅ [TerminalInit] Initialization complete in ${totalTime}ms`);

      // Emit initialization complete event
      window.dispatchEvent(
        new CustomEvent('terminal:init-complete', {
          detail: {
            components: this.components,
            initTime: totalTime,
            debugMode: this.debugMode,
          },
        })
      );
    } catch (error) {
      console.error('❌ [TerminalInit] Critical initialization error:', error);
      this.handleCriticalError(error);
    }
  }

  /**
   * Wait for DOM to be ready
   */
  async waitForDOM() {
    return new Promise(resolve => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.updateComponentStatus('dom', 'loaded');
          resolve();
        });
      } else {
        this.updateComponentStatus('dom', 'loaded');
        resolve();
      }
    });
  }

  /**
   * Setup command input with Enter key handling
   */
  async setupCommandInput() {
    try {
      const inputBox =
        document.getElementById('commandInput') ||
        document.querySelector('.terminal-input') ||
        document.querySelector('input[type="text"]');

      if (!inputBox) {
        // Create a fallback input if none exists
        const _fallbackInput = this.createFallbackInput();
        this.updateComponentStatus('commandInput', 'created-fallback');
        return;
      }

      // Enhanced event handling
      inputBox.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const command = inputBox.value.trim();
          if (command) {
            this.processCommand(command);
            inputBox.value = '';
          }
        }

        // Add support for command history
        if (e.key === 'ArrowUp' && this.commandHistory.length > 0) {
          e.preventDefault();
          this.historyIndex = Math.max(0, this.historyIndex - 1);
          inputBox.value = this.commandHistory[this.historyIndex] || '';
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.historyIndex = Math.min(this.commandHistory.length, this.historyIndex + 1);
          inputBox.value = this.commandHistory[this.historyIndex] || '';
        }
      });

      // Add autocomplete support
      inputBox.addEventListener('input', e => {
        this.handleAutocomplete(e.target.value);
      });

      this.commandHistory = JSON.parse(localStorage.getItem('rina-command-history') || '[]');
      this.historyIndex = this.commandHistory.length;

      this.updateComponentStatus('commandInput', 'active');
    } catch (error) {
      this.updateComponentStatus('commandInput', 'error', error);
      console.error('❌ [TerminalInit] Command input setup failed:', error);
    }
  }

  /**
   * Create fallback input if none exists
   */
  createFallbackInput() {
    const container = document.body;
    const inputContainer = document.createElement('div');
    inputContainer.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.9);
        border: 1px solid #00ff88;
        border-radius: 5px;
        padding: 10px;
        z-index: 9999;
        font-family: 'SF Mono', monospace;
      ">
        <input 
          id="commandInput" 
          type="text" 
          placeholder="Enter command..." 
          style="
            width: 100%;
            background: transparent;
            border: none;
            color: #00ff88;
            font-family: inherit;
            font-size: 14px;
            outline: none;
          "
        />
      </div>
    `;
    container.appendChild(inputContainer);
    return inputContainer.querySelector('#commandInput');
  }

  /**
   * Process commands with AI integration
   */
  async processCommand(command) {
    try {
      // Add to history
      if (this.commandHistory[this.commandHistory.length - 1] !== command) {
        this.commandHistory.push(command);
        if (this.commandHistory.length > 100) {
          this.commandHistory.shift(); // Keep only last 100 commands
        }
        localStorage.setItem('rina-command-history', JSON.stringify(this.commandHistory));
      }
      this.historyIndex = this.commandHistory.length;

      // Emit command event
      window.dispatchEvent(
        new CustomEvent('terminal:command', {
          detail: { command, timestamp: Date.now() },
        })
      );

      // Process with AI if available
      if (window.advancedAI && typeof window.advancedAI.processCommand === 'function') {
        const result = await window.advancedAI.processCommand(command);
        this.displayCommandResult(result);
      } else if (window.processAICommand && typeof window.processAICommand === 'function') {
        await window.processAICommand(command);
      } else {
        this.displayCommandResult({
          response: `Command received: "${command}"\nAI processing not available yet.`,
          confidence: 0.3,
          source: 'fallback',
        });
      }
    } catch (error) {
      console.error('❌ [TerminalInit] Command processing error:', error);
      this.displayCommandResult({
        response: `Error processing command: ${error.message}`,
        confidence: 0.1,
        source: 'error',
      });
    }
  }

  /**
   * Display command results
   */
  displayCommandResult(result) {
    const outputContainer =
      document.getElementById('terminal-output') || document.querySelector('.terminal-output');

    if (outputContainer) {
      const resultElement = document.createElement('div');
      resultElement.className = 'command-result';
      resultElement.innerHTML = `
        <div class="result-header">
          <span class="timestamp">${new Date().toLocaleTimeString()}</span>
          <span class="source">[${result.source || 'terminal'}]</span>
          <span class="confidence">Confidence: ${Math.round((result.confidence || 0) * 100)}%</span>
        </div>
        <div class="result-content">${result.response || 'No response'}</div>
      `;
      outputContainer.appendChild(resultElement);
      outputContainer.scrollTop = outputContainer.scrollHeight;
    } else {
    }
  }

  /**
   * Handle autocomplete
   */
  handleAutocomplete(value) {
    // Simple autocomplete logic
    const commonCommands = ['help', 'clear', 'status', 'debug', 'history', 'config'];
    const matches = commonCommands.filter(cmd => cmd.startsWith(value.toLowerCase()));

    // You can extend this to show suggestions
    if (matches.length > 0 && this.debugMode) {
    }
  }

  /**
   * Poll for AI readiness and configure ElevenLabs
   */
  async waitUntilAIReady() {
    const maxAttempts = 50; // 5 seconds max
    let attempts = 0;

    const tryInit = async () => {
      attempts++;

      try {
        // Check for advanced AI
        if (window.advancedAI) {
          this.updateComponentStatus('advancedAI', 'loaded');
        }

        // Check and configure ElevenLabs
        if (typeof window.configureElevenLabs === 'function') {
          await window.configureElevenLabs();
          this.updateComponentStatus('elevenLabs', 'configured');
        } else if (attempts < maxAttempts) {
          setTimeout(tryInit, 100);
          return;
        }

        // Final AI readiness check
        if (window.advancedAI && window.configureElevenLabs) {
        }
      } catch (err) {
        console.error('❌ [TerminalInit] AI initialization error:', err);
        this.updateComponentStatus('elevenLabs', 'error', err);

        if (attempts < maxAttempts) {
          setTimeout(tryInit, 100);
        }
      }
    };

    tryInit();
  }

  /**
   * Initialize global integration system
   */
  async initializeGlobalIntegration() {
    try {
      if (window.globalIntegrationSystem) {
        await window.globalIntegrationSystem.initialize();
        this.updateComponentStatus('globalIntegration', 'active');
      } else if (window.RinaWarpIntegration) {
        this.updateComponentStatus('globalIntegration', 'fallback-active');
      } else {
        this.updateComponentStatus('globalIntegration', 'not-available');
      }
    } catch (error) {
      this.updateComponentStatus('globalIntegration', 'error', error);
    }
  }

  /**
   * Initialize process lifecycle manager
   */
  async initializeProcessLifecycle() {
    try {
      if (window.processManager || window.processLifecycleManager) {
        this.updateComponentStatus('processLifecycle', 'active');
      } else {
        this.updateComponentStatus('processLifecycle', 'not-available');
      }
    } catch (error) {
      this.updateComponentStatus('processLifecycle', 'error', error);
    }
  }

  /**
   * Update component status
   */
  updateComponentStatus(component, status, error = null) {
    if (this.components[component]) {
      this.components[component].status = status;
      this.components[component].timestamp = Date.now();
      this.components[component].error = error;

      if (this.debugOverlay) {
        this.updateDebugOverlay();
      }

      // Emit component status event
      window.dispatchEvent(
        new CustomEvent('terminal:component-status', {
          detail: { component, status, error, timestamp: Date.now() },
        })
      );
    }
  }

  /**
   * Create debug overlay
   */
  createDebugOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'rina-debug-overlay';
    overlay.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 20px;
        width: 350px;
        background: rgba(0, 0, 0, 0.95);
        border: 1px solid #ffaa00;
        border-radius: 8px;
        z-index: 10001;
        font-family: 'SF Mono', monospace;
        font-size: 11px;
        color: #ffaa00;
        max-height: 400px;
        overflow-y: auto;
      ">
        <div style="padding: 10px; border-bottom: 1px solid #ffaa00;">
          <h3 style="margin: 0; display: flex; justify-content: space-between; align-items: center;">
            🐛 Debug Panel
            <button id="debug-toggle" style="
              background: none;
              border: 1px solid #ffaa00;
              color: #ffaa00;
              cursor: pointer;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 10px;
            ">−</button>
          </h3>
        </div>
        <div id="debug-content" style="padding: 10px;">
          <div id="init-status">Initializing...</div>
          <div id="components-status"></div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.debugOverlay = overlay;

    // Add toggle functionality
    overlay.querySelector('#debug-toggle').addEventListener('click', () => {
      const content = overlay.querySelector('#debug-content');
      const toggle = overlay.querySelector('#debug-toggle');

      if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '−';
      } else {
        content.style.display = 'none';
        toggle.textContent = '+';
      }
    });

    this.updateDebugOverlay();
  }

  /**
   * Update debug overlay with current status
   */
  updateDebugOverlay() {
    if (!this.debugOverlay) return;

    const initStatus = this.debugOverlay.querySelector('#init-status');
    const componentsStatus = this.debugOverlay.querySelector('#components-status');

    const elapsedTime = Date.now() - this.initStartTime;
    initStatus.innerHTML = `Elapsed: ${elapsedTime}ms`;

    let statusHtml = '';
    for (const [name, info] of Object.entries(this.components)) {
      const statusColor =
        {
          pending: '#ffaa00',
          loaded: '#00ff88',
          active: '#00ff88',
          configured: '#00ff88',
          'created-fallback': '#00aaff',
          'fallback-active': '#00aaff',
          'not-available': '#888',
          error: '#ff6b6b',
        }[info.status] || '#888';

      const statusIcon =
        {
          pending: '⏳',
          loaded: '✅',
          active: '🟢',
          configured: '⚙️',
          'created-fallback': '🔄',
          'fallback-active': '🔄',
          'not-available': '⚫',
          error: '❌',
        }[info.status] || '⚪';

      statusHtml += `
        <div style="margin: 2px 0; font-size: 10px;">
          <span style="color: ${statusColor}">${statusIcon}</span>
          <strong>${name}:</strong> 
          <span style="color: ${statusColor}">${info.status}</span>
          ${info.error ? `<br/><small style="color: #ff6b6b; margin-left: 20px;">Error: ${info.error.message || info.error}</small>` : ''}
        </div>
      `;
    }

    componentsStatus.innerHTML = statusHtml;
  }

  /**
   * Setup global error handling
   */
  setupGlobalErrorHandling() {
    window.addEventListener('error', event => {
      console.error('🚨 [Global Error]:', event.error);
      if (this.debugMode) {
        this.showErrorNotification(event.error.message, 'error');
      }
    });

    window.addEventListener('unhandledrejection', event => {
      console.error('🚨 [Unhandled Promise Rejection]:', event.reason);
      if (this.debugMode) {
        this.showErrorNotification(`Promise rejection: ${event.reason}`, 'warning');
      }
    });
  }

  /**
   * Show error notification
   */
  showErrorNotification(message, type = 'error') {
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 50px;
        right: 20px;
        background: ${type === 'error' ? 'rgba(255, 107, 107, 0.95)' : 'rgba(255, 170, 0, 0.95)'};
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        z-index: 10002;
        font-family: 'SF Mono', monospace;
        font-size: 12px;
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
      ">
        <strong>${type.toUpperCase()}:</strong> ${message}
      </div>
    `;

    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Handle critical initialization errors
   */
  handleCriticalError(error) {
    const errorOverlay = document.createElement('div');
    errorOverlay.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10003;
        font-family: 'SF Mono', monospace;
        color: #ff6b6b;
      ">
        <div style="
          background: rgba(26, 26, 46, 0.95);
          border: 1px solid #ff6b6b;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          max-width: 500px;
        ">
          <h2>🚨 Terminal Initialization Failed</h2>
          <p>A critical error occurred during initialization:</p>
          <pre style="
            background: rgba(0, 0, 0, 0.5);
            padding: 1rem;
            border-radius: 4px;
            overflow: auto;
            margin: 1rem 0;
            text-align: left;
          ">${error.message}\n\n${error.stack}</pre>
          <button onclick="window.location.reload()" style="
            background: #00ff88;
            color: #000;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            margin: 0.5rem;
          ">Reload Terminal</button>
          <button onclick="this.parentElement.parentElement.style.display='none'" style="
            background: none;
            color: #ff6b6b;
            border: 1px solid #ff6b6b;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            margin: 0.5rem;
          ">Continue Anyway</button>
        </div>
      </div>
    `;

    document.body.appendChild(errorOverlay);
  }

  /**
   * Register debug commands
   */
  registerDebugCommands() {
    window.rinaDebug = {
      status: () => this.components,
      toggleDebug: () => {
        this.debugMode = !this.debugMode;
        localStorage.setItem('rina-debug', this.debugMode.toString());
        if (this.debugMode && !this.debugOverlay) {
          this.createDebugOverlay();
        } else if (!this.debugMode && this.debugOverlay) {
          this.debugOverlay.remove();
          this.debugOverlay = null;
        }
        return `Debug mode: ${this.debugMode ? 'ON' : 'OFF'}`;
      },
      restart: () => {
        this.initTerminal();
        return 'Restarting terminal initialization...';
      },
      clearHistory: () => {
        this.commandHistory = [];
        localStorage.removeItem('rina-command-history');
        return 'Command history cleared';
      },
      version: () => `RinaWarp Terminal v${window.RinaWarp?.version || '1.0.0'}`,
    };
  }
}

// Initialize the system
const terminalInit = new TerminalInitializationSystem();

// Auto-start initialization
if (typeof window !== 'undefined') {
  terminalInit.initTerminal();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TerminalInitializationSystem;
}

export default TerminalInitializationSystem;
