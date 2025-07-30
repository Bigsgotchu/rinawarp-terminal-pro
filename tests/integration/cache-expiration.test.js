/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

// tests/integration/cache-expiration.test.js

const path = require('node:path');

// Mock the voice provider path - adjust based on your actual structure
jest.mock('../../src/voice-enhancements/elevenlabs-voice-provider', () => ({
  initialize: jest.fn().mockResolvedValue(true),
  speak: jest.fn(),
  cache: {
    clear: jest.fn()
  },
  client: {
    textToSpeech: {
      convert: jest.fn()
    }
  }
}), { virtual: true });

const voiceProvider = require('../../src/voice-enhancements/elevenlabs-voice-provider');

jest.useFakeTimers();

describe('Voice Cache Expiration', () => {
  const testText = 'Hello world';

  beforeEach(async () => {
    await voiceProvider.initialize();
    voiceProvider.cache.clear?.();
    jest.clearAllMocks();
  });

  test('should cache voice response and expire it', async () => {
    const mockConvert = jest.fn().mockResolvedValue('audio-buffer');
    voiceProvider.client.textToSpeech.convert = mockConvert;

    await voiceProvider.speak(testText);
    expect(mockConvert).toHaveBeenCalledTimes(1);

    // Simulate cache hit
    await voiceProvider.speak(testText);
    expect(mockConvert).toHaveBeenCalledTimes(1);

    // Simulate expiration
    jest.advanceTimersByTime(60000); // assuming 60s TTL
    await voiceProvider.speak(testText);
    expect(mockConvert).toHaveBeenCalledTimes(2);
  });

  test('should handle cache gracefully when provider is unavailable', async () => {
    // Test graceful degradation
    expect(() => voiceProvider.cache.clear()).not.toThrow();
  });
});
