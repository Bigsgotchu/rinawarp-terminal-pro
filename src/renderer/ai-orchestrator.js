/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal AI Orchestrator
 * Coordinates all AI components and provides unified intelligent terminal experience
 */

class RinaWarpAIOrchestrator {
  constructor() {
    this.components = new Map();
    this.eventBus = null;
    this.context = null;
    this.suggestions = [];
    this.activeFeatures = new Set();

    this.initialize();
  }

  async initialize() {
    console.log('🚀 Initializing RinaWarp AI Orchestrator...');

    // Initialize event bus
    this.eventBus = new EventBus();
    window.rinaWarp = window.rinaWarp || {};
    window.rinaWarp.eventBus = this.eventBus;

    // Initialize all AI components
    await this.initializeComponents();

    // Set up cross-component communication
    this.setupEventHandlers();

    // Initialize context tracking
    this.context = new ContextManager();

    console.log('✅ RinaWarp AI Orchestrator initialized');

    // Start the AI system
    this.startAISystem();
  }

  async initializeComponents() {
    try {
      // Enhanced Command Intelligence
      if (window.EnhancedCommandIntelligence) {
        this.components.set('commandIntelligence', new window.EnhancedCommandIntelligence());
        this.activeFeatures.add('enhanced-commands');
        console.log('✅ Command Intelligence loaded');
      }

      // Git Integration
      if (window.GitIntegration) {
        this.components.set('gitIntegration', new window.GitIntegration());
        this.activeFeatures.add('git-integration');
        console.log('✅ Git Integration loaded');
      }

      // Project Analyzer
      if (window.ProjectAnalyzer) {
        this.components.set('projectAnalyzer', new window.ProjectAnalyzer());
        this.activeFeatures.add('project-analysis');
        console.log('✅ Project Analyzer loaded');
      }

      // Debugger Integration
      if (window.DebuggerIntegration) {
        this.components.set('debuggerIntegration', new window.DebuggerIntegration());
        this.activeFeatures.add('debugging');
        console.log('✅ Debugger Integration loaded');
      }

      // Voice Control (if available)
      if (window.VoiceCommandSystem) {
        this.components.set('voiceControl', new window.VoiceCommandSystem());
        this.activeFeatures.add('voice-control');
        console.log('✅ Voice Control loaded');
      }
    } catch (error) {
      console.error('Error initializing AI components:', error);
    }
  }

  setupEventHandlers() {
    // Command analysis events
    this.eventBus.on('commandAnalysis', data => {
      this.handleCommandAnalysis(data);
    });

    // Directory change events
    this.eventBus.on('directoryChanged', data => {
      this.handleDirectoryChange(data);
    });

    // Git update events
    this.eventBus.on('gitUpdate', () => {
      this.handleGitUpdate();
    });

    // Debug events
    this.eventBus.on('debug:sessionStarted', data => {
      this.handleDebugSessionStart(data);
    });

    // Voice command events
    this.eventBus.on('voiceCommand', data => {
      this.handleVoiceCommand(data);
    });

    // Error events
    this.eventBus.on('error', data => {
      this.handleError(data);
    });
  }

  startAISystem() {
    // Display welcome message with available features
    this.displayWelcomeMessage();

    // Start periodic context updates
    this.startContextUpdates();

    // Initialize suggestion engine
    this.startSuggestionEngine();

    // Set up performance monitoring
    this.startPerformanceMonitoring();
  }

  displayWelcomeMessage() {
    const features = Array.from(this.activeFeatures).map(feature => {
      const icons = {
        'enhanced-commands': '🧠',
        'git-integration': '🔗',
        'project-analysis': '🔍',
        debugging: '🐛',
        'voice-control': '🎤',
      };

      const names = {
        'enhanced-commands': 'Enhanced Command Intelligence',
        'git-integration': 'Git Integration with Visual Diff',
        'project-analysis': 'Advanced Project Analysis',
        debugging: 'Integrated Debugging',
        'voice-control': 'Voice Control',
      };

      return `${icons[feature]} ${names[feature]}`;
    });

    const message = `
🚀 RinaWarp Terminal Enhanced AI System Active

Available Features:
${features.map(f => `  ${f}`).join('\n')}

Try these commands:
  • Type any command for real-time suggestions
  • Use "Hey Rina" for voice commands (if enabled)
  • Navigate directories for automatic project analysis
  • Git operations get intelligent suggestions
  • Debug your code with integrated debugging tools

Let's build something amazing! 🌊
`;

    this.displayMessage(message, 'info');
  }

  startContextUpdates() {
    // Update context every 2 seconds
    setInterval(async () => {
      try {
        await this.updateContext();
      } catch (error) {
        console.warn('Context update failed:', error);
      }
    }, 2000);
  }

  startSuggestionEngine() {
    // Generate suggestions every 5 seconds when terminal is active
    setInterval(async () => {
      if (this.isTerminalActive()) {
        await this.generateSuggestions();
      }
    }, 5000);
  }

  startPerformanceMonitoring() {
    // Monitor AI system performance
    setInterval(() => {
      this.monitorPerformance();
    }, 10000);
  }

  async updateContext() {
    if (this.components.has('commandIntelligence')) {
      const commandIntel = this.components.get('commandIntelligence');
      this.context.currentDirectory = await commandIntel.getCurrentDirectory();
      this.context.directoryContext = await commandIntel.getCurrentContext();
    }

    if (this.components.has('gitIntegration')) {
      const gitIntegration = this.components.get('gitIntegration');
      if (await gitIntegration.isGitRepository(this.context.currentDirectory)) {
        this.context.gitStatus = await gitIntegration.getEnhancedStatus(
          this.context.currentDirectory
        );
      }
    }

    if (this.components.has('projectAnalyzer')) {
      const projectAnalyzer = this.components.get('projectAnalyzer');
      this.context.projectType = await projectAnalyzer.detectProjectType(
        this.context.currentDirectory
      );
      this.context.projectAnalysis = await projectAnalyzer.analyzeProject(
        this.context.currentDirectory
      );
    }
  }

  async generateSuggestions() {
    this.suggestions = [];

    // Get suggestions from all components
    if (this.components.has('commandIntelligence')) {
      const commandIntel = this.components.get('commandIntelligence');
      const commandSuggestions = await commandIntel.analyzeCommandInRealTime('');
      this.suggestions.push(
        ...commandSuggestions.suggestions.map(s => ({ ...s, source: 'command' }))
      );
    }

    if (this.components.has('gitIntegration') && this.context.gitStatus) {
      const gitSuggestions = await this.generateGitSuggestions();
      this.suggestions.push(...gitSuggestions);
    }

    if (this.components.has('projectAnalyzer') && this.context.projectAnalysis) {
      const projectSuggestions = this.generateProjectSuggestions();
      this.suggestions.push(...projectSuggestions);
    }

    // Emit suggestions update
    this.eventBus.emit('suggestionsUpdated', this.suggestions);
  }

  async generateGitSuggestions() {
    const suggestions = [];
    const gitStatus = this.context.gitStatus;

    if (!gitStatus.isClean) {
      suggestions.push({
        type: 'git-status',
        text: 'git status',
        description: 'Check what files have changed',
        priority: 'high',
        source: 'git',
      });

      if (gitStatus.files.modified.length > 0) {
        suggestions.push({
          type: 'git-add',
          text: 'git add .',
          description: `Stage ${gitStatus.files.modified.length} modified files`,
          priority: 'medium',
          source: 'git',
        });
      }

      if (gitStatus.files.staged.length > 0) {
        suggestions.push({
          type: 'git-commit',
          text: 'git commit -m "Update files"',
          description: `Commit ${gitStatus.files.staged.length} staged files`,
          priority: 'high',
          source: 'git',
        });
      }
    }

    if (gitStatus.behind > 0) {
      suggestions.push({
        type: 'git-pull',
        text: 'git pull',
        description: `Pull ${gitStatus.behind} commits from remote`,
        priority: 'high',
        source: 'git',
      });
    }

    if (gitStatus.ahead > 0) {
      suggestions.push({
        type: 'git-push',
        text: 'git push',
        description: `Push ${gitStatus.ahead} commits to remote`,
        priority: 'medium',
        source: 'git',
      });
    }

    return suggestions;
  }

  generateProjectSuggestions() {
    const suggestions = [];
    const analysis = this.context.projectAnalysis;

    if (!analysis) return suggestions;

    // Add suggestions based on project recommendations
    analysis.recommendations.forEach(rec => {
      suggestions.push({
        type: 'project-improvement',
        text: rec.suggestion,
        description: rec.message,
        priority: rec.priority,
        source: 'project',
      });
    });

    // Add build/run suggestions based on project type
    const projectType = this.context.projectType;
    const buildCommands = {
      node: ['npm install', 'npm run dev', 'npm test'],
      python: ['pip install -r requirements.txt', 'python main.py', 'pytest'],
      rust: ['cargo build', 'cargo run', 'cargo test'],
      go: ['go mod tidy', 'go run main.go', 'go test'],
      react: ['npm start', 'npm run build', 'npm test'],
      vue: ['npm run serve', 'npm run build', 'npm run test'],
    };

    if (buildCommands[projectType]) {
      buildCommands[projectType].forEach(cmd => {
        suggestions.push({
          type: 'project-command',
          text: cmd,
          description: `Run ${cmd} for ${projectType} project`,
          priority: 'medium',
          source: 'project',
        });
      });
    }

    return suggestions;
  }

  // Event Handlers
  async handleCommandAnalysis(data) {
    const { suggestions, warnings, tips } = data;

    // Display warnings if any
    if (warnings && warnings.length > 0) {
      warnings.forEach(warning => {
        this.displayMessage(warning.message, 'warning');
      });
    }

    // Display tips if any
    if (tips && tips.length > 0) {
      tips.forEach(tip => {
        this.displayMessage(tip.message, 'tip');
      });
    }

    // Update suggestions panel
    this.updateSuggestionsPanel(suggestions);
  }

  async handleDirectoryChange(data) {
    const { newDir, context, suggestions } = data;

    this.displayMessage(`📂 Directory changed to: ${newDir}`, 'info');

    // Analyze new directory
    if (context.projectType && context.projectType !== 'unknown') {
      this.displayMessage(`🔍 Detected ${context.projectType} project`, 'info');
    }

    if (context.isGitRepo) {
      this.displayMessage(`🔗 Git repository detected (${context.gitBranch})`, 'info');
    }

    // Show context-specific suggestions
    if (suggestions && suggestions.length > 0) {
      this.displayMessage(
        `💡 ${suggestions.length} suggestions available for this directory`,
        'info'
      );
    }
  }

  async handleGitUpdate() {
    // Refresh git status
    if (this.components.has('gitIntegration')) {
      const gitIntegration = this.components.get('gitIntegration');
      if (this.context.currentDirectory) {
        this.context.gitStatus = await gitIntegration.getEnhancedStatus(
          this.context.currentDirectory
        );
      }
    }
  }

  async handleDebugSessionStart(data) {
    const { sessionId } = data;
    this.displayMessage(`🐛 Debug session started: ${sessionId}`, 'info');

    // Show debugging suggestions
    if (this.components.has('debuggerIntegration')) {
      const debuggerIntegration = this.components.get('debuggerIntegration');
      const debugSuggestions = debuggerIntegration.getDebuggingSuggestions(sessionId);

      debugSuggestions.forEach(suggestion => {
        this.displayMessage(`🔧 ${suggestion.message}`, 'tip');
      });
    }
  }

  async handleVoiceCommand(data) {
    const { command, confidence } = data;

    if (confidence > 0.7) {
      this.displayMessage(`🎤 Voice command recognized: "${command}"`, 'info');

      // Execute the command through the command intelligence system
      if (this.components.has('commandIntelligence')) {
        const commandIntel = this.components.get('commandIntelligence');
        try {
          const result = await commandIntel.executeCommandEnhanced(command);
          this.displayCommandResult(result);
        } catch (error) {
          this.handleError({ error, context: { command, source: 'voice' } });
        }
      }
    } else {
      this.displayMessage(
        `🎤 Voice command unclear (${Math.round(confidence * 100)}% confidence). Please try again.`,
        'warning'
      );
    }
  }

  async handleError(data) {
    const { error, context } = data;

    // Analyze error if debugger integration is available
    if (this.components.has('debuggerIntegration')) {
      const debuggerIntegration = this.components.get('debuggerIntegration');
      const analysis = await debuggerIntegration.analyzeError(error, context);

      this.displayMessage(`❌ Error: ${error.message}`, 'error');

      if (analysis.suggestions.length > 0) {
        this.displayMessage('💡 Suggestions:', 'info');
        analysis.suggestions.forEach(suggestion => {
          this.displayMessage(`  • ${suggestion}`, 'tip');
        });
      }

      if (analysis.quickFixes.length > 0) {
        this.displayMessage('🔧 Quick fixes:', 'info');
        analysis.quickFixes.forEach(fix => {
          this.displayMessage(`  • ${fix}`, 'tip');
        });
      }
    } else {
      this.displayMessage(`❌ Error: ${error.message}`, 'error');
    }
  }

  // UI Methods
  displayMessage(message, type = 'info') {
    const colors = {
      info: '#00AAFF',
      warning: '#FFA500',
      error: '#FF1493',
      tip: '#00FF88',
      success: '#00FF00',
    };

    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      tip: '💡',
      success: '✅',
    };

    // Create message element
    const messageElement = document.createElement('div');
    messageElement.style.cssText = `
      color: ${colors[type]};
      background: rgba(${this.hexToRgb(colors[type])}, 0.1);
      border-left: 3px solid ${colors[type]};
      padding: 10px;
      margin: 5px 0;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      animation: fadeIn 0.3s ease-in;
    `;

    messageElement.innerHTML = `${icons[type]} ${message}`;

    // Add to messages container (create if doesn't exist)
    let messagesContainer = document.getElementById('rina-messages');
    if (!messagesContainer) {
      messagesContainer = document.createElement('div');
      messagesContainer.id = 'rina-messages';
      messagesContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 400px;
        max-height: 500px;
        overflow-y: auto;
        z-index: 10000;
        pointer-events: none;
      `;
      document.body.appendChild(messagesContainer);
    }

    messagesContainer.appendChild(messageElement);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
          if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
          }
        }, 300);
      }
    }, 10000);
  }

  displayCommandResult(result) {
    const { analysis, suggestions } = result;

    if (result.success) {
      this.displayMessage('✅ Command executed successfully', 'success');
    } else {
      this.displayMessage(`❌ Command failed: ${result.error}`, 'error');
    }

    if (analysis && analysis.estimatedTime) {
      this.displayMessage(
        `⏱️ Execution time: ${result.executionTime}ms (estimated: ${analysis.estimatedTime}ms)`,
        'info'
      );
    }

    if (suggestions && suggestions.length > 0) {
      this.displayMessage('💡 Next suggested commands:', 'info');
      suggestions.slice(0, 3).forEach(suggestion => {
        this.displayMessage(`  • ${suggestion.text}: ${suggestion.description}`, 'tip');
      });
    }
  }

  updateSuggestionsPanel(suggestions) {
    if (!suggestions || suggestions.length === 0) return;

    // Create or update suggestions panel
    let panel = document.getElementById('rina-suggestions-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'rina-suggestions-panel';
      panel.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 350px;
        background: rgba(0, 0, 0, 0.9);
        border: 1px solid #00AAFF;
        border-radius: 10px;
        padding: 15px;
        color: white;
        font-family: monospace;
        font-size: 12px;
        z-index: 9999;
        max-height: 300px;
        overflow-y: auto;
      `;
      document.body.appendChild(panel);
    }

    // Update panel content
    panel.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #00AAFF;">🧠 AI Suggestions</h3>
      ${suggestions
    .slice(0, 5)
    .map(
      suggestion => `
        <div style="
          background: rgba(0, 170, 255, 0.1);
          border-left: 2px solid #00AAFF;
          padding: 5px;
          margin: 5px 0;
          cursor: pointer;
          border-radius: 3px;
        " onclick="navigator.clipboard.writeText('${suggestion.text.replace(/'/g, '\\\'')}')">
          <strong>${suggestion.text}</strong><br>
          <small style="color: #ccc;">${suggestion.description}</small>
        </div>
      `
    )
    .join('')}
      <div style="text-align: center; margin-top: 10px; font-size: 10px; color: #888;">
        Click any suggestion to copy to clipboard
      </div>
    `;
  }

  // Utility Methods
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 170, 255';
  }

  isTerminalActive() {
    // Check if terminal is focused/active
    return (
      document.hasFocus() &&
      (document.activeElement === document.getElementById('terminal') ||
        document.activeElement === document.querySelector('.xterm-helper-textarea'))
    );
  }

  monitorPerformance() {
    const memoryInfo = performance.memory || {};
    const componentCount = this.components.size;
    const activeFeatures = this.activeFeatures.size;

    console.log('🔍 RinaWarp AI Performance:', {
      components: componentCount,
      activeFeatures,
      memoryUsed: Math.round((memoryInfo.usedJSHeapSize || 0) / 1024 / 1024) + 'MB',
      suggestions: this.suggestions.length,
      uptime: Math.round((Date.now() - this.startTime) / 1000) + 's',
    });
  }

  // Public API
  async executeCommand(command, options = {}) {
    if (this.components.has('commandIntelligence')) {
      const commandIntel = this.components.get('commandIntelligence');
      return await commandIntel.executeCommandEnhanced(command, options);
    }

    throw new Error(new Error('Command execution not available'));
  }

  async analyzeProject(directory) {
    if (this.components.has('projectAnalyzer')) {
      const projectAnalyzer = this.components.get('projectAnalyzer');
      return await projectAnalyzer.analyzeProject(directory);
    }

    return null;
  }

  async startDebugSession(projectType, options) {
    if (this.components.has('debuggerIntegration')) {
      const debuggerIntegration = this.components.get('debuggerIntegration');
      return await debuggerIntegration.startDebugSession(projectType, options);
    }

    throw new Error(new Error('Debugging not available'));
  }

  getCurrentSuggestions() {
    return this.suggestions;
  }

  getAvailableFeatures() {
    return Array.from(this.activeFeatures);
  }

  getSystemStatus() {
    return {
      initialized: this.components.size > 0,
      components: Array.from(this.components.keys()),
      features: Array.from(this.activeFeatures),
      suggestions: this.suggestions.length,
      context: this.context,
    };
  }
}

/**
 * Context Manager for tracking terminal state
 */
class ContextManager {
  constructor() {
    this.currentDirectory = null;
    this.directoryContext = null;
    this.gitStatus = null;
    this.projectType = null;
    this.projectAnalysis = null;
    this.lastCommand = null;
    this.commandHistory = [];
    this.activeProcesses = [];
  }

  updateCommand(command) {
    this.lastCommand = command;
    this.commandHistory.push({
      command,
      timestamp: Date.now(),
      directory: this.currentDirectory,
    });

    // Keep only last 100 commands
    if (this.commandHistory.length > 100) {
      this.commandHistory = this.commandHistory.slice(-100);
    }
  }

  getRecentCommands(count = 10) {
    return this.commandHistory.slice(-count);
  }
}

/**
 * Simple Event Bus for component communication
 */
class EventBus {
  constructor() {
    this.events = new Map();
  }

  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
  }

  off(event, callback) {
    if (this.events.has(event)) {
      const callbacks = this.events.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Event handler error for ${event}:`, error);
        }
      });
    }
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(20px); }
  }
`;
document.head.appendChild(style);

// Initialize the AI system when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.rinaWarpAI = new RinaWarpAIOrchestrator();
  });
} else {
  window.rinaWarpAI = new RinaWarpAIOrchestrator();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RinaWarpAIOrchestrator, ContextManager, EventBus };
} else {
  window.RinaWarpAIOrchestrator = RinaWarpAIOrchestrator;
  window.ContextManager = ContextManager;
  window.EventBus = EventBus;
}
