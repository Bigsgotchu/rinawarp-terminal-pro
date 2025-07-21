/**
 * Unified AI Client
 * Provides a consistent interface to interact with multiple AI providers
 */

import { aiProviderConfig } from './ai-provider-config.js';

export class UnifiedAIClient {
  constructor() {
    this.config = aiProviderConfig;
    this.conversationHistory = [];
    this.contextWindow = 4096; // Default context window
    this.systemPrompt = `You are RinaWarp AI Assistant, an advanced AI assistant integrated into a modern terminal emulator. 
You help users with:
- Terminal commands and shell scripting
- Programming and development tasks
- System administration
- General computing questions
Be concise, accurate, and helpful. Use markdown formatting when appropriate.`;
  }

  /**
   * Initialize the AI client
   */
  async initialize() {
    try {
      await this.config.initialize();
      console.log('✅ Unified AI Client initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize AI client:', error);
      return false;
    }
  }

  /**
   * Send a chat completion request
   */
  async chat(message, options = {}) {
    const provider = this.config.getActiveProvider();
    if (!provider) {
      throw new Error('No AI provider configured');
    }

    const apiKey = await this.config.getApiKey(provider.name);
    if (!apiKey) {
      throw new Error(`API key not configured for ${provider.name}`);
    }

    // Add to conversation history
    this.conversationHistory.push({ role: 'user', content: message });

    try {
      let response;
      
      switch (provider.name) {
        case 'openai':
          response = await this.chatWithOpenAI(message, apiKey, options);
          break;
        case 'anthropic':
          response = await this.chatWithAnthropic(message, apiKey, options);
          break;
        case 'google':
          response = await this.chatWithGoogle(message, apiKey, options);
          break;
        default:
          throw new Error(`Provider ${provider.name} not implemented`);
      }

      // Add response to history
      this.conversationHistory.push({ role: 'assistant', content: response });
      
      // Trim history if it gets too long
      this.trimConversationHistory();

      return response;
    } catch (error) {
      console.error(`AI chat error with ${provider.name}:`, error);
      throw error;
    }
  }

  /**
   * Chat with OpenAI
   */
  async chatWithOpenAI(message, apiKey, options = {}) {
    const provider = this.config.providers.openai;
    const model = this.config.getActiveProvider().model;

    const requestBody = {
      model: model,
      messages: [
        { role: 'system', content: this.systemPrompt },
        ...this.getRecentHistory(),
        { role: 'user', content: message }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2048,
      stream: options.stream || false
    };

    const response = await fetch(`${provider.endpoint}/chat/completions`, {
      method: 'POST',
      headers: provider.headers(apiKey),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Chat with Anthropic
   */
  async chatWithAnthropic(message, apiKey, options = {}) {
    const provider = this.config.providers.anthropic;
    const model = this.config.getActiveProvider().model;

    const requestBody = {
      model: model,
      messages: [
        ...this.getRecentHistory(),
        { role: 'user', content: message }
      ],
      system: this.systemPrompt,
      max_tokens: options.maxTokens || 2048,
      temperature: options.temperature || 0.7,
      stream: options.stream || false
    };

    const response = await fetch(`${provider.endpoint}/messages`, {
      method: 'POST',
      headers: provider.headers(apiKey),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  /**
   * Chat with Google AI
   */
  async chatWithGoogle(message, apiKey, options = {}) {
    const provider = this.config.providers.google;
    const model = this.config.getActiveProvider().model;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: this.systemPrompt },
            ...this.getRecentHistory().map(msg => ({ text: `${msg.role}: ${msg.content}` })),
            { text: `user: ${message}` }
          ]
        }
      ],
      generationConfig: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || 2048,
      }
    };

    const response = await fetch(
      `${provider.endpoint}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: provider.headers(apiKey),
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google AI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  /**
   * Stream chat response
   */
  async *streamChat(message, options = {}) {
    const provider = this.config.getActiveProvider();
    if (!provider) {
      throw new Error('No AI provider configured');
    }

    const apiKey = await this.config.getApiKey(provider.name);
    if (!apiKey) {
      throw new Error(`API key not configured for ${provider.name}`);
    }

    options.stream = true;

    switch (provider.name) {
      case 'openai':
        yield* this.streamOpenAI(message, apiKey, options);
        break;
      case 'anthropic':
        yield* this.streamAnthropic(message, apiKey, options);
        break;
      default:
        throw new Error(`Streaming not implemented for ${provider.name}`);
    }
  }

  /**
   * Stream OpenAI response
   */
  async *streamOpenAI(message, apiKey, options) {
    const provider = this.config.providers.openai;
    const model = this.config.getActiveProvider().model;

    const requestBody = {
      model: model,
      messages: [
        { role: 'system', content: this.systemPrompt },
        ...this.getRecentHistory(),
        { role: 'user', content: message }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2048,
      stream: true
    };

    const response = await fetch(`${provider.endpoint}/chat/completions`, {
      method: 'POST',
      headers: provider.headers(apiKey),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  }

  /**
   * Get recent conversation history
   */
  getRecentHistory(maxMessages = 10) {
    return this.conversationHistory.slice(-maxMessages);
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * Trim conversation history to prevent token overflow
   */
  trimConversationHistory() {
    // Keep only the last 20 messages
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
  }

  /**
   * Change the active provider
   */
  async switchProvider(providerName, modelName) {
    return this.config.setActiveProvider(providerName, modelName);
  }

  /**
   * Configure API key for a provider
   */
  async configureApiKey(provider, apiKey) {
    // Test the connection first
    const isValid = await this.config.testConnection(provider, apiKey);
    if (!isValid) {
      throw new Error('Invalid API key or connection failed');
    }

    // Save the API key
    return await this.config.setApiKey(provider, apiKey);
  }

  /**
   * Get available providers
   */
  getProviders() {
    return this.config.listProviders();
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(provider) {
    return this.config.getProviderCapabilities(provider);
  }

  /**
   * Execute a function call (for compatible providers)
   */
  async executeFunction(functionName, parameters) {
    const provider = this.config.getActiveProvider();
    const capabilities = this.getCapabilities(provider.name);

    if (!capabilities.functionCalling) {
      throw new Error(`Function calling not supported by ${provider.name}`);
    }

    // Implementation depends on provider
    // This is a placeholder for function calling implementation
    return {
      function: functionName,
      parameters: parameters,
      result: 'Function calling to be implemented'
    };
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbeddings(text) {
    const provider = this.config.getActiveProvider();
    const capabilities = this.getCapabilities(provider.name);

    if (!capabilities.embeddings) {
      throw new Error(`Embeddings not supported by ${provider.name}`);
    }

    const apiKey = await this.config.getApiKey(provider.name);
    if (!apiKey) {
      throw new Error(`API key not configured for ${provider.name}`);
    }

    switch (provider.name) {
      case 'openai':
        return await this.generateOpenAIEmbeddings(text, apiKey);
      case 'google':
        return await this.generateGoogleEmbeddings(text, apiKey);
      default:
        throw new Error(`Embeddings not implemented for ${provider.name}`);
    }
  }

  /**
   * Generate OpenAI embeddings
   */
  async generateOpenAIEmbeddings(text, apiKey) {
    const provider = this.config.providers.openai;
    
    const response = await fetch(`${provider.endpoint}/embeddings`, {
      method: 'POST',
      headers: provider.headers(apiKey),
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI embeddings error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }
}

// Export singleton instance
export const unifiedAIClient = new UnifiedAIClient();
