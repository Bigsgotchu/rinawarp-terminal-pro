/**
 * Structured Logging Service
 * Uses Winston for structured, searchable logs
 */

import winston from 'winston';
import path from 'path';
import os from 'os';
import fs from 'fs';
import * as Sentry from '@sentry/node';

class StructuredLogger {
  constructor() {
    this.logger = null;
    this.logDirectory = path.join(os.homedir(), '.rinawarp-terminal', 'logs');
    this.initializeLogger();
  }

  /**
   * Initialize Winston logger with structured format
   */
  initializeLogger() {
    // Ensure log directory exists
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS',
      }),
      winston.format.errors({ stack: true }),
      winston.format.metadata({
        fillExcept: ['message', 'level', 'timestamp', 'label'],
      }),
      winston.format.json()
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'HH:mm:ss.SSS',
      }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, metadata }) => {
        const meta = Object.keys(metadata).length ? `\n${JSON.stringify(metadata, null, 2)}` : '';
        return `[${timestamp}] ${level}: ${message}${meta}`;
      })
    );

    // Create transports
    const transports = [
      // File transport for all logs
      new winston.transports.File({
        filename: path.join(this.logDirectory, 'combined.log'),
        format: logFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true,
      }),
      // Separate file for errors
      new winston.transports.File({
        filename: path.join(this.logDirectory, 'error.log'),
        level: 'error',
        format: logFormat,
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5,
      }),
      // Separate file for performance logs
      new winston.transports.File({
        filename: path.join(this.logDirectory, 'performance.log'),
        level: 'info',
        format: logFormat,
        maxsize: 10 * 1024 * 1024,
        maxFiles: 3,
        // Filter to only include performance-related logs
        filter: log => log.metadata?.category === 'performance',
      }),
    ];

    // Add console transport for development
    if (process.env.NODE_ENV !== 'production') {
      transports.push(
        new winston.transports.Console({
          format: consoleFormat,
          level: process.env.LOG_LEVEL || 'debug',
        })
      );
    }

    // Create logger instance
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      defaultMeta: {
        service: 'rinawarp-terminal',
        version: process.env.APP_VERSION || '1.0.6',
        environment: process.env.NODE_ENV || 'development',
        hostname: os.hostname(),
        pid: process.pid,
      },
      transports,
    });

    // Add Sentry transport if available
    if (process.env.SENTRY_DSN) {
      this.addSentryTransport();
    }

    console.log('✅ Structured logger initialized');
  }

  /**
   * Add Sentry transport for error logging
   */
  addSentryTransport() {
    try {
      // Create custom Sentry transport
      const SentryTransport = winston.transports.Stream;
      const sentryTransport = new SentryTransport({
        stream: {
          write: message => {
            const log = JSON.parse(message);
            if (log.level === 'error' || log.level === 'fatal') {
              // Send to Sentry
              if (typeof Sentry !== 'undefined') {
                Sentry.captureException(new Error(log.message), {
                  level: log.level,
                  extra: log.metadata,
                });
              }
            }
          },
        },
        level: 'error',
      });

      this.logger.add(sentryTransport);
    } catch (error) {
      console.error('Failed to add Sentry transport:', error);
    }
  }

  /**
   * Log with structured data
   */
  log(level, message, metadata = {}) {
    if (!this.logger) return;

    // Add common metadata
    const enrichedMetadata = {
      ...metadata,
      timestamp: new Date().toISOString(),
      correlationId: metadata.correlationId || this.generateCorrelationId(),
    };

    // Add user context if available
    if (global.currentUser) {
      enrichedMetadata.userId = global.currentUser.id;
      enrichedMetadata.userEmail = global.currentUser.email;
    }

    this.logger.log(level, message, enrichedMetadata);
  }

  /**
   * Log info level
   */
  info(message, metadata = {}) {
    this.log('info', message, metadata);
  }

  /**
   * Log warning level
   */
  warn(message, metadata = {}) {
    this.log('warn', message, metadata);
  }

  /**
   * Log error level
   */
  error(message, error = null, metadata = {}) {
    const errorMetadata = {
      ...metadata,
      category: 'error',
    };

    if (error instanceof Error) {
      errorMetadata.errorName = error.name;
      errorMetadata.errorMessage = error.message;
      errorMetadata.errorStack = error.stack;
    } else if (error) {
      errorMetadata.errorDetails = error;
    }

    this.log('error', message, errorMetadata);
  }

  /**
   * Log debug level
   */
  debug(message, metadata = {}) {
    this.log('debug', message, metadata);
  }

  /**
   * Log performance metrics
   */
  performance(operation, duration, metadata = {}) {
    this.info(`Performance: ${operation}`, {
      ...metadata,
      category: 'performance',
      operation,
      duration,
      durationUnit: 'ms',
    });
  }

  /**
   * Log terminal command execution
   */
  command(command, exitCode, duration, metadata = {}) {
    const level = exitCode === 0 ? 'info' : 'warn';
    this.log(level, `Command executed: ${command}`, {
      ...metadata,
      category: 'command',
      command,
      exitCode,
      duration,
      durationUnit: 'ms',
    });
  }

  /**
   * Log API request
   */
  apiRequest(method, url, statusCode, duration, metadata = {}) {
    const level = statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `API Request: ${method} ${url}`, {
      ...metadata,
      category: 'api',
      method,
      url,
      statusCode,
      duration,
      durationUnit: 'ms',
    });
  }

  /**
   * Log security event
   */
  security(event, severity, metadata = {}) {
    const level = severity === 'critical' ? 'error' : 'warn';
    this.log(level, `Security Event: ${event}`, {
      ...metadata,
      category: 'security',
      securityEvent: event,
      severity,
    });
  }

  /**
   * Log plugin event
   */
  plugin(pluginName, event, metadata = {}) {
    this.info(`Plugin Event: ${pluginName} - ${event}`, {
      ...metadata,
      category: 'plugin',
      pluginName,
      pluginEvent: event,
    });
  }

  /**
   * Create child logger with additional context
   */
  child(defaultMetadata = {}) {
    return {
      info: (message, metadata = {}) => this.info(message, { ...defaultMetadata, ...metadata }),
      warn: (message, metadata = {}) => this.warn(message, { ...defaultMetadata, ...metadata }),
      error: (message, error = null, metadata = {}) =>
        this.error(message, error, { ...defaultMetadata, ...metadata }),
      debug: (message, metadata = {}) => this.debug(message, { ...defaultMetadata, ...metadata }),
    };
  }

  /**
   * Generate correlation ID for request tracking
   */
  generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Query logs (for debugging/analysis)
   */
  async queryLogs(options = {}) {
    const { level, category, startTime, endTime, limit = 100 } = options;

    // This is a placeholder - in production, you might query a log aggregation service
    // For now, we'll read from the local log file
    return new Promise((resolve, reject) => {
      const logFile = path.join(this.logDirectory, 'combined.log');
      fs.readFile(logFile, 'utf8', (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        const logs = data
          .split('\n')
          .filter(line => line.trim())
          .map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(log => log !== null)
          .filter(log => {
            if (level && log.level !== level) return false;
            if (category && log.metadata?.category !== category) return false;
            if (startTime && new Date(log.timestamp) < new Date(startTime)) return false;
            if (endTime && new Date(log.timestamp) > new Date(endTime)) return false;
            return true;
          })
          .slice(-limit);

        resolve(logs);
      });
    });
  }

  /**
   * Get log file paths
   */
  getLogPaths() {
    return {
      combined: path.join(this.logDirectory, 'combined.log'),
      error: path.join(this.logDirectory, 'error.log'),
      performance: path.join(this.logDirectory, 'performance.log'),
    };
  }
}

// Export singleton instance
export default new StructuredLogger();
