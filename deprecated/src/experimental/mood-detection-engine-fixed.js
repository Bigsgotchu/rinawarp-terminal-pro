/**
 * Mood Detection Engine - Emotional Intelligence for Terminal Interaction
 *
 * Features:
 * - Typing pattern analysis (speed, pauses, corrections)
 * - Command frequency and error pattern monitoring
 * - Adaptive UI themes and responses
 * - Voice tone analysis (when available)
 * - Smart suggestions based on emotional state
 */

export class MoodDetectionEngine {
  constructor(options = {}) {
    this.options = {
      enableVoiceAnalysis: options.enableVoiceAnalysis !== false,
      enableTypingAnalysis: options.enableTypingAnalysis !== false,
      adaptiveUI: options.adaptiveUI !== false,
      debugMode: options.debugMode === true,
      samplingRate: options.samplingRate || 1000, // ms
      moodUpdateInterval: options.moodUpdateInterval || 5000, // ms
      ...options,
    };

    // Current emotional state
    this.currentMood = 'neutral';
    this.confidence = 0.5;
    this.moodHistory = [];

    // Typing pattern analysis
    this.typingMetrics = {
      keystrokes: [],
      averageWPM: 0,
      pauseCount: 0,
      correctionCount: 0,
      rapidFireEvents: 0,
      lastKeystroke: null,
    };

    // Command pattern analysis
    this.commandMetrics = {
      commandHistory: [],
      errorStreaks: 0,
      successStreak: 0,
      repeatCommands: 0,
      helpRequests: 0,
      frustrationType: 'none', // none, syntax, system, navigation
    };

    // Voice analysis (if available)
    this.voiceMetrics = {
      enabled: false,
      audioContext: null,
      analyser: null,
      toneIndicators: {
        pitch: 0,
        volume: 0,
        speed: 0,
      },
    };

    // UI adaptation state
    this.uiState = {
      theme: 'default',
      glowIntensity: 0.5,
      suggestionLevel: 'normal', // minimal, normal, helpful, verbose
      colorPalette: 'neutral',
    };

    // Event handlers
    this.handlers = {
      moodChange: [],
      confidenceChange: [],
      uiAdaptation: [],
    };

    // Initialize components
    this.initializeTypingAnalysis();

    if (this.options.enableVoiceAnalysis) {
      this.initializeVoiceAnalysis();
    }

    // Start mood analysis loop
    this.startMoodAnalysis();

    this.log('Mood Detection Engine initialized', 'info');
  }

  /**
   * Initialize typing pattern analysis
   */
  initializeTypingAnalysis() {
    if (!this.options.enableTypingAnalysis) return;

    // Monitor global keystrokes
    document.addEventListener('keydown', e => {
      this.recordKeystroke(e);
    });

    // Monitor terminal-specific events if terminal is available
    this.monitorTerminalInput();

    this.log('Typing analysis initialized', 'info');
  }

  /**
   * Record keystroke for analysis
   */
  recordKeystroke(event) {
    const now = Date.now();
    const keystroke = {
      timestamp: now,
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      repeat: event.repeat,
    };

    this.typingMetrics.keystrokes.push(keystroke);

    // Analyze typing patterns
    this.analyzeTypingPattern(keystroke);

    // Keep only recent keystrokes (last 30 seconds)
    const cutoff = now - 30000;
    this.typingMetrics.keystrokes = this.typingMetrics.keystrokes.filter(k => k.timestamp > cutoff);
  }

  /**
   * Analyze typing patterns for mood indicators
   */
  analyzeTypingPattern(keystroke) {
    const now = Date.now();

    // Calculate time between keystrokes
    if (this.typingMetrics.lastKeystroke) {
      const timeDelta = now - this.typingMetrics.lastKeystroke.timestamp;

      // Detect rapid-fire typing (possible urgency/frustration)
      if (timeDelta < 100) {
        this.typingMetrics.rapidFireEvents++;
      }

      // Detect long pauses (possible confusion/thinking)
      if (timeDelta > 2000) {
        this.typingMetrics.pauseCount++;
      }
    }

    // Detect corrections (backspace/delete)
    if (keystroke.key === 'Backspace' || keystroke.key === 'Delete') {
      this.typingMetrics.correctionCount++;
    }

    // Calculate WPM
    this.calculateWPM();

    this.typingMetrics.lastKeystroke = keystroke;
  }

  /**
   * Calculate words per minute
   */
  calculateWPM() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const recentKeystrokes = this.typingMetrics.keystrokes.filter(
      k => k.timestamp > oneMinuteAgo && k.key.length === 1
    );

    // Rough WPM calculation (5 characters = 1 word)
    this.typingMetrics.averageWPM = Math.round(recentKeystrokes.length / 5);
  }

  /**
   * Monitor terminal input for command patterns
   */
  monitorTerminalInput() {
    // Hook into shell manager if available
    const checkShellManager = () => {
      const shellManager = window.diagnosticState?.shellManager;
      if (shellManager) {
        shellManager.on('data', data => {
          if (data.direction === 'sent') {
            this.analyzeCommand(data.data);
          } else {
            this.analyzeCommandResponse(data.data);
          }
        });

        shellManager.on('error', error => {
          this.recordCommandError(error);
        });

        this.log('Terminal input monitoring active', 'info');
        return true;
      }
      return false;
    };

    // Try to connect now, or retry periodically
    if (!checkShellManager()) {
      const retryInterval = setInterval(() => {
        if (checkShellManager()) {
          clearInterval(retryInterval);
        }
      }, 2000);
    }
  }

  /**
   * Analyze command for mood indicators
   */
  analyzeCommand(command) {
    const cleanCommand = command.trim().toLowerCase();

    if (!cleanCommand || cleanCommand === '\r') return;

    const commandEntry = {
      timestamp: Date.now(),
      command: cleanCommand,
      type: this.categorizeCommand(cleanCommand),
    };

    this.commandMetrics.commandHistory.push(commandEntry);

    // Keep only recent commands (last 100)
    if (this.commandMetrics.commandHistory.length > 100) {
      this.commandMetrics.commandHistory.shift();
    }

    // Detect patterns
    this.detectCommandPatterns(commandEntry);
  }

  /**
   * Categorize command type
   */
  categorizeCommand(command) {
    const helpCommands = ['help', 'man', '--help', '-h', '?'];
    const navigationCommands = ['cd', 'ls', 'pwd', 'find', 'locate'];
    const fileCommands = ['cat', 'nano', 'vim', 'emacs', 'touch', 'mkdir'];
    const systemCommands = ['ps', 'kill', 'top', 'htop', 'df', 'free'];

    if (helpCommands.some(h => command.includes(h))) return 'help';
    if (navigationCommands.some(n => command.startsWith(n))) return 'navigation';
    if (fileCommands.some(f => command.startsWith(f))) return 'file';
    if (systemCommands.some(s => command.startsWith(s))) return 'system';

    return 'other';
  }

  /**
   * Detect command patterns that indicate mood
   */
  detectCommandPatterns(commandEntry) {
    const recent = this.commandMetrics.commandHistory.slice(-5);

    // Detect help-seeking behavior (confusion/learning)
    if (commandEntry.type === 'help') {
      this.commandMetrics.helpRequests++;
    }

    // Detect repeated commands (possible frustration)
    const lastCommands = recent.map(c => c.command);
    const duplicates = lastCommands.filter((cmd, i) => lastCommands.indexOf(cmd) !== i).length;

    if (duplicates > 0) {
      this.commandMetrics.repeatCommands++;
    }
  }

  /**
   * Analyze command response for errors
   */
  analyzeCommandResponse(response) {
    const errorIndicators = [
      'command not found',
      'no such file',
      'permission denied',
      'syntax error',
      'invalid option',
      'cannot access',
    ];

    const isError = errorIndicators.some(indicator => response.toLowerCase().includes(indicator));

    if (isError) {
      this.recordCommandError({ message: response });
    } else {
      // Reset error streak on success
      if (this.commandMetrics.errorStreaks > 0) {
        this.commandMetrics.errorStreaks = 0;
        this.commandMetrics.successStreak++;
      }
    }
  }

  /**
   * Record command error for mood analysis
   */
  recordCommandError(error) {
    this.commandMetrics.errorStreaks++;
    this.commandMetrics.successStreak = 0;

    // Categorize frustration type
    const errorMsg = error.message.toLowerCase();
    if (errorMsg.includes('syntax') || errorMsg.includes('invalid')) {
      this.commandMetrics.frustrationType = 'syntax';
    } else if (errorMsg.includes('permission') || errorMsg.includes('access')) {
      this.commandMetrics.frustrationType = 'system';
    } else if (errorMsg.includes('not found') || errorMsg.includes('no such')) {
      this.commandMetrics.frustrationType = 'navigation';
    }
  }

  /**
   * Initialize voice analysis (experimental)
   */
  async initializeVoiceAnalysis() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.log('Voice analysis not supported in this browser', 'warning');
        return;
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      // Set up audio analysis
      this.voiceMetrics.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.voiceMetrics.analyser = this.voiceMetrics.audioContext.createAnalyser();

      const source = this.voiceMetrics.audioContext.createMediaStreamSource(stream);
      source.connect(this.voiceMetrics.analyser);

      this.voiceMetrics.analyser.fftSize = 2048;
      this.voiceMetrics.enabled = true;

      // Start voice analysis loop
      this.startVoiceAnalysis();

      this.log('Voice analysis initialized', 'success');
    } catch (error) {
      this.log(`Voice analysis initialization failed: ${error.message}`, 'warning');
    }
  }

  /**
   * Start voice analysis loop
   */
  startVoiceAnalysis() {
    if (!this.voiceMetrics.enabled) return;

    const analyzeVoice = () => {
      const bufferLength = this.voiceMetrics.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      this.voiceMetrics.analyser.getByteFrequencyData(dataArray);

      // Calculate voice metrics
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const volume = average / 255;

      // Simple pitch detection (fundamental frequency)
      let maxIndex = 0;
      let maxValue = 0;
      for (let i = 0; i < bufferLength; i++) {
        if (dataArray[i] > maxValue) {
          maxValue = dataArray[i];
          maxIndex = i;
        }
      }

      const pitch = (maxIndex * this.voiceMetrics.audioContext.sampleRate) / (2 * bufferLength);

      // Update voice metrics
      this.voiceMetrics.toneIndicators = {
        volume: volume,
        pitch: pitch,
        energy: average,
      };

      requestAnimationFrame(analyzeVoice);
    };

    analyzeVoice();
  }

  /**
   * Start mood analysis loop
   */
  startMoodAnalysis() {
    setInterval(() => {
      this.analyzeMood();
    }, this.options.moodUpdateInterval);

    this.log('Mood analysis loop started', 'info');
  }

  /**
   * Main mood analysis function
   */
  analyzeMood() {
    const moodScores = {
      frustrated: 0,
      confused: 0,
      confident: 0,
      curious: 0,
      overwhelmed: 0,
      focused: 0,
    };

    // Analyze typing patterns
    this.analyzeTypingMood(moodScores);

    // Analyze command patterns
    this.analyzeCommandMood(moodScores);

    // Analyze voice patterns (if available)
    if (this.voiceMetrics.enabled) {
      this.analyzeVoiceMood(moodScores);
    }

    // Determine dominant mood
    const newMood = this.calculateDominantMood(moodScores);
    const newConfidence = this.calculateConfidence(moodScores);

    // Update mood if significantly changed
    if (newMood !== this.currentMood || Math.abs(newConfidence - this.confidence) > 0.1) {
      this.updateMood(newMood, newConfidence);
    }

    // Store mood history
    this.moodHistory.push({
      timestamp: Date.now(),
      mood: this.currentMood,
      confidence: this.confidence,
      scores: { ...moodScores },
    });

    // Keep only recent history (last hour)
    const oneHourAgo = Date.now() - 3600000;
    this.moodHistory = this.moodHistory.filter(h => h.timestamp > oneHourAgo);
  }

  /**
   * Analyze typing patterns for mood indicators
   */
  analyzeTypingMood(moodScores) {
    const metrics = this.typingMetrics;

    // High correction rate suggests frustration
    if (metrics.correctionCount > 5) {
      moodScores.frustrated += 0.3;
    }

    // Rapid-fire typing suggests urgency/frustration
    if (metrics.rapidFireEvents > 3) {
      moodScores.frustrated += 0.2;
      moodScores.overwhelmed += 0.1;
    }

    // Long pauses suggest confusion or thinking
    if (metrics.pauseCount > 3) {
      moodScores.confused += 0.2;
      moodScores.curious += 0.1;
    }

    // Steady WPM suggests focus
    if (metrics.averageWPM > 30 && metrics.averageWPM < 80) {
      moodScores.focused += 0.2;
      moodScores.confident += 0.1;
    }

    // Very high WPM might suggest stress
    if (metrics.averageWPM > 100) {
      moodScores.overwhelmed += 0.2;
    }
  }

  /**
   * Analyze command patterns for mood indicators
   */
  analyzeCommandMood(moodScores) {
    const metrics = this.commandMetrics;

    // Error streaks suggest frustration
    if (metrics.errorStreaks > 2) {
      moodScores.frustrated += 0.4;
    }

    if (metrics.errorStreaks > 5) {
      moodScores.overwhelmed += 0.3;
    }

    // Help requests suggest confusion or curiosity
    if (metrics.helpRequests > 2) {
      moodScores.confused += 0.2;
      moodScores.curious += 0.3;
    }

    // Repeated commands suggest frustration
    if (metrics.repeatCommands > 3) {
      moodScores.frustrated += 0.2;
    }

    // Success streaks suggest confidence
    if (metrics.successStreak > 3) {
      moodScores.confident += 0.3;
      moodScores.focused += 0.2;
    }

    // Different frustration types
    if (metrics.frustrationType === 'syntax') {
      moodScores.confused += 0.1;
    } else if (metrics.frustrationType === 'system') {
      moodScores.frustrated += 0.2;
    }
  }

  /**
   * Analyze voice patterns for mood indicators
   */
  analyzeVoiceMood(moodScores) {
    const voice = this.voiceMetrics.toneIndicators;

    // High volume might suggest frustration or excitement
    if (voice.volume > 0.7) {
      moodScores.frustrated += 0.2;
    }

    // Low volume might suggest confusion or timidity
    if (voice.volume < 0.2 && voice.volume > 0.05) {
      moodScores.confused += 0.1;
    }

    // High pitch might suggest stress or excitement
    if (voice.pitch > 300) {
      moodScores.overwhelmed += 0.1;
    }

    // Moderate energy suggests focus
    if (voice.energy > 30 && voice.energy < 80) {
      moodScores.focused += 0.1;
    }
  }

  /**
   * Calculate dominant mood from scores
   */
  calculateDominantMood(scores) {
    let maxScore = 0;
    let dominantMood = 'neutral';

    for (const [mood, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        dominantMood = mood;
      }
    }

    // Require minimum threshold for mood change
    return maxScore > 0.3 ? dominantMood : 'neutral';
  }

  /**
   * Calculate confidence level
   */
  calculateConfidence(scores) {
    const values = Object.values(scores);
    const max = Math.max(...values);
    const secondMax = values.sort((a, b) => b - a)[1] || 0;

    // Higher confidence when there's a clear dominant mood
    return Math.min(0.9, Math.max(0.1, max - secondMax + 0.3));
  }

  /**
   * Update current mood and trigger adaptations
   */
  updateMood(newMood, newConfidence) {
    const oldMood = this.currentMood;
    this.currentMood = newMood;
    this.confidence = newConfidence;

    this.log(
      `Mood changed: ${oldMood} → ${newMood} (${Math.round(newConfidence * 100)}% confidence)`,
      'info'
    );

    // Emit mood change event
    this.emit('moodChange', {
      oldMood,
      newMood,
      confidence: newConfidence,
    });

    // Trigger UI adaptations
    if (this.options.adaptiveUI) {
      this.adaptUI();
    }

    // Update UI metric display
    this.updateMoodDisplay();
  }

  /**
   * Adapt UI based on current mood
   */
  adaptUI() {
    const adaptations = this.getUIAdaptations(this.currentMood);

    // Apply color theme
    if (adaptations.colorPalette !== this.uiState.colorPalette) {
      this.applyColorTheme(adaptations.colorPalette);
    }

    // Apply glow effects
    if (adaptations.glowIntensity !== this.uiState.glowIntensity) {
      this.applyGlowEffects(adaptations.glowIntensity);
    }

    // Update suggestion level
    this.uiState.suggestionLevel = adaptations.suggestionLevel;

    this.uiState = { ...this.uiState, ...adaptations };

    // Emit UI adaptation event
    this.emit('uiAdaptation', adaptations);

    this.log(`UI adapted for ${this.currentMood} mood`, 'info');
  }

  /**
   * Get UI adaptations for a specific mood
   */
  getUIAdaptations(mood) {
    const adaptations = {
      frustrated: {
        colorPalette: 'calm',
        glowIntensity: 0.3,
        suggestionLevel: 'helpful',
        theme: 'soothing',
      },
      confused: {
        colorPalette: 'warm',
        glowIntensity: 0.4,
        suggestionLevel: 'verbose',
        theme: 'educational',
      },
      confident: {
        colorPalette: 'vibrant',
        glowIntensity: 0.7,
        suggestionLevel: 'minimal',
        theme: 'dynamic',
      },
      curious: {
        colorPalette: 'cool',
        glowIntensity: 0.6,
        suggestionLevel: 'normal',
        theme: 'explorative',
      },
      overwhelmed: {
        colorPalette: 'muted',
        glowIntensity: 0.2,
        suggestionLevel: 'simplified',
        theme: 'minimal',
      },
      focused: {
        colorPalette: 'monochrome',
        glowIntensity: 0.4,
        suggestionLevel: 'minimal',
        theme: 'focused',
      },
    };

    return (
      adaptations[mood] || {
        colorPalette: 'neutral',
        glowIntensity: 0.5,
        suggestionLevel: 'normal',
        theme: 'default',
      }
    );
  }

  /**
   * Apply color theme to UI
   */
  applyColorTheme(palette) {
    const themes = {
      calm: {
        primary: '#4fc3f7',
        accent: '#81c784',
        background: '#1a237e',
        glow: '#4fc3f7',
      },
      warm: {
        primary: '#ffb74d',
        accent: '#ff8a65',
        background: '#3e2723',
        glow: '#ffb74d',
      },
      vibrant: {
        primary: '#e91e63',
        accent: '#00e676',
        background: '#1a1a1a',
        glow: '#e91e63',
      },
      cool: {
        primary: '#26c6da',
        accent: '#7c4dff',
        background: '#0d47a1',
        glow: '#26c6da',
      },
      muted: {
        primary: '#90a4ae',
        accent: '#a1887f',
        background: '#212121',
        glow: '#90a4ae',
      },
      monochrome: {
        primary: '#ffffff',
        accent: '#b0bec5',
        background: '#000000',
        glow: '#ffffff',
      },
    };

    const theme = themes[palette] || themes.neutral;

    // Apply CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--mood-primary', theme.primary);
    root.style.setProperty('--mood-accent', theme.accent);
    root.style.setProperty('--mood-background', theme.background);
    root.style.setProperty('--mood-glow', theme.glow);
  }

  /**
   * Apply glow effects
   */
  applyGlowEffects(intensity) {
    const elements = document.querySelectorAll('.terminal-container, .control-panel');

    elements.forEach(element => {
      const glowColor =
        getComputedStyle(document.documentElement).getPropertyValue('--mood-glow') || '#00ff88';

      const shadowIntensity = Math.round(intensity * 20);
      element.style.boxShadow = `0 0 ${shadowIntensity}px ${glowColor}33`;
    });
  }

  /**
   * Update mood display in UI
   */
  updateMoodDisplay() {
    if (typeof updateMetric === 'function') {
      const moodEmojis = {
        frustrated: '😤',
        confused: '🤔',
        confident: '😎',
        curious: '🤓',
        overwhelmed: '😵',
        focused: '🎯',
        neutral: '😐',
      };

      const displayText = `${moodEmojis[this.currentMood]} ${this.currentMood.charAt(0).toUpperCase() + this.currentMood.slice(1)}`;
      const confidenceClass =
        this.confidence > 0.7 ? 'success' : this.confidence > 0.4 ? 'warning' : 'info';

      updateMetric('mood-status', displayText, confidenceClass);
    }
  }

  /**
   * Get smart suggestions based on current mood
   */
  getSmartSuggestions() {
    const suggestions = {
      frustrated: [
        "Take a deep breath. Try 'history | grep <command>' to find previous commands.",
        "Maybe try 'man <command>' for detailed help?",
        'Consider breaking this down into smaller steps.',
      ],
      confused: [
        "Need help? Try 'help' or 'man <command>' for documentation.",
        "Use 'ls -la' to see what files are available.",
        "Try 'pwd' to see where you are in the filesystem.",
      ],
      confident: [
        "You're on fire! 🔥",
        'Ready for a challenge? Try some advanced commands.',
        'Great job! Keep up the momentum.',
      ],
      curious: [
        'Exploring is great! Try \'find . -name "*pattern*"\' to search for files.',
        "Use 'which <command>' to see where programs are located.",
        "Check out 'env' to see your environment variables.",
      ],
      overwhelmed: [
        "Let's take this one step at a time.",
        "Focus on one task. You've got this! 💪",
        "Try 'clear' to clean up your screen.",
      ],
      focused: [
        "You're in the zone! 🎯",
        'Great concentration. Keep going!',
        'Productivity mode: ON',
      ],
    };

    const moodSuggestions = suggestions[this.currentMood] || [
      'How can I help you today?',
      'Ready to work on something interesting?',
    ];

    return moodSuggestions[Math.floor(Math.random() * moodSuggestions.length)];
  }

  /**
   * Get current mood state
   */
  getMoodState() {
    return {
      mood: this.currentMood,
      confidence: this.confidence,
      uiState: this.uiState,
      suggestions: this.getSmartSuggestions(),
      metrics: {
        typing: this.typingMetrics,
        commands: this.commandMetrics,
        voice: this.voiceMetrics.enabled ? this.voiceMetrics.toneIndicators : null,
      },
    };
  }

  /**
   * Event emitter functionality
   */
  on(event, handler) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
  }

  emit(event, data) {
    if (this.handlers[event]) {
      this.handlers[event].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.log(`Event handler error for ${event}: ${error.message}`, 'error');
        }
      });
    }
  }

  /**
   * Reset mood detection state
   */
  reset() {
    this.currentMood = 'neutral';
    this.confidence = 0.5;
    this.moodHistory = [];
    this.typingMetrics = {
      keystrokes: [],
      averageWPM: 0,
      pauseCount: 0,
      correctionCount: 0,
      rapidFireEvents: 0,
      lastKeystroke: null,
    };
    this.commandMetrics = {
      commandHistory: [],
      errorStreaks: 0,
      successStreak: 0,
      repeatCommands: 0,
      helpRequests: 0,
      frustrationType: 'none',
    };

    this.log('Mood detection state reset', 'info');
  }

  /**
   * Logging utility
   */
  log(message, level = 'info') {
    const prefix = '[MoodEngine]';

    if (this.options.debugMode) {
      console[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log'](
        `${prefix} ${message}`
      );
    }

    // Use global logMessage if available
    if (typeof window !== 'undefined' && window.logMessage) {
      window.logMessage(`${prefix} ${message}`, level);
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Stop voice analysis
    if (this.voiceMetrics.audioContext) {
      this.voiceMetrics.audioContext.close();
    }

    // Clear handlers
    this.handlers = {
      moodChange: [],
      confidenceChange: [],
      uiAdaptation: [],
    };

    this.log('Mood detection engine destroyed', 'info');
  }
}

/**
 * Factory function to create mood detection engine
 */
export function createMoodDetectionEngine(options = {}) {
  return new MoodDetectionEngine(options);
}

/**
 * Global mood detection instance
 */
export let globalMoodEngine = null;

/**
 * Initialize global mood detection
 */
export function initializeGlobalMoodDetection(options = {}) {
  if (globalMoodEngine) {
    globalMoodEngine.destroy();
  }

  globalMoodEngine = createMoodDetectionEngine(options);

  // Make available globally
  if (typeof window !== 'undefined') {
    window.moodEngine = globalMoodEngine;
  }

  return globalMoodEngine;
}
