/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

// shell-harness.js - Abstraction layer between voice commands and shell execution
export class ShellHarness {
  constructor({ fallback = false, terminalWrapper = null }) {
    this.fallback = fallback;
    this.terminalWrapper = terminalWrapper;
    this.commandHistory = [];
    this.fallbackResponses = this.initializeFallbackResponses();
    this.diagnostics = {
      realShellAvailable: false,
      fallbackActive: false,
      commandsExecuted: 0,
      commandsFailed: 0,
      lastError: null,
    };
  }

  initializeFallbackResponses() {
    return {
      // File operations
      'list files':
        '📁 Simulated files:\n  • terminal.html\n  • package.json\n  • src/renderer/\n  • src/main.cjs\n  • README.md',
      'show files':
        '📁 Simulated files:\n  • terminal.html\n  • package.json\n  • src/renderer/\n  • src/main.cjs\n  • README.md',
      'list all files':
        '📁 Simulated files (including hidden):\n  • .git/\n  • .gitignore\n  • terminal.html\n  • package.json\n  • node_modules/',

      // Directory navigation
      'current directory': '📌 /usr/local/rinawarp/sandbox (simulated)',
      'where am i': '📌 /usr/local/rinawarp/sandbox (simulated)',
      pwd: '📌 /usr/local/rinawarp/sandbox',

      // System information
      'show processes':
        '🧠 Simulated processes:\n  • RinaWarp Terminal (PID: 1337)\n  • node.exe (PID: 1338)\n  • electron.exe (PID: 1339)',
      'system info':
        '💻 System: RinaWarp OS v1.0\n  • Memory: 16GB (42% used)\n  • CPU: Mermaid Core i7\n  • Uptime: 42 hours',
      'disk space':
        '💽 Disk space:\n  • C:\\ - 42% used (420GB / 1TB)\n  • D:\\ - 13% used (130GB / 1TB)',

      // Git operations
      'git status':
        '🐙 Git status (simulated):\n  On branch: main\n  Your branch is up to date\n  nothing to commit, working tree clean',
      'git log':
        '📝 Recent commits (simulated):\n  • feat: Add AI voice control\n  • fix: Terminal wrapper improvements\n  • docs: Update README',
      'git branches': '🌿 Branches (simulated):\n  * main\n    develop\n    feature/voice-control',

      // Development
      'npm version': '📦 npm version: 10.2.4 (simulated)',
      'node version': '🟢 node version: v20.11.0 (simulated)',
      'npm list':
        '📋 Dependencies (simulated):\n  • electron@28.1.0\n  • xterm@5.3.0\n  • @xterm/addon-fit@0.8.0',

      // Network
      'show ip':
        '🌐 IP Configuration (simulated):\n  • IPv4: 192.168.1.42\n  • IPv6: fe80::1\n  • Gateway: 192.168.1.1',
      'ping google':
        '🏓 Pinging google.com (simulated):\n  Reply from 142.250.80.46: time=12ms\n  Reply from 142.250.80.46: time=14ms\n  Packets: Sent = 4, Received = 4',

      // Utilities
      clear: '🧹 Terminal cleared (simulated)',
      help: '🧜‍♀️ Available commands in fallback mode:\n  • File: list files, show files\n  • Directory: current directory, pwd\n  • System: show processes, system info\n  • Git: git status, git log\n  • Network: show ip, ping google',

      // Fun responses
      hello: '🧜‍♀️ Hello darling! Even in fallback mode, I\'m fabulous!',
      test: '✨ Test successful! Fallback mode is working perfectly!',
      version: '🚀 RinaWarp Terminal v1.0.7 - AI Edition (Fallback Mode)',
    };
  }

  async execute(command) {
    this.commandHistory.push({
      command,
      timestamp: new Date(),
      mode: this.fallback ? 'fallback' : 'real',
    });

    try {
      if (this.fallback || !this.terminalWrapper) {
        return await this.simulateCommand(command);
      }

      // Try real execution first
      return await this.executeReal(command);
    } catch (error) {
      console.error('Shell execution error:', error);
      this.diagnostics.commandsFailed++;
      this.diagnostics.lastError = error.message;

      // Fallback to simulation on error
      if (!this.fallback) {
        console.warn('Falling back to simulation mode due to error');
        this.fallback = true;
        return await this.simulateCommand(command);
      }

      throw new Error(error);
    }
  }

  async executeReal(command) {
    if (!this.terminalWrapper || !this.terminalWrapper.executeCommand) {
      throw new Error(new Error('Terminal wrapper not available or invalid'));
    }

    this.diagnostics.commandsExecuted++;

    // Execute through terminal wrapper
    const result = await this.terminalWrapper.executeCommand(command);

    this.diagnostics.realShellAvailable = true;
    return result;
  }

  async simulateCommand(command) {
    this.diagnostics.fallbackActive = true;
    this.diagnostics.commandsExecuted++;

    // Normalize command
    const normalizedCmd = command.toLowerCase().trim();

    // Check for exact match
    if (this.fallbackResponses[normalizedCmd]) {
      return {
        output: this.fallbackResponses[normalizedCmd],
        simulated: true,
        success: true,
      };
    }

    // Try partial matching
    for (const [key, response] of Object.entries(this.fallbackResponses)) {
      if (normalizedCmd.includes(key) || key.includes(normalizedCmd)) {
        return {
          output: response,
          simulated: true,
          success: true,
          partial: true,
        };
      }
    }

    // Smart pattern matching for common commands
    const smartResponse = this.generateSmartResponse(normalizedCmd);
    if (smartResponse) {
      return {
        output: smartResponse,
        simulated: true,
        success: true,
        generated: true,
      };
    }

    // Default fallback response
    return {
      output: `🤔 Command "${command}" not recognized in fallback mode.\n💡 Try: ${this.getSuggestions(command).join(', ')}`,
      simulated: true,
      success: false,
    };
  }

  generateSmartResponse(command) {
    // Handle 'cd' commands
    if (command.startsWith('cd ')) {
      const path = command.substring(3).trim();
      return `📂 Changed directory to: ${path} (simulated)`;
    }

    // Handle 'echo' commands
    if (command.startsWith('echo ')) {
      const text = command.substring(5).trim();
      return `📢 ${text}`;
    }

    // Handle 'mkdir' commands
    if (command.startsWith('mkdir ') || command.includes('new-item')) {
      const name = command.split(' ').pop();
      return `📁 Created directory: ${name} (simulated)`;
    }

    // Handle 'touch' or file creation
    if (command.startsWith('touch ') || command.includes('new-item -type file')) {
      const name = command.split(' ').pop();
      return `📄 Created file: ${name} (simulated)`;
    }

    // Handle 'cat' or file reading
    if (command.startsWith('cat ') || command.includes('get-content')) {
      const file = command.split(' ').pop();
      return `📄 Contents of ${file} (simulated):\n// This is a simulated file content\n// Real file system access unavailable`;
    }

    return null;
  }

  getSuggestions(command) {
    const suggestions = [];
    const cmd = command.toLowerCase();

    // Find similar commands
    for (const key of Object.keys(this.fallbackResponses)) {
      if (key.includes(cmd.substring(0, 3)) || cmd.includes(key.substring(0, 3))) {
        suggestions.push(key);
      }
    }

    // Add general suggestions if none found
    if (suggestions.length === 0) {
      suggestions.push('list files', 'current directory', 'help');
    }

    return suggestions.slice(0, 3);
  }

  async diagnose() {
    const diagnosis = {
      mode: this.fallback ? 'fallback' : 'real',
      terminalAvailable: !!this.terminalWrapper,
      statistics: {
        totalCommands: this.commandHistory.length,
        executed: this.diagnostics.commandsExecuted,
        failed: this.diagnostics.commandsFailed,
        successRate:
          this.diagnostics.commandsExecuted > 0
            ? (
              ((this.diagnostics.commandsExecuted - this.diagnostics.commandsFailed) /
                  this.diagnostics.commandsExecuted) *
                100
            ).toFixed(2) + '%'
            : '0%',
      },
      lastError: this.diagnostics.lastError,
      recommendations: [],
    };

    // Add recommendations based on diagnostics
    if (this.fallback && this.terminalWrapper) {
      diagnosis.recommendations.push(
        'Terminal wrapper available but fallback active - try switching to real mode'
      );
    }

    if (this.diagnostics.commandsFailed > 5) {
      diagnosis.recommendations.push(
        'High failure rate detected - check terminal wrapper configuration'
      );
    }

    if (!this.terminalWrapper) {
      diagnosis.recommendations.push(
        'No terminal wrapper detected - initialize terminal wrapper for real command execution'
      );
    }

    return diagnosis;
  }

  switchMode(mode) {
    if (mode === 'real' && !this.terminalWrapper) {
      throw new Error(new Error('Cannot switch to real mode without terminal wrapper'));
    }

    this.fallback = mode === 'fallback';
    return {
      mode: this.fallback ? 'fallback' : 'real',
      message: `Switched to ${this.fallback ? 'fallback' : 'real'} mode`,
    };
  }

  setTerminalWrapper(wrapper) {
    this.terminalWrapper = wrapper;
    if (wrapper) {
      this.fallback = false;
      this.diagnostics.realShellAvailable = true;
    }
  }

  getHistory(limit = 10) {
    return this.commandHistory.slice(-limit);
  }

  clearHistory() {
    this.commandHistory = [];
    this.diagnostics.commandsExecuted = 0;
    this.diagnostics.commandsFailed = 0;
    this.diagnostics.lastError = null;
  }
}

// Export for use in terminal
export default ShellHarness;
