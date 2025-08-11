/**
 * Enhanced Sentry Utilities for RinaWarp Terminal (ES Module version)
 * Provides comprehensive error monitoring, performance tracking, and user insights
 */

import * as Sentry from '@sentry/node';

export class SentryUtils {
  /**
   * Set user context for better error tracking
   * @param {Object} userInfo - User information
   */
  static setUserContext(userInfo) {
    Sentry.setUser({
      id: userInfo.id || userInfo.username || 'anonymous',
      username: userInfo.username,
      email: userInfo.email,
      ip_address: userInfo.ipAddress || '{{auto}}',
      // Custom fields
      platform: process.platform,
      nodeVersion: process.version,
      appVersion: process.env.APP_VERSION || '1.3.0',
      licenseType: process.env.RINAWARP_LICENSE_TIER || 'standard',
      creatorMode: process.env.RINAWARP_CREATOR_MODE === 'true',
    });
  }

  /**
   * Track command execution with enhanced monitoring
   * @param {string} command - Command being executed
   * @param {Function} operation - Async operation to track
   * @returns {Promise} Result of the operation
   */
  static async trackCommand(command, operation) {
    return Sentry.startSpan(
      {
        name: `command.${command}`,
        op: 'terminal.command',
        attributes: {
          'command.name': command,
          platform: process.platform,
          timestamp: new Date().toISOString(),
        },
      },
      async span => {
        try {
          const result = await operation();
          span.setStatus({ code: 1 }); // OK
          return result;
        } catch (error) {
          span.setStatus({ code: 2 }); // ERROR
          Sentry.captureException(error, {
            tags: {
              commandType: 'terminal_command',
              command: command,
            },
            contexts: {
              command: {
                name: command,
                platform: process.platform,
                timestamp: new Date().toISOString(),
              },
            },
          });
          throw error;
        }
      }
    );
  }

  /**
   * Track API calls with performance monitoring
   * @param {string} apiName - Name of the API
   * @param {string} endpoint - API endpoint
   * @param {Function} operation - API operation
   * @returns {Promise} API response
   */
  static async trackApiCall(apiName, endpoint, operation) {
    return Sentry.startSpan(
      {
        name: `api.${apiName}`,
        op: 'http.client',
        attributes: {
          'http.url': endpoint,
          'api.name': apiName,
        },
      },
      async span => {
        try {
          const result = await operation();
          span.setStatus({ code: 1 });
          return result;
        } catch (error) {
          span.setStatus({ code: 2 });
          Sentry.captureException(error, {
            tags: {
              apiName,
              endpoint,
              errorType: 'api_error',
            },
          });
          throw error;
        }
      }
    );
  }

  /**
   * Capture exception with enhanced context
   * @param {Error} error - Error to capture
   * @param {Object} context - Additional context
   */
  static captureException(error, context = {}) {
    const enhancedContext = {
      ...context,
      extra: {
        ...context.extra,
        timestamp: new Date().toISOString(),
        platform: process.platform,
        nodeVersion: process.version,
        appVersion: process.env.APP_VERSION || '1.3.0',
        creatorMode: process.env.RINAWARP_CREATOR_MODE === 'true',
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      },
    };

    Sentry.captureException(error, enhancedContext);
  }

  /**
   * Track user interactions and feature usage
   * @param {string} feature - Feature name
   * @param {Object} data - Usage data
   */
  static trackFeatureUsage(feature, data = {}) {
    Sentry.addBreadcrumb({
      category: 'feature',
      message: `User used feature: ${feature}`,
      level: 'info',
      data: {
        feature,
        ...data,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Measure performance of critical operations
   * @param {string} name - Operation name
   * @param {Function} operation - Operation to monitor
   * @returns {Promise} Operation result
   */
  static async measurePerformance(name, operation) {
    return Sentry.startSpan(
      {
        name,
        op: 'performance',
        attributes: {
          'operation.name': name,
          platform: process.platform,
        },
      },
      async span => {
        const startTime = Date.now();

        try {
          const result = await operation();
          const duration = Date.now() - startTime;

          span.setMeasurement(`${name}.duration`, duration, 'millisecond');
          span.setStatus({ code: 1 });

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          span.setMeasurement(`${name}.error_duration`, duration, 'millisecond');

          span.setStatus({ code: 2 });
          this.captureException(error, {
            tags: { operationType: 'performance_measurement' },
            extra: { operationName: name, duration },
          });
          throw error;
        }
      }
    );
  }

  /**
   * Setup automatic error boundaries for async operations
   * @param {Function} operation - Async operation
   * @param {string} operationName - Name for tracking
   * @returns {Promise} Operation result with error handling
   */
  static async withErrorBoundary(operation, operationName) {
    try {
      return await operation();
    } catch (error) {
      this.captureException(error, {
        tags: {
          errorBoundary: true,
          operation: operationName,
        },
        level: 'error',
      });

      // Re-throw to maintain normal error flow
      throw error;
    }
  }

  /**
   * Flush all pending events to Sentry
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<boolean>} Success status
   */
  static async flush(timeout = 5000) {
    return Sentry.flush(timeout);
  }
}

export default SentryUtils;
