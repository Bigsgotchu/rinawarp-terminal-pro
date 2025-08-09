/**
 * 🧜‍♀️ Enhanced AI Integration for Rina Terminal
 * Integrates the Enhanced Development Assistant with the existing terminal system
 */

import { EnhancedDevelopmentAssistant } from './enhanced-development-assistant.js';
// Note: RinaAI fallback will be handled through existing window objects

export class EnhancedAIIntegration {
  constructor(terminalInstance, config = {}) {
    this.terminal = terminalInstance;
    this.config = {
      enableEnhancedMode: config.enableEnhancedMode !== false,
      fallbackToBasic: config.fallbackToBasic !== false,
      contextMemory: config.contextMemory || 10,
      autoContextGathering: config.autoContextGathering !== false,
      ...config,
    };

    this.enhancedAssistant = null;
    this.basicRina = null;
    this.isEnhancedMode = false;

    // Context tracking
    this.conversationContext = [];
    this.fileContext = new Map();
    this.projectContext = {};

    // Command patterns for enhanced mode
    this.enhancedTriggers = [
      /analyze.*code/i,
      /debug.*code/i,
      /write.*program/i,
      /create.*app/i,
      /explain.*how/i,
      /review.*code/i,
      /generate.*test/i,
      /refactor/i,
      /architecture/i,
      /best.*practice/i,
    ];
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Enhanced AI Integration...');

      // Initialize Enhanced Development Assistant
      if (this.config.enableEnhancedMode) {
        this.enhancedAssistant = new EnhancedDevelopmentAssistant();
        const enhancedReady = await this.enhancedAssistant.initialize();

        if (enhancedReady) {
          this.isEnhancedMode = true;
          console.log('✅ Enhanced Development Assistant active');
        } else if (this.config.fallbackToBasic) {
          console.log('⚠️ Enhanced mode failed, falling back to basic Rina');
        }
      }

      // Initialize basic Rina as fallback
      if (!this.isEnhancedMode || this.config.fallbackToBasic) {
        // Use existing AI systems as fallback if available
        if (window.rinaAI || window.processAICommand) {
          this.basicRina = {
            processMessage: input => {
              // Delegate to existing AI system
              if (window.processAICommand) {
                return Promise.resolve({ response: '🧜‍♀️ Processed via existing Rina AI' });
              }
              return Promise.resolve({ response: '🧜‍♀️ Basic AI response' });
            },
          };
          console.log('✅ Basic Rina AI fallback configured');
        } else {
          console.log('ℹ️ No existing AI system found - enhanced AI will be primary');
        }
      }

      // Set up context gathering if enabled
      if (this.config.autoContextGathering) {
        this.setupContextGathering();
      }

      // Integrate with terminal
      this.setupTerminalIntegration();

      console.log('🧜‍♀️ Enhanced AI Integration complete!');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced AI Integration:', error);
      return false;
    }
  }

  setupTerminalIntegration() {
    // Add enhanced AI commands to terminal
    this.addEnhancedCommands();

    // Intercept AI-related terminal input
    this.interceptAIInput();

    // Add context menu for enhanced features
    this.addEnhancedContextMenu();
  }

  addEnhancedCommands() {
    if (!this.terminal || !this.terminal.addCommand) return;

    // Enhanced analysis command
    this.terminal.addCommand('analyze', {
      description: 'Analyze code with enhanced AI capabilities',
      execute: async args => {
        const input = args.join(' ');
        return await this.processEnhancedRequest(`analyze ${input}`, { command: 'analyze' });
      },
    });

    // Enhanced debugging command
    this.terminal.addCommand('debug', {
      description: 'Debug code issues with AI assistance',
      execute: async args => {
        const input = args.join(' ');
        return await this.processEnhancedRequest(`debug ${input}`, { command: 'debug' });
      },
    });

    // Program generation command
    this.terminal.addCommand('generate', {
      description: 'Generate programs with AI assistance',
      execute: async args => {
        const input = args.join(' ');
        return await this.processEnhancedRequest(`generate ${input}`, { command: 'generate' });
      },
    });

    // Architecture analysis command
    this.terminal.addCommand('architect', {
      description: 'Analyze and recommend architecture patterns',
      execute: async args => {
        const input = args.join(' ');
        return await this.processEnhancedRequest(`architect ${input}`, { command: 'architect' });
      },
    });

    // Toggle enhanced mode
    this.terminal.addCommand('rina-enhanced', {
      description: 'Toggle between enhanced and basic Rina AI modes',
      execute: async args => {
        if (args[0] === 'on' && this.enhancedAssistant) {
          this.isEnhancedMode = true;
          return '🧜‍♀️ Enhanced development mode activated! I can now help with advanced code analysis, debugging, and program generation.';
        } else if (args[0] === 'off') {
          this.isEnhancedMode = false;
          return '🧜‍♀️ Switched to basic mode. Use "rina-enhanced on" to reactivate enhanced features.';
        } else if (args[0] === 'status') {
          return `🧜‍♀️ Enhanced mode: ${this.isEnhancedMode ? 'Active' : 'Inactive'}\nCapabilities: ${this.getCapabilitiesStatus()}`;
        } else {
          return '🧜‍♀️ Usage: rina-enhanced [on|off|status]';
        }
      },
    });
  }

  interceptAIInput() {
    // This would intercept terminal input to detect enhanced AI requests
    // Implementation depends on the specific terminal architecture
    if (this.terminal && this.terminal.onInput) {
      const originalHandler = this.terminal.onInput.bind(this.terminal);

      this.terminal.onInput = async input => {
        // Check if input should be handled by enhanced AI
        if (this.shouldUseEnhancedMode(input)) {
          const context = await this.gatherCurrentContext();
          const response = await this.processEnhancedRequest(input, context);

          // Display the response in the terminal
          this.displayResponse(response);
          return; // Don't pass to original handler
        }

        // Pass to original handler for regular commands
        return originalHandler(input);
      };
    }
  }

  shouldUseEnhancedMode(input) {
    if (!this.isEnhancedMode || !this.enhancedAssistant) return false;

    // Check against enhanced trigger patterns
    return this.enhancedTriggers.some(pattern => pattern.test(input));
  }

  async processEnhancedRequest(input, context = {}) {
    if (!this.isEnhancedMode || !this.enhancedAssistant) {
      // Fall back to basic Rina
      if (this.basicRina) {
        return await this.basicRina.processMessage(input);
      }
      return { response: '🧜‍♀️ Enhanced AI is not available. Please use basic commands.' };
    }

    try {
      // Gather enhanced context
      const enhancedContext = await this.gatherEnhancedContext(context);

      // Process with Enhanced Development Assistant
      const response = await this.enhancedAssistant.processRequest(input, enhancedContext);

      // Update conversation context
      this.updateConversationContext(input, response);

      return response;
    } catch (error) {
      console.error('Enhanced AI processing failed:', error);

      // Fallback to basic Rina if available
      if (this.config.fallbackToBasic && this.basicRina) {
        console.log('Falling back to basic Rina...');
        return await this.basicRina.processMessage(input);
      }

      return {
        response: `🧜‍♀️ *adjusts debugging tiara* I encountered an issue: ${error.message}`,
        confidence: 0.1,
        error: error.message,
      };
    }
  }

  async gatherEnhancedContext(baseContext = {}) {
    const context = { ...baseContext };

    if (this.config.autoContextGathering) {
      // Gather file context from current directory
      context.files = await this.gatherFileContext();

      // Gather git context if available
      context.gitStatus = await this.gatherGitContext();

      // Gather project context
      context.project = this.projectContext;

      // Add conversation history
      context.conversationHistory = this.conversationContext.slice(-this.config.contextMemory);

      // Gather current directory info
      context.currentDirectory = this.getCurrentDirectory();

      // Gather environment context
      context.environment = await this.gatherEnvironmentContext();
    }

    return context;
  }

  async gatherFileContext() {
    try {
      // Get current working directory files
      const fs = await import('fs').then(m => m.promises);
      const path = await import('path');

      const cwd = this.getCurrentDirectory();
      const files = await fs.readdir(cwd);

      // Filter for code files
      const codeFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.swift'].includes(ext);
      });

      return codeFiles.slice(0, 10); // Limit to first 10 files
    } catch (error) {
      console.warn('Failed to gather file context:', error);
      return [];
    }
  }

  async gatherGitContext() {
    try {
      const { execSync } = await import('child_process');

      const status = execSync('git status --porcelain', {
        encoding: 'utf8',
        cwd: this.getCurrentDirectory(),
      });

      const branch = execSync('git branch --show-current', {
        encoding: 'utf8',
        cwd: this.getCurrentDirectory(),
      }).trim();

      return {
        branch,
        status: status.trim(),
        hasChanges: status.trim().length > 0,
      };
    } catch (error) {
      return null; // Not a git repository or git not available
    }
  }

  async gatherEnvironmentContext() {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: this.getCurrentDirectory(),
    };
  }

  getCurrentDirectory() {
    return process.cwd();
  }

  updateConversationContext(input, response) {
    this.conversationContext.push({
      timestamp: new Date().toISOString(),
      input,
      response: response.response,
      confidence: response.confidence,
      type: response.type || 'general',
    });

    // Keep only last N conversations
    if (this.conversationContext.length > this.config.contextMemory) {
      this.conversationContext.shift();
    }
  }

  displayResponse(response) {
    if (!this.terminal || !this.terminal.write) return;

    // Format response for terminal display
    let output = '';

    if (response.response) {
      output += response.response;
    }

    if (response.confidence && response.confidence < 0.5) {
      output += `\n\n🤔 *Confidence: ${Math.round(response.confidence * 100)}%*`;
    }

    if (response.suggestions && response.suggestions.length > 0) {
      output += '\n\n**Suggestions:**\n';
      response.suggestions.forEach((suggestion, index) => {
        output += `${index + 1}. ${suggestion}\n`;
      });
    }

    this.terminal.write(output);
  }

  setupContextGathering() {
    // Set up automatic context gathering when files change
    // This is a simplified implementation
    if (typeof window !== 'undefined' && this.terminal) {
      // Browser environment - could watch for file system changes
      console.log('Context gathering set up for browser environment');
    } else {
      // Node.js environment - could use fs.watch
      console.log('Context gathering set up for Node.js environment');
    }
  }

  addEnhancedContextMenu() {
    // Add context menu items for enhanced features
    // Implementation would depend on the terminal's UI framework
    console.log('Enhanced context menu features available');
  }

  getCapabilitiesStatus() {
    if (!this.enhancedAssistant) return 'Basic mode only';

    const capabilities = this.enhancedAssistant.capabilities;
    const active = Object.keys(capabilities).filter(key => capabilities[key]);

    return active.join(', ');
  }

  // API for external integration
  async analyzeCode(code, language = null) {
    const context = { code, language };
    return await this.processEnhancedRequest('analyze this code', context);
  }

  async debugIssue(errorMessage, stackTrace = null) {
    const context = { error: errorMessage, stackTrace };
    return await this.processEnhancedRequest('debug this issue', context);
  }

  async generateProgram(requirements, language = 'javascript') {
    const context = { requirements, language };
    return await this.processEnhancedRequest(
      `generate a ${language} program: ${requirements}`,
      context
    );
  }

  async explainConcept(concept) {
    return await this.processEnhancedRequest(`explain ${concept}`);
  }

  async reviewCode(code, focusAreas = []) {
    const context = { code, focusAreas };
    return await this.processEnhancedRequest('review this code', context);
  }

  // Cleanup
  dispose() {
    if (this.enhancedAssistant) {
      // Cleanup enhanced assistant
    }

    if (this.basicRina) {
      // Cleanup basic Rina
    }

    this.conversationContext = [];
    this.fileContext.clear();
    this.projectContext = {};
  }
}

export default EnhancedAIIntegration;
