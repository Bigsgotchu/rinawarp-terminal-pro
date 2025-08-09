/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal - Speech Recognition & Voice Commands
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * Advanced speech-to-text with intelligent command processing
 */

export class SpeechRecognitionEngine {
  constructor(terminal, aiAssistant, voiceEngine) {
    this.terminal = terminal;
    this.aiAssistant = aiAssistant;
    this.voiceEngine = voiceEngine;

    // Speech Recognition API
    this.recognition = null;
    this.isListening = false;
    this.isEnabled = false;
    this.continuous = false;
    this.interimResults = true;

    // Voice command processing
    this.commandBuffer = '';
    this.lastCommand = '';
    this.confidence = 0;
    this.language = 'en-US';

    // Voice activation settings
    this.activationPhrase = 'hey rina';
    this.wakeWordEnabled = true;
    this.voiceActivationTimeout = 5000; // 5 seconds

    // Command categories and patterns
    this.commandPatterns = this.initializeCommandPatterns();
    this.customCommands = new Map();

    // Visual feedback
    this.speechIndicator = null;
    this.confidenceIndicator = null;

    // Settings
    this.settings = {
      enabled: false,
      continuous: false,
      wakeWord: true,
      activationPhrase: 'hey rina',
      language: 'en-US',
      noiseSupression: true,
      echoCancellation: true,
      autoGain: true,
      sensitivity: 0.7,
      timeout: 5000,
      aiAssistance: true,
      confirmCommands: false,
      speakResponses: true,
    };

    this.initialize();
  }

  async initialize() {
    try {
      await this.checkBrowserSupport();
      await this.loadSettings();
      this.setupSpeechRecognition();
      this.createSpeechUI();
      this.setupEventListeners();

      return true;
    } catch (error) {
      console.error('Failed to initialize Speech Recognition:', error);
      return false;
    }
  }

  async checkBrowserSupport() {
    // Check for Speech Recognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error(new Error(new Error('Speech Recognition not supported in this browser')));
    }

    // Check for microphone permissions
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      throw new Error(new Error(new Error('Microphone access denied or not available')));
    }
  }

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // Configure recognition
    this.recognition.continuous = this.settings.continuous;
    this.recognition.interimResults = this.interimResults;
    this.recognition.lang = this.settings.language;
    this.recognition.maxAlternatives = 3;

    // Event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateSpeechUI('listening');
      this.showSpeechFeedback('🎤 Listening...', 'listening');

      if (this.voiceEngine && this.settings.speakResponses) {
        this.voiceEngine.speak('Listening', {
          type: 'notification',
          interrupt: false,
          volume: 0.5,
        });
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.updateSpeechUI('idle');
      this.hideSpeechFeedback();

      // Auto-restart if continuous mode and still enabled
      if (this.settings.continuous && this.isEnabled) {
        setTimeout(() => {
          if (this.isEnabled && !this.isListening) {
            this.startListening();
          }
        }, 1000);
      }
    };

    this.recognition.onresult = event => {
      this.processRecognitionResults(event);
    };

    this.recognition.onerror = event => {
      this.handleRecognitionError(event);
    };

    this.recognition.onnomatch = () => {
      this.showSpeechFeedback('❌ No speech recognized', 'error');
    };

    this.recognition.onspeechstart = () => {
      this.updateSpeechUI('speaking');
    };

    this.recognition.onspeechend = () => {
      this.updateSpeechUI('processing');
    };
  }

  processRecognitionResults(event) {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      this.confidence = result[0].confidence;

      if (result.isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // Show interim results
    if (interimTranscript) {
      this.showSpeechFeedback(`🎤 "${interimTranscript}"`, 'processing');
    }

    // Process final results
    if (finalTranscript) {
      this.processFinalTranscript(finalTranscript.trim());
    }
  }

  async processFinalTranscript(transcript) {
    // Update UI
    this.showSpeechFeedback(`✅ "${transcript}"`, 'success');
    this.commandBuffer = transcript;

    // Check wake word activation
    if (this.settings.wakeWord && !this.isActivated) {
      if (this.checkWakeWord(transcript)) {
        this.activateVoiceControl();
        return;
      } else {
        // Not activated, ignore command
        return;
      }
    }

    // Low confidence warning
    if (this.confidence < this.settings.sensitivity) {
      this.showSpeechFeedback(
        `⚠️ Low confidence (${(this.confidence * 100).toFixed(1)}%)`,
        'warning'
      );

      if (this.settings.confirmCommands) {
        const confirmed = await this.confirmLowConfidenceCommand(transcript);
        if (!confirmed) return;
      }
    }

    // Process the voice command
    await this.processVoiceCommand(transcript);
  }

  checkWakeWord(transcript) {
    const lowerTranscript = transcript.toLowerCase();
    const activationPhrase = this.settings.activationPhrase.toLowerCase();

    return (
      lowerTranscript.includes(activationPhrase) || lowerTranscript.startsWith(activationPhrase)
    );
  }

  activateVoiceControl() {
    this.isActivated = true;
    this.showSpeechFeedback('🔥 Voice control activated', 'activated');

    if (this.voiceEngine && this.settings.speakResponses) {
      this.voiceEngine.speak('Voice control activated. How can I help?', {
        type: 'notification',
        interrupt: true,
      });
    }

    // Auto-deactivate after timeout
    setTimeout(() => {
      if (this.isActivated) {
        this.deactivateVoiceControl();
      }
    }, this.settings.timeout);
  }

  deactivateVoiceControl() {
    this.isActivated = false;
    this.showSpeechFeedback('💤 Voice control deactivated', 'deactivated');
  }

  async processVoiceCommand(transcript) {
    const lowerTranscript = transcript.toLowerCase();

    // Check for special commands first
    if (await this.handleSpecialCommands(lowerTranscript)) {
      return;
    }

    // Check for direct command matches
    const directCommand = this.findDirectCommand(lowerTranscript);
    if (directCommand) {
      await this.executeCommand(directCommand, transcript);
      return;
    }

    // Check for custom commands
    const customCommand = this.findCustomCommand(lowerTranscript);
    if (customCommand) {
      await this.executeCommand(customCommand, transcript);
      return;
    }

    // Use AI assistance for natural language commands
    if (this.settings.aiAssistance && this.aiAssistant) {
      await this.processNaturalLanguageCommand(transcript);
      return;
    }

    // Command not recognized
    this.handleUnrecognizedCommand(transcript);
  }

  async handleSpecialCommands(lowerTranscript) {
    // Voice control commands
    if (lowerTranscript.includes('stop listening') || lowerTranscript.includes('stop voice')) {
      this.stopListening();
      this.speakResponse('Voice control stopped');
      return true;
    }

    if (lowerTranscript.includes('start listening') || lowerTranscript.includes('enable voice')) {
      this.startListening();
      this.speakResponse('Voice control enabled');
      return true;
    }

    if (lowerTranscript.includes('mute voice') || lowerTranscript.includes('silent mode')) {
      if (this.voiceEngine) {
        this.voiceEngine.mute();
        this.showSpeechFeedback('🔇 Voice muted', 'success');
      }
      return true;
    }

    if (lowerTranscript.includes('unmute voice') || lowerTranscript.includes('speak again')) {
      if (this.voiceEngine) {
        this.voiceEngine.unmute();
        this.speakResponse('Voice unmuted');
      }
      return true;
    }

    // Terminal control commands
    if (lowerTranscript.includes('clear screen') || lowerTranscript.includes('clear terminal')) {
      this.executeTerminalCommand(process.platform === 'win32' ? 'cls' : 'clear');
      this.speakResponse('Screen cleared');
      return true;
    }

    if (lowerTranscript.includes('show help') || lowerTranscript.includes('voice help')) {
      this.showVoiceHelp();
      return true;
    }

    if (lowerTranscript.includes('repeat last') || lowerTranscript.includes('say again')) {
      if (this.lastCommand) {
        this.speakResponse(`Last command was: ${this.lastCommand}`);
      } else {
        this.speakResponse('No previous command to repeat');
      }
      return true;
    }

    return false;
  }

  findDirectCommand(lowerTranscript) {
    // Navigation commands
    if (lowerTranscript.includes('go home') || lowerTranscript.includes('home directory')) {
      return 'cd ~';
    }
    if (lowerTranscript.includes('go up') || lowerTranscript.includes('parent directory')) {
      return 'cd ..';
    }
    if (lowerTranscript.includes('list files') || lowerTranscript.includes('show files')) {
      return process.platform === 'win32' ? 'dir' : 'ls -la';
    }
    if (lowerTranscript.includes('current directory') || lowerTranscript.includes('where am i')) {
      return 'pwd';
    }

    // Git commands
    if (lowerTranscript.includes('git status') || lowerTranscript.includes('check git')) {
      return 'git status';
    }
    if (lowerTranscript.includes('git add all') || lowerTranscript.includes('stage all')) {
      return 'git add .';
    }
    if (lowerTranscript.includes('git commit')) {
      return 'git commit -m "Voice commit"';
    }
    if (lowerTranscript.includes('git push')) {
      return 'git push';
    }
    if (lowerTranscript.includes('git pull')) {
      return 'git pull';
    }

    // NPM commands
    if (
      lowerTranscript.includes('npm install') ||
      lowerTranscript.includes('install dependencies')
    ) {
      return 'npm install';
    }
    if (lowerTranscript.includes('npm start') || lowerTranscript.includes('start server')) {
      return 'npm start';
    }
    if (lowerTranscript.includes('npm test') || lowerTranscript.includes('run tests')) {
      return 'npm test';
    }
    if (lowerTranscript.includes('npm build') || lowerTranscript.includes('build project')) {
      return 'npm run build';
    }

    // System commands
    if (lowerTranscript.includes('node version')) {
      return 'node --version';
    }
    if (lowerTranscript.includes('npm version')) {
      return 'npm --version';
    }

    return null;
  }

  findCustomCommand(lowerTranscript) {
    for (const [phrase, command] of this.customCommands) {
      if (lowerTranscript.includes(phrase.toLowerCase())) {
        return command;
      }
    }
    return null;
  }

  async processNaturalLanguageCommand(transcript) {
    this.showSpeechFeedback('🤖 Processing with AI...', 'processing');

    try {
      // Use AI assistant to interpret the command
      const aiCommand = await this.aiAssistant.getCommandSuggestion(transcript);

      if (aiCommand && aiCommand.trim()) {
        // Confirm with user if enabled
        if (this.settings.confirmCommands) {
          const confirmed = await this.confirmAICommand(transcript, aiCommand);
          if (!confirmed) return;
        }

        await this.executeCommand(aiCommand, transcript);
        this.speakResponse(`Executed: ${transcript}`);
      } else {
        this.handleUnrecognizedCommand(transcript);
      }
    } catch (error) {
      console.error('AI command processing error:', error);
      this.showSpeechFeedback('❌ AI processing failed', 'error');
      this.speakResponse('Sorry, I had trouble understanding that command');
    }
  }

  async executeCommand(command, originalTranscript) {
    this.lastCommand = originalTranscript;

    try {
      // Show what we're executing
      this.showSpeechFeedback(`⚡ Executing: ${command}`, 'executing');

      // Execute in terminal
      this.executeTerminalCommand(command);

      // Speak confirmation if enabled
      if (this.settings.speakResponses) {
        this.speakResponse(`Executed ${originalTranscript}`);
      }
    } catch (error) {
      console.error('Command execution error:', error);
      this.showSpeechFeedback(`❌ Execution failed: ${error.message}`, 'error');
      this.speakResponse('Command execution failed');
    }
  }

  executeTerminalCommand(command) {
    if (this.terminal && this.terminal.terminal) {
      // Write command to terminal and execute
      this.terminal.terminal.write(command + '\r');
    } else {
      throw new Error(new Error(new Error('Terminal not available')));
    }
  }

  handleUnrecognizedCommand(transcript) {
    this.showSpeechFeedback(`❓ Unrecognized: "${transcript}"`, 'error');
    this.speakResponse(
      `Sorry, I didn't understand "${transcript}". Try saying "show help" for available commands.`
    );
  }

  async confirmLowConfidenceCommand(transcript) {
    return new Promise(resolve => {
      const modal = this.createConfirmationModal(
        'Low Confidence Command',
        `I heard "${transcript}" but I'm not very confident. Execute anyway?`,
        resolve
      );
      document.body.appendChild(modal);
    });
  }

  async confirmAICommand(originalTranscript, aiCommand) {
    return new Promise(resolve => {
      const modal = this.createConfirmationModal(
        'AI Command Interpretation',
        `You said: "${originalTranscript}"\nI think you want to run: "${aiCommand}"\n\nExecute this command?`,
        resolve
      );
      document.body.appendChild(modal);
    });
  }

  createConfirmationModal(title, message, callback) {
    const modal = document.createElement('div');
    modal.className = 'voice-confirmation-modal modal';
    modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                </div>
                <div class="modal-body">
                    <p>${message.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="modal-footer">
                    <button id="confirm-yes" class="btn btn-success">Yes, Execute</button>
                    <button id="confirm-no" class="btn btn-secondary">No, Cancel</button>
                </div>
            </div>
        `;

    modal.querySelector('#confirm-yes').onclick = () => {
      document.body.removeChild(modal);
      callback(true);
    };

    modal.querySelector('#confirm-no').onclick = () => {
      document.body.removeChild(modal);
      callback(false);
    };

    // Auto-close after 10 seconds
    setTimeout(() => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
        callback(false);
      }
    }, 10000);

    return modal;
  }

  speakResponse(text) {
    if (this.voiceEngine && this.settings.speakResponses) {
      this.voiceEngine.speak(text, {
        type: 'result',
        interrupt: false,
      });
    }
  }

  handleRecognitionError(event) {
    console.error('Speech recognition error:', event.error);

    const errorMessages = {
      'no-speech': 'No speech detected',
      aborted: 'Speech recognition aborted',
      'audio-capture': 'Microphone not accessible',
      network: 'Network error occurred',
      'not-allowed': 'Microphone permission denied',
      'service-not-allowed': 'Speech service not allowed',
      'bad-grammar': 'Grammar error',
      'language-not-supported': 'Language not supported',
    };

    const message = errorMessages[event.error] || `Recognition error: ${event.error}`;
    this.showSpeechFeedback(`❌ ${message}`, 'error');

    // Try to restart if it's a temporary error
    if (['no-speech', 'aborted'].includes(event.error) && this.isEnabled) {
      setTimeout(() => {
        if (this.isEnabled && !this.isListening) {
          this.startListening();
        }
      }, 2000);
    }
  }

  createSpeechUI() {
    // Create speech indicator
    this.speechIndicator = document.createElement('div');
    this.speechIndicator.id = 'speech-indicator';
    this.speechIndicator.className = 'speech-indicator hidden';
    this.speechIndicator.innerHTML = `
            <div class="speech-status">
                <div class="speech-icon">🎤</div>
                <div class="speech-text">Speech Recognition</div>
            </div>
            <div class="speech-controls">
                <button id="toggle-speech" class="speech-btn">Toggle</button>
                <button id="speech-settings" class="speech-btn">Settings</button>
            </div>
        `;

    // Create confidence indicator
    this.confidenceIndicator = document.createElement('div');
    this.confidenceIndicator.id = 'confidence-indicator';
    this.confidenceIndicator.className = 'confidence-indicator hidden';
    this.confidenceIndicator.innerHTML = `
            <div class="confidence-bar">
                <div class="confidence-fill"></div>
            </div>
            <div class="confidence-text">Confidence: 0%</div>
        `;

    // Create speech feedback panel
    this.speechFeedback = document.createElement('div');
    this.speechFeedback.id = 'speech-feedback';
    this.speechFeedback.className = 'speech-feedback hidden';

    // Add to terminal
    const terminalContainer = document.querySelector('.terminal-container') || document.body;
    terminalContainer.appendChild(this.speechIndicator);
    terminalContainer.appendChild(this.confidenceIndicator);
    terminalContainer.appendChild(this.speechFeedback);

    // Add speech toggle to title bar
    this.addSpeechToggleButton();
  }

  addSpeechToggleButton() {
    const titleBarMenu = document.querySelector('.title-bar-menu');
    if (titleBarMenu) {
      const speechButton = document.createElement('button');
      speechButton.className = 'menu-btn';
      speechButton.id = 'speech-toggle';
      speechButton.title = 'Toggle Speech Recognition (F12)';
      speechButton.innerHTML = '🎤';

      // Insert before settings button
      const settingsBtn = document.getElementById('settings-btn');
      if (settingsBtn) {
        titleBarMenu.insertBefore(speechButton, settingsBtn);
      } else {
        titleBarMenu.appendChild(speechButton);
      }
    }
  }

  setupEventListeners() {
    // Speech toggle button
    document.getElementById('speech-toggle')?.addEventListener('click', () => {
      this.toggle();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      // F12 for speech toggle
      if (e.key === 'F12' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        this.toggle();
      }

      // Ctrl+Shift+S for speech settings
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        this.showSettings();
      }

      // Ctrl+Shift+T for speech training
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        this.showTraining();
      }
    });

    // Voice activation phrase detection (always listening for wake word)
    if (this.settings.wakeWord) {
      this.startWakeWordDetection();
    }
  }

  async startWakeWordDetection() {
    // Simplified wake word detection - in production, use a dedicated wake word engine
    try {
      const tempRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      tempRecognition.continuous = true;
      tempRecognition.interimResults = false;
      tempRecognition.lang = this.settings.language;

      tempRecognition.onresult = event => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        if (this.checkWakeWord(transcript)) {
          tempRecognition.stop();
          this.activateVoiceControl();
          this.startListening();
        }
      };

      tempRecognition.start();
    } catch (error) {
      console.warn('Wake word detection failed:', error);
    }
  }

  updateSpeechUI(state) {
    if (!this.speechIndicator) return;

    const icon = this.speechIndicator.querySelector('.speech-icon');
    const text = this.speechIndicator.querySelector('.speech-text');

    switch (state) {
      case 'listening':
        icon.textContent = '🔴';
        text.textContent = 'Listening...';
        this.speechIndicator.className = 'speech-indicator listening';
        break;
      case 'speaking':
        icon.textContent = '🗣️';
        text.textContent = 'Speaking detected';
        this.speechIndicator.className = 'speech-indicator speaking';
        break;
      case 'processing':
        icon.textContent = '🤖';
        text.textContent = 'Processing...';
        this.speechIndicator.className = 'speech-indicator processing';
        break;
      case 'idle':
      default:
        icon.textContent = '🎤';
        text.textContent = 'Speech Recognition';
        this.speechIndicator.className = 'speech-indicator idle';
        break;
    }

    // Update confidence indicator
    if (this.confidenceIndicator && this.confidence > 0) {
      const fill = this.confidenceIndicator.querySelector('.confidence-fill');
      const text = this.confidenceIndicator.querySelector('.confidence-text');
      const percentage = Math.round(this.confidence * 100);

      fill.style.width = `${percentage}%`;
      text.textContent = `Confidence: ${percentage}%`;

      // Color based on confidence level
      if (percentage >= 80) {
        fill.style.backgroundColor = '#4CAF50';
      } else if (percentage >= 60) {
        fill.style.backgroundColor = '#FF9800';
      } else {
        fill.style.backgroundColor = '#F44336';
      }
    }
  }

  showSpeechFeedback(message, type = 'info') {
    if (!this.speechFeedback) return;

    this.speechFeedback.textContent = message;
    this.speechFeedback.className = `speech-feedback ${type}`;

    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.hideSpeechFeedback();
    }, 3000);
  }

  hideSpeechFeedback() {
    if (this.speechFeedback) {
      this.speechFeedback.className = 'speech-feedback hidden';
    }
  }

  // Public API methods
  enable() {
    this.isEnabled = true;
    this.settings.enabled = true;
    this.saveSettings();

    if (this.speechIndicator) {
      this.speechIndicator.classList.remove('hidden');
    }
    if (this.confidenceIndicator) {
      this.confidenceIndicator.classList.remove('hidden');
    }

    this.speakResponse('Speech recognition enabled');
  }

  disable() {
    this.isEnabled = false;
    this.settings.enabled = false;
    this.saveSettings();

    if (this.isListening) {
      this.stopListening();
    }

    if (this.speechIndicator) {
      this.speechIndicator.classList.add('hidden');
    }
    if (this.confidenceIndicator) {
      this.confidenceIndicator.classList.add('hidden');
    }
  }

  toggle() {
    if (this.isEnabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  startListening() {
    if (!this.isEnabled || !this.recognition || this.isListening) return;

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.showSpeechFeedback('❌ Failed to start listening', 'error');
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  addCustomCommand(phrase, command) {
    this.customCommands.set(phrase.toLowerCase(), command);
    this.saveSettings();
    this.speakResponse(`Custom command "${phrase}" added`);
  }

  removeCustomCommand(phrase) {
    const removed = this.customCommands.delete(phrase.toLowerCase());
    if (removed) {
      this.saveSettings();
      this.speakResponse(`Custom command "${phrase}" removed`);
    } else {
      this.speakResponse(`Custom command "${phrase}" not found`);
    }
  }

  showVoiceHelp() {
    const helpCommands = [
      'Voice Commands Available:',
      '• "list files" - Show directory contents',
      '• "go home" - Navigate to home directory',
      '• "git status" - Check repository status',
      '• "npm install" - Install dependencies',
      '• "clear screen" - Clear terminal',
      '• "stop listening" - Disable voice control',
      '• "show help" - Display this help',
      '',
      'Natural language commands are also supported!',
    ];

    const helpText = helpCommands.join('\n');

    // Show in terminal if available
    if (this.terminal && this.terminal.terminal) {
      this.terminal.terminal.write('\r\n' + helpText + '\r\n');
    }

    // Also speak the help
    this.speakResponse('Voice commands help displayed in terminal');
  }

  showSettings() {
    // Implementation for speech settings modal
    this.speakResponse('Speech settings opened');
  }

  showTraining() {
    // Implementation for speech training interface
    this.speakResponse('Speech training opened');
  }

  // Settings management
  loadSettings() {
    try {
      const saved = localStorage.getItem('rinawarp_speech_settings');
      if (saved) {
        const savedSettings = JSON.parse(saved);
        this.settings = { ...this.settings, ...savedSettings };
      }
    } catch (error) {
      console.warn('Failed to load speech settings:', error);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem(
        'rinawarp_speech_settings',
        JSON.stringify({
          ...this.settings,
          customCommands: Array.from(this.customCommands.entries()),
        })
      );
    } catch (error) {
      console.warn('Failed to save speech settings:', error);
    }
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();

    // Apply new settings
    if (this.recognition) {
      this.recognition.continuous = this.settings.continuous;
      this.recognition.lang = this.settings.language;
    }

    this.activationPhrase = this.settings.activationPhrase;
    this.voiceActivationTimeout = this.settings.timeout;
  }

  getStatus() {
    return {
      enabled: this.isEnabled,
      listening: this.isListening,
      activated: this.isActivated || false,
      confidence: this.confidence,
      language: this.settings.language,
      customCommandsCount: this.customCommands.size,
      lastCommand: this.lastCommand,
      settings: { ...this.settings },
    };
  }

  initializeCommandPatterns() {
    // Extended command patterns for better recognition
    return {
      navigation: {
        patterns: ['go to', 'navigate to', 'change to', 'move to'],
        commands: {
          home: 'cd ~',
          up: 'cd ..',
          back: 'cd ..',
          root: 'cd /',
        },
      },
      files: {
        patterns: ['list', 'show', 'display'],
        commands: {
          files: process.platform === 'win32' ? 'dir' : 'ls -la',
          'hidden files': 'ls -la',
          details: 'ls -la',
        },
      },
      git: {
        patterns: ['git'],
        commands: {
          status: 'git status',
          'add all': 'git add .',
          commit: 'git commit',
          push: 'git push',
          pull: 'git pull',
        },
      },
    };
  }
}

// Export for global use
window.SpeechRecognitionEngine = SpeechRecognitionEngine;
