/**
 * AI Provider Configuration System
 * Manages connections to various AI providers (OpenAI, Anthropic, etc.)
 */

import { config } from '../config/unified-config.cjs';
import crypto from 'crypto';

export class AIProviderConfig {
  constructor() {
    this.providers = {
      openai: {
        name: 'OpenAI',
        models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        endpoint: 'https://api.openai.com/v1',
        headers: (apiKey) => ({
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        })
      },
      anthropic: {
        name: 'Anthropic',
        models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        endpoint: 'https://api.anthropic.com/v1',
        headers: (apiKey) => ({
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        })
      },
      google: {
        name: 'Google AI',
        models: ['gemini-pro', 'gemini-pro-vision'],
        endpoint: 'https://generativelanguage.googleapis.com/v1',
        headers: (apiKey) => ({
          'Content-Type': 'application/json'
        })
      }
    };
    
    this.activeProvider = null;
    this.apiKeys = new Map();
  }

  /**
   * Initialize AI provider configuration
   */
  async initialize() {
    try {
      // Load saved provider settings
      const savedProvider = config.get('ai.provider') || 'openai';
      const savedModel = config.get('ai.model') || 'gpt-3.5-turbo';
      
      // Load encrypted API keys from secure storage
      await this.loadSecureApiKeys();
      
      // Set active provider
      this.setActiveProvider(savedProvider, savedModel);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize AI provider config:', error);
      return false;
    }
  }

  /**
   * Set the active AI provider
   */
  setActiveProvider(providerName, modelName) {
    if (!this.providers[providerName]) {
      throw new Error(`Unknown provider: ${providerName}`);
    }
    
    const provider = this.providers[providerName];
    if (!provider.models.includes(modelName)) {
      throw new Error(`Model ${modelName} not available for provider ${providerName}`);
    }
    
    this.activeProvider = {
      name: providerName,
      model: modelName,
      ...provider
    };
    
    // Save to config
    config.set('ai.provider', providerName);
    config.set('ai.model', modelName);
    
    return this.activeProvider;
  }

  /**
   * Get the current active provider
   */
  getActiveProvider() {
    return this.activeProvider;
  }

  /**
   * Set API key for a provider (encrypted)
   */
  async setApiKey(provider, apiKey) {
    if (!this.providers[provider]) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    
    // Encrypt the API key before storing
    const encrypted = this.encryptApiKey(apiKey);
    
    // Store in secure config
    const success = await config.setSecure(`ai.apiKeys.${provider}`, encrypted);
    
    if (success) {
      // Cache decrypted version in memory
      this.apiKeys.set(provider, apiKey);
    }
    
    return success;
  }

  /**
   * Get API key for a provider (decrypted)
   */
  async getApiKey(provider) {
    // Check memory cache first
    if (this.apiKeys.has(provider)) {
      return this.apiKeys.get(provider);
    }
    
    // Load from secure storage
    const encrypted = await config.getSecure(`ai.apiKeys.${provider}`);
    if (!encrypted) {
      return null;
    }
    
    // Decrypt and cache
    const decrypted = this.decryptApiKey(encrypted);
    this.apiKeys.set(provider, decrypted);
    
    return decrypted;
  }

  /**
   * Load all secure API keys
   */
  async loadSecureApiKeys() {
    for (const provider of Object.keys(this.providers)) {
      try {
        await this.getApiKey(provider);
      } catch (error) {
        console.warn(`Failed to load API key for ${provider}:`, error.message);
      }
    }
  }

  /**
   * Encrypt API key using system-specific encryption
   */
  encryptApiKey(apiKey) {
    // Use a deterministic key based on machine ID and user
    const secret = this.getMachineSecret();
    const cipher = crypto.createCipher('aes-256-cbc', secret);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Decrypt API key
   */
  decryptApiKey(encrypted) {
    const secret = this.getMachineSecret();
    const decipher = crypto.createDecipher('aes-256-cbc', secret);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Get machine-specific secret for encryption
   */
  getMachineSecret() {
    const os = require('os');
    const machineId = `${os.hostname()}-${os.userInfo().username}`;
    return crypto.createHash('sha256').update(machineId).digest('hex');
  }

  /**
   * Test connection to a provider
   */
  async testConnection(provider, apiKey) {
    if (!this.providers[provider]) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    
    const providerConfig = this.providers[provider];
    
    try {
      // Make a simple test request
      const response = await fetch(`${providerConfig.endpoint}/models`, {
        headers: providerConfig.headers(apiKey),
        method: 'GET'
      });
      
      return response.ok;
    } catch (error) {
      console.error(`Failed to test ${provider} connection:`, error);
      return false;
    }
  }

  /**
   * List all available providers
   */
  listProviders() {
    return Object.entries(this.providers).map(([key, value]) => ({
      id: key,
      name: value.name,
      models: value.models,
      configured: this.apiKeys.has(key)
    }));
  }

  /**
   * Get provider capabilities
   */
  getProviderCapabilities(provider) {
    const capabilities = {
      openai: {
        chat: true,
        completion: true,
        embeddings: true,
        imageGeneration: true,
        vision: true,
        functionCalling: true,
        streaming: true
      },
      anthropic: {
        chat: true,
        completion: true,
        embeddings: false,
        imageGeneration: false,
        vision: true,
        functionCalling: true,
        streaming: true
      },
      google: {
        chat: true,
        completion: true,
        embeddings: true,
        imageGeneration: false,
        vision: true,
        functionCalling: true,
        streaming: true
      }
    };
    
    return capabilities[provider] || {};
  }
}

// Singleton instance
export const aiProviderConfig = new AIProviderConfig();
