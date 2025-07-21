/**
 * Feature Flags Configuration
 * Controls experimental and AI features in the application
 */

const featureFlags = {
  experimental: {
    // AI Features
    enhancedAIContext: true,
    predictiveCompletion: true,
    aiDebuggingAssistant: true,
    
    // Voice Features
    voiceCommands: true,
    elevenLabsIntegration: true,
    
    // UI Enhancements
    modernThemeSystem: true,
    devtoolsOverlay: true,
    
    // System Features
    pluginSystem: true,
    performanceMonitoring: true,
    
    // Analytics
    enhancedAnalytics: true,
    revenueMonitoring: true
  },
  
  core: {
    terminalEmulation: true,
    shellIntegration: true,
    themeSupport: true,
    configManagement: true
  }
};

module.exports = featureFlags;
