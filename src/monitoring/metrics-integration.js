/**
 * Metrics Integration Module
 * Integrates terminal and plugin metrics with the existing application
 */

import metricsService from './metrics-service.js';
import terminalSessionInstrumentation from './terminal-session-instrumentation.js';
import pluginInstrumentation from './plugin-instrumentation.js';

export class MetricsIntegration {
  constructor() {
    this.isInitialized = false;
    this.integrationStatus = {
      metricsService: false,
      terminalSession: false,
      pluginSystem: false,
    };
  }

  /**
   * Initialize metrics integration
   */
  async initialize() {
    try {
      console.log('🔄 Initializing metrics integration...');

      // Wait for metrics service to be ready
      await this.waitForMetricsService();

      // Initialize instrumentation
      await this.initializeInstrumentation();

      this.isInitialized = true;
      console.log('✅ Metrics integration initialized successfully');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize metrics integration:', error);
      return false;
    }
  }

  /**
   * Wait for metrics service to be ready
   */
  async waitForMetricsService() {
    const maxRetries = 10;
    const retryDelay = 1000;

    for (let i = 0; i < maxRetries; i++) {
      if (metricsService.isInitialized) {
        this.integrationStatus.metricsService = true;
        return;
      }

      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }

    throw new Error('Metrics service failed to initialize within timeout');
  }

  /**
   * Initialize instrumentation modules
   */
  async initializeInstrumentation() {
    // Terminal session instrumentation is already started in constructor
    this.integrationStatus.terminalSession = true;

    // Plugin instrumentation is already started in constructor
    this.integrationStatus.pluginSystem = true;

    console.log('📊 Instrumentation modules initialized');
  }

  /**
   * Integrate with terminal manager
   */
  integrateWithTerminalManager(terminalManager) {
    if (!terminalManager) {
      console.warn('⚠️  Terminal manager not available for integration');
      return;
    }

    // Integrate with session manager
    if (terminalManager.sessionManager) {
      this.integrateWithSessionManager(terminalManager.sessionManager);
    }

    // Hook into terminal events
    terminalManager.on('terminal-created', (terminalId) => {
      this.onTerminalCreated(terminalId);
    });

    terminalManager.on('terminal-destroyed', (terminalId) => {
      this.onTerminalDestroyed(terminalId);
    });

    terminalManager.on('command-executed', (data) => {
      this.onCommandExecuted(data);
    });

    terminalManager.on('command-error', (data) => {
      this.onCommandError(data);
    });

    console.log('📊 Integrated with terminal manager');
  }

  /**
   * Integrate with session manager
   */
  integrateWithSessionManager(sessionManager) {
    // Override session creation
    const originalCreateSession = sessionManager.createSession.bind(sessionManager);
    sessionManager.createSession = (...args) => {
      const sessionId = originalCreateSession(...args);
      terminalSessionInstrumentation.onSessionStart(sessionId);
      return sessionId;
    };

    // Override session deletion
    const originalDeleteSession = sessionManager.deleteSession.bind(sessionManager);
    sessionManager.deleteSession = (sessionId) => {
      terminalSessionInstrumentation.onSessionEnd(sessionId);
      return originalDeleteSession(sessionId);
    };

    console.log('📊 Integrated with session manager');
  }

  /**
   * Integrate with plugin manager
   */
  integrateWithPluginManager(pluginManager) {
    if (!pluginManager) {
      console.warn('⚠️  Plugin manager not available for integration');
      return;
    }

    // Use the built-in integration method
    pluginInstrumentation.integrateWithPluginManager(pluginManager);

    console.log('📊 Integrated with plugin manager');
  }

  /**
   * Handle terminal creation event
   */
  async onTerminalCreated(terminalId) {
    // For now, we'll consider each terminal as potentially starting a new session
    // In a real implementation, this would be more sophisticated
    console.log(`📊 Terminal created: ${terminalId}`);
  }

  /**
   * Handle terminal destruction event
   */
  async onTerminalDestroyed(terminalId) {
    console.log(`📊 Terminal destroyed: ${terminalId}`);
  }

  /**
   * Handle command execution event
   */
  async onCommandExecuted(data) {
    const { command, success = true, sessionId = 'default', terminalId = null } = data;
    
    await terminalSessionInstrumentation.onCommandExecuted(
      sessionId,
      command,
      success,
      terminalId
    );
  }

  /**
   * Handle command error event
   */
  async onCommandError(data) {\n    const { command, errorType, errorMessage, sessionId = 'default', terminalId = null } = data;\n    \n    await terminalSessionInstrumentation.onCommandError(\n      sessionId,\n      command,\n      errorType,\n      errorMessage,\n      terminalId\n    );\n  }\n\n  /**\n   * Get comprehensive metrics status\n   */\n  getMetricsStatus() {\n    return {\n      isInitialized: this.isInitialized,\n      integrationStatus: this.integrationStatus,\n      metricsService: metricsService.getStatus(),\n      terminalSession: terminalSessionInstrumentation.getStatus(),\n      pluginSystem: pluginInstrumentation.getStatus(),\n    };\n  }\n\n  /**\n   * Get current metrics snapshot\n   */\n  async getMetricsSnapshot() {\n    return {\n      timestamp: new Date().toISOString(),\n      terminalSessions: {\n        active: terminalSessionInstrumentation.sessionStartTimes.size,\n        metrics: terminalSessionInstrumentation.getAllSessionMetrics(),\n      },\n      plugins: {\n        loaded: pluginInstrumentation.loadedPlugins.size,\n        metrics: pluginInstrumentation.getAllPluginMetrics(),\n        executionStats: pluginInstrumentation.getExecutionStats(),\n      },\n    };\n  }\n\n  /**\n   * Force metrics collection\n   */\n  async forceMetricsCollection() {\n    try {\n      await terminalSessionInstrumentation.collectAndReportMetrics();\n      await pluginInstrumentation.collectAndReportMetrics();\n      console.log('📊 Forced metrics collection completed');\n    } catch (error) {\n      console.error('📊 Error during forced metrics collection:', error);\n    }\n  }\n\n  /**\n   * Shutdown metrics integration\n   */\n  shutdown() {\n    terminalSessionInstrumentation.stopMetricsCollection();\n    pluginInstrumentation.stopMetricsCollection();\n    this.isInitialized = false;\n    console.log('📊 Metrics integration shutdown completed');\n  }\n}\n\n// Create singleton instance\nconst metricsIntegration = new MetricsIntegration();\n\nexport default metricsIntegration;
