/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Process Lifecycle Manager - Enhanced Reliability for Terminal Operations
 * Addresses common issues: process crashes, memory leaks, zombie processes
 */

export class ProcessLifecycleManager {
  constructor() {
    this.processes = new Map();
    this.healthChecks = new Map();
    this.recoveryStrategies = new Map();
    this.cleanupHandlers = [];

    this.config = {
      maxRestarts: 5,
      restartDelay: 1000,
      healthCheckInterval: 30000,
      processTimeout: 60000,
      memoryThreshold: 500 * 1024 * 1024, // 500MB
      cpuThreshold: 80, // 80%
    };
  }

  /**
   * Register a process with enhanced monitoring
   */
  registerProcess(id, processInfo) {
    const enhancedProcess = {
      ...processInfo,
      id,
      startTime: Date.now(),
      restartCount: 0,
      lastHealthCheck: Date.now(),
      status: 'starting',
      metrics: {
        memory: 0,
        cpu: 0,
        uptime: 0,
      },
    };

    this.processes.set(id, enhancedProcess);
    this.startHealthMonitoring(id);
    this.setupRecoveryStrategy(id);

    return enhancedProcess;
  }

  /**
   * Start health monitoring for a process
   */
  startHealthMonitoring(processId) {
    const healthCheck = setInterval(async () => {
      const _process = this.processes.get(processId);
      if (!_process) {
        clearInterval(healthCheck);
        return;
      }

      try {
        await this.performHealthCheck(_process);
      } catch (error) {
        console.error(`[ProcessManager] Health check failed for ${processId}:`, error);
        await this.handleUnhealthyProcess(_process);
      }
    }, this.config.healthCheckInterval);

    this.healthChecks.set(processId, healthCheck);
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(process) {
    const now = Date.now();
    process.lastHealthCheck = now;
    process.metrics.uptime = now - process.startTime;

    // Check if process is still alive
    if (process.shellProcess && process.shellProcess.killed) {
      throw new Error(new Error(new Error(`Process ${process.id} has been killed`)));
    }

    // Memory usage check (if available)
    if (typeof process.getMemoryUsage === 'function') {
      const memUsage = await process.getMemoryUsage();
      process.metrics.memory = memUsage;

      if (memUsage > this.config.memoryThreshold) {
        console.warn(
          `[ProcessManager] High memory usage detected: ${process.id} (${Math.round(memUsage / 1024 / 1024)}MB)`
        );
        await this.handleHighResourceUsage(process, 'memory', memUsage);
      }
    }

    // Update status
    process.status = 'healthy';
    this.emitHealthUpdate(process);
  }

  /**
   * Handle unhealthy process
   */
  async handleUnhealthyProcess(process) {
    console.warn(`[ProcessManager] Process ${process.id} is unhealthy, initiating recovery`);

    process.status = 'unhealthy';

    const strategy = this.recoveryStrategies.get(process.id);
    if (strategy) {
      await strategy.recover(process);
    } else {
      await this.defaultRecoveryStrategy(process);
    }
  }

  /**
   * Default recovery strategy
   */
  async defaultRecoveryStrategy(process) {
    if (process.restartCount >= this.config.maxRestarts) {
      console.error(`[ProcessManager] Max restarts exceeded for ${process.id}, giving up`);
      process.status = 'failed';
      await this.cleanupProcess(process.id);
      return;
    }

    // Exponential backoff
    const delay = this.config.restartDelay * Math.pow(2, process.restartCount);
    await this.sleep(delay);

    try {
      await this.restartProcess(process);
    } catch (error) {
      console.error(`[ProcessManager] Restart failed for ${process.id}:`, error);
      process.status = 'failed';
    }
  }

  /**
   * Restart a process
   */
  async restartProcess(process) {
    process.restartCount++;
    process.status = 'restarting';

    // Cleanup old process
    if (process.shellProcess && !process.shellProcess.killed) {
      try {
        process.shellProcess.kill();
      } catch (error) {
        console.warn('[ProcessManager] Failed to kill old process:', error);
      }
    }

    // Wait for cleanup
    await this.sleep(1000);

    // Create new process instance
    if (typeof process.restart === 'function') {
      await process.restart();
    } else if (typeof process.init === 'function') {
      await process.init();
    }

    process.startTime = Date.now();
    process.status = 'healthy';

    this.emitProcessRestart(process);
  }

  /**
   * Setup recovery strategy for a process
   */
  setupRecoveryStrategy(processId) {
    const strategy = {
      recover: async process => {
        // Try graceful restart first
        if (process.gracefulRestart) {
          try {
            await process.gracefulRestart();
            return;
          } catch (error) {
            console.warn('[ProcessManager] Graceful restart failed, trying force restart');
          }
        }

        // Fall back to default strategy
        await this.defaultRecoveryStrategy(process);
      },
    };

    this.recoveryStrategies.set(processId, strategy);
  }

  /**
   * Handle high resource usage
   */
  async handleHighResourceUsage(process, resourceType, value) {
    const alert = {
      processId: process.id,
      resourceType,
      value,
      threshold: resourceType === 'memory' ? this.config.memoryThreshold : this.config.cpuThreshold,
      timestamp: Date.now(),
    };

    // Emit warning event
    this.emitResourceAlert(alert);

    // Attempt to reduce resource usage
    if (typeof process.optimizeResources === 'function') {
      try {
        await process.optimizeResources(resourceType);
      } catch (error) {
        console.error('[ProcessManager] Resource optimization failed:', error);
      }
    }
  }

  /**
   * Clean up a process and all associated resources
   */
  async cleanupProcess(processId) {
    const process = this.processes.get(processId);
    if (!process) return;

    // Stop health monitoring
    const healthCheck = this.healthChecks.get(processId);
    if (healthCheck) {
      clearInterval(healthCheck);
      this.healthChecks.delete(processId);
    }

    // Kill the actual process
    if (process.shellProcess && !process.shellProcess.killed) {
      try {
        process.shellProcess.kill('SIGTERM');

        // Wait for graceful shutdown, then force kill if needed
        setTimeout(() => {
          if (!process.shellProcess.killed) {
            process.shellProcess.kill('SIGKILL');
          }
        }, 5000);
      } catch (error) {
        console.warn('[ProcessManager] Process cleanup error:', error);
      }
    }

    // Run custom cleanup handlers
    if (typeof process.cleanup === 'function') {
      try {
        await process.cleanup();
      } catch (error) {
        console.error('[ProcessManager] Custom cleanup failed:', error);
      }
    }

    // Remove from tracking
    this.processes.delete(processId);
    this.recoveryStrategies.delete(processId);
  }

  /**
   * Global cleanup for all processes
   */
  async cleanupAll() {
    const cleanupPromises = Array.from(this.processes.keys()).map(id => this.cleanupProcess(id));

    await Promise.allSettled(cleanupPromises);

    // Run global cleanup handlers
    for (const handler of this.cleanupHandlers) {
      try {
        await handler();
      } catch (error) {
        console.error('[ProcessManager] Global cleanup handler failed:', error);
      }
    }
  }

  /**
   * Register global cleanup handler
   */
  onCleanup(handler) {
    this.cleanupHandlers.push(handler);
  }

  /**
   * Get process status
   */
  getProcessStatus(processId) {
    const process = this.processes.get(processId);
    if (!process) return null;

    return {
      id: process.id,
      status: process.status,
      uptime: Date.now() - process.startTime,
      restartCount: process.restartCount,
      lastHealthCheck: process.lastHealthCheck,
      metrics: process.metrics,
    };
  }

  /**
   * Get all process statuses
   */
  getAllProcessStatuses() {
    const statuses = {};
    for (const [id, _process] of this.processes.entries()) {
      statuses[id] = this.getProcessStatus(id);
    }
    return statuses;
  }

  /**
   * Event emitters
   */
  emitHealthUpdate(process) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('process:health-update', {
          detail: { processId: process.id, status: process.status, metrics: process.metrics },
        })
      );
    }
  }

  emitProcessRestart(process) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('process:restart', {
          detail: { processId: process.id, restartCount: process.restartCount },
        })
      );
    }
  }

  emitResourceAlert(alert) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('process:resource-alert', {
          detail: alert,
        })
      );
    }
  }

  /**
   * Utility functions
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global process lifecycle manager
export const processLifecycleManager = new ProcessLifecycleManager();

// Setup cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    processLifecycleManager.cleanupAll();
  });

  // Expose for debugging
  window.processManager = processLifecycleManager;
}

export default ProcessLifecycleManager;
