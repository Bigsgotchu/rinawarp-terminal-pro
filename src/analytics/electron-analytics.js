import logger from '../utils/logger.js';
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Electron-Compatible Analytics Service
 * Replaces Vercel Analytics with desktop-friendly alternatives
 */

import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { app } from 'electron';

class ElectronAnalytics extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
    this.config = {
      enableAnalytics: true,
      enableTelemetry: true,
      enablePerformanceTracking: true,
      debug: false,
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      localStorageEnabled: true,
      remoteEndpoints: [],
    };

    this.sessionId = this.generateSessionId();
    this.userId = this.generateUserId();
    this.eventQueue = [];
    this.performanceMetrics = {};
    this.systemInfo = {};
    this.startTime = Date.now();

    this.analyticsDir = path.join(app.getPath('userData'), 'analytics');
    this.analyticsFile = path.join(this.analyticsDir, 'events.json');
    this.metricsFile = path.join(this.analyticsDir, 'metrics.json');

    this.initializeStorage();
  }

  /**
   * Initialize the analytics service
   */
  async initialize() {
    try {
      this.collectSystemInfo();
      this.startPerformanceMonitoring();
      this.startBatchProcessor();
      this.initialized = true;

      await this.trackEvent('analytics_initialized', {
        sessionId: this.sessionId,
        userId: this.userId,
        timestamp: Date.now(),
      });

      logger.debug('📊 Electron Analytics initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Electron Analytics:', error);
      return false;
    }
  }

  /**
   * Initialize local storage
   */
  initializeStorage() {
    try {
      if (!fs.existsSync(this.analyticsDir)) {
        fs.mkdirSync(this.analyticsDir, { recursive: true });
      }

      if (!fs.existsSync(this.analyticsFile)) {
        fs.writeFileSync(this.analyticsFile, JSON.stringify([]));
      }

      if (!fs.existsSync(this.metricsFile)) {
        fs.writeFileSync(this.metricsFile, JSON.stringify({}));
      }
    } catch (error) {
      console.error('Failed to initialize analytics storage:', error);
    }
  }

  /**
   * Track an analytics event
   */
  async trackEvent(eventName, properties = {}) {
    if (!this.config.enableAnalytics) return;

    const event = {
      eventName,
      properties: {
        ...properties,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: this.userId,
        platform: process.platform,
        arch: process.arch,
        appVersion: app.getVersion(),
        sessionDuration: Date.now() - this.startTime,
      },
    };

    // Anonymize sensitive data
    event.properties = this.anonymizeData(event.properties);

    this.eventQueue.push(event);
    this.emit('event', event);

    if (this.config.debug) {
    }

    // Flush if queue is full
    if (this.eventQueue.length >= this.config.batchSize) {
      await this.flushEvents();
    }
  }

  /**
   * Track terminal command execution
   */
  async trackCommand(command, success = true, metadata = {}) {
    const anonymizedCommand = this.anonymizeCommand(command);

    await this.trackEvent('command_executed', {
      command: anonymizedCommand,
      success,
      commandLength: command.length,
      ...metadata,
    });
  }

  /**
   * Track AI assistant usage
   */
  async trackAIUsage(action, context = {}) {
    await this.trackEvent('ai_usage', {
      action,
      ...context,
    });
  }

  /**
   * Track voice command usage
   */
  async trackVoiceCommand(command, success = true) {
    await this.trackEvent('voice_command', {
      command: this.anonymizeCommand(command),
      success,
    });
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(feature, metadata = {}) {
    await this.trackEvent('feature_usage', {
      feature,
      ...metadata,
    });
  }

  /**
   * Track theme changes
   */
  async trackThemeChange(theme, previousTheme = null) {
    await this.trackEvent('theme_change', {
      theme,
      previousTheme,
    });
  }

  /**
   * Track errors
   */
  async trackError(error, context = {}) {
    await this.trackEvent('error', {
      error: error.message || String(error),
      stack: error.stack || '',
      context,
    });
  }

  /**
   * Track performance metrics
   */
  async trackPerformance(metric, value, context = {}) {
    if (!this.config.enablePerformanceTracking) return;

    const performanceEvent = {
      metric,
      value,
      context,
      timestamp: Date.now(),
    };

    this.performanceMetrics[metric] = performanceEvent;

    await this.trackEvent('performance_metric', performanceEvent);
  }

  /**
   * Track system resource usage
   */
  async trackSystemMetrics() {
    if (!this.config.enableTelemetry) return;

    const metrics = {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime(),
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
      loadAverage: os.loadavg(),
    };

    await this.trackEvent('system_metrics', metrics);
  }

  /**
   * Collect system information
   */
  collectSystemInfo() {
    this.systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      hostname: os.hostname(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
    };
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    // Monitor memory usage every 5 minutes
    setInterval(
      () => {
        this.trackSystemMetrics();
      },
      5 * 60 * 1000
    );

    // Monitor app performance
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      this.trackPerformance('memory_heap_used', memUsage.heapUsed);
      this.trackPerformance('memory_heap_total', memUsage.heapTotal);
      this.trackPerformance('cpu_user', cpuUsage.user);
      this.trackPerformance('cpu_system', cpuUsage.system);
    }, 60 * 1000); // Every minute
  }

  /**
   * Start batch processor
   */
  startBatchProcessor() {
    setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushEvents();
      }
    }, this.config.flushInterval);
  }

  /**
   * Flush events to storage and remote endpoints
   */
  async flushEvents() {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Store locally
      if (this.config.localStorageEnabled) {
        await this.storeEventsLocally(events);
      }

      // Send to remote endpoints
      await this.sendToRemoteEndpoints(events);

      this.emit('events_flushed', events);
    } catch (error) {
      console.error('Failed to flush events:', error);
      // Re-queue events on failure
      this.eventQueue.unshift(...events);
    }
  }

  /**
   * Store events locally
   */
  async storeEventsLocally(events) {
    try {
      const existingEvents = JSON.parse(fs.readFileSync(this.analyticsFile, 'utf8'));
      const allEvents = [...existingEvents, ...events];

      // Keep only last 1000 events to prevent file from growing too large
      const recentEvents = allEvents.slice(-1000);

      fs.writeFileSync(this.analyticsFile, JSON.stringify(recentEvents, null, 2));
    } catch (error) {
      console.error('Failed to store events locally:', error);
    }
  }

  /**
   * Send events to remote endpoints
   */
  async sendToRemoteEndpoints(events) {
    if (this.config.remoteEndpoints.length === 0) return;

    const payload = {
      events,
      sessionId: this.sessionId,
      userId: this.userId,
      systemInfo: this.systemInfo,
      timestamp: Date.now(),
    };

    for (const endpoint of this.config.remoteEndpoints) {
      try {
        await this.sendToEndpoint(endpoint, payload);
      } catch (error) {
        console.error(`Failed to send to endpoint ${endpoint.url}:`, error);
      }
    }
  }

  /**
   * Send data to a specific endpoint
   */
  async sendToEndpoint(endpoint, payload) {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: endpoint.apiKey ? `Bearer ${endpoint.apiKey}` : undefined,
        'User-Agent': `RinaWarp-Terminal/${app.getVersion()}`,
        ...endpoint.headers,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(new Error(new Error(`HTTP ${response.status}: ${response.statusText}`)));
    }

    return response.json();
  }

  /**
   * Anonymize sensitive data
   */
  anonymizeData(data) {
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'email', 'ip'];
    const anonymized = { ...data };

    Object.keys(anonymized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        anonymized[key] = '[REDACTED]';
      }
    });

    return anonymized;
  }

  /**
   * Anonymize command for privacy
   */
  anonymizeCommand(command) {
    if (!command || typeof command !== 'string') return '[INVALID_COMMAND]';

    return command
      .replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, '[EMAIL]')
      .replace(/\b(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?\b/g, '[URL]')
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]')
      .replace(
        /\b[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}\b/g,
        '[UUID]'
      )
      .replace(/\b[a-zA-Z0-9]{20,}\b/g, '[TOKEN]')
      .replace(/(?:password|pwd|pass|token|key|secret)[\s=:]+\S+/gi, '[CREDENTIALS]')
      .substring(0, 100);
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate user ID
   */
  generateUserId() {
    const userDataPath = app.getPath('userData');
    const userIdFile = path.join(userDataPath, 'user_id');

    try {
      if (fs.existsSync(userIdFile)) {
        return fs.readFileSync(userIdFile, 'utf8').trim();
      }
    } catch (error) {
      console.warn('Failed to read user ID from file:', error);
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      fs.writeFileSync(userIdFile, userId);
    } catch (error) {
      console.warn('Failed to save user ID to file:', error);
    }

    return userId;
  }

  /**
   * Get analytics summary
   */
  getAnalyticsSummary() {
    try {
      const events = JSON.parse(fs.readFileSync(this.analyticsFile, 'utf8'));

      return {
        totalEvents: events.length,
        sessionId: this.sessionId,
        userId: this.userId,
        sessionDuration: Date.now() - this.startTime,
        systemInfo: this.systemInfo,
        performanceMetrics: this.performanceMetrics,
        eventTypes: events.reduce((acc, event) => {
          acc[event.eventName] = (acc[event.eventName] || 0) + 1;
          return acc;
        }, {}),
      };
    } catch (error) {
      console.error('Failed to get analytics summary:', error);
      return null;
    }
  }

  /**
   * Configure analytics settings
   */
  configure(newConfig) {
    this.config = { ...this.config, ...newConfig };

    if (this.config.debug) {
    }
  }

  /**
   * Add remote endpoint
   */
  addRemoteEndpoint(endpoint) {
    this.config.remoteEndpoints.push(endpoint);
  }

  /**
   * Enable analytics
   */
  enable() {
    this.config.enableAnalytics = true;
    logger.debug('✅ Analytics enabled');
  }

  /**
   * Disable analytics
   */
  disable() {
    this.config.enableAnalytics = false;
  }

  /**
   * Enable debug mode
   */
  enableDebug() {
    this.config.debug = true;
  }

  /**
   * Disable debug mode
   */
  disableDebug() {
    this.config.debug = false;
  }

  /**
   * Clear local analytics data
   */
  clearLocalData() {
    try {
      fs.writeFileSync(this.analyticsFile, JSON.stringify([]));
      fs.writeFileSync(this.metricsFile, JSON.stringify({}));
    } catch (error) {
      console.error('Failed to clear analytics data:', error);
    }
  }

  /**
   * Export analytics data
   */
  exportData() {
    try {
      const events = JSON.parse(fs.readFileSync(this.analyticsFile, 'utf8'));
      const metrics = JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));

      return {
        events,
        metrics,
        summary: this.getAnalyticsSummary(),
        exportedAt: Date.now(),
      };
    } catch (error) {
      console.error('Failed to export analytics data:', error);
      return null;
    }
  }
}

// Create and export singleton instance
const electronAnalytics = new ElectronAnalytics();

export default electronAnalytics;
export { ElectronAnalytics };
