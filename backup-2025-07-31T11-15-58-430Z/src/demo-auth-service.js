// Example Usage of Enhanced Authentication Service

import logger from './utils/logger.js';
import authService from './auth-service-enhanced.js';

// Function to demonstrate the auth service
demoAuthServiceUsage();

async function demoAuthServiceUsage() {
  try {
    // Sign up a new user
    authService.signUp('user@example.com', 'password', 'John Doe').then(result => {
      logger.info('Sign Up Result:', result);
    });

    // Simulate waiting for the signup process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Sign in existing user
    authService.signIn('user@example.com', 'password').then(result => {
      logger.info('Sign In Result:', result);
    });

    // Simulate waiting for the login process
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if user is authenticated
    if (authService.isAuthenticated()) {
      const user = authService.getCurrentUser();
      logger.info('Current User:', user);
    }

    // Sign out
    authService.signOut().then(result => {
      logger.info('Sign Out Result:', result);
    });
  } catch (error) {
    logger.error('Auth Service Demo Error:', error);
  }
}
