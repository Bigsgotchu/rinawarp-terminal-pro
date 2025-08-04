/**
 * Sentry Configuration for Renderer Process
 * Includes User Feedback integration
 */

import * as Sentry from '@sentry/electron/renderer';

// Initialize Sentry in the renderer process
Sentry.init({
  dsn: 'https://4c22d2c576b2d0ebbeda9941d59fff95@o4509759638536192.ingest.us.sentry.io/4509759649087488',
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production',
  release: process.env.APP_VERSION || '1.0.6',

  // Send default PII data (IP addresses, etc.)
  sendDefaultPii: true,

  // Sample rates
  sampleRate: 1.0,
  tracesSampleRate: 0.1,

  // Integrations
  integrations: [
    // User Feedback Widget
    Sentry.feedbackIntegration({
      // Widget configuration
      colorScheme: 'dark', // matches terminal theme

      // Button text
      buttonLabel: 'Report Issue',
      submitButtonLabel: 'Send Report',
      cancelButtonLabel: 'Cancel',

      // Form labels
      formTitle: 'Report an Issue',
      nameLabel: 'Name',
      namePlaceholder: 'Your name',
      emailLabel: 'Email',
      emailPlaceholder: 'your.email@example.com',
      messageLabel: 'Description',
      messagePlaceholder: 'What happened? Please include steps to reproduce the issue...',

      // Success/Error messages
      successMessageText: 'Thank you for your feedback!',
      errorFormEntry: 'Please fill out all required fields',

      // Widget behavior
      isNameRequired: false,
      isEmailRequired: true,
      showBranding: false,

      // Auto-inject the feedback button
      autoInject: true,

      // Custom button selector (if you want to attach to your own button)
      // triggerId: "custom-feedback-button",

      // Theme colors to match RinaWarp Terminal
      themeDark: {
        background: '#1a1a1a',
        backgroundHover: '#2a2a2a',
        foreground: '#ffffff',
        error: '#ff4444',
        success: '#44ff44',
        border: '#333333',
      },

      // Attach screenshot by default
      enableScreenshot: true,

      // Add custom tags to feedback
      tags: {
        feature: 'user-feedback',
        source: 'terminal-ui',
      },

      // Called when feedback is submitted
      onSubmitSuccess: data => {
        // You could show a custom notification here
      },

      onSubmitError: error => {
        console.error('Failed to submit feedback:', error);
        // You could show an error notification here
      },
    }),

    // Breadcrumbs for better context
    Sentry.breadcrumbsIntegration({
      console: true,
      dom: true,
      fetch: true,
      history: true,
      xhr: true,
    }),
  ],

  // Configure breadcrumbs
  maxBreadcrumbs: 50,

  // Before sending event to Sentry
  beforeSend(event, hint) {
    // You can filter or modify events here
    if (event.exception) {
      const error = hint.originalException;
      // Filter out certain errors if needed
      if (error && error.message && error.message.includes('ResizeObserver')) {
        return null; // Don't send ResizeObserver errors
      }
    }
    return event;
  },
});

// Export for use in other modules
export default Sentry;

// Helper function to manually trigger feedback modal
export function showFeedbackDialog() {
  const feedbackIntegration = Sentry.getClient()?.getIntegration(Sentry.feedbackIntegration);
  if (feedbackIntegration) {
    feedbackIntegration.createWidget();
  }
}

// Helper function to capture feedback with error context
export function captureErrorWithFeedback(error, context = {}) {
  Sentry.withScope(scope => {
    scope.setContext('error_feedback', context);
    scope.setLevel('error');
    Sentry.captureException(error);

    // Optionally show feedback dialog after error
    showFeedbackDialog();
  });
}
