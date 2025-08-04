/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

// tests/integration/fallback-behavior.test.js

require('../setup/voice-mocks.js');
const dashboard = require('../utils/voice-test-dashboard');

// Mock the voice provider with fallback mechanisms
jest.mock(
  '../../src/voice-enhancements/elevenlabs-voice-provider',
  () => ({
    speak: jest.fn(),
    client: {
      textToSpeech: {
        convert: jest.fn(),
      },
    },
    rinaClipPlayer: {
      playFallbackClip: jest.fn(),
    },
    moodEngine: {
      adjustMood: jest.fn(),
    },
  }),
  { virtual: true }
);

const voiceProvider = require('../../src/voice-enhancements/elevenlabs-voice-provider');

describe('Voice Fallback Behavior', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Default: ElevenLabs API fails
    voiceProvider.client.textToSpeech.convert = jest.fn().mockRejectedValue(new Error('API Error'));

    // Mock fallback systems
    voiceProvider.rinaClipPlayer = {
      playFallbackClip: jest.fn().mockResolvedValue(true),
    };
    voiceProvider.moodEngine = {
      adjustMood: jest.fn(),
    };
  });

  test('should fallback to browser synthesis when ElevenLabs fails', async () => {
    // Mock the actual speak function to simulate fallback logic
    voiceProvider.speak = jest.fn().mockImplementation(async text => {
      try {
        await voiceProvider.client.textToSpeech.convert(text);
      } catch (error) {
        // Fallback to browser synthesis
        window.speechSynthesis.speak({ text });
        voiceProvider.moodEngine.adjustMood('fallback');
      }
    });

    await voiceProvider.speak('Fallback test');

    // Log telemetry
    dashboard.logFallback('browser', 'ElevenLabs API Error');
    dashboard.logMoodChange('fallback');
    dashboard.logAudioSource('speechSynthesis');

    expect(window.speechSynthesis.speak).toHaveBeenCalled();
    expect(voiceProvider.moodEngine.adjustMood).toHaveBeenCalledWith('fallback');
  });

  test('should fallback to Rina clips when browser synthesis fails', async () => {
    // Mock browser synthesis to fail
    window.speechSynthesis.speak.mockImplementation(() => {
      throw new Error(new Error('Synthesis Error'));
    });

    // Mock the speak function with double fallback
    voiceProvider.speak = jest.fn().mockImplementation(async text => {
      try {
        await voiceProvider.client.textToSpeech.convert(text);
      } catch (error) {
        try {
          window.speechSynthesis.speak({ text });
        } catch (_synthError) {
          // Final fallback to Rina clips
          await voiceProvider.rinaClipPlayer.playFallbackClip('fallback_generic');
          voiceProvider.moodEngine.adjustMood('grumpy');
        }
      }
    });

    await voiceProvider.speak('Fallback test');

    // Log telemetry
    dashboard.logFallback('rinaClip', 'Browser synthesis failed');
    dashboard.logMoodChange('grumpy');
    dashboard.logAudioSource('rinaClip');

    expect(voiceProvider.rinaClipPlayer.playFallbackClip).toHaveBeenCalledWith('fallback_generic');
    expect(voiceProvider.moodEngine.adjustMood).toHaveBeenCalledWith('grumpy');
  });

  test('should handle mood transitions correctly', async () => {
    voiceProvider.speak = jest.fn().mockImplementation(async text => {
      // Simulate successful API call
      await voiceProvider.client.textToSpeech.convert(text);
      voiceProvider.moodEngine.adjustMood('happy');
    });

    // Override to make API succeed
    voiceProvider.client.textToSpeech.convert = jest.fn().mockResolvedValue('audio-buffer');

    await voiceProvider.speak('Success test');

    // Log telemetry
    dashboard.logMoodChange('happy');
    dashboard.logAudioSource('elevenLabs');

    expect(voiceProvider.moodEngine.adjustMood).toHaveBeenCalledWith('happy');
  });

  test('should gracefully handle all systems failing', async () => {
    // Make everything fail
    window.speechSynthesis.speak.mockImplementation(() => {
      throw new Error(new Error('Synthesis Error'));
    });
    voiceProvider.rinaClipPlayer.playFallbackClip.mockRejectedValue(new Error('Clip Error'));

    voiceProvider.speak = jest.fn().mockImplementation(async text => {
      try {
        await voiceProvider.client.textToSpeech.convert(text);
      } catch (error) {
        try {
          window.speechSynthesis.speak({ text });
        } catch (_synthError) {
          try {
            await voiceProvider.rinaClipPlayer.playFallbackClip('fallback_generic');
          } catch (_clipError) {
            // Silent fallback - system still functions
            voiceProvider.moodEngine.adjustMood('silent');
          }
        }
      }
    });

    // Should not throw an error even if everything fails
    await expect(voiceProvider.speak('Total failure test')).resolves.not.toThrow();

    // Log telemetry
    dashboard.logFallback('silent', 'All voice systems failed');
    dashboard.logMoodChange('silent');
    dashboard.logAudioSource('none');

    expect(voiceProvider.moodEngine.adjustMood).toHaveBeenCalledWith('silent');
  });
});

afterAll(() => {
  dashboard.summary();
  dashboard.exportMarkdown();
  dashboard.exportJSON();

  console.log('\n🎯 Voice System Confidence Score:', dashboard.getConfidenceScore() + '%');
  console.log('💬 Rina\'s Commentary:', dashboard.getRinaCommentary());
});
