/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 8 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal Agent Mode
 * Advanced AI agent system with function calling capabilities
 * Inspired by modern AI terminal assistants like Cursor Agent Mode
 */

const { EventEmitter } = require('events');

class AgentMode extends EventEmitter {
  constructor(terminalInstance) {
    super();
    this.terminal = terminalInstance;
    this.isActive = false;
    this.conversationHistory = [];
    this.contextManager = new AgentContextManager();
    this.functionRegistry = new AgentFunctionRegistry();
    this.activeSession = null;

    // Agent configuration
    this.config = {
      model: 'gpt-4-turbo',
      temperature: 0.3,
      maxTokens: 4096,
      systemPrompt: this.getSystemPrompt(),
      enableFunctionCalling: true,
      contextWindow: 50, // Number of previous exchanges to maintain
      autoExecute: false, // Whether to auto-execute safe commands
      confirmDangerous: true, // Always confirm dangerous operations
    };

    this.initialize();
  }

  async initialize() {
    // Register built-in functions
    await this.registerBuiltInFunctions();

    // Set up event listeners
    this.setupEventListeners();

    // Initialize UI components
    this.initializeUI();

  }

  getSystemPrompt() {
    return `You are Rina, an advanced AI assistant integrated into RinaWarp Terminal. You have access to powerful tools and can help users with:

🔧 TERMINAL OPERATIONS:
- Execute shell commands and scripts
- Navigate file systems
- Manage processes and services
- Monitor system resources

📁 FILE MANAGEMENT:
- Read, write, and edit files
- Search file contents
- Organize directory structures
- Handle file permissions

🔗 GIT & VERSION CONTROL:
- Repository management
- Commit history analysis
- Branch operations
- Merge conflict resolution

🚀 DEVELOPMENT TASKS:
- Code analysis and debugging
- Project setup and configuration
- Package management
- Testing and deployment

🧠 INTELLIGENT ASSISTANCE:
- Explain complex commands
- Suggest optimal solutions
- Provide context-aware help
- Learn from user patterns

IMPORTANT GUIDELINES:
- Always confirm before executing potentially dangerous operations
- Use appropriate tools for each task
- Provide clear explanations for your actions
- Ask for clarification when requirements are ambiguous
- Maintain context across the conversation
- Be proactive in suggesting improvements

You can use function calls to interact with the terminal and file system. Always explain what you're doing and why.`;
  }

  async registerBuiltInFunctions() {
    // Terminal command execution
    this.functionRegistry.register('execute_command', {
      description: 'Execute a shell command in the terminal',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute',
          },
          confirm: {
            type: 'boolean',
            description: 'Whether to ask for user confirmation',
            default: false,
          },
          workingDirectory: {
            type: 'string',
            description: 'Directory to execute the command in',
          },
        },
        required: ['command'],
      },
      handler: this.executeCommand.bind(this),
      category: 'terminal',
      riskLevel: 'medium',
    });

    // File operations
    this.functionRegistry.register('read_file', {
      description: 'Read the contents of a file',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to read',
          },
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
      handler: this.readFile.bind(this),
      category: 'file',
      riskLevel: 'low',
    });

    this.functionRegistry.register('write_file', {
      description: 'Write content to a file',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to the file to write',
          },
          content: {
            type: 'string',
            description: 'Content to write to the file',
          },
          mode: {
            type: 'string',
            enum: ['overwrite', 'append'],
            description: 'Write mode - overwrite or append',
            default: 'overwrite',
          },
        },
        required: ['path', 'content'],
      },
      handler: this.writeFile.bind(this),
      category: 'file',
      riskLevel: 'high',
    });

    // File search and grep
    this.functionRegistry.register('search_files', {
      description: 'Search for text patterns in files',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Text pattern or regex to search for',
          },
          path: {
            type: 'string',
            description: 'Directory or file path to search in',
            default: '.',
          },
          filePattern: {
            type: 'string',
            description: 'File name pattern to filter (e.g., "*.js")',
          },
          recursive: {
            type: 'boolean',
            description: 'Search recursively in subdirectories',
            default: true,
          },
        },
        required: ['pattern'],
      },
      handler: this.searchFiles.bind(this),
      category: 'search',
      riskLevel: 'low',
    });

    // Git operations
    this.functionRegistry.register('git_status', {
      description: 'Get git repository status',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Repository path',
            default: '.',
          },
        },
      },
      handler: this.gitStatus.bind(this),
      category: 'git',
      riskLevel: 'low',
    });

    // System information
    this.functionRegistry.register('get_system_info', {
      description: 'Get system information and resource usage',
      parameters: {
        type: 'object',
        properties: {
          includeProcesses: {
            type: 'boolean',
            description: 'Include running processes',
            default: false,
          },
        },
      },
      handler: this.getSystemInfo.bind(this),
      category: 'system',
      riskLevel: 'low',
    });

    // Directory operations
    this.functionRegistry.register('list_directory', {
      description: 'List directory contents with detailed information',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path to list',
            default: '.',
          },
          showHidden: {
            type: 'boolean',
            description: 'Include hidden files',
            default: false,
          },
          detailed: {
            type: 'boolean',
            description: 'Show detailed file information',
            default: true,
          },
        },
      },
      handler: this.listDirectory.bind(this),
      category: 'file',
      riskLevel: 'low',
    });
  }

  setupEventListeners() {
    // Listen for terminal events
    this.terminal.on('command', data => {
      if (this.isActive) {
        this.contextManager.addCommand(data);
      }
    });

    this.terminal.on('output', data => {
      if (this.isActive) {
        this.contextManager.addOutput(data);
      }
    });

    // Listen for directory changes
    this.terminal.on('directoryChanged', data => {
      this.contextManager.updateWorkingDirectory(data.path);
    });
  }

  initializeUI() {
    // Create agent mode UI elements
    this.ui = {
      statusIndicator: this.createStatusIndicator(),
      chatInterface: this.createChatInterface(),
      confirmDialog: this.createConfirmDialog(),
    };
  }

  // Main agent interaction method
  async chat(userMessage, options = {}) {
    if (!this.isActive) {
      return {
        success: false,
        error: 'Agent Mode is not active. Use "agent start" to begin.',
      };
    }

    try {
      // Create or continue session
      if (!this.activeSession) {
        this.activeSession = new AgentSession(this);
      }

      // Add user message to conversation
      this.conversationHistory.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
        context: await this.contextManager.getCurrentContext(),
      });

      // Get AI response with function calling
      const response = await this.generateResponse(userMessage, options);

      // Process any function calls
      if (response.functionCalls && response.functionCalls.length > 0) {
        const functionResults = await this.executeFunctionCalls(response.functionCalls);
        response.functionResults = functionResults;

        // Generate follow-up response based on function results
        if (functionResults.some(r => r.success)) {
          const followUp = await this.generateFollowUpResponse(response, functionResults);
          response.followUpMessage = followUp.content;
        }
      }

      // Add assistant response to conversation
      this.conversationHistory.push({
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
        functionCalls: response.functionCalls,
        functionResults: response.functionResults,
      });

      // Emit events
      this.emit('agent:response', response);

      return {
        success: true,
        response: response,
        sessionId: this.activeSession.id,
      };
    } catch (error) {
      console.error('Agent chat error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async generateResponse(userMessage, options = {}) {
    // Prepare messages for AI
    const messages = this.prepareMessages(userMessage);

    // Get available functions
    const functions = this.functionRegistry.getFunctionDefinitions();

    // Call AI provider (OpenAI/Claude/etc.)
    const aiResponse = await this.callAIProvider({
      messages,
      functions,
      ...this.config,
      ...options,
    });

    return this.parseAIResponse(aiResponse);
  }

  prepareMessages(userMessage) {
    const messages = [
      {
        role: 'system',
        content: this.config.systemPrompt,
      },
    ];

    // Add context information
    const context = this.contextManager.getCurrentContext();
    if (context) {
      messages.push({
        role: 'system',
        content: `Current Context:
Working Directory: ${context.workingDirectory}
Recent Commands: ${context.recentCommands.slice(-3).join(', ')}
Git Status: ${context.gitInfo ? 'Repository detected' : 'No git repository'}
System: ${context.platform} ${context.arch}`,
      });
    }

    // Add conversation history (limited by context window)
    const recentHistory = this.conversationHistory.slice(-this.config.contextWindow);
    messages.push(
      ...recentHistory.map(entry => ({
        role: entry.role,
        content: entry.content,
      }))
    );

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    return messages;
  }

  async callAIProvider(requestData) {
    // This would integrate with your existing AI providers
    // For now, we'll use a mock response structure

    // In a real implementation, this would call:
    // - OpenAI API with function calling
    // - Anthropic Claude with tool use
    // - Local models via Ollama
    // - Your existing AI provider system

    const response = await fetch('/api/ai/agent-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(new Error(new Error(`AI provider error: ${response.statusText}`)));
    }

    return await response.json();
  }

  parseAIResponse(aiResponse) {
    return {
      content: aiResponse.content || aiResponse.message?.content || '',
      functionCalls: aiResponse.function_calls || aiResponse.tool_calls || [],
      usage: aiResponse.usage,
      model: aiResponse.model,
    };
  }

  async executeFunctionCalls(functionCalls) {
    const results = [];

    for (const call of functionCalls) {
      try {
        const func = this.functionRegistry.getFunction(call.name || call.function?.name);
        if (!func) {
          results.push({
            success: false,
            error: `Function ${call.name} not found`,
            functionName: call.name,
          });
          continue;
        }

        // Check if confirmation is needed
        const args = call.arguments || call.function?.arguments;
        if (func.riskLevel === 'high' && this.config.confirmDangerous) {
          const confirmed = await this.confirmAction(call.name, args, func.description);
          if (!confirmed) {
            results.push({
              success: false,
              error: 'User cancelled operation',
              functionName: call.name,
            });
            continue;
          }
        }

        // Execute function
        const result = await func.handler(args);
        results.push({
          success: true,
          result: result,
          functionName: call.name,
        });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          functionName: call.name,
        });
      }
    }

    return results;
  }

  async generateFollowUpResponse(originalResponse, functionResults) {
    const resultsContext = functionResults
      .map(r => {
        if (r.success) {
          return `${r.functionName}: Success - ${JSON.stringify(r.result).slice(0, 200)}`;
        } else {
          return `${r.functionName}: Error - ${r.error}`;
        }
      })
      .join('\n');

    const followUpPrompt = `Based on these function execution results, provide a helpful summary and next steps:

${resultsContext}

Original request context: ${originalResponse.content.slice(0, 100)}...

Please summarize what was accomplished and suggest logical next steps if appropriate.`;

    const response = await this.callAIProvider({
      messages: [
        { role: 'system', content: 'You are helping summarize the results of executed functions.' },
        { role: 'user', content: followUpPrompt },
      ],
      functions: [], // No function calling for follow-up
      maxTokens: 500,
    });

    return this.parseAIResponse(response);
  }

  // Function implementations
  async executeCommand(args) {
    const { command, workingDirectory } = args;

    // Validate command safety
    if (this.isDangerousCommand(command)) {
      throw new Error(new Error(new Error(`Command potentially dangerous: ${command}`)));
    }

    try {
      const result = await this.terminal.executeCommand(command, {
        cwd: workingDirectory,
        captureOutput: true,
      });

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        command: command,
      };
    } catch (error) {
      throw new Error(new Error(new Error(`Command execution failed: ${error.message}`)));
    }
  }

  async readFile(args) {
    const { path, lines } = args;

    try {
      // Use terminal's file reading capability or Node.js fs
      const content = await this.terminal.readFile(path);

      if (lines) {
        const fileLines = content.split('\n');
        const start = Math.max(0, (lines.start || 1) - 1);
        const end = Math.min(fileLines.length, lines.end || fileLines.length);
        return {
          content: fileLines.slice(start, end).join('\n'),
          totalLines: fileLines.length,
          requestedRange: `${start + 1}-${end}`,
        };
      }

      return {
        content: content,
        size: content.length,
        lines: content.split('\n').length,
      };
    } catch (error) {
      throw new Error(new Error(new Error(`Failed to read file ${path}: ${error.message}`)));
    }
  }

  async writeFile(args) {
    const { path, content, mode } = args;

    try {
      await this.terminal.writeFile(path, content, { mode });
      return {
        path: path,
        bytesWritten: content.length,
        mode: mode,
      };
    } catch (error) {
      throw new Error(new Error(new Error(`Failed to write file ${path}: ${error.message}`)));
    }
  }

  async searchFiles(args) {
    const { pattern, path, filePattern, recursive } = args;

    try {
      const grepCmd = `grep -${recursive ? 'r' : ''}n "${pattern}" ${path || '.'} ${filePattern ? `--include="${filePattern}"` : ''}`;
      const result = await this.executeCommand({ command: grepCmd });

      const matches = result.stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [file, lineNum, ...content] = line.split(':');
          return {
            file: file,
            line: parseInt(lineNum),
            content: content.join(':').trim(),
          };
        });

      return {
        pattern: pattern,
        matches: matches,
        totalMatches: matches.length,
      };
    } catch (error) {
      return { matches: [], totalMatches: 0, error: error.message };
    }
  }

  async gitStatus(args) {
    const { path } = args;

    try {
      const result = await this.executeCommand({
        command: 'git status --porcelain',
        workingDirectory: path,
      });

      const files = result.stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => ({
          status: line.slice(0, 2),
          file: line.slice(3),
        }));

      return {
        files: files,
        clean: files.length === 0,
        branch: await this.getCurrentBranch(path),
      };
    } catch (error) {
      throw new Error(new Error(new Error(`Git status failed: ${error.message}`)));
    }
  }

  async getCurrentBranch(path) {
    try {
      const result = await this.executeCommand({
        command: 'git branch --show-current',
        workingDirectory: path,
      });
      return result.stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  async getSystemInfo(args) {
    const { includeProcesses } = args;

    try {
      const info = {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cwd: process.cwd(),
      };

      if (includeProcesses) {
        const psResult = await this.executeCommand({ command: 'ps aux' });
        info.processes = psResult.stdout.split('\n').slice(1, 11); // Top 10 processes
      }

      return info;
    } catch (error) {
      throw new Error(new Error(new Error(`Failed to get system info: ${error.message}`)));
    }
  }

  async listDirectory(args) {
    const { path, showHidden, detailed } = args;

    try {
      const lsCmd = `ls ${detailed ? '-la' : '-l'} ${showHidden ? '-a' : ''} "${path || '.'}"`;
      const result = await this.executeCommand({ command: lsCmd });

      return {
        path: path || '.',
        contents: result.stdout,
        itemCount: result.stdout.split('\n').length - 1,
      };
    } catch (error) {
      throw new Error(new Error(new Error(`Failed to list directory: ${error.message}`)));
    }
  }

  // Agent control methods
  async start() {
    if (this.isActive) {
      return { success: false, message: 'Agent Mode is already active' };
    }

    this.isActive = true;
    this.activeSession = new AgentSession(this);

    // Show welcome message
    const welcomeMessage = `🤖 **Agent Mode Activated**

I'm Rina, your AI terminal assistant. I can help you with:

• **Command execution** - Run shell commands safely
• **File operations** - Read, write, and manage files  
• **Code analysis** - Review and improve your code
• **Git operations** - Repository management
• **System monitoring** - Check resources and processes
• **Project assistance** - Setup, debugging, and optimization

**Available Commands:**
- \`agent help\` - Show detailed help
- \`agent status\` - Check agent status  
- \`agent stop\` - Deactivate agent mode
- \`agent functions\` - List available functions

Just chat naturally - I'll understand what you need! 🚀`;

    this.terminal.writeLine(welcomeMessage);
    this.emit('agent:started');

    return {
      success: true,
      message: 'Agent Mode activated',
      sessionId: this.activeSession.id,
    };
  }

  async stop() {
    if (!this.isActive) {
      return { success: false, message: 'Agent Mode is not active' };
    }

    this.isActive = false;
    if (this.activeSession) {
      await this.activeSession.close();
      this.activeSession = null;
    }

    this.terminal.writeLine('🤖 Agent Mode deactivated. Type "agent start" to reactivate.');
    this.emit('agent:stopped');

    return { success: true, message: 'Agent Mode deactivated' };
  }

  getStatus() {
    return {
      active: this.isActive,
      sessionId: this.activeSession?.id,
      conversationLength: this.conversationHistory.length,
      availableFunctions: this.functionRegistry.getFunctionCount(),
      context: this.contextManager.getCurrentContext(),
    };
  }

  // Utility methods
  isDangerousCommand(command) {
    const dangerousPatterns = [
      /rm\s+-rf\s+\//, // rm -rf /
      /sudo\s+rm/, // sudo rm
      />\s*\/dev\/sda/, // Write to disk devices
      /dd\s+if=.*of=\/dev\//, // dd to devices
      /mkfs/, // Format filesystem
      /fdisk/, // Disk partitioning
      /shutdown/, // System shutdown
      /reboot/, // System reboot
      /halt/, // System halt
    ];

    return dangerousPatterns.some(pattern => pattern.test(command));
  }

  async confirmAction(functionName, args, description) {
    return new Promise(resolve => {
      const confirmDialog = this.ui.confirmDialog;
      confirmDialog.show({
        title: 'Confirm Action',
        message: `The AI wants to execute: ${functionName}`,
        details: `${description}\n\nArguments: ${JSON.stringify(args, null, 2)}`,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }

  createStatusIndicator() {
    // Create UI status indicator (implementation depends on your UI framework)
    return {
      show: () => {},
      hide: () => {},
      updateStatus: _status => {},
    };
  }

  createChatInterface() {
    // Create chat UI interface
    return {
      show: () => {},
      hide: () => {},
      addMessage: (_message, _sender) => {},
    };
  }

  createConfirmDialog() {
    // Create confirmation dialog
    return {
      show: options => {
        // For now, use terminal input
        this.terminal.question(
          `${options.message}\n${options.details}\n\nConfirm? (y/N): `,
          answer => {
            if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
              options.onConfirm();
            } else {
              options.onCancel();
            }
          }
        );
      },
    };
  }
}

// Context Manager Class
class AgentContextManager {
  constructor() {
    this.context = {
      workingDirectory: process.cwd(),
      recentCommands: [],
      recentOutputs: [],
      environmentVariables: process.env,
      platform: process.platform,
      arch: process.arch,
      gitInfo: null,
    };
  }

  async getCurrentContext() {
    // Update git info if in a git repository
    try {
      const gitStatus = await this.checkGitStatus();
      this.context.gitInfo = gitStatus;
    } catch {
      this.context.gitInfo = null;
    }

    return { ...this.context };
  }

  addCommand(command) {
    this.context.recentCommands.push({
      command: command,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 10 commands
    if (this.context.recentCommands.length > 10) {
      this.context.recentCommands.shift();
    }
  }

  addOutput(output) {
    this.context.recentOutputs.push({
      output: output.slice(0, 500), // Limit output size
      timestamp: new Date().toISOString(),
    });

    // Keep only last 5 outputs
    if (this.context.recentOutputs.length > 5) {
      this.context.recentOutputs.shift();
    }
  }

  updateWorkingDirectory(path) {
    this.context.workingDirectory = path;
  }

  async checkGitStatus() {
    // This would check if current directory is a git repo
    // Implementation depends on your terminal's capabilities
    return null;
  }
}

// Function Registry Class
class AgentFunctionRegistry {
  constructor() {
    this.functions = new Map();
  }

  register(name, definition) {
    this.functions.set(name, definition);
  }

  getFunction(name) {
    return this.functions.get(name);
  }

  getFunctionDefinitions() {
    return Array.from(this.functions.entries()).map(([name, def]) => ({
      name,
      description: def.description,
      parameters: def.parameters,
    }));
  }

  getFunctionCount() {
    return this.functions.size;
  }

  getFunctionsByCategory(category) {
    return Array.from(this.functions.entries())
      .filter(([, def]) => def.category === category)
      .map(([name]) => name);
  }
}

// Agent Session Class
class AgentSession {
  constructor(agentMode) {
    this.id = this.generateSessionId();
    this.agentMode = agentMode;
    this.startTime = new Date();
    this.messageCount = 0;
    this.functionCallCount = 0;
  }

  generateSessionId() {
    return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async close() {
    const _duration = new Date() - this.startTime;
  }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AgentMode;
  module.exports.AgentContextManager = AgentContextManager;
  module.exports.AgentFunctionRegistry = AgentFunctionRegistry;
  module.exports.AgentSession = AgentSession;
  module.exports.default = AgentMode;
}
