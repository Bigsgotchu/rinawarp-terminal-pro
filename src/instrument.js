/**
 * Sentry Performance Monitoring and Tracing Instrumentation
 * This file must be imported at the very top of your application
 */

import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

// Initialize Sentry with performance monitoring
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  release: process.env.APP_VERSION || '1.0.6',

  // Performance Monitoring
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,

  // Profiling - enabled
  profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE) || 0.1,

  // Set sample rates
  sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE) || 1.0,

  // Integrations
  integrations: [
    // Automatically instrument Node.js libraries and frameworks
    ...Sentry.getDefaultIntegrations(),
    // Enable profiling integration
    new ProfilingIntegration(),
  ],

  // Configure scope
  beforeSend(event) {
    // Filter out certain errors if needed
    if (event.exception && event.exception.values[0].type === 'NetworkError') {
      // Don't send network errors in development
      if (process.env.NODE_ENV === 'development') {
        return null;
      }
    }
    return event;
  },

  // Send default PII based on configuration
  sendDefaultPii: process.env.TELEMETRY_PRIVACY_MODE !== 'true',

  // Set tracesSampler for more granular control
  tracesSampler: samplingContext => {
    // Customize sampling based on the operation
    if (samplingContext.parentSampled !== undefined) {
      return samplingContext.parentSampled;
    }

    // Sample different operations at different rates
    const op = samplingContext.transactionContext.op;
    if (op === 'http.server') {
      // Lower sample rate for HTTP requests
      return 0.05;
    } else if (op === 'websocket') {
      // Higher sample rate for WebSocket operations
      return 0.2;
    }

    // Default sample rate
    return 0.1;
  },
});

// Export for use in other modules
export default Sentry;
