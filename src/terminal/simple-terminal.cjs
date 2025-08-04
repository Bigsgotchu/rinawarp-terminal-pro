/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Simple Terminal Implementation - Inspired by Warp's Clean Architecture
 * Removes complex dependencies and focuses on core terminal functionality
 */

const { spawn } = require('child_process');
const config = require('../config/unified-config.cjs');

const logger = require('../utils/logger.cjs');
class SimpleTerminal {
  constructor(elementId = 'terminal-1') {
    this.elementId = elementId;
    this.element = null;
    this.ptyProcess = null;
    this.isInitialized = false;

    // Simple state management
    this.state = {
      currentDir: config.get('terminal.startDir') || require('os').homedir(),
      shell: config.get('terminal.shell'),
      fontSize: config.get('terminal.fontSize') || 14,
      theme: config.get('terminal.theme') || 'default',
    };
  }

  initialize() {
    return new Promise((resolve, reject) => {
      try {
        this.element = document.getElementById(this.elementId);
        if (!this.element) {
          throw new Error(new Error(new Error(`Terminal element ${this.elementId} not found`)));
        }

        this.setupTerminalElement();
        this.initializeXTerm();
        this.setupEventListeners();

        this.isInitialized = true;
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  setupTerminalElement() {
    // Ensure terminal element is properly configured
    this.element.style.display = 'block';
    this.element.style.width = '100%';
    this.element.style.height = '100%';
    this.element.style.background = '#1a1a1a';
    this.element.style.color = '#ffffff';
    this.element.style.fontFamily = 'Consolas, Monaco, monospace';
    this.element.style.fontSize = `${this.state.fontSize}px`;
    this.element.setAttribute('tabindex', '0');
  }

  initializeXTerm() {
    // Simple XTerm initialization without complex dependencies
    try {
      // Try to use XTerm if available
      if (typeof Terminal !== 'undefined') {
        this.terminal = new Terminal({
          cursorBlink: true,
          fontSize: this.state.fontSize,
          fontFamily: 'Consolas, Monaco, monospace',
          theme: this.getTheme(),
          scrollback: config.get('terminal.scrollback') || 1000,
        });

        this.terminal.open(this.element);
        this.terminal.focus();

        // Start PTY process
        this.startPtyProcess();
      } else {
        // Fallback to basic terminal without XTerm
        this.initializeFallbackTerminal();
      }
    } catch (error) {
      logger.warn('XTerm initialization failed, using fallback:', error);
      this.initializeFallbackTerminal();
    }
  }

  initializeFallbackTerminal() {
    // Simple fallback terminal implementation
    this.element.innerHTML = `
      <div class="terminal-output" id="terminal-output-${this.elementId}"></div>
      <div class="terminal-input-line">
        <span class="terminal-prompt">$ </span>
        <input type="text" class="terminal-input" id="terminal-input-${this.elementId}" />
      </div>
    `;

    this.outputElement = document.getElementById(`terminal-output-${this.elementId}`);
    this.inputElement = document.getElementById(`terminal-input-${this.elementId}`);

    // Setup input handling
    this.inputElement.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        this.executeCommand(this.inputElement.value);
        this.inputElement.value = '';
      }
    });

    this.inputElement.focus();
    this.writeOutput('RinaWarp Terminal (Fallback Mode)\n');
    this.writeOutput('Type "help" for available commands\n\n');
  }

  getTheme() {
    const themes = {
      default: {
        background: '#1a1a1a',
        foreground: '#ffffff',
        cursor: '#ffffff',
      },
      dark: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#c9d1d9',
      },
    };

    return themes[this.state.theme] || themes.default;
  }

  startPtyProcess() {
    try {
      const shell = this.state.shell;
      const args = process.platform === 'win32' ? [] : ['-l'];

      this.ptyProcess = spawn(shell, args, {
        cwd: this.state.currentDir,
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Handle process output
      this.ptyProcess.stdout.on('data', data => {
        if (this.terminal) {
          this.terminal.write(data);
        } else {
          this.writeOutput(data.toString());
        }
      });

      this.ptyProcess.stderr.on('data', data => {
        if (this.terminal) {
          this.terminal.write(data);
        } else {
          this.writeOutput(data.toString(), 'error');
        }
      });

      // Handle terminal input
      if (this.terminal) {
        this.terminal.onData(data => {
          if (this.ptyProcess) {
            this.ptyProcess.stdin.write(data);
          }
        });
      }

      this.ptyProcess.on('exit', code => {
        logger.info(`Terminal process exited with code ${code}`);
        if (this.terminal) {
          this.terminal.write('\r\nProcess exited. Press any key to restart...');
        }
      });
    } catch (error) {
      logger.error('Failed to start PTY process:', error);
      this.writeOutput('Failed to start terminal process\n', 'error');
    }
  }

  executeCommand(command) {
    if (!command.trim()) return;

    this.writeOutput(`$ ${command}\n`);

    // Handle built-in commands
    switch (command.toLowerCase()) {
    case 'help':
      this.writeOutput('Available commands:\n');
      this.writeOutput('  help - Show this help\n');
      this.writeOutput('  clear - Clear terminal\n');
      this.writeOutput('  exit - Exit terminal\n');
      break;
    case 'clear':
      this.clearOutput();
      break;
    case 'exit':
      this.writeOutput('Goodbye!\n');
      break;
    default:
      // Execute system command
      this.executeSystemCommand(command);
    }
  }

  executeSystemCommand(command) {
    try {
      const { exec } = require('child_process');
      exec(command, { cwd: this.state.currentDir }, (error, stdout, stderr) => {
        if (error) {
          this.writeOutput(`Error: ${error.message}\n`, 'error');
        } else {
          if (stdout) this.writeOutput(stdout);
          if (stderr) this.writeOutput(stderr, 'error');
        }
      });
    } catch (error) {
      this.writeOutput(`Failed to execute command: ${error.message}\n`, 'error');
    }
  }

  writeOutput(text, type = 'normal') {
    if (this.outputElement) {
      const span = document.createElement('span');
      span.textContent = text;
      if (type === 'error') {
        span.style.color = '#ff6b6b';
      }
      this.outputElement.appendChild(span);
      this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }
  }

  clearOutput() {
    if (this.outputElement) {
      this.outputElement.innerHTML = '';
    }
  }

  setupEventListeners() {
    // Handle window resize
    window.addEventListener('resize', () => {
      if (this.terminal) {
        this.terminal.fit();
      }
    });

    // Handle focus
    this.element.addEventListener('click', () => {
      if (this.terminal) {
        this.terminal.focus();
      } else if (this.inputElement) {
        this.inputElement.focus();
      }
    });
  }

  focus() {
    if (this.terminal) {
      this.terminal.focus();
    } else if (this.inputElement) {
      this.inputElement.focus();
    }
  }

  resize() {
    if (this.terminal) {
      this.terminal.fit();
    }
  }

  destroy() {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
    }
    if (this.terminal) {
      this.terminal.dispose();
    }
    this.isInitialized = false;
  }
}

// Simple terminal manager
class SimpleTerminalManager {
  constructor() {
    this.terminals = new Map();
    this.activeTerminal = null;
  }

  createTerminal(id = 1) {
    const terminal = new SimpleTerminal(`terminal-${id}`);
    this.terminals.set(id, terminal);

    terminal
      .initialize()
      .then(() => {
        this.activeTerminal = terminal;
        logger.info(`Terminal ${id} initialized successfully`);
      })
      .catch(error => {
        logger.error(`Failed to initialize terminal ${id}:`, error);
      });

    return terminal;
  }

  getTerminal(id) {
    return this.terminals.get(id);
  }

  switchTab(id) {
    const terminal = this.terminals.get(id);
    if (terminal) {
      this.activeTerminal = terminal;
      terminal.focus();
    }
  }

  resizeActiveTerminal() {
    if (this.activeTerminal) {
      this.activeTerminal.resize();
    }
  }

  destroyAll() {
    for (const terminal of this.terminals.values()) {
      terminal.destroy();
    }
    this.terminals.clear();
    this.activeTerminal = null;
  }
}

// Export for global use
if (typeof window !== 'undefined') {
  window.SimpleTerminal = SimpleTerminal;
  window.SimpleTerminalManager = SimpleTerminalManager;
}

module.exports = { SimpleTerminal, SimpleTerminalManager };
