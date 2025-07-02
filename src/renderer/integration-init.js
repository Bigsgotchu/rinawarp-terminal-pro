/**
 * RinaWarp Terminal - Integration Init
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * This file is part of RinaWarp Terminal, an advanced open-source terminal emulator with
 * AI assistance, live collaboration, and enterprise-grade security features.
 *
 * Licensed under the MIT License.
 * See LICENSE file for detailed terms and conditions.
 *
 * Project repository: https://github.com/rinawarp/terminal
 */

// Import centralized global management
import { globalObjectManager } from '../utils/global-object-manager.js';
import { initializeGlobalRegistry } from '../utils/global-registry.js';

// Import centralized logger
const logger = (() => {
  if (typeof require !== 'undefined') {
    return require('../utils/logger');
  } else {
    // Fallback for browser environment
    return {
      debug: (msg, ctx) => console.log(`[DEBUG] ${msg}`, ctx),
      info: (msg, ctx) => console.info(`[INFO] ${msg}`, ctx),
      warn: (msg, ctx) => console.warn(`[WARN] ${msg}`, ctx),
      error: (msg, ctx) => console.error(`[ERROR] ${msg}`, ctx),
      system: (msg, ctx) => console.info(`[SYSTEM] ${msg}`, ctx),
    };
  }
})();

class RinaWarpInitializer {
  constructor() {
    this.isInitialized = false;
    this.integrationSystem = null;
    this.globalManager = globalObjectManager;
  }

  async initialize() {
    if (this.isInitialized) {
      logger.info('System already initialized', { component: 'integration-init' });
      return this.integrationSystem;
    }

    try {
      logger.system('Starting RinaWarp Terminal Integration System...', {
        component: 'integration-init',
      });
      logger.system('Version: 1.0.0', { component: 'integration-init' });
      logger.system('Copyright (c) 2025 RinaWarp Technologies', { component: 'integration-init' });

      // Step 1: Initialize global registry
      await initializeGlobalRegistry();
      logger.system('Global registry initialized', { component: 'integration-init' });

      // Step 2: Get the integration system through global manager
      this.integrationSystem = await this.globalManager.get('rinaWarpIntegration');
      if (!this.integrationSystem) {
        throw new Error('Failed to initialize integration system through global manager');
      }

      // Setup global event handlers
      this.setupGlobalEventHandlers();

      // Initialize terminal manager integration
      this.integrateWithTerminalManager();

      // Setup status monitoring
      this.setupStatusMonitoring();

      // Initialize Enhanced Beginner-Friendly UI
      await this.initializeBeginnerFriendlyUI();

      this.isInitialized = true;

      console.log('[RinaWarp] ✅ Integration system initialized successfully!');
      console.log('[RinaWarp] All features are now coordinated through the unified system.');

      // Display system status
      this.displaySystemStatus();

      return this.integrationSystem;
    } catch (error) {
      console.error('[RinaWarp] ❌ Failed to initialize integration system:', error);
      throw error;
    }
  }

  setupGlobalEventHandlers() {
    // Handle system errors
    window.addEventListener('error', event => {
      if (this.integrationSystem) {
        this.integrationSystem.hub.eventBus.emit('system:error', {
          error: event.error,
          filename: event.filename,
          lineno: event.lineno,
          timestamp: Date.now(),
        });
      }
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', event => {
      if (this.integrationSystem) {
        this.integrationSystem.hub.eventBus.emit('system:unhandled-rejection', {
          reason: event.reason,
          timestamp: Date.now(),
        });
      }
    });

    // Handle window focus/blur for optimization
    window.addEventListener('focus', () => {
      if (this.integrationSystem) {
        this.integrationSystem.hub.eventBus.emit('system:focus');
      }
    });

    window.addEventListener('blur', () => {
      if (this.integrationSystem) {
        this.integrationSystem.hub.eventBus.emit('system:blur');
      }
    });
  }

  integrateWithTerminalManager() {
    // Check if TerminalManager exists
    if (typeof window.TerminalManager !== 'undefined') {
      console.log('[RinaWarp] Integrating with existing TerminalManager...');

      // Extend TerminalManager with integration capabilities
      const originalTerminalManager = window.TerminalManager;

      // Override createTerminal to emit integration events
      const originalCreateTerminal = originalTerminalManager.prototype.createTerminal;
      originalTerminalManager.prototype.createTerminal = function (...args) {
        const result = originalCreateTerminal.apply(this, args);

        // Emit terminal creation event
        if (window.rinaWarpIntegration) {
          window.rinaWarpIntegration.hub.eventBus.emit('terminal:created', {
            terminalId: this.terminals.size,
            timestamp: Date.now(),
          });
        }

        return result;
      };

      console.log('[RinaWarp] ✅ TerminalManager integration complete');
    } else {
      console.log('[RinaWarp] ⚠️ TerminalManager not found, skipping integration');
    }
  }

  setupStatusMonitoring() {
    // Monitor system status every 5 minutes and only warn once about missing features
    let hasWarnedAboutFeatures = false;

    setInterval(() => {
      if (this.integrationSystem) {
        const status = this.integrationSystem.getSystemStatus();

        // Check for any issues (only warn once)
        if (status.hub.featureCount === 0 && !hasWarnedAboutFeatures) {
          console.warn('[RinaWarp] ⚠️ No features registered in integration system');
          hasWarnedAboutFeatures = true;
        }

        // Reset warning flag if features are registered
        if (status.hub.featureCount > 0) {
          hasWarnedAboutFeatures = false;
        }

        // Emit status update event
        this.integrationSystem.hub.eventBus.emit('system:status-update', status);
      }
    }, 300000); // Every 5 minutes instead of 30 seconds
  }

  async initializeBeginnerFriendlyUI() {
    try {
      console.log('[RinaWarp] 🎯 Initializing Enhanced Beginner-Friendly UI...');

      // Dynamic import to avoid bundling issues
      const beginnerUIModule = await import('./beginner-friendly-ui.js');
      const BeginnerFriendlyUI = beginnerUIModule.BeginnerFriendlyUI;

      // Create and initialize the UI
      window.beginnerUI = new BeginnerFriendlyUI(window.terminalManager);

      // Register with integration system
      if (this.integrationSystem && this.integrationSystem.hub) {
        this.integrationSystem.hub.registerFeature('beginner-ui', {
          name: 'Enhanced Beginner-Friendly UI',
          version: '2.0.0',
          status: 'active',
          instance: window.beginnerUI,
        });

        // Wait a bit for terminal manager to initialize
        setTimeout(() => {
          this.registerAvailableFeatures();
        }, 3000);
      }

      console.log('[RinaWarp] 🎯 ✅ Enhanced Beginner-Friendly UI initialized successfully!');
    } catch (error) {
      console.warn('[RinaWarp] ⚠️ Could not load Enhanced Beginner-Friendly UI:', error.message);
      console.log('[RinaWarp] Continuing without enhanced UI features...');
    }
  }

  displaySystemStatus() {
    if (!this.integrationSystem) return;

    const status = this.integrationSystem.getSystemStatus();

    console.group('[RinaWarp] System Status');
    console.log('🔧 Integration Version:', status.integration.version);
    console.log('📊 Features Registered:', status.integration.featuresCount);
    console.log('🏗️ Hub Version:', status.hub.hubVersion);
    console.log('✅ Hub Initialized:', status.hub.isInitialized);

    if (status.features && Object.keys(status.features).length > 0) {
      console.log('📋 Feature Status:');
      for (const [name, featureStatus] of Object.entries(status.features)) {
        const icon = featureStatus.isActive ? '🟢' : '🔴';
        console.log(`  ${icon} ${name}: ${featureStatus.status}`);
      }
    }

    console.groupEnd();
  }

  getIntegrationSystem() {
    return this.integrationSystem;
  }

  registerAvailableFeatures() {
    try {
      const terminalManager = window.terminalManager;
      if (!terminalManager) {
        console.log('[RinaWarp] ⚠️ Terminal Manager not available yet, will retry later');
        // Retry after terminal manager is initialized
        setTimeout(() => this.registerAvailableFeatures(), 2000);
        return;
      }

      // Register Performance Monitor if available
      if (terminalManager.performanceMonitor) {
        this.integrationSystem.hub.registerFeature('performance-monitor', {
          name: 'Performance Monitoring Dashboard',
          version: '1.0.0',
          status: 'active',
          instance: terminalManager.performanceMonitor,
        });
        console.log('[RinaWarp] ✅ Performance Monitor registered');
      }

      // Register AI Context Engine if available
      if (terminalManager.aiEngine) {
        this.integrationSystem.hub.registerFeature('ai-context', {
          name: 'Advanced AI Context Engine',
          version: '1.0.0',
          status: 'active',
          instance: terminalManager.aiEngine,
        });
        console.log('[RinaWarp] ✅ AI Context Engine registered');
      }

      // Register Enhanced Security if available
      if (terminalManager.securityEngine) {
        this.integrationSystem.hub.registerFeature('enhanced-security', {
          name: 'Enhanced Security Engine',
          version: '1.0.0',
          status: 'active',
          instance: terminalManager.securityEngine,
        });
        console.log('[RinaWarp] ✅ Enhanced Security registered');
      }

      // Register Workflow Automation if available
      if (terminalManager.workflowEngine) {
        this.integrationSystem.hub.registerFeature('workflow-automation', {
          name: 'Workflow Automation Engine',
          version: '1.0.0',
          status: 'active',
          instance: terminalManager.workflowEngine,
        });
        console.log('[RinaWarp] ✅ Workflow Automation registered');
      }

      // Register Next-Gen UI if available
      if (terminalManager.nextGenUI) {
        this.integrationSystem.hub.registerFeature('nextgen-ui', {
          name: 'Next-Generation UI Engine',
          version: '2.0.0',
          status: 'active',
          instance: terminalManager.nextGenUI,
        });
        console.log('[RinaWarp] ✅ Next-Gen UI registered');
      }

      // Register Multimodal Agent Manager if available
      if (window.agentManager) {
        this.integrationSystem.hub.registerFeature('multimodal-agents', {
          name: 'Multimodal AI Agent Framework',
          version: '3.0.0',
          status: 'active',
          instance: window.agentManager,
        });
        console.log('[RinaWarp] ✅ Multimodal Agent Manager registered');
      }

      console.log(
        '[RinaWarp] 🚀 All available features have been registered with the integration system'
      );
    } catch (error) {
      console.warn('[RinaWarp] ⚠️ Error registering some features:', error);
    }
  }

  async shutdown() {
    if (this.integrationSystem) {
      console.log('[RinaWarp] Shutting down integration system...');
      await this.integrationSystem.shutdown();
      this.isInitialized = false;
      console.log('[RinaWarp] ✅ Integration system shutdown complete');
    }
  }
}

// Create global initializer instance
const rinaWarpInitializer = new RinaWarpInitializer();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    rinaWarpInitializer.initialize().catch(error => {
      console.error('[RinaWarp] Auto-initialization failed:', error);
    });
  });
} else {
  // DOM already loaded, initialize immediately
  rinaWarpInitializer.initialize().catch(error => {
    console.error('[RinaWarp] Auto-initialization failed:', error);
  });
}

// Export for manual control
window.rinaWarpInitializer = rinaWarpInitializer;

// Export initialization function for easy access
window.initializeBeginnerFriendlyUI = async function () {
  if (window.beginnerUI) {
    console.log('[RinaWarp] Beginner-Friendly UI already initialized');
    return window.beginnerUI;
  }

  try {
    const beginnerUIModule = await import('./beginner-friendly-ui.js');
    const BeginnerFriendlyUI = beginnerUIModule.BeginnerFriendlyUI;

    window.beginnerUI = new BeginnerFriendlyUI(window.terminalManager);

    console.log('[RinaWarp] ✅ Beginner-Friendly UI initialized on demand');
    return window.beginnerUI;
  } catch (error) {
    console.error('[RinaWarp] Failed to initialize Beginner-Friendly UI:', error);
    throw error;
  }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RinaWarpInitializer, rinaWarpInitializer };
}

export { RinaWarpInitializer, rinaWarpInitializer };
