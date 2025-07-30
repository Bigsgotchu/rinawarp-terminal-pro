/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

// Base custom error class
class AppError extends Error {
  constructor(message, type, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

// Network related errors
class NetworkError extends AppError {
  constructor(message, code = 'NETWORK_ERROR', details = {}) {
    super(message, 'NetworkError', code, details);
  }
}

// Configuration errors
class ConfigError extends AppError {
  constructor(message, code = 'CONFIG_ERROR', details = {}) {
    super(message, 'ConfigError', code, details);
  }
}

// Module/Component errors
class ModuleError extends AppError {
  constructor(message, code = 'MODULE_ERROR', details = {}) {
    super(message, 'ModuleError', code, details);
  }
}

// Validation errors
class ValidationError extends AppError {
  constructor(message, code = 'VALIDATION_ERROR', details = {}) {
    super(message, 'ValidationError', code, details);
  }
}

// Authentication errors
class AuthError extends AppError {
  constructor(message, code = 'AUTH_ERROR', details = {}) {
    super(message, 'AuthError', code, details);
  }
}

// Error logging service
class ErrorLogger {
  static instance = null;
  
  constructor() {
    if (ErrorLogger.instance) {
      return ErrorLogger.instance;
    }
    
    this.errorStore = [];
    this.subscribers = new Set();
    ErrorLogger.instance = this;
  }

  static getInstance() {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  logError(error) {
    const errorData = error instanceof AppError ? error.toJSON() : {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    this.errorStore.push(errorData);
    this.notifySubscribers(errorData);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(errorData);
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(error) {
    this.subscribers.forEach(callback => callback(error));
  }

  getRecentErrors(limit = 10) {
    return this.errorStore.slice(-limit);
  }

  clearErrors() {
    this.errorStore = [];
  }
}

// Global error boundary for uncaught exceptions
class GlobalErrorBoundary {
  static setup() {
    // Handle uncaught promises
    process.on('unhandledRejection', (reason, promise) => {
      const errorLogger = ErrorLogger.getInstance();
      errorLogger.logError(new AppError(
        'Unhandled Promise Rejection',
        'UnhandledRejection',
        'UNHANDLED_REJECTION',
        { reason }
      ));
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      const errorLogger = ErrorLogger.getInstance();
      errorLogger.logError(new AppError(
        'Uncaught Exception',
        'UncaughtException',
        'UNCAUGHT_EXCEPTION',
        { originalError: error }
      ));
    });
  }
}

// Error recovery strategies
const ErrorRecoveryStrategies = {
  // Retry with exponential backoff
  async retryWithBackoff(operation, maxRetries = 3, initialDelay = 1000) {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        retries++;
        if (retries === maxRetries) throw new Error(error);
        
        const delay = initialDelay * Math.pow(2, retries - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },

  // Circuit breaker pattern
  createCircuitBreaker(operation, options = {}) {
    const {
      maxFailures = 3,
      resetTimeout = 60000,
    } = options;

    let failures = 0;
    let lastFailureTime = null;

    return async (...args) => {
      if (failures >= maxFailures) {
        const timeSinceLastFailure = Date.now() - lastFailureTime;
        if (timeSinceLastFailure < resetTimeout) {
          throw new Error(new NetworkError('Circuit breaker is open', 'CIRCUIT_OPEN'));
        }
        failures = 0;
      }

      try {
        const result = await operation(...args);
        failures = 0;
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = Date.now();
        throw new Error(error);
      }
    };
  },

  // Fallback value strategy
  withFallback(operation, fallbackValue) {
    return async (...args) => {
      try {
        return await operation(...args);
      } catch (error) {
        return fallbackValue;
      }
    };
  }
};

// Export all error classes and utilities
module.exports = {
  AppError,
  NetworkError,
  ConfigError,
  ModuleError,
  ValidationError,
  AuthError,
  ErrorLogger,
  GlobalErrorBoundary,
  ErrorRecoveryStrategies
};
