/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

import { OpenAIProvider } from './providers/openai-provider.js';
import { AnthropicProvider } from './providers/anthropic-provider.js';
import { logger } from '../utils/logger.js';

export class AIOrchestrator {
  constructor() {
    this.providers = {
      openai: new OpenAIProvider(),
      anthropic: new AnthropicProvider(),
    };
    this.activeProviders = [];
    this.defaultProvider = null;
  }

  async initialize() {
    logger.info('Initializing AI providers...');
    
    // Initialize all providers and track which ones are available
    for (const [name, provider] of Object.entries(this.providers)) {
      try {
        const initialized = await provider.initialize();
        if (initialized) {
          this.activeProviders.push(name);
          if (!this.defaultProvider) {
            this.defaultProvider = name;
          }
          logger.info(`✅ ${provider.name} provider ready`);
        }
      } catch (error) {
        logger.warn(`Failed to initialize ${name} provider:`, error.message);
      }
    }

    if (this.activeProviders.length === 0) {
      logger.warn('No AI providers available, using mock responses');
    } else {
      logger.info(`AI providers initialized. Active: ${this.activeProviders.join(', ')}`);
    }
  }

  async getCompletion(prompt, options = {}) {
    const { provider: requestedProvider, ...providerOptions } = options;
    const providerName = this.selectProvider(requestedProvider);
    
    if (!providerName) {
      // Fallback to mock response
      return `Mock response to: ${prompt}`;
    }

    try {
      const provider = this.providers[providerName];
      return await provider.getCompletion(prompt, providerOptions);
    } catch (error) {
      logger.error(`Error with ${providerName} provider:`, error);
      // Try fallback provider
      const fallback = this.getFallbackProvider(providerName);
      if (fallback) {
        logger.info(`Falling back to ${fallback} provider`);
        return await this.providers[fallback].getCompletion(prompt, providerOptions);
      }
      throw new Error(error);
    }
  }

  async *streamCompletion(prompt, options = {}) {
    const { userId, context, provider: requestedProvider, ...providerOptions } = options;
    const providerName = this.selectProvider(requestedProvider);
    
    logger.info(`Processing prompt for user ${userId} using ${providerName || 'mock'} provider`);
    
    if (!providerName) {
      // Fallback to mock response
      yield "Mock Response: ";
      yield prompt.substring(0, 50);
      yield "...";
      return;
    }

    try {
      const provider = this.providers[providerName];
      yield* provider.streamCompletion(prompt, providerOptions);
    } catch (error) {
      logger.error(`Error with ${providerName} provider:`, error);
      // Try fallback provider
      const fallback = this.getFallbackProvider(providerName);
      if (fallback) {
        logger.info(`Falling back to ${fallback} provider`);
        yield* this.providers[fallback].streamCompletion(prompt, providerOptions);
      } else {
        throw new Error(error);
      }
    }
  }

  selectProvider(requested) {
    // If specific provider requested and available, use it
    if (requested && this.activeProviders.includes(requested)) {
      return requested;
    }
    // Otherwise use default
    return this.defaultProvider;
  }

  getFallbackProvider(failedProvider) {
    // Find another active provider
    return this.activeProviders.find(p => p !== failedProvider);
  }

  getAvailableProviders() {
    return this.activeProviders;
  }
}
