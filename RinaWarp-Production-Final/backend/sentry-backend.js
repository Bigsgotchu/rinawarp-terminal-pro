/**
 * RinaWarp Terminal - Sentry Configuration for Node.js Backend API
 * This file should be imported in your backend server.js
 */

const Sentry = require('@sentry/node');

/**
 * Initialize Sentry for the Node.js backend
 */
function initSentryBackend() {
  try {
    Sentry.init({
      dsn:
        process.env.SENTRY_DSN_BACKEND ||
        process.env.SENTRY_DSN ||
        'https://your-backend-dsn-here@sentry.io/project-id',
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',

      // Integrations
      integrations: [Sentry.expressIntegration(), Sentry.httpIntegration()],

      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Release tracking
      release: require('./package.json').version || '1.0.0',

      // Filter events
      beforeSend(event, hint) {
        // Don't send events in development unless explicitly enabled
        if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_ENABLE_DEV) {
          return null;
        }
        return event;
      },

      // Set initial scope
      initialScope: {
        tags: {
          component: 'backend-api',
          app: 'rinawarp-terminal-api',
          platform: process.platform,
          nodeVersion: process.version,
        },
        contexts: {
          app: {
            name: 'RinaWarp Terminal API',
            version: require('./package.json').version || '1.0.0',
          },
          runtime: {
            name: 'node',
            version: process.version,
          },
        },
      },
    });

    console.log('✅ Sentry backend API monitoring initialized');
    return true;
  } catch (error) {
    console.warn('⚠️ Failed to initialize Sentry for backend:', error.message);
    return false;
  }
}

/**
 * Capture exception in backend
 */
function captureBackendException(error, context = {}) {
  try {
    Sentry.withScope(scope => {
      if (context.tags) {
        Object.keys(context.tags).forEach(key => {
          scope.setTag(key, context.tags[key]);
        });
      }

      if (context.extra) {
        Object.keys(context.extra).forEach(key => {
          scope.setExtra(key, context.extra[key]);
        });
      }

      scope.setTag('component', 'backend-api');
      Sentry.captureException(error);
    });
  } catch (sentryError) {
    console.warn('⚠️ Failed to capture exception in Sentry:', sentryError.message);
  }
}

/**
 * Capture message in backend
 */
function captureBackendMessage(message, level = 'info', context = {}) {
  try {
    Sentry.withScope(scope => {
      if (context.tags) {
        Object.keys(context.tags).forEach(key => {
          scope.setTag(key, context.tags[key]);
        });
      }

      if (context.extra) {
        Object.keys(context.extra).forEach(key => {
          scope.setExtra(key, context.extra[key]);
        });
      }

      scope.setTag('component', 'backend-api');
      scope.setLevel(level);
      Sentry.captureMessage(message);
    });
  } catch (sentryError) {
    console.warn('⚠️ Failed to capture message in Sentry:', sentryError.message);
  }
}

/**
 * Express middleware for automatic error capturing
 */
function sentryErrorHandler() {
  return Sentry.expressErrorHandler();
}

/**
 * Express middleware for request tracing (integration)
 */
function sentryRequestHandler() {
  // Return a no-op middleware since the expressIntegration handles this
  return (req, res, next) => next();
}

module.exports = {
  initSentryBackend,
  captureBackendException,
  captureBackendMessage,
  sentryErrorHandler,
  sentryRequestHandler,
  Sentry,
};
