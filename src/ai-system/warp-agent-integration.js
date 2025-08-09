/**
 * 🧜‍♀️ Warp Agent Integration for RinaWarp Terminal
 * Integrates advanced AI agent capabilities (like Warp's Agent Mode) with RinaWarp's beautiful UI
 *
 * This provides the same powerful AI assistance you experience in Warp, but with:
 * - Your beautiful RinaWarp Terminal design and branding
 * - All your existing premium features intact
 * - Enhanced terminal-specific AI capabilities
 * - Seamless integration with your current workflow
 */

import { EnhancedDevelopmentAssistant } from './enhanced-development-assistant.js';

export class WarpAgentIntegration {
  constructor(terminalInstance, config = {}) {
    this.terminal = terminalInstance;
    this.config = {
      enableWarpAgent: config.enableWarpAgent !== false,
      preserveRinaUI: config.preserveRinaUI !== false,
      agentPersonality: config.agentPersonality || 'helpful-technical',
      contextMemory: config.contextMemory || 50,
      enableTools: config.enableTools !== false,
      ...config,
    };

    // Agent capabilities - similar to Warp's Agent Mode
    this.agentTools = new Map();
    this.conversationHistory = [];
    this.workingDirectory = process.cwd();
    this.systemContext = {
      os: process.platform,
      shell: process.env.SHELL || 'bash',
      terminal: 'RinaWarp',
      user: process.env.USER || 'user',
    };

    // UI state
    this.agentPanelVisible = false;
    this.isProcessing = false;

    this.initializeAgentTools();
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Warp Agent Integration...');

      // Create agent interface in your beautiful UI
      this.createAgentInterface();

      // Initialize agent tools
      await this.initializeTools();

      // Set up terminal integration
      this.setupTerminalIntegration();

      // Add agent commands
      this.addAgentCommands();

      console.log('✅ Warp Agent Integration ready!');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Warp Agent:', error);
      return false;
    }
  }

  createAgentInterface() {
    // Create a beautiful agent panel that matches your RinaWarp theme
    const agentPanel = document.createElement('div');
    agentPanel.id = 'rina-agent-panel';
    agentPanel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      max-height: 70vh;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 20, 147, 0.1));
      border-radius: 25px;
      padding: 25px;
      box-shadow: 0 30px 60px rgba(255, 20, 147, 0.3);
      border: 3px solid rgba(0, 255, 255, 0.4);
      backdrop-filter: blur(15px);
      z-index: 1000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      overflow-y: auto;
    `;

    agentPanel.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: between; margin-bottom: 20px;">
        <h3 style="
          font-size: 1.5rem;
          background: linear-gradient(45deg, #ff1493, #00ffff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
          flex: 1;
        ">🧜‍♀️ AI Agent</h3>
        <button id="close-agent" style="
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #ff1493;
          cursor: pointer;
        ">×</button>
      </div>
      
      <div id="agent-conversation" style="
        min-height: 200px;
        max-height: 300px;
        overflow-y: auto;
        margin-bottom: 15px;
        padding: 15px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 15px;
        border: 1px solid rgba(0, 255, 255, 0.3);
      "></div>
      
      <div style="display: flex; gap: 10px;">
        <input type="text" id="agent-input" placeholder="Ask me anything about your code, files, or terminal tasks..." style="
          flex: 1;
          padding: 12px;
          border: 2px solid rgba(0, 255, 255, 0.4);
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.8);
          font-size: 14px;
        ">
        <button id="send-agent" style="
          background: linear-gradient(45deg, #ff1493, #00ffff);
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 15px;
          cursor: pointer;
          font-weight: bold;
        ">Send</button>
      </div>

      <div style="margin-top: 15px; font-size: 12px; color: #666;">
        <div>💡 I can help with:</div>
        <div>• Code analysis & debugging</div>
        <div>• File operations & searching</div>
        <div>• Terminal commands & workflows</div>
        <div>• Architecture & best practices</div>
      </div>
    `;

    document.body.appendChild(agentPanel);
    this.agentPanel = agentPanel;

    // Set up event handlers
    this.setupAgentEventHandlers();
  }

  setupAgentEventHandlers() {
    const input = document.getElementById('agent-input');
    const sendBtn = document.getElementById('send-agent');
    const closeBtn = document.getElementById('close-agent');

    // Send message on Enter or button click
    const sendMessage = () => this.processAgentRequest(input.value);

    input.addEventListener('keypress', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    sendBtn.addEventListener('click', sendMessage);
    closeBtn.addEventListener('click', () => this.toggleAgentPanel(false));
  }

  initializeAgentTools() {
    // File system tools
    this.agentTools.set('read_files', {
      description: 'Read and analyze files in the current project',
      execute: async filePaths => {
        // Implementation for reading files
        return this.readProjectFiles(filePaths);
      },
    });

    this.agentTools.set('search_codebase', {
      description: 'Search through codebase for specific patterns or functions',
      execute: async (query, options = {}) => {
        return this.searchCodebase(query, options);
      },
    });

    this.agentTools.set('run_command', {
      description: 'Execute terminal commands safely',
      execute: async (command, options = {}) => {
        return this.executeCommand(command, options);
      },
    });

    this.agentTools.set('analyze_project', {
      description: 'Analyze current project structure and provide insights',
      execute: async () => {
        return this.analyzeProject();
      },
    });

    this.agentTools.set('file_glob', {
      description: 'Find files matching patterns',
      execute: async (patterns, path = '.') => {
        return this.findFiles(patterns, path);
      },
    });

    this.agentTools.set('git_operations', {
      description: 'Perform git operations and analysis',
      execute: async (operation, args = []) => {
        return this.performGitOperation(operation, args);
      },
    });
  }

  setupTerminalIntegration() {
    // Add AI agent toggle button to your existing terminal UI
    this.addAgentToggleButton();

    // Intercept commands that should trigger the agent
    this.interceptAgentCommands();
  }

  addAgentToggleButton() {
    // Find a suitable place in your terminal UI to add the agent button
    // This preserves your existing beautiful design
    const terminalContainer =
      document.querySelector('.terminal-container') ||
      document.querySelector('#terminal') ||
      document.body;

    if (terminalContainer) {
      const agentButton = document.createElement('button');
      agentButton.innerHTML = '🧜‍♀️ AI Agent';
      agentButton.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #ff1493, #00ffff);
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 20px;
        cursor: pointer;
        font-weight: bold;
        box-shadow: 0 8px 25px rgba(255, 20, 147, 0.5);
        z-index: 999;
        transition: all 0.3s ease;
      `;

      agentButton.addEventListener('click', () => this.toggleAgentPanel());
      agentButton.addEventListener('mouseenter', () => {
        agentButton.style.transform = 'translateY(-2px)';
        agentButton.style.boxShadow = '0 12px 35px rgba(255, 20, 147, 0.7)';
      });
      agentButton.addEventListener('mouseleave', () => {
        agentButton.style.transform = 'translateY(0)';
        agentButton.style.boxShadow = '0 8px 25px rgba(255, 20, 147, 0.5)';
      });

      document.body.appendChild(agentButton);
      this.agentButton = agentButton;
    }
  }

  addAgentCommands() {
    if (!this.terminal?.addCommand) return;

    // Agent chat command
    this.terminal.addCommand('agent', {
      description: 'Open AI Agent for advanced assistance',
      execute: async args => {
        if (args.length === 0) {
          this.toggleAgentPanel(true);
          return '🧜‍♀️ AI Agent panel opened. You can also ask questions directly: agent "your question"';
        } else {
          const query = args.join(' ');
          return await this.processAgentRequest(query, { fromTerminal: true });
        }
      },
    });

    // Quick analysis commands
    this.terminal.addCommand('analyze', {
      description: 'Analyze code or project with AI',
      execute: async args => {
        const request = `Analyze: ${args.join(' ')}`;
        return await this.processAgentRequest(request, { command: 'analyze' });
      },
    });

    this.terminal.addCommand('explain', {
      description: 'Get AI explanation of code, commands, or concepts',
      execute: async args => {
        const request = `Explain: ${args.join(' ')}`;
        return await this.processAgentRequest(request, { command: 'explain' });
      },
    });

    this.terminal.addCommand('debug', {
      description: 'Get AI help with debugging',
      execute: async args => {
        const request = `Help debug: ${args.join(' ')}`;
        return await this.processAgentRequest(request, { command: 'debug' });
      },
    });
  }

  async processAgentRequest(query, context = {}) {
    if (!query.trim()) return;

    this.isProcessing = true;
    this.addMessageToConversation('user', query);

    try {
      // Gather context about current state
      const systemContext = await this.gatherSystemContext();

      // Prepare the request with full context
      const fullContext = {
        ...context,
        ...systemContext,
        workingDirectory: this.workingDirectory,
        terminalHistory: this.getRecentTerminalHistory(),
        conversationHistory: this.conversationHistory.slice(-10), // Last 10 messages
      };

      // Process with AI (this would connect to your AI provider)
      const response = await this.callAIProvider(query, fullContext);

      this.addMessageToConversation('assistant', response);

      // Update conversation history
      this.conversationHistory.push({
        timestamp: new Date(),
        user: query,
        assistant: response,
        context: fullContext,
      });

      if (context.fromTerminal) {
        return `🧜‍♀️ ${response}`;
      }

      return response;
    } catch (error) {
      console.error('Agent processing error:', error);
      const errorMsg = '🧜‍♀️ Sorry, I encountered an error. Please try again.';
      this.addMessageToConversation('error', errorMsg);
      return errorMsg;
    } finally {
      this.isProcessing = false;
      this.updateProcessingState();
    }
  }

  async callAIProvider(query, context) {
    // This is where you'd integrate with your AI provider
    // For now, providing a structured response similar to how I work

    const prompt = this.buildAgentPrompt(query, context);

    // You would replace this with actual AI provider calls
    // For example, using your existing OpenAI integration:
    /*
    if (window.openaiClient) {
      return await window.openaiClient.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: this.getSystemPrompt() },
          { role: "user", content: prompt }
        ]
      });
    }
    */

    // Mock intelligent response for demonstration
    return this.generateMockIntelligentResponse(query, context);
  }

  buildAgentPrompt(query, context) {
    return `
I'm an AI assistant integrated into RinaWarp Terminal. I can help with:
- Code analysis and debugging
- File operations and searching  
- Terminal commands and workflows
- Architecture recommendations
- Best practices

Current context:
- Working Directory: ${context.workingDirectory}
- Operating System: ${context.os}
- Shell: ${context.shell}
- Recent Commands: ${context.terminalHistory?.slice(-5).join(', ') || 'None'}

User Query: ${query}

Please provide a helpful, concise response. If the query requires file operations, command execution, or code analysis, suggest the appropriate approach.
    `.trim();
  }

  generateMockIntelligentResponse(query, context) {
    // This provides intelligent mock responses based on query patterns
    // Replace with actual AI provider integration

    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('analyze') || lowerQuery.includes('code')) {
      return `I can analyze your code! Here's what I can do:

📁 **Project Analysis**: I can examine your project structure and identify patterns
🐛 **Bug Detection**: I can help find potential issues in your code
🏗️ **Architecture Review**: I can suggest improvements to your codebase structure
📊 **Code Quality**: I can check for best practices and code quality issues

To get started, you can:
- Use \`agent "analyze my current directory"\` to examine your project
- Show me specific files with \`cat filename.js\` and I'll review them
- Ask about specific errors or issues you're encountering

What would you like me to focus on?`;
    }

    if (
      lowerQuery.includes('debug') ||
      lowerQuery.includes('error') ||
      lowerQuery.includes('fix')
    ) {
      return `I'm here to help debug! 🔍

**Common debugging approaches I can assist with:**
- **Error Analysis**: Share error messages and I'll help interpret them
- **Code Review**: Show me problematic code and I'll identify issues
- **Logic Debugging**: Walk through your code logic step-by-step
- **Performance Issues**: Identify bottlenecks and optimization opportunities

**Next steps:**
1. Share the error message or problematic code
2. Describe what you expected vs. what's happening
3. Let me know what you've already tried

Paste your error or describe the issue, and I'll provide specific guidance!`;
    }

    if (
      lowerQuery.includes('explain') ||
      lowerQuery.includes('how') ||
      lowerQuery.includes('what')
    ) {
      return `I love explaining things! 💡

I can explain:
- **Code concepts** and programming patterns
- **Terminal commands** and their usage
- **Error messages** and what they mean
- **Architecture decisions** and trade-offs
- **Best practices** and why they matter

Just ask me about any concept, command, or code you'd like to understand better. For example:
- "Explain how async/await works"
- "What does this error mean: [error message]"
- "How does [specific command] work"

What would you like me to explain?`;
    }

    if (
      lowerQuery.includes('file') ||
      lowerQuery.includes('search') ||
      lowerQuery.includes('find')
    ) {
      return `I can help with file operations! 📂

**File Management:**
- **Search**: Find files by name, content, or pattern
- **Analysis**: Examine file structures and relationships
- **Organization**: Suggest better file organization
- **Cleanup**: Identify unused or duplicate files

**Useful commands to try:**
- \`find . -name "*.js"\` - Find all JavaScript files
- \`grep -r "function_name"\` - Search for function usage
- \`ls -la\` - List files with details

What file operation can I help you with?`;
    }

    // Generic helpful response
    return `Hello! I'm your AI assistant built into RinaWarp Terminal. 🧜‍♀️

I can help you with:
- **Code Analysis**: Review and improve your code
- **Debugging**: Find and fix issues
- **File Operations**: Search, organize, and manage files  
- **Terminal Commands**: Suggest and explain commands
- **Architecture**: Design patterns and best practices

Try asking me things like:
- "Analyze the code in my current directory"
- "Help me debug this error: [error message]"  
- "Find all Python files in this project"
- "Explain how to use git effectively"

What would you like help with today?`;
  }

  // Utility methods for agent functionality
  toggleAgentPanel(show = null) {
    const shouldShow = show !== null ? show : !this.agentPanelVisible;
    this.agentPanelVisible = shouldShow;

    if (this.agentPanel) {
      this.agentPanel.style.transform = shouldShow ? 'translateX(0)' : 'translateX(100%)';
    }
  }

  addMessageToConversation(sender, message) {
    const conversation = document.getElementById('agent-conversation');
    if (!conversation) return;

    const messageDiv = document.createElement('div');
    messageDiv.style.marginBottom = '10px';

    if (sender === 'user') {
      messageDiv.innerHTML = `<div style="
        background: linear-gradient(45deg, #ff1493, #00ffff);
        color: white;
        padding: 8px 12px;
        border-radius: 15px;
        margin-left: 20px;
        font-size: 14px;
      ">${this.escapeHtml(message)}</div>`;
    } else if (sender === 'error') {
      messageDiv.innerHTML = `<div style="
        background: #ff4444;
        color: white;
        padding: 8px 12px;
        border-radius: 15px;
        margin-right: 20px;
        font-size: 14px;
      ">${this.escapeHtml(message)}</div>`;
    } else {
      messageDiv.innerHTML = `<div style="
        background: rgba(255, 255, 255, 0.8);
        color: #333;
        padding: 8px 12px;
        border-radius: 15px;
        margin-right: 20px;
        font-size: 14px;
        white-space: pre-wrap;
      ">${this.escapeHtml(message)}</div>`;
    }

    conversation.appendChild(messageDiv);
    conversation.scrollTop = conversation.scrollHeight;

    // Clear input after sending
    if (sender === 'user') {
      const input = document.getElementById('agent-input');
      if (input) input.value = '';
    }
  }

  async gatherSystemContext() {
    return {
      timestamp: new Date().toISOString(),
      workingDirectory: this.workingDirectory,
      ...this.systemContext,
    };
  }

  getRecentTerminalHistory() {
    // This would integrate with your terminal's command history
    // Return recent commands for context
    return [];
  }

  updateProcessingState() {
    const sendBtn = document.getElementById('send-agent');
    const input = document.getElementById('agent-input');

    if (sendBtn && input) {
      sendBtn.disabled = this.isProcessing;
      input.disabled = this.isProcessing;
      sendBtn.textContent = this.isProcessing ? '...' : 'Send';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Tool implementations (these would integrate with your existing terminal capabilities)
  async readProjectFiles(filePaths) {
    // Implementation for reading files
    return { files: [], error: null };
  }

  async searchCodebase(query, options) {
    // Implementation for code searching
    return { results: [], error: null };
  }

  async executeCommand(command, options) {
    // Safe command execution
    return { output: '', error: null };
  }

  async analyzeProject() {
    // Project analysis implementation
    return { analysis: '', suggestions: [] };
  }

  async findFiles(patterns, path) {
    // File finding implementation
    return { files: [], error: null };
  }

  async performGitOperation(operation, args) {
    // Git operations implementation
    return { output: '', error: null };
  }

  getSystemPrompt() {
    return `You are an AI assistant integrated into RinaWarp Terminal, a beautiful and powerful terminal application. 

You have access to various tools and can help users with:
- Code analysis and debugging
- File operations and project management  
- Terminal commands and workflows
- Architecture recommendations and best practices

Always maintain the friendly, helpful personality that matches RinaWarp's beautiful design. Use the 🧜‍♀️ emoji when appropriate to maintain brand consistency.

Be concise but thorough, and always offer specific, actionable help.`;
  }
}
