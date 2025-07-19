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
    terminalManager.on('terminal-created', terminalId => {
      this.onTerminalCreated(terminalId);
    });

    terminalManager.on('terminal-destroyed', terminalId => {
      this.onTerminalDestroyed(terminalId);
    });

    terminalManager.on('command-executed', data => {
      this.onCommandExecuted(data);
    });

    terminalManager.on('command-error', data => {
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
    sessionManager.deleteSession = sessionId => {
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

    await terminalSessionInstrumentation.onCommandExecuted(sessionId, command, success, terminalId);
  }

  /**
   * Handle command error event
   */
  async onCommandError(data) {
    const { command, errorType, errorMessage, sessionId = 'default', terminalId = null } = data;

    await terminalSessionInstrumentation.onCommandError(
      sessionId,
      command,
      errorType,
      errorMessage,
      terminalId
    );
  }

  /**
   * Get comprehensive metrics status
   */
  getMetricsStatus() {
    return {
      isInitialized: this.isInitialized,
      integrationStatus: this.integrationStatus,
      metricsService: metricsService.getStatus(),
      terminalSession: terminalSessionInstrumentation.getStatus(),
      pluginSystem: pluginInstrumentation.getStatus(),
    };
  }

  /**
   * Get current metrics snapshot
   */
  async getMetricsSnapshot() {
    return {
      timestamp: new Date().toISOString(),
      terminalSessions: {
        active: terminalSessionInstrumentation.sessionStartTimes.size,
        metrics: terminalSessionInstrumentation.getAllSessionMetrics(),
      },
      plugins: {
        loaded: pluginInstrumentation.loadedPlugins.size,
        metrics: pluginInstrumentation.getAllPluginMetrics(),
        executionStats: pluginInstrumentation.getExecutionStats(),
      },
    };
  }

  /**
   * Force metrics collection
   */
  async forceMetricsCollection() {
    try {
      await terminalSessionInstrumentation.collectAndReportMetrics();
      await pluginInstrumentation.collectAndReportMetrics();
      console.log('📊 Forced metrics collection completed');
    } catch (error) {
      console.error('📊 Error during forced metrics collection:', error);
    }
  }

  /**
   * Shutdown metrics integration
   */
  shutdown() {
    terminalSessionInstrumentation.stopMetricsCollection();
    pluginInstrumentation.stopMetricsCollection();
    this.isInitialized = false;
    console.log('📊 Metrics integration shutdown completed');
  }
}

// Create singleton instance
const metricsIntegration = new MetricsIntegration();

export default metricsIntegration;
