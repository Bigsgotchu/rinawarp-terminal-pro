/**
 * RinaWarp Terminal - Main Renderer Process
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
const { ipcRenderer } = require('electron');
const { Terminal } = require('@xterm/xterm');
const { FitAddon } = require('@xterm/addon-fit');
const { WebLinksAddon } = require('@xterm/addon-web-links');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Import Revolutionary Phase 1-3 Features
// These will be loaded dynamically to prevent bundling issues
let AdvancedAIContextEngine,
  PerformanceMonitoringDashboard,
  WorkflowAutomationEngine,
  EnhancedSecurityEngine,
  NextGenUIEngine;

// Multimodal Agent Manager
let MultimodalAgentManager;

// Enhanced Terminal Features from Warp Projects
// These features are loaded but currently used in other parts of the application
try {
  const enhancedFeatures = require('./enhanced-terminal-features.js');
  // Store features globally for use by other modules
  window.enhancedTerminalFeatures = {
    MultiTabTerminalManager: enhancedFeatures.MultiTabTerminalManager,
    TerminalSignalHandler: enhancedFeatures.TerminalSignalHandler,
    EnhancedTerminalThemeManager: enhancedFeatures.EnhancedTerminalThemeManager,
  };
  console.log('✅ Enhanced terminal features loaded from warp projects');
} catch (error) {
  console.warn('Enhanced terminal features not available:', error.message);
}

// Initialize License Manager
let licenseManager;
try {
  licenseManager = new LicenseManager();
  licenseManager.startTrial(); // Start trial for new users
  console.log('License Manager initialized:', licenseManager.getStatus());
} catch (error) {
  console.error('License Manager failed to initialize:', error);
  // Fallback to basic functionality
  licenseManager = {
    hasFeature: () => true,
    canUseAI: () => true,
    showUpgradeDialog: () => {},
    getStatus: () => ({ tier: 'trial', isValid: true }),
  };
}

// Load all advanced features dynamically
async function loadAdvancedFeatures() {
  try {
    // Phase 1: AI Context Engine & Performance Monitor
    const aiModule = await import('./ai-context-engine.js');
    const perfModule = await import('./performance-monitor.js');

    // Phase 1: Workflow Automation & Security
    const workflowModule = await import('./workflow-automation.js');
    const securityModule = await import('./enhanced-security.js');

    // Phase 2: Next-Gen UI Features
    const uiModule = await import('./next-gen-ui.js');

    // Phase 3: Multimodal Agent Framework
    const agentModule = await import('./multimodal-agent-manager.js');

    AdvancedAIContextEngine = aiModule.AdvancedAIContextEngine;
    PerformanceMonitoringDashboard = perfModule.PerformanceMonitoringDashboard;
    WorkflowAutomationEngine = workflowModule.WorkflowAutomationEngine;
    EnhancedSecurityEngine = securityModule.EnhancedSecurityEngine;
    NextGenUIEngine = uiModule.NextGenUIEngine;
    MultimodalAgentManager = agentModule.MultimodalAgentManager;

    console.log('🚀 All Advanced Features Loaded Successfully!');
    console.log('✅ Phase 1: AI Context Engine & Performance Monitor');
    console.log('✅ Phase 1: Workflow Automation & Enhanced Security');
    console.log('✅ Phase 2: Next-Gen UI with 3D/AR capabilities');
    console.log('✅ Phase 3: Multimodal AI Agent Framework');

    return true;
  } catch (error) {
    console.warn('⚠️  Some advanced features not available:', error.message);
    // Provide fallback implementations
    AdvancedAIContextEngine = class {
      constructor() {
        console.log('AI Context Engine - Fallback Mode');
      }
    };
    PerformanceMonitoringDashboard = class {
      constructor() {
        console.log('Performance Monitor - Fallback Mode');
      }
    };
    WorkflowAutomationEngine = class {
      constructor() {
        console.log('Workflow Automation - Fallback Mode');
      }
    };
    EnhancedSecurityEngine = class {
      constructor() {
        console.log('Enhanced Security - Fallback Mode');
      }
    };
    NextGenUIEngine = class {
      constructor() {
        console.log('Next-Gen UI - Fallback Mode');
      }
    };
    MultimodalAgentManager = class {
      constructor() {
        console.log('Multimodal Agent Manager - Fallback Mode');
      }
    };

    return false;
  }
}

// Command History and Suggestions Manager
class CommandHistoryManager {
  constructor() {
    this.history = [];
    this.historyIndex = -1;
    this.currentInput = '';
    this.suggestions = [];
    this.commonCommands = [
      'ls',
      'cd',
      'pwd',
      'mkdir',
      'rmdir',
      'rm',
      'cp',
      'mv',
      'cat',
      'grep',
      'find',
      'which',
      'ps',
      'kill',
      'top',
      'chmod',
      'chown',
      'tar',
      'zip',
      'git',
      'npm',
      'node',
      'python',
      'pip',
      'curl',
      'wget',
      'ssh',
      'scp',
      'docker',
      'kubectl',
      'helm',
      'terraform',
      'ansible',
    ];
    this.loadHistory();
  }

  loadHistory() {
    try {
      const historyPath = path.join(os.homedir(), '.rinawarp-terminal-history');
      if (fs.existsSync(historyPath)) {
        const data = fs.readFileSync(historyPath, 'utf8');
        this.history = data.split('\n').filter(cmd => cmd.trim());
      }
    } catch (error) {
      console.log('Could not load command history:', error.message);
    }
  }

  saveHistory() {
    try {
      const historyPath = path.join(os.homedir(), '.rinawarp-terminal-history');
      const historyData = this.history.slice(-1000).join('\n'); // Keep last 1000 commands
      fs.writeFileSync(historyPath, historyData);
    } catch (error) {
      console.log('Could not save command history:', error.message);
    }
  }

  addCommand(command) {
    const trimmedCommand = command.trim();
    if (trimmedCommand && !trimmedCommand.startsWith(' ')) {
      // Remove duplicate if exists
      const index = this.history.indexOf(trimmedCommand);
      if (index > -1) {
        this.history.splice(index, 1);
      }
      this.history.push(trimmedCommand);
      this.saveHistory();
    }
    this.resetHistoryNavigation();
  }

  resetHistoryNavigation() {
    this.historyIndex = -1;
    this.currentInput = '';
  }

  navigateHistory(direction, currentInput = '') {
    if (this.historyIndex === -1) {
      this.currentInput = currentInput;
    }

    if (direction === 'up') {
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        return this.history[this.history.length - 1 - this.historyIndex];
      }
    } else if (direction === 'down') {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        return this.history[this.history.length - 1 - this.historyIndex];
      } else if (this.historyIndex === 0) {
        this.historyIndex = -1;
        return this.currentInput;
      }
    }
    return null;
  }

  getSuggestions(input) {
    if (!input.trim()) return [];

    const suggestions = new Set();
    const inputLower = input.toLowerCase();

    // Add matching commands from history
    this.history.forEach(cmd => {
      if (cmd.toLowerCase().startsWith(inputLower)) {
        suggestions.add(cmd);
      }
    });

    // Add matching common commands
    this.commonCommands.forEach(cmd => {
      if (cmd.toLowerCase().startsWith(inputLower)) {
        suggestions.add(cmd);
      }
    });

    return Array.from(suggestions).slice(0, 10); // Limit to 10 suggestions
  }
}

// Theme Manager
class ThemeManager {
  constructor() {
    this.currentTheme = 'mermaid'; // Set Mermaid as default
    this.themes = {
      mermaid: {
        background: '#0a0b1e', // Deep ocean midnight
        foreground: '#ff1493', // Hot pink primary text
        cursor: '#ff69b4', // Bright pink cursor
        selection: '#2d1b69', // Deep purple selection
        black: '#0a0b1e',
        red: '#ff1493', // Hot pink for errors/important
        green: '#00ffcc', // Bright aqua for success
        yellow: '#ffb347', // Coral/peach for warnings
        blue: '#1e90ff', // Electric blue
        magenta: '#ff69b4', // Hot pink magenta
        cyan: '#00e5ff', // Bright cyan - mermaid tail
        white: '#f0f8ff', // Alice blue white
        brightBlack: '#4b0082', // Indigo
        brightRed: '#ff6347', // Tomato red
        brightGreen: '#00ffa5', // Spring green
        brightYellow: '#ffd700', // Gold
        brightBlue: '#87ceeb', // Sky blue
        brightMagenta: '#da70d6', // Orchid
        brightCyan: '#40e0d0', // Turquoise
        brightWhite: '#ffffff', // Pure white
      },
      cyberpunk: {
        background: '#0d0221', // Dark purple black
        foreground: '#00ff41', // Matrix green
        cursor: '#ff2a6d', // Hot pink cursor
        selection: '#1a0330', // Dark purple selection
        black: '#0d0221',
        red: '#ff073a', // Neon red
        green: '#00ff41', // Matrix green
        yellow: '#ffce00', // Electric yellow
        blue: '#005aff', // Electric blue
        magenta: '#ff2a6d', // Hot pink
        cyan: '#01cdfe', // Neon cyan
        white: '#ffffff',
        brightBlack: '#2a2139',
        brightRed: '#ff4081',
        brightGreen: '#39ff14',
        brightYellow: '#ffff00',
        brightBlue: '#00bfff',
        brightMagenta: '#ff1493',
        brightCyan: '#00ffff',
        brightWhite: '#ffffff',
      },
      forest: {
        background: '#0b1426', // Deep forest night
        foreground: '#7dc383', // Soft green
        cursor: '#98fb98', // Pale green cursor
        selection: '#1b3d2e', // Dark forest selection
        black: '#0b1426',
        red: '#e74c3c', // Autumn red
        green: '#27ae60', // Forest green
        yellow: '#f1c40f', // Sunlight yellow
        blue: '#3498db', // Sky blue
        magenta: '#9b59b6', // Lavender
        cyan: '#1abc9c', // Teal
        white: '#ecf0f1',
        brightBlack: '#34495e',
        brightRed: '#c0392b',
        brightGreen: '#2ecc71',
        brightYellow: '#f39c12',
        brightBlue: '#2980b9',
        brightMagenta: '#8e44ad',
        brightCyan: '#16a085',
        brightWhite: '#ffffff',
      },
      sunset: {
        background: '#2d1b3d', // Deep sunset purple
        foreground: '#ffa500', // Orange text
        cursor: '#ff6347', // Tomato cursor
        selection: '#4a2c4a', // Purple selection
        black: '#2d1b3d',
        red: '#ff4757', // Sunset red
        green: '#2ed573', // Mint green
        yellow: '#ffa502', // Sunset orange
        blue: '#3742fa', // Deep blue
        magenta: '#ff3838', // Pink
        cyan: '#7bed9f', // Light green
        white: '#ffffff',
        brightBlack: '#57606f',
        brightRed: '#ff6b7a',
        brightGreen: '#7bed9f',
        brightYellow: '#ffbe76',
        brightBlue: '#70a1ff',
        brightMagenta: '#ff9ff3',
        brightCyan: '#7bed9f',
        brightWhite: '#ffffff',
      },
      galaxy: {
        background: '#0d0d23', // Deep space
        foreground: '#e6e6fa', // Lavender
        cursor: '#ba55d3', // Medium orchid cursor
        selection: '#1a1a3e', // Dark space selection
        black: '#0d0d23',
        red: '#ff1493', // Deep pink
        green: '#00ff7f', // Spring green
        yellow: '#ffd700', // Gold
        blue: '#4169e1', // Royal blue
        magenta: '#da70d6', // Orchid
        cyan: '#00bfff', // Deep sky blue
        white: '#e6e6fa',
        brightBlack: '#483d8b',
        brightRed: '#ff69b4',
        brightGreen: '#98fb98',
        brightYellow: '#ffffe0',
        brightBlue: '#87ceeb',
        brightMagenta: '#dda0dd',
        brightCyan: '#e0ffff',
        brightWhite: '#ffffff',
      },
      vampire: {
        background: '#1a0a0a', // Dark blood red
        foreground: '#ff6b6b', // Blood red
        cursor: '#dc143c', // Crimson cursor
        selection: '#330a0a', // Dark red selection
        black: '#1a0a0a',
        red: '#ff0000', // Pure red
        green: '#32cd32', // Lime green
        yellow: '#ffd700', // Gold
        blue: '#4682b4', // Steel blue
        magenta: '#ff1493', // Deep pink
        cyan: '#00ced1', // Dark turquoise
        white: '#f5f5f5',
        brightBlack: '#696969',
        brightRed: '#ff4500',
        brightGreen: '#90ee90',
        brightYellow: '#ffff00',
        brightBlue: '#87ceeb',
        brightMagenta: '#ff69b4',
        brightCyan: '#00ffff',
        brightWhite: '#ffffff',
      },
      arctic: {
        background: '#0f1419', // Dark ice
        foreground: '#e6ffff', // Light cyan
        cursor: '#87ceeb', // Sky blue cursor
        selection: '#1e3a5f', // Ice blue selection
        black: '#0f1419',
        red: '#ff6b7a', // Soft red
        green: '#7bed9f', // Mint
        yellow: '#ffbe76', // Soft yellow
        blue: '#70a1ff', // Ice blue
        magenta: '#9ff3ff', // Light cyan
        cyan: '#7bed9f', // Mint cyan
        white: '#e6ffff',
        brightBlack: '#57606f',
        brightRed: '#ff9ff3',
        brightGreen: '#7bed9f',
        brightYellow: '#ffbe76',
        brightBlue: '#70a1ff',
        brightMagenta: '#ff9ff3',
        brightCyan: '#7bed9f',
        brightWhite: '#ffffff',
      },
      neon: {
        background: '#000000', // Pure black
        foreground: '#00ff00', // Neon green
        cursor: '#ff00ff', // Neon magenta cursor
        selection: '#1a1a1a', // Dark selection
        black: '#000000',
        red: '#ff0080', // Neon pink
        green: '#00ff00', // Neon green
        yellow: '#ffff00', // Neon yellow
        blue: '#0080ff', // Neon blue
        magenta: '#ff00ff', // Neon magenta
        cyan: '#00ffff', // Neon cyan
        white: '#ffffff',
        brightBlack: '#808080',
        brightRed: '#ff4080',
        brightGreen: '#40ff40',
        brightYellow: '#ffff80',
        brightBlue: '#4080ff',
        brightMagenta: '#ff40ff',
        brightCyan: '#40ffff',
        brightWhite: '#ffffff',
      },
      retro: {
        background: '#2e1f08', // Retro amber background
        foreground: '#ff9500', // Amber text
        cursor: '#ffaa00', // Bright amber cursor
        selection: '#4a3318', // Dark amber selection
        black: '#2e1f08',
        red: '#ff6b47', // Retro red
        green: '#a4e400', // Retro green
        yellow: '#ffaa00', // Amber yellow
        blue: '#5a9fd4', // Retro blue
        magenta: '#ad4e85', // Retro magenta
        cyan: '#4fb8cc', // Retro cyan
        white: '#f5deb3',
        brightBlack: '#8b7355',
        brightRed: '#ff8c69',
        brightGreen: '#c7f464',
        brightYellow: '#ffd700',
        brightBlue: '#87ceeb',
        brightMagenta: '#dda0dd',
        brightCyan: '#87ceeb',
        brightWhite: '#ffffff',
      },
      matrix: {
        background: '#000000', // Pure black matrix
        foreground: '#00ff00', // Matrix green
        cursor: '#39ff14', // Bright matrix green cursor
        selection: '#003300', // Dark green selection
        black: '#000000',
        red: '#ff0000', // Error red
        green: '#00ff00', // Matrix green
        yellow: '#33ff33', // Light green
        blue: '#0066ff', // Blue accent
        magenta: '#66ff66', // Light matrix green
        cyan: '#00ffcc', // Cyan accent
        white: '#ccffcc',
        brightBlack: '#006600',
        brightRed: '#ff3333',
        brightGreen: '#33ff33',
        brightYellow: '#66ff66',
        brightBlue: '#3366ff',
        brightMagenta: '#99ff99',
        brightCyan: '#66ffcc',
        brightWhite: '#ffffff',
      },
      website: {
        background: '#0D1F2D', // Dark navy background
        foreground: '#A1F0E2', // Light teal text
        cursor: '#1DE9B6', // Teal cursor
        selection: '#1DE9B6', // Teal selection with opacity
        black: '#0D1F2D',
        red: '#FF2E88', // Hot pink for errors
        green: '#1DE9B6', // Teal for success
        yellow: '#A1F0E2', // Light teal for warnings
        blue: '#1DE9B6', // Teal for info
        magenta: '#FF2E88', // Hot pink for highlights
        cyan: '#A1F0E2', // Light teal for accents
        white: '#ffffff',
        brightBlack: '#1a2f42',
        brightRed: '#ff4499',
        brightGreen: '#2ae6c7',
        brightYellow: '#b3f3e7',
        brightBlue: '#2ae6c7',
        brightMagenta: '#ff6bb3',
        brightCyan: '#c9f5ed',
        brightWhite: '#ffffff',
      },
    };
    this.loadTheme();
  }

  loadTheme() {
    const saved = localStorage.getItem('rinawarp-terminal-theme');
    if (saved && this.themes[saved]) {
      this.currentTheme = saved;
    }
    // Apply the theme immediately on load
    this.applyTheme(this.currentTheme);
  }

  setTheme(themeName) {
    if (this.themes[themeName]) {
      this.currentTheme = themeName;
      localStorage.setItem('rinawarp-terminal-theme', themeName);
      this.applyTheme(themeName);
      return true;
    }
    return false;
  }

  applyTheme(themeName) {
    // Apply theme to body and terminal
    document.body.className = `theme-${themeName}`;

    // Add special effects for mermaid theme
    if (themeName === 'mermaid') {
      document.body.style.backgroundAttachment = 'fixed';
      console.log('🧜‍♀️ Mermaid theme activated with special effects!');
    } else {
      document.body.style.backgroundAttachment = 'initial';
    }

    // Update any existing terminals
    const terminalManager = window.terminalManager;
    if (terminalManager && terminalManager.terminal) {
      terminalManager.terminal.options.theme = this.themes[themeName];
      terminalManager.terminal.refresh(0, terminalManager.terminal.rows - 1);
    }
  }

  getCurrentTheme() {
    return this.themes[this.currentTheme];
  }

  getAvailableThemes() {
    return Object.keys(this.themes);
  }
}

// Plugin System
class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
    this.init();
  }

  init() {
    // Register built-in plugins
    this.registerPlugin('git-integration', new GitIntegrationPlugin());
    this.registerPlugin('advanced-git', new AdvancedGitPlugin());
    this.registerPlugin('ai-assistant', new AIAssistantPlugin());
  }

  registerPlugin(name, plugin) {
    this.plugins.set(name, plugin);
    if (plugin.hooks) {
      Object.keys(plugin.hooks).forEach(hookName => {
        if (!this.hooks.has(hookName)) {
          this.hooks.set(hookName, []);
        }
        this.hooks.get(hookName).push(plugin.hooks[hookName]);
      });
    }
  }

  async executeHook(hookName, ...args) {
    const hooks = this.hooks.get(hookName) || [];
    const results = [];
    for (const hook of hooks) {
      try {
        const result = await hook(...args);
        results.push(result);
      } catch (error) {
        console.error(`Plugin hook ${hookName} failed:`, error);
      }
    }
    return results;
  }

  getPlugin(name) {
    return this.plugins.get(name);
  }
}

// Advanced Git Workflows Plugin
class AdvancedGitPlugin {
  constructor() {
    this.hooks = {
      'terminal-created': this.onTerminalCreated.bind(this),
      'directory-changed': this.onDirectoryChanged.bind(this),
      'command-executed': this.onCommandExecuted.bind(this),
    };
    this.gitStatus = new Map();
    this.branches = new Map();
    this.remotes = new Map();
  }

  async onTerminalCreated(terminalData) {
    await this.updateGitInfo(terminalData);
    this.setupGitWorkflowCommands(terminalData);
  }

  async onDirectoryChanged(terminalData, directory) {
    await this.updateGitInfo(terminalData, directory);
  }

  async onCommandExecuted(terminalData, command) {
    if (command.startsWith('git')) {
      // Refresh git status after git commands
      setTimeout(() => this.updateGitInfo(terminalData), 500);

      // Handle specific git workflows
      if (command.includes('commit')) {
        this.handleCommitWorkflow(terminalData, command);
      } else if (command.includes('push')) {
        this.handlePushWorkflow(terminalData, command);
      } else if (command.includes('merge')) {
        this.handleMergeWorkflow(terminalData, command);
      }
    }
  }

  setupGitWorkflowCommands(terminalData) {
    const api = window.terminalManager?.pluginAPI;
    if (!api) return;

    // Add Git workflow commands
    api.addCommand('git-quick-commit', message => {
      const commands = ['git add .', `git commit -m "${message || 'Quick commit'}"`, 'git push'];
      this.executeGitWorkflow(terminalData.terminalId, commands);
    });

    api.addCommand('git-feature-branch', branchName => {
      const commands = [
        'git pull origin main',
        `git checkout -b feature/${branchName}`,
        `git push -u origin feature/${branchName}`,
      ];
      this.executeGitWorkflow(terminalData.terminalId, commands);
    });

    api.addCommand('git-hotfix', version => {
      const commands = [
        'git checkout main',
        'git pull origin main',
        `git checkout -b hotfix/${version}`,
        `git push -u origin hotfix/${version}`,
      ];
      this.executeGitWorkflow(terminalData.terminalId, commands);
    });

    // Add status bar items for Git workflows
    this.addGitStatusBar(api);
  }

  addGitStatusBar(api) {
    // Git workflow buttons
    api.addStatusBarItem(
      'git-controls',
      `
            <button onclick="window.terminalManager.pluginAPI.showNotification('Quick commit workflow started')" 
                    title="Quick Commit" style="background:none;border:1px solid #51cf66;color:#51cf66;padding:2px 6px;border-radius:3px;margin:0 2px;cursor:pointer;">
                📤 Push
            </button>
            <button onclick="window.terminalManager.pluginAPI.showNotification('Feature branch workflow started')" 
                    title="New Feature Branch" style="background:none;border:1px solid #74c0fc;color:#74c0fc;padding:2px 6px;border-radius:3px;margin:0 2px;cursor:pointer;">
                🌿 Branch
            </button>
        `,
      'left'
    );
  }

  async executeGitWorkflow(terminalId, commands) {
    const api = window.terminalManager?.pluginAPI;
    if (!api) return;

    for (const command of commands) {
      api.executeCommand(terminalId, command);
      api.showNotification(`Executing: ${command}`, 'info', 2000);
      await this.delay(1000); // Wait between commands
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async handleCommitWorkflow(terminalData, command) {
    const api = window.terminalManager?.pluginAPI;
    if (api && command.includes('-m')) {
      api.showNotification('Commit created successfully! 🎉', 'success');
    }
  }

  async handlePushWorkflow() {
    const api = window.terminalManager?.pluginAPI;
    if (api) {
      api.showNotification('Push completed! 🚀', 'success');
    }
  }

  async handleMergeWorkflow() {
    const api = window.terminalManager?.pluginAPI;
    if (api) {
      api.showNotification('Merge workflow completed! 🔀', 'success');
    }
  }

  async updateGitInfo(terminalData, directory = process.cwd()) {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // Get comprehensive git status
      const [branchInfo, statusInfo, remoteInfo] = await Promise.allSettled([
        this.getBranchInfo(execAsync, directory),
        this.getStatusInfo(execAsync, directory),
        this.getRemoteInfo(execAsync, directory),
      ]);

      // Update UI with git information
      this.updateGitUI(branchInfo.value, statusInfo.value, remoteInfo.value);
    } catch (error) {
      console.log('Git integration error:', error.message);
    }
  }

  async getBranchInfo(execAsync, directory) {
    try {
      const { stdout: branch } = await execAsync('git branch --show-current', { cwd: directory });
      const { stdout: allBranches } = await execAsync('git branch -a', { cwd: directory });
      return {
        current: branch.trim(),
        all: allBranches
          .split('\n')
          .map(b => b.trim().replace('* ', ''))
          .filter(Boolean),
      };
    } catch (error) {
      return null;
    }
  }

  async getStatusInfo(execAsync, directory) {
    try {
      const { stdout: status } = await execAsync('git status --porcelain', { cwd: directory });
      const { stdout: ahead } = await execAsync('git rev-list --count @{u}..HEAD', {
        cwd: directory,
      }).catch(() => ({ stdout: '0' }));
      const { stdout: behind } = await execAsync('git rev-list --count HEAD..@{u}', {
        cwd: directory,
      }).catch(() => ({ stdout: '0' }));

      return {
        hasChanges: status.trim().length > 0,
        ahead: parseInt(ahead.trim()) || 0,
        behind: parseInt(behind.trim()) || 0,
        files: status.split('\n').filter(Boolean),
      };
    } catch (error) {
      return null;
    }
  }

  async getRemoteInfo(execAsync, directory) {
    try {
      const { stdout: remotes } = await execAsync('git remote -v', { cwd: directory });
      return {
        remotes: remotes.split('\n').filter(Boolean),
      };
    } catch (error) {
      return null;
    }
  }

  updateGitUI(branchInfo, statusInfo, remoteInfo) {
    const branchElement = document.getElementById('branch-info');
    if (!branchElement) return;

    if (branchInfo?.current) {
      let branchText = `⎇ ${branchInfo.current}`;

      // Add ahead/behind indicators
      if (statusInfo) {
        if (statusInfo.ahead > 0) branchText += ` ↑${statusInfo.ahead}`;
        if (statusInfo.behind > 0) branchText += ` ↓${statusInfo.behind}`;
      }

      branchElement.textContent = branchText;

      // Color coding
      if (statusInfo?.hasChanges) {
        branchElement.style.color = '#ffd93d'; // Yellow for changes
      } else if (statusInfo?.ahead > 0) {
        branchElement.style.color = '#ff8c42'; // Orange for unpushed
      } else {
        branchElement.style.color = '#51cf66'; // Green for clean
      }
    } else {
      branchElement.textContent = '';
    }
  }
}

// Legacy Git Integration Plugin (for backward compatibility)
class GitIntegrationPlugin {
  constructor() {
    this.hooks = {
      'terminal-created': this.onTerminalCreated.bind(this),
      'directory-changed': this.onDirectoryChanged.bind(this),
    };
  }

  async onTerminalCreated(terminalData) {
    // Setup git status monitoring
    this.updateGitInfo(terminalData);
  }

  async onDirectoryChanged(terminalData, directory) {
    this.updateGitInfo(terminalData, directory);
  }

  async updateGitInfo(terminalData, directory = process.cwd()) {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      // Get git branch
      try {
        const { stdout: branch } = await execAsync('git branch --show-current', { cwd: directory });
        const branchName = branch.trim();
        if (branchName) {
          document.getElementById('branch-info').textContent = `⎇ ${branchName}`;
        } else {
          document.getElementById('branch-info').textContent = '';
        }
      } catch (error) {
        document.getElementById('branch-info').textContent = '';
      }

      // Get git status (check for changes)
      try {
        const { stdout: status } = await execAsync('git status --porcelain', { cwd: directory });
        const hasChanges = status.trim().length > 0;
        const branchElement = document.getElementById('branch-info');
        if (hasChanges && branchElement.textContent) {
          branchElement.style.color = '#ffd93d'; // Yellow for changes
        } else if (branchElement.textContent) {
          branchElement.style.color = '#51cf66'; // Green for clean
        }
      } catch (error) {
        // Not a git repository or other error
      }
    } catch (error) {
      console.log('Git integration error:', error.message);
    }
  }
}

// AI Assistant Plugin (Mock implementation)
class AIAssistantPlugin {
  constructor() {
    this.hooks = {
      'command-suggestion': this.onCommandSuggestion.bind(this),
    };
  }

  async onCommandSuggestion(input) {
    // Try real AI API first, fallback to mock suggestions
    try {
      if (
        window.terminalManager &&
        window.terminalManager.settings.realAI &&
        window.terminalManager.settings.aiApiKey
      ) {
        const aiSuggestions = await this.getAISuggestions(input);
        if (aiSuggestions.length > 0) {
          return aiSuggestions;
        }
      }
    } catch (error) {
      console.log('AI API failed, using fallback:', error.message);
    }

    // Fallback to mock suggestions
    const suggestions = [];

    if (input.includes('git')) {
      suggestions.push(
        'git status',
        'git add .',
        'git commit -m ""',
        'git push',
        'git pull',
        'git branch',
        'git checkout',
        'git merge'
      );
    } else if (input.includes('npm')) {
      suggestions.push(
        'npm install',
        'npm start',
        'npm run build',
        'npm test',
        'npm run dev',
        'npm update',
        'npm audit'
      );
    } else if (input.includes('docker')) {
      suggestions.push(
        'docker ps',
        'docker images',
        'docker build .',
        'docker run',
        'docker exec',
        'docker logs',
        'docker stop'
      );
    } else if (input.includes('kubectl')) {
      suggestions.push(
        'kubectl get pods',
        'kubectl get services',
        'kubectl apply -f',
        'kubectl describe',
        'kubectl logs'
      );
    }

    return suggestions.filter(s => s.startsWith(input));
  }

  async getAISuggestions(input) {
    const manager = window.terminalManager;
    const apiKey = manager.settings.aiApiKey;
    const apiProvider = manager.settings.aiProvider || 'openai';

    // Get current directory and git context for better suggestions
    const context = {
      input: input,
      currentDir: process.cwd(),
      gitBranch: document.getElementById('branch-info').textContent,
      recentCommands: manager.historyManager.history.slice(-5),
      platform: manager.platform,
    };

    if (apiProvider === 'openai') {
      return await this.getOpenAISuggestions(input, context, apiKey);
    } else if (apiProvider === 'anthropic') {
      return await this.getAnthropicSuggestions(input, context, apiKey);
    } else if (apiProvider === 'local') {
      return await this.getLocalAISuggestions(input, context);
    }

    return [];
  }

  async getOpenAISuggestions(input, context, apiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a terminal command assistant. Given a partial command and context, suggest 3-5 most relevant complete commands. Return only the commands, one per line, no explanations.',
          },
          {
            role: 'user',
            content: `Partial command: "${input}"\nContext: ${JSON.stringify(context)}`,
          },
        ],
        max_tokens: 100,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    const suggestions = data.choices[0].message.content.split('\n').filter(s => s.trim());
    return suggestions.slice(0, 5);
  }

  async getAnthropicSuggestions(input, context, apiKey) {
    // Anthropic Claude API integration
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `Complete this terminal command: "${input}". Context: ${JSON.stringify(context)}. Return 3-5 suggestions, one per line.`,
          },
        ],
      }),
    });

    const data = await response.json();
    const suggestions = data.content[0].text.split('\n').filter(s => s.trim());
    return suggestions.slice(0, 5);
  }

  async getLocalAISuggestions(input, context) {
    // Local AI model integration (e.g., Ollama)
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'codellama:7b',
          prompt: `Complete this terminal command: "${input}". Context: ${JSON.stringify(context)}. Return 3-5 suggestions:`,
          stream: false,
        }),
      });

      const data = await response.json();
      const suggestions = data.response
        .split('\n')
        .filter(s => s.trim() && s.startsWith(input.split(' ')[0]));
      return suggestions.slice(0, 5);
    } catch (error) {
      return [];
    }
  }
}

// Session Management System
class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.currentSession = null;
    this.autoSaveInterval = null;
    this.sessionHistory = [];
    this.loadSessions();
  }

  loadSessions() {
    try {
      const saved = localStorage.getItem('rinawarp-terminal-sessions');
      if (saved) {
        const data = JSON.parse(saved);
        this.sessions = new Map(data.sessions || []);
        this.sessionHistory = data.history || [];
      }
    } catch (error) {
      console.log('Failed to load sessions:', error.message);
    }
  }

  saveSessions() {
    try {
      const data = {
        sessions: Array.from(this.sessions.entries()),
        history: this.sessionHistory,
      };
      localStorage.setItem('rinawarp-terminal-sessions', JSON.stringify(data));
    } catch (error) {
      console.log('Failed to save sessions:', error.message);
    }
  }

  createSession(name, description = '') {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      id: sessionId,
      name: name || `Session ${this.sessions.size + 1}`,
      description,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      terminals: [],
      workingDirectories: new Map(),
      commandHistory: [],
      layout: 'default',
    };

    this.sessions.set(sessionId, session);
    this.saveSessions();
    return sessionId;
  }

  getCurrentSession() {
    if (!this.currentSession) {
      this.currentSession = this.createSession('Default Session', 'Automatically created session');
    }
    return this.sessions.get(this.currentSession);
  }

  updateCurrentSession() {
    const session = this.getCurrentSession();
    if (!session) return;

    const manager = window.terminalManager;
    if (!manager) return;

    // Update session with current state
    session.lastModified = new Date().toISOString();
    session.terminals = Array.from(manager.terminals.keys());
    session.workingDirectories = new Map();

    // Capture current working directories
    manager.terminals.forEach((terminalData, terminalId) => {
      try {
        session.workingDirectories.set(terminalId, process.cwd());
      } catch (error) {
        console.log('Could not get working directory for terminal', terminalId);
      }
    });

    // Update command history
    session.commandHistory = manager.historyManager.history.slice(-50); // Keep last 50 commands

    this.sessions.set(session.id, session);
    this.saveSessions();
  }

  restoreSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const manager = window.terminalManager;
    if (!manager) return false;

    // Clear current terminals
    manager.terminals.forEach((_, terminalId) => {
      if (terminalId !== 1) {
        // Keep at least one terminal
        manager.closeTab(terminalId);
      }
    });

    // Restore command history
    if (session.commandHistory) {
      manager.historyManager.history = [...session.commandHistory];
      manager.historyManager.saveHistory();
    }

    // Restore working directories and create terminals
    session.workingDirectories.forEach((directory, terminalId) => {
      if (terminalId !== 1) {
        manager.createNewTab();
      }
      // Note: Changing directory would require shell command execution
    });

    this.currentSession = sessionId;
    this.saveSessions();

    return true;
  }

  deleteSession(sessionId) {
    if (this.currentSession === sessionId) {
      this.currentSession = null;
    }
    this.sessions.delete(sessionId);
    this.saveSessions();
  }

  exportSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      session: session,
    };
  }

  importSession(sessionData) {
    if (!sessionData.session) return false;

    const session = sessionData.session;
    session.id = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    session.name = `Imported: ${session.name}`;

    this.sessions.set(session.id, session);
    this.saveSessions();
    return session.id;
  }

  startAutoSave(interval = 30000) {
    // 30 seconds
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(() => {
      this.updateCurrentSession();
    }, interval);
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }
}

// Cloud Sync Management System
class CloudSyncManager {
  constructor() {
    this.providers = {
      github: new GitHubSyncProvider(),
      dropbox: new DropboxSyncProvider(),
      custom: new CustomSyncProvider(),
    };
    this.currentProvider = null;
    this.syncStatus = 'disconnected';
    this.lastSync = null;
    this.autoSyncInterval = null;
  }

  async connect(provider, credentials) {
    if (!this.providers[provider]) {
      throw new Error(`Unknown sync provider: ${provider}`);
    }

    try {
      await this.providers[provider].connect(credentials);
      this.currentProvider = provider;
      this.syncStatus = 'connected';
      return true;
    } catch (error) {
      this.syncStatus = 'error';
      throw error;
    }
  }

  async syncUp() {
    if (!this.currentProvider || this.syncStatus !== 'connected') {
      throw new Error('Not connected to sync provider');
    }

    const manager = window.terminalManager;
    if (!manager) throw new Error('Terminal manager not available');

    const syncData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      settings: manager.settings,
      sessions: Array.from(manager.sessionManager.sessions.entries()),
      commandHistory: manager.historyManager.history,
      themes: manager.themeManager.themes,
      plugins: this.getInstalledPlugins(),
    };

    try {
      await this.providers[this.currentProvider].upload(syncData);
      this.lastSync = new Date().toISOString();
      this.syncStatus = 'synced';
      return true;
    } catch (error) {
      this.syncStatus = 'error';
      throw error;
    }
  }

  async syncDown() {
    if (!this.currentProvider || this.syncStatus !== 'connected') {
      throw new Error('Not connected to sync provider');
    }

    try {
      const syncData = await this.providers[this.currentProvider].download();
      if (!syncData) return false;

      const manager = window.terminalManager;
      if (!manager) return false;

      // Apply synced data
      if (syncData.settings) {
        manager.settings = { ...manager.settings, ...syncData.settings };
        manager.saveSettings();
      }

      if (syncData.sessions) {
        manager.sessionManager.sessions = new Map(syncData.sessions);
        manager.sessionManager.saveSessions();
      }

      if (syncData.commandHistory) {
        manager.historyManager.history = syncData.commandHistory;
        manager.historyManager.saveHistory();
      }

      if (syncData.themes) {
        manager.themeManager.themes = { ...manager.themeManager.themes, ...syncData.themes };
      }

      this.lastSync = new Date().toISOString();
      this.syncStatus = 'synced';
      return true;
    } catch (error) {
      this.syncStatus = 'error';
      throw error;
    }
  }

  startAutoSync(interval = 300000) {
    // 5 minutes
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    this.autoSyncInterval = setInterval(async () => {
      try {
        await this.syncUp();
      } catch (error) {
        console.log('Auto sync failed:', error.message);
      }
    }, interval);
  }

  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  getInstalledPlugins() {
    const manager = window.terminalManager;
    if (!manager) return [];

    return Array.from(manager.pluginManager.plugins.keys());
  }
}

// GitHub Sync Provider
class GitHubSyncProvider {
  constructor() {
    this.token = null;
    this.repo = null;
    this.branch = 'main';
    this.filename = 'rinawarp-terminal-sync.json';
  }

  async connect(credentials) {
    this.token = credentials.token;
    this.repo = credentials.repo; // format: "username/repo-name"
    this.branch = credentials.branch || 'main';

    // Test connection
    const response = await fetch(`https://api.github.com/repos/${this.repo}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to connect to GitHub repository');
    }
  }

  async upload(data) {
    const content = btoa(JSON.stringify(data, null, 2));

    // Check if file exists
    let sha = null;
    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.repo}/contents/${this.filename}?ref=${this.branch}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (response.ok) {
        const fileData = await response.json();
        sha = fileData.sha;
      }
    } catch (error) {
      // File doesn't exist, will create new
    }

    // Create or update file
    const body = {
      message: `Update RinaWarp Terminal sync data - ${new Date().toISOString()}`,
      content: content,
      branch: this.branch,
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(
      `https://api.github.com/repos/${this.repo}/contents/${this.filename}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to upload sync data to GitHub');
    }
  }

  async download() {
    const response = await fetch(
      `https://api.github.com/repos/${this.repo}/contents/${this.filename}?ref=${this.branch}`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null; // File doesn't exist
      }
      throw new Error('Failed to download sync data from GitHub');
    }

    const fileData = await response.json();
    const content = atob(fileData.content);
    return JSON.parse(content);
  }
}

// Dropbox Sync Provider (simplified implementation)
class DropboxSyncProvider {
  constructor() {
    this.accessToken = null;
    this.filename = '/rinawarp-terminal-sync.json';
  }

  async connect(credentials) {
    this.accessToken = credentials.accessToken;

    // Test connection
    const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to connect to Dropbox');
    }
  }

  async upload(data) {
    const content = JSON.stringify(data, null, 2);

    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({
          path: this.filename,
          mode: 'overwrite',
        }),
        'Content-Type': 'application/octet-stream',
      },
      body: content,
    });

    if (!response.ok) {
      throw new Error('Failed to upload sync data to Dropbox');
    }
  }

  async download() {
    const response = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({
          path: this.filename,
        }),
      },
    });

    if (!response.ok) {
      if (response.status === 409) {
        return null; // File doesn't exist
      }
      throw new Error('Failed to download sync data from Dropbox');
    }

    const content = await response.text();
    return JSON.parse(content);
  }
}

// Custom Sync Provider (for custom endpoints)
class CustomSyncProvider {
  constructor() {
    this.endpoint = null;
    this.headers = {};
  }

  async connect(credentials) {
    this.endpoint = credentials.endpoint;
    this.headers = credentials.headers || {};

    // Test connection with a GET request
    const response = await fetch(this.endpoint, {
      method: 'GET',
      headers: this.headers,
    });

    // Accept any response that doesn't indicate a connection error
    if (response.status >= 500) {
      throw new Error('Failed to connect to custom sync endpoint');
    }
  }

  async upload(data) {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to upload sync data to custom endpoint');
    }
  }

  async download() {
    const response = await fetch(this.endpoint, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No data available
      }
      throw new Error('Failed to download sync data from custom endpoint');
    }

    return await response.json();
  }
}

// Import the AI Context Engine from separate module
// const { AdvancedAIContextEngine } = require('./ai-context-engine.js');

// Specialized AI Components
class CodeReviewAI {
  constructor(engine) {
    this.engine = engine;
  }

  async analyzeCode(content, context) {
    // Implement code review logic
    return {
      issues: [],
      suggestions: [],
      score: 85,
      complexity: 'medium',
    };
  }
}

class PredictiveCommandAI {
  constructor(engine) {
    this.engine = engine;
  }

  async generatePredictions(command, userPattern, context) {
    // Implement prediction logic based on user patterns
    return [
      { command: 'git add .', confidence: 0.9, reason: 'Usually follows git status' },
      { command: 'npm test', confidence: 0.7, reason: 'Common after code changes' },
    ];
  }
}

class ErrorAnalysisAI {
  constructor(engine) {
    this.engine = engine;
  }

  async analyzeError(errorData) {
    // Implement error analysis logic
    return {
      type: 'dependency',
      description: 'Missing dependency error',
      rootCause: 'Package not installed',
      suggestions: [
        {
          command: 'npm install',
          description: 'Install missing dependencies',
          confidence: 90,
          difficulty: 'easy',
        },
      ],
      documentation: [],
      preventionTips: ['Always run npm install after cloning'],
    };
  }
}

class SecurityAnalysisAI {
  constructor(engine) {
    this.engine = engine;
  }

  async analyzeSafety(command, context) {
    // Check against security rules
    for (const [name, rule] of this.engine.securityRules.entries()) {
      if (rule.pattern.test(command)) {
        return {
          riskLevel: rule.risk,
          risks: [rule.message],
          alternatives: rule.alternatives,
        };
      }
    }

    return { riskLevel: 'low', risks: [], alternatives: [] };
  }
}

class DocumentationAI {
  constructor(engine) {
    this.engine = engine;
  }

  async generateDocs(command, context) {
    // Generate smart documentation
    return {
      explanation: 'This command performs...',
      parameters: [],
      examples: [],
      related: [],
      tips: [],
    };
  }
}

// Enhanced Plugin API
class PluginAPI {
  constructor(terminalManager) {
    this.terminalManager = terminalManager;
    this.customCommands = new Map();
    this.statusBarItems = new Map();
    this.contextMenuItems = new Map();
    this.shortcuts = new Map();
    this.eventListeners = new Map();
  }

  // Command Registration
  addCommand(name, handler, description = '') {
    this.customCommands.set(name, {
      handler,
      description,
      created: new Date().toISOString(),
    });
  }

  removeCommand(name) {
    this.customCommands.delete(name);
  }

  executeCommand(terminalId, command) {
    const terminalData = this.terminalManager.terminals.get(terminalId);
    if (terminalData) {
      terminalData.terminal.write(command + '\r');
      try {
        terminalData.shellProcess.stdin.write(command + '\n');
      } catch (error) {
        console.error('Failed to execute command:', error);
      }
    }
  }

  // Status Bar API
  addStatusBarItem(id, content, side = 'right') {
    const statusBar = document.querySelector(`.status-${side}`);
    if (!statusBar) return;

    const item = document.createElement('span');
    item.className = 'status-item';
    item.id = `status-${id}`;
    item.innerHTML = content;

    statusBar.appendChild(item);
    this.statusBarItems.set(id, { element: item, side });

    return item;
  }

  updateStatusBarItem(id, content) {
    const item = this.statusBarItems.get(id);
    if (item) {
      item.element.innerHTML = content;
    }
  }

  removeStatusBarItem(id) {
    const item = this.statusBarItems.get(id);
    if (item) {
      item.element.remove();
      this.statusBarItems.delete(id);
    }
  }

  // Notification API
  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Style the notification
    notification.style.cssText = `
            position: fixed;
            top: 50px;
            right: 20px;
            background: ${type === 'error' ? '#f92672' : type === 'success' ? '#51cf66' : '#74c0fc'};
            color: white;
            padding: 12px 16px;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-size: 14px;
            max-width: 300px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 10);

    // Auto remove
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  }

  // Context Menu API
  addContextMenuItem(id, label, handler, icon = '') {
    this.contextMenuItems.set(id, {
      label,
      handler,
      icon,
    });
  }

  removeContextMenuItem(id) {
    this.contextMenuItems.delete(id);
  }

  // Keyboard Shortcuts API
  addShortcut(key, handler, description = '') {
    this.shortcuts.set(key, {
      handler,
      description,
    });

    // Add event listener
    const eventHandler = e => {
      if (this.matchesShortcut(e, key)) {
        e.preventDefault();
        handler(e);
      }
    };

    document.addEventListener('keydown', eventHandler);
    this.eventListeners.set(key, eventHandler);
  }

  removeShortcut(key) {
    const eventHandler = this.eventListeners.get(key);
    if (eventHandler) {
      document.removeEventListener('keydown', eventHandler);
      this.eventListeners.delete(key);
    }
    this.shortcuts.delete(key);
  }

  matchesShortcut(event, shortcut) {
    const keys = shortcut.toLowerCase().split('+');
    const eventKey = event.key.toLowerCase();

    const hasCtrl = keys.includes('ctrl') ? event.ctrlKey : !event.ctrlKey;
    const hasShift = keys.includes('shift') ? event.shiftKey : !event.shiftKey;
    const hasAlt = keys.includes('alt') ? event.altKey : !event.altKey;

    const mainKey = keys[keys.length - 1];

    return hasCtrl && hasShift && hasAlt && eventKey === mainKey;
  }

  // Terminal API
  getActiveTerminal() {
    return this.terminalManager.terminals.get(this.terminalManager.activeTerminalId);
  }

  getAllTerminals() {
    return Array.from(this.terminalManager.terminals.values());
  }

  writeToTerminal(terminalId, text) {
    const terminalData = this.terminalManager.terminals.get(terminalId);
    if (terminalData) {
      terminalData.terminal.write(text);
    }
  }

  // Settings API
  getSetting(key) {
    return this.terminalManager.settings[key];
  }

  setSetting(key, value) {
    this.terminalManager.settings[key] = value;
    this.terminalManager.saveSettings();
  }

  // Theme API
  getCurrentTheme() {
    return this.terminalManager.themeManager.getCurrentTheme();
  }

  setTheme(themeName) {
    return this.terminalManager.themeManager.setTheme(themeName);
  }

  addCustomTheme(name, themeData) {
    this.terminalManager.themeManager.themes[name] = themeData;
  }

  // File System API (with security considerations)
  async readFile(filepath) {
    try {
      const fs = require('fs').promises;
      return await fs.readFile(filepath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  async writeFile(filepath, content) {
    try {
      const fs = require('fs').promises;
      await fs.writeFile(filepath, content, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  // Event Emission
  emit(eventName, ...args) {
    return this.terminalManager.pluginManager.executeHook(eventName, ...args);
  }

  // Storage API
  setData(key, value) {
    try {
      localStorage.setItem(`plugin-${key}`, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to store data:', error);
    }
  }

  getData(key) {
    try {
      const data = localStorage.getItem(`plugin-${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to retrieve data:', error);
      return null;
    }
  }

  removeData(key) {
    try {
      localStorage.removeItem(`plugin-${key}`);
    } catch (error) {
      console.error('Failed to remove data:', error);
    }
  }

  // HTTP API (for plugin communication)
  async fetch(url, options = {}) {
    try {
      return await fetch(url, options);
    } catch (error) {
      throw new Error(`HTTP request failed: ${error.message}`);
    }
  }

  // UI Helpers
  createModal(title, content, options = {}) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-modal">×</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
            </div>
        `;

    // Add close functionality
    const closeBtn = modal.querySelector('.close-modal');
    const closeModal = () => {
      modal.classList.add('hidden');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300);
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });

    document.body.appendChild(modal);

    // Show modal
    setTimeout(() => modal.classList.remove('hidden'), 10);

    return modal;
  }

  // Utility Functions
  debounce(func, wait) {
    return this.terminalManager.debounce(func, wait);
  }

  // Session API
  getCurrentSession() {
    return this.terminalManager.sessionManager.getCurrentSession();
  }

  createSession(name, description) {
    return this.terminalManager.sessionManager.createSession(name, description);
  }

  // Cloud Sync API
  async syncToCloud() {
    try {
      await this.terminalManager.cloudSyncManager.syncUp();
      this.showNotification('Data synced to cloud successfully!', 'success');
    } catch (error) {
      this.showNotification(`Sync failed: ${error.message}`, 'error');
    }
  }

  async syncFromCloud() {
    try {
      await this.terminalManager.cloudSyncManager.syncDown();
      this.showNotification('Data synced from cloud successfully!', 'success');
    } catch (error) {
      this.showNotification(`Sync failed: ${error.message}`, 'error');
    }
  }
}

class TerminalManager {
  constructor() {
    this.terminals = new Map();
    this.activeTerminalId = 1;
    this.nextTerminalId = 2;
    this.splitPanes = new Map(); // Track split panes

    // Initialize managers
    this.historyManager = new CommandHistoryManager();
    this.themeManager = new ThemeManager();
    this.pluginManager = new PluginManager();
    this.sessionManager = new SessionManager();
    this.cloudSyncManager = new CloudSyncManager();
    this.pluginAPI = new PluginAPI(this);

    // Initialize Phase 1 Revolutionary Features
    this.initializePhase1Features();

    // Initialize Performance Monitor
    this.performanceMonitor = null;
    this.aiEngine = null;

    // Command input tracking
    this.commandBuffers = new Map(); // Track current input for each terminal
    this.suggestionBoxes = new Map(); // Track suggestion boxes

    // Settings
    this.settings = {
      theme: 'dark',
      fontSize: 14,
      commandSuggestions: true,
      aiAssistance: true,
      realAI: false,
      aiProvider: 'openai', // openai, anthropic, local
      aiApiKey: '',
      cloudSync: false,
      syncProvider: 'github',
      autoSaveSession: true,
      autoErrorAnalysis: false,
    };

    // Load settings from storage
    this.loadSettings();

    // Initialize the terminal manager
    this.init();

    // Debounced window resize
    const debouncedResize = this.debounce(() => {
      this.resizeActiveTerminal();
    }, 100);

    window.addEventListener('resize', debouncedResize);
  }

  async initializePhase1Features() {
    try {
      console.log('🚀 Initializing Revolutionary Features...');

      // Load all advanced features dynamically
      const featuresLoaded = await loadAdvancedFeatures();

      if (featuresLoaded) {
        // Initialize Advanced AI Context Engine
        if (AdvancedAIContextEngine) {
          this.aiEngine = new AdvancedAIContextEngine(this);
          console.log('✅ Advanced AI Context Engine initialized');
        }

        // Initialize Performance Monitoring Dashboard
        if (PerformanceMonitoringDashboard) {
          this.performanceMonitor = new PerformanceMonitoringDashboard();
          console.log('✅ Performance Monitoring Dashboard initialized');

          // Add performance dashboard button to status bar
          this.pluginAPI.addStatusBarItem(
            'performance-dashboard',
            `
                        <button onclick="window.terminalManager.showPerformanceDashboard()" 
                                title="Performance Dashboard (Ctrl+Shift+P)" 
                                style="background:none;border:1px solid #e74c3c;color:#e74c3c;padding:2px 8px;border-radius:3px;margin:0 2px;cursor:pointer;font-size:12px;">
                            🚀 Performance
                        </button>
                    `,
            'right'
          );
        }

        // Initialize Workflow Automation Engine
        if (WorkflowAutomationEngine) {
          this.workflowEngine = new WorkflowAutomationEngine();
          console.log('✅ Workflow Automation Engine initialized');

          // Add workflow automation button to status bar
          this.pluginAPI.addStatusBarItem(
            'workflow-automation',
            `
                        <button onclick="window.terminalManager.showWorkflowManager()" 
                                title="Workflow Automation (Ctrl+Shift+W)" 
                                style="background:none;border:1px solid #f39c12;color:#f39c12;padding:2px 8px;border-radius:3px;margin:0 2px;cursor:pointer;font-size:12px;">
                            ⚡ Workflows
                        </button>
                    `,
            'right'
          );
        }

        // Initialize Enhanced Security Engine
        if (EnhancedSecurityEngine) {
          this.securityEngine = new EnhancedSecurityEngine();
          console.log('✅ Enhanced Security Engine initialized');

          // Add security dashboard button to status bar
          this.pluginAPI.addStatusBarItem(
            'security-dashboard',
            `
                        <button onclick="window.terminalManager.showSecurityDashboard()" 
                                title="Security Dashboard (Ctrl+Shift+S)" 
                                style="background:none;border:1px solid #e67e22;color:#e67e22;padding:2px 8px;border-radius:3px;margin:0 2px;cursor:pointer;font-size:12px;">
                            🔒 Security
                        </button>
                    `,
            'right'
          );
        }

        // Initialize Next-Gen UI Engine
        if (NextGenUIEngine) {
          this.nextGenUI = new NextGenUIEngine();
          await this.nextGenUI.initialize();
          console.log('✅ Next-Gen UI Engine initialized');

          // Add 3D/AR mode button to status bar
          this.pluginAPI.addStatusBarItem(
            'next-gen-ui',
            `
                        <button onclick="window.terminalManager.toggleAdvancedUI()" 
                                title="Advanced UI Features (Ctrl+Shift+U)" 
                                style="background:none;border:1px solid #8e44ad;color:#8e44ad;padding:2px 8px;border-radius:3px;margin:0 2px;cursor:pointer;font-size:12px;">
                            🎨 UI
                        </button>
                    `,
            'right'
          );
        }
      }

      // Add AI Features button to status bar
      if (this.aiEngine) {
        this.pluginAPI.addStatusBarItem(
          'ai-features',
          `
                    <button onclick="window.terminalManager.showAIFeatures()" 
                            title="AI Features (Ctrl+Shift+A)" 
                            style="background:none;border:1px solid #9b59b6;color:#9b59b6;padding:2px 8px;border-radius:3px;margin:0 2px;cursor:pointer;font-size:12px;">
                        🤖 AI
                    </button>
                `,
          'right'
        );
      }

      console.log('🎉 Phase 1 Features Successfully Initialized!');

      // Show initialization notification
      setTimeout(() => {
        this.pluginAPI?.showNotification(
          '🚀 Phase 1 Features Loaded: AI Engine + Performance Monitor',
          'success',
          4000
        );
      }, 2000);

      // Show commercial licensing notification after a delay
      setTimeout(() => {
        this.showCommercialWelcome();
      }, 3000);
    } catch (error) {
      console.warn('⚠️ Phase 1 features initialization failed:', error);
      // Graceful fallback - terminal will still work without these features
    }
  }

  // Phase 1 Feature Access Methods
  showPerformanceDashboard() {
    if (this.performanceMonitor) {
      this.performanceMonitor.showDashboard();
    } else {
      this.pluginAPI.showNotification('Performance Monitor not available', 'error');
    }
  }

  showAIFeatures() {
    if (this.aiEngine) {
      this.showAIFeaturesModal();
    } else {
      this.pluginAPI.showNotification('AI Engine not available', 'error');
    }
  }

  showWorkflowManager() {
    if (this.workflowEngine) {
      this.showWorkflowManagerModal();
    } else {
      this.pluginAPI.showNotification('Workflow Engine not available', 'error');
    }
  }

  showSecurityDashboard() {
    if (this.securityEngine) {
      this.securityEngine.createSecurityDashboard();
      const dashboard = document.getElementById('security-dashboard');
      if (dashboard) {
        dashboard.classList.remove('hidden');
      }
    } else {
      this.pluginAPI.showNotification('Security Engine not available', 'error');
    }
  }

  toggleAdvancedUI() {
    if (this.nextGenUI) {
      this.showAdvancedUIModal();
    } else {
      this.pluginAPI.showNotification('Next-Gen UI not available', 'error');
    }
  }

  showAIFeaturesModal() {
    const aiModal = this.pluginAPI.createModal(
      '🤖 Advanced AI Features',
      `
            <div class="ai-features-panel">
                <div class="ai-feature-section">
                    <h4>🎤 Voice Control</h4>
                    <p>Control your terminal with voice commands like "Hey Rina, deploy to production"</p>
                    <button id="toggle-voice-control" class="btn btn-primary">Toggle Voice Control</button>
                </div>
                
                <div class="ai-feature-section">
                    <h4>🔍 Smart Documentation</h4>
                    <p>Get AI-generated documentation for any command</p>
                    <input type="text" id="doc-command" placeholder="Enter command (e.g., git status)" style="width:200px;" />
                    <button id="generate-docs" class="btn btn-secondary">Generate Docs</button>
                </div>
                
                <div class="ai-feature-section">
                    <h4>🛡️ Security Analysis</h4>
                    <p>Analyze commands for security risks before execution</p>
                    <input type="text" id="security-command" placeholder="Enter command to analyze" style="width:200px;" />
                    <button id="analyze-security" class="btn btn-warning">Analyze Security</button>
                </div>
                
                <div class="ai-feature-section">
                    <h4>🔧 Error Analysis</h4>
                    <p>Get AI-powered suggestions when commands fail</p>
                    <label>
                        <input type="checkbox" id="auto-error-analysis" ${this.settings.autoErrorAnalysis ? 'checked' : ''}> 
                        Enable automatic error analysis
                    </label>
                </div>
                
                <div class="ai-feature-section">
                    <h4>⚙️ AI Settings</h4>
                    <div class="ai-settings">
                        <label>AI Provider:</label>
                        <select id="ai-provider" value="${this.settings.aiProvider}">
                            <option value="openai">OpenAI GPT-4</option>
                            <option value="anthropic">Anthropic Claude</option>
                            <option value="local">Local AI (Ollama)</option>
                        </select>
                        
                        <label>API Key:</label>
                        <input type="password" id="ai-api-key" placeholder="Enter API key" value="${this.settings.aiApiKey || ''}" />
                        
                        <button id="save-ai-settings" class="btn btn-success">Save Settings</button>
                    </div>
                </div>
            </div>
        `,
      {
        footer: '<button class="btn btn-secondary close-modal">Close</button>',
      }
    );

    this.setupAIFeaturesHandlers(aiModal);
  }

  setupAIFeaturesHandlers(modal) {
    // Voice control toggle
    modal.querySelector('#toggle-voice-control')?.addEventListener('click', () => {
      if (this.aiEngine?.voiceRecognition) {
        this.aiEngine.toggleVoiceControl();
      } else {
        this.pluginAPI.showNotification('Voice control not available', 'error');
      }
    });

    // Documentation generation
    modal.querySelector('#generate-docs')?.addEventListener('click', async () => {
      const command = modal.querySelector('#doc-command').value.trim();
      if (command && this.aiEngine) {
        await this.aiEngine.generateCommandDocumentation(command);
      }
    });

    // Security analysis
    modal.querySelector('#analyze-security')?.addEventListener('click', async () => {
      const command = modal.querySelector('#security-command').value.trim();
      if (command && this.aiEngine) {
        const analysis = await this.aiEngine.analyzeCommandSafety(command);
        this.pluginAPI.showNotification(
          `Security Risk Level: ${analysis.riskLevel || 'Low'}`,
          analysis.riskLevel === 'critical' ? 'error' : 'info'
        );
      }
    });

    // Auto error analysis toggle
    modal.querySelector('#auto-error-analysis')?.addEventListener('change', e => {
      this.settings.autoErrorAnalysis = e.target.checked;
      this.saveSettings();
    });

    // AI settings save
    modal.querySelector('#save-ai-settings')?.addEventListener('click', () => {
      this.settings.aiProvider = modal.querySelector('#ai-provider').value;
      this.settings.aiApiKey = modal.querySelector('#ai-api-key').value;
      this.saveSettings();
      this.pluginAPI.showNotification('AI settings saved!', 'success');
    });
  }

  showWorkflowManagerModal() {
    const workflowModal = this.pluginAPI.createModal(
      '⚡ Workflow Automation Manager',
      `
            <div class="workflow-manager-panel">
                <div class="workflow-section">
                    <h4>📝 Smart Macro Recording</h4>
                    <p>Record and replay command sequences with intelligent adaptation</p>
                    <div class="macro-controls">
                        <input type="text" id="macro-name" placeholder="Macro name (e.g., 'deploy-workflow')" style="width:200px;" />
                        <button id="start-recording" class="btn btn-primary">Start Recording</button>
                        <button id="stop-recording" class="btn btn-secondary" disabled>Stop Recording</button>
                    </div>
                    <div id="recorded-macros" class="macro-list"></div>
                </div>
                
                <div class="workflow-section">
                    <h4>🔄 Conditional Workflows</h4>
                    <p>Create intelligent workflows with conditions and error handling</p>
                    <div class="workflow-templates">
                        <button class="workflow-template" data-workflow="deploy-production">🚀 Deploy to Production</button>
                        <button class="workflow-template" data-workflow="backup-update">💾 Backup & Update</button>
                        <button class="workflow-template" data-workflow="feature-branch">🌿 Feature Branch</button>
                        <button class="workflow-template" data-workflow="hotfix">🚨 Hotfix Workflow</button>
                    </div>
                </div>
                
                <div class="workflow-section">
                    <h4>🔗 Cross-System Integration</h4>
                    <p>Connect with external services and tools</p>
                    <div class="integration-status">
                        <div class="integration-item">
                            <span class="integration-name">Slack</span>
                            <span class="integration-status">🔴 Disconnected</span>
                            <button class="btn btn-small">Connect</button>
                        </div>
                        <div class="integration-item">
                            <span class="integration-name">GitHub Actions</span>
                            <span class="integration-status">🔴 Disconnected</span>
                            <button class="btn btn-small">Connect</button>
                        </div>
                        <div class="integration-item">
                            <span class="integration-name">Jira</span>
                            <span class="integration-status">🔴 Disconnected</span>
                            <button class="btn btn-small">Connect</button>
                        </div>
                    </div>
                </div>
                
                <div class="workflow-section">
                    <h4>🏪 Workflow Marketplace</h4>
                    <p>Discover and share community workflows</p>
                    <div class="marketplace-actions">
                        <button id="browse-workflows" class="btn btn-secondary">Browse Workflows</button>
                        <button id="publish-workflow" class="btn btn-secondary">Publish Workflow</button>
                    </div>
                </div>
            </div>
        `,
      {
        footer: '<button class="btn btn-secondary close-modal">Close</button>',
      }
    );

    this.setupWorkflowHandlers(workflowModal);
  }

  setupWorkflowHandlers(modal) {
    // Start macro recording
    modal.querySelector('#start-recording')?.addEventListener('click', async () => {
      const name = modal.querySelector('#macro-name').value.trim();
      if (!name) {
        this.pluginAPI.showNotification('Please enter a macro name', 'error');
        return;
      }

      if (this.workflowEngine) {
        try {
          const result = await this.workflowEngine.startMacroRecording(name);
          this.pluginAPI.showNotification(`Started recording macro: ${name}`, 'success');
          modal.querySelector('#start-recording').disabled = true;
          modal.querySelector('#stop-recording').disabled = false;
        } catch (error) {
          this.pluginAPI.showNotification(`Failed to start recording: ${error.message}`, 'error');
        }
      }
    });

    // Workflow template execution
    modal.querySelectorAll('.workflow-template').forEach(btn => {
      btn.addEventListener('click', async () => {
        const workflowType = btn.dataset.workflow;
        if (this.workflowEngine) {
          try {
            const workflows = await this.workflowEngine.discoverWorkflows('deployment');
            this.pluginAPI.showNotification(`Executing ${workflowType} workflow...`, 'info');
            // Execute workflow logic here
          } catch (error) {
            this.pluginAPI.showNotification(`Workflow failed: ${error.message}`, 'error');
          }
        }
      });
    });
  }

  showAdvancedUIModal() {
    const uiModal = this.pluginAPI.createModal(
      '🎨 Next-Gen UI Features',
      `
            <div class="next-gen-ui-panel">
                <div class="ui-feature-section">
                    <h4>🌍 3D Terminal Visualization</h4>
                    <p>Experience your terminal in a revolutionary 3D environment</p>
                    <div class="mode-controls">
                        <button id="enable-3d" class="btn btn-primary">Enable 3D Mode</button>
                        <button id="disable-3d" class="btn btn-secondary" disabled>Disable 3D Mode</button>
                    </div>
                    <div class="mode-info">
                        <p>Current Mode: <span id="current-ui-mode">2D Traditional</span></p>
                    </div>
                </div>
                
                <div class="ui-feature-section">
                    <h4>📊 Command Flow Visualization</h4>
                    <p>See your command pipelines as interactive flow diagrams</p>
                    <div class="flow-demo">
                        <input type="text" id="flow-command" placeholder="Enter command pipeline (e.g., ls | grep .js | wc -l)" style="width:300px;" />
                        <button id="visualize-flow" class="btn btn-secondary">Visualize Flow</button>
                    </div>
                </div>
                
                <div class="ui-feature-section">
                    <h4>👆 Gesture Control</h4>
                    <p>Control your terminal with touch gestures and hand movements</p>
                    <div class="gesture-controls">
                        <button id="enable-gestures" class="btn btn-primary">Enable Gesture Control</button>
                        <button id="gesture-help" class="btn btn-secondary">View Gestures</button>
                    </div>
                    <div class="gesture-status">
                        <p>Status: <span id="gesture-status">Disabled</span></p>
                    </div>
                </div>
                
                <div class="ui-feature-section">
                    <h4>🤖 Adaptive Interface</h4>
                    <p>UI that learns and adapts to your workflow patterns</p>
                    <div class="adaptive-controls">
                        <button id="enable-adaptive" class="btn btn-primary">Enable Adaptive UI</button>
                        <button id="reset-learning" class="btn btn-warning">Reset Learning Data</button>
                    </div>
                </div>
                
                <div class="ui-feature-section">
                    <h4>🏗️ Dynamic Layouts</h4>
                    <p>Optimize your workspace layout for different tasks</p>
                    <div class="layout-presets">
                        <button class="layout-preset" data-layout="development">👨‍💻 Development</button>
                        <button class="layout-preset" data-layout="debugging">🐛 Debugging</button>
                        <button class="layout-preset" data-layout="deployment">🚀 Deployment</button>
                        <button class="layout-preset" data-layout="learning">📚 Learning</button>
                    </div>
                </div>
                
                <div class="ui-feature-section">
                    <h4>🥽 Holographic Mode (Future)</h4>
                    <p>Experience terminal in AR/VR environments</p>
                    <div class="holo-controls">
                        <button id="check-vr-support" class="btn btn-secondary">Check VR Support</button>
                        <button id="enable-holo" class="btn btn-primary" disabled>Enable Holographic Mode</button>
                    </div>
                </div>
            </div>
        `,
      {
        footer: '<button class="btn btn-secondary close-modal">Close</button>',
      }
    );

    this.setupAdvancedUIHandlers(uiModal);
  }

  setupAdvancedUIHandlers(modal) {
    // 3D Mode controls
    modal.querySelector('#enable-3d')?.addEventListener('click', async () => {
      if (this.nextGenUI) {
        try {
          await this.nextGenUI.enable3DMode();
          modal.querySelector('#current-ui-mode').textContent = '3D Immersive';
          modal.querySelector('#enable-3d').disabled = true;
          modal.querySelector('#disable-3d').disabled = false;
        } catch (error) {
          this.pluginAPI.showNotification(`3D Mode error: ${error.message}`, 'error');
        }
      }
    });

    modal.querySelector('#disable-3d')?.addEventListener('click', async () => {
      if (this.nextGenUI) {
        await this.nextGenUI.disable3DMode();
        modal.querySelector('#current-ui-mode').textContent = '2D Traditional';
        modal.querySelector('#enable-3d').disabled = false;
        modal.querySelector('#disable-3d').disabled = true;
      }
    });

    // Command flow visualization
    modal.querySelector('#visualize-flow')?.addEventListener('click', async () => {
      const command = modal.querySelector('#flow-command').value.trim();
      if (command && this.nextGenUI) {
        try {
          const flowDiagram = await this.nextGenUI.visualizeCommandFlow(command);
          // Display the flow diagram in a modal or overlay
          this.pluginAPI.showNotification('Flow diagram generated!', 'success');
        } catch (error) {
          this.pluginAPI.showNotification(`Flow visualization error: ${error.message}`, 'error');
        }
      }
    });

    // Gesture control
    modal.querySelector('#enable-gestures')?.addEventListener('click', async () => {
      if (this.nextGenUI) {
        try {
          await this.nextGenUI.enableGestureControl();
          modal.querySelector('#gesture-status').textContent = 'Enabled';
          this.pluginAPI.showNotification('Gesture control enabled!', 'success');
        } catch (error) {
          this.pluginAPI.showNotification(`Gesture control error: ${error.message}`, 'error');
        }
      }
    });

    // Adaptive interface
    modal.querySelector('#enable-adaptive')?.addEventListener('click', async () => {
      if (this.nextGenUI) {
        try {
          await this.nextGenUI.enableAdaptiveInterface();
          this.pluginAPI.showNotification('Adaptive UI enabled!', 'success');
        } catch (error) {
          this.pluginAPI.showNotification(`Adaptive UI error: ${error.message}`, 'error');
        }
      }
    });

    // Layout presets
    modal.querySelectorAll('.layout-preset').forEach(btn => {
      btn.addEventListener('click', async () => {
        const layout = btn.dataset.layout;
        if (this.nextGenUI) {
          try {
            await this.nextGenUI.optimizeLayoutForTask(layout);
            this.pluginAPI.showNotification(`Layout optimized for ${layout}`, 'success');
          } catch (error) {
            this.pluginAPI.showNotification(`Layout optimization error: ${error.message}`, 'error');
          }
        }
      });
    });

    // VR support check
    modal.querySelector('#check-vr-support')?.addEventListener('click', async () => {
      if (this.nextGenUI && this.nextGenUI.holoMode) {
        const isSupported = this.nextGenUI.holoMode.isSupported();
        if (isSupported) {
          modal.querySelector('#enable-holo').disabled = false;
          this.pluginAPI.showNotification('VR/AR support detected!', 'success');
        } else {
          this.pluginAPI.showNotification('VR/AR not supported on this device', 'info');
        }
      }
    });

    // Holographic mode
    modal.querySelector('#enable-holo')?.addEventListener('click', async () => {
      if (this.nextGenUI) {
        try {
          await this.nextGenUI.enableHolographicMode();
          this.pluginAPI.showNotification('Holographic mode activated!', 'success');
        } catch (error) {
          this.pluginAPI.showNotification(`Holographic mode error: ${error.message}`, 'error');
        }
      }
    });
  }

  // Helper method for inserting commands into terminal
  insertCommand(command) {
    const activeTerminal = this.terminals.get(this.activeTerminalId);
    if (activeTerminal) {
      // Clear current input and insert new command
      const currentBuffer = this.commandBuffers.get(this.activeTerminalId) || '';

      // Send backspaces to clear current input
      for (let i = 0; i < currentBuffer.length; i++) {
        activeTerminal.terminal.write('\b \b');
      }

      // Type the new command
      activeTerminal.terminal.write(command);
      this.commandBuffers.set(this.activeTerminalId, command);
    }
  }

  // Helper method for executing commands directly
  executeCommand(command) {
    const activeTerminal = this.terminals.get(this.activeTerminalId);
    if (activeTerminal) {
      try {
        activeTerminal.shellProcess.stdin.write(command + '\n');
        activeTerminal.terminal.write(command + '\r\n');
        this.historyManager.addCommand(command);
      } catch (error) {
        console.error('Failed to execute command:', error);
        this.pluginAPI.showNotification('Failed to execute command', 'error');
      }
    }
  }

  showWelcomeScreen() {
    // Skip welcome screen for now and mark onboarding as complete
    localStorage.setItem('rinawarp-onboarding-completed', 'true');
    this.completeInitialization();
  }

  async init() {
    // Setup window controls
    this.setupWindowControls();

    // Get platform and shell info
    this.platform = await ipcRenderer.invoke('get-platform');
    this.shell = await ipcRenderer.invoke('get-shell');

    // Check if this is first run and show welcome screen
    const isFirstRun = !localStorage.getItem('rinawarp-onboarding-completed');
    if (isFirstRun) {
      this.showWelcomeScreen();
      return; // Don't proceed with normal initialization until onboarding is complete
    }

    this.completeInitialization();
  }

  completeInitialization() {
    // Update status bar
    this.updateStatusBar();

    // Create first terminal
    this.createTerminal(1);

    // Setup tab management
    this.setupTabManagement();

    // Setup context menu
    this.setupContextMenu();

    // Start session auto-save
    if (this.settings.autoSaveSession) {
      this.sessionManager.startAutoSave();
    }
  }

  setupContextMenu() {
    // Setup right-click context menu for terminal areas
    document.addEventListener('contextmenu', e => {
      // Check if we're right-clicking on a terminal or terminal-related element
      const terminalElement = e.target.closest('.terminal, .terminal-pane, .terminal-wrapper');
      if (terminalElement) {
        e.preventDefault();
        this.showContextMenu(e.clientX, e.clientY);
      }
    });

    // Close context menu when clicking elsewhere
    document.addEventListener('click', e => {
      if (!e.target.closest('#context-menu')) {
        this.hideContextMenu();
      }
    });

    // Close context menu on escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.hideContextMenu();
      }
    });

    // Add quick access buttons for session and cloud sync management
    this.addQuickAccessButtons();
  }

  addQuickAccessButtons() {
    // Add session management button to status bar
    this.pluginAPI.addStatusBarItem(
      'session-manager',
      `
            <button onclick="window.terminalManager.showSessionManager()" 
                    title="Session Manager" 
                    style="background:none;border:1px solid #74c0fc;color:#74c0fc;padding:2px 8px;border-radius:3px;margin:0 2px;cursor:pointer;font-size:12px;">
                💾 Sessions
            </button>
        `,
      'right'
    );

    // Add cloud sync button to status bar
    this.pluginAPI.addStatusBarItem(
      'cloud-sync',
      `
            <button onclick="window.terminalManager.showCloudSyncManager()" 
                    title="Cloud Sync" 
                    style="background:none;border:1px solid #51cf66;color:#51cf66;padding:2px 8px;border-radius:3px;margin:0 2px;cursor:pointer;font-size:12px;">
                ☁️ Sync
            </button>
        `,
      'right'
    );

    // Add find button to status bar
    this.pluginAPI.addStatusBarItem(
      'find-terminal',
      `
            <button onclick="window.terminalManager.showFindDialog()" 
                    title="Find in Terminal (Ctrl+F)" 
                    style="background:none;border:1px solid #ffd93d;color:#ffd93d;padding:2px 8px;border-radius:3px;margin:0 2px;cursor:pointer;font-size:12px;">
                🔍 Find
            </button>
        `,
      'right'
    );
  }

  // Session Management Wrapper Methods
  restoreSession(sessionId) {
    if (this.sessionManager.restoreSession(sessionId)) {
      this.pluginAPI.showNotification('Session restored successfully!', 'success');
      // Close the session manager modal
      const modal = document.querySelector('.modal:not(.hidden)');
      if (modal) {
        modal.classList.add('hidden');
      }
    } else {
      this.pluginAPI.showNotification('Failed to restore session', 'error');
    }
  }

  deleteSession(sessionId) {
    if (confirm('Are you sure you want to delete this session?')) {
      this.sessionManager.deleteSession(sessionId);
      this.populateSessionList();
      this.pluginAPI.showNotification('Session deleted', 'info');
    }
  }

  setupWindowControls() {
    document.getElementById('minimize-btn').addEventListener('click', () => {
      ipcRenderer.send('window-minimize');
    });

    document.getElementById('maximize-btn').addEventListener('click', () => {
      ipcRenderer.send('window-maximize');
    });

    document.getElementById('close-btn').addEventListener('click', () => {
      ipcRenderer.send('window-close');
    });

    // Setup settings modal
    this.setupSettingsModal();

    // Setup quick theme switch button
    this.setupQuickThemeSwitch();
  }

  setupQuickThemeSwitch() {
    const themeQuickBtn = document.getElementById('theme-quick-btn');
    if (themeQuickBtn) {
      themeQuickBtn.addEventListener('click', () => {
        // Quick toggle between dark and mermaid themes
        const currentTheme = this.themeManager.currentTheme;
        const newTheme = currentTheme === 'mermaid' ? 'dark' : 'mermaid';

        this.switchTheme(newTheme);

        // Update button tooltip
        const isNowMermaid = newTheme === 'mermaid';
        themeQuickBtn.title = isNowMermaid ? 'Switch to Dark Theme' : 'Switch to Mermaid Theme';

        // Show notification with special message for mermaid theme
        if (isNowMermaid) {
          this.pluginAPI.showNotification(
            '🧜‍♀️ Welcome to the Mermaid Theme! Experience the magic of the deep!',
            'success',
            4000
          );
        } else {
          this.pluginAPI.showNotification('🌙 Switched to Dark Theme', 'info', 2000);
        }
      });
    }

    // Setup command suggestions
    this.setupCommandSuggestions();

    // Handle window resize with debouncing for performance
    const debouncedResize = this.debounce(() => {
      this.resizeActiveTerminal();
    }, 100);

    window.addEventListener('resize', debouncedResize);
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('rinawarp-terminal-settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.log('Failed to load settings:', error.message);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('rinawarp-terminal-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.log('Failed to save settings:', error.message);
    }
  }

  setupSettingsModal() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    const themeSelect = document.getElementById('theme-select');
    const fontSizeSlider = document.getElementById('font-size');
    const fontSizeValue = document.getElementById('font-size-value');
    const commandSuggestionsCheck = document.getElementById('command-suggestions');
    const aiAssistanceCheck = document.getElementById('ai-assistance');

    // Load current settings into UI
    themeSelect.value = this.settings.theme;
    fontSizeSlider.value = this.settings.fontSize;
    fontSizeValue.textContent = `${this.settings.fontSize}px`;
    commandSuggestionsCheck.checked = this.settings.commandSuggestions;
    aiAssistanceCheck.checked = this.settings.aiAssistance;

    // Open settings modal
    settingsBtn.addEventListener('click', () => {
      settingsModal.classList.remove('hidden');
    });

    // Close settings modal
    const closeModal = () => {
      settingsModal.classList.add('hidden');
    };

    closeSettings.addEventListener('click', closeModal);
    settingsModal.addEventListener('click', e => {
      if (e.target === settingsModal) closeModal();
    });

    // Theme change
    themeSelect.addEventListener('change', () => {
      this.settings.theme = themeSelect.value;
      this.themeManager.setTheme(themeSelect.value);
      this.applyThemeToTerminals();
      this.saveSettings();
    });

    // Font size change
    fontSizeSlider.addEventListener('input', () => {
      this.settings.fontSize = parseInt(fontSizeSlider.value);
      fontSizeValue.textContent = `${this.settings.fontSize}px`;
      this.applyFontSizeToTerminals();
      this.saveSettings();
    });

    // Command suggestions toggle
    commandSuggestionsCheck.addEventListener('change', () => {
      this.settings.commandSuggestions = commandSuggestionsCheck.checked;
      this.saveSettings();
    });

    // AI assistance toggle
    aiAssistanceCheck.addEventListener('change', () => {
      this.settings.aiAssistance = aiAssistanceCheck.checked;
      this.saveSettings();
    });
  }

  setupCommandSuggestions() {
    const suggestionsBox = document.getElementById('suggestions-box');
    const suggestionsList = suggestionsBox.querySelector('.suggestions-list');
    const currentSuggestionIndex = -1;

    // Track command input across all terminals
    document.addEventListener('keydown', async e => {
      if (!this.settings.commandSuggestions) return;

      const activeTerminal = this.terminals.get(this.activeTerminalId);
      if (!activeTerminal) return;

      // Handle suggestion navigation
      if (suggestionsBox.classList.contains('hidden') === false) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          this.navigateSuggestions(e.key === 'ArrowUp' ? -1 : 1);
          return;
        } else if (e.key === 'Tab' || e.key === 'Enter') {
          e.preventDefault();
          this.applySuggestion();
          return;
        } else if (e.key === 'Escape') {
          this.hideSuggestions();
          return;
        }
      }

      // Track current input
      if (!this.commandBuffers.has(this.activeTerminalId)) {
        this.commandBuffers.set(this.activeTerminalId, '');
      }

      const buffer = this.commandBuffers.get(this.activeTerminalId);

      if (e.key === 'Enter') {
        // Command executed
        if (buffer.trim()) {
          this.historyManager.addCommand(buffer.trim());
          await this.pluginManager.executeHook('terminal-created', {
            terminalId: this.activeTerminalId,
          });
        }
        this.commandBuffers.set(this.activeTerminalId, '');
        this.hideSuggestions();
      } else if (e.key === 'Backspace') {
        const newBuffer = buffer.slice(0, -1);
        this.commandBuffers.set(this.activeTerminalId, newBuffer);
        this.updateSuggestions(newBuffer);
      } else if (e.key.length === 1) {
        const newBuffer = buffer + e.key;
        this.commandBuffers.set(this.activeTerminalId, newBuffer);
        this.updateSuggestions(newBuffer);
      }
    });
  }

  async updateSuggestions(input) {
    if (!input.trim() || !this.settings.commandSuggestions) {
      this.hideSuggestions();
      return;
    }

    const suggestions = this.historyManager.getSuggestions(input);

    // Get AI suggestions if enabled and license allows
    if (this.settings.aiAssistance) {
      if (!licenseManager.canUseAI()) {
        // Show upgrade prompt for AI features
        licenseManager.showUpgradeDialog('AI Assistance');
        this.showSuggestions(suggestions);
        return;
      }

      // Track AI usage
      licenseManager.trackAIUsage();

      const aiSuggestions = await this.pluginManager.executeHook('command-suggestion', input);
      aiSuggestions.flat().forEach(suggestion => {
        if (!suggestions.includes(suggestion)) {
          suggestions.push(suggestion);
        }
      });
    }

    if (suggestions.length > 0) {
      this.showSuggestions(suggestions);
    } else {
      this.hideSuggestions();
    }
  }

  showSuggestions(suggestions) {
    const suggestionsBox = document.getElementById('suggestions-box');
    const suggestionsList = suggestionsBox.querySelector('.suggestions-list');

    suggestionsList.innerHTML = '';

    suggestions.forEach((suggestion, index) => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.textContent = suggestion;
      item.dataset.index = index;

      item.addEventListener('click', () => {
        this.applySuggestionByIndex(index);
      });

      suggestionsList.appendChild(item);
    });

    // Position the suggestions box
    const activeTerminal = document.querySelector(
      `.terminal-pane[data-tab-id="${this.activeTerminalId}"]`
    );
    if (activeTerminal) {
      const rect = activeTerminal.getBoundingClientRect();
      suggestionsBox.style.left = `${rect.left + 20}px`;
      suggestionsBox.style.top = `${rect.top + 100}px`;
    }

    suggestionsBox.classList.remove('hidden');
    this.currentSuggestionIndex = -1;
  }

  hideSuggestions() {
    document.getElementById('suggestions-box').classList.add('hidden');
    this.currentSuggestionIndex = -1;
  }

  navigateSuggestions(direction) {
    const suggestionItems = document.querySelectorAll('.suggestion-item');
    if (suggestionItems.length === 0) return;

    // Remove current selection
    if (this.currentSuggestionIndex >= 0) {
      suggestionItems[this.currentSuggestionIndex].classList.remove('selected');
    }

    // Update index
    this.currentSuggestionIndex += direction;
    if (this.currentSuggestionIndex < 0) {
      this.currentSuggestionIndex = suggestionItems.length - 1;
    } else if (this.currentSuggestionIndex >= suggestionItems.length) {
      this.currentSuggestionIndex = 0;
    }

    // Add new selection
    suggestionItems[this.currentSuggestionIndex].classList.add('selected');
  }

  applySuggestion() {
    if (this.currentSuggestionIndex >= 0) {
      this.applySuggestionByIndex(this.currentSuggestionIndex);
    }
  }

  applySuggestionByIndex(index) {
    const suggestionItems = document.querySelectorAll('.suggestion-item');
    if (index < suggestionItems.length) {
      const suggestion = suggestionItems[index].textContent;

      // Apply suggestion to terminal
      const activeTerminal = this.terminals.get(this.activeTerminalId);
      if (activeTerminal) {
        // Clear current input and type suggestion
        const currentBuffer = this.commandBuffers.get(this.activeTerminalId) || '';

        // Send backspaces to clear current input
        for (let i = 0; i < currentBuffer.length; i++) {
          activeTerminal.terminal.write('\b \b');
        }

        // Type the suggestion
        activeTerminal.terminal.write(suggestion);
        this.commandBuffers.set(this.activeTerminalId, suggestion);
      }

      this.hideSuggestions();
    }
  }

  applyThemeToTerminals() {
    const theme = this.themeManager.getCurrentTheme();

    this.terminals.forEach(terminalData => {
      terminalData.terminal.options.theme = theme;
    });
  }

  applyFontSizeToTerminals() {
    this.terminals.forEach(terminalData => {
      terminalData.terminal.options.fontSize = this.settings.fontSize;
      terminalData.fitAddon.fit();
    });
  }

  createTerminal(terminalId) {
    const terminalElement = document.getElementById(`terminal-${terminalId}`);
    if (!terminalElement) {
      console.error(`Terminal element with id terminal-${terminalId} not found`);
      return;
    }

    // Create xterm terminal
    const terminal = new Terminal({
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: this.settings.fontSize,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      theme: this.themeManager.getCurrentTheme(),
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    // Open terminal in DOM
    terminal.open(terminalElement);
    fitAddon.fit();

    // Create shell process (simplified version without node-pty)
    let shell, shellArgs;
    if (this.platform === 'win32') {
      shell = 'powershell.exe';
      shellArgs = ['-NoExit', '-Command', '-'];
    } else {
      shell = process.env.SHELL || '/bin/bash';
      shellArgs = [];
    }

    let shellProcess;
    try {
      shellProcess = spawn(shell, shellArgs, {
        cwd: os.homedir(),
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error) {
      terminal.write(`\r\n[Failed to start shell process: ${error.message}]\r\n`);
      return;
    }

    // Handle shell output
    shellProcess.stdout.on('data', data => {
      terminal.write(data.toString());
    });

    shellProcess.stderr.on('data', data => {
      terminal.write(data.toString());
    });

    // Handle terminal input
    terminal.onData(data => {
      try {
        shellProcess.stdin.write(data);
      } catch (error) {
        console.error('Failed to write to shell process:', error);
      }
    });

    // Handle process exit
    shellProcess.on('exit', () => {
      terminal.write('\r\n[Process exited]\r\n');
    });

    // Handle process errors
    shellProcess.on('error', error => {
      terminal.write(`\r\n[Shell process error: ${error.message}]\r\n`);
    });

    // Store terminal data
    this.terminals.set(terminalId, {
      terminal,
      shellProcess,
      fitAddon,
      element: terminalElement,
    });

    // Initialize command buffer for this terminal
    this.commandBuffers.set(terminalId, '');

    // Execute plugin hooks
    this.pluginManager.executeHook('terminal-created', { terminalId, terminal, shellProcess });

    // Auto-save session if enabled
    if (this.settings.autoSaveSession) {
      setTimeout(() => this.sessionManager.updateCurrentSession(), 1000);
    }

    // Focus the terminal and ensure it can receive input
    setTimeout(() => {
      terminal.focus();
      // Ensure the terminal element is focusable and focused
      terminalElement.setAttribute('tabindex', '0');
      terminalElement.focus();
      console.log(`Terminal ${terminalId} focused and ready for input`);
    }, 100);
  }

  setupTabManagement() {
    // New tab button
    document.querySelector('.new-tab-btn').addEventListener('click', () => {
      this.createNewTab();
    });

    // Split terminal buttons
    document.addEventListener('click', e => {
      if (e.target.classList.contains('split-horizontal')) {
        this.splitTerminal('horizontal');
      } else if (e.target.classList.contains('split-vertical')) {
        this.splitTerminal('vertical');
      }
    });

    // Tab close buttons
    document.addEventListener('click', e => {
      if (e.target.classList.contains('tab-close')) {
        const tab = e.target.closest('.tab');
        const tabId = parseInt(tab.dataset.tabId);
        this.closeTab(tabId);
      }
    });

    // Tab switching
    document.addEventListener('click', e => {
      if (e.target.closest('.tab') && !e.target.classList.contains('tab-close')) {
        const tab = e.target.closest('.tab');
        const tabId = parseInt(tab.dataset.tabId);
        this.switchTab(tabId);
      }
    });
  }

  createNewTab() {
    const terminalId = this.nextTerminalId++;

    // Create tab element
    const tabBar = document.querySelector('.tab-bar');
    const newTabBtn = document.querySelector('.new-tab-btn');

    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.dataset.tabId = terminalId;
    tabElement.innerHTML = `
            <span class="tab-title">Terminal ${terminalId}</span>
            <button class="tab-close">×</button>
        `;

    tabBar.insertBefore(tabElement, newTabBtn);

    // Create terminal pane
    const terminalContainer = document.querySelector('.terminal-container');
    const terminalPane = document.createElement('div');
    terminalPane.className = 'terminal-pane';
    terminalPane.dataset.tabId = terminalId;
    terminalPane.innerHTML = `
            <div class="terminal-header">
                <div class="terminal-path"></div>
                <div class="terminal-controls">
                    <button class="split-horizontal" title="Split Horizontally">⬌</button>
                    <button class="split-vertical" title="Split Vertically">⬍</button>
                </div>
            </div>
            <div class="terminal-wrapper">
                <div id="terminal-${terminalId}" class="terminal"></div>
            </div>
        `;

    terminalContainer.appendChild(terminalPane);

    // Create terminal
    this.createTerminal(terminalId);

    // Switch to new tab
    this.switchTab(terminalId);
  }

  switchTab(terminalId) {
    // Update active tab
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab-id="${terminalId}"]`).classList.add('active');

    // Update active terminal pane
    document.querySelectorAll('.terminal-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    document.querySelector(`.terminal-pane[data-tab-id="${terminalId}"]`).classList.add('active');

    this.activeTerminalId = terminalId;

    // Focus terminal
    const terminalData = this.terminals.get(terminalId);
    if (terminalData) {
      terminalData.terminal.focus();
      terminalData.fitAddon.fit();
    }
  }

  closeTab(terminalId) {
    if (this.terminals.size <= 1) {
      return; // Don't close the last tab
    }

    // Close shell process
    const terminalData = this.terminals.get(terminalId);
    if (terminalData) {
      try {
        if (terminalData.shellProcess) {
          terminalData.shellProcess.kill();
        }
      } catch (error) {
        console.error('Failed to kill shell process:', error);
      }
      terminalData.terminal.dispose();
      this.terminals.delete(terminalId);
    }

    // Remove tab element
    const tabElement = document.querySelector(`.tab[data-tab-id="${terminalId}"]`);
    if (tabElement) {
      tabElement.remove();
    }

    // Remove terminal pane
    const terminalPane = document.querySelector(`.terminal-pane[data-tab-id="${terminalId}"]`);
    if (terminalPane) {
      terminalPane.remove();
    }

    // Switch to first available tab if this was active
    if (this.activeTerminalId === terminalId) {
      const firstTab = document.querySelector('.tab');
      if (firstTab) {
        const firstTabId = parseInt(firstTab.dataset.tabId);
        this.switchTab(firstTabId);
      }
    }
  }

  resizeActiveTerminal() {
    const terminalData = this.terminals.get(this.activeTerminalId);
    if (terminalData) {
      setTimeout(() => {
        terminalData.fitAddon.fit();
      }, 100);
    }
  }

  splitTerminal(direction) {
    const activePane = document.querySelector(
      `.terminal-pane[data-tab-id="${this.activeTerminalId}"]`
    );
    if (!activePane) return;

    const newTerminalId = this.nextTerminalId++;

    // Create new terminal element
    const newTerminalDiv = document.createElement('div');
    newTerminalDiv.id = `terminal-${newTerminalId}`;
    newTerminalDiv.className = 'terminal';

    // Get the terminal wrapper
    const terminalWrapper = activePane.querySelector('.terminal-wrapper');

    // Apply split styling
    if (direction === 'horizontal') {
      terminalWrapper.style.display = 'flex';
      terminalWrapper.style.flexDirection = 'row';

      // Resize existing terminal
      const existingTerminal = terminalWrapper.querySelector('.terminal');
      existingTerminal.style.width = '50%';
      existingTerminal.style.borderRight = '1px solid #3d3d3d';

      // Add new terminal
      newTerminalDiv.style.width = '50%';
      newTerminalDiv.style.paddingLeft = '8px';
    } else {
      terminalWrapper.style.display = 'flex';
      terminalWrapper.style.flexDirection = 'column';

      // Resize existing terminal
      const existingTerminal = terminalWrapper.querySelector('.terminal');
      existingTerminal.style.height = '50%';
      existingTerminal.style.borderBottom = '1px solid #3d3d3d';

      // Add new terminal
      newTerminalDiv.style.height = '50%';
      newTerminalDiv.style.paddingTop = '8px';
    }

    terminalWrapper.appendChild(newTerminalDiv);

    // Create the new terminal instance
    this.createTerminal(newTerminalId);

    // Store split pane information
    this.splitPanes.set(newTerminalId, {
      parentTabId: this.activeTerminalId,
      direction: direction,
    });

    // Resize terminals to fit
    setTimeout(() => {
      this.resizeActiveTerminal();
      const newTerminalData = this.terminals.get(newTerminalId);
      if (newTerminalData) {
        newTerminalData.fitAddon.fit();
      }
    }, 100);
  }

  updateStatusBar() {
    document.getElementById('platform-info').textContent = this.platform;
    document.getElementById('shell-info').textContent = path.basename(this.shell);
    document.getElementById('current-dir').textContent = process.cwd();

    // Update license status
    this.updateLicenseStatus();

    // Update git info through plugin
    this.pluginManager.executeHook(
      'directory-changed',
      { terminalId: this.activeTerminalId },
      process.cwd()
    );
  }

  updateLicenseStatus() {
    const licenseElement = document.getElementById('license-status');
    if (licenseElement && licenseManager) {
      const status = licenseManager.getStatus();

      let statusText = '';
      let statusColor = '';

      switch (status.tier) {
        case 'trial':
          statusText = `🔑 Trial (${status.trialDaysRemaining} days)`;
          statusColor = '#ffd93d';
          break;
        case 'personal':
          statusText = '👤 Personal';
          statusColor = '#51cf66';
          break;
        case 'professional':
          statusText = '💼 Professional';
          statusColor = '#74c0fc';
          break;
        case 'team':
          statusText = '👥 Team';
          statusColor = '#9775fa';
          break;
        case 'enterprise':
          statusText = '🏢 Enterprise';
          statusColor = '#ff8c42';
          break;
        case 'expired':
          statusText = '❌ Expired';
          statusColor = '#f92672';
          break;
        default:
          statusText = '❓ Unknown';
          statusColor = '#666';
      }

      licenseElement.textContent = statusText;
      licenseElement.style.color = statusColor;

      // Make it clickable to show upgrade options
      licenseElement.style.cursor = 'pointer';
      licenseElement.onclick = () => this.showLicenseManager();
    }
  }

  showLicenseManager() {
    const status = licenseManager.getStatus();

    const licenseModal = this.pluginAPI.createModal(
      '🔑 License Manager',
      `
            <div class="license-manager">
                <div class="license-status-section">
                    <h4>Current License Status</h4>
                    <div class="current-license">
                        <div class="license-tier">${status.tier.toUpperCase()}</div>
                        <div class="license-details">
                            ${
                              status.tier === 'trial'
                                ? `<p>Trial expires in <strong>${status.trialDaysRemaining} days</strong></p>`
                                : '<p>License is active</p>'
                            }
                            ${
                              status.aiQueriesRemaining !== 'unlimited'
                                ? `<p>AI queries remaining today: <strong>${status.aiQueriesRemaining}</strong></p>`
                                : '<p>Unlimited AI queries</p>'
                            }
                        </div>
                    </div>
                </div>
                
                <div class="license-actions">
                    <h4>License Actions</h4>
                    <div class="action-buttons">
                        <button id="view-pricing" class="btn btn-primary">View Pricing & Upgrade</button>
                        <button id="enter-license" class="btn btn-secondary">Enter License Key</button>
                        ${status.tier === 'trial' ? '<button id="extend-trial" class="btn btn-secondary">Extend Trial</button>' : ''}
                    </div>
                </div>
                
                <div class="license-info">
                    <h4>Feature Comparison</h4>
                    <div class="features-grid">
                        <div class="feature-item">
                            <span class="feature-name">AI Queries per Day</span>
                            <span class="feature-value">${status.tier === 'personal' ? '5' : status.tier === 'trial' ? 'Unlimited (trial)' : 'Unlimited'}</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-name">Cloud Sync</span>
                            <span class="feature-value">${['professional', 'team', 'enterprise', 'trial'].includes(status.tier) ? '✅' : '❌'}</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-name">Team Features</span>
                            <span class="feature-value">${['team', 'enterprise'].includes(status.tier) ? '✅' : '❌'}</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-name">Enterprise Security</span>
                            <span class="feature-value">${status.tier === 'enterprise' ? '✅' : '❌'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `,
      {
        footer: '<button class="btn btn-secondary close-modal">Close</button>',
      }
    );

    this.setupLicenseActions(licenseModal);
  }

  setupLicenseActions(modal) {
    // View pricing button
    modal.querySelector('#view-pricing')?.addEventListener('click', () => {
      // Open pricing page in browser
      // Open pricing page in local development
      require('electron').shell.openExternal('https://rinawarp-terminal.web.app/pricing');
    });

    // Enter license key
    modal.querySelector('#enter-license')?.addEventListener('click', () => {
      const licenseKey = prompt('Enter your license key:');
      if (licenseKey) {
        const licenseType = prompt('Enter license type (personal/professional/team/enterprise):');
        if (licenseType) {
          try {
            licenseManager.activateLicense(licenseKey, licenseType);
            this.updateLicenseStatus();
            this.pluginAPI.showNotification('License activated successfully!', 'success');
            modal.querySelector('.close-modal').click();
          } catch (error) {
            this.pluginAPI.showNotification('License activation failed', 'error');
          }
        }
      }
    });

    // Extend trial (placeholder)
    modal.querySelector('#extend-trial')?.addEventListener('click', () => {
      this.pluginAPI.showNotification('Trial extension is not yet implemented', 'info');
    });
  }

  showCommercialWelcome() {
    const status = licenseManager.getStatus();

    if (status.tier === 'trial' && status.trialDaysRemaining > 0) {
      const welcomeModal = this.pluginAPI.createModal(
        '🎉 Welcome to RinaWarp Terminal!',
        `
                <div class="commercial-welcome">
                    <div class="welcome-header">
                        <h3>Thank you for trying RinaWarp Terminal</h3>
                        <p>You're currently on a <strong>30-day free trial</strong> with full Professional features!</p>
                    </div>
                    
                    <div class="trial-status">
                        <div class="trial-info">
                            <span class="trial-days">${status.trialDaysRemaining}</span>
                            <span class="trial-label">days remaining</span>
                        </div>
                        <div class="trial-features">
                            <h4>What's included in your trial:</h4>
                            <ul>
                                <li>✅ Unlimited AI-powered command assistance</li>
                                <li>✅ Advanced Git workflow integration</li>
                                <li>✅ Cloud sync across devices</li>
                                <li>✅ Custom themes and layouts</li>
                                <li>✅ Session management</li>
                                <li>✅ Priority email support</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="welcome-actions">
                        <h4>Ready to get the most out of RinaWarp?</h4>
                        <div class="action-buttons">
                            <button id="view-pricing-welcome" class="btn btn-primary">View Pricing Plans</button>
                            <button id="learn-features" class="btn btn-secondary">Explore Features</button>
                            <button id="dismiss-welcome" class="btn btn-secondary">Continue with Trial</button>
                        </div>
                    </div>
                    
                    <div class="commercial-note">
                        <p><small>RinaWarp Terminal is now a commercial product. After your trial expires, you'll need a license to continue using advanced features.</small></p>
                    </div>
                </div>
            `,
        {
          footer: '',
        }
      );

      this.setupCommercialWelcomeActions(welcomeModal);
    }
  }

  setupCommercialWelcomeActions(modal) {
    // View pricing button
    modal.querySelector('#view-pricing-welcome')?.addEventListener('click', () => {
      // Open pricing page in local development
      require('electron').shell.openExternal('https://rinawarp-terminal.web.app/pricing');
      modal.querySelector('.close-modal')?.click();
    });

    // Learn features button
    modal.querySelector('#learn-features')?.addEventListener('click', () => {
      this.showAIFeatures();
      modal.querySelector('.close-modal')?.click();
    });

    // Dismiss welcome
    modal.querySelector('#dismiss-welcome')?.addEventListener('click', () => {
      modal.querySelector('.close-modal')?.click();
    });

    // Don't show this again for this session
    sessionStorage.setItem('rinawarp_welcome_shown', 'true');
  }

  // Performance optimization: Debounced resize
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Context Menu Implementation
  showContextMenu(x, y) {
    this.hideContextMenu(); // Hide any existing menu

    const contextMenu = document.createElement('div');
    contextMenu.id = 'context-menu';
    contextMenu.className = 'context-menu';

    // Build menu items from plugin API
    const menuItems = Array.from(this.pluginAPI.contextMenuItems.entries());

    // Add default context menu items
    const defaultItems = [
      { id: 'copy', label: 'Copy', handler: () => this.copySelectedText(), icon: '📋' },
      { id: 'paste', label: 'Paste', handler: () => this.pasteFromClipboard(), icon: '📄' },
      { id: 'separator1', label: '---', handler: null },
      { id: 'new-tab', label: 'New Tab', handler: () => this.createNewTab(), icon: '➕' },
      {
        id: 'close-tab',
        label: 'Close Tab',
        handler: () => this.closeTab(this.activeTerminalId),
        icon: '❌',
      },
      { id: 'separator2', label: '---', handler: null },
      {
        id: 'split-h',
        label: 'Split Horizontally',
        handler: () => this.splitTerminal('horizontal'),
        icon: '⬌',
      },
      {
        id: 'split-v',
        label: 'Split Vertically',
        handler: () => this.splitTerminal('vertical'),
        icon: '⬍',
      },
      { id: 'separator3', label: '---', handler: null },
      { id: 'settings', label: 'Settings', handler: () => this.openSettings(), icon: '⚙️' },
    ];

    // Combine default and plugin items
    const allItems = [...defaultItems, ...menuItems.map(([id, item]) => ({ id, ...item }))];

    allItems.forEach(item => {
      if (item.label === '---') {
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator';
        contextMenu.appendChild(separator);
      } else {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        menuItem.innerHTML = `${item.icon || ''} ${item.label}`;

        if (item.handler) {
          menuItem.addEventListener('click', () => {
            item.handler();
            this.hideContextMenu();
          });
        }

        contextMenu.appendChild(menuItem);
      }
    });

    // Position and show menu
    contextMenu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: #2d2d2d;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 4px 0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            min-width: 160px;
            font-size: 14px;
        `;

    document.body.appendChild(contextMenu);

    // Auto-hide on click outside
    setTimeout(() => {
      document.addEventListener('click', this.hideContextMenu.bind(this), { once: true });
    }, 10);
  }

  hideContextMenu() {
    const existingMenu = document.getElementById('context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
  }

  // Tab Navigation Methods
  switchToNextTab() {
    const tabs = Array.from(document.querySelectorAll('.tab'));
    const currentIndex = tabs.findIndex(
      tab => parseInt(tab.dataset.tabId) === this.activeTerminalId
    );
    const nextIndex = (currentIndex + 1) % tabs.length;
    const nextTabId = parseInt(tabs[nextIndex].dataset.tabId);
    this.switchTab(nextTabId);
  }

  switchToPrevTab() {
    const tabs = Array.from(document.querySelectorAll('.tab'));
    const currentIndex = tabs.findIndex(
      tab => parseInt(tab.dataset.tabId) === this.activeTerminalId
    );
    const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
    const prevTabId = parseInt(tabs[prevIndex].dataset.tabId);
    this.switchTab(prevTabId);
  }

  // Find/Search Dialog
  showFindDialog() {
    // Hide existing find dialog
    this.hideFindDialog();

    const findDialog = document.createElement('div');
    findDialog.id = 'find-dialog';
    findDialog.className = 'find-dialog';
    findDialog.innerHTML = `
            <div class="find-content">
                <input type="text" id="find-input" placeholder="Search in terminal..." />
                <button id="find-prev">↑</button>
                <button id="find-next">↓</button>
                <button id="find-close">×</button>
            </div>
        `;

    findDialog.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            background: #2d2d2d;
            border: 1px solid #555;
            border-radius: 4px;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 4px;
        `;

    document.body.appendChild(findDialog);

    // Setup find functionality
    const findInput = findDialog.querySelector('#find-input');
    const findPrev = findDialog.querySelector('#find-prev');
    const findNext = findDialog.querySelector('#find-next');
    const findClose = findDialog.querySelector('#find-close');

    findInput.focus();

    // Find functionality (simplified - real implementation would require search addon)
    const currentMatches = [];
    const currentIndex = -1;

    const performSearch = (direction = 1) => {
      const searchTerm = findInput.value.trim();
      if (!searchTerm) return;

      const activeTerminal = this.terminals.get(this.activeTerminalId);
      if (!activeTerminal) return;

      // Note: Real implementation would use search addon
      // For now, just show notification
      this.pluginAPI.showNotification(`Searching for: ${searchTerm}`, 'info', 2000);
    };

    findInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        performSearch(e.shiftKey ? -1 : 1);
      } else if (e.key === 'Escape') {
        this.hideFindDialog();
      }
    });

    findPrev.addEventListener('click', () => performSearch(-1));
    findNext.addEventListener('click', () => performSearch(1));
    findClose.addEventListener('click', () => this.hideFindDialog());
  }

  hideFindDialog() {
    const existingDialog = document.getElementById('find-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }
  }

  // Enhanced Copy/Paste
  copySelectedText() {
    const activeTerminal = this.terminals.get(this.activeTerminalId);
    if (!activeTerminal || !activeTerminal.terminal.hasSelection()) {
      this.pluginAPI.showNotification('No text selected', 'info', 1500);
      return;
    }

    const selectedText = activeTerminal.terminal.getSelection();
    if (selectedText) {
      navigator.clipboard
        .writeText(selectedText)
        .then(() => {
          this.pluginAPI.showNotification('Text copied to clipboard', 'success', 1500);
        })
        .catch(err => {
          this.pluginAPI.showNotification('Failed to copy text', 'error', 2000);
        });
    }
  }

  async pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const activeTerminal = this.terminals.get(this.activeTerminalId);
        if (activeTerminal) {
          // Write text to terminal, handling line breaks appropriately
          const lines = text.split('\n');
          for (let i = 0; i < lines.length; i++) {
            activeTerminal.terminal.write(lines[i]);
            if (i < lines.length - 1) {
              activeTerminal.terminal.write('\r\n');
            }
          }
        }
      }
    } catch (err) {
      this.pluginAPI.showNotification('Failed to paste from clipboard', 'error', 2000);
    }
  }

  // Font Size Controls
  increaseFontSize() {
    this.settings.fontSize = Math.min(this.settings.fontSize + 1, 32);
    this.applyFontSizeToTerminals();
    this.saveSettings();
    this.pluginAPI.showNotification(`Font size: ${this.settings.fontSize}px`, 'info', 1500);
  }

  decreaseFontSize() {
    this.settings.fontSize = Math.max(this.settings.fontSize - 1, 8);
    this.applyFontSizeToTerminals();
    this.saveSettings();
    this.pluginAPI.showNotification(`Font size: ${this.settings.fontSize}px`, 'info', 1500);
  }

  resetFontSize() {
    this.settings.fontSize = 14;
    this.applyFontSizeToTerminals();
    this.saveSettings();
    this.pluginAPI.showNotification('Font size reset to 14px', 'info', 1500);
  }

  // Theme Quick Switch
  switchTheme(themeName) {
    if (this.themeManager.setTheme(themeName)) {
      this.settings.theme = themeName;
      this.applyThemeToTerminals();
      this.saveSettings();
      this.pluginAPI.showNotification(`Switched to ${themeName} theme`, 'success', 1500);

      // Update theme selector in settings if open
      const themeSelect = document.getElementById('theme-select');
      if (themeSelect) {
        themeSelect.value = themeName;
      }
    } else {
      this.pluginAPI.showNotification(`Unknown theme: ${themeName}`, 'error', 2000);
    }
  }

  // Modal Management
  closeActiveModals() {
    // Close settings modal
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal && !settingsModal.classList.contains('hidden')) {
      settingsModal.classList.add('hidden');
    }

    // Close find dialog
    this.hideFindDialog();

    // Close context menu
    this.hideContextMenu();

    // Close suggestions
    this.hideSuggestions();

    // Close any plugin modals
    const modals = document.querySelectorAll('.modal:not(.hidden)');
    modals.forEach(modal => {
      modal.classList.add('hidden');
    });
  }

  // Settings Helper
  openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
  }

  // Session Management UI Helpers
  showSessionManager() {
    const sessionModal = this.pluginAPI.createModal(
      'Session Manager',
      `
            <div class="session-manager">
                <div class="session-list">
                    <h4>Saved Sessions</h4>
                    <div id="session-list-container"></div>
                </div>
                <div class="session-actions">
                    <button id="save-session-btn" class="btn btn-primary">Save Current Session</button>
                    <button id="export-session-btn" class="btn btn-secondary">Export Session</button>
                    <button id="import-session-btn" class="btn btn-secondary">Import Session</button>
                </div>
            </div>
        `,
      {
        footer: '<button class="btn btn-secondary close-modal">Close</button>',
      }
    );

    this.populateSessionList();
    this.setupSessionActions();
  }

  populateSessionList() {
    const container = document.getElementById('session-list-container');
    if (!container) return;

    container.innerHTML = '';

    this.sessionManager.sessions.forEach((session, sessionId) => {
      const sessionItem = document.createElement('div');
      sessionItem.className = 'session-item';
      sessionItem.innerHTML = `
                <div class="session-info">
                    <div class="session-name">${session.name}</div>
                    <div class="session-date">${new Date(session.created).toLocaleString()}</div>
                    <div class="session-description">${session.description || 'No description'}</div>
                </div>
                <div class="session-controls">
                    <button class="btn btn-small" onclick="window.terminalManager.restoreSession('${sessionId}')">Restore</button>
                    <button class="btn btn-small btn-danger" onclick="window.terminalManager.deleteSession('${sessionId}')">Delete</button>
                </div>
            `;
      container.appendChild(sessionItem);
    });
  }

  setupSessionActions() {
    const saveBtn = document.getElementById('save-session-btn');
    const exportBtn = document.getElementById('export-session-btn');
    const importBtn = document.getElementById('import-session-btn');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const name = prompt('Session name:');
        if (name) {
          const description = prompt('Session description (optional):') || '';
          this.sessionManager.createSession(name, description);
          this.sessionManager.updateCurrentSession();
          this.populateSessionList();
          this.pluginAPI.showNotification('Session saved!', 'success');
        }
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const currentSession = this.sessionManager.getCurrentSession();
        const exportData = this.sessionManager.exportSession(currentSession.id);

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rinawarp-session-${currentSession.name}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.pluginAPI.showNotification('Session exported!', 'success');
      });
    }

    if (importBtn) {
      importBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = e => {
              try {
                const sessionData = JSON.parse(e.target.result);
                this.sessionManager.importSession(sessionData);
                this.populateSessionList();
                this.pluginAPI.showNotification('Session imported!', 'success');
              } catch (error) {
                this.pluginAPI.showNotification('Failed to import session', 'error');
              }
            };
            reader.readAsText(file);
          }
        };
        input.click();
      });
    }
  }

  // Cloud Sync UI Helpers
  showCloudSyncManager() {
    const syncModal = this.pluginAPI.createModal(
      'Cloud Sync Manager',
      `
            <div class="cloud-sync-manager">
                <div class="sync-status">
                    <h4>Sync Status: <span id="sync-status">${this.cloudSyncManager.syncStatus}</span></h4>
                    <p>Last sync: <span id="last-sync">${this.cloudSyncManager.lastSync || 'Never'}</span></p>
                    <p>Provider: <span id="current-provider">${this.cloudSyncManager.currentProvider || 'None'}</span></p>
                </div>
                
                <div class="sync-providers">
                    <h4>Connect to Cloud Provider</h4>
                    <select id="provider-select">
                        <option value="">Select Provider</option>
                        <option value="github">GitHub</option>
                        <option value="dropbox">Dropbox</option>
                        <option value="custom">Custom Endpoint</option>
                    </select>
                    <div id="provider-config" class="provider-config hidden"></div>
                </div>
                
                <div class="sync-actions">
                    <button id="connect-btn" class="btn btn-primary">Connect</button>
                    <button id="sync-up-btn" class="btn btn-secondary" disabled>Sync Up</button>
                    <button id="sync-down-btn" class="btn btn-secondary" disabled>Sync Down</button>
                    <button id="disconnect-btn" class="btn btn-danger" disabled>Disconnect</button>
                </div>
            </div>
        `,
      {
        footer: '<button class="btn btn-secondary close-modal">Close</button>',
      }
    );

    this.setupCloudSyncActions();
  }

  setupCloudSyncActions() {
    const providerSelect = document.getElementById('provider-select');
    const providerConfig = document.getElementById('provider-config');
    const connectBtn = document.getElementById('connect-btn');
    const syncUpBtn = document.getElementById('sync-up-btn');
    const syncDownBtn = document.getElementById('sync-down-btn');
    const disconnectBtn = document.getElementById('disconnect-btn');

    // Update UI based on current connection status
    if (this.cloudSyncManager.currentProvider) {
      syncUpBtn.disabled = false;
      syncDownBtn.disabled = false;
      disconnectBtn.disabled = false;
    }

    providerSelect.addEventListener('change', () => {
      const provider = providerSelect.value;
      providerConfig.classList.remove('hidden');

      if (provider === 'github') {
        providerConfig.innerHTML = `
                    <input type="text" id="github-token" placeholder="GitHub Personal Access Token" />
                    <input type="text" id="github-repo" placeholder="Repository (username/repo-name)" />
                    <input type="text" id="github-branch" placeholder="Branch (default: main)" value="main" />
                `;
      } else if (provider === 'dropbox') {
        providerConfig.innerHTML = `
                    <input type="text" id="dropbox-token" placeholder="Dropbox Access Token" />
                `;
      } else if (provider === 'custom') {
        providerConfig.innerHTML = `
                    <input type="url" id="custom-endpoint" placeholder="Custom Endpoint URL" />
                    <textarea id="custom-headers" placeholder="Headers (JSON format)" rows="3"></textarea>
                `;
      } else {
        providerConfig.classList.add('hidden');
      }
    });

    connectBtn.addEventListener('click', async () => {
      const provider = providerSelect.value;
      if (!provider) {
        this.pluginAPI.showNotification('Please select a provider', 'error');
        return;
      }

      let credentials = {};

      try {
        if (provider === 'github') {
          credentials = {
            token: document.getElementById('github-token').value,
            repo: document.getElementById('github-repo').value,
            branch: document.getElementById('github-branch').value || 'main',
          };
        } else if (provider === 'dropbox') {
          credentials = {
            accessToken: document.getElementById('dropbox-token').value,
          };
        } else if (provider === 'custom') {
          const headersText = document.getElementById('custom-headers').value;
          credentials = {
            endpoint: document.getElementById('custom-endpoint').value,
            headers: headersText ? JSON.parse(headersText) : {},
          };
        }

        await this.cloudSyncManager.connect(provider, credentials);

        syncUpBtn.disabled = false;
        syncDownBtn.disabled = false;
        disconnectBtn.disabled = false;

        document.getElementById('sync-status').textContent = 'connected';
        document.getElementById('current-provider').textContent = provider;

        this.pluginAPI.showNotification(`Connected to ${provider}!`, 'success');
      } catch (error) {
        this.pluginAPI.showNotification(`Connection failed: ${error.message}`, 'error');
      }
    });

    syncUpBtn.addEventListener('click', async () => {
      try {
        await this.cloudSyncManager.syncUp();
        document.getElementById('last-sync').textContent = new Date().toLocaleString();
      } catch (error) {
        // Error handling is done in cloudSyncManager
      }
    });

    syncDownBtn.addEventListener('click', async () => {
      try {
        await this.cloudSyncManager.syncDown();
        document.getElementById('last-sync').textContent = new Date().toLocaleString();
      } catch (error) {
        // Error handling is done in cloudSyncManager
      }
    });

    disconnectBtn.addEventListener('click', () => {
      this.cloudSyncManager.currentProvider = null;
      this.cloudSyncManager.syncStatus = 'disconnected';

      syncUpBtn.disabled = true;
      syncDownBtn.disabled = true;
      disconnectBtn.disabled = true;

      document.getElementById('sync-status').textContent = 'disconnected';
      document.getElementById('current-provider').textContent = 'None';

      this.pluginAPI.showNotification('Disconnected from cloud provider', 'info');
    });
  }
}

// Custom Plugin Development API
class PluginDevelopmentAPI {
  constructor(terminalManager) {
    this.terminalManager = terminalManager;
    this.eventBus = new EventTarget();
    this.registeredAPIs = new Map();
    this.setupPluginAPI();
  }

  setupPluginAPI() {
    // Expose API to plugins
    window.WarpPluginAPI = {
      // Core terminal access
      getTerminal: id => this.terminalManager.terminals.get(id),
      getActiveTerminal: () =>
        this.terminalManager.terminals.get(this.terminalManager.activeTerminalId),
      createTerminal: () => this.terminalManager.createNewTab(),

      // Command execution
      executeCommand: (command, terminalId) => this.executeCommand(command, terminalId),

      // UI manipulation
      showNotification: (message, type = 'info') =>
        this.terminalManager.pluginAPI.showNotification(message, type),
      addMenuItem: (label, callback) => this.addMenuItem(label, callback),
      addStatusBarItem: (id, content) => this.addStatusBarItem(id, content),

      // Theme and styling
      registerTheme: (name, theme) => this.registerTheme(name, theme),
      getCurrentTheme: () => this.terminalManager.themeManager.currentTheme,

      // Settings
      getSetting: key => this.terminalManager.settings[key],
      setSetting: (key, value) => this.setSetting(key, value),

      // Event system
      on: (event, callback) => this.eventBus.addEventListener(event, callback),
      off: (event, callback) => this.eventBus.removeEventListener(event, callback),
      emit: (event, data) => this.eventBus.dispatchEvent(new CustomEvent(event, { detail: data })),

      // Git integration
      getGitStatus: () => this.terminalManager.pluginManager.plugins.get('git')?.getStatus(),

      // File system
      readFile: path => this.readFile(path),
      writeFile: (path, content) => this.writeFile(path, content),

      // Plugin management
      registerHook: (event, callback) => this.registerHook(event, callback),
      triggerHook: (event, data) => this.triggerHook(event, data),
    };
  }

  async executeCommand(command, terminalId) {
    const terminal = terminalId
      ? this.terminalManager.terminals.get(terminalId)
      : this.terminalManager.terminals.get(this.terminalManager.activeTerminalId);

    if (terminal) {
      terminal.process.stdin.write(command + '\r\n');
      return true;
    }
    return false;
  }

  addMenuItem(label, callback) {
    const menuBar = document.querySelector('.menu-bar');
    if (menuBar) {
      const menuItem = document.createElement('button');
      menuItem.textContent = label;
      menuItem.className = 'menu-item';
      menuItem.addEventListener('click', callback);
      menuBar.appendChild(menuItem);
    }
  }

  addStatusBarItem(id, content) {
    const statusBar = document.querySelector('.status-bar');
    if (statusBar) {
      let statusItem = document.getElementById(`status-${id}`);
      if (!statusItem) {
        statusItem = document.createElement('span');
        statusItem.id = `status-${id}`;
        statusItem.className = 'status-item';
        statusBar.appendChild(statusItem);
      }
      statusItem.innerHTML = content;
    }
  }

  registerTheme(name, theme) {
    this.terminalManager.themeManager.themes[name] = theme;
    this.terminalManager.themeManager.updateThemeOptions();
  }

  setSetting(key, value) {
    this.terminalManager.settings[key] = value;
    this.terminalManager.saveSettings();
    this.eventBus.dispatchEvent(
      new CustomEvent('setting-changed', {
        detail: { key, value },
      })
    );
  }

  async readFile(path) {
    return new Promise((resolve, reject) => {
      const fs = require('fs');
      fs.readFile(path, 'utf8', (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  async writeFile(path, content) {
    return new Promise((resolve, reject) => {
      const fs = require('fs');
      fs.writeFile(path, content, 'utf8', err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  registerHook(event, callback) {
    if (!this.registeredAPIs.has(event)) {
      this.registeredAPIs.set(event, []);
    }
    this.registeredAPIs.get(event).push(callback);
  }

  async triggerHook(event, data) {
    const callbacks = this.registeredAPIs.get(event) || [];
    const results = [];

    for (const callback of callbacks) {
      try {
        const result = await callback(data);
        results.push(result);
      } catch (error) {
        console.error(`Hook ${event} failed:`, error);
      }
    }

    return results;
  }
}

// Natural Language Command Processor
class NaturalLanguageProcessor {
  constructor() {
    this.commandPatterns = [
      {
        pattern: /list all files/i,
        command: 'ls -la',
      },
      {
        pattern: /show me the current directory/i,
        command: 'pwd',
      },
      {
        pattern: /go to (.*)/i,
        command: match => `cd ${match[1]}`,
      },
      {
        pattern: /create directory (.*)/i,
        command: match => `mkdir ${match[1]}`,
      },
      {
        pattern: /delete file (.*)/i,
        command: match => `rm ${match[1]}`,
      },
      {
        pattern: /copy (.*) to (.*)/i,
        command: match => `cp ${match[1]} ${match[2]}`,
      },
      {
        pattern: /move (.*) to (.*)/i,
        command: match => `mv ${match[1]} ${match[2]}`,
      },
      {
        pattern: /search for (.*) in current directory/i,
        command: match => `find . -name "*${match[1]}*"`,
      },
      {
        pattern: /show git status/i,
        command: 'git status',
      },
      {
        pattern: /git add all changes/i,
        command: 'git add .',
      },
      {
        pattern: /commit with message "(.*)"/i,
        command: match => `git commit -m "${match[1]}"`,
      },
      {
        pattern: /push to remote/i,
        command: 'git push',
      },
      {
        pattern: /pull from remote/i,
        command: 'git pull',
      },
      {
        pattern: /install package (.*)/i,
        command: match => `npm install ${match[1]}`,
      },
      {
        pattern: /run script (.*)/i,
        command: match => `npm run ${match[1]}`,
      },
      {
        pattern: /show running processes/i,
        command: 'ps aux',
      },
      {
        pattern: /kill process (.*)/i,
        command: match => `kill ${match[1]}`,
      },
    ];
  }

  processNaturalLanguage(input) {
    for (const pattern of this.commandPatterns) {
      const match = input.match(pattern.pattern);
      if (match) {
        if (typeof pattern.command === 'function') {
          return pattern.command(match);
        } else {
          return pattern.command;
        }
      }
    }

    // If no pattern matches, try to use AI-like suggestions
    return this.generateSmartSuggestion(input);
  }

  generateSmartSuggestion(input) {
    const keywords = input.toLowerCase().split(' ');

    if (keywords.includes('file') || keywords.includes('files')) {
      return 'ls -la';
    }

    if (keywords.includes('directory') || keywords.includes('folder')) {
      if (keywords.includes('create') || keywords.includes('make')) {
        return 'mkdir ';
      }
      return 'pwd';
    }

    if (keywords.includes('git')) {
      return 'git status';
    }

    if (keywords.includes('install')) {
      return 'npm install ';
    }

    return null;
  }
}

// Advanced Git Workflows Integration
class AdvancedGitIntegration {
  constructor(terminalManager) {
    this.terminalManager = terminalManager;
    this.workflowTemplates = {
      'feature-branch': ['git checkout -b feature/{name}', 'git push -u origin feature/{name}'],
      hotfix: [
        'git checkout main',
        'git pull origin main',
        'git checkout -b hotfix/{name}',
        'git push -u origin hotfix/{name}',
      ],
      release: [
        'git checkout develop',
        'git pull origin develop',
        'git checkout -b release/{version}',
        'git push -u origin release/{version}',
      ],
      'pull-request-prep': ['git add .', 'git status', 'git commit -m "{message}"', 'git push'],
    };
  }

  async executeWorkflow(workflowName, parameters = {}) {
    const workflow = this.workflowTemplates[workflowName];
    if (!workflow) {
      throw new Error(`Unknown workflow: ${workflowName}`);
    }

    const commands = workflow.map(cmd => {
      let processedCmd = cmd;
      Object.keys(parameters).forEach(key => {
        processedCmd = processedCmd.replace(`{${key}}`, parameters[key]);
      });
      return processedCmd;
    });

    for (const command of commands) {
      await this.executeGitCommand(command);
      await this.delay(500); // Small delay between commands
    }
  }

  async executeGitCommand(command) {
    const activeTerminal = this.terminalManager.terminals.get(
      this.terminalManager.activeTerminalId
    );
    if (activeTerminal) {
      activeTerminal.process.stdin.write(command + '\r\n');
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getWorkflowTemplates() {
    return Object.keys(this.workflowTemplates);
  }
}

// Window controls event handlers
function setupWindowControls() {
  // Minimize button
  document.getElementById('minimize-btn').addEventListener('click', () => {
    ipcRenderer.send('window-minimize');
  });

  // Maximize button
  document.getElementById('maximize-btn').addEventListener('click', () => {
    ipcRenderer.send('window-maximize');
  });

  // Close button
  document.getElementById('close-btn').addEventListener('click', () => {
    ipcRenderer.send('window-close');
  });

  // Title bar drag region - simple implementation
  const titleBarDragRegion = document.querySelector('.title-bar-drag-region');
  if (titleBarDragRegion) {
    titleBarDragRegion.style.webkitAppRegion = 'drag';
  }

  // Make buttons non-draggable
  document.querySelectorAll('.title-bar-control, .menu-btn').forEach(btn => {
    btn.style.webkitAppRegion = 'no-drag';
  });

  // Enhanced UI toggle button
  const enhancedUIToggle = document.getElementById('enhanced-ui-toggle');
  if (enhancedUIToggle) {
    enhancedUIToggle.addEventListener('click', () => {
      toggleEnhancedUI();
    });
  }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupWindowControls();
    window.terminalManager = new TerminalManager();
    window.pluginDevAPI = new PluginDevelopmentAPI(window.terminalManager);
    window.nlProcessor = new NaturalLanguageProcessor();
    window.advancedGit = new AdvancedGitIntegration(window.terminalManager);

    // Initialize Multimodal Agent Manager after other components
    if (MultimodalAgentManager) {
      try {
        window.agentManager = new MultimodalAgentManager(window.terminalManager);
        console.log('🤖 Multimodal Agent Manager initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Multimodal Agent Manager:', error);
      }
    }
  });
} else {
  setupWindowControls();
  window.terminalManager = new TerminalManager();
  window.pluginDevAPI = new PluginDevelopmentAPI(window.terminalManager);
  window.nlProcessor = new NaturalLanguageProcessor();
  window.advancedGit = new AdvancedGitIntegration(window.terminalManager);
}

// Enhanced UI Toggle Function
function toggleEnhancedUI() {
  // Check if enhanced UI is available
  if (typeof window.initializeBeginnerFriendlyUI === 'function') {
    try {
      // Get current state
      const enhancedUIContainer = document.getElementById('enhanced-ui-container');

      if (enhancedUIContainer) {
        // Toggle visibility
        const isCurrentlyVisible = !enhancedUIContainer.classList.contains('hidden');

        if (isCurrentlyVisible) {
          enhancedUIContainer.classList.add('hidden');
          window.terminalManager?.pluginAPI?.showNotification('Enhanced UI disabled', 'info', 2000);
        } else {
          enhancedUIContainer.classList.remove('hidden');
          window.terminalManager?.pluginAPI?.showNotification(
            'Enhanced UI enabled',
            'success',
            2000
          );
        }
      } else {
        // Initialize enhanced UI for the first time
        window
          .initializeBeginnerFriendlyUI()
          .then(() => {
            window.terminalManager?.pluginAPI?.showNotification(
              'Enhanced Beginner-Friendly UI activated!',
              'success',
              3000
            );
          })
          .catch(error => {
            console.error('Failed to initialize enhanced UI:', error);
            window.terminalManager?.pluginAPI?.showNotification(
              'Failed to load Enhanced UI',
              'error',
              3000
            );
          });
      }
    } catch (error) {
      console.error('Error toggling enhanced UI:', error);
      window.terminalManager?.pluginAPI?.showNotification(
        'Enhanced UI toggle failed',
        'error',
        2000
      );
    }
  } else {
    // Enhanced UI not available
    window.terminalManager?.pluginAPI?.showNotification(
      'Enhanced UI not available. Please ensure integration-init.js is loaded.',
      'error',
      4000
    );
  }
}

// Add global keyboard shortcuts
document.addEventListener('keydown', e => {
  const manager = window.terminalManager;
  if (!manager) return;

  // Ctrl+Shift+T: New tab
  if (e.ctrlKey && e.shiftKey && e.key === 'T') {
    e.preventDefault();
    manager.createNewTab();
  }

  // Ctrl+Shift+W: Close tab
  if (e.ctrlKey && e.shiftKey && e.key === 'W') {
    e.preventDefault();
    manager.closeTab(manager.activeTerminalId);
  }

  // Ctrl+Tab: Next tab
  if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    manager.switchToNextTab();
  }

  // Ctrl+Shift+Tab: Previous tab
  if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
    e.preventDefault();
    manager.switchToPrevTab();
  }

  // Ctrl+,: Open settings
  if (e.ctrlKey && e.key === ',') {
    e.preventDefault();
    document.getElementById('settings-modal').classList.remove('hidden');
  }

  // Ctrl+F: Find/Search in terminal
  if (e.ctrlKey && e.key === 'f') {
    e.preventDefault();
    manager.showFindDialog();
  }

  // Ctrl+C: Enhanced copy (when text is selected)
  if (e.ctrlKey && e.key === 'c') {
    const activeTerminal = manager.terminals.get(manager.activeTerminalId);
    if (activeTerminal && activeTerminal.terminal.hasSelection()) {
      e.preventDefault();
      manager.copySelectedText();
    }
  }

  // Ctrl+V: Enhanced paste
  if (e.ctrlKey && e.key === 'v') {
    e.preventDefault();
    manager.pasteFromClipboard();
  }

  // Ctrl+Plus: Increase font size
  if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
    e.preventDefault();
    manager.increaseFontSize();
  }

  // Ctrl+Minus: Decrease font size
  if (e.ctrlKey && e.key === '-') {
    e.preventDefault();
    manager.decreaseFontSize();
  }

  // Ctrl+0: Reset font size
  if (e.ctrlKey && e.key === '0') {
    e.preventDefault();
    manager.resetFontSize();
  }

  // Ctrl+Shift+1-5: Theme quick switch
  if (e.ctrlKey && e.shiftKey && /^[1-5]$/.test(e.key)) {
    e.preventDefault();
    const themes = ['dark', 'light', 'solarized', 'monokai', 'mermaid'];
    const themeIndex = parseInt(e.key) - 1;
    if (themes[themeIndex]) {
      manager.switchTheme(themes[themeIndex]);
    }
  }

  // Escape: Close modals/dialogs
  if (e.key === 'Escape') {
    manager.closeActiveModals();
  }
});
