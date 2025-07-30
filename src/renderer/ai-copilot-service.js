/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 4 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal - AI Copilot Service
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * This file is part of RinaWarp Terminal, an advanced open-source terminal emulator with
 * AI assistance, live collaboration, and enterprise-grade security features.
 *
 * Licensed under the MIT License.
 * See LICENSE file for detailed terms and conditions.
 *
 * Project repository: https://github.com/rinawarp/terminal
 */

// Import AI Providers
import {
  LocalAIProvider,
  OpenAIProvider,
  AnthropicProvider,
  CustomAIProvider,
} from './ai-providers.js';

class AICopilotService {
  constructor() {
    this.isInitialized = false;
    this.currentProvider = 'local'; // local, openai, anthropic, custom
    this.providers = new Map();
    this.conversationHistory = [];
    this.contextAnalyzer = null;
    this.responseFormatter = null;
    this.rateLimiter = new RateLimiter();
    this.securityFilter = new SecurityFilter();
    this.userPreferences = new Map();

    // Initialize default settings
    this.settings = {
      maxHistoryLength: 50,
      responseTimeout: 30000,
      enableContextAwareness: true,
      enableCodeSuggestions: true,
      enableSafetyFilters: true,
      personalityMode: 'helpful', // helpful, professional, casual, debug
      verbosityLevel: 'balanced', // minimal, balanced, detailed
    };

    this.initialize();
  }

  async initialize() {
    // Initializing AI Copilot Service silently

    try {
      // Initialize providers
      await this.initializeProviders();

      // Initialize components
      this.contextAnalyzer = new ContextAnalyzer();
      this.responseFormatter = new ResponseFormatter();

      // Load user preferences
      await this.loadUserPreferences();

      // Setup event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      // AI Copilot Service initialized successfully

      // Emit ready event
      this.emit('copilot-ready');
    } catch (error) {
      // Log error to system logger instead of console
      this.emit('copilot-error', error);
    }
  }

  async initializeProviders() {
    // Initialize local AI provider (using the existing AdvancedIntellectualAI)
    this.providers.set('local', new LocalAIProvider());

    // Initialize external providers (placeholders for future implementation)
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('custom', new CustomAIProvider());

    // Initialize the current provider
    const currentProvider = this.providers.get(this.currentProvider);
    if (currentProvider) {
      console.log('🌊 Hello from the sassy mermaid AI! Getting things ready...');
      await currentProvider.initialize();
    }
  }

  async processUserQuery(query, _context = {}) {
    if (!this.isInitialized) {
      throw new Error(new Error('AI Copilot Service not initialized'));
    }

    // Processing user query silently

    try {
      // Rate limiting check
      if (!this.rateLimiter.canProceed()) {
        throw new Error(new Error('Rate limit exceeded. Please wait before making another request.'));
      }

      // Security filtering
      const filteredQuery = await this.securityFilter.filterInput(query);

      // Analyze context
      const enhancedContext = await this.contextAnalyzer.analyze(_context);

      // Get AI response from current provider
      const provider = this.providers.get(this.currentProvider);
      const rawResponse = await provider.generateResponse(filteredQuery, enhancedContext);

      // Format response
      const formattedResponse = await this.responseFormatter.format(rawResponse, this.settings);

      // Add to conversation history
      this.addToHistory(filteredQuery, formattedResponse);

      // Security filter output
      const safeResponse = await this.securityFilter.filterOutput(formattedResponse);

      // Query processed successfully
      return safeResponse;
    } catch (error) {
      // Error processing query - returning error response
      return this.generateErrorResponse(error);
    }
  }

  async generateCodeSuggestion(code, cursor, context = {}) {
    if (!this.settings.enableCodeSuggestions) {
      return null;
    }

    try {
      const suggestionContext = {
        ...context,
        type: 'code_suggestion',
        code: code,
        cursorPosition: cursor,
        language: this.detectLanguage(code),
      };

      const query = `Suggest completion for: ${code.substring(Math.max(0, cursor - 50), cursor + 50)}`;
      const response = await this.processUserQuery(query, suggestionContext);

      return {
        suggestions: response.suggestions || [],
        explanation: response.explanation || '',
        confidence: response.confidence || 0.5,
      };
    } catch (error) {
      // Error generating code suggestion
      return null;
    }
  }

  async analyzeCommand(command, workingDirectory = '', history = []) {
    try {
      const analysisContext = {
        type: 'command_analysis',
        command: command,
        workingDirectory: workingDirectory,
        recentHistory: history.slice(-10),
        timestamp: new Date().toISOString(),
      };

      const query = `Analyze this command: ${command}`;
      const response = await this.processUserQuery(query, analysisContext);

      return {
        safety: response.safety_analysis || { risk_level: 'unknown', warnings: [] },
        suggestions: response.suggestions || [],
        alternatives: response.alternatives || [],
        explanation: response.explanation || '',
        bestPractices: response.best_practices || [],
        performanceInsights: response.performance_insights || {},
      };
    } catch (error) {
      // Error analyzing command
      return this.generateErrorAnalysis(error);
    }
  }

  async explainError(errorMessage, command = '', context = {}) {
    try {
      const errorContext = {
        ...context,
        type: 'error_explanation',
        errorMessage: errorMessage,
        failedCommand: command,
        timestamp: new Date().toISOString(),
      };

      const query = `Explain this error: ${errorMessage}`;
      const response = await this.processUserQuery(query, errorContext);

      return {
        explanation: response.explanation || 'Unable to explain this error.',
        possibleCauses: response.possible_causes || [],
        solutions: response.solutions || [],
        prevention: response.prevention_tips || [],
        severity: response.severity || 'unknown',
      };
    } catch (error) {
      // Error explaining error
      return this.generateErrorExplanation(error);
    }
  }

  // Provider management
  async switchProvider(providerName) {
    if (!this.providers.has(providerName)) {
      throw new Error(new Error(`Provider ${providerName} not available`));
    }

    const oldProvider = this.currentProvider;
    this.currentProvider = providerName;

    try {
      const provider = this.providers.get(providerName);
      await provider.initialize();

      // Switched AI provider successfully
      this.emit('provider-changed', { from: oldProvider, to: providerName });
    } catch (error) {
      // Rollback on failure
      this.currentProvider = oldProvider;
      throw new Error(new Error(`Failed to switch to provider ${providerName}: ${error.message}`));
    }
  }

  getAvailableProviders() {
    return Array.from(this.providers.keys()).map(name => ({
      name: name,
      available: this.providers.get(name).isAvailable(),
      description: this.providers.get(name).getDescription(),
    }));
  }

  // Settings management
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveUserPreferences();
    this.emit('settings-updated', this.settings);
  }

  getSettings() {
    return { ...this.settings };
  }

  // Conversation management
  addToHistory(query, response) {
    this.conversationHistory.push({
      query: query,
      response: response,
      timestamp: new Date().toISOString(),
      provider: this.currentProvider,
    });

    // Keep history within limits
    if (this.conversationHistory.length > this.settings.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(-this.settings.maxHistoryLength);
    }
  }

  getConversationHistory(limit = 10) {
    return this.conversationHistory.slice(-limit);
  }

  clearHistory() {
    this.conversationHistory = [];
    // Conversation history cleared
  }

  // Utility methods
  detectLanguage(code) {
    // Simple language detection based on patterns
    if (code.includes('#!/bin/bash') || code.includes('#!/bin/sh')) return 'bash';
    if (code.includes('$') && code.includes('|')) return 'shell';
    if (code.includes('function') && code.includes('{')) return 'javascript';
    if (code.includes('def ') && code.includes(':')) return 'python';
    if (code.includes('#include') && code.includes(';')) return 'c';
    if (code.includes('git ')) return 'git';
    if (code.includes('docker ')) return 'docker';
    if (code.includes('npm ') || code.includes('yarn ')) return 'package_manager';

    return 'unknown';
  }

  generateErrorResponse(error) {
    return {
      type: 'error',
      message: 'I encountered an issue processing your request.',
      details: error.message,
      suggestions: [
        'Try rephrasing your question',
        'Check your internet connection if using external AI providers',
        'Contact support if the issue persists',
      ],
      timestamp: new Date().toISOString(),
    };
  }

  generateErrorAnalysis(_error) {
    return {
      safety: { risk_level: 'unknown', warnings: ['Unable to analyze command safety'] },
      suggestions: ['Command analysis failed - proceed with caution'],
      alternatives: [],
      explanation: 'Analysis service temporarily unavailable',
      bestPractices: ['Always test commands in a safe environment'],
      performanceInsights: {},
    };
  }

  generateErrorExplanation(_error) {
    return {
      explanation: 'Unable to explain this error at the moment.',
      possibleCauses: ['Service temporarily unavailable'],
      solutions: ['Try again later', 'Search for the error message online'],
      prevention: ['Keep your system updated'],
      severity: 'unknown',
    };
  }

  // User preferences
  async loadUserPreferences() {
    try {
      const saved = localStorage.getItem('rinawarp-ai-copilot-preferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        this.userPreferences = new Map(preferences.preferences || []);
        this.settings = { ...this.settings, ...preferences.settings };
      }
    } catch (error) {
      // Failed to load AI copilot preferences - using defaults
    }
  }

  saveUserPreferences() {
    try {
      const data = {
        preferences: Array.from(this.userPreferences.entries()),
        settings: this.settings,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem('rinawarp-ai-copilot-preferences', JSON.stringify(data));
    } catch (error) {
      // Failed to save AI copilot preferences - continuing without save
    }
  }

  // Event system
  setupEventListeners() {
    // Setup event emitter-like functionality
    this.events = new Map();
  }

  emit(event, data) {
    const listeners = this.events.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        // Error in event listener - continuing
      }
    });
  }

  on(event, listener) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(listener);
  }

  off(event, listener) {
    const listeners = this.events.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  // Cleanup
  destroy() {
    // Destroying AI Copilot Service

    // Clear conversation history
    this.clearHistory();

    // Destroy providers
    this.providers.forEach(provider => {
      if (provider.destroy) {
        provider.destroy();
      }
    });

    // Clear events
    this.events.clear();

    this.isInitialized = false;
    // AI Copilot Service destroyed
  }
}

// Supporting classes
class RateLimiter {
  constructor(maxRequests = 30, timeWindow = 60000) {
    // 30 requests per minute
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }

  canProceed() {
    const now = Date.now();
    // Remove old requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);

    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }

    return false;
  }

  getWaitTime() {
    if (this.requests.length === 0) return 0;
    const oldestRequest = Math.min(...this.requests);
    const waitTime = this.timeWindow - (Date.now() - oldestRequest);
    return Math.max(0, waitTime);
  }
}

class SecurityFilter {
  constructor() {
    this.dangerousPatterns = [
      /rm\s+-rf\s+\/\s*$/,
      /:\(\)\{\s*:\|:&\s*\};:/, // Fork bomb
      /sudo\s+.*passwd/,
      /mkfs\./,
      /dd\s+if=.*of=\/dev\//,
      />\/dev\/(sda|hda)/,
    ];

    this.sensitivePatterns = [/password/i, /secret/i, /token/i, /api[_-]?key/i, /private[_-]?key/i];
  }

  async filterInput(input) {
    // Check for dangerous patterns
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(input)) {
        // Potentially dangerous command detected - filtering
        // Don't process dangerous commands directly
        return `[SAFETY_FILTERED] ${input}`;
      }
    }

    // Mask sensitive information
    let filtered = input;
    for (const pattern of this.sensitivePatterns) {
      filtered = filtered.replace(pattern, '[REDACTED]');
    }

    return filtered;
  }

  async filterOutput(output) {
    // Remove any potential sensitive information from output
    let filtered = JSON.parse(JSON.stringify(output)); // Deep copy

    if (typeof filtered === 'object') {
      this.recursiveFilter(filtered);
    } else if (typeof filtered === 'string') {
      for (const pattern of this.sensitivePatterns) {
        filtered = filtered.replace(pattern, '[REDACTED]');
      }
    }

    return filtered;
  }

  recursiveFilter(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        for (const pattern of this.sensitivePatterns) {
          obj[key] = obj[key].replace(pattern, '[REDACTED]');
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.recursiveFilter(obj[key]);
      }
    }
  }
}

class ContextAnalyzer {
  async analyze(context) {
    const enhanced = {
      ...context,
      timestamp: new Date().toISOString(),
      systemInfo: this.getSystemInfo(),
      environmentInfo: this.getEnvironmentInfo(),
      analysisMetadata: {
        version: '1.0.0',
        analyzer: 'RinaWarp Context Analyzer',
      },
    };

    return enhanced;
  }

  getSystemInfo() {
    return {
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      language: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
    };
  }

  getEnvironmentInfo() {
    return {
      terminal: 'RinaWarp Terminal',
      features: ['ai_copilot', 'smart_suggestions', 'context_awareness'],
      capabilities: ['code_completion', 'error_analysis', 'command_explanation'],
    };
  }
}

class ResponseFormatter {
  async format(response, settings) {
    const verbosity = settings.verbosityLevel || 'balanced';
    const personality = settings.personalityMode || 'helpful';

    let formatted = { ...response };

    // Adjust response based on verbosity level
    switch (verbosity) {
    case 'minimal':
      formatted = this.minimizeResponse(formatted);
      break;
    case 'detailed':
      formatted = this.expandResponse(formatted);
      break;
    case 'balanced':
    default:
      // Keep as is
      break;
    }

    // Adjust personality
    formatted.personality_flavor = this.adjustPersonality(
      formatted.personality_flavor || '',
      personality
    );

    return formatted;
  }

  minimizeResponse(response) {
    return {
      explanation: response.explanation ? response.explanation.substring(0, 200) + '...' : '',
      suggestions: (response.suggestions || []).slice(0, 3),
      alternatives: (response.alternatives || []).slice(0, 2),
    };
  }

  expandResponse(response) {
    // Add more detailed explanations and context
    return {
      ...response,
      detailed_explanation: response.explanation + '\n\n' + (response.reasoning || ''),
      additional_context: response.educational_content || '',
      extended_tips: response.expert_tips || [],
    };
  }

  adjustPersonality(flavor, mode) {
    switch (mode) {
    case 'professional':
      return flavor.replace(/[🤖😄💡🚀✨]/gu, '').trim();
    case 'casual':
      return flavor + ' 😊';
    case 'debug':
      return `[DEBUG] ${flavor}`;
    case 'helpful':
    default:
      return flavor;
    }
  }
}

export default AICopilotService;
