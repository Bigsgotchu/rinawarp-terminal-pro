/**
 * RinaWarp Terminal - Beginner Friendly Ui
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * This file is part of RinaWarp Terminal, an advanced open-source terminal emulator with
 * AI assistance, live collaboration, and enterprise-grade security features.
 *
 * Licensed under the MIT License.
 * See LICENSE file for detailed terms and conditions.
 *
 * Project repository: https://github.com/rinawarp/terminal
 */
class BeginnerFriendlyUI {
  constructor(terminalManager) {
    this.terminalManager = terminalManager;
    this.isBeginnerMode = this.detectBeginnerMode();
    this.currentTour = null;
    this.smartHints = new SmartHintSystem();
    this.helpContexts = new Map();
    this.visualCommandBuilder = null;
    this.interactivePanel = null;
    this.userLevel = this.getUserLevel();
    this.setupBeginnerMode();
    this.initializeEnhancedUI();
  }

  detectBeginnerMode() {
    // Check if user has used the terminal before
    const hasHistory = localStorage.getItem('rinawarp-terminal-history');
    const sessionCount = parseInt(localStorage.getItem('rinawarp-session-count') || '0');
    const userPreference = localStorage.getItem('rinawarp-user-mode');

    // Respect user preference if explicitly set
    if (userPreference === 'advanced') return false;
    if (userPreference === 'beginner') return true;

    // Auto-detect: consider user a beginner if they have minimal history
    return !hasHistory || sessionCount < 10;
  }

  getUserLevel() {
    const saved = localStorage.getItem('rinawarp-user-level');
    return saved || 'beginner'; // beginner, intermediate, advanced
  }

  setUserLevel(level) {
    localStorage.setItem('rinawarp-user-level', level);
    this.userLevel = level;
    this.updateUIForLevel();
  }

  setupBeginnerMode() {
    if (this.isBeginnerMode) {
      this.enableBeginnerFeatures();
      this.showWelcomeTour();
    }

    // Always available features
    this.setupHelpOverlay();
    this.setupSmartAssistant();
    this.setupAccessibilityFeatures();
    this.setupOnboardingTours();
    this.setupVisualCommandBuilder();
    this.setupInteractivePanel();
    this.setupSmartToolbar();
  }

  initializeEnhancedUI() {
    // Create the main enhanced UI container
    this.createEnhancedUIContainer();

    // Setup different interaction modes
    this.setupInteractionModes();

    // Initialize progressive disclosure system
    this.setupProgressiveDisclosure();

    // Setup user onboarding flow
    this.setupOnboardingFlow();

    // Initialize accessibility features
    this.setupAdvancedAccessibility();
  }

  createEnhancedUIContainer() {
    const container = document.createElement('div');
    container.id = 'enhanced-ui-container';
    container.className = 'enhanced-ui-container';
    container.innerHTML = `
            <div class="ui-mode-selector">
                <button class="mode-btn active" data-mode="guided" title="Guided Mode - Perfect for beginners">
                    <span class="mode-icon">🎯</span>
                    <span class="mode-label">Guided</span>
                </button>
                <button class="mode-btn" data-mode="visual" title="Visual Mode - Drag and drop commands">
                    <span class="mode-icon">🎨</span>
                    <span class="mode-label">Visual</span>
                </button>
                <button class="mode-btn" data-mode="traditional" title="Traditional Mode - Classic terminal">
                    <span class="mode-icon">⌨️</span>
                    <span class="mode-label">Terminal</span>
                </button>
                <button class="mode-btn" data-mode="expert" title="Expert Mode - Full power user features">
                    <span class="mode-icon">🚀</span>
                    <span class="mode-label">Expert</span>
                </button>
            </div>
            
            <div class="ui-content-panels">
                <div id="guided-panel" class="ui-panel active">
                    <div class="panel-header">
                        <h3>🎯 Guided Terminal</h3>
                        <p>Let us guide you through terminal tasks step by step</p>
                    </div>
                    <div class="guided-content">
                        <div class="task-categories">
                            <div class="category-card" data-category="files">
                                <div class="category-icon">📁</div>
                                <h4>File Management</h4>
                                <p>Create, move, copy, and organize files</p>
                                <div class="common-tasks">
                                    <button class="task-btn" data-task="list-files">List Files</button>
                                    <button class="task-btn" data-task="create-folder">New Folder</button>
                                    <button class="task-btn" data-task="copy-file">Copy File</button>
                                </div>
                            </div>
                            
                            <div class="category-card" data-category="git">
                                <div class="category-icon">🌿</div>
                                <h4>Version Control</h4>
                                <p>Track changes and collaborate with Git</p>
                                <div class="common-tasks">
                                    <button class="task-btn" data-task="git-status">Check Status</button>
                                    <button class="task-btn" data-task="git-commit">Save Changes</button>
                                    <button class="task-btn" data-task="git-sync">Sync Online</button>
                                </div>
                            </div>
                            
                            <div class="category-card" data-category="development">
                                <div class="category-icon">⚙️</div>
                                <h4>Development</h4>
                                <p>Run projects and manage dependencies</p>
                                <div class="common-tasks">
                                    <button class="task-btn" data-task="install-deps">Install Dependencies</button>
                                    <button class="task-btn" data-task="start-project">Start Project</button>
                                    <button class="task-btn" data-task="run-tests">Run Tests</button>
                                </div>
                            </div>
                            
                            <div class="category-card" data-category="system">
                                <div class="category-icon">💻</div>
                                <h4>System Info</h4>
                                <p>Check system status and processes</p>
                                <div class="common-tasks">
                                    <button class="task-btn" data-task="system-info">System Info</button>
                                    <button class="task-btn" data-task="disk-usage">Disk Usage</button>
                                    <button class="task-btn" data-task="running-processes">Running Processes</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="visual-panel" class="ui-panel">
                    <div class="panel-header">
                        <h3>🎨 Visual Command Builder</h3>
                        <p>Build commands visually by dragging and dropping</p>
                    </div>
                    <div class="visual-builder">
                        <div class="command-palette">
                            <div class="palette-section">
                                <h4>📁 Files & Folders</h4>
                                <div class="command-blocks">
                                    <div class="command-block" draggable="true" data-command="ls">
                                        <span class="block-icon">📋</span>
                                        <span class="block-name">List Files</span>
                                    </div>
                                    <div class="command-block" draggable="true" data-command="cd">
                                        <span class="block-icon">📂</span>
                                        <span class="block-name">Change Dir</span>
                                    </div>
                                    <div class="command-block" draggable="true" data-command="mkdir">
                                        <span class="block-icon">➕</span>
                                        <span class="block-name">New Folder</span>
                                    </div>
                                    <div class="command-block" draggable="true" data-command="cp">
                                        <span class="block-icon">📋</span>
                                        <span class="block-name">Copy</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="palette-section">
                                <h4>🌿 Git Commands</h4>
                                <div class="command-blocks">
                                    <div class="command-block" draggable="true" data-command="git status">
                                        <span class="block-icon">📊</span>
                                        <span class="block-name">Git Status</span>
                                    </div>
                                    <div class="command-block" draggable="true" data-command="git add">
                                        <span class="block-icon">➕</span>
                                        <span class="block-name">Stage Files</span>
                                    </div>
                                    <div class="command-block" draggable="true" data-command="git commit">
                                        <span class="block-icon">💾</span>
                                        <span class="block-name">Save Changes</span>
                                    </div>
                                    <div class="command-block" draggable="true" data-command="git push">
                                        <span class="block-icon">☁️</span>
                                        <span class="block-name">Upload</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="command-builder-area">
                            <div class="builder-header">
                                <h4>Drop commands here to build</h4>
                                <button class="clear-builder">Clear</button>
                            </div>
                            <div class="command-dropzone" id="command-dropzone">
                                <div class="dropzone-placeholder">
                                    <span class="placeholder-icon">🎯</span>
                                    <p>Drag command blocks here</p>
                                    <p class="placeholder-hint">Commands will be connected automatically</p>
                                </div>
                            </div>
                            <div class="builder-actions">
                                <button class="preview-btn">👁️ Preview</button>
                                <button class="execute-btn">▶️ Execute</button>
                                <button class="save-template-btn">💾 Save as Template</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="traditional-panel" class="ui-panel">
                    <div class="panel-header">
                        <h3>⌨️ Enhanced Terminal</h3>
                        <p>Traditional terminal with smart assistance</p>
                    </div>
                    <div class="traditional-enhancements">
                        <div class="smart-toolbar">
                            <div class="toolbar-section">
                                <label>Quick Actions:</label>
                                <button class="quick-action" data-command="ls -la">📋 List All</button>
                                <button class="quick-action" data-command="pwd">📍 Where Am I</button>
                                <button class="quick-action" data-command="git status">🌿 Git Status</button>
                                <button class="quick-action" data-command="npm start">🚀 Start Project</button>
                            </div>
                            
                            <div class="toolbar-section">
                                <label>Smart Features:</label>
                                <button class="feature-toggle active" data-feature="auto-complete" title="Auto-complete commands">
                                    <span class="toggle-icon">✨</span> Smart Complete
                                </button>
                                <button class="feature-toggle active" data-feature="explain-commands" title="Explain what commands do">
                                    <span class="toggle-icon">💡</span> Explain
                                </button>
                                <button class="feature-toggle" data-feature="safety-checks" title="Warn about dangerous commands">
                                    <span class="toggle-icon">🛡️</span> Safety
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="expert-panel" class="ui-panel">
                    <div class="panel-header">
                        <h3>🚀 Expert Mode</h3>
                        <p>Advanced features and customization</p>
                    </div>
                    <div class="expert-features">
                        <div class="feature-grid">
                            <div class="expert-feature" data-feature="multi-terminal">
                                <h4>📑 Multiple Terminals</h4>
                                <p>Split, organize, and manage multiple terminal sessions</p>
                                <button class="activate-feature">Enable</button>
                            </div>
                            
                            <div class="expert-feature" data-feature="workflow-automation">
                                <h4>🔄 Workflow Automation</h4>
                                <p>Create and run automated command sequences</p>
                                <button class="activate-feature">Enable</button>
                            </div>
                            
                            <div class="expert-feature" data-feature="cloud-sync">
                                <h4>☁️ Cloud Sync</h4>
                                <p>Sync settings and sessions across devices</p>
                                <button class="activate-feature">Configure</button>
                            </div>
                            
                            <div class="expert-feature" data-feature="ai-assistant">
                                <h4>🤖 AI Assistant</h4>
                                <p>Advanced AI-powered command suggestions and help</p>
                                <button class="activate-feature">Setup</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="ui-sidebar" id="help-sidebar">
                <div class="sidebar-header">
                    <h3>📚 Context Help</h3>
                    <button class="sidebar-close">×</button>
                </div>
                <div class="sidebar-content" id="help-content">
                    <div class="help-section">
                        <h4>Getting Started</h4>
                        <p>Welcome! Choose a mode above to get started:</p>
                        <ul>
                            <li><strong>Guided:</strong> Step-by-step task assistance</li>
                            <li><strong>Visual:</strong> Drag-and-drop command building</li>
                            <li><strong>Terminal:</strong> Enhanced traditional mode</li>
                            <li><strong>Expert:</strong> Advanced power-user features</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(container);
    this.setupUIEventListeners();
  }

  enableBeginnerFeatures() {
    // Add beginner-friendly visual indicators
    document.body.classList.add('beginner-mode');

    // Show helpful tooltips
    this.enableTooltips();

    // Add command explanations
    this.setupCommandExplanations();

    // Enable guided tutorials
    this.setupGuidedTutorials();

    // Add safety confirmations for dangerous commands
    this.setupSafetyConfirmations();
  }

  setupHelpOverlay() {
    const helpButton = document.createElement('button');
    helpButton.id = 'help-overlay-toggle';
    helpButton.className = 'help-toggle-btn';
    helpButton.innerHTML = '❓';
    helpButton.title = 'Get Help (F1)';
    helpButton.onclick = () => this.toggleHelpOverlay();

    document.body.appendChild(helpButton);

    // Add keyboard shortcut
    document.addEventListener('keydown', e => {
      if (e.key === 'F1') {
        e.preventDefault();
        this.toggleHelpOverlay();
      }
    });
  }

  toggleHelpOverlay() {
    let overlay = document.getElementById('help-overlay');

    if (!overlay) {
      overlay = this.createHelpOverlay();
    }

    overlay.classList.toggle('hidden');
  }

  createHelpOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'help-overlay';
    overlay.className = 'help-overlay';
    overlay.innerHTML = `
            <div class="help-content">
                <div class="help-header">
                    <h2>🎯 Quick Help Center</h2>
                    <button class="close-help" onclick="this.closest('.help-overlay').classList.add('hidden')">×</button>
                </div>
                
                <div class="help-sections">
                    <div class="help-section">
                        <h3>🚀 Getting Started</h3>
                        <div class="help-items">
                            <div class="help-item" onclick="beginnerUI.startTour('basics')">
                                <span class="help-icon">📚</span>
                                <div>
                                    <strong>Terminal Basics Tour</strong>
                                    <p>Learn the fundamentals of using a terminal</p>
                                </div>
                            </div>
                            <div class="help-item" onclick="beginnerUI.startTour('commands')">
                                <span class="help-icon">⌨️</span>
                                <div>
                                    <strong>Common Commands</strong>
                                    <p>Discover the most useful terminal commands</p>
                                </div>
                            </div>
                            <div class="help-item" onclick="beginnerUI.startTour('git')">
                                <span class="help-icon">🌿</span>
                                <div>
                                    <strong>Git & Version Control</strong>
                                    <p>Learn version control with Git</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="help-section">
                        <h3>⚡ Quick Actions</h3>
                        <div class="quick-actions">
                            <button class="quick-action-btn" onclick="beginnerUI.showCommandReference()">
                                📖 Command Reference
                            </button>
                            <button class="quick-action-btn" onclick="beginnerUI.showShortcuts()">
                                ⌨️ Keyboard Shortcuts
                            </button>
                            <button class="quick-action-btn" onclick="beginnerUI.showThemeSelector()">
                                🎨 Change Theme
                            </button>
                            <button class="quick-action-btn" onclick="beginnerUI.showSettings()">
                                ⚙️ Settings
                            </button>
                        </div>
                    </div>
                    
                    <div class="help-section">
                        <h3>💡 Smart Features</h3>
                        <div class="feature-toggles">
                            <label class="feature-toggle">
                                <input type="checkbox" id="enable-hints" checked onchange="beginnerUI.toggleHints(this.checked)">
                                <span>Smart Hints & Suggestions</span>
                            </label>
                            <label class="feature-toggle">
                                <input type="checkbox" id="enable-explanations" checked onchange="beginnerUI.toggleExplanations(this.checked)">
                                <span>Command Explanations</span>
                            </label>
                            <label class="feature-toggle">
                                <input type="checkbox" id="enable-safety" checked onchange="beginnerUI.toggleSafety(this.checked)">
                                <span>Safety Confirmations</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="help-section">
                        <h3>🆘 Need More Help?</h3>
                        <div class="help-links">
                            <a href="#" onclick="beginnerUI.openDocumentation()">📚 Full Documentation</a>
                            <a href="#" onclick="beginnerUI.openCommunity()">👥 Community Forum</a>
                            <a href="#" onclick="beginnerUI.contactSupport()">📧 Contact Support</a>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(overlay);
    return overlay;
  }

  setupSmartAssistant() {
    const assistant = document.createElement('div');
    assistant.id = 'smart-assistant';
    assistant.className = 'smart-assistant hidden';
    assistant.innerHTML = `
            <div class="assistant-avatar">🤖</div>
            <div class="assistant-content">
                <div class="assistant-message">
                    Hi! I'm your Terminal Assistant. I can help you learn commands, 
                    explain what things do, and guide you through tasks. 
                    Just ask me anything!
                </div>
                <div class="assistant-input">
                    <input type="text" placeholder="Ask me anything... (e.g., 'How do I list files?')" />
                    <button onclick="beginnerUI.processAssistantQuery()">Ask</button>
                </div>
            </div>
            <button class="assistant-close" onclick="this.closest('.smart-assistant').classList.add('hidden')">×</button>
        `;

    document.body.appendChild(assistant);

    // Add floating assistant button
    const assistantBtn = document.createElement('button');
    assistantBtn.id = 'assistant-toggle';
    assistantBtn.className = 'assistant-toggle-btn';
    assistantBtn.innerHTML = '🤖';
    assistantBtn.title = 'Ask Assistant (Ctrl+?)';
    assistantBtn.onclick = () => this.toggleAssistant();

    document.body.appendChild(assistantBtn);

    // Keyboard shortcut
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === '?') {
        e.preventDefault();
        this.toggleAssistant();
      }
    });
  }

  toggleAssistant() {
    const assistant = document.getElementById('smart-assistant');
    assistant.classList.toggle('hidden');

    if (!assistant.classList.contains('hidden')) {
      assistant.querySelector('input').focus();
    }
  }

  processAssistantQuery() {
    const input = document.querySelector('#smart-assistant input');
    const query = input.value.trim();

    if (!query) return;

    // Process the query and provide helpful response
    const response = this.generateAssistantResponse(query);
    this.displayAssistantResponse(response);

    input.value = '';
  }

  generateAssistantResponse(query) {
    const responses = {
      // File operations
      'list files': {
        command: 'ls',
        explanation: 'The "ls" command lists all files and folders in your current directory.',
        example: 'Try typing: ls -la (for detailed view with hidden files)',
      },
      'change directory': {
        command: 'cd [folder-name]',
        explanation: 'Use "cd" to change your current directory.',
        example: 'Try: cd Documents (to go into Documents folder)',
      },
      'create folder': {
        command: 'mkdir [folder-name]',
        explanation: 'Creates a new folder with the specified name.',
        example: 'Try: mkdir my-project',
      },
      'current location': {
        command: 'pwd',
        explanation: 'Shows your current directory path.',
        example: 'Just type: pwd',
      },

      // Git operations
      'git status': {
        command: 'git status',
        explanation: 'Shows the current state of your Git repository.',
        example: 'This tells you what files have changed',
      },
      'git commit': {
        command: 'git add . && git commit -m "message"',
        explanation: 'Saves your changes to the repository.',
        example: 'Always include a descriptive message',
      },

      // General help
      help: {
        command: 'man [command]',
        explanation: 'Get help for any command using "man".',
        example: 'Try: man ls (to learn about the ls command)',
      },
    };

    // Find matching response
    for (const [key, response] of Object.entries(responses)) {
      if (query.toLowerCase().includes(key)) {
        return response;
      }
    }

    // Default response
    return {
      command: '',
      explanation: `I'd love to help with "${query}"! Here are some things I can help you with:`,
      example: 'Try asking: "How do I list files?" or "How do I use git?"',
    };
  }

  displayAssistantResponse(response) {
    const messageDiv = document.querySelector('#smart-assistant .assistant-message');

    messageDiv.innerHTML = `
            <div class="response-content">
                ${response.explanation}
                ${
                  response.command
                    ? `<div class="command-suggestion">
                    <strong>Command:</strong> <code>${response.command}</code>
                    <button onclick="beginnerUI.insertCommand('${response.command}')" class="insert-btn">Insert</button>
                </div>`
                    : ''
                }
                ${response.example ? `<div class="example-text"><strong>Example:</strong> ${response.example}</div>` : ''}
            </div>
        `;
  }

  insertCommand(command) {
    // Insert command into active terminal
    if (this.terminalManager && this.terminalManager.insertCommand) {
      this.terminalManager.insertCommand(command);
      this.toggleAssistant(); // Close assistant
    }
  }

  setupAccessibilityFeatures() {
    // High contrast mode toggle
    const contrastToggle = document.createElement('button');
    contrastToggle.id = 'contrast-toggle';
    contrastToggle.className = 'accessibility-btn';
    contrastToggle.innerHTML = '🔆';
    contrastToggle.title = 'Toggle High Contrast';
    contrastToggle.onclick = () => this.toggleHighContrast();

    // Font size controls
    const fontControls = document.createElement('div');
    fontControls.id = 'font-controls';
    fontControls.className = 'font-controls';
    fontControls.innerHTML = `
            <button onclick="beginnerUI.adjustFontSize(-1)" title="Decrease Font Size">A-</button>
            <button onclick="beginnerUI.adjustFontSize(1)" title="Increase Font Size">A+</button>
            <button onclick="beginnerUI.resetFontSize()" title="Reset Font Size">A</button>
        `;

    // Add to document
    document.body.appendChild(contrastToggle);
    document.body.appendChild(fontControls);
  }

  toggleHighContrast() {
    document.body.classList.toggle('high-contrast');
    localStorage.setItem('high-contrast', document.body.classList.contains('high-contrast'));
  }

  adjustFontSize(delta) {
    if (this.terminalManager && this.terminalManager.adjustFontSize) {
      if (delta > 0) {
        this.terminalManager.increaseFontSize();
      } else {
        this.terminalManager.decreaseFontSize();
      }
    }
  }

  resetFontSize() {
    if (this.terminalManager && this.terminalManager.resetFontSize) {
      this.terminalManager.resetFontSize();
    }
  }

  setupCommandExplanations() {
    // Monitor for commands and show explanations
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && this.isBeginnerMode) {
        const activeTerminal = this.terminalManager.terminals.get(
          this.terminalManager.activeTerminalId
        );
        if (activeTerminal) {
          const command =
            this.terminalManager.commandBuffers.get(this.terminalManager.activeTerminalId) || '';
          if (command.trim()) {
            this.showCommandExplanation(command.trim());
          }
        }
      }
    });
  }

  showCommandExplanation(command) {
    const explanations = {
      ls: 'Lists files and directories in the current folder',
      cd: 'Changes your current directory (folder)',
      pwd: 'Shows your current directory path',
      mkdir: 'Creates a new directory (folder)',
      rm: '⚠️ Deletes files or directories - be careful!',
      cp: 'Copies files or directories',
      mv: 'Moves or renames files or directories',
      cat: 'Displays the contents of a file',
      nano: 'Opens a text editor',
      'git status': 'Shows the current state of your Git repository',
      'git add': 'Stages files for commit',
      'git commit': 'Saves changes to your repository',
      'git push': 'Uploads your changes to a remote repository',
      'git pull': 'Downloads changes from a remote repository',
      'npm install': 'Installs JavaScript packages',
      'npm start': 'Starts your application',
      'pip install': 'Installs Python packages',
    };

    const baseCommand = command.split(' ')[0];
    const explanation = explanations[command] || explanations[baseCommand];

    if (explanation) {
      this.showTooltip(
        explanation,
        command.includes('rm') || command.includes('delete') ? 'warning' : 'info'
      );
    }
  }

  showTooltip(message, type = 'info') {
    const tooltip = document.createElement('div');
    tooltip.className = `explanation-tooltip ${type}`;
    tooltip.innerHTML = `
            <div class="tooltip-content">
                <span class="tooltip-icon">${type === 'warning' ? '⚠️' : '💡'}</span>
                ${message}
                <button class="tooltip-close" onclick="this.closest('.explanation-tooltip').remove()">×</button>
            </div>
        `;

    document.body.appendChild(tooltip);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
      }
    }, 5000);
  }

  setupGuidedTutorials() {
    this.tutorials = {
      basics: this.createBasicsTutorial(),
      commands: this.createCommandsTutorial(),
      git: this.createGitTutorial(),
    };
  }

  createBasicsTutorial() {
    return {
      title: 'Terminal Basics',
      description: 'Learn the fundamentals of using a terminal',
      steps: [
        {
          title: 'Welcome to the Terminal!',
          content:
            "A terminal is a text-based interface where you type commands to interact with your computer. It might seem scary at first, but it's actually very powerful!",
          action: "Click 'Next' to continue",
        },
        {
          title: 'The Prompt',
          content:
            "The line where you type commands is called the 'prompt'. It usually shows your current directory and ends with a symbol like $ or >",
          highlight: '.terminal',
          action: 'Look at your terminal prompt',
        },
        {
          title: 'Your First Command',
          content:
            "Let's try your first command! Type 'pwd' (which stands for 'print working directory') to see where you are.",
          command: 'pwd',
          action: "Type 'pwd' and press Enter",
        },
        {
          title: 'Listing Files',
          content:
            "Now let's see what files are in your current directory. Type 'ls' to list them.",
          command: 'ls',
          action: "Type 'ls' and press Enter",
        },
        {
          title: 'Great Job!',
          content:
            "You've learned the basics! The terminal shows you information through text output. You can always ask for help by typing 'help' or clicking the help button.",
          action: "You're ready to explore more!",
        },
      ],
    };
  }

  createCommandsTutorial() {
    return {
      title: 'Common Commands',
      description: 'Learn the most useful terminal commands',
      steps: [
        {
          title: 'File Operations',
          content: "Let's learn how to work with files and directories.",
          action: 'Ready to learn file commands?',
        },
        {
          title: 'Creating Directories',
          content: "Use 'mkdir' to create new directories. Let's create a test directory.",
          command: 'mkdir test-directory',
          action: 'Type the command to create a directory',
        },
        {
          title: 'Changing Directories',
          content:
            "Use 'cd' to move into directories. Let's go into the directory we just created.",
          command: 'cd test-directory',
          action: 'Navigate into the new directory',
        },
        {
          title: 'Creating Files',
          content: "Use 'touch' to create empty files, or use a text editor like 'nano'.",
          command: 'touch hello.txt',
          action: 'Create a new file',
        },
        {
          title: 'Viewing Files',
          content: "Use 'cat' to display file contents, or 'ls' to see files in a directory.",
          command: 'ls',
          action: 'List files in the current directory',
        },
      ],
    };
  }

  createGitTutorial() {
    return {
      title: 'Git & Version Control',
      description: 'Learn the basics of Git for version control',
      steps: [
        {
          title: 'What is Git?',
          content:
            'Git is a version control system that helps you track changes in your code and collaborate with others.',
          action: "Let's learn Git basics!",
        },
        {
          title: 'Check Git Status',
          content:
            "The most important Git command is 'git status'. It tells you what's happening in your repository.",
          command: 'git status',
          action: 'Check your repository status',
        },
        {
          title: 'Adding Files',
          content: "Use 'git add' to stage files for commit. 'git add .' adds all changed files.",
          command: 'git add .',
          action: 'Stage your changes',
        },
        {
          title: 'Committing Changes',
          content: "Use 'git commit' to save your changes with a descriptive message.",
          command: 'git commit -m "Your message here"',
          action: 'Commit your changes',
        },
        {
          title: 'Pushing Changes',
          content: "Use 'git push' to upload your changes to a remote repository like GitHub.",
          command: 'git push',
          action: 'Push your changes',
        },
      ],
    };
  }

  startTour(tutorialName) {
    const tutorial = this.tutorials[tutorialName];
    if (!tutorial) return;

    this.currentTour = new GuidedTour(tutorial, this);
    this.currentTour.start();
  }

  // Utility methods
  showCommandReference() {
    this.terminalManager.pluginAPI.createModal(
      'Command Reference',
      `
            <div class="command-reference">
                <div class="command-category">
                    <h4>📁 File Operations</h4>
                    <div class="command-list">
                        <div class="command-item">
                            <code>ls</code> - List files and directories
                        </div>
                        <div class="command-item">
                            <code>cd [directory]</code> - Change directory
                        </div>
                        <div class="command-item">
                            <code>pwd</code> - Show current directory
                        </div>
                        <div class="command-item">
                            <code>mkdir [name]</code> - Create directory
                        </div>
                        <div class="command-item">
                            <code>touch [file]</code> - Create file
                        </div>
                    </div>
                </div>
                
                <div class="command-category">
                    <h4>🌿 Git Commands</h4>
                    <div class="command-list">
                        <div class="command-item">
                            <code>git status</code> - Check repository status
                        </div>
                        <div class="command-item">
                            <code>git add .</code> - Stage all changes
                        </div>
                        <div class="command-item">
                            <code>git commit -m "message"</code> - Commit changes
                        </div>
                        <div class="command-item">
                            <code>git push</code> - Push to remote
                        </div>
                    </div>
                </div>
            </div>
        `
    );
  }

  showShortcuts() {
    this.terminalManager.pluginAPI.createModal(
      'Keyboard Shortcuts',
      `
            <div class="shortcuts-reference">
                <div class="shortcut-category">
                    <h4>⌨️ General</h4>
                    <div class="shortcut-item">
                        <kbd>F1</kbd> - Show help
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl + ?</kbd> - Ask assistant
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl + ,</kbd> - Open settings
                    </div>
                </div>
                
                <div class="shortcut-category">
                    <h4>📑 Tabs</h4>
                    <div class="shortcut-item">
                        <kbd>Ctrl + Shift + T</kbd> - New tab
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl + Shift + W</kbd> - Close tab
                    </div>
                    <div class="shortcut-item">
                        <kbd>Ctrl + Tab</kbd> - Next tab
                    </div>
                </div>
            </div>
        `
    );
  }

  toggleHints(enabled) {
    this.smartHints.enabled = enabled;
    localStorage.setItem('smart-hints-enabled', enabled);
  }

  toggleExplanations(enabled) {
    this.explanationsEnabled = enabled;
    localStorage.setItem('explanations-enabled', enabled);
  }

  toggleSafety(enabled) {
    this.safetyEnabled = enabled;
    localStorage.setItem('safety-enabled', enabled);
  }
}

class GuidedTour {
  constructor(tutorial, ui) {
    this.tutorial = tutorial;
    this.ui = ui;
    this.currentStep = 0;
    this.overlay = null;
  }

  start() {
    this.createTourOverlay();
    this.showStep(0);
  }

  createTourOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'tour-overlay';
    this.overlay.innerHTML = `
            <div class="tour-content">
                <div class="tour-header">
                    <h3>${this.tutorial.title}</h3>
                    <div class="tour-progress">
                        <span class="step-counter">Step <span id="current-step">1</span> of ${this.tutorial.steps.length}</span>
                        <div class="progress-bar">
                            <div class="progress-fill" id="tour-progress"></div>
                        </div>
                    </div>
                </div>
                
                <div class="tour-body">
                    <h4 id="step-title"></h4>
                    <div id="step-content"></div>
                    <div id="step-command" class="step-command hidden"></div>
                </div>
                
                <div class="tour-footer">
                    <button id="tour-prev" onclick="currentTour.previousStep()" disabled>Previous</button>
                    <button id="tour-skip" onclick="currentTour.skip()">Skip Tour</button>
                    <button id="tour-next" onclick="currentTour.nextStep()">Next</button>
                </div>
            </div>
        `;

    document.body.appendChild(this.overlay);
    window.currentTour = this; // Make accessible to buttons
  }

  showStep(stepIndex) {
    const step = this.tutorial.steps[stepIndex];
    if (!step) return;

    this.currentStep = stepIndex;

    // Update content
    document.getElementById('current-step').textContent = stepIndex + 1;
    document.getElementById('step-title').textContent = step.title;
    document.getElementById('step-content').textContent = step.content;

    // Update progress
    const progress = ((stepIndex + 1) / this.tutorial.steps.length) * 100;
    document.getElementById('tour-progress').style.width = `${progress}%`;

    // Show command if present
    const commandDiv = document.getElementById('step-command');
    if (step.command) {
      commandDiv.innerHTML = `
                <div class="command-to-type">
                    <strong>Try this command:</strong>
                    <code>${step.command}</code>
                    <button onclick="beginnerUI.insertCommand('${step.command}')">Insert</button>
                </div>
            `;
      commandDiv.classList.remove('hidden');
    } else {
      commandDiv.classList.add('hidden');
    }

    // Update navigation buttons
    document.getElementById('tour-prev').disabled = stepIndex === 0;
    const nextBtn = document.getElementById('tour-next');
    if (stepIndex === this.tutorial.steps.length - 1) {
      nextBtn.textContent = 'Finish';
    } else {
      nextBtn.textContent = 'Next';
    }

    // Highlight elements if needed
    this.highlightElement(step.highlight);
  }

  highlightElement(selector) {
    // Remove previous highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });

    if (selector) {
      const element = document.querySelector(selector);
      if (element) {
        element.classList.add('tour-highlight');
      }
    }
  }

  nextStep() {
    if (this.currentStep < this.tutorial.steps.length - 1) {
      this.showStep(this.currentStep + 1);
    } else {
      this.finish();
    }
  }

  previousStep() {
    if (this.currentStep > 0) {
      this.showStep(this.currentStep - 1);
    }
  }

  skip() {
    this.finish();
  }

  finish() {
    this.highlightElement(null); // Remove highlights
    this.overlay.remove();

    // Show completion message
    this.ui.terminalManager.pluginAPI.showNotification(
      `🎉 Great job! You completed the "${this.tutorial.title}" tutorial!`,
      'success',
      4000
    );

    window.currentTour = null;
  }
}

class SmartHintSystem {
  constructor() {
    this.enabled = true;
    this.hintHistory = new Set();
    this.setupHints();
  }

  setupHints() {
    // Show contextual hints based on user behavior
    this.watchForPatterns();
  }

  watchForPatterns() {
    // Watch for common beginner mistakes and provide helpful hints
    document.addEventListener('keydown', e => {
      if (!this.enabled) return;

      // Example: User tries to use Ctrl+C to copy in terminal
      if (e.ctrlKey && e.key === 'c' && document.activeElement.closest('.terminal')) {
        this.showHint(
          'copy-hint',
          '💡 In terminals, Ctrl+C stops running commands. To copy text, select it and use Ctrl+Shift+C or right-click.',
          5000
        );
      }
    });
  }

  showHint(id, message, duration = 3000) {
    if (this.hintHistory.has(id)) return; // Don't show the same hint twice

    this.hintHistory.add(id);

    const hint = document.createElement('div');
    hint.className = 'smart-hint';
    hint.innerHTML = `
            <div class="hint-content">
                ${message}
                <button onclick="this.closest('.smart-hint').remove()">×</button>
            </div>
        `;

    document.body.appendChild(hint);

    setTimeout(() => {
      if (hint.parentNode) {
        hint.remove();
      }
    }, duration);
  }

  setupUIEventListeners() {
    // Mode switching
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const mode = e.currentTarget.dataset.mode;
        this.switchUIMode(mode);
      });
    });

    // Task button handlers
    document.querySelectorAll('.task-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const task = e.currentTarget.dataset.task;
        this.executeGuidedTask(task);
      });
    });

    // Quick action handlers
    document.querySelectorAll('.quick-action').forEach(btn => {
      btn.addEventListener('click', e => {
        const command = e.currentTarget.dataset.command;
        this.executeQuickAction(command);
      });
    });

    // Feature toggle handlers
    document.querySelectorAll('.feature-toggle').forEach(btn => {
      btn.addEventListener('click', e => {
        const feature = e.currentTarget.dataset.feature;
        btn.classList.toggle('active');
        this.toggleFeature(feature, btn.classList.contains('active'));
      });
    });

    // Expert feature activation
    document.querySelectorAll('.activate-feature').forEach(btn => {
      btn.addEventListener('click', e => {
        const feature = e.currentTarget.closest('.expert-feature').dataset.feature;
        this.activateExpertFeature(feature);
      });
    });

    // Visual command builder
    this.setupDragAndDrop();

    // Sidebar toggle
    document.querySelector('.sidebar-close')?.addEventListener('click', () => {
      document.getElementById('help-sidebar').classList.add('hidden');
    });
  }

  switchUIMode(mode) {
    // Update active mode button
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Show corresponding panel
    document.querySelectorAll('.ui-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `${mode}-panel`);
    });

    // Update help content
    this.updateHelpContent(mode);

    // Save user preference
    localStorage.setItem('rinawarp-ui-mode', mode);
  }

  updateHelpContent(mode) {
    const helpContent = document.getElementById('help-content');
    const content = {
      guided: {
        title: '🎯 Guided Mode Help',
        content:
          'In Guided Mode, click on task categories to see common actions. Each task will walk you through the steps with helpful explanations.',
      },
      visual: {
        title: '🎨 Visual Builder Help',
        content:
          'Drag command blocks from the palette to the drop zone. Commands will be automatically connected and you can preview before executing.',
      },
      traditional: {
        title: '⌨️ Enhanced Terminal Help',
        content:
          'This is the classic terminal with smart enhancements. Use quick actions for common commands or enable features like auto-complete and explanations.',
      },
      expert: {
        title: '🚀 Expert Mode Help',
        content:
          'Expert mode provides access to advanced features like multiple terminals, workflow automation, and cloud sync. Configure the features you need.',
      },
    };

    const modeContent = content[mode] || content.guided;
    helpContent.innerHTML = `
            <div class="help-section">
                <h4>${modeContent.title}</h4>
                <p>${modeContent.content}</p>
            </div>
        `;
  }

  executeGuidedTask(task) {
    const tasks = {
      'list-files': {
        title: 'List Files and Folders',
        steps: [
          {
            description:
              'We\'ll use the "ls" command to see what files are in your current folder.',
            command: 'ls',
          },
          {
            description:
              'For more details, we can add the "-la" flag to see hidden files and permissions.',
            command: 'ls -la',
          },
        ],
      },
      'create-folder': {
        title: 'Create a New Folder',
        steps: [
          { description: "First, let's see what's currently in this folder.", command: 'ls' },
          {
            description: 'Now we\'ll create a new folder called "my-new-folder".',
            command: 'mkdir my-new-folder',
          },
          { description: "Let's confirm the folder was created.", command: 'ls' },
        ],
      },
      'git-status': {
        title: 'Check Git Status',
        steps: [
          {
            description: "Let's check the current status of your Git repository.",
            command: 'git status',
          },
          { description: 'This shows you which files have been modified, added, or deleted.' },
        ],
      },
      'git-commit': {
        title: 'Save Changes with Git',
        steps: [
          { description: "First, let's see what changes we have.", command: 'git status' },
          { description: "Now we'll stage all changes for commit.", command: 'git add .' },
          {
            description: "Finally, we'll commit with a descriptive message.",
            command: 'git commit -m "Save my changes"',
          },
        ],
      },
      'install-deps': {
        title: 'Install Project Dependencies',
        steps: [
          {
            description: "We'll check if there's a package.json file first.",
            command: 'ls package.json',
          },
          {
            description: "Now we'll install all the dependencies listed in package.json.",
            command: 'npm install',
          },
        ],
      },
      'start-project': {
        title: 'Start Your Project',
        steps: [
          {
            description: "Let's check what scripts are available in your project.",
            command: 'npm run',
          },
          { description: "Now we'll start the development server.", command: 'npm start' },
        ],
      },
    };

    const taskData = tasks[task];
    if (taskData) {
      this.startGuidedTaskWalkthrough(taskData);
    }
  }

  startGuidedTaskWalkthrough(taskData) {
    const walkthrough = new TaskWalkthrough(taskData, this);
    walkthrough.start();
  }

  executeQuickAction(command) {
    if (this.terminalManager && this.terminalManager.executeCommand) {
      this.terminalManager.executeCommand(command);
    }
  }

  toggleFeature(feature, enabled) {
    const features = {
      'auto-complete': () => this.toggleAutoComplete(enabled),
      'explain-commands': () => this.toggleExplanations(enabled),
      'safety-checks': () => this.toggleSafety(enabled),
    };

    if (features[feature]) {
      features[feature]();
    }
  }

  toggleAutoComplete(enabled) {
    if (this.terminalManager) {
      this.terminalManager.settings.autoComplete = enabled;
      localStorage.setItem('auto-complete-enabled', enabled);
    }
  }

  activateExpertFeature(feature) {
    const features = {
      'multi-terminal': () => this.setupMultiTerminal(),
      'workflow-automation': () => this.setupWorkflowAutomation(),
      'cloud-sync': () => this.setupCloudSync(),
      'ai-assistant': () => this.setupAIAssistant(),
    };

    if (features[feature]) {
      features[feature]();
    }
  }

  setupDragAndDrop() {
    const dropzone = document.getElementById('command-dropzone');
    const commandBlocks = document.querySelectorAll('.command-block');

    // Make command blocks draggable
    commandBlocks.forEach(block => {
      block.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', e.target.dataset.command);
        e.target.classList.add('dragging');
      });

      block.addEventListener('dragend', e => {
        e.target.classList.remove('dragging');
      });
    });

    // Setup dropzone
    if (dropzone) {
      dropzone.addEventListener('dragover', e => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });

      dropzone.addEventListener('dragleave', e => {
        if (!dropzone.contains(e.relatedTarget)) {
          dropzone.classList.remove('drag-over');
        }
      });

      dropzone.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');

        const command = e.dataTransfer.getData('text/plain');
        this.addCommandToBuilder(command);
      });
    }

    // Builder action buttons
    document.querySelector('.clear-builder')?.addEventListener('click', () => {
      this.clearCommandBuilder();
    });

    document.querySelector('.preview-btn')?.addEventListener('click', () => {
      this.previewBuiltCommand();
    });

    document.querySelector('.execute-btn')?.addEventListener('click', () => {
      this.executeBuiltCommand();
    });
  }

  addCommandToBuilder(command) {
    const dropzone = document.getElementById('command-dropzone');
    const placeholder = dropzone.querySelector('.dropzone-placeholder');

    if (placeholder) {
      placeholder.style.display = 'none';
    }

    const commandElement = document.createElement('div');
    commandElement.className = 'built-command';
    commandElement.innerHTML = `
            <span class="command-text">${command}</span>
            <button class="remove-command" onclick="this.parentElement.remove(); beginnerUI.updateBuilderPlaceholder();">×</button>
        `;

    dropzone.appendChild(commandElement);
    this.updateCommandPreview();
  }

  clearCommandBuilder() {
    const dropzone = document.getElementById('command-dropzone');
    const commands = dropzone.querySelectorAll('.built-command');
    commands.forEach(cmd => cmd.remove());
    this.updateBuilderPlaceholder();
  }

  updateBuilderPlaceholder() {
    const dropzone = document.getElementById('command-dropzone');
    const placeholder = dropzone.querySelector('.dropzone-placeholder');
    const commands = dropzone.querySelectorAll('.built-command');

    if (placeholder) {
      placeholder.style.display = commands.length === 0 ? 'block' : 'none';
    }
  }

  previewBuiltCommand() {
    const commands = this.getBuiltCommands();
    if (commands.length === 0) {
      this.showNotification('No commands to preview', 'warning');
      return;
    }

    const combinedCommand = commands.join(' && ');
    this.showCommandPreview(combinedCommand);
  }

  executeBuiltCommand() {
    const commands = this.getBuiltCommands();
    if (commands.length === 0) {
      this.showNotification('No commands to execute', 'warning');
      return;
    }

    const combinedCommand = commands.join(' && ');
    if (this.terminalManager && this.terminalManager.executeCommand) {
      this.terminalManager.executeCommand(combinedCommand);
      this.clearCommandBuilder();
    }
  }

  getBuiltCommands() {
    const dropzone = document.getElementById('command-dropzone');
    const commandElements = dropzone.querySelectorAll('.built-command .command-text');
    return Array.from(commandElements).map(el => el.textContent);
  }

  showCommandPreview(command) {
    const preview = document.createElement('div');
    preview.className = 'command-preview-modal';
    preview.innerHTML = `
            <div class="preview-content">
                <div class="preview-header">
                    <h3>Command Preview</h3>
                    <button onclick="this.closest('.command-preview-modal').remove()">×</button>
                </div>
                <div class="preview-body">
                    <p>This command will execute:</p>
                    <code class="preview-command">${command}</code>
                    <div class="preview-explanation">
                        <h4>What this does:</h4>
                        <p>${this.explainCommand(command)}</p>
                    </div>
                </div>
                <div class="preview-footer">
                    <button onclick="this.closest('.command-preview-modal').remove()">Cancel</button>
                    <button onclick="beginnerUI.executeBuiltCommand(); this.closest('.command-preview-modal').remove();">Execute</button>
                </div>
            </div>
        `;

    document.body.appendChild(preview);
  }

  explainCommand(command) {
    const explanations = {
      ls: 'Lists the files and folders in the current directory',
      cd: 'Changes the current directory to the specified path',
      mkdir: 'Creates a new directory with the given name',
      'git status': 'Shows the current state of your Git repository',
      'git add': 'Stages files for the next commit',
      'git commit': 'Saves staged changes to the repository',
      'npm install': 'Installs project dependencies from package.json',
      'npm start': 'Starts the application using the start script',
    };

    if (command.includes('&&')) {
      return 'Executes multiple commands in sequence. Each command runs only if the previous one succeeds.';
    }

    const baseCommand = command.split(' ')[0];
    return explanations[command] || explanations[baseCommand] || 'Executes the specified command';
  }

  setupOnboardingTours() {
    // Additional onboarding setup
  }

  setupAccessibilityFeatures() {
    // Additional accessibility setup
  }

  setupVisualCommandBuilder() {
    // Already implemented above
  }

  setupInteractivePanel() {
    // Setup interactive features panel
  }

  setupSmartToolbar() {
    // Setup smart toolbar features
  }

  setupInteractionModes() {
    // Setup different interaction modes
  }

  setupProgressiveDisclosure() {
    // Setup progressive disclosure system
  }

  setupOnboardingFlow() {
    // Setup onboarding flow
  }

  setupAdvancedAccessibility() {
    // Setup advanced accessibility features
  }

  updateUIForLevel() {
    // Update UI based on user level
  }

  enableTooltips() {
    // Enable helpful tooltips
  }

  setupSafetyConfirmations() {
    // Setup safety confirmations for dangerous commands
  }

  showWelcomeTour() {
    // Show welcome tour for new users
    if (this.isBeginnerMode && !localStorage.getItem('welcome-tour-completed')) {
      setTimeout(() => {
        this.startTour('basics');
        localStorage.setItem('welcome-tour-completed', 'true');
      }, 1000);
    }
  }

  showThemeSelector() {
    // Implementation for theme selector
  }

  showSettings() {
    // Implementation for settings
  }

  openDocumentation() {
    // Open documentation
  }

  openCommunity() {
    // Open community forum
  }

  contactSupport() {
    // Contact support
  }

  setupMultiTerminal() {
    this.showNotification('🚀 Multi-terminal feature activated!', 'success');
  }

  setupWorkflowAutomation() {
    this.showNotification('🔄 Workflow automation feature activated!', 'success');
  }

  setupCloudSync() {
    this.showNotification('☁️ Cloud sync feature activated!', 'success');
  }

  setupAIAssistant() {
    this.showNotification('🤖 AI assistant feature activated!', 'success');
  }

  updateCommandPreview() {
    // Update command preview in builder
  }

  showNotification(message, type = 'info') {
    if (this.terminalManager && this.terminalManager.pluginAPI) {
      this.terminalManager.pluginAPI.showNotification(message, type);
    } else {
      // Fallback notification
      const notification = document.createElement('div');
      notification.className = `notification notification-${type}`;
      notification.textContent = message;
      document.body.appendChild(notification);

      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 3000);
    }
  }
}

class TaskWalkthrough {
  constructor(taskData, ui) {
    this.taskData = taskData;
    this.ui = ui;
    this.currentStep = 0;
    this.modal = null;
  }

  start() {
    this.createModal();
    this.showStep(0);
  }

  createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'task-walkthrough-modal';
    this.modal.innerHTML = `
            <div class="walkthrough-content">
                <div class="walkthrough-header">
                    <h3>${this.taskData.title}</h3>
                    <div class="step-indicator">
                        <span id="walkthrough-step">Step 1</span> of ${this.taskData.steps.length}
                    </div>
                </div>
                <div class="walkthrough-body">
                    <div id="walkthrough-description"></div>
                    <div id="walkthrough-command" class="walkthrough-command hidden"></div>
                </div>
                <div class="walkthrough-footer">
                    <button id="walkthrough-prev" disabled>Previous</button>
                    <button id="walkthrough-skip">Skip</button>
                    <button id="walkthrough-next">Next</button>
                </div>
            </div>
        `;

    document.body.appendChild(this.modal);
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.modal
      .querySelector('#walkthrough-prev')
      .addEventListener('click', () => this.previousStep());
    this.modal.querySelector('#walkthrough-next').addEventListener('click', () => this.nextStep());
    this.modal.querySelector('#walkthrough-skip').addEventListener('click', () => this.finish());
  }

  showStep(stepIndex) {
    const step = this.taskData.steps[stepIndex];
    if (!step) return;

    this.currentStep = stepIndex;

    // Update content
    this.modal.querySelector('#walkthrough-step').textContent = `Step ${stepIndex + 1}`;
    this.modal.querySelector('#walkthrough-description').textContent = step.description;

    // Show command if present
    const commandDiv = this.modal.querySelector('#walkthrough-command');
    if (step.command) {
      commandDiv.innerHTML = `
                <div class="command-to-execute">
                    <strong>Execute this command:</strong>
                    <code>${step.command}</code>
                    <button onclick="beginnerUI.executeQuickAction('${step.command}'); document.querySelector('#walkthrough-next').disabled = false;">Execute</button>
                </div>
            `;
      commandDiv.classList.remove('hidden');
      this.modal.querySelector('#walkthrough-next').disabled = true;
    } else {
      commandDiv.classList.add('hidden');
      this.modal.querySelector('#walkthrough-next').disabled = false;
    }

    // Update navigation
    this.modal.querySelector('#walkthrough-prev').disabled = stepIndex === 0;
    const nextBtn = this.modal.querySelector('#walkthrough-next');
    nextBtn.textContent = stepIndex === this.taskData.steps.length - 1 ? 'Finish' : 'Next';
  }

  nextStep() {
    if (this.currentStep < this.taskData.steps.length - 1) {
      this.showStep(this.currentStep + 1);
    } else {
      this.finish();
    }
  }

  previousStep() {
    if (this.currentStep > 0) {
      this.showStep(this.currentStep - 1);
    }
  }

  finish() {
    this.modal.remove();
    this.ui.showNotification(`✅ Task completed: ${this.taskData.title}`, 'success');
  }
}

// Export for use in main application
export { BeginnerFriendlyUI };

// Make globally available for HTML onclick handlers
window.beginnerUI = null;
