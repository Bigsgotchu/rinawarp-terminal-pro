const path = require('path');
const fs = require('fs');
const os = require('os');
const { UnifiedConfig } = require('../../src/config/unified-config.cjs');

describe('Module Loading Integration Tests', () => {
  let config;
  let tempConfigDir;
  let tempConfigFile;

  beforeAll(() => {
    jest.clearAllMocks();
    jest.resetModules();
    // Create temporary test directory
    tempConfigDir = path.join(os.tmpdir(), `.rinawarp-terminal-test-${Date.now()}`);
    tempConfigFile = path.join(tempConfigDir, 'config.json');
    
    // Mock home directory for testing
    jest.spyOn(os, 'homedir').mockReturnValue(tempConfigDir);
    
    // Ensure test directory exists
    if (!fs.existsSync(tempConfigDir)) {
      fs.mkdirSync(tempConfigDir, { recursive: true });
    }
  });

  beforeEach(() => {
    // Clean up any existing config
    if (fs.existsSync(tempConfigFile)) {
      fs.unlinkSync(tempConfigFile);
    }
    
    // Create fresh config instance
    config = new UnifiedConfig();
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(tempConfigDir)) {
      fs.rmSync(tempConfigDir, { recursive: true, force: true });
    }
  });

  describe('Configuration Loading', () => {
    test('should load configuration from disk', async () => {
      const testConfig = {
        terminal: {
          fontSize: 16,
          theme: 'dark'
        }
      };

      // Write test config
      fs.writeFileSync(tempConfigFile, JSON.stringify(testConfig));

      // Create new config instance which should load from disk
      const newConfig = new UnifiedConfig();
      
      expect(newConfig.get('terminal.fontSize')).toBe(16);
      expect(newConfig.get('terminal.theme')).toBe('dark');
    });

    test('should handle missing configuration file gracefully', () => {
      // Ensure config file doesn't exist
      if (fs.existsSync(tempConfigFile)) {
        fs.unlinkSync(tempConfigFile);
      }

      const newConfig = new UnifiedConfig();
      expect(newConfig.get('terminal.fontSize')).toBe(14); // Default value
    });
  });

  describe('Feature Flag Integration', () => {
    test('should respect feature flag settings from disk', () => {
      const testConfig = {
        features: {
          aiAssistant: true,
          voiceControl: true
        }
      };

      fs.writeFileSync(tempConfigFile, JSON.stringify(testConfig));
      const newConfig = new UnifiedConfig();

      expect(newConfig.get('features.aiAssistant')).toBe(true);
      expect(newConfig.get('features.voiceControl')).toBe(true);
    });

    test('should persist feature flag changes', () => {
      config.set('features.aiAssistant', true);
      
      // Read config directly from disk to verify persistence
      const savedConfig = JSON.parse(fs.readFileSync(tempConfigFile, 'utf8'));
      expect(savedConfig.features.aiAssistant).toBe(true);
    });
  });

  describe('ElevenLabs Integration', () => {
    test('should initialize ElevenLabs configuration', async () => {
      const testConfig = {
        elevenlabs: {
          enabled: true,
          apiKey: 'test-key',
          voiceId: 'test-voice',
          modelId: 'test-model'
        }
      };

      fs.writeFileSync(tempConfigFile, JSON.stringify(testConfig));
      const newConfig = new UnifiedConfig();
      
      const result = await newConfig.initializeElevenLabsConfig();
      expect(result.initialized).toBe(true);
    });

    test('should warn when ElevenLabs is enabled without API key', async () => {
      const testConfig = {
        elevenlabs: {
          enabled: true,
          apiKey: '',
          voiceId: 'test-voice'
        }
      };

      fs.writeFileSync(tempConfigFile, JSON.stringify(testConfig));
      const newConfig = new UnifiedConfig();
      
      const result = await newConfig.initializeElevenLabsConfig();
      expect(result.initialized).toBe(false);
      expect(result.requiresConfig).toBe(true);
    });
  });

  describe('Performance Testing', () => {
    test('should load configuration quickly', () => {
      const start = process.hrtime();
      
      new UnifiedConfig();
      
      const [seconds, nanoseconds] = process.hrtime(start);
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
      
      // Loading should be fast (under 50ms)
      expect(milliseconds).toBeLessThan(50);
    });

    test('should handle large configurations efficiently', () => {
      // Generate large test config
      const largeConfig = {
        terminal: {},
        features: {},
        performance: {}
      };
      
      // Add 1000 settings
      for (let i = 0; i < 1000; i++) {
        largeConfig.terminal[`setting${i}`] = `value${i}`;
        largeConfig.features[`feature${i}`] = i % 2 === 0;
        largeConfig.performance[`metric${i}`] = i;
      }

      fs.writeFileSync(tempConfigFile, JSON.stringify(largeConfig));
      
      const start = process.hrtime();
      const newConfig = new UnifiedConfig();
      const [seconds, nanoseconds] = process.hrtime(start);
      const milliseconds = seconds * 1000 + nanoseconds / 1000000;
      
      // Should still load quickly with large config (under 100ms)
      expect(milliseconds).toBeLessThan(100);
      
      // Verify random samples from the large config
      expect(newConfig.get('terminal.setting500')).toBe('value500');
      expect(newConfig.get('features.feature100')).toBe(true);
    });
  });
});
