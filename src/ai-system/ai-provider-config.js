/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 4 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

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
        headers: apiKey => ({
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }),
      },
      anthropic: {
        name: 'Anthropic',
        models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        endpoint: 'https://api.anthropic.com/v1',
        headers: apiKey => ({
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        }),
      },
      google: {
        name: 'Google AI',
        models: ['gemini-pro', 'gemini-pro-vision'],
        endpoint: 'https://generativelanguage.googleapis.com/v1',
        headers: _apiKey => ({
          'Content-Type': 'application/json',
        }),
      },
      deepseek: {
        name: 'DeepSeek',
        models: ['deepseek/deepseek-r1-0528:free'],
        endpoint: 'https://openrouter.ai/api/v1',
        headers: apiKey => ({
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://rinawarptech.com',
          'X-Title': 'RinaWarp Terminal',
        }),
      },
      tencent: {
        name: 'Tencent',
        models: ['tencent/hunyuan-a13b-instruct:free'],
        endpoint: 'https://openrouter.ai/api/v1',
        headers: apiKey => ({
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://rinawarptech.com',
          'X-Title': 'RinaWarp Terminal',
        }),
      },
      zai: {
        name: 'Z.AI',
        models: ['z-ai/glm-4.5-air:free'],
        endpoint: 'https://openrouter.ai/api/v1',
        headers: apiKey => ({
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://rinawarptech.com',
          'X-Title': 'RinaWarp Terminal',
        }),
      },
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
      const savedProvider = process.env.AI_PROVIDER || config.get('ai.provider') || 'deepseek';
      const savedModel =
        process.env.DEFAULT_MODEL || config.get('ai.model') || 'deepseek/deepseek-r1-0528:free';

      // Load encrypted API keys from secure storage
      await this.loadSecureApiKeys();

      // Set active provider - fallback to any available provider if saved one fails
      try {
        this.setActiveProvider(savedProvider, savedModel);
      } catch (_e) {
        // Fallback to first available provider
        const firstProvider = Object.keys(this.providers)[0];
        const firstModel = this.providers[firstProvider].models[0];
        this.setActiveProvider(firstProvider, firstModel);
      }

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
      throw new Error(new Error(`Unknown provider: ${providerName}`));
    }

    const provider = this.providers[providerName];
    if (!provider.models.includes(modelName)) {
      throw new Error(new Error(`Model ${modelName} not available for provider ${providerName}`));
    }

    this.activeProvider = {
      name: providerName,
      model: modelName,
      ...provider,
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
      throw new Error(new Error(`Unknown provider: ${provider}`));
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

    // Try to load from environment variables first
    const envKey = this.getEnvironmentKey(provider);
    if (envKey) {
      this.apiKeys.set(provider, envKey);
      return envKey;
    }

    // Fallback to secure storage if getSecure method exists
    if (typeof config.getSecure === 'function') {
      const encrypted = await config.getSecure(`ai.apiKeys.${provider}`);
      if (encrypted) {
        const decrypted = this.decryptApiKey(encrypted);
        this.apiKeys.set(provider, decrypted);
        return decrypted;
      }
    }

    return null;
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
   * Get API key from environment variables
   */
  getEnvironmentKey(providerIdentifier) {
    const envMap = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      google: 'GOOGLE_API_KEY',
      deepseek: 'OPENROUTER_API_KEY',
      tencent: 'OPENROUTER_API_KEY',
      zai: 'OPENROUTER_API_KEY',
    };

    // Find the correct key, matching by lowercase to handle both id ('openai') and name ('OpenAI')
    const providerId = Object.keys(envMap).find(
      key => key.toLowerCase() === providerIdentifier.toLowerCase()
    );
    const envVarName = providerId ? envMap[providerId] : null;

    if (!envVarName) {
      return null;
    }

    return process.env[envVarName] || null;
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
      throw new Error(new Error(new Error(`Unknown provider: ${provider}`)));
    }

    const providerConfig = this.providers[provider];

    try {
      // Make a simple test request
      const response = await fetch(`${providerConfig.endpoint}/models`, {
        headers: providerConfig.headers(apiKey),
        method: 'GET',
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
      configured: this.apiKeys.has(key),
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
        streaming: true,
      },
      anthropic: {
        chat: true,
        completion: true,
        embeddings: false,
        imageGeneration: false,
        vision: true,
        functionCalling: true,
        streaming: true,
      },
      google: {
        chat: true,
        completion: true,
        embeddings: true,
        imageGeneration: false,
        vision: true,
        functionCalling: true,
        streaming: true,
      },
    };

    return capabilities[provider] || {};
  }
}

// Singleton instance
export const aiProviderConfig = new AIProviderConfig();
