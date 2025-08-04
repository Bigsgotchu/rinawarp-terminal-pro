/**
 * Simple logger utility for RinaWarp Terminal
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
};

class Logger {
  constructor(name) {
    this.name = name;
    this.level = LOG_LEVELS.INFO;
    
    // Check environment for log level
    if (process.env.LOG_LEVEL) {
      this.level = LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO;
    }
  }

  _log(level, message, ...args) {
    if (LOG_LEVELS[level] >= this.level) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${level}] [${this.name}]`;
      
      switch (level) {
      case 'ERROR':
      case 'FATAL':
        console.error(prefix, message, ...args);
        break;
      case 'WARN':
        console.warn(prefix, message, ...args);
        break;
      default:
        console.log(prefix, message, ...args);
      }
    }
  }

  debug(message, ...args) {
    this._log('DEBUG', message, ...args);
  }

  info(message, ...args) {
    this._log('INFO', message, ...args);
  }

  warn(message, ...args) {
    this._log('WARN', message, ...args);
  }

  error(message, ...args) {
    this._log('ERROR', message, ...args);
  }

  fatal(message, ...args) {
    this._log('FATAL', message, ...args);
  }
}

// Factory function to create logger instances
export function createLogger(name) {
  return new Logger(name);
}

// Create a default logger instance
const defaultLogger = new Logger('RinaWarp');

// Export both the class and default instance
export { Logger };
export default defaultLogger;
