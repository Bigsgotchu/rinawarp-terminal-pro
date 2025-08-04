import logger from '../utils/logger.js';
/**
 * User Identification Service
 * Handles user identification across all monitoring and analytics services
 */

import sessionReplayService from './session-replay.js';
import * as Sentry from '@sentry/electron';

class UserIdentificationService {
  constructor() {
    this.currentUser = null;
    this.identificationHandlers = new Set();
  }

  /**
   * Register a handler to be called when a user is identified
   */
  onUserIdentified(handler) {
    this.identificationHandlers.add(handler);

    // If user is already identified, call handler immediately
    if (this.currentUser) {
      handler(this.currentUser);
    }
  }

  /**
   * Identify user across all monitoring services
   */
  async identifyUser(userId, userInfo = {}) {
    // Prepare user data
    const userData = {
      id: userId,
      email: userInfo.email,
      name: userInfo.name,
      licenseTier: userInfo.licenseTier || 'trial',
      createdAt: userInfo.createdAt || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      // Additional metadata
      organizationId: userInfo.organizationId,
      organizationName: userInfo.organizationName,
      role: userInfo.role || 'user',
      features: userInfo.features || [],
      // Usage stats
      totalSessions: userInfo.totalSessions || 0,
      totalCommands: userInfo.totalCommands || 0,
      favoriteTheme: userInfo.favoriteTheme || 'mermaid',
    };

    // Store current user
    this.currentUser = userData;

    try {
      // 1. Identify in LogRocket/Sentry via session replay service
      sessionReplayService.identify(userId, userData);

      // 2. Identify in Google Analytics
      if (window.gtag) {
        window.gtag('config', window.GA4_MEASUREMENT_ID || 'G-G424CV5GGT', {
          user_id: userId,
          user_properties: {
            license_tier: userData.licenseTier,
            organization_id: userData.organizationId,
            role: userData.role,
          },
        });
        logger.debug('✅ User identified in Google Analytics');
      }

      // 3. Identify in Mixpanel (if configured)
      if (window.mixpanel) {
        window.mixpanel.identify(userId);
        window.mixpanel.people.set({
          $email: userData.email,
          $name: userData.name,
          license_tier: userData.licenseTier,
          organization: userData.organizationName,
          created_at: userData.createdAt,
          last_login: userData.lastLogin,
        });

        // Add LogRocket session URL to Mixpanel
        if (window.LogRocket) {
          window.LogRocket.getSessionURL(sessionURL => {
            window.mixpanel.track('LogRocket Session', {
              sessionURL: sessionURL,
              userId: userId,
            });
          });
        }
      }

      // 4. Set user context in Sentry directly
      if (Sentry && Sentry.setUser) {
        Sentry.setUser({
          id: userId,
          email: userData.email,
          username: userData.name,
          ip_address: '{{auto}}', // Let Sentry determine IP
        });

        Sentry.setContext('user_metadata', {
          licenseTier: userData.licenseTier,
          organization: userData.organizationName,
          role: userData.role,
        });
        logger.debug('✅ User identified in Sentry');
      }

      // 5. Call all registered handlers
      this.identificationHandlers.forEach(handler => {
        try {
          handler(userData);
        } catch (error) {
          console.error('Error in user identification handler:', error);
        }
      });

      // 6. Track identification event
      this.trackUserEvent('User Login', {
        method: userInfo.method || 'standard',
        isNewUser: userInfo.isNewUser || false,
      });

      return true;
    } catch (error) {
      console.error('Error identifying user:', error);
      Sentry.captureException(error, {
        tags: { component: 'user-identification' },
        extra: { userId, userInfo },
      });
      return false;
    }
  }

  /**
   * Clear user identification (logout)
   */
  clearUser() {
    this.currentUser = null;

    // Clear from LogRocket
    if (window.LogRocket && window.LogRocket.identify) {
      // LogRocket doesn't have a clear method, so we track logout
      window.LogRocket.track('User Logout', {
        timestamp: new Date().toISOString(),
      });
    }

    // Clear from Sentry
    if (Sentry && Sentry.setUser) {
      Sentry.setUser(null);
    }

    // Clear from Mixpanel
    if (window.mixpanel && window.mixpanel.reset) {
      window.mixpanel.reset();
    }

    logger.debug('✅ User identification cleared');
  }

  /**
   * Track user-specific events
   */
  trackUserEvent(eventName, properties = {}) {
    if (!this.currentUser) return;

    const eventData = {
      ...properties,
      userId: this.currentUser.id,
      licenseTier: this.currentUser.licenseTier,
      timestamp: new Date().toISOString(),
    };

    // Track in LogRocket
    if (window.LogRocket) {
      window.LogRocket.track(eventName, eventData);
    }

    // Track in Google Analytics
    if (window.gtag) {
      window.gtag('event', eventName.toLowerCase().replace(/\s+/g, '_'), {
        event_category: 'user_action',
        event_label: this.currentUser.id,
        value: properties.value || 1,
        ...eventData,
      });
    }

    // Track in Mixpanel
    if (window.mixpanel) {
      window.mixpanel.track(eventName, eventData);
    }
  }

  /**
   * Update user properties
   */
  updateUserProperties(properties) {
    if (!this.currentUser) return;

    // Update local user object
    this.currentUser = { ...this.currentUser, ...properties };

    // Update in Mixpanel
    if (window.mixpanel && window.mixpanel.people) {
      window.mixpanel.people.set(properties);
    }

    // Update in LogRocket
    if (window.LogRocket) {
      window.LogRocket.track('User Properties Updated', properties);
    }

    // Update Sentry context
    if (Sentry && Sentry.setContext) {
      Sentry.setContext('user_metadata', {
        ...this.currentUser,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is identified
   */
  isIdentified() {
    return this.currentUser !== null;
  }
}

// Export singleton instance
export default new UserIdentificationService();
