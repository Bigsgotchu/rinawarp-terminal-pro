/**
 * RinaWarp Terminal - AI Copilot UI
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

import AICopilotService from './ai-copilot-service.js';

class AICopilotUI {
  constructor() {
    this.copilotService = null;
    this.isVisible = false;
    this.isMinimized = false;
    this.currentSession = null;
    this.container = null;
    this.chatContainer = null;
    this.inputField = null;
    this.statusIndicator = null;
    this.conversationHistory = [];

    this.initialize();
  }

  async initialize() {
    // Initializing AI Copilot UI silently

    try {
      // Initialize the AI Copilot Service
      this.copilotService = new AICopilotService();

      // Setup event listeners
      this.setupCopilotServiceListeners();

      // Create UI components
      this.createCopilotUI();

      // Setup event handlers
      this.setupEventHandlers();

      // AI Copilot UI initialized successfully
    } catch (error) {
      // Failed to initialize AI Copilot UI - continuing
    }
  }

  setupCopilotServiceListeners() {
    this.copilotService.on('copilot-ready', () => {
      // Copilot service is ready
      this.updateStatus('ready', 'AI Copilot ready to assist');
      this.addSystemMessage("👋 Hello! I'm your AI Copilot. How can I help you today?");
    });

    this.copilotService.on('copilot-error', _error => {
      // Copilot service error - updating UI
      this.updateStatus('error', 'AI Copilot encountered an error');
      this.addSystemMessage('❌ Sorry, I encountered an error. Please try again.');
    });

    this.copilotService.on('provider-changed', change => {
      this.addSystemMessage(`🔄 Switched AI provider from ${change.from} to ${change.to}`);
    });
  }

  createCopilotUI() {
    // Create main container
    this.container = document.createElement('div');
    this.container.id = 'ai-copilot-ui';
    this.container.className = 'ai-copilot-ui hidden';

    this.container.innerHTML = `
      <div class="copilot-header">
        <div class="copilot-title">
          <span class="copilot-icon">🤖</span>
          <span class="copilot-title-text">AI Copilot</span>
          <span class="copilot-status" id="copilot-status">
            <span class="status-indicator" id="status-indicator"></span>
            <span class="status-text" id="status-text">Initializing...</span>
          </span>
        </div>
        <div class="copilot-controls">
          <button class="copilot-btn" id="copilot-minimize" title="Minimize">_</button>
          <button class="copilot-btn" id="copilot-settings" title="Settings">⚙️</button>
          <button class="copilot-btn" id="copilot-close" title="Close">×</button>
        </div>
      </div>
      
      <div class="copilot-content">
        <div class="copilot-chat-container" id="copilot-chat">
          <div class="chat-messages" id="chat-messages"></div>
        </div>
        
        <div class="copilot-input-container">
          <div class="input-wrapper">
            <textarea id="copilot-input" 
                     placeholder="Ask me anything about commands, errors, or terminal usage..." 
                     rows="2"></textarea>
            <div class="input-actions">
              <button class="action-btn" id="copilot-send" title="Send (Ctrl+Enter)">
                <span class="btn-icon">📤</span>
              </button>
              <button class="action-btn" id="copilot-clear" title="Clear conversation">
                <span class="btn-icon">🧹</span>
              </button>
              <button class="action-btn" id="copilot-provider" title="Switch AI Provider">
                <span class="btn-icon">🔄</span>
              </button>
            </div>
          </div>
          
          <div class="quick-actions">
            <button class="quick-action-btn" data-action="explain-last-error">
              <span class="qa-icon">❌</span>
              <span class="qa-text">Explain Last Error</span>
            </button>
            <button class="quick-action-btn" data-action="suggest-commands">
              <span class="qa-icon">💡</span>
              <span class="qa-text">Suggest Commands</span>
            </button>
            <button class="quick-action-btn" data-action="optimize-workflow">
              <span class="qa-icon">⚡</span>
              <span class="qa-text">Optimize Workflow</span>
            </button>
            <button class="quick-action-btn" data-action="security-check">
              <span class="qa-icon">🛡️</span>
              <span class="qa-text">Security Check</span>
            </button>
          </div>
        </div>
      </div>
      
      <div class="copilot-footer">
        <div class="provider-info">
          Provider: <span id="current-provider">Local AI</span>
        </div>
        <div class="conversation-stats">
          Messages: <span id="message-count">0</span>
        </div>
      </div>
    `;

    // Append to body
    document.body.appendChild(this.container);

    // Cache important elements
    this.chatContainer = document.getElementById('chat-messages');
    this.inputField = document.getElementById('copilot-input');
    this.statusIndicator = document.getElementById('status-indicator');
    this.statusText = document.getElementById('status-text');
  }

  setupEventHandlers() {
    // Header controls
    document.getElementById('copilot-minimize').addEventListener('click', () => this.minimize());
    document
      .getElementById('copilot-settings')
      .addEventListener('click', () => this.showSettings());
    document.getElementById('copilot-close').addEventListener('click', () => this.hide());

    // Input and send
    document.getElementById('copilot-send').addEventListener('click', () => this.sendMessage());
    document
      .getElementById('copilot-clear')
      .addEventListener('click', () => this.clearConversation());
    document
      .getElementById('copilot-provider')
      .addEventListener('click', () => this.showProviderSelector());

    // Input field events
    this.inputField.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    this.inputField.addEventListener('input', () => {
      this.inputField.style.height = 'auto';
      this.inputField.style.height = Math.min(this.inputField.scrollHeight, 120) + 'px';
    });

    // Quick actions
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        this.handleQuickAction(action);
      });
    });

    // Make draggable
    this.makeDraggable();
  }

  makeDraggable() {
    const header = this.container.querySelector('.copilot-header');
    let isDragging = false;
    const dragOffset = { x: 0, y: 0 };

    header.addEventListener('mousedown', e => {
      if (e.target.tagName === 'BUTTON') return; // Don't drag when clicking buttons

      isDragging = true;
      const rect = this.container.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;

      header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', e => {
      if (!isDragging) return;

      const x = e.clientX - dragOffset.x;
      const y = e.clientY - dragOffset.y;

      // Keep within viewport bounds
      const maxX = window.innerWidth - this.container.offsetWidth;
      const maxY = window.innerHeight - this.container.offsetHeight;

      const boundedX = Math.max(0, Math.min(x, maxX));
      const boundedY = Math.max(0, Math.min(y, maxY));

      this.container.style.left = boundedX + 'px';
      this.container.style.top = boundedY + 'px';
      this.container.style.right = 'auto';
      this.container.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = '';
      }
    });
  }

  async sendMessage() {
    const message = this.inputField.value.trim();
    if (!message) return;

    // Add user message to UI
    this.addUserMessage(message);

    // Clear input
    this.inputField.value = '';
    this.inputField.style.height = 'auto';

    // Show thinking indicator
    const thinkingElement = this.addThinkingIndicator();

    try {
      // Process with AI Copilot
      const response = await this.copilotService.processUserQuery(message);

      // Remove thinking indicator
      thinkingElement.remove();

      // Add AI response
      this.addAIMessage(response);
    } catch (error) {
      console.error('Error processing message:', error);
      thinkingElement.remove();
      this.addErrorMessage('Sorry, I encountered an error processing your request.');
    }

    // Update stats
    this.updateMessageCount();
  }

  addUserMessage(message) {
    const messageElement = this.createMessageElement('user', message);
    this.chatContainer.appendChild(messageElement);
    this.scrollToBottom();
  }

  addAIMessage(response) {
    const content = this.formatAIResponse(response);
    const messageElement = this.createMessageElement('ai', content);
    this.chatContainer.appendChild(messageElement);
    this.scrollToBottom();
  }

  addSystemMessage(message) {
    const messageElement = this.createMessageElement('system', message);
    this.chatContainer.appendChild(messageElement);
    this.scrollToBottom();
  }

  addErrorMessage(message) {
    const messageElement = this.createMessageElement('error', message);
    this.chatContainer.appendChild(messageElement);
    this.scrollToBottom();
  }

  addThinkingIndicator() {
    const thinkingElement = document.createElement('div');
    thinkingElement.className = 'message thinking';
    thinkingElement.innerHTML = `
      <div class="message-content">
        <div class="thinking-dots">
          <span></span><span></span><span></span>
        </div>
        <span class="thinking-text">AI Copilot is thinking...</span>
      </div>
    `;
    this.chatContainer.appendChild(thinkingElement);
    this.scrollToBottom();
    return thinkingElement;
  }

  createMessageElement(type, content) {
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;

    const timestamp = new Date().toLocaleTimeString();
    const icon = this.getMessageIcon(type);

    messageElement.innerHTML = `
      <div class="message-header">
        <span class="message-icon">${icon}</span>
        <span class="message-sender">${this.getMessageSender(type)}</span>
        <span class="message-time">${timestamp}</span>
      </div>
      <div class="message-content">${content}</div>
    `;

    return messageElement;
  }

  formatAIResponse(response) {
    let content = '';

    // Add personality flavor if available
    if (response.personality_flavor) {
      content += `<div class="response-flavor">${response.personality_flavor}</div>`;
    }

    // Add main explanation
    if (response.explanation) {
      content += `<div class="response-explanation">${response.explanation}</div>`;
    }

    // Add suggestions if available
    if (response.suggestions && response.suggestions.length > 0) {
      content += '<div class="response-section"><h4>💡 Suggestions:</h4><ul>';
      response.suggestions.forEach(suggestion => {
        content += `<li>${suggestion}</li>`;
      });
      content += '</ul></div>';
    }

    // Add alternatives if available
    if (response.alternatives && response.alternatives.length > 0) {
      content += '<div class="response-section"><h4>🔄 Alternatives:</h4><ul>';
      response.alternatives.forEach(alternative => {
        if (typeof alternative === 'object') {
          content += `<li><strong>${alternative.command}</strong> - ${alternative.reason}</li>`;
        } else {
          content += `<li>${alternative}</li>`;
        }
      });
      content += '</ul></div>';
    }

    // Add best practices if available
    if (response.best_practices && response.best_practices.length > 0) {
      content += '<div class="response-section"><h4>📋 Best Practices:</h4><ul>';
      response.best_practices.forEach(practice => {
        content += `<li>${practice}</li>`;
      });
      content += '</ul></div>';
    }

    // Add safety analysis if available
    if (
      response.safety_analysis &&
      response.safety_analysis.warnings &&
      response.safety_analysis.warnings.length > 0
    ) {
      content += '<div class="response-section safety-warnings"><h4>⚠️ Safety Warnings:</h4><ul>';
      response.safety_analysis.warnings.forEach(warning => {
        content += `<li>${warning}</li>`;
      });
      content += '</ul></div>';
    }

    return content || "I'm here to help, but I don't have a specific response for that.";
  }

  getMessageIcon(type) {
    const icons = {
      user: '👤',
      ai: '🤖',
      system: 'ℹ️',
      error: '❌',
    };
    return icons[type] || '💬';
  }

  getMessageSender(type) {
    const senders = {
      user: 'You',
      ai: 'AI Copilot',
      system: 'System',
      error: 'Error',
    };
    return senders[type] || 'Unknown';
  }

  async handleQuickAction(action) {
    switch (action) {
      case 'explain-last-error':
        this.inputField.value = 'Can you explain the last error I encountered?';
        this.sendMessage();
        break;

      case 'suggest-commands':
        this.inputField.value = 'What commands would be useful in my current context?';
        this.sendMessage();
        break;

      case 'optimize-workflow':
        this.inputField.value = 'How can I optimize my current workflow?';
        this.sendMessage();
        break;

      case 'security-check':
        this.inputField.value = 'Can you check the security implications of my recent commands?';
        this.sendMessage();
        break;
    }
  }

  clearConversation() {
    this.chatContainer.innerHTML = '';
    this.copilotService.clearHistory();
    this.addSystemMessage('Conversation cleared. How can I help you?');
    this.updateMessageCount();
  }

  async showProviderSelector() {
    const providers = this.copilotService.getAvailableProviders();

    // Create simple provider selection modal
    const modal = document.createElement('div');
    modal.className = 'provider-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Select AI Provider</h3>
          <button class="modal-close">×</button>
        </div>
        <div class="modal-body">
          ${providers
            .map(
              provider => `
            <div class="provider-option ${provider.available ? '' : 'disabled'}">
              <label>
                <input type="radio" name="provider" value="${provider.name}" 
                       ${provider.name === this.copilotService.currentProvider ? 'checked' : ''}
                       ${provider.available ? '' : 'disabled'}>
                <span class="provider-name">${provider.name}</span>
                <span class="provider-description">${provider.description}</span>
                <span class="provider-status">${provider.available ? '✅ Available' : '❌ Unavailable'}</span>
              </label>
            </div>
          `
            )
            .join('')}
        </div>
        <div class="modal-footer">
          <button class="modal-btn cancel">Cancel</button>
          <button class="modal-btn confirm">Switch Provider</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle modal events
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.cancel').addEventListener('click', () => modal.remove());
    modal.querySelector('.confirm').addEventListener('click', async () => {
      const selected = modal.querySelector('input[name="provider"]:checked');
      if (selected && selected.value !== this.copilotService.currentProvider) {
        try {
          await this.copilotService.switchProvider(selected.value);
          this.updateProviderInfo(selected.value);
        } catch (error) {
          this.addErrorMessage(`Failed to switch provider: ${error.message}`);
        }
      }
      modal.remove();
    });
  }

  showSettings() {
    // TODO: Implement settings modal
    this.addSystemMessage('Settings panel coming soon!');
  }

  updateStatus(status, message) {
    const statusClasses = {
      ready: 'status-ready',
      working: 'status-working',
      error: 'status-error',
    };

    this.statusIndicator.className = `status-indicator ${statusClasses[status] || ''}`;
    this.statusText.textContent = message;
  }

  updateProviderInfo(providerName) {
    const providerElement = document.getElementById('current-provider');
    if (providerElement) {
      providerElement.textContent = providerName;
    }
  }

  updateMessageCount() {
    const messageCount = this.chatContainer.querySelectorAll('.message:not(.thinking)').length;
    const countElement = document.getElementById('message-count');
    if (countElement) {
      countElement.textContent = messageCount;
    }
  }

  scrollToBottom() {
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  // Public API methods
  show() {
    this.container.classList.remove('hidden');
    this.isVisible = true;
    this.inputField.focus();
  }

  hide() {
    this.container.classList.add('hidden');
    this.isVisible = false;
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  minimize() {
    this.container.classList.toggle('minimized');
    this.isMinimized = !this.isMinimized;
  }

  // Programmatic messaging
  async askAI(question, _context = {}) {
    this.show();
    this.inputField.value = question;
    await this.sendMessage();
  }

  // Integration methods for terminal events
  async analyzeCommand(command) {
    if (!this.copilotService) return;

    try {
      const analysis = await this.copilotService.analyzeCommand(command);

      if (analysis.safety.risk_level === 'high' || analysis.safety.risk_level === 'critical') {
        this.show();
        this.addSystemMessage(`⚠️ Safety warning for command: ${command}`);
        this.addAIMessage(analysis);
      }

      return analysis;
    } catch (error) {
      // Error analyzing command
      return null;
    }
  }

  async explainError(errorMessage, command = '') {
    if (!this.copilotService) return;

    this.show();

    try {
      const explanation = await this.copilotService.explainError(errorMessage, command);

      this.addSystemMessage(`Analyzing error: ${errorMessage.substring(0, 100)}...`);
      this.addAIMessage(explanation);

      return explanation;
    } catch (error) {
      // Error explaining error
      this.addErrorMessage('Failed to analyze the error.');
      return null;
    }
  }

  // Cleanup
  destroy() {
    if (this.copilotService) {
      this.copilotService.destroy();
    }

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    // AI Copilot UI destroyed
  }
}

export default AICopilotUI;
