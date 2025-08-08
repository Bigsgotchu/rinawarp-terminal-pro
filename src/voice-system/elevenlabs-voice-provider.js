import logger from '../utilities/logger.js';
/**
 * Mock ElevenLabs Voice Provider for testing
 * This is a placeholder file for the ElevenLabs integration
 */

export class ElevenLabsVoiceProvider {
  constructor() {
    this.isInitialized = false;
    this.isConnected = false;
    this.apiKey = null;
  }

  async initialize(apiKey) {
    if (!apiKey) {
      return false;
    }
    
    this.apiKey = apiKey;
    this.isInitialized = true;
    this.isConnected = true;
    
    return true;
  }

  async speak(text, options = {}) {
    if (!this.isInitialized || !this.isConnected) {
      throw new Error('ElevenLabs provider not initialized or connected');
    }
    
    // Mock implementation
    logger.debug(`[ElevenLabs] Speaking: ${text}`, options);
    
    return Promise.resolve({
      text,
      options,
      timestamp: new Date().toISOString(),
    });
  }

  isConnected() {
    return this.isConnected;
  }

  disconnect() {
    this.isConnected = false;
    this.apiKey = null;
  }

  getApiKeyFromStorage() {
    try {
      return localStorage.getItem('elevenlabs_api_key') || null;
    } catch (error) {
      console.warn('Failed to get API key from storage:', error);
      return null;
    }
  }
}
