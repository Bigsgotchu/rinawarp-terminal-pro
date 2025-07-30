/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

const path = require('node:path');
const { UnifiedConfig } = require('../src/config/unified-config.cjs');

describe('Terminal Entry Points', () => {
  let config;
  let originalConfig;
  
  beforeEach(() => {
    // Reset config instance for each test
    config = new UnifiedConfig();
    originalConfig = { ...config.config };
    // Reset to defaults for testing
    config.reset();
  });

  afterEach(() => {
    // Restore original config instance
    if (originalConfig) {
      config.config = originalConfig;
      config.saveConfig();
    }
  });

  describe('Shell Detection and Configuration', () => {
    test('should correctly identify system shell', () => {
      const shell = config.getDefaultShell();
      expect(shell).toBeTruthy();
      
      if (process.platform === 'win32') {
        expect(['cmd.exe', 'powershell.exe', 'pwsh.exe']).toContain(shell);
      } else {
        expect(shell).toMatch(/\/(bash|zsh|fish|sh)$/);
      }
    });

    test('should handle custom shell configuration', () => {
      const customShell = process.platform === 'win32' ? 'powershell.exe' : '/bin/zsh';
      config.set('terminal.shell', customShell);
      
      expect(config.get('terminal.shell')).toBe(customShell);
    });
  });

  describe('Terminal Settings', () => {
    test('should provide default terminal settings', () => {
      expect(config.get('terminal.fontSize')).toBe(14);
      expect(config.get('terminal.theme')).toBe('default');
      expect(config.get('terminal.scrollback')).toBe(1000);
    });

    test('should allow customization of terminal settings', () => {
      config.set('terminal.fontSize', 16);
      config.set('terminal.theme', 'dark');
      config.set('terminal.scrollback', 2000);

      expect(config.get('terminal.fontSize')).toBe(16);
      expect(config.get('terminal.theme')).toBe('dark');
      expect(config.get('terminal.scrollback')).toBe(2000);
    });
  });

  describe('Window Management', () => {
    test('should handle window dimensions', () => {
      expect(config.get('ui.windowWidth')).toBe(1200);
      expect(config.get('ui.windowHeight')).toBe(800);

      config.set('ui.windowWidth', 1600);
      config.set('ui.windowHeight', 1000);

      expect(config.get('ui.windowWidth')).toBe(1600);
      expect(config.get('ui.windowHeight')).toBe(1000);
    });

    test('should manage UI preferences', () => {
      expect(config.get('ui.showWelcomeScreen')).toBe(false);
      expect(config.get('ui.enableDevTools')).toBe(false);

      config.set('ui.showWelcomeScreen', true);
      config.set('ui.enableDevTools', true);

      expect(config.get('ui.showWelcomeScreen')).toBe(true);
      expect(config.get('ui.enableDevTools')).toBe(true);
    });
  });

  describe('Performance Settings', () => {
    test('should handle GPU acceleration settings', () => {
      expect(config.get('performance.enableGPUAcceleration')).toBe(true);
      
      config.set('performance.enableGPUAcceleration', false);
      expect(config.get('performance.enableGPUAcceleration')).toBe(false);
    });

    test('should manage reduced motion preferences', () => {
      expect(config.get('performance.reducedMotion')).toBe(false);
      
      config.set('performance.reducedMotion', true);
      expect(config.get('performance.reducedMotion')).toBe(true);
    });
  });

  describe('Feature Integration', () => {
    test('should manage AI assistant integration', () => {
      expect(config.get('features.aiAssistant')).toBe(false);
      
      config.set('features.aiAssistant', true);
      expect(config.get('features.aiAssistant')).toBe(true);
    });

    test('should handle voice control settings', () => {
      expect(config.get('features.voiceControl')).toBe(false);
      
      config.set('features.voiceControl', true);
      expect(config.get('features.voiceControl')).toBe(true);
    });

    test('should manage advanced features flag', () => {
      expect(config.get('features.advancedFeatures')).toBe(false);
      
      config.set('features.advancedFeatures', true);
      expect(config.get('features.advancedFeatures')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid setting paths gracefully', () => {
      expect(config.get('invalid.path')).toBeUndefined();
      expect(config.get('terminal.invalidSetting')).toBeUndefined();
    });

    test('should prevent invalid value types', () => {
      // fontSize should be a number
      config.set('terminal.fontSize', '16');
      expect(typeof config.get('terminal.fontSize')).toBe('number');

      // enableGPUAcceleration should be boolean
      config.set('performance.enableGPUAcceleration', 1);
      expect(typeof config.get('performance.enableGPUAcceleration')).toBe('boolean');
    });
  });

  describe('Configuration Persistence', () => {
    test('should persist changes across instances', () => {
      config.set('terminal.fontSize', 18);
      config.set('features.aiAssistant', true);

      // Create new instance to verify persistence
      const newConfig = new UnifiedConfig();
      expect(newConfig.get('terminal.fontSize')).toBe(18);
      expect(newConfig.get('features.aiAssistant')).toBe(true);
    });

    test('should handle concurrent access', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          new Promise((resolve) => {
            const conf = new UnifiedConfig();
            conf.set('terminal.fontSize', 14 + i);
            resolve();
          })
        );
      }

      await Promise.all(promises);
      
      // Last write should win
      const finalConfig = new UnifiedConfig();
      expect(finalConfig.get('terminal.fontSize')).toBe(23);
    });
  });
});
