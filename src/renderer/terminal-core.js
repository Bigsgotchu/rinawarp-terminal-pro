/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Terminal Core
 * Core terminal functionality using xterm.js
 */

import { Terminal, FitAddon, WebLinksAddon } from '../entries/vendor.js';

import logger from '../utils/logger.js';
export class RinaWarpTerminal {
  constructor(options = {}) {
    this.options = {
      theme: 'rinawarp-dark',
      fontSize: 14,
      fontFamily: 'SF Mono, Monaco, Inconsolata, Fira Code, monospace',
      ...options
    };

    this.terminal = null;
    this.fitAddon = null;
    this.webLinksAddon = null;
    this.commands = new Map();
    this.currentLine = '';
    this.history = [];
    this.historyIndex = -1;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Update progress
      if (window.RinaWarpBootstrap) {
        window.RinaWarpBootstrap.updateProgress(30, 'Initializing terminal...');
      }

      // Create terminal instance
      this.terminal = new Terminal({
        theme: this.getTerminalTheme(),
        fontFamily: this.options.fontFamily,
        fontSize: this.options.fontSize,
        lineHeight: 1.2,
        cursorBlink: true,
        cursorStyle: 'block',
        scrollback: 1000,
        tabStopWidth: 4,
        allowTransparency: true,
        convertEol: true
      });

      // Create and load addons
      this.fitAddon = new FitAddon();
      this.webLinksAddon = new WebLinksAddon();
      
      this.terminal.loadAddon(this.fitAddon);
      this.terminal.loadAddon(this.webLinksAddon);

      // Find terminal container
      const container = document.getElementById('terminal');
      if (!container) {
        throw new Error(new Error('Terminal container not found'));
      }

      // Open terminal
      this.terminal.open(container);
      
      // Fit to container
      this.fitAddon.fit();

      // Set up event handlers
      this.setupEventHandlers();

      // Set up default commands
      this.setupDefaultCommands();

      // Show welcome message
      this.showWelcome();

      // Update progress
      if (window.RinaWarpBootstrap) {
        window.RinaWarpBootstrap.updateProgress(50, 'Terminal ready...');
      }

      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize terminal:', error);
      throw new Error(error);
    }
  }

  getTerminalTheme() {
    return {
      background: '#0a0a0a',
      foreground: '#00ff88',
      cursor: '#00ff88',
      cursorAccent: '#000000',
      selection: 'rgba(0, 255, 136, 0.3)',
      black: '#000000',
      red: '#ff6b6b',
      green: '#00ff88',
      yellow: '#ffa500',
      blue: '#0088ff',
      magenta: '#ff00aa',
      cyan: '#00aaff',
      white: '#ffffff',
      brightBlack: '#333333',
      brightRed: '#ff8888',
      brightGreen: '#66ffaa',
      brightYellow: '#ffcc66',
      brightBlue: '#66aaff',
      brightMagenta: '#ff66cc',
      brightCyan: '#66ccff',
      brightWhite: '#ffffff'
    };
  }

  setupEventHandlers() {
    // Handle input
    this.terminal.onData((data) => {
      this.handleInput(data);
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.fitAddon?.fit();
    });

    // Handle terminal focus
    this.terminal.onFocus(() => {
      const statusIndicator = document.getElementById('status-indicator');
      if (statusIndicator) statusIndicator.textContent = 'Active';
    });

    this.terminal.onBlur(() => {
      const statusIndicator = document.getElementById('status-indicator');
      if (statusIndicator) statusIndicator.textContent = 'Ready';
    });
  }

  handleInput(data) {
    switch (data) {
    case '\r': // Enter
      this.terminal.write('\r\n');
      this.executeCommand(this.currentLine.trim());
      this.addToHistory(this.currentLine);
      this.currentLine = '';
      this.showPrompt();
      break;

    case '\u007f': // Backspace
      if (this.currentLine.length > 0) {
        this.currentLine = this.currentLine.slice(0, -1);
        this.terminal.write('\b \b');
      }
      break;

    case '\u0003': // Ctrl+C
      this.terminal.write('^C\r\n');
      this.currentLine = '';
      this.showPrompt();
      break;

    case '\u001b[A': // Up arrow
      this.navigateHistory(-1);
      break;

    case '\u001b[B': // Down arrow
      this.navigateHistory(1);
      break;

    case '\u001b[C': // Right arrow
      // TODO: Implement cursor movement
      break;

    case '\u001b[D': // Left arrow
      // TODO: Implement cursor movement
      break;

    case '\t': // Tab
      this.handleTabCompletion();
      break;

    default:
      // Regular character input
      if (data >= ' ' && data <= '~') {
        this.currentLine += data;
        this.terminal.write(data);
      }
      break;
    }
  }

  navigateHistory(direction) {
    if (this.history.length === 0) return;

    this.historyIndex += direction;
    
    if (this.historyIndex < 0) {
      this.historyIndex = -1;
      this.currentLine = '';
    } else if (this.historyIndex >= this.history.length) {
      this.historyIndex = this.history.length - 1;
    }

    if (this.historyIndex >= 0) {
      this.currentLine = this.history[this.historyIndex];
    }

    // Clear current line and write new content
    this.terminal.write('\r\x1b[K');
    this.showPrompt(false);
    this.terminal.write(this.currentLine);
  }

  handleTabCompletion() {
    const commands = Array.from(this.commands.keys());
    const matches = commands.filter(cmd => cmd.startsWith(this.currentLine));
    
    if (matches.length === 1) {
      // Auto-complete
      const completion = matches[0].slice(this.currentLine.length);
      this.currentLine = matches[0];
      this.terminal.write(completion + ' ');
      this.currentLine += ' ';
    } else if (matches.length > 1) {
      // Show possible completions
      this.terminal.write('\r\n');
      matches.forEach(match => {
        this.terminal.write(`  ${match}\r\n`);
      });
      this.showPrompt();
      this.terminal.write(this.currentLine);
    }
  }

  addToHistory(command) {
    if (command && command !== this.history[this.history.length - 1]) {
      this.history.push(command);
      if (this.history.length > 100) {
        this.history.shift();
      }
    }
    this.historyIndex = -1;
  }

  setupDefaultCommands() {
    this.addCommand('help', () => this.showHelp());
    this.addCommand('clear', () => this.clear());
    this.addCommand('version', () => this.showVersion());
    this.addCommand('history', () => this.showHistory());
    this.addCommand('exit', () => this.showExitMessage());
    this.addCommand('theme', (theme) => this.setTheme(theme));
    this.addCommand('font-size', (size) => this.setFontSize(size));
  }

  addCommand(name, handler) {
    this.commands.set(name, handler);
  }

  removeCommand(name) {
    this.commands.delete(name);
  }

  executeCommand(input) {
    if (!input) return;

    const [command, ...args] = input.split(' ');
    const handler = this.commands.get(command);

    if (handler) {
      try {
        handler(args.join(' '), ...args);
      } catch (error) {
        this.writeError(`Command error: ${error.message}`);
      }
    } else {
      this.writeError(`Command not found: ${command}. Type 'help' for available commands.`);
    }
  }

  showWelcome() {
    this.terminal.write('\\x1b[32m🦾 RinaWarp Terminal v1.0.19 initialized\\x1b[0m\\r\\n');
    this.terminal.write('\\x1b[36mType "help" for available commands or "features" to see loaded features\\x1b[0m\\r\\n');
    this.terminal.write('\\r\\n');
    this.showPrompt();
  }

  showPrompt(newline = true) {
    if (newline) this.terminal.write('\\r\\n');
    this.terminal.write('\\x1b[32m$\\x1b[0m ');
  }

  showHelp() {
    this.writeLine(`
🦾 RinaWarp Terminal Help:
=========================
Basic Commands:
  help              - Show this help message
  clear             - Clear the terminal screen
  version           - Show version information
  history           - Show command history
  exit              - Show exit information

Customization:
  theme [name]      - Change terminal theme
  font-size [size]  - Change font size

Feature Commands:
  features          - Show loaded features
  load-ai           - Load AI Assistant
  load-voice        - Load Voice Engine
  load-plugins      - Load Plugin System
  load-vitals       - Load System Vitals

Navigation:
  Tab               - Auto-complete commands
  ↑/↓ Arrow Keys   - Navigate command history
  Ctrl+C            - Cancel current input

Type a command to get started!
    `);
  }

  showVersion() {
    const buildDate = (typeof process !== 'undefined' && process.env.BUILD_DATE) || 'Unknown';
    const nodeEnv = (typeof process !== 'undefined' && process.env.NODE_ENV) || 'development';
    this.writeLine(`
🦾 RinaWarp Terminal
===================
Version: 1.0.19
Build Date: ${buildDate}
Node Environment: ${nodeEnv}
Features: Modular loading, AI assistance, Voice control, Plugin system
    `);
  }

  showHistory() {
    if (this.history.length === 0) {
      this.writeLine('No command history available');
      return;
    }

    this.writeLine('\\nCommand History:');
    this.writeLine('================');
    this.history.forEach((cmd, index) => {
      this.writeLine(`  ${index + 1}. ${cmd}`);
    });
  }

  showExitMessage() {
    this.writeLine(`
Thank you for using RinaWarp Terminal! 🦾

This is a web-based terminal that runs in your browser.
To close this tab, use Ctrl+W or Cmd+W.

Visit https://rinawarptech.com for more information.
    `);
  }

  setTheme(themeName) {
    if (!themeName) {
      this.writeLine('Available themes: rinawarp-dark, rinawarp-light, matrix, retro');
      return;
    }

    const themes = {
      'rinawarp-dark': this.getTerminalTheme(),
      'rinawarp-light': {
        background: '#ffffff',
        foreground: '#00aa66',
        cursor: '#00aa66'
      },
      'matrix': {
        background: '#000000',
        foreground: '#00ff00',
        cursor: '#00ff00'
      },
      'retro': {
        background: '#001100',
        foreground: '#00cc00',
        cursor: '#00cc00'
      }
    };

    if (themes[themeName]) {
      this.terminal.options.theme = themes[themeName];
      this.writeSuccess(`Theme changed to: ${themeName}`);
    } else {
      this.writeError(`Unknown theme: ${themeName}`);
    }
  }

  setFontSize(size) {
    const fontSize = parseInt(size);
    if (isNaN(fontSize) || fontSize < 8 || fontSize > 32) {
      this.writeError('Font size must be between 8 and 32');
      return;
    }

    this.terminal.options.fontSize = fontSize;
    this.writeSuccess(`Font size changed to: ${fontSize}px`);
  }

  clear() {
    this.terminal.clear();
  }

  writeLine(text) {
    this.terminal.write(text + '\\r\\n');
  }

  write(text) {
    this.terminal.write(text);
  }

  writeSuccess(message) {
    this.terminal.write(`\\x1b[32m${message}\\x1b[0m\\r\\n`);
  }

  writeError(message) {
    this.terminal.write(`\\x1b[31m${message}\\x1b[0m\\r\\n`);
  }

  writeWarning(message) {
    this.terminal.write(`\\x1b[33m${message}\\x1b[0m\\r\\n`);
  }

  writeInfo(message) {
    this.terminal.write(`\\x1b[36m${message}\\x1b[0m\\r\\n`);
  }

  // Public API methods
  getTerminalInstance() {
    return this.terminal;
  }

  isInitialized() {
    return this.initialized;
  }

  getCommands() {
    return Array.from(this.commands.keys());
  }

  getHistory() {
    return [...this.history];
  }

  focus() {
    this.terminal?.focus();
  }

  fit() {
    this.fitAddon?.fit();
  }
}
