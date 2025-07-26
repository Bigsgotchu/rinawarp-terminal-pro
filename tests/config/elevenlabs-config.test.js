const { UnifiedConfig } = require('../../src/config/unified-config.cjs');
const fs = require('fs');
const child_process = require('child_process');
const os = require('os');
const path = require('path');

// Mock modules
jest.mock('fs');
jest.mock('os', () => ({
  homedir: jest.fn(() => '/mock/home')
}));
jest.mock('child_process');

describe('ElevenLabs Configuration Tests', () => {
  let config;
  let originalEnv;
  const mockHomedir = '/mock/home';
  const mockConfigDir = path.join(mockHomedir, '.rinawarp-terminal');
  const mockConfigFile = path.join(mockConfigDir, 'config.json');
  
  beforeEach(() => {
    // Save and clear original environment
    originalEnv = process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;

    // Mock environment settings
    jest.spyOn(child_process, 'execSync').mockImplementation((cmd) => {
      if (cmd.includes('pwsh')) throw new Error();
      if (cmd.includes('powershell')) return 'PowerShell 5.1';
      throw new Error();

    // Reset mocks
    jest.clearAllMocks();

    // Mock fs
    fs.existsSync = jest.fn().mockReturnValue(false);
    fs.mkdirSync = jest.fn();
    fs.readFileSync = jest.fn().mockReturnValue('{}');
    fs.writeFileSync = jest.fn();

    // Create fresh config instance
    config = new UnifiedConfig();
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.ELEVENLABS_API_KEY = originalEnv;
    }
  });

  describe('Initialization', () => {
    test('should have default ElevenLabs configuration', () => {
      expect(config.get('elevenlabs')).toBeDefined();
      expect(config.get('elevenlabs.enabled')).toBe(false);
      expect(config.get('elevenlabs.apiKey')).toBe('');
      expect(config.get('elevenlabs.voiceId')).toBe('');
      expect(config.get('elevenlabs.modelId')).toBe('eleven_monolingual_v1');
      expect(config.get('elevenlabs.voiceSettings')).toEqual({
        stability: 0.5,
        similarityBoost: 0.5,
      });
    });

    test('should initialize ElevenLabs configuration without error', () => {
      expect(() => config.initializeElevenLabsConfig()).not.toThrow();
      expect(config.initializeElevenLabsConfig()).toBe(true);
    });
  });

  describe('API Key Management', () => {
    test('should return empty string when no API key is set', () => {
      expect(config.getElevenLabsApiKey()).toBe('');
    });

    test('should return config API key when set', () => {
      config.set('elevenlabs.apiKey', 'config-api-key');
      expect(config.getElevenLabsApiKey()).toBe('config-api-key');
    });

    test('should prioritize environment variable over config', () => {
      config.set('elevenlabs.apiKey', 'config-api-key');
      process.env.ELEVENLABS_API_KEY = 'env-api-key';
      
      expect(config.getElevenLabsApiKey()).toBe('env-api-key');
      
      delete process.env.ELEVENLABS_API_KEY;
    });
  });

  describe('Validation', () => {
    test('should validate successfully when ElevenLabs is disabled', () => {
      config.set('elevenlabs.enabled', false);
      const result = config.validateElevenLabsConfig();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should fail validation when enabled without API key', () => {
      config.set('elevenlabs.enabled', true);
      config.set('elevenlabs.apiKey', '');
      
      const result = config.validateElevenLabsConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('API key is required when ElevenLabs is enabled');
    });

    test('should validate successfully when enabled with API key', () => {
      config.set('elevenlabs.enabled', true);
      config.set('elevenlabs.apiKey', 'test-api-key');
      
      const result = config.validateElevenLabsConfig();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate voice stability range', () => {
      config.set('elevenlabs.enabled', true);
      config.set('elevenlabs.apiKey', 'test-key');
      
      // Test invalid stability values
      config.set('elevenlabs.voiceSettings', { stability: -0.1 });
      let result = config.validateElevenLabsConfig();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Voice stability must be a number between 0 and 1');
      
      config.set('elevenlabs.voiceSettings', { stability: 1.5 });
      result = config.validateElevenLabsConfig();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Voice stability must be a number between 0 and 1');
      
      // Test valid stability values
      config.set('elevenlabs.voiceSettings', { stability: 0 });
      result = config.validateElevenLabsConfig();
      expect(result.valid).toBe(true);
      
      config.set('elevenlabs.voiceSettings', { stability: 0.5 });
      result = config.validateElevenLabsConfig();
      expect(result.valid).toBe(true);
      
      config.set('elevenlabs.voiceSettings', { stability: 1 });
      result = config.validateElevenLabsConfig();
      expect(result.valid).toBe(true);
    });

    test('should validate similarity boost range', () => {
      config.set('elevenlabs.enabled', true);
      config.set('elevenlabs.apiKey', 'test-key');
      
      // Test invalid similarityBoost values
      config.set('elevenlabs.voiceSettings', { similarityBoost: -0.1 });
      let result = config.validateElevenLabsConfig();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Voice similarity boost must be a number between 0 and 1');
      
      config.set('elevenlabs.voiceSettings', { similarityBoost: 1.5 });
      result = config.validateElevenLabsConfig();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Voice similarity boost must be a number between 0 and 1');
      
      // Test valid similarityBoost values
      config.set('elevenlabs.voiceSettings', { similarityBoost: 0 });
      result = config.validateElevenLabsConfig();
      expect(result.valid).toBe(true);
      
      config.set('elevenlabs.voiceSettings', { similarityBoost: 0.75 });
      result = config.validateElevenLabsConfig();
      expect(result.valid).toBe(true);
      
      config.set('elevenlabs.voiceSettings', { similarityBoost: 1 });
      result = config.validateElevenLabsConfig();
      expect(result.valid).toBe(true);
    });

    test('should validate multiple voice settings errors', () => {
      config.set('elevenlabs.enabled', true);
      config.set('elevenlabs.apiKey', 'test-key');
      config.set('elevenlabs.voiceSettings', {
        stability: 1.5,
        similarityBoost: -0.5
      });
      
      const result = config.validateElevenLabsConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('Voice stability must be a number between 0 and 1');
      expect(result.errors).toContain('Voice similarity boost must be a number between 0 and 1');
    });
  });

  describe('Configuration Updates', () => {
    test('should update ElevenLabs settings', () => {
      config.set('elevenlabs.enabled', true);
      config.set('elevenlabs.apiKey', 'new-api-key');
      config.set('elevenlabs.voiceId', 'voice-123');
      config.set('elevenlabs.modelId', 'eleven_turbo_v2');
      
      expect(config.get('elevenlabs.enabled')).toBe(true);
      expect(config.get('elevenlabs.apiKey')).toBe('new-api-key');
      expect(config.get('elevenlabs.voiceId')).toBe('voice-123');
      expect(config.get('elevenlabs.modelId')).toBe('eleven_turbo_v2');
    });

    test('should update voice settings', () => {
      config.set('elevenlabs.voiceSettings.stability', 0.8);
      config.set('elevenlabs.voiceSettings.similarityBoost', 0.3);
      
      expect(config.get('elevenlabs.voiceSettings.stability')).toBe(0.8);
      expect(config.get('elevenlabs.voiceSettings.similarityBoost')).toBe(0.3);
    });

    test('should handle type coercion for voice settings', () => {
      // Test string to number conversion
      config.set('elevenlabs.voiceSettings.stability', '0.7');
      expect(config.get('elevenlabs.voiceSettings.stability')).toBe(0.7);
      expect(typeof config.get('elevenlabs.voiceSettings.stability')).toBe('number');
      
      // Test boolean to number conversion (should convert to 1)
      config.set('elevenlabs.voiceSettings.similarityBoost', true);
      expect(config.get('elevenlabs.voiceSettings.similarityBoost')).toBe(1);
      expect(typeof config.get('elevenlabs.voiceSettings.similarityBoost')).toBe('number');
    });
  });

  describe('Reset Functionality', () => {
    test('should reset ElevenLabs configuration to defaults', () => {
      // Modify configuration
      config.set('elevenlabs.enabled', true);
      config.set('elevenlabs.apiKey', 'test-key');
      config.set('elevenlabs.voiceSettings.stability', 0.9);
      
      // Verify changes were made
      expect(config.get('elevenlabs.enabled')).toBe(true);
      expect(config.get('elevenlabs.apiKey')).toBe('test-key');
      expect(config.get('elevenlabs.voiceSettings.stability')).toBe(0.9);
      
      // Reset
      config.reset();
      
      // Debug: Check what defaultConfig contains
      console.log('Default enabled:', config.defaultConfig.elevenlabs.enabled);
      console.log('Current enabled:', config.get('elevenlabs.enabled'));
      console.log('Full config:', JSON.stringify(config.config.elevenlabs, null, 2));
      
      // Check defaults are restored
      expect(config.get('elevenlabs.enabled')).toBe(false);
      expect(config.get('elevenlabs.apiKey')).toBe('');
      expect(config.get('elevenlabs.voiceSettings.stability')).toBe(0.5);
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing voice settings gracefully', () => {
      config.set('elevenlabs.enabled', true);
      config.set('elevenlabs.apiKey', 'test-key');
      config.set('elevenlabs.voiceSettings', null);
      
      const result = config.validateElevenLabsConfig();
      expect(result.valid).toBe(true);
    });

    test('should handle partial voice settings', () => {
      config.set('elevenlabs.enabled', true);
      config.set('elevenlabs.apiKey', 'test-key');
      
      // When setting partial voice settings, the entire object is replaced
      const currentVoiceSettings = config.get('elevenlabs.voiceSettings') || {};
      config.set('elevenlabs.voiceSettings', { ...currentVoiceSettings, stability: 0.8 });
      
      const result = config.validateElevenLabsConfig();
      expect(result.valid).toBe(true);
      
      // Check that stability was set
      expect(config.get('elevenlabs.voiceSettings.stability')).toBe(0.8);
    });

    test('should handle empty API key with environment variable', () => {
      config.set('elevenlabs.enabled', true);
      config.set('elevenlabs.apiKey', '');
      process.env.ELEVENLABS_API_KEY = 'env-key';
      
      const result = config.validateElevenLabsConfig();
      expect(result.valid).toBe(true);
      expect(config.getElevenLabsApiKey()).toBe('env-key');
      
      delete process.env.ELEVENLABS_API_KEY;
    });
  });
});
