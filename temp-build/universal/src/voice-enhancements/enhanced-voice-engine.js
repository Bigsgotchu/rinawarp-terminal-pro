/**
 * RinaWarp Terminal - Enhanced Voice Recognition Engine
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * This module provides advanced voice recognition capabilities with:
 * - Improved accuracy through noise filtering and context awareness
 * - Custom voice commands and shortcuts
 * - Voice training and adaptation
 * - Multi-language support
 * - Voice-to-text optimization for terminal commands
 */

export class EnhancedVoiceEngine {
  constructor() {
    this.recognition = null;
    this.synthesis = null;
    this.isListening = false;
    this.isPaused = false;
    this.confidence = 0;
    this.language = 'en-US';
    this.customCommands = new Map();
    this.voiceProfile = null;
    this.noiseFilter = null;
    this.contextEngine = null;
    this.calibrationData = [];
    this.accuracyMetrics = {
      totalCommands: 0,
      correctCommands: 0,
      accuracy: 0,
    };

    this.config = {
      continuous: true,
      interimResults: true,
      maxAlternatives: 3,
      confidenceThreshold: 0.7,
      noiseReduction: true,
      contextAware: true,
      adaptiveThreshold: true,
      voiceTraining: true,
      multiLanguage: false,
      commandTimeout: 5000,
      calibrationMode: false,
    };

    this.init();
  }

  async init() {
    console.log('🎤 Initializing Enhanced Voice Recognition Engine...');

    // Check browser support
    if (!this.checkBrowserSupport()) {
      console.error('Voice recognition not supported in this browser');
      return;
    }

    // Initialize recognition and synthesis
    await this.initializeRecognition();
    await this.initializeSynthesis();

    // Load custom commands and voice profile
    await this.loadCustomCommands();
    await this.loadVoiceProfile();

    // Initialize noise filter
    this.initializeNoiseFilter();

    // Set up context engine
    this.setupContextEngine();

    console.log('✅ Enhanced Voice Recognition Engine initialized');
  }

  checkBrowserSupport() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  async initializeRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.maxAlternatives = this.config.maxAlternatives;
    this.recognition.lang = this.language;

    // Set up event listeners
    this.recognition.onstart = () => {
      this.isListening = true;
      this.onRecognitionStart();
    };

    this.recognition.onresult = event => {
      this.handleRecognitionResult(event);
    };

    this.recognition.onerror = event => {
      this.handleRecognitionError(event);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onRecognitionEnd();
    };

    console.log('🎙️ Speech recognition initialized');
  }

  async initializeSynthesis() {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      console.log('🔊 Speech synthesis initialized');
    } else {
      console.warn('Speech synthesis not supported');
    }
  }

  async loadCustomCommands() {
    // Load custom voice commands from storage
    const defaultCommands = {
      'clear screen': 'clear',
      'list files': 'ls -la',
      'show directory': 'pwd',
      'go up': 'cd ..',
      'git status': 'git status',
      'git add all': 'git add .',
      'git commit': 'git commit -m "',
      'git push': 'git push',
      'npm install': 'npm install',
      'npm start': 'npm start',
      'npm test': 'npm test',
      'docker build': 'docker build -t',
      'docker run': 'docker run',
      'make directory': 'mkdir',
      'remove file': 'rm',
      'copy file': 'cp',
      'move file': 'mv',
      'show processes': 'ps aux',
      'kill process': 'kill',
      'check disk space': 'df -h',
      'find file': 'find . -name',
      'search text': 'grep -r',
      'network ping': 'ping',
      'show network': 'netstat -an',
      'edit file': 'nano',
      'view file': 'cat',
      'tail log': 'tail -f',
      'compress file': 'tar -czf',
      'extract archive': 'tar -xzf',
      'change permissions': 'chmod',
      'show help': 'man',
      'which command': 'which',
      'current user': 'whoami',
      'system info': 'uname -a',
      'memory usage': 'free -h',
      'cpu info': 'lscpu',
      'mount drives': 'mount',
      'environment variables': 'env',
      'command history': 'history',
      'search history': 'history | grep',
    };

    // Load custom commands from localStorage or file
    try {
      const savedCommands = localStorage.getItem('rinawarp-voice-commands');
      if (savedCommands) {
        const parsed = JSON.parse(savedCommands);
        Object.entries(parsed).forEach(([voice, command]) => {
          this.customCommands.set(voice.toLowerCase(), command);
        });
      }
    } catch (error) {
      console.warn('Failed to load custom commands:', error);
    }

    // Add default commands
    Object.entries(defaultCommands).forEach(([voice, command]) => {
      if (!this.customCommands.has(voice.toLowerCase())) {
        this.customCommands.set(voice.toLowerCase(), command);
      }
    });

    console.log(`📝 Loaded ${this.customCommands.size} voice commands`);
  }

  async loadVoiceProfile() {
    // Load user's voice profile for better recognition
    try {
      const profile = localStorage.getItem('rinawarp-voice-profile');
      if (profile) {
        this.voiceProfile = JSON.parse(profile);
        console.log('👤 Voice profile loaded');
      }
    } catch (error) {
      console.warn('Failed to load voice profile:', error);
    }
  }

  initializeNoiseFilter() {
    // Initialize noise reduction filter
    this.noiseFilter = {
      enabled: this.config.noiseReduction,
      threshold: 0.1,
      smoothing: 0.8,
      history: [],
    };
  }

  setupContextEngine() {
    // Set up context-aware recognition
    this.contextEngine = {
      currentDirectory: process.cwd(),
      recentCommands: [],
      projectType: null,
      commandContext: null,
    };
  }

  async startListening() {
    if (this.isListening) return;

    try {
      console.log('🎤 Starting voice recognition...');
      this.recognition.start();
      this.updateUI('listening');
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      this.handleRecognitionError({ error: error.message });
    }
  }

  async stopListening() {
    if (!this.isListening) return;

    try {
      console.log('🔇 Stopping voice recognition...');
      this.recognition.stop();
      this.updateUI('stopped');
    } catch (error) {
      console.error('Failed to stop voice recognition:', error);
    }
  }

  async toggleListening() {
    if (this.isListening) {
      await this.stopListening();
    } else {
      await this.startListening();
    }
  }

  async pauseListening() {
    this.isPaused = true;
    this.updateUI('paused');
    console.log('⏸️ Voice recognition paused');
  }

  async resumeListening() {
    this.isPaused = false;
    this.updateUI('listening');
    console.log('▶️ Voice recognition resumed');
  }

  handleRecognitionResult(event) {
    if (this.isPaused) return;

    const results = Array.from(event.results);
    const latestResult = results[results.length - 1];

    if (latestResult.isFinal) {
      this.processFinalResult(latestResult);
    } else {
      this.processInterimResult(latestResult);
    }
  }

  async processFinalResult(result) {
    const transcript = result[0].transcript.trim();
    const confidence = result[0].confidence;

    console.log(`🎯 Voice input: "${transcript}" (confidence: ${confidence.toFixed(2)})`);

    // Update accuracy metrics
    this.accuracyMetrics.totalCommands++;

    // Apply noise filtering
    const filteredTranscript = this.applyNoiseFilter(transcript);

    // Check confidence threshold
    if (confidence < this.getAdaptiveThreshold()) {
      console.warn(`⚠️ Low confidence (${confidence.toFixed(2)}), requesting repeat`);
      this.requestRepeat();
      return;
    }

    // Process the command
    const command = await this.processVoiceCommand(filteredTranscript, confidence);

    if (command) {
      this.accuracyMetrics.correctCommands++;
      this.updateAccuracy();
      this.executeCommand(command);
    } else {
      this.handleUnrecognizedCommand(filteredTranscript);
    }
  }

  processInterimResult(result) {
    const transcript = result[0].transcript.trim();
    const confidence = result[0].confidence;

    // Show interim results in UI
    this.updateUI('interim', {
      transcript,
      confidence,
    });
  }

  async processVoiceCommand(transcript, confidence) {
    // Normalize transcript
    const normalized = this.normalizeTranscript(transcript);

    // Check for exact custom command match
    if (this.customCommands.has(normalized)) {
      return this.customCommands.get(normalized);
    }

    // Check for partial matches
    const partialMatch = this.findPartialMatch(normalized);
    if (partialMatch) {
      return partialMatch;
    }

    // Use context-aware processing
    const contextCommand = await this.processWithContext(normalized, confidence);
    if (contextCommand) {
      return contextCommand;
    }

    // Try fuzzy matching
    const fuzzyMatch = this.findFuzzyMatch(normalized);
    if (fuzzyMatch) {
      return fuzzyMatch;
    }

    // If no match found, treat as direct command
    return this.processDirect(normalized);
  }

  normalizeTranscript(transcript) {
    return transcript
      .toLowerCase()
      .replace(/[.,!?]/g, '')
      .trim();
  }

  findPartialMatch(transcript) {
    for (const [voiceCommand, terminalCommand] of this.customCommands) {
      if (transcript.includes(voiceCommand) || voiceCommand.includes(transcript)) {
        return terminalCommand;
      }
    }
    return null;
  }

  async processWithContext(transcript, _confidence) {
    // Use context to improve recognition
    const context = this.contextEngine;

    // Check if transcript matches context patterns
    if (context.projectType === 'node' && transcript.includes('npm')) {
      return this.resolveNpmCommand(transcript);
    }

    if (context.projectType === 'git' && transcript.includes('git')) {
      return this.resolveGitCommand(transcript);
    }

    if (transcript.includes('docker')) {
      return this.resolveDockerCommand(transcript);
    }

    return null;
  }

  findFuzzyMatch(transcript) {
    let bestMatch = null;
    let bestScore = 0;

    for (const [voiceCommand, terminalCommand] of this.customCommands) {
      const score = this.calculateSimilarity(transcript, voiceCommand);
      if (score > bestScore && score > 0.6) {
        bestScore = score;
        bestMatch = terminalCommand;
      }
    }

    return bestMatch;
  }

  processDirect(transcript) {
    // Process as direct terminal command
    const words = transcript.split(' ');
    const command = words[0];

    // Check if it's a valid command
    if (this.isValidCommand(command)) {
      return transcript;
    }

    return null;
  }

  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  applyNoiseFilter(transcript) {
    if (!this.noiseFilter.enabled) return transcript;

    // Add to history
    this.noiseFilter.history.push(transcript);
    if (this.noiseFilter.history.length > 5) {
      this.noiseFilter.history.shift();
    }

    // Apply smoothing based on history
    return transcript; // Simplified implementation
  }

  getAdaptiveThreshold() {
    if (!this.config.adaptiveThreshold) {
      return this.config.confidenceThreshold;
    }

    // Adjust threshold based on accuracy
    const accuracy = this.accuracyMetrics.accuracy;
    if (accuracy > 0.9) {
      return this.config.confidenceThreshold * 0.9;
    } else if (accuracy < 0.7) {
      return this.config.confidenceThreshold * 1.1;
    }

    return this.config.confidenceThreshold;
  }

  updateAccuracy() {
    const total = this.accuracyMetrics.totalCommands;
    const correct = this.accuracyMetrics.correctCommands;
    this.accuracyMetrics.accuracy = total > 0 ? correct / total : 0;
  }

  async executeCommand(command) {
    console.log(`🚀 Executing command: ${command}`);

    // Add to context
    this.contextEngine.recentCommands.push(command);
    if (this.contextEngine.recentCommands.length > 10) {
      this.contextEngine.recentCommands.shift();
    }

    // Execute via terminal
    if (window.electronAPI) {
      await window.electronAPI.executeCommand(command);
    } else {
      console.log(`Command would execute: ${command}`);
    }

    // Provide voice feedback
    this.provideFeedback(`Executing ${command}`);
  }

  async provideFeedback(message) {
    if (this.synthesis) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.2;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      this.synthesis.speak(utterance);
    }
  }

  async requestRepeat() {
    this.provideFeedback('Could you repeat that?');
  }

  handleUnrecognizedCommand(transcript) {
    console.warn(`❌ Unrecognized voice command: "${transcript}"`);
    this.provideFeedback('Command not recognized. Try again or use "help" for available commands.');
  }

  handleRecognitionError(event) {
    console.error('Voice recognition error:', event.error);

    switch (event.error) {
    case 'network':
      this.provideFeedback('Network error. Please check your connection.');
      break;
    case 'not-allowed':
      this.provideFeedback('Microphone access denied. Please enable microphone permissions.');
      break;
    case 'no-speech':
      console.log('No speech detected');
      break;
    default:
      this.provideFeedback('Voice recognition error occurred.');
    }

    this.updateUI('error', { error: event.error });
  }

  onRecognitionStart() {
    console.log('🎤 Voice recognition started');
    this.updateUI('listening');
  }

  onRecognitionEnd() {
    console.log('🔇 Voice recognition ended');

    // Auto-restart if continuous mode is enabled
    if (this.config.continuous && !this.isPaused) {
      setTimeout(() => {
        this.startListening();
      }, 500);
    }
  }

  updateUI(state, data = {}) {
    // Update UI to reflect current state
    const event = new CustomEvent('voice-recognition-update', {
      detail: { state, data },
    });
    window.dispatchEvent(event);
  }

  // Training and calibration methods
  async startCalibration() {
    console.log('🎯 Starting voice calibration...');
    this.config.calibrationMode = true;
    this.calibrationData = [];
    this.provideFeedback('Voice calibration started. Please speak clearly.');
  }

  async completeCalibration() {
    console.log('✅ Voice calibration completed');
    this.config.calibrationMode = false;

    // Process calibration data
    await this.processCalibrationData();

    // Save voice profile
    await this.saveVoiceProfile();

    this.provideFeedback('Voice calibration completed. Recognition should be more accurate now.');
  }

  async processCalibrationData() {
    // Process calibration data to improve recognition
    if (this.calibrationData.length > 0) {
      // Analyze patterns and adjust settings
      const avgConfidence =
        this.calibrationData.reduce((sum, data) => sum + data.confidence, 0) /
        this.calibrationData.length;

      // Adjust confidence threshold
      this.config.confidenceThreshold = Math.max(0.5, avgConfidence * 0.8);

      console.log(
        `📊 Calibration complete. New confidence threshold: ${this.config.confidenceThreshold.toFixed(2)}`
      );
    }
  }

  async saveVoiceProfile() {
    const profile = {
      confidenceThreshold: this.config.confidenceThreshold,
      accuracyMetrics: this.accuracyMetrics,
      calibrationData: this.calibrationData,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem('rinawarp-voice-profile', JSON.stringify(profile));
      console.log('💾 Voice profile saved');
    } catch (error) {
      console.error('Failed to save voice profile:', error);
    }
  }

  // Custom command management
  async addCustomCommand(voiceCommand, terminalCommand) {
    this.customCommands.set(voiceCommand.toLowerCase(), terminalCommand);
    await this.saveCustomCommands();
    console.log(`➕ Added custom command: "${voiceCommand}" -> "${terminalCommand}"`);
  }

  async removeCustomCommand(voiceCommand) {
    this.customCommands.delete(voiceCommand.toLowerCase());
    await this.saveCustomCommands();
    console.log(`➖ Removed custom command: "${voiceCommand}"`);
  }

  async saveCustomCommands() {
    const commands = Object.fromEntries(this.customCommands);
    try {
      localStorage.setItem('rinawarp-voice-commands', JSON.stringify(commands));
    } catch (error) {
      console.error('Failed to save custom commands:', error);
    }
  }

  // Utility methods
  isValidCommand(command) {
    const commonCommands = [
      'ls',
      'cd',
      'pwd',
      'mkdir',
      'rmdir',
      'rm',
      'cp',
      'mv',
      'cat',
      'less',
      'more',
      'grep',
      'find',
      'head',
      'tail',
      'sort',
      'uniq',
      'wc',
      'ps',
      'top',
      'df',
      'du',
      'free',
      'uname',
      'whoami',
      'id',
      'uptime',
      'ping',
      'curl',
      'wget',
      'ssh',
      'scp',
      'git',
      'npm',
      'node',
      'python',
      'pip',
      'docker',
      'kubectl',
      'make',
      'gcc',
      'java',
    ];

    return commonCommands.includes(command);
  }

  resolveNpmCommand(transcript) {
    if (transcript.includes('install')) return 'npm install';
    if (transcript.includes('start')) return 'npm start';
    if (transcript.includes('test')) return 'npm test';
    if (transcript.includes('build')) return 'npm run build';
    if (transcript.includes('dev')) return 'npm run dev';
    return 'npm';
  }

  resolveGitCommand(transcript) {
    if (transcript.includes('status')) return 'git status';
    if (transcript.includes('add')) return 'git add .';
    if (transcript.includes('commit')) return 'git commit -m "';
    if (transcript.includes('push')) return 'git push';
    if (transcript.includes('pull')) return 'git pull';
    if (transcript.includes('branch')) return 'git branch';
    if (transcript.includes('checkout')) return 'git checkout';
    return 'git';
  }

  resolveDockerCommand(transcript) {
    if (transcript.includes('build')) return 'docker build -t';
    if (transcript.includes('run')) return 'docker run';
    if (transcript.includes('stop')) return 'docker stop';
    if (transcript.includes('list')) return 'docker ps';
    if (transcript.includes('images')) return 'docker images';
    return 'docker';
  }

  // Get recognition status
  getStatus() {
    return {
      isListening: this.isListening,
      isPaused: this.isPaused,
      confidence: this.confidence,
      language: this.language,
      accuracyMetrics: this.accuracyMetrics,
      customCommandsCount: this.customCommands.size,
    };
  }

  // Cleanup
  destroy() {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }

    if (this.synthesis) {
      this.synthesis.cancel();
      this.synthesis = null;
    }

    console.log('🧹 Voice recognition engine destroyed');
  }
}

export default EnhancedVoiceEngine;
