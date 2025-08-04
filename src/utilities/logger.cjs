/**
 * CommonJS wrapper for the ES module logger
 * This allows CommonJS files to use the logger
 */

// Simple logger implementation for CommonJS files
class Logger {
  constructor() {
    this.isDevelopment =
      process.env.NODE_ENV === 'development' ||
      process.argv.includes('--dev') ||
      process.env.DEBUG === 'true';

    this.logLevel = process.env.LOG_LEVEL || (this.isDevelopment ? 'debug' : 'warn');

    // Log levels in order of priority
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    this.currentLevel = this.levels[this.logLevel] || this.levels.warn;
  }

  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const contextStr = Object.keys(context).length > 0 ? ` [${JSON.stringify(context)}]` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${contextStr} ${message}`;
  }

  shouldLog(level) {
    return this.levels[level] >= this.currentLevel;
  }

  debug(message, context = {}) {
    if (!this.shouldLog('debug')) return;
    if (this.isDevelopment) {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  info(message, context = {}) {
    if (!this.shouldLog('info')) return;
    const formattedMessage = this.formatMessage('info', message, context);
    if (this.isDevelopment) {
      console.info(formattedMessage);
    }
  }

  warn(message, context = {}) {
    if (!this.shouldLog('warn')) return;
    const formattedMessage = this.formatMessage('warn', message, context);
    if (this.isDevelopment) {
      console.warn(formattedMessage);
    }
  }

  error(message, context = {}) {
    const formattedMessage = this.formatMessage('error', message, context);
    if (this.isDevelopment) {
      console.error(formattedMessage);
    }
  }

  performance(operation, duration, context = {}) {
    const message = `${operation} completed in ${duration}ms`;
    this.info(message, { ...context, performance: true, duration });
  }

  userAction(action, context = {}) {
    this.info(`User action: ${action}`, { ...context, userAction: true });
  }

  security(event, context = {}) {
    this.warn(`Security event: ${event}`, { ...context, security: true });
  }

  system(event, context = {}) {
    this.info(`System event: ${event}`, { ...context, system: true });
  }
}

// Create singleton instance
const logger = new Logger();

// Export for CommonJS
module.exports = logger;
module.exports.default = logger;
module.exports.Logger = Logger;
