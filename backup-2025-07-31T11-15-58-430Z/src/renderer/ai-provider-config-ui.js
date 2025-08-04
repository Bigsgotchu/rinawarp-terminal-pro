/**
 * AI Provider Configuration UI
 * Provides a user interface for configuring AI provider API keys
 */

export class AIProviderConfigUI {
  constructor() {
    this.modal = null;
    this.providers = ['openai', 'anthropic', 'google'];
  }

  /**
   * Show the configuration modal
   */
  async show() {
    // Create modal if it doesn't exist
    if (!this.modal) {
      this.createModal();
    }

    // Load current configuration
    await this.loadCurrentConfig();

    // Show the modal
    this.modal.style.display = 'flex';
  }

  /**
   * Create the configuration modal
   */
  createModal() {
    // Create modal container
    this.modal = document.createElement('div');
    this.modal.className = 'ai-config-modal';
    this.modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    // Create modal content
    const content = document.createElement('div');
    content.style.cssText = `
      background: #1a1a2e;
      border-radius: 15px;
      padding: 30px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      border: 2px solid #FF1493;
      box-shadow: 0 0 30px rgba(255, 20, 147, 0.5);
    `;

    content.innerHTML = `
      <h2 style="color: #FF1493; margin-bottom: 20px;">🤖 AI Provider Configuration</h2>
      
      <div class="provider-section" style="margin-bottom: 20px;">
        <h3 style="color: #00AAFF; margin-bottom: 15px;">OpenAI</h3>
        <div style="margin-bottom: 10px;">
          <label style="color: #fff; display: block; margin-bottom: 5px;">API Key:</label>
          <input type="password" id="openai-api-key" 
                 placeholder="sk-..." 
                 style="width: 100%; padding: 10px; background: #2d2d2d; color: white; 
                        border: 1px solid #666; border-radius: 5px;">
        </div>
        <div style="margin-bottom: 10px;">
          <label style="color: #fff; display: block; margin-bottom: 5px;">Model:</label>
          <select id="openai-model" 
                  style="width: 100%; padding: 10px; background: #2d2d2d; color: white; 
                         border: 1px solid #666; border-radius: 5px;">
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </select>
        </div>
        <button onclick="window.aiConfigUI.testProvider('openai')" 
                style="padding: 8px 16px; background: #28a745; color: white; 
                       border: none; border-radius: 5px; cursor: pointer; margin-top: 5px;">
          Test Connection
        </button>
      </div>

      <div class="provider-section" style="margin-bottom: 20px;">
        <h3 style="color: #00AAFF; margin-bottom: 15px;">Anthropic</h3>
        <div style="margin-bottom: 10px;">
          <label style="color: #fff; display: block; margin-bottom: 5px;">API Key:</label>
          <input type="password" id="anthropic-api-key" 
                 placeholder="sk-ant-..." 
                 style="width: 100%; padding: 10px; background: #2d2d2d; color: white; 
                        border: 1px solid #666; border-radius: 5px;">
        </div>
        <div style="margin-bottom: 10px;">
          <label style="color: #fff; display: block; margin-bottom: 5px;">Model:</label>
          <select id="anthropic-model" 
                  style="width: 100%; padding: 10px; background: #2d2d2d; color: white; 
                         border: 1px solid #666; border-radius: 5px;">
            <option value="claude-3-opus">Claude 3 Opus</option>
            <option value="claude-3-sonnet">Claude 3 Sonnet</option>
            <option value="claude-3-haiku">Claude 3 Haiku</option>
          </select>
        </div>
        <button onclick="window.aiConfigUI.testProvider('anthropic')" 
                style="padding: 8px 16px; background: #28a745; color: white; 
                       border: none; border-radius: 5px; cursor: pointer; margin-top: 5px;">
          Test Connection
        </button>
      </div>

      <div class="provider-section" style="margin-bottom: 20px;">
        <h3 style="color: #00AAFF; margin-bottom: 15px;">Google AI</h3>
        <div style="margin-bottom: 10px;">
          <label style="color: #fff; display: block; margin-bottom: 5px;">API Key:</label>
          <input type="password" id="google-api-key" 
                 placeholder="AIza..." 
                 style="width: 100%; padding: 10px; background: #2d2d2d; color: white; 
                        border: 1px solid #666; border-radius: 5px;">
        </div>
        <div style="margin-bottom: 10px;">
          <label style="color: #fff; display: block; margin-bottom: 5px;">Model:</label>
          <select id="google-model" 
                  style="width: 100%; padding: 10px; background: #2d2d2d; color: white; 
                         border: 1px solid #666; border-radius: 5px;">
            <option value="gemini-pro">Gemini Pro</option>
            <option value="gemini-pro-vision">Gemini Pro Vision</option>
          </select>
        </div>
        <button onclick="window.aiConfigUI.testProvider('google')" 
                style="padding: 8px 16px; background: #28a745; color: white; 
                       border: none; border-radius: 5px; cursor: pointer; margin-top: 5px;">
          Test Connection
        </button>
      </div>

      <div style="margin-top: 20px;">
        <label style="color: #fff; display: block; margin-bottom: 5px;">Default Provider:</label>
        <select id="default-provider" 
                style="width: 100%; padding: 10px; background: #2d2d2d; color: white; 
                       border: 1px solid #666; border-radius: 5px;">
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="google">Google AI</option>
        </select>
      </div>

      <div id="test-result" style="margin-top: 20px; padding: 10px; border-radius: 5px; display: none;"></div>

      <div style="margin-top: 30px; text-align: center;">
        <button onclick="window.aiConfigUI.save()" 
                style="padding: 10px 20px; background: #007acc; color: white; 
                       border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">
          Save Configuration
        </button>
        <button onclick="window.aiConfigUI.close()" 
                style="padding: 10px 20px; background: #999; color: white; 
                       border: none; border-radius: 5px; cursor: pointer;">
          Cancel
        </button>
      </div>

      <div style="margin-top: 20px; color: #ccc; font-size: 12px;">
        <p>🔒 API keys are encrypted and stored locally. Never share your API keys!</p>
        <p>📚 Get API keys from:</p>
        <ul style="margin-left: 20px;">
          <li>OpenAI: <a href="https://platform.openai.com/api-keys" target="_blank" style="color: #74c0fc;">platform.openai.com</a></li>
          <li>Anthropic: <a href="https://console.anthropic.com/account/keys" target="_blank" style="color: #74c0fc;">console.anthropic.com</a></li>
          <li>Google: <a href="https://makersuite.google.com/app/apikey" target="_blank" style="color: #74c0fc;">makersuite.google.com</a></li>
        </ul>
      </div>
    `;

    this.modal.appendChild(content);
    document.body.appendChild(this.modal);

    // Make this instance globally accessible for onclick handlers
    window.aiConfigUI = this;

    // Close on background click
    this.modal.addEventListener('click', e => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  }

  /**
   * Load current configuration
   */
  async loadCurrentConfig() {
    try {
      // Load from unified AI client if available
      if (window.unifiedAIClient) {
        const providers = window.unifiedAIClient.getProviders();
        const activeProvider = window.unifiedAIClient.config.getActiveProvider();

        // Set default provider
        if (activeProvider) {
          document.getElementById('default-provider').value = activeProvider.name;
          document.getElementById(`${activeProvider.name}-model`).value = activeProvider.model;
        }

        // Note: We don't load actual API keys for security
        // Just show if they're configured
        providers.forEach(provider => {
          if (provider.configured) {
            const input = document.getElementById(`${provider.id}-api-key`);
            if (input) {
              input.placeholder = '••••••••• (Configured)';
            }
          }
        });
      }
    } catch (error) {
      console.error('Failed to load AI provider config:', error);
    }
  }

  /**
   * Test a provider connection
   */
  async testProvider(provider) {
    const _resultDiv = document.getElementById('test-result');
    const apiKeyInput = document.getElementById(`${provider}-api-key`);
    const apiKey = apiKeyInput.value;

    if (!apiKey || apiKey === '••••••••• (Configured)') {
      this.showResult('Please enter an API key to test', 'error');
      return;
    }

    this.showResult('Testing connection...', 'info');

    try {
      // Test the connection
      if (window.unifiedAIClient) {
        const isValid = await window.unifiedAIClient.config.testConnection(provider, apiKey);

        if (isValid) {
          this.showResult(`✅ ${provider} connection successful!`, 'success');
        } else {
          this.showResult(`❌ ${provider} connection failed. Please check your API key.`, 'error');
        }
      } else {
        this.showResult('AI client not initialized', 'error');
      }
    } catch (error) {
      this.showResult(`❌ Test failed: ${error.message}`, 'error');
    }
  }

  /**
   * Show result message
   */
  showResult(message, type) {
    const resultDiv = document.getElementById('test-result');
    resultDiv.style.display = 'block';
    resultDiv.style.background =
      type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8';
    resultDiv.style.color = 'white';
    resultDiv.textContent = message;

    // Auto-hide after 5 seconds
    setTimeout(() => {
      resultDiv.style.display = 'none';
    }, 5000);
  }

  /**
   * Save configuration
   */
  async save() {
    try {
      const defaultProvider = document.getElementById('default-provider').value;
      const defaultModel = document.getElementById(`${defaultProvider}-model`).value;

      // Configure each provider
      for (const provider of this.providers) {
        const apiKeyInput = document.getElementById(`${provider}-api-key`);
        const apiKey = apiKeyInput.value;

        // Only update if a new key was entered
        if (apiKey && apiKey !== '••••••••• (Configured)') {
          await window.unifiedAIClient.configureApiKey(provider, apiKey);
        }
      }

      // Set default provider
      await window.unifiedAIClient.switchProvider(defaultProvider, defaultModel);

      this.showResult('✅ Configuration saved successfully!', 'success');

      // Close after a short delay
      setTimeout(() => {
        this.close();
      }, 1500);
    } catch (error) {
      this.showResult(`❌ Failed to save: ${error.message}`, 'error');
    }
  }

  /**
   * Close the modal
   */
  close() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  }
}

// Export singleton instance
export const aiProviderConfigUI = new AIProviderConfigUI();
