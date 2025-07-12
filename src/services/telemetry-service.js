/**
 * RinaWarp Terminal - Production Telemetry Service
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * Centralized telemetry service supporting multiple providers:
 * - Azure Application Insights
 * - Sentry for error tracking
 * - Custom REST endpoints
 * - Google Analytics
 */

import axios from 'axios';
import os from 'os';

class TelemetryService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.enableTelemetry = process.env.ENABLE_TELEMETRY === 'true';
    this.enableAnalytics = process.env.ENABLE_ANALYTICS === 'true';

    // Initialize telemetry providers
    this.providers = {
      sentry: this.initializeSentry(),
      appInsights: this.initializeAppInsights(),
      custom: this.initializeCustomEndpoints(),
      googleAnalytics: this.initializeGoogleAnalytics(),
    };

    this.eventQueue = [];
    this.batchSize = parseInt(process.env.TELEMETRY_BATCH_SIZE) || 10;
    this.flushInterval = parseInt(process.env.TELEMETRY_FLUSH_INTERVAL) || 30000; // 30 seconds

    // Privacy and compliance settings
    this.privacyMode = process.env.TELEMETRY_PRIVACY_MODE === 'strict';
    this.allowedEventTypes = this.loadAllowedEventTypes();

    this.startBatchProcessor();
    this.collectSystemInfo();
  }

  /**
   * Initialize Sentry for error tracking
   */
  initializeSentry() {
    if (!process.env.SENTRY_DSN) return null;

    try {
      // Note: In real implementation, you would use @sentry/node
      // For now, we'll simulate the configuration
      const sentryConfig = {
        dsn: process.env.SENTRY_DSN,
        environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
        release: process.env.APP_VERSION || '1.0.6',
        sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE) || 1.0,
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
        beforeSend: event => this.applySentryPrivacyFilters(event),
      };

      console.log('✅ Sentry telemetry provider initialized');
      return sentryConfig;
    } catch (error) {
      console.error('❌ Failed to initialize Sentry:', error.message);
      return null;
    }
  }

  /**
   * Initialize Azure Application Insights
   */
  initializeAppInsights() {
    if (
      !process.env.APPINSIGHTS_INSTRUMENTATIONKEY &&
      !process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
    ) {
      return null;
    }

    try {
      const appInsightsConfig = {
        instrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY,
        connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
        endpoint:
          process.env.APPINSIGHTS_ENDPOINT || 'https://dc.services.visualstudio.com/v2/track',
        samplingPercentage: parseFloat(process.env.APPINSIGHTS_SAMPLING_PERCENTAGE) || 100,
        cloudRole: 'rinawarp-terminal',
        cloudRoleInstance: os.hostname(),
      };

      console.log('✅ Azure Application Insights telemetry provider initialized');
      return appInsightsConfig;
    } catch (error) {
      console.error('❌ Failed to initialize Application Insights:', error.message);
      return null;
    }
  }

  /**
   * Initialize custom REST endpoints
   */
  initializeCustomEndpoints() {
    const endpoints = [];

    // Primary custom endpoint
    if (process.env.TELEMETRY_ENDPOINT) {
      endpoints.push({
        name: 'primary',
        url: process.env.TELEMETRY_ENDPOINT,
        apiKey: process.env.TELEMETRY_API_KEY,
        headers: this.buildCustomHeaders('primary'),
      });
    }

    // Secondary backup endpoint
    if (process.env.TELEMETRY_ENDPOINT_BACKUP) {
      endpoints.push({
        name: 'backup',
        url: process.env.TELEMETRY_ENDPOINT_BACKUP,
        apiKey: process.env.TELEMETRY_API_KEY_BACKUP,
        headers: this.buildCustomHeaders('backup'),
      });
    }

    // Analytics endpoint (separate from error tracking)
    if (process.env.ANALYTICS_ENDPOINT) {
      endpoints.push({
        name: 'analytics',
        url: process.env.ANALYTICS_ENDPOINT,
        apiKey: process.env.ANALYTICS_API_KEY,
        headers: this.buildCustomHeaders('analytics'),
        eventTypes: ['user_action', 'performance', 'feature_usage'],
      });
    }

    if (endpoints.length > 0) {
      console.log(
        `✅ Custom telemetry endpoints initialized: ${endpoints.map(e => e.name).join(', ')}`
      );
    }

    return endpoints;
  }

  /**
   * Initialize Google Analytics
   */
  initializeGoogleAnalytics() {
    if (!process.env.GA_MEASUREMENT_ID) return null;

    try {
      const gaConfig = {
        measurementId: process.env.GA_MEASUREMENT_ID,
        apiSecret: process.env.GA_API_SECRET,
        endpoint: `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA_MEASUREMENT_ID}&api_secret=${process.env.GA_API_SECRET}`,
        clientId: this.generateClientId(),
      };

      console.log('✅ Google Analytics telemetry provider initialized');
      return gaConfig;
    } catch (error) {
      console.error('❌ Failed to initialize Google Analytics:', error.message);
      return null;
    }
  }

  /**
   * Track application events
   */
  async trackEvent(eventType, eventName, properties = {}, metrics = {}) {
    if (!this.enableTelemetry || !this.isEventAllowed(eventType)) {
      return;
    }

    const event = {
      timestamp: new Date().toISOString(),
      eventType,
      eventName,
      properties: this.sanitizeProperties(properties),
      metrics: this.sanitizeMetrics(metrics),
      sessionId: this.getSessionId(),
      userId: this.getUserId(),
      deviceInfo: this.getDeviceInfo(),
      appInfo: this.getAppInfo(),
    };

    // Add to queue for batch processing
    this.eventQueue.push(event);

    // Immediate processing for critical events
    if (eventType === 'error' || eventType === 'security') {
      await this.flushEvents([event]);
    }

    // Auto-flush if queue is full
    if (this.eventQueue.length >= this.batchSize) {
      await this.flushQueue();
    }
  }

  /**
   * Track errors specifically
   */
  async trackError(error, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context,
    };

    await this.trackEvent('error', 'application_error', errorData);
  }

  /**
   * Track performance metrics
   */
  async trackPerformance(operation, duration, context = {}) {
    await this.trackEvent('performance', operation, context, { duration });
  }

  /**
   * Track user actions
   */
  async trackUserAction(action, context = {}) {
    if (!this.enableAnalytics) return;

    await this.trackEvent('user_action', action, context);
  }

  /**
   * Track feature usage
   */
  async trackFeatureUsage(feature, context = {}) {
    if (!this.enableAnalytics) return;

    await this.trackEvent('feature_usage', feature, context);
  }

  /**
   * Track system metrics
   */
  async trackSystemMetrics() {
    if (!this.enableTelemetry) return;

    const metrics = {
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      loadAverage: os.loadavg(),
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
    };

    await this.trackEvent('system', 'metrics', {}, metrics);
  }

  /**
   * Flush events to all configured providers
   */
  async flushEvents(events = null) {
    const eventsToFlush = events || [...this.eventQueue];
    if (eventsToFlush.length === 0) return;

    const results = await Promise.allSettled([
      this.sendToSentry(eventsToFlush),
      this.sendToAppInsights(eventsToFlush),
      this.sendToCustomEndpoints(eventsToFlush),
      this.sendToGoogleAnalytics(eventsToFlush),
    ]);

    // Log results for monitoring
    results.forEach((result, index) => {
      const provider = ['Sentry', 'App Insights', 'Custom', 'Google Analytics'][index];
      if (result.status === 'rejected') {
        console.warn(`⚠️ Telemetry failed for ${provider}:`, result.reason?.message);
      }
    });

    // Clear queue if not processing specific events
    if (!events) {
      this.eventQueue = [];
    }
  }

  /**
   * Send events to Sentry
   */
  async sendToSentry(events) {
    if (!this.providers.sentry) return;

    const errors = events.filter(e => e.eventType === 'error');

    for (const event of errors) {
      // In real implementation, use Sentry SDK
      // Sentry.captureException(new Error(event.properties.message), {
      //     tags: event.properties,
      //     extra: event.metrics,
      //     user: { id: event.userId }
      // });

      console.log(`📊 [Sentry] Error tracked: ${event.eventName}`);
    }
  }

  /**
   * Send events to Azure Application Insights
   */
  async sendToAppInsights(events) {
    if (!this.providers.appInsights) return;

    try {
      const telemetryData = events.map(event => ({
        name:
          event.eventType === 'error'
            ? 'Microsoft.ApplicationInsights.Exception'
            : 'Microsoft.ApplicationInsights.Event',
        time: event.timestamp,
        data: {
          baseType: event.eventType === 'error' ? 'ExceptionData' : 'EventData',
          baseData: {
            name: event.eventName,
            properties: event.properties,
            measurements: event.metrics,
          },
        },
        tags: {
          'ai.cloud.role': this.providers.appInsights.cloudRole,
          'ai.cloud.roleInstance': this.providers.appInsights.cloudRoleInstance,
          'ai.session.id': event.sessionId,
          'ai.user.id': event.userId,
        },
      }));

      await axios.post(
        this.providers.appInsights.endpoint,
        {
          instrumentationKey: this.providers.appInsights.instrumentationKey,
          items: telemetryData,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );

      console.log(`📊 [App Insights] ${events.length} events sent`);
    } catch (error) {
      throw new Error(`App Insights error: ${error.message}`);
    }
  }

  /**
   * Send events to custom endpoints
   */
  async sendToCustomEndpoints(events) {
    if (!this.providers.custom || this.providers.custom.length === 0) return;

    for (const endpoint of this.providers.custom) {
      try {
        // Filter events for this endpoint if specified
        const relevantEvents = endpoint.eventTypes
          ? events.filter(e => endpoint.eventTypes.includes(e.eventType))
          : events;

        if (relevantEvents.length === 0) continue;

        await axios.post(
          endpoint.url,
          {
            source: 'rinawarp-terminal',
            version: process.env.APP_VERSION || '1.0.6',
            environment: process.env.NODE_ENV,
            events: relevantEvents,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: endpoint.apiKey ? `Bearer ${endpoint.apiKey}` : undefined,
              ...endpoint.headers,
            },
            timeout: 5000,
          }
        );

        console.log(`📊 [${endpoint.name}] ${relevantEvents.length} events sent`);
      } catch (error) {
        console.warn(`⚠️ Custom endpoint ${endpoint.name} failed:`, error.message);
      }
    }
  }

  /**
   * Send events to Google Analytics
   */
  async sendToGoogleAnalytics(events) {
    if (!this.providers.googleAnalytics || !this.enableAnalytics) return;

    try {
      const gaEvents = events
        .filter(e => ['user_action', 'feature_usage'].includes(e.eventType))
        .map(event => ({
          name: event.eventName.replace(/[^a-zA-Z0-9_]/g, '_'),
          params: {
            ...event.properties,
            ...event.metrics,
            session_id: event.sessionId,
            engagement_time_msec: event.metrics.duration || 1,
          },
        }));

      if (gaEvents.length === 0) return;

      await axios.post(
        this.providers.googleAnalytics.endpoint,
        {
          client_id: this.providers.googleAnalytics.clientId,
          events: gaEvents,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      );

      console.log(`📊 [Google Analytics] ${gaEvents.length} events sent`);
    } catch (error) {
      throw new Error(`Google Analytics error: ${error.message}`);
    }
  }

  /**
   * Privacy-compliant data sanitization
   */
  sanitizeProperties(properties) {
    if (!this.privacyMode) return properties;

    const sanitized = { ...properties };
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'email', 'ip'];

    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  sanitizeMetrics(metrics) {
    // Metrics are generally safe, but ensure no negative values for durations
    const sanitized = { ...metrics };
    Object.keys(sanitized).forEach(key => {
      if (key.includes('duration') || key.includes('time')) {
        sanitized[key] = Math.max(0, sanitized[key] || 0);
      }
    });
    return sanitized;
  }

  /**
   * Helper methods
   */
  buildCustomHeaders(endpointName) {
    return {
      'User-Agent': `RinaWarp-Terminal/${process.env.APP_VERSION || '1.0.6'}`,
      'X-Source': 'rinawarp-terminal',
      'X-Environment': process.env.NODE_ENV,
      'X-Endpoint': endpointName,
    };
  }

  isEventAllowed(eventType) {
    return this.allowedEventTypes.includes(eventType);
  }

  loadAllowedEventTypes() {
    const defaultTypes = ['error', 'system', 'performance'];
    const analyticsTypes = ['user_action', 'feature_usage'];

    const allowed = [...defaultTypes];
    if (this.enableAnalytics) {
      allowed.push(...analyticsTypes);
    }

    return allowed;
  }

  generateClientId() {
    return (
      process.env.TELEMETRY_CLIENT_ID ||
      `${os.hostname()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );
  }

  getSessionId() {
    // In production, this would be managed by the main process
    return global.sessionId || 'anonymous-session';
  }

  getUserId() {
    // Respect privacy - only return if user consented
    return this.privacyMode ? 'anonymous' : global.userId || 'anonymous';
  }

  getDeviceInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      nodeVersion: process.version,
    };
  }

  getAppInfo() {
    return {
      version: process.env.APP_VERSION || '1.0.6',
      environment: process.env.NODE_ENV,
      startTime: process.env.APP_START_TIME || Date.now(),
    };
  }

  collectSystemInfo() {
    // Periodically collect system metrics
    setInterval(
      async () => {
        await this.trackSystemMetrics();
      },
      parseInt(process.env.SYSTEM_METRICS_INTERVAL) || 300000
    ); // 5 minutes
  }

  startBatchProcessor() {
    // Flush queue periodically
    setInterval(async () => {
      if (this.eventQueue.length > 0) {
        await this.flushQueue();
      }
    }, this.flushInterval);
  }

  async flushQueue() {
    await this.flushEvents();
  }

  applySentryPrivacyFilters(event) {
    if (this.privacyMode) {
      // Remove sensitive data from Sentry events
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
    }
    return event;
  }
}

// Create singleton instance
const telemetryService = new TelemetryService();

export default telemetryService;
export { TelemetryService };
