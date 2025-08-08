import logger from '../utilities/logger.js';
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 11 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Advanced LLM API Client for External Reasoning Services
 * Supports multiple providers: OpenAI, Anthropic, Google AI, Ollama (local)
 */

class LLMAPIClient {
  constructor(config = {}) {
    this.config = {
      provider: config.provider || 'auto', // 'openai', 'anthropic', 'google', 'ollama', 'auto'
      apiKey: config.apiKey || null,
      baseUrl: config.baseUrl || null,
      model: config.model || null,
      maxTokens: config.maxTokens || 2048,
      temperature: config.temperature || 0.7,
      timeout: config.timeout || 30000,
      retries: config.retries || 2,
    };

    this.providers = {
      openai: {
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o-mini',
        endpoint: '/chat/completions',
      },
      anthropic: {
        baseUrl: 'https://api.anthropic.com',
        defaultModel: 'claude-3-sonnet-20240229',
        endpoint: '/v1/messages',
      },
      google: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        defaultModel: 'gemini-pro',
        endpoint: '/models/gemini-pro:generateContent',
      },
      ollama: {
        baseUrl: 'http://localhost:11434',
        defaultModel: 'llama2',
        endpoint: '/api/generate',
      },
    };

    this.rateLimiter = new Map(); // Simple rate limiting
    this.cache = new Map(); // Response caching
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize the API client and detect available providers
   */
  async initialize() {
    // Try to load API keys from environment if not provided
    if (!this.config.apiKey) {
      this.loadApiKeyFromEnvironment();
    }

    if (this.config.provider === 'auto') {
      await this.detectBestProvider();
    }

    // Validate configuration
    if (!this.config.apiKey && this.config.provider !== 'ollama') {
      console.warn('⚠️ No API key provided for external LLM services');
      return false;
    }

    // Test connection
    try {
      await this.testConnection();
      logger.debug(`✅ LLM API Client initialized with provider: ${this.config.provider}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize LLM API:', error.message);
      return false;
    }
  }

  /**
   * Load API key from environment variables
   */
  loadApiKeyFromEnvironment() {
    // Check for environment variables or window.electronAPI
    if (typeof window !== 'undefined' && window.electronAPI) {
      // In Electron context, use IPC to get env vars
      try {
        const apiKeys = window.electronAPI.getEnvironmentVariables([
          'ANTHROPIC_API_KEY',
          'OPENAI_API_KEY',
        ]);
        if (apiKeys.ANTHROPIC_API_KEY) {
          this.config.apiKey = apiKeys.ANTHROPIC_API_KEY;
          this.config.provider = 'anthropic';
        } else if (apiKeys.OPENAI_API_KEY) {
          this.config.apiKey = apiKeys.OPENAI_API_KEY;
          this.config.provider = 'openai';
        }
      } catch (error) {
        console.warn('Could not load API keys via IPC:', error);
      }
    } else if (typeof process !== 'undefined' && process.env) {
      // Node.js context
      if (process.env.ANTHROPIC_API_KEY) {
        this.config.apiKey = process.env.ANTHROPIC_API_KEY;
        this.config.provider = 'anthropic';
      } else if (process.env.OPENAI_API_KEY) {
        this.config.apiKey = process.env.OPENAI_API_KEY;
        this.config.provider = 'openai';
        logger.debug('✅ Loaded OpenAI API key from environment');
      }
    }
  }

  /**
   * Auto-detect the best available provider
   */
  async detectBestProvider() {
    const providers = ['ollama', 'openai', 'anthropic', 'google'];

    for (const provider of providers) {
      try {
        if (provider === 'ollama') {
          // Check if Ollama is running locally
          const response = await fetch(`${this.providers.ollama.baseUrl}/api/tags`, {
            method: 'GET',
            timeout: 3000,
          });
          if (response.ok) {
            this.config.provider = 'ollama';
            return;
          }
        } else if (this.config.apiKey) {
          // If we have an API key, prefer cloud providers
          this.config.provider = provider;
          return;
        }
      } catch (error) {
        // Continue to next provider
        continue;
      }
    }

    // Fallback to OpenAI if available
    if (this.config.apiKey) {
      this.config.provider = 'openai';
    } else {
      throw new Error('No available LLM provider found');
    }
  }

  /**
   * Test connection to the selected provider
   */
  async testConnection() {
    const testPrompt = 'Reply with just \'OK\' if you can understand this message.';

    try {
      const response = await this.generateResponse(testPrompt, {
        maxTokens: 10,
        temperature: 0,
      });

      if (response && response.toLowerCase().includes('ok')) {
        return true;
      } else {
        throw new Error('Unexpected response from LLM provider');
      }
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  /**
   * Generate a response using the configured LLM provider
   */
  async generateResponse(prompt, options = {}) {
    const cacheKey = this.getCacheKey(prompt, options);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.response;
    }

    // Check rate limiting
    if (this.isRateLimited()) {
      throw new Error('Rate limit exceeded. Please wait before making another request.');
    }

    const provider = this.config.provider;
    const providerConfig = this.providers[provider];

    if (!providerConfig) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    let response;
    let retries = this.config.retries;

    while (retries >= 0) {
      try {
        switch (provider) {
        case 'openai':
          response = await this.callOpenAI(prompt, options);
          break;
        case 'anthropic':
          response = await this.callAnthropic(prompt, options);
          break;
        case 'google':
          response = await this.callGoogle(prompt, options);
          break;
        case 'ollama':
          response = await this.callOllama(prompt, options);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
        }

        // Cache successful response
        this.cache.set(cacheKey, {
          response,
          timestamp: Date.now(),
        });

        // Update rate limiter
        this.updateRateLimit();

        return response;
      } catch (error) {
        retries--;
        if (retries < 0) {
          throw error;
        }

        console.warn(
          `🔄 Retrying LLM request (${this.config.retries - retries}/${this.config.retries}):`,
          error.message
        );
        await this.sleep(1000 * (this.config.retries - retries)); // Exponential backoff
      }
    }
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(prompt, options) {
    const model = options.model || this.config.model || this.providers.openai.defaultModel;

    const response = await fetch(`${this.providers.openai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are Rina, an advanced AI assistant for terminal operations. Be helpful, concise, and provide actionable advice for command-line tasks.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature || this.config.temperature,
        stream: false,
      }),
      timeout: this.config.timeout,
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Call Anthropic API
   */
  async callAnthropic(prompt, options) {
    const model = options.model || this.config.model || this.providers.anthropic.defaultModel;

    const response = await fetch(`${this.providers.anthropic.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens || this.config.maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: options.temperature || this.config.temperature,
      }),
      timeout: this.config.timeout,
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  }

  /**
   * Call Google AI API
   */
  async callGoogle(prompt, options) {
    const model = options.model || this.config.model || this.providers.google.defaultModel;

    const response = await fetch(
      `${this.providers.google.baseUrl}/models/${model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: options.temperature || this.config.temperature,
            maxOutputTokens: options.maxTokens || this.config.maxTokens,
          },
        }),
        timeout: this.config.timeout,
      }
    );

    if (!response.ok) {
      throw new Error(`Google AI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || '';
  }

  /**
   * Call Ollama local API
   */
  async callOllama(prompt, options) {
    const model = options.model || this.config.model || this.providers.ollama.defaultModel;

    const response = await fetch(`${this.providers.ollama.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature || this.config.temperature,
          num_predict: options.maxTokens || this.config.maxTokens,
        },
      }),
      timeout: this.config.timeout,
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || '';
  }

  /**
   * Generate cache key for request
   */
  getCacheKey(prompt, options) {
    return `${this.config.provider}-${this.hashString(prompt + JSON.stringify(options))}`;
  }

  /**
   * Simple string hash function
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if requests are rate limited
   */
  isRateLimited() {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    const recentRequests = this.rateLimiter.get('requests') || [];
    const validRequests = recentRequests.filter(timestamp => timestamp > windowStart);

    // Allow up to 30 requests per minute
    return validRequests.length >= 30;
  }

  /**
   * Update rate limiter
   */
  updateRateLimit() {
    const now = Date.now();
    const recentRequests = this.rateLimiter.get('requests') || [];
    recentRequests.push(now);

    // Keep only last minute of requests
    const validRequests = recentRequests.filter(timestamp => timestamp > now - 60000);
    this.rateLimiter.set('requests', validRequests);
  }

  /**
   * Sleep utility for retries
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get provider status
   */
  getStatus() {
    return {
      provider: this.config.provider,
      model: this.config.model || this.providers[this.config.provider]?.defaultModel,
      cacheSize: this.cache.size,
      rateLimitStatus: this.isRateLimited(),
      isInitialized: !!this.config.provider,
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export for use in other modules
export { LLMAPIClient };

// Also provide global access for browser
if (typeof window !== 'undefined') {
  window.LLMAPIClient = LLMAPIClient;
}

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LLMAPIClient };
}
