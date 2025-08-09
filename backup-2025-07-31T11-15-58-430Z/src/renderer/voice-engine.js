/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal - Voice Engine
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * Advanced Text-to-Speech engine with custom voice recording and cloning capabilities
 */

// Import centralized logger
let logger = {
  info: (msg, ctx) => console.info(`[INFO] ${msg}`, ctx),
  warn: (msg, ctx) => console.warn(`[WARN] ${msg}`, ctx),
  error: (msg, ctx) => console.error(`[ERROR] ${msg}`, ctx),
  system: (msg, ctx) => console.info(`[SYSTEM] ${msg}`, ctx),
};

// Try to load the actual logger module
(async () => {
  try {
    const loggerModule = await import('../utils/logger.js');
    logger = loggerModule.default;
  } catch (error) {
    console.warn('Failed to load logger module, using fallback console logging');
  }
})();

export class VoiceEngine {
  constructor() {
    this.isEnabled = false;
    this.isMuted = false;
    this.currentVoice = null;
    this.customVoices = new Map();
    this.speechQueue = [];
    this.isProcessingQueue = false;

    // Speech Synthesis API
    this.synth = window.speechSynthesis;
    this.voices = [];

    // Voice Recording for custom voice
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;

    // Audio context for voice processing
    this.audioContext = null;
    this.audioBuffer = null;

    // Settings
    this.settings = {
      volume: 0.8,
      rate: 1.0,
      pitch: 1.0,
      voice: 'default',
      useCustomVoice: true, // Default to using custom voice
      customVoiceName: 'creator_voice', // Creator's voice as default
      announceCommands: true,
      announceResults: true,
      announceErrors: true,
      announceNotifications: true,
    };

    this.initialize();
  }

  async initialize() {
    try {
      // Check for authorization (allow development mode)
      if (!process.env.RINAWARP_CREATOR && process.env.NODE_ENV === 'production') {
        throw new Error(new Error('Unauthorized access to Voice Engine'));
      }

      // Load voices when they become available
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
      this.loadVoices();

      // Initialize audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Load settings
      this.loadSettings();

      // Load custom voices
      await this.loadCustomVoices();

      logger.system('Voice Engine initialized successfully', { component: 'voice-engine' });
      return true;
    } catch (error) {
      logger.error('Voice Engine initialization failed', {
        component: 'voice-engine',
        error: error.message,
        stack: error.stack,
      });
      return false;
    }
  }

  loadVoices() {
    this.voices = this.synth.getVoices();
    logger.info('System voices loaded', {
      component: 'voice-engine',
      voiceCount: this.voices.length,
    });

    // Try to find a good default voice
    if (!this.currentVoice && this.voices.length > 0) {
      // Prefer female voices for Rina
      const preferredVoices = this.voices.filter(
        voice =>
          voice.lang.startsWith('en') &&
          (voice.name.toLowerCase().includes('female') ||
            voice.name.toLowerCase().includes('samantha') ||
            voice.name.toLowerCase().includes('zira') ||
            voice.name.toLowerCase().includes('hazel'))
      );

      this.currentVoice =
        preferredVoices[0] || this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];
    }
  }

  // Main TTS function
  speak(text, options = {}) {
    if (this.isMuted || !this.isEnabled) return;

    const speechOptions = {
      interrupt: false,
      priority: 'normal', // 'high', 'normal', 'low'
      type: 'general', // 'command', 'result', 'error', 'notification', 'general'
      ...options,
    };

    // Check if this type of announcement is enabled
    if (!this.shouldAnnounce(speechOptions.type)) return;

    // Add to queue or interrupt current speech
    if (speechOptions.interrupt) {
      this.synth.cancel();
      this.speechQueue = [];
    }

    this.speechQueue.push({ text, options: speechOptions });
    this.processQueue();
  }

  shouldAnnounce(type) {
    switch (type) {
      case 'command':
        return this.settings.announceCommands;
      case 'result':
        return this.settings.announceResults;
      case 'error':
        return this.settings.announceErrors;
      case 'notification':
        return this.settings.announceNotifications;
      default:
        return true;
    }
  }

  async processQueue() {
    if (this.isProcessingQueue || this.speechQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.speechQueue.length > 0) {
      const { text, options } = this.speechQueue.shift();
      await this.speakNow(text, options);
    }

    this.isProcessingQueue = false;
  }

  speakNow(text, options = {}) {
    return new Promise(resolve => {
      if (this.settings.useCustomVoice && this.customVoices.has(this.settings.customVoiceName)) {
        this.speakWithCustomVoice(text, options).then(resolve);
      } else {
        this.speakWithSystemVoice(text, options).then(resolve);
      }
    });
  }

  speakWithSystemVoice(text, options = {}) {
    return new Promise(resolve => {
      const utterance = new SpeechSynthesisUtterance(text);

      // Configure utterance
      utterance.voice = this.currentVoice;
      utterance.volume = this.settings.volume;
      utterance.rate = this.settings.rate;
      utterance.pitch = this.settings.pitch;

      // Event handlers
      utterance.onend = () => resolve();
      utterance.onerror = error => {
        logger.error('Speech synthesis error', {
          component: 'voice-engine',
          error: error.message || error,
        });
        resolve();
      };

      // Speak
      this.synth.speak(utterance);
    });
  }

  async speakWithCustomVoice(text, options = {}) {
    // This would use the recorded custom voice
    // For now, fall back to system voice
    // In a real implementation, you'd use voice cloning AI here
    logger.debug('Speaking with custom voice', {
      component: 'voice-engine',
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
    });
    return this.speakWithSystemVoice(text, options);
  }

  // Voice Recording Functions
  async startVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processRecordedVoice();
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;

      return true;
    } catch (error) {
      console.error('Failed to start voice recording:', error);
      return false;
    }
  }

  stopVoiceRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;

      // Stop all tracks
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());

      return true;
    }
    return false;
  }

  async processRecordedVoice() {
    try {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Store the custom voice
      const voiceName = this.settings.customVoiceName;
      this.customVoices.set(voiceName, {
        name: voiceName,
        audioBuffer: audioBuffer,
        blob: audioBlob,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        createdAt: new Date(),
      });

      // Save to local storage
      await this.saveCustomVoice(voiceName, audioBlob);

      // If this is the creator voice, install it permanently
      if (voiceName === 'creator_voice' && process.env.RINAWARP_CREATOR) {
        await this.installCreatorVoicePermanently(audioBlob, {
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
        });
      }

      // Enable custom voice usage
      this.settings.useCustomVoice = true;
      this.saveSettings();

      return true;
    } catch (error) {
      console.error('Failed to process recorded voice:', error);
      return false;
    }
  }

  async saveCustomVoice(voiceName, audioBlob) {
    try {
      // Convert blob to base64 for storage
      const base64Data = await this.blobToBase64(audioBlob);

      const voiceData = {
        name: voiceName,
        data: base64Data,
        createdAt: new Date().toISOString(),
        duration: this.customVoices.get(voiceName)?.duration || 0,
      };

      localStorage.setItem(`rinawarp_voice_${voiceName}`, JSON.stringify(voiceData));

      // Update voice list in settings
      const savedVoices = this.getSavedVoicesList();
      if (!savedVoices.includes(voiceName)) {
        savedVoices.push(voiceName);
        localStorage.setItem('rinawarp_saved_voices', JSON.stringify(savedVoices));
      }
    } catch (error) {
      console.error('Failed to save custom voice:', error);
    }
  }

  async loadCustomVoices() {
    try {
      const savedVoices = this.getSavedVoicesList();

      for (const voiceName of savedVoices) {
        const voiceDataStr = localStorage.getItem(`rinawarp_voice_${voiceName}`);
        if (voiceDataStr) {
          const voiceData = JSON.parse(voiceDataStr);
          const audioBlob = this.base64ToBlob(voiceData.data, 'audio/webm');
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

          this.customVoices.set(voiceName, {
            name: voiceName,
            audioBuffer: audioBuffer,
            blob: audioBlob,
            duration: voiceData.duration,
            createdAt: new Date(voiceData.createdAt),
          });
        }
      }
    } catch (error) {
      console.error('Failed to load custom voices:', error);
    }
  }

  getSavedVoicesList() {
    try {
      const savedVoicesStr = localStorage.getItem('rinawarp_saved_voices');
      return savedVoicesStr ? JSON.parse(savedVoicesStr) : [];
    } catch {
      return [];
    }
  }

  // Utility functions
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  // Terminal Integration Functions
  announceCommand(command) {
    if (command.trim()) {
      this.speak(`Executing: ${command}`, {
        type: 'command',
        priority: 'normal',
        interrupt: false,
      });
    }
  }

  announceResult(result) {
    if (result && result.trim()) {
      // Summarize long results
      const summary =
        result.length > 200
          ? `Command completed with ${result.split('\n').length} lines of output`
          : `Result: ${result}`;

      this.speak(summary, {
        type: 'result',
        priority: 'low',
      });
    }
  }

  announceError(error) {
    if (error && error.trim()) {
      this.speak(`Error: ${error}`, {
        type: 'error',
        priority: 'high',
        interrupt: true,
      });
    }
  }

  announceNotification(notification) {
    if (notification && notification.trim()) {
      this.speak(notification, {
        type: 'notification',
        priority: 'normal',
      });
    }
  }

  // Control functions
  enable() {
    this.isEnabled = true;
    this.speak('Voice assistance enabled', { type: 'notification' });
  }

  disable() {
    this.isEnabled = false;
    this.synth.cancel();
  }

  mute() {
    this.isMuted = true;
    this.synth.cancel();
  }

  unmute() {
    this.isMuted = false;
    this.speak('Voice assistance unmuted', { type: 'notification' });
  }

  toggleMute() {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
    return !this.isMuted;
  }

  stop() {
    this.synth.cancel();
    this.speechQueue = [];
  }

  // Settings management
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();

    // Update current voice if changed
    if (newSettings.voice) {
      this.currentVoice = this.voices.find(v => v.name === newSettings.voice) || this.currentVoice;
    }
  }

  saveSettings() {
    localStorage.setItem('rinawarp_voice_settings', JSON.stringify(this.settings));
  }

  loadSettings() {
    try {
      const settingsStr = localStorage.getItem('rinawarp_voice_settings');
      if (settingsStr) {
        const savedSettings = JSON.parse(settingsStr);
        this.settings = { ...this.settings, ...savedSettings };
      }
    } catch (error) {
      console.warn('Failed to load voice settings:', error);
    }
  }

  // Get available voices (system + custom)
  getAvailableVoices() {
    const systemVoices = this.voices.map(voice => ({
      name: voice.name,
      lang: voice.lang,
      type: 'system',
      default: voice.default,
    }));

    const customVoicesList = Array.from(this.customVoices.keys()).map(name => ({
      name: name,
      lang: 'en-US',
      type: 'custom',
      default: false,
    }));

    return [...systemVoices, ...customVoicesList];
  }

  // Test voice functionality
  testVoice(voiceName = null) {
    const oldVoice = this.currentVoice;

    if (voiceName && voiceName !== 'current') {
      if (this.customVoices.has(voiceName)) {
        this.settings.useCustomVoice = true;
        this.settings.customVoiceName = voiceName;
      } else {
        this.currentVoice = this.voices.find(v => v.name === voiceName) || this.currentVoice;
        this.settings.useCustomVoice = false;
      }
    }

    this.speak(
      'Hello! This is Rina, your AI terminal assistant. Voice synthesis is working correctly.',
      {
        type: 'notification',
        interrupt: true,
      }
    );

    // Restore original voice
    setTimeout(() => {
      this.currentVoice = oldVoice;
    }, 5000);
  }

  async installCreatorVoicePermanently(audioBlob, metadata) {
    try {
      // Import VoiceInstaller
      const { VoiceInstaller } = await import('./voice-installer.js');
      const installer = new VoiceInstaller();

      // Install the voice
      const success = await installer.installCreatorVoice(audioBlob, metadata);

      if (success) {
        // Show notification about permanent installation
        if (window.terminalManager?.pluginAPI) {
          window.terminalManager.pluginAPI.showNotification(
            "🎉 Your voice has been permanently installed as RinaWarp's voice!",
            'success',
            5000
          );
        }
      }

      return success;
    } catch (error) {
      console.error('Failed to install creator voice permanently:', error);
      return false;
    }
  }

  getStatus() {
    return {
      enabled: this.isEnabled,
      muted: this.isMuted,
      recording: this.isRecording,
      processing: this.isProcessingQueue,
      customVoicesCount: this.customVoices.size,
      systemVoicesCount: this.voices.length,
      currentVoice: this.settings.useCustomVoice
        ? this.settings.customVoiceName
        : this.currentVoice?.name || 'None',
      settings: { ...this.settings },
    };
  }
}

// Export for use in renderer
window.VoiceEngine = VoiceEngine;
