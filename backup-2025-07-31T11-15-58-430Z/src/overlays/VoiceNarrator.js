/**
 * VoiceNarrator class handles text-to-speech announcements using Web Speech API
 * with support for different urgency levels, voice configuration, and message queuing.
 */
class VoiceNarrator {
  constructor(config = {}) {
    // Initialize speech synthesis
    this.synth = window.speechSynthesis;

    // Default voice settings
    this.settings = {
      rate: config.rate || 1.0, // Speech rate (0.1 to 10)
      pitch: config.pitch || 1.0, // Voice pitch (0 to 2)
      volume: config.volume || 1.0, // Volume (0 to 1)
      voice: null, // Selected voice (will be set in init)
    };

    // Message queue for managing overlapping announcements
    this.messageQueue = [];
    this.isPlaying = false;

    // Initialize voice when the component is created
    this.init();
  }

  /**
   * Initialize the voice narrator and set up the preferred voice
   */
  async init() {
    // Wait for voices to be loaded
    if (this.synth.getVoices().length === 0) {
      await new Promise(resolve => {
        this.synth.addEventListener('voiceschanged', resolve, { once: true });
      });
    }

    // Select the default voice (preferably an English voice)
    const voices = this.synth.getVoices();
    this.settings.voice = voices.find(voice => voice.lang.startsWith('en-')) || voices[0];
  }

  /**
   * Configure voice settings
   * @param {Object} config - Voice configuration options
   */
  configure(config = {}) {
    this.settings = {
      ...this.settings,
      rate: config.rate ?? this.settings.rate,
      pitch: config.pitch ?? this.settings.pitch,
      volume: config.volume ?? this.settings.volume,
    };

    if (config.voice) {
      const voices = this.synth.getVoices();
      const newVoice = voices.find(v => v.name === config.voice);
      if (newVoice) {
        this.settings.voice = newVoice;
      }
    }
  }

  /**
   * Add a message to the queue and process it
   * @param {string} text - The text to be spoken
   * @param {Object} options - Speech options including urgency
   */
  async speak(text, options = {}) {
    const utterance = new SpeechSynthesisUtterance(text);

    // Apply voice settings
    utterance.rate = options.urgency === 'critical' ? 1.2 : this.settings.rate;
    utterance.pitch = options.urgency === 'critical' ? 1.3 : this.settings.pitch;
    utterance.volume = this.settings.volume;
    utterance.voice = this.settings.voice;

    // Add stress indicators for critical messages
    if (options.urgency === 'critical') {
      text = `Alert! ${text}`;
      utterance.volume = Math.min(this.settings.volume * 1.2, 1.0);
    }

    // Add message to queue
    this.messageQueue.push(utterance);

    // Process queue if not already playing
    if (!this.isPlaying) {
      this.processQueue();
    }
  }

  /**
   * Process messages in the queue
   */
  async processQueue() {
    if (this.messageQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const utterance = this.messageQueue.shift();

    return new Promise(resolve => {
      utterance.onend = () => {
        resolve();
        this.processQueue();
      };

      utterance.onerror = error => {
        console.error('Speech synthesis error:', error);
        resolve();
        this.processQueue();
      };

      this.synth.speak(utterance);
    });
  }

  /**
   * Announce a critical error with urgency
   * @param {string} message - The error message
   */
  announceCriticalError(message) {
    this.speak(message, { urgency: 'critical' });
  }

  /**
   * Announce a recoverable error with calm tone
   * @param {string} message - The error message
   */
  announceRecoverableError(message) {
    this.speak(`Note: ${message}`, { urgency: 'normal' });
  }

  /**
   * Stop all announcements and clear the queue
   */
  stop() {
    this.synth.cancel();
    this.messageQueue = [];
    this.isPlaying = false;
  }
}

export default VoiceNarrator;
