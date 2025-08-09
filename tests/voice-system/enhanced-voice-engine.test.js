import { jest } from '@jest/globals';
import { EnhancedVoiceEngine } from '../../src/voice-system/enhanced-voice-engine.js';

// Mock browser APIs
global.window = {
  SpeechRecognition: jest.fn(),
  webkitSpeechRecognition: jest.fn(),
  speechSynthesis: {
    speak: jest.fn(),
    cancel: jest.fn(),
    getVoices: jest.fn().mockReturnValue([]),
  },
  dispatchEvent: jest.fn(),
  CustomEvent: jest.fn().mockImplementation((type, options) => ({ type, detail: options?.detail })),
};

// Mock SpeechSynthesisUtterance
global.SpeechSynthesisUtterance = jest.fn().mockImplementation(text => ({
  text,
  volume: 1,
  rate: 1,
  pitch: 1,
  voice: null,
  onstart: null,
  onend: null,
  onerror: null,
}));

// Mock global CustomEvent
global.CustomEvent = global.window.CustomEvent;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock Speech Recognition
class MockSpeechRecognition {
  constructor() {
    this.continuous = false;
    this.interimResults = false;
    this.maxAlternatives = 1;
    this.lang = 'en-US';
    this.onstart = null;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
  }

  start() {
    if (this.onstart) this.onstart();
  }

  stop() {
    if (this.onend) this.onend();
  }

  abort() {
    if (this.onend) this.onend();
  }
}

global.window.SpeechRecognition = MockSpeechRecognition;

describe('EnhancedVoiceEngine', () => {
  let engine;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    engine = new EnhancedVoiceEngine();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(engine.isListening).toBe(false);
      expect(engine.isPaused).toBe(false);
      expect(engine.language).toBe('en-US');
      expect(engine.config.continuous).toBe(true);
      expect(engine.config.interimResults).toBe(true);
      expect(engine.config.confidenceThreshold).toBe(0.7);
    });

    it('should check browser support correctly', () => {
      expect(engine.checkBrowserSupport()).toBe(true);

      // Test unsupported browser
      delete global.window.SpeechRecognition;
      delete global.window.webkitSpeechRecognition;
      expect(engine.checkBrowserSupport()).toBe(false);

      // Restore
      global.window.SpeechRecognition = MockSpeechRecognition;
    });

    it('should initialize speech recognition with proper settings', async () => {
      await engine.initializeRecognition();

      expect(engine.recognition).toBeDefined();
      expect(engine.recognition.continuous).toBe(true);
      expect(engine.recognition.interimResults).toBe(true);
      expect(engine.recognition.maxAlternatives).toBe(3);
      expect(engine.recognition.lang).toBe('en-US');
    });

    it('should handle speech synthesis initialization', async () => {
      await engine.initializeSynthesis();
      expect(engine.synthesis).toBeDefined();
    });
  });

  describe('custom commands', () => {
    it('should load default commands', async () => {
      await engine.loadCustomCommands();

      expect(engine.customCommands.has('clear screen')).toBe(true);
      expect(engine.customCommands.get('clear screen')).toBe('clear');
      expect(engine.customCommands.has('git status')).toBe(true);
      expect(engine.customCommands.get('git status')).toBe('git status');
    });

    it('should load saved custom commands from localStorage', async () => {
      const customCommands = {
        'custom command': 'echo custom',
        'another command': 'ls -la',
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(customCommands));

      await engine.loadCustomCommands();

      expect(engine.customCommands.has('custom command')).toBe(true);
      expect(engine.customCommands.get('custom command')).toBe('echo custom');
    });

    it('should handle errors when loading custom commands', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      await engine.loadCustomCommands();

      expect(warnSpy).toHaveBeenCalledWith('Failed to load custom commands:', expect.any(Error));
      // Should still have default commands
      expect(engine.customCommands.size).toBeGreaterThan(0);
    });
  });

  describe('voice profile', () => {
    it('should load voice profile from localStorage', async () => {
      const profile = {
        userId: 'test-user',
        preferences: { speed: 1.2 },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(profile));

      await engine.loadVoiceProfile();

      expect(engine.voiceProfile).toEqual(profile);
    });

    it('should handle errors when loading voice profile', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Profile error');
      });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      await engine.loadVoiceProfile();

      expect(warnSpy).toHaveBeenCalledWith('Failed to load voice profile:', expect.any(Error));
      expect(engine.voiceProfile).toBeNull();
    });
  });

  describe('voice recognition', () => {
    beforeEach(async () => {
      await engine.initializeRecognition();
    });

    it('should start listening', () => {
      engine.start();
      expect(engine.isListening).toBe(true);
    });

    it('should stop listening', () => {
      engine.start();
      engine.stop();
      expect(engine.isListening).toBe(false);
    });

    it('should handle recognition results', () => {
      const mockEvent = {
        results: [
          [
            {
              transcript: 'git status',
              confidence: 0.9,
            },
          ],
        ],
        resultIndex: 0,
      };

      // Mock handleRecognitionResult
      engine.handleRecognitionResult = jest.fn();
      engine.recognition.onresult(mockEvent);

      expect(engine.handleRecognitionResult).toHaveBeenCalledWith(mockEvent);
    });

    it('should handle recognition errors', () => {
      const mockError = {
        error: 'network',
        message: 'Network error',
      };

      engine.handleRecognitionError = jest.fn();
      engine.recognition.onerror(mockError);

      expect(engine.handleRecognitionError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      engine.updateConfig({
        confidenceThreshold: 0.8,
        noiseReduction: false,
      });

      expect(engine.config.confidenceThreshold).toBe(0.8);
      expect(engine.config.noiseReduction).toBe(false);
    });

    it('should change language', () => {
      engine.setLanguage('es-ES');
      expect(engine.language).toBe('es-ES');
      expect(engine.recognition.lang).toBe('es-ES');
    });
  });

  describe('command processing', () => {
    it('should add custom command', () => {
      engine.addCustomCommand('test command', 'echo test');

      expect(engine.customCommands.has('test command')).toBe(true);
      expect(engine.customCommands.get('test command')).toBe('echo test');
    });

    it('should remove custom command', () => {
      engine.addCustomCommand('test command', 'echo test');
      engine.removeCustomCommand('test command');

      expect(engine.customCommands.has('test command')).toBe(false);
    });

    it('should get all custom commands', () => {
      const commands = engine.getCustomCommands();
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
    });
  });

  describe('accuracy metrics', () => {
    it('should track accuracy metrics', () => {
      engine.recordCommand(true);
      engine.recordCommand(true);
      engine.recordCommand(false);

      expect(engine.accuracyMetrics.totalCommands).toBe(3);
      expect(engine.accuracyMetrics.correctCommands).toBe(2);
      expect(engine.accuracyMetrics.accuracy).toBeCloseTo(0.67, 2);
    });

    it('should reset accuracy metrics', () => {
      engine.recordCommand(true);
      engine.resetAccuracyMetrics();

      expect(engine.accuracyMetrics.totalCommands).toBe(0);
      expect(engine.accuracyMetrics.correctCommands).toBe(0);
      expect(engine.accuracyMetrics.accuracy).toBe(0);
    });
  });

  describe('noise filter', () => {
    it('should initialize noise filter', () => {
      engine.initializeNoiseFilter();

      expect(engine.noiseFilter).toBeDefined();
      expect(engine.noiseFilter.enabled).toBe(true);
      expect(engine.noiseFilter.threshold).toBe(0.1);
    });

    it('should toggle noise filter', () => {
      engine.initializeNoiseFilter();
      const initialState = engine.noiseFilter.enabled;

      engine.toggleNoiseFilter();
      expect(engine.noiseFilter.enabled).toBe(!initialState);
    });
  });

  describe('calibration', () => {
    it('should start calibration mode', () => {
      engine.startCalibration();
      expect(engine.config.calibrationMode).toBe(true);
      expect(engine.calibrationData).toEqual([]);
    });

    it('should stop calibration and save data', () => {
      engine.startCalibration();
      // Add some mock calibration data
      engine.calibrationData = [0.8, 0.9, 0.7];

      const setSpy = jest.spyOn(localStorage, 'setItem');
      engine.stopCalibration();

      expect(engine.config.calibrationMode).toBe(false);
      expect(setSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle unsupported browser', async () => {
      delete global.window.SpeechRecognition;
      delete global.window.webkitSpeechRecognition;

      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      const newEngine = new EnhancedVoiceEngine();
      await newEngine.init();

      expect(errorSpy).toHaveBeenCalledWith('Voice recognition not supported in this browser');

      // Restore
      global.window.SpeechRecognition = MockSpeechRecognition;
    });

    it('should handle recognition errors gracefully', () => {
      const errors = ['network', 'no-speech', 'aborted', 'audio-capture'];

      errors.forEach(errorType => {
        engine.handleRecognitionError({ error: errorType });
        // Should not throw
        expect(engine.isListening).toBeDefined();
      });
    });
  });
});
