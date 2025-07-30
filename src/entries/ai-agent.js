/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * AI Agent Entry Point
 * Loads and initializes Agent Mode for RinaWarp Terminal
 */

import AgentModeIntegration from '../renderer/agent-mode-integration.js';

class AIAgentFeature {
  constructor(terminal) {
    this.terminal = terminal;
    this.agentIntegration = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('🤖 Initializing AI Agent Feature...');

      // Initialize Agent Mode Integration
      this.agentIntegration = new AgentModeIntegration(this.terminal);

      // Wait for initialization to complete
      await new Promise(resolve => {
        const checkInit = () => {
          if (this.agentIntegration.isInitialized) {
            resolve();
          } else {
            setTimeout(checkInit, 100);
          }
        };
        checkInit();
      });

      this.isInitialized = true;
      console.log('✅ AI Agent Feature initialized successfully');

      // Notify terminal that agent is ready
      this.terminal.emit('agent:ready', {
        feature: 'ai-agent',
        integration: this.agentIntegration,
      });

      return this;
    } catch (error) {
      console.error('❌ Failed to initialize AI Agent Feature:', error);
      throw new Error(error);
    }
  }

  async cleanup() {
    if (this.agentIntegration && this.agentIntegration.isAgentActive()) {
      await this.agentIntegration.getAgentMode().stop();
    }
    this.isInitialized = false;
  }

  getCommands() {
    return [
      {
        name: 'agent',
        description: 'AI agent commands for terminal assistance',
        usage: 'agent [start|stop|status|help|<message>]',
        category: 'ai',
      },
      {
        name: 'rina',
        description: 'Direct chat with Rina AI assistant',
        usage: 'rina <message>',
        category: 'ai',
      },
    ];
  }

  getFeatureInfo() {
    return {
      name: 'AI Agent',
      description: 'Intelligent terminal assistant with function calling capabilities',
      version: '1.0.0',
      status: this.isInitialized ? 'active' : 'inactive',
      capabilities: [
        'Natural language command execution',
        'File system operations',
        'Git repository management',
        'System monitoring',
        'Code analysis and debugging',
        'Project assistance',
      ],
    };
  }

  // Public API for other components
  isAgentActive() {
    return this.agentIntegration && this.agentIntegration.isAgentActive();
  }

  getAgentMode() {
    return this.agentIntegration ? this.agentIntegration.getAgentMode() : null;
  }

  async chatWithAgent(message, options = {}) {
    if (!this.agentIntegration) {
      throw new Error(new Error('Agent integration not initialized'));
    }

    return await this.agentIntegration.chatWithAgent(message);
  }

  async executeWithAgent(command, explanation = '') {
    if (!this.agentIntegration) {
      throw new Error(new Error('Agent integration not initialized'));
    }

    return await this.agentIntegration.executeWithAgent(command, explanation);
  }
}

export default AIAgentFeature;
