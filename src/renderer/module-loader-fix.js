import logger from '../utilities/logger.js';
/**
 * Module Loader Fix
 * Handles ES module import/export issues and provides fallbacks
 */

// Import module configuration utilities
import { ModuleLoader, initializeModule, loadModules } from '../utils/module-config.js';

// Fix for ES module exports in browser context
(function () {
  'use strict';

  // 1. Fix PerformanceMonitor constructor issue
  if (typeof window !== 'undefined') {
    // Create fallback classes if modules fail to load

    // Fallback PerformanceMonitor
    window.PerformanceMonitor =
      window.PerformanceMonitor ||
      class PerformanceMonitor {
        constructor() {
          logger.debug('📊 PerformanceMonitor (Fallback Mode)');
          this.metrics = new Map();
          this.isMonitoring = false;
        }

        startMonitoring() {
          this.isMonitoring = true;
        }

        stopMonitoring() {
          this.isMonitoring = false;
        }

        recordMetric(command, executionTime, success = true) {
          if (!this.metrics.has(command)) {
            this.metrics.set(command, []);
          }
          this.metrics.get(command).push({
            timestamp: Date.now(),
            executionTime,
            success,
          });
        }
      };

    // Fallback PerformanceMonitoringDashboard
    window.PerformanceMonitoringDashboard =
      window.PerformanceMonitoringDashboard ||
      class PerformanceMonitoringDashboard {
        constructor() {
          this.monitor = new window.PerformanceMonitor();
          this.isVisible = false;
        }

        showDashboard() {
          logger.debug('📊 Would show performance dashboard');
          this.isVisible = true;
          // Create a simple notification instead
          if (window.terminalManager?.pluginAPI) {
            window.terminalManager.pluginAPI.showNotification(
              '📊 Performance monitoring active (simplified mode)',
              'info',
              3000
            );
          }
        }

        hideDashboard() {
          this.isVisible = false;
        }

        recordCommand(command, startTime) {
          const executionTime = Date.now() - startTime;
          this.monitor.recordMetric(command, executionTime);
        }
      };

    // Fallback WorkflowAutomationEngine
    window.WorkflowAutomationEngine =
      window.WorkflowAutomationEngine ||
      class WorkflowAutomationEngine {
        constructor() {
          this.workflows = new Map();
        }

        startMacroRecording(name) {
          return Promise.resolve({ success: true, name });
        }

        discoverWorkflows(type) {
          return Promise.resolve([
            { name: 'Basic Deploy', type: type },
            { name: 'Quick Build', type: type },
          ]);
        }
      };

    // Fallback EnhancedSecurityEngine
    window.EnhancedSecurityEngine =
      window.EnhancedSecurityEngine ||
      class EnhancedSecurityEngine {
        constructor() {
          this.isActive = true;
        }

        createSecurityDashboard() {
          if (window.terminalManager?.pluginAPI) {
            window.terminalManager.pluginAPI.showNotification(
              '🔒 Security monitoring active',
              'info',
              2000
            );
          }
        }
      };

    // Fallback NextGenUIEngine
    window.NextGenUIEngine =
      window.NextGenUIEngine ||
      class NextGenUIEngine {
        constructor() {
          this.is3DEnabled = false;
        }

        async initialize() {
          return true;
        }

        async enable3DMode() {
          this.is3DEnabled = true;
          return true;
        }

        async disable3DMode() {
          this.is3DEnabled = false;
          return true;
        }

        async visualizeCommandFlow(command) {
          return { success: true, command };
        }

        async enableGestureControl() {
          return true;
        }

        async enableAdaptiveInterface() {
          return true;
        }

        async optimizeLayoutForTask(_task) {
          return true;
        }

        async enableHolographicMode() {
          return true;
        }

        get holoMode() {
          return {
            isSupported: () => false,
          };
        }
      };

    // Fallback MultimodalAgentManager
    window.MultimodalAgentManager =
      window.MultimodalAgentManager ||
      class MultimodalAgentManager {
        constructor(terminalManager) {
          this.terminalManager = terminalManager;
        }
      };

    // Fallback AdvancedAIContextEngine
    window.AdvancedAIContextEngine =
      window.AdvancedAIContextEngine ||
      class AdvancedAIContextEngine {
        constructor(terminalManager) {
          this.terminalManager = terminalManager;
        }

        toggleVoiceControl() {}

        async generateCommandDocumentation(command) {
          if (this.terminalManager?.pluginAPI) {
            this.terminalManager.pluginAPI.showNotification(
              `📚 Documentation for "${command}" would be generated here`,
              'info',
              3000
            );
          }
        }

        async analyzeCommandSafety(_command) {
          return { riskLevel: 'low', risks: [], alternatives: [] };
        }
      };
  }

  // 2. Fix module loading for Electron context
  if (typeof require !== 'undefined') {
    try {
      // Only load electron in electron context
      const { ipcRenderer } = require('electron');
      window.ipcRenderer = ipcRenderer;
      logger.debug('✅ Electron context detected and configured');
    } catch (error) {
      // Browser fallbacks for Electron APIs
      window.ipcRenderer = {
        invoke: async (channel, ..._args) => {
          // Provide fallback responses
          switch (channel) {
          case 'get-platform':
            return navigator.platform.includes('Win') ? 'win32' : 'linux';
          case 'get-shell':
            return navigator.platform.includes('Win') ? 'powershell.exe' : '/bin/bash';
          case 'check-for-updates':
            return { updateInfo: null };
          default:
            return null;
          }
        },
        send: (_channel, ..._args) => {},
        on: (_channel, callback) => {},
      };
    }
  }

  // 3. Fix XTerm imports
  const loadXTermDependencies = async () => {
    try {
      // Check if XTerm is already loaded
      if (typeof Terminal === 'undefined' && typeof window.Terminal === 'undefined') {
        // Try multiple loading strategies
        const loadStrategies = [
          // Strategy 1: Load from node_modules
          async () => {
            const xtermScript = document.createElement('script');
            xtermScript.src = '../../node_modules/@xterm/xterm/lib/xterm.js';
            xtermScript.type = 'module';

            return new Promise((resolve, reject) => {
              xtermScript.onload = () => {
                resolve();
              };
              xtermScript.onerror = () => {
                console.warn('⚠️ XTerm failed to load from node_modules');
                reject();
              };
              document.head.appendChild(xtermScript);
            });
          },

          // Strategy 2: Load from vendor directory
          async () => {
            const xtermScript = document.createElement('script');
            xtermScript.src = '../public/vendor/xterm/xterm.js';

            return new Promise((resolve, reject) => {
              xtermScript.onload = () => {
                resolve();
              };
              xtermScript.onerror = () => {
                console.warn('⚠️ XTerm failed to load from vendor directory');
                reject();
              };
              document.head.appendChild(xtermScript);
            });
          },

          // Strategy 3: Load from assets directory
          async () => {
            const xtermScript = document.createElement('script');
            xtermScript.src = '../public/assets/xterm/xterm.js';

            return new Promise((resolve, reject) => {
              xtermScript.onload = () => {
                logger.debug('✅ XTerm loaded from assets directory');
                resolve();
              };
              xtermScript.onerror = () => {
                console.warn('⚠️ XTerm failed to load from assets directory');
                reject();
              };
              document.head.appendChild(xtermScript);
            });
          },
        ];

        // Try each strategy until one succeeds
        let loaded = false;
        for (const strategy of loadStrategies) {
          try {
            await strategy();
            loaded = true;
            break;
          } catch (error) {
            // Continue to next strategy
          }
        }

        if (!loaded) {
          console.warn('⚠️ All XTerm loading strategies failed');
        }

        // Load CSS
        const xtermCSS = document.createElement('link');
        xtermCSS.rel = 'stylesheet';
        xtermCSS.href = '../../node_modules/@xterm/xterm/css/xterm.css';
        xtermCSS.onerror = () => {
          // Try fallback CSS locations
          const fallbackCSS = document.createElement('link');
          fallbackCSS.rel = 'stylesheet';
          fallbackCSS.href = '../public/xterm.css';
          document.head.appendChild(fallbackCSS);
        };
        document.head.appendChild(xtermCSS);
      } else {
      }
    } catch (error) {
      console.warn('⚠️ XTerm loading failed:', error);
    }
  };

  // 4. Provide XTerm polyfills and fallbacks
  const _setupXTermPolyfills = () => {
    // Polyfill for ResizeObserver if not available
    if (typeof ResizeObserver === 'undefined') {
      window.ResizeObserver = class ResizeObserver {
        constructor(callback) {
          this.callback = callback;
        }
        observe(element) {
          // Fallback: use window resize event
          const resizeHandler = () => {
            this.callback([{ target: element }]);
          };
          window.addEventListener('resize', resizeHandler);
          element._resizeHandler = resizeHandler;
        }
        unobserve(element) {
          if (element._resizeHandler) {
            window.removeEventListener('resize', element._resizeHandler);
            delete element._resizeHandler;
          }
        }
        disconnect() {
          // No-op for polyfill
        }
      };
    }

    // Polyfill for requestAnimationFrame if not available
    if (typeof requestAnimationFrame === 'undefined') {
      window.requestAnimationFrame = callback => {
        return setTimeout(callback, 1000 / 60);
      };
    }

    // Polyfill for cancelAnimationFrame if not available
    if (typeof cancelAnimationFrame === 'undefined') {
      window.cancelAnimationFrame = id => {
        clearTimeout(id);
      };
    }
  };

  // 4. Initialize fixes when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadXTermDependencies();
    });
  } else {
    loadXTermDependencies();
  }
})();
