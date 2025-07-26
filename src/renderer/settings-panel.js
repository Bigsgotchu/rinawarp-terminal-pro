/**
 * Settings Panel for RinaWarp Terminal
 * Houses all feature toggles and configurations
 */

export class SettingsPanel {
  constructor() {
    this.isOpen = false;
    this.settings = {
      aiAssistant: true, // Default ON
      agentMode: true,   // Default ON
      voiceControl: false,
      voiceOutput: false,
      conversationalAI: false,
      cloudSync: false,
      autoComplete: true,
      syntaxHighlighting: true,
      terminalTransparency: true,
      performanceMode: false
    };

    // Load saved settings
    this.loadSettings();
  }

  loadSettings() {
    const saved = localStorage.getItem('rinawarp-settings');
    if (saved) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }

  saveSettings() {
    localStorage.setItem('rinawarp-settings', JSON.stringify(this.settings));
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.render();
    } else {
      this.close();
    }
  }

  render() {
    // Remove existing panel if any
    this.close();

    const panel = document.createElement('div');
    panel.id = 'settings-panel';
    panel.className = 'settings-panel';
    panel.innerHTML = `
      <div class="settings-content">
        <div class="settings-header">
          <h2>⚙️ RinaWarp Settings</h2>
          <button class="close-btn" onclick="window.settingsPanel.close()">✖</button>
        </div>
        
        <div class="settings-body">
          <div class="settings-section">
            <h3>🤖 AI Features</h3>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="ai-assistant" ${this.settings.aiAssistant ? 'checked' : ''}>
                <span>AI Assistant</span>
                <small>Natural language command processing</small>
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="agent-mode" ${this.settings.agentMode ? 'checked' : ''}>
                <span>Agent Mode</span>
                <small>Advanced AI agent capabilities</small>
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="conversational-ai" ${this.settings.conversationalAI ? 'checked' : ''}>
                <span>Conversational AI</span>
                <small>Chat-style AI interactions</small>
              </label>
            </div>
          </div>

          <div class="settings-section">
            <h3>🎤 Voice Features</h3>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="voice-control" ${this.settings.voiceControl ? 'checked' : ''}>
                <span>Voice Control</span>
                <small>Control terminal with voice commands</small>
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="voice-output" ${this.settings.voiceOutput ? 'checked' : ''}>
                <span>Voice Output</span>
                <small>Text-to-speech responses</small>
              </label>
            </div>
          </div>

          <div class="settings-section">
            <h3>⚡ Terminal Features</h3>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="auto-complete" ${this.settings.autoComplete ? 'checked' : ''}>
                <span>Auto-complete</span>
                <small>Smart command suggestions</small>
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="syntax-highlighting" ${this.settings.syntaxHighlighting ? 'checked' : ''}>
                <span>Syntax Highlighting</span>
                <small>Colorized command output</small>
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="terminal-transparency" ${this.settings.terminalTransparency ? 'checked' : ''}>
                <span>Terminal Transparency</span>
                <small>Background transparency effects</small>
              </label>
            </div>
          </div>

          <div class="settings-section">
            <h3>☁️ Advanced</h3>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="cloud-sync" ${this.settings.cloudSync ? 'checked' : ''}>
                <span>Cloud Sync</span>
                <small>Sync settings across devices</small>
              </label>
            </div>
            <div class="setting-item">
              <label>
                <input type="checkbox" id="performance-mode" ${this.settings.performanceMode ? 'checked' : ''}>
                <span>Performance Mode</span>
                <small>Optimize for speed</small>
              </label>
            </div>
          </div>

          <div class="settings-actions">
            <button class="btn-primary" onclick="window.settingsPanel.saveAndApply()">Save Settings</button>
            <button class="btn-secondary" onclick="window.settingsPanel.resetDefaults()">Reset to Defaults</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Add event listeners
    this.attachEventListeners();

    // Add styles
    this.injectStyles();
  }

  attachEventListeners() {
    const checkboxes = document.querySelectorAll('#settings-panel input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const settingKey = e.target.id.replace(/-/g, '');
        const settingMap = {
          'aiassistant': 'aiAssistant',
          'agentmode': 'agentMode',
          'voicecontrol': 'voiceControl',
          'voiceoutput': 'voiceOutput',
          'conversationalai': 'conversationalAI',
          'cloudsync': 'cloudSync',
          'autocomplete': 'autoComplete',
          'syntaxhighlighting': 'syntaxHighlighting',
          'terminaltransparency': 'terminalTransparency',
          'performancemode': 'performanceMode'
        };
        const key = settingMap[settingKey];
        if (key) {
          this.settings[key] = e.target.checked;
          this.applySettingChange(key, e.target.checked);
        }
      });
    });
  }

  applySettingChange(setting, value) {
    // Emit events for feature toggles
    const event = new CustomEvent('setting-changed', {
      detail: { setting, value }
    });
    window.dispatchEvent(event);

    // Apply specific feature changes
    switch(setting) {
      case 'aiAssistant':
        window.aiAssistantEnabled = value;
        console.log(`AI Assistant ${value ? 'enabled' : 'disabled'}`);
        break;
      
      case 'agentMode':
        window.agentModeEnabled = value;
        console.log(`Agent Mode ${value ? 'enabled' : 'disabled'}`);
        break;
      
      case 'voiceControl':
        if (value && window.advancedVoiceRecognition) {
          window.advancedVoiceRecognition.start();
        } else if (!value && window.advancedVoiceRecognition) {
          window.advancedVoiceRecognition.stop();
        }
        break;
      
      case 'voiceOutput':
        window.isVoiceOutputEnabled = value;
        const btn = document.getElementById('voiceOutputBtn');
        if (btn) {
          btn.textContent = value ? "🔊 Voice Output: ON" : "🔊 Voice Output: OFF";
        }
        break;
      
      case 'terminalTransparency':
        const terminal = document.querySelector('.terminal-container');
        if (terminal) {
          terminal.style.background = value ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 1)';
        }
        break;
      
      case 'performanceMode':
        if (value) {
          // Disable animations for performance
          document.body.classList.add('performance-mode');
        } else {
          document.body.classList.remove('performance-mode');
        }
        break;
    }

    // Apply immediate changes for some settings
    switch (setting) {
      case 'aiAssistant':
        window.aiAssistantEnabled = value;
        this.updateStatus(`AI Assistant ${value ? 'enabled' : 'disabled'}`);
        break;
      case 'agentMode':
        window.agentModeEnabled = value;
        this.updateStatus(`Agent Mode ${value ? 'enabled' : 'disabled'}`);
        break;
      case 'voiceControl':
        if (value) {
          window.startVoiceControl?.();
        } else {
          window.stopVoiceControl?.();
        }
        break;
      case 'terminalTransparency':
        document.querySelector('.terminal-container')?.classList.toggle('transparent', value);
        break;
    }
  }

  updateStatus(message) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = message;
      setTimeout(() => {
        statusEl.textContent = 'AI Terminal Ready';
      }, 3000);
    }
  }

  saveAndApply() {
    this.saveSettings();
    this.updateStatus('Settings saved successfully!');
    setTimeout(() => this.close(), 1000);
  }

  resetDefaults() {
    this.settings = {
      aiAssistant: true,
      agentMode: true,
      voiceControl: false,
      voiceOutput: false,
      conversationalAI: false,
      cloudSync: false,
      autoComplete: true,
      syntaxHighlighting: true,
      terminalTransparency: true,
      performanceMode: false
    };
    
    // Re-render to update checkboxes
    this.render();
    this.updateStatus('Settings reset to defaults');
  }

  close() {
    const panel = document.getElementById('settings-panel');
    if (panel) {
      panel.remove();
    }
    this.isOpen = false;
  }

  injectStyles() {
    if (document.getElementById('settings-panel-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'settings-panel-styles';
    styles.textContent = `
      .settings-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 400px;
        height: 100vh;
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(20px);
        border-left: 2px solid rgba(0, 170, 255, 0.3);
        z-index: 1000;
        overflow-y: auto;
        animation: slideIn 0.3s ease-out;
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
        }
        to {
          transform: translateX(0);
        }
      }

      .settings-content {
        padding: 20px;
        color: white;
      }

      .settings-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .settings-header h2 {
        margin: 0;
        background: linear-gradient(45deg, #FF1493, #00AAFF);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .close-btn {
        background: none;
        border: none;
        color: #fff;
        font-size: 24px;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s;
      }

      .close-btn:hover {
        opacity: 1;
      }

      .settings-section {
        margin-bottom: 30px;
      }

      .settings-section h3 {
        color: #00AAFF;
        margin-bottom: 15px;
        font-size: 16px;
      }

      .setting-item {
        margin-bottom: 15px;
      }

      .setting-item label {
        display: flex;
        align-items: flex-start;
        cursor: pointer;
        padding: 10px;
        border-radius: 8px;
        transition: background 0.2s;
      }

      .setting-item label:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .setting-item input[type="checkbox"] {
        margin-right: 12px;
        margin-top: 2px;
        width: 18px;
        height: 18px;
        cursor: pointer;
      }

      .setting-item span {
        display: block;
        font-weight: 500;
        margin-bottom: 4px;
      }

      .setting-item small {
        display: block;
        color: rgba(255, 255, 255, 0.6);
        font-size: 12px;
      }

      .settings-actions {
        margin-top: 40px;
        display: flex;
        gap: 10px;
      }

      .btn-primary, .btn-secondary {
        flex: 1;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
      }

      .btn-primary {
        background: linear-gradient(45deg, #FF1493, #00AAFF);
        color: white;
      }

      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(255, 20, 147, 0.5);
      }

      .btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      /* Mobile responsiveness */
      @media (max-width: 600px) {
        .settings-panel {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(styles);
  }
}

// Initialize and expose globally
window.settingsPanel = new SettingsPanel();
