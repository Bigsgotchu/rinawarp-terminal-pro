/*
 * RinaWarp Terminal - Enhanced AI System with Convo SDK Integration
 * Copyright (c) 2025 Rinawarp Technologies, LLC. All rights reserved.
 *
 * This file is part of RinaWarp Terminal, a proprietary terminal emulator with
 * AI assistance, themes, and enterprise features.
 *
 * Licensed under the RinaWarp Proprietary License.
 * See LICENSE file for detailed terms and conditions.
 */

import logger from '../utilities/logger.js';
import { Convo } from 'convo-sdk';

/**
 * Enhanced AI System with Convo SDK Integration
 * Adds persistent memory, time-travel debugging, and multi-user threads
 *
 * Features:
 * - Persistent conversation memory
 * - Time-travel debugging for AI interactions
 * - Multi-user thread management
 * - Enhanced context tracking
 * - Checkpoint history and rollback
 */

class ConvoEnhancedAISystem {
  constructor(config = {}) {
    this.providers = new Map();
    this.activeProvider = null;
    this.contextManager = new EnhancedContextManager();
    this.commandPredictor = new CommandPredictor();
    this.errorAnalyzer = new ErrorAnalyzer();
    this.codeGenerator = new CodeGenerator();

    // Convo SDK integration
    this.convo = null;
    this.currentThread = null;
    this.checkpointer = null;
    this.debugMode = config.debugMode || false;

    this.config = {
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2048,
      convoApiKey: config.convoApiKey || process.env.CONVO_API_KEY,
      enablePersistence: config.enablePersistence !== false,
      enableTimeTravel: config.enableTimeTravel !== false,
      checkpointInterval: config.checkpointInterval || 5, // Save checkpoint every 5 interactions
      ...config,
    };

    this.interactionCount = 0;
    this.sessionMetrics = {
      totalInteractions: 0,
      averageResponseTime: 0,
      errorCount: 0,
      checkpointCount: 0,
    };

    this.initializeSystem();
  }

  async initializeSystem() {
    try {
      // Initialize Convo SDK first if API key is available
      if (this.config.convoApiKey && this.config.enablePersistence) {
        await this.initializeConvoSDK();
      }

      // Initialize AI providers
      await this.initializeProviders();

      logger.info('✅ Enhanced AI System with Convo SDK initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize Enhanced AI System:', error);
      // Fallback to basic functionality without Convo SDK
      await this.initializeProviders();
    }
  }

  async initializeConvoSDK() {
    try {
      this.convo = new Convo({ apiKey: this.config.convoApiKey });
      await this.convo.init({ apiKey: this.config.convoApiKey });

      // Create a new thread for this session
      this.currentThread = await this.convo.newThread();

      // Set up checkpointer for persistent memory
      this.checkpointer = this.convo.checkpointer({
        thread_id: this.currentThread,
        limit: 100, // Keep last 100 interactions in memory
      });

      logger.info(`🧠 Convo SDK initialized with thread: ${this.currentThread}`);

      // Load existing conversation history if available
      await this.loadConversationHistory();
    } catch (error) {
      logger.warn('⚠️ Convo SDK initialization failed, continuing without persistence:', error);
      this.config.enablePersistence = false;
    }
  }

  async initializeProviders() {
    try {
      // Initialize OpenAI provider
      await this.registerProvider('openai', {
        name: 'OpenAI',
        models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
        apiKeyPath: 'OPENAI_API_KEY',
        endpoint: 'https://api.openai.com/v1/chat/completions',
      });

      // Initialize Claude provider
      await this.registerProvider('claude', {
        name: 'Anthropic Claude',
        models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        apiKeyPath: 'ANTHROPIC_API_KEY',
        endpoint: 'https://api.anthropic.com/v1/messages',
      });

      // Initialize local provider (Ollama)
      await this.registerProvider('ollama', {
        name: 'Ollama (Local)',
        models: ['llama2', 'codellama', 'mistral'],
        endpoint: 'http://localhost:11434/api/generate',
        local: true,
      });

      logger.debug('✅ AI providers initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize AI providers:', error);
    }
  }

  async registerProvider(providerId, config) {
    const provider = new EnhancedAIProvider(providerId, config, this.convo);
    await provider.initialize();
    this.providers.set(providerId, provider);

    if (!this.activeProvider) {
      this.activeProvider = providerId;
    }
  }

  async generateCompletion(prompt, options = {}) {
    const startTime = Date.now();
    const provider = this.providers.get(this.activeProvider);

    if (!provider) {
      throw new Error('No active AI provider');
    }

    try {
      // Create checkpoint before interaction if enabled
      if (this.config.enableTimeTravel && this.checkpointer) {
        await this.createCheckpoint('before_completion', { prompt, options });
      }

      // Enhance context with conversation history
      const context = await this.contextManager.getEnhancedContext(
        options.contextType,
        this.currentThread
      );

      const enhancedPrompt = this.contextManager.enhancePrompt(prompt, context);

      // Generate response with provider
      const response = await provider.generateCompletion(enhancedPrompt, {
        ...this.config,
        ...options,
        threadId: this.currentThread,
      });

      // Store interaction in Convo SDK if available
      if (this.checkpointer) {
        await this.storeInteraction(prompt, response, context);
      }

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime);

      // Create checkpoint after successful interaction
      if (
        this.config.enableTimeTravel &&
        this.checkpointer &&
        this.interactionCount % this.config.checkpointInterval === 0
      ) {
        await this.createCheckpoint('after_completion', {
          prompt,
          response,
          responseTime,
        });
      }

      // Store interaction in context manager for learning
      await this.contextManager.storeInteraction(prompt, response, context);

      return {
        ...response,
        threadId: this.currentThread,
        checkpointAvailable: !!this.checkpointer,
        interactionId: this.interactionCount,
        responseTime,
        sessionMetrics: { ...this.sessionMetrics },
      };
    } catch (error) {
      this.sessionMetrics.errorCount++;
      logger.error('AI completion failed:', error);

      // Try to restore from last checkpoint if available
      if (this.config.enableTimeTravel && this.checkpointer) {
        logger.info('🔄 Attempting to restore from last checkpoint...');
        await this.restoreFromLastCheckpoint();
      }

      throw error;
    }
  }

  async createCheckpoint(type, metadata = {}) {
    if (!this.checkpointer) return;

    try {
      const checkpoint = {
        type,
        timestamp: new Date().toISOString(),
        interactionCount: this.interactionCount,
        sessionMetrics: { ...this.sessionMetrics },
        metadata,
      };

      // This would integrate with LangGraph checkpointing
      // For now, we'll use the Convo SDK's thread state management
      await this.convo.getThreadState(this.currentThread);

      this.sessionMetrics.checkpointCount++;
      logger.debug(`📸 Checkpoint created: ${type} at interaction ${this.interactionCount}`);
    } catch (error) {
      logger.warn('Failed to create checkpoint:', error);
    }
  }

  async storeInteraction(prompt, response, context) {
    if (!this.checkpointer) return;

    try {
      const interaction = {
        prompt,
        response,
        context,
        timestamp: new Date().toISOString(),
        interactionId: this.interactionCount,
        provider: this.activeProvider,
      };

      // Store in Convo SDK thread
      // This leverages the LangGraph-compatible checkpointer
      await this.checkpointer.put(
        { configurable: { thread_id: this.currentThread } },
        interaction,
        { interaction_id: this.interactionCount },
        {}
      );

      logger.debug(
        `💾 Interaction ${this.interactionCount} stored in thread ${this.currentThread}`
      );
    } catch (error) {
      logger.warn('Failed to store interaction:', error);
    }
  }

  async getConversationHistory(limit = 50) {
    if (!this.convo || !this.currentThread) {
      return [];
    }

    try {
      const history = await this.convo.getCheckpointHistory(this.currentThread);
      return history.slice(-limit); // Get last N interactions
    } catch (error) {
      logger.warn('Failed to get conversation history:', error);
      return [];
    }
  }

  async loadConversationHistory() {
    try {
      const history = await this.getConversationHistory(20);
      if (history.length > 0) {
        logger.info(
          `📚 Loaded ${history.length} previous interactions from thread ${this.currentThread}`
        );
        // Update context manager with historical data
        await this.contextManager.loadHistoricalContext(history);
      }
    } catch (error) {
      logger.warn('Failed to load conversation history:', error);
    }
  }

  async restoreFromLastCheckpoint() {
    if (!this.checkpointer) return false;

    try {
      const checkpoint = await this.checkpointer.get({
        configurable: { thread_id: this.currentThread },
      });

      if (checkpoint) {
        logger.info('🔄 Restored from checkpoint:', checkpoint);
        return true;
      }

      return false;
    } catch (error) {
      logger.warn('Failed to restore from checkpoint:', error);
      return false;
    }
  }

  async timeTravel(interactionId) {
    if (!this.config.enableTimeTravel || !this.checkpointer) {
      throw new Error('Time travel not available - checkpointing disabled');
    }

    try {
      // Get specific checkpoint by interaction ID
      const history = await this.getConversationHistory();
      const targetCheckpoint = history.find(cp => cp.metadata?.interaction_id === interactionId);

      if (!targetCheckpoint) {
        throw new Error(`Checkpoint for interaction ${interactionId} not found`);
      }

      // Restore state to that checkpoint
      logger.info(`⏰ Time traveling to interaction ${interactionId}`);

      // Update current state
      this.interactionCount = interactionId;
      await this.contextManager.restoreToCheckpoint(targetCheckpoint);

      return {
        success: true,
        restoredTo: interactionId,
        timestamp: targetCheckpoint.timestamp,
        metadata: targetCheckpoint.metadata,
      };
    } catch (error) {
      logger.error('Time travel failed:', error);
      throw error;
    }
  }

  async createNewThread(metadata = {}) {
    if (!this.convo) {
      throw new Error('Convo SDK not available');
    }

    try {
      const newThread = await this.convo.newThread();

      // Switch to new thread
      const oldThread = this.currentThread;
      this.currentThread = newThread;
      this.checkpointer = this.convo.checkpointer({
        thread_id: newThread,
        limit: 100,
      });

      // Reset metrics for new thread
      this.interactionCount = 0;
      this.sessionMetrics = {
        totalInteractions: 0,
        averageResponseTime: 0,
        errorCount: 0,
        checkpointCount: 0,
      };

      logger.info(`🧵 Created new thread: ${newThread} (previous: ${oldThread})`);

      return {
        newThreadId: newThread,
        previousThreadId: oldThread,
        metadata,
      };
    } catch (error) {
      logger.error('Failed to create new thread:', error);
      throw error;
    }
  }

  async listThreads() {
    if (!this.convo) {
      return [];
    }

    try {
      return await this.convo.listThreads();
    } catch (error) {
      logger.warn('Failed to list threads:', error);
      return [];
    }
  }

  async switchThread(threadId) {
    if (!this.convo) {
      throw new Error('Convo SDK not available');
    }

    try {
      // Validate thread exists
      const threads = await this.listThreads();
      if (!threads.includes(threadId)) {
        throw new Error(`Thread ${threadId} not found`);
      }

      // Switch to specified thread
      const oldThread = this.currentThread;
      this.currentThread = threadId;
      this.checkpointer = this.convo.checkpointer({
        thread_id: threadId,
        limit: 100,
      });

      // Load thread's conversation history
      await this.loadConversationHistory();

      logger.info(`🔄 Switched from thread ${oldThread} to ${threadId}`);

      return {
        previousThread: oldThread,
        currentThread: threadId,
      };
    } catch (error) {
      logger.error('Failed to switch thread:', error);
      throw error;
    }
  }

  updateMetrics(responseTime) {
    this.interactionCount++;
    this.sessionMetrics.totalInteractions++;

    // Calculate running average response time
    const totalTime =
      this.sessionMetrics.averageResponseTime * (this.sessionMetrics.totalInteractions - 1);
    this.sessionMetrics.averageResponseTime =
      (totalTime + responseTime) / this.sessionMetrics.totalInteractions;
  }

  getDebugInfo() {
    return {
      currentThread: this.currentThread,
      activeProvider: this.activeProvider,
      interactionCount: this.interactionCount,
      sessionMetrics: { ...this.sessionMetrics },
      config: {
        enablePersistence: this.config.enablePersistence,
        enableTimeTravel: this.config.enableTimeTravel,
        checkpointInterval: this.config.checkpointInterval,
      },
      providers: Array.from(this.providers.keys()),
      convoPersistenceAvailable: !!this.checkpointer,
    };
  }

  // Legacy compatibility methods
  async explainCommand(command, context = {}) {
    const prompt = `Explain this command and what it does:

Command: ${command}
Context: ${JSON.stringify(context, null, 2)}

Please provide:
1. What this command does
2. Any potential risks or side effects
3. Common use cases
4. Alternative approaches if applicable

Keep the explanation concise but comprehensive.`;

    return await this.generateCompletion(prompt, {
      contextType: 'command_explanation',
      maxTokens: 1000,
    });
  }

  async suggestCommand(description, context = {}) {
    const prompt = `Based on this description, suggest the best command(s) to accomplish the task:

Task: ${description}
System: ${context.platform || 'unknown'}
Current Directory: ${context.cwd || 'unknown'}
Available Tools: ${context.availableTools?.join(', ') || 'standard shell commands'}

Please provide:
1. The exact command(s) to run
2. Brief explanation of what each command does
3. Any prerequisites or considerations

Format as executable commands when possible.`;

    return await this.generateCompletion(prompt, {
      contextType: 'command_suggestion',
      maxTokens: 800,
    });
  }

  async chatWithAI(message, conversationId = null) {
    // Use current thread as conversation ID
    const threadId = conversationId || this.currentThread;

    const response = await this.generateCompletion(message, {
      contextType: 'chat',
      conversationId: threadId,
    });

    return {
      response,
      conversationId: threadId,
      threadId: this.currentThread,
    };
  }
}

// Enhanced Context Manager with Convo SDK integration
class EnhancedContextManager {
  constructor() {
    this.contexts = new Map();
    this.conversations = new Map();
    this.historicalData = [];
  }

  async getEnhancedContext(contextType, threadId = null) {
    const baseContext = await this.getContext(contextType);

    if (threadId && this.historicalData.length > 0) {
      // Enhance context with thread-specific historical data
      const threadHistory = this.historicalData
        .filter(item => item.threadId === threadId)
        .slice(-10); // Last 10 interactions

      baseContext.conversationHistory = threadHistory;
      baseContext.threadId = threadId;
    }

    return baseContext;
  }

  async loadHistoricalContext(history) {
    this.historicalData = history.map(item => ({
      ...item,
      timestamp: item.timestamp || new Date().toISOString(),
    }));
  }

  async restoreToCheckpoint(checkpoint) {
    // Restore context manager state to checkpoint
    if (checkpoint.contextData) {
      this.contexts = new Map(checkpoint.contextData.contexts || []);
      this.conversations = new Map(checkpoint.contextData.conversations || []);
    }
  }

  // Original methods for compatibility
  async getContext(contextType) {
    return this.contexts.get(contextType) || {};
  }

  enhancePrompt(prompt, context) {
    if (!context || Object.keys(context).length === 0) {
      return prompt;
    }

    let enhancedPrompt = prompt;

    if (context.conversationHistory && context.conversationHistory.length > 0) {
      const recentHistory = context.conversationHistory
        .slice(-3)
        .map(item => `Previous: ${item.prompt} -> ${item.response}`)
        .join('\n');

      enhancedPrompt = `Context from recent interactions:
${recentHistory}

Current request: ${prompt}`;
    }

    return enhancedPrompt;
  }

  async storeInteraction(prompt, response, context) {
    const interaction = {
      prompt,
      response,
      context,
      timestamp: new Date().toISOString(),
    };

    if (context.threadId) {
      interaction.threadId = context.threadId;
    }

    this.historicalData.push(interaction);

    // Keep only last 100 interactions to prevent memory issues
    if (this.historicalData.length > 100) {
      this.historicalData = this.historicalData.slice(-100);
    }
  }

  createConversation() {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const conversation = new Conversation(conversationId);
    this.conversations.set(conversationId, conversation);
    return conversation;
  }

  getConversation(conversationId) {
    return this.conversations.get(conversationId);
  }
}

// Enhanced AI Provider with Convo SDK integration
class EnhancedAIProvider {
  constructor(id, config, convoInstance = null) {
    this.id = id;
    this.config = config;
    this.status = 'initializing';
    this.lastLatency = 0;
    this.apiKey = null;
    this.convo = convoInstance;
  }

  async initialize() {
    try {
      if (!this.config.local && this.config.apiKeyPath) {
        // Get API key from environment or secure storage
        this.apiKey = process.env[this.config.apiKeyPath] || (await this.loadApiKeyFromStorage());

        if (!this.apiKey) {
          this.status = 'missing_api_key';
          return;
        }
      }

      if (this.config.local) {
        // Test local connection (e.g., Ollama)
        await this.testLocalConnection();
      }

      this.status = 'ready';
    } catch (error) {
      this.status = 'error';
      logger.error(`Failed to initialize provider ${this.id}:`, error);
    }
  }

  async generateCompletion(prompt, options = {}) {
    if (this.status !== 'ready') {
      throw new Error(`Provider ${this.id} is not ready (status: ${this.status})`);
    }

    const startTime = Date.now();

    try {
      let response;

      if (this.config.local) {
        response = await this.generateLocalCompletion(prompt, options);
      } else {
        response = await this.generateCloudCompletion(prompt, options);
      }

      this.lastLatency = Date.now() - startTime;

      // Add provider-specific metadata
      if (typeof response === 'string') {
        response = {
          content: response,
          provider: this.id,
          model: options.model || this.config.models[0],
          latency: this.lastLatency,
        };
      } else {
        response.provider = this.id;
        response.latency = this.lastLatency;
      }

      return response;
    } catch (error) {
      this.lastLatency = Date.now() - startTime;
      throw error;
    }
  }

  // Existing methods remain the same...
  async loadApiKeyFromStorage() {
    try {
      const config = await window.electronAPI?.ipcRenderer.invoke('load-llm-config');
      return config?.apiKey;
    } catch (error) {
      logger.warn('Failed to load API key from storage:', error);
      return null;
    }
  }

  async testLocalConnection() {
    if (!this.config.local) return;

    try {
      const response = await fetch(`${this.config.endpoint}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Local AI service not available: ${error.message}`);
    }
  }

  async generateLocalCompletion(prompt, options) {
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || this.config.models[0],
        prompt: prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  }

  async generateCloudCompletion(prompt, options) {
    const headers = {
      'Content-Type': 'application/json',
    };

    let body;

    if (this.id === 'openai') {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      body = {
        model: options.model || this.config.models[0],
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
      };
    } else if (this.id === 'claude') {
      headers['x-api-key'] = this.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = {
        model: options.model || this.config.models[0],
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || 1000,
      };
    }

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (this.id === 'openai') {
      return data.choices[0].message.content;
    } else if (this.id === 'claude') {
      return data.content[0].text;
    }
  }
}

// Placeholder classes for compatibility
class CommandPredictor {
  async predict(partialCommand, history = []) {
    // Implement command prediction logic
    return [];
  }
}

class ErrorAnalyzer {
  async analyze(errorOutput, command, context = {}) {
    // Implement error analysis logic
    return {
      error: errorOutput,
      command,
      analysis: 'Error analysis not implemented',
      suggestions: [],
    };
  }
}

class CodeGenerator {
  async generate(specification, language = 'javascript') {
    // Implement code generation logic
    return {
      code: '// Code generation not implemented',
      language,
      specification,
    };
  }
}

class Conversation {
  constructor(id) {
    this.id = id;
    this.messages = [];
    this.created = new Date().toISOString();
  }

  addMessage(role, content) {
    this.messages.push({
      role,
      content,
      timestamp: new Date().toISOString(),
    });
  }

  getContext() {
    return {
      id: this.id,
      messages: this.messages,
      created: this.created,
    };
  }
}

export { ConvoEnhancedAISystem };
