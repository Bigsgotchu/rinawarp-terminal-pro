/**
 * Voice Command System - Natural Language Processing for Terminal Control
 *
 * Features:
 * - Speech recognition with command parsing
 * - Natural language to shell command translation
 * - Voice feedback and confirmation
 * - Integration with mood detection
 * - Contextual command suggestions
 */

export class VoiceCommandSystem {
  constructor(options = {}) {
    this.options = {
      language: options.language || 'en-US',
      continuous: options.continuous !== false,
      interimResults: options.interimResults !== false,
      maxAlternatives: options.maxAlternatives || 3,
      confidence: options.confidence || 0.7,
      enableFeedback: options.enableFeedback !== false,
      debugMode: options.debugMode === true,
      ...options,
    };

    // Speech recognition
    this.recognition = null;
    this.isListening = false;
    this.isSupported = false;

    // Voice synthesis
    this.synthesis = null;
    this.voice = null;

    // Command processing
    this.commandHistory = [];
    this.lastCommand = null;
    this.pendingCommand = null;

    // Terminal integration
    this.terminal = null;
    this.shellManager = null;

    // Command patterns and mappings
    this.commandPatterns = this.initializeCommandPatterns();
    this.contextHistory = [];

    // Event handlers
    this.handlers = {
      command: [],
      listening: [],
      error: [],
      feedback: [],
    };

    this.initializeSpeechRecognition();
    this.initializeSpeechSynthesis();

    this.log('Voice Command System initialized', 'info');
  }

  /**
   * Initialize speech recognition
   */
  initializeSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      this.log('Speech recognition not supported in this browser', 'warning');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // Configure recognition
    this.recognition.continuous = this.options.continuous;
    this.recognition.interimResults = this.options.interimResults;
    this.recognition.lang = this.options.language;
    this.recognition.maxAlternatives = this.options.maxAlternatives;

    // Set up event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      this.emit('listening', { status: 'started' });
      this.log('Voice recognition started', 'info');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.emit('listening', { status: 'ended' });
      this.log('Voice recognition ended', 'info');
    };

    this.recognition.onresult = event => {
      this.handleSpeechResult(event);
    };

    this.recognition.onerror = event => {
      this.handleSpeechError(event);
    };

    this.isSupported = true;
    this.log('Speech recognition initialized', 'success');
  }

  /**
   * Initialize speech synthesis
   */
  initializeSpeechSynthesis() {
    if (!('speechSynthesis' in window)) {
      this.log('Speech synthesis not supported in this browser', 'warning');
      return;
    }

    this.synthesis = window.speechSynthesis;

    // Wait for voices to be loaded
    const loadVoices = () => {
      const voices = this.synthesis.getVoices();
      // Prefer natural/premium voices for better experience
      this.voice =
        voices.find(
          v =>
            v.lang.startsWith(this.options.language.split('-')[0]) &&
            (v.name.includes('Neural') || v.name.includes('Premium') || v.localService)
        ) ||
        voices.find(v => v.lang.startsWith(this.options.language.split('-')[0])) ||
        voices[0];

      this.log(`Speech synthesis initialized with voice: ${this.voice?.name}`, 'success');
    };

    if (this.synthesis.getVoices().length > 0) {
      loadVoices();
    } else {
      this.synthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * Initialize command patterns for NLP
   */
  initializeCommandPatterns() {
    return {
      // Navigation commands
      navigation: {
        patterns: [
          /(?:go to|change to|navigate to|cd to)\s+(.+)/i,
          /(?:list|show)\s+(?:files|directory|contents)/i,
          /(?:where am i|current directory|show path)/i,
          /go back|go up|parent directory/i,
        ],
        handlers: [match => `cd ${match[1]}`, () => 'ls -la', () => 'pwd', () => 'cd ..'],
      },

      // File operations
      file: {
        patterns: [
          /(?:create|make|touch)\s+(?:file|document)\s+(.+)/i,
          /(?:create|make)\s+(?:directory|folder)\s+(.+)/i,
          /(?:show|display|cat|view)\s+(?:file\s+)?(.+)/i,
          /(?:edit|open)\s+(?:file\s+)?(.+)/i,
          /(?:copy|cp)\s+(.+)\s+(?:to\s+)?(.+)/i,
          /(?:move|mv)\s+(.+)\s+(?:to\s+)?(.+)/i,
          /(?:delete|remove|rm)\s+(?:file\s+)?(.+)/i,
        ],
        handlers: [
          match => `touch ${match[1]}`,
          match => `mkdir ${match[1]}`,
          match => `cat ${match[1]}`,
          match => `nano ${match[1]}`,
          match => `cp ${match[1]} ${match[2]}`,
          match => `mv ${match[1]} ${match[2]}`,
          match => `rm ${match[1]}`,
        ],
      },

      // System commands
      system: {
        patterns: [
          /(?:show|list)\s+(?:processes|running)/i,
          /(?:kill|stop)\s+(?:process\s+)?(.+)/i,
          /(?:check|show)\s+(?:disk|space|storage)/i,
          /(?:check|show)\s+(?:memory|ram)/i,
          /(?:who|users)/i,
          /(?:date|time|when)/i,
        ],
        handlers: [
          () => 'ps aux',
          match => `kill ${match[1]}`,
          () => 'df -h',
          () => 'free -h',
          () => 'who',
          () => 'date',
        ],
      },

      // Terminal control
      control: {
        patterns: [
          /(?:clear|clean)\s+(?:screen|terminal)/i,
          /(?:restart|reboot)\s+(?:shell|terminal)/i,
          /(?:show|display)\s+(?:history|previous)/i,
          /(?:repeat|run)\s+(?:last|previous)\s+command/i,
          /(?:help|assist|what can)/i,
        ],
        handlers: [
          () => 'clear',
          () => '__RESTART_SHELL__',
          () => 'history',
          () => '!!',
          () => '__SHOW_HELP__',
        ],
      },

      // Git commands
      git: {
        patterns: [
          /git\s+(?:status|check)/i,
          /git\s+(?:add|stage)\s+(.+)/i,
          /git\s+commit\s+(?:with\s+message\s+)?(.+)/i,
          /git\s+(?:push|upload)/i,
          /git\s+(?:pull|download|fetch)/i,
          /git\s+(?:branch|branches)/i,
          /git\s+(?:checkout|switch)\s+(.+)/i,
        ],
        handlers: [
          () => 'git status',
          match => `git add ${match[1]}`,
          match => `git commit -m "${match[1]}"`,
          () => 'git push',
          () => 'git pull',
          () => 'git branch',
          match => `git checkout ${match[1]}`,
        ],
      },

      // Search and find
      search: {
        patterns: [
          /(?:find|search|locate)\s+(?:file\s+)?(.+)/i,
          /(?:grep|search in)\s+(.+)\s+(?:in|for)\s+(.+)/i,
          /(?:which|where is)\s+(.+)/i,
        ],
        handlers: [
          match => `find . -name "*${match[1]}*"`,
          match => `grep -r "${match[1]}" ${match[2]}`,
          match => `which ${match[1]}`,
        ],
      },
    };
  }

  /**
   * Handle speech recognition result
   */
  handleSpeechResult(event) {
    const results = Array.from(event.results);
    const latestResult = results[results.length - 1];

    if (!latestResult.isFinal) {
      // Show interim results
      this.emit('feedback', {
        type: 'interim',
        text: latestResult[0].transcript,
        confidence: latestResult[0].confidence,
      });
      return;
    }

    const transcript = latestResult[0].transcript.trim();
    const confidence = latestResult[0].confidence;

    this.log(`Voice input: "${transcript}" (confidence: ${Math.round(confidence * 100)}%)`, 'info');

    if (confidence < this.options.confidence) {
      this.speak('Sorry, I didn\'t catch that clearly. Could you repeat?');
      return;
    }

    // Process the command
    this.processVoiceCommand(transcript, confidence);
  }

  /**
   * Handle speech recognition error
   */
  handleSpeechError(event) {
    this.log(`Speech recognition error: ${event.error}`, 'error');
    this.emit('error', { type: 'recognition', error: event.error });

    const errorMessages = {
      'no-speech': 'I didn\'t hear anything. Please try again.',
      'audio-capture': 'Microphone not accessible. Please check permissions.',
      'not-allowed': 'Microphone permission denied. Please enable it in settings.',
      network: 'Network error. Please check your connection.',
    };

    const message = errorMessages[event.error] || `Recognition error: ${event.error}`;
    this.speak(message);
  }

  /**
   * Process voice command and convert to shell command
   */
  async processVoiceCommand(transcript, confidence) {
    try {
      // Store in history
      this.commandHistory.push({
        timestamp: Date.now(),
        transcript,
        confidence,
      });

      // Parse command
      const parsedCommand = this.parseNaturalLanguage(transcript);

      if (!parsedCommand) {
        this.speak('I didn\'t understand that command. Try saying \'help\' for available commands.');
        return;
      }

      // Handle special commands
      if (parsedCommand === '__RESTART_SHELL__') {
        this.handleRestartShell();
        return;
      }

      if (parsedCommand === '__SHOW_HELP__') {
        this.handleShowHelp();
        return;
      }

      // Confirm command before execution
      this.pendingCommand = {
        original: transcript,
        parsed: parsedCommand,
        confidence,
      };

      await this.confirmAndExecuteCommand(parsedCommand, transcript);
    } catch (error) {
      this.log(`Error processing voice command: ${error.message}`, 'error');
      this.speak('Sorry, there was an error processing your command.');
    }
  }

  /**
   * Parse natural language into shell commands
   */
  parseNaturalLanguage(text) {
    const normalizedText = text.toLowerCase().trim();

    // Check each category of commands
    for (const [category, config] of Object.entries(this.commandPatterns)) {
      for (let i = 0; i < config.patterns.length; i++) {
        const pattern = config.patterns[i];
        const match = normalizedText.match(pattern);

        if (match) {
          this.log(`Matched pattern in category: ${category}`, 'info');
          const handler = config.handlers[i];
          const command = typeof handler === 'function' ? handler(match) : handler;
          return command;
        }
      }
    }

    // Check for direct command
    if (this.isDirectCommand(normalizedText)) {
      return normalizedText;
    }

    return null;
  }

  /**
   * Check if text is a direct shell command
   */
  isDirectCommand(text) {
    const commonCommands = [
      'ls',
      'cd',
      'pwd',
      'cat',
      'echo',
      'grep',
      'find',
      'ps',
      'top',
      'df',
      'free',
      'git',
      'npm',
      'yarn',
      'node',
      'python',
      'java',
      'make',
      'cmake',
      'docker',
      'curl',
      'wget',
      'ssh',
      'scp',
      'rsync',
      'tar',
      'zip',
      'unzip',
    ];

    const firstWord = text.split(' ')[0];
    return commonCommands.includes(firstWord);
  }

  /**
   * Confirm and execute command
   */
  async confirmAndExecuteCommand(command, originalText) {
    // For high confidence or simple commands, execute directly
    if (this.pendingCommand.confidence > 0.9 || this.isSimpleCommand(command)) {
      await this.executeCommand(command);
      return;
    }

    // For lower confidence, ask for confirmation
    this.speak(`I heard: "${originalText}". Should I run: ${command}?`);

    // Set up confirmation listener
    this.waitForConfirmation(command);
  }

  /**
   * Check if command is simple/safe
   */
  isSimpleCommand(command) {
    const safeCommands = ['ls', 'pwd', 'date', 'whoami', 'clear', 'history'];
    return safeCommands.some(safe => command.startsWith(safe));
  }

  /**
   * Wait for user confirmation
   */
  waitForConfirmation(command) {
    const confirmationTimeout = setTimeout(() => {
      this.speak('Command cancelled due to timeout.');
      this.pendingCommand = null;
    }, 10000); // 10 second timeout

    const confirmationHandler = event => {
      const results = Array.from(event.results);
      const latestResult = results[results.length - 1];

      if (!latestResult.isFinal) return;

      const response = latestResult[0].transcript.toLowerCase().trim();

      if (response.includes('yes') || response.includes('confirm') || response.includes('ok')) {
        clearTimeout(confirmationTimeout);
        this.recognition.removeEventListener('result', confirmationHandler);
        this.executeCommand(command);
      } else if (
        response.includes('no') ||
        response.includes('cancel') ||
        response.includes('abort')
      ) {
        clearTimeout(confirmationTimeout);
        this.recognition.removeEventListener('result', confirmationHandler);
        this.speak('Command cancelled.');
        this.pendingCommand = null;
      }
    };

    this.recognition.addEventListener('result', confirmationHandler);
  }

  /**
   * Execute shell command
   */
  async executeCommand(command) {
    if (!this.shellManager) {
      this.log('No shell manager available for command execution', 'warning');
      this.speak('Shell not available. Please initialize the terminal first.');
      return;
    }

    try {
      this.log(`Executing command: ${command}`, 'info');
      this.speak(`Running: ${command}`);

      await this.shellManager.writeToShell(command + '\r');

      // Store successful execution
      this.lastCommand = command;
      this.updateContext(command);

      // Emit command event
      this.emit('command', {
        command,
        original: this.pendingCommand?.original,
        confidence: this.pendingCommand?.confidence,
        timestamp: Date.now(),
      });

      this.pendingCommand = null;
    } catch (error) {
      this.log(`Command execution failed: ${error.message}`, 'error');
      this.speak(`Failed to execute command: ${error.message}`);
    }
  }

  /**
   * Handle shell restart
   */
  async handleRestartShell() {
    if (this.shellManager && this.shellManager.restart) {
      this.speak('Restarting shell...');
      await this.shellManager.restart();
      this.speak('Shell restarted successfully.');
    } else {
      this.speak('Shell restart not available.');
    }
  }

  /**
   * Handle help request
   */
  handleShowHelp() {
    const _helpText = `Available voice commands include:
        - "list files" or "show directory"
        - "go to folder name" or "change to directory"
        - "create file filename" or "make directory name"
        - "clear screen" or "restart shell"
        - "show processes" or "check disk space"
        - "git status" or "git commit with message"
        - Or speak any command directly like "ls dash la"`;

    this.speak('Here are some commands you can use:');

    if (this.terminal && this.terminal.writeln) {
      this.terminal.writeln('\r\n📝 Voice Commands Help:');
      this.terminal.writeln('• "list files" → ls -la');
      this.terminal.writeln('• "go to desktop" → cd ~/Desktop');
      this.terminal.writeln('• "create file test.txt" → touch test.txt');
      this.terminal.writeln('• "clear screen" → clear');
      this.terminal.writeln('• "restart shell" → restart terminal');
      this.terminal.writeln('• "git status" → git status');
      this.terminal.writeln('• Or speak commands directly\r\n');
    }
  }

  /**
   * Update command context for better parsing
   */
  updateContext(command) {
    this.contextHistory.push({
      command,
      timestamp: Date.now(),
    });

    // Keep only recent context (last 10 commands)
    if (this.contextHistory.length > 10) {
      this.contextHistory.shift();
    }
  }

  /**
   * Start listening for voice commands
   */
  startListening() {
    if (!this.isSupported) {
      this.log('Speech recognition not supported', 'error');
      return false;
    }

    if (this.isListening) {
      this.log('Already listening', 'warning');
      return false;
    }

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      this.log(`Failed to start listening: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Stop listening for voice commands
   */
  stopListening() {
    if (!this.isListening) {
      return false;
    }

    this.recognition.stop();
    return true;
  }

  /**
   * Toggle listening state
   */
  toggleListening() {
    return this.isListening ? this.stopListening() : this.startListening();
  }

  /**
   * Speak text using TTS
   */
  speak(text, options = {}) {
    if (!this.options.enableFeedback || !this.synthesis) {
      return;
    }

    // Cancel any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.voice;
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    utterance.onstart = () => {
      this.emit('feedback', { type: 'speech_start', text });
    };

    utterance.onend = () => {
      this.emit('feedback', { type: 'speech_end', text });
    };

    this.synthesis.speak(utterance);
    this.log(`Speaking: "${text}"`, 'info');
  }

  /**
   * Set terminal and shell manager references
   */
  setIntegration(terminal, shellManager) {
    this.terminal = terminal;
    this.shellManager = shellManager;
    this.log('Voice command system integrated with terminal', 'info');
  }

  /**
   * Get command history
   */
  getCommandHistory() {
    return this.commandHistory;
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isSupported: this.isSupported,
      isListening: this.isListening,
      hasVoice: !!this.voice,
      commandCount: this.commandHistory.length,
      lastCommand: this.lastCommand,
      pendingCommand: this.pendingCommand,
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
   * Logging utility
   */
  log(message, level = 'info') {
    const prefix = '[VoiceCommands]';

    if (this.options.debugMode) {
      if (level === 'error') {
        console.error(`${prefix} ${message}`);
      } else if (level === 'warning') {
        console.warn(`${prefix} ${message}`);
      } else {
      }
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
    if (this.isListening) {
      this.stopListening();
    }

    if (this.synthesis) {
      this.synthesis.cancel();
    }

    this.handlers = {
      command: [],
      listening: [],
      error: [],
      feedback: [],
    };

    this.log('Voice command system destroyed', 'info');
  }
}

/**
 * Factory function to create voice command system
 */
export function createVoiceCommandSystem(options = {}) {
  return new VoiceCommandSystem(options);
}

/**
 * Global voice command instance
 */
export let globalVoiceCommands = null;

/**
 * Initialize global voice commands
 */
export function initializeGlobalVoiceCommands(options = {}) {
  if (globalVoiceCommands) {
    globalVoiceCommands.destroy();
  }

  globalVoiceCommands = createVoiceCommandSystem(options);

  // Make available globally
  if (typeof window !== 'undefined') {
    window.voiceCommands = globalVoiceCommands;
  }

  return globalVoiceCommands;
}
