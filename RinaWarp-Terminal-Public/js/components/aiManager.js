/**
 * AI Manager - Handles AI provider integration and response generation
 */

export class AIManager {
  constructor() {
    this.initialized = false;
    this.provider = 'claude';
    this.apiKey = null;
    this.config = {};
    this.conversationHistory = [];
    this.isStreaming = false;
  }

  async init() {
    console.log('🤖 Initializing AI Manager...');

    // Load configuration
    await this.loadConfig();

    // Initialize provider
    this.initializeProvider();

    this.initialized = true;
    console.log('✅ AI Manager initialized');
  }

  async loadConfig() {
    // Default configuration
    this.config = {
      provider: 'claude',
      model: 'claude-3-sonnet',
      temperature: 0.7,
      maxTokens: 1000,
      streaming: true,
      contextWindow: 4000,
    };

    // Load from storage if available
    try {
      const stored = localStorage.getItem('ai-config');
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load AI config from storage:', error);
    }
  }

  initializeProvider() {
    this.provider = this.config.provider || 'claude';

    // Try to get API key from various sources
    this.apiKey = this.getAPIKey();

    if (!this.apiKey) {
      console.warn('No API key found for AI provider');
    }
  }

  getAPIKey() {
    // Check environment variables (in actual deployment)
    const envKeys = {
      claude: 'ANTHROPIC_API_KEY',
      openai: 'OPENAI_API_KEY',
      google: 'GOOGLE_AI_API_KEY',
    };

    // For demo purposes, return null (would need proper setup)
    return null;
  }

  async generateResponse(prompt, options = {}) {
    if (!this.initialized) {
      throw new Error('AI Manager not initialized');
    }

    if (!this.apiKey) {
      return this.generateFallbackResponse(prompt);
    }

    const config = { ...this.config, ...options };

    try {
      switch (this.provider) {
        case 'claude':
          return await this.generateClaudeResponse(prompt, config);
        case 'openai':
          return await this.generateOpenAIResponse(prompt, config);
        case 'google':
          return await this.generateGoogleAIResponse(prompt, config);
        default:
          throw new Error(`Unsupported AI provider: ${this.provider}`);
      }
    } catch (error) {
      console.error('AI generation error:', error);
      return this.generateFallbackResponse(prompt);
    }
  }

  async generateClaudeResponse(prompt, config) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model || 'claude-3-sonnet-20240229',
        max_tokens: config.maxTokens || 1000,
        temperature: config.temperature || 0.7,
        messages: [...this.buildConversationHistory(), { role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;

    // Add to conversation history
    this.addToHistory('user', prompt);
    this.addToHistory('assistant', aiResponse);

    return aiResponse;
  }

  async generateOpenAIResponse(prompt, config) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'gpt-3.5-turbo',
        max_tokens: config.maxTokens || 1000,
        temperature: config.temperature || 0.7,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant integrated into RinaWarp Terminal.',
          },
          ...this.buildConversationHistory(),
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Add to conversation history
    this.addToHistory('user', prompt);
    this.addToHistory('assistant', aiResponse);

    return aiResponse;
  }

  async generateGoogleAIResponse(prompt, config) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: config.temperature || 0.7,
            maxOutputTokens: config.maxTokens || 1000,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Google AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates[0].content.parts[0].text;

    // Add to conversation history
    this.addToHistory('user', prompt);
    this.addToHistory('assistant', aiResponse);

    return aiResponse;
  }

  generateFallbackResponse(prompt) {
    const responses = [
      `I understand you're asking about: "${prompt}". However, I don't have access to AI services right now. Please configure an API key to enable AI features.`,
      `That's an interesting question about "${prompt}". To provide AI-powered responses, please set up your AI provider API key in the settings.`,
      `I'd love to help with "${prompt}", but I need an AI service connection first. You can configure this in the AI settings.`,
      `Great question! For "${prompt}" and other queries, please configure your preferred AI provider (Claude, OpenAI, or Google AI) in the settings.`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  buildConversationHistory() {
    // Keep only recent history to stay within context limits
    const maxHistory = Math.min(this.conversationHistory.length, 10);
    return this.conversationHistory.slice(-maxHistory);
  }

  addToHistory(role, content) {
    this.conversationHistory.push({ role, content });

    // Limit history size
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
  }

  clearHistory() {
    this.conversationHistory = [];
    console.log('🗑️ Conversation history cleared');
  }

  async setProvider(provider, apiKey) {
    const validProviders = ['claude', 'openai', 'google'];
    if (!validProviders.includes(provider)) {
      throw new Error(`Invalid provider: ${provider}`);
    }

    this.provider = provider;
    this.apiKey = apiKey;
    this.config.provider = provider;

    // Save to storage
    try {
      localStorage.setItem('ai-config', JSON.stringify(this.config));
      localStorage.setItem(`ai-key-${provider}`, apiKey);
    } catch (error) {
      console.warn('Failed to save AI config:', error);
    }

    console.log(`✅ AI provider set to: ${provider}`);
  }

  async setModel(model) {
    this.config.model = model;

    try {
      localStorage.setItem('ai-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save model config:', error);
    }

    console.log(`✅ AI model set to: ${model}`);
  }

  setTemperature(temperature) {
    this.config.temperature = Math.max(0, Math.min(2, temperature));
    console.log(`🌡️ Temperature set to: ${this.config.temperature}`);
  }

  setMaxTokens(maxTokens) {
    this.config.maxTokens = Math.max(1, Math.min(4000, maxTokens));
    console.log(`📏 Max tokens set to: ${this.config.maxTokens}`);
  }

  getConfig() {
    return { ...this.config };
  }

  async loadConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.provider) {
      this.provider = newConfig.provider;
    }

    if (newConfig.apiKey) {
      this.apiKey = newConfig.apiKey;
    }

    console.log('✅ AI configuration loaded');
  }

  getProviders() {
    return [
      {
        name: 'claude',
        displayName: 'Anthropic Claude',
        models: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
        description: 'Advanced reasoning and analysis',
      },
      {
        name: 'openai',
        displayName: 'OpenAI GPT',
        models: ['gpt-4', 'gpt-3.5-turbo'],
        description: 'Creative and versatile AI assistant',
      },
      {
        name: 'google',
        displayName: 'Google AI',
        models: ['gemini-pro'],
        description: "Google's multimodal AI model",
      },
    ];
  }

  getStatus() {
    return {
      initialized: this.initialized,
      provider: this.provider,
      hasApiKey: !!this.apiKey,
      model: this.config.model,
      historyLength: this.conversationHistory.length,
    };
  }
}
