import { getCommandPrediction, explainCommand, getWorkflowAutomation } from './openaiClient.js';

/**
 * 🤖 RinaWarp Terminal AI Assistant
 * Handles natural language processing and AI-powered terminal interactions
 */
export class TerminalAIAssistant {
  constructor() {
    this.commandHistory = [];
    this.conversationHistory = [];
    this.isActive = true;
    this.currentContext = {
      pwd: '~',
      shell: 'bash',
      lastCommand: null,
      systemInfo: {},
    };

    this.initializePatterns();
  }

  initializePatterns() {
    // Natural language patterns for common terminal operations
    this.languagePatterns = {
      // File operations
      listFiles: /(?:show|list|display|see)\s+(?:files|contents|directory|folder)/i,
      createFile: /(?:create|make|new)\s+(?:file|document)/i,
      deleteFile: /(?:delete|remove|rm)\s+(?:file|files)/i,
      copyFile: /(?:copy|duplicate)\s+(?:file|files)/i,
      moveFile: /(?:move|rename)\s+(?:file|files)/i,

      // Navigation
      changeDirectory: /(?:go to|navigate to|cd to|change to)\s+(?:directory|folder|dir)/i,
      goHome: /(?:go home|home directory)/i,
      goUp: /(?:go up|parent directory|go back)/i,

      // Git operations
      gitStatus: /(?:git status|check git|git state|repository status)/i,
      gitAdd: /(?:git add|stage files|add to git)/i,
      gitCommit: /(?:git commit|commit changes|save changes)/i,
      gitPush: /(?:git push|push to remote|upload changes)/i,
      gitPull: /(?:git pull|pull changes|download changes)/i,

      // System info
      systemInfo: /(?:system info|system status|computer info|machine info)/i,
      processes: /(?:show processes|list processes|running programs)/i,
      diskSpace: /(?:disk space|storage|free space)/i,

      // Package management
      npmInstall: /(?:install|npm install|add package)/i,
      npmRun: /(?:run script|npm run|execute script)/i,

      // Help and explanations
      help: /(?:help|assist|what can you do|commands)/i,
      explain: /(?:explain|what does|how does|what is)/i,

      // Conversational
      greeting: /(?:hello|hi|hey|good morning|good afternoon)/i,
      thanks: /(?:thank you|thanks|appreciate)/i,
      goodbye: /(?:bye|goodbye|see you|exit|quit)/i,
    };

    // Command suggestions based on context
    this.contextualSuggestions = {
      git: ['git status', 'git add .', 'git commit -m "message"', 'git push'],
      npm: ['npm install', 'npm start', 'npm test', 'npm run build'],
      file: ['ls -la', 'pwd', 'mkdir', 'touch', 'cat', 'rm'],
      system: ['top', 'df -h', 'ps aux', 'whoami', 'uname -a'],
    };
  }

  /**
   * Process natural language input and convert to terminal commands
   */
  async processNaturalLanguage(input) {
    const cleanInput = input.trim().toLowerCase();

    // Check for direct patterns first
    const directCommand = this.matchDirectPatterns(cleanInput);
    if (directCommand) {
      return {
        type: 'command',
        command: directCommand,
        explanation: await this.getCommandExplanation(directCommand),
        confidence: 0.9,
      };
    }

    // Check for conversational responses
    const conversationalResponse = this.handleConversational(cleanInput);
    if (conversationalResponse) {
      return {
        type: 'response',
        message: conversationalResponse,
        confidence: 0.8,
      };
    }

    // Use AI for complex queries
    try {
      const aiCommand = await getCommandPrediction(input, this.getContextString());
      return {
        type: 'ai_command',
        command: aiCommand,
        explanation: await this.getCommandExplanation(aiCommand),
        confidence: 0.7,
      };
    } catch (error) {
      return {
        type: 'fallback',
        message: `I couldn't understand that. Try: ${this.getSuggestion()}`,
        confidence: 0.3,
      };
    }
  }

  matchDirectPatterns(input) {
    const patterns = this.languagePatterns;

    if (patterns.listFiles.test(input)) {
      return 'ls -la';
    }
    if (patterns.gitStatus.test(input)) {
      return 'git status';
    }
    if (patterns.systemInfo.test(input)) {
      return 'uname -a && whoami && pwd';
    }
    if (patterns.processes.test(input)) {
      return 'ps aux | head -10';
    }
    if (patterns.diskSpace.test(input)) {
      return 'df -h';
    }
    if (patterns.goHome.test(input)) {
      return 'cd ~';
    }
    if (patterns.goUp.test(input)) {
      return 'cd ..';
    }
    if (patterns.help.test(input)) {
      return null; // Handle as conversational
    }

    // Extract file names or paths from input
    if (patterns.createFile.test(input)) {
      const fileName = this.extractFileName(input);
      return fileName ? `touch ${fileName}` : 'touch newfile.txt';
    }

    if (patterns.changeDirectory.test(input)) {
      const dirName = this.extractDirectoryName(input);
      return dirName ? `cd ${dirName}` : 'cd';
    }

    return null;
  }

  handleConversational(input) {
    const patterns = this.languagePatterns;

    if (patterns.greeting.test(input)) {
      return "👋 Hello! I'm Rina, your AI terminal assistant. I can help you with commands, explain what they do, or just chat. What would you like to do?";
    }

    if (patterns.help.test(input)) {
      return `🤖 I can help you with:
• Natural language commands: "list files", "check git status"
• Explain commands: "explain ls -la"
• Suggest workflows based on your history
• System information and troubleshooting
• Package management and git operations

Just type naturally - I'll understand!`;
    }

    if (patterns.thanks.test(input)) {
      return "😊 You're welcome! Anything else I can help with?";
    }

    if (patterns.goodbye.test(input)) {
      return "👋 Goodbye! Type 'rina' anytime to chat again.";
    }

    return null;
  }

  extractFileName(input) {
    // Simple extraction - look for quoted strings or common file extensions
    const quoted = input.match(/"([^"]+)"|'([^']+)'/);
    if (quoted) return quoted[1] || quoted[2];

    const fileMatch = input.match(/(\w+\.\w+)/);
    if (fileMatch) return fileMatch[1];

    return null;
  }

  extractDirectoryName(input) {
    // Extract directory names from input
    const quoted = input.match(/"([^"]+)"|'([^']+)'/);
    if (quoted) return quoted[1] || quoted[2];

    const pathMatch = input.match(/(?:to|into)\s+([^\s]+)/);
    if (pathMatch) return pathMatch[1];

    return null;
  }

  async getCommandExplanation(command) {
    try {
      return await explainCommand(command);
    } catch (error) {
      return `Command: ${command}`;
    }
  }

  getContextString() {
    return `Current directory: ${this.currentContext.pwd}, Shell: ${this.currentContext.shell}`;
  }

  getSuggestion() {
    const suggestions = [
      '"list files"',
      '"check git status"',
      '"show system info"',
      'or type "help" for more options',
    ];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }

  /**
   * Add command to history for learning
   */
  addToHistory(command) {
    this.commandHistory.push({
      command,
      timestamp: new Date().toISOString(),
      context: { ...this.currentContext },
    });

    // Keep only last 50 commands
    if (this.commandHistory.length > 50) {
      this.commandHistory = this.commandHistory.slice(-50);
    }
  }

  /**
   * Update context information
   */
  updateContext(updates) {
    this.currentContext = { ...this.currentContext, ...updates };
  }

  /**
   * Get workflow suggestions based on command history
   */
  async getWorkflowSuggestions() {
    if (this.commandHistory.length < 3) {
      return {
        suggestions: [],
        message: 'Build up some command history first, then I can suggest workflows!',
      };
    }

    try {
      const recentCommands = this.commandHistory.slice(-10).map(h => h.command);

      return await getWorkflowAutomation(recentCommands);
    } catch (error) {
      return {
        suggestions: [],
        error: error.message,
      };
    }
  }

  /**
   * Check if input is a natural language query vs direct command
   */
  isNaturalLanguage(input) {
    // Simple heuristics to detect natural language
    const indicators = [
      /\b(?:can you|could you|please|how do i|how to|what is|show me|tell me)\b/i,
      /\b(?:list|show|display|create|make|delete|remove|copy|move)\b.*\b(?:files?|directories?|folders?)\b/i,
      /\?$/, // Questions
      input.split(' ').length > 3, // Multi-word phrases
    ];

    return indicators.some(pattern => pattern.test(input));
  }

  /**
   * Generate intelligent command completions
   */
  getCommandCompletions(partial) {
    const suggestions = [];

    // Add context-appropriate suggestions
    Object.entries(this.contextualSuggestions).forEach(([category, commands]) => {
      commands.forEach(cmd => {
        if (cmd.startsWith(partial)) {
          suggestions.push({
            command: cmd,
            category,
            description: `${category} command`,
          });
        }
      });
    });

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }
}
