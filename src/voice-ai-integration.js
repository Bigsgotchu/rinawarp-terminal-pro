/**
 * Voice + AI Integration for RinaWarp Terminal
 * Connects voice recognition with Google AI (Gemini) for intelligent voice commands
 */

export class VoiceAIIntegration {
  constructor() {
    this.isInitialized = false;
    this.isListening = false;
    this.recognition = null;
    this.synthesis = null;
    this.voiceEngine = null;
    this.googleAI = null;

    // Voice settings
    this.settings = {
      language: 'en-US',
      continuous: true,
      interimResults: true,
      maxAlternatives: 3,
      confidenceThreshold: 0.7,
      enableAIFallback: true,
      enableVoiceResponse: true,
      wakeWords: ['hey rina', 'ok rina', 'rina help'],
    };

    // State management
    this.currentContext = {
      lastCommand: null,
      currentDirectory: null,
      projectType: null,
      conversation: [],
    };

    this.init();
  }

  async init() {
    console.log('🎤 Initializing Voice + AI Integration...');

    try {
      // Check browser support
      if (!this.checkVoiceSupport()) {
        throw new Error('Voice features not supported in this browser');
      }

      // Initialize Google AI client
      await this.initGoogleAI();

      // Initialize voice recognition
      await this.initVoiceRecognition();

      // Initialize voice synthesis
      await this.initVoiceSynthesis();

      // Set up UI integration
      this.setupUIIntegration();

      this.isInitialized = true;
      console.log('✅ Voice + AI Integration initialized successfully');

      this.updateStatus('🎤 Voice AI ready - say "Hey Rina" to start');
    } catch (error) {
      console.error('❌ Voice AI initialization failed:', error);
      this.updateStatus(`❌ Voice AI failed: ${error.message}`);
    }
  }

  checkVoiceSupport() {
    return (
      !!(window.SpeechRecognition || window.webkitSpeechRecognition) && !!window.speechSynthesis
    );
  }

  async initGoogleAI() {
    // Use the same Google AI configuration from our test
    const apiKey = await this.loadApiKey();
    if (!apiKey) {
      throw new Error('Google AI API key not found');
    }

    this.googleAI = {
      apiKey,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-1.5-flash',
    };

    // Test the connection
    await this.testGoogleAIConnection();
  }

  async loadApiKey() {
    // Try to get API key from environment or global state
    if (typeof process !== 'undefined' && process.env && process.env.GOOGLE_AI_API_KEY) {
      return process.env.GOOGLE_AI_API_KEY;
    }

    // Try to get from global window state
    if (window.terminalState && window.terminalState.googleAIKey) {
      return window.terminalState.googleAIKey;
    }

    // Try localStorage as fallback
    return localStorage.getItem('GOOGLE_AI_API_KEY');
  }

  async testGoogleAIConnection() {
    const testPrompt = 'Reply with just "OK" if you can read this.';

    try {
      const response = await this.callGoogleAI(testPrompt);
      if (response.toLowerCase().includes('ok')) {
        console.log('✅ Google AI connection verified');
        return true;
      } else {
        throw new Error('Unexpected response from Google AI');
      }
    } catch (error) {
      throw new Error(`Google AI connection failed: ${error.message}`);
    }
  }

  async callGoogleAI(prompt, options = {}) {
    const response = await fetch(
      `${this.googleAI.baseUrl}/models/${this.googleAI.model}:generateContent?key=${this.googleAI.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 512,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Google AI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
      );
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  async initVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = this.settings.continuous;
    this.recognition.interimResults = this.settings.interimResults;
    this.recognition.lang = this.settings.language;
    this.recognition.maxAlternatives = this.settings.maxAlternatives;

    // Set up event listeners
    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateVoiceIndicator(true);
      this.updateStatus('🎤 Listening...');
    };

    this.recognition.onresult = event => {
      this.handleVoiceResult(event);
    };

    this.recognition.onerror = event => {
      console.error('Speech recognition error:', event.error);
      this.handleVoiceError(event);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.updateVoiceIndicator(false);

      // Auto-restart if we were actively listening
      if (this.settings.continuous && this.shouldKeepListening) {
        setTimeout(() => {
          if (!this.isListening) {
            this.startListening();
          }
        }, 500);
      } else {
        this.updateStatus('🎤 Voice stopped');
      }
    };
  }

  async initVoiceSynthesis() {
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported');
      return;
    }

    this.synthesis = window.speechSynthesis;

    // Wait for voices to load
    return new Promise(resolve => {
      const loadVoices = () => {
        const voices = this.synthesis.getVoices();
        if (voices.length > 0) {
          // Prefer English female voices for Rina
          this.selectedVoice =
            voices.find(
              voice =>
                voice.lang.startsWith('en-') &&
                (voice.name.includes('Samantha') ||
                  voice.name.includes('Karen') ||
                  voice.name.includes('female'))
            ) ||
            voices.find(voice => voice.lang.startsWith('en-')) ||
            voices[0];

          console.log('✅ Voice synthesis ready with:', this.selectedVoice?.name);
          resolve();
        } else {
          setTimeout(loadVoices, 100);
        }
      };
      loadVoices();
    });
  }

  setupUIIntegration() {
    // Integrate with existing terminal UI
    this.setupVoiceControls();
    this.setupKeyboardShortcuts();
  }

  setupVoiceControls() {
    // Update the existing voice control button to use our enhanced system
    const voiceButton =
      document.querySelector('#voiceControlBtn') ||
      document.querySelector('button[onclick*="startVoiceControl"]');

    if (voiceButton) {
      // Replace the onclick handler
      voiceButton.onclick = () => this.toggleVoiceRecognition();
      voiceButton.title = 'Toggle Voice AI (Say "Hey Rina" + command)';
    }
  }

  setupKeyboardShortcuts() {
    // Add Ctrl+Shift+V for quick voice activation
    document.addEventListener('keydown', event => {
      if (event.ctrlKey && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        this.toggleVoiceRecognition();
      }
    });
  }

  async handleVoiceResult(event) {
    const results = Array.from(event.results);
    const latestResult = results[results.length - 1];

    if (latestResult.isFinal) {
      await this.processFinalVoiceResult(latestResult);
    } else {
      // Show interim results
      const transcript = latestResult[0].transcript;
      this.updateStatus(`🎤 "${transcript}"`);
    }
  }

  async processFinalVoiceResult(result) {
    const transcript = result[0].transcript.trim();
    const confidence = result[0].confidence;

    console.log('Voice command:', transcript, 'Confidence:', confidence);

    // Check confidence threshold
    if (confidence < this.settings.confidenceThreshold) {
      this.speak("I didn't catch that clearly. Could you repeat?");
      return;
    }

    // Check for wake words
    const hasWakeWord = this.settings.wakeWords.some(wake =>
      transcript.toLowerCase().includes(wake)
    );

    if (!hasWakeWord && this.settings.wakeWords.length > 0) {
      // If no wake word, ignore unless in active conversation
      if (this.currentContext.conversation.length === 0) {
        return;
      }
    }

    // Remove wake words from transcript
    let command = transcript.toLowerCase();
    for (const wake of this.settings.wakeWords) {
      command = command.replace(wake, '').trim();
    }

    if (!command) {
      this.speak('How can I help you?');
      return;
    }

    // Process the voice command
    await this.processVoiceCommand(command, transcript, confidence);
  }

  async processVoiceCommand(command, originalTranscript, confidence) {
    this.updateStatus('🧠 Processing with AI...');

    try {
      // First, check for direct terminal commands (fast path)
      const directCommand = this.checkDirectCommands(command);
      if (directCommand) {
        await this.executeTerminalCommand(directCommand);
        this.speak(`Running ${command}`);
        return;
      }

      // Use Google AI to understand and process the command
      const aiPrompt = this.buildAIPrompt(command);
      const aiResponse = await this.callGoogleAI(aiPrompt);

      // Parse AI response and execute
      await this.handleAIResponse(aiResponse, command);
    } catch (error) {
      console.error('Voice command processing failed:', error);
      this.updateStatus('❌ Voice command failed');
      this.speak("Sorry, I couldn't process that command. Please try again.");
    }
  }

  checkDirectCommands(command) {
    const directCommands = {
      'clear screen': 'clear',
      'clear terminal': 'clear',
      'list files': 'ls -la',
      'show files': 'ls -la',
      'current directory': 'pwd',
      'where am i': 'pwd',
      'go home': 'cd ~',
      'go up': 'cd ..',
      'git status': 'git status',
      'git log': 'git log --oneline -10',
      'npm install': 'npm install',
      'npm start': 'npm start',
      'npm test': 'npm test',
    };

    return directCommands[command] || null;
  }

  buildAIPrompt(command) {
    const context = this.gatherContext();

    return `You are Rina, an AI terminal assistant. The user said: "${command}"

Current context:
- Working directory: ${context.directory || 'unknown'}
- Recent commands: ${context.recentCommands || 'none'}
- System: ${context.system || 'Unix-like'}

Please provide:
1. The appropriate terminal command to execute (if any)
2. A brief explanation of what the command does
3. Any helpful tips or warnings

Format your response as:
COMMAND: [terminal command or "NONE" if no command needed]
EXPLANATION: [brief explanation]
RESPONSE: [what to say back to the user]

Focus on being helpful and concise. If the command is unclear, ask for clarification.`;
  }

  gatherContext() {
    return {
      directory: this.currentContext.currentDirectory,
      recentCommands: this.currentContext.lastCommand,
      system: navigator.platform.includes('Mac')
        ? 'macOS'
        : navigator.platform.includes('Win')
          ? 'Windows'
          : 'Unix-like',
    };
  }

  async handleAIResponse(response, originalCommand) {
    // Parse the AI response
    const lines = response.split('\n');
    let command = null;
    let explanation = '';
    let voiceResponse = '';

    for (const line of lines) {
      if (line.startsWith('COMMAND:')) {
        const cmd = line.replace('COMMAND:', '').trim();
        command = cmd !== 'NONE' ? cmd : null;
      } else if (line.startsWith('EXPLANATION:')) {
        explanation = line.replace('EXPLANATION:', '').trim();
      } else if (line.startsWith('RESPONSE:')) {
        voiceResponse = line.replace('RESPONSE:', '').trim();
      }
    }

    // Execute command if provided
    if (command) {
      await this.executeTerminalCommand(command);
    }

    // Provide voice feedback
    const responseText =
      voiceResponse ||
      explanation ||
      (command ? `Executed: ${command}` : 'I understand, but no command was needed.');

    this.speak(responseText);

    // Update UI
    this.updateAIResponse(originalCommand, command, explanation);
  }

  async executeTerminalCommand(command) {
    console.log('Executing terminal command:', command);

    // Execute through existing terminal system
    if (window.terminalState && window.terminalState.shellHarness) {
      try {
        await window.terminalState.shellHarness.execute(command);
        this.updateStatus(`✅ Executed: ${command}`);
        this.currentContext.lastCommand = command;
      } catch (error) {
        console.error('Command execution failed:', error);
        this.updateStatus(`❌ Command failed: ${error.message}`);
        this.speak(`Command failed: ${error.message}`);
      }
    } else if (window.terminalState && window.terminalState.terminal) {
      // Fallback: write command to terminal
      window.terminalState.terminal.write(`${command}\r`);
      this.updateStatus(`📝 Command sent: ${command}`);
    } else {
      console.warn('No terminal available for command execution');
      this.updateStatus('⚠️ Terminal not available');
    }
  }

  speak(text, options = {}) {
    if (!this.settings.enableVoiceResponse || !this.synthesis) {
      return;
    }

    // Stop any current speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.selectedVoice;
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 0.8;

    // Add some personality for Rina
    if (text.includes('error') || text.includes('failed')) {
      utterance.pitch = 0.9; // Slightly lower for errors
    } else if (text.includes('success') || text.includes('completed')) {
      utterance.pitch = 1.1; // Higher for success
    }

    utterance.onstart = () => {
      this.updateStatus('🔊 Speaking...');
    };

    utterance.onend = () => {
      this.updateStatus('🎤 Voice AI ready');
    };

    this.synthesis.speak(utterance);
  }

  // UI update methods
  updateVoiceIndicator(isActive) {
    const indicator = document.getElementById('voiceIndicator');
    if (indicator) {
      if (isActive) {
        indicator.classList.add('active');
      } else {
        indicator.classList.remove('active');
      }
    }
  }

  updateStatus(message) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = message;
    }
    console.log('[Voice AI]', message);
  }

  updateAIResponse(originalCommand, terminalCommand, explanation) {
    const responseDiv = document.getElementById('aiResponse');
    if (responseDiv) {
      responseDiv.innerHTML = `
                <div style="color: #FF1493; font-weight: bold;">🎤 Voice Command: "${originalCommand}"</div>
                ${terminalCommand ? `<div style="color: #00AAFF; margin-top: 5px;">📝 Executed: <code>${terminalCommand}</code></div>` : ''}
                ${explanation ? `<div style="color: #00FF88; margin-top: 5px;">💡 ${explanation}</div>` : ''}
                <div style="color: #8A2BE2; font-size: 12px; margin-top: 5px;">🧠 Powered by Google AI + Voice Recognition</div>
            `;
    }
  }

  handleVoiceError(event) {
    console.error('Voice error:', event.error);

    const errorMessages = {
      network: 'Network connection issue. Please check your internet.',
      'not-allowed': 'Microphone access denied. Please enable microphone permissions.',
      'no-speech': 'No speech detected. Please try speaking again.',
      aborted: 'Voice recognition was cancelled.',
      'audio-capture': 'Microphone not available. Please check your audio settings.',
    };

    const message = errorMessages[event.error] || `Voice error: ${event.error}`;
    this.updateStatus(`❌ ${message}`);

    // Don't speak error messages to avoid feedback loop
    setTimeout(() => {
      this.updateStatus('🎤 Voice AI ready - say "Hey Rina" to start');
    }, 3000);
  }

  // Public methods for external control
  toggleVoiceRecognition() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  startListening() {
    if (!this.isInitialized) {
      this.updateStatus('❌ Voice AI not initialized');
      return;
    }

    if (this.isListening) return;

    try {
      this.shouldKeepListening = true;
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      this.updateStatus('❌ Failed to start listening');
    }
  }

  stopListening() {
    this.shouldKeepListening = false;
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  // Settings methods
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };

    // Apply settings to recognition if available
    if (this.recognition) {
      this.recognition.continuous = this.settings.continuous;
      this.recognition.interimResults = this.settings.interimResults;
      this.recognition.lang = this.settings.language;
      this.recognition.maxAlternatives = this.settings.maxAlternatives;
    }
  }

  getSettings() {
    return { ...this.settings };
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      listening: this.isListening,
      hasGoogleAI: !!this.googleAI,
      hasVoiceRecognition: !!this.recognition,
      hasVoiceSynthesis: !!this.synthesis,
      selectedVoice: this.selectedVoice?.name,
    };
  }
}

// Initialize and expose globally
if (typeof window !== 'undefined') {
  window.VoiceAIIntegration = VoiceAIIntegration;

  // Auto-initialize if terminal is ready
  document.addEventListener('DOMContentLoaded', async () => {
    // Wait a bit for other systems to initialize
    setTimeout(async () => {
      try {
        window.voiceAI = new VoiceAIIntegration();
      } catch (error) {
        console.warn('Voice AI auto-initialization failed:', error);
      }
    }, 2000);
  });
}

export default VoiceAIIntegration;
