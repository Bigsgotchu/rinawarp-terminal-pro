/**
 * RinaWarp AI Assistant - Ollama Client
 * Handles communication with local Ollama instance
 */

import logger from '../utils/logger.js';

export class OllamaClient {
  constructor() {
    this.baseUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.defaultModel = 'deepseek-coder:6.7b';
    this.models = {
      codeGeneration: 'deepseek-coder:6.7b',
      codeReview: 'codellama:13b',
      quickSuggestions: 'deepseek-coder:1.3b',
      general: 'llama3.1:8b',
    };

    this.isConnected = false;
  }

  /**
   * Test connection to Ollama
   */
  async testConnection() {
    try {
      logger.info('🔗 Testing Ollama connection...');

      const response = await fetch(`${this.baseUrl}/api/tags`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.availableModels = data.models.map(m => m.name);
      this.isConnected = true;

      logger.info(`✅ Connected to Ollama. Available models: ${this.availableModels.join(', ')}`);

      return {
        success: true,
        models: this.availableModels,
      };
    } catch (error) {
      logger.error('❌ Ollama connection failed:', error.message);
      this.isConnected = false;

      // Fallback: suggest installation
      throw new Error(`
                Ollama connection failed: ${error.message}
                
                To install Ollama:
                1. Download from https://ollama.ai/download
                2. Run: ollama serve
                3. Pull a model: ollama pull deepseek-coder:6.7b
            `);
    }
  }

  /**
   * Generate response from LLM
   */
  async generateResponse(prompt, options = {}) {
    if (!this.isConnected) {
      await this.testConnection();
    }

    const {
      model = this.models.general,
      systemPrompt = '',
      temperature = 0.7,
      stream = false,
    } = options;

    try {
      logger.debug(`🤖 Generating response with model: ${model}`);

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: systemPrompt ? `${systemPrompt}\n\nUser: ${prompt}` : prompt,
          options: {
            temperature,
            num_predict: 2048,
          },
          stream,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug('✅ Response generated successfully');

      return data.response;
    } catch (error) {
      logger.error('❌ Response generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate code with specific formatting
   */
  async generateCode(params) {
    const { description, context, patterns, style } = params;

    const systemPrompt = `
You are an expert programmer generating code for a user. Follow these guidelines:

1. Generate clean, well-commented code
2. Follow the user's coding style: ${JSON.stringify(style)}
3. Consider the file context: ${JSON.stringify(context)}
4. Apply learned patterns: ${JSON.stringify(patterns)}

Always provide:
- The generated code
- A brief explanation
- Alternative approaches if applicable

Output format:
{
    "code": "generated code here",
    "explanation": "brief explanation",
    "alternatives": ["alternative approach 1", "alternative approach 2"]
}
        `;

    const prompt = `Generate code for: ${description}`;

    const response = await this.generateResponse(prompt, {
      model: this.models.codeGeneration,
      systemPrompt,
      temperature: 0.3, // Lower temperature for more consistent code
    });

    try {
      return JSON.parse(response);
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        code: response,
        explanation: 'Generated code (JSON parsing failed)',
        alternatives: [],
      };
    }
  }

  /**
   * Analyze task requirements
   */
  async analyzeTask(params) {
    const { description, context } = params;

    const systemPrompt = `
You are a technical project manager analyzing development tasks. Break down the task into:

1. Requirements analysis
2. Technical considerations  
3. Dependencies and prerequisites
4. Estimated complexity (1-10)
5. Potential challenges

Output format:
{
    "requirements": ["requirement 1", "requirement 2"],
    "technical_considerations": ["consideration 1", "consideration 2"],
    "dependencies": ["dependency 1", "dependency 2"],
    "complexity": 7,
    "challenges": ["challenge 1", "challenge 2"]
}
        `;

    const prompt = `
        Analyze this development task:
        Task: ${description}
        Project Context: ${JSON.stringify(context, null, 2)}
        `;

    const response = await this.generateResponse(prompt, {
      model: this.models.general,
      systemPrompt,
      temperature: 0.4,
    });

    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('⚠️ Task analysis JSON parsing failed, returning raw response');
      return { raw_analysis: response };
    }
  }

  /**
   * Generate insights from code analysis
   */
  async generateInsights(params) {
    const { type, data, context } = params;

    const systemPrompt = `
You are a senior software architect reviewing code analysis results. Provide:

1. Key insights about code quality
2. Security considerations
3. Performance implications
4. Maintainability concerns
5. Architectural recommendations

Be specific and actionable in your recommendations.
        `;

    const prompt = `
        Analysis Type: ${type}
        Analysis Data: ${JSON.stringify(data, null, 2)}
        Context: ${JSON.stringify(context, null, 2)}
        
        Provide insights and recommendations for this code analysis.
        `;

    const response = await this.generateResponse(prompt, {
      model: this.models.codeReview,
      systemPrompt,
      temperature: 0.5,
    });

    return response;
  }

  /**
   * Stream response for real-time interaction
   */
  async *streamResponse(prompt, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || this.defaultModel,
        prompt,
        stream: true,
        options: {
          temperature: options.temperature || 0.7,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              yield data.response;
            }
          } catch (error) {
            // Ignore malformed JSON chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();

      return data.models.map(model => ({
        name: model.name,
        size: model.size,
        modified: model.modified,
      }));
    } catch (error) {
      logger.error('❌ Failed to get available models:', error);
      return [];
    }
  }

  /**
   * Pull a new model
   */
  async pullModel(modelName) {
    logger.info(`📥 Pulling model: ${modelName}`);

    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Stream the pull progress
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.status) {
              logger.info(`📥 ${data.status}`);
            }
          } catch (error) {
            // Ignore malformed JSON
          }
        }
      }

      logger.info(`✅ Model ${modelName} pulled successfully`);
    } catch (error) {
      logger.error(`❌ Failed to pull model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Check if a model is available locally
   */
  async isModelAvailable(modelName) {
    const models = await this.getAvailableModels();
    return models.some(model => model.name === modelName);
  }
}

export default OllamaClient;
