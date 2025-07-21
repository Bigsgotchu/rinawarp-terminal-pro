const featureFlags = require('../config/feature-flags');

describe('Feature Flags', () => {
  describe('Experimental Features', () => {
    test('should have all expected experimental flags', () => {
      expect(featureFlags.experimental).toEqual(expect.objectContaining({
        enhancedAIContext: expect.any(Boolean),
        predictiveCompletion: expect.any(Boolean),
        aiDebuggingAssistant: expect.any(Boolean),
        voiceCommands: expect.any(Boolean),
        elevenLabsIntegration: expect.any(Boolean),
        modernThemeSystem: expect.any(Boolean),
        devtoolsOverlay: expect.any(Boolean),
        pluginSystem: expect.any(Boolean),
        performanceMonitoring: expect.any(Boolean),
        enhancedAnalytics: expect.any(Boolean),
        revenueMonitoring: expect.any(Boolean)
      }));
    });

    test('should have modernThemeSystem enabled by default', () => {
      expect(featureFlags.experimental.modernThemeSystem).toBe(true);
    });

    test('should have pluginSystem enabled by default', () => {
      expect(featureFlags.experimental.pluginSystem).toBe(true);
    });

    test('should have performanceMonitoring enabled by default', () => {
      expect(featureFlags.experimental.performanceMonitoring).toBe(true);
    });

    test('should have AI features disabled by default', () => {
      expect(featureFlags.experimental.enhancedAIContext).toBe(false);
      expect(featureFlags.experimental.predictiveCompletion).toBe(false);
      expect(featureFlags.experimental.aiDebuggingAssistant).toBe(false);
    });

    test('should have voice features disabled by default', () => {
      expect(featureFlags.experimental.voiceCommands).toBe(false);
      expect(featureFlags.experimental.elevenLabsIntegration).toBe(false);
    });
  });

  describe('Core Features', () => {
    test('should have all expected core flags', () => {
      expect(featureFlags.core).toEqual(expect.objectContaining({
        terminalEmulation: expect.any(Boolean),
        shellIntegration: expect.any(Boolean),
        themeSupport: expect.any(Boolean),
        configManagement: expect.any(Boolean)
      }));
    });

    test('should have all core features enabled by default', () => {
      expect(featureFlags.core.terminalEmulation).toBe(true);
      expect(featureFlags.core.shellIntegration).toBe(true);
      expect(featureFlags.core.themeSupport).toBe(true);
      expect(featureFlags.core.configManagement).toBe(true);
    });
  });

  describe('Feature Dependencies', () => {
    test('voiceCommands should require elevenLabsIntegration', () => {
      // If voice commands are enabled, ElevenLabs integration should be too
      if (featureFlags.experimental.voiceCommands) {
        expect(featureFlags.experimental.elevenLabsIntegration).toBe(true);
      }
    });

    test('enhancedAIContext should require aiDebuggingAssistant', () => {
      // If enhanced AI context is enabled, AI debugging assistant should be too
      if (featureFlags.experimental.enhancedAIContext) {
        expect(featureFlags.experimental.aiDebuggingAssistant).toBe(true);
      }
    });

    test('devtoolsOverlay should require performanceMonitoring', () => {
      // If devtools overlay is enabled, performance monitoring should be too
      if (featureFlags.experimental.devtoolsOverlay) {
        expect(featureFlags.experimental.performanceMonitoring).toBe(true);
      }
    });
  });

  describe('Feature Groups', () => {
    test('should have all AI features in same state', () => {
      const aiFeatures = [
        featureFlags.experimental.enhancedAIContext,
        featureFlags.experimental.predictiveCompletion,
        featureFlags.experimental.aiDebuggingAssistant
      ];
      
      // All AI features should be in the same state (all enabled or all disabled)
      const allEnabled = aiFeatures.every(feature => feature === true);
      const allDisabled = aiFeatures.every(feature => feature === false);
      
      expect(allEnabled || allDisabled).toBe(true);
    });

    test('should have all voice features in same state', () => {
      const voiceFeatures = [
        featureFlags.experimental.voiceCommands,
        featureFlags.experimental.elevenLabsIntegration
      ];
      
      // All voice features should be in the same state
      const allEnabled = voiceFeatures.every(feature => feature === true);
      const allDisabled = voiceFeatures.every(feature => feature === false);
      
      expect(allEnabled || allDisabled).toBe(true);
    });

    test('should have all analytics features in same state', () => {
      const analyticsFeatures = [
        featureFlags.experimental.enhancedAnalytics,
        featureFlags.experimental.revenueMonitoring
      ];
      
      // All analytics features should be in the same state
      const allEnabled = analyticsFeatures.every(feature => feature === true);
      const allDisabled = analyticsFeatures.every(feature => feature === false);
      
      expect(allEnabled || allDisabled).toBe(true);
    });
  });

  describe('Feature Validation', () => {
    test('should not have undefined feature flags', () => {
      // Check experimental features
      Object.values(featureFlags.experimental).forEach(value => {
        expect(value).not.toBeUndefined();
      });

      // Check core features
      Object.values(featureFlags.core).forEach(value => {
        expect(value).not.toBeUndefined();
      });
    });

    test('should only have boolean values', () => {
      // Check experimental features
      Object.values(featureFlags.experimental).forEach(value => {
        expect(typeof value).toBe('boolean');
      });

      // Check core features
      Object.values(featureFlags.core).forEach(value => {
        expect(typeof value).toBe('boolean');
      });
    });
  });
});
