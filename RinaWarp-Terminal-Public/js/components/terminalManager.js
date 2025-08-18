/**
 * Terminal Manager - Handles terminal interface and command processing
 */

export class TerminalManager {
  constructor() {
    this.initialized = false;
    this.terminal = null;
    this.aiManager = null;
    this.commandHistory = [];
    this.currentCommand = '';
    this.historyIndex = -1;
    this.isProcessing = false;
  }

  async init() {
    console.log('💻 Initializing Terminal Manager...');

    // Initialize terminal UI
    this.initializeUI();

    // Set up event listeners
    this.setupEventListeners();

    // Load command history
    await this.loadHistory();

    this.initialized = true;
    console.log('✅ Terminal Manager initialized');
  }

  initializeUI() {
    // Find or create terminal container
    this.terminal = document.getElementById('terminal');
    if (!this.terminal) {
      this.terminal = document.createElement('div');
      this.terminal.id = 'terminal';
      this.terminal.className = 'terminal-container';
      document.querySelector('.terminal-area')?.appendChild(this.terminal);
    }

    // Create terminal output area
    this.outputArea = document.createElement('div');
    this.outputArea.className = 'terminal-output';
    this.outputArea.setAttribute('role', 'log');
    this.outputArea.setAttribute('aria-live', 'polite');
    this.outputArea.setAttribute('aria-label', 'Terminal output');

    // Create input area
    this.inputArea = document.createElement('div');
    this.inputArea.className = 'terminal-input-container';

    // Create prompt
    this.prompt = document.createElement('span');
    this.prompt.className = 'terminal-prompt';
    this.prompt.textContent = 'rina@warp:~$ ';

    // Create input field
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'terminal-input';
    this.input.setAttribute('aria-label', 'Terminal command input');
    this.input.setAttribute('autocomplete', 'off');
    this.input.setAttribute('spellcheck', 'false');

    // Assemble terminal
    this.inputArea.appendChild(this.prompt);
    this.inputArea.appendChild(this.input);
    this.terminal.appendChild(this.outputArea);
    this.terminal.appendChild(this.inputArea);

    // Show welcome message
    this.showWelcome();
  }

  setupEventListeners() {
    if (!this.input) return;

    // Handle command input
    this.input.addEventListener('keydown', event => {
      this.handleKeyDown(event);
    });

    // Handle input changes
    this.input.addEventListener('input', event => {
      this.currentCommand = event.target.value;
    });

    // Focus management
    this.terminal.addEventListener('click', () => {
      this.input.focus();
    });

    // Auto-focus on load
    setTimeout(() => {
      this.input.focus();
    }, 100);
  }

  handleKeyDown(event) {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this.executeCommand();
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.navigateHistory('up');
        break;

      case 'ArrowDown':
        event.preventDefault();
        this.navigateHistory('down');
        break;

      case 'Tab':
        event.preventDefault();
        this.handleTabCompletion();
        break;

      case 'c':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.cancelCurrentCommand();
        }
        break;

      case 'l':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.clearTerminal();
        }
        break;
    }
  }

  async executeCommand() {
    if (this.isProcessing) return;

    const command = this.currentCommand.trim();
    if (!command) return;

    this.isProcessing = true;

    // Display command
    this.addOutput(`${this.prompt.textContent}${command}`, 'command');

    // Add to history
    this.addToHistory(command);

    // Clear input
    this.input.value = '';
    this.currentCommand = '';
    this.historyIndex = -1;

    try {
      // Process command
      await this.processCommand(command);
    } catch (error) {
      this.addOutput(`Error: ${error.message}`, 'error');
    } finally {
      this.isProcessing = false;
      this.input.focus();
    }
  }

  async processCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'help':
      case '?':
        this.showHelp();
        break;

      case 'clear':
      case 'cls':
        this.clearTerminal();
        break;

      case 'history':
        this.showHistory();
        break;

      case 'echo':
        this.addOutput(args.join(' '));
        break;

      case 'date':
        this.addOutput(new Date().toString());
        break;

      case 'version':
        this.addOutput('RinaWarp Terminal Creator Edition v3.0.0');
        break;

      case 'ai':
      case 'ask':
        if (this.aiManager) {
          await this.handleAICommand(args.join(' '));
        } else {
          this.addOutput('AI system not available', 'error');
        }
        break;

      case 'theme':
        this.handleThemeCommand(args[0]);
        break;

      case 'accessibility':
      case 'a11y':
        this.handleAccessibilityCommand(args);
        break;

      default:
        if (command.startsWith('/')) {
          // Treat as AI command
          if (this.aiManager) {
            await this.handleAICommand(command.substring(1));
          } else {
            this.addOutput('AI system not available', 'error');
          }
        } else {
          this.addOutput(`Command not found: ${cmd}. Type 'help' for available commands.`, 'error');
        }
    }
  }

  async handleAICommand(prompt) {
    if (!prompt) {
      this.addOutput('Please provide a prompt for the AI', 'error');
      return;
    }

    this.addOutput('🤖 AI is thinking...', 'ai-thinking');

    try {
      const response = await this.aiManager.generateResponse(prompt);
      this.addOutput(response, 'ai-response');
    } catch (error) {
      this.addOutput(`AI Error: ${error.message}`, 'error');
    }
  }

  handleThemeCommand(theme) {
    const validThemes = ['dark', 'light', 'auto'];
    if (!theme || !validThemes.includes(theme)) {
      this.addOutput(`Usage: theme [${validThemes.join('|')}]`, 'error');
      return;
    }

    document.documentElement.setAttribute('data-theme', theme);
    this.addOutput(`Theme changed to: ${theme}`);
  }

  handleAccessibilityCommand(args) {
    if (args.length === 0) {
      this.addOutput('Accessibility commands: high-contrast, reduce-motion, font-size');
      return;
    }

    const cmd = args[0];
    switch (cmd) {
      case 'high-contrast':
        document.body.classList.toggle('high-contrast');
        this.addOutput('High contrast mode toggled');
        break;
      case 'reduce-motion':
        document.body.classList.toggle('reduced-motion');
        this.addOutput('Reduced motion mode toggled');
        break;
      case 'font-size':
        if (args[1]) {
          document.documentElement.style.fontSize = args[1] + 'px';
          this.addOutput(`Font size set to ${args[1]}px`);
        } else {
          this.addOutput('Usage: accessibility font-size <size>');
        }
        break;
      default:
        this.addOutput(`Unknown accessibility command: ${cmd}`, 'error');
    }
  }

  navigateHistory(direction) {
    if (this.commandHistory.length === 0) return;

    if (direction === 'up') {
      this.historyIndex = Math.min(this.historyIndex + 1, this.commandHistory.length - 1);
    } else {
      this.historyIndex = Math.max(this.historyIndex - 1, -1);
    }

    if (this.historyIndex >= 0) {
      const command = this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];
      this.input.value = command;
      this.currentCommand = command;
      // Move cursor to end
      setTimeout(() => {
        this.input.setSelectionRange(command.length, command.length);
      }, 0);
    } else {
      this.input.value = '';
      this.currentCommand = '';
    }
  }

  handleTabCompletion() {
    const command = this.currentCommand;
    const commands = [
      'help',
      'clear',
      'history',
      'echo',
      'date',
      'version',
      'ai',
      'ask',
      'theme',
      'accessibility',
    ];

    const matches = commands.filter(cmd => cmd.startsWith(command));

    if (matches.length === 1) {
      this.input.value = matches[0] + ' ';
      this.currentCommand = matches[0] + ' ';
    } else if (matches.length > 1) {
      this.addOutput(`Possible completions: ${matches.join(', ')}`);
    }
  }

  addOutput(text, type = 'output') {
    const line = document.createElement('div');
    line.className = `terminal-line terminal-${type}`;

    if (type === 'ai-thinking') {
      line.innerHTML = `<span class="ai-thinking-indicator">${text}</span>`;
    } else {
      line.textContent = text;
    }

    this.outputArea.appendChild(line);
    this.scrollToBottom();

    // Announce to screen readers
    if (type !== 'command') {
      this.announceToScreenReader(text);
    }
  }

  addToHistory(command) {
    if (command && command !== this.commandHistory[this.commandHistory.length - 1]) {
      this.commandHistory.push(command);
      // Keep only last 100 commands
      if (this.commandHistory.length > 100) {
        this.commandHistory = this.commandHistory.slice(-100);
      }
    }
  }

  async loadHistory() {
    // This would integrate with storage manager
    console.log('📚 Command history loaded');
  }

  showWelcome() {
    const welcomeText = `
🌟 Welcome to RinaWarp Terminal Creator Edition v3.0.0
🧜‍♀️ Advanced AI-Integrated Terminal with Creator Features

Type 'help' for available commands or start chatting with AI!
Use '/' prefix for AI commands (e.g., /help me code)
        `.trim();

    welcomeText.split('\n').forEach(line => {
      this.addOutput(line, 'welcome');
    });
  }

  showHelp() {
    const helpText = `
Available Commands:
  help, ?          - Show this help message
  clear, cls       - Clear terminal screen  
  history          - Show command history
  echo <text>      - Display text
  date             - Show current date/time
  version          - Show terminal version
  ai <prompt>      - Ask AI a question
  ask <prompt>     - Ask AI a question
  /<prompt>        - Quick AI command
  theme <name>     - Change theme (dark/light/auto)
  accessibility    - Show accessibility commands

Keyboard Shortcuts:
  ↑/↓             - Navigate command history
  Tab             - Auto-complete commands
  Ctrl+L          - Clear screen
  Ctrl+C          - Cancel current command
        `.trim();

    helpText.split('\n').forEach(line => {
      this.addOutput(line, 'help');
    });
  }

  showHistory() {
    if (this.commandHistory.length === 0) {
      this.addOutput('No command history');
      return;
    }

    this.addOutput('Command History:');
    this.commandHistory.slice(-10).forEach((cmd, index) => {
      this.addOutput(`  ${this.commandHistory.length - 10 + index + 1}: ${cmd}`, 'history');
    });
  }

  clearTerminal() {
    this.outputArea.innerHTML = '';
    this.announceToScreenReader('Terminal cleared');
  }

  cancelCurrentCommand() {
    this.input.value = '';
    this.currentCommand = '';
    this.historyIndex = -1;
    this.addOutput('^C');
  }

  scrollToBottom() {
    this.terminal.scrollTop = this.terminal.scrollHeight;
  }

  announceToScreenReader(text) {
    // This would integrate with accessibility manager
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = text;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  setAIManager(aiManager) {
    this.aiManager = aiManager;
    console.log('🤖 AI Manager connected to terminal');
  }

  focus() {
    if (this.input) {
      this.input.focus();
    }
  }

  resize() {
    // Handle terminal resize
    this.scrollToBottom();
  }
}
