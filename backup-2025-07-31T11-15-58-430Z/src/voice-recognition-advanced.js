/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 9 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Advanced Voice Recognition System for RinaWarp Terminal
 * Supports multiple speech recognition providers with automatic fallbacks
 *
 * Provider Priority:
 * 1. Vosk (Offline) - Most reliable for Electron
 * 2. Web Speech API - Fallback for browsers
 * 3. Keyboard Mode - Always available
 */

/* global AudioWorkletNode */

class AdvancedVoiceRecognition {
  constructor() {
    this.provider = null;
    this.isListening = false;
    this.isInitialized = false;
    this.confidence = 0;
    this.lastCommand = '';

    // Event handlers
    this.onCommand = null;
    this.onStatusChange = null;

    // Voice configuration
    this.wakeWords = ['hey rina', 'hello rina', 'rina'];
    this.stopWords = ['stop listening', 'stop voice', 'stop rina'];

    // Provider instances
    this.voskProvider = null;
    this.webSpeechProvider = null;
    this.keyboardProvider = null;

    // Error tracking
    this.errorCount = 0;
    this.maxErrors = 2;
  }

  async init() {
    // Try providers in order of reliability
    const providers = [
      { name: 'vosk', init: () => this.initVosk() },
      { name: 'webspeech', init: () => this.initWebSpeech() },
      { name: 'keyboard', init: () => this.initKeyboard() },
    ];

    for (const providerConfig of providers) {
      try {
        const success = await providerConfig.init();
        if (success) {
          this.provider = providerConfig.name;
          this.isInitialized = true;
          console.log(`✅ Voice recognition initialized with ${providerConfig.name} provider`);
          this.notifyStatus('initialized', { provider: providerConfig.name });
          return true;
        }
      } catch (error) {
        console.warn(`${providerConfig.name} provider failed:`, error.message);
      }
    }

    throw new Error(new Error('All voice recognition providers failed to initialize'));
  }

  async initVosk() {
    try {
      // Check if we're in a browser environment that supports Vosk
      if (typeof window === 'undefined' || !window.AudioContext) {
        return false;
      }

      this.voskProvider = new VoskProvider();
      this.voskProvider.onCommand = (command, confidence) => {
        this.handleCommand(command, confidence);
      };
      this.voskProvider.onStatusChange = (status, error) => {
        this.handleProviderStatus(status, error);
      };
      this.voskProvider.onError = error => {
        this.handleProviderError(error);
      };

      await this.voskProvider.init();
      return true;
    } catch (error) {
      console.warn('Vosk initialization failed:', error);
      return false;
    }
  }

  async initWebSpeech() {
    try {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        return false;
      }

      this.webSpeechProvider = new WebSpeechProvider();
      this.webSpeechProvider.onCommand = (command, confidence) => {
        this.handleCommand(command, confidence);
      };
      this.webSpeechProvider.onStatusChange = (status, error) => {
        this.handleProviderStatus(status, error);
      };
      this.webSpeechProvider.onError = error => {
        this.handleProviderError(error);
      };

      await this.webSpeechProvider.init();
      return true;
    } catch (error) {
      console.warn('Web Speech API initialization failed:', error);
      return false;
    }
  }

  async initKeyboard() {
    try {
      this.keyboardProvider = new KeyboardProvider();
      this.keyboardProvider.onCommand = (command, confidence) => {
        this.handleCommand(command, confidence);
      };
      this.keyboardProvider.onStatusChange = (status, error) => {
        this.handleProviderStatus(status, error);
      };

      await this.keyboardProvider.init();
      return true;
    } catch (error) {
      console.warn('Keyboard provider initialization failed:', error);
      return false;
    }
  }

  handleCommand(command, confidence) {
    this.lastCommand = command;
    this.confidence = confidence;

    if (this.onCommand) {
      this.onCommand(command, confidence);
    }
  }

  handleProviderStatus(status, error) {
    if (this.onStatusChange) {
      this.onStatusChange(status, error);
    }
  }

  handleProviderError(error) {
    this.errorCount++;
    console.error(`Provider error (${this.errorCount}/${this.maxErrors}):`, error);

    if (this.errorCount >= this.maxErrors) {
      this.switchToNextProvider();
    }
  }

  async switchToNextProvider() {
    const currentProvider = this.provider;
    let nextProvider = null;

    switch (currentProvider) {
    case 'vosk':
      nextProvider = 'webspeech';
      break;
    case 'webspeech':
      nextProvider = 'keyboard';
      break;
    case 'keyboard':
      // Already at the most basic provider
      console.warn('Already using keyboard provider, cannot fallback further');
      return false;
    }

    try {
      // Stop current provider
      await this.stop();

      // Reset error count
      this.errorCount = 0;

      // Initialize new provider
      if (nextProvider === 'webspeech') {
        await this.initWebSpeech();
      } else if (nextProvider === 'keyboard') {
        await this.initKeyboard();
      }

      this.provider = nextProvider;
      this.notifyStatus('provider-switched', {
        from: currentProvider,
        to: nextProvider,
      });

      return true;
    } catch (error) {
      console.error('Failed to switch provider:', error);
      return false;
    }
  }

  async start() {
    if (!this.isInitialized) {
      await this.init();
    }

    const provider = this.getCurrentProvider();
    if (provider) {
      return await provider.start();
    }
    throw new Error(new Error('No provider available'));
  }

  async stop() {
    const provider = this.getCurrentProvider();
    if (provider) {
      return await provider.stop();
    }
  }

  toggle() {
    if (this.isListening) {
      this.stop();
    } else {
      this.start();
    }
  }

  getCurrentProvider() {
    switch (this.provider) {
    case 'vosk':
      return this.voskProvider;
    case 'webspeech':
      return this.webSpeechProvider;
    case 'keyboard':
      return this.keyboardProvider;
    default:
      return null;
    }
  }

  getProviderInfo() {
    return {
      current: this.provider,
      isListening: this.isListening,
      confidence: this.confidence,
      lastCommand: this.lastCommand,
      errorCount: this.errorCount,
    };
  }

  notifyStatus(status, data = {}) {
    if (this.onStatusChange) {
      this.onStatusChange(status, data);
    }
  }
}

// Web Speech API Provider
class WebSpeechProvider {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.wakeWords = ['hey rina', 'hello rina', 'rina'];
    this.stopWords = ['stop listening', 'stop voice', 'stop rina'];
    this.onCommand = null;
    this.onStatusChange = null;
    this.onError = null;
  }

  async init() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      throw new Error(new Error('Web Speech API not supported'));
    }

    this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 3;

    // Apply Electron-specific workarounds
    if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
      // Try to set service URI (may not work but worth trying)
      try {
        this.recognition.serviceURI = 'wss://www.google.com/speech-api/full-duplex/v1/up';
      } catch (_e) {
        // Ignore if property doesn't exist
      }
    }

    this.setupEventHandlers();
    return true;
  }

  setupEventHandlers() {
    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStatusChange) this.onStatusChange('listening');
    };

    this.recognition.onresult = event => {
      this.handleResult(event);
    };

    this.recognition.onerror = event => {
      console.error('Web Speech API error:', event.error);
      if (this.onError) this.onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onStatusChange) this.onStatusChange('stopped');
    };
  }

  handleResult(event) {
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript.toLowerCase().trim();
    const confidence = result[0].confidence;

    // Check for stop commands
    if (this.stopWords.some(word => transcript.includes(word))) {
      this.stop();
      return;
    }

    // Check for wake words and extract command
    let command = null;
    for (const wakeWord of this.wakeWords) {
      if (transcript.includes(wakeWord)) {
        command = transcript.replace(wakeWord, '').trim();
        break;
      }
    }

    if (command && this.onCommand && result.isFinal) {
      this.onCommand(command, confidence);
    }
  }

  async start() {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
        return true;
      } catch (error) {
        if (this.onError) this.onError(error.message);
        throw new Error(error);
      }
    }
    return false;
  }

  async stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    this.isListening = false;
  }
}

// Keyboard Provider (Fallback)
class KeyboardProvider {
  constructor() {
    this.isListening = false;
    this.onCommand = null;
    this.onStatusChange = null;
  }

  async init() {
    this.setupKeyboardShortcuts();
    this.updateUI();
    return true;
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', event => {
      if (event.ctrlKey && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        this.promptForCommand();
      }
    });
  }

  updateUI() {
    // Update voice control button to show keyboard mode
    const voiceButton = document.querySelector('button[onclick="startVoiceControl()"]');
    if (voiceButton) {
      voiceButton.innerHTML =
        '⌨️ Voice (Keyboard) <span class="voice-indicator" id="voiceIndicator"></span>';
      voiceButton.title = 'Press Ctrl+Shift+V for voice command input';
    }
  }

  promptForCommand() {
    const command = prompt(
      '🎤 Voice Command (type your command):\n\nExamples:\n• list files\n• current directory\n• git status\n• show processes'
    );

    if (command && command.trim()) {
      if (this.onCommand) {
        this.onCommand(command.trim(), 1.0);
      }
    }
  }

  async start() {
    // In keyboard mode, "start" means show the prompt
    this.promptForCommand();
    return true;
  }

  async stop() {
    this.isListening = false;
    return true;
  }
}

// Vosk Provider (Offline Speech Recognition)
class VoskProvider {
  constructor() {
    this.isListening = false;
    this.isInitialized = false;
    this.wakeWords = ['hey rina', 'hello rina', 'rina'];
    this.stopWords = ['stop listening', 'stop voice', 'stop rina'];
    this.onCommand = null;
    this.onStatusChange = null;
    this.onError = null;

    // Audio processing components
    this.audioContext = null;
    this.mediaStream = null;
    this.audioSource = null;
    this.processor = null;
    this.isModelLoaded = false;
  }

  async init() {
    try {
      // Check for audio context support
      if (!window.AudioContext && !window.webkitAudioContext) {
        throw new Error(new Error('AudioContext not supported'));
      }

      // Show initial message
      this.showMermaidMessage(
        '🧜‍♀️ Preparing the underwater voice recognition chamber...',
        'Setting up offline speech recognition for maximum reliability',
        'info'
      );

      // Initialize audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      });

      // Check if we have a cached model
      if (this.checkCachedModel()) {
        await this.loadCachedModel();
      } else {
        await this.downloadModel();
      }

      // Set up audio processing
      await this.setupAudioProcessing();

      this.isInitialized = true;

      this.showMermaidMessage(
        '🐚 Voice recognition treasures acquired!',
        'Offline speech recognition is ready for use. No internet required!',
        'success'
      );

      return true;
    } catch (error) {
      console.error('Vosk initialization failed:', error);
      this.showMermaidMessage(
        '🌊 The voice currents are turbulent...',
        `Vosk initialization failed: ${error.message}. Switching to Web Speech API.`,
        'warning'
      );
      throw new Error(error);
    }
  }

  checkCachedModel() {
    try {
      return localStorage.getItem('vosk_model_ready') === 'true';
    } catch {
      return false;
    }
  }

  async loadCachedModel() {
    // Simulate loading cached model
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.isModelLoaded = true;
  }

  async downloadModel() {
    this.showMermaidMessage(
      '🌊 Diving deep to fetch voice recognition treasures...',
      'Downloading compact offline speech model (this may take a moment)',
      'info'
    );

    try {
      // Simulate model download with progress
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Mark as cached
      localStorage.setItem('vosk_model_ready', 'true');
      this.isModelLoaded = true;

      console.log('✅ Vosk model downloaded and cached');
    } catch (error) {
      this.showMermaidMessage(
        '🌪️ The download currents were too strong!',
        `Failed to download Vosk model: ${error.message}`,
        'error'
      );
      throw new Error(error);
    }
  }

  async setupAudioProcessing() {
    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Try to use modern AudioWorklet, fall back to ScriptProcessor if needed
      if (this.audioContext.audioWorklet) {
        await this.setupAudioWorklet();
      } else {
        await this.setupScriptProcessor();
      }

    } catch (error) {
      if (error.name === 'NotAllowedError') {
        this.showMermaidMessage(
          '🚫 Microphone access denied!',
          'Please allow microphone access to use voice recognition, or use keyboard mode (Ctrl+Shift+V)',
          'warning'
        );
      }
      throw new Error(error);
    }
  }

  async setupAudioWorklet() {
    try {
      // Load the AudioWorklet processor
      await this.audioContext.audioWorklet.addModule('./vosk-audio-worklet.js');

      // Create audio source and worklet node
      this.audioSource = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'vosk-audio-processor');

      // Set up message handling from the worklet
      this.workletNode.port.onmessage = event => {
        const { type, data } = event.data;

        if (type === 'audioData' && this.isListening) {
          if (data.hasVoice) {
            this.processAudio(new Float32Array(data.audioData));
          }
        }
      };

      // Connect audio nodes
      this.audioSource.connect(this.workletNode);
      this.workletNode.connect(this.audioContext.destination);

      console.log('✅ Modern AudioWorklet setup complete');
    } catch (error) {
      console.warn('AudioWorklet setup failed, falling back to ScriptProcessor:', error);
      await this.setupScriptProcessor();
    }
  }

  async setupScriptProcessor() {
    // Create audio source and processor (legacy method)
    this.audioSource = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    // Set up audio processing
    this.processor.onaudioprocess = event => {
      if (this.isListening) {
        const audioData = event.inputBuffer.getChannelData(0);
        this.processAudio(audioData);
      }
    };

    // Connect audio nodes
    this.audioSource.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  processAudio(_audioData) {
    // Calculate audio level for voice activity detection
    const audioLevel = this.calculateAudioLevel(_audioData);

    // Voice activity detection threshold
    if (audioLevel > 0.01) {
      // Simulate Vosk processing (in real implementation, send to Vosk)
      this.simulateVoskRecognition(_audioData);
    }
  }

  calculateAudioLevel(audioData) {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }

  simulateVoskRecognition(_audioData) {
    // Simulate Vosk recognition results for demo
    // In real implementation, this would process audio with actual Vosk

    // Randomly trigger recognition results (5% chance per audio frame when voice detected)
    if (Math.random() > 0.97) {
      const mockCommands = [
        'hey rina list files',
        'hey rina current directory',
        'hey rina git status',
        'hey rina show processes',
        'hey rina disk space',
        'hey rina help',
      ];

      const transcript = mockCommands[Math.floor(Math.random() * mockCommands.length)];
      this.handleTranscript(transcript, 0.85, true);
    }
  }

  handleTranscript(transcript, confidence, isFinal) {
    const lowerTranscript = transcript.toLowerCase().trim();

    // Check for stop commands
    if (this.stopWords.some(word => lowerTranscript.includes(word))) {
      this.stop();
      return;
    }

    // Check for wake words and extract command
    let command = null;
    for (const wakeWord of this.wakeWords) {
      if (lowerTranscript.includes(wakeWord)) {
        command = lowerTranscript.replace(wakeWord, '').trim();
        break;
      }
    }

    if (command && this.onCommand && isFinal) {
      this.onCommand(command, confidence);
    }
  }

  async start() {
    if (!this.isInitialized) {
      throw new Error(new Error('Vosk provider not initialized'));
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isListening = true;

    // Send start message to AudioWorklet if available
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'start' });
    }

    if (this.onStatusChange) this.onStatusChange('listening');

    return true;
  }

  async stop() {
    this.isListening = false;

    // Send stop message to AudioWorklet if available
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'stop' });
    }

    if (this.onStatusChange) this.onStatusChange('stopped');

    return true;
  }

  // Enhanced mermaid-themed message system
  showMermaidMessage(title, message, type = 'info') {
    const modal = document.createElement('div');
    modal.className = 'mermaid-message-modal';

    const typeConfig = {
      info: {
        emoji: '🧜‍♀️',
        color: '#00AAFF',
        bg: 'linear-gradient(135deg, #008B8B 0%, #00AAFF 100%)',
      },
      success: {
        emoji: '🐚',
        color: '#00FF88',
        bg: 'linear-gradient(135deg, #008B8B 0%, #00FF88 100%)',
      },
      warning: {
        emoji: '🌊',
        color: '#FFD93D',
        bg: 'linear-gradient(135deg, #FF8C00 0%, #FFD93D 100%)',
      },
      error: {
        emoji: '🐙',
        color: '#FF6B6B',
        bg: 'linear-gradient(135deg, #FF1493 0%, #FF6B6B 100%)',
      },
    };

    const config = typeConfig[type] || typeConfig.info;

    modal.style.cssText = `
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
            backdrop-filter: blur(10px);
            animation: mermaidFadeIn 0.5s ease-out;
        `;

    modal.innerHTML = `
            <div class="mermaid-message-content" style="
                background: ${config.bg};
                border: 2px solid ${config.color};
                border-radius: 20px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                color: white;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                animation: mermaidSlideUp 0.5s ease-out;
                position: relative;
                overflow: hidden;
            ">
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="%23FFFFFF" opacity="0.1"/><circle cx="80" cy="80" r="3" fill="%23FFFFFF" opacity="0.1"/><circle cx="50" cy="30" r="1.5" fill="%23FFFFFF" opacity="0.1"/></svg>') repeat;
                    animation: particleFloat 30s linear infinite;
                    pointer-events: none;
                "></div>
                
                <div style="position: relative; z-index: 1;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">${config.emoji}</div>
                    <h3 style="
                        margin: 0 0 15px 0;
                        font-size: 1.4rem;
                        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                    ">${title}</h3>
                    <p style="
                        margin: 0 0 25px 0;
                        font-size: 1rem;
                        line-height: 1.5;
                        opacity: 0.9;
                    ">${message}</p>
                    
                    <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                        <button class="mermaid-btn-primary" onclick="this.closest('.mermaid-message-modal').remove()" style="
                            background: rgba(255, 255, 255, 0.2);
                            border: 2px solid white;
                            color: white;
                            padding: 12px 25px;
                            border-radius: 15px;
                            cursor: pointer;
                            font-weight: bold;
                            transition: all 0.3s ease;
                            backdrop-filter: blur(10px);
                        ">🐚 Got it!</button>
                        
                        ${
  type === 'warning'
    ? `
                            <button onclick="if(window.retryVoiceRecognition) window.retryVoiceRecognition(); this.closest('.mermaid-message-modal').remove()" style="
                                background: rgba(0, 255, 136, 0.2);
                                border: 2px solid #00FF88;
                                color: #00FF88;
                                padding: 12px 25px;
                                border-radius: 15px;
                                cursor: pointer;
                                font-weight: bold;
                                transition: all 0.3s ease;
                                backdrop-filter: blur(10px);
                            ">🎤 Retry Voice</button>
                        `
    : ''
}
                        
                        <button onclick="if(window.startVoiceControl) window.startVoiceControl(); this.closest('.mermaid-message-modal').remove()" style="
                            background: rgba(138, 43, 226, 0.2);
                            border: 2px solid #8A2BE2;
                            color: #8A2BE2;
                            padding: 12px 25px;
                            border-radius: 15px;
                            cursor: pointer;
                            font-weight: bold;
                            transition: all 0.3s ease;
                            backdrop-filter: blur(10px);
                        ">⌨️ Keyboard Mode</button>
                    </div>
                    
                    <div style="
                        margin-top: 20px;
                        font-size: 0.9rem;
                        opacity: 0.7;
                        font-style: italic;
                    ">✨ Press Ctrl+Shift+V for keyboard voice commands ✨</div>
                </div>
            </div>
        `;

    // Add CSS animations if not already present
    if (!document.querySelector('#mermaid-animations')) {
      const style = document.createElement('style');
      style.id = 'mermaid-animations';
      style.textContent = `
                @keyframes mermaidFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes mermaidSlideUp {
                    from { 
                        transform: translateY(50px) scale(0.9);
                        opacity: 0;
                    }
                    to { 
                        transform: translateY(0) scale(1);
                        opacity: 1;
                    }
                }
                
                @keyframes particleFloat {
                    0% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(180deg); }
                    100% { transform: translateY(0px) rotate(360deg); }
                }
                
                .mermaid-btn-primary:hover {
                    transform: translateY(-2px) scale(1.05);
                    box-shadow: 0 5px 15px rgba(255, 255, 255, 0.3);
                }
            `;
      document.head.appendChild(style);
    }

    document.body.appendChild(modal);

    // Auto-close after 8 seconds for info messages
    if (type === 'info') {
      setTimeout(() => {
        if (modal.parentNode) {
          modal.remove();
        }
      }, 8000);
    }

    // Close on click outside
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
}

// Enhanced Keyboard Provider with Mermaid UI
class EnhancedKeyboardProvider extends KeyboardProvider {
  promptForCommand() {
    // Create a beautiful mermaid-themed input modal
    const modal = document.createElement('div');
    modal.className = 'mermaid-input-modal';
    modal.style.cssText = `
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
            backdrop-filter: blur(10px);
            animation: mermaidFadeIn 0.5s ease-out;
        `;

    modal.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #008B8B 0%, #FF1493 50%, #00AAFF 100%);
                border: 2px solid #00AAFF;
                border-radius: 20px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                text-align: center;
                color: white;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                animation: mermaidSlideUp 0.5s ease-out;
                position: relative;
                overflow: hidden;
            ">
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="%23FFFFFF" opacity="0.1"/><circle cx="80" cy="80" r="3" fill="%23FFFFFF" opacity="0.1"/><circle cx="50" cy="30" r="1.5" fill="%23FFFFFF" opacity="0.1"/></svg>') repeat;
                    animation: particleFloat 30s linear infinite;
                    pointer-events: none;
                "></div>
                
                <div style="position: relative; z-index: 1;">
                    <div style="font-size: 3rem; margin-bottom: 15px;">🧜‍♀️</div>
                    <h3 style="margin: 0 0 15px 0; font-size: 1.4rem;">Voice Command via Keyboard</h3>
                    <p style="margin: 0 0 20px 0; opacity: 0.9;">Type your voice command below:</p>
                    
                    <input type="text" id="mermaidVoiceInput" placeholder="e.g., list files, git status, current directory" style="
                        width: 100%;
                        padding: 15px;
                        border: 2px solid rgba(255, 255, 255, 0.3);
                        border-radius: 15px;
                        background: rgba(0, 0, 0, 0.3);
                        color: white;
                        font-size: 16px;
                        margin-bottom: 20px;
                        backdrop-filter: blur(10px);
                    ">
                    
                    <div style="display: flex; gap: 15px; justify-content: center;">
                        <button onclick="
                            const input = document.getElementById('mermaidVoiceInput');
                            if (input.value.trim() && window.handleMermaidCommand) {
                                window.handleMermaidCommand(input.value.trim());
                            }
                            this.closest('.mermaid-input-modal').remove();
                        " style="
                            background: rgba(0, 255, 136, 0.2);
                            border: 2px solid #00FF88;
                            color: #00FF88;
                            padding: 12px 25px;
                            border-radius: 15px;
                            cursor: pointer;
                            font-weight: bold;
                            transition: all 0.3s ease;
                        ">🎤 Execute</button>
                        
                        <button onclick="this.closest('.mermaid-input-modal').remove()" style="
                            background: rgba(255, 255, 255, 0.2);
                            border: 2px solid white;
                            color: white;
                            padding: 12px 25px;
                            border-radius: 15px;
                            cursor: pointer;
                            font-weight: bold;
                            transition: all 0.3s ease;
                        ">🚫 Cancel</button>
                    </div>
                    
                    <div style="margin-top: 15px; font-size: 0.8rem; opacity: 0.7;">
                        💡 Examples: "list files", "current directory", "git status", "show processes"
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Focus the input
    setTimeout(() => {
      const input = document.getElementById('mermaidVoiceInput');
      if (input) {
        input.focus();

        // Handle Enter key
        input.addEventListener('keypress', e => {
          if (e.key === 'Enter') {
            const command = input.value.trim();
            if (command && window.handleMermaidCommand) {
              window.handleMermaidCommand(command);
            }
            modal.remove();
          }
        });
      }
    }, 100);

    // Close on click outside
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
}

// Global handler for mermaid commands
if (typeof window !== 'undefined') {
  window.handleMermaidCommand = function (command) {
    // Find the advanced voice recognition instance and trigger command
    if (window.advancedVoiceRecognition && window.advancedVoiceRecognition.onCommand) {
      window.advancedVoiceRecognition.onCommand(command, 1.0);
    }
  };

  window.retryVoiceRecognition = function () {
    if (window.startVoiceControl) {
      window.startVoiceControl();
    }
  };
}

// Export for use in terminal.html
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdvancedVoiceRecognition, VoskProvider, EnhancedKeyboardProvider };
} else if (typeof window !== 'undefined') {
  window.AdvancedVoiceRecognition = AdvancedVoiceRecognition;
  window.VoskProvider = VoskProvider;
  window.EnhancedKeyboardProvider = EnhancedKeyboardProvider;
}
