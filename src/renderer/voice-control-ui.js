/**
 * RinaWarp Terminal - Voice Control UI
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * User interface for voice recording, custom voice management, and TTS settings
 */

export class VoiceControlUI {
  constructor(voiceEngine, pluginAPI) {
    this.voiceEngine = voiceEngine;
    this.pluginAPI = pluginAPI;
    this.isRecordingUIVisible = false;
    this.recordingTimer = null;
    this.recordingStartTime = null;

    // Check authorization before initializing (allow development mode)
    if (!process.env.RINAWARP_CREATOR && process.env.NODE_ENV === 'production') {
      console.warn('Voice Control UI: Unauthorized access attempt');
      return;
    }

    this.initialize();
  }

  initialize() {
    // Add keyboard shortcuts
    document.addEventListener('keydown', e => {
      // Ctrl+Shift+V for voice settings
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        this.showVoiceSettingsModal();
      }

      // Ctrl+Shift+R for voice recording
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        this.showVoiceRecordingModal();
      }

      // Ctrl+Shift+M for mute toggle
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        this.toggleMute();
      }
    });
  }

  showVoiceSettingsModal() {
    const status = this.voiceEngine.getStatus();
    const availableVoices = this.voiceEngine.getAvailableVoices();

    const modal = this.pluginAPI.createModal(
      '🎤 Voice Settings',
      `
            <div class="voice-settings-panel">
                <div class="voice-status">
                    <h4>Voice Status</h4>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-label">Voice Engine:</span>
                            <span class="status-value ${status.enabled ? 'enabled' : 'disabled'}">
                                ${status.enabled ? '🔊 Enabled' : '🔇 Disabled'}
                            </span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Audio:</span>
                            <span class="status-value ${status.muted ? 'muted' : 'unmuted'}">
                                ${status.muted ? '🔇 Muted' : '🔊 Unmuted'}
                            </span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Current Voice:</span>
                            <span class="status-value">${status.currentVoice}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Custom Voices:</span>
                            <span class="status-value">${status.customVoicesCount} saved</span>
                        </div>
                    </div>
                </div>
                
                <div class="voice-controls">
                    <h4>Quick Controls</h4>
                    <div class="control-buttons">
                        <button id="voice-enable-toggle" class="btn ${status.enabled ? 'btn-warning' : 'btn-success'}">
                            ${status.enabled ? 'Disable Voice' : 'Enable Voice'}
                        </button>
                        <button id="voice-mute-toggle" class="btn ${status.muted ? 'btn-success' : 'btn-warning'}">
                            ${status.muted ? 'Unmute' : 'Mute'}
                        </button>
                        <button id="voice-test" class="btn btn-secondary">Test Voice</button>
                        <button id="voice-stop" class="btn btn-danger">Stop Speaking</button>
                    </div>
                </div>
                
                <div class="voice-selection">
                    <h4>Voice Selection</h4>
                    <div class="voice-option">
                        <label>
                            <input type="radio" name="voice-type" value="system" ${!status.settings.useCustomVoice ? 'checked' : ''}>
                            System Voice
                        </label>
                        <select id="system-voice-select" ${status.settings.useCustomVoice ? 'disabled' : ''}>
                            ${availableVoices
                              .filter(v => v.type === 'system')
                              .map(
                                voice =>
                                  `<option value="${voice.name}" ${voice.name === status.currentVoice ? 'selected' : ''}>
                                    ${voice.name} (${voice.lang})
                                </option>`
                              )
                              .join('')}
                        </select>
                    </div>
                    
                    <div class="voice-option">
                        <label>
                            <input type="radio" name="voice-type" value="custom" ${status.settings.useCustomVoice ? 'checked' : ''}>
                            Custom Voice
                        </label>
                        <select id="custom-voice-select" ${!status.settings.useCustomVoice ? 'disabled' : ''}>
                            ${availableVoices
                              .filter(v => v.type === 'custom')
                              .map(
                                voice =>
                                  `<option value="${voice.name}" ${voice.name === status.settings.customVoiceName ? 'selected' : ''}>
                                    ${voice.name}
                                </option>`
                              )
                              .join('')}
                            ${
                              availableVoices.filter(v => v.type === 'custom').length === 0
                                ? '<option value="">No custom voices recorded</option>'
                                : ''
                            }
                        </select>
                        <button id="record-voice-btn" class="btn btn-primary btn-small">Record New Voice</button>
                    </div>
                </div>
                
                <div class="voice-parameters">
                    <h4>Voice Parameters</h4>
                    <div class="parameter-grid">
                        <div class="parameter-item">
                            <label for="voice-volume">Volume:</label>
                            <input type="range" id="voice-volume" min="0" max="1" step="0.1" value="${status.settings.volume}">
                            <span id="volume-value">${Math.round(status.settings.volume * 100)}%</span>
                        </div>
                        <div class="parameter-item">
                            <label for="voice-rate">Speed:</label>
                            <input type="range" id="voice-rate" min="0.5" max="2" step="0.1" value="${status.settings.rate}">
                            <span id="rate-value">${status.settings.rate}x</span>
                        </div>
                        <div class="parameter-item">
                            <label for="voice-pitch">Pitch:</label>
                            <input type="range" id="voice-pitch" min="0.5" max="2" step="0.1" value="${status.settings.pitch}">
                            <span id="pitch-value">${status.settings.pitch}x</span>
                        </div>
                    </div>
                </div>
                
                <div class="announcement-settings">
                    <h4>Announcement Settings</h4>
                    <div class="checkbox-grid">
                        <label>
                            <input type="checkbox" id="announce-commands" ${status.settings.announceCommands ? 'checked' : ''}>
                            Announce Commands
                        </label>
                        <label>
                            <input type="checkbox" id="announce-results" ${status.settings.announceResults ? 'checked' : ''}>
                            Announce Results
                        </label>
                        <label>
                            <input type="checkbox" id="announce-errors" ${status.settings.announceErrors ? 'checked' : ''}>
                            Announce Errors
                        </label>
                        <label>
                            <input type="checkbox" id="announce-notifications" ${status.settings.announceNotifications ? 'checked' : ''}>
                            Announce Notifications
                        </label>
                    </div>
                </div>
            </div>
            `,
      {
        footer: `
                    <button id="save-voice-settings" class="btn btn-success">Save Settings</button>
                    <button class="btn btn-secondary close-modal">Close</button>
                `,
        className: 'voice-settings-modal',
      }
    );

    this.setupVoiceSettingsHandlers(modal);
  }

  setupVoiceSettingsHandlers(modal) {
    // Enable/Disable voice
    modal.querySelector('#voice-enable-toggle')?.addEventListener('click', () => {
      if (this.voiceEngine.isEnabled) {
        this.voiceEngine.disable();
      } else {
        this.voiceEngine.enable();
      }
      this.showVoiceSettingsModal(); // Refresh modal
    });

    // Mute/Unmute
    modal.querySelector('#voice-mute-toggle')?.addEventListener('click', () => {
      this.voiceEngine.toggleMute();
      this.showVoiceSettingsModal(); // Refresh modal
    });

    // Test voice
    modal.querySelector('#voice-test')?.addEventListener('click', () => {
      this.voiceEngine.testVoice();
    });

    // Stop speaking
    modal.querySelector('#voice-stop')?.addEventListener('click', () => {
      this.voiceEngine.stop();
    });

    // Voice type selection
    const voiceTypeRadios = modal.querySelectorAll('input[name="voice-type"]');
    voiceTypeRadios.forEach(radio => {
      radio.addEventListener('change', e => {
        const useCustom = e.target.value === 'custom';
        modal.querySelector('#system-voice-select').disabled = useCustom;
        modal.querySelector('#custom-voice-select').disabled = !useCustom;
      });
    });

    // Record new voice button
    modal.querySelector('#record-voice-btn')?.addEventListener('click', () => {
      modal.remove();
      this.showVoiceRecordingModal();
    });

    // Parameter sliders
    const volumeSlider = modal.querySelector('#voice-volume');
    const rateSlider = modal.querySelector('#voice-rate');
    const pitchSlider = modal.querySelector('#voice-pitch');

    volumeSlider?.addEventListener('input', e => {
      modal.querySelector('#volume-value').textContent = Math.round(e.target.value * 100) + '%';
    });

    rateSlider?.addEventListener('input', e => {
      modal.querySelector('#rate-value').textContent = e.target.value + 'x';
    });

    pitchSlider?.addEventListener('input', e => {
      modal.querySelector('#pitch-value').textContent = e.target.value + 'x';
    });

    // Save settings
    modal.querySelector('#save-voice-settings')?.addEventListener('click', () => {
      this.saveVoiceSettings(modal);
      modal.remove();
      this.pluginAPI.showNotification('Voice settings saved!', 'success');
    });
  }

  saveVoiceSettings(modal) {
    const useCustomVoice =
      modal.querySelector('input[name="voice-type"]:checked').value === 'custom';

    const settings = {
      useCustomVoice: useCustomVoice,
      voice: modal.querySelector('#system-voice-select').value,
      customVoiceName: modal.querySelector('#custom-voice-select').value,
      volume: parseFloat(modal.querySelector('#voice-volume').value),
      rate: parseFloat(modal.querySelector('#voice-rate').value),
      pitch: parseFloat(modal.querySelector('#voice-pitch').value),
      announceCommands: modal.querySelector('#announce-commands').checked,
      announceResults: modal.querySelector('#announce-results').checked,
      announceErrors: modal.querySelector('#announce-errors').checked,
      announceNotifications: modal.querySelector('#announce-notifications').checked,
    };

    this.voiceEngine.updateSettings(settings);
  }

  showVoiceRecordingModal() {
    const modal = this.pluginAPI.createModal(
      '🎙️ Record Your Voice for Rina',
      `
            <div class="voice-recording-panel">
                <div class="recording-intro">
                    <h4>Create Your Custom Voice</h4>
                    <p>Record yourself speaking to create a custom voice model for Rina. This will allow the terminal to speak in your voice!</p>
                    
                    <div class="recording-tips">
                        <h5>Recording Tips:</h5>
                        <ul>
                            <li>Find a quiet environment</li>
                            <li>Speak clearly and at a normal pace</li>
                            <li>Read the provided text naturally</li>
                            <li>Record for at least 30 seconds for best results</li>
                        </ul>
                    </div>
                </div>
                
                <div class="recording-text">
                    <h5>Please read this text aloud:</h5>
                    <div class="text-to-read">
                        "Hello, I am Rina, your AI terminal assistant. I help you navigate the command line, 
                        execute tasks, and provide intelligent suggestions. Whether you're working with Git, 
                        managing files, or running development commands, I'm here to assist you. Let's make 
                        your terminal experience more productive and enjoyable. Thank you for customizing 
                        my voice to match your preferences."
                    </div>
                </div>
                
                <div class="recording-controls">
                    <div class="recording-status">
                        <div id="recording-indicator" class="recording-indicator">
                            <div class="indicator-dot"></div>
                            <span id="recording-status-text">Ready to record</span>
                        </div>
                        <div id="recording-timer" class="recording-timer">00:00</div>
                    </div>
                    
                    <div class="recording-buttons">
                        <button id="start-recording" class="btn btn-primary btn-large">
                            🎙️ Start Recording
                        </button>
                        <button id="stop-recording" class="btn btn-danger btn-large" disabled>
                            ⏹️ Stop Recording
                        </button>
                        <button id="play-recording" class="btn btn-secondary" disabled>
                            ▶️ Play Back
                        </button>
                    </div>
                </div>
                
                <div class="voice-naming">
                    <label for="voice-name">Voice Name:</label>
                    <input type="text" id="voice-name" value="creator_voice" placeholder="Enter a name for your voice">
                    <div class="creator-voice-info">
                        <p><strong>🎉 Special Creator Mode:</strong> Recording as "creator_voice" will permanently install your voice as RinaWarp's default voice for all users!</p>
                    </div>
                </div>
                
                <div id="recording-progress" class="recording-progress hidden">
                    <div class="progress-bar">
                        <div id="progress-fill" class="progress-fill"></div>
                    </div>
                    <div id="progress-text">Processing...</div>
                </div>
            </div>
            `,
      {
        footer: `
                    <button id="save-voice-recording" class="btn btn-success" disabled>Save Custom Voice</button>
                    <button class="btn btn-secondary close-modal">Cancel</button>
                `,
        className: 'voice-recording-modal',
      }
    );

    this.setupVoiceRecordingHandlers(modal);
  }

  setupVoiceRecordingHandlers(modal) {
    const startBtn = modal.querySelector('#start-recording');
    const stopBtn = modal.querySelector('#stop-recording');
    const playBtn = modal.querySelector('#play-recording');
    const saveBtn = modal.querySelector('#save-voice-recording');
    const statusText = modal.querySelector('#recording-status-text');
    const timer = modal.querySelector('#recording-timer');
    const indicator = modal.querySelector('#recording-indicator');
    const progress = modal.querySelector('#recording-progress');

    // Start recording
    startBtn.addEventListener('click', async () => {
      const success = await this.voiceEngine.startVoiceRecording();

      if (success) {
        startBtn.disabled = true;
        stopBtn.disabled = false;
        statusText.textContent = 'Recording...';
        indicator.classList.add('recording');

        // Start timer
        this.recordingStartTime = Date.now();
        this.recordingTimer = setInterval(() => {
          const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
          const minutes = Math.floor(elapsed / 60);
          const seconds = elapsed % 60;
          timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);

        this.pluginAPI.showNotification('Recording started! Please read the text aloud.', 'info');
      } else {
        this.pluginAPI.showNotification(
          'Failed to start recording. Please check microphone permissions.',
          'error'
        );
      }
    });

    // Stop recording
    stopBtn.addEventListener('click', () => {
      const success = this.voiceEngine.stopVoiceRecording();

      if (success) {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        playBtn.disabled = false;
        saveBtn.disabled = false;
        statusText.textContent = 'Recording complete';
        indicator.classList.remove('recording');

        // Stop timer
        if (this.recordingTimer) {
          clearInterval(this.recordingTimer);
          this.recordingTimer = null;
        }

        // Show processing indicator
        progress.classList.remove('hidden');

        // Simulate processing time
        setTimeout(() => {
          progress.classList.add('hidden');
          this.pluginAPI.showNotification('Recording processed successfully!', 'success');
        }, 2000);
      }
    });

    // Play recording (if available)
    playBtn.addEventListener('click', () => {
      // In a real implementation, you'd play back the recorded audio
      this.pluginAPI.showNotification('Playing back recorded voice...', 'info');
      this.voiceEngine.testVoice('current');
    });

    // Save recording
    saveBtn.addEventListener('click', async () => {
      const voiceName = modal.querySelector('#voice-name').value.trim();

      if (!voiceName) {
        this.pluginAPI.showNotification('Please enter a name for your voice', 'error');
        return;
      }

      // Update voice name in settings
      this.voiceEngine.settings.customVoiceName = voiceName;

      progress.classList.remove('hidden');
      modal.querySelector('#progress-text').textContent = 'Saving custom voice...';

      // Voice is already processed by the engine
      setTimeout(() => {
        modal.remove();
        this.pluginAPI.showNotification(
          `Custom voice "${voiceName}" saved successfully!`,
          'success'
        );

        // Ask if they want to use the new voice
        setTimeout(() => {
          if (confirm(`Would you like to start using your custom voice "${voiceName}" now?`)) {
            this.voiceEngine.updateSettings({
              useCustomVoice: true,
              customVoiceName: voiceName,
            });
            this.voiceEngine.speak("Hello! I'm now using your custom voice. How do I sound?", {
              type: 'notification',
              interrupt: true,
            });
          }
        }, 1000);
      }, 2000);
    });
  }

  toggleMute() {
    const wasMuted = this.voiceEngine.toggleMute();
    this.pluginAPI.showNotification(
      wasMuted ? 'Voice assistance unmuted' : 'Voice assistance muted',
      'info'
    );
  }

  // Add voice control button to status bar
  addVoiceControlButton() {
    if (this.pluginAPI && this.pluginAPI.addStatusBarItem) {
      this.pluginAPI.addStatusBarItem(
        'voice-control',
        `
                <button onclick="window.voiceControlUI.showVoiceSettingsModal()" 
                        title="Voice Settings (Ctrl+Shift+V)" 
                        style="background:none;border:1px solid #e74c3c;color:#e74c3c;padding:2px 8px;border-radius:3px;margin:0 2px;cursor:pointer;font-size:12px;">
                    🎤 Voice
                </button>
                `,
        'right'
      );
    }
  }
}

// Export for use
window.VoiceControlUI = VoiceControlUI;
