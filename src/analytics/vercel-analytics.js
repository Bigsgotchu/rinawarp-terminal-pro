/**
 * Analytics Manager for RinaWarp Terminal
 * Updated to use Electron-compatible analytics solution
 */

class AnalyticsManager {
  constructor() {
    this.initialized = false;
    this.config = {
      // Configure for desktop/Electron app
      mode: 'production', // Change to 'development' for testing
      debug: false, // Set to true for debugging
    };
    this.electronAnalytics = null;
  }

  /**
   * Initialize Analytics (Electron-compatible)
   */
  async initialize() {
    try {
      // Check if we're in an Electron environment
      if (typeof window !== 'undefined' && window.electronAPI) {
        // Use IPC to communicate with main process analytics
        this.initialized = true;
        console.log('📊 Electron Analytics initialized via IPC');

        // Track initialization
        await this.trackEvent('analytics_initialized', {
          platform: 'electron',
          timestamp: Date.now(),
        });
      } else {
        console.log('📊 Analytics disabled - not in Electron environment');
        this.initialized = false;
      }
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
      this.initialized = false;
    }
  }

  /**
   * Track a custom event
   * @param {string} eventName - Name of the event
   * @param {object} properties - Event properties
   */
  async trackEvent(eventName, properties = {}) {
    if (!this.initialized) {
      console.warn('Analytics not initialized, skipping event:', eventName);
      return;
    }

    try {
      // Add timestamp and session info
      const eventData = {
        ...properties,
        timestamp: new Date().toISOString(),
        session_id: this.getSessionId(),
        app_version: '1.0.9',
      };

      // Use Electron IPC to send analytics events to main process
      if (window.electronAPI && window.electronAPI.trackAnalyticsEvent) {
        await window.electronAPI.trackAnalyticsEvent(
          eventName,
          'electron_app',
          eventName,
          JSON.stringify(eventData)
        );
        console.log(`📈 Event tracked via IPC: ${eventName}`, eventData);
      } else {
        console.warn('Electron IPC not available, event not tracked:', eventName);
      }
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  /**
   * Track terminal commands (anonymized)
   * @param {string} command - The command executed
   * @param {boolean} success - Whether the command succeeded
   */
  trackCommand(command, success = true) {
    // Anonymize sensitive commands
    const anonymizedCommand = this.anonymizeCommand(command);

    this.trackEvent('terminal_command', {
      command: anonymizedCommand,
      success: success,
      length: command.length,
    });
  }

  /**
   * Track theme changes
   * @param {string} theme - Theme name
   */
  trackThemeChange(theme) {
    this.trackEvent('theme_change', {
      theme: theme,
    });
  }

  /**
   * Track AI assistant usage
   * @param {string} action - The AI action performed
   */
  trackAIUsage(action) {
    this.trackEvent('ai_usage', {
      action: action,
    });
  }

  /**
   * Track voice command usage
   * @param {string} command - Voice command used
   */
  trackVoiceCommand(command) {
    this.trackEvent('voice_command', {
      command: this.anonymizeCommand(command),
    });
  }

  /**
   * Track feature usage
   * @param {string} feature - Feature name
   * @param {object} metadata - Additional metadata
   */
  trackFeatureUsage(feature, metadata = {}) {
    this.trackEvent('feature_usage', {
      feature: feature,
      ...metadata,
    });
  }

  /**
   * Track errors
   * @param {string} error - Error message
   * @param {string} context - Where the error occurred
   */
  trackError(error, context = 'unknown') {
    this.trackEvent('error', {
      error: error.substring(0, 200), // Limit error message length
      context: context,
    });
  }

  /**
   * Get or create session ID
   * @returns {string} Session ID
   */
  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    return this.sessionId;
  }

  /**
   * Anonymize sensitive commands
   * @param {string} command - Original command
   * @returns {string} Anonymized command
   */
  anonymizeCommand(command) {
    // Remove sensitive patterns
    return command
      .replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, '[EMAIL]')
      .replace(/\b(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?\b/g, '[URL]')
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]')
      .replace(
        /\b[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}\b/g,
        '[UUID]'
      )
      .replace(/\b[a-zA-Z0-9]{20,}\b/g, '[TOKEN]')
      .replace(/(?:password|pwd|pass|token|key|secret)[\s=:]+\S+/gi, '[CREDENTIALS]')
      .substring(0, 100); // Limit length
  }

  /**
   * Enable debug mode
   */
  enableDebug() {
    this.config.debug = true;
    console.log('🔍 Analytics debug mode enabled');
  }

  /**
   * Disable analytics (for privacy)
   */
  disable() {
    this.initialized = false;
    console.log('🔒 Analytics disabled');
  }
}

// Create global instance
const analytics = new AnalyticsManager();

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      analytics.initialize();
    });
  } else {
    analytics.initialize();
  }
}

export default analytics;
