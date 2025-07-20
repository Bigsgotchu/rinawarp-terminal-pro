/**
 * RinaWarp Terminal - Rina Voice Integration
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 * 
 * This module integrates the custom Rina Voice System with the Enhanced Voice Engine,
 * providing seamless switching between system voice and custom Rina personality.
 */

import { RinaVoiceSystem } from './rina-voice-system.js';

export class RinaVoiceIntegration {
  constructor(voiceEngine) {
    this.voiceEngine = voiceEngine;
    this.rinaVoice = null;
    this.isRinaEnabled = false;
    this.dashboardIntegration = null;
    this.currentMode = 'system'; // 'system', 'rina', 'hybrid'
    
    this.config = {
      enableDashboardToggle: true,
      enableGlowEffects: true,
      enableMoodSync: true,
      enablePersonalityMode: true,
      fallbackToSystem: true
    };

    this.init();
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
    window.addEventListener('voice-mode-toggle', (event) => {
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
          </select>
        </label>
        <div class="voice-status" id="voice-status">
          <span class="status-indicator"></span>
          <span class="status-text">System Voice Active</span>
        </div>
      </div>
    `;

    // Try to inject into dashboard or create floating element
    this.injectToggleUI(toggleHTML);
  }

  injectToggleUI(html) {
    try {
      // Look for existing dashboard container
      let container = document.getElementById('dashboard') || 
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
    const select = document.getElementById('voice-mode-select');
    const status = document.getElementById('voice-status');

    if (select) {
      select.addEventListener('change', (event) => {
        const mode = event.target.value;
        this.switchVoiceMode(mode);
        this.updateStatusDisplay(mode, status);
      });
    }
  }

  updateStatusDisplay(mode, statusElement) {
    if (!statusElement) return;

    const statusMap = {
      system: { text: 'System Voice Active', color: '#4CAF50' },
      rina: { text: 'Rina Voice Active', color: '#FF6B6B' },
      hybrid: { text: 'Hybrid Mode Active', color: '#FFD93D' }
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

    window.addEventListener('terminal-command-executing', (event) => {
      if (this.isRinaEnabled) {
        this.rinaVoice?.onCommandExecuting(event.detail.command);
      }
    });

    window.addEventListener('terminal-command-complete', (event) => {
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
    const validModes = ['system', 'rina', 'hybrid'];
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

  triggerModeSwitchGlow(mode) {
    const themeMap = {
      system: 'glass',
      rina: 'neon', 
      hybrid: 'rainbow'
    };

    const theme = themeMap[mode] || 'glass';
    
    try {
      if (typeof window !== 'undefined' && window.triggerGlow) {
        window.triggerGlow('voice-mode-switch', { 
          theme, 
          intensity: 0.4,
          duration: 2000
        });
      }

      // Also dispatch custom event
      const glowEvent = new CustomEvent('voice-mode-glow', {
        detail: { mode, theme, intensity: 0.4 }
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
      hybrid: 'Hybrid voice mode enabled'
    };

    try {
      if (mode === 'rina' && this.rinaVoice) {
        await this.rinaVoice.speak('greeting', { mood: 'professional' });
      } else if (mode === 'hybrid' && this.rinaVoice) {
        await this.rinaVoice.speak('greeting', { mood: 'friendly' });
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
      'clear': () => this.rinaVoice?.speak('commandExecuting', { mood: 'efficient' }),
      'ls': () => this.rinaVoice?.speak('commandExecuting', { mood: 'quick' }),
      'git': () => this.rinaVoice?.speak('thinking', { mood: 'analytical' }),
      'npm': () => this.rinaVoice?.speak('commandExecuting', { mood: 'confident' }),
      'help': () => this.rinaVoice?.speak('suggestion', { mood: 'helpful' })
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
      config: this.config
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
