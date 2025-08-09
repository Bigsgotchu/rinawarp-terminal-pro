/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Enhanced Command Intelligence System
 * Provides real-time command analysis, suggestions, and learning capabilities
 */

// Enhanced classes with error handling and process safety
class GitIntegration {
  async getSuggestions(_command, _context) {
    try {
      return [];
    } catch (error) {
      console.warn('GitIntegration getSuggestions error:', error);
      return [];
    }
  }

  async isGitRepository(directory) {
    try {
      if (window.electronAPI && window.electronAPI.executeCommand) {
        const result = await window.electronAPI.executeCommand('git rev-parse --git-dir', {
          cwd: directory,
        });
        return result.exitCode === 0;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async getCurrentBranch(directory) {
    try {
      if (window.electronAPI && window.electronAPI.executeCommand) {
        const result = await window.electronAPI.executeCommand('git branch --show-current', {
          cwd: directory,
        });
        return result.exitCode === 0 ? result.stdout.trim() : null;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

class ProjectAnalyzer {
  async detectProjectType(_cwd) {
    try {
      // Safe process access through exposed API
      const safeProcess = window.electronAPI?.process || {};
      if (safeProcess.versions?.node) {
        return 'node';
      }
      return 'unknown-environment';
    } catch (error) {
      console.warn('ProjectAnalyzer detectProjectType error:', error);
      return 'unknown-environment';
    }
  }
}

class DebuggerIntegration {
  constructor() {
    this.initialized = false;
    this.safeInit();
  }

  safeInit() {
    try {
      // Safe initialization without direct process access
      this.initialized = true;
    } catch (error) {
      console.warn('DebuggerIntegration initialization error:', error);
      this.initialized = false;
    }
  }
}

class EnhancedCommandIntelligence {
  constructor() {
    this.commandHistory = new Map();
    this.contextPatterns = new Map();
    this.directoryContexts = new Map();
    this.userPatterns = new Map();
    this.gitIntegration = null;
    this.projectAnalyzer = null;
    this.debuggerIntegration = null;

    this.initialize();
  }

  async initialize() {
    // Initialize subsystems
    this.gitIntegration = new GitIntegration();
    this.projectAnalyzer = new ProjectAnalyzer();
    this.debuggerIntegration = new DebuggerIntegration();

    // Load existing patterns
    await this.loadUserPatterns();
    await this.loadContextPatterns();

    // Set up real-time monitoring
    this.setupCommandMonitoring();
    this.setupDirectoryWatcher();

    console.log('✅ Enhanced Command Intelligence initialized');
  }

  /**
   * Enhanced Command Execution with Process Management
   */
  async executeCommandEnhanced(command, options = {}) {
    const context = await this.analyzeCommandContext(command);
    const suggestions = await this.generateSuggestions(command, context);

    // Pre-execution analysis
    const analysis = {
      command,
      context,
      suggestions,
      riskLevel: this.assessCommandRisk(command),
      expectedOutput: await this.predictCommandOutput(command, context),
      estimatedTime: this.estimateExecutionTime(command, context),
    };

    // Execute with enhanced monitoring
    const execution = new EnhancedExecution(command, analysis, options);
    const result = await execution.run();

    // Post-execution learning
    await this.learnFromExecution(command, context, result);

    return {
      ...result,
      analysis,
      suggestions: await this.generatePostExecutionSuggestions(result, context),
    };
  }

  /**
   * Real-time Command Analysis and Suggestions
   */
  async analyzeCommandInRealTime(partialCommand) {
    const context = await this.getCurrentContext();
    const suggestions = [];

    // Syntax completion
    const syntaxSuggestions = await this.getSyntaxCompletions(partialCommand);
    suggestions.push(...syntaxSuggestions);

    // Context-aware suggestions
    const contextSuggestions = await this.getContextualSuggestions(partialCommand, context);
    suggestions.push(...contextSuggestions);

    // Pattern-based suggestions
    const patternSuggestions = this.getPatternBasedSuggestions(partialCommand);
    suggestions.push(...patternSuggestions);

    // Git-aware suggestions
    if (context.isGitRepo) {
      const gitSuggestions = await this.gitIntegration.getSuggestions(partialCommand, context);
      suggestions.push(...gitSuggestions);
    }

    return {
      suggestions: this.rankSuggestions(suggestions),
      context,
      warnings: this.generateWarnings(partialCommand, context),
      tips: this.generateTips(partialCommand, context),
    };
  }

  /**
   * Context-Aware Suggestions Based on Current Directory
   */
  async getContextualSuggestions(command, context) {
    const suggestions = [];

    // Project type detection with safe process access
    const safeProcess = window.electronAPI?.process || {};
    const _isNode = safeProcess.versions?.node;
    const cwd = await this.getSafeCwd();
    const projectType = await this.projectAnalyzer.detectProjectType(cwd);

    switch (projectType) {
      case 'node':
        suggestions.push(...this.getNodeJSSuggestions(command, context));
        break;
      case 'python':
        suggestions.push(...this.getPythonSuggestions(command, context));
        break;
      case 'rust':
        suggestions.push(...this.getRustSuggestions(command, context));
        break;
      case 'go':
        suggestions.push(...this.getGoSuggestions(command, context));
        break;
      default:
        suggestions.push(...this.getGenericSuggestions(command, context));
    }

    // File-based suggestions
    const files = context.files || [];
    if (command.includes('grep') || command.includes('find')) {
      suggestions.push(...this.generateFileSearchSuggestions(command, files));
    }

    return suggestions;
  }

  /**
   * Learning from User Patterns
   */
  async learnFromExecution(command, context, result) {
    const pattern = {
      command,
      context: {
        cwd: context.cwd,
        projectType: context.projectType,
        gitBranch: context.gitBranch,
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
      },
      result: {
        success: result.exitCode === 0,
        executionTime: result.executionTime,
        outputLength: result.stdout?.length || 0,
      },
      timestamp: Date.now(),
    };

    // Store pattern for learning
    const patternKey = this.generatePatternKey(command, context);

    if (!this.userPatterns.has(patternKey)) {
      this.userPatterns.set(patternKey, []);
    }

    this.userPatterns.get(patternKey).push(pattern);

    // Update frequency tracking
    this.updateCommandFrequency(command, context);

    // Learn command sequences
    this.learnCommandSequences(command, context);

    // Persist learning data
    await this.persistUserPatterns();
  }

  /**
   * Generate intelligent suggestions based on learned patterns
   */
  getPatternBasedSuggestions(partialCommand) {
    const suggestions = [];
    const context = this.getCurrentContextSync();

    // Find similar command patterns
    for (const [patternKey, patterns] of this.userPatterns) {
      if (this.isPatternRelevant(patternKey, partialCommand, context)) {
        const frequency = patterns.length;
        const successRate = patterns.filter(p => p.result.success).length / patterns.length;

        if (successRate > 0.7) {
          // Only suggest patterns with good success rate
          suggestions.push({
            type: 'pattern',
            suggestion: this.extractCommandFromPattern(patternKey),
            confidence: successRate,
            frequency,
            reason: `Used ${frequency} times with ${Math.round(successRate * 100)}% success rate`,
          });
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence * b.frequency - a.confidence * a.frequency);
  }

  /**
   * Command Risk Assessment
   */
  assessCommandRisk(command) {
    const highRiskCommands = [
      'rm -rf',
      'sudo rm',
      'mkfs',
      'dd if=',
      'chmod 777',
      'sudo chmod',
      'chown -R',
      'sudo chown',
      '> /dev/null',
      'curl | sh',
      'wget | sh',
      'eval',
    ];

    const mediumRiskCommands = [
      'sudo',
      'rm',
      'mv',
      'cp -r',
      'find . -delete',
      'git reset --hard',
      'git clean -fd',
      'npm install -g',
    ];

    for (const risk of highRiskCommands) {
      if (command.includes(risk)) {
        return { level: 'high', reason: `Contains potentially dangerous operation: ${risk}` };
      }
    }

    for (const risk of mediumRiskCommands) {
      if (command.includes(risk)) {
        return { level: 'medium', reason: `Contains operation requiring caution: ${risk}` };
      }
    }

    return { level: 'low', reason: 'Standard command operation' };
  }

  /**
   * Predict Command Output
   */
  async predictCommandOutput(command, context) {
    // Simple predictions based on command patterns
    const predictions = {
      ls: `Expected: List of ${context.files?.length || 'unknown'} files and directories`,
      pwd: `Expected: ${context.cwd}`,
      'git status': context.isGitRepo
        ? 'Expected: Git repository status'
        : 'Expected: Not a git repository',
      'npm test': context.hasPackageJson
        ? 'Expected: Run test suite'
        : 'Expected: No package.json found',
      'docker ps': 'Expected: List of running containers',
      'ps aux': 'Expected: List of running processes',
    };

    // Find matching prediction
    for (const [cmd, prediction] of Object.entries(predictions)) {
      if (command.startsWith(cmd)) {
        return prediction;
      }
    }

    return 'Output depends on command execution';
  }

  /**
   * Setup real-time command monitoring
   */
  setupCommandMonitoring() {
    // Monitor terminal input
    if (window.terminal && window.terminal.onData) {
      window.terminal.onData(data => {
        this.handleTerminalInput(data);
      });
    }

    // Monitor command execution
    if (window.electronAPI && window.electronAPI.onCommandExecuted) {
      window.electronAPI.onCommandExecuted(result => {
        this.handleCommandCompletion(result);
      });
    }
  }

  /**
   * Setup directory change monitoring
   */
  setupDirectoryWatcher() {
    let lastDirectory = '';

    setInterval(async () => {
      try {
        const currentDir = await this.getCurrentDirectory();
        if (currentDir !== lastDirectory) {
          await this.onDirectoryChanged(currentDir, lastDirectory);
          lastDirectory = currentDir;
        }
      } catch (error) {
        console.warn('Directory monitoring error:', error);
      }
    }, 1000);
  }

  /**
   * Handle directory changes
   */
  async onDirectoryChanged(newDir, oldDir) {
    // Analyze new directory context
    const context = await this.analyzeDirectoryContext(newDir);
    this.directoryContexts.set(newDir, context);

    // Generate directory-specific suggestions
    const suggestions = await this.generateDirectorySuggestions(context);

    // Emit directory change event
    this.emitEvent('directoryChanged', {
      newDir,
      oldDir,
      context,
      suggestions,
    });
  }

  /**
   * Analyze directory context
   */
  async analyzeDirectoryContext(directory) {
    const context = {
      cwd: directory,
      files: [],
      directories: [],
      isGitRepo: false,
      gitBranch: null,
      projectType: null,
      hasPackageJson: false,
      hasDockerfile: false,
      hasRequirementsTxt: false,
      languages: [],
      frameworks: [],
    };

    try {
      // Get directory contents
      const contents = await this.getDirectoryContents(directory);
      context.files = contents.files;
      context.directories = contents.directories;

      // Check for special files
      context.hasPackageJson = contents.files.includes('package.json');
      context.hasDockerfile = contents.files.includes('Dockerfile');
      context.hasRequirementsTxt = contents.files.includes('requirements.txt');

      // Detect project type
      context.projectType = await this.projectAnalyzer.detectProjectType(directory);

      // Check git status
      context.isGitRepo = await this.gitIntegration.isGitRepository(directory);
      if (context.isGitRepo) {
        context.gitBranch = await this.gitIntegration.getCurrentBranch(directory);
      }

      // Detect languages and frameworks
      context.languages = this.detectLanguages(contents.files);
      context.frameworks = await this.detectFrameworks(directory, contents.files);
    } catch (error) {
      console.warn('Error analyzing directory context:', error);
    }

    return context;
  }

  /**
   * Generate suggestions based on directory context
   */
  async generateDirectorySuggestions(context) {
    const suggestions = [];

    // Git repository suggestions
    if (context.isGitRepo) {
      suggestions.push(
        { type: 'git', text: 'git status', description: 'Check repository status' },
        { type: 'git', text: 'git log --oneline -10', description: 'View recent commits' },
        { type: 'git', text: 'git diff', description: 'View uncommitted changes' }
      );
    }

    // Node.js project suggestions
    if (context.hasPackageJson) {
      suggestions.push(
        { type: 'npm', text: 'npm install', description: 'Install dependencies' },
        { type: 'npm', text: 'npm test', description: 'Run tests' },
        { type: 'npm', text: 'npm start', description: 'Start application' },
        { type: 'npm', text: 'npm run build', description: 'Build project' }
      );
    }

    // Docker project suggestions
    if (context.hasDockerfile) {
      suggestions.push(
        { type: 'docker', text: 'docker build -t myapp .', description: 'Build Docker image' },
        {
          type: 'docker',
          text: 'docker run -p 3000:3000 myapp',
          description: 'Run Docker container',
        },
        { type: 'docker', text: 'docker ps', description: 'List running containers' }
      );
    }

    // Python project suggestions
    if (context.hasRequirementsTxt) {
      suggestions.push(
        {
          type: 'python',
          text: 'pip install -r requirements.txt',
          description: 'Install Python dependencies',
        },
        { type: 'python', text: 'python -m pytest', description: 'Run Python tests' },
        { type: 'python', text: 'python main.py', description: 'Run Python application' }
      );
    }

    return suggestions;
  }

  /**
   * Event system for integrations
   */
  emitEvent(eventType, data) {
    if (window.rinaWarp && window.rinaWarp.eventBus) {
      window.rinaWarp.eventBus.emit(eventType, data);
    }

    // Also emit as custom DOM event
    window.dispatchEvent(new CustomEvent(`rinawarp:${eventType}`, { detail: data }));
  }

  /**
   * Utility methods
   */
  async getCurrentContext() {
    const cwd = await this.getCurrentDirectory();
    return this.directoryContexts.get(cwd) || (await this.analyzeDirectoryContext(cwd));
  }

  getCurrentContextSync() {
    // Simplified synchronous version for immediate suggestions with safe process access
    const safeProcess = window.electronAPI?.process || {};
    const _isNode = safeProcess.versions?.node;
    return {
      cwd: this.getSafeCwdSync(),
      timestamp: Date.now(),
    };
  }

  async getCurrentDirectory() {
    return await this.getSafeCwd();
  }

  async getSafeCwd() {
    try {
      if (window.electronAPI && window.electronAPI.getCurrentDirectory) {
        return await window.electronAPI.getCurrentDirectory();
      }
      if (window.electronAPI && window.electronAPI.process && window.electronAPI.process.cwd) {
        return window.electronAPI.process.cwd();
      }
      return '/unknown';
    } catch (error) {
      console.warn('Error getting current directory:', error);
      return '/unknown';
    }
  }

  getSafeCwdSync() {
    try {
      if (window.electronAPI && window.electronAPI.process && window.electronAPI.process.cwd) {
        return window.electronAPI.process.cwd();
      }
      return '/unknown';
    } catch (error) {
      console.warn('Error getting current directory sync:', error);
      return '/unknown';
    }
  }

  async getDirectoryContents(directory) {
    if (window.electronAPI && window.electronAPI.getDirectoryContents) {
      return await window.electronAPI.getDirectoryContents(directory);
    }
    return { files: [], directories: [] };
  }

  detectLanguages(files) {
    const languages = new Set();
    const extensions = {
      '.js': 'JavaScript',
      '.ts': 'TypeScript',
      '.py': 'Python',
      '.rs': 'Rust',
      '.go': 'Go',
      '.java': 'Java',
      '.cpp': 'C++',
      '.c': 'C',
      '.php': 'PHP',
      '.rb': 'Ruby',
      '.swift': 'Swift',
      '.kt': 'Kotlin',
    };

    files.forEach(file => {
      const ext = file.substring(file.lastIndexOf('.'));
      if (extensions[ext]) {
        languages.add(extensions[ext]);
      }
    });

    return Array.from(languages);
  }

  async detectFrameworks(directory, files) {
    const frameworks = [];

    // Check for framework indicators
    if (files.includes('package.json')) {
      // Parse package.json to detect frameworks
      try {
        const packageJson = await this.readFile(`${directory}/package.json`);
        const pkg = JSON.parse(packageJson);

        if (pkg.dependencies) {
          if (pkg.dependencies.react) frameworks.push('React');
          if (pkg.dependencies.vue) frameworks.push('Vue.js');
          if (pkg.dependencies.angular) frameworks.push('Angular');
          if (pkg.dependencies.express) frameworks.push('Express.js');
          if (pkg.dependencies.next) frameworks.push('Next.js');
          if (pkg.dependencies.nuxt) frameworks.push('Nuxt.js');
          if (pkg.dependencies.svelte) frameworks.push('Svelte');
        }
      } catch (error) {
        console.warn('Error parsing package.json:', error);
      }
    }

    if (files.includes('Cargo.toml')) frameworks.push('Rust/Cargo');
    if (files.includes('go.mod')) frameworks.push('Go Modules');
    if (files.includes('pom.xml')) frameworks.push('Maven');
    if (files.includes('build.gradle')) frameworks.push('Gradle');

    return frameworks;
  }

  async readFile(filePath) {
    if (window.electronAPI && window.electronAPI.readFile) {
      return await window.electronAPI.readFile(filePath);
    }
    throw new Error(new Error('File reading not available'));
  }

  rankSuggestions(suggestions) {
    return suggestions.sort((a, b) => {
      // Sort by confidence, frequency, and relevance
      const scoreA = (a.confidence || 0.5) * (a.frequency || 1) * (a.relevance || 1);
      const scoreB = (b.confidence || 0.5) * (b.frequency || 1) * (b.relevance || 1);
      return scoreB - scoreA;
    });
  }

  generateWarnings(command, _context) {
    const warnings = [];
    const risk = this.assessCommandRisk(command);

    if (risk.level === 'high') {
      warnings.push({
        type: 'danger',
        message: `⚠️ HIGH RISK: ${risk.reason}`,
        suggestion: 'Consider using a safer alternative or double-check your command',
      });
    } else if (risk.level === 'medium') {
      warnings.push({
        type: 'warning',
        message: `⚠️ CAUTION: ${risk.reason}`,
        suggestion: 'Make sure you understand the implications of this command',
      });
    }

    return warnings;
  }

  generateTips(command, context) {
    const tips = [];

    // Add contextual tips based on command and environment
    if (command.includes('git') && !context.isGitRepo) {
      tips.push({
        type: 'info',
        message: 'ℹ️ This directory is not a Git repository',
        suggestion: 'Run "git init" to initialize a repository',
      });
    }

    if (command.includes('npm') && !context.hasPackageJson) {
      tips.push({
        type: 'info',
        message: 'ℹ️ No package.json found',
        suggestion: 'Run "npm init" to create a new Node.js project',
      });
    }

    return tips;
  }

  // Additional utility methods for pattern management
  generatePatternKey(command, context) {
    return `${command}:${context.cwd}:${context.projectType || 'unknown'}`;
  }

  updateCommandFrequency(command, _context) {
    const key = `frequency:${command}`;
    const current = this.commandHistory.get(key) || 0;
    this.commandHistory.set(key, current + 1);
  }

  learnCommandSequences(command, context) {
    // Track command sequences for workflow suggestions
    if (!this.commandSequences) {
      this.commandSequences = [];
    }

    this.commandSequences.push({
      command,
      context: context.cwd,
      timestamp: Date.now(),
    });

    // Keep only recent sequences (last 100)
    if (this.commandSequences.length > 100) {
      this.commandSequences = this.commandSequences.slice(-100);
    }
  }

  isPatternRelevant(patternKey, partialCommand, context) {
    const [cmd, cwd, projectType] = patternKey.split(':');

    // Check if command matches
    if (!cmd.startsWith(partialCommand) && !partialCommand.includes(cmd.split(' ')[0])) {
      return false;
    }

    // Check context relevance
    if (context.cwd === cwd || context.projectType === projectType) {
      return true;
    }

    return false;
  }

  extractCommandFromPattern(patternKey) {
    return patternKey.split(':')[0];
  }

  async loadUserPatterns() {
    try {
      if (window.electronAPI && window.electronAPI.loadUserPatterns) {
        const patterns = await window.electronAPI.loadUserPatterns();
        this.userPatterns = new Map(patterns);
      }
    } catch (error) {
      console.warn('Failed to load user patterns:', error);
    }
  }

  async loadContextPatterns() {
    try {
      if (window.electronAPI && window.electronAPI.loadContextPatterns) {
        const patterns = await window.electronAPI.loadContextPatterns();
        this.contextPatterns = new Map(patterns);
      }
    } catch (error) {
      console.warn('Failed to load context patterns:', error);
    }
  }

  async persistUserPatterns() {
    try {
      if (window.electronAPI && window.electronAPI.saveUserPatterns) {
        await window.electronAPI.saveUserPatterns(Array.from(this.userPatterns.entries()));
      }
    } catch (error) {
      console.warn('Failed to persist user patterns:', error);
    }
  }

  // Command-specific suggestion generators
  getNodeJSSuggestions(command, _context) {
    const suggestions = [];

    if (command.startsWith('npm')) {
      suggestions.push(
        { type: 'npm', text: 'npm run dev', description: 'Start development server' },
        { type: 'npm', text: 'npm run build', description: 'Build for production' },
        { type: 'npm', text: 'npm test', description: 'Run test suite' },
        { type: 'npm', text: 'npm audit', description: 'Check for vulnerabilities' }
      );
    }

    return suggestions;
  }

  getPythonSuggestions(command, _context) {
    const suggestions = [];

    if (command.startsWith('python')) {
      suggestions.push(
        { type: 'python', text: 'python -m venv venv', description: 'Create virtual environment' },
        {
          type: 'python',
          text: 'source venv/bin/activate',
          description: 'Activate virtual environment',
        },
        {
          type: 'python',
          text: 'pip install -r requirements.txt',
          description: 'Install dependencies',
        },
        { type: 'python', text: 'python -m pytest', description: 'Run tests' }
      );
    }

    return suggestions;
  }

  getRustSuggestions(command, _context) {
    const suggestions = [];

    if (command.startsWith('cargo')) {
      suggestions.push(
        { type: 'rust', text: 'cargo build', description: 'Build the project' },
        { type: 'rust', text: 'cargo run', description: 'Run the project' },
        { type: 'rust', text: 'cargo test', description: 'Run tests' },
        { type: 'rust', text: 'cargo check', description: 'Check for errors' }
      );
    }

    return suggestions;
  }

  getGoSuggestions(command, _context) {
    const suggestions = [];

    if (command.startsWith('go')) {
      suggestions.push(
        { type: 'go', text: 'go build', description: 'Build the package' },
        { type: 'go', text: 'go run main.go', description: 'Run the application' },
        { type: 'go', text: 'go test', description: 'Run tests' },
        { type: 'go', text: 'go mod tidy', description: 'Clean up dependencies' }
      );
    }

    return suggestions;
  }

  getGenericSuggestions(command, _context) {
    const suggestions = [];

    // Common command suggestions
    if (command.startsWith('ls')) {
      suggestions.push(
        { type: 'filesystem', text: 'ls -la', description: 'List all files with details' },
        { type: 'filesystem', text: 'ls -lh', description: 'List files with human-readable sizes' }
      );
    }

    if (command.startsWith('find')) {
      suggestions.push(
        { type: 'search', text: 'find . -name "*.js"', description: 'Find JavaScript files' },
        {
          type: 'search',
          text: 'find . -type f -mtime -1',
          description: 'Find files modified today',
        }
      );
    }

    return suggestions;
  }

  generateFileSearchSuggestions(command, files) {
    const suggestions = [];
    const commonExtensions = ['.js', '.ts', '.py', '.md', '.json', '.yaml', '.yml'];

    commonExtensions.forEach(ext => {
      const matchingFiles = files.filter(f => f.endsWith(ext));
      if (matchingFiles.length > 0) {
        suggestions.push({
          type: 'file-search',
          text: `find . -name "*${ext}"`,
          description: `Find ${ext} files (${matchingFiles.length} found)`,
          relevance: matchingFiles.length / files.length,
        });
      }
    });

    return suggestions;
  }

  async getSyntaxCompletions(partialCommand) {
    // This would integrate with shell completion systems
    // For now, return basic completions
    const completions = [];

    const commonCommands = [
      'ls',
      'cd',
      'pwd',
      'mkdir',
      'rmdir',
      'rm',
      'cp',
      'mv',
      'cat',
      'less',
      'head',
      'tail',
      'grep',
      'find',
      'sed',
      'awk',
      'git',
      'npm',
      'yarn',
      'docker',
      'kubectl',
      'curl',
      'wget',
    ];

    const matches = commonCommands.filter(cmd => cmd.startsWith(partialCommand.split(' ')[0]));

    matches.forEach(match => {
      completions.push({
        type: 'syntax',
        text: match,
        description: `Complete to ${match}`,
        confidence: 0.8,
      });
    });

    return completions;
  }

  estimateExecutionTime(command, _context) {
    // Simple estimation based on command type
    const timeEstimates = {
      ls: 100, // milliseconds
      pwd: 50,
      cd: 50,
      'git status': 500,
      'npm install': 30000,
      'npm test': 10000,
      'docker build': 120000,
      find: 2000,
    };

    const baseCommand = command.split(' ')[0];
    return timeEstimates[baseCommand] || 1000;
  }

  handleTerminalInput(data) {
    // Process terminal input for real-time suggestions
    if (this.inputBuffer) {
      this.inputBuffer += data;
    } else {
      this.inputBuffer = data;
    }

    // Debounce input processing
    if (this.inputTimeout) {
      clearTimeout(this.inputTimeout);
    }

    this.inputTimeout = setTimeout(() => {
      this.processInput(this.inputBuffer);
      this.inputBuffer = '';
    }, 150);
  }

  async processInput(input) {
    if (input && input.trim().length > 2) {
      const analysis = await this.analyzeCommandInRealTime(input.trim());
      this.emitEvent('commandAnalysis', analysis);
    }
  }

  handleCommandCompletion(result) {
    // Process completed command for learning
    this.learnFromExecution(result.command, result.context, result);
  }
}

/**
 * Enhanced Process Execution with Monitoring
 */
class EnhancedExecution {
  constructor(command, analysis, options = {}) {
    this.command = command;
    this.analysis = analysis;
    this.options = options;
    this.startTime = null;
    this.endTime = null;
    this.process = null;
  }

  async run() {
    this.startTime = Date.now();

    try {
      const result = await this.executeWithMonitoring();
      this.endTime = Date.now();

      return {
        ...result,
        executionTime: this.endTime - this.startTime,
        analysis: this.analysis,
      };
    } catch (error) {
      this.endTime = Date.now();

      return {
        success: false,
        error: error.message,
        executionTime: this.endTime - this.startTime,
        analysis: this.analysis,
      };
    }
  }

  async executeWithMonitoring() {
    try {
      if (window.electronAPI && window.electronAPI.executeCommand) {
        // Safe wrapper to prevent executeCommand readonly errors
        const safeExecuteCommand = (...args) => {
          try {
            return window.electronAPI.executeCommand(...args);
          } catch (error) {
            if (error.message.includes('read-only') || error.message.includes('readonly')) {
              console.warn('executeCommand is read-only, using alternative execution method');
              return this.fallbackExecution();
            }
            throw new Error(error);
          }
        };

        return await safeExecuteCommand(this.command, {
          ...this.options,
          monitoring: true,
          timeout: Math.max(this.analysis.estimatedTime * 2, 5000), // At least 5 seconds timeout
        });
      }

      return await this.fallbackExecution();
    } catch (error) {
      console.error('Command execution error:', error);
      throw new Error(new Error(`Command execution failed: ${error.message}`));
    }
  }

  async fallbackExecution() {
    // Fallback execution method when main API is not available
    return {
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: 'Command execution API not available',
      error: 'Fallback execution - limited functionality',
    };
  }
}

// Safe export to prevent duplicate declarations
(function () {
  const exportObj = { EnhancedCommandIntelligence, EnhancedExecution };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportObj;
  } else {
    // Prevent duplicate global declarations
    if (typeof window.EnhancedCommandIntelligence === 'undefined') {
      window.EnhancedCommandIntelligence = EnhancedCommandIntelligence;
    }
    if (typeof window.EnhancedExecution === 'undefined') {
      window.EnhancedExecution = EnhancedExecution;
    }
  }
})();
