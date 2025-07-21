/**
 * ElevenLabs Configuration UI Component
 * Handles secure API key input and configuration management
 */

export class ElevenLabsConfigUI {
  constructor() {
    this.isVisible = false;
    this.modal = null;
    this.onSave = null;
    this.onCancel = null;
    this.currentConfig = null;
  }

  /**
   * Show the ElevenLabs configuration modal
   */
  show(currentConfig = {}, callbacks = {}) {
    this.currentConfig = currentConfig;
    this.onSave = callbacks.onSave || (() => {});
    this.onCancel = callbacks.onCancel || (() => {});
    
    this.createModal();
    this.isVisible = true;
  }

  /**
   * Hide the configuration modal
   */
  hide() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
    this.isVisible = false;
  }

  /**
   * Create the configuration modal
   */
  createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'elevenlabs-config-modal';
    this.modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: modalFadeIn 0.2s ease-out;
    `;

    const container = document.createElement('div');
    container.className = 'elevenlabs-config-container';
    container.style.cssText = `
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      border: 2px solid #444;
      border-radius: 15px;
      padding: 30px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      animation: modalSlideIn 0.3s ease-out;
    `;

    container.innerHTML = `
      <div class="elevenlabs-config-header">
        <h2 style="color: #FF1493; margin: 0 0 20px 0; font-size: 1.8em; text-align: center;">
          🎤 ElevenLabs Voice AI Configuration
        </h2>
        <p style="color: #aaa; margin-bottom: 20px; text-align: center; font-size: 0.9em;">
          Configure your ElevenLabs API key for advanced voice AI features
        </p>
      </div>

      <form class="elevenlabs-config-form" id="elevenlabsConfigForm">
        <div class="form-group" style="margin-bottom: 20px;">
          <label style="color: #00AAFF; display: block; margin-bottom: 8px; font-weight: 600;">
            API Key:
          </label>
          <div class="api-key-input-container" style="position: relative;">
            <input 
              type="password" 
              id="apiKeyInput" 
              placeholder="Enter your ElevenLabs API key"
              autocomplete="off"
              spellcheck="false"
              style="
                width: 100%;
                padding: 12px 50px 12px 15px;
                background: #333;
                border: 2px solid #555;
                border-radius: 8px;
                color: white;
                font-size: 14px;
                font-family: 'Courier New', monospace;
                box-sizing: border-box;
                transition: border-color 0.2s ease;
              "
              value="${this.currentConfig.apiKey || ''}"
            />
            <button 
              type="button" 
              id="togglePasswordVisibility"
              style="
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: #888;
                cursor: pointer;
                font-size: 16px;
                padding: 5px;
                transition: color 0.2s ease;
              "
              title="Toggle password visibility"
            >
              👁️
            </button>
          </div>
          <div class="api-key-help" style="margin-top: 8px; font-size: 0.85em; color: #888;">
            Get your API key from <a href="https://elevenlabs.io/app/settings/api" target="_blank" style="color: #00AAFF;">elevenlabs.io</a>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 20px;">
          <label style="color: #00AAFF; display: block; margin-bottom: 8px; font-weight: 600;">
            <input type="checkbox" id="enabledCheckbox" ${this.currentConfig.enabled ? 'checked' : ''} style="margin-right: 8px;">
            Enable ElevenLabs Voice AI
          </label>
          <div class="enabled-help" style="margin-top: 5px; font-size: 0.85em; color: #888;">
            When enabled, provides high-quality AI voice responses with emotional context
          </div>
        </div>

        <div class="advanced-settings" style="margin-bottom: 20px;">
          <details style="color: #aaa;">
            <summary style="cursor: pointer; margin-bottom: 10px; color: #00AAFF; font-weight: 600;">
              Advanced Settings
            </summary>
            
            <div class="form-group" style="margin-bottom: 15px;">
              <label style="color: #00AAFF; display: block; margin-bottom: 5px;">Voice ID:</label>
              <input 
                type="text" 
                id="voiceIdInput"
                placeholder="Voice ID (default: uSI3HxQeb8HZOrDcaj83)"
                value="${this.currentConfig.voiceId || 'uSI3HxQeb8HZOrDcaj83'}"
                style="
                  width: 100%;
                  padding: 8px 12px;
                  background: #333;
                  border: 1px solid #555;
                  border-radius: 5px;
                  color: white;
                  font-size: 12px;
                  font-family: 'Courier New', monospace;
                  box-sizing: border-box;
                "
              />
            </div>

            <div class="form-group" style="margin-bottom: 15px;">
              <label style="color: #00AAFF; display: block; margin-bottom: 5px;">Model:</label>
              <select 
                id="modelSelect"
                style="
                  width: 100%;
                  padding: 8px 12px;
                  background: #333;
                  border: 1px solid #555;
                  border-radius: 5px;
                  color: white;
                  font-size: 12px;
                  box-sizing: border-box;
                "
              >
                <option value="eleven_monolingual_v1" ${this.currentConfig.modelId === 'eleven_monolingual_v1' ? 'selected' : ''}>
                  Eleven Monolingual v1 (English)
                </option>
                <option value="eleven_multilingual_v1" ${this.currentConfig.modelId === 'eleven_multilingual_v1' ? 'selected' : ''}>
                  Eleven Multilingual v1
                </option>
                <option value="eleven_multilingual_v2" ${this.currentConfig.modelId === 'eleven_multilingual_v2' ? 'selected' : ''}>
                  Eleven Multilingual v2
                </option>
              </select>
            </div>

            <div class="voice-settings-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div class="form-group">
                <label style="color: #00AAFF; display: block; margin-bottom: 5px;">
                  Stability: <span id="stabilityValue">${(this.currentConfig.voiceSettings?.stability || 0.5)}</span>
                </label>
                <input 
                  type="range" 
                  id="stabilityRange"
                  min="0" 
                  max="1" 
                  step="0.1"
                  value="${this.currentConfig.voiceSettings?.stability || 0.5}"
                  style="width: 100%;"
                />
              </div>

              <div class="form-group">
                <label style="color: #00AAFF; display: block; margin-bottom: 5px;">
                  Similarity: <span id="similarityValue">${(this.currentConfig.voiceSettings?.similarityBoost || 0.5)}</span>
                </label>
                <input 
                  type="range" 
                  id="similarityRange"
                  min="0" 
                  max="1" 
                  step="0.1"
                  value="${this.currentConfig.voiceSettings?.similarityBoost || 0.5}"
                  style="width: 100%;"
                />
              </div>
            </div>
          </details>
        </div>

        <div class="api-key-status" id="apiKeyStatus" style="
          margin-bottom: 20px; 
          padding: 12px; 
          border-radius: 8px; 
          display: none;
          font-size: 0.9em;
        ">
          <!-- Status will be shown here -->
        </div>

        <div class="form-actions" style="display: flex; gap: 10px; justify-content: flex-end;">
          <button 
            type="button" 
            id="testApiKeyButton"
            style="
              padding: 12px 20px;
              background: #6a5acd;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              transition: background 0.2s ease;
              font-size: 14px;
            "
          >
            🧪 Test Connection
          </button>
          
          <button 
            type="button" 
            id="cancelButton"
            style="
              padding: 12px 20px;
              background: #666;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              transition: background 0.2s ease;
              font-size: 14px;
            "
          >
            Cancel
          </button>
          
          <button 
            type="submit"
            style="
              padding: 12px 20px;
              background: #FF1493;
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              transition: background 0.2s ease;
              font-size: 14px;
            "
          >
            💾 Save Configuration
          </button>
        </div>
      </form>
    `;

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes modalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes modalSlideIn {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      .elevenlabs-config-modal input[type="password"]:focus,
      .elevenlabs-config-modal input[type="text"]:focus,
      .elevenlabs-config-modal select:focus {
        border-color: #FF1493 !important;
        outline: none;
        box-shadow: 0 0 10px rgba(255, 20, 147, 0.3);
      }
      
      .elevenlabs-config-modal button:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      
      .elevenlabs-config-modal #togglePasswordVisibility:hover {
        color: #FF1493;
      }
      
      .elevenlabs-config-modal #testApiKeyButton:hover {
        background: #7b68ee;
      }
      
      .elevenlabs-config-modal #cancelButton:hover {
        background: #777;
      }
      
      .elevenlabs-config-modal button[type="submit"]:hover {
        background: #ff1493dd;
      }
    `;
    document.head.appendChild(style);

    this.modal.appendChild(container);
    document.body.appendChild(this.modal);

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for the modal
   */
  setupEventListeners() {
    // Password visibility toggle
    const toggleButton = this.modal.querySelector('#togglePasswordVisibility');
    const apiKeyInput = this.modal.querySelector('#apiKeyInput');
    
    toggleButton.addEventListener('click', () => {
      if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleButton.textContent = '🙈';
        toggleButton.title = 'Hide password';
      } else {
        apiKeyInput.type = 'password';
        toggleButton.textContent = '👁️';
        toggleButton.title = 'Show password';
      }
    });

    // Range sliders
    const stabilityRange = this.modal.querySelector('#stabilityRange');
    const stabilityValue = this.modal.querySelector('#stabilityValue');
    const similarityRange = this.modal.querySelector('#similarityRange');
    const similarityValue = this.modal.querySelector('#similarityValue');

    stabilityRange.addEventListener('input', (e) => {
      stabilityValue.textContent = e.target.value;
    });

    similarityRange.addEventListener('input', (e) => {
      similarityValue.textContent = e.target.value;
    });

    // Test API key button
    const testButton = this.modal.querySelector('#testApiKeyButton');
    testButton.addEventListener('click', () => this.testApiKey());

    // Cancel button
    const cancelButton = this.modal.querySelector('#cancelButton');
    cancelButton.addEventListener('click', () => {
      this.hide();
      this.onCancel();
    });

    // Form submission
    const form = this.modal.querySelector('#elevenlabsConfigForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveConfiguration();
    });

    // Close on outside click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
        this.onCancel();
      }
    });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
        this.onCancel();
      }
    });
  }

  /**
   * Test the API key connection
   */
  async testApiKey() {
    const apiKeyInput = this.modal.querySelector('#apiKeyInput');
    const testButton = this.modal.querySelector('#testApiKeyButton');
    const statusDiv = this.modal.querySelector('#apiKeyStatus');

    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      this.showStatus('❌ Please enter an API key first', 'error');
      return;
    }

    // Show loading state
    testButton.textContent = '⏳ Testing...';
    testButton.disabled = true;
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = '⏳ Testing connection to ElevenLabs API...';
    statusDiv.style.background = '#4a5568';
    statusDiv.style.color = '#e2e8f0';

    try {
      // Import ElevenLabs provider dynamically
      const { ElevenLabsVoiceProvider } = await import('../voice-enhancements/elevenlabs-voice-provider.js');
      
      // Create a temporary provider for testing
      const testProvider = new ElevenLabsVoiceProvider();
      const success = await testProvider.initialize(apiKey);

      if (success) {
        this.showStatus('✅ Connection successful! API key is valid and ready to use.', 'success');
        
        // Test getting voices to verify full functionality
        try {
          const status = testProvider.getStatus();
          if (status.apiHealth?.isAvailable !== false) {
            this.showStatus('✅ Connection verified! ElevenLabs API is responding correctly.', 'success');
          } else {
            this.showStatus('⚠️ API key is valid but service may be experiencing issues.', 'warning');
          }
        } catch (voiceError) {
          console.warn('Voice test failed but connection succeeded:', voiceError);
          this.showStatus('✅ API key is valid. Voice features will be available once configured.', 'success');
        }

        // Cleanup test provider
        testProvider.destroy();
      } else {
        this.showStatus('❌ Connection failed. Please check your API key and try again.', 'error');
      }
    } catch (error) {
      console.error('API key test error:', error);
      let errorMessage = '❌ Connection test failed. ';
      
      if (error.message.includes('401') || error.message.includes('auth')) {
        errorMessage += 'Invalid API key.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage += 'Network error. Check your internet connection.';
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        errorMessage += 'API quota exceeded.';
      } else {
        errorMessage += `${error.message}`;
      }
      
      this.showStatus(errorMessage, 'error');
    } finally {
      // Restore button state
      testButton.textContent = '🧪 Test Connection';
      testButton.disabled = false;
    }
  }

  /**
   * Show status message
   */
  showStatus(message, type) {
    const statusDiv = this.modal.querySelector('#apiKeyStatus');
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = message;
    
    switch (type) {
    case 'success':
      statusDiv.style.background = '#38a169';
      statusDiv.style.color = 'white';
      break;
    case 'error':
      statusDiv.style.background = '#e53e3e';
      statusDiv.style.color = 'white';
      break;
    case 'warning':
      statusDiv.style.background = '#d69e2e';
      statusDiv.style.color = 'white';
      break;
    default:
      statusDiv.style.background = '#4a5568';
      statusDiv.style.color = '#e2e8f0';
    }

    // Auto-hide success and warning messages after 5 seconds
    if (type === 'success' || type === 'warning') {
      setTimeout(() => {
        if (statusDiv.style.display !== 'none') {
          statusDiv.style.display = 'none';
        }
      }, 5000);
    }
  }

  /**
   * Save the configuration
   */
  saveConfiguration() {
    const apiKeyInput = this.modal.querySelector('#apiKeyInput');
    const enabledCheckbox = this.modal.querySelector('#enabledCheckbox');
    const voiceIdInput = this.modal.querySelector('#voiceIdInput');
    const modelSelect = this.modal.querySelector('#modelSelect');
    const stabilityRange = this.modal.querySelector('#stabilityRange');
    const similarityRange = this.modal.querySelector('#similarityRange');

    const config = {
      enabled: enabledCheckbox.checked,
      apiKey: apiKeyInput.value.trim(),
      voiceId: voiceIdInput.value.trim() || 'uSI3HxQeb8HZOrDcaj83',
      modelId: modelSelect.value,
      voiceSettings: {
        stability: parseFloat(stabilityRange.value),
        similarityBoost: parseFloat(similarityRange.value)
      }
    };

    // Validate configuration
    if (config.enabled && !config.apiKey) {
      this.showStatus('❌ API key is required when ElevenLabs is enabled', 'error');
      apiKeyInput.focus();
      return;
    }

    // Hide modal and call save callback
    this.hide();
    this.onSave(config);
  }

  /**
   * Static method to show the configuration dialog
   */
  static async show(currentConfig = {}) {
    return new Promise((resolve) => {
      const ui = new ElevenLabsConfigUI();
      ui.show(currentConfig, {
        onSave: (config) => resolve({ saved: true, config }),
        onCancel: () => resolve({ saved: false, config: null })
      });
    });
  }
}

export default ElevenLabsConfigUI;
