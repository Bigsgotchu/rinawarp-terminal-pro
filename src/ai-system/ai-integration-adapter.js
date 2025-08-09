/*
 * RinaWarp Terminal - AI Integration Adapter
 * Copyright (c) 2025 Rinawarp Technologies, LLC. All rights reserved.
 *
 * This file is part of RinaWarp Terminal, a proprietary terminal emulator with
 * AI assistance, themes, and enterprise features.
 *
 * Licensed under the RinaWarp Proprietary License.
 * See LICENSE file for detailed terms and conditions.
 */

import logger from '../utilities/logger.js';
import { ConvoEnhancedAISystem } from './convo-enhanced-ai-system.js';

/**
 * AI Integration Adapter
 * Seamlessly integrates Convo SDK-enhanced AI system into RinaWarp Terminal
 * Maintains backward compatibility with existing AI interface
 */

class AIIntegrationAdapter {
  constructor() {
    this.aiSystem = null;
    this.isInitialized = false;
    this.fallbackMode = false;
    this.config = this.loadConfiguration();

    this.debugInfo = {
      initTime: null,
      totalInteractions: 0,
      convoPersistenceEnabled: false,
      timeTravelEnabled: false,
      currentThread: null,
    };
  }

  loadConfiguration() {
    // Load configuration from environment variables and localStorage
    const config = {
      // Convo SDK settings
      convoApiKey: process.env.CONVO_API_KEY || this.getStoredApiKey('convo'),
      enablePersistence: this.getBooleanSetting('enablePersistence', true),
      enableTimeTravel: this.getBooleanSetting('enableTimeTravel', true),
      debugMode: this.getBooleanSetting('debugMode', false),
      checkpointInterval: parseInt(this.getSetting('checkpointInterval', '5')),

      // AI Provider settings
      temperature: parseFloat(this.getSetting('temperature', '0.7')),
      maxTokens: parseInt(this.getSetting('maxTokens', '2048')),
      timeout: parseInt(this.getSetting('timeout', '30000')),
      maxRetries: parseInt(this.getSetting('maxRetries', '3')),

      // Provider preferences
      preferredProvider: this.getSetting('preferredProvider', 'openai'),
      enableFallback: this.getBooleanSetting('enableFallback', true),
    };

    // Validate critical settings
    if (!config.convoApiKey && config.enablePersistence) {
      logger.warn('⚠️ Convo API key not found. Persistence features will be disabled.');
      config.enablePersistence = false;
      config.enableTimeTravel = false;
    }

    return config;
  }

  getSetting(key, defaultValue) {
    try {
      return localStorage.getItem(`rinawarp-ai-${key}`) || defaultValue;
    } catch {
      return defaultValue;
    }
  }

  getBooleanSetting(key, defaultValue) {
    const value = this.getSetting(key, defaultValue.toString());
    return value === 'true';
  }

  getStoredApiKey(provider) {
    try {
      return localStorage.getItem(`rinawarp-${provider}-key`) || null;
    } catch {
      return null;
    }
  }

  async initialize() {
    if (this.isInitialized) {
      return this.aiSystem;
    }

    const startTime = Date.now();

    try {
      logger.info('🚀 Initializing AI Integration with Convo SDK...');

      // Create enhanced AI system with Convo SDK
      this.aiSystem = new ConvoEnhancedAISystem(this.config);

      // Wait for system initialization
      await this.waitForInitialization();

      this.isInitialized = true;
      this.debugInfo.initTime = Date.now() - startTime;
      this.debugInfo.convoPersistenceEnabled = this.config.enablePersistence;
      this.debugInfo.timeTravelEnabled = this.config.enableTimeTravel;

      // Get debug info from AI system
      const systemDebug = this.aiSystem.getDebugInfo();
      this.debugInfo.currentThread = systemDebug.currentThread;

      logger.info(`✅ AI Integration initialized in ${this.debugInfo.initTime}ms`);
      logger.info(`🧠 Persistence: ${this.debugInfo.convoPersistenceEnabled ? 'ON' : 'OFF'}`);
      logger.info(`⏰ Time Travel: ${this.debugInfo.timeTravelEnabled ? 'ON' : 'OFF'}`);

      if (this.debugInfo.currentThread) {
        logger.info(`🧵 Thread: ${this.debugInfo.currentThread}`);
      }

      // Set up event listeners for terminal integration
      this.setupTerminalIntegration();

      return this.aiSystem;
    } catch (error) {
      logger.error('❌ Failed to initialize enhanced AI system, falling back:', error);
      await this.initializeFallback();
      throw error;
    }
  }

  async waitForInitialization(maxWait = 10000) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      if (this.aiSystem && typeof this.aiSystem.generateCompletion === 'function') {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('AI system initialization timeout');
  }

  async initializeFallback() {
    this.fallbackMode = true;
    logger.warn('⚠️ Running in fallback mode without Convo SDK features');

    // Import and use the original AI system
    try {
      const { AdvancedAISystem } = await import('./advanced-ai-system.js');
      this.aiSystem = new AdvancedAISystem(this.config);
      this.isInitialized = true;
    } catch (error) {
      logger.error('❌ Fallback initialization also failed:', error);
      // Create minimal mock system
      this.aiSystem = this.createMockAISystem();
      this.isInitialized = true;
    }
  }

  createMockAISystem() {
    return {
      async generateCompletion(prompt, options = {}) {
        return {
          content: 'AI system is currently unavailable. Please check your configuration.',
          provider: 'mock',
          error: true,
        };
      },
      async explainCommand(command) {
        return {
          content: `Mock explanation for command: ${command}`,
          provider: 'mock',
        };
      },
      async suggestCommand(description) {
        return {
          content: `Mock suggestion for: ${description}`,
          provider: 'mock',
        };
      },
      async chatWithAI(message) {
        return {
          response: { content: `Mock response to: ${message}` },
          conversationId: 'mock-conversation',
        };
      },
    };
  }

  setupTerminalIntegration() {
    // Set up integration with terminal components
    if (typeof window !== 'undefined') {
      // Browser environment - integrate with terminal manager
      this.setupBrowserIntegration();
    } else {
      // Node.js environment - integrate with server components
      this.setupServerIntegration();
    }
  }

  setupBrowserIntegration() {
    try {
      // Make AI system available globally for terminal use
      if (window.terminalManager) {
        window.terminalManager.aiSystem = this;
        logger.debug('🔗 AI system linked to terminal manager');
      }

      // Set up global AI integration object
      window.RinaWarpAI = {
        system: this,
        chat: this.chat.bind(this),
        explainCommand: this.explainCommand.bind(this),
        suggestCommand: this.suggestCommand.bind(this),
        timeTravel: this.timeTravel.bind(this),
        createThread: this.createNewThread.bind(this),
        switchThread: this.switchThread.bind(this),
        getDebugInfo: this.getDebugInfo.bind(this),
        getHistory: this.getConversationHistory.bind(this),
      };

      // Emit ready event
      window.dispatchEvent(
        new CustomEvent('rinawarp-ai-ready', {
          detail: {
            convoPersistenceEnabled: this.debugInfo.convoPersistenceEnabled,
            timeTravelEnabled: this.debugInfo.timeTravelEnabled,
            currentThread: this.debugInfo.currentThread,
          },
        })
      );
    } catch (error) {
      logger.warn('⚠️ Browser integration setup failed:', error);
    }
  }

  setupServerIntegration() {
    // Server-side integration for API endpoints
    logger.debug('🔗 Setting up server-side AI integration');
  }

  // Public API Methods
  async chat(message, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      this.debugInfo.totalInteractions++;

      const response = await this.aiSystem.chatWithAI(message, options.conversationId);

      logger.debug(`💬 Chat interaction completed (${this.debugInfo.totalInteractions} total)`);

      return response;
    } catch (error) {
      logger.error('❌ Chat failed:', error);
      throw error;
    }
  }

  async explainCommand(command, context = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      this.debugInfo.totalInteractions++;

      const response = await this.aiSystem.explainCommand(command, context);

      logger.debug(`📖 Command explanation completed: ${command}`);

      return response;
    } catch (error) {
      logger.error('❌ Command explanation failed:', error);
      throw error;
    }
  }

  async suggestCommand(description, context = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      this.debugInfo.totalInteractions++;

      const response = await this.aiSystem.suggestCommand(description, context);

      logger.debug(`💡 Command suggestion completed: ${description}`);

      return response;
    } catch (error) {
      logger.error('❌ Command suggestion failed:', error);
      throw error;
    }
  }

  async generateCompletion(prompt, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.aiSystem.generateCompletion(prompt, options);
  }

  // Convo SDK enhanced features
  async timeTravel(interactionId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.fallbackMode) {
      throw new Error('Time travel not available in fallback mode');
    }

    return await this.aiSystem.timeTravel(interactionId);
  }

  async createNewThread(metadata = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.fallbackMode) {
      throw new Error('Thread management not available in fallback mode');
    }

    const result = await this.aiSystem.createNewThread(metadata);
    this.debugInfo.currentThread = result.newThreadId;

    return result;
  }

  async switchThread(threadId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.fallbackMode) {
      throw new Error('Thread management not available in fallback mode');
    }

    const result = await this.aiSystem.switchThread(threadId);
    this.debugInfo.currentThread = threadId;

    return result;
  }

  async listThreads() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.fallbackMode) {
      return [];
    }

    return await this.aiSystem.listThreads();
  }

  async getConversationHistory(limit = 50) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.fallbackMode) {
      return [];
    }

    return await this.aiSystem.getConversationHistory(limit);
  }

  getDebugInfo() {
    const systemDebug = this.aiSystem?.getDebugInfo() || {};

    return {
      ...this.debugInfo,
      fallbackMode: this.fallbackMode,
      systemDebug,
      config: {
        enablePersistence: this.config.enablePersistence,
        enableTimeTravel: this.config.enableTimeTravel,
        preferredProvider: this.config.preferredProvider,
      },
    };
  }

  // Configuration management
  async updateConfiguration(newConfig) {
    const updatedConfig = { ...this.config, ...newConfig };

    // Save to localStorage
    Object.keys(newConfig).forEach(key => {
      try {
        localStorage.setItem(`rinawarp-ai-${key}`, String(newConfig[key]));
      } catch (error) {
        logger.warn(`Failed to save config key ${key}:`, error);
      }
    });

    this.config = updatedConfig;

    // Reinitialize if necessary
    if (this.isInitialized && this.shouldReinitialize(newConfig)) {
      logger.info('🔄 Reinitializing AI system due to configuration changes...');
      this.isInitialized = false;
      await this.initialize();
    }

    return updatedConfig;
  }

  shouldReinitialize(newConfig) {
    const criticalKeys = ['convoApiKey', 'enablePersistence', 'preferredProvider'];
    return criticalKeys.some(key => key in newConfig);
  }

  // Health check
  async healthCheck() {
    if (!this.isInitialized) {
      return {
        status: 'not_initialized',
        healthy: false,
      };
    }

    try {
      const testResponse = await this.aiSystem.generateCompletion('Health check test', {
        maxTokens: 10,
      });

      return {
        status: 'healthy',
        healthy: true,
        provider: testResponse.provider,
        latency: testResponse.latency || 0,
        convoPersistence: this.debugInfo.convoPersistenceEnabled,
        timeTravel: this.debugInfo.timeTravelEnabled,
        currentThread: this.debugInfo.currentThread,
      };
    } catch (error) {
      return {
        status: 'error',
        healthy: false,
        error: error.message,
        fallbackMode: this.fallbackMode,
      };
    }
  }
}

// Create singleton instance
const aiIntegrationAdapter = new AIIntegrationAdapter();

// Export for both CommonJS and ES modules
export default aiIntegrationAdapter;
export { aiIntegrationAdapter, AIIntegrationAdapter };
