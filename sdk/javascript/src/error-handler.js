/**
 * Centralized Error Handling for RinaWarp SDK
 */

class ErrorHandler {
  constructor(sdk) {
    this.sdk = sdk;
    this.errorCallbacks = [];
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
    };
  }

  /**
   * Register a global error callback
   */
  onError(callback) {
    this.errorCallbacks.push(callback);
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Handle errors and emit to all registered callbacks
   */
  handleError(error, context = {}) {
    const enhancedError = {
      ...error,
      timestamp: new Date().toISOString(),
      context,
      sdk: {
        version: '1.0.0',
        apiUrl: this.sdk.config.apiUrl,
      },
    };

    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('[RinaWarp SDK Error]', enhancedError);
    }

    // Emit to all error callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(enhancedError);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });

    // Emit through SDK event emitter
    if (this.sdk.emit) {
      this.sdk.emit('error', enhancedError);
    }

    return enhancedError;
  }

  /**
   * Wrap async methods with error handling
   */
  wrapAsync(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn.apply(this.sdk, args);
      } catch (error) {
        this.handleError(error, { ...context, method: fn.name, args });
        throw error;
      }
    };
  }

  /**
   * Wrap methods with retry logic
   */
  wrapWithRetry(fn, context = {}) {
    return async (...args) => {
      let lastError;
      const { maxRetries, retryDelay, backoffMultiplier } = this.retryConfig;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn.apply(this.sdk, args);
        } catch (error) {
          lastError = error;

          // Don't retry on client errors
          if (error.status && error.status >= 400 && error.status < 500) {
            this.handleError(error, { ...context, method: fn.name, args, attempt });
            throw error;
          }

          // Last attempt, don't retry
          if (attempt === maxRetries) {
            this.handleError(error, { 
              ...context, 
              method: fn.name, 
              args, 
              attempt,
              exhaustedRetries: true 
            });
            throw error;
          }

          // Calculate delay with exponential backoff
          const delay = retryDelay * Math.pow(backoffMultiplier, attempt);
          
          if (process.env.NODE_ENV !== 'production') {
            console.log(`Retrying ${fn.name} after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          }

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      throw lastError;
    };
  }

  /**
   * Create a safe version of the SDK with all methods wrapped
   */
  createSafeSDK(sdk) {
    const safeSDK = Object.create(sdk);
    const methodsToWrap = [
      'createTerminal',
      'getTerminal',
      'getTerminals',
      'deleteTerminal',
      'executeCommand',
      'getCommandHistory',
      'getPerformanceMetrics',
      'getUserAnalytics',
      'getOrganizationAnalytics',
      'connect',
      'subscribeToTerminal',
      'subscribeToPerformanceAlerts',
      'graphql',
      'batch',
      'streamCommand',
      'waitForCommand',
    ];

    methodsToWrap.forEach(methodName => {
      if (typeof sdk[methodName] === 'function') {
        safeSDK[methodName] = this.wrapWithRetry(
          sdk[methodName].bind(sdk),
          { methodName }
        );
      }
    });

    // Copy non-function properties
    Object.keys(sdk).forEach(key => {
      if (typeof sdk[key] !== 'function' && !(key in safeSDK)) {
        safeSDK[key] = sdk[key];
      }
    });

    return safeSDK;
  }

  /**
   * Format error for user display
   */
  formatError(error) {
    if (error.code === 'NETWORK_ERROR') {
      return 'Network connection error. Please check your internet connection.';
    }
    
    if (error.code === 'AUTH_ERROR') {
      return 'Authentication failed. Please check your API key.';
    }
    
    if (error.code === 'RATE_LIMIT') {
      return 'Rate limit exceeded. Please try again later.';
    }
    
    if (error.status === 404) {
      return 'Resource not found.';
    }
    
    if (error.status === 500) {
      return 'Server error. Please try again later.';
    }
    
    return error.message || 'An unexpected error occurred.';
  }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ErrorHandler };
} else if (typeof window !== 'undefined') {
  window.ErrorHandler = ErrorHandler;
}

export { ErrorHandler };
