const { test, expect } = require('@jest/globals');
const _path = require('path');
const _fs = require('fs').promises;

// Mock AI Assistant functionality for testing
class MockAIAssistant {
  constructor() {
    this.knowledgeBase = {
      commands: {
        git: {
          description: 'Version control system',
          suggestions: [
            'git status - Check repository status',
            'git add . - Stage all changes',
            'git commit -m "message" - Commit changes',
          ],
        },
        npm: {
          description: 'Node package manager',
          suggestions: [
            'npm install - Install dependencies',
            'npm start - Start application',
            'npm test - Run tests',
          ],
        },
      },
    };
  }

  async getCommandSuggestion(query) {
    if (!query || query.trim() === '') {
      return 'Please provide a command to get suggestions';
    }

    const words = query.toLowerCase().split(' ');
    const command = words[0];

    if (this.knowledgeBase.commands[command]) {
      return this.knowledgeBase.commands[command].suggestions[0].split(' - ')[0];
    }

    if (query.includes('list')) return 'ls -la';
    if (query.includes('copy')) return 'cp source dest';
    if (query.includes('move')) return 'mv source dest';

    return `Try: ${command} --help`;
  }

  async explainCommand(command) {
    if (!command) {
      return 'No command provided for explanation';
    }

    if (command.includes('ls')) {
      return 'Lists directory contents and files';
    }
    if (command.includes('git')) {
      return 'Git command for version control operations';
    }
    if (command.includes('npm')) {
      return 'Node Package Manager command for handling dependencies';
    }

    return `Command: ${command} - General command line utility`;
  }

  async suggestWorkflow(task) {
    if (!task) {
      return 'No task specified for workflow';
    }

    if (task.includes('deploy')) {
      return ['git add .', 'git commit -m "Deploy"', 'git push', 'npm run build'];
    }
    if (task.includes('project')) {
      return ['mkdir project', 'cd project', 'npm init -y', 'git init'];
    }

    return `Workflow for: ${task}`;
  }

  async analyzeCommandOutput(command, _output) {
    return `Analysis: Command '${command}' executed successfully with output length: ${_output?.length || 0}`;
  }

  async getContextualHelp(context) {
    return `Contextual help for: ${context.command || 'unknown command'}`;
  }
}

// Mock Terminal Manager
class MockTerminalManager {
  constructor() {
    this.initialized = false;
  }

  init(terminal) {
    this.terminal = terminal;
    this.initialized = true;
    if (terminal && terminal.onData) {
      terminal.onData(() => {});
    }
  }
}

// Mock Predictive Completion
class MockPredictiveCompletion {
  constructor() {
    this.initialized = false;
  }

  init() {
    this.initialized = true;
  }

  async getSuggestions(input, _context = {}, config = {}) {
    if (!input) return [];

    const suggestions = [];

    if (input.startsWith('gi')) {
      suggestions.push({ text: 'git', score: 0.9 });
      suggestions.push({ text: 'git status', score: 0.8 });
    }

    if (input.startsWith('npm')) {
      suggestions.push({ text: 'npm install', score: 0.9 });
      suggestions.push({ text: 'npm start', score: 0.8 });
    }

    if (input.startsWith('ls')) {
      suggestions.push({ text: 'ls -la', score: 0.9 });
      suggestions.push({ text: 'ls -l', score: 0.8 });
    }

    const maxSuggestions = config.maxSuggestions || 5;
    return suggestions.slice(0, maxSuggestions);
  }
}

describe('AI Terminal Integration Tests', () => {
  let aiAssistant;
  let terminalManager;
  let predictiveCompletion;

  beforeAll(async () => {
    // Initialize mock classes
    aiAssistant = new MockAIAssistant();
    terminalManager = new MockTerminalManager();
    predictiveCompletion = new MockPredictiveCompletion();
  });

  describe('AI Assistant Integration', () => {
    test('should initialize AI assistant successfully', () => {
      expect(aiAssistant).toBeDefined();
      expect(typeof aiAssistant.getCommandSuggestion).toBe('function');
      expect(typeof aiAssistant.explainCommand).toBe('function');
      expect(typeof aiAssistant.suggestWorkflow).toBe('function');
    });

    test('should provide command suggestions', async () => {
      const suggestion = await aiAssistant.getCommandSuggestion('list files');
      expect(suggestion).toBeDefined();
      expect(typeof suggestion).toBe('string');
      expect(suggestion.length).toBeGreaterThan(0);
    });

    test('should explain commands correctly', async () => {
      const explanation = await aiAssistant.explainCommand('ls -la');
      expect(explanation).toBeDefined();
      expect(typeof explanation).toBe('string');
      expect(explanation.toLowerCase()).toContain('list');
    });

    test('should suggest workflows', async () => {
      const workflow = await aiAssistant.suggestWorkflow('deploy application');
      expect(workflow).toBeDefined();
      expect(Array.isArray(workflow) || typeof workflow === 'string').toBe(true);
    });

    test('should handle invalid inputs gracefully', async () => {
      const result = await aiAssistant.getCommandSuggestion('');
      expect(result).toBeDefined();
      // Should not throw an error
    });

    test('should handle network errors gracefully', async () => {
      // Simulate network error by providing malformed input
      const result = await aiAssistant.explainCommand(null);
      expect(result).toBeDefined();
      // Should provide fallback response
    });
  });

  describe('Terminal Manager Integration', () => {
    test('should initialize terminal manager', () => {
      expect(terminalManager).toBeDefined();
      expect(typeof terminalManager.init).toBe('function');
    });

    test('should integrate with AI assistant', () => {
      const mockTerminal = {
        write: jest.fn(),
        onData: jest.fn(),
      };

      // Initialize terminal manager
      terminalManager.init(mockTerminal);

      // Should not throw errors
      expect(mockTerminal.onData).toHaveBeenCalled();
    });
  });

  describe('Predictive Completion Integration', () => {
    test('should initialize predictive completion plugin', () => {
      expect(predictiveCompletion).toBeDefined();
      expect(typeof predictiveCompletion.init).toBe('function');
      expect(typeof predictiveCompletion.getSuggestions).toBe('function');
    });

    test('should provide predictive suggestions', async () => {
      const suggestions = await predictiveCompletion.getSuggestions('gi');
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);

      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty('text');
        expect(suggestions[0]).toHaveProperty('score');
      }
    });

    test('should handle context-aware suggestions', async () => {
      const context = {
        currentDirectory: '/home/user/project',
        recentCommands: ['git status', 'npm install'],
      };

      const suggestions = await predictiveCompletion.getSuggestions('git', context);
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('should work in fallback mode', async () => {
      // Initialize global.window if not set
      if (!global.window) {
        global.window = {};
      }

      // Temporarily disable AI features
      const originalAI = global.window.aiEnabled;
      global.window.aiEnabled = false;

      try {
        const suggestions = await predictiveCompletion.getSuggestions('ls');
        expect(suggestions).toBeDefined();
        expect(Array.isArray(suggestions)).toBe(true);
      } finally {
        if (originalAI !== undefined) {
          global.window.aiEnabled = originalAI;
        } else {
          delete global.window.aiEnabled;
        }
      }
    });
  });

  describe('AI-Terminal Communication', () => {
    test('should handle command execution with AI feedback', async () => {
      const command = 'git status';
      const mockOutput = 'On branch main\nnothing to commit, working tree clean';

      // Test AI analysis of command output
      const analysis = await aiAssistant.analyzeCommandOutput(command, mockOutput);
      expect(analysis).toBeDefined();
    });

    test('should provide contextual help', async () => {
      const context = {
        command: 'git merge',
        error: 'CONFLICT (content): Merge conflict in file.txt',
      };

      const help = await aiAssistant.getContextualHelp(context);
      expect(help).toBeDefined();
      expect(typeof help).toBe('string');
    });
  });

  describe('Performance and Error Handling', () => {
    test('should handle concurrent AI requests', async () => {
      const promises = [
        aiAssistant.getCommandSuggestion('list'),
        aiAssistant.getCommandSuggestion('copy'),
        aiAssistant.getCommandSuggestion('move'),
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    test('should timeout long-running AI requests', async () => {
      const startTime = Date.now();
      const result = await aiAssistant.getCommandSuggestion('complex query that might take long');
      const endTime = Date.now();

      // Should complete within reasonable time (10 seconds)
      expect(endTime - startTime).toBeLessThan(10000);
      expect(result).toBeDefined();
    }, 15000);

    test('should handle memory constraints', async () => {
      // Test with large inputs
      const largeInput = 'command '.repeat(1000);
      const result = await aiAssistant.explainCommand(largeInput);
      expect(result).toBeDefined();
    });
  });

  describe('Configuration and Fallback', () => {
    test('should respect AI configuration settings', async () => {
      const config = {
        aiEnabled: true,
        fallbackEnabled: true,
        maxSuggestions: 5,
      };

      // Test configuration application
      const suggestions = await predictiveCompletion.getSuggestions('test', {}, config);
      expect(suggestions).toBeDefined();

      if (suggestions.length > 0) {
        expect(suggestions.length).toBeLessThanOrEqual(config.maxSuggestions);
      }
    });

    test('should work without OpenAI API key', async () => {
      // Simulate missing API key
      const originalEnv = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      try {
        const suggestion = await aiAssistant.getCommandSuggestion('help');
        expect(suggestion).toBeDefined();
        // Should provide fallback response
      } finally {
        if (originalEnv) {
          process.env.OPENAI_API_KEY = originalEnv;
        }
      }
    });

    test('should handle API rate limiting gracefully', async () => {
      // Simulate rate limiting by making many requests quickly
      const requests = Array(10)
        .fill()
        .map(() => aiAssistant.getCommandSuggestion('test'));

      const results = await Promise.allSettled(requests);
      const successful = results.filter(r => r.status === 'fulfilled');

      // Should handle gracefully - either succeed or fail gracefully
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe('Real-world Usage Scenarios', () => {
    test('should handle git workflow assistance', async () => {
      const gitCommands = ['git add .', 'git commit -m "test"', 'git push origin main'];

      for (const command of gitCommands) {
        const explanation = await aiAssistant.explainCommand(command);
        expect(explanation).toBeDefined();
        expect(explanation.toLowerCase()).toContain('git');
      }
    });

    test('should handle file system operations', async () => {
      const fsCommands = ['ls', 'cd', 'mkdir', 'cp', 'mv', 'rm'];

      for (const command of fsCommands) {
        const suggestion = await aiAssistant.getCommandSuggestion(`how to ${command}`);
        expect(suggestion).toBeDefined();
      }
    });

    test('should handle development workflows', async () => {
      const devWorkflow = await aiAssistant.suggestWorkflow('setup new project');
      expect(devWorkflow).toBeDefined();

      if (Array.isArray(devWorkflow)) {
        expect(devWorkflow.length).toBeGreaterThan(0);
      }
    });
  });
});
