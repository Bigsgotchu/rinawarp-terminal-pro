/**
 * RinaWarp Terminal - Sentry Configuration for Electron Main Process
 * This file should be imported in the main Electron process (main.js)
 */

const Sentry = require('@sentry/electron/main');

/**
 * Initialize Sentry for the main Electron process
 */
function initSentryMain() {
  try {
    Sentry.init({
      dsn:
        process.env.SENTRY_DSN_ELECTRON ||
        process.env.SENTRY_DSN ||
        'https://your-electron-dsn-here@sentry.io/project-id',
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',

      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Release tracking
      release: process.env.SENTRY_RELEASE || require('./package.json').version || '3.0.0',

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
          process: 'main',
          app: 'rinawarp-terminal',
          platform: process.platform,
          arch: process.arch,
          version: process.versions.electron,
        },
        contexts: {
          app: {
            name: 'RinaWarp Terminal Creator Edition',
            version: require('./package.json').version || '3.0.0',
          },
          runtime: {
            name: 'electron',
            version: process.versions.electron,
          },
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

/**
 * Capture exception in main process
 */
function captureMainException(error, context = {}) {
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

      scope.setTag('process', 'main');
      Sentry.captureException(error);
    });
  } catch (sentryError) {
    console.warn('⚠️ Failed to capture exception in Sentry:', sentryError.message);
  }
}

/**
 * Capture message in main process
 */
function captureMainMessage(message, level = 'info', context = {}) {
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

      scope.setTag('process', 'main');
      scope.setLevel(level);
      Sentry.captureMessage(message);
    });
  } catch (sentryError) {
    console.warn('⚠️ Failed to capture message in Sentry:', sentryError.message);
  }
}

module.exports = {
  initSentryMain,
  captureMainException,
  captureMainMessage,
  Sentry,
};
