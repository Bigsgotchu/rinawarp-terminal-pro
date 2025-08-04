/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal Agent Mode Integration
 * Integrates Agent Mode with the existing terminal system
 */

import AgentMode from '../ai/agent-mode.js';

class AgentModeIntegration {
  constructor(terminal) {
    this.terminal = terminal;
    this.agentMode = null;
    this.isInitialized = false;
    this.commandHistory = [];

    this.initialize();
  }

  async initialize() {
    try {
      // Initialize Agent Mode
      this.agentMode = new AgentMode(this.terminal);

      // Set up command handlers
      this.setupCommands();

      // Set up event listeners
      this.setupEventListeners();

      this.isInitialized = true;

      // Show available commands in terminal
      this.showWelcomeMessage();
    } catch (error) {
      console.error('❌ Failed to initialize Agent Mode:', error);
      this.terminal.writeLine(`❌ Agent Mode initialization failed: ${error.message}`);
    }
  }

  setupCommands() {
    // Register agent commands with the terminal
    this.terminal.registerCommand('agent', this.handleAgentCommand.bind(this));
    this.terminal.registerCommand('rina', this.handleRinaCommand.bind(this));

    // Alias commands
    this.terminal.registerCommand('ai', this.handleAgentCommand.bind(this));
    this.terminal.registerCommand('assistant', this.handleAgentCommand.bind(this));
  }

  setupEventListeners() {
    // Listen to terminal events
    this.terminal.on('command-executed', data => {
      this.commandHistory.push({
        command: data.command,
        output: data.output,
        timestamp: new Date().toISOString(),
        exitCode: data.exitCode,
      });

      // Keep only last 20 commands
      if (this.commandHistory.length > 20) {
        this.commandHistory.shift();
      }
    });

    // Listen to agent events
    if (this.agentMode) {
      this.agentMode.on('agent:started', () => {
        this.terminal.setPromptPrefix('🤖 ');
        this.terminal.writeLine('\\x1b[32m✅ Agent Mode is now active\\x1b[0m');
      });

      this.agentMode.on('agent:stopped', () => {
        this.terminal.setPromptPrefix('');
        this.terminal.writeLine('\\x1b[33m⏸️  Agent Mode deactivated\\x1b[0m');
      });

      this.agentMode.on('agent:response', response => {
        this.displayAgentResponse(response);
      });
    }
  }

  async handleAgentCommand(args) {
    if (!this.isInitialized) {
      return this.terminal.writeLine('❌ Agent Mode not initialized');
    }

    const [subcommand, ...restArgs] = args;

    switch (subcommand?.toLowerCase()) {
    case 'start':
    case 'on':
    case 'activate':
      return await this.startAgent();

    case 'stop':
    case 'off':
    case 'deactivate':
      return await this.stopAgent();

    case 'status':
      return this.showStatus();

    case 'help':
      return this.showHelp();

    case 'functions':
      return await this.showFunctions();

    case 'config':
      return await this.showConfig();

    case 'clear':
      return this.clearConversation();

    case 'export':
      return await this.exportConversation();

    default:
      if (subcommand) {
        // Treat as a chat message
        const message = [subcommand, ...restArgs].join(' ');
        return await this.chatWithAgent(message);
      } else {
        return this.showHelp();
      }
    }
  }

  async handleRinaCommand(args) {
    // Direct chat with Rina (agent)
    if (!this.isInitialized) {
      return this.terminal.writeLine('❌ Agent Mode not initialized');
    }

    if (args.length === 0) {
      return this.terminal.writeLine('💬 What would you like to know or do?');
    }

    const message = args.join(' ');
    return await this.chatWithAgent(message);
  }

  async startAgent() {
    try {
      const result = await this.agentMode.start();
      if (result.success) {
        this.terminal.writeLine(`\\x1b[32m${result.message}\\x1b[0m`);
        this.terminal.writeLine(`Session ID: ${result.sessionId}`);
      } else {
        this.terminal.writeLine(`\\x1b[33m${result.message}\\x1b[0m`);
      }
    } catch (error) {
      this.terminal.writeLine(`\\x1b[31m❌ Failed to start Agent Mode: ${error.message}\\x1b[0m`);
    }
  }

  async stopAgent() {
    try {
      const result = await this.agentMode.stop();
      if (result.success) {
        this.terminal.writeLine(`\\x1b[32m${result.message}\\x1b[0m`);
      } else {
        this.terminal.writeLine(`\\x1b[33m${result.message}\\x1b[0m`);
      }
    } catch (error) {
      this.terminal.writeLine(`\\x1b[31m❌ Failed to stop Agent Mode: ${error.message}\\x1b[0m`);
    }
  }

  showStatus() {
    const status = this.agentMode.getStatus();

    this.terminal.writeLine('\\n🤖 Agent Mode Status:');
    this.terminal.writeLine('==================');
    this.terminal.writeLine(
      `Status: ${status.active ? '\\x1b[32mActive\\x1b[0m' : '\\x1b[31mInactive\\x1b[0m'}`
    );

    if (status.active) {
      this.terminal.writeLine(`Session ID: ${status.sessionId}`);
      this.terminal.writeLine(`Conversation Length: ${status.conversationLength} messages`);
      this.terminal.writeLine(`Available Functions: ${status.availableFunctions}`);
      this.terminal.writeLine(
        `Working Directory: ${status.context?.workingDirectory || 'Unknown'}`
      );
    }

    this.terminal.writeLine('');
  }

  showHelp() {
    const helpText = `
🤖 RinaWarp Agent Mode Commands:

CONTROL:
  agent start          - Activate Agent Mode
  agent stop           - Deactivate Agent Mode  
  agent status         - Show current status

INTERACTION:
  agent <message>      - Chat with the AI agent
  rina <message>       - Direct chat with Rina
  
INFORMATION:  
  agent help           - Show this help
  agent functions      - List available functions
  agent config         - Show configuration
  
MANAGEMENT:
  agent clear          - Clear conversation history
  agent export         - Export conversation to file

EXAMPLES:
  agent start
  rina help me debug this error
  agent analyze my project structure
  agent list files in current directory
  rina explain what this command does: ls -la
  
The agent can execute commands, read/write files, analyze code, 
and help with development tasks. Always confirms dangerous operations.
`;

    this.terminal.writeLine(helpText);
  }

  async showFunctions() {
    try {
      const response = await fetch('/api/ai/agent/functions');
      const data = await response.json();

      this.terminal.writeLine('\\n🔧 Available Agent Functions:');
      this.terminal.writeLine('=============================');

      const categories = {};
      data.functions.forEach(func => {
        if (!categories[func.category]) {
          categories[func.category] = [];
        }
        categories[func.category].push(func);
      });

      Object.entries(categories).forEach(([category, functions]) => {
        this.terminal.writeLine(`\\n${category.toUpperCase()}:`);
        functions.forEach(func => {
          const riskColor =
            func.riskLevel === 'high'
              ? '\\x1b[31m'
              : func.riskLevel === 'medium'
                ? '\\x1b[33m'
                : '\\x1b[32m';
          this.terminal.writeLine(`  ${riskColor}${func.name}\\x1b[0m - ${func.description}`);
        });
      });

      this.terminal.writeLine(`\\nTotal: ${data.totalCount} functions available`);
      this.terminal.writeLine('');
    } catch (error) {
      this.terminal.writeLine(`❌ Failed to fetch functions: ${error.message}`);
    }
  }

  async showConfig() {
    try {
      const response = await fetch('/api/ai/agent/config');
      const config = await response.json();

      this.terminal.writeLine('\\n⚙️  Agent Configuration:');
      this.terminal.writeLine('=======================');
      this.terminal.writeLine(`Default Model: ${config.defaultModel}`);
      this.terminal.writeLine(`Temperature: ${config.defaultTemperature}`);
      this.terminal.writeLine(`Max Tokens: ${config.defaultMaxTokens}`);
      this.terminal.writeLine(`Functions Enabled: ${config.functionsEnabled ? 'Yes' : 'No'}`);
      this.terminal.writeLine(`Safety Checks: ${config.safetyChecks ? 'Yes' : 'No'}`);

      this.terminal.writeLine('\\nAvailable Providers:');
      config.availableProviders.forEach(provider => {
        const status = provider.local ? '[Local]' : '[Cloud]';
        const tools = provider.supportsTools ? '[Tools]' : '[No Tools]';
        this.terminal.writeLine(`  • ${provider.name} ${status} ${tools}`);
        this.terminal.writeLine(`    Models: ${provider.models.join(', ')}`);
      });

      this.terminal.writeLine('');
    } catch (error) {
      this.terminal.writeLine(`❌ Failed to fetch config: ${error.message}`);
    }
  }

  clearConversation() {
    if (this.agentMode) {
      this.agentMode.conversationHistory = [];
      this.terminal.writeLine('🗑️  Conversation history cleared');
    }
  }

  async exportConversation() {
    if (!this.agentMode || this.agentMode.conversationHistory.length === 0) {
      return this.terminal.writeLine('No conversation to export');
    }

    try {
      const conversation = {
        sessionId: this.agentMode.activeSession?.id || 'unknown',
        exportTime: new Date().toISOString(),
        messageCount: this.agentMode.conversationHistory.length,
        messages: this.agentMode.conversationHistory,
      };

      const filename = `agent-conversation-${Date.now()}.json`;
      const blob = new Blob([JSON.stringify(conversation, null, 2)], {
        type: 'application/json',
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      this.terminal.writeLine(`📁 Conversation exported to ${filename}`);
    } catch (error) {
      this.terminal.writeLine(`❌ Export failed: ${error.message}`);
    }
  }

  async chatWithAgent(message) {
    if (!this.agentMode) {
      return this.terminal.writeLine('❌ Agent Mode not initialized');
    }

    if (!this.agentMode.isActive) {
      this.terminal.writeLine('🤖 Agent Mode is not active. Starting it now...');
      await this.startAgent();

      if (!this.agentMode.isActive) {
        return this.terminal.writeLine('❌ Failed to start Agent Mode');
      }
    }

    try {
      // Show thinking indicator
      this.terminal.writeLine('🤔 Thinking...');

      const result = await this.agentMode.chat(message);

      if (result.success) {
        this.displayAgentResponse(result.response);
      } else {
        this.terminal.writeLine(`\\x1b[31m❌ Agent Error: ${result.error}\\x1b[0m`);
      }
    } catch (error) {
      this.terminal.writeLine(`\\x1b[31m❌ Chat failed: ${error.message}\\x1b[0m`);
    }
  }

  displayAgentResponse(response) {
    // Clear thinking indicator (if any)
    this.terminal.clearLine();

    // Display main response
    this.terminal.writeLine('\\n🤖 Rina:');
    this.terminal.writeLine('─'.repeat(50));

    // Format and display the content
    if (response.content) {
      this.terminal.writeLine(this.formatAgentMessage(response.content));
    }

    // Display function call results if any
    if (response.functionResults && response.functionResults.length > 0) {
      this.terminal.writeLine('\\n🔧 Actions Performed:');
      response.functionResults.forEach((result, _index) => {
        const status = result.success ? '\\x1b[32m✓\\x1b[0m' : '\\x1b[31m✗\\x1b[0m';
        this.terminal.writeLine(`${status} ${result.functionName}`);

        if (result.success && result.result) {
          // Display relevant parts of the result
          if (typeof result.result === 'string') {
            this.terminal.writeLine(
              `   Output: ${result.result.slice(0, 200)}${result.result.length > 200 ? '...' : ''}`
            );
          } else if (result.result.stdout) {
            this.terminal.writeLine(`   Output: ${result.result.stdout.slice(0, 200)}`);
          }
        } else if (!result.success) {
          this.terminal.writeLine(`   Error: ${result.error}`);
        }
      });
    }

    // Display follow-up message if available
    if (response.followUpMessage) {
      this.terminal.writeLine('\\n💡 Summary:');
      this.terminal.writeLine(this.formatAgentMessage(response.followUpMessage));
    }

    // Display usage info if available
    if (response.usage) {
      this.terminal.writeLine(
        `\\n📊 Tokens: ${response.usage.total_tokens || 'N/A'} | Model: ${response.model || 'N/A'}`
      );
    }

    this.terminal.writeLine('─'.repeat(50));
    this.terminal.writeLine('');
  }

  formatAgentMessage(content) {
    // Basic formatting for better readability
    return content
      .replace(/```([\\s\\S]*?)```/g, '\\x1b[90m$1\\x1b[0m') // Code blocks in gray
      .replace(/`([^`]+)`/g, '\\x1b[36m$1\\x1b[0m') // Inline code in cyan
      .replace(/\\*\\*([^*]+)\\*\\*/g, '\\x1b[1m$1\\x1b[0m') // Bold text
      .replace(/\\*([^*]+)\\*/g, '\\x1b[3m$1\\x1b[0m'); // Italic text
  }

  showWelcomeMessage() {
    const message = `
🤖 RinaWarp Agent Mode Available!

Type 'agent start' to activate AI assistance or 'agent help' for commands.
Quick start: 'rina help me with...' for immediate assistance.
`;

    this.terminal.writeLine(message);
  }

  // Public API for other components
  isAgentActive() {
    return this.agentMode && this.agentMode.isActive;
  }

  getAgentMode() {
    return this.agentMode;
  }

  async executeWithAgent(command, explanation = '') {
    if (!this.isAgentActive()) {
      throw new Error(new Error('Agent Mode is not active'));
    }

    const message = explanation
      ? `${explanation}. Execute this command: ${command}`
      : `Execute this command: ${command}`;

    return await this.agentMode.chat(message);
  }
}

export default AgentModeIntegration;
