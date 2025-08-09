/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

const os = require('os');
const path = require('node:path');
const fs = require('node:fs');
const { UnifiedConfig } = require('../../src/config/unified-config.cjs');

// Mock fs and os modules
jest.mock('fs');
jest.mock('os', () => ({
  homedir: jest.fn(() => '/mock/home'),
}));

describe('UnifiedConfig', () => {
  let config;
  const mockHomedir = '/mock/home';
  const mockConfigDir = path.join(mockHomedir, '.rinawarp-terminal');
  const _mockConfigFile = path.join(mockConfigDir, 'config.json');

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Clear environment variables that might affect tests
    delete process.env.ELEVENLABS_API_KEY;

    // Mock os.homedir()
    os.homedir = jest.fn().mockReturnValue(mockHomedir);

    // Mock fs functions
    fs.existsSync = jest.fn().mockImplementation(_path => false);
    fs.mkdirSync = jest.fn().mockImplementation(() => {});
    fs.readFileSync = jest.fn().mockImplementation(_path => JSON.stringify({}));
    fs.writeFileSync = jest.fn().mockImplementation(() => {});

    // Create fresh config instance
    config = new UnifiedConfig();
  });

  describe('Constructor and Initialization', () => {
    test('should create config directory if it does not exist', () => {
      expect(fs.mkdirSync).toHaveBeenCalledWith(mockConfigDir, { recursive: true });
    });

    test('should use default configuration when no file exists', () => {
      expect(config.config).toEqual(config.defaultConfig);
    });

    test('should load existing configuration when file exists', () => {
      const mockConfig = {
        terminal: { fontSize: 16 },
        features: { aiAssistant: true },
      };

      // Mock file exists for config directory and config file
      fs.existsSync.mockImplementation(filePath => {
        console.log('existsSync called with:', filePath);
        if (filePath === mockConfigDir) return true;
        if (filePath === path.join(mockConfigDir, 'config.json')) return true;
        return false;
      });
      fs.readFileSync.mockImplementation(filePath => {
        console.log('readFileSync called with:', filePath);
        return JSON.stringify(mockConfig);
      });

      config = new UnifiedConfig();

      console.log('Config loaded:', JSON.stringify(config.config, null, 2));
      console.log('terminal.fontSize:', config.config.terminal.fontSize);

      expect(config.config.terminal.fontSize).toBe(16);
      expect(config.config.features.aiAssistant).toBe(true);
      // Default values should still be present
      expect(config.config.terminal.theme).toBe('default');
    });
  });

  describe('Configuration Methods', () => {
    test('get should retrieve nested values', () => {
      expect(config.get('terminal.fontSize')).toBe(14);
      expect(config.get('features.aiAssistant')).toBe(true); // Default is true
    });

    test('set should update nested values', () => {
      fs.writeFileSync.mockImplementationOnce(() => {});

      config.set('terminal.fontSize', 18);
      config.set('features.aiAssistant', true);

      expect(config.get('terminal.fontSize')).toBe(18);
      expect(config.get('features.aiAssistant')).toBe(true);
    });

    test('reset should restore default configuration', () => {
      fs.writeFileSync.mockImplementationOnce(() => {});

      config.set('terminal.fontSize', 18);
      config.reset();

      expect(config.config).toEqual(config.defaultConfig);
    });
  });

  describe('ElevenLabs Integration', () => {
    test('validateElevenLabsConfig should check required fields when enabled', () => {
      // Make sure writeFileSync mock returns true to simulate successful save
      fs.writeFileSync.mockReturnValueOnce(undefined); // fs.writeFileSync returns undefined on success

      config.set('elevenlabs.enabled', true);
      // Ensure the value was actually set by checking it directly
      expect(config.get('elevenlabs.enabled')).toBe(true);

      const result = config.validateElevenLabsConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('API key is required when ElevenLabs is enabled');
    });

    test('validateElevenLabsConfig should validate voice settings', () => {
      config.set('elevenlabs.enabled', true);
      config.set('elevenlabs.apiKey', 'test-key');
      config.set('elevenlabs.voiceId', 'test-voice');
      config.set('elevenlabs.modelId', 'test-model');
      config.set('elevenlabs.voiceSettings', {
        stability: 1.5, // Invalid value
        similarityBoost: 0.5,
      });

      const result = config.validateElevenLabsConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Voice stability must be a number between 0 and 1');
    });

    test('getElevenLabsApiKey should prioritize environment variable', () => {
      process.env.ELEVENLABS_API_KEY = 'env-api-key';
      config.set('elevenlabs.apiKey', 'config-api-key');

      expect(config.getElevenLabsApiKey()).toBe('env-api-key');

      delete process.env.ELEVENLABS_API_KEY;
    });
  });

  describe('Shell Detection', () => {
    test('should detect default shell on Windows', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const execSync = jest.fn();
      require('child_process').execSync = execSync;

      // Mock PowerShell detection
      execSync
        .mockImplementationOnce(() => {
          throw new Error(new Error());
        })
        .mockImplementationOnce(() => 'PowerShell 5.1');

      const shell = config.getDefaultShell();
      expect(shell).toBe('powershell.exe');
    });

    test('should use environment SHELL on Unix systems', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      process.env.SHELL = '/bin/zsh';

      const shell = config.getDefaultShell();
      expect(shell).toBe('/bin/zsh');
    });
  });

  describe('Migration', () => {
    test('should attempt migration from old AppData location', () => {
      const oldConfigPath = path.join(mockHomedir, 'rinawarp-terminal');
      fs.existsSync.mockImplementationOnce(() => true);
      fs.writeFileSync.mockImplementationOnce(() => {});

      config.migrateFromAppData();

      expect(fs.existsSync).toHaveBeenCalledWith(oldConfigPath);
      expect(config.get('migration.fromAppData')).toBe(true);
    });
  });
});
