import * as Sentry from "@sentry/node";

console.log('🔍 Initializing Sentry v10+ from instrument.mjs');

// Ensure to call this before importing any other modules!
try {
  Sentry.init({
    dsn: "https://4c22d2c576b2d0ebbeda9941d59fff95@o4509759638536192.ingest.us.sentry.io/4509759649087488",

    // Add Tracing by setting tracesSampleRate
    // We recommend adjusting this value in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Environment configuration
    environment: process.env.NODE_ENV || 'development',
    
    // Performance monitoring
    profilesSampleRate: 1.0,
    
    // Integrations
    integrations: [
      // Default integrations
      ...Sentry.getDefaultIntegrations(),
      // Add OpenAI integration for AI monitoring
      Sentry.openAIIntegration({
        recordInputs: true,
        recordOutputs: true,
      }),
    ],
    
    // Error filtering
    beforeSend(event, hint) {
      // Filter out development errors in production
      if (process.env.NODE_ENV === 'production') {
        // Skip certain error types that are not actionable
        if (event.exception?.values?.some(ex => 
          ex.type === 'ENOENT' || 
          ex.type === 'ECONNRESET' ||
          ex.value?.includes('socket hang up')
        )) {
          return null;
        }
      }
      return event;
    },
  });
  
  // Test that Sentry is properly initialized
  if (typeof Sentry.getCurrentScope === 'function') {
    const scope = Sentry.getCurrentScope();
    if (scope) {
      console.log('✅ Sentry v10+ initialized successfully in instrument.mjs');
      // Set a flag on global object to indicate successful initialization
      globalThis.__SENTRY_INITIALIZED__ = true;
    } else {
      console.log('⚠️ Sentry initialized but getCurrentScope returned null');
    }
  } else {
    console.log('⚠️ Sentry initialized but getCurrentScope function not available');
  }
} catch (error) {
  console.error('❌ Failed to initialize Sentry in instrument.mjs:', error);
}

// Export Sentry for use in other modules
export default Sentry;
