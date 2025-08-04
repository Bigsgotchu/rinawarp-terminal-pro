/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * AI Assistant Entry Point
 * Lazy-loaded AI functionality for RinaWarp Terminal
 */

import { TerminalAIAssistant } from '@/ai/terminal-ai-assistant.js';
import { AIContextEngine } from '@/renderer/ai-context-engine.js';
import { AICopilotService } from '@/renderer/ai-copilot-service.js';

class RinaWarpAIFeature {
  constructor(terminal) {
    this.terminal = terminal;
    this.aiAssistant = null;
    this.contextEngine = null;
    this.copilotService = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize AI components
      this.contextEngine = new AIContextEngine();
      this.aiAssistant = new TerminalAIAssistant(this.terminal, this.contextEngine);
      this.copilotService = new AICopilotService(this.terminal);

      // Set up AI commands
      this.setupCommands();

      // Initialize components
      await this.contextEngine.initialize();
      await this.aiAssistant.initialize();
      await this.copilotService.initialize();

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize AI Assistant:', error);
      throw new Error(new Error(error));
    }
  }

  setupCommands() {
    this.terminal.addCommand('ai', input => this.handleAIQuery(input));
    this.terminal.addCommand('ask', input => this.handleAIQuery(input));
    this.terminal.addCommand('suggest', () => this.showSuggestions());
    this.terminal.addCommand('ai-help', () => this.showAIHelp());
  }

  async handleAIQuery(input) {
    if (!input || input.trim() === '') {
      this.terminal.writeLine('Usage: ai \u003cyour question\u003e');
      return;
    }

    try {
      this.terminal.showLoadingIndicator('🤖 AI thinking...');
      const response = await this.aiAssistant.processQuery(input);
      this.terminal.hideLoadingIndicator();

      this.terminal.writeLine(`\\n🤖 AI: ${response}`);
    } catch (error) {
      this.terminal.hideLoadingIndicator();
      this.terminal.writeError(`AI Error: ${error.message}`);
    }
  }

  async showSuggestions() {
    const context = this.contextEngine.getCurrentContext();
    const suggestions = await this.aiAssistant.getSuggestions(context);

    this.terminal.writeLine('\\n💡 AI Suggestions:');
    suggestions.forEach((suggestion, index) => {
      this.terminal.writeLine(`  ${index + 1}. ${suggestion}`);
    });
  }

  showAIHelp() {
    this.terminal.writeLine(`
🤖 AI Assistant Commands:
=======================
  ai \u003cquestion\u003e      - Ask the AI assistant
  ask \u003cquestion\u003e     - Alias for 'ai'
  suggest             - Get AI suggestions for current context
  ai-help             - Show this help message

Examples:
  ai how do I list files?
  ai explain this error
  suggest
    `);
  }

  async cleanup() {
    if (this.aiAssistant) {
      await this.aiAssistant.cleanup();
    }
    if (this.contextEngine) {
      await this.contextEngine.cleanup();
    }
    if (this.copilotService) {
      await this.copilotService.cleanup();
    }
    this.initialized = false;
  }

  // Public API
  getAIAssistant() {
    return this.aiAssistant;
  }

  getContextEngine() {
    return this.contextEngine;
  }

  getCopilotService() {
    return this.copilotService;
  }
}

export default RinaWarpAIFeature;
