import logger from '../utilities/logger.js';
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 6 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal Agent Chat API
 * Backend endpoint for processing agent mode requests with AI integration
 */

import express from 'express';
import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

class AgentChatAPI {
  constructor() {
    this.router = express.Router();
    this.setupRoutes();
    this.initializeProviders();
  }

  initializeProviders() {
    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      logger.debug('✅ OpenAI provider initialized for Agent Mode');
    }

    // Initialize Anthropic if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    // Initialize Ollama provider (local)
    this.ollamaEndpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
  }

  setupRoutes() {
    // Main agent chat endpoint
    this.router.post('/agent-chat', this.handleAgentChat.bind(this));

    // Agent configuration endpoints
    this.router.get('/agent/config', this.getAgentConfig.bind(this));
    this.router.post('/agent/config', this.updateAgentConfig.bind(this));

    // Agent function registry endpoints
    this.router.get('/agent/functions', this.getAvailableFunctions.bind(this));
    this.router.post('/agent/functions/register', this.registerCustomFunction.bind(this));

    // Agent session management
    this.router.post('/agent/session/start', this.startAgentSession.bind(this));
    this.router.post('/agent/session/end', this.endAgentSession.bind(this));
    this.router.get('/agent/session/:sessionId', this.getAgentSession.bind(this));

    // Health check
    this.router.get('/agent/health', this.healthCheck.bind(this));
  }

  async handleAgentChat(req, res) {
    try {
      const {
        messages,
        functions,
        model = 'gpt-4-turbo',
        temperature = 0.3,
        maxTokens = 4096,
        provider = 'openai',
      } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
          error: 'Messages array is required',
        });
      }

      let response;

      switch (provider.toLowerCase()) {
        case 'openai':
          response = await this.handleOpenAIRequest(messages, functions, {
            model,
            temperature,
            max_tokens: maxTokens,
          });
          break;

        case 'anthropic':
        case 'claude':
          response = await this.handleAnthropicRequest(messages, functions, {
            model: model.includes('claude') ? model : 'claude-3-sonnet-20240229',
            temperature,
            max_tokens: maxTokens,
          });
          break;

        case 'ollama':
          response = await this.handleOllamaRequest(messages, functions, {
            model: model.includes('llama') ? model : 'llama2',
            temperature,
            max_tokens: maxTokens,
          });
          break;

        default:
          throw new Error(new Error(new Error(`Unsupported provider: ${provider}`)));
      }

      res.json({
        success: true,
        ...response,
        provider,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Agent chat error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async handleOpenAIRequest(messages, functions, options) {
    if (!this.openai) {
      throw new Error(
        new Error(new Error('OpenAI provider not configured. Please set OPENAI_API_KEY.'))
      );
    }

    const requestBody = {
      model: options.model,
      messages: messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
    };

    // Add function calling if functions are provided
    if (functions && functions.length > 0) {
      requestBody.tools = functions.map(func => ({
        type: 'function',
        function: {
          name: func.name,
          description: func.description,
          parameters: func.parameters,
        },
      }));
      requestBody.tool_choice = 'auto';
    }

    const completion = await this.openai.chat.completions.create(requestBody);

    const response = {
      content: completion.choices[0].message.content,
      model: completion.model,
      usage: completion.usage,
    };

    // Handle function calls
    if (completion.choices[0].message.tool_calls) {
      response.function_calls = completion.choices[0].message.tool_calls.map(call => ({
        name: call.function.name,
        arguments: JSON.parse(call.function.arguments),
        id: call.id,
      }));
    }

    return response;
  }

  async handleAnthropicRequest(messages, functions, options) {
    if (!this.anthropic) {
      throw new Error(
        new Error(new Error('Anthropic provider not configured. Please set ANTHROPIC_API_KEY.'))
      );
    }

    // Convert messages format for Anthropic
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const requestBody = {
      model: options.model,
      max_tokens: options.max_tokens,
      temperature: options.temperature,
      messages: conversationMessages,
    };

    if (systemMessage) {
      requestBody.system = systemMessage.content;
    }

    // Add tools if functions are provided
    if (functions && functions.length > 0) {
      requestBody.tools = functions.map(func => ({
        name: func.name,
        description: func.description,
        input_schema: func.parameters,
      }));
    }

    const completion = await this.anthropic.messages.create(requestBody);

    const response = {
      content: completion.content[0].text || '',
      model: completion.model,
      usage: completion.usage,
    };

    // Handle tool calls
    const toolCalls = completion.content.filter(c => c.type === 'tool_use');
    if (toolCalls.length > 0) {
      response.tool_calls = toolCalls.map(call => ({
        name: call.name,
        arguments: call.input,
        id: call.id,
      }));
    }

    return response;
  }

  async handleOllamaRequest(messages, functions, options) {
    try {
      const requestBody = {
        model: options.model,
        messages: messages,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        stream: false,
      };

      // Note: Ollama function calling support varies by model
      if (functions && functions.length > 0) {
        // Add function context to system message
        const functionContext = `\n\nAvailable functions:\n${functions
          .map(f => `- ${f.name}: ${f.description}`)
          .join('\n')}`;

        // Add to last system message or create one
        const lastSystemIndex = messages.map(m => m.role).lastIndexOf('system');
        if (lastSystemIndex >= 0) {
          messages[lastSystemIndex].content += functionContext;
        } else {
          messages.unshift({
            role: 'system',
            content: `You are an AI assistant with access to tools.${functionContext}`,
          });
        }
      }

      const response = await fetch(`${this.ollamaEndpoint}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(new Error(new Error(`Ollama request failed: ${response.statusText}`)));
      }

      const completion = await response.json();

      return {
        content: completion.message?.content || '',
        model: options.model,
        usage: {
          prompt_tokens: completion.prompt_eval_count || 0,
          completion_tokens: completion.eval_count || 0,
          total_tokens: (completion.prompt_eval_count || 0) + (completion.eval_count || 0),
        },
      };
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(
          new Error(new Error('Ollama server not running. Please start Ollama and try again.'))
        );
      }
      throw new Error(new Error(error));
    }
  }

  async getAgentConfig(req, res) {
    try {
      const config = {
        availableProviders: [],
        defaultModel: 'gpt-4-turbo',
        defaultTemperature: 0.3,
        defaultMaxTokens: 4096,
        functionsEnabled: true,
        safetyChecks: true,
      };

      // Check which providers are available
      if (this.openai) {
        config.availableProviders.push({
          id: 'openai',
          name: 'OpenAI',
          models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
          supportsTools: true,
        });
      }

      if (this.anthropic) {
        config.availableProviders.push({
          id: 'anthropic',
          name: 'Anthropic Claude',
          models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
          supportsTools: true,
        });
      }

      // Always include Ollama as it's local
      config.availableProviders.push({
        id: 'ollama',
        name: 'Ollama (Local)',
        models: ['llama2', 'codellama', 'mistral', 'dolphin-phi'],
        supportsTools: false,
        local: true,
      });

      res.json(config);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateAgentConfig(req, res) {
    try {
      // In a real implementation, this would update stored configuration
      const { provider, model, temperature, maxTokens } = req.body;

      // Validate configuration
      const validProviders = ['openai', 'anthropic', 'ollama'];
      if (provider && !validProviders.includes(provider)) {
        return res.status(400).json({ error: 'Invalid provider' });
      }

      if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
        return res.status(400).json({ error: 'Temperature must be between 0 and 2' });
      }

      if (maxTokens !== undefined && (maxTokens < 1 || maxTokens > 8192)) {
        return res.status(400).json({ error: 'MaxTokens must be between 1 and 8192' });
      }

      res.json({
        success: true,
        message: 'Configuration updated',
        config: { provider, model, temperature, maxTokens },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAvailableFunctions(req, res) {
    try {
      // Return built-in functions that the agent can use
      const functions = [
        {
          name: 'execute_command',
          description: 'Execute a shell command in the terminal',
          category: 'terminal',
          riskLevel: 'medium',
          parameters: {
            type: 'object',
            properties: {
              command: { type: 'string', description: 'The shell command to execute' },
              workingDirectory: {
                type: 'string',
                description: 'Directory to execute the command in',
              },
            },
            required: ['command'],
          },
        },
        {
          name: 'read_file',
          description: 'Read the contents of a file',
          category: 'file',
          riskLevel: 'low',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to the file to read' },
              lines: {
                type: 'object',
                description: 'Specific line range to read',
                properties: {
                  start: { type: 'number' },
                  end: { type: 'number' },
                },
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'write_file',
          description: 'Write content to a file',
          category: 'file',
          riskLevel: 'high',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to the file to write' },
              content: { type: 'string', description: 'Content to write to the file' },
              mode: { type: 'string', enum: ['overwrite', 'append'], description: 'Write mode' },
            },
            required: ['path', 'content'],
          },
        },
        {
          name: 'search_files',
          description: 'Search for text patterns in files',
          category: 'search',
          riskLevel: 'low',
          parameters: {
            type: 'object',
            properties: {
              pattern: { type: 'string', description: 'Text pattern or regex to search for' },
              path: { type: 'string', description: 'Directory or file path to search in' },
              filePattern: { type: 'string', description: 'File name pattern to filter' },
              recursive: { type: 'boolean', description: 'Search recursively' },
            },
            required: ['pattern'],
          },
        },
        {
          name: 'git_status',
          description: 'Get git repository status',
          category: 'git',
          riskLevel: 'low',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Repository path', default: '.' },
            },
          },
        },
        {
          name: 'get_system_info',
          description: 'Get system information and resource usage',
          category: 'system',
          riskLevel: 'low',
          parameters: {
            type: 'object',
            properties: {
              includeProcesses: { type: 'boolean', description: 'Include running processes' },
            },
          },
        },
        {
          name: 'list_directory',
          description: 'List directory contents with detailed information',
          category: 'file',
          riskLevel: 'low',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Directory path to list' },
              showHidden: { type: 'boolean', description: 'Include hidden files' },
              detailed: { type: 'boolean', description: 'Show detailed file information' },
            },
          },
        },
      ];

      res.json({
        functions: functions,
        totalCount: functions.length,
        categories: [...new Set(functions.map(f => f.category))],
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async registerCustomFunction(req, res) {
    try {
      const { name, description, parameters, category, riskLevel } = req.body;

      if (!name || !description || !parameters) {
        return res.status(400).json({
          error: 'name, description, and parameters are required',
        });
      }

      // In a real implementation, this would store the custom function
      // For now, we'll just validate and acknowledge
      res.json({
        success: true,
        message: `Custom function '${name}' registered`,
        function: { name, description, parameters, category, riskLevel },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async startAgentSession(req, res) {
    try {
      const sessionId = `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // In a real implementation, this would store session data
      res.json({
        success: true,
        sessionId: sessionId,
        startTime: new Date().toISOString(),
        message: 'Agent session started',
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async endAgentSession(req, res) {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
      }

      // In a real implementation, this would clean up session data
      res.json({
        success: true,
        message: `Agent session ${sessionId} ended`,
        endTime: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAgentSession(req, res) {
    try {
      const { sessionId } = req.params;

      // In a real implementation, this would retrieve session data
      res.json({
        sessionId: sessionId,
        active: true,
        startTime: new Date().toISOString(),
        messageCount: 0,
        functionCallCount: 0,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async healthCheck(req, res) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        providers: {},
      };

      // Check provider health
      if (this.openai) {
        try {
          // Simple test request
          await this.openai.models.list();
          health.providers.openai = 'connected';
        } catch (error) {
          health.providers.openai = `error: ${error.message}`;
        }
      } else {
        health.providers.openai = 'not_configured';
      }

      if (this.anthropic) {
        try {
          // Test Anthropic with a minimal request
          const testResponse = await this.anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'ping' }],
          });
          if (testResponse) {
            health.providers.anthropic = 'connected';
          }
        } catch (error) {
          health.providers.anthropic = `error: ${error.message.substring(0, 100)}`;
        }
      } else {
        health.providers.anthropic = 'not_configured';
      }

      // Test Ollama connectivity
      try {
        const response = await fetch(`${this.ollamaEndpoint}/api/tags`);
        if (response.ok) {
          health.providers.ollama = 'connected';
        } else {
          health.providers.ollama = 'error';
        }
      } catch (error) {
        health.providers.ollama = 'disconnected';
      }

      res.json(health);
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  getRouter() {
    return this.router;
  }
}

export default AgentChatAPI;
