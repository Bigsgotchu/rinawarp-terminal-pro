/**
 * Direct LogRocket Initialization
 * This file immediately initializes LogRocket when imported
 */

import LogRocket from 'logrocket';
import setupLogRocketReact from 'logrocket-react';

// Initialize LogRocket immediately
try {
  LogRocket.init('xljdaq/rinawarp-terminal', {
    release: '1.0.6',
    console: {
      isEnabled: true,
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
    },
    dom: {
      inputSanitizer: true,
      textSanitizer: true,
    },
    shouldDebugLog: true,
  });

  console.log('✅ LogRocket initialized successfully!');

  // Set up React integration if available
  if (typeof React !== 'undefined' || window.React) {
    try {
      setupLogRocketReact(LogRocket);
    } catch (error) {
      console.warn('⚠️ LogRocket React integration not available:', error.message);
    }
  }

  // Track initial session
  LogRocket.track('Application Started', {
    version: '1.0.6',
    platform: typeof process !== 'undefined' ? process.platform : 'web',
    timestamp: new Date().toISOString(),
  });

  // Log session URL for debugging
  LogRocket.getSessionURL(sessionURL => {});

  // Make LogRocket globally available
  window.LogRocket = LogRocket;
} catch (error) {
  console.error('❌ Failed to initialize LogRocket:', error);
}

export default LogRocket;
