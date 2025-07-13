/**
 * RinaWarp Terminal AI Debugging Assistant Plugin
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * Analyzes command errors and provides intelligent debugging suggestions.
 */

import { Plugin } from './plugin-loader.js';

export class AIDebuggingAssistantPlugin extends Plugin {
  constructor() {
    super({
      name: 'AIDebuggingAssistant',
      version: '1.0.0',
      description: 'AI-powered error analysis and debugging suggestions',
      hooks: ['onCommandError', 'onCommandComplete'],
    });

    this.errorPatterns = this.initializeErrorPatterns();
    this.solutionDatabase = this.initializeSolutionDatabase();
  }

  async initialize(context) {
    console.log('🔍 Initializing AI Debugging Assistant...');
    this.terminal = context.terminal;
    this.aiWrapper = context.aiWrapper;
  }

  async execute(context) {
    const { terminal } = context;

    // Hook into command execution
    terminal.onExecute(async command => {
      this.currentCommand = command;
      this.startTime = Date.now();
    });

    // Analyze stderr output
    terminal.onStderr(async error => {
      if (error && error.trim()) {
        const analysis = await this.analyzeError(error, this.currentCommand);
        this.displayErrorAnalysis(analysis);
      }
    });

    console.log('🔍 AI Debugging Assistant activated');
  }

  async analyzeError(errorOutput, command) {
    const analysis = {
      errorType: this.classifyError(errorOutput),
      severity: this.assessSeverity(errorOutput),
      suggestions: [],
      quickFixes: [],
      relatedDocs: [],
      context: {
        command,
        timestamp: Date.now(),
        duration: Date.now() - this.startTime,
      },
    };

    // Pattern-based analysis
    for (const [pattern, handler] of this.errorPatterns) {
      if (pattern.test(errorOutput)) {
        const patternAnalysis = await handler(errorOutput, command);
        analysis.suggestions.push(...patternAnalysis.suggestions);
        analysis.quickFixes.push(...patternAnalysis.quickFixes);
      }
    }

    // AI-enhanced analysis
    if (this.aiWrapper) {
      try {
        const aiAnalysis = await this.aiWrapper.analyzeError(errorOutput, command);
        if (aiAnalysis) {
          analysis.suggestions.push({
            type: 'ai-suggestion',
            message: aiAnalysis,
            confidence: 0.8,
          });
        }
      } catch (error) {
        console.warn('AI analysis failed:', error);
      }
    }

    return analysis;
  }

  classifyError(errorOutput) {
    const errorTypes = {
      syntax: /syntax error|parse error|unexpected token/i,
      permission: /permission denied|access denied|forbidden/i,
      notFound: /not found|no such file|command not found/i,
      network: /network error|connection refused|timeout/i,
      dependency: /module not found|import error|cannot resolve/i,
      runtime: /runtime error|execution error|segmentation fault/i,
      configuration: /config error|invalid configuration|missing config/i,
    };

    for (const [type, pattern] of Object.entries(errorTypes)) {
      if (pattern.test(errorOutput)) {
        return type;
      }
    }

    return 'unknown';
  }

  assessSeverity(errorOutput) {
    const severityIndicators = {
      critical: /fatal|critical|segmentation fault|core dumped/i,
      high: /error|failed|exception|abort/i,
      medium: /warning|deprecated|invalid/i,
      low: /notice|info|debug/i,
    };

    for (const [level, pattern] of Object.entries(severityIndicators)) {
      if (pattern.test(errorOutput)) {
        return level;
      }
    }

    return 'medium';
  }

  initializeErrorPatterns() {
    return new Map([
      // Command not found
      [
        /command not found|is not recognized/i,
        async (error, command) => ({
          suggestions: [
            {
              type: 'installation',
              message: `Install ${command.split(' ')[0]} using package manager`,
              command: `npm install -g ${command.split(' ')[0]}`,
              confidence: 0.9,
            },
            {
              type: 'typo',
              message: 'Check for typos in command name',
              confidence: 0.7,
            },
          ],
          quickFixes: [
            {
              action: 'install',
              command: `npm install -g ${command.split(' ')[0]}`,
              description: 'Install missing package globally',
            },
          ],
        }),
      ],

      // Permission denied
      [
        /permission denied|access denied/i,
        async (error, command) => ({
          suggestions: [
            {
              type: 'permissions',
              message: 'Run with elevated privileges',
              command: `sudo ${command}`,
              confidence: 0.8,
            },
            {
              type: 'ownership',
              message: 'Check file ownership and permissions',
              command: `ls -la ${command.split(' ').pop()}`,
              confidence: 0.7,
            },
          ],
          quickFixes: [
            {
              action: 'sudo',
              command: `sudo ${command}`,
              description: 'Run with administrator privileges',
            },
          ],
        }),
      ],

      // Port already in use
      [
        /port.*already in use|address already in use/i,
        async (error, _command) => ({
          suggestions: [
            {
              type: 'port-conflict',
              message: 'Kill process using the port',
              command: 'lsof -ti:PORT | xargs kill -9',
              confidence: 0.9,
            },
            {
              type: 'port-alternative',
              message: 'Use a different port',
              confidence: 0.8,
            },
          ],
          quickFixes: [
            {
              action: 'kill-port',
              command: 'npx kill-port PORT',
              description: 'Kill process using the port',
            },
          ],
        }),
      ],

      // Git conflicts
      [
        /merge conflict|conflict.*resolve/i,
        async (error, _command) => ({
          suggestions: [
            {
              type: 'git-conflict',
              message: 'Resolve merge conflicts manually',
              command: 'git status',
              confidence: 0.9,
            },
            {
              type: 'git-abort',
              message: 'Abort merge and try again',
              command: 'git merge --abort',
              confidence: 0.7,
            },
          ],
          quickFixes: [
            {
              action: 'git-status',
              command: 'git status',
              description: 'Check conflict status',
            },
          ],
        }),
      ],

      // Node.js/npm errors
      [
        /npm ERR!|node.*error/i,
        async (error, _command) => ({
          suggestions: [
            {
              type: 'npm-cache',
              message: 'Clear npm cache',
              command: 'npm cache clean --force',
              confidence: 0.8,
            },
            {
              type: 'node-version',
              message: 'Check Node.js version compatibility',
              command: 'node --version',
              confidence: 0.7,
            },
          ],
          quickFixes: [
            {
              action: 'clear-cache',
              command: 'npm cache clean --force',
              description: 'Clear npm cache',
            },
          ],
        }),
      ],
    ]);
  }

  initializeSolutionDatabase() {
    return new Map([
      ['ENOENT', 'File or directory not found - check path'],
      ['EACCES', 'Permission denied - check file permissions'],
      ['EADDRINUSE', 'Port already in use - kill process or use different port'],
      ['ECONNREFUSED', 'Connection refused - check if service is running'],
      ['MODULE_NOT_FOUND', 'Module not found - install missing dependency'],
    ]);
  }

  displayErrorAnalysis(analysis) {
    if (!this.terminal) return;

    this.terminal.log('\n🔍 AI Debugging Assistant Analysis:');
    this.terminal.log(`📊 Error Type: ${analysis.errorType}`);
    this.terminal.log(`⚠️  Severity: ${analysis.severity}`);

    if (analysis.suggestions.length > 0) {
      this.terminal.log('\n💡 Suggestions:');
      analysis.suggestions.forEach((suggestion, index) => {
        this.terminal.log(`  ${index + 1}. ${suggestion.message}`);
        if (suggestion.command) {
          this.terminal.log(`     → ${suggestion.command}`);
        }
      });
    }

    if (analysis.quickFixes.length > 0) {
      this.terminal.log('\n🔧 Quick Fixes:');
      analysis.quickFixes.forEach((fix, index) => {
        this.terminal.log(`  ${index + 1}. ${fix.description}`);
        this.terminal.log(`     → ${fix.command}`);
      });
    }

    this.terminal.log(`\n🕐 Analysis completed in ${Date.now() - analysis.context.timestamp}ms`);
  }

  // Hook implementations
  hooks = {
    onCommandError: async (error, command) => {
      return await this.analyzeError(error, command);
    },

    onCommandComplete: async (command, output, exitCode) => {
      if (exitCode !== 0) {
        // Command failed, but no stderr - analyze stdout
        const analysis = await this.analyzeError(output, command);
        this.displayErrorAnalysis(analysis);
      }
    },
  };
}

export default AIDebuggingAssistantPlugin;
