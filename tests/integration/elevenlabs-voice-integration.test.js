/**
 * ElevenLabs Voice Integration Tests
 * 
 * This test suite verifies the integration between ElevenLabs voice 
 * functionality and existing voice systems.
 */

import { ElevenLabsVoiceProvider } from '../../src/voice-enhancements/elevenlabs-voice-provider.js';
import { MoodDetectionEngine } from '../../src/renderer/mood-detection-engine.js';
import { EnhancedVoiceEngine } from '../../src/voice-enhancements/enhanced-voice-engine.js';
import { RinaVoiceIntegration } from '../../src/voice-enhancements/rina-voice-integration.js';

// Mock Audio Context and related Web Audio API functionality
class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.sampleRate = 44100;
  }

  createGain() {
    return {
      gain: {
        setValueAtTime: jest.fn()
      },
      connect: jest.fn()
    };
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: jest.fn(),
      start: jest.fn(),
      playbackRate: {
        setValueAtTime: jest.fn()
      },
      onended: null
    };
  }

  decodeAudioData(buffer) {
    return Promise.resolve({
      duration: 2.0,
      numberOfChannels: 2,
      sampleRate: 44100
    });
  }

  close() {
    this.state = 'closed';
  }
}

// Mock ElevenLabs API Client
class MockElevenLabsAPI {
  constructor() {
    this.voices = {
      getAll: jest.fn(() => Promise.resolve([
        { voice_id: 'uSI3HxQeb8HZOrDcaj83', name: 'Test Voice' }
      ]))
    };
    this.textToSpeech = {
      convert: jest.fn(() => this.createMockAudioStream())
    };
  }

  createMockAudioStream() {
    const chunks = [new Uint8Array([1, 2, 3, 4])];
    let chunkIndex = 0;

    return {
      getReader() {
        return {
          read() {
            if (chunkIndex < chunks.length) {
              return Promise.resolve({ done: false, value: chunks[chunkIndex++] });
            }
            return Promise.resolve({ done: true });
          }
        };
      }
    };
  }
}

// Test configuration
const TEST_API_KEY = 'test_api_key';

describe('ElevenLabs Voice Integration', () => {
  let voiceProvider;
  let moodEngine;
  let voiceEngine;
  let rinaIntegration;

  beforeEach(() => {
    // Mock browser APIs
    global.AudioContext = MockAudioContext;
    global.window = {
      AudioContext: MockAudioContext,
      speechSynthesis: {
        getVoices: () => [],
        speak: jest.fn(),
        cancel: jest.fn()
      }
    };
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn()
    };

    // Initialize components
    voiceProvider = new ElevenLabsVoiceProvider({
      audioContext: new MockAudioContext()
    });
    voiceProvider.client = new MockElevenLabsAPI();

    moodEngine = new MoodDetectionEngine();
    voiceEngine = new EnhancedVoiceEngine();
    rinaIntegration = new RinaVoiceIntegration(voiceEngine);
  });

  afterEach(() => {
    voiceProvider.destroy();
    moodEngine.destroy();
    jest.clearAllMocks();
  });

  describe('Basic Integration', () => {
    test('initializes with correct voice ID', async () => {
      await voiceProvider.initialize(TEST_API_KEY);
      expect(voiceProvider.config.voiceId).toBe('uSI3HxQeb8HZOrDcaj83');
    });

    test('integrates with existing voice system', async () => {
      await voiceProvider.initialize(TEST_API_KEY);
      await voiceEngine.init();
      voiceProvider.integrateWithVoiceSystem(voiceEngine);
      
      const testText = 'Hello world';
      await voiceEngine.speak(testText);
      
      expect(voiceProvider.client.textToSpeech.convert).toHaveBeenCalled();
    });

    test('handles mood-based voice modulation', async () => {
      await voiceProvider.initialize(TEST_API_KEY);
      voiceProvider.integrateWithMoodSystem(moodEngine);

      // Test different moods
      const moods = ['confident', 'neutral', 'uncertain', 'excited'];
      for (const mood of moods) {
        voiceProvider.setMood(mood);
        await voiceProvider.speak('Test text', { mood });

        const lastCall = voiceProvider.client.textToSpeech.convert.mock.lastCall[0];
        expect(lastCall.voice_settings).toMatchObject(voiceProvider.moodSettings[mood]);
      }
    });
  });

  describe('Voice Command Integration', () => {
    test('executes voice commands with appropriate responses', async () => {
      await voiceProvider.initialize(TEST_API_KEY);
      await voiceEngine.init();
      voiceProvider.integrateWithVoiceSystem(voiceEngine);

      const commands = [
        { text: 'list files', expected: 'Listing directory contents' },
        { text: 'clear screen', expected: 'Clearing the terminal' },
        { text: 'show help', expected: 'Here are the available commands' }
      ];

      for (const cmd of commands) {
        await voiceEngine.speak(cmd.text);
        expect(voiceProvider.client.textToSpeech.convert).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.stringContaining(cmd.expected)
          })
        );
      }
    });

    test('adjusts voice based on command context', async () => {
      await voiceProvider.initialize(TEST_API_KEY);
      await voiceEngine.init();
      voiceProvider.integrateWithVoiceSystem(voiceEngine);

      // Test error scenario
      await voiceEngine.speak('Command failed: permission denied', { mood: 'frustrated' });
      expect(voiceProvider.client.textToSpeech.convert).toHaveBeenCalledWith(
        expect.objectContaining({
          voice_settings: expect.objectContaining(voiceProvider.moodSettings.frustrated)
        })
      );

      // Test success scenario
      await voiceEngine.speak('Command completed successfully', { mood: 'confident' });
      expect(voiceProvider.client.textToSpeech.convert).toHaveBeenCalledWith(
        expect.objectContaining({
          voice_settings: expect.objectContaining(voiceProvider.moodSettings.confident)
        })
      );
    });
  });

  describe('Fallback Mechanisms', () => {
    test('activates browser synthesis fallback when API fails', async () => {
      await voiceProvider.initialize(TEST_API_KEY);
      voiceProvider.client.textToSpeech.convert.mockRejectedValueOnce(new Error('API Error'));

      await voiceProvider.speak('Test fallback', { mood: 'neutral' });
      expect(window.speechSynthesis.speak).toHaveBeenCalled();
    });

    test('activates Rina clips fallback when appropriate', async () => {
      await voiceProvider.initialize(TEST_API_KEY);
      voiceProvider.connectRinaClips(rinaIntegration.rinaVoice);

      // Simulate API failure
      voiceProvider.client.textToSpeech.convert.mockRejectedValueOnce(new Error('API Error'));
      
      // Test with a command that has a matching Rina clip
      await voiceProvider.speak('Hello!', { mood: 'confident' });
      expect(rinaIntegration.rinaVoice.speak).toHaveBeenCalled();
    });

    test('handles multiple fallback levels appropriately', async () => {
      await voiceProvider.initialize(TEST_API_KEY);
      
      // Force all fallbacks to fail
      voiceProvider.client.textToSpeech.convert.mockRejectedValue(new Error('API Error'));
      window.speechSynthesis.speak.mockImplementation(() => {
        throw new Error('Synthesis Error');
      });
      
      await expect(voiceProvider.speak('Test multiple fallbacks')).rejects.toThrow();
    });
  });

  describe('Cache System', () => {
    test('reduces API calls by caching responses', async () => {
      await voiceProvider.initialize(TEST_API_KEY);
      const testText = 'Cache test';

      // First call should hit the API
      await voiceProvider.speak(testText);
      expect(voiceProvider.client.textToSpeech.convert).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await voiceProvider.speak(testText);
      expect(voiceProvider.client.textToSpeech.convert).toHaveBeenCalledTimes(1);
    });

    test('handles cache expiration correctly', async () => {
      await voiceProvider.initialize(TEST_API_KEY);
      const testText = 'Expiration test';

      // First call
      await voiceProvider.speak(testText);

      // Simulate cache expiration
      voiceProvider.cacheExpirationTime = 0;
      await voiceProvider.speak(testText);

      expect(voiceProvider.client.textToSpeech.convert).toHaveBeenCalledTimes(2);
    });
  });

  describe('Voice Mode Switching', () => {
    test('switches between ElevenLabs and default voice system', async () => {
      await voiceProvider.initialize(TEST_API_KEY);
      await voiceEngine.init();
      voiceProvider.integrateWithVoiceSystem(voiceEngine);

      // Test ElevenLabs mode
      await voiceEngine.speak('Test ElevenLabs', { useElevenLabs: true });
      expect(voiceProvider.client.textToSpeech.convert).toHaveBeenCalled();

      // Test default mode
      await voiceEngine.speak('Test default', { useElevenLabs: false });
      expect(voiceProvider.client.textToSpeech.convert).not.toHaveBeenCalled();
    });

    test('handles mode switching errors gracefully', async () => {
      await voiceProvider.initialize(TEST_API_KEY);
      await voiceEngine.init();
      voiceProvider.integrateWithVoiceSystem(voiceEngine);

      // Simulate ElevenLabs failure
      voiceProvider.client.textToSpeech.convert.mockRejectedValueOnce(new Error('API Error'));

      // Should fall back to default voice system
      await voiceEngine.speak('Test fallback switching');
      expect(window.speechSynthesis.speak).toHaveBeenCalled();
    });
  });

  describe('Audio Playback', () => {
    test('handles audio playback synchronization', async () => {
      await voiceProvider.initialize(TEST_API_KEY);
      const onEnded = jest.fn();

      await voiceProvider.speak('Test playback', { onEnd: onEnded });
      
      // Simulate playback completion
      const audioSource = voiceProvider.audioContext.createBufferSource();
      audioSource.onended();

      expect(onEnded).toHaveBeenCalled();
    });

    test('manages multiple sequential audio requests', async () => {
      await voiceProvider.initialize(TEST_API_KEY);
      const texts = ['First message', 'Second message', 'Third message'];

      // Queue multiple speak requests
      const promises = texts.map(text => voiceProvider.speak(text));
      await Promise.all(promises);

      expect(voiceProvider.client.textToSpeech.convert).toHaveBeenCalledTimes(texts.length);
    });
  });

  describe('Performance Metrics', () => {
    test('tracks API usage and performance metrics', async () => {
      await voiceProvider.initialize(TEST_API_KEY);

      // Make some requests
      await voiceProvider.speak('Test metrics 1');
      await voiceProvider.speak('Test metrics 2');
      
      const status = voiceProvider.getStatus();
      expect(status.metrics.totalRequests).toBe(2);
      expect(status.metrics.successfulRequests).toBe(2);
    });

    test('monitors API health status', async () => {
      await voiceProvider.initialize(TEST_API_KEY);

      // Test successful health check
      await voiceProvider.performHealthCheck();
      expect(voiceProvider.apiHealth.isAvailable).toBe(true);

      // Test failed health check
      voiceProvider.client.voices.getAll.mockRejectedValueOnce(new Error('Health check failed'));
      await voiceProvider.performHealthCheck();
      expect(voiceProvider.apiHealth.consecutiveFailures).toBeGreaterThan(0);
    });
  });
});
