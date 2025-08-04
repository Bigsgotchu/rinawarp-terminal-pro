/**
 * Voice Engine for RinaWarp Terminal
 * Provides speech recognition, text-to-speech, and voice-activated commands
 */

const config = require('../config/unified-config.cjs');

class VoiceEngine {
  constructor(terminal, aiAssistant) {
    this.terminal = terminal;
    this.aiAssistant = aiAssistant;
    this.voiceEnabled = config.get('features.voiceControl') || false;
    this.isListening = false;
    this.isSpeaking = false;
    this.recognition = null;
    this.synthesis = null;

    this.voiceCommands = this.initializeVoiceCommands();
    this.setupVoiceEngine();
  }

  initializeVoiceCommands() {
    return {
      // Navigation commands
      'go to home': 'cd ~',
      'go home': 'cd ~',
      'go up': 'cd ..',
      'go back': 'cd ..',
      'list files': process.platform === 'win32' ? 'dir' : 'ls',
      'list directory': process.platform === 'win32' ? 'dir' : 'ls',
      'show files': process.platform === 'win32' ? 'dir' : 'ls -la',

      // Git commands
      'git status': 'git status',
      'git add all': 'git add .',
      'git commit': 'git commit -m "Voice commit"',
      'git push': 'git push',
      'git pull': 'git pull',
      'check git status': 'git status',

      // NPM commands
      'npm install': 'npm install',
      'npm start': 'npm start',
      'npm test': 'npm test',
      'npm build': 'npm run build',

      // System commands
      'clear screen': process.platform === 'win32' ? 'cls' : 'clear',
      'clear terminal': process.platform === 'win32' ? 'cls' : 'clear',
      'show help': 'help',
      'node version': 'node --version',
      'npm version': 'npm --version',

      // Terminal control
      'stop listening': '__STOP_LISTENING__',
      'start listening': '__START_LISTENING__',
      'speak result': '__SPEAK_LAST_OUTPUT__',
      'read output': '__SPEAK_LAST_OUTPUT__',
      'show ai help': '__SHOW_AI_HELP__',
      'toggle theme': '__CYCLE_THEME__',

      // File operations
      'make directory': 'mkdir',
      'create folder': 'mkdir',
      'remove file': process.platform === 'win32' ? 'del' : 'rm',
      'copy file': process.platform === 'win32' ? 'copy' : 'cp',
      'move file': process.platform === 'win32' ? 'move' : 'mv',
    };
  }

  setupVoiceEngine() {
    if (!this.checkVoiceSupport()) {
      console.warn('Voice features not supported in this browser');
      return;
    }

    this.setupSpeechRecognition();
    this.setupSpeechSynthesis();
    this.createVoiceUI();
  }

  checkVoiceSupport() {
    return (
      !!(window.SpeechRecognition || window.webkitSpeechRecognition) && !!window.speechSynthesis
    );
  }

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateVoiceUI();
      this.showVoiceStatus('🎤 Listening...', 'listening');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.updateVoiceUI();
      this.showVoiceStatus('🎤 Voice inactive', 'inactive');
    };

    this.recognition.onresult = event => {
      const results = Array.from(event.results);
      const transcript = results
        .map(result => result[0].transcript)
        .join('')
        .toLowerCase()
        .trim();

      if (event.results[event.results.length - 1].isFinal) {
        this.processVoiceCommand(transcript);
      } else {
        // Show interim results
        this.showVoiceStatus(`🎤 "${transcript}"`, 'processing');
      }
    };

    this.recognition.onerror = event => {
      console.warn('Speech recognition error:', event.error);
      this.showVoiceStatus(`❌ Voice error: ${event.error}`, 'error');
    };
  }

  setupSpeechSynthesis() {
    this.synthesis = window.speechSynthesis;

    // Get available voices
    this.voices = [];
    this.loadVoices();

    // Load voices when they become available
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  loadVoices() {
    this.voices = speechSynthesis.getVoices();

    // Prefer English voices
    this.selectedVoice =
      this.voices.find(voice => voice.lang.startsWith('en') && voice.localService) ||
      this.voices[0];
  }

  createVoiceUI() {
    this.createVoiceButton();
    this.createVoiceStatusPanel();
    this.createVoiceSettings();
  }

  createVoiceButton() {
    const voiceButton = document.createElement('button');
    voiceButton.id = 'voice-control-button';
    voiceButton.innerHTML = '🎤';
    voiceButton.className = 'voice-control-button';
    voiceButton.title = 'Click to toggle voice control (or say "start listening")';

    voiceButton.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: var(--accent-color, #00ff88);
      color: var(--bg-primary, #1a1a1a);
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
    `;

    voiceButton.onclick = () => this.toggleVoiceRecognition();
    document.body.appendChild(voiceButton);

    this.voiceButton = voiceButton;
  }

  createVoiceStatusPanel() {
    const statusPanel = document.createElement('div');
    statusPanel.id = 'voice-status-panel';
    statusPanel.className = 'voice-status-panel';

    statusPanel.style.cssText = `
      position: fixed;
      bottom: 150px;
      right: 20px;
      background: var(--header-bg, #2a2a2a);
      border: 1px solid var(--border-color, #3a3a3a);
      border-radius: 10px;
      padding: 15px;
      min-width: 250px;
      display: none;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    statusPanel.innerHTML = `
      <div class="voice-status-header">
        <span class="voice-status-text">🎤 Voice Control</span>
        <button class="close-voice-status">×</button>
      </div>
      <div class="voice-status-body">
        <div class="voice-commands-list">
          <strong>Available Commands:</strong>
          <ul>
            <li>"list files" - Show directory contents</li>
            <li>"git status" - Check repository status</li>
            <li>"clear screen" - Clear terminal</li>
            <li>"npm install" - Install dependencies</li>
            <li>"go home" - Navigate to home directory</li>
            <li>"stop listening" - Disable voice control</li>
          </ul>
        </div>
      </div>
    `;

    document.body.appendChild(statusPanel);

    statusPanel.querySelector('.close-voice-status').onclick = () => {
      statusPanel.style.display = 'none';
    };

    this.statusPanel = statusPanel;
  }

  createVoiceSettings() {
    // Add voice settings to AI help dialog
    const voiceSettings = {
      enabled: this.voiceEnabled,
      autoSpeak: config.get('voice.autoSpeak') || false,
      voiceSpeed: config.get('voice.speed') || 1.0,
      voiceVolume: config.get('voice.volume') || 0.8,
    };

    this.voiceSettings = voiceSettings;
  }

  toggleVoiceRecognition() {
    if (!this.recognition) {
      this.showVoiceStatus('❌ Voice recognition not supported', 'error');
      return;
    }

    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  startListening() {
    if (!this.voiceEnabled) {
      this.voiceEnabled = true;
      config.set('features.voiceControl', true);
    }

    try {
      this.recognition.start();
      this.statusPanel.style.display = 'block';
    } catch (error) {
      console.warn('Failed to start voice recognition:', error);
      this.showVoiceStatus('❌ Failed to start listening', 'error');
    }
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
    this.statusPanel.style.display = 'none';
  }

  processVoiceCommand(transcript) {
    console.log('Voice command received:', transcript);

    // Handle special commands
    if (transcript.includes('stop listening')) {
      this.stopListening();
      this.speak('Voice control disabled');
      return;
    }

    if (transcript.includes('show ai help')) {
      if (this.aiAssistant) {
        this.aiAssistant.showAIHelpDialog();
      }
      return;
    }

    if (transcript.includes('speak result') || transcript.includes('read output')) {
      this.speakLastOutput();
      return;
    }

    if (transcript.includes('toggle theme')) {
      this.cycleTheme();
      return;
    }

    // Find matching command
    const command = this.findVoiceCommand(transcript);
    if (command) {
      this.executeVoiceCommand(command, transcript);
    } else {
      // Try AI assistance for unknown commands
      this.handleUnknownVoiceCommand(transcript);
    }
  }

  findVoiceCommand(transcript) {
    // Direct match
    if (this.voiceCommands[transcript]) {
      return this.voiceCommands[transcript];
    }

    // Partial match
    for (const [phrase, command] of Object.entries(this.voiceCommands)) {
      if (transcript.includes(phrase)) {
        return command;
      }
    }

    return null;
  }

  executeVoiceCommand(command, originalTranscript) {
    this.showVoiceStatus(`✅ Executing: "${originalTranscript}"`, 'success');

    // Write command to terminal
    if (this.terminal && this.terminal.terminal) {
      this.terminal.terminal.write(command + '\r');
    }

    // Speak confirmation if auto-speak is enabled
    if (this.voiceSettings.autoSpeak) {
      this.speak(`Executing ${originalTranscript}`);
    }
  }

  handleUnknownVoiceCommand(transcript) {
    this.showVoiceStatus(`❓ Unknown command: "${transcript}"`, 'warning');

    // Try to suggest similar commands
    const suggestions = this.getSimilarCommands(transcript);
    if (suggestions.length > 0) {
      const suggestion = suggestions[0];
      this.speak(`Did you mean ${suggestion}?`);
      this.showVoiceStatus(`💡 Did you mean: "${suggestion}"?`, 'suggestion');
    } else {
      this.speak(
        `Sorry, I didn't understand "${transcript}". Try saying "show ai help" for available commands.`
      );
    }
  }

  getSimilarCommands(transcript) {
    const words = transcript.split(' ');
    const suggestions = [];

    for (const command of Object.keys(this.voiceCommands)) {
      const commandWords = command.split(' ');
      const matchCount = words.filter(word =>
        commandWords.some(cmdWord => cmdWord.includes(word) || word.includes(cmdWord))
      ).length;

      if (matchCount > 0) {
        suggestions.push({ command, score: matchCount });
      }
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.command);
  }

  speak(text, options = {}) {
    if (!this.synthesis || this.isSpeaking) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.selectedVoice;
    utterance.rate = options.rate || this.voiceSettings.voiceSpeed;
    utterance.volume = options.volume || this.voiceSettings.voiceVolume;
    utterance.pitch = options.pitch || 1.0;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.updateVoiceUI();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.updateVoiceUI();
    };

    utterance.onerror = event => {
      console.warn('Speech synthesis error:', event.error);
      this.isSpeaking = false;
      this.updateVoiceUI();
    };

    this.synthesis.speak(utterance);
  }

  speakLastOutput() {
    // Get last terminal output (simplified - would need proper terminal buffer access)
    const terminalContent = this.terminal?.element?.textContent || '';
    const lines = terminalContent.split('\n').slice(-5); // Last 5 lines
    const lastOutput = lines.join('. ');

    if (lastOutput.trim()) {
      this.speak(`Terminal output: ${lastOutput}`);
    } else {
      this.speak('No recent terminal output to read');
    }
  }

  cycleTheme() {
    // Cycle through available themes
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
      const currentIndex = themeSelector.selectedIndex;
      const nextIndex = (currentIndex + 1) % themeSelector.options.length;
      themeSelector.selectedIndex = nextIndex;

      // Trigger change event
      const event = new Event('change');
      themeSelector.dispatchEvent(event);

      const themeName = themeSelector.options[nextIndex].text;
      this.speak(`Theme changed to ${themeName}`);
    }
  }

  showVoiceStatus(message, type = 'info') {
    const statusText = this.statusPanel?.querySelector('.voice-status-text');
    if (statusText) {
      statusText.textContent = message;
      statusText.className = `voice-status-text voice-status-${type}`;
    }

    // Auto-hide after 3 seconds for non-critical messages
    if (type !== 'listening') {
      setTimeout(() => {
        if (statusText && statusText.textContent === message) {
          statusText.textContent = '🎤 Voice Control';
          statusText.className = 'voice-status-text';
        }
      }, 3000);
    }
  }

  updateVoiceUI() {
    if (this.voiceButton) {
      if (this.isListening) {
        this.voiceButton.style.background = '#ff6b6b';
        this.voiceButton.style.animation = 'pulse 1s infinite';
        this.voiceButton.innerHTML = '🔴';
        this.voiceButton.title = 'Voice listening... Click to stop';
      } else if (this.isSpeaking) {
        this.voiceButton.style.background = '#ffd93d';
        this.voiceButton.innerHTML = '🔊';
        this.voiceButton.title = 'Speaking...';
      } else {
        this.voiceButton.style.background = 'var(--accent-color, #00ff88)';
        this.voiceButton.style.animation = 'none';
        this.voiceButton.innerHTML = '🎤';
        this.voiceButton.title = 'Click to start voice control';
      }
    }
  }

  enable(enabled = true) {
    this.voiceEnabled = enabled;
    config.set('features.voiceControl', enabled);

    if (this.voiceButton) {
      this.voiceButton.style.display = enabled ? 'block' : 'none';
    }

    if (!enabled && this.isListening) {
      this.stopListening();
    }
  }

  // Voice command training
  addCustomCommand(phrase, command) {
    this.voiceCommands[phrase.toLowerCase()] = command;
    config.set('voice.customCommands', this.voiceCommands);
  }

  removeCustomCommand(phrase) {
    delete this.voiceCommands[phrase.toLowerCase()];
    config.set('voice.customCommands', this.voiceCommands);
  }

  getAvailableCommands() {
    return Object.keys(this.voiceCommands);
  }
}

module.exports = VoiceEngine;
