/**
 * RinaWarp Terminal - Centralized Logging System
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * Centralized logging abstraction that replaces console.log statements
 * with environment-aware logging and telemetry capabilities.
 */

class Logger {
  constructor() {
    this.isDevelopment =
      process.env.NODE_ENV === 'development' ||
      process.argv.includes('--dev') ||
      process.env.DEBUG === 'true';

    this.logLevel = process.env.LOG_LEVEL || (this.isDevelopment ? 'debug' : 'warn');
    this.enableTelemetry = process.env.ENABLE_TELEMETRY === 'true';

    // Log levels in order of priority
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    this.currentLevel = this.levels[this.logLevel] || this.levels.warn;
  }

  /**
   * Format log message with timestamp and context
   */
  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const contextStr = Object.keys(context).length > 0 ? ` [${JSON.stringify(context)}]` : '';

    return `[${timestamp}] [${level.toUpperCase()}]${contextStr} ${message}`;
  }

  /**
   * Send telemetry data via production telemetry service
   */
  async sendTelemetry(level, message, context = {}) {
    if (!this.enableTelemetry) return;

    try {
      // Load telemetry service lazily to avoid circular dependencies
      if (!this.telemetryService) {
        const { default: telemetryService } = await import('../services/telemetry-service.js');
        this.telemetryService = telemetryService;
      }

      // Map log levels to telemetry event types
      const eventTypeMap = {
        debug: 'system',
        info: 'system',
        warn: 'system',
        error: 'error',
      };

      const eventType = eventTypeMap[level] || 'system';

      // Send to telemetry service
      this.telemetryService.trackEvent(eventType, `log_${level}`, {
        message: message,
        logLevel: level,
        ...context,
      });
    } catch (error) {
      // Don't let telemetry errors break logging
      if (this.isDevelopment) {
        console.error('Telemetry error:', error.message);
      }
    }
  }

  /**
   * Check if log level should be output
   */
  shouldLog(level) {
    return this.levels[level] >= this.currentLevel;
  }

  /**
   * Debug logging - only in development
   */
  debug(message, context = {}) {
    if (!this.shouldLog('debug')) return;

    if (this.isDevelopment) {
      const _formattedMessage = this.formatMessage('debug', message, context);
      console.log(_formattedMessage);
    }

    this.sendTelemetry('debug', message, context).catch(() => {});
  }

  /**
   * Info logging
   */
  info(message, context = {}) {
    if (!this.shouldLog('info')) return;

    const formattedMessage = this.formatMessage('info', message, context);

    if (this.isDevelopment) {
      console.info(formattedMessage);
    }

    this.sendTelemetry('info', message, context).catch(() => {});
  }

  /**
   * Warning logging
   */
  warn(message, context = {}) {
    if (!this.shouldLog('warn')) return;

    const formattedMessage = this.formatMessage('warn', message, context);

    if (this.isDevelopment) {
      console.warn(formattedMessage);
    }

    this.sendTelemetry('warn', message, context).catch(() => {});
  }

  /**
   * Error logging - always logged
   */
  error(message, context = {}) {
    const formattedMessage = this.formatMessage('error', message, context);

    // Always log errors to console in development
    if (this.isDevelopment) {
      console.error(formattedMessage);
    }

    this.sendTelemetry('error', message, context).catch(() => {});
  }

  /**
   * Performance logging for monitoring
   */
  performance(operation, duration, context = {}) {
    const message = `${operation} completed in ${duration}ms`;
    this.info(message, { ...context, performance: true, duration });
  }

  /**
   * User action logging for analytics
   */
  userAction(action, context = {}) {
    this.info(`User action: ${action}`, { ...context, userAction: true });
  }

  /**
   * Security event logging
   */
  security(event, context = {}) {
    this.warn(`Security event: ${event}`, { ...context, security: true });
  }

  /**
   * System event logging
   */
  system(event, context = {}) {
    this.info(`System event: ${event}`, { ...context, system: true });
  }
}

// Create singleton instance
const logger = new Logger();

// Export both the instance and class for flexibility
export default logger;
export { Logger };
