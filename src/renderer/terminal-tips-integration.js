/**
 * RinaWarp Terminal - Tips Integration 🧜‍♀️
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * Integrates the contextual tips system with the terminal interface
 */

import ContextualTipsSystem from './contextual-tips-system.js';

class TerminalTipsIntegration {
  constructor(terminalInstance) {
    this.terminal = terminalInstance;
    this.tipsSystem = new ContextualTipsSystem();
    this.commandBuffer = '';
    this.lastCommand = null;
    this.commandHistory = [];
    this.setupIntegration();
  }

  setupIntegration() {
    // Hook into terminal command execution
    this.setupCommandInterception();

    // Listen for terminal events
    this.setupEventListeners();

    // Setup command result tracking
    this.setupResultTracking();

    console.log('🧜‍♀️ Terminal Tips Integration initialized!');
  }

  setupCommandInterception() {
    // Intercept commands before they're sent to shell
    if (this.terminal && this.terminal.onData) {
      const originalOnData = this.terminal.onData.bind(this.terminal);

      this.terminal.onData = data => {
        this.handleTerminalInput(data);
        return originalOnData(data);
      };
    }

    // Also listen for command submissions
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', event => {
        if (event.key === 'Enter' && this.isTerminalFocused()) {
          setTimeout(() => {
            this.processCommand(this.commandBuffer.trim());
            this.commandBuffer = '';
          }, 100);
        }
      });
    }
  }

  handleTerminalInput(data) {
    // Track what user is typing
    if (data === '\r' || data === '\n') {
      // Command submitted
      const command = this.commandBuffer.trim();
      if (command) {
        this.processCommand(command);
        this.commandBuffer = '';
      }
    } else if (data === '\u007f' || data === '\b') {
      // Backspace
      this.commandBuffer = this.commandBuffer.slice(0, -1);
    } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
      // Regular character
      this.commandBuffer += data;
    }
  }

  processCommand(command) {
    if (!command || command.length === 0) return;

    this.lastCommand = command;
    this.commandHistory.push({
      command,
      timestamp: Date.now(),
    });

    // Get context for the command
    const context = this.buildCommandContext(command);

    // Trigger tips analysis
    this.tipsSystem.analyzeCommand(command, context);

    // Emit event for other systems
    this.emitCommandEvent(command, context);

    console.log(`🧜‍♀️ Processing command: ${command}`);
  }

  buildCommandContext(command) {
    const context = {
      workingDirectory: this.getCurrentDirectory(),
      previousCommand: this.getPreviousCommand(),
      hasUnstagedChanges: false,
      errorOccurred: false,
      isSuccessfulCommand: null, // Will be set by result tracking
      sessionDuration: Date.now() - (this.tipsSystem.userProfile.session_start || Date.now()),
      recentCommands: this.getRecentCommands(5),
    };

    // Check for Git-specific context
    if (command.startsWith('git')) {
      context.hasUnstagedChanges = this.checkGitStatus();
      context.isGitRepo = this.isGitRepository();
    }

    // Check for Docker-specific context
    if (command.startsWith('docker')) {
      context.hasRunningContainers = this.checkDockerContainers();
    }

    // Detect potentially dangerous commands
    context.isDangerous = this.isDangerousCommand(command);

    return context;
  }

  setupEventListeners() {
    // Listen for command completion events from terminal
    if (typeof window !== 'undefined') {
      // Listen for successful command completion
      window.addEventListener('terminal-command-success', event => {
        this.handleCommandResult(event.detail.command, true, event.detail.output);
      });

      // Listen for command errors
      window.addEventListener('terminal-command-error', event => {
        this.handleCommandResult(event.detail.command, false, event.detail.error);
      });

      // Listen for terminal output that might indicate status
      window.addEventListener('terminal-output', event => {
        this.analyzeTerminalOutput(event.detail.output);
      });
    }
  }

  setupResultTracking() {
    // Monitor terminal output for success/failure indicators
    if (this.terminal && this.terminal.onData) {
      const originalWrite = this.terminal.write?.bind(this.terminal);
      if (originalWrite) {
        this.terminal.write = data => {
          this.analyzeTerminalOutput(data);
          return originalWrite(data);
        };
      }
    }
  }

  handleCommandResult(command, isSuccess, output) {
    const context = {
      isSuccessfulCommand: isSuccess,
      errorOccurred: !isSuccess,
      output: output,
      timestamp: Date.now(),
    };

    // Update tips system with result
    this.tipsSystem.updateUserProfile(command, { command_type: ['general'] }, context);

    // Emit result event
    window.dispatchEvent(
      new CustomEvent('rina-command-result', {
        detail: { command, success: isSuccess, output },
      })
    );

    // Show contextual tips based on result
    if (!isSuccess) {
      this.showErrorRecoveryTips(command, output);
    } else if (this.isFirstTimeSuccess(command)) {
      this.showSuccessCelebration(command);
    }
  }

  analyzeTerminalOutput(output) {
    if (typeof output !== 'string') return;

    // Look for common error patterns
    const errorPatterns = [
      /command not found/i,
      /permission denied/i,
      /no such file or directory/i,
      /fatal:/i,
      /error:/i,
      /failed/i,
    ];

    const isError = errorPatterns.some(pattern => pattern.test(output));

    if (isError && this.lastCommand) {
      this.handleCommandResult(this.lastCommand, false, output);
    }

    // Look for success indicators
    const successPatterns = [/done/i, /complete/i, /success/i, /✓/, /✅/];

    const isSuccess = successPatterns.some(pattern => pattern.test(output));

    if (isSuccess && this.lastCommand) {
      this.handleCommandResult(this.lastCommand, true, output);
    }

    // Check for specific command outputs
    this.analyzeSpecificOutputs(output);
  }

  analyzeSpecificOutputs(output) {
    // Git status output
    if (
      output.includes('Changes not staged for commit') ||
      output.includes('Changes to be committed')
    ) {
      this.triggerGitStatusTip();
    }

    // Docker container output
    if (output.includes('CONTAINER ID') && output.includes('IMAGE')) {
      this.triggerDockerContainersTip();
    }

    // Permission error
    if (output.toLowerCase().includes('permission denied')) {
      this.triggerPermissionTip();
    }
  }

  // Context checking methods
  getCurrentDirectory() {
    // Try to get from terminal prompt or environment
    return process?.cwd?.() || '/';
  }

  getPreviousCommand() {
    return this.commandHistory.length > 1
      ? this.commandHistory[this.commandHistory.length - 2].command
      : null;
  }

  getRecentCommands(count = 5) {
    return this.commandHistory.slice(-count).map(entry => entry.command);
  }

  checkGitStatus() {
    // This would ideally check actual git status
    // For now, return false - could be enhanced with actual git status check
    return false;
  }

  isGitRepository() {
    // Check if current directory is a git repo
    // This is a simplified check - could be enhanced
    return false;
  }

  checkDockerContainers() {
    // Check if there are running Docker containers
    return false;
  }

  isDangerousCommand(command) {
    const dangerousPatterns = [/^sudo\s+rm/, /rm\s+-rf/, /chmod\s+777/, /^dd\s+/, /mkfs/, /fdisk/];

    return dangerousPatterns.some(pattern => pattern.test(command));
  }

  isTerminalFocused() {
    // Check if terminal has focus
    const terminalElement = document.querySelector('.terminal');
    return (
      document.activeElement === terminalElement ||
      terminalElement?.contains(document.activeElement)
    );
  }

  isFirstTimeSuccess(command) {
    const commandBase = command.split(' ')[0];
    return !this.tipsSystem.userProfile.successful_commands.has(commandBase);
  }

  // Tip triggering methods
  triggerGitStatusTip() {
    const tip = {
      message:
        "🌊 I see you have unstaged changes! Pro tip: Use 'git add .' to stage all files, or 'git add [filename]' for specific files!",
      priority: 8,
      category: 'git',
    };

    this.showImmediateTip(tip);
  }

  triggerDockerContainersTip() {
    const tip = {
      message:
        "🐳 Looking at your containers! Try 'docker logs [container_id]' to see what's happening inside, or 'docker exec -it [container_id] /bin/bash' to dive in!",
      priority: 7,
      category: 'docker',
    };

    this.showImmediateTip(tip);
  }

  triggerPermissionTip() {
    const tip = {
      message:
        "🔒 Permission denied? Try prefixing with 'sudo' for admin rights, or check file permissions with 'ls -la'. Be careful with sudo - great power, great responsibility!",
      priority: 9,
      category: 'file_operations',
    };

    this.showImmediateTip(tip);
  }

  showErrorRecoveryTips(command, error) {
    const tip = {
      message: `🧜‍♀️ Don't worry, even the best sailors hit rough waters! That error with "${command}" is just a learning opportunity. Want me to suggest some alternatives?`,
      priority: 8,
      category: 'encouragement',
    };

    this.showImmediateTip(tip);
  }

  showSuccessCelebration(command) {
    const celebrations = [
      `🎉 Fantastic! Your first successful "${command}" command! You're swimming with the current now!`,
      `✨ Well done! That "${command}" executed perfectly! You're becoming a true terminal mermaid!`,
      `🌊 Excellent work! "${command}" completed successfully! The digital ocean is yours to explore!`,
      `🧜‍♀️ Beautiful execution of "${command}"! You're navigating these waters like a natural!`,
    ];

    const tip = {
      message: celebrations[Math.floor(Math.random() * celebrations.length)],
      priority: 10,
      category: 'encouragement',
    };

    this.showImmediateTip(tip);
  }

  showImmediateTip(tip) {
    // Show tip immediately without going through full analysis
    const tipWithId = {
      ...tip,
      id: `immediate_${Date.now()}`,
      timestamp: Date.now(),
    };

    this.tipsSystem.displayTips([tipWithId]);
  }

  emitCommandEvent(command, context) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('rina-command-executed', {
          detail: { command, context },
        })
      );
    }
  }

  // Public API methods
  triggerManualTip(command, context = {}) {
    return this.tipsSystem.triggerTip(command, context);
  }

  getUserStats() {
    return this.tipsSystem.getUserInsights();
  }

  showTipById(tipId) {
    const tip = this.tipsSystem.findTipById(tipId);
    if (tip) {
      this.showImmediateTip(tip);
    }
  }

  resetTips() {
    this.tipsSystem.userProfile.tips_dismissed.clear();
    this.tipsSystem.userProfile.tips_shown.clear();
    this.tipsSystem.saveUserProfile();
  }
}

// Auto-initialize when terminal is ready
let terminalTipsIntegration;

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    // Wait for terminal to be initialized
    const initializeWhenReady = () => {
      const terminal = window.terminal || window.term;

      if (terminal) {
        terminalTipsIntegration = new TerminalTipsIntegration(terminal);
        window.terminalTipsIntegration = terminalTipsIntegration;
        console.log('🧜‍♀️ Terminal Tips Integration ready!');
      } else {
        // Retry after a short delay
        setTimeout(initializeWhenReady, 500);
      }
    };

    initializeWhenReady();
  });
}

export default TerminalTipsIntegration;
