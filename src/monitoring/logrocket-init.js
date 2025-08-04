import logger from '../utils/logger.js';
/**
 * LogRocket Initialization
 * This file initializes LogRocket for session replay and monitoring
 */

import LogRocket from 'logrocket';

// Initialize LogRocket with your app ID
export function initializeLogRocket() {
  try {
    LogRocket.init('xljdaq/rinawarp-terminal', {
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

    logger.debug('✅ LogRocket initialized successfully');
    return LogRocket;
  } catch (error) {
    console.error('❌ Failed to initialize LogRocket:', error);
    return null;
  }
}

// Export LogRocket instance
export default LogRocket;
