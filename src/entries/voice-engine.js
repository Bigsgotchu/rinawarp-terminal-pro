/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Voice Engine Entry Point
 * Lazy-loaded voice recognition and synthesis functionality
 */

import { VoiceEngine } from '@/renderer/voice-engine.js';
import { VoiceCommandSystem } from '@/renderer/voice-command-system.js';
import { SpeechRecognition } from '@/renderer/speech-recognition.js';

class RinaWarpVoiceFeature {
  constructor(terminal) {
    this.terminal = terminal;
    this.voiceEngine = null;
    this.commandSystem = null;
    this.speechRecognition = null;
    this.isListening = false;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Check for browser support
      if (!this.checkVoiceSupport()) {
        throw new Error(new Error(new Error('Voice features not supported in this browser')));
      }

      // Initialize voice components
      this.voiceEngine = new VoiceEngine();
      this.commandSystem = new VoiceCommandSystem();
      this.speechRecognition = new SpeechRecognition();

      // Set up commands
      this.setupCommands();

      // Initialize components
      await this.voiceEngine.initialize();
      await this.commandSystem.initialize();
      await this.speechRecognition.initialize();

      // Set up voice command handlers
      this.setupVoiceHandlers();

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Voice Engine:', error);
      throw new Error(new Error(error));
    }
  }

  checkVoiceSupport() {
    return (
      'speechSynthesis' in window &&
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
    );
  }

  setupCommands() {
    this.terminal.addCommand('voice', action => this.handleVoiceCommand(action));
    this.terminal.addCommand('speak', text => this.speak(text));
    this.terminal.addCommand('listen', () => this.startListening());
    this.terminal.addCommand('voice-help', () => this.showVoiceHelp());
  }

  setupVoiceHandlers() {
    this.commandSystem.on('command', command => {
      this.handleVoiceCommand(command);
    });

    this.speechRecognition.on('result', text => {
      this.terminal.writeLine(`🎤 Heard: "${text}"`);
      this.processVoiceInput(text);
    });

    this.speechRecognition.on('error', error => {
      this.terminal.writeError(`Voice Error: ${error.message}`);
    });
  }

  async handleVoiceCommand(action) {
    switch (action) {
      case 'start':
      case 'on':
        await this.startListening();
        break;

      case 'stop':
      case 'off':
        await this.stopListening();
        break;

      case 'status':
        this.showVoiceStatus();
        break;

      case 'test':
        await this.testVoice();
        break;

      default:
        this.showVoiceHelp();
    }
  }

  async startListening() {
    if (this.isListening) {
      this.terminal.writeLine('Voice recognition is already active');
      return;
    }

    try {
      await this.speechRecognition.startListening();
      this.isListening = true;
      this.terminal.writeSuccess('🎤 Voice recognition started - speak now!');
      this.speak('Voice recognition activated');
    } catch (error) {
      this.terminal.writeError(`Failed to start voice recognition: ${error.message}`);
    }
  }

  async stopListening() {
    if (!this.isListening) {
      this.terminal.writeLine('Voice recognition is not active');
      return;
    }

    try {
      await this.speechRecognition.stopListening();
      this.isListening = false;
      this.terminal.writeSuccess('🎤 Voice recognition stopped');
      this.speak('Voice recognition deactivated');
    } catch (error) {
      this.terminal.writeError(`Failed to stop voice recognition: ${error.message}`);
    }
  }

  async speak(text) {
    if (!text || text.trim() === '') {
      this.terminal.writeLine('Usage: speak \u003ctext to speak\u003e');
      return;
    }

    try {
      await this.voiceEngine.speak(text);
      this.terminal.writeLine(`🔊 Speaking: "${text}"`);
    } catch (error) {
      this.terminal.writeError(`Speech Error: ${error.message}`);
    }
  }

  async processVoiceInput(text) {
    const normalizedText = text.toLowerCase().trim();

    // Voice command patterns
    const commands = {
      'clear screen': 'clear',
      'clear terminal': 'clear',
      'show help': 'help',
      'list files': 'ls -la',
      'show directory': 'pwd',
      'show vitals': 'vitals',
      'load ai': 'load-ai',
      'stop voice': 'voice stop',
      'voice off': 'voice off',
    };

    // Check for direct command matches
    if (commands[normalizedText]) {
      this.terminal.executeCommand(commands[normalizedText]);
      return;
    }

    // Check for patterns
    if (normalizedText.includes('say ')) {
      const textToSpeak = normalizedText.replace('say ', '');
      await this.speak(textToSpeak);
      return;
    }

    if (normalizedText.includes('run ') || normalizedText.includes('execute ')) {
      const command = normalizedText.replace(/^(run |execute )/, '');
      this.terminal.executeCommand(command);
      return;
    }

    // Fallback - try to execute as command
    this.terminal.writeLine(`❓ Interpreting voice command: "${text}"`);
    this.terminal.executeCommand(text);
  }

  showVoiceStatus() {
    const status = {
      listening: this.isListening,
      speechSynthesis: 'speechSynthesis' in window,
      speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
      voices: this.voiceEngine.getAvailableVoices().length,
    };

    this.terminal.writeLine(`
🎤 Voice Engine Status:
======================
Listening: ${status.listening ? '✅ Active' : '❌ Inactive'}
Speech Synthesis: ${status.speechSynthesis ? '✅ Supported' : '❌ Not Supported'}
Speech Recognition: ${status.speechRecognition ? '✅ Supported' : '❌ Not Supported'}
Available Voices: ${status.voices}
    `);
  }

  async testVoice() {
    this.terminal.writeLine('🔊 Testing voice synthesis...');
    await this.speak(
      'Voice engine test successful. RinaWarp Terminal is ready for voice commands.'
    );

    if (!this.isListening) {
      this.terminal.writeLine('🎤 Testing voice recognition... (speak "test complete" to confirm)');
      await this.startListening();
    }
  }

  showVoiceHelp() {
    this.terminal.writeLine(`
🎤 Voice Engine Commands:
========================
  voice start/on     - Start voice recognition
  voice stop/off     - Stop voice recognition
  voice status       - Show voice engine status
  voice test         - Test voice functionality
  speak \u003ctext\u003e       - Speak the given text
  listen             - Start listening for voice commands

Voice Commands (while listening):
  "clear screen"     - Clear the terminal
  "show help"        - Display help
  "list files"       - List directory contents
  "show vitals"      - Display system vitals
  "load ai"          - Load AI assistant
  "say \u003ctext\u003e"      - Speak text
  "run \u003ccommand\u003e"    - Execute command
  "stop voice"       - Stop voice recognition

Examples:
  voice start
  speak "Hello, RinaWarp!"
  (while listening) "clear screen"
    `);
  }

  async cleanup() {
    if (this.isListening) {
      await this.stopListening();
    }

    if (this.voiceEngine) {
      await this.voiceEngine.cleanup();
    }
    if (this.commandSystem) {
      await this.commandSystem.cleanup();
    }
    if (this.speechRecognition) {
      await this.speechRecognition.cleanup();
    }

    this.initialized = false;
  }

  // Public API
  getVoiceEngine() {
    return this.voiceEngine;
  }

  getCommandSystem() {
    return this.commandSystem;
  }

  getSpeechRecognition() {
    return this.speechRecognition;
  }

  isVoiceListening() {
    return this.isListening;
  }

  async toggleListening() {
    if (this.isListening) {
      await this.stopListening();
    } else {
      await this.startListening();
    }
  }
}

export default RinaWarpVoiceFeature;
