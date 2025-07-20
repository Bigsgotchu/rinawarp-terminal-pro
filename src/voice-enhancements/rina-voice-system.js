/**
 * RinaWarp Terminal - Custom Rina Voice System
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 * 
 * This module provides a custom voice personality system with:
 * - Audio asset management for pre-recorded voice clips
 * - Intelligent voice routing based on context and mood
 * - Fallback to speech synthesis when clips unavailable
 * - Dynamic voice tone switching based on user mood
 * - Professional voice sample management and playback
 */

export class RinaVoiceSystem {
  constructor() {
    this.audioContext = null;
    this.voiceMap = new Map();
    this.currentMood = 'neutral';
    this.voiceMode = 'hybrid'; // 'clips', 'synthesis', 'hybrid'
    this.fallbackSynthesis = null;
    this.audioCache = new Map();
    this.isInitialized = false;
    
    // Configuration for voice behavior
    this.config = {
      enableClips: true,
      enableSynthesis: true,
      fallbackToSynthesis: true,
      preloadAudio: true,
      maxCacheSize: 50,
      audioFormats: ['.wav', '.mp3', '.ogg'],
      baseVolume: 0.8,
      moodVolumeAdjust: {
        confident: 1.0,
        neutral: 0.8,
        uncertain: 0.7,
        frustrated: 0.6,
        confused: 0.7
      }
    };

    this.init();
  }

  async init() {
    console.log('🎙️ Initializing Rina Voice System...');
    
    // Initialize audio context
    await this.initializeAudioContext();
    
    // Load voice mappings
    await this.loadVoiceMappings();
    
    // Initialize fallback synthesis
    await this.initializeFallbackSynthesis();
    
    // Preload audio if enabled
    if (this.config.preloadAudio) {
      await this.preloadCriticalAudio();
    }

    this.isInitialized = true;
    console.log('✅ Rina Voice System initialized successfully');
  }

  async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('🔊 Audio context initialized');
    } catch (error) {
      console.warn('⚠️ Audio context initialization failed:', error.message);
    }
  }

  async loadVoiceMappings() {
    // Define voice clip mappings organized by category and mood
    this.voiceMap = new Map([
      // Command confirmations
      ['bootSuccess', {
        clips: {
          neutral: 'sounds/rina/boot-complete.wav',
          confident: 'sounds/rina/boot-complete-confident.wav',
          excited: 'sounds/rina/boot-complete-excited.wav'
        },
        fallback: 'Boot complete! RinaWarp Terminal is ready.'
      }],
      
      ['commandExecuting', {
        clips: {
          neutral: 'sounds/rina/executing.wav',
          confident: 'sounds/rina/executing-confident.wav',
          quick: 'sounds/rina/executing-quick.wav'
        },
        fallback: 'Running that now...'
      }],

      ['commandComplete', {
        clips: {
          neutral: 'sounds/rina/complete.wav',
          satisfied: 'sounds/rina/complete-satisfied.wav',
          efficient: 'sounds/rina/complete-efficient.wav'
        },
        fallback: 'Command completed successfully.'
      }],

      // Emotional cues
      ['thinking', {
        clips: {
          neutral: 'sounds/rina/thinking.wav',
          curious: 'sounds/rina/thinking-curious.wav',
          processing: 'sounds/rina/thinking-processing.wav'
        },
        fallback: 'Let me think...'
      }],

      ['interesting', {
        clips: {
          neutral: 'sounds/rina/interesting.wav',
          intrigued: 'sounds/rina/interesting-intrigued.wav',
          analytical: 'sounds/rina/interesting-analytical.wav'
        },
        fallback: 'Hmm, interesting...'
      }],

      ['suggestion', {
        clips: {
          neutral: 'sounds/rina/try-this.wav',
          helpful: 'sounds/rina/try-this-helpful.wav',
          encouraging: 'sounds/rina/try-this-encouraging.wav'
        },
        fallback: 'Try this instead?'
      }],

      // Diagnostic feedback
      ['moduleError', {
        clips: {
          neutral: 'sounds/rina/module-loading-failed.wav',
          concerned: 'sounds/rina/module-loading-failed-concerned.wav',
          technical: 'sounds/rina/module-loading-failed-technical.wav'
        },
        fallback: 'Module loading failed. Checking diagnostics...'
      }],

      ['electronMissing', {
        clips: {
          neutral: 'sounds/rina/electron-not-detected.wav',
          alert: 'sounds/rina/electron-not-detected-alert.wav',
          diagnostic: 'sounds/rina/electron-not-detected-diagnostic.wav'
        },
        fallback: 'Electron runtime not detected. Please check your installation.'
      }],

      // Greetings and personality
      ['greeting', {
        clips: {
          neutral: 'sounds/rina/hello-rina.wav',
          warm: 'sounds/rina/hello-rina-warm.wav',
          professional: 'sounds/rina/hello-rina-professional.wav',
          friendly: 'sounds/rina/hello-rina-friendly.wav'
        },
        fallback: 'Hello! I\'m Rina, your terminal assistant.'
      }],

      ['farewell', {
        clips: {
          neutral: 'sounds/rina/goodbye.wav',
          warm: 'sounds/rina/goodbye-warm.wav',
          professional: 'sounds/rina/goodbye-professional.wav'
        },
        fallback: 'Goodbye! Terminal session ending.'
      }],

      // Mood-specific responses
      ['frustrated_help', {
        clips: {
          empathetic: 'sounds/rina/frustrated-help-empathetic.wav',
          calming: 'sounds/rina/frustrated-help-calming.wav',
          supportive: 'sounds/rina/frustrated-help-supportive.wav'
        },
        fallback: 'I understand this can be frustrating. Let me help simplify things.'
      }],

      ['uncertain_guidance', {
        clips: {
          reassuring: 'sounds/rina/uncertain-guidance-reassuring.wav',
          patient: 'sounds/rina/uncertain-guidance-patient.wav',
          gentle: 'sounds/rina/uncertain-guidance-gentle.wav'
        },
        fallback: 'No worries! Let\'s take this step by step.'
      }],

      // System status
      ['systemHealthy', {
        clips: {
          neutral: 'sounds/rina/system-healthy.wav',
          confident: 'sounds/rina/system-healthy-confident.wav',
          satisfied: 'sounds/rina/system-healthy-satisfied.wav'
        },
        fallback: 'All systems are running smoothly.'
      }],

      ['performanceGood', {
        clips: {
          neutral: 'sounds/rina/performance-good.wav',
          pleased: 'sounds/rina/performance-good-pleased.wav',
          efficient: 'sounds/rina/performance-good-efficient.wav'
        },
        fallback: 'Performance metrics look excellent!'
      }]
    ]);

    console.log(`📝 Loaded ${this.voiceMap.size} voice mappings`);
  }

  async initializeFallbackSynthesis() {
    if ('speechSynthesis' in window) {
      this.fallbackSynthesis = window.speechSynthesis;
      
      // Set up preferred voice for synthesis
      const voices = this.fallbackSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Samantha') || 
        voice.name.includes('Alex') || 
        voice.lang.includes('en-US')
      );
      
      this.preferredSynthesisVoice = preferredVoice;
      console.log('🔊 Fallback synthesis initialized with voice:', preferredVoice?.name || 'default');
    }
  }

  async preloadCriticalAudio() {
    const criticalClips = [
      'bootSuccess', 'commandExecuting', 'greeting', 
      'moduleError', 'systemHealthy'
    ];

    console.log('⏳ Preloading critical audio clips...');
    
    for (const clipKey of criticalClips) {
      await this.preloadClip(clipKey);
    }

    console.log('✅ Critical audio clips preloaded');
  }

  async preloadClip(clipKey, mood = 'neutral') {
    const voiceData = this.voiceMap.get(clipKey);
    if (!voiceData || !voiceData.clips) return false;

    const clipPath = voiceData.clips[mood] || voiceData.clips.neutral;
    if (!clipPath) return false;

    try {
      const cacheKey = `${clipKey}_${mood}`;
      if (this.audioCache.has(cacheKey)) return true;

      const audio = new Audio(clipPath);
      audio.preload = 'auto';
      
      return new Promise((resolve) => {
        audio.addEventListener('canplaythrough', () => {
          this.audioCache.set(cacheKey, audio);
          resolve(true);
        });
        
        audio.addEventListener('error', () => {
          console.warn(`⚠️ Failed to preload audio: ${clipPath}`);
          resolve(false);
        });
      });
    } catch (error) {
      console.warn(`⚠️ Error preloading ${clipKey}:`, error.message);
      return false;
    }
  }

  async speak(key, options = {}) {
    if (!this.isInitialized) {
      await this.init();
    }

    const {
      mood = this.currentMood,
      force = false,
      volume = this.config.baseVolume,
      onComplete = null,
      onError = null
    } = options;

    console.log(`🎙️ Rina speaking: ${key} (mood: ${mood})`);

    // Try to play audio clip first
    if (this.config.enableClips) {
      const success = await this.playVoiceClip(key, mood, volume, onComplete, onError);
      if (success) return true;
    }

    // Fallback to speech synthesis
    if (this.config.enableSynthesis && this.config.fallbackToSynthesis) {
      return await this.speakWithSynthesis(key, mood, onComplete, onError);
    }

    // If both fail, trigger glow effect as fallback
    this.triggerAudioFallbackGlow(key);
    return false;
  }

  async playVoiceClip(key, mood, volume, onComplete, onError) {
    const voiceData = this.voiceMap.get(key);
    if (!voiceData || !voiceData.clips) return false;

    const clipPath = voiceData.clips[mood] || voiceData.clips.neutral;
    if (!clipPath) return false;

    try {
      const cacheKey = `${key}_${mood}`;
      let audio = this.audioCache.get(cacheKey);

      if (!audio) {
        audio = new Audio(clipPath);
        this.audioCache.set(cacheKey, audio);
      }

      // Apply mood-based volume adjustment
      const adjustedVolume = volume * (this.config.moodVolumeAdjust[mood] || 1.0);
      audio.volume = Math.max(0.1, Math.min(1.0, adjustedVolume));

      // Set up event listeners
      audio.addEventListener('ended', () => {
        console.log(`✅ Audio clip completed: ${key}`);
        if (onComplete) onComplete();
      });

      audio.addEventListener('error', (error) => {
        console.warn(`⚠️ Audio playback failed for ${key}:`, error);
        if (onError) onError(error);
      });

      await audio.play();
      return true;

    } catch (error) {
      console.warn(`⚠️ Failed to play voice clip ${key}:`, error.message);
      return false;
    }
  }

  async speakWithSynthesis(key, mood, onComplete, onError) {
    const voiceData = this.voiceMap.get(key);
    if (!voiceData || !this.fallbackSynthesis) return false;

    try {
      const text = voiceData.fallback || `Speaking ${key}`;
      const utterance = new SpeechSynthesisUtterance(text);

      // Configure utterance based on mood
      const moodConfig = this.getSynthesisMoodConfig(mood);
      utterance.rate = moodConfig.rate;
      utterance.pitch = moodConfig.pitch;
      utterance.volume = moodConfig.volume;
      
      if (this.preferredSynthesisVoice) {
        utterance.voice = this.preferredSynthesisVoice;
      }

      // Set up event listeners
      utterance.onend = () => {
        console.log(`✅ Synthesis completed: ${key}`);
        if (onComplete) onComplete();
      };

      utterance.onerror = (error) => {
        console.warn(`⚠️ Synthesis failed for ${key}:`, error);
        if (onError) onError(error);
      };

      this.fallbackSynthesis.speak(utterance);
      return true;

    } catch (error) {
      console.warn(`⚠️ Speech synthesis failed for ${key}:`, error.message);
      return false;
    }
  }

  getSynthesisMoodConfig(mood) {
    const configs = {
      confident: { rate: 1.2, pitch: 1.1, volume: 0.9 },
      neutral: { rate: 1.0, pitch: 1.0, volume: 0.8 },
      uncertain: { rate: 0.9, pitch: 0.9, volume: 0.7 },
      frustrated: { rate: 0.8, pitch: 0.8, volume: 0.6 },
      confused: { rate: 0.85, pitch: 0.85, volume: 0.7 },
      excited: { rate: 1.3, pitch: 1.2, volume: 1.0 },
      calm: { rate: 0.9, pitch: 0.9, volume: 0.8 }
    };

    return configs[mood] || configs.neutral;
  }

  triggerAudioFallbackGlow(key) {
    console.log(`✨ Triggering audio fallback glow for: ${key}`);
    
    try {
      const glowEvent = new CustomEvent('voice-audio-fallback', {
        detail: { 
          key, 
          mood: this.currentMood,
          intensity: 0.2, 
          theme: 'neon',
          duration: 1500
        }
      });
      window.dispatchEvent(glowEvent);

      // Also try direct glow trigger if available
      if (typeof window !== 'undefined' && window.triggerGlow) {
        window.triggerGlow('audioFeedbackMissing', { 
          intensity: 0.2, 
          theme: 'neon' 
        });
      }
    } catch (error) {
      console.warn('Failed to trigger audio fallback glow:', error.message);
    }
  }

  // Mood-aware voice methods
  setMood(mood) {
    this.currentMood = mood;
    console.log(`🧠 Rina mood set to: ${mood}`);
    
    // Trigger mood change event
    const moodEvent = new CustomEvent('rina-mood-change', {
      detail: { mood, timestamp: Date.now() }
    });
    window.dispatchEvent(moodEvent);
  }

  switchVoiceMode(mode) {
    const validModes = ['clips', 'synthesis', 'hybrid'];
    if (!validModes.includes(mode)) {
      console.warn(`⚠️ Invalid voice mode: ${mode}`);
      return false;
    }

    this.voiceMode = mode;
    this.config.enableClips = mode === 'clips' || mode === 'hybrid';
    this.config.enableSynthesis = mode === 'synthesis' || mode === 'hybrid';
    
    console.log(`🎛️ Voice mode switched to: ${mode}`);
    return true;
  }

  // Integration methods for terminal events
  async onBootComplete() {
    await this.speak('bootSuccess', { mood: 'confident' });
  }

  async onCommandExecuting(command) {
    const mood = command.length > 20 ? 'focused' : 'efficient';
    await this.speak('commandExecuting', { mood });
  }

  async onCommandComplete(success = true) {
    const mood = success ? 'satisfied' : 'concerned';
    const key = success ? 'commandComplete' : 'commandError';
    await this.speak(key, { mood });
  }

  async onModuleError(moduleName) {
    await this.speak('moduleError', { 
      mood: 'technical',
      onComplete: () => {
        console.log(`📊 Module error reported for: ${moduleName}`);
      }
    });
  }

  async onUserFrustrated() {
    await this.speak('frustrated_help', { 
      mood: 'empathetic',
      volume: 0.7 
    });
  }

  async onUserUncertain() {
    await this.speak('uncertain_guidance', { 
      mood: 'reassuring' 
    });
  }

  async onGreeting(timeOfDay = 'general') {
    const moodMap = {
      morning: 'energetic',
      afternoon: 'professional', 
      evening: 'warm',
      general: 'friendly'
    };
    
    await this.speak('greeting', { 
      mood: moodMap[timeOfDay] || 'friendly' 
    });
  }

  // Asset management
  getAvailableClips() {
    const clips = {};
    for (const [key, data] of this.voiceMap) {
      clips[key] = Object.keys(data.clips || {});
    }
    return clips;
  }

  getCacheStatus() {
    return {
      cacheSize: this.audioCache.size,
      maxCacheSize: this.config.maxCacheSize,
      cachedKeys: Array.from(this.audioCache.keys())
    };
  }

  clearCache() {
    this.audioCache.clear();
    console.log('🗑️ Audio cache cleared');
  }

  // Status and diagnostics
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      voiceMode: this.voiceMode,
      currentMood: this.currentMood,
      audioContext: !!this.audioContext,
      synthesisAvailable: !!this.fallbackSynthesis,
      voiceMappingsCount: this.voiceMap.size,
      cacheStatus: this.getCacheStatus(),
      config: this.config
    };
  }

  // Cleanup
  destroy() {
    // Clear audio cache
    this.audioCache.clear();
    
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
    }

    // Cancel any ongoing synthesis
    if (this.fallbackSynthesis) {
      this.fallbackSynthesis.cancel();
    }

    console.log('🧹 Rina Voice System destroyed');
  }
}

export default RinaVoiceSystem;
