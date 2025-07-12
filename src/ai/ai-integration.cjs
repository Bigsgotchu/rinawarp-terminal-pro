/**
 * AI Integration for RinaWarp Terminal
 * Provides AI-powered command suggestions, code completion, and intelligent help
 */

// Remove unused import to fix linting
// const { ipcRenderer } = require('electron');

class AIIntegration {
  constructor(terminal) {
    this.terminal = terminal;
    this.aiEnabled = true; // AI features toggle
    this.suggestionTimeout = null;

    this.setupCommandSuggestions();
    this.setupAIHelp();
    this.addAIStatus();
  }

  enableAI(enable = true) {
    this.aiEnabled = enable;
    const statusElement = document.getElementById('ai-status');
    statusElement.textContent = this.aiEnabled ? 'AI: ON' : 'AI: OFF';
  }

  setupCommandSuggestions() {
    if (!this.terminal) return;

    // If AI is enabled, suggest commands as you type
    this.terminal.onData(data => {
      if (!this.aiEnabled || !data.trim()) return;

      // Debounce suggestions
      clearTimeout(this.suggestionTimeout);
      this.suggestionTimeout = setTimeout(() => {
        this.fetchAILineSuggestions(data.trim());
      }, 500);
    });
  }

  fetchAILineSuggestions(line) {
    // Simulate AI suggestion retrieval
    console.log(`AI Suggestion for: ${line}`);
  }

  setupAIHelp() {
    // AI-powered help - listens for specific keywords
    document.addEventListener('keydown', e => {
      if (e.key === 'F1') {
        // F1 for AI help
        e.preventDefault();
        this.showAIHelp();
      }
    });
  }

  showAIHelp() {
    // Simulate AI help
    alert('AI Help: Type commands and AI will assist you!');
  }

  addAIStatus() {
    // Add AI status indicator
    const statusBar = document.querySelector('.status-bar');
    if (statusBar) {
      const statusElement = document.createElement('div');
      statusElement.id = 'ai-status';
      statusElement.textContent = `AI: ${this.aiEnabled ? 'ON' : 'OFF'}`;
      statusElement.style.cssText = `
        margin-left: 10px;
        color: var(--accent-color, #00ff88);
        font-weight: bold;
      `;
      statusBar.appendChild(statusElement);
    }
  }
}

module.exports = AIIntegration;
