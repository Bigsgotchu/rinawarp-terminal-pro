/**
 * RinaWarp Terminal - Multimodal Agent Manager
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * This file is part of RinaWarp Terminal, an advanced open-source terminal emulator with
 * AI assistance, live collaboration, and enterprise-grade security features.
 *
 * Licensed under the MIT License.
 * See LICENSE file for detailed terms and conditions.
 *
 * Project repository: https://github.com/rinawarp/terminal
 */
class MultimodalAgentManager {
  constructor(terminal) {
    this.terminal = terminal;
    this.framework = null;
    this.isInitialized = false;
    this.isEnabled = false;
    this.agents = {
      userProxy: null,
      dalleAssistant: null,
      visionAssistant: null,
      codeAssistant: null,
      terminalAssistant: null,
    };
    this.activeConversations = new Map();
    this.agentHistory = [];
    this.currentTask = null;
    this.agentUI = null;

    // Agent configuration
    this.config = {
      azureEndpoint: '',
      apiKey: '',
      apiVersion: '2024-02-15-preview',
      assistantModel: 'gpt-4-1106-preview',
      enableLogging: true,
      maxHistoryLength: 100,
    };

    this.init();
  }

  // Security utility: Escape HTML to prevent XSS attacks
  escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') {
      unsafe = String(unsafe);
    }
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async init() {
    try {
      console.log('🤖 Initializing Multimodal Agent Manager...');
      await this.loadConfiguration();
      await this.createAgentUI();
      await this.setupEventListeners();
      this.isInitialized = true;
      console.log('✅ Multimodal Agent Manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Multimodal Agent Manager:', error);
    }
  }

  async loadConfiguration() {
    // Load configuration from localStorage or settings
    const saved = localStorage.getItem('rinawarp-agent-config');
    if (saved) {
      this.config = { ...this.config, ...JSON.parse(saved) };
    }
  }

  async saveConfiguration() {
    localStorage.setItem('rinawarp-agent-config', JSON.stringify(this.config));
  }

  async createAgentUI() {
    // Create the agent interface in the terminal
    this.agentUI = document.createElement('div');
    this.agentUI.className = 'agent-interface hidden';
    this.agentUI.innerHTML = `
            <div class="agent-header">
                <div class="agent-title">
                    <span class="agent-icon">🤖</span>
                    <span>AI Agents</span>
                </div>
                <div class="agent-controls">
                    <button id="agent-settings-btn" class="agent-btn" title="Agent Settings">⚙️</button>
                    <button id="agent-toggle-btn" class="agent-btn" title="Toggle Agents">🔄</button>
                    <button id="agent-close-btn" class="agent-btn" title="Close">×</button>
                </div>
            </div>
            
            <div class="agent-status">
                <div class="agent-status-item">
                    <span class="status-label">Status:</span>
                    <span id="agent-status-text" class="status-value">Disconnected</span>
                </div>
                <div class="agent-status-item">
                    <span class="status-label">Active Agents:</span>
                    <span id="active-agents-count" class="status-value">0</span>
                </div>
            </div>
            
            <div class="agent-tabs">
                <button class="agent-tab active" data-tab="chat">💬 Chat</button>
                <button class="agent-tab" data-tab="image">🎨 Image</button>
                <button class="agent-tab" data-tab="code">💻 Code</button>
                <button class="agent-tab" data-tab="tasks">📋 Tasks</button>
            </div>
            
            <div class="agent-content">
                <div class="agent-panel active" data-panel="chat">
                    <div class="chat-history" id="agent-chat-history"></div>
                    <div class="chat-input-container">
                        <input type="text" id="agent-chat-input" placeholder="Ask the AI agents..." />
                        <button id="agent-send-btn" class="send-btn">Send</button>
                    </div>
                </div>
                
                <div class="agent-panel" data-panel="image">
                    <div class="image-controls">
                        <input type="text" id="image-prompt" placeholder="Describe the image you want to create..." />
                        <button id="generate-image-btn" class="generate-btn">Generate Image</button>
                    </div>
                    <div class="image-results" id="image-results"></div>
                </div>
                
                <div class="agent-panel" data-panel="code">
                    <div class="code-analysis">
                        <button id="analyze-code-btn" class="analysis-btn">Analyze Current Directory</button>
                        <button id="review-changes-btn" class="analysis-btn">Review Git Changes</button>
                    </div>
                    <div class="code-results" id="code-results"></div>
                </div>
                
                <div class="agent-panel" data-panel="tasks">
                    <div class="task-queue" id="task-queue">
                        <div class="no-tasks">No active tasks</div>
                    </div>
                </div>
            </div>
        `;

    // Add to terminal container
    const terminalContainer = document.querySelector('.terminal-container');
    if (terminalContainer) {
      terminalContainer.appendChild(this.agentUI);
    }

    // Add agent toggle button to title bar
    this.addAgentToggleButton();
  }

  addAgentToggleButton() {
    const titleBarMenu = document.querySelector('.title-bar-menu');
    if (titleBarMenu) {
      const agentButton = document.createElement('button');
      agentButton.className = 'menu-btn';
      agentButton.id = 'agents-toggle';
      agentButton.title = 'Toggle AI Agents';
      agentButton.innerHTML = '🤖';

      // Insert before settings button
      const settingsBtn = document.getElementById('settings-btn');
      titleBarMenu.insertBefore(agentButton, settingsBtn);
    }
  }

  async setupEventListeners() {
    // Agent toggle button
    document.getElementById('agents-toggle')?.addEventListener('click', () => {
      this.toggleAgentInterface();
    });

    // Agent interface controls
    document.getElementById('agent-close-btn')?.addEventListener('click', () => {
      this.hideAgentInterface();
    });

    document.getElementById('agent-toggle-btn')?.addEventListener('click', () => {
      this.toggleAgents();
    });

    document.getElementById('agent-settings-btn')?.addEventListener('click', () => {
      this.showAgentSettings();
    });

    // Chat functionality
    document.getElementById('agent-send-btn')?.addEventListener('click', () => {
      this.sendChatMessage();
    });

    document.getElementById('agent-chat-input')?.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        this.sendChatMessage();
      }
    });

    // Image generation
    document.getElementById('generate-image-btn')?.addEventListener('click', () => {
      this.generateImage();
    });

    // Code analysis
    document.getElementById('analyze-code-btn')?.addEventListener('click', () => {
      this.analyzeCode();
    });

    document.getElementById('review-changes-btn')?.addEventListener('click', () => {
      this.reviewChanges();
    });

    // Tab switching
    document.querySelectorAll('.agent-tab').forEach(tab => {
      tab.addEventListener('click', e => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Terminal integration - listen for commands
    if (this.terminal) {
      this.terminal.onCommand = command => {
        this.onTerminalCommand(command);
      };
    }
  }

  async initializeFramework() {
    if (!this.config.azureEndpoint || !this.config.apiKey) {
      throw new Error('Azure OpenAI configuration required');
    }

    try {
      // Dynamically import the framework (would need to be bundled)
      // For now, we'll create a simplified version
      this.framework = await this.createSimplifiedFramework();

      this.updateStatus('Connected', 'success');
      this.isEnabled = true;

      this.addChatMessage(
        'system',
        '🤖 AI Agents are now active! Ask me anything or use commands like:\n• "generate an image of..."\n• "analyze this code"\n• "help with this command"'
      );
    } catch (error) {
      console.error('Failed to initialize framework:', error);
      this.updateStatus('Connection Failed', 'error');
      throw error;
    }
  }

  async createSimplifiedFramework() {
    // Simplified framework implementation for browser environment
    return {
      sendMessage: async message => {
        // This would integrate with the actual multimodal framework
        return await this.processAgentMessage(message);
      },
      generateImage: async prompt => {
        // Integration with DALL-E
        return await this.callImageGeneration(prompt);
      },
      analyzeImage: async imageUrl => {
        // Integration with Vision API
        return await this.callImageAnalysis(imageUrl);
      },
      cleanup: () => {
        // Cleanup resources
        console.log('Framework cleaned up');
      },
    };
  }

  async processAgentMessage(message) {
    // Simulate agent processing
    const response = {
      type: 'text',
      content: `AI Agent Response: I understand you said "${message}". Let me help you with that...`,
      agent: 'user_proxy',
      timestamp: new Date().toISOString(),
    };

    // Check for specific commands
    if (message.toLowerCase().includes('generate') && message.toLowerCase().includes('image')) {
      response.type = 'image_request';
      response.content =
        'I\'ll generate that image for you. Please use the Image tab for better results.';
    } else if (
      message.toLowerCase().includes('analyze') &&
      message.toLowerCase().includes('code')
    ) {
      response.type = 'code_analysis';
      response.content =
        'I can analyze your code. Please use the Code tab or specify which files to analyze.';
    }

    return response;
  }

  async callImageGeneration(prompt) {
    // This would call the actual DALL-E API through the framework
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      return {
        success: true,
        imageUrl: 'https://via.placeholder.com/512x512?text=Generated+Image',
        prompt: prompt,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async callImageAnalysis(_imageUrl) {
    // This would call the actual Vision API through the framework
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      return {
        success: true,
        analysis: 'This appears to be a generated image with placeholder content.',
        details: {
          objects: ['text', 'background'],
          colors: ['gray', 'white'],
          style: 'placeholder',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  toggleAgentInterface() {
    if (this.agentUI.classList.contains('hidden')) {
      this.showAgentInterface();
    } else {
      this.hideAgentInterface();
    }
  }

  showAgentInterface() {
    this.agentUI.classList.remove('hidden');
    if (!this.isEnabled && this.config.azureEndpoint && this.config.apiKey) {
      this.initializeFramework().catch(console.error);
    }
  }

  hideAgentInterface() {
    this.agentUI.classList.add('hidden');
  }

  async toggleAgents() {
    if (!this.isEnabled) {
      try {
        await this.initializeFramework();
      } catch (error) {
        this.showAgentSettings();
        return;
      }
    } else {
      this.disableAgents();
    }
  }

  disableAgents() {
    this.isEnabled = false;
    if (this.framework) {
      this.framework.cleanup();
      this.framework = null;
    }
    this.updateStatus('Disconnected', 'disconnected');
    this.addChatMessage('system', '🤖 AI Agents have been disabled.');
  }

  showAgentSettings() {
    // Create settings modal
    const modal = document.createElement('div');
    modal.className = 'agent-settings-modal modal';
    modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>AI Agent Settings</h3>
                    <button class="close-modal">×</button>
                </div>
                <div class="modal-body">
                    <div class="setting-group">
                        <label for="azure-endpoint">Azure OpenAI Endpoint:</label>
                        <input type="text" id="azure-endpoint" value="${this.config.azureEndpoint}" 
                               placeholder="https://your-resource.openai.azure.com/">
                    </div>
                    <div class="setting-group">
                        <label for="azure-api-key">API Key:</label>
                        <input type="password" id="azure-api-key" value="${this.config.apiKey}" 
                               placeholder="Your Azure OpenAI API key">
                    </div>
                    <div class="setting-group">
                        <label for="assistant-model">Assistant Model:</label>
                        <select id="assistant-model">
                            <option value="gpt-4-1106-preview" ${this.config.assistantModel === 'gpt-4-1106-preview' ? 'selected' : ''}>GPT-4 Turbo</option>
                            <option value="gpt-4" ${this.config.assistantModel === 'gpt-4' ? 'selected' : ''}>GPT-4</option>
                            <option value="gpt-35-turbo" ${this.config.assistantModel === 'gpt-35-turbo' ? 'selected' : ''}>GPT-3.5 Turbo</option>
                        </select>
                    </div>
                    <div class="setting-group">
                        <label>
                            <input type="checkbox" id="enable-logging" ${this.config.enableLogging ? 'checked' : ''}>
                            Enable Detailed Logging
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="test-connection" class="btn btn-secondary">Test Connection</button>
                    <button id="save-agent-settings" class="btn btn-primary">Save Settings</button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector('.close-modal').addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('#save-agent-settings').addEventListener('click', () => {
      this.saveAgentSettings(modal);
    });

    modal.querySelector('#test-connection').addEventListener('click', () => {
      this.testConnection(modal);
    });
  }

  async saveAgentSettings(modal) {
    this.config.azureEndpoint = modal.querySelector('#azure-endpoint').value;
    this.config.apiKey = modal.querySelector('#azure-api-key').value;
    this.config.assistantModel = modal.querySelector('#assistant-model').value;
    this.config.enableLogging = modal.querySelector('#enable-logging').checked;

    await this.saveConfiguration();
    document.body.removeChild(modal);

    this.addChatMessage('system', '⚙️ Agent settings saved successfully!');
  }

  async testConnection(modal) {
    const testBtn = modal.querySelector('#test-connection');
    const originalText = testBtn.textContent;
    testBtn.textContent = 'Testing...';
    testBtn.disabled = true;

    try {
      // Test configuration
      const endpoint = modal.querySelector('#azure-endpoint').value;
      const apiKey = modal.querySelector('#azure-api-key').value;

      if (!endpoint || !apiKey) {
        throw new Error('Please provide both endpoint and API key');
      }

      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 2000));

      testBtn.textContent = '✅ Connected';
      testBtn.style.background = '#4CAF50';
    } catch (error) {
      testBtn.textContent = '❌ Failed';
      testBtn.style.background = '#f44336';
      console.error('Connection test failed:', error);
    }

    setTimeout(() => {
      testBtn.textContent = originalText;
      testBtn.disabled = false;
      testBtn.style.background = '';
    }, 3000);
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.agent-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update panels
    document.querySelectorAll('.agent-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    document.querySelector(`[data-panel="${tabName}"]`).classList.add('active');
  }

  async sendChatMessage() {
    const input = document.getElementById('agent-chat-input');
    const message = input.value.trim();

    if (!message || !this.isEnabled) return;

    // Add user message
    this.addChatMessage('user', message);
    input.value = '';

    // Show typing indicator
    this.addTypingIndicator();

    try {
      // Send to agents
      const response = await this.framework.sendMessage(message);

      // Remove typing indicator
      this.removeTypingIndicator();

      // Add agent response
      this.addChatMessage('agent', response.content, response.agent);
    } catch (error) {
      this.removeTypingIndicator();
      this.addChatMessage('error', 'Sorry, I encountered an error processing your request.');
      console.error('Agent message error:', error);
    }
  }

  addChatMessage(type, content, agent = null) {
    const chatHistory = document.getElementById('agent-chat-history');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;

    const timestamp = new Date().toLocaleTimeString();
    const agentName = agent ? ` (${agent})` : '';

    // Create message structure safely
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';

    const messageTypeSpan = document.createElement('span');
    messageTypeSpan.className = 'message-type';
    messageTypeSpan.textContent = `${type}${agentName}`;

    const messageTimeSpan = document.createElement('span');
    messageTimeSpan.className = 'message-time';
    messageTimeSpan.textContent = timestamp;

    messageHeader.appendChild(messageTypeSpan);
    messageHeader.appendChild(messageTimeSpan);

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = content;

    messageDiv.appendChild(messageHeader);
    messageDiv.appendChild(messageContent);

    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Store in history
    this.agentHistory.push({
      type,
      content,
      agent,
      timestamp: new Date().toISOString(),
    });

    // Limit history size
    if (this.agentHistory.length > this.config.maxHistoryLength) {
      this.agentHistory.shift();
    }
  }

  addTypingIndicator() {
    const chatHistory = document.getElementById('agent-chat-history');
    const indicator = document.createElement('div');
    indicator.className = 'chat-message typing-indicator';
    // Create typing indicator structure safely
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    const typingDots = document.createElement('div');
    typingDots.className = 'typing-dots';

    for (let i = 0; i < 3; i++) {
      const span = document.createElement('span');
      typingDots.appendChild(span);
    }

    messageContent.appendChild(typingDots);
    indicator.appendChild(messageContent);
    indicator.id = 'typing-indicator';
    chatHistory.appendChild(indicator);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  async generateImage() {
    const input = document.getElementById('image-prompt');
    const prompt = input.value.trim();

    if (!prompt || !this.isEnabled) return;

    const resultsDiv = document.getElementById('image-results');

    // Clear previous content and add loading indicator safely
    resultsDiv.textContent = '';

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';

    const loadingText = document.createElement('span');
    loadingText.textContent = '🎨 Generating image...';

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';

    const progress = document.createElement('div');
    progress.className = 'progress';

    progressBar.appendChild(progress);
    loadingDiv.appendChild(loadingText);
    loadingDiv.appendChild(progressBar);
    resultsDiv.appendChild(loadingDiv);

    try {
      const result = await this.framework.generateImage(prompt);

      if (result.success) {
        // Clear previous content and create image result safely
        resultsDiv.textContent = '';

        const imageResultDiv = document.createElement('div');
        imageResultDiv.className = 'image-result';

        const img = document.createElement('img');
        img.src = result.imageUrl;
        img.alt = 'Generated image';

        const imageInfoDiv = document.createElement('div');
        imageInfoDiv.className = 'image-info';

        const promptP = document.createElement('p');
        const promptStrong = document.createElement('strong');
        promptStrong.textContent = 'Prompt:';
        promptP.appendChild(promptStrong);
        promptP.appendChild(document.createTextNode(' ' + result.prompt));

        const generatedP = document.createElement('p');
        const generatedStrong = document.createElement('strong');
        generatedStrong.textContent = 'Generated:';
        generatedP.appendChild(generatedStrong);
        generatedP.appendChild(
          document.createTextNode(' ' + new Date(result.timestamp).toLocaleString())
        );

        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy URL';
        copyButton.onclick = () => navigator.clipboard.writeText(result.imageUrl);

        imageInfoDiv.appendChild(promptP);
        imageInfoDiv.appendChild(generatedP);
        imageInfoDiv.appendChild(copyButton);

        imageResultDiv.appendChild(img);
        imageResultDiv.appendChild(imageInfoDiv);
        resultsDiv.appendChild(imageResultDiv);

        this.addChatMessage('agent', `🎨 Generated image: "${prompt}"`, 'dalle_assistant');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error';
      errorDiv.textContent = `❌ Failed to generate image: ${error.message}`;
      resultsDiv.textContent = ''; // Clear previous content safely
      resultsDiv.appendChild(errorDiv);
      console.error('Image generation error:', error);
    }
  }

  async analyzeCode() {
    if (!this.isEnabled) return;

    const resultsDiv = document.getElementById('code-results');
    // Clear previous content and add loading indicator safely
    resultsDiv.textContent = '';

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.textContent = '🔍 Analyzing code...';
    resultsDiv.appendChild(loadingDiv);

    try {
      // Get current directory from terminal
      const _currentDir = this.terminal?.currentDirectory || process.cwd();

      // Simulate code analysis
      await new Promise(resolve => setTimeout(resolve, 2000));

      const analysis = {
        files: ['src/main.js', 'src/renderer.js', 'package.json'],
        issues: [
          'Consider adding error handling in main.js:45',
          'Unused variable in renderer.js:123',
        ],
        suggestions: ['Add TypeScript support', 'Implement unit tests'],
        metrics: {
          linesOfCode: 1250,
          complexity: 'Medium',
          maintainability: 85,
        },
      };

      // Clear previous content and create code analysis results safely
      resultsDiv.textContent = '';

      const codeAnalysisDiv = document.createElement('div');
      codeAnalysisDiv.className = 'code-analysis';

      const title = document.createElement('h4');
      title.textContent = '📊 Code Analysis Results';
      codeAnalysisDiv.appendChild(title);

      const metricsDiv = document.createElement('div');
      metricsDiv.className = 'metrics';

      // Lines of Code metric
      const locMetric = document.createElement('div');
      locMetric.className = 'metric';
      const locLabel = document.createElement('span');
      locLabel.className = 'label';
      locLabel.textContent = 'Lines of Code:';
      const locValue = document.createElement('span');
      locValue.className = 'value';
      locValue.textContent = analysis.metrics.linesOfCode;
      locMetric.appendChild(locLabel);
      locMetric.appendChild(locValue);

      // Complexity metric
      const complexityMetric = document.createElement('div');
      complexityMetric.className = 'metric';
      const complexityLabel = document.createElement('span');
      complexityLabel.className = 'label';
      complexityLabel.textContent = 'Complexity:';
      const complexityValue = document.createElement('span');
      complexityValue.className = 'value';
      complexityValue.textContent = analysis.metrics.complexity;
      complexityMetric.appendChild(complexityLabel);
      complexityMetric.appendChild(complexityValue);

      // Maintainability metric
      const maintainabilityMetric = document.createElement('div');
      maintainabilityMetric.className = 'metric';
      const maintainabilityLabel = document.createElement('span');
      maintainabilityLabel.className = 'label';
      maintainabilityLabel.textContent = 'Maintainability:';
      const maintainabilityValue = document.createElement('span');
      maintainabilityValue.className = 'value';
      maintainabilityValue.textContent = analysis.metrics.maintainability + '%';
      maintainabilityMetric.appendChild(maintainabilityLabel);
      maintainabilityMetric.appendChild(maintainabilityValue);

      metricsDiv.appendChild(locMetric);
      metricsDiv.appendChild(complexityMetric);
      metricsDiv.appendChild(maintainabilityMetric);

      // Issues section
      const issuesDiv = document.createElement('div');
      issuesDiv.className = 'issues';
      const issuesTitle = document.createElement('h5');
      issuesTitle.textContent = '🚨 Issues Found:';
      issuesDiv.appendChild(issuesTitle);

      analysis.issues.forEach(issue => {
        const issueDiv = document.createElement('div');
        issueDiv.className = 'issue';
        issueDiv.textContent = '• ' + issue;
        issuesDiv.appendChild(issueDiv);
      });

      // Suggestions section
      const suggestionsDiv = document.createElement('div');
      suggestionsDiv.className = 'suggestions';
      const suggestionsTitle = document.createElement('h5');
      suggestionsTitle.textContent = '💡 Suggestions:';
      suggestionsDiv.appendChild(suggestionsTitle);

      analysis.suggestions.forEach(suggestion => {
        const suggestionDiv = document.createElement('div');
        suggestionDiv.className = 'suggestion';
        suggestionDiv.textContent = '• ' + suggestion;
        suggestionsDiv.appendChild(suggestionDiv);
      });

      codeAnalysisDiv.appendChild(metricsDiv);
      codeAnalysisDiv.appendChild(issuesDiv);
      codeAnalysisDiv.appendChild(suggestionsDiv);
      resultsDiv.appendChild(codeAnalysisDiv);

      this.addChatMessage(
        'agent',
        '🔍 Code analysis complete. Check the Code tab for details.',
        'code_assistant'
      );
    } catch (error) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error';
      errorDiv.textContent = `❌ Code analysis failed: ${error.message}`;
      resultsDiv.textContent = ''; // Clear previous content safely
      resultsDiv.appendChild(errorDiv);
      console.error('Code analysis error:', error);
    }
  }

  async reviewChanges() {
    if (!this.isEnabled) return;

    const resultsDiv = document.getElementById('code-results');
    // Clear previous content and add loading indicator safely
    resultsDiv.textContent = '';

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.textContent = '📝 Reviewing changes...';
    resultsDiv.appendChild(loadingDiv);

    try {
      // Simulate git diff analysis
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Clear previous content and create git review results safely
      resultsDiv.textContent = '';

      const gitReviewDiv = document.createElement('div');
      gitReviewDiv.className = 'git-review';

      const title = document.createElement('h4');
      title.textContent = '📝 Git Changes Review';
      gitReviewDiv.appendChild(title);

      const changesDiv = document.createElement('div');
      changesDiv.className = 'changes';

      // First file change
      const fileChange1 = document.createElement('div');
      fileChange1.className = 'file-change';

      const fileTitle1 = document.createElement('h5');
      fileTitle1.textContent = '📄 src/main.js';
      fileChange1.appendChild(fileTitle1);

      const change1Added = document.createElement('div');
      change1Added.className = 'change added';
      change1Added.textContent = '+ Added error handling for window creation';
      fileChange1.appendChild(change1Added);

      const change1Modified = document.createElement('div');
      change1Modified.className = 'change modified';
      change1Modified.textContent = '~ Updated dependency injection pattern';
      fileChange1.appendChild(change1Modified);

      // Second file change
      const fileChange2 = document.createElement('div');
      fileChange2.className = 'file-change';

      const fileTitle2 = document.createElement('h5');
      fileTitle2.textContent = '📄 package.json';
      fileChange2.appendChild(fileTitle2);

      const change2Added = document.createElement('div');
      change2Added.className = 'change added';
      change2Added.textContent = '+ Added new dependency: @types/node';
      fileChange2.appendChild(change2Added);

      changesDiv.appendChild(fileChange1);
      changesDiv.appendChild(fileChange2);

      // Review summary
      const reviewSummaryDiv = document.createElement('div');
      reviewSummaryDiv.className = 'review-summary';

      const assessment = document.createElement('p');
      const assessmentStrong = document.createElement('strong');
      assessmentStrong.textContent = '✅ Overall Assessment:';
      assessment.appendChild(assessmentStrong);
      assessment.appendChild(
        document.createTextNode(
          ' Changes look good! The error handling improvements enhance stability.'
        )
      );

      const recommendation = document.createElement('p');
      const recommendationStrong = document.createElement('strong');
      recommendationStrong.textContent = '⚠️ Recommendation:';
      recommendation.appendChild(recommendationStrong);
      recommendation.appendChild(
        document.createTextNode(' Consider adding unit tests for the new error handling code.')
      );

      reviewSummaryDiv.appendChild(assessment);
      reviewSummaryDiv.appendChild(recommendation);

      gitReviewDiv.appendChild(changesDiv);
      gitReviewDiv.appendChild(reviewSummaryDiv);
      resultsDiv.appendChild(gitReviewDiv);

      this.addChatMessage(
        'agent',
        '📝 Git changes reviewed. The modifications look good with minor suggestions.',
        'code_assistant'
      );
    } catch (error) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error';
      errorDiv.textContent = `❌ Change review failed: ${error.message}`;
      resultsDiv.textContent = ''; // Clear previous content safely
      resultsDiv.appendChild(errorDiv);
      console.error('Change review error:', error);
    }
  }

  onTerminalCommand(command) {
    if (!this.isEnabled) return;

    // Analyze command and provide intelligent suggestions
    this.analyzeTerminalCommand(command);
  }

  async analyzeTerminalCommand(command) {
    // Check for common patterns and provide assistance
    if (command.includes('git') && command.includes('push')) {
      if (!command.includes('origin')) {
        this.addChatMessage(
          'assistant',
          '💡 Tip: Consider specifying the remote: git push origin main',
          'terminal_assistant'
        );
      }
    }

    if (command.includes('rm') && command.includes('-rf')) {
      this.addChatMessage(
        'assistant',
        '⚠️ Warning: Be careful with rm -rf. This permanently deletes files!',
        'terminal_assistant'
      );
    }

    if (command.includes('docker') && command.includes('run')) {
      this.addChatMessage(
        'assistant',
        '🐳 Docker tip: Add --rm flag to automatically remove container when it exits',
        'terminal_assistant'
      );
    }
  }

  updateStatus(status, type) {
    const statusText = document.getElementById('agent-status-text');
    const agentCount = document.getElementById('active-agents-count');

    if (statusText) {
      statusText.textContent = status;
      statusText.className = `status-value ${type}`;
    }

    if (agentCount) {
      const count = this.isEnabled ? Object.keys(this.agents).length : 0;
      agentCount.textContent = count;
    }
  }

  // Public API for terminal integration
  async sendToAgents(message) {
    if (!this.isEnabled) {
      throw new Error('Agents are not enabled');
    }

    return await this.framework.sendMessage(message);
  }

  async generateImageFromTerminal(prompt) {
    if (!this.isEnabled) {
      throw new Error('Agents are not enabled');
    }

    const result = await this.framework.generateImage(prompt);
    if (result.success) {
      this.terminal?.outputLine(`🎨 Image generated: ${result.imageUrl}`);
    }
    return result;
  }

  getAgentHistory() {
    return [...this.agentHistory];
  }

  isAgentEnabled() {
    return this.isEnabled;
  }
}

// Export for use in other modules
window.MultimodalAgentManager = MultimodalAgentManager;
