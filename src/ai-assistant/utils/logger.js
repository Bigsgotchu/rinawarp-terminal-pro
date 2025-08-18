/**
 * RinaWarp AI Assistant - Logger Utility
 * Logging system for AI assistant components
 */

import fs from 'fs/promises';
import path from 'path';

class Logger {
  constructor() {
    this.logLevel = process.env.RINA_LOG_LEVEL || 'info';
    this.logFile = path.join(process.cwd(), '.rinawarp', 'ai-assistant.log');
    this.maxLogSize = 10 * 1024 * 1024; // 10MB

    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };

    this.colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m', // Yellow
      info: '\x1b[36m', // Cyan
      debug: '\x1b[90m', // Gray
      reset: '\x1b[0m',
    };

    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    try {
      const logDir = path.dirname(this.logFile);
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      // Ignore errors, logging will fallback to console only
    }
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const formattedArgs = args
      .map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
      .join(' ');

    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${formattedArgs}`.trim();
  }

  async writeToFile(formattedMessage) {
    try {
      // Check file size and rotate if needed
      try {
        const stats = await fs.stat(this.logFile);
        if (stats.size > this.maxLogSize) {
          await this.rotateLog();
        }
      } catch (error) {
        // File doesn't exist yet, ignore
      }

      await fs.appendFile(this.logFile, formattedMessage + '\n');
    } catch (error) {
      // Fallback to console if file writing fails
      console.error('Failed to write to log file:', error.message);
    }
  }

  async rotateLog() {
    try {
      const backupFile = this.logFile + '.old';
      await fs.rename(this.logFile, backupFile);
    } catch (error) {
      // If rotation fails, truncate the log
      await fs.writeFile(this.logFile, '');
    }
  }

  error(message, ...args) {
    if (!this.shouldLog('error')) return;

    const formatted = this.formatMessage('error', message, ...args);
    console.error(this.colors.error + formatted + this.colors.reset);
    this.writeToFile(formatted);
  }

  warn(message, ...args) {
    if (!this.shouldLog('warn')) return;

    const formatted = this.formatMessage('warn', message, ...args);
    console.warn(this.colors.warn + formatted + this.colors.reset);
    this.writeToFile(formatted);
  }

  info(message, ...args) {
    if (!this.shouldLog('info')) return;

    const formatted = this.formatMessage('info', message, ...args);
    console.info(this.colors.info + formatted + this.colors.reset);
    this.writeToFile(formatted);
  }

  debug(message, ...args) {
    if (!this.shouldLog('debug')) return;

    const formatted = this.formatMessage('debug', message, ...args);
    console.debug(this.colors.debug + formatted + this.colors.reset);
    this.writeToFile(formatted);
  }

  // Convenience methods
  success(message, ...args) {
    this.info('✅ ' + message, ...args);
  }

  failure(message, ...args) {
    this.error('❌ ' + message, ...args);
  }

  progress(message, ...args) {
    this.info('🔄 ' + message, ...args);
  }

  // Performance logging
  time(label) {
    this.timers = this.timers || new Map();
    this.timers.set(label, performance.now());
    this.debug(`Timer started: ${label}`);
  }

  timeEnd(label) {
    if (!this.timers || !this.timers.has(label)) {
      this.warn(`Timer not found: ${label}`);
      return;
    }

    const duration = performance.now() - this.timers.get(label);
    this.timers.delete(label);
    this.info(`${label}: ${duration.toFixed(2)}ms`);

    return duration;
  }

  // Structured logging for analytics
  logEvent(event, data = {}) {
    const eventData = {
      timestamp: new Date().toISOString(),
      event,
      data,
      session_id: this.getSessionId(),
    };

    this.info('EVENT', JSON.stringify(eventData));
  }

  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return this.sessionId;
  }

  // Get recent logs for debugging
  async getRecentLogs(lines = 100) {
    try {
      const content = await fs.readFile(this.logFile, 'utf-8');
      const logLines = content.split('\n').filter(line => line.trim());
      return logLines.slice(-lines);
    } catch (error) {
      return [];
    }
  }

  // Clear logs
  async clearLogs() {
    try {
      await fs.writeFile(this.logFile, '');
      this.info('Log file cleared');
    } catch (error) {
      this.error('Failed to clear log file:', error);
    }
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
