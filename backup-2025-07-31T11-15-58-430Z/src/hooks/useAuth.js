import { useState, useEffect } from 'react';
import authService from '../auth-service-enhanced';

/**
 * Custom React hook for authentication state management
 *
 * @returns {Object} - Contains:
 *   - user: Current authenticated user object or null
 *   - loading: Boolean indicating if auth state is being checked
 *   - error: Any authentication error that occurred
 *   - signIn: Function to sign in with email and password
 *   - signInWithGoogle: Function to sign in with Google
 *   - signUp: Function to create a new account
 *   - signOut: Function to sign out the current user
 *   - updateProfile: Function to update user profile
 *   - upgradeLicense: Function to upgrade user license tier
 */
function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChange(user => {
      setUser(user);
      setLoading(false);
      setError(null);
    });

    // Check for stored session on mount
    authService.checkStoredSession().catch(err => {
      console.error('Error checking stored session:', err);
      setError(err);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Auth methods wrapped with error handling
  const signIn = async (email, password) => {
    setError(null);
    try {
      const result = await authService.signInWithEmailAndPassword(email, password);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const result = await authService.signInWithGoogle();
      return result;
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  const signUp = async (email, password, displayName = null) => {
    setError(null);
    try {
      const result = await authService.signUpWithEmailAndPassword(email, password, displayName);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      await authService.signOut();
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  const updateProfile = async updates => {
    setError(null);
    try {
      const result = await authService.updateUserProfile(updates);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  const upgradeLicense = async tier => {
    setError(null);
    try {
      const result = await authService.upgradeLicenseTier(tier);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    updateProfile,
    upgradeLicense,
    // Direct access to auth service for advanced use cases
    authService,
  };
}

export default useAuth;
