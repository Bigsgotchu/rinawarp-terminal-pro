import monitoringConfig from './config/gcp-monitoring-config.js';

/**
 * Metrics Service for RinaWarp Terminal
 * Handles custom metric creation and data writing to Google Cloud Monitoring
 */
class MetricsService {
  constructor() {
    this.isInitialized = false;
    this.metricsBuffer = [];
    this.bufferFlushInterval = 30000; // 30 seconds
    this.maxBufferSize = 100;

    this.initializeMetrics();
  }

  /**
   * Initialize the metrics service
   */
  async initializeMetrics() {
    try {
      await monitoringConfig.initialize();
      this.isInitialized = true;

      // Create default custom metrics
      await this.createDefaultMetrics();

      // Start buffer flush interval
      this.startBufferFlush();

      console.log('✅ Metrics service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize metrics service:', error.message);
      this.isInitialized = false;
    }
  }

  /**
   * Create default custom metrics for RinaWarp Terminal
   */
  async createDefaultMetrics() {
    const defaultMetrics = [
      // Terminal session metrics
      {
        type: 'rinawarp/terminal/sessions/active',
        displayName: 'Active Terminal Sessions',
        description: 'Number of active terminal sessions',
        metricKind: 'GAUGE',
        valueType: 'INT64',
      },
      {
        type: 'rinawarp/terminal/sessions/duration',
        displayName: 'Session Duration',
        description: 'Session duration histogram in seconds',
        metricKind: 'CUMULATIVE',
        valueType: 'DISTRIBUTION',
      },
      {
        type: 'rinawarp/terminal/commands/executed',
        displayName: 'Commands Executed Per Minute',
        description: 'Rate of commands executed per minute',
        metricKind: 'GAUGE',
        valueType: 'DOUBLE',
      },
      {
        type: 'rinawarp/terminal/commands/errors',
        displayName: 'Command Execution Errors',
        description: 'Number of command execution errors',
        metricKind: 'CUMULATIVE',
        valueType: 'INT64',
      },
      // Plugin system metrics
      {
        type: 'rinawarp/plugins/loaded',
        displayName: 'Loaded Plugins',
        description: 'Number of loaded plugins',
        metricKind: 'GAUGE',
        valueType: 'INT64',
      },
      {
        type: 'rinawarp/plugins/execution_time',
        displayName: 'Plugin Execution Latency',
        description: 'Plugin execution latency in milliseconds',
        metricKind: 'GAUGE',
        valueType: 'DOUBLE',
      },
      {
        type: 'rinawarp/plugins/errors',
        displayName: 'Plugin Error Rate',
        description: 'Plugin error rate per minute',
        metricKind: 'GAUGE',
        valueType: 'DOUBLE',
      },
      // Legacy metrics for backward compatibility
      {
        type: 'rinawarp/terminal/active_sessions',
        displayName: 'Active Terminal Sessions (Legacy)',
        description: 'Number of active terminal sessions (deprecated)',
        metricKind: 'GAUGE',
        valueType: 'INT64',
      },
      {
        type: 'rinawarp/terminal/commands_executed',
        displayName: 'Commands Executed (Legacy)',
        description: 'Total number of commands executed (deprecated)',
        metricKind: 'CUMULATIVE',
        valueType: 'INT64',
      },
      {
        type: 'rinawarp/terminal/memory_usage',
        displayName: 'Memory Usage',
        description: 'Memory usage in MB',
        metricKind: 'GAUGE',
        valueType: 'DOUBLE',
      },
      {
        type: 'rinawarp/terminal/cpu_usage',
        displayName: 'CPU Usage',
        description: 'CPU usage percentage',
        metricKind: 'GAUGE',
        valueType: 'DOUBLE',
      },
      {
        type: 'rinawarp/terminal/errors',
        displayName: 'Terminal Errors (Legacy)',
        description: 'Number of terminal errors (deprecated)',
        metricKind: 'CUMULATIVE',
        valueType: 'INT64',
      },
      {
        type: 'rinawarp/ai/requests',
        displayName: 'AI Requests',
        description: 'Number of AI assistance requests',
        metricKind: 'CUMULATIVE',
        valueType: 'INT64',
      },
      {
        type: 'rinawarp/ai/response_time',
        displayName: 'AI Response Time',
        description: 'AI response time in milliseconds',
        metricKind: 'GAUGE',
        valueType: 'DOUBLE',
      },
    ];

    for (const metric of defaultMetrics) {
      try {
        await monitoringConfig.createCustomMetric(
          metric.type,
          metric.displayName,
          metric.description,
          metric.metricKind,
          metric.valueType
        );
      } catch (error) {
        console.error(`❌ Failed to create metric ${metric.type}:`, error.message);
      }
    }
  }

  /**
   * Record a metric value
   */
  async recordMetric(metricType, value, labels = {}) {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️  Metrics service not initialized, buffering metric');
        this.bufferMetric(metricType, value, labels);
        return;
      }

      await monitoringConfig.writeMetricData(metricType, value, labels);
    } catch (error) {
      console.error('❌ Error recording metric:', error.message);
      // Buffer the metric for retry
      this.bufferMetric(metricType, value, labels);
    }
  }

  /**
   * Buffer a metric for later retry
   */
  bufferMetric(metricType, value, labels = {}) {
    if (this.metricsBuffer.length >= this.maxBufferSize) {
      // Remove oldest metric to make room
      this.metricsBuffer.shift();
    }

    this.metricsBuffer.push({
      metricType,
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  /**
   * Flush buffered metrics
   */
  async flushBufferedMetrics() {
    if (this.metricsBuffer.length === 0 || !this.isInitialized) {
      return;
    }

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    for (const metric of metricsToFlush) {
      try {
        await monitoringConfig.writeMetricData(metric.metricType, metric.value, metric.labels);
      } catch (error) {
        console.error('❌ Error flushing buffered metric:', error.message);
        // Re-buffer failed metrics (up to max buffer size)
        this.bufferMetric(metric.metricType, metric.value, metric.labels);
      }
    }

    if (this.metricsBuffer.length > 0) {
      console.log(
        `📊 Flushed ${metricsToFlush.length - this.metricsBuffer.length} metrics, ${this.metricsBuffer.length} failed`
      );
    }
  }

  /**
   * Start buffer flush interval
   */
  startBufferFlush() {
    setInterval(async () => {
      await this.flushBufferedMetrics();
    }, this.bufferFlushInterval);
  }

  /**
   * Record terminal session start
   */
  async recordSessionStart(sessionId) {
    await this.recordMetric('rinawarp/terminal/active_sessions', 1, {
      session_id: sessionId,
      event_type: 'session_start',
    });
  }

  /**
   * Record terminal session end
   */
  async recordSessionEnd(sessionId) {
    await this.recordMetric('rinawarp/terminal/active_sessions', 0, {
      session_id: sessionId,
      event_type: 'session_end',
    });
  }

  /**
   * Record command execution
   */
  async recordCommandExecution(command, success = true) {
    await this.recordMetric('rinawarp/terminal/commands_executed', 1, {
      command_type: this.getCommandType(command),
      success: success.toString(),
    });
  }

  /**
   * Record system metrics
   */
  async recordSystemMetrics(memoryUsage, cpuUsage) {
    await this.recordMetric('rinawarp/terminal/memory_usage', memoryUsage);
    await this.recordMetric('rinawarp/terminal/cpu_usage', cpuUsage);
  }

  /**
   * Record terminal error
   */
  async recordError(errorType, errorMessage) {
    await this.recordMetric('rinawarp/terminal/errors', 1, {
      error_type: errorType,
      error_message: errorMessage.substring(0, 100), // Limit length
    });
  }

  /**
   * Record AI request
   */
  async recordAIRequest(requestType, responseTime) {
    await this.recordMetric('rinawarp/ai/requests', 1, {
      request_type: requestType,
    });

    if (responseTime) {
      await this.recordMetric('rinawarp/ai/response_time', responseTime, {
        request_type: requestType,
      });
    }
  }

  // === NEW TERMINAL SESSION METRICS ===

  /**
   * Record active terminal sessions count
   */
  async recordActiveTerminalSessions(sessionCount, sessionIds = []) {
    await this.recordMetric('rinawarp/terminal/sessions/active', sessionCount, {
      session_count: sessionCount.toString(),
      timestamp: new Date().toISOString(),
    });

    // Also record individual session states
    for (const sessionId of sessionIds) {
      await this.recordMetric('rinawarp/terminal/sessions/active', 1, {
        session_id: sessionId,
        state: 'active',
      });
    }
  }

  /**
   * Record terminal session duration when session ends
   */
  async recordTerminalSessionDuration(sessionId, durationSeconds, sessionType = 'default') {
    await this.recordMetric('rinawarp/terminal/sessions/duration', durationSeconds, {
      session_id: sessionId,
      session_type: sessionType,
      duration_bucket: this.getDurationBucket(durationSeconds),
    });
  }

  /**
   * Record commands executed per minute rate
   */
  async recordCommandsPerMinute(commandsPerMinute, terminalId = null) {
    await this.recordMetric('rinawarp/terminal/commands/executed', commandsPerMinute, {
      terminal_id: terminalId,
      rate_type: 'per_minute',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Record command execution errors
   */
  async recordCommandExecutionError(command, errorType, errorMessage, terminalId = null) {
    await this.recordMetric('rinawarp/terminal/commands/errors', 1, {
      command_type: this.getCommandType(command),
      error_type: errorType,
      error_message: errorMessage.substring(0, 100),
      terminal_id: terminalId,
    });
  }

  // === NEW PLUGIN METRICS ===

  /**
   * Record number of loaded plugins
   */
  async recordLoadedPlugins(pluginCount, pluginNames = []) {
    await this.recordMetric('rinawarp/plugins/loaded', pluginCount, {
      plugin_count: pluginCount.toString(),
      timestamp: new Date().toISOString(),
    });

    // Record individual plugin states
    for (const pluginName of pluginNames) {
      await this.recordMetric('rinawarp/plugins/loaded', 1, {
        plugin_name: pluginName,
        state: 'loaded',
      });
    }
  }

  /**
   * Record plugin execution time
   */
  async recordPluginExecutionTime(pluginName, executionTimeMs, operationType = 'unknown') {
    await this.recordMetric('rinawarp/plugins/execution_time', executionTimeMs, {
      plugin_name: pluginName,
      operation_type: operationType,
      latency_bucket: this.getLatencyBucket(executionTimeMs),
    });
  }

  /**
   * Record plugin error rate
   */
  async recordPluginErrorRate(pluginName, errorRate, errorType = 'unknown') {
    await this.recordMetric('rinawarp/plugins/errors', errorRate, {
      plugin_name: pluginName,
      error_type: errorType,
      rate_type: 'per_minute',
    });
  }

  /**
   * Record plugin loading event
   */
  async recordPluginLoaded(pluginName, version, loadTime) {
    await this.recordMetric('rinawarp/plugins/loaded', 1, {
      plugin_name: pluginName,
      plugin_version: version,
      event_type: 'plugin_loaded',
    });

    await this.recordMetric('rinawarp/plugins/execution_time', loadTime, {
      plugin_name: pluginName,
      operation_type: 'load',
    });
  }

  /**
   * Record plugin unloading event
   */
  async recordPluginUnloaded(pluginName, reason = 'user_request') {
    await this.recordMetric('rinawarp/plugins/loaded', 0, {
      plugin_name: pluginName,
      event_type: 'plugin_unloaded',
      reason: reason,
    });
  }

  /**
   * Record plugin error event
   */
  async recordPluginError(pluginName, errorType, errorMessage, severity = 'error') {
    await this.recordMetric('rinawarp/plugins/errors', 1, {
      plugin_name: pluginName,
      error_type: errorType,
      error_message: errorMessage.substring(0, 100),
      severity: severity,
    });
  }

  // === HELPER METHODS ===

  /**
   * Get duration bucket for histogram
   */
  getDurationBucket(durationSeconds) {
    if (durationSeconds < 60) return 'under_1min';
    if (durationSeconds < 300) return '1_5min';
    if (durationSeconds < 1800) return '5_30min';
    if (durationSeconds < 3600) return '30min_1hour';
    if (durationSeconds < 7200) return '1_2hours';
    return 'over_2hours';
  }

  /**
   * Get latency bucket for histogram
   */
  getLatencyBucket(latencyMs) {
    if (latencyMs < 10) return 'under_10ms';
    if (latencyMs < 50) return '10_50ms';
    if (latencyMs < 100) return '50_100ms';
    if (latencyMs < 500) return '100_500ms';
    if (latencyMs < 1000) return '500ms_1s';
    if (latencyMs < 5000) return '1_5s';
    return 'over_5s';
  }

  /**
   * Get command type for labeling
   */
  getCommandType(command) {
    const cmd = command.toLowerCase().trim();

    if (cmd.startsWith('git')) return 'git';
    if (cmd.startsWith('npm') || cmd.startsWith('yarn')) return 'package_manager';
    if (cmd.startsWith('docker')) return 'docker';
    if (cmd.startsWith('kubectl')) return 'kubernetes';
    if (cmd.startsWith('cd')) return 'navigation';
    if (cmd.startsWith('ls') || cmd.startsWith('dir')) return 'listing';
    if (cmd.startsWith('cat') || cmd.startsWith('less') || cmd.startsWith('more'))
      return 'file_view';
    if (cmd.startsWith('vi') || cmd.startsWith('nano') || cmd.startsWith('code')) return 'editor';

    return 'other';
  }

  /**
   * Get metrics service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      bufferedMetrics: this.metricsBuffer.length,
      maxBufferSize: this.maxBufferSize,
      flushInterval: this.bufferFlushInterval,
      monitoringConfig: monitoringConfig.getProjectConfig(),
    };
  }
}

// Create singleton instance
const metricsService = new MetricsService();

export default metricsService;
export { MetricsService };
