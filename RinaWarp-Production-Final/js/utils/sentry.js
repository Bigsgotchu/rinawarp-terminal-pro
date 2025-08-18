/**
 * RinaWarp Terminal - Sentry Error Monitoring Configuration
 * Properly configured Sentry integration for Electron applications
 */

import * as Sentry from '@sentry/electron/renderer';

/**
 * Initialize Sentry for error monitoring and performance tracking
 */
export function initSentry() {
  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN || 'https://your-sentry-dsn-here@sentry.io/project-id',
      environment: process.env.NODE_ENV || 'development',

      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Release tracking
      release: process.env.npm_package_version || '3.0.0-creator',

      // Basic integrations for Electron
      integrations: [
        // Only include integrations that are available
        Sentry.browserTracingIntegration ? Sentry.browserTracingIntegration() : null,
      ].filter(Boolean),

      // Filter out noise
      beforeSend(event, hint) {
        // Don't send events in development unless explicitly enabled
        if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_ENABLE_DEV) {
          return null;
        }

        // Filter out known non-issues
        if (event.exception) {
          const error = hint.originalException;
          if (error?.message?.includes('ResizeObserver loop limit exceeded')) {
            return null; // Common non-critical error
          }
        }

        return event;
      },

      // Configure context
      initialScope: {
        tags: {
          app: 'rinawarp-terminal',
          edition: 'creator',
          platform: process.platform,
        },
        user: {
          // Add user context if available
          id: 'anonymous',
        },
        contexts: {
          app: {
            name: 'RinaWarp Terminal Creator Edition',
            version: '3.0.0',
          },
        },
      },
    });

    console.log('✅ Sentry monitoring initialized');
    return true;
  } catch (error) {
    console.warn('⚠️ Failed to initialize Sentry:', error.message);
    return false;
  }
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(userInfo) {
  Sentry.setUser({
    id: userInfo.id || 'anonymous',
    email: userInfo.email,
    username: userInfo.username,
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addSentryBreadcrumb(message, category = 'default', level = 'info') {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture exception with additional context
 */
export function captureException(error, context = {}) {
  Sentry.withScope(scope => {
    // Add additional context
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

    if (context.level) {
      scope.setLevel(context.level);
    }

    Sentry.captureException(error);
  });
}

/**
 * Capture custom message
 */
export function captureMessage(message, level = 'info', context = {}) {
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

    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
}

/**
 * Start a new transaction for performance monitoring
 */
export function startTransaction(name, op = 'navigation') {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Configure Sentry for main process (Electron main)
 */
export function initSentryMain() {
  if (process.type !== 'browser') return;

  try {
    Sentry.init({
      dsn: process.env.SENTRY_DSN || 'https://your-sentry-dsn-here@sentry.io/project-id',
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      beforeSend(event, hint) {
        if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_ENABLE_DEV) {
          return null;
        }
        return event;
      },

      initialScope: {
        tags: {
          process: 'main',
          app: 'rinawarp-terminal',
          platform: process.platform,
        },
      },
    });

    console.log('✅ Sentry main process monitoring initialized');
    return true;
  } catch (error) {
    console.warn('⚠️ Failed to initialize Sentry for main process:', error.message);
    return false;
  }
}

export default {
  initSentry,
  initSentryMain,
  setSentryUser,
  addSentryBreadcrumb,
  captureException,
  captureMessage,
  startTransaction,
};
