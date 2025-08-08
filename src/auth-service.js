import logger from './utilities/logger.js';

/**
 * Authentication Service (Non-Firebase)
 * Simple authentication service without Firebase dependencies
 */

class AuthService {
  constructor() {
    this.currentUser = null;
    this.authStateListeners = [];
    this.isAuthenticatedState = false;
  }

  // Mock authentication methods
  async signUp(email, password, _displayName = '') {
    logger.info('Auth: Sign up called (Firebase removed)');
    return { success: false, error: 'Authentication service disabled (Firebase removed)' };
  }

  async signIn(_email, _password) {
    logger.info('Auth: Sign in called (Firebase removed)');
    return { success: false, error: 'Authentication service disabled (Firebase removed)' };
  }

  async signInWithGoogle() {
    logger.info('Auth: Google sign in called (Firebase removed)');
    return { success: false, error: 'Authentication service disabled (Firebase removed)' };
  }

  async signOut() {
    logger.info('Auth: Sign out called (Firebase removed)');
    this.currentUser = null;
    this.isAuthenticatedState = false;
    this.authStateListeners.forEach(callback => callback(null));
    return { success: true };
  }

  async resetPassword(_email) {
    logger.info('Auth: Password reset called (Firebase removed)');
    return { success: false, error: 'Authentication service disabled (Firebase removed)' };
  }

  // Utility methods
  isAuthenticated() {
    return this.isAuthenticatedState;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getUserId() {
    return this.currentUser ? this.currentUser.uid : null;
  }

  getUserEmail() {
    return this.currentUser ? this.currentUser.email : null;
  }

  getUserDisplayName() {
    return this.currentUser ? this.currentUser.displayName : null;
  }

  // Listen for auth state changes
  onAuthStateChange(callback) {
    this.authStateListeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }
}

// Export singleton instance
export const authService = new AuthService();
