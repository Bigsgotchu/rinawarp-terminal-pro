import logger from '../utils/logger.js';
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 6 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal - AI Provider Manager
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * This module manages multiple AI providers and provides intelligent fallback
 * mechanisms to ensure Rina always has access to AI capabilities.
 */

import { AIProviderFactory } from './ai-providers.js';

export class AIProviderManager {
  constructor() {
    this.providers = new Map();
    this.activeProvider = null;
    this.fallbackChain = ['local', 'anthropic', 'openai', 'custom'];
    this.isInitialized = false;
    this.config = {
      preferredProvider: 'anthropic', // Default to Claude/Anthropic
      enableFallback: true,
      responseTimeout: 10000, // 10 seconds
    };

    // Load configuration
    this.loadConfiguration();
  }

  async initialize() {
    // Initialize all available providers
    await this.initializeProviders();

    // Set up the active provider
    await this.selectActiveProvider();

    this.isInitialized = true;
  }

  async initializeProviders() {
    const providerTypes = ['local', 'anthropic', 'openai', 'custom'];

    for (const type of providerTypes) {
      try {
        const provider = AIProviderFactory.createProvider(type);
        await provider.initialize();
        this.providers.set(type, provider);
        logger.debug(`✅ ${type} provider initialized successfully`);
      } catch (error) {
        console.warn(`⚠️ Failed to initialize ${type} provider:`, error.message);
        // Store the failed provider for potential later retry
        const provider = AIProviderFactory.createProvider(type);
        provider.lastError = error;
        this.providers.set(type, provider);
      }
    }
  }

  async selectActiveProvider() {
    // Try preferred provider first
    if (this.config.preferredProvider) {
      const preferred = this.providers.get(this.config.preferredProvider);
      if (preferred && preferred.isAvailable()) {
        this.activeProvider = preferred;
        return;
      }
    }

    // Fall back to the first available provider in the chain
    for (const providerType of this.fallbackChain) {
      const provider = this.providers.get(providerType);
      if (provider && provider.isAvailable()) {
        this.activeProvider = provider;
        return;
      }
    }

    console.warn('⚠️ No AI providers available, using basic fallback');
    this.activeProvider = null;
  }

  async generateResponse(query, context = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Enhanced context with provider manager info
    const enhancedContext = {
      ...context,
      manager: {
        availableProviders: Array.from(this.providers.keys()),
        activeProvider: this.activeProvider?.getName() || 'fallback',
        timestamp: new Date().toISOString(),
      },
    };

    // Try active provider first
    if (this.activeProvider) {
      try {
        const startTime = Date.now();

        const response = await Promise.race([
          this.activeProvider.generateResponse(query, enhancedContext),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Response timeout')), this.config.responseTimeout)
          ),
        ]);

        response.processing_time = Date.now() - startTime;
        response.provider_info = {
          name: this.activeProvider.getName(),
          description: this.activeProvider.getDescription(),
          capabilities: this.activeProvider.getCapabilities(),
        };

        return response;
      } catch (error) {
        console.error(`❌ Error with ${this.activeProvider.getName()} provider:`, error);

        // Mark provider as failed and try fallback
        this.activeProvider.lastError = error;

        if (this.config.enableFallback && error.message !== 'Response timeout') {
          return await this.tryFallbackResponse(query, enhancedContext);
        }
        
        // Re-throw the error if fallback is disabled or it's a timeout
        throw error;
      }
    }

    // No active provider, try fallback
    return await this.tryFallbackResponse(query, enhancedContext);
  }

  async tryFallbackResponse(query, context) {
    // Try other available providers
    for (const providerType of this.fallbackChain) {
      const provider = this.providers.get(providerType);

      if (provider && provider.isAvailable() && provider !== this.activeProvider) {
        try {
          const response = await provider.generateResponse(query, context);

          // Update active provider if this one works
          this.activeProvider = provider;

          response.provider_info = {
            name: provider.getName(),
            description: provider.getDescription(),
            capabilities: provider.getCapabilities(),
            fallback: true,
          };

          return response;
        } catch (error) {
          console.warn(`⚠️ Fallback provider ${providerType} failed:`, error.message);
          provider.lastError = error;
        }
      }
    }

    // Ultimate fallback - basic response
    return this.generateBasicFallbackResponse(query, context);
  }

  generateBasicFallbackResponse(query, _context) {
    const basicResponses = {
      help: '🧜‍♀️ I\'m here to help! Even though my advanced AI is temporarily unavailable, I can still provide basic assistance. What would you like to know?',
      git: '🐙 Git is a powerful version control system! Try "git status" to see your current state, "git add ." to stage changes, and "git commit -m "message"" to save them.',
      docker:
        '🐳 Docker helps you containerize applications! Use "docker ps" to see running containers, "docker images" to list images, and "docker run" to start new containers.',
      error:
        '🤔 Errors can be tricky! Try reading the error message carefully, checking file permissions, and ensuring all dependencies are installed.',
      node: '🌿 Node.js is great for JavaScript development! Use "npm install" for dependencies, "npm start" to run your app, and "node filename.js" to execute scripts.',
      python:
        '🐍 Python is wonderful for many tasks! Use "pip install package" for libraries, "python script.py" to run code, and "python -m venv env" for virtual environments.',
    };

    const queryLower = query.toLowerCase();
    let explanation = '🧜‍♀️ I\'m still here to help, even with limited AI capabilities!';

    // Find matching response
    for (const [keyword, response] of Object.entries(basicResponses)) {
      if (queryLower.includes(keyword)) {
        explanation = response;
        break;
      }
    }

    return {
      explanation,
      reasoning: 'Basic fallback response - limited AI functionality',
      alternatives: [],
      expert_tips: ['Consider checking your internet connection and AI provider configuration'],
      safety_analysis: { risk_level: 'low', warnings: [] },
      best_practices: ['Always backup important data before running commands'],
      personality_flavor: '🚨 Backup mermaid mode activated! My full AI powers will return soon!',
      provider: 'basic_fallback',
      timestamp: new Date().toISOString(),
      confidence: 0.3,
      provider_info: {
        name: 'basic_fallback',
        description: 'Emergency fallback responses',
        capabilities: ['basic_responses'],
        fallback: true,
      },
    };
  }

  // Configuration methods
  loadConfiguration() {
    try {
      // Skip localStorage in Node.js environment for now
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('rinawarp-ai-provider-config');
        if (saved) {
          this.config = { ...this.config, ...JSON.parse(saved) };
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load AI provider configuration');
    }
  }

  saveConfiguration() {
    try {
      // Skip localStorage in Node.js environment for now
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('rinawarp-ai-provider-config', JSON.stringify(this.config));
      }
    } catch (error) {
      console.warn('⚠️ Failed to save AI provider configuration');
    }
  }

  updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.saveConfiguration();

    // Reinitialize if needed
    if (this.isInitialized && newConfig.preferredProvider !== this.config.preferredProvider) {
      this.selectActiveProvider();
    }
  }

  // Provider management methods
  async setPreferredProvider(providerName) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(new Error(new Error(`Provider ${providerName} not found`)));
    }

    // Try to initialize if not already done
    if (!provider.isAvailable()) {
      try {
        await provider.initialize();
      } catch (error) {
        throw new Error(new Error(new Error(`Failed to activate provider ${providerName}: ${error.message}`)));
      }
    }

    this.config.preferredProvider = providerName;
    this.activeProvider = provider;
    this.saveConfiguration();

  }

  async configureProvider(providerName, config) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(new Error(new Error(`Provider ${providerName} not found`)));
    }

    if (typeof provider.updateConfiguration === 'function') {
      provider.updateConfiguration(config);
    } else if (typeof provider.setAPIKey === 'function' && config.apiKey) {
      provider.setAPIKey(config.apiKey);
    }

    // Try to initialize with new config
    try {
      await provider.initialize();
    } catch (error) {
      console.warn(`⚠️ Provider ${providerName} configuration failed:`, error.message);
      throw new Error(new Error(error));
    }
  }

  // Status and information methods
  getStatus() {
    const providerStatuses = {};
    for (const [name, provider] of this.providers) {
      providerStatuses[name] = {
        available: provider.isAvailable(),
        description: provider.getDescription(),
        capabilities: provider.getCapabilities(),
        rateLimits: provider.getRateLimits(),
        lastError: provider.lastError?.message || null,
      };
    }

    return {
      initialized: this.isInitialized,
      activeProvider: this.activeProvider?.getName() || 'none',
      preferredProvider: this.config.preferredProvider,
      enableFallback: this.config.enableFallback,
      providers: providerStatuses,
      fallbackChain: this.fallbackChain,
    };
  }

  getAvailableProviders() {
    return AIProviderFactory.getAvailableProviders();
  }

  async retryFailedProvider(providerName) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(new Error(new Error(`Provider ${providerName} not found`)));
    }

    try {
      await provider.initialize();
      logger.debug(`✅ Successfully retried provider: ${providerName}`);

      // If this was our preferred provider, make it active again
      if (providerName === this.config.preferredProvider) {
        this.activeProvider = provider;
      }

      return true;
    } catch (error) {
      console.warn(`⚠️ Retry failed for provider ${providerName}:`, error.message);
      throw new Error(new Error(error));
    }
  }

  // Cleanup
  destroy() {
    for (const provider of this.providers.values()) {
      if (typeof provider.destroy === 'function') {
        provider.destroy();
      }
    }
    this.providers.clear();
    this.activeProvider = null;
    this.isInitialized = false;
  }
}

// Create a global instance
export const aiProviderManager = new AIProviderManager();

// Make available globally for browser environment
if (typeof window !== 'undefined') {
  window.AIProviderManager = AIProviderManager;
  window.aiProviderManager = aiProviderManager;
}
