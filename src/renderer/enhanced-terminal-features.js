/**
 * Enhanced Terminal Features
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * Advanced terminal features extracted from warp-terminal-oss and warp-clone
 * Including multi-tab support, advanced PTY management, and modern UI features
 */

// Multi-tab Terminal Manager
class MultiTabTerminalManager {
  constructor() {
    this.terminals = new Map();
    this.activeTerminalId = 1;
    this.nextTerminalId = 2;
    this.fitAddons = new Map();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Tab switching with Ctrl+1-9
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        const terminalIds = Array.from(this.terminals.keys());
        if (terminalIds[tabIndex]) {
          this.switchTerminal(terminalIds[tabIndex]);
        }
      }

      // Ctrl+T - New tab
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        this.createNewTab();
      }

      // Ctrl+W - Close tab
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        if (this.terminals.size > 1) {
          this.closeTab(this.activeTerminalId);
        }
      }

      // Ctrl+Shift+D - Split terminal
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.splitTerminal();
      }
    });

    // Tab click handlers
    document.addEventListener('click', e => {
      if (e.target.closest('.terminal-tab')) {
        const tab = e.target.closest('.terminal-tab');
        const terminalId = parseInt(tab.dataset.terminalId);
        this.switchTerminal(terminalId);
      }

      if (e.target.classList.contains('tab-close')) {
        e.stopPropagation();
        const terminalId = parseInt(e.target.dataset.terminalId);
        this.closeTab(terminalId);
      }
    });
  }

  createNewTab() {
    const newId = this.nextTerminalId++;

    // Create tab UI
    this.createTabUI(newId);

    // Create terminal container
    this.createTerminalContainer(newId);

    // Switch to new terminal
    this.switchTerminal(newId);

    // Initialize terminal with delay to ensure DOM is ready
    setTimeout(() => {
      this.initializeTerminal(newId);
    }, 100);

    return newId;
  }

  createTabUI(id) {
    const tabContainer = document.querySelector('.terminal-tabs') || this.createTabContainer();

    const tab = document.createElement('div');
    tab.className = 'terminal-tab';
    tab.dataset.terminalId = id;
    tab.innerHTML = `
            <span class="tab-title">Terminal ${id}</span>
            <span class="tab-close" data-terminal-id="${id}">&times;</span>
        `;

    tabContainer.appendChild(tab);
  }

  createTabContainer() {
    const container = document.createElement('div');
    container.className = 'terminal-tabs';
    container.style.cssText = `
            display: flex;
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border-color);
            padding: 0 10px;
        `;

    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(container, mainContent.firstChild);

    return container;
  }

  createTerminalContainer(id) {
    const terminalArea = document.querySelector('.terminal-area') || document.body;

    const container = document.createElement('div');
    container.className = 'terminal-container';
    container.id = `terminal-${id}`;
    container.style.cssText = `
            display: none;
            flex-direction: column;
            height: 100%;
        `;

    container.innerHTML = `
            <div class="terminal-header">
                <div class="terminal-path">~</div>
                <div class="terminal-actions">
                    <button onclick="rinawarpTerminal.multiTabManager.clearTerminal(${id})">Clear</button>
                    <button onclick="rinawarpTerminal.multiTabManager.splitTerminal()">Split</button>
                </div>
            </div>
            <div class="xterm-container" id="xterm-${id}"></div>
        `;

    terminalArea.appendChild(container);
  }

  async initializeTerminal(id) {
    const { Terminal } = require('@xterm/xterm');
    const { FitAddon } = require('@xterm/addon-fit');
    const { WebLinksAddon } = require('@xterm/addon-web-links');

    const terminalElement = document.getElementById(`xterm-${id}`);
    if (!terminalElement) return;

    // Enhanced terminal theme inspired by warp-clone
    const terminal = new Terminal({
      theme: {
        background: '#1a1a1a',
        foreground: '#ffffff',
        cursor: '#00d4ff',
        cursorAccent: '#000000',
        selection: 'rgba(0, 212, 255, 0.3)',
        black: '#1a1a1a',
        red: '#ff6b6b',
        green: '#51cf66',
        yellow: '#ffd43b',
        blue: '#4dabf7',
        magenta: '#da77f2',
        cyan: '#22d3ee',
        white: '#ffffff',
        brightBlack: '#495057',
        brightRed: '#ff8787',
        brightGreen: '#69db7c',
        brightYellow: '#ffe066',
        brightBlue: '#74c0fc',
        brightMagenta: '#e599f7',
        brightCyan: '#3bc9db',
        brightWhite: '#f8f9fa',
      },
      fontFamily: 'SF Mono, Monaco, "Cascadia Code", Consolas, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      allowTransparency: true,
      bellStyle: 'sound',
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(terminalElement);
    fitAddon.fit();

    // Store terminal and addons
    this.terminals.set(id, terminal);
    this.fitAddons.set(id, fitAddon);

    // Enhanced shell detection from warp-terminal-oss
    const shell = await this.getOptimalShell();

    // Start PTY process with enhanced environment setup
    const ptyProcess = spawn(shell, [], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        FORCE_COLOR: '1',
      },
    });

    // Handle PTY data
    ptyProcess.stdout.on('data', data => {
      terminal.write(data.toString());
    });

    ptyProcess.stderr.on('data', data => {
      terminal.write(data.toString());
    });

    // Handle terminal input with signal support
    terminal.onData(data => {
      ptyProcess.stdin.write(data);
    });

    // Enhanced key bindings inspired by warp-terminal-oss
    terminal.onKey(({ key, domEvent }) => {
      // Ctrl+C - Interrupt signal
      if (domEvent.ctrlKey && domEvent.key === 'c') {
        ptyProcess.kill('SIGINT');
        return;
      }

      // Ctrl+D - EOF signal
      if (domEvent.ctrlKey && domEvent.key === 'd') {
        ptyProcess.stdin.write('\x04');
        return;
      }

      // Ctrl+Z - Suspend signal
      if (domEvent.ctrlKey && domEvent.key === 'z') {
        ptyProcess.kill('SIGTSTP');
        return;
      }
    });

    // Handle terminal resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      // Send resize signal to PTY if supported
      if (ptyProcess.resize) {
        ptyProcess.resize(terminal.cols, terminal.rows);
      }
    });
    resizeObserver.observe(terminalElement);

    // Welcome message inspired by warp-clone
    terminal.writeln('\x1b[1;36m╭─────────────────────────────────────╮\x1b[0m');
    terminal.writeln('\x1b[1;36m│     \x1b[1;32mRinaWarp Terminal Enhanced\x1b[1;36m     │\x1b[0m');
    terminal.writeln('\x1b[1;36m│   \x1b[33mNext-gen terminal experience\x1b[1;36m   │\x1b[0m');
    terminal.writeln('\x1b[1;36m╰─────────────────────────────────────╯\x1b[0m');
    terminal.writeln('');

    return terminal;
  }

  async getOptimalShell() {
    if (process.platform === 'win32') {
      const { execSync } = require('child_process');
      try {
        // Try PowerShell Core first
        execSync('pwsh --version', { stdio: 'pipe' });
        return 'pwsh.exe';
      } catch {
        try {
          // Try Windows PowerShell
          execSync('powershell -Command "$PSVersionTable.PSVersion"', { stdio: 'pipe' });
          return 'powershell.exe';
        } catch {
          // Fallback to CMD
          return 'cmd.exe';
        }
      }
    } else {
      return process.env.SHELL || '/bin/bash';
    }
  }

  switchTerminal(id) {
    // Update active terminal
    this.activeTerminalId = id;

    // Update tab UI
    document.querySelectorAll('.terminal-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-terminal-id="${id}"]`).classList.add('active');

    // Update terminal container visibility
    document.querySelectorAll('.terminal-container').forEach(container => {
      container.style.display = 'none';
    });
    const activeContainer = document.getElementById(`terminal-${id}`);
    if (activeContainer) {
      activeContainer.style.display = 'flex';
    }

    // Fit terminal
    setTimeout(() => {
      const fitAddon = this.fitAddons.get(id);
      if (fitAddon) {
        fitAddon.fit();
      }
    }, 100);
  }

  closeTab(id) {
    if (this.terminals.size <= 1) return; // Don't close the last tab

    // Dispose terminal
    const terminal = this.terminals.get(id);
    if (terminal) {
      terminal.dispose();
      this.terminals.delete(id);
    }

    // Remove fit addon
    this.fitAddons.delete(id);

    // Remove DOM elements
    const tab = document.querySelector(`[data-terminal-id="${id}"]`);
    const container = document.getElementById(`terminal-${id}`);

    if (tab) tab.remove();
    if (container) container.remove();

    // Switch to first available terminal if this was active
    if (this.activeTerminalId === id) {
      const firstTerminalId = Array.from(this.terminals.keys())[0];
      this.switchTerminal(firstTerminalId);
    }
  }

  clearTerminal(id) {
    const terminal = this.terminals.get(id);
    if (terminal) {
      terminal.clear();
    }
  }

  splitTerminal() {
    // For now, create a new tab (future enhancement: actual split view)
    this.createNewTab();
  }
}

// Advanced Terminal Signal Handler
class TerminalSignalHandler {
  constructor(terminal, ptyProcess) {
    this.terminal = terminal;
    this.ptyProcess = ptyProcess;
    this.setupSignalHandling();
  }

  setupSignalHandling() {
    this.terminal.onKey(({ key, domEvent }) => {
      // Enhanced signal handling inspired by warp-terminal-oss

      if (domEvent.ctrlKey) {
        switch (domEvent.key.toLowerCase()) {
          case 'c':
            this.sendSignal('SIGINT'); // Interrupt
            break;
          case 'd':
            this.sendEOF(); // End of file
            break;
          case 'z':
            this.sendSignal('SIGTSTP'); // Suspend
            break;
          case '\\':
            this.sendSignal('SIGQUIT'); // Quit with core dump
            break;
        }
      }
    });
  }

  sendSignal(signal) {
    try {
      if (this.ptyProcess && !this.ptyProcess.killed) {
        this.ptyProcess.kill(signal);
      }
    } catch (error) {
      console.warn('Failed to send signal:', signal, error);
    }
  }

  sendEOF() {
    try {
      if (this.ptyProcess && this.ptyProcess.stdin && !this.ptyProcess.stdin.destroyed) {
        this.ptyProcess.stdin.write('\x04'); // ASCII EOT (End of Transmission)
      }
    } catch (error) {
      console.warn('Failed to send EOF:', error);
    }
  }
}

// Enhanced Terminal Theme Manager
class EnhancedTerminalThemeManager {
  constructor() {
    this.themes = {
      rinawarp: {
        background: '#0a0b1e',
        foreground: '#00d4ff',
        cursor: '#00d4ff',
        selection: 'rgba(0, 212, 255, 0.3)',
        // ... enhanced color palette
      },
      warp_modern: {
        background: '#1a1a1a',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selection: 'rgba(255, 255, 255, 0.3)',
        black: '#1a1a1a',
        red: '#ff6b6b',
        green: '#51cf66',
        yellow: '#ffd43b',
        blue: '#4dabf7',
        magenta: '#da77f2',
        cyan: '#22d3ee',
        white: '#ffffff',
      },
      ocean_deep: {
        background: '#001122',
        foreground: '#00ffcc',
        cursor: '#00ffcc',
        selection: 'rgba(0, 255, 204, 0.3)',
        // ... ocean theme colors
      },
    };

    this.currentTheme = 'warp_modern';
  }

  applyTheme(terminal, themeName) {
    if (this.themes[themeName]) {
      terminal.options.theme = this.themes[themeName];
      this.currentTheme = themeName;
    }
  }

  addCustomTheme(name, theme) {
    this.themes[name] = theme;
  }
}

// Export enhanced features
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MultiTabTerminalManager,
    TerminalSignalHandler,
    EnhancedTerminalThemeManager,
  };
}

// Global access for browser environment
if (typeof window !== 'undefined') {
  window.EnhancedTerminalFeatures = {
    MultiTabTerminalManager,
    TerminalSignalHandler,
    EnhancedTerminalThemeManager,
  };
}
