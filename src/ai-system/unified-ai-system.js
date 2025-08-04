/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Unified AI System for RinaWarp Terminal
 * Combines external LLM APIs with advanced learning algorithms
 * for sophisticated contextual understanding and reasoning
 */

// Import required classes - these would be implemented separately
// For now, we'll create stub classes to avoid undefined errors
class LLMAPIClient {
  constructor(config) {
    this.config = config;
  }

  async initialize() {
    return true;
  }
}

class AdvancedLearningEngine {
  constructor(config) {
    this.config = config;
  }

  async initialize() {
    return true;
  }

  async processInteraction(_userInput, _context, result) {
    return { insights: 'Learning insights would be provided here' };
  }
}

// Context management classes

class UnifiedAISystem {
  constructor(config = {}) {
    this.config = {
      enableExternalLLM: config.enableExternalLLM !== false,
      enableLearning: config.enableLearning !== false,
      llmConfig: config.llmConfig || {},
      learningConfig: config.learningConfig || {},
      hybridMode: config.hybridMode !== false, // Use both systems together
      fallbackToLocal: config.fallbackToLocal !== false,
    };

    this.llmClient = null;
    this.learningEngine = null;
    this.contextManager = new ContextManager();
    this.responseOptimizer = new ResponseOptimizer();
    this.confidenceEngine = new ConfidenceEngine();

    this.systemState = {
      initialized: false,
      llmAvailable: false,
      learningEnabled: false,
      currentMode: 'hybrid', // 'llm', 'learning', 'hybrid', 'local'
      performanceMetrics: {
        totalRequests: 0,
        successfulRequests: 0,
        averageResponseTime: 0,
        llmRequests: 0,
        localRequests: 0,
      },
    };

    this.cache = new Map();
    this.requestQueue = [];
    this.processingRequest = false;
  }

  /**
   * Initialize the unified AI system
   */
  async initialize() {
    try {
      // Initialize context manager
      await this.contextManager.initialize();

      // Initialize external LLM if enabled
      if (this.config.enableExternalLLM) {
        try {
          this.llmClient = new LLMAPIClient(this.config.llmConfig);
          this.systemState.llmAvailable = await this.llmClient.initialize();
        } catch (error) {
          console.warn('⚠️ External LLM initialization failed:', error.message);
          this.systemState.llmAvailable = false;
        }
      }

      // Initialize advanced learning engine
      if (this.config.enableLearning) {
        try {
          this.learningEngine = new AdvancedLearningEngine();
          this.systemState.learningEnabled = await this.learningEngine.initialize();
        } catch (error) {
          console.warn('⚠️ Learning engine initialization failed:', error.message);
          this.systemState.learningEnabled = false;
        }
      }

      // Initialize response optimizer and confidence engine
      await this.responseOptimizer.initialize();
      await this.confidenceEngine.initialize();

      // Determine optimal operating mode
      this.determineOperatingMode();

      this.systemState.initialized = true;

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Unified AI System:', error);
      return false;
    }
  }

  /**
   * Process a user command using the unified AI system
   */
  async processCommand(userInput, context = null) {
    if (!this.systemState.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      // Add to processing queue
      this.requestQueue.push({ requestId, userInput, context, startTime });

      // Get enhanced context
      const enhancedContext = await this.contextManager.enhanceContext(context);

      let response;
      let confidence = 0.5;
      let source = 'unknown';

      // Choose processing strategy based on current mode
      switch (this.systemState.currentMode) {
      case 'hybrid':
        response = await this.processHybrid(userInput, enhancedContext);
        break;
      case 'llm':
        response = await this.processWithLLM(userInput, enhancedContext);
        break;
      case 'learning':
        response = await this.processWithLearning(userInput, enhancedContext);
        break;
      default:
        response = await this.processLocal(userInput, enhancedContext);
      }

      // Extract response details
      if (typeof response === 'object') {
        confidence = response.confidence || 0.5;
        source = response.source || this.systemState.currentMode;
        response = response.response || response.text || String(response);
      }

      // Optimize response
      const optimizedResponse = await this.responseOptimizer.optimize(response, {
        userInput,
        context: enhancedContext,
        confidence,
        source,
      });

      // Calculate final confidence
      const finalConfidence = this.confidenceEngine.calculate({
        originalConfidence: confidence,
        responseQuality: optimizedResponse.quality,
        contextRelevance: optimizedResponse.contextRelevance,
        source,
      });

      // Learn from this interaction if learning is enabled
      if (this.systemState.learningEnabled && this.learningEngine) {
        const result = {
          response: optimizedResponse.text,
          confidence: finalConfidence,
          source,
          processingTime: Date.now() - startTime,
        };

        const learningInsights = await this.learningEngine.processInteraction(
          userInput,
          enhancedContext,
          result
        );

        optimizedResponse.learningInsights = learningInsights;
      }

      // Update performance metrics
      this.updatePerformanceMetrics(startTime, true, source);

      return {
        response: optimizedResponse.text,
        confidence: finalConfidence,
        source,
        processingTime: Date.now() - startTime,
        context: enhancedContext,
        suggestions: optimizedResponse.suggestions || [],
        learningInsights: optimizedResponse.learningInsights,
        requestId,
      };
    } catch (error) {
      console.error('❌ Error processing command:', error);
      this.updatePerformanceMetrics(startTime, false);

      return {
        response: `Sorry, I encountered an error: ${error.message}`,
        confidence: 0.1,
        source: 'error',
        error: error.message,
        requestId,
      };
    }
  }

  /**
   * Process command using hybrid approach (LLM + Learning)
   */
  async processHybrid(userInput, context) {
    const responses = [];

    // Get response from learning engine if available
    if (this.systemState.learningEnabled && this.learningEngine) {
      try {
        const learningPredictions = await this.learningEngine.generatePredictions(
          userInput,
          context
        );

        if (learningPredictions.nextCommands.length > 0) {
          responses.push({
            response: `Based on your patterns, you might want to: ${learningPredictions.nextCommands[0].command}`,
            confidence: learningPredictions.nextCommands[0].confidence,
            source: 'learning_prediction',
          });
        }
      } catch (error) {
        console.warn('Learning prediction failed:', error);
      }
    }

    // Get response from external LLM if available
    if (this.systemState.llmAvailable && this.llmClient) {
      try {
        const llmPrompt = this.createLLMPrompt(userInput, context);
        const llmResponse = await this.llmClient.generateResponse(llmPrompt, {
          maxTokens: 256,
          temperature: 0.3,
        });

        responses.push({
          response: llmResponse,
          confidence: 0.8,
          source: 'external_llm',
        });
      } catch (error) {
        console.warn('LLM request failed:', error);
      }
    }

    // Get local pattern matching response
    try {
      const localResponse = await this.processLocal(userInput, context);
      responses.push({
        response: localResponse.response || localResponse,
        confidence: localResponse.confidence || 0.6,
        source: 'local_patterns',
      });
    } catch (error) {
      console.warn('Local processing failed:', error);
    }

    // Combine responses intelligently
    return this.combineResponses(responses, userInput, context);
  }

  /**
   * Process command using external LLM
   */
  async processWithLLM(userInput, context) {
    if (!this.systemState.llmAvailable) {
      throw new Error(new Error(new Error('External LLM not available')));
    }

    const prompt = this.createLLMPrompt(userInput, context);
    const response = await this.llmClient.generateResponse(prompt, {
      maxTokens: 512,
      temperature: 0.4,
    });

    this.systemState.performanceMetrics.llmRequests++;

    return {
      response,
      confidence: 0.85,
      source: 'external_llm',
    };
  }

  /**
   * Process command using learning engine
   */
  async processWithLearning(userInput, context) {
    if (!this.systemState.learningEnabled) {
      throw new Error(new Error(new Error('Learning engine not available')));
    }

    const predictions = await this.learningEngine.generatePredictions(userInput, context);

    // Find best prediction
    let bestPrediction = null;
    let maxConfidence = 0;

    for (const category of ['nextCommands', 'commandCompletions', 'contextualSuggestions']) {
      if (predictions[category] && predictions[category].length > 0) {
        const topPrediction = predictions[category][0];
        if (topPrediction.confidence > maxConfidence) {
          maxConfidence = topPrediction.confidence;
          bestPrediction = topPrediction;
        }
      }
    }

    if (bestPrediction) {
      return {
        response: `I predict you want to: ${bestPrediction.command || bestPrediction.completion}`,
        confidence: bestPrediction.confidence,
        source: 'learning_engine',
        predictions,
      };
    } else {
      throw new Error(new Error(new Error('No suitable predictions found')));
    }
  }

  /**
   * Process command using local patterns (fallback)
   */
  async processLocal(userInput, _context) {
    // Use the existing advanced AI system as fallback
    if (window.advancedAI) {
      const match = window.advancedAI.findBestMatch(userInput);
      if (match) {
        const response = window.advancedAI.generateResponse(match, userInput);
        return {
          response: response.response,
          confidence: response.confidence,
          source: 'local_advanced',
        };
      }
    }

    this.systemState.performanceMetrics.localRequests++;

    return {
      response: `I understand you said "${userInput}" but I need more context to help you effectively.`,
      confidence: 0.3,
      source: 'local_fallback',
    };
  }

  /**
   * Create optimized prompt for external LLM
   */
  createLLMPrompt(userInput, context) {
    const contextStr = context ? JSON.stringify(context, null, 2) : 'No context available';

    return `You are Rina, an advanced AI assistant for terminal operations. 

User input: "${userInput}"

Context:
${contextStr}

Please provide a helpful, concise response that:
1. Interprets the user's intent
2. Suggests the appropriate terminal command if applicable
3. Explains the reasoning briefly
4. Offers additional helpful tips if relevant

Keep the response under 200 words and focus on actionable advice.`;
  }

  /**
   * Intelligently combine multiple responses
   */
  combineResponses(responses, _userInput, _context) {
    if (responses.length === 0) {
      return {
        response: 'I couldn\'t generate a response. Please try rephrasing your request.',
        confidence: 0.1,
        source: 'no_response',
      };
    }

    if (responses.length === 1) {
      return responses[0];
    }

    // Sort by confidence
    responses.sort((a, b) => b.confidence - a.confidence);

    const primary = responses[0];
    const secondary = responses[1];

    // If primary response is high confidence, use it
    if (primary.confidence > 0.7) {
      return primary;
    }

    // If confidences are close, combine intelligently
    if (Math.abs(primary.confidence - secondary.confidence) < 0.2) {
      const combinedResponse = `${primary.response}\n\nAlternatively: ${secondary.response}`;
      return {
        response: combinedResponse,
        confidence: Math.max(primary.confidence, secondary.confidence) * 0.9,
        source: 'combined',
      };
    }

    return primary;
  }

  /**
   * Determine the best operating mode
   */
  determineOperatingMode() {
    if (this.systemState.llmAvailable && this.systemState.learningEnabled) {
      this.systemState.currentMode = 'hybrid';
    } else if (this.systemState.llmAvailable) {
      this.systemState.currentMode = 'llm';
    } else if (this.systemState.learningEnabled) {
      this.systemState.currentMode = 'learning';
    } else {
      this.systemState.currentMode = 'local';
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(startTime, success, _source = null) {
    const processingTime = Date.now() - startTime;

    this.systemState.performanceMetrics.totalRequests++;

    if (success) {
      this.systemState.performanceMetrics.successfulRequests++;
    }

    // Update average response time with exponential moving average
    const currentAvg = this.systemState.performanceMetrics.averageResponseTime;
    this.systemState.performanceMetrics.averageResponseTime =
      currentAvg * 0.9 + processingTime * 0.1;
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get system status
   */
  getSystemStatus() {
    return {
      ...this.systemState,
      llmStatus:
        this.llmClient && typeof this.llmClient.getStatus === 'function'
          ? this.llmClient.getStatus()
          : null,
      learningStatus:
        this.learningEngine && typeof this.learningEngine.getStatus === 'function'
          ? this.learningEngine.getStatus()
          : null,
      queueLength: this.requestQueue.length,
    };
  }

  /**
   * Switch operating mode
   */
  switchMode(newMode) {
    if (['hybrid', 'llm', 'learning', 'local'].includes(newMode)) {
      this.systemState.currentMode = newMode;
      return true;
    }
    return false;
  }

  /**
   * Clear cache and reset
   */
  reset() {
    this.cache.clear();
    this.requestQueue = [];
    this.processingRequest = false;
  }
}

/**
 * Context Manager for enhanced context awareness
 */
class ContextManager {
  constructor() {
    this.contextHistory = [];
    this.environmentAnalyzer = new EnvironmentAnalyzer();
  }

  async initialize() {
    await this.environmentAnalyzer.initialize();
  }

  async enhanceContext(baseContext) {
    const enhanced = {
      ...baseContext,
      timestamp: Date.now(),
      environment: await this.environmentAnalyzer.analyze(),
      history: this.contextHistory.slice(-5), // Last 5 contexts
      sessionInfo: {
        duration: Date.now() - (this.contextHistory[0]?.timestamp || Date.now()),
        commandCount: this.contextHistory.length,
      },
    };

    this.contextHistory.push(enhanced);

    // Keep only last 50 contexts
    if (this.contextHistory.length > 50) {
      this.contextHistory.shift();
    }

    return enhanced;
  }
}

class EnvironmentAnalyzer {
  async initialize() {}

  async analyze() {
    return {
      platform: process.platform,
      nodeVersion: process.version,
      currentDirectory: process.cwd(),
      userAgent: navigator?.userAgent || 'unknown',
      timestamp: Date.now(),
    };
  }
}

/**
 * Response Optimizer for improving response quality
 */
class ResponseOptimizer {
  async initialize() {}

  async optimize(response, metadata) {
    const optimized = {
      text: response,
      quality: this.assessQuality(response),
      contextRelevance: this.assessContextRelevance(response, metadata.context),
      suggestions: this.generateSuggestions(response, metadata),
    };

    // Apply optimizations
    optimized.text = this.improveClarity(optimized.text);
    optimized.text = this.addPersonality(optimized.text);

    return optimized;
  }

  assessQuality(response) {
    // Simple quality assessment based on response characteristics
    let score = 0.5;

    if (response.length > 20 && response.length < 500) score += 0.1;
    if (response.includes('command') || response.includes('try')) score += 0.1;
    if (!response.includes('error') && !response.includes('sorry')) score += 0.1;

    return Math.min(score, 1.0);
  }

  assessContextRelevance(response, context) {
    // Simple relevance assessment
    let relevance = 0.5;

    if (context?.projectType && response.toLowerCase().includes(context.projectType)) {
      relevance += 0.2;
    }

    if (context?.currentDirectory && response.includes('directory')) {
      relevance += 0.1;
    }

    return Math.min(relevance, 1.0);
  }

  generateSuggestions(response, metadata) {
    const suggestions = [];

    if (metadata.userInput.includes('git')) {
      suggestions.push('Check git status', 'View git log', 'See branches');
    } else if (metadata.userInput.includes('file')) {
      suggestions.push('List files', 'Search files', 'File properties');
    }

    return suggestions.slice(0, 3);
  }

  improveClarity(text) {
    // Simple text improvements
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(.{1})/, match => match.toUpperCase());
  }

  addPersonality(text) {
    // Add Rina's mermaid personality occasionally
    if (Math.random() < 0.3) {
      const personalities = [
        '🧜‍♀️ *sparkles with oceanic wisdom* ',
        '🌊 *adjusts seashell crown* ',
        '✨ ',
      ];
      const personality = personalities[Math.floor(Math.random() * personalities.length)];
      return personality + text;
    }
    return text;
  }
}

/**
 * Confidence Engine for calculating response confidence
 */
class ConfidenceEngine {
  async initialize() {}

  calculate(factors) {
    const {
      originalConfidence = 0.5,
      responseQuality = 0.5,
      contextRelevance = 0.5,
      source = 'unknown',
    } = factors;

    // Weight factors based on source
    const sourceWeights = {
      external_llm: { base: 0.8, quality: 0.3, relevance: 0.2 },
      learning_engine: { base: 0.7, quality: 0.2, relevance: 0.4 },
      local_advanced: { base: 0.6, quality: 0.2, relevance: 0.3 },
      combined: { base: 0.75, quality: 0.25, relevance: 0.3 },
      local_fallback: { base: 0.3, quality: 0.1, relevance: 0.1 },
    };

    const weights = sourceWeights[source] || sourceWeights['local_fallback'];

    const finalConfidence =
      originalConfidence * weights.base +
      responseQuality * weights.quality +
      contextRelevance * weights.relevance;

    return Math.min(Math.max(finalConfidence, 0.0), 1.0);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    UnifiedAISystem,
    ContextManager,
    ResponseOptimizer,
    ConfidenceEngine,
  };
}

// Always expose to window in browser context
if (typeof window !== 'undefined') {
  window.UnifiedAISystem = UnifiedAISystem;
  window.ContextManager = ContextManager;
  window.ResponseOptimizer = ResponseOptimizer;
  window.ConfidenceEngine = ConfidenceEngine;
}
