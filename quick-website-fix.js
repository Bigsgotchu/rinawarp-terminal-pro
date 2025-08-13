// Quick fix for Sentry BrowserTracing error
// Replace the problematic Sentry initialization

// Instead of: new Sentry.BrowserTracing()
// Use this safer initialization:

if (typeof window !== 'undefined' && window.Sentry && window.Sentry.browserTracingIntegration) {
  window.Sentry.browserTracingIntegration();
} else {
  console.log('Sentry BrowserTracing not available, skipping...');
}

// This prevents the constructor error
