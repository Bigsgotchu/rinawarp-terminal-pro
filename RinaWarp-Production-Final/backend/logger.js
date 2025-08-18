/**
 * Enhanced Logging Configuration for RinaWarp Terminal
 * Provides structured logging with different levels and output formats
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || process.env.LOG_LEVEL || 'info';
    this.logDir = options.logDir || path.join(__dirname, '../logs');
    this.serviceName = options.serviceName || 'rinawarp-api';

    // Ensure log directory exists
    this.ensureLogDirectory();

    // Log levels with numeric values for comparison
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4,
    };

    this.currentLevel = this.levels[this.logLevel] || this.levels.info;

    // Initialize log files
    this.logFiles = {
      error: path.join(this.logDir, 'error.log'),
      access: path.join(this.logDir, 'access.log'),
      app: path.join(this.logDir, 'app.log'),
      security: path.join(this.logDir, 'security.log'),
      performance: path.join(this.logDir, 'performance.log'),
    };
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: this.serviceName,
      message,
      ...meta,
    };

    return JSON.stringify(logEntry);
  }

  writeToFile(filename, message) {
    try {
      fs.appendFileSync(filename, message + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  log(level, message, meta = {}) {
    const levelValue = this.levels[level];

    if (levelValue <= this.currentLevel) {
      const formattedMessage = this.formatMessage(level, message, meta);

      // Console output with colors
      this.consoleLog(level, message, meta);

      // File output
      this.writeToFile(this.logFiles.app, formattedMessage);

      // Write errors to separate error log
      if (level === 'error') {
        this.writeToFile(this.logFiles.error, formattedMessage);
      }
    }
  }

  consoleLog(level, message, meta) {
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m', // Yellow
      info: '\x1b[36m', // Cyan
      debug: '\x1b[37m', // White
      trace: '\x1b[90m', // Gray
    };

    const resetColor = '\x1b[0m';
    const timestamp = new Date().toISOString();
    const color = colors[level] || colors.info;

    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    console.log(
      `${color}[${timestamp}] [${level.toUpperCase()}]${resetColor} ${message}${metaStr}`
    );
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  trace(message, meta = {}) {
    this.log('trace', message, meta);
  }

  // Access logging for HTTP requests
  access(req, res, responseTime) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      responseTime: responseTime + 'ms',
      contentLength: res.get('Content-Length') || 0,
    };

    this.writeToFile(this.logFiles.access, JSON.stringify(logEntry));
  }

  // Security logging
  security(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      service: this.serviceName,
    };

    this.writeToFile(this.logFiles.security, JSON.stringify(logEntry));
    this.warn(`Security event: ${event}`, details);
  }

  // Performance logging
  performance(operation, duration, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      duration: duration + 'ms',
      details,
      service: this.serviceName,
    };

    this.writeToFile(this.logFiles.performance, JSON.stringify(logEntry));

    // Log slow operations as warnings
    if (duration > 1000) {
      this.warn(`Slow operation: ${operation} took ${duration}ms`, details);
    }
  }

  // Request/Response middleware
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();

      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        this.access(req, res, responseTime);

        // Log slow requests
        if (responseTime > 5000) {
          this.performance('http_request', responseTime, {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
          });
        }
      });

      next();
    };
  }

  // Error handling middleware
  errorHandler() {
    return (err, req, res, next) => {
      this.error('HTTP Error', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
      });

      // Security logging for suspicious errors
      if (err.status === 401 || err.status === 403) {
        this.security('unauthorized_access', {
          url: req.url,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });
      }

      next(err);
    };
  }

  // Rotate logs (call this periodically)
  rotateLogs() {
    const maxSize = 100 * 1024 * 1024; // 100MB

    for (const [logType, logPath] of Object.entries(this.logFiles)) {
      try {
        const stats = fs.statSync(logPath);
        if (stats.size > maxSize) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const backupPath = logPath.replace('.log', `-${timestamp}.log`);
          fs.renameSync(logPath, backupPath);
          this.info(`Rotated log file: ${logType}`, { originalSize: stats.size, backupPath });
        }
      } catch (error) {
        // File doesn't exist yet, that's fine
      }
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Global error handling
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason,
    promise: promise,
  });
});

module.exports = logger;
