import logger from '../utilities/logger.js';
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 10 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Advanced AI Integration System for RinaWarp
 * Inspired by WaveTerm's sophisticated AI architecture
 */

class AdvancedAISystem {
  constructor(config = {}) {
    this.providers = new Map();
    this.activeProvider = null;
    this.contextManager = new AIContextManager();
    this.commandPredictor = new CommandPredictor();
    this.errorAnalyzer = new ErrorAnalyzer();
    this.codeGenerator = new CodeGenerator();
    this.config = {
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2048,
      ...config,
    };

    this.initializeProviders();
  }

  async initializeProviders() {
    try {
      // Initialize OpenAI provider
      await this.registerProvider('openai', {
        name: 'OpenAI',
        models: ['gpt-4', 'gpt-3.5-turbo'],
        apiKeyPath: 'OPENAI_API_KEY',
        endpoint: 'https://api.openai.com/v1/chat/completions',
      });

      // Initialize Claude provider
      await this.registerProvider('claude', {
        name: 'Anthropic Claude',
        models: ['claude-3-opus', 'claude-3-sonnet'],
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
      console.error('❌ Failed to initialize AI providers:', error);
    }
  }

  async registerProvider(providerId, config) {
    const provider = new AIProvider(providerId, config);
    await provider.initialize();
    this.providers.set(providerId, provider);

    if (!this.activeProvider) {
      this.activeProvider = providerId;
    }
  }

  async setActiveProvider(providerId) {
    if (this.providers.has(providerId)) {
      this.activeProvider = providerId;
      return true;
    }
    throw new Error(new Error(`Provider ${providerId} not found`));
  }

  async generateCompletion(prompt, options = {}) {
    const provider = this.providers.get(this.activeProvider);
    if (!provider) {
      throw new Error(new Error('No active AI provider'));
    }

    const context = await this.contextManager.getContext(options.contextType);
    const enhancedPrompt = this.contextManager.enhancePrompt(prompt, context);

    try {
      const response = await provider.generateCompletion(enhancedPrompt, {
        ...this.config,
        ...options,
      });

      // Store interaction for context learning
      await this.contextManager.storeInteraction(prompt, response, context);

      return response;
    } catch (error) {
      console.error('AI completion failed:', error);
      throw new Error(new Error(error));
    }
  }

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

  async analyzeError(errorOutput, command, context = {}) {
    return await this.errorAnalyzer.analyze(errorOutput, command, context);
  }

  async generateCode(specification, language = 'javascript') {
    return await this.codeGenerator.generate(specification, language);
  }

  async predictCommand(partialCommand, history = []) {
    return await this.commandPredictor.predict(partialCommand, history);
  }

  async chatWithAI(message, conversationId = null) {
    let conversation = this.contextManager.getConversation(conversationId);
    if (!conversation) {
      conversation = this.contextManager.createConversation();
    }

    conversation.addMessage('user', message);

    const context = conversation.getContext();
    const response = await this.generateCompletion(message, {
      contextType: 'chat',
      conversation: context,
    });

    conversation.addMessage('assistant', response);
    return {
      response,
      conversationId: conversation.id,
    };
  }

  getAvailableProviders() {
    return Array.from(this.providers.entries()).map(([id, provider]) => ({
      id,
      name: provider.config.name,
      models: provider.config.models,
      active: id === this.activeProvider,
      status: provider.status,
    }));
  }

  async testProvider(providerId) {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(new Error(`Provider ${providerId} not found`));
    }

    try {
      const testResponse = await provider.generateCompletion('Hello, are you working?', {
        maxTokens: 50,
      });

      return {
        success: true,
        provider: providerId,
        response: testResponse,
        latency: provider.lastLatency,
      };
    } catch (error) {
      return {
        success: false,
        provider: providerId,
        error: error.message,
      };
    }
  }
}

class AIProvider {
  constructor(id, config) {
    this.id = id;
    this.config = config;
    this.status = 'initializing';
    this.lastLatency = 0;
    this.apiKey = null;
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
      console.error(`Failed to initialize provider ${this.id}:`, error);
    }
  }

  async loadApiKeyFromStorage() {
    try {
      // Load from secure storage via IPC
      const config = await window.electronAPI?.ipcRenderer.invoke('load-llm-config');
      return config?.apiKey;
    } catch (error) {
      console.warn('Failed to load API key from storage:', error);
      return null;
    }
  }

  async testLocalConnection() {
    if (!this.config.local) return;

    try {
      const response = await fetch(`${this.config.endpoint}/api/tags`);
      if (!response.ok) {
        throw new Error(new Error(`HTTP ${response.status}`));
      }
    } catch (error) {
      throw new Error(new Error(`Local AI service not available: ${error.message}`));
    }
  }

  async generateCompletion(prompt, options = {}) {
    if (this.status !== 'ready') {
      throw new Error(new Error(`Provider ${this.id} is not ready (status: ${this.status})`));
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
      return response;
    } catch (error) {
      this.lastLatency = Date.now() - startTime;
      throw new Error(new Error(error));
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
      throw new Error(new Error(`HTTP ${response.status}: ${response.statusText}`));
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
      throw new Error(new Error(`HTTP ${response.status}: ${errorText}`));
    }

    const data = await response.json();

    if (this.id === 'openai') {
      return data.choices[0].message.content;
    } else if (this.id === 'claude') {
      return data.content[0].text;
    }
  }
}

class AIContextManager {
  constructor() {
    this.contexts = new Map();
    this.conversations = new Map();
    this.interactionHistory = [];
  }

  async getContext(contextType = 'general') {
    let context = this.contexts.get(contextType);

    if (!context) {
      context = await this.buildContext(contextType);
      this.contexts.set(contextType, context);
    }

    return context;
  }

  async buildContext(contextType) {
    const baseContext = {
      timestamp: new Date().toISOString(),
      platform: (await window.nodeAPI?.getPlatform()) || 'unknown',
      cwd: (await window.nodeAPI?.getCurrentDir()) || 'unknown',
    };

    switch (contextType) {
      case 'command_explanation':
        return {
          ...baseContext,
          purpose: 'Explain shell commands and their effects',
          recentCommands: this.getRecentCommands(5),
        };

      case 'command_suggestion':
        return {
          ...baseContext,
          purpose: 'Suggest commands based on user intent',
          availableTools: await this.detectAvailableTools(),
          recentCommands: this.getRecentCommands(10),
        };

      case 'error_analysis':
        return {
          ...baseContext,
          purpose: 'Analyze and provide solutions for errors',
          systemInfo: await this.getSystemInfo(),
        };

      case 'chat':
        return {
          ...baseContext,
          purpose: 'General AI assistant conversation',
        };

      default:
        return baseContext;
    }
  }

  enhancePrompt(prompt, context) {
    const contextString = Object.entries(context)
      .filter(([key, value]) => key !== 'purpose' && value !== null)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n');

    return `Context:
${contextString}

${context.purpose ? `Purpose: ${context.purpose}\n\n` : ''}${prompt}`;
  }

  async storeInteraction(prompt, response, context) {
    const interaction = {
      timestamp: new Date().toISOString(),
      prompt,
      response,
      context: context.purpose || 'general',
    };

    this.interactionHistory.push(interaction);

    // Keep only last 100 interactions
    if (this.interactionHistory.length > 100) {
      this.interactionHistory = this.interactionHistory.slice(-100);
    }
  }

  getRecentCommands(_count = 10) {
    // This would integrate with the terminal's command history
    // For now, return empty array
    return [];
  }

  async detectAvailableTools() {
    // Detect available command-line tools
    const commonTools = ['git', 'npm', 'docker', 'kubectl', 'python', 'node', 'java'];
    const available = [];

    for (const tool of commonTools) {
      try {
        const result = await window.electronAPI?.ipcRenderer.invoke(
          'execute-command',
          `which ${tool}`
        );
        if (result.success) {
          available.push(tool);
        }
      } catch (error) {
        // Tool not available
      }
    }

    return available;
  }

  async getSystemInfo() {
    try {
      return (await window.nodeAPI?.getSystemInfo()) || {};
    } catch (error) {
      return {};
    }
  }

  createConversation() {
    const conversation = new AIConversation();
    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  getConversation(id) {
    return this.conversations.get(id);
  }
}

class AIConversation {
  constructor() {
    this.id = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.messages = [];
    this.created = new Date();
    this.lastActivity = new Date();
  }

  addMessage(role, content) {
    this.messages.push({
      role,
      content,
      timestamp: new Date(),
    });
    this.lastActivity = new Date();
  }

  getContext() {
    return {
      id: this.id,
      messageCount: this.messages.length,
      recentMessages: this.messages.slice(-5),
    };
  }

  getMessages() {
    return this.messages;
  }
}

class CommandPredictor {
  constructor() {
    this.commandPatterns = new Map();
    this.contextPatterns = new Map();
  }

  async predict(partialCommand, history = []) {
    // Implement command prediction logic
    // This could use ML models or pattern matching

    const predictions = [];

    // Basic pattern matching for common commands
    const commonCommands = [
      'ls',
      'cd',
      'pwd',
      'mkdir',
      'rm',
      'cp',
      'mv',
      'grep',
      'find',
      'git add',
      'git commit',
      'git push',
      'git pull',
      'git status',
      'npm install',
      'npm run',
      'npm start',
      'npm test',
      'docker run',
      'docker build',
      'docker ps',
      'docker stop',
    ];

    for (const cmd of commonCommands) {
      if (cmd.startsWith(partialCommand.toLowerCase())) {
        predictions.push({
          command: cmd,
          confidence: this.calculateConfidence(cmd, partialCommand, history),
          description: this.getCommandDescription(cmd),
        });
      }
    }

    return predictions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  calculateConfidence(command, partial, history) {
    let confidence = 0;

    // Base confidence from string matching
    confidence += (partial.length / command.length) * 0.5;

    // Boost from usage history
    const usageCount = history.filter(h => h.includes(command)).length;
    confidence += Math.min(usageCount * 0.1, 0.3);

    // Context-based boosting could be added here

    return Math.min(confidence, 1.0);
  }

  getCommandDescription(command) {
    const descriptions = {
      ls: 'List directory contents',
      cd: 'Change directory',
      pwd: 'Print working directory',
      'git status': 'Show git repository status',
      'npm install': 'Install npm dependencies',
      // Add more descriptions
    };

    return descriptions[command] || 'Shell command';
  }
}

class ErrorAnalyzer {
  async analyze(errorOutput, command, context) {
    const prompt = `Analyze this error and provide a solution:

Command: ${command}
Error Output: ${errorOutput}
System: ${context.platform || 'unknown'}
Working Directory: ${context.cwd || 'unknown'}

Please provide:
1. What caused this error
2. Step-by-step solution
3. How to prevent this error in the future
4. Alternative approaches if applicable

Be specific and actionable.`;

    // This would use the main AI system
    return prompt; // Placeholder - would call AI system
  }
}

class CodeGenerator {
  async generate(specification, language) {
    const prompt = `Generate ${language} code based on this specification:

${specification}

Requirements:
- Follow best practices for ${language}
- Include error handling where appropriate
- Add comments explaining key parts
- Make the code production-ready

Please provide only the code, properly formatted.`;

    // This would use the main AI system
    return prompt; // Placeholder - would call AI system
  }
}

// Export for integration
export { AdvancedAISystem, AIProvider, AIContextManager };
