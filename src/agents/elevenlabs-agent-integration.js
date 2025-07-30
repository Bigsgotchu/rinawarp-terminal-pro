/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * ElevenLabs Agent Integration
 * Real implementation for voice synthesis using ElevenLabs API
 * Safe singleton pattern to prevent redeclaration errors
 */

if (!window.ElevenLabsAgentIntegration) {
  window.ElevenLabsAgentIntegration = (() => {
    class ElevenLabsAgentIntegration {
      constructor() {
        this.apiKey = null;
        this.voiceId = null;
        this.isInitialized = false;
        this.isPlaying = false;
        this.currentAudio = null;

        // Load configuration from environment or stored config
        this.loadConfiguration();
      }

      /**
       * Load ElevenLabs configuration
       */
      async loadConfiguration() {
        try {
          // Try to get from environment first
          if (window.electronAPI && window.electronAPI.loadElevenLabsConfig) {
            const config = await window.electronAPI.loadElevenLabsConfig();
            this.apiKey = config.apiKey;
            this.voiceId = config.voiceId || 'EXAVITQu4vr4xnSDxMaL'; // Default to Bella
          } else if (process && process.env && process.env.ELEVENLABS_API_KEY) {
            this.apiKey = process.env.ELEVENLABS_API_KEY;
            this.voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Default voice
          } else {
            // Try localStorage as fallback
            const storedConfig = localStorage.getItem('elevenlabs-config');
            if (storedConfig) {
              const config = JSON.parse(storedConfig);
              this.apiKey = config.apiKey;
              this.voiceId = config.voiceId || 'EXAVITQu4vr4xnSDxMaL';
            }
          }

          if (this.apiKey) {
            this.isInitialized = true;
            console.log('🎤 ElevenLabs configuration loaded successfully');
          } else {
            console.warn('⚠️ ElevenLabs API key not found');
          }
        } catch (error) {
          console.error('❌ Error loading ElevenLabs configuration:', error);
        }
      }

      /**
       * Start the ElevenLabs agent
       */
      async start() {
        try {
          console.log('🎤 Starting ElevenLabs Agent Integration...');

          if (!this.isInitialized) {
            await this.loadConfiguration();
          }

          if (!this.apiKey) {
            console.warn('⚠️ ElevenLabs API key not configured');
            return false;
          }

          // Test the API connection
          const isValid = await this.testConnection();
          if (isValid) {
            console.log('✅ ElevenLabs Agent Integration started successfully');
            return true;
          } else {
            console.error('❌ Failed to connect to ElevenLabs API');
            return false;
          }
        } catch (error) {
          console.error('❌ Error starting ElevenLabs Agent:', error);
          return false;
        }
      }

      /**
       * Stop the ElevenLabs agent
       */
      async stop() {
        try {
          console.log('🎤 Stopping ElevenLabs Agent Integration...');

          // Stop any current audio
          if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
          }

          this.isPlaying = false;
          console.log('✅ ElevenLabs Agent Integration stopped');
          return true;
        } catch (error) {
          console.error('❌ Error stopping ElevenLabs Agent:', error);
          return false;
        }
      }

      /**
       * Speak text using ElevenLabs
       */
      async speak(text) {
        try {
          if (!this.isInitialized || !this.apiKey) {
            console.warn('⚠️ ElevenLabs not initialized or API key missing');
            return false;
          }

          if (!text || typeof text !== 'string') {
            console.warn('⚠️ Invalid text provided to speak()');
            return false;
          }

          console.log(`🗣️ Speaking: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

          // Stop any current audio
          if (this.currentAudio) {
            this.currentAudio.pause();
          }

          this.isPlaying = true;

          // Call ElevenLabs API
          const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
            {
              method: 'POST',
              headers: {
                Accept: 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': this.apiKey,
              },
              body: JSON.stringify({
                text: text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: {
                  stability: 0.5,
                  similarity_boost: 0.5,
                },
              }),
            }
          );

          if (!response.ok) {
            throw new Error(new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`));
          }

          // Convert response to audio blob
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);

          // Create and play audio
          this.currentAudio = new Audio(audioUrl);

          return new Promise((resolve, reject) => {
            this.currentAudio.onended = () => {
              this.isPlaying = false;
              URL.revokeObjectURL(audioUrl);
              console.log('✅ Speech completed');
              resolve(true);
            };

            this.currentAudio.onerror = error => {
              this.isPlaying = false;
              URL.revokeObjectURL(audioUrl);
              console.error('❌ Audio playback error:', error);
              reject(error);
            };

            this.currentAudio.play().catch(error => {
              this.isPlaying = false;
              URL.revokeObjectURL(audioUrl);
              console.error('❌ Failed to play audio:', error);
              reject(error);
            });
          });
        } catch (error) {
          this.isPlaying = false;
          console.error('❌ Error in speak():', error);
          return false;
        }
      }

      /**
       * Check if ElevenLabs is ready
       */
      isReady() {
        const ready = this.isInitialized && !!this.apiKey;
        console.log(`🔍 ElevenLabs ready status: ${ready}`);
        return ready;
      }

      /**
       * Test connection to ElevenLabs API
       */
      async testConnection() {
        try {
          if (!this.apiKey) {
            return false;
          }

          const response = await fetch('https://api.elevenlabs.io/v1/user', {
            method: 'GET',
            headers: {
              'xi-api-key': this.apiKey,
            },
          });

          return response.ok;
        } catch (error) {
          console.error('❌ ElevenLabs connection test failed:', error);
          return false;
        }
      }

      /**
       * Get available voices
       */
      async getVoices() {
        try {
          if (!this.apiKey) {
            return [];
          }

          const response = await fetch('https://api.elevenlabs.io/v1/voices', {
            method: 'GET',
            headers: {
              'xi-api-key': this.apiKey,
            },
          });

          if (response.ok) {
            const data = await response.json();
            return data.voices || [];
          }
          return [];
        } catch (error) {
          console.error('❌ Error fetching voices:', error);
          return [];
        }
      }

      /**
       * Update configuration
       */
      async updateConfig(apiKey, voiceId) {
        try {
          this.apiKey = apiKey;
          this.voiceId = voiceId || 'EXAVITQu4vr4xnSDxMaL';
          this.isInitialized = !!apiKey;

          // Save to localStorage as backup
          localStorage.setItem(
            'elevenlabs-config',
            JSON.stringify({
              apiKey: this.apiKey,
              voiceId: this.voiceId,
            })
          );

          console.log('✅ ElevenLabs configuration updated');
          return true;
        } catch (error) {
          console.error('❌ Error updating ElevenLabs config:', error);
          return false;
        }
      }

      /**
       * Test voice with a sample phrase
       */
      async testVoice(
        testText = 'Hello! This is a test of the ElevenLabs voice integration for RinaWarp Terminal.'
      ) {
        try {
          if (!this.isInitialized || !this.apiKey) {
            throw new Error(new Error('ElevenLabs not initialized or API key missing'));
          }

          console.log('🎤 Testing ElevenLabs voice with sample text...');

          // Use the speak method to test the voice
          const success = await this.speak(testText);

          if (success) {
            console.log('✅ Voice test completed successfully');
            return {
              success: true,
              message: 'Voice test successful! Audio should be playing.',
              voiceId: this.voiceId,
              testText: testText,
            };
          } else {
            throw new Error(new Error('Voice synthesis failed'));
          }
        } catch (error) {
          console.error('❌ Voice test failed:', error);
          return {
            success: false,
            message: `Voice test failed: ${error.message}`,
            voiceId: this.voiceId,
          };
        }
      }

      /**
       * Get current status
       */
      getStatus() {
        return {
          initialized: this.isInitialized,
          hasApiKey: !!this.apiKey,
          voiceId: this.voiceId,
          isPlaying: this.isPlaying,
        };
      }
    }

    // Create global instance
    const elevenLabsAgent = new ElevenLabsAgentIntegration();

    // Auto-initialize on load
    document.addEventListener('DOMContentLoaded', () => {
      elevenLabsAgent.start().then(success => {
        if (success) {
          console.log('🎤 ElevenLabs Agent auto-initialized successfully');
        }
      });
    });

    console.log('🎤 ElevenLabs Agent Integration loaded');

    // Return the public API
    return {
      start: () => elevenLabsAgent.start(),
      stop: () => elevenLabsAgent.stop(),
      speak: text => elevenLabsAgent.speak(text),
      isReady: () => elevenLabsAgent.isReady(),
      testConnection: () => elevenLabsAgent.testConnection(),
      getVoices: () => elevenLabsAgent.getVoices(),
      updateConfig: (apiKey, voiceId) => elevenLabsAgent.updateConfig(apiKey, voiceId),
      testVoice: testText => elevenLabsAgent.testVoice(testText),
      getStatus: () => elevenLabsAgent.getStatus(),
    };
  })(); // End of IIFE
} else {
  console.log('🎤 ElevenLabs Agent Integration already loaded, skipping redeclaration');
}
