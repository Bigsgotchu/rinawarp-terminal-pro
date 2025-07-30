/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 9 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal - AI Integration for Browser Environment
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * This module handles AI provider interactions in the browser environment,
 * providing WebSocket and REST API communication with the server,
 * mermaid personality responses, command parsing, and error handling.
 */

class AIIntegration {
  constructor() {
    this.providers = new Map();
    this.activeProvider = null;
    this.fallbackChain = ['local', 'anthropic', 'openai', 'custom'];
    this.isInitialized = false;
    this.personalityEngine = null;
    this.connectionType = 'rest'; // 'websocket' or 'rest'
    this.wsConnection = null;
    this.requestId = 0;
    this.pendingRequests = new Map();

    // Configuration
    this.config = {
      preferredProvider: 'anthropic',
      enableFallback: true,
      responseTimeout: 10000,
      retryAttempts: 3,
      serverEndpoint: this.getServerEndpoint(),
      wsEndpoint: this.getWebSocketEndpoint(),
      enableMermaidPersonality: true,
    };

    // Network status tracking
    this.networkStatus = {
      isOnline: navigator.onLine,
      lastError: null,
      consecutiveErrors: 0,
    };

    this.setupEventListeners();
    this.loadConfiguration();
  }

  // Initialize the AI integration system
  async initialize() {
    console.log('🧜‍♀️ Initializing AI Integration system...');
    
    try {
      // Initialize personality engine first
      await this.initializePersonalityEngine();
      
      // Try to establish connection
      await this.establishConnection();
      
      // Initialize providers
      await this.initializeProviders();
      
      // Set up active provider
      await this.selectActiveProvider();
      
      this.isInitialized = true;
      console.log('✅ AI Integration system initialized successfully');
      
      // Emit initialization event
      this.emitEvent('ai-integration-ready', {
        providers: Array.from(this.providers.keys()),
        activeProvider: this.activeProvider?.getName() || 'fallback',
        personalityEnabled: !!this.personalityEngine,
        connectionType: this.connectionType,
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize AI Integration system:', error);
      this.isInitialized = false;
      throw new Error(error);
    }
  }

  // Initialize the mermaid personality engine
  async initializePersonalityEngine() {
    if (!this.config.enableMermaidPersonality) return;
    
    try {
      // Check if RinaPersonalityEngine is available globally
      if (typeof window !== 'undefined' && window.RinaPersonalityEngine) {
        this.personalityEngine = new window.RinaPersonalityEngine();
        console.log('🧜‍♀️ Rina personality engine loaded');
      } else {
        // Fallback personality system
        this.personalityEngine = new FallbackPersonalityEngine();
        console.log('🧜‍♀️ Fallback personality engine loaded');
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize personality engine:', error);
      this.personalityEngine = new FallbackPersonalityEngine();
    }
  }

  // Establish connection to the server
  async establishConnection() {
    // Try WebSocket first, fallback to REST
    try {
      if (this.config.wsEndpoint) {
        await this.initializeWebSocketConnection();
        this.connectionType = 'websocket';
        console.log('🌊 WebSocket connection established');
      } else {
        throw new Error(new Error('WebSocket endpoint not configured'));
      }
    } catch (error) {
      console.warn('⚠️ WebSocket connection failed, using REST API:', error.message);
      this.connectionType = 'rest';
      
      // Test REST API endpoint
      if (this.config.serverEndpoint) {
        await this.testRestConnection();
        console.log('🌊 REST API connection established');
      } else {
        throw new Error(new Error('No server endpoints configured'));
      }
    }
  }

  // Initialize WebSocket connection
  async initializeWebSocketConnection() {
    return new Promise((resolve, reject) => {
      try {
        this.wsConnection = new WebSocket(this.config.wsEndpoint);
        
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 5000);

        this.wsConnection.onopen = () => {
          clearTimeout(timeout);
          console.log('🧜‍♀️ WebSocket connected to AI backend');
          resolve();
        };

        this.wsConnection.onmessage = (event) => {
          this.handleWebSocketMessage(event);
        };

        this.wsConnection.onclose = (event) => {
          console.log('🌊 WebSocket connection closed:', event.code, event.reason);
          this.handleConnectionLoss();
        };

        this.wsConnection.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  // Test REST API connection
  async testRestConnection() {
    const response = await this.makeRequest('/api/ai/health', {
      method: 'GET',
      timeout: 3000,
    });
    
    if (!response.ok) {
      throw new Error(new Error(`REST API health check failed: ${response.status}`));
    }
    
    const data = await response.json();
    if (data.status !== 'ok') {
      throw new Error(new Error('REST API is not healthy'));
    }
  }

  // Initialize AI providers
  async initializeProviders() {
    const providerTypes = this.fallbackChain;
    
    for (const type of providerTypes) {
      try {
        const provider = this.createProvider(type);
        this.providers.set(type, provider);
        console.log(`✅ ${type} provider initialized`);
      } catch (error) {
        console.warn(`⚠️ Failed to initialize ${type} provider:`, error.message);
        // Store failed provider for potential retry
        const provider = this.createProvider(type);
        provider.lastError = error;
        provider.isAvailable = () => false;
        this.providers.set(type, provider);
      }
    }
  }

  // Create AI provider instance
  createProvider(type) {
    const baseProvider = {
      name: type,
      isAvailable: () => true,
      lastError: null,
      capabilities: [],
      rateLimits: { requestsPerMinute: 60 },
    };

    switch (type.toLowerCase()) {
      case 'local':
        return {
          ...baseProvider,
          description: 'Local AI processing with personality',
          capabilities: ['command_analysis', 'error_explanation', 'personality_responses'],
          getName: () => 'Local AI',
          generateResponse: (query, context) => this.processLocalAI(query, context),
        };
        
      case 'anthropic':
        return {
          ...baseProvider,
          description: 'Anthropic Claude AI Assistant',
          capabilities: ['advanced_reasoning', 'safety_analysis', 'detailed_explanations'],
          getName: () => 'Anthropic Claude',
          generateResponse: (query, context) => this.callRemoteProvider('anthropic', query, context),
        };
        
      case 'openai':
        return {
          ...baseProvider,
          description: 'OpenAI GPT Assistant',
          capabilities: ['creative_assistance', 'code_generation', 'multilingual_support'],
          getName: () => 'OpenAI GPT',
          generateResponse: (query, context) => this.callRemoteProvider('openai', query, context),
        };
        
      case 'custom':
        return {
          ...baseProvider,
          description: 'Custom AI Service',
          capabilities: ['configurable_endpoints', 'custom_models'],
          getName: () => 'Custom AI',
          generateResponse: (query, context) => this.callRemoteProvider('custom', query, context),
        };
        
      default:
        throw new Error(new Error(`Unknown provider type: ${type}`));
    }
  }

  // Select active provider based on preference and availability
  async selectActiveProvider() {
    // Try preferred provider first
    if (this.config.preferredProvider) {
      const preferred = this.providers.get(this.config.preferredProvider);
      if (preferred && preferred.isAvailable()) {
        this.activeProvider = preferred;
        console.log(`🎯 Using preferred provider: ${this.config.preferredProvider}`);
        return;
      }
    }

    // Fallback to first available provider
    for (const providerType of this.fallbackChain) {
      const provider = this.providers.get(providerType);
      if (provider && provider.isAvailable()) {
        this.activeProvider = provider;
        console.log(`📋 Using fallback provider: ${providerType}`);
        return;
      }
    }

    console.warn('⚠️ No AI providers available, using emergency fallback');
    this.activeProvider = this.createEmergencyFallback();
  }

  // Generate AI response with personality and error handling
  async generateResponse(query, context = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const enhancedContext = this.enhanceContext(context);

    try {
      // Parse command if needed
      const parsedQuery = this.parseCommand(query);
      
      // Try active provider first
      let response;
      if (this.activeProvider) {
        response = await this.tryProviderWithTimeout(
          this.activeProvider,
          parsedQuery.query,
          enhancedContext
        );
      } else {
        response = await this.tryFallbackResponse(parsedQuery.query, enhancedContext);
      }

      // Add personality flavor if enabled
      if (this.personalityEngine && this.config.enableMermaidPersonality) {
        response = this.addPersonalityToResponse(response, parsedQuery, enhancedContext);
      }

      // Add metadata
      response.processing_time = Date.now() - startTime;
      response.provider_info = {
        name: this.activeProvider?.getName() || 'fallback',
        capabilities: this.activeProvider?.capabilities || [],
        connection_type: this.connectionType,
      };

      // Reset error counter on success
      this.networkStatus.consecutiveErrors = 0;
      this.networkStatus.lastError = null;

      return response;

    } catch (error) {
      console.error('❌ Error generating AI response:', error);
      this.networkStatus.consecutiveErrors++;
      this.networkStatus.lastError = error;

      // Try fallback if enabled
      if (this.config.enableFallback) {
        return await this.tryFallbackResponse(query, enhancedContext);
      }

      throw new Error(error);
    }
  }

  // Try provider with timeout handling
  async tryProviderWithTimeout(provider, query, context) {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Provider ${provider.getName()} response timeout`));
      }, this.config.responseTimeout);

      try {
        const response = await provider.generateResponse(query, context);
        clearTimeout(timeout);
        resolve(response);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  // Process local AI with personality
  async processLocalAI(query, context) {
    // Simple local processing with personality
    const response = {
      explanation: await this.generateLocalExplanation(query, context),
      reasoning: 'Processed locally with mermaid personality',
      alternatives: this.generateAlternatives(query),
      expert_tips: this.generateExpertTips(query),
      safety_analysis: this.analyzeSafety(query),
      best_practices: this.getBestPractices(query),
      confidence: 0.8,
      timestamp: new Date().toISOString(),
    };

    return response;
  }

  // Call remote provider via WebSocket or REST
  async callRemoteProvider(providerType, query, context) {
    if (this.connectionType === 'websocket' && this.wsConnection?.readyState === WebSocket.OPEN) {
      return await this.sendWebSocketRequest(providerType, query, context);
    } else {
      return await this.sendRestRequest(providerType, query, context);
    }
  }

  // Send WebSocket request
  async sendWebSocketRequest(providerType, query, context) {
    return new Promise((resolve, reject) => {
      const requestId = ++this.requestId;
      
      const request = {
        id: requestId,
        type: 'ai_request',
        provider: providerType,
        query: query,
        context: context,
        timestamp: new Date().toISOString(),
      };

      // Store pending request
      this.pendingRequests.set(requestId, { resolve, reject });
      
      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('WebSocket request timeout'));
      }, this.config.responseTimeout);

      // Update timeout in pending request
      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      try {
        this.wsConnection.send(JSON.stringify(request));
      } catch (error) {
        this.pendingRequests.delete(requestId);
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  // Send REST request
  async sendRestRequest(providerType, query, context) {
    const response = await this.makeRequest('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: providerType,
        query: query,
        context: context,
      }),
    });

    if (!response.ok) {
      throw new Error(new Error(`REST request failed: ${response.status} ${response.statusText}`));
    }

    return await response.json();
  }

  // Handle WebSocket message
  handleWebSocketMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      if (message.type === 'ai_response' && message.id) {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(message.id);
          
          if (message.error) {
            pending.reject(new Error(message.error));
          } else {
            pending.resolve(message.data);
          }
        }
      }
      
      // Handle other message types as needed
      this.emitEvent('websocket-message', message);
      
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  }

  // Parse command for better processing
  parseCommand(input) {
    const trimmed = input.trim();
    
    // Detect if it's a natural language query vs command
    const isNaturalLanguage = this.isNaturalLanguageQuery(trimmed);
    
    // Extract command parts if it looks like a shell command
    let command = null;
    let args = [];
    
    if (!isNaturalLanguage && trimmed.includes(' ')) {
      const parts = trimmed.split(' ');
      command = parts[0];
      args = parts.slice(1);
    }

    return {
      query: trimmed,
      isNaturalLanguage,
      command,
      args,
      originalInput: input,
    };
  }

  // Check if input looks like natural language
  isNaturalLanguageQuery(input) {
    const naturalLanguageIndicators = [
      /\b(how|what|why|when|where|can|could|would|should|please|help|explain)\b/i,
      /\?$/, // Ends with question mark
      /\b(show me|tell me|I want|I need|help with)\b/i,
      /\b(list|display|find|search|create|delete|remove)\b.*\b(file|directory|process)\b/i,
    ];

    return naturalLanguageIndicators.some(pattern => pattern.test(input)) ||
           input.split(' ').length > 4; // Long phrases are likely natural language
  }

  // Enhance context with browser-specific information
  enhanceContext(context) {
    return {
      ...context,
      browser: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        onLine: navigator.onLine,
      },
      session: {
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        connectionType: this.connectionType,
      },
      ai: {
        activeProvider: this.activeProvider?.getName() || 'fallback',
        availableProviders: Array.from(this.providers.keys()),
        personalityEnabled: !!this.personalityEngine,
      },
    };
  }

  // Add personality to AI response
  addPersonalityToResponse(response, parsedQuery, context) {
    if (!this.personalityEngine) return response;

    try {
      const personalityResponse = this.personalityEngine.generateResponse(
        parsedQuery.originalInput,
        { executed: true, confidence: response.confidence },
        context
      );

      return {
        ...response,
        personality_flavor: personalityResponse.response,
        mood: personalityResponse.mood,
        suggestions: [...(response.suggestions || []), ...(personalityResponse.suggestions || [])],
        mermaid_personality: personalityResponse.personality,
      };
    } catch (error) {
      console.warn('⚠️ Failed to add personality to response:', error);
      return response;
    }
  }

  // Try fallback response when primary providers fail
  async tryFallbackResponse(query, context) {
    console.log('🔄 Generating fallback response...');
    
    const fallbackResponse = {
      explanation: this.generateFallbackExplanation(query),
      reasoning: 'Generated using emergency fallback system',
      alternatives: this.generateAlternatives(query),
      expert_tips: ['Check your network connection', 'Try again in a moment'],
      safety_analysis: { risk_level: 'unknown', warnings: ['Unable to analyze with AI'] },
      best_practices: ['Always backup important data', 'Test commands in safe environment'],
      confidence: 0.3,
      timestamp: new Date().toISOString(),
      provider: 'emergency_fallback',
    };

    // Add personality even in fallback
    if (this.personalityEngine) {
      fallbackResponse.personality_flavor = '🧜‍♀️ *waves from the depths* Even in rough seas, I\'m here to help! My full powers will return soon! 🌊';
    }

    return fallbackResponse;
  }

  // Generate local explanation
  async generateLocalExplanation(query, context) {
    const patterns = {
      git: /\bgit\b/i,
      npm: /\bnpm\b|\byarn\b/i,
      file: /\b(ls|cat|touch|mkdir|rm|cp|mv)\b/i,
      network: /\b(curl|wget|ping)\b/i,
      process: /\b(ps|top|kill|jobs)\b/i,
      system: /\b(df|du|free|uname|whoami)\b/i,
    };

    for (const [category, pattern] of Object.entries(patterns)) {
      if (pattern.test(query)) {
        return this.getCategoryExplanation(category, query);
      }
    }

    return `I'd love to help with "${query}"! While my full AI capabilities are being prepared, I can still offer basic guidance.`;
  }

  // Get category-specific explanation
  getCategoryExplanation(category, query) {
    const explanations = {
      git: `🐙 Git command detected! This helps with version control - tracking changes, collaborating, and managing your code history.`,
      npm: `📦 Package manager command! This handles installing, updating, and managing JavaScript packages and dependencies.`,
      file: `📁 File system operation detected! This command works with files and directories in your system.`,
      network: `🌐 Network command identified! This handles network requests, connectivity testing, or data transfer.`,
      process: `⚙️ Process management command! This helps monitor, control, or interact with running programs.`,
      system: `🖥️ System information command! This provides details about your system resources and configuration.`,
    };

    return explanations[category] || `Command "${query}" recognized! Let me help you with that.`;
  }

  // Generate alternatives for commands
  generateAlternatives(query) {
    const alternatives = [];
    
    if (query.includes('ls')) {
      alternatives.push('ls -la (show hidden files)', 'tree (show directory structure)');
    }
    
    if (query.includes('git')) {
      alternatives.push('git status (check repository status)', 'git log --oneline (view commit history)');
    }
    
    if (query.includes('npm')) {
      alternatives.push('yarn (alternative package manager)', 'pnpm (fast package manager)');
    }

    return alternatives;
  }

  // Generate expert tips
  generateExpertTips(query) {
    const tips = ['Use tab completion to avoid typos', 'Check man pages for detailed help'];
    
    if (query.includes('rm')) {
      tips.push('⚠️ Always double-check before deleting files');
    }
    
    if (query.includes('git')) {
      tips.push('💡 Use git aliases for common commands');
    }

    return tips;
  }

  // Analyze command safety
  analyzeSafety(query) {
    const dangerousPatterns = [
      /rm\s+.*-r.*\//, // Recursive delete
      /sudo\s+rm/, // Sudo delete
      />\s*\/dev\//, // Redirect to device files
      /curl.*\|\s*sh/, // Pipe curl to shell
    ];

    const hasDangerousPattern = dangerousPatterns.some(pattern => pattern.test(query));

    return {
      risk_level: hasDangerousPattern ? 'high' : 'low',
      warnings: hasDangerousPattern ? ['⚠️ This command could be dangerous - proceed with caution'] : [],
      recommendations: hasDangerousPattern ? ['Test in a safe environment first', 'Make backups before proceeding'] : [],
    };
  }

  // Get best practices
  getBestPractices(query) {
    const practices = ['Always read command documentation', 'Test in safe environments'];
    
    if (query.includes('git')) {
      practices.push('Write descriptive commit messages', 'Review changes before committing');
    }

    return practices;
  }

  // Generate fallback explanation
  generateFallbackExplanation(query) {
    return `🧜‍♀️ I'm currently swimming in limited waters, but I can still help! The query "${query}" looks interesting. While my full AI powers are getting ready, here's what I can tell you: this appears to be a ${this.categorizeQuery(query)} operation.`;
  }

  // Categorize query type
  categorizeQuery(query) {
    if (/git/i.test(query)) return 'version control';
    if (/npm|yarn/i.test(query)) return 'package management';
    if (/ls|cat|touch|mkdir/i.test(query)) return 'file system';
    if (/curl|wget/i.test(query)) return 'network';
    if (/ps|top|kill/i.test(query)) return 'process management';
    return 'general command line';
  }

  // Network and connection handling
  handleConnectionLoss() {
    console.log('🌊 Connection lost, attempting to reconnect...');
    this.connectionType = 'rest'; // Fallback to REST
    
    // Try to reconnect after a delay
    setTimeout(() => {
      if (this.isInitialized) {
        this.establishConnection().catch(error => {
          console.warn('⚠️ Reconnection failed:', error.message);
        });
      }
    }, 5000);
  }

  // Make HTTP request with error handling
  async makeRequest(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${this.config.serverEndpoint}${url}`;
    
    const requestOptions = {
      timeout: 5000,
      ...options,
    };

    // Add retry logic
    let lastError;
    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(fullUrl, requestOptions);
        return response;
      } catch (error) {
        lastError = error;
        if (attempt < this.config.retryAttempts - 1) {
          await this.delay(1000 * (attempt + 1)); // Exponential backoff
        }
      }
    }

    throw new Error(lastError);
  }

  // Utility methods
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  emitEvent(eventName, data) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
  }

  // Configuration methods
  getServerEndpoint() {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      const host = window.location.host;
      return `${protocol}//${host}`;
    }
    return 'http://localhost:3000';
  }

  getWebSocketEndpoint() {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      return `${protocol}//${host}/ws`;
    }
    return 'ws://localhost:3000/ws';
  }

  loadConfiguration() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('rinawarp-ai-integration-config');
        if (saved) {
          this.config = { ...this.config, ...JSON.parse(saved) };
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load AI integration configuration:', error);
    }
  }

  saveConfiguration() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('rinawarp-ai-integration-config', JSON.stringify(this.config));
      }
    } catch (error) {
      console.warn('⚠️ Failed to save AI integration configuration:', error);
    }
  }

  updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.saveConfiguration();
    
    // Reinitialize if needed
    if (this.isInitialized && (newConfig.preferredProvider || newConfig.serverEndpoint)) {
      this.initialize();
    }
  }

  // Setup event listeners
  setupEventListeners() {
    if (typeof window !== 'undefined') {
      // Network status monitoring
      window.addEventListener('online', () => {
        this.networkStatus.isOnline = true;
        console.log('🌊 Network connection restored');
        if (this.isInitialized) {
          this.establishConnection();
        }
      });

      window.addEventListener('offline', () => {
        this.networkStatus.isOnline = false;
        console.log('🏝️ Network connection lost');
      });

      // Cleanup on page unload
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });
    }
  }

  // Create emergency fallback provider
  createEmergencyFallback() {
    return {
      name: 'emergency_fallback',
      getName: () => 'Emergency Fallback',
      isAvailable: () => true,
      capabilities: ['basic_responses'],
      generateResponse: async (query) => {
        return {
          explanation: this.generateFallbackExplanation(query),
          reasoning: 'Emergency fallback - limited functionality',
          alternatives: [],
          expert_tips: ['Check network connection', 'Try again later'],
          safety_analysis: { risk_level: 'unknown', warnings: [] },
          best_practices: ['Always backup important data'],
          confidence: 0.2,
          timestamp: new Date().toISOString(),
          provider: 'emergency_fallback',
        };
      },
    };
  }

  // Status and information
  getStatus() {
    return {
      initialized: this.isInitialized,
      activeProvider: this.activeProvider?.getName() || 'none',
      connectionType: this.connectionType,
      networkStatus: this.networkStatus,
      providersAvailable: Array.from(this.providers.keys()),
      personalityEnabled: !!this.personalityEngine,
      config: { ...this.config },
    };
  }

  // Cleanup resources
  cleanup() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    
    this.pendingRequests.clear();
    this.isInitialized = false;
  }
}

// Fallback personality engine for when the main one isn't available
class FallbackPersonalityEngine {
  constructor() {
    this.responses = [
      '🧜‍♀️ *waves gracefully* At your service!',
      '🌊 *creates gentle bubbles* Happy to help!',
      '🐚 *adjusts seashell crown* What can I do for you?',
      '✨ *shimmers with enthusiasm* Ready when you are!',
    ];
  }

  generateResponse(command, result) {
    const randomResponse = this.responses[Math.floor(Math.random() * this.responses.length)];
    
    return {
      response: randomResponse,
      mood: 'playful',
      confidence: result.confidence || 0.7,
      personality: {
        mood: 'playful',
        traits: { sassiness: 0.7, helpfulness: 0.9, playfulness: 0.8 },
      },
      suggestions: ['Try asking me something else!', 'I love helping with commands!'],
    };
  }
}

// Export for global use
if (typeof window !== 'undefined') {
  window.AIIntegration = AIIntegration;
  window.FallbackPersonalityEngine = FallbackPersonalityEngine;
  
  // Create global instance
  window.aiIntegration = new AIIntegration();
  
  console.log('🧜‍♀️ AI Integration module loaded and ready!');
}

// Also support module exports for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIIntegration, FallbackPersonalityEngine };
}
