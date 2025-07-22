/**
 * Feature Flags Configuration
 * Controls experimental and AI features in the application
 */

const featureFlags = {
  experimental: {
    // AI Features
    enhancedAIContext: false,
    predictiveCompletion: false,
    aiDebuggingAssistant: false,

    // Voice Features
    voiceCommands: false,
    elevenLabsIntegration: false,

    // UI Enhancements
    modernThemeSystem: true,
    devtoolsOverlay: true,

    // System Features
    pluginSystem: true,
    performanceMonitoring: true,

    // Analytics
    enhancedAnalytics: true,
    revenueMonitoring: true,
  },

  core: {
    terminalEmulation: true,
    shellIntegration: true,
    themeSupport: true,
    configManagement: true,
  },
};

module.exports = featureFlags;
