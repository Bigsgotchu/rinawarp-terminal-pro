/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Sentry Performance Monitoring and Tracing Instrumentation (CommonJS)
 * This file must be required at the very top of your application
 */

const Sentry = require('@sentry/node');

// Load environment variables if not already loaded
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

// Initialize Sentry with performance monitoring
Sentry.init({
  dsn:
    process.env.SENTRY_DSN ||
    'https://4c22d2c576b2d0ebbeda9941d59fff95@o4509759638536192.ingest.us.sentry.io/4509759649087488',
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  release: process.env.APP_VERSION || '1.0.6',

  // Performance Monitoring
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 1.0,

  // Set sample rates
  sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE) || 1.0,

  // Integrations
  integrations: [
    // Automatically instrument Node.js libraries and frameworks
    ...Sentry.getDefaultIntegrations(),
    // Add OpenAI integration for AI monitoring
    Sentry.openAIIntegration({
      recordInputs: true,
      recordOutputs: true,
    }),
  ],

  // Configure scope
  beforeSend(event, _hint) {
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
  sendDefaultPii:
    process.env.TELEMETRY_PRIVACY_MODE !== 'true' &&
    process.env.TELEMETRY_PRIVACY_MODE !== 'strict',

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
module.exports = Sentry;
