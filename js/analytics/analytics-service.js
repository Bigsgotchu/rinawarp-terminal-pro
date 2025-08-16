/**
 * RinaWarp Terminal Analytics Service
 * Professional analytics and monitoring for production insights
 */

class AnalyticsService {
  constructor() {
    this.apiBaseUrl = 'https://rinawarptech.com/api';
    this.sessionId = this.generateSessionId();
    this.userId = this.getUserId();
    this.startTime = Date.now();
    this.events = [];
    this.performance = {
      startupTime: null,
      memoryUsage: [],
      commandCounts: {},
      errorCounts: {},
      featureUsage: {},
    };

    // Initialize analytics
    this.init();
  }

  /**
   * Initialize analytics service
   */
  init() {
    this.recordEvent('app_startup', {
      platform: this.getPlatform(),
      version: this.getAppVersion(),
      timestamp: new Date().toISOString(),
    });

    // Track performance metrics
    this.trackPerformance();

    // Send analytics periodically
    this.startPeriodicReporting();

    console.log('🧜‍♀️ RinaWarp Analytics initialized');
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get or create user ID (anonymized)
   */
  getUserId() {
    let userId = localStorage.getItem('rinawarp_user_id');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('rinawarp_user_id', userId);
    }
    return userId;
  }

  /**
   * Get platform information
   */
  getPlatform() {
    const platform = window.navigator.platform;
    const userAgent = window.navigator.userAgent;

    if (userAgent.includes('Electron')) {
      return 'electron-desktop';
    }

    return {
      os: platform,
      browser: this.getBrowserInfo(),
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        pixelRatio: window.devicePixelRatio,
      },
    };
  }

  /**
   * Get browser information
   */
  getBrowserInfo() {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';

    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    return browser;
  }

  /**
   * Get app version from package.json or manifest
   */
  getAppVersion() {
    // Try to get version from various sources
    if (window.electronAPI && window.electronAPI.getVersion) {
      return window.electronAPI.getVersion();
    }

    // Fallback version
    return '1.0.0';
  }

  /**
   * Record an analytics event
   */
  recordEvent(eventName, eventData = {}) {
    const event = {
      id: this.generateEventId(),
      name: eventName,
      data: eventData,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.events.push(event);

    // Log for development
    console.log('📊 Analytics Event:', eventName, eventData);

    // Send critical events immediately
    if (this.isCriticalEvent(eventName)) {
      this.sendEvents([event]);
    }
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  /**
   * Check if event is critical and should be sent immediately
   */
  isCriticalEvent(eventName) {
    const criticalEvents = [
      'app_crash',
      'license_validation_failed',
      'payment_error',
      'security_warning',
    ];
    return criticalEvents.includes(eventName);
  }

  /**
   * Track command usage
   */
  trackCommand(command, success = true, executionTime = 0) {
    // Update command counts
    if (!this.performance.commandCounts[command]) {
      this.performance.commandCounts[command] = { count: 0, avgTime: 0, errors: 0 };
    }

    this.performance.commandCounts[command].count++;
    this.performance.commandCounts[command].avgTime =
      (this.performance.commandCounts[command].avgTime + executionTime) / 2;

    if (!success) {
      this.performance.commandCounts[command].errors++;
    }

    this.recordEvent('command_executed', {
      command: command,
      success: success,
      executionTime: executionTime,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track feature usage
   */
  trackFeature(featureName, context = {}) {
    if (!this.performance.featureUsage[featureName]) {
      this.performance.featureUsage[featureName] = 0;
    }
    this.performance.featureUsage[featureName]++;

    this.recordEvent('feature_used', {
      feature: featureName,
      context: context,
      usageCount: this.performance.featureUsage[featureName],
    });
  }

  /**
   * Track errors
   */
  trackError(error, context = {}) {
    const errorKey = error.name || 'UnknownError';

    if (!this.performance.errorCounts[errorKey]) {
      this.performance.errorCounts[errorKey] = 0;
    }
    this.performance.errorCounts[errorKey]++;

    this.recordEvent('error_occurred', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      context: context,
      count: this.performance.errorCounts[errorKey],
    });

    console.error('🚨 RinaWarp Error Tracked:', error);
  }

  /**
   * Track performance metrics
   */
  trackPerformance() {
    // Track startup time
    if (window.performance && window.performance.timing) {
      const loadTime =
        window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
      this.performance.startupTime = loadTime;

      this.recordEvent('performance_startup', {
        loadTime: loadTime,
        domContentLoaded:
          window.performance.timing.domContentLoadedEventEnd -
          window.performance.timing.navigationStart,
      });
    }

    // Track memory usage periodically
    setInterval(() => {
      if (window.performance && window.performance.memory) {
        const memoryInfo = {
          used: window.performance.memory.usedJSHeapSize,
          total: window.performance.memory.totalJSHeapSize,
          limit: window.performance.memory.jsHeapSizeLimit,
          timestamp: Date.now(),
        };

        this.performance.memoryUsage.push(memoryInfo);

        // Keep only last 60 measurements (5 minutes at 5-second intervals)
        if (this.performance.memoryUsage.length > 60) {
          this.performance.memoryUsage.shift();
        }
      }
    }, 5000);
  }

  /**
   * Track license events
   */
  trackLicense(eventType, licenseData = {}) {
    this.recordEvent('license_event', {
      eventType: eventType,
      licenseData: licenseData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track payment events
   */
  trackPayment(eventType, paymentData = {}) {
    // Remove sensitive data
    const sanitizedData = {
      planType: paymentData.planType,
      amount: paymentData.amount,
      currency: paymentData.currency,
      success: paymentData.success,
    };

    this.recordEvent('payment_event', {
      eventType: eventType,
      paymentData: sanitizedData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track AI usage
   */
  trackAI(provider, requestType, success = true, responseTime = 0) {
    this.recordEvent('ai_request', {
      provider: provider,
      requestType: requestType,
      success: success,
      responseTime: responseTime,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const currentMemory =
      this.performance.memoryUsage.length > 0
        ? this.performance.memoryUsage[this.performance.memoryUsage.length - 1]
        : null;

    return {
      sessionDuration: Date.now() - this.startTime,
      startupTime: this.performance.startupTime,
      currentMemoryMB: currentMemory ? Math.round(currentMemory.used / 1024 / 1024) : null,
      totalCommands: Object.values(this.performance.commandCounts).reduce(
        (sum, cmd) => sum + cmd.count,
        0
      ),
      totalErrors: Object.values(this.performance.errorCounts).reduce(
        (sum, count) => sum + count,
        0
      ),
      featuresUsed: Object.keys(this.performance.featureUsage).length,
      eventsRecorded: this.events.length,
    };
  }

  /**
   * Start periodic reporting
   */
  startPeriodicReporting() {
    // Send events every 5 minutes
    setInterval(
      () => {
        this.sendPendingEvents();
      },
      5 * 60 * 1000
    );

    // Send performance summary every 15 minutes
    setInterval(
      () => {
        this.sendPerformanceSummary();
      },
      15 * 60 * 1000
    );
  }

  /**
   * Send pending events to server
   */
  async sendPendingEvents() {
    if (this.events.length === 0) return;

    try {
      await this.sendEvents(this.events);
      this.events = []; // Clear sent events
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      // Keep events for retry, but limit to prevent memory issues
      if (this.events.length > 1000) {
        this.events = this.events.slice(-500); // Keep last 500 events
      }
    }
  }

  /**
   * Send performance summary
   */
  async sendPerformanceSummary() {
    const summary = this.getPerformanceSummary();

    this.recordEvent('performance_summary', {
      summary: summary,
      memoryHistory: this.performance.memoryUsage.slice(-10), // Last 10 measurements
      topCommands: this.getTopCommands(5),
      topErrors: this.getTopErrors(5),
    });
  }

  /**
   * Get top commands by usage
   */
  getTopCommands(limit = 5) {
    return Object.entries(this.performance.commandCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([command, data]) => ({ command, ...data }));
  }

  /**
   * Get top errors by frequency
   */
  getTopErrors(limit = 5) {
    return Object.entries(this.performance.errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([error, count]) => ({ error, count }));
  }

  /**
   * Send events to analytics server
   */
  async sendEvents(events) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: events,
          sessionId: this.sessionId,
          userId: this.userId,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }

      console.log(`📈 Sent ${events.length} analytics events`);
    } catch (error) {
      console.error('Failed to send analytics:', error);
      throw error;
    }
  }

  /**
   * Send session end event
   */
  onSessionEnd() {
    const sessionSummary = {
      duration: Date.now() - this.startTime,
      events: this.events.length,
      performance: this.getPerformanceSummary(),
    };

    this.recordEvent('session_end', sessionSummary);

    // Send immediately
    this.sendPendingEvents();
  }
}

// Global analytics instance
let analyticsService = null;

/**
 * Initialize analytics service
 */
function initializeAnalytics() {
  if (!analyticsService) {
    analyticsService = new AnalyticsService();

    // Track page unload
    window.addEventListener('beforeunload', () => {
      if (analyticsService) {
        analyticsService.onSessionEnd();
      }
    });
  }
  return analyticsService;
}

/**
 * Get analytics instance
 */
function getAnalytics() {
  return analyticsService || initializeAnalytics();
}

// Auto-initialize analytics
if (typeof window !== 'undefined') {
  initializeAnalytics();
}

export { AnalyticsService, initializeAnalytics, getAnalytics };
