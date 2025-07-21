/**
 * RinaWarp Terminal - Enhanced AI Context Engine
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * This module provides advanced AI context understanding and intelligent command suggestions
 * with improved accuracy and contextual awareness.
 */

export class EnhancedContextEngine {
  constructor() {
    this.contextHistory = [];
    this.commandPatterns = new Map();
    this.userPreferences = {};
    this.projectContext = null;
    this.workingDirectory = process.cwd();
    this.shellType = this.detectShellType();
    this.systemInfo = this.getSystemInfo();
    this.commandFrequency = new Map();
    this.contextWeights = {
      recency: 0.4,
      frequency: 0.3,
      relevance: 0.2,
      success: 0.1,
    };

    this.init();
  }

  async init() {
    console.log('🧠 Initializing Enhanced AI Context Engine...');

    // Load user preferences and command history
    await this.loadUserPreferences();
    await this.loadCommandHistory();

    // Detect project context
    await this.detectProjectContext();

    // Initialize command patterns
    this.initializeCommandPatterns();

    console.log('✅ Enhanced AI Context Engine initialized');
  }

  async analyzeContext(input, metadata = {}) {
    const context = {
      timestamp: Date.now(),
      input: input.trim(),
      metadata,
      workingDirectory: this.workingDirectory,
      shellType: this.shellType,
      systemInfo: this.systemInfo,
      projectContext: this.projectContext,
      userIntent: await this.detectUserIntent(input),
      commandContext: await this.analyzeCommandContext(input),
      environmentContext: await this.analyzeEnvironmentContext(),
      suggestions: await this.generateSuggestions(input),
      riskAssessment: await this.assessRisk(input),
      optimizations: await this.suggestOptimizations(input),
    };

    // Add to context history
    this.contextHistory.push(context);

    // Limit history size
    if (this.contextHistory.length > 1000) {
      this.contextHistory.shift();
    }

    return context;
  }

  async detectUserIntent(input) {
    const intents = {
      navigation: /^(cd|ls|pwd|find|locate|tree|dir)/i,
      fileManagement: /^(cp|mv|rm|mkdir|rmdir|touch|ln|chmod|chown)/i,
      textProcessing: /^(cat|less|more|head|tail|grep|sed|awk|sort|uniq|wc)/i,
      systemInfo: /^(ps|top|htop|df|du|free|uname|whoami|id|uptime)/i,
      networkOps: /^(ping|curl|wget|ssh|scp|rsync|netstat|nslookup)/i,
      development: /^(git|npm|node|python|pip|docker|kubectl|make|gcc|java)/i,
      packageManagement: /^(apt|yum|brew|pacman|snap|flatpak|pip|npm|yarn)/i,
      archiveOps: /^(tar|zip|unzip|gzip|gunzip|7z)/i,
      processControl: /^(kill|killall|jobs|bg|fg|nohup|screen|tmux)/i,
      systemAdmin: /^(sudo|su|mount|umount|systemctl|service|crontab)/i,
      help: /^(man|help|info|which|type|whereis|apropos)/i,
      search: /^(grep|find|locate|ack|ag|rg|fzf)/i,
    };

    const detectedIntents = [];

    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(input)) {
        detectedIntents.push({
          intent,
          confidence: this.calculateIntentConfidence(input, pattern),
          suggestions: await this.getIntentSuggestions(intent, input),
        });
      }
    }

    // Sort by confidence
    detectedIntents.sort((a, b) => b.confidence - a.confidence);

    return detectedIntents.length > 0
      ? detectedIntents[0]
      : {
          intent: 'unknown',
          confidence: 0,
          suggestions: [],
        };
  }

  async analyzeCommandContext(input) {
    const command = input.split(' ')[0];
    const args = input.split(' ').slice(1);

    const context = {
      command,
      args,
      hasFlags: args.some(arg => arg.startsWith('-')),
      hasFiles: args.some(arg => !arg.startsWith('-')),
      isChained: input.includes('|') || input.includes('&&') || input.includes('||'),
      isRedirected: input.includes('>') || input.includes('<') || input.includes('>>'),
      isBackgrounded: input.includes('&'),
      complexity: this.calculateCommandComplexity(input),
      estimatedRisk: this.calculateRisk(input),
      similarCommands: this.findSimilarCommands(command),
      commonMistakes: this.getCommonMistakes(command),
      optimizations: this.suggestCommandOptimizations(input),
    };

    return context;
  }

  async analyzeEnvironmentContext() {
    const context = {
      workingDirectory: this.workingDirectory,
      directoryContents: await this.getDirectoryContents(),
      fileTypes: await this.analyzeFileTypes(),
      gitStatus: await this.getGitStatus(),
      nodeProject: await this.detectNodeProject(),
      pythonEnv: await this.detectPythonEnvironment(),
      dockerContext: await this.detectDockerContext(),
      permissions: await this.checkPermissions(),
      diskSpace: await this.checkDiskSpace(),
      networkConnectivity: await this.checkNetworkConnectivity(),
    };

    return context;
  }

  async generateSuggestions(input) {
    const suggestions = [];

    // Command completion suggestions
    const completions = await this.getCommandCompletions(input);
    suggestions.push(...completions);

    // Context-aware suggestions
    const contextSuggestions = await this.getContextSuggestions(input);
    suggestions.push(...contextSuggestions);

    // Smart corrections
    const corrections = await this.getSmartCorrections(input);
    suggestions.push(...corrections);

    // Workflow suggestions
    const workflows = await this.getWorkflowSuggestions(input);
    suggestions.push(...workflows);

    // Sort by relevance and confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);

    return suggestions.slice(0, 10); // Return top 10 suggestions
  }

  async getCommandCompletions(input) {
    const parts = input.split(' ');
    const command = parts[0];
    const lastArg = parts[parts.length - 1];

    const completions = [];

    // File/directory completions
    if (lastArg.includes('/') || !lastArg.startsWith('-')) {
      const dirCompletions = await this.getDirectoryCompletions(lastArg);
      completions.push(...dirCompletions);
    }

    // Flag completions
    if (lastArg.startsWith('-')) {
      const flagCompletions = await this.getFlagCompletions(command, lastArg);
      completions.push(...flagCompletions);
    }

    // Command completions
    if (parts.length === 1) {
      const cmdCompletions = await this.getCommandSuggestions(command);
      completions.push(...cmdCompletions);
    }

    return completions;
  }

  async getContextSuggestions(input) {
    const suggestions = [];

    // Recent commands
    const recentCommands = this.getRecentCommands();
    recentCommands.forEach(cmd => {
      if (cmd.includes(input) && cmd !== input) {
        suggestions.push({
          type: 'recent',
          suggestion: cmd,
          confidence: 0.7,
          reason: 'Recently used command',
        });
      }
    });

    // Frequent commands
    const frequentCommands = this.getFrequentCommands();
    frequentCommands.forEach(cmd => {
      if (cmd.command.includes(input) && cmd.command !== input) {
        suggestions.push({
          type: 'frequent',
          suggestion: cmd.command,
          confidence: 0.6,
          reason: `Used ${cmd.frequency} times`,
        });
      }
    });

    // Project-specific suggestions
    if (this.projectContext) {
      const projectSuggestions = await this.getProjectSuggestions(input);
      suggestions.push(...projectSuggestions);
    }

    return suggestions;
  }

  async getSmartCorrections(input) {
    const corrections = [];

    // Common typos
    const typoCorrections = {
      sl: 'ls',
      gerp: 'grep',
      'cd..': 'cd ..',
      whcih: 'which',
      amek: 'make',
      gti: 'git',
      piip: 'pip',
      pyhton: 'python',
      ndoe: 'node',
      mpn: 'npm',
      dockre: 'docker',
      kubeclt: 'kubectl',
    };

    const firstWord = input.split(' ')[0];
    if (typoCorrections[firstWord]) {
      corrections.push({
        type: 'typo',
        suggestion: input.replace(firstWord, typoCorrections[firstWord]),
        confidence: 0.8,
        reason: 'Corrected common typo',
      });
    }

    // Levenshtein distance corrections
    const availableCommands = await this.getAvailableCommands();
    const closeMatches = availableCommands.filter(
      cmd =>
        this.levenshteinDistance(firstWord, cmd) <= 2 &&
        this.levenshteinDistance(firstWord, cmd) > 0
    );

    closeMatches.forEach(cmd => {
      corrections.push({
        type: 'spelling',
        suggestion: input.replace(firstWord, cmd),
        confidence: 0.6,
        reason: `Did you mean '${cmd}'?`,
      });
    });

    return corrections;
  }

  async getWorkflowSuggestions(input) {
    const suggestions = [];

    // Git workflow suggestions
    if (input.startsWith('git')) {
      const gitSuggestions = await this.getGitWorkflowSuggestions(input);
      suggestions.push(...gitSuggestions);
    }

    // Node.js workflow suggestions
    if (input.startsWith('npm') || input.startsWith('node')) {
      const nodeSuggestions = await this.getNodeWorkflowSuggestions(input);
      suggestions.push(...nodeSuggestions);
    }

    // Docker workflow suggestions
    if (input.startsWith('docker')) {
      const dockerSuggestions = await this.getDockerWorkflowSuggestions(input);
      suggestions.push(...dockerSuggestions);
    }

    return suggestions;
  }

  calculateIntentConfidence(input, pattern) {
    const match = pattern.exec(input);
    if (!match) return 0;

    // Base confidence on pattern match
    let confidence = 0.5;

    // Increase confidence if command is at start
    if (match.index === 0) confidence += 0.3;

    // Increase confidence based on command frequency
    const command = input.split(' ')[0];
    const frequency = this.commandFrequency.get(command) || 0;
    confidence += Math.min(frequency / 100, 0.2);

    return Math.min(confidence, 1.0);
  }

  calculateCommandComplexity(input) {
    let complexity = 0;

    // Base complexity
    complexity += 1;

    // Add complexity for pipes
    complexity += (input.match(/\|/g) || []).length;

    // Add complexity for redirections
    complexity += (input.match(/[<>]/g) || []).length;

    // Add complexity for command chaining
    complexity += (input.match(/&&|\|\|/g) || []).length;

    // Add complexity for flags
    complexity += (input.match(/-[a-zA-Z]/g) || []).length * 0.1;

    // Add complexity for arguments
    complexity += input.split(' ').length * 0.05;

    return complexity;
  }

  calculateRisk(input) {
    let risk = 0;

    // Dangerous commands
    const dangerousCommands = [
      'rm',
      'rmdir',
      'dd',
      'mkfs',
      'fdisk',
      'format',
      'del',
      'deltree',
      'shutdown',
      'reboot',
      'halt',
      'kill',
      'killall',
      'pkill',
      'chown',
      'chmod',
    ];

    const command = input.split(' ')[0];
    if (dangerousCommands.includes(command)) {
      risk += 0.7;
    }

    // Dangerous flags
    if (input.includes('-rf') || input.includes('--force')) {
      risk += 0.8;
    }

    // Root operations
    if (input.includes('sudo') || input.includes('su -')) {
      risk += 0.5;
    }

    // System directories
    const systemDirs = ['/bin', '/sbin', '/usr', '/etc', '/var', '/sys', '/proc'];
    systemDirs.forEach(dir => {
      if (input.includes(dir)) {
        risk += 0.3;
      }
    });

    return Math.min(risk, 1.0);
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Helper methods (simplified implementations)
  detectShellType() {
    return process.env.SHELL || '/bin/bash';
  }

  getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
    };
  }

  async loadUserPreferences() {
    // Load from file or database
    this.userPreferences = {
      preferredCommands: [],
      shortcuts: {},
      themes: 'default',
    };
  }

  async loadCommandHistory() {
    // Load command history from file
    this.commandHistory = [];
  }

  async detectProjectContext() {
    // Detect project type based on files in working directory
    this.projectContext = {
      type: 'unknown',
      packageManager: null,
      buildTool: null,
      vcs: null,
    };
  }

  initializeCommandPatterns() {
    // Initialize common command patterns
    this.commandPatterns.set('git', {
      common: ['status', 'add', 'commit', 'push', 'pull', 'branch', 'checkout'],
      patterns: ['git add .', 'git commit -m "message"', 'git push origin main'],
    });
  }

  getRecentCommands() {
    return this.contextHistory
      .slice(-10)
      .map(ctx => ctx.input)
      .filter(cmd => cmd.length > 0);
  }

  getFrequentCommands() {
    return Array.from(this.commandFrequency.entries())
      .map(([command, frequency]) => ({ command, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  async getDirectoryContents() {
    // Return directory contents
    return [];
  }

  async analyzeFileTypes() {
    // Analyze file types in current directory
    return {};
  }

  async getGitStatus() {
    // Get git status if in git repository
    return null;
  }

  async detectNodeProject() {
    // Detect if current directory is a Node.js project
    return false;
  }

  async detectPythonEnvironment() {
    // Detect Python environment
    return null;
  }

  async detectDockerContext() {
    // Detect Docker context
    return null;
  }

  async checkPermissions() {
    // Check file permissions
    return {};
  }

  async checkDiskSpace() {
    // Check available disk space
    return {};
  }

  async checkNetworkConnectivity() {
    // Check network connectivity
    return true;
  }

  async getDirectoryCompletions(_partial) {
    // Get directory completions
    return [];
  }

  async getFlagCompletions(_command, _partial) {
    // Get flag completions for command
    return [];
  }

  async getCommandSuggestions(_partial) {
    // Get command suggestions
    return [];
  }

  async getProjectSuggestions(_input) {
    // Get project-specific suggestions
    return [];
  }

  async getAvailableCommands() {
    // Get available commands
    return [];
  }

  async getGitWorkflowSuggestions(_input) {
    // Get git workflow suggestions
    return [];
  }

  async getNodeWorkflowSuggestions(_input) {
    // Get Node.js workflow suggestions
    return [];
  }

  async getDockerWorkflowSuggestions(_input) {
    // Get Docker workflow suggestions
    return [];
  }

  async assessRisk(input) {
    return {
      level: this.calculateRisk(input),
      warnings: [],
      suggestions: [],
    };
  }

  async suggestOptimizations(_input) {
    return [];
  }

  async getIntentSuggestions(_intent, _input) {
    return [];
  }

  findSimilarCommands(_command) {
    return [];
  }

  getCommonMistakes(_command) {
    return [];
  }

  suggestCommandOptimizations(_input) {
    return [];
  }
}

export default EnhancedContextEngine;
