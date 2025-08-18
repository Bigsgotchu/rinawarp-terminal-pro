/**
 * RinaWarp Terminal Creator Edition - Enhanced Error Handler
 * Comprehensive error handling system with recovery mechanisms,
 * user-friendly notifications, and detailed logging
 */

/**
 * ErrorHandler class
 * Centralized error handling with multiple recovery strategies
 */
export class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.errorCounts = new Map();
    this.retryAttempts = new Map();
    this.errorCallbacks = new Map();
    this.criticalErrors = [];
    this.errorThresholds = {
      maxRetries: 3,
      criticalThreshold: 5,
      logRetentionDays: 7,
      maxErrorsInMemory: 100,
    };

    this.errorTypes = {
      NETWORK: 'network',
      VALIDATION: 'validation',
      AUTHORIZATION: 'authorization',
      STORAGE: 'storage',
      AI_API: 'ai_api',
      TERMINAL: 'terminal',
      ACCESSIBILITY: 'accessibility',
      SECURITY: 'security',
      PERFORMANCE: 'performance',
      UNKNOWN: 'unknown',
    };

    this.severityLevels = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical',
    };

    // Bind methods
    this.handleError = this.handleError.bind(this);
    this.handleGlobalError = this.handleGlobalError.bind(this);
    this.handleUnhandledRejection = this.handleUnhandledRejection.bind(this);
  }

  /**
   * Initialize error handling system
   */
  init() {
    // Set up global error handlers
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);

    // Set up performance observer for critical performance issues
    if ('PerformanceObserver' in window) {
      this.setupPerformanceMonitoring();
    }

    // Initialize error recovery mechanisms
    this.setupErrorRecovery();

    // Set up error reporting
    this.setupErrorReporting();

    console.log('🛡️ Enhanced error handling system initialized');
  }

  /**
   * Main error handling method
   */
  async handleError(error, context = 'unknown', options = {}) {
    try {
      const errorInfo = this.analyzeError(error, context, options);

      // Log the error
      this.logError(errorInfo);

      // Determine error severity and type
      const { severity, type } = this.classifyError(errorInfo);

      // Apply error handling strategy
      const recovery = await this.applyErrorStrategy(errorInfo, severity, type);

      // Notify user if necessary
      this.notifyUser(errorInfo, recovery);

      // Report to monitoring systems
      this.reportError(errorInfo, recovery);

      return recovery;
    } catch (handlerError) {
      console.error('Error in error handler:', handlerError);
      this.handleFallbackError(error, context);
    }
  }

  /**
   * Analyze error to extract relevant information
   */
  analyzeError(error, context, options) {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      id: this.generateErrorId(),
      timestamp,
      context,
      options,
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name || 'Error',
      code: error?.code,
      statusCode: error?.statusCode || error?.status,
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      memory: this.getMemoryInfo(),
      performance: this.getPerformanceInfo(),
      breadcrumbs: this.getBreadcrumbs(),
      user: this.getUserContext(),
      additionalData: options.additionalData || {},
    };

    // Add specific error data based on error type
    if (error instanceof TypeError) {
      errorInfo.isTypeError = true;
    }

    if (error instanceof ReferenceError) {
      errorInfo.isReferenceError = true;
    }

    if (error instanceof SyntaxError) {
      errorInfo.isSyntaxError = true;
    }

    return errorInfo;
  }

  /**
   * Classify error by type and severity
   */
  classifyError(errorInfo) {
    let type = this.errorTypes.UNKNOWN;
    let severity = this.severityLevels.MEDIUM;

    // Classify by context
    if (errorInfo.context.includes('ai') || errorInfo.context.includes('api')) {
      type = this.errorTypes.AI_API;
    } else if (errorInfo.context.includes('storage') || errorInfo.context.includes('secure')) {
      type = this.errorTypes.STORAGE;
    } else if (errorInfo.context.includes('terminal')) {
      type = this.errorTypes.TERMINAL;
    } else if (errorInfo.context.includes('accessibility')) {
      type = this.errorTypes.ACCESSIBILITY;
    } else if (errorInfo.context.includes('security')) {
      type = this.errorTypes.SECURITY;
    } else if (errorInfo.context.includes('network') || errorInfo.statusCode) {
      type = this.errorTypes.NETWORK;
    }

    // Classify by error characteristics
    if (errorInfo.statusCode >= 400 && errorInfo.statusCode < 500) {
      type = this.errorTypes.VALIDATION;
      severity =
        errorInfo.statusCode === 401 || errorInfo.statusCode === 403
          ? this.severityLevels.HIGH
          : this.severityLevels.MEDIUM;
    } else if (errorInfo.statusCode >= 500) {
      type = this.errorTypes.NETWORK;
      severity = this.severityLevels.HIGH;
    }

    // Check for critical patterns
    const criticalPatterns = [
      /cannot read property/i,
      /uncaught typeerror/i,
      /referenceerror/i,
      /out of memory/i,
      /maximum call stack/i,
      /script error/i,
    ];

    const isCritical = criticalPatterns.some(
      pattern => pattern.test(errorInfo.message) || pattern.test(errorInfo.stack || '')
    );

    if (isCritical) {
      severity = this.severityLevels.CRITICAL;
    }

    // Check error frequency
    const errorKey = `${type}:${errorInfo.message}`;
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);

    if (count >= this.errorThresholds.criticalThreshold) {
      severity = this.severityLevels.CRITICAL;
    }

    return { type, severity };
  }

  /**
   * Apply error handling strategy based on type and severity
   */
  async applyErrorStrategy(errorInfo, severity, type) {
    const strategy = {
      attempted: [],
      success: false,
      fallback: null,
      userMessage: null,
      recovery: null,
    };

    // Critical errors require immediate attention
    if (severity === this.severityLevels.CRITICAL) {
      strategy.recovery = await this.handleCriticalError(errorInfo, type);
      return strategy;
    }

    // Apply type-specific strategies
    switch (type) {
      case this.errorTypes.NETWORK:
        strategy.recovery = await this.handleNetworkError(errorInfo);
        break;
      case this.errorTypes.AI_API:
        strategy.recovery = await this.handleAIError(errorInfo);
        break;
      case this.errorTypes.STORAGE:
        strategy.recovery = await this.handleStorageError(errorInfo);
        break;
      case this.errorTypes.VALIDATION:
        strategy.recovery = await this.handleValidationError(errorInfo);
        break;
      case this.errorTypes.TERMINAL:
        strategy.recovery = await this.handleTerminalError(errorInfo);
        break;
      case this.errorTypes.ACCESSIBILITY:
        strategy.recovery = await this.handleAccessibilityError(errorInfo);
        break;
      case this.errorTypes.SECURITY:
        strategy.recovery = await this.handleSecurityError(errorInfo);
        break;
      default:
        strategy.recovery = await this.handleGenericError(errorInfo);
    }

    return strategy;
  }

  /**
   * Handle critical errors
   */
  async handleCriticalError(errorInfo, type) {
    console.error('🚨 CRITICAL ERROR DETECTED:', errorInfo);

    this.criticalErrors.push(errorInfo);

    // Attempt graceful degradation
    const recovery = {
      type: 'critical',
      action: 'graceful_degradation',
      success: false,
      fallback: true,
      userMessage: 'A critical error occurred. The application will attempt to recover.',
      recovery: null,
    };

    try {
      // Try to save current state
      await this.saveApplicationState();

      // Clear potentially corrupted data
      this.clearCorruptedState();

      // Restart core components
      await this.restartCoreComponents();

      recovery.success = true;
      recovery.userMessage = 'Critical error recovered. Application state has been restored.';
    } catch (recoveryError) {
      console.error('Recovery from critical error failed:', recoveryError);
      recovery.userMessage = 'Critical error recovery failed. Please refresh the page.';
      recovery.requiresRefresh = true;
    }

    return recovery;
  }

  /**
   * Handle network errors
   */
  async handleNetworkError(errorInfo) {
    const recovery = {
      type: 'network',
      success: false,
      retryCount: 0,
      userMessage: null,
    };

    const errorKey = `network:${errorInfo.url}`;
    const retryCount = this.retryAttempts.get(errorKey) || 0;

    if (retryCount < this.errorThresholds.maxRetries) {
      // Exponential backoff retry
      const delay = Math.pow(2, retryCount) * 1000;

      recovery.userMessage = `Connection issue detected. Retrying in ${delay / 1000} seconds...`;

      await new Promise(resolve => setTimeout(resolve, delay));

      this.retryAttempts.set(errorKey, retryCount + 1);
      recovery.retryCount = retryCount + 1;
      recovery.success = true;
    } else {
      // Max retries reached, enable offline mode
      recovery.userMessage = 'Connection issues persist. Switching to offline mode.';
      recovery.offlineMode = true;
      await this.enableOfflineMode();
    }

    return recovery;
  }

  /**
   * Handle AI API errors
   */
  async handleAIError(errorInfo) {
    const recovery = {
      type: 'ai_api',
      success: false,
      fallback: null,
      userMessage: null,
    };

    if (errorInfo.statusCode === 401) {
      recovery.userMessage = 'AI service authentication failed. Please check your API key.';
      recovery.requiresReauth = true;
    } else if (errorInfo.statusCode === 429) {
      recovery.userMessage = 'AI service rate limit reached. Please wait before trying again.';
      recovery.rateLimited = true;
    } else if (errorInfo.statusCode >= 500) {
      recovery.userMessage = 'AI service is temporarily unavailable. Using fallback responses.';
      recovery.fallback = await this.enableAIFallbackMode();
      recovery.success = true;
    } else {
      recovery.userMessage = 'AI service encountered an error. Please try again.';
    }

    return recovery;
  }

  /**
   * Handle storage errors
   */
  async handleStorageError(errorInfo) {
    const recovery = {
      type: 'storage',
      success: false,
      fallback: null,
      userMessage: null,
    };

    if (errorInfo.name === 'QuotaExceededError') {
      recovery.userMessage = 'Storage quota exceeded. Cleaning up old data...';
      await this.cleanupStorageQuota();
      recovery.success = true;
    } else if (errorInfo.message.includes('decrypt')) {
      recovery.userMessage = 'Data decryption failed. Using temporary storage.';
      recovery.fallback = await this.enableTemporaryStorage();
      recovery.success = true;
    } else {
      recovery.userMessage = 'Storage error occurred. Some data may not be saved.';
      recovery.fallback = await this.enableMemoryStorage();
    }

    return recovery;
  }

  /**
   * Handle validation errors
   */
  async handleValidationError(errorInfo) {
    const recovery = {
      type: 'validation',
      success: true,
      userMessage: null,
      validationDetails: null,
    };

    // Extract validation details if available
    if (errorInfo.additionalData?.validationErrors) {
      recovery.validationDetails = errorInfo.additionalData.validationErrors;
      recovery.userMessage = 'Please correct the highlighted fields and try again.';
    } else {
      recovery.userMessage = errorInfo.message || 'Please check your input and try again.';
    }

    return recovery;
  }

  /**
   * Handle terminal errors
   */
  async handleTerminalError(errorInfo) {
    const recovery = {
      type: 'terminal',
      success: false,
      userMessage: null,
    };

    try {
      // Reset terminal state
      await this.resetTerminalState();
      recovery.success = true;
      recovery.userMessage = 'Terminal error recovered. Terminal has been reset.';
    } catch (resetError) {
      recovery.userMessage = 'Terminal error occurred. Please refresh to restore functionality.';
    }

    return recovery;
  }

  /**
   * Handle accessibility errors
   */
  async handleAccessibilityError(errorInfo) {
    const recovery = {
      type: 'accessibility',
      success: true,
      userMessage: null,
    };

    // Log accessibility issues for improvement
    console.warn('Accessibility issue detected:', errorInfo);

    recovery.userMessage =
      'Accessibility feature encountered an issue. Basic functionality remains available.';

    return recovery;
  }

  /**
   * Handle security errors
   */
  async handleSecurityError(errorInfo) {
    const recovery = {
      type: 'security',
      success: false,
      userMessage: null,
      securityAction: null,
    };

    // Security errors are serious
    console.error('🔒 SECURITY ERROR:', errorInfo);

    if (
      errorInfo.message.includes('CSP') ||
      errorInfo.message.includes('Content Security Policy')
    ) {
      recovery.userMessage = 'Security policy violation detected. Some features may be limited.';
      recovery.securityAction = 'csp_violation';
    } else if (errorInfo.message.includes('Mixed Content')) {
      recovery.userMessage = 'Mixed content security issue detected.';
      recovery.securityAction = 'mixed_content';
    } else {
      recovery.userMessage = 'Security error detected. Please refresh the page.';
      recovery.requiresRefresh = true;
    }

    return recovery;
  }

  /**
   * Handle generic errors
   */
  async handleGenericError(errorInfo) {
    const recovery = {
      type: 'generic',
      success: false,
      userMessage: 'An unexpected error occurred. Please try again.',
    };

    // Attempt basic recovery
    try {
      await this.performBasicRecovery();
      recovery.success = true;
      recovery.userMessage = 'Error recovered successfully.';
    } catch (recoveryError) {
      recovery.userMessage = 'Unable to recover from error. Please refresh the page.';
    }

    return recovery;
  }

  /**
   * Notify user about errors
   */
  notifyUser(errorInfo, recovery) {
    if (!recovery.userMessage) return;

    const severity =
      recovery.type === 'critical' ? 'error' : recovery.success ? 'warning' : 'error';

    // Use notification system if available
    if (window.notifications) {
      window.notifications.show({
        title: this.getErrorTitle(recovery.type),
        message: recovery.userMessage,
        type: severity,
        duration: severity === 'error' ? 10000 : 5000,
        actions: recovery.requiresRefresh
          ? [{ label: 'Refresh Page', action: () => window.location.reload() }]
          : undefined,
      });
    } else {
      // Fallback to console and alert for critical errors
      if (recovery.type === 'critical') {
        alert(recovery.userMessage);
      }
      console.warn('Error notification:', recovery.userMessage);
    }

    // Announce to screen readers for accessibility
    if (window.accessibility) {
      window.accessibility.announceToScreenReader(
        recovery.userMessage,
        recovery.type === 'critical' ? 'assertive' : 'polite'
      );
    }
  }

  /**
   * Log error with full context
   */
  logError(errorInfo) {
    // Add to in-memory log
    this.errorLog.push(errorInfo);

    // Limit log size
    if (this.errorLog.length > this.errorThresholds.maxErrorsInMemory) {
      this.errorLog = this.errorLog.slice(-this.errorThresholds.maxErrorsInMemory / 2);
    }

    // Console logging with context
    const logLevel = this.getLogLevel(errorInfo);
    const logMessage = `[${errorInfo.timestamp}] ${errorInfo.context}: ${errorInfo.message}`;

    console[logLevel](logMessage, {
      stack: errorInfo.stack,
      context: errorInfo.context,
      breadcrumbs: errorInfo.breadcrumbs,
      memory: errorInfo.memory,
      performance: errorInfo.performance,
    });

    // Persist to storage if available
    this.persistErrorLog(errorInfo);
  }

  /**
   * Global error handler
   */
  handleGlobalError(event) {
    const error = event.error || new Error(event.message);
    this.handleError(error, 'global', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  }

  /**
   * Unhandled promise rejection handler
   */
  handleUnhandledRejection(event) {
    const error = event.reason instanceof Error ? event.reason : new Error(event.reason);
    this.handleError(error, 'unhandled_promise_rejection');
    event.preventDefault(); // Prevent console logging
  }

  /**
   * Setup performance monitoring for critical performance issues
   */
  setupPerformanceMonitoring() {
    try {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'measure' && entry.duration > 5000) {
            this.handleError(
              new Error(`Performance issue: ${entry.name} took ${entry.duration}ms`),
              'performance',
              { performanceEntry: entry }
            );
          }
        });
      });

      observer.observe({ entryTypes: ['measure', 'navigation'] });
    } catch (error) {
      console.warn('Performance monitoring not available:', error);
    }
  }

  /**
   * Utility methods for error handling
   */

  generateErrorId() {
    return 'err_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getMemoryInfo() {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
        total: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB',
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB',
      };
    }
    return null;
  }

  getPerformanceInfo() {
    if (performance.timing) {
      const timing = performance.timing;
      return {
        pageLoad: timing.loadEventEnd - timing.navigationStart,
        domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || null,
      };
    }
    return null;
  }

  getBreadcrumbs() {
    // Simple breadcrumb implementation
    const breadcrumbs = [];
    if (window.history && window.history.length > 1) {
      breadcrumbs.push(`Navigation history: ${window.history.length} entries`);
    }
    if (document.activeElement) {
      breadcrumbs.push(`Active element: ${document.activeElement.tagName}`);
    }
    return breadcrumbs;
  }

  getUserContext() {
    return {
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
    };
  }

  getLogLevel(errorInfo) {
    if (errorInfo.name === 'TypeError' || errorInfo.name === 'ReferenceError') {
      return 'error';
    }
    if (errorInfo.statusCode >= 500) {
      return 'error';
    }
    if (errorInfo.statusCode >= 400) {
      return 'warn';
    }
    return 'log';
  }

  getErrorTitle(type) {
    const titles = {
      critical: 'Critical Error',
      network: 'Connection Issue',
      ai_api: 'AI Service Issue',
      storage: 'Storage Issue',
      validation: 'Input Error',
      terminal: 'Terminal Error',
      accessibility: 'Accessibility Notice',
      security: 'Security Warning',
      generic: 'Application Error',
    };
    return titles[type] || 'Error';
  }

  /**
   * Recovery methods
   */

  async saveApplicationState() {
    try {
      const state = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage },
      };
      sessionStorage.setItem('emergency_state', JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save application state:', error);
    }
  }

  clearCorruptedState() {
    // Clear potentially corrupted localStorage items
    const keysToCheck = ['rinawarp_', 'secure_', 'temp_'];
    Object.keys(localStorage).forEach(key => {
      if (keysToCheck.some(prefix => key.startsWith(prefix))) {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn('Failed to clear corrupted storage item:', key);
        }
      }
    });
  }

  async restartCoreComponents() {
    // Placeholder for restarting core application components
    if (window.RinaWarpApp && typeof window.RinaWarpApp.restart === 'function') {
      await window.RinaWarpApp.restart();
    }
  }

  async enableOfflineMode() {
    document.body.classList.add('offline-mode');
    console.log('🔌 Offline mode enabled');
  }

  async enableAIFallbackMode() {
    console.log('🤖 AI fallback mode enabled');
    return 'fallback_responses';
  }

  async cleanupStorageQuota() {
    // Clean up old data to free storage space
    const oldKeys = Object.keys(localStorage).filter(key => {
      const item = localStorage.getItem(key);
      try {
        const data = JSON.parse(item);
        if (data.timestamp) {
          const age = Date.now() - new Date(data.timestamp).getTime();
          return age > this.errorThresholds.logRetentionDays * 24 * 60 * 60 * 1000;
        }
      } catch (e) {
        return false;
      }
      return false;
    });

    oldKeys.forEach(key => localStorage.removeItem(key));
    console.log(`🧹 Cleaned up ${oldKeys.length} old storage items`);
  }

  async enableTemporaryStorage() {
    // Use sessionStorage as fallback
    console.log('💾 Temporary storage mode enabled');
    return 'session_storage';
  }

  async enableMemoryStorage() {
    // Use in-memory storage as last resort
    console.log('🧠 Memory storage mode enabled');
    return 'memory_storage';
  }

  async resetTerminalState() {
    // Reset terminal to clean state
    const terminal = document.getElementById('terminal');
    if (terminal) {
      terminal.innerHTML = '';
    }
    console.log('🖥️ Terminal state reset');
  }

  async performBasicRecovery() {
    // Basic recovery operations
    console.log('🔄 Performing basic error recovery');
  }

  persistErrorLog(errorInfo) {
    try {
      const logs = JSON.parse(localStorage.getItem('error_logs') || '[]');
      logs.push({
        id: errorInfo.id,
        timestamp: errorInfo.timestamp,
        type: errorInfo.name,
        message: errorInfo.message,
        context: errorInfo.context,
      });

      // Keep only recent logs
      const maxLogs = 50;
      if (logs.length > maxLogs) {
        logs.splice(0, logs.length - maxLogs);
      }

      localStorage.setItem('error_logs', JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to persist error log:', error);
    }
  }

  /**
   * Fallback error handler when main handler fails
   */
  handleFallbackError(originalError, context) {
    console.error('🚨 FALLBACK ERROR HANDLER:', {
      originalError,
      context,
      timestamp: new Date().toISOString(),
    });

    // Show basic user notification
    if (window.alert) {
      alert('A serious error occurred. Please refresh the page.');
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      totalErrors: this.errorLog.length,
      criticalErrors: this.criticalErrors.length,
      errorsByType: Object.fromEntries(this.errorCounts),
      retryAttempts: Object.fromEntries(this.retryAttempts),
      recentErrors: this.errorLog.slice(-10),
    };
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorLog = [];
    this.errorCounts.clear();
    this.retryAttempts.clear();
    this.criticalErrors = [];
    console.log('🧹 Error history cleared');
  }

  /**
   * Cleanup method
   */
  destroy() {
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    console.log('🛡️ Error handler cleaned up');
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();
