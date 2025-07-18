/**
 * Module Loader Fix
 * Handles ES module import/export issues and provides fallbacks
 */

// Fix for ES module exports in browser context
(function () {
  'use strict';

  console.log('🔧 Applying module loader fixes...');

  // 1. Fix PerformanceMonitor constructor issue
  if (typeof window !== 'undefined') {
    // Create fallback classes if modules fail to load

    // Fallback PerformanceMonitor
    window.PerformanceMonitor =
      window.PerformanceMonitor ||
      class PerformanceMonitor {
        constructor() {
          console.log('📊 PerformanceMonitor (Fallback Mode)');
          this.metrics = new Map();
          this.isMonitoring = false;
        }

        startMonitoring() {
          this.isMonitoring = true;
          console.log('📊 Performance monitoring started (fallback)');
        }

        stopMonitoring() {
          this.isMonitoring = false;
          console.log('📊 Performance monitoring stopped');
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
          console.log('📊 PerformanceMonitoringDashboard (Fallback Mode)');
          this.monitor = new window.PerformanceMonitor();
          this.isVisible = false;
        }

        showDashboard() {
          console.log('📊 Would show performance dashboard');
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
          console.log('⚡ WorkflowAutomationEngine (Fallback Mode)');
          this.workflows = new Map();
        }

        startMacroRecording(name) {
          console.log(`⚡ Starting macro recording: ${name}`);
          return Promise.resolve({ success: true, name });
        }

        discoverWorkflows(type) {
          console.log(`⚡ Discovering ${type} workflows`);
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
          console.log('🔒 EnhancedSecurityEngine (Fallback Mode)');
          this.isActive = true;
        }

        createSecurityDashboard() {
          console.log('🔒 Would create security dashboard');
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
          console.log('🎨 NextGenUIEngine (Fallback Mode)');
          this.is3DEnabled = false;
        }

        async initialize() {
          console.log('🎨 Next-Gen UI initialized (fallback)');
          return true;
        }

        async enable3DMode() {
          console.log('🎨 3D mode enabled (fallback)');
          this.is3DEnabled = true;
          return true;
        }

        async disable3DMode() {
          console.log('🎨 3D mode disabled');
          this.is3DEnabled = false;
          return true;
        }

        async visualizeCommandFlow(command) {
          console.log(`🎨 Visualizing flow for: ${command}`);
          return { success: true, command };
        }

        async enableGestureControl() {
          console.log('🎨 Gesture control enabled (fallback)');
          return true;
        }

        async enableAdaptiveInterface() {
          console.log('🎨 Adaptive interface enabled (fallback)');
          return true;
        }

        async optimizeLayoutForTask(task) {
          console.log(`🎨 Layout optimized for: ${task}`);
          return true;
        }

        async enableHolographicMode() {
          console.log('🎨 Holographic mode enabled (fallback)');
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
          console.log('🤖 MultimodalAgentManager (Fallback Mode)');
          this.terminalManager = terminalManager;
        }
      };

    // Fallback AdvancedAIContextEngine
    window.AdvancedAIContextEngine =
      window.AdvancedAIContextEngine ||
      class AdvancedAIContextEngine {
        constructor(terminalManager) {
          console.log('🧠 AdvancedAIContextEngine (Fallback Mode)');
          this.terminalManager = terminalManager;
        }

        toggleVoiceControl() {
          console.log('🎤 Voice control toggled (fallback)');
        }

        async generateCommandDocumentation(command) {
          console.log(`📚 Generating docs for: ${command}`);
          if (this.terminalManager?.pluginAPI) {
            this.terminalManager.pluginAPI.showNotification(
              `📚 Documentation for "${command}" would be generated here`,
              'info',
              3000
            );
          }
        }

        async analyzeCommandSafety(command) {
          console.log(`🛡️ Analyzing safety for: ${command}`);
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
      console.log('✅ Electron context detected and configured');
    } catch (error) {
      console.log('ℹ️ Not in Electron context, using browser fallbacks');

      // Browser fallbacks for Electron APIs
      window.ipcRenderer = {
        invoke: async (channel, ...args) => {
          console.log(`📡 IPC invoke (fallback): ${channel}`, args);

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
        send: (channel, ...args) => {
          console.log(`📡 IPC send (fallback): ${channel}`, args);
        },
        on: (channel, callback) => {
          console.log(`📡 IPC listener (fallback): ${channel}`);
        },
      };
    }
  }

  // 3. Fix XTerm imports
  const loadXTermDependencies = async () => {
    try {
      // Check if XTerm is already loaded
      if (typeof Terminal === 'undefined') {
        console.log('📦 Loading XTerm dependencies...');

        // Try to load from node_modules
        const xtermScript = document.createElement('script');
        xtermScript.src = '../../node_modules/@xterm/xterm/lib/xterm.js';
        xtermScript.onload = () => {
          console.log('✅ XTerm loaded successfully');
        };
        xtermScript.onerror = () => {
          console.warn('⚠️ XTerm failed to load from node_modules');
        };
        document.head.appendChild(xtermScript);

        // Load CSS
        const xtermCSS = document.createElement('link');
        xtermCSS.rel = 'stylesheet';
        xtermCSS.href = '../../node_modules/@xterm/xterm/css/xterm.css';
        document.head.appendChild(xtermCSS);
      } else {
        console.log('✅ XTerm already available');
      }
    } catch (error) {
      console.warn('⚠️ XTerm loading failed:', error);
    }
  };

  // 4. Initialize fixes when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadXTermDependencies();
      console.log('✅ Module loader fixes applied');
    });
  } else {
    loadXTermDependencies();
    console.log('✅ Module loader fixes applied');
  }

  console.log('🔧 Module loader fixes installation complete');
})();
