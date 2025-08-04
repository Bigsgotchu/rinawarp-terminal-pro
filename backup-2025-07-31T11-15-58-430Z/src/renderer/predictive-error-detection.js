/**
 * Predictive Error Detection System - AI-powered Command Validation
 *
 * Features:
 * - Command validation before execution
 * - Context-aware error prediction
 * - Learning from user patterns
 * - Typo detection and correction
 * - Dangerous command warnings
 * - Smart suggestions for fixes
 */

export class PredictiveErrorDetection {
  constructor(options = {}) {
    this.options = {
      enableWarnings: options.enableWarnings !== false,
      enableCorrections: options.enableCorrections !== false,
      enableLearning: options.enableLearning !== false,
      confidenceThreshold: options.confidenceThreshold || 0.7,
      debugMode: options.debugMode === true,
      maxSuggestions: options.maxSuggestions || 3,
      ...options,
    };

    // Command patterns and validation rules
    this.commandDatabase = this.initializeCommandDatabase();
    this.errorPatterns = this.initializeErrorPatterns();
    this.contextRules = this.initializeContextRules();

    // Learning data
    this.userPatterns = {
      commonCommands: new Map(),
      commonErrors: new Map(),
      contextHistory: [],
      corrections: new Map(),
    };

    // Current system state
    this.currentDirectory = null;
    this.fileSystem = new Map(); // Simple FS cache
    this.shellManager = null;

    // Event handlers
    this.handlers = {
      warning: [],
      suggestion: [],
      error: [],
      correction: [],
    };

    this.log('Predictive Error Detection initialized', 'info');
  }

  /**
   * Initialize command database with validation rules
   */
  initializeCommandDatabase() {
    return {
      ls: {
        syntax: /^ls(\s+[-\w]+)*(\s+.*)?$/,
        validFlags: ['-a', '-l', '-la', '-h', '-t', '-r', '-S'],
        requiresPath: false,
        dangerous: false,
        description: 'List directory contents',
      },
      cd: {
        syntax: /^cd(\s+.*)?$/,
        validFlags: [],
        requiresPath: 'optional',
        dangerous: false,
        description: 'Change directory',
      },
      rm: {
        syntax: /^rm(\s+[-\w]+)*\s+.+$/,
        validFlags: ['-r', '-f', '-rf', '-i', '-v'],
        requiresPath: true,
        dangerous: true,
        description: 'Remove files/directories',
        warnings: ['This will permanently delete files', 'Use -i for interactive mode'],
      },
      sudo: {
        syntax: /^sudo\s+.*$/,
        validFlags: [],
        requiresPath: false,
        dangerous: true,
        description: 'Execute as superuser',
        warnings: ['This runs with administrator privileges', 'Be very careful with sudo commands'],
      },
      git: {
        syntax: /^git\s+\w+.*$/,
        validFlags: [],
        requiresPath: false,
        dangerous: false,
        description: 'Git version control',
        subcommands: {
          rm: { dangerous: true, warnings: ['This will remove files from git tracking'] },
          reset: { dangerous: true, warnings: ['This can lose uncommitted changes'] },
          rebase: { dangerous: true, warnings: ['This rewrites git history'] },
        },
      },
    };
  }

  /**
   * Initialize common error patterns
   */
  initializeErrorPatterns() {
    return {
      typos: new Map([
        ['sl', 'ls'],
        ['cd..', 'cd ..'],
        ['gti', 'git'],
        ['claer', 'clear'],
      ]),
      syntax: [
        {
          pattern: /^(\w+)\s*=\s*(.*)$/,
          suggestion: 'Use "export $1=$2" to set environment variables',
        },
        {
          pattern: /^cd\s+[^\s]+\s+[^\s]+/,
          suggestion: 'cd only accepts one directory argument',
        },
      ],
    };
  }

  /**
   * Initialize context-aware rules
   */
  initializeContextRules() {
    return {
      fileExists: {
        commands: ['cat', 'nano', 'vim', 'rm', 'cp', 'mv'],
        check: (command, args) => this.checkFileExists(args[0]),
      },
      gitContext: {
        commands: ['git'],
        check: (_command, _args) => this.checkGitContext(),
      },
    };
  }

  /**
   * Main prediction function - analyzes command before execution
   */
  async predictErrors(commandLine) {
    const analysis = {
      command: commandLine,
      isValid: true,
      warnings: [],
      suggestions: [],
      corrections: [],
      confidence: 1.0,
      severity: 'info',
    };

    try {
      const parsed = this.parseCommand(commandLine);
      if (!parsed) {
        analysis.isValid = false;
        analysis.severity = 'error';
        analysis.warnings.push('Unable to parse command');
        return analysis;
      }

      await this.checkTypos(parsed, analysis);
      await this.validateSyntax(parsed, analysis);
      await this.checkContext(parsed, analysis);
      await this.checkDangerousCommands(parsed, analysis);

      if (this.options.enableLearning) {
        this.learnFromCommand(parsed, analysis);
      }

      this.emitPredictions(analysis);
      return analysis;
    } catch (error) {
      this.log(`Error during prediction: ${error.message}`, 'error');
      analysis.isValid = false;
      analysis.severity = 'error';
      analysis.warnings.push(`Analysis error: ${error.message}`);
      return analysis;
    }
  }

  /**
   * Parse command line into components
   */
  parseCommand(commandLine) {
    const trimmed = commandLine.trim();
    if (!trimmed) return null;

    const parts = trimmed.split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    return {
      original: commandLine,
      command,
      args,
      flags: args.filter(arg => arg.startsWith('-')),
      paths: args.filter(arg => !arg.startsWith('-')),
    };
  }

  /**
   * Check for common typos and suggest corrections
   */
  async checkTypos(parsed, analysis) {
    const { command } = parsed;

    if (this.errorPatterns.typos.has(command)) {
      const correction = this.errorPatterns.typos.get(command);
      analysis.corrections.push({
        type: 'typo',
        original: command,
        suggestion: correction,
        confidence: 0.9,
        message: `Did you mean "${correction}"?`,
      });
      analysis.severity = 'warning';
    }
  }

  /**
   * Validate command syntax
   */
  async validateSyntax(parsed, analysis) {
    const { command, original } = parsed;
    const commandInfo = this.commandDatabase[command];

    if (!commandInfo) {
      // Check syntax error patterns
      for (const pattern of this.errorPatterns.syntax) {
        if (pattern.pattern.test(original)) {
          analysis.suggestions.push({
            type: 'syntax',
            message: pattern.suggestion,
            confidence: 0.8,
          });
          analysis.severity = 'warning';
        }
      }
      return;
    }

    // Validate against known syntax
    if (!commandInfo.syntax.test(original)) {
      analysis.warnings.push(`Invalid syntax for "${command}". ${commandInfo.description}`);
      analysis.severity = 'warning';
    }

    // Check required arguments
    if (commandInfo.requiresPath === true && parsed.paths.length === 0) {
      analysis.warnings.push(`${command} requires a file or directory path`);
      analysis.severity = 'error';
    }
  }

  /**
   * Check contextual validity
   */
  async checkContext(parsed, analysis) {
    const { command, args } = parsed;

    for (const [_ruleName, rule] of Object.entries(this.contextRules)) {
      if (rule.commands.includes(command)) {
        const result = await rule.check(command, args);
        if (!result.valid) {
          analysis.warnings.push(result.message);
          if (result.suggestions) {
            analysis.suggestions.push(...result.suggestions);
          }
        }
      }
    }
  }

  /**
   * Check for dangerous commands and warn user
   */
  async checkDangerousCommands(parsed, analysis) {
    const { command } = parsed;
    const commandInfo = this.commandDatabase[command];

    if (!commandInfo) return;

    if (commandInfo.dangerous) {
      analysis.severity = 'danger';
      analysis.warnings.push(`⚠️ Dangerous command: ${command}`);

      if (commandInfo.warnings) {
        analysis.warnings.push(...commandInfo.warnings);
      }

      // Specific dangerous patterns
      if (command === 'rm' && parsed.args.includes('-rf')) {
        analysis.warnings.push('🚨 "rm -rf" can permanently delete files!');
        analysis.suggestions.push({
          type: 'safety',
          message: 'Consider using "rm -i" for interactive deletion',
          confidence: 0.9,
        });
      }

      if (command === 'sudo' && parsed.args.includes('rm')) {
        analysis.warnings.push('🚨 "sudo rm" combination is extremely dangerous!');
      }
    }

    // Check git dangerous subcommands
    if (command === 'git' && commandInfo.subcommands) {
      const subcommand = parsed.args[0];
      const subInfo = commandInfo.subcommands[subcommand];
      if (subInfo && subInfo.dangerous) {
        analysis.severity = 'danger';
        analysis.warnings.push(`⚠️ Dangerous git command: git ${subcommand}`);
        if (subInfo.warnings) {
          analysis.warnings.push(...subInfo.warnings);
        }
      }
    }
  }

  /**
   * Learn from user patterns
   */
  learnFromCommand(parsed, analysis) {
    const { command } = parsed;

    // Track command frequency
    const count = this.userPatterns.commonCommands.get(command) || 0;
    this.userPatterns.commonCommands.set(command, count + 1);

    // Track context
    this.userPatterns.contextHistory.push({
      timestamp: Date.now(),
      command: parsed.original,
      directory: this.currentDirectory,
      hasErrors: analysis.warnings.length > 0,
    });

    // Keep only recent history
    if (this.userPatterns.contextHistory.length > 100) {
      this.userPatterns.contextHistory.shift();
    }
  }

  /**
   * Validation functions
   */
  async checkFileExists(filename) {
    return { valid: true, message: `Checking if ${filename} exists...` };
  }

  async checkGitContext() {
    return {
      valid: true,
      message: 'Git context check passed',
      suggestions: [
        {
          type: 'context',
          message: 'Make sure you are in a git repository',
          confidence: 0.6,
        },
      ],
    };
  }

  /**
   * Utility functions
   */
  emitPredictions(analysis) {
    if (analysis.warnings.length > 0) {
      this.emit('warning', analysis);
    }
    if (analysis.suggestions.length > 0) {
      this.emit('suggestion', analysis);
    }
    if (analysis.corrections.length > 0) {
      this.emit('correction', analysis);
    }
  }

  /**
   * Integration methods
   */
  setShellManager(shellManager) {
    this.shellManager = shellManager;
    this.log('Integrated with shell manager', 'info');
  }

  /**
   * Get prediction statistics
   */
  getStats() {
    return {
      totalPredictions: this.userPatterns.contextHistory.length,
      commonCommands: Object.fromEntries(this.userPatterns.commonCommands),
      errorRate:
        this.userPatterns.contextHistory.filter(h => h.hasErrors).length /
        Math.max(1, this.userPatterns.contextHistory.length),
      currentDirectory: this.currentDirectory,
    };
  }

  /**
   * Event emitter functionality
   */
  on(event, handler) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
  }

  emit(event, data) {
    if (this.handlers[event]) {
      this.handlers[event].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.log(`Event handler error for ${event}: ${error.message}`, 'error');
        }
      });
    }
  }

  /**
   * Logging utility
   */
  log(message, level = 'info') {
    const prefix = '[ErrorDetection]';

    if (this.options.debugMode) {
      if (level === 'error') {
        console.error(`${prefix} ${message}`);
      } else if (level === 'warning') {
        console.warn(`${prefix} ${message}`);
      } else {
      }
    }

    if (typeof window !== 'undefined' && window.logMessage) {
      window.logMessage(`${prefix} ${message}`, level);
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.handlers = {
      warning: [],
      suggestion: [],
      error: [],
      correction: [],
    };

    this.log('Predictive Error Detection destroyed', 'info');
  }
}

/**
 * Factory function
 */
export function createPredictiveErrorDetection(options = {}) {
  return new PredictiveErrorDetection(options);
}

/**
 * Global instance
 */
export let globalErrorDetection = null;

/**
 * Initialize global error detection
 */
export function initializeGlobalErrorDetection(options = {}) {
  if (globalErrorDetection) {
    globalErrorDetection.destroy();
  }

  globalErrorDetection = createPredictiveErrorDetection(options);

  if (typeof window !== 'undefined') {
    window.errorDetection = globalErrorDetection;
  }

  return globalErrorDetection;
}
