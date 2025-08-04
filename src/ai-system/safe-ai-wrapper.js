import logger from '../utils/logger.js';
/**
 * Safe AI Wrapper - Fault-tolerant AI Integration
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * Provides a safe wrapper around AI providers with graceful degradation
 * when AI services are unavailable or fail.
 */

export class SafeAIWrapper {
  constructor(provider, options = {}) {
    this.provider = provider;
    this.available = false;
    this.engine = null;
    this.retryCount = 0;
    this.maxRetries = options.maxRetries || 3;
    this.timeout = options.timeout || 10000; // 10 seconds
    this.fallbackMode = options.fallbackMode || true;

    this.initialize();
  }

  initialize() {
    try {
      if (typeof this.provider === 'function') {
        this.engine = new this.provider();
        this.available = true;
      } else if (this.provider && typeof this.provider.predictCommand === 'function') {
        this.engine = this.provider;
        this.available = true;
        logger.debug('✅ AI Engine initialized with provider instance');
      } else {
        console.warn('⚠️ AI provider is not valid, running in fallback mode');
        this.available = false;
      }
    } catch (err) {
      console.error('❌ Failed to initialize AI provider:', err);
      this.available = false;
    }
  }

  async withTimeout(promise, timeoutMs = this.timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI operation timed out')), timeoutMs)
      ),
    ]);
  }

  async safeExecute(operation, fallback = null) {
    if (!this.available && !this.fallbackMode) {
      return fallback;
    }

    try {
      const result = await this.withTimeout(operation());
      this.retryCount = 0; // Reset on success
      return result;
    } catch (err) {
      console.error('AI operation failed:', err);

      // Retry logic only for available AI
      if (this.retryCount < this.maxRetries && this.available) {
        this.retryCount++;
        return this.safeExecute(operation, fallback);
      }

      // Fallback after max retries
      this.retryCount = 0;
      return fallback;
    }
  }

  async predictCommand(input) {
    return this.safeExecute(
      () => this.engine.predictCommand(input),
      this.fallbackMode ? this.getFallbackPrediction(input) : null
    );
  }

  async processUserCommand(command, context = {}) {
    return this.safeExecute(
      () => this.engine.processUserCommand(command, context),
      this.fallbackMode
        ? {
          response: `🌊 Processing "${command}" in fallback mode`,
          suggestions: [],
        }
        : null
    );
  }

  async generateDocs(command) {
    return this.safeExecute(
      () => this.engine.generateDocs(command),
      this.fallbackMode ? this.getFallbackDocs(command) : null
    );
  }

  async analyzeError(error, command) {
    return this.safeExecute(
      () => this.engine.analyzeError(error, command),
      this.fallbackMode ? this.getFallbackErrorAnalysis(error, command) : null
    );
  }

  async suggestOptimization(command, performance) {
    return this.safeExecute(
      () => this.engine.suggestOptimization(command, performance),
      this.fallbackMode ? this.getFallbackOptimization(command, performance) : null
    );
  }

  async validateCommand(command) {
    return this.safeExecute(
      () => this.engine.validateCommand(command),
      this.fallbackMode ? this.getFallbackValidation(command) : { safe: true, warnings: [] }
    );
  }

  // Fallback implementations for offline functionality
  getFallbackPrediction(input) {
    const commonCompletions = {
      gi: 'git',
      npm: 'npm install',
      cd: 'cd ..',
      ls: 'ls -la',
      dir: 'dir',
      pw: 'pwd',
      mk: 'mkdir',
      rm: 'rm -rf',
      cp: 'cp -r',
      mv: 'mv',
    };

    const partial = input.trim().toLowerCase();
    for (const [key, value] of Object.entries(commonCompletions)) {
      if (key.startsWith(partial)) {
        return value;
      }
    }
    return null;
  }

  getFallbackDocs(command) {
    const basicDocs = {
      git: 'Git - Version control system. Common commands: git add, git commit, git push',
      npm: 'NPM - Node package manager. Common commands: npm install, npm run, npm start',
      cd: 'Change directory. Usage: cd [directory]',
      ls: 'List directory contents. Usage: ls [options] [directory]',
      mkdir: 'Create directory. Usage: mkdir [directory_name]',
      pwd: 'Print working directory - shows current location',
    };

    const cmd = command.split(' ')[0].toLowerCase();
    return basicDocs[cmd] || `Command: ${command} - No documentation available offline`;
  }

  getFallbackErrorAnalysis(error, command) {
    const commonErrors = {
      'command not found': `Command "${command}" not found. Check spelling or install required software.`,
      'permission denied':
        'Permission denied. Try running with elevated privileges or check file permissions.',
      'no such file': 'File or directory not found. Check the path and try again.',
      'syntax error': 'Syntax error in command. Check command format and try again.',
    };

    const errorLower = error.toLowerCase();
    for (const [key, value] of Object.entries(commonErrors)) {
      if (errorLower.includes(key)) {
        return value;
      }
    }
    return `Error occurred: ${error}. Please check the command and try again.`;
  }

  getFallbackOptimization(command, performance) {
    if (performance.time > 5000) {
      return `Command took ${Math.round(performance.time)}ms. Consider using faster alternatives or optimizing the operation.`;
    }
    return null;
  }

  getFallbackValidation(command) {
    const dangerousPatterns = [
      'rm -rf /',
      'rm -rf *',
      'del /s /q',
      'format c:',
      'shutdown -r -t 0',
    ];

    const warnings = [];
    const cmdLower = command.toLowerCase();

    for (const pattern of dangerousPatterns) {
      if (cmdLower.includes(pattern)) {
        warnings.push(`⚠️ Potentially dangerous command detected: ${pattern}`);
      }
    }

    return {
      safe: warnings.length === 0,
      warnings,
    };
  }

  // Health check
  async healthCheck() {
    if (!this.available) {
      return { status: 'unavailable', message: 'AI provider not initialized' };
    }

    try {
      const testResult = await this.withTimeout(
        () => (this.engine.healthCheck ? this.engine.healthCheck() : Promise.resolve('ok')),
        5000
      );
      return { status: 'healthy', message: 'AI provider is responsive', result: testResult };
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  }

  // Restart AI engine
  async restart() {
    this.available = false;
    this.engine = null;
    this.retryCount = 0;

    setTimeout(() => {
      this.initialize();
    }, 1000);
  }

  getStatus() {
    return {
      available: this.available,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      fallbackMode: this.fallbackMode,
    };
  }
}
