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
    devtoolsOverlay: false,
    
    // System Features
    pluginSystem: true,
    performanceMonitoring: true,
    
    // Analytics
    enhancedAnalytics: false,
    revenueMonitoring: false
  },
  
  core: {
    terminalEmulation: true,
    shellIntegration: true,
    themeSupport: true,
    configManagement: true
  }
};

module.exports = featureFlags;
