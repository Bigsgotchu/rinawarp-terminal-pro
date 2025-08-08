/**
 * Enhanced Authentication Service with User Identification
 * Integrates with monitoring services for user tracking
 */

import logger from './utilities/logger.js';
import userIdentificationService from './monitoring/user-identification.js';
import sessionReplayService from './monitoring/session-replay.js';

class EnhancedAuthService {
  constructor() {
    this.currentUser = null;
    this.authStateListeners = [];
    this.isAuthenticatedState = false;

    // Initialize session replay on service creation
    this.initializeMonitoring();
  }

  async initializeMonitoring() {
    try {
      await sessionReplayService.initialize();
      logger.info('Monitoring services initialized for auth');
    } catch (error) {
      logger.error('Failed to initialize monitoring services:', error);
    }
  }

  /**
   * Sign up a new user
   */
  async signUp(email, password, displayName = '') {
    try {
      logger.info('Auth: Sign up initiated', { email, displayName });

      // For demo purposes, create a mock user
      const userId = `user_${Date.now()}`;
      const user = {
        uid: userId,
        email,
        displayName,
        createdAt: new Date().toISOString(),
        metadata: {
          creationTime: new Date().toISOString(),
          lastSignInTime: new Date().toISOString(),
        },
      };

      // Set current user
      this.currentUser = user;
      this.isAuthenticatedState = true;

      // Identify user in monitoring services
      await userIdentificationService.identifyUser(userId, {
        email,
        name: displayName,
        isNewUser: true,
        method: 'email_signup',
        createdAt: user.createdAt,
      });

      // Track signup event
      userIdentificationService.trackUserEvent('User Signup', {
        method: 'email',
        success: true,
      });

      // Notify listeners
      this.authStateListeners.forEach(callback => callback(user));

      logger.info('Auth: Sign up successful', { userId });
      return { success: true, user };
    } catch (error) {
      logger.error('Auth: Sign up failed', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sign in an existing user
   */
  async signIn(email, _password) {
    try {
      logger.info('Auth: Sign in initiated', { email });

      // For demo purposes, create a mock user
      const userId = `user_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const user = {
        uid: userId,
        email,
        displayName: email.split('@')[0],
        metadata: {
          lastSignInTime: new Date().toISOString(),
        },
      };

      // Set current user
      this.currentUser = user;
      this.isAuthenticatedState = true;

      // Identify user in monitoring services
      await userIdentificationService.identifyUser(userId, {
        email,
        name: user.displayName,
        method: 'email_signin',
        lastLogin: user.metadata.lastSignInTime,
      });

      // Track signin event
      userIdentificationService.trackUserEvent('User Login', {
        method: 'email',
        success: true,
      });

      // Notify listeners
      this.authStateListeners.forEach(callback => callback(user));

      logger.info('Auth: Sign in successful', { userId });
      return { success: true, user };
    } catch (error) {
      logger.error('Auth: Sign in failed', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sign in with Google (OAuth simulation)
   */
  async signInWithGoogle() {
    try {
      logger.info('Auth: Google sign in initiated');

      // Simulate OAuth flow
      const googleUser = {
        uid: `google_${Date.now()}`,
        email: `user${Date.now()}@gmail.com`,
        displayName: 'Google User',
        photoURL: 'https://example.com/photo.jpg',
        providerId: 'google.com',
        metadata: {
          lastSignInTime: new Date().toISOString(),
        },
      };

      // Set current user
      this.currentUser = googleUser;
      this.isAuthenticatedState = true;

      // Identify user in monitoring services
      await userIdentificationService.identifyUser(googleUser.uid, {
        email: googleUser.email,
        name: googleUser.displayName,
        method: 'google_oauth',
        provider: 'google',
        photoURL: googleUser.photoURL,
      });

      // Track OAuth signin event
      userIdentificationService.trackUserEvent('User Login', {
        method: 'google_oauth',
        success: true,
      });

      // Notify listeners
      this.authStateListeners.forEach(callback => callback(googleUser));

      logger.info('Auth: Google sign in successful', { userId: googleUser.uid });
      return { success: true, user: googleUser };
    } catch (error) {
      logger.error('Auth: Google sign in failed', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sign out the current user
   */
  async signOut() {
    try {
      logger.info('Auth: Sign out initiated');

      // Track signout event before clearing
      if (this.currentUser) {
        userIdentificationService.trackUserEvent('User Logout', {
          userId: this.currentUser.uid,
          sessionDuration: this.getSessionDuration(),
        });
      }

      // Clear user identification
      userIdentificationService.clearUser();

      // Clear local state
      this.currentUser = null;
      this.isAuthenticatedState = false;

      // Notify listeners
      this.authStateListeners.forEach(callback => callback(null));

      logger.info('Auth: Sign out successful');
      return { success: true };
    } catch (error) {
      logger.error('Auth: Sign out failed', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates) {
    if (!this.currentUser) {
      return { success: false, error: 'No user logged in' };
    }

    try {
      // Update local user object
      this.currentUser = { ...this.currentUser, ...updates };

      // Update user properties in monitoring services
      userIdentificationService.updateUserProperties(updates);

      // Track profile update
      userIdentificationService.trackUserEvent('Profile Updated', {
        updates: Object.keys(updates),
      });

      logger.info('Auth: Profile updated', { userId: this.currentUser.uid });
      return { success: true, user: this.currentUser };
    } catch (error) {
      logger.error('Auth: Profile update failed', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update user's license tier
   */
  async updateLicenseTier(tier) {
    if (!this.currentUser) {
      return { success: false, error: 'No user logged in' };
    }

    try {
      // Update license tier
      const updates = { licenseTier: tier };

      // Update in monitoring services
      userIdentificationService.updateUserProperties(updates);

      // Track license change
      userIdentificationService.trackUserEvent('License Tier Changed', {
        oldTier: this.currentUser.licenseTier || 'trial',
        newTier: tier,
      });

      // Update local user
      this.currentUser.licenseTier = tier;

      logger.info('Auth: License tier updated', { userId: this.currentUser.uid, tier });
      return { success: true };
    } catch (error) {
      logger.error('Auth: License tier update failed', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reset password (mock implementation)
   */
  async resetPassword(email) {
    try {
      logger.info('Auth: Password reset requested', { email });

      // Track password reset request
      userIdentificationService.trackUserEvent('Password Reset Requested', {
        email,
        timestamp: new Date().toISOString(),
      });

      // In a real implementation, this would send an email
      return {
        success: true,
        message: 'Password reset email sent (simulated)',
      };
    } catch (error) {
      logger.error('Auth: Password reset failed', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get session duration for analytics
   */
  getSessionDuration() {
    if (!this.currentUser || !this.currentUser.metadata?.lastSignInTime) {
      return 0;
    }

    const signInTime = new Date(this.currentUser.metadata.lastSignInTime);
    const now = new Date();
    return Math.floor((now - signInTime) / 1000); // Duration in seconds
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.isAuthenticatedState && this.currentUser !== null;
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Get user ID
   */
  getUserId() {
    return this.currentUser?.uid || null;
  }

  /**
   * Get user email
   */
  getUserEmail() {
    return this.currentUser?.email || null;
  }

  /**
   * Get user display name
   */
  getUserDisplayName() {
    return this.currentUser?.displayName || null;
  }

  /**
   * Listen for auth state changes
   */
  onAuthStateChange(callback) {
    this.authStateListeners.push(callback);

    // Call immediately with current state
    callback(this.currentUser);

    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Check and restore session from storage
   */
  async checkStoredSession() {
    try {
      const storedSession = localStorage.getItem('rinawarp_auth_session');
      if (storedSession) {
        const sessionData = JSON.parse(storedSession);

        // Check if session is still valid (24 hours)
        const sessionAge = Date.now() - new Date(sessionData.timestamp).getTime();
        if (sessionAge < 24 * 60 * 60 * 1000) {
          // Restore session
          this.currentUser = sessionData.user;
          this.isAuthenticatedState = true;

          // Re-identify user
          await userIdentificationService.identifyUser(sessionData.user.uid, {
            email: sessionData.user.email,
            name: sessionData.user.displayName,
            method: 'session_restore',
          });

          // Notify listeners
          this.authStateListeners.forEach(callback => callback(this.currentUser));

          logger.info('Auth: Session restored', { userId: sessionData.user.uid });
          return true;
        } else {
          // Session expired
          localStorage.removeItem('rinawarp_auth_session');
        }
      }
    } catch (error) {
      logger.error('Auth: Failed to restore session', error);
    }
    return false;
  }

  /**
   * Save session to storage
   */
  saveSession() {
    if (this.currentUser) {
      const sessionData = {
        user: this.currentUser,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem('rinawarp_auth_session', JSON.stringify(sessionData));
    }
  }
}

// Export singleton instance
export const enhancedAuthService = new EnhancedAuthService();
export default enhancedAuthService;
