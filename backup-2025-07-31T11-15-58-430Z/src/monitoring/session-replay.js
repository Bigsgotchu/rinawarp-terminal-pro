/**
 * Session Replay Integration
 * Supports LogRocket and Sentry Session Replay
 */

import LogRocket from 'logrocket';
import setupLogRocketReact from 'logrocket-react';
import * as Sentry from '@sentry/electron';

class SessionReplayService {
  constructor() {
    this.isInitialized = false;
    this.isElectron = typeof window !== 'undefined' && window.process && window.process.type;
    this.providers = {
      logrocket: null,
      sentry: null,
    };
  }

  /**
   * Initialize session replay services
   */
  async initialize() {
    try {
      // Initialize LogRocket
      if (process.env.LOGROCKET_APP_ID) {
        await this.initializeLogRocket();
      }

      // Initialize Sentry Session Replay
      if (process.env.SENTRY_DSN && process.env.ENABLE_SENTRY_REPLAY === 'true') {
        await this.initializeSentryReplay();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize session replay:', error);
    }
  }

  /**
   * Initialize LogRocket
   */
  async initializeLogRocket() {
    try {
      // Initialize LogRocket with your app ID
      LogRocket.init(process.env.LOGROCKET_APP_ID || 'xljdaq/rinawarp-terminal', {
        release: process.env.APP_VERSION || '1.0.6',
        console: {
          isEnabled: process.env.NODE_ENV !== 'production',
          shouldAggregateConsoleErrors: true,
        },
        network: {
          requestSanitizer: request => {
            // Sanitize sensitive headers
            if (request.headers) {
              delete request.headers['Authorization'];
              delete request.headers['Cookie'];
              delete request.headers['X-API-Key'];
            }
            return request;
          },
          responseSanitizer: response => {
            // Sanitize sensitive response data
            if (response.headers) {
              delete response.headers['Set-Cookie'];
            }
            return response;
          },
        },
        dom: {
          // Mask sensitive input fields
          inputSanitizer: true,
          textSanitizer: true,
          privateAttributeBlocklist: ['data-sensitive', 'data-private'],
        },
        shouldDebugLog: process.env.NODE_ENV === 'development',
        mergeIframes: false,
        // Electron-specific settings
        shouldParseXHRBlob: true,
      });

      // Integrate with Sentry
      if (typeof Sentry !== 'undefined' && Sentry.getCurrentHub) {
        LogRocket.getSessionURL(sessionURL => {
          Sentry.configureScope(scope => {
            scope.setExtra('sessionURL', sessionURL);
          });
        });
      }

      // Set up React integration if React is available
      if (typeof React !== 'undefined' || window.React) {
        try {
          setupLogRocketReact(LogRocket);
          console.log('✅ LogRocket React integration enabled');
        } catch (error) {
          console.warn('⚠️ LogRocket React integration not available:', error.message);
        }
      }

      this.providers.logrocket = LogRocket;
    } catch (error) {
      console.error('❌ Failed to initialize LogRocket:', error);
    }
  }

  /**
   * Initialize Sentry Session Replay
   */
  async initializeSentryReplay() {
    try {
      // Sentry Replay is configured in the main Sentry initialization
      // Here we just add additional replay-specific configuration
      Sentry.setTag('replay.enabled', true);

      this.providers.sentry = true;
      console.log('✅ Sentry session replay enabled');
    } catch (error) {
      console.error('❌ Failed to initialize Sentry replay:', error);
    }
  }

  /**
   * Identify user for session replay
   */
  identify(userId, userInfo = {}) {
    if (!this.isInitialized) return;

    // Identify in LogRocket
    if (this.providers.logrocket) {
      this.providers.logrocket.identify(userId, {
        ...userInfo,
        // Add terminal-specific metadata
        terminalVersion: process.env.APP_VERSION || '1.0.6',
        platform: process.platform,
        electronVersion: process.versions?.electron,
        licenseTier: userInfo.licenseTier || 'trial',
        firstSeen: userInfo.firstSeen || new Date().toISOString(),
      });
    }

    // Set user in Sentry
    if (this.providers.sentry) {
      Sentry.setUser({
        id: userId,
        ...userInfo,
      });
    }

    // Track user identification event
    this.track('User Identified', {
      userId,
      method: userInfo.method || 'manual',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track custom events
   */
  track(eventName, properties = {}) {
    if (!this.isInitialized) return;

    // Track in LogRocket
    if (this.providers.logrocket) {
      this.providers.logrocket.track(eventName, properties);
    }

    // Add breadcrumb in Sentry
    if (this.providers.sentry) {
      Sentry.addBreadcrumb({
        message: eventName,
        category: 'user',
        level: 'info',
        data: properties,
      });
    }
  }

  /**
   * Capture exception with session context
   */
  captureException(error, context = {}) {
    if (!this.isInitialized) return;

    // Capture in LogRocket
    if (this.providers.logrocket) {
      this.providers.logrocket.captureException(error, {
        tags: context.tags || {},
        extra: context.extra || {},
      });
    }

    // Capture in Sentry (already integrated)
    if (this.providers.sentry) {
      Sentry.captureException(error, {
        contexts: {
          session_replay: {
            provider: 'logrocket',
            session_url: this.getSessionURL(),
          },
        },
        ...context,
      });
    }
  }

  /**
   * Get current session URL
   */
  getSessionURL() {
    if (this.providers.logrocket) {
      return new Promise(resolve => {
        this.providers.logrocket.getSessionURL(url => resolve(url));
      });
    }
    return Promise.resolve(null);
  }

  /**
   * Start a new session
   */
  newSession() {
    if (this.providers.logrocket) {
      // LogRocket doesn't support manual session management in the same way
      // But we can track it as an event
      this.track('session.new', {
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Stop session recording
   */
  stop() {
    // LogRocket doesn't provide a stop method
    // But we can track the session end
    this.track('session.end', {
      timestamp: new Date().toISOString(),
    });
  }
}

// Export singleton instance
export default new SessionReplayService();
