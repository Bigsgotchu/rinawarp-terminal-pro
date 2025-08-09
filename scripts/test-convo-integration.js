#!/usr/bin/env node

/*
 * RinaWarp Terminal - Convo SDK Integration Test & Management CLI
 * Copyright (c) 2025 Rinawarp Technologies, LLC. All rights reserved.
 *
 * This file is part of RinaWarp Terminal, a proprietary terminal emulator with
 * AI assistance, themes, and enterprise features.
 *
 * Licensed under the RinaWarp Proprietary License.
 * See LICENSE file for detailed terms and conditions.
 *
 * Test, configure, and manage the Convo SDK integration
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import process from 'process';
import fs from 'fs';
import { aiIntegrationAdapter } from '../src/ai-system/ai-integration-adapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

class ConvoIntegrationCLI {
  constructor() {
    this.commands = {
      init: this.initializeConvo.bind(this),
      test: this.testIntegration.bind(this),
      chat: this.testChat.bind(this),
      explain: this.testExplainCommand.bind(this),
      suggest: this.testSuggestCommand.bind(this),
      threads: this.listThreads.bind(this),
      'create-thread': this.createThread.bind(this),
      'switch-thread': this.switchThread.bind(this),
      'time-travel': this.timeTravel.bind(this),
      history: this.showHistory.bind(this),
      debug: this.showDebugInfo.bind(this),
      health: this.healthCheck.bind(this),
      config: this.showConfig.bind(this),
      'set-config': this.setConfig.bind(this),
      help: this.showHelp.bind(this),
    };
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    const params = args.slice(1);

    if (!this.commands[command]) {
      console.error(colorize('red', `Unknown command: ${command}`));
      this.showHelp();
      process.exit(1);
    }

    try {
      await this.commands[command](params);
    } catch (error) {
      console.error(colorize('red', '❌ Command failed:'), error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  async initializeConvo() {
    console.log(colorize('cyan', '🚀 Initializing Convo SDK integration...'));
    
    try {
      await aiIntegrationAdapter.initialize();
      
      const debugInfo = aiIntegrationAdapter.getDebugInfo();
      
      console.log(colorize('green', '✅ Convo SDK integration initialized successfully!'));
      console.log();
      console.log('📊 Initialization Details:');
      console.log(`   Time: ${debugInfo.initTime}ms`);
      console.log(`   Persistence: ${debugInfo.convoPersistenceEnabled ? '🧠 ON' : '❌ OFF'}`);
      console.log(`   Time Travel: ${debugInfo.timeTravelEnabled ? '⏰ ON' : '❌ OFF'}`);
      
      if (debugInfo.currentThread) {
        console.log(`   Thread ID: ${colorize('blue', debugInfo.currentThread)}`);
      }
      
      if (debugInfo.fallbackMode) {
        console.log(colorize('yellow', '⚠️  Running in fallback mode (Convo SDK not available)'));
      }
      
    } catch (error) {
      console.error(colorize('red', '❌ Initialization failed:'), error.message);
      console.log();
      console.log(colorize('yellow', '💡 Tips:'));
      console.log('   1. Make sure you have a valid CONVO_API_KEY');
      console.log('   2. Check your internet connection');
      console.log('   3. Verify the convo-sdk package is installed');
    }
  }

  async testIntegration() {
    console.log(colorize('cyan', '🧪 Testing Convo SDK integration...'));
    
    // Health check
    const health = await aiIntegrationAdapter.healthCheck();
    
    console.log('🏥 Health Check:');
    console.log(`   Status: ${health.healthy ? colorize('green', 'HEALTHY') : colorize('red', 'UNHEALTHY')}`);
    console.log(`   Provider: ${health.provider || 'unknown'}`);
    
    if (health.latency) {
      console.log(`   Latency: ${health.latency}ms`);
    }
    
    if (health.error) {
      console.log(`   Error: ${colorize('red', health.error)}`);
    }
    
    console.log(`   Persistence: ${health.convoPersistence ? colorize('green', 'ON') : colorize('red', 'OFF')}`);
    console.log(`   Time Travel: ${health.timeTravel ? colorize('green', 'ON') : colorize('red', 'OFF')}`);
    
    if (health.currentThread) {
      console.log(`   Thread: ${colorize('blue', health.currentThread)}`);
    }
    
    // Test basic functionality
    if (health.healthy) {
      console.log();
      console.log(colorize('cyan', '🧪 Running functional tests...'));
      
      try {
        // Test chat
        console.log('   Testing chat...');
        const chatResponse = await aiIntegrationAdapter.chat('Hello, this is a test message');
        console.log(`   ✅ Chat: ${chatResponse.response.content.substring(0, 100)}...`);
        
        // Test command explanation
        console.log('   Testing command explanation...');
        const explainResponse = await aiIntegrationAdapter.explainCommand('ls -la');
        console.log(`   ✅ Explain: ${explainResponse.content.substring(0, 100)}...`);
        
        console.log();
        console.log(colorize('green', '✅ All tests passed!'));
        
      } catch (error) {
        console.error(colorize('red', '❌ Functional test failed:'), error.message);
      }
    }
  }

  async testChat(params) {
    const message = params.join(' ') || 'Hello, how are you?';
    
    console.log(colorize('cyan', `💬 Testing chat with message: "${message}"`));
    
    try {
      const response = await aiIntegrationAdapter.chat(message);
      
      console.log();
      console.log(colorize('green', '🤖 AI Response:'));
      console.log(response.response.content);
      
      console.log();
      console.log('📊 Response Details:');
      console.log(`   Conversation ID: ${response.conversationId}`);
      console.log(`   Thread ID: ${response.threadId}`);
      
      if (response.response.provider) {
        console.log(`   Provider: ${response.response.provider}`);
      }
      
      if (response.response.latency) {
        console.log(`   Latency: ${response.response.latency}ms`);
      }
      
    } catch (error) {
      console.error(colorize('red', '❌ Chat test failed:'), error.message);
    }
  }

  async testExplainCommand(params) {
    const command = params.join(' ') || 'git status';
    
    console.log(colorize('cyan', `📖 Explaining command: "${command}"`));
    
    try {
      const response = await aiIntegrationAdapter.explainCommand(command);
      
      console.log();
      console.log(colorize('green', '🤖 Explanation:'));
      console.log(response.content);
      
      if (response.provider) {
        console.log();
        console.log(`📊 Provider: ${response.provider}`);
      }
      
    } catch (error) {
      console.error(colorize('red', '❌ Command explanation failed:'), error.message);
    }
  }

  async testSuggestCommand(params) {
    const description = params.join(' ') || 'list all files in current directory';
    
    console.log(colorize('cyan', `💡 Suggesting command for: "${description}"`));
    
    try {
      const response = await aiIntegrationAdapter.suggestCommand(description);
      
      console.log();
      console.log(colorize('green', '🤖 Suggestion:'));
      console.log(response.content);
      
      if (response.provider) {
        console.log();
        console.log(`📊 Provider: ${response.provider}`);
      }
      
    } catch (error) {
      console.error(colorize('red', '❌ Command suggestion failed:'), error.message);
    }
  }

  async listThreads() {
    console.log(colorize('cyan', '🧵 Listing threads...'));
    
    try {
      const threads = await aiIntegrationAdapter.listThreads();
      
      if (threads.length === 0) {
        console.log(colorize('yellow', '   No threads found'));
        return;
      }
      
      console.log();
      console.log(`Found ${threads.length} thread(s):`);
      
      const debugInfo = aiIntegrationAdapter.getDebugInfo();
      
      threads.forEach((threadId, index) => {
        const isCurrent = threadId === debugInfo.currentThread;
        const marker = isCurrent ? colorize('green', '→ ') : '  ';
        const style = isCurrent ? 'green' : 'blue';
        
        console.log(`${marker}${index + 1}. ${colorize(style, threadId)}`);
      });
      
    } catch (error) {
      console.error(colorize('red', '❌ Failed to list threads:'), error.message);
    }
  }

  async createThread(params) {
    const metadata = { name: params.join(' ') || 'Test Thread' };
    
    console.log(colorize('cyan', `🧵 Creating new thread: "${metadata.name}"`));
    
    try {
      const result = await aiIntegrationAdapter.createNewThread(metadata);
      
      console.log();
      console.log(colorize('green', '✅ Thread created successfully!'));
      console.log(`   New Thread: ${colorize('blue', result.newThreadId)}`);
      
      if (result.previousThreadId) {
        console.log(`   Previous Thread: ${result.previousThreadId}`);
      }
      
    } catch (error) {
      console.error(colorize('red', '❌ Failed to create thread:'), error.message);
    }
  }

  async switchThread(params) {
    const threadId = params[0];
    
    if (!threadId) {
      console.error(colorize('red', '❌ Thread ID required'));
      console.log('Usage: npm run test:convo switch-thread <thread-id>');
      return;
    }
    
    console.log(colorize('cyan', `🔄 Switching to thread: ${threadId}`));
    
    try {
      const result = await aiIntegrationAdapter.switchThread(threadId);
      
      console.log();
      console.log(colorize('green', '✅ Successfully switched threads!'));
      console.log(`   Current Thread: ${colorize('blue', result.currentThread)}`);
      console.log(`   Previous Thread: ${result.previousThread}`);
      
    } catch (error) {
      console.error(colorize('red', '❌ Failed to switch thread:'), error.message);
    }
  }

  async timeTravel(params) {
    const interactionId = parseInt(params[0]);
    
    if (isNaN(interactionId)) {
      console.error(colorize('red', '❌ Valid interaction ID required'));
      console.log('Usage: npm run test:convo time-travel <interaction-id>');
      return;
    }
    
    console.log(colorize('cyan', `⏰ Time traveling to interaction: ${interactionId}`));
    
    try {
      const result = await aiIntegrationAdapter.timeTravel(interactionId);
      
      console.log();
      console.log(colorize('green', '✅ Time travel successful!'));
      console.log(`   Restored to: ${result.restoredTo}`);
      console.log(`   Timestamp: ${result.timestamp}`);
      
    } catch (error) {
      console.error(colorize('red', '❌ Time travel failed:'), error.message);
    }
  }

  async showHistory(params) {
    const limit = parseInt(params[0]) || 10;
    
    console.log(colorize('cyan', `📚 Showing last ${limit} interactions...`));
    
    try {
      const history = await aiIntegrationAdapter.getConversationHistory(limit);
      
      if (history.length === 0) {
        console.log(colorize('yellow', '   No conversation history found'));
        return;
      }
      
      console.log();
      
      history.forEach((item, index) => {
        console.log(colorize('blue', `${index + 1}. [${item.timestamp}]`));
        console.log(`   Prompt: ${item.prompt}`);
        console.log(`   Response: ${item.response.substring(0, 100)}...`);
        console.log();
      });
      
    } catch (error) {
      console.error(colorize('red', '❌ Failed to get history:'), error.message);
    }
  }

  async showDebugInfo() {
    console.log(colorize('cyan', '🐛 Debug Information'));
    
    const debugInfo = aiIntegrationAdapter.getDebugInfo();
    
    console.log();
    console.log('📊 System Status:');
    console.log(`   Initialization Time: ${debugInfo.initTime || 'N/A'}ms`);
    console.log(`   Total Interactions: ${debugInfo.totalInteractions}`);
    console.log(`   Fallback Mode: ${debugInfo.fallbackMode ? colorize('red', 'YES') : colorize('green', 'NO')}`);
    
    console.log();
    console.log('🧠 Convo SDK:');
    console.log(`   Persistence Enabled: ${debugInfo.convoPersistenceEnabled ? colorize('green', 'YES') : colorize('red', 'NO')}`);
    console.log(`   Time Travel Enabled: ${debugInfo.timeTravelEnabled ? colorize('green', 'YES') : colorize('red', 'NO')}`);
    console.log(`   Current Thread: ${debugInfo.currentThread ? colorize('blue', debugInfo.currentThread) : 'None'}`);
    
    console.log();
    console.log('⚙️  Configuration:');
    console.log(`   Persistence: ${debugInfo.config.enablePersistence ? 'enabled' : 'disabled'}`);
    console.log(`   Time Travel: ${debugInfo.config.enableTimeTravel ? 'enabled' : 'disabled'}`);
    console.log(`   Preferred Provider: ${debugInfo.config.preferredProvider}`);
    
    if (debugInfo.systemDebug) {
      console.log();
      console.log('🤖 AI System:');
      console.log(`   Active Provider: ${debugInfo.systemDebug.activeProvider || 'None'}`);
      console.log(`   Interaction Count: ${debugInfo.systemDebug.interactionCount || 0}`);
      console.log(`   Providers Available: ${debugInfo.systemDebug.providers ? debugInfo.systemDebug.providers.join(', ') : 'None'}`);
    }
  }

  async healthCheck() {
    console.log(colorize('cyan', '🏥 Performing health check...'));
    
    const health = await aiIntegrationAdapter.healthCheck();
    
    console.log();
    console.log('📊 Health Status:');
    console.log(`   Overall: ${health.healthy ? colorize('green', 'HEALTHY') : colorize('red', 'UNHEALTHY')}`);
    console.log(`   Status: ${health.status}`);
    
    if (health.provider) {
      console.log(`   Provider: ${health.provider}`);
    }
    
    if (health.latency) {
      console.log(`   Latency: ${health.latency}ms`);
    }
    
    if (health.error) {
      console.log(`   Error: ${colorize('red', health.error)}`);
    }
    
    if (health.fallbackMode) {
      console.log(`   Mode: ${colorize('yellow', 'FALLBACK')}`);
    }
    
    console.log();
    console.log('🧠 Convo Features:');
    console.log(`   Persistence: ${health.convoPersistence ? colorize('green', 'AVAILABLE') : colorize('red', 'UNAVAILABLE')}`);
    console.log(`   Time Travel: ${health.timeTravel ? colorize('green', 'AVAILABLE') : colorize('red', 'UNAVAILABLE')}`);
    
    if (health.currentThread) {
      console.log(`   Thread: ${colorize('blue', health.currentThread)}`);
    }
  }

  async showConfig() {
    console.log(colorize('cyan', '⚙️  Current Configuration'));
    
    const debugInfo = aiIntegrationAdapter.getDebugInfo();
    
    console.log();
    console.log('🔧 Settings:');
    console.log(`   Persistence: ${debugInfo.config.enablePersistence ? colorize('green', 'enabled') : colorize('red', 'disabled')}`);
    console.log(`   Time Travel: ${debugInfo.config.enableTimeTravel ? colorize('green', 'enabled') : colorize('red', 'disabled')}`);
    console.log(`   Preferred Provider: ${debugInfo.config.preferredProvider}`);
    
    // Check for API keys (without revealing them)
    console.log();
    console.log('🔑 API Keys:');
    console.log(`   Convo API Key: ${process.env.CONVO_API_KEY ? colorize('green', 'SET') : colorize('red', 'NOT SET')}`);
    console.log(`   OpenAI API Key: ${process.env.OPENAI_API_KEY ? colorize('green', 'SET') : colorize('red', 'NOT SET')}`);
    console.log(`   Anthropic API Key: ${process.env.ANTHROPIC_API_KEY ? colorize('green', 'SET') : colorize('red', 'NOT SET')}`);
  }

  async setConfig(params) {
    if (params.length < 2) {
      console.error(colorize('red', '❌ Key and value required'));
      console.log('Usage: npm run test:convo set-config <key> <value>');
      console.log('Available keys: enablePersistence, enableTimeTravel, preferredProvider, temperature, maxTokens');
      return;
    }

    const [key, ...valueParts] = params;
    const value = valueParts.join(' ');

    console.log(colorize('cyan', `⚙️  Setting ${key} = ${value}`));

    try {
      // Parse boolean values
      let parsedValue = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (!isNaN(value)) parsedValue = parseFloat(value);

      const newConfig = { [key]: parsedValue };
      await aiIntegrationAdapter.updateConfiguration(newConfig);

      console.log(colorize('green', '✅ Configuration updated successfully!'));

    } catch (error) {
      console.error(colorize('red', '❌ Failed to update configuration:'), error.message);
    }
  }

  showHelp() {
    console.log(colorize('cyan', 'RinaWarp Terminal - Convo SDK Integration CLI'));
    console.log();
    console.log('Available commands:');
    console.log();
    
    const commands = [
      ['init', 'Initialize the Convo SDK integration'],
      ['test', 'Run integration tests'],
      ['chat <message>', 'Test chat functionality'],
      ['explain <command>', 'Test command explanation'],
      ['suggest <description>', 'Test command suggestion'],
      ['threads', 'List all threads'],
      ['create-thread [name]', 'Create a new thread'],
      ['switch-thread <id>', 'Switch to a specific thread'],
      ['time-travel <id>', 'Travel to a specific interaction'],
      ['history [limit]', 'Show conversation history'],
      ['debug', 'Show debug information'],
      ['health', 'Perform health check'],
      ['config', 'Show current configuration'],
      ['set-config <key> <value>', 'Update configuration'],
      ['help', 'Show this help message'],
    ];
    
    commands.forEach(([cmd, desc]) => {
      console.log(`  ${colorize('green', cmd.padEnd(20))} ${desc}`);
    });
    
    console.log();
    console.log('Examples:');
    console.log(`  ${colorize('yellow', 'npm run test:convo init')}`);
    console.log(`  ${colorize('yellow', 'npm run test:convo test')}`);
    console.log(`  ${colorize('yellow', 'npm run test:convo chat "Hello, how are you?"')}`);
    console.log(`  ${colorize('yellow', 'npm run test:convo explain "git status"')}`);
    console.log(`  ${colorize('yellow', 'npm run test:convo time-travel 5')}`);
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new ConvoIntegrationCLI();
  cli.run().catch((error) => {
    console.error(colorize('red', '💥 CLI crashed:'), error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

export { ConvoIntegrationCLI };
