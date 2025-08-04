/**
 * Plugin System Metrics Instrumentation
 * Integrates with the PluginManager to collect plugin-specific metrics
 */

import metricsService from './metrics-service.js';

export class PluginInstrumentation {
  constructor() {
    this.loadedPlugins = new Map();
    this.pluginLoadTimes = new Map();
    this.pluginErrorCounts = new Map();
    this.executionTimeTrackers = new Map();
    this.metricsInterval = null;
    this.metricsCollectionInterval = 60000; // 1 minute

    this.startMetricsCollection();
  }

  /**
   * Start periodic metrics collection
   */
  startMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.metricsInterval = setInterval(() => {
      this.collectAndReportMetrics();
    }, this.metricsCollectionInterval);
  }

  /**
   * Stop periodic metrics collection
   */
  stopMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * Instrument plugin loading
   */
  async onPluginLoaded(pluginName, version, trusted = false) {
    const loadStartTime = Date.now();

    // Record plugin as loaded
    this.loadedPlugins.set(pluginName, {
      version,
      trusted,
      loadTime: loadStartTime,
      executionCount: 0,
      errorCount: 0,
    });

    // Initialize error tracking
    this.pluginErrorCounts.set(pluginName, 0);

    // Record loading time (simulated - real implementation would track actual load time)
    const loadTime = Date.now() - loadStartTime;
    this.pluginLoadTimes.set(pluginName, loadTime);

    // Record metrics
    await metricsService.recordPluginLoaded(pluginName, version, loadTime);
  }

  /**
   * Instrument plugin unloading
   */
  async onPluginUnloaded(pluginName, reason = 'user_request') {
    if (this.loadedPlugins.has(pluginName)) {
      // Record unloading event
      await metricsService.recordPluginUnloaded(pluginName, reason);

      // Clean up tracking data
      this.loadedPlugins.delete(pluginName);
      this.pluginLoadTimes.delete(pluginName);
      this.pluginErrorCounts.delete(pluginName);
      this.executionTimeTrackers.delete(pluginName);

      console.log(`📊 Plugin instrumentation ended for: ${pluginName} (reason: ${reason})`);
    }
  }

  /**
   * Instrument plugin execution start
   */
  startPluginExecution(pluginName, operationType = 'unknown') {
    const executionId = `${pluginName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.executionTimeTrackers.set(executionId, {
      pluginName,
      operationType,
      startTime: Date.now(),
    });

    // Update execution count
    const pluginData = this.loadedPlugins.get(pluginName);
    if (pluginData) {
      pluginData.executionCount++;
    }

    return executionId;
  }

  /**
   * Instrument plugin execution end
   */
  async endPluginExecution(executionId, _success = true) {
    const tracker = this.executionTimeTrackers.get(executionId);
    if (!tracker) {
      return;
    }

    const executionTime = Date.now() - tracker.startTime;

    // Record execution time
    await metricsService.recordPluginExecutionTime(
      tracker.pluginName,
      executionTime,
      tracker.operationType
    );

    // Clean up tracker
    this.executionTimeTrackers.delete(executionId);

      `📊 Plugin execution tracked: ${tracker.pluginName} (${tracker.operationType}) - ${executionTime}ms`
    );
  }

  /**
   * Instrument plugin error
   */
  async onPluginError(pluginName, errorType, errorMessage, severity = 'error') {
    // Update error count
    const currentCount = this.pluginErrorCounts.get(pluginName) || 0;
    this.pluginErrorCounts.set(pluginName, currentCount + 1);

    // Update plugin data
    const pluginData = this.loadedPlugins.get(pluginName);
    if (pluginData) {
      pluginData.errorCount++;
    }

    // Record error
    await metricsService.recordPluginError(pluginName, errorType, errorMessage, severity);

    console.log(`📊 Plugin error tracked: ${pluginName} - ${errorType}`);
  }

  /**
   * Collect and report periodic metrics
   */
  async collectAndReportMetrics() {
    try {
      // Get loaded plugin count
      const loadedPluginCount = this.loadedPlugins.size;
      const loadedPluginNames = Array.from(this.loadedPlugins.keys());

      // Record loaded plugins
      await metricsService.recordLoadedPlugins(loadedPluginCount, loadedPluginNames);

      // Calculate and record error rates
      for (const [pluginName, pluginData] of this.loadedPlugins) {
        const uptimeMs = Date.now() - pluginData.loadTime;
        const uptimeMinutes = uptimeMs / (1000 * 60);

        if (uptimeMinutes > 0) {
          const errorRate = pluginData.errorCount / uptimeMinutes;
          await metricsService.recordPluginErrorRate(pluginName, errorRate);
        }
      }
    } catch (error) {
      console.error('📊 Error collecting plugin metrics:', error);
    }
  }

  /**
   * Get plugin metrics
   */
  getPluginMetrics(pluginName) {
    const pluginData = this.loadedPlugins.get(pluginName);
    if (!pluginData) {
      return null;
    }

    const uptimeMs = Date.now() - pluginData.loadTime;
    const uptimeMinutes = uptimeMs / (1000 * 60);
    const errorRate = uptimeMinutes > 0 ? pluginData.errorCount / uptimeMinutes : 0;

    return {
      pluginName,
      version: pluginData.version,
      trusted: pluginData.trusted,
      uptimeMs,
      executionCount: pluginData.executionCount,
      errorCount: pluginData.errorCount,
      errorRate,
      isLoaded: true,
    };
  }

  /**
   * Get all plugin metrics
   */
  getAllPluginMetrics() {
    const metrics = [];

    for (const pluginName of this.loadedPlugins.keys()) {
      const pluginMetrics = this.getPluginMetrics(pluginName);
      if (pluginMetrics) {
        metrics.push(pluginMetrics);
      }
    }

    return metrics;
  }

  /**
   * Get execution statistics
   */
  getExecutionStats() {
    const stats = {
      totalExecutions: 0,
      activeExecutions: this.executionTimeTrackers.size,
      pluginBreakdown: {},
    };

    // Calculate total executions and breakdown by plugin
    for (const [pluginName, pluginData] of this.loadedPlugins) {
      stats.totalExecutions += pluginData.executionCount;
      stats.pluginBreakdown[pluginName] = {
        executions: pluginData.executionCount,
        errors: pluginData.errorCount,
        errorRate:
          pluginData.executionCount > 0 ? pluginData.errorCount / pluginData.executionCount : 0,
      };
    }

    return stats;
  }

  /**
   * Get instrumentation status
   */
  getStatus() {
    return {
      isActive: this.metricsInterval !== null,
      loadedPlugins: this.loadedPlugins.size,
      activeExecutions: this.executionTimeTrackers.size,
      collectionInterval: this.metricsCollectionInterval,
      trackedPlugins: Array.from(this.loadedPlugins.keys()),
    };
  }

  /**
   * Integration method for PluginManager
   */
  integrateWithPluginManager(pluginManager) {
    // Listen for plugin events
    pluginManager.on('plugin-loaded', pluginName => {
      const plugin = pluginManager.plugins.get(pluginName);
      if (plugin) {
        this.onPluginLoaded(pluginName, plugin.manifest.version, plugin.trusted);
      }
    });

    pluginManager.on('plugin-unloaded', pluginName => {
      this.onPluginUnloaded(pluginName);
    });

    pluginManager.on('plugin-error', data => {
      this.onPluginError(
        data.plugin,
        data.error.name || 'unknown',
        data.error.message || 'Unknown error',
        'error'
      );
    });

    // Wrap plugin execution methods
    const originalLoadPlugin = pluginManager.loadPlugin.bind(pluginManager);
    pluginManager.loadPlugin = async (pluginPath, trusted = false) => {
      const startTime = Date.now();
      const result = await originalLoadPlugin(pluginPath, trusted);
      const _loadTime = Date.now() - startTime;

      // Extract plugin name from path or result
      const pluginName = pluginPath.split('/').pop() || 'unknown';
      if (result && !this.loadedPlugins.has(pluginName)) {
        await this.onPluginLoaded(pluginName, '1.0.0', trusted);
      }

      return result;
    };

  }
}

// Create singleton instance
const pluginInstrumentation = new PluginInstrumentation();

export default pluginInstrumentation;
