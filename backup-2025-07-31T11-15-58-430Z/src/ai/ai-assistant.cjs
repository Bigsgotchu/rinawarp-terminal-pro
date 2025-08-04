/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * AI Assistant for RinaWarp Terminal
 * Provides intelligent command suggestions, code assistance, and context-aware help
 */

const config = require('../config/unified-config.cjs');

class AIAssistant {
  constructor(terminal) {
    this.terminal = terminal;
    this.aiEnabled = config.get('features.aiAssistant') || false;
    this.currentContext = '';
    this.commandHistory = [];
    this.workingDirectory = process.env.HOME || process.env.USERPROFILE;

    this.knowledgeBase = this.initializeKnowledgeBase();
    this.setupAIFeatures();
  }

  initializeKnowledgeBase() {
    const platform = process.platform;

    return {
      // Common commands with AI-enhanced descriptions
      commands: {
        git: {
          description: 'Version control system',
          suggestions: [
            'git status - Check repository status',
            'git add . - Stage all changes',
            'git commit -m "message" - Commit changes',
            'git push - Push to remote repository',
            'git pull - Pull from remote repository',
            'git branch - List branches',
            'git checkout -b <branch> - Create new branch',
          ],
          smartSuggestions: context => {
            if (context.includes('modified')) return 'git add . && git commit -m "Update files"';
            if (context.includes('untracked')) return 'git add .';
            if (context.includes('ahead')) return 'git push';
            if (context.includes('behind')) return 'git pull';
            return 'git status';
          },
        },
        npm: {
          description: 'Node package manager',
          suggestions: [
            'npm install - Install dependencies',
            'npm start - Start application',
            'npm test - Run tests',
            'npm run build - Build application',
            'npm init - Initialize new project',
            'npm audit - Check for vulnerabilities',
          ],
          smartSuggestions: context => {
            if (context.includes('package.json')) return 'npm install';
            if (context.includes('outdated')) return 'npm update';
            if (context.includes('vulnerabilities')) return 'npm audit fix';
            return 'npm start';
          },
        },
        node: {
          description: 'JavaScript runtime',
          suggestions: [
            'node --version - Check Node version',
            'node script.js - Run JavaScript file',
            'node -e "code" - Execute inline code',
            'node --inspect script.js - Debug with inspector',
          ],
        },
      },

      // Windows-specific commands
      windows:
        platform === 'win32'
          ? {
            dir: 'List directory contents',
            cd: 'Change directory',
            copy: 'Copy files',
            move: 'Move/rename files',
            del: 'Delete files',
            mkdir: 'Create directory',
            rmdir: 'Remove directory',
            type: 'Display file contents',
            cls: 'Clear screen',
            ipconfig: 'Display network configuration',
            tasklist: 'List running processes',
            taskkill: 'Terminate processes',
            powershell: 'Start PowerShell',
            code: 'Open Visual Studio Code',
          }
          : {},

      // Unix-like commands
      unix:
        platform !== 'win32'
          ? {
            ls: 'List directory contents',
            cd: 'Change directory',
            cp: 'Copy files',
            mv: 'Move/rename files',
            rm: 'Remove files',
            mkdir: 'Create directory',
            rmdir: 'Remove directory',
            cat: 'Display file contents',
            clear: 'Clear screen',
            grep: 'Search text patterns',
            find: 'Find files',
            ps: 'List processes',
            kill: 'Terminate processes',
            chmod: 'Change file permissions',
            code: 'Open Visual Studio Code',
          }
          : {},

      // Programming contexts
      programming: {
        javascript: {
          extensions: ['.js', '.ts', '.jsx', '.tsx', '.mjs'],
          suggestions: [
            'npm install - Install dependencies',
            'npm test - Run tests',
            'node script.js - Run JavaScript',
            'npm run lint - Check code style',
          ],
        },
        python: {
          extensions: ['.py', '.pyw'],
          suggestions: [
            'python script.py - Run Python script',
            'pip install package - Install package',
            'python -m venv env - Create virtual environment',
            'pip freeze > requirements.txt - Export dependencies',
          ],
        },
        git: {
          indicators: ['.git', 'package.json', 'requirements.txt'],
          suggestions: [
            'git status - Check status',
            'git add . - Stage changes',
            'git commit -m "message" - Commit',
            'git push - Push changes',
          ],
        },
      },
    };
  }

  setupAIFeatures() {
    if (!this.terminal) return;

    // Setup AI command suggestions
    this.setupSmartSuggestions();

    // Setup context awareness
    this.setupContextTracking();

    // Setup AI help system
    this.setupAIHelp();
  }

  setupSmartSuggestions() {
    // Monitor user input for intelligent suggestions
    let currentInput = '';

    this.terminal.onData(data => {
      if (!this.aiEnabled) return;

      // Track current input
      if (data === '\r') {
        // Command executed
        if (currentInput.trim()) {
          this.commandHistory.push(currentInput.trim());
          this.analyzeCommand(currentInput.trim());
        }
        currentInput = '';
      } else if (data === '\b' || data === '\x7f') {
        // Backspace
        currentInput = currentInput.slice(0, -1);
      } else if (data.charCodeAt(0) >= 32) {
        // Printable character
        currentInput += data;
        this.provideSuggestions(currentInput);
      }
    });
  }

  setupContextTracking() {
    // Track current working directory and context
    setInterval(() => {
      if (this.aiEnabled) {
        this.updateContext();
      }
    }, 5000); // Update context every 5 seconds
  }

  updateContext() {
    try {
      // Detect current directory context
      const fs = require('node:fs');
      const path = require('node:path');

      // Check for common project files
      const projectFiles = ['package.json', 'requirements.txt', '.git', 'Cargo.toml', 'go.mod'];
      const context = [];

      for (const file of projectFiles) {
        if (fs.existsSync(path.join(this.workingDirectory, file))) {
          context.push(file);
        }
      }

      this.currentContext = context.join(', ');
    } catch (error) {
      // Ignore errors in context detection
    }
  }

  provideSuggestions(input) {
    if (input.length < 2) return;

    const suggestions = this.getSmartSuggestions(input);
    if (suggestions.length > 0) {
      this.showSuggestionOverlay(suggestions);
    }
  }

  getSmartSuggestions(input) {
    const suggestions = [];
    const words = input.trim().split(' ');
    const command = words[0];

    // Command-specific suggestions
    if (this.knowledgeBase.commands[command]) {
      const cmdData = this.knowledgeBase.commands[command];
      if (cmdData.smartSuggestions) {
        const smartSuggestion = cmdData.smartSuggestions(this.currentContext);
        if (smartSuggestion) {
          suggestions.push({
            text: smartSuggestion,
            description: 'AI suggestion based on current context',
            type: 'smart',
          });
        }
      }

      // Add general command suggestions
      cmdData.suggestions.forEach(suggestion => {
        if (suggestion.toLowerCase().includes(input.toLowerCase())) {
          suggestions.push({
            text: suggestion.split(' - ')[0],
            description: suggestion.split(' - ')[1] || '',
            type: 'command',
          });
        }
      });
    }

    // Context-based suggestions
    if (this.currentContext.includes('package.json') && !command.startsWith('npm')) {
      suggestions.push({
        text: 'npm install',
        description: 'Install Node.js dependencies',
        type: 'context',
      });
    }

    if (this.currentContext.includes('.git') && !command.startsWith('git')) {
      suggestions.push({
        text: 'git status',
        description: 'Check Git repository status',
        type: 'context',
      });
    }

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  showSuggestionOverlay(suggestions) {
    // Remove existing overlay
    const existing = document.getElementById('ai-suggestions');
    if (existing) existing.remove();

    // Create suggestion overlay
    const overlay = document.createElement('div');
    overlay.id = 'ai-suggestions';
    overlay.className = 'ai-suggestions-overlay';

    overlay.innerHTML = `
      <div class="ai-suggestions-content">
        <div class="ai-suggestions-header">
          <span>🤖 AI Suggestions</span>
          <button class="close-suggestions">×</button>
        </div>
        <div class="suggestions-list">
          ${suggestions
    .map(
      (suggestion, index) => `
            <div class="suggestion-item" data-index="${index}">
              <div class="suggestion-text">${this.escapeHtml(suggestion.text)}</div>
              <div class="suggestion-description">${this.escapeHtml(suggestion.description)}</div>
              <div class="suggestion-type">${suggestion.type}</div>
            </div>
          `
    )
    .join('')}
        </div>
      </div>
    `;

    // Style the overlay
    overlay.style.cssText = `
      position: absolute;
      top: 50px;
      right: 10px;
      background: var(--header-bg, #2a2a2a);
      border: 1px solid var(--border-color, #3a3a3a);
      border-radius: 8px;
      width: 300px;
      max-height: 400px;
      overflow-y: auto;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    this.terminal.element.appendChild(overlay);

    // Add event listeners
    overlay.querySelector('.close-suggestions').onclick = () => overlay.remove();

    overlay.querySelectorAll('.suggestion-item').forEach((item, index) => {
      item.onclick = () => {
        const suggestion = suggestions[index];
        this.applySuggestion(suggestion.text);
        overlay.remove();
      };
    });

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (overlay.parentNode) overlay.remove();
    }, 10000);
  }

  applySuggestion(suggestionText) {
    // Apply the suggestion to the terminal
    this.terminal.write('\r\x1b[K' + suggestionText);
  }

  setupAIHelp() {
    // Create AI help panel
    this.createAIHelpPanel();
  }

  createAIHelpPanel() {
    const helpButton = document.createElement('button');
    helpButton.innerHTML = '🤖 AI Help';
    helpButton.className = 'ai-help-button';
    helpButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--accent-color, #00ff88);
      color: var(--bg-primary, #1a1a1a);
      border: none;
      border-radius: 20px;
      padding: 10px 15px;
      cursor: pointer;
      font-weight: bold;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    helpButton.onclick = () => this.showAIHelpDialog();
    document.body.appendChild(helpButton);
  }

  showAIHelpDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'ai-help-dialog';
    dialog.innerHTML = `
      <div class="ai-help-content">
        <div class="ai-help-header">
          <h3>🤖 AI Assistant</h3>
          <button class="close-ai-help">×</button>
        </div>
        <div class="ai-help-body">
          <div class="help-section">
            <h4>Smart Features</h4>
            <ul>
              <li><strong>F1</strong> - Show AI help</li>
              <li><strong>Type commands</strong> - Get AI suggestions</li>
              <li><strong>Context awareness</strong> - Suggestions based on your project</li>
            </ul>
          </div>
          <div class="help-section">
            <h4>Current Context</h4>
            <p>${this.currentContext || 'No specific context detected'}</p>
          </div>
          <div class="help-section">
            <h4>Recent Commands</h4>
            <ul>
              ${this.commandHistory
    .slice(-5)
    .map(cmd => `<li>${this.escapeHtml(cmd)}</li>`)
    .join('')}
            </ul>
          </div>
        </div>
      </div>
    `;

    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    document.body.appendChild(dialog);

    dialog.querySelector('.close-ai-help').onclick = () => dialog.remove();
    dialog.onclick = e => {
      if (e.target === dialog) dialog.remove();
    };
  }

  analyzeCommand(command) {
    // Analyze executed command for learning
    const words = command.split(' ');
    const cmd = words[0];

    // Update working directory if cd command
    if (cmd === 'cd' && words[1]) {
      const path = require('node:path');
      try {
        this.workingDirectory = path.resolve(this.workingDirectory, words[1]);
      } catch (error) {
        // Ignore path resolution errors
      }
    }
  }

  enable(enabled = true) {
    this.aiEnabled = enabled;
    config.set('features.aiAssistant', enabled);

    // Update UI
    const helpButton = document.querySelector('.ai-help-button');
    if (helpButton) {
      helpButton.style.display = enabled ? 'block' : 'none';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

module.exports = AIAssistant;
