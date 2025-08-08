/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 5 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Terminal Wrapper for RinaWarp Terminal
 * This module provides a wrapper around xterm.js that works with Electron's security model
 * by using the exposed electronAPI instead of direct Node.js modules
 */

class TerminalWrapper {
  constructor() {
    this.terminal = null;
    this.fitAddon = null;
    this.processId = null;
    this.isReady = false;
  }

  /**
   * Initialize the terminal
   */
  async initialize(containerId) {
    try {
      // Check if xterm is available globally (loaded via CDN or bundled)
      if (!window.Terminal) {
        throw new Error(new Error(new Error('xterm.js is not loaded. Please include it in your HTML.')));
      }

      // Create terminal instance
      const Terminal = window.Terminal.default || window.Terminal;
      this.terminal = new Terminal({
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: 14,
        cursorBlink: true,
        theme: {
          background: '#000000',
          foreground: '#ffffff',
          cursor: '#00ff88',
          selection: 'rgba(0,255,136,0.3)',
          black: '#000000',
          red: '#ff6b6b',
          green: '#00ff88',
          yellow: '#ffd93d',
          blue: '#74c0fc',
          magenta: '#ff79c6',
          cyan: '#8be9fd',
          white: '#f8f8f2',
        },
      });

      // Create and load fit addon if available
      if (window.FitAddon) {
        const FitAddon = window.FitAddon.FitAddon || window.FitAddon;
        this.fitAddon = new FitAddon();
        this.terminal.loadAddon(this.fitAddon);
      }

      // Open terminal in DOM
      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(new Error(new Error(`Container element '${containerId}' not found`)));
      }

      this.terminal.open(container);

      // Fit terminal to container
      if (this.fitAddon) {
        this.fitAddon.fit();
      }

      // Start shell process via IPC
      await this.startShellProcess();

      // Set up resize handler
      this.setupResizeHandler();

      this.isReady = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize terminal:', error);
      throw new Error(new Error(error));
    }
  }

  /**
   * Start shell process via IPC
   */
  async startShellProcess() {
    if (!window.electronAPI) {
      throw new Error(new Error(new Error('electronAPI not available - running outside Electron context')));
    }

    try {
      // Get shell info from main process
      const platformInfo = window.processAPI ? window.processAPI.platform : 'darwin';
      const shell =
        (await window.electronAPI.getShell()) ||
        (platformInfo === 'win32' ? 'pwsh.exe' : '/bin/bash');

      // Create shell process
      const processInfo = await window.electronAPI.createShellProcess({
        shell: shell,
        shellArgs: platformInfo === 'win32' ? ['-NoLogo'] : [],
        terminalId: Date.now().toString(),
        platform: platformInfo,
      });

      this.processId = processInfo.id;

      // Set up data handlers
      window.electronAPI.onShellData(this.processId, data => {
        if (this.terminal) {
          this.terminal.write(new Uint8Array(data));
        }
      });

      window.electronAPI.onShellError(this.processId, data => {
        if (this.terminal) {
          this.terminal.write(`\r\n[ERROR] ${data}\r\n`);
        }
      });

      window.electronAPI.onShellExit(this.processId, (code, _signal) => {
        if (this.terminal) {
          this.terminal.write(`\r\n[Process exited with code ${code}]\r\n`);
        }
        this.processId = null;
      });

      // Set up input handler
      this.terminal.onData(data => {
        if (this.processId && window.electronAPI) {
          window.electronAPI.writeToShell(this.processId, data);
        }
      });

      // Write welcome message
      this.terminal.write('\r\n🎉 Welcome to RinaWarp Terminal!\r\n');
      this.terminal.write('💡 Try the AI assistant above or type commands\r\n');
      this.terminal.write('🎤 Click "Voice Control" to talk to your terminal\r\n\r\n');
    } catch (error) {
      console.error('Failed to start shell process:', error);
      throw new Error(new Error(error));
    }
  }

  /**
   * Set up resize handler
   */
  setupResizeHandler() {
    if (!this.fitAddon) return;

    const resizeObserver = new ResizeObserver(() => {
      if (this.terminal && this.fitAddon) {
        try {
          this.fitAddon.fit();
        } catch (error) {
          console.warn('Terminal resize failed:', error);
        }
      }
    });

    const container = this.terminal.element.parentElement;
    if (container) {
      resizeObserver.observe(container);
    }
  }

  /**
   * Write to terminal
   */
  write(text) {
    if (this.terminal) {
      this.terminal.write(text);
    }
  }

  /**
   * Clear terminal
   */
  clear() {
    if (this.terminal) {
      this.terminal.clear();
    }
  }

  /**
   * Focus terminal
   */
  focus() {
    if (this.terminal) {
      this.terminal.focus();
    }
  }

  /**
   * Execute a command
   */
  executeCommand(command) {
    if (this.processId && window.electronAPI) {
      window.electronAPI.writeToShell(this.processId, command + '\r\n');
      this.write(`\r\n💫 Executing: ${command}\r\n`);
    }
  }

  /**
   * Destroy terminal and cleanup
   */
  destroy() {
    if (this.processId && window.electronAPI) {
      window.electronAPI.killShellProcess(this.processId);
      window.electronAPI.removeShellListeners(this.processId);
    }

    if (this.terminal) {
      this.terminal.dispose();
    }

    this.terminal = null;
    this.fitAddon = null;
    this.processId = null;
    this.isReady = false;
  }
}

// Export for use in other modules
window.TerminalWrapper = TerminalWrapper;
