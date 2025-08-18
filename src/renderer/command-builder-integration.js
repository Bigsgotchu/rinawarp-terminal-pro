/**
 * RinaWarp Terminal - Command Builder Integration 🧜‍♀️
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * Integration helper for connecting the Visual Command Builder with the existing terminal
 */

class CommandBuilderIntegration {
  constructor(terminalInstance, contextualTipsSystem) {
    this.terminal = terminalInstance;
    this.contextualTips = contextualTipsSystem;
    this.builderButton = null;
    this.isIntegrated = false;

    this.initialize();
  }

  initialize() {
    this.createBuilderButton();
    this.setupEventListeners();
    this.integrateTipsSystem();
    this.setupKeyboardShortcuts();

    console.log('🧜‍♀️ Command Builder Integration initialized!');
  }

  createBuilderButton() {
    // Create floating action button for quick access
    this.builderButton = document.createElement('button');
    this.builderButton.id = 'floating-builder-button';
    this.builderButton.className = 'floating-builder-btn';
    this.builderButton.innerHTML = '🔨';
    this.builderButton.title = 'Open Visual Command Builder (Ctrl+Shift+B)';

    // Add styles for the floating button
    const style = document.createElement('style');
    style.textContent = `
      .floating-builder-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #00ffcc, #00b8a3);
        border: none;
        color: #001122;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0, 255, 204, 0.4);
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .floating-builder-btn:hover {
        background: linear-gradient(135deg, #33ffdd, #00ccb3);
        transform: scale(1.1);
        box-shadow: 0 8px 30px rgba(0, 255, 204, 0.6);
      }
      
      .floating-builder-btn:active {
        transform: scale(0.95);
      }
      
      .floating-builder-btn.hidden {
        opacity: 0;
        transform: scale(0) translateY(20px);
        pointer-events: none;
      }
      
      .floating-builder-btn.pulse {
        animation: builderPulse 2s infinite;
      }
      
      @keyframes builderPulse {
        0%, 100% {
          transform: scale(1);
          box-shadow: 0 4px 20px rgba(0, 255, 204, 0.4);
        }
        50% {
          transform: scale(1.05);
          box-shadow: 0 8px 30px rgba(0, 255, 204, 0.7);
        }
      }
      
      /* Hide on mobile if needed */
      @media (max-width: 768px) {
        .floating-builder-btn {
          bottom: 80px; /* Avoid mobile keyboards */
          right: 15px;
          width: 48px;
          height: 48px;
          font-size: 20px;
        }
      }
    `;
    document.head.appendChild(style);

    // Click handler
    this.builderButton.addEventListener('click', () => {
      this.openBuilder();
    });

    document.body.appendChild(this.builderButton);
  }

  setupEventListeners() {
    // Listen for terminal command executions
    if (this.terminal) {
      // Hook into terminal write events
      const originalWrite = this.terminal.write;
      this.terminal.write = data => {
        this.onCommandExecuted(data);
        return originalWrite.call(this.terminal, data);
      };

      // Hook into command submission events
      this.terminal.onKey(({ _key, domEvent }) => {
        if (domEvent.key === 'Enter') {
          this.handleCommandSubmission();
        }
      });
    }

    // Listen for builder command execution events
    window.addEventListener('command-builder-execute', event => {
      const { command } = event.detail;
      this.executeCommand(command);
    });

    // Listen for contextual tips that might suggest using the builder
    window.addEventListener('contextual-tip-shown', event => {
      const { tip } = event.detail;
      if (this.shouldPromoteBuilder(tip)) {
        this.promoteBuilder();
      }
    });

    // Auto-hide/show based on terminal focus
    this.setupAutoHideShow();
  }

  integrateTipsSystem() {
    if (this.contextualTips) {
      // Add builder-specific tips
      const builderTips = {
        'first-complex-command': {
          trigger: 'command_pattern',
          pattern: /^(git\s+\w+.*\s+-\w+|docker\s+run.*-[a-z]|chmod\s+\d+)/,
          category: 'productivity',
          title: '🧜‍♀️ Complex Command Detected!',
          message:
            'That looks like a complex command! You can build commands visually with fewer errors.',
          suggestion: 'Try the Visual Command Builder',
          action: { text: 'Open Builder', callback: () => this.openBuilder() },
          priority: 'medium',
          conditions: { max_shown: 2, cooldown: 3600000 }, // 1 hour cooldown
        },

        'command-error-builder': {
          trigger: 'command_error',
          category: 'encouragement',
          title: '🌊 Command Error? No Problem!',
          message:
            'Command errors happen to everyone! The Visual Builder can help prevent syntax mistakes.',
          suggestion: 'Build commands step-by-step with visual guides',
          action: { text: 'Try Builder', callback: () => this.openBuilder() },
          priority: 'high',
          conditions: { max_shown: 3, cooldown: 1800000 }, // 30 min cooldown
        },

        'builder-tutorial': {
          trigger: 'first_session',
          category: 'productivity',
          title: '🔨 Discover the Visual Command Builder!',
          message:
            'Build terminal commands with checkboxes and dropdowns - perfect for Git, Docker, and file operations!',
          suggestion: 'Press Ctrl+Shift+B or click the 🔨 button',
          action: { text: 'Show Me!', callback: () => this.openBuilderWithTutorial() },
          priority: 'medium',
          conditions: { max_shown: 1 },
        },
      };

      // Merge with existing tips
      Object.assign(this.contextualTips.tips, builderTips);

      // Update command patterns to include builder suggestions
      this.contextualTips.updateCommandPatterns();
    }
  }

  setupKeyboardShortcuts() {
    // Additional shortcuts specific to integration
    document.addEventListener('keydown', e => {
      // Ctrl+Shift+H for help
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        this.showBuilderHelp();
      }

      // Escape to close builder if open
      if (e.key === 'Escape' && window.commandBuilder && window.commandBuilder.isVisible) {
        window.commandBuilder.hide();
      }
    });
  }

  setupAutoHideShow() {
    let terminalFocused = true;

    // Hide button when terminal loses focus (except when builder is open)
    document.addEventListener('focusin', e => {
      const isTerminalElement = e.target.closest('.terminal') || e.target.closest('.xterm');
      const isBuilderElement = e.target.closest('.command-builder');

      if (isTerminalElement) {
        terminalFocused = true;
        this.showBuilderButton();
      } else if (!isBuilderElement) {
        terminalFocused = false;
        setTimeout(() => {
          if (!terminalFocused && (!window.commandBuilder || !window.commandBuilder.isVisible)) {
            this.hideBuilderButton();
          }
        }, 500);
      }
    });

    // Show button on mouse movement in terminal area
    document.addEventListener('mousemove', e => {
      const terminalArea = document.querySelector('.terminal') || document.querySelector('.xterm');
      if (terminalArea && terminalArea.contains(e.target)) {
        this.showBuilderButton();
      }
    });
  }

  onCommandExecuted(data) {
    // Analyze executed commands for contextual tips
    if (typeof data === 'string' && data.trim()) {
      const command = data.trim();

      // Check if it's a complex command that could benefit from the builder
      if (this.isComplexCommand(command)) {
        this.promoteBuilder();
      }

      // Track command usage for personalization
      this.trackCommandUsage(command);
    }
  }

  handleCommandSubmission() {
    // Called when user presses Enter in terminal
    // Can be used for real-time analysis
    setTimeout(() => {
      this.checkForErrors();
    }, 1000);
  }

  checkForErrors() {
    // Look for error indicators in terminal output
    const terminalOutput = this.getRecentTerminalOutput();
    if (terminalOutput && this.containsError(terminalOutput)) {
      this.suggestBuilder('error');
    }
  }

  isComplexCommand(command) {
    const complexPatterns = [
      /^git\s+\w+.*(-\w+.*){2,}/, // Git commands with multiple flags
      /^docker\s+run.*(-\w+.*){3,}/, // Docker run with many options
      /^find\s+.*-\w+.*(-\w+.*){2,}/, // Find with multiple options
      /^tar\s+.*[xzvcf]{3,}/, // Tar with multiple flags
      /^rsync\s+.*(-\w+.*){2,}/, // Rsync with multiple flags
      /^chmod\s+\d{3,4}\s+.*-R/, // Recursive chmod
      /^curl\s+.*(-\w+.*){2,}/, // Curl with multiple options
    ];

    return complexPatterns.some(pattern => pattern.test(command));
  }

  containsError(output) {
    const errorPatterns = [
      /command not found/i,
      /permission denied/i,
      /no such file or directory/i,
      /syntax error/i,
      /invalid option/i,
      /fatal:/i,
      /error:/i,
    ];

    return errorPatterns.some(pattern => pattern.test(output));
  }

  getRecentTerminalOutput() {
    // This would need to be implemented based on your terminal implementation
    // For now, return null as placeholder
    return null;
  }

  shouldPromoteBuilder(tip) {
    // Logic to determine if a tip should promote the builder
    const promoteTriggers = [
      'first_git_command',
      'first_docker_command',
      'command_error',
      'complex_file_operation',
    ];

    return promoteTriggers.includes(tip.trigger);
  }

  promoteBuilder() {
    // Add pulse animation to draw attention
    this.builderButton.classList.add('pulse');

    setTimeout(() => {
      this.builderButton.classList.remove('pulse');
    }, 4000);
  }

  suggestBuilder(context = 'general') {
    if (this.contextualTips) {
      const suggestion = {
        title: '🧜‍♀️ Try the Visual Command Builder!',
        message:
          context === 'error'
            ? 'Command errors can be avoided with visual command building!'
            : 'Build commands with point-and-click simplicity!',
        action: { text: 'Open Builder', callback: () => this.openBuilder() },
      };

      this.contextualTips.showTip(suggestion);
    }
  }

  openBuilder() {
    if (window.commandBuilder) {
      window.commandBuilder.show();
    } else {
      console.warn('🧜‍♀️ Command Builder not loaded yet');
    }
  }

  openBuilderWithTutorial() {
    this.openBuilder();

    // Show tutorial overlay after builder opens
    setTimeout(() => {
      this.showBuilderTutorial();
    }, 500);
  }

  showBuilderTutorial() {
    const tutorial = document.createElement('div');
    tutorial.className = 'builder-tutorial-overlay';
    tutorial.innerHTML = `
      <div class="tutorial-content">
        <h3>🧜‍♀️ Welcome to the Visual Command Builder!</h3>
        <div class="tutorial-steps">
          <div class="tutorial-step">
            <span class="step-number">1</span>
            <p>Choose a command category (Git, Files, Docker, etc.)</p>
          </div>
          <div class="tutorial-step">
            <span class="step-number">2</span>
            <p>Select options using checkboxes and dropdowns</p>
          </div>
          <div class="tutorial-step">
            <span class="step-number">3</span>
            <p>Watch the command preview update in real-time</p>
          </div>
          <div class="tutorial-step">
            <span class="step-number">4</span>
            <p>Copy or execute your command with confidence!</p>
          </div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="tutorial-close">
          Got it! 🚀
        </button>
      </div>
    `;

    // Add tutorial styles
    const tutorialStyle = document.createElement('style');
    tutorialStyle.textContent = `
      .builder-tutorial-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 20, 40, 0.9);
        z-index: 11001;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .tutorial-content {
        background: linear-gradient(135deg, #001122, #003366);
        border: 2px solid #00ffcc;
        border-radius: 15px;
        padding: 30px;
        max-width: 500px;
        text-align: center;
      }
      
      .tutorial-content h3 {
        color: #00ffcc;
        margin: 0 0 20px 0;
        font-size: 22px;
      }
      
      .tutorial-steps {
        margin: 20px 0;
        text-align: left;
      }
      
      .tutorial-step {
        display: flex;
        align-items: center;
        margin: 15px 0;
        color: white;
      }
      
      .step-number {
        background: #00ffcc;
        color: #001122;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        margin-right: 15px;
        flex-shrink: 0;
      }
      
      .tutorial-step p {
        margin: 0;
        font-size: 14px;
      }
      
      .tutorial-close {
        background: linear-gradient(135deg, #00ffcc, #00b8a3);
        border: none;
        border-radius: 8px;
        color: #001122;
        font-size: 14px;
        font-weight: 600;
        padding: 12px 24px;
        cursor: pointer;
        margin-top: 20px;
      }
    `;

    document.head.appendChild(tutorialStyle);
    document.body.appendChild(tutorial);
  }

  showBuilderHelp() {
    const help = document.createElement('div');
    help.className = 'builder-help-overlay';
    help.innerHTML = `
      <div class="help-content">
        <h3>🧜‍♀️ Visual Command Builder Help</h3>
        <div class="help-shortcuts">
          <h4>Keyboard Shortcuts:</h4>
          <ul>
            <li><kbd>Ctrl+Shift+B</kbd> - Open/Close Builder</li>
            <li><kbd>Ctrl+Shift+H</kbd> - Show this help</li>
            <li><kbd>Escape</kbd> - Close builder</li>
          </ul>
        </div>
        <div class="help-tips">
          <h4>Tips:</h4>
          <ul>
            <li>Commands preview in real-time as you select options</li>
            <li>Click the 📋 button to copy commands to clipboard</li>
            <li>Use "Explain Command" to understand what each part does</li>
            <li>File/directory pickers help avoid typos in paths</li>
          </ul>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="help-close">
          Close Help
        </button>
      </div>
    `;

    // Add help styles (simplified)
    const helpStyle = document.createElement('style');
    helpStyle.textContent = `
      .builder-help-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 20, 40, 0.9);
        z-index: 11001;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .help-content {
        background: linear-gradient(135deg, #001122, #003366);
        border: 2px solid #00ffcc;
        border-radius: 15px;
        padding: 30px;
        max-width: 500px;
        color: white;
      }
      
      .help-content h3 {
        color: #00ffcc;
        margin: 0 0 20px 0;
        text-align: center;
      }
      
      .help-content h4 {
        color: #00ffcc;
        margin: 20px 0 10px 0;
      }
      
      .help-content ul {
        margin: 0;
        padding-left: 20px;
      }
      
      .help-content li {
        margin: 8px 0;
        font-size: 14px;
      }
      
      .help-content kbd {
        background: rgba(0, 255, 204, 0.2);
        border: 1px solid rgba(0, 255, 204, 0.5);
        border-radius: 4px;
        padding: 2px 6px;
        font-family: monospace;
        font-size: 12px;
      }
      
      .help-close {
        background: linear-gradient(135deg, #00ffcc, #00b8a3);
        border: none;
        border-radius: 8px;
        color: #001122;
        font-size: 14px;
        font-weight: 600;
        padding: 12px 24px;
        cursor: pointer;
        margin-top: 20px;
        width: 100%;
      }
    `;

    document.head.appendChild(helpStyle);
    document.body.appendChild(help);
  }

  executeCommand(command) {
    if (this.terminal) {
      // Send command to terminal
      this.terminal.write(command + '\r');

      // Track usage
      this.trackCommandUsage(command);

      // Show success feedback
      this.showExecutionFeedback(command);
    }
  }

  trackCommandUsage(command) {
    // Track which commands are being built/used for analytics
    const usage = JSON.parse(localStorage.getItem('commandBuilderUsage') || '{}');
    const commandType = command.split(' ')[0];

    usage[commandType] = (usage[commandType] || 0) + 1;
    usage.lastUsed = Date.now();

    localStorage.setItem('commandBuilderUsage', JSON.stringify(usage));
  }

  showExecutionFeedback(command) {
    // Show brief success message
    const feedback = document.createElement('div');
    feedback.className = 'execution-feedback';
    feedback.innerHTML = `
      <div class="feedback-content">
        🚀 Command executed!
        <div class="feedback-command">${command}</div>
      </div>
    `;

    const feedbackStyle = document.createElement('style');
    feedbackStyle.textContent = `
      .execution-feedback {
        position: fixed;
        bottom: 100px;
        right: 20px;
        background: linear-gradient(135deg, #00ffcc, #00b8a3);
        color: #001122;
        border-radius: 10px;
        padding: 15px 20px;
        box-shadow: 0 4px 20px rgba(0, 255, 204, 0.4);
        z-index: 9998;
        animation: feedbackSlideIn 0.3s ease-out;
        max-width: 300px;
      }
      
      .feedback-content {
        font-size: 14px;
        font-weight: 600;
      }
      
      .feedback-command {
        font-family: monospace;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        padding: 5px;
        margin-top: 8px;
        font-size: 12px;
        word-break: break-all;
      }
      
      @keyframes feedbackSlideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;

    document.head.appendChild(feedbackStyle);
    document.body.appendChild(feedback);

    setTimeout(() => {
      feedback.style.animation = 'feedbackSlideIn 0.3s ease-out reverse';
      setTimeout(() => {
        feedback.remove();
        feedbackStyle.remove();
      }, 300);
    }, 3000);
  }

  showBuilderButton() {
    this.builderButton.classList.remove('hidden');
  }

  hideBuilderButton() {
    this.builderButton.classList.add('hidden');
  }

  // Public method to get usage statistics
  getUsageStats() {
    return JSON.parse(localStorage.getItem('commandBuilderUsage') || '{}');
  }

  // Public method to reset usage statistics
  resetUsageStats() {
    localStorage.removeItem('commandBuilderUsage');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CommandBuilderIntegration;
}

// Auto-initialize if DOM is ready and required dependencies exist
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Wait for terminal and contextual tips to be available
    const initIntegration = () => {
      const terminal = window.terminal || window.term;
      const contextualTips = window.contextualTipsSystem;

      if (terminal || contextualTips) {
        window.commandBuilderIntegration = new CommandBuilderIntegration(terminal, contextualTips);
        console.log('🧜‍♀️ Command Builder Integration ready!');
      } else {
        // Retry in 1 second
        setTimeout(initIntegration, 1000);
      }
    };

    initIntegration();
  });
}

export default CommandBuilderIntegration;
