/**
 * Enhanced Command Suggestions System
 * Provides intelligent, context-aware command suggestions with fuzzy matching
 */

// levenshteinDistance function is defined at the bottom of this file

export class EnhancedCommandSuggestions {
  constructor() {
    this.commandHistory = [];
    this.contextualData = new Map();
    this.frequencyMap = new Map();
    this.lastDirectory = null;
    this.projectContext = null;

    // Common command patterns
    this.commandPatterns = {
      git: {
        commands: [
          'status',
          'add',
          'commit',
          'push',
          'pull',
          'branch',
          'checkout',
          'merge',
          'rebase',
          'log',
          'diff',
          'stash',
          'reset',
          'fetch',
          'clone',
        ],
        contextual: {
          'package.json': ['npm install', 'npm run dev', 'npm test', 'npm build'],
          Gemfile: ['bundle install', 'bundle exec', 'bundle update'],
          'requirements.txt': ['pip install -r requirements.txt', 'python -m venv venv'],
          'Cargo.toml': ['cargo build', 'cargo run', 'cargo test'],
          'go.mod': ['go build', 'go run', 'go test', 'go mod tidy'],
        },
      },
      npm: {
        commands: [
          'install',
          'run',
          'test',
          'build',
          'start',
          'init',
          'publish',
          'update',
          'audit',
          'ci',
        ],
        scripts: [], // Will be populated from package.json
      },
      docker: {
        commands: [
          'build',
          'run',
          'ps',
          'images',
          'exec',
          'logs',
          'stop',
          'rm',
          'compose up',
          'compose down',
        ],
        contextual: {
          Dockerfile: ['docker build -t', 'docker run'],
          'docker-compose.yml': ['docker-compose up', 'docker-compose down', 'docker-compose logs'],
        },
      },
      system: {
        commands: [
          'ls',
          'cd',
          'pwd',
          'mkdir',
          'rm',
          'cp',
          'mv',
          'cat',
          'grep',
          'find',
          'chmod',
          'chown',
        ],
        aliases: new Map(),
      },
    };

    // Initialize fuzzy matching cache
    this.fuzzyCache = new Map();
    this.initializeAliases();
  }

  /**
   * Initialize common command aliases
   */
  initializeAliases() {
    this.commandPatterns.system.aliases.set('ll', 'ls -la');
    this.commandPatterns.system.aliases.set('la', 'ls -a');
    this.commandPatterns.system.aliases.set('..', 'cd ..');
    this.commandPatterns.system.aliases.set('...', 'cd ../..');
    this.commandPatterns.system.aliases.set('g', 'git');
    this.commandPatterns.system.aliases.set('d', 'docker');
    this.commandPatterns.system.aliases.set('dc', 'docker-compose');
    this.commandPatterns.system.aliases.set('k', 'kubectl');
  }

  /**
   * Get suggestions for a partial command
   */
  async getSuggestions(input, options = {}) {
    const {
      maxSuggestions = 10,
      includeHistory = true,
      includeContextual = true,
      includeFuzzy = true,
      minScore = 0.3,
    } = options;

    const suggestions = new Map(); // Use Map to avoid duplicates
    const inputLower = input.toLowerCase().trim();

    // 1. Check for exact alias matches
    if (this.commandPatterns.system.aliases.has(inputLower)) {
      suggestions.set(this.commandPatterns.system.aliases.get(inputLower), {
        type: 'alias',
        score: 1.0,
        description: `Alias for: ${inputLower}`,
      });
    }

    // 2. Get contextual suggestions based on current directory
    if (includeContextual) {
      const contextSuggestions = await this.getContextualSuggestions(input);
      contextSuggestions.forEach(sug => suggestions.set(sug.command, sug));
    }

    // 3. Check command history
    if (includeHistory) {
      const historySuggestions = this.getHistorySuggestions(input, minScore);
      historySuggestions.forEach(sug => {
        if (!suggestions.has(sug.command)) {
          suggestions.set(sug.command, sug);
        }
      });
    }

    // 4. Fuzzy match against known commands
    if (includeFuzzy) {
      const fuzzySuggestions = this.getFuzzySuggestions(input, minScore);
      fuzzySuggestions.forEach(sug => {
        if (!suggestions.has(sug.command)) {
          suggestions.set(sug.command, sug);
        }
      });
    }

    // 5. Sort by score and frequency
    const sortedSuggestions = Array.from(suggestions.values())
      .sort((a, b) => {
        // Priority: score * frequency
        const scoreA = a.score * (this.frequencyMap.get(a.command) || 1);
        const scoreB = b.score * (this.frequencyMap.get(b.command) || 1);
        return scoreB - scoreA;
      })
      .slice(0, maxSuggestions);

    return sortedSuggestions;
  }

  /**
   * Get contextual suggestions based on project files
   */
  async getContextualSuggestions(input) {
    const suggestions = [];
    const files = await this.getProjectFiles();

    // Check for project-specific files
    for (const [file, commands] of Object.entries(this.commandPatterns.git.contextual)) {
      if (files.includes(file)) {
        commands.forEach(cmd => {
          if (this.fuzzyMatch(input, cmd) > 0.3) {
            suggestions.push({
              command: cmd,
              type: 'contextual',
              score: this.fuzzyMatch(input, cmd),
              description: `Common command for ${file}`,
            });
          }
        });
      }
    }

    // NPM scripts from package.json
    if (files.includes('package.json') && (input.startsWith('npm') || input.startsWith('yarn'))) {
      const scripts = await this.getNpmScripts();
      scripts.forEach(script => {
        const cmd = `npm run ${script}`;
        if (this.fuzzyMatch(input, cmd) > 0.3) {
          suggestions.push({
            command: cmd,
            type: 'npm-script',
            score: this.fuzzyMatch(input, cmd),
            description: 'NPM script',
          });
        }
      });
    }

    return suggestions;
  }

  /**
   * Get suggestions from command history
   */
  getHistorySuggestions(input, minScore) {
    const suggestions = [];
    const recentCommands = this.commandHistory.slice(-100); // Last 100 commands

    recentCommands.forEach(cmd => {
      const score = this.fuzzyMatch(input, cmd);
      if (score >= minScore) {
        suggestions.push({
          command: cmd,
          type: 'history',
          score: score,
          description: 'From history',
        });
      }
    });

    return suggestions;
  }

  /**
   * Get fuzzy matched suggestions from known commands
   */
  getFuzzySuggestions(input, minScore) {
    const suggestions = [];
    const allCommands = this.getAllKnownCommands();

    allCommands.forEach(cmd => {
      const score = this.fuzzyMatch(input, cmd);
      if (score >= minScore) {
        suggestions.push({
          command: cmd,
          type: 'fuzzy',
          score: score,
          description: this.getCommandDescription(cmd),
        });
      }
    });

    return suggestions;
  }

  /**
   * Fuzzy matching algorithm
   */
  fuzzyMatch(input, target) {
    // Cache key
    const cacheKey = `${input}:${target}`;
    if (this.fuzzyCache.has(cacheKey)) {
      return this.fuzzyCache.get(cacheKey);
    }

    const inputLower = input.toLowerCase();
    const targetLower = target.toLowerCase();

    // Exact match
    if (targetLower === inputLower) {
      this.fuzzyCache.set(cacheKey, 1.0);
      return 1.0;
    }

    // Starts with
    if (targetLower.startsWith(inputLower)) {
      const score = 0.9 - (0.1 * (targetLower.length - inputLower.length)) / targetLower.length;
      this.fuzzyCache.set(cacheKey, score);
      return score;
    }

    // Contains
    if (targetLower.includes(inputLower)) {
      const score = 0.7 - (0.1 * targetLower.indexOf(inputLower)) / targetLower.length;
      this.fuzzyCache.set(cacheKey, score);
      return score;
    }

    // Fuzzy match using character positions
    let score = 0;
    let inputIndex = 0;
    let consecutiveMatches = 0;

    for (let i = 0; i < targetLower.length && inputIndex < inputLower.length; i++) {
      if (targetLower[i] === inputLower[inputIndex]) {
        score += 1 + consecutiveMatches * 0.5; // Bonus for consecutive matches
        consecutiveMatches++;
        inputIndex++;
      } else {
        consecutiveMatches = 0;
      }
    }

    // All input characters must be found
    if (inputIndex === inputLower.length) {
      const normalizedScore = Math.min(score / (inputLower.length * 2), 0.9);
      this.fuzzyCache.set(cacheKey, normalizedScore);
      return normalizedScore;
    }

    // Levenshtein distance as fallback
    const distance = levenshteinDistance(inputLower, targetLower);
    const maxLength = Math.max(inputLower.length, targetLower.length);
    const levScore = Math.max(0, 1 - distance / maxLength) * 0.5;

    this.fuzzyCache.set(cacheKey, levScore);
    return levScore;
  }

  /**
   * Get all known commands
   */
  getAllKnownCommands() {
    const commands = new Set();

    // Add git commands
    this.commandPatterns.git.commands.forEach(cmd => commands.add(`git ${cmd}`));

    // Add npm commands
    this.commandPatterns.npm.commands.forEach(cmd => commands.add(`npm ${cmd}`));

    // Add docker commands
    this.commandPatterns.docker.commands.forEach(cmd => commands.add(`docker ${cmd}`));

    // Add system commands
    this.commandPatterns.system.commands.forEach(cmd => commands.add(cmd));

    // Add aliases
    this.commandPatterns.system.aliases.forEach((value, key) => {
      commands.add(key);
      commands.add(value);
    });

    return Array.from(commands);
  }

  /**
   * Get command description
   */
  getCommandDescription(command) {
    const [base, ..._args] = command.split(' ');

    const descriptions = {
      git: 'Version control',
      npm: 'Node package manager',
      docker: 'Container management',
      ls: 'List directory contents',
      cd: 'Change directory',
      pwd: 'Print working directory',
      mkdir: 'Create directory',
      rm: 'Remove files/directories',
      cp: 'Copy files/directories',
      mv: 'Move/rename files',
      cat: 'Display file contents',
      grep: 'Search text patterns',
      find: 'Find files/directories',
      chmod: 'Change file permissions',
      chown: 'Change file ownership',
    };

    return descriptions[base] || 'Command';
  }

  /**
   * Add command to history
   */
  addToHistory(command) {
    // Remove duplicates
    this.commandHistory = this.commandHistory.filter(cmd => cmd !== command);
    this.commandHistory.push(command);

    // Update frequency
    this.frequencyMap.set(command, (this.frequencyMap.get(command) || 0) + 1);

    // Limit history size
    if (this.commandHistory.length > 1000) {
      this.commandHistory = this.commandHistory.slice(-1000);
    }

    // Clear fuzzy cache periodically
    if (this.fuzzyCache.size > 10000) {
      this.fuzzyCache.clear();
    }
  }

  /**
   * Update current directory context
   */
  updateDirectory(directory) {
    this.lastDirectory = directory;
    // Clear context when directory changes
    this.projectContext = null;
  }

  /**
   * Get project files (mock implementation - should be connected to file system)
   */
  async getProjectFiles() {
    // In a real implementation, this would scan the current directory
    // For now, return mock data based on common project types

    if (this.projectContext) {
      return this.projectContext;
    }

    // Mock implementation
    const mockFiles = [];

    // Simulate checking for project files
    const _possibleFiles = [
      'package.json',
      'Dockerfile',
      'docker-compose.yml',
      'Gemfile',
      'requirements.txt',
      'Cargo.toml',
      'go.mod',
      '.git',
      'Makefile',
    ];

    // In real implementation, check if these files exist
    // For now, randomly include some
    mockFiles.push('package.json', '.git'); // Common in most projects

    this.projectContext = mockFiles;
    return mockFiles;
  }

  /**
   * Get NPM scripts from package.json
   */
  async getNpmScripts() {
    // Mock implementation - in real app, parse package.json
    return ['start', 'build', 'test', 'dev', 'lint', 'format'];
  }

  /**
   * Clear caches
   */
  clearCache() {
    this.fuzzyCache.clear();
    this.projectContext = null;
  }
}

// Levenshtein distance helper
function levenshteinDistance(str1, str2) {
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

// Export singleton instance
export const commandSuggestions = new EnhancedCommandSuggestions();
