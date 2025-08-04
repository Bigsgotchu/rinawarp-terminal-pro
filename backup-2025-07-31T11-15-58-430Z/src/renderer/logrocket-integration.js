/**
 * LogRocket Integration for RinaWarp Terminal
 * Initializes LogRocket session replay and monitoring
 */

import LogRocket from 'logrocket';

// Initialize LogRocket as soon as this module is imported
function initializeLogRocket() {
  try {
    // Check if we're in a browser/renderer environment
    if (typeof window === 'undefined') {
      console.log('⚠️ LogRocket can only be initialized in the renderer process');
      return;
    }

    // Initialize LogRocket with your app ID
    LogRocket.init('xljdaq/rinawarp-terminal');

    console.log('✅ LogRocket initialized successfully');

    // Optional: Identify user if you have user information
    // LogRocket.identify('user-id', {
    //   name: 'User Name',
    //   email: 'user@example.com',
    // });

    // Optional: Track custom events
    LogRocket.track('Terminal Started', {
      version: process.env.APP_VERSION || '1.0.6',
      platform: process.platform,
    });
  } catch (error) {
    console.error('❌ Failed to initialize LogRocket:', error);
  }
}

// Initialize LogRocket immediately
initializeLogRocket();

// Export LogRocket for use in other modules
export default LogRocket;
