import React, { createContext, useContext } from 'react';
import useAuth from '../hooks/useAuth';

// Create the Auth Context
const AuthContext = createContext(null);

/**
 * AuthProvider component that wraps the entire app
 * Provides authentication context to all child components
 */
export function AuthProvider({ children }) {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to access auth context
 * Must be used within AuthProvider
 */
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

export default AuthProvider;
