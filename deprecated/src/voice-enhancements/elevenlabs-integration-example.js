/**
 * ElevenLabs Voice Provider Integration Example
 *
 * This file demonstrates how to integrate and use the ElevenLabs Voice Provider
 * with the existing RinaWarp Terminal voice system.
 */

import ElevenLabsVoiceProvider from './elevenlabs-voice-provider.js';
import { EnhancedVoiceEngine } from './enhanced-voice-engine.js';
import { RinaVoiceIntegration } from './rina-voice-integration.js';

export class ElevenLabsIntegrationManager {
  constructor() {
    this.elevenLabsProvider = null;
    this.voiceEngine = null;
    this.rinaIntegration = null;
    this.isInitialized = false;

    console.log('🎙️ ElevenLabs Integration Manager created');
  }

  /**
   * Initialize the complete voice system with ElevenLabs integration
   */
  async initialize(elevenLabsApiKey) {
    try {
      console.log('🚀 Initializing ElevenLabs integration...');

      // Step 1: Initialize the existing voice engine
      this.voiceEngine = new EnhancedVoiceEngine();
      await this.voiceEngine.init();

      // Step 2: Initialize ElevenLabs provider with enhanced fallback configuration
      this.elevenLabsProvider = new ElevenLabsVoiceProvider({
        fallbackEnabled: true,
        maxCacheSize: 50,
        voiceConfig: {
          // Use custom settings if needed
          stability: 0.6,
          similarityBoost: 0.8,
        },
        fallbackConfig: {
          enableRetry: true,
          maxRetries: 3,
          retryBaseDelay: 1000,
          retryMaxDelay: 8000,
          fallbackToSynthesis: true,
          fallbackToRinaClips: true,
          enableConnectionHealth: true,
          healthCheckInterval: 30000,
          cacheFailedRequests: true,
        },
      });

      const success = await this.elevenLabsProvider.initialize(elevenLabsApiKey);
      if (!success) {
        console.warn('⚠️ ElevenLabs initialization failed, fallback systems active');
      }

      // Step 3: Initialize Rina voice integration
      this.rinaIntegration = new RinaVoiceIntegration(this.voiceEngine);
      await this.rinaIntegration.init();

      // Step 4: Integrate ElevenLabs with existing systems
      this.integrateSystems();

      // Step 5: Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('✅ ElevenLabs integration complete!');

      // Test the integration
      await this.testIntegration();

      return true;
    } catch (error) {
      console.error('❌ ElevenLabs integration failed:', error.message);
      return false;
    }
  }

  /**
   * Integrate ElevenLabs with existing voice systems
   */
  integrateSystems() {
    if (!this.elevenLabsProvider) return;

    // Integrate with existing voice engine
    this.elevenLabsProvider.integrateWithVoiceSystem(this.voiceEngine);

    // Override Rina voice system speak method to use ElevenLabs when available
    if (this.rinaIntegration?.rinaVoice) {
      const originalRinaSpeak = this.rinaIntegration.rinaVoice.speak.bind(
        this.rinaIntegration.rinaVoice
      );

      this.rinaIntegration.rinaVoice.speak = async (key, options = {}) => {
        try {
          // Get the fallback text for this key
          const voiceData = this.rinaIntegration.rinaVoice.voiceMap.get(key);
          if (voiceData?.fallback && this.elevenLabsProvider.isInitialized) {
            // Use ElevenLabs for the fallback text
            const mood = options.mood || 'neutral';
            await this.elevenLabsProvider.speak(voiceData.fallback, {
              mood,
              volume: options.volume,
              priority: 'normal',
              onEnd: options.onComplete,
              onError: options.onError,
            });

            return true;
          } else {
            // Fall back to original Rina voice system
            return await originalRinaSpeak(key, options);
          }
        } catch (error) {
          console.warn('ElevenLabs failed, using original Rina voice:', error.message);
          return await originalRinaSpeak(key, options);
        }
      };

      console.log('🔗 ElevenLabs integrated with Rina voice system');
    }

    // Integrate with mood detection
    if (this.voiceEngine?.moodDetectionEngine) {
      this.elevenLabsProvider.integrateWithMoodSystem(this.voiceEngine.moodDetectionEngine);
    }

    // Connect Rina clips fallback system
    if (this.rinaIntegration?.rinaVoice) {
      this.elevenLabsProvider.connectRinaClips(this.rinaIntegration.rinaVoice);
      console.log('🔗 Rina clips connected as fallback system');
    }
  }

  /**
   * Set up event listeners for system integration
   */
  setupEventListeners() {
    // Listen for mood changes from voice engine
    window.addEventListener('voice-recognition-update', event => {
      const { state, data } = event.detail;

      if (state === 'mood-detected' && data.mood) {
        this.elevenLabsProvider?.setMood(data.mood);
        console.log(`🧠 Mood synchronized: ${data.mood}`);
      }
    });

    // Listen for Rina mood changes
    window.addEventListener('rina-mood-change', event => {
      const { mood } = event.detail;
      this.elevenLabsProvider?.setMood(mood);
      console.log(`🎭 Rina mood synchronized: ${mood}`);
    });

    // Listen for terminal events
    window.addEventListener('terminal-command-executing', async event => {
      const { command } = event.detail;

      // Announce command execution with ElevenLabs
      if (this.elevenLabsProvider?.isInitialized) {
        await this.elevenLabsProvider.speak(`Executing ${command}`, {
          mood: 'focused',
          priority: 'low',
          volume: 0.6,
        });
      }
    });

    // Listen for terminal boot complete
    window.addEventListener('terminal-boot-complete', async () => {
      if (this.elevenLabsProvider?.isInitialized) {
        await this.elevenLabsProvider.speak('RinaWarp Terminal ready with AI voice assistance', {
          mood: 'confident',
          priority: 'high',
          volume: 0.8,
        });
      }
    });

    console.log('👂 Event listeners configured for ElevenLabs integration');
  }

  /**
   * Test the ElevenLabs integration
   */
  async testIntegration() {
    if (!this.elevenLabsProvider?.isInitialized) {
      console.log('⏭️ Skipping ElevenLabs test (not initialized)');
      return;
    }

    try {
      console.log('🧪 Testing ElevenLabs integration...');

      // Test different moods
      const testPhrases = [
        { text: 'Hello! I am Rina, your AI terminal assistant.', mood: 'confident' },
        { text: 'Let me help you with that command.', mood: 'helpful' },
        { text: 'Hmm, that seems complex. Let me think...', mood: 'curious' },
        { text: 'Command completed successfully!', mood: 'satisfied' },
      ];

      for (const phrase of testPhrases) {
        console.log(`🎙️ Testing mood: ${phrase.mood}`);

        // Set mood and speak
        this.elevenLabsProvider.setMood(phrase.mood);
        await this.elevenLabsProvider.speak(phrase.text, {
          mood: phrase.mood,
          volume: 0.7,
          priority: 'normal',
        });

        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log('✅ ElevenLabs integration test complete!');
    } catch (error) {
      console.error('❌ ElevenLabs test failed:', error.message);
    }
  }

  /**
   * Handle voice command with ElevenLabs response
   */
  async handleVoiceCommand(command, transcript, mood = 'neutral') {
    if (!this.elevenLabsProvider?.isInitialized) {
      return false;
    }

    // Map common commands to ElevenLabs responses
    const commandResponses = {
      clear: 'Clearing the terminal',
      ls: 'Listing directory contents',
      pwd: 'Showing current directory',
      cd: 'Changing directory',
      git: 'Running git command',
      npm: 'Executing npm command',
      help: 'Here are the available commands...',
      exit: 'Goodbye! Terminal session ending.',
    };

    const commandType = command.split(' ')[0];
    const response = commandResponses[commandType];

    if (response) {
      try {
        await this.elevenLabsProvider.speak(response, {
          mood: mood === 'frustrated' ? 'calm' : mood,
          priority: 'normal',
          volume: 0.75,
        });
        return true;
      } catch (error) {
        console.warn('ElevenLabs command response failed:', error.message);
        return false;
      }
    }

    return false;
  }

  /**
   * Handle error announcements with appropriate mood
   */
  async announceError(errorMessage, severity = 'normal') {
    if (!this.elevenLabsProvider?.isInitialized) {
      return false;
    }

    const moodMap = {
      low: 'neutral',
      normal: 'concerned',
      high: 'urgent',
      critical: 'alert',
    };

    const mood = moodMap[severity] || 'concerned';

    try {
      await this.elevenLabsProvider.speak(`Error: ${errorMessage}. Let me help you fix this.`, {
        mood,
        priority: 'high',
        volume: 0.8,
      });
      return true;
    } catch (error) {
      console.warn('ElevenLabs error announcement failed:', error.message);
      return false;
    }
  }

  /**
   * Enhanced speak method with comprehensive fallback handling
   */
  async speakWithFallback(text, options = {}) {
    if (!this.elevenLabsProvider) {
      console.warn('ElevenLabs provider not available');
      return false;
    }

    try {
      return await this.elevenLabsProvider.speakWithFallback(text, {
        ...options,
        onFallback: fallbackType => {
          console.log(`🔄 Using fallback: ${fallbackType}`);
          // Dispatch fallback event for UI feedback
          window.dispatchEvent(
            new CustomEvent('elevenlabs-fallback-used', {
              detail: { fallbackType, text: text.substring(0, 50) },
            })
          );
        },
        onError: error => {
          console.warn('Enhanced speak failed:', error.message);
          if (options.onError) options.onError(error);
        },
      });
    } catch (error) {
      console.error('Complete speech failure:', error.message);
      return false;
    }
  }

  /**
   * Test fallback systems
   */
  async testFallbackSystems() {
    if (!this.elevenLabsProvider) {
      console.warn('ElevenLabs provider not available for fallback testing');
      return;
    }

    console.log('🧪 Testing fallback systems...');

    // Test with different scenarios
    const testScenarios = [
      { text: 'Testing primary ElevenLabs voice', scenario: 'normal' },
      { text: 'Hello from Rina!', scenario: 'rina-clip' },
      { text: 'This is a fallback test using browser synthesis', scenario: 'synthesis' },
    ];

    for (const test of testScenarios) {
      console.log(`Testing ${test.scenario} scenario...`);

      try {
        await this.speakWithFallback(test.text, {
          mood: 'neutral',
          priority: 'normal',
          volume: 0.7,
          onFallback: fallbackType => {
            console.log(`✅ Fallback test successful: ${fallbackType}`);
          },
        });

        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Fallback test failed for ${test.scenario}:`, error.message);
      }
    }

    console.log('🏁 Fallback testing complete');
  }

  /**
   * Get comprehensive system status including ElevenLabs metrics
   */
  getStatus() {
    const elevenLabsStatus = this.elevenLabsProvider?.getStatus() || null;

    return {
      initialized: this.isInitialized,
      elevenLabs: elevenLabsStatus,
      voiceEngine: this.voiceEngine?.getStatus() || null,
      rinaIntegration: this.rinaIntegration?.getStatus() || null,
      healthSummary: elevenLabsStatus
        ? {
            apiHealthy: elevenLabsStatus.apiHealth?.isAvailable !== false,
            fallbacksAvailable:
              elevenLabsStatus.fallbackSystems?.synthesis ||
              elevenLabsStatus.fallbackSystems?.rinaClips,
            cacheEfficiency:
              elevenLabsStatus.metrics?.cacheHits /
                Math.max(1, elevenLabsStatus.metrics?.totalRequests) || 0,
            errorRate:
              elevenLabsStatus.metrics?.failedRequests /
                Math.max(1, elevenLabsStatus.metrics?.totalRequests) || 0,
          }
        : null,
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const status = this.elevenLabsProvider?.getStatus();
    if (!status) return null;

    return {
      timestamp: Date.now(),
      metrics: status.metrics,
      apiHealth: status.apiHealth,
      cacheStats: {
        audioCache: status.cacheSize,
        failedCache: status.failedCacheSize,
        maxCache: status.maxCacheSize,
        cacheHitRate:
          ((status.metrics.cacheHits / Math.max(1, status.metrics.totalRequests)) * 100).toFixed(
            1
          ) + '%',
      },
      fallbackStats: {
        synthesisAvailable: status.fallbackSystems.synthesis,
        rinaClipsAvailable: status.fallbackSystems.rinaClips,
        fallbackUsageRate:
          ((status.metrics.fallbackHits / Math.max(1, status.metrics.totalRequests)) * 100).toFixed(
            1
          ) + '%',
      },
    };
  }

  /**
   * Update ElevenLabs API key
   */
  async updateApiKey(newApiKey) {
    if (this.elevenLabsProvider) {
      const success = await this.elevenLabsProvider.initialize(newApiKey);
      if (success) {
        console.log('✅ ElevenLabs API key updated successfully');

        // Store in localStorage for persistence
        try {
          localStorage.setItem('elevenlabs_api_key', newApiKey);
        } catch (error) {
          console.warn('Failed to store API key:', error.message);
        }
      }
      return success;
    }
    return false;
  }

  /**
   * Enable/disable ElevenLabs provider
   */
  toggleElevenLabs(enabled) {
    if (this.elevenLabsProvider) {
      if (enabled && !this.elevenLabsProvider.isInitialized) {
        // Try to reinitialize
        const apiKey = this.elevenLabsProvider.getApiKeyFromStorage();
        if (apiKey) {
          this.elevenLabsProvider.initialize(apiKey);
        }
      } else if (!enabled && this.elevenLabsProvider.isInitialized) {
        // Disable by clearing the client (but keep configuration)
        this.elevenLabsProvider.isInitialized = false;
        console.log('🔇 ElevenLabs provider disabled');
      }
    }
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    if (this.elevenLabsProvider) {
      this.elevenLabsProvider.destroy();
    }

    if (this.rinaIntegration) {
      this.rinaIntegration.destroy();
    }

    if (this.voiceEngine) {
      this.voiceEngine.destroy();
    }

    this.isInitialized = false;
    console.log('🧹 ElevenLabs Integration Manager destroyed');
  }
}

// Export for global use
export default ElevenLabsIntegrationManager;

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  window.ElevenLabsIntegrationManager = ElevenLabsIntegrationManager;
  console.log('🌐 ElevenLabs Integration Manager available globally');
}
