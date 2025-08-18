#!/usr/bin/env node

/**
 * RinaWarp AI Testing Shell - Interactive Mode
 * Test your AI assistant with various commands interactively
 */

import readline from 'readline';

class AITestingShell {
  constructor() {
    this.ai = null;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🤖 rina> ',
    });

    this.isRunning = false;
    this.commandHistory = [];

    this.setupCommands();
  }

  setupCommands() {
    this.builtinCommands = {
      help: this.showHelp.bind(this),
      examples: this.showExamples.bind(this),
      status: this.showStatus.bind(this),
      history: this.showHistory.bind(this),
      clear: this.clearScreen.bind(this),
      models: this.showModels.bind(this),
      exit: this.exit.bind(this),
      quit: this.exit.bind(this),
    };
  }

  async initialize() {
    console.log('🎭 RinaWarp AI Testing Shell');
    console.log('='.repeat(50));
    console.log('🚀 Initializing AI Assistant...\n');

    try {
      // Import the class dynamically to avoid circular imports
      const { LiveRinaWarpAI } = await this.importLiveAI();
      this.ai = new LiveRinaWarpAI();
      await this.ai.initialize();

      console.log('✅ AI Assistant ready for interactive testing!');
      console.log("💡 Type 'help' for commands or start chatting with your AI");
      console.log("🎯 Try: 'analyze my code', 'create task: build dashboard', etc.\n");

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize AI:', error.message);
      return false;
    }
  }

  async importLiveAI() {
    // Dynamic import to get the class
    const _fs = await import('fs');
    const _path = await import('path');

    // Import all required components directly
    const { OllamaClient } = await import('./src/ai-assistant/core/ollama-client.js');
    const { CodebaseAnalyzer } = await import('./src/ai-assistant/analysis/codebase-analyzer.js');
    const { TaskManager } = await import('./src/ai-assistant/tasks/task-manager.js');
    const { ContextManager } = await import('./src/ai-assistant/core/context-manager.js');

    // Simple logger
    const _logger = {
      info: (msg, ...args) => console.log(`💡 ${msg}`, ...args),
      error: (msg, ...args) => console.error(`❌ ${msg}`, ...args),
      warn: (msg, ...args) => console.warn(`⚠️  ${msg}`, ...args),
      debug: (msg, ...args) => console.log(`🔍 ${msg}`, ...args),
    };

    class LiveRinaWarpAI {
      constructor() {
        this.ollamaClient = new OllamaClient();
        this.contextManager = new ContextManager();
        this.codebaseAnalyzer = new CodebaseAnalyzer();
        this.taskManager = new TaskManager();

        this.isInitialized = false;
        this.currentProject = null;

        // Override the default model to use what we have
        this.ollamaClient.models.codeGeneration = 'deepseek-coder:1.3b';
        this.ollamaClient.models.general = 'deepseek-coder:1.3b';
        this.ollamaClient.models.codeReview = 'deepseek-coder:1.3b';
        this.ollamaClient.defaultModel = 'deepseek-coder:1.3b';
      }

      async initialize() {
        const _connection = await this.ollamaClient.testConnection();
        this.contextManager.startSession(process.cwd());
        this.isInitialized = true;
        return { success: true };
      }

      async processCommand(command) {
        const prompt = `
You are RinaWarp AI, a development assistant. Respond to: "${command}"

Be helpful, concise, and focused on development. If it's about code, provide practical examples.`;

        const response = await this.ollamaClient.generateResponse(prompt, {
          model: 'deepseek-coder:1.3b',
          temperature: 0.6,
        });

        return { success: true, response };
      }

      getCapabilities() {
        return ['Code Analysis', 'Task Management', 'Code Generation', 'Development Consultation'];
      }
    }

    return { LiveRinaWarpAI };
  }

  async start() {
    const initialized = await this.initialize();
    if (!initialized) {
      console.log('❌ Cannot start shell without AI assistant');
      process.exit(1);
    }

    this.isRunning = true;
    this.rl.prompt();

    this.rl.on('line', async input => {
      const command = input.trim();

      if (command === '') {
        this.rl.prompt();
        return;
      }

      await this.processInput(command);
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      this.exit();
    });
  }

  async processInput(input) {
    this.commandHistory.push(input);

    // Check for built-in commands
    const command = input.toLowerCase();
    if (this.builtinCommands[command]) {
      await this.builtinCommands[command]();
      return;
    }

    // Process with AI
    try {
      console.log('🤖 AI is thinking...');
      const startTime = Date.now();

      const result = await this.ai.processCommand(input);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log('\n🎯 AI Response:');
      console.log('-'.repeat(40));
      console.log(result.response || result.insights || 'Response received');
      console.log('-'.repeat(40));
      console.log(`⚡ Response time: ${responseTime}ms\n`);
    } catch (error) {
      console.error('❌ AI Error:', error.message);
    }
  }

  showHelp() {
    console.log('\n🤖 RinaWarp AI Testing Shell Commands:');
    console.log('='.repeat(40));
    console.log('Built-in Commands:');
    console.log('  help       - Show this help');
    console.log('  examples   - Show example AI commands');
    console.log('  status     - Show AI status');
    console.log('  history    - Show command history');
    console.log('  models     - Show available models');
    console.log('  clear      - Clear screen');
    console.log('  exit/quit  - Exit shell');
    console.log('');
    console.log('AI Commands (try these):');
    console.log('  analyze my project structure');
    console.log('  create task: build authentication system');
    console.log('  generate a React component for user profiles');
    console.log('  explain best practices for API security');
    console.log('  help me debug memory leaks in Node.js');
    console.log('  what are modern JavaScript patterns?');
    console.log('');
  }

  showExamples() {
    console.log('\n🎯 Example AI Commands:');
    console.log('='.repeat(40));

    const examples = [
      {
        category: 'Code Analysis',
        commands: [
          'analyze this file for performance issues',
          'review my React components for best practices',
          'find security vulnerabilities in my API',
        ],
      },
      {
        category: 'Task Management',
        commands: [
          'create task: implement user authentication with JWT',
          'break down: build e-commerce shopping cart',
          'plan: database migration from MySQL to PostgreSQL',
        ],
      },
      {
        category: 'Code Generation',
        commands: [
          'generate a Express.js middleware for logging',
          'create a Python function for data validation',
          'write TypeScript interfaces for user management',
        ],
      },
      {
        category: 'Development Help',
        commands: [
          'explain microservices architecture patterns',
          'best practices for React performance optimization',
          'how to implement caching strategies in Node.js',
        ],
      },
    ];

    examples.forEach(category => {
      console.log(`\n${category.category}:`);
      category.commands.forEach(cmd => {
        console.log(`  • ${cmd}`);
      });
    });
    console.log('');
  }

  showStatus() {
    console.log('\n📊 AI Assistant Status:');
    console.log('='.repeat(30));
    console.log(`Status: ${this.ai?.isInitialized ? '✅ Running' : '❌ Stopped'}`);
    console.log(`Capabilities: ${this.ai?.getCapabilities()?.join(', ') || 'Unknown'}`);
    console.log(`Commands processed: ${this.commandHistory.length}`);
    console.log('Session: Interactive Testing');
    console.log('');
  }

  showHistory() {
    console.log('\n📜 Command History:');
    console.log('='.repeat(30));
    if (this.commandHistory.length === 0) {
      console.log('No commands yet');
    } else {
      this.commandHistory.slice(-10).forEach((cmd, i) => {
        console.log(`${i + 1}. ${cmd}`);
      });
    }
    console.log('');
  }

  async showModels() {
    try {
      const models = await this.ai.ollamaClient.getAvailableModels();
      console.log('\n🧠 Available AI Models:');
      console.log('='.repeat(30));
      models.forEach(model => {
        console.log(
          `• ${model.name} (${Math.round((model.size / 1024 / 1024 / 1024) * 10) / 10}GB)`
        );
      });
      console.log('');
    } catch (error) {
      console.log('❌ Could not fetch models:', error.message);
    }
  }

  clearScreen() {
    // Clear screen by printing newlines instead of console.clear()
    console.log('\n'.repeat(50));
    console.log('🤖 RinaWarp AI Testing Shell - Screen Cleared\n');
  }

  exit() {
    console.log('\n👋 Goodbye! Your AI assistant is still running in the background.');
    console.log('💡 Use it in your terminal or integrate it into your applications!');
    this.isRunning = false;
    this.rl.close();
    process.exit(0);
  }
}

// Main execution
async function main() {
  const shell = new AITestingShell();
  await shell.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
