/**
 * RinaWarp Terminal - Rina Voice Integration
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * This module integrates the custom Rina Voice System with the Enhanced Voice Engine,
 * providing seamless switching between system voice and custom Rina personality.
 */

import { RinaVoiceSystem } from './rina-voice-system.js';
import { ElevenLabsVoiceProvider } from './elevenlabs-voice-provider.js';

export class RinaVoiceIntegration {
  constructor(voiceEngine) {
    this.voiceEngine = voiceEngine;
    this.rinaVoice = null;
    this.isRinaEnabled = false;
    this.dashboardIntegration = null;
    this.currentMode = 'system'; // 'system', 'rina', 'hybrid', 'elevenlabs'

    this.config = {
      enableDashboardToggle: true,
      enableGlowEffects: true,
      enableMoodSync: true,
      enablePersonalityMode: true,
      fallbackToSystem: true,
    };

    // Don't auto-init in constructor for testing
    if (voiceEngine) {
      this.init();
    }
  }

  async init() {
    console.log('🎭 Initializing Rina Voice Integration...');

    // Initialize Rina Voice System
    await this.initializeRinaVoice();

    // Setup dashboard integration
    if (this.config.enableDashboardToggle) {
      await this.setupDashboardIntegration();
    }

    // Setup event listeners
    this.setupEventListeners();

    // Sync with voice engine mood
    if (this.config.enableMoodSync) {
      this.syncMoodWithVoiceEngine();
    }

    console.log('✅ Rina Voice Integration initialized successfully');
  }

  updateAPIConnectionStatus(isConnected) {
    const apiIndicator = document.getElementById('api-indicator');
    const apiText = document.getElementById('api-text');

    if (apiIndicator && apiText) {
      if (isConnected) {
        apiIndicator.style.color = '#4CAF50';
        apiText.textContent = 'ElevenLabs API Connected';
        apiText.style.color = '#4CAF50';
      } else {
        apiIndicator.style.color = '#f44336';
        apiText.textContent = 'ElevenLabs API Disconnected';
        apiText.style.color = '#f44336';
      }
    }
  }

  showApiKeyConfigurationUI() {
    // Check if configuration UI already exists
    if (document.getElementById('api-key-config')) {
      return;
    }

    const configUI = document.createElement('div');
    configUI.id = 'api-key-config';
    configUI.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #333;
      color: white;
      font-family: monospace;
      z-index: 2000;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;

    configUI.innerHTML = `
      <div style="margin-bottom: 15px; font-weight: bold; color: #FF6B6B;">
        🎙️ ElevenLabs Configuration Required
      </div>
      <div style="margin-bottom: 10px; font-size: 12px; color: #ccc;">
        To use ElevenLabs voice, please enter your API key:
      </div>
      <input type="password" id="api-key-input" placeholder="Enter ElevenLabs API Key" style="
        width: 100%;
        padding: 8px;
        margin-bottom: 10px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid #555;
        border-radius: 4px;
        color: white;
        font-family: monospace;
      " />
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="cancel-api-key" style="
          padding: 6px 12px;
          background: transparent;
          border: 1px solid #666;
          border-radius: 4px;
          color: #ccc;
          cursor: pointer;
          font-family: monospace;
        ">Cancel</button>
        <button id="save-api-key" style="
          padding: 6px 12px;
          background: #9C27B0;
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          font-family: monospace;
        ">Save & Connect</button>
      </div>
    `;

    document.body.appendChild(configUI);

    // Save button event
    document.getElementById('save-api-key').addEventListener('click', () => {
      const input = document.getElementById('api-key-input');
      const apiKey = input.value.trim();
      if (apiKey) {
        localStorage.setItem('elevenlabs_api_key', apiKey);
        configUI.remove();

        // Try to initialize with the new API key
        const elevenLabsProvider = new ElevenLabsVoiceProvider();
        elevenLabsProvider.initialize(apiKey).then(connected => {
          this.updateAPIConnectionStatus(connected);
          if (connected) {
            console.log('✅ ElevenLabs API key saved and connection established');
          } else {
            alert(
              'Failed to connect with the provided API key. Please check your key and try again.'
            );
          }
        });
      } else {
        alert('Please enter a valid API Key.');
      }
    });

    // Cancel button event
    document.getElementById('cancel-api-key').addEventListener('click', () => {
      configUI.remove();
      this.updateAPIConnectionStatus(false);
    });

    // Focus on input
    document.getElementById('api-key-input').focus();
  }

  async initializeRinaVoice() {
    try {
      this.rinaVoice = new RinaVoiceSystem();
      await this.rinaVoice.init();

      // Set initial mood to match voice engine
      if (this.voiceEngine.moodState) {
        this.rinaVoice.setMood(this.voiceEngine.moodState);
      }

      console.log('🎙️ Rina Voice System ready');
      return true;
    } catch (error) {
      console.warn('⚠️ Failed to initialize Rina Voice System:', error.message);
      return false;
    }
  }

  async setupDashboardIntegration() {
    // Create dashboard toggle element
    this.createDashboardToggle();

    // Listen for dashboard events
    window.addEventListener('voice-mode-toggle', event => {
      const mode = event.detail.mode;
      this.switchVoiceMode(mode);
    });

    console.log('🎛️ Dashboard integration configured');
  }

  createDashboardToggle() {
    // Create toggle UI element (can be styled with CSS)
    const toggleHTML = `
      <div id="rina-voice-toggle" class="voice-mode-toggle">
        <label class="toggle-label">
          <span class="toggle-text">Voice Mode:</span>
          <select id="voice-mode-select" class="voice-mode-select">
            <option value="system">System Voice</option>
            <option value="rina">Rina Voice</option>
            <option value="hybrid">Hybrid Mode</option>
            <option value="elevenlabs">ElevenLabs Voice</option>
          </select>
        </label>
        <div class="voice-status" id="voice-status">
          <span class="status-indicator"></span>
          <span class="status-text">System Voice Active</span>
        </div>
        <div class="api-connection-status" id="api-connection-status" style="margin-top: 5px; font-size: 11px;">
          <span class="api-indicator" id="api-indicator">●</span>
          <span class="api-text" id="api-text">Checking API...</span>
        </div>
      </div>
    `;

    // Try to inject into dashboard or create floating element
    this.injectToggleUI(toggleHTML);
  }

  injectToggleUI(html) {
    try {
      // Look for existing dashboard container
      let container =
        document.getElementById('dashboard') ||
        document.getElementById('controls') ||
        document.querySelector('.dashboard') ||
        document.querySelector('.controls');

      if (!container) {
        // Create floating toggle if no dashboard found
        container = document.createElement('div');
        container.id = 'rina-voice-floating-toggle';
        container.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.8);
          padding: 10px;
          border-radius: 8px;
          color: white;
          font-family: monospace;
          z-index: 1000;
          backdrop-filter: blur(10px);
        `;
        document.body.appendChild(container);
      }

      container.insertAdjacentHTML('beforeend', html);
      this.setupToggleEvents();
    } catch (error) {
      console.warn('⚠️ Failed to inject voice toggle UI:', error.message);
    }
  }

  setupToggleEvents() {
    const elevenLabsProvider = new ElevenLabsVoiceProvider();
    const apiKey = elevenLabsProvider.getApiKeyFromStorage();

    if (!apiKey) {
      this.showApiKeyConfigurationUI();
    } else {
      elevenLabsProvider.initialize(apiKey).then(connected => {
        this.updateAPIConnectionStatus(connected);
      });
    }
    const select = document.getElementById('voice-mode-select');
    const status = document.getElementById('voice-status');

    if (select) {
      select.addEventListener('change', event => {
        const mode = event.target.value;
        this.switchVoiceMode(mode);
        this.updateStatusDisplay(mode, status);
      });
    }
  }

  updateStatusDisplay(mode, statusElement) {
    this.updateAPIConnectionStatus(true); // Initialize with API connection
    if (!statusElement) return;

    const statusMap = {
      system: { text: 'System Voice Active', color: '#4CAF50' },
      rina: { text: 'Rina Voice Active', color: '#FF6B6B' },
      hybrid: { text: 'Hybrid Mode Active', color: '#FFD93D' },
      elevenlabs: { text: 'ElevenLabs Voice Active', color: '#9C27B0' },
    };

    const status = statusMap[mode] || statusMap.system;
    const indicator = statusElement.querySelector('.status-indicator');
    const text = statusElement.querySelector('.status-text');

    if (indicator) {
      indicator.style.cssText = `
        display: inline-block;
        width: 8px;
        height: 8px;
        background-color: ${status.color};
        border-radius: 50%;
        margin-right: 8px;
      `;
    }

    if (text) {
      text.textContent = status.text;
    }
  }

  setupEventListeners() {
    // Listen for mood changes from voice engine
    if (this.voiceEngine) {
      const originalDetectMood = this.voiceEngine.detectMood.bind(this.voiceEngine);
      this.voiceEngine.detectMood = (transcript, confidence, retryCount) => {
        const mood = originalDetectMood(transcript, confidence, retryCount);

        // Sync mood with Rina Voice System
        if (this.rinaVoice && this.config.enableMoodSync) {
          this.rinaVoice.setMood(mood);
        }

        return mood;
      };
    }

    // Listen for terminal events to trigger Rina responses
    window.addEventListener('terminal-boot-complete', () => {
      if (this.isRinaEnabled) {
        this.rinaVoice?.onBootComplete();
      }
    });

    window.addEventListener('terminal-command-executing', event => {
      if (this.isRinaEnabled) {
        this.rinaVoice?.onCommandExecuting(event.detail.command);
      }
    });

    window.addEventListener('terminal-command-complete', event => {
      if (this.isRinaEnabled) {
        this.rinaVoice?.onCommandComplete(event.detail.success);
      }
    });

    console.log('👂 Event listeners configured');
  }

  syncMoodWithVoiceEngine() {
    if (this.voiceEngine && this.rinaVoice) {
      const currentMood = this.voiceEngine.moodState || 'neutral';
      this.rinaVoice.setMood(currentMood);
      console.log(`🔄 Mood synced: ${currentMood}`);
    }
  }

  switchVoiceMode(mode) {
    const validModes = ['system', 'rina', 'hybrid', 'elevenlabs'];
    if (!validModes.includes(mode)) {
      console.warn(`⚠️ Invalid voice mode: ${mode}`);
      return false;
    }

    this.currentMode = mode;
    this.isRinaEnabled = mode === 'rina' || mode === 'hybrid';

    // Configure voice systems based on mode
    switch (mode) {
      case 'system':
        this.configureSystemMode();
        break;
      case 'rina':
        this.configureRinaMode();
        break;
      case 'hybrid':
        this.configureHybridMode();
        break;
      case 'elevenlabs':
        this.configureElevenLabsMode();
        break;
    }

    // Trigger glow effect for mode switch
    if (this.config.enableGlowEffects) {
      this.triggerModeSwitchGlow(mode);
    }

    // Announce mode switch with appropriate voice
    this.announceModeSwitch(mode);

    console.log(`🎛️ Voice mode switched to: ${mode}`);
    return true;
  }

  configureSystemMode() {
    // Disable Rina, use only system synthesis
    if (this.rinaVoice) {
      this.rinaVoice.switchVoiceMode('synthesis');
    }

    if (this.voiceEngine) {
      this.voiceEngine.options.enableFeedback = true;
    }
  }

  configureRinaMode() {
    // Enable Rina clips with synthesis fallback
    if (this.rinaVoice) {
      this.rinaVoice.switchVoiceMode('hybrid');
    }

    // Reduce system voice feedback to avoid conflicts
    if (this.voiceEngine) {
      this.voiceEngine.options.enableFeedback = false;
    }
  }

  configureHybridMode() {
    // Both systems active, Rina takes priority
    if (this.rinaVoice) {
      this.rinaVoice.switchVoiceMode('hybrid');
    }

    if (this.voiceEngine) {
      this.voiceEngine.options.enableFeedback = true;
    }
  }

  configureElevenLabsMode() {
    // Configure ElevenLabs voice mode
    // Disable system voice to avoid conflicts
    if (this.voiceEngine) {
      this.voiceEngine.options.enableFeedback = false;
    }

    // Set Rina to use ElevenLabs synthesis if available
    if (this.rinaVoice) {
      this.rinaVoice.switchVoiceMode('elevenlabs');
    }

    console.log('🎙️ ElevenLabs voice mode configured');
  }

  triggerModeSwitchGlow(mode) {
    const themeMap = {
      system: 'glass',
      rina: 'neon',
      hybrid: 'rainbow',
      elevenlabs: 'purple',
    };

    const theme = themeMap[mode] || 'glass';

    try {
      if (typeof window !== 'undefined' && window.triggerGlow) {
        window.triggerGlow('voice-mode-switch', {
          theme,
          intensity: 0.4,
          duration: 2000,
        });
      }

      // Also dispatch custom event
      const glowEvent = new CustomEvent('voice-mode-glow', {
        detail: { mode, theme, intensity: 0.4 },
      });
      window.dispatchEvent(glowEvent);
    } catch (error) {
      console.warn('Failed to trigger mode switch glow:', error.message);
    }
  }

  async announceModeSwitch(mode) {
    const announcements = {
      system: 'System voice activated',
      rina: 'greeting', // Use Rina's greeting
      hybrid: 'Hybrid voice mode enabled',
      elevenlabs: 'ElevenLabs voice activated',
    };

    try {
      if (mode === 'rina' && this.rinaVoice) {
        await this.rinaVoice.speak('greeting', { mood: 'professional' });
      } else if (mode === 'hybrid' && this.rinaVoice) {
        await this.rinaVoice.speak('greeting', { mood: 'friendly' });
      } else if (mode === 'elevenlabs' && this.rinaVoice) {
        // Use ElevenLabs voice for announcement
        await this.rinaVoice.speak('greeting', { mood: 'confident', voice: 'elevenlabs' });
      } else if (this.voiceEngine) {
        await this.voiceEngine.speak(announcements[mode]);
      }
    } catch (error) {
      console.warn('Failed to announce mode switch:', error.message);
    }
  }

  // Integration methods for enhanced voice engine
  async handleVoiceCommand(command, transcript, mood) {
    if (!this.isRinaEnabled) return false;

    // Map common commands to Rina responses
    const commandMap = {
      clear: () => this.rinaVoice?.speak('commandExecuting', { mood: 'efficient' }),
      ls: () => this.rinaVoice?.speak('commandExecuting', { mood: 'quick' }),
      git: () => this.rinaVoice?.speak('thinking', { mood: 'analytical' }),
      npm: () => this.rinaVoice?.speak('commandExecuting', { mood: 'confident' }),
      help: () => this.rinaVoice?.speak('suggestion', { mood: 'helpful' }),
    };

    const commandType = command.split(' ')[0];
    const handler = commandMap[commandType];

    if (handler) {
      await handler();
      return true;
    }

    return false;
  }

  async handleUserMood(mood) {
    if (!this.isRinaEnabled) return;

    // Mood-specific Rina responses
    switch (mood) {
      case 'frustrated':
        await this.rinaVoice?.onUserFrustrated();
        break;
      case 'uncertain':
        await this.rinaVoice?.onUserUncertain();
        break;
      case 'confident':
        await this.rinaVoice?.speak('performanceGood', { mood: 'pleased' });
        break;
    }
  }

  // Status and diagnostics
  getStatus() {
    return {
      currentMode: this.currentMode,
      isRinaEnabled: this.isRinaEnabled,
      rinaVoiceStatus: this.rinaVoice?.getStatus() || null,
      dashboardIntegration: !!this.dashboardIntegration,
      config: this.config,
    };
  }

  // Cleanup
  destroy() {
    if (this.rinaVoice) {
      this.rinaVoice.destroy();
    }

    // Remove dashboard elements
    const toggle = document.getElementById('rina-voice-toggle');
    if (toggle) {
      toggle.remove();
    }

    const floating = document.getElementById('rina-voice-floating-toggle');
    if (floating) {
      floating.remove();
    }

    console.log('🧹 Rina Voice Integration destroyed');
  }
}

export default RinaVoiceIntegration;
