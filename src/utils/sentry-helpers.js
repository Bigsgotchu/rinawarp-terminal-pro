/**
 * Sentry Helper Utilities for RinaWarp Terminal
 * Provides common patterns for error tracking and debugging
 */

import * as Sentry from '@sentry/node';

/**
 * Capture an error with additional context
 * @param {Error} error - The error object
 * @param {Object} context - Additional context to help with debugging
 * @param {string} level - Error level: 'error', 'warning', 'info', 'debug'
 */
export function captureErrorWithContext(error, context = {}, level = 'error') {
  return Sentry.withScope((scope) => {
    // Set the severity level
    scope.setLevel(level);
    
    // Add custom context
    if (context.user) {
      scope.setUser(context.user);
    }
    
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    if (context.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    
    // Add fingerprinting for similar errors
    if (context.fingerprint) {
      scope.setFingerprint(context.fingerprint);
    }
    
    return Sentry.captureException(error);
  });
}

/**
 * Capture a custom message with context
 * @param {string} message - The message to log
 * @param {Object} context - Additional context
 * @param {string} level - Message level
 */
export function captureMessageWithContext(message, context = {}, level = 'info') {
  return Sentry.withScope((scope) => {
    scope.setLevel(level);
    
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    if (context.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    
    return Sentry.captureMessage(message);
  });
}

/**
 * Track a performance span for monitoring slow operations
 * @param {string} operation - Name of the operation
 * @param {Function} callback - Function to execute and measure
 * @param {Object} data - Additional span data
 */
export async function trackPerformance(operation, callback, data = {}) {
  return await Sentry.startSpan(
    {
      name: operation,
      op: 'function',
      data: data,
    },
    async (span) => {
      try {
        const result = await callback();
        span.setStatus({ code: 1, message: 'ok' }); // Success
        return result;
      } catch (error) {
        span.setStatus({ code: 2, message: error.message }); // Error
        throw error;
      }
    }
  );
}

/**
 * Wrap an Express route handler with error tracking
 * @param {Function} handler - The route handler function
 */
export function wrapRouteHandler(handler) {
  return async (req, res, next) => {
    try {
      // Set request context
      Sentry.getCurrentScope().setContext('http', {
        method: req.method,
        url: req.url,
        query: req.query,
        headers: req.headers,
        ip: req.ip,
      });
      
      if (req.user) {
        Sentry.getCurrentScope().setUser({
          id: req.user.id,
          email: req.user.email,
          username: req.user.username,
        });
      }
      
      await handler(req, res, next);
    } catch (error) {
      captureErrorWithContext(error, {
        tags: {
          route: req.route?.path || req.path,
          method: req.method,
        },
        extra: {
          body: req.body,
          params: req.params,
          query: req.query,
        },
      });
      next(error);
    }
  };
}

/**
 * Monitor database operations
 * @param {string} operation - DB operation name
 * @param {Function} dbCallback - Database operation function
 */
export async function monitorDatabaseOperation(operation, dbCallback) {
  return await trackPerformance(`db.${operation}`, async () => {
    try {
      return await dbCallback();
    } catch (error) {
      captureErrorWithContext(error, {
        tags: {
          operation: 'database',
          dbOperation: operation,
        },
        fingerprint: [`db.${operation}`, error.message],
      });
      throw error;
    }
  });
}

/**
 * Monitor external API calls
 * @param {string} service - Service name (e.g., 'stripe', 'sendgrid')
 * @param {string} endpoint - API endpoint
 * @param {Function} apiCallback - API call function
 */
export async function monitorApiCall(service, endpoint, apiCallback) {
  return await trackPerformance(`http.${service}`, async () => {
    try {
      return await apiCallback();
    } catch (error) {
      captureErrorWithContext(error, {
        tags: {
          service: service,
          endpoint: endpoint,
          operation: 'external_api',
        },
        extra: {
          service: service,
          endpoint: endpoint,
        },
        fingerprint: [`api.${service}`, endpoint, error.message],
      });
      throw error;
    }
  }, {
    service: service,
    endpoint: endpoint,
  });
}

/**
 * Add breadcrumb for debugging
 * @param {string} message - Breadcrumb message
 * @param {string} category - Breadcrumb category
 * @param {string} level - Breadcrumb level
 * @param {Object} data - Additional data
 */
export function addBreadcrumb(message, category = 'custom', level = 'info', data = {}) {
  Sentry.addBreadcrumb({
    message: message,
    category: category,
    level: level,
    data: data,
    timestamp: Date.now() / 1000,
  });
}

export default {
  captureErrorWithContext,
  captureMessageWithContext,
  trackPerformance,
  wrapRouteHandler,
  monitorDatabaseOperation,
  monitorApiCall,
  addBreadcrumb,
};
