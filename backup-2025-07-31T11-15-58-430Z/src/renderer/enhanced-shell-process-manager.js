/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Enhanced Shell Process Manager with Lifecycle Integration
 * Combines your existing ShellProcessManager with the new ProcessLifecycleManager
 */

import { processLifecycleManager } from '../ai-services/process-lifecycle-manager.js';
import { ShellProcessManager } from './shell-process-manager.js';

export class EnhancedShellProcessManager extends ShellProcessManager {
  constructor(tabId, terminal, options = {}) {
    super(tabId, terminal, options);

    // Enhanced lifecycle management
    this.lifecycleOptions = {
      processId: `shell-${tabId}`,
      enableHealthChecks: true,
      enableResourceMonitoring: true,
      autoRestart: options.autoRestart !== false,
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      ...options.lifecycle,
    };

    // Process health metrics
    this.healthMetrics = {
      lastHealthCheck: null,
      healthStatus: 'unknown',
      resourceUsage: {
        memory: 0,
        cpu: 0,
      },
      responseTime: [],
    };

    // Recovery strategies
    this.recoveryStrategies = new Map();
    this.setupRecoveryStrategies();
  }

  /**
   * Enhanced initialization with lifecycle management
   */
  async init() {
    try {
      // Initialize parent functionality
      await super.init();

      // Register with process lifecycle manager
      await this.registerWithLifecycleManager();

      // Start enhanced monitoring
      this.startEnhancedMonitoring();

      this.log('Enhanced shell process manager initialized', 'success');
      return this.sessionId;
    } catch (error) {
      this.handleError('Enhanced initialization failed', error);
      throw new Error(error);
    }
  }

  /**
   * Register with the process lifecycle manager
   */
  async registerWithLifecycleManager() {
    const processInfo = {
      id: this.lifecycleOptions.processId,
      type: 'shell',
      tabId: this.tabId,
      sessionId: this.sessionId,
      shellProcess: this.shellProcess,
      terminal: this.terminal,

      // Health check method
      getMemoryUsage: () => this.getMemoryUsage(),

      // Recovery methods
      gracefulRestart: () => this.gracefulRestart(),
      restart: () => this.restart(),
      cleanup: () => this.cleanup(),

      // Resource optimization
      optimizeResources: resourceType => this.optimizeResources(resourceType),

      // Custom initialization
      init: () => this.reinitializeProcess(),
    };

    this.lifecycleProcess = processLifecycleManager.registerProcess(
      this.lifecycleOptions.processId,
      processInfo
    );

    // Set up lifecycle event handlers
    this.setupLifecycleEventHandlers();

    this.log(`Registered with lifecycle manager: ${this.lifecycleOptions.processId}`, 'info');
  }

  /**
   * Set up lifecycle event handlers
   */
  setupLifecycleEventHandlers() {
    // Listen for process health updates
    window.addEventListener('process:health-update', event => {
      if (event.detail.processId === this.lifecycleOptions.processId) {
        this.handleHealthUpdate(event.detail);
      }
    });

    // Listen for resource alerts
    window.addEventListener('process:resource-alert', event => {
      if (event.detail.processId === this.lifecycleOptions.processId) {
        this.handleResourceAlert(event.detail);
      }
    });

    // Listen for restart events
    window.addEventListener('process:restart', event => {
      if (event.detail.processId === this.lifecycleOptions.processId) {
        this.handleLifecycleRestart(event.detail);
      }
    });
  }

  /**
   * Enhanced monitoring with resource tracking
   */
  startEnhancedMonitoring() {
    // Resource monitoring interval
    this.resourceMonitor = setInterval(async () => {
      await this.updateResourceMetrics();
    }, 10000); // Every 10 seconds

    // Response time monitoring
    this.responseTimeMonitor = setInterval(() => {
      this.updateResponseTimeMetrics();
    }, 5000); // Every 5 seconds

    // Health check interval
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  /**
   * Get memory usage for the shell process
   */
  async getMemoryUsage() {
    try {
      if (window.electronAPI && window.electronAPI.getProcessMemoryUsage) {
        const usage = await window.electronAPI.getProcessMemoryUsage(this.sessionId);
        this.healthMetrics.resourceUsage.memory = usage;
        return usage;
      }
      return this.healthMetrics.resourceUsage.memory;
    } catch (error) {
      this.log(`Failed to get memory usage: ${error.message}`, 'warning');
      return 0;
    }
  }

  /**
   * Update resource metrics
   */
  async updateResourceMetrics() {
    try {
      // Update memory usage
      await this.getMemoryUsage();

      // Update CPU usage if available
      if (window.electronAPI && window.electronAPI.getProcessCpuUsage) {
        const cpuUsage = await window.electronAPI.getProcessCpuUsage(this.sessionId);
        this.healthMetrics.resourceUsage.cpu = cpuUsage;
      }

      // Update diagnostics
      this.diagnostics.resourceUsage = { ...this.healthMetrics.resourceUsage };
    } catch (error) {
      this.log(`Resource metrics update failed: ${error.message}`, 'warning');
    }
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    try {
      this.healthMetrics.lastHealthCheck = Date.now();

      // Check if process is responsive
      const isResponsive = await this.checkProcessResponsiveness();

      // Check resource usage
      const memoryOk =
        this.healthMetrics.resourceUsage.memory < this.lifecycleOptions.maxMemoryUsage;
      const cpuOk = this.healthMetrics.resourceUsage.cpu < 80; // 80% threshold

      // Determine health status
      if (isResponsive && memoryOk && cpuOk) {
        this.healthMetrics.healthStatus = 'healthy';
      } else {
        this.healthMetrics.healthStatus = 'unhealthy';

        // Log specific issues
        if (!isResponsive) this.log('Process not responsive', 'warning');
        if (!memoryOk)
          this.log(
            `High memory usage: ${Math.round(this.healthMetrics.resourceUsage.memory / 1024 / 1024)}MB`,
            'warning'
          );
        if (!cpuOk) this.log(`High CPU usage: ${this.healthMetrics.resourceUsage.cpu}%`, 'warning');
      }

      // Update UI indicators
      this.updateHealthIndicators();
    } catch (error) {
      this.healthMetrics.healthStatus = 'error';
      this.log(`Health check failed: ${error.message}`, 'error');
    }
  }

  /**
   * Check if process is responsive
   */
  async checkProcessResponsiveness() {
    try {
      if (!this.sessionId || this.state !== 'active') {
        return false;
      }

      // Send a simple command and wait for response
      const testStart = Date.now();
      await this.writeToShell('echo "health_check"\n');

      // Wait for response (simplified - you might want to implement proper response tracking)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const responseTime = Date.now() - testStart;
      this.healthMetrics.responseTime.push(responseTime);

      // Keep only last 10 response times
      if (this.healthMetrics.responseTime.length > 10) {
        this.healthMetrics.responseTime.shift();
      }

      return responseTime < 5000; // 5 second timeout
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle health update from lifecycle manager
   */
  handleHealthUpdate(detail) {
    this.log(`Health update: ${detail.status}`, detail.status === 'healthy' ? 'info' : 'warning');

    // Update local health metrics
    this.healthMetrics.healthStatus = detail.status;
    if (detail.metrics) {
      Object.assign(this.healthMetrics.resourceUsage, detail.metrics);
    }

    // Update UI
    this.updateHealthIndicators();
  }

  /**
   * Handle resource alert from lifecycle manager
   */
  handleResourceAlert(alert) {
    this.log(
      `Resource alert: ${alert.resourceType} usage ${Math.round(alert.value / 1024 / 1024)}MB exceeds threshold`,
      'warning'
    );

    // Show user notification
    this.terminal.write(
      `\r\n⚠️  High ${alert.resourceType} usage detected (${Math.round(alert.value / 1024 / 1024)}MB)\r\n`
    );
    this.terminal.write('🔧 Attempting automatic optimization...\r\n');

    // Trigger optimization
    this.optimizeResources(alert.resourceType);
  }

  /**
   * Handle restart event from lifecycle manager
   */
  handleLifecycleRestart(detail) {
    this.terminal.write(
      `\r\n🔄 Process restarted by lifecycle manager (attempt ${detail.restartCount})\r\n`
    );
    this.log(`Lifecycle restart completed: ${detail.sessionId}`, 'info');
  }

  /**
   * Optimize resources based on type
   */
  async optimizeResources(resourceType) {
    try {
      switch (resourceType) {
      case 'memory':
        await this.optimizeMemoryUsage();
        break;
      case 'cpu':
        await this.optimizeCpuUsage();
        break;
      default:
        this.log(`Unknown resource type for optimization: ${resourceType}`, 'warning');
      }
    } catch (error) {
      this.log(`Resource optimization failed: ${error.message}`, 'error');
    }
  }

  /**
   * Optimize memory usage
   */
  async optimizeMemoryUsage() {
    this.log('Optimizing memory usage...', 'info');

    // Clear terminal scrollback to reduce memory
    if (this.terminal && this.terminal.clear) {
      // Keep some history but reduce scrollback
      const currentScrollback = this.terminal.options.scrollback;
      this.terminal.options.scrollback = Math.max(100, currentScrollback / 2);
    }

    // Clear diagnostic history
    if (this.diagnostics.commands.length > 50) {
      this.diagnostics.commands = this.diagnostics.commands.slice(-25);
    }
    if (this.diagnostics.errors.length > 20) {
      this.diagnostics.errors = this.diagnostics.errors.slice(-10);
    }

    // Trigger garbage collection if available
    if (window.electronAPI && window.electronAPI.triggerGarbageCollection) {
      await window.electronAPI.triggerGarbageCollection();
    }

    this.terminal.write('✅ Memory optimization completed\r\n');
  }

  /**
   * Optimize CPU usage
   */
  async optimizeCpuUsage() {
    this.log('Optimizing CPU usage...', 'info');

    // Reduce monitoring frequency temporarily
    const originalInterval = 10000;
    const reducedInterval = 30000;

    clearInterval(this.resourceMonitor);
    this.resourceMonitor = setInterval(async () => {
      await this.updateResourceMetrics();
    }, reducedInterval);

    // Restore normal interval after 5 minutes
    setTimeout(
      () => {
        clearInterval(this.resourceMonitor);
        this.resourceMonitor = setInterval(async () => {
          await this.updateResourceMetrics();
        }, originalInterval);
      },
      5 * 60 * 1000
    );

    this.terminal.write('✅ CPU optimization completed\r\n');
  }

  /**
   * Graceful restart implementation
   */
  async gracefulRestart() {
    this.log('Performing graceful restart...', 'info');

    try {
      // Save current state
      const currentState = {
        cwd: this.options.cwd,
        env: this.options.env,
        history: this.terminal ? [...this.history] : [],
      };

      // Notify user
      this.terminal.write('\r\n🔄 Performing graceful restart...\r\n');

      // Clean shutdown
      await this.cleanup(false);

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Restore options
      Object.assign(this.options, currentState);

      // Reinitialize
      await this.reinitializeProcess();

      // Restore history
      if (currentState.history) {
        this.history = currentState.history;
      }

      this.terminal.write('✅ Graceful restart completed\r\n');
    } catch (error) {
      this.log(`Graceful restart failed: ${error.message}`, 'error');
      throw new Error(error);
    }
  }

  /**
   * Reinitialize process (used by lifecycle manager)
   */
  async reinitializeProcess() {
    // Reset internal state
    this.sessionId = null;
    this.state = 'idle';
    this.errorCount = 0;

    // Initialize again
    await super.init();

    // Update lifecycle manager
    if (this.lifecycleProcess) {
      this.lifecycleProcess.sessionId = this.sessionId;
      this.lifecycleProcess.startTime = Date.now();
    }
  }

  /**
   * Setup recovery strategies
   */
  setupRecoveryStrategies() {
    // Memory-related recovery
    this.recoveryStrategies.set('high-memory', async () => {
      await this.optimizeMemoryUsage();
      await new Promise(resolve => setTimeout(resolve, 2000));
      const newUsage = await this.getMemoryUsage();
      return newUsage < this.lifecycleOptions.maxMemoryUsage;
    });

    // Process unresponsive recovery
    this.recoveryStrategies.set('unresponsive', async () => {
      await this.gracefulRestart();
      await new Promise(resolve => setTimeout(resolve, 3000));
      return this.state === 'active';
    });

    // General error recovery
    this.recoveryStrategies.set('error', async () => {
      if (this.errorCount < 3) {
        await this.restart();
        return true;
      }
      return false;
    });
  }

  /**
   * Update health indicators in the UI
   */
  updateHealthIndicators() {
    const tabElement = document.querySelector(`[data-tab-id="${this.tabId}"]`);
    if (!tabElement) return;

    // Update health indicator
    let healthIndicator = tabElement.querySelector('.health-indicator');
    if (!healthIndicator) {
      healthIndicator = document.createElement('span');
      healthIndicator.className = 'health-indicator';
      tabElement.appendChild(healthIndicator);
    }

    // Set health status
    const healthEmojis = {
      healthy: '💚',
      unhealthy: '💛',
      error: '❤️',
      unknown: '⚪',
    };

    healthIndicator.textContent = healthEmojis[this.healthMetrics.healthStatus] || '⚪';
    healthIndicator.title = `Health: ${this.healthMetrics.healthStatus}`;

    // Update resource usage display if available
    let resourceIndicator = tabElement.querySelector('.resource-indicator');
    if (!resourceIndicator) {
      resourceIndicator = document.createElement('div');
      resourceIndicator.className = 'resource-indicator';
      tabElement.appendChild(resourceIndicator);
    }

    const memMB = Math.round(this.healthMetrics.resourceUsage.memory / 1024 / 1024);
    resourceIndicator.innerHTML = `
            <small>
                MEM: ${memMB}MB | 
                CPU: ${this.healthMetrics.resourceUsage.cpu.toFixed(1)}%
            </small>
        `;
  }

  /**
   * Enhanced cleanup with lifecycle manager integration
   */
  async cleanup(updateState = true) {
    // Clean up monitoring intervals
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
      this.resourceMonitor = null;
    }

    if (this.responseTimeMonitor) {
      clearInterval(this.responseTimeMonitor);
      this.responseTimeMonitor = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Cleanup with lifecycle manager
    if (this.lifecycleOptions.processId) {
      await processLifecycleManager.cleanupProcess(this.lifecycleOptions.processId);
    }

    // Call parent cleanup
    await super.cleanup(updateState);

    this.log('Enhanced cleanup completed', 'info');
  }

  /**
   * Get enhanced status information
   */
  getEnhancedStatus() {
    const baseStatus = this.getStatus();

    return {
      ...baseStatus,
      lifecycle: {
        processId: this.lifecycleOptions.processId,
        healthStatus: this.healthMetrics.healthStatus,
        lastHealthCheck: this.healthMetrics.lastHealthCheck,
        resourceUsage: this.healthMetrics.resourceUsage,
        avgResponseTime:
          this.healthMetrics.responseTime.length > 0
            ? this.healthMetrics.responseTime.reduce((a, b) => a + b) /
              this.healthMetrics.responseTime.length
            : 0,
      },
    };
  }
}

// Export the enhanced manager
export { EnhancedShellProcessManager as default };

// Export factory function
export async function createEnhancedShellManager(tabId, terminal, options = {}) {
  const manager = new EnhancedShellProcessManager(tabId, terminal, options);
  await manager.init();
  return manager;
}
