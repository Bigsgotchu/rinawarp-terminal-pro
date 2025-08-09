/**
 * RinaWarp Terminal - Client-side Logger Utility
 * Provides consistent logging for browser-based JavaScript modules
 */

class Logger {
    constructor() {
        this.isProduction = window.location.hostname === 'rinawarptech.com';
        this.enableLogging = !this.isProduction || localStorage.getItem('debug') === 'true';
        this.logLevel = this.isProduction ? 'warn' : 'debug';
    }

    log(level, message, ...args) {
        if (!this.enableLogging && level === 'debug') return;
        
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        
        // Always log errors and warnings
        if (level === 'error' || level === 'warn') {
            console[level](prefix, message, ...args);
            
            // Send critical errors to analytics if available
            if (level === 'error' && window.gtag) {
                window.gtag('event', 'exception', {
                    description: message,
                    fatal: false
                });
            }
        } 
        // Only log info and debug in development or when debug is enabled
        else if (this.enableLogging) {
            console[level === 'debug' ? 'log' : level](prefix, message, ...args);
        }
    }

    debug(message, ...args) {
        this.log('debug', message, ...args);
    }

    info(message, ...args) {
        this.log('info', message, ...args);
    }

    warn(message, ...args) {
        this.log('warn', message, ...args);
    }

    error(message, ...args) {
        this.log('error', message, ...args);
        
        // Track errors in production
        if (this.isProduction && window.LogRocket) {
            window.LogRocket.captureException(new Error(message));
        }
    }

    // Performance timing
    time(label) {
        if (this.enableLogging) {
            console.time(label);
        }
    }

    timeEnd(label) {
        if (this.enableLogging) {
            console.timeEnd(label);
        }
    }

    // Group logging
    group(label) {
        if (this.enableLogging) {
            console.group(label);
        }
    }

    groupEnd() {
        if (this.enableLogging) {
            console.groupEnd();
        }
    }
}

// Export as default and named export for compatibility
const logger = new Logger();

export default logger;
export { logger };
