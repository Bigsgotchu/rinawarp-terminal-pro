/**
 * RinaWarp Terminal - ElevenLabs Voice Provider
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 * 
 * This module provides ElevenLabs AI voice integration with:
 * - Text-to-speech conversion using ElevenLabs API
 * - Mood-aware voice modulation
 * - Audio playback through existing audioContext
 * - Error handling and fallback mechanisms
 * - Integration with existing Rina voice system
 */

import ElevenLabsAPI from '@elevenlabs/elevenlabs-js';
import logger from '../utils/logger.js';
import { triageError } from '../utils/error-triage-system.js';

export class ElevenLabsVoiceProvider {
  constructor(options = {}) {
    this.apiKey = null;
    this.client = null;
    this.isInitialized = false;
    this.audioContext = options.audioContext || null;
    this.fallbackEnabled = options.fallbackEnabled !== false;
    
    // Enhanced fallback configuration
    this.fallbackConfig = {
      enableRetry: true,
      maxRetries: 3,
      retryBaseDelay: 1000, // Base delay for exponential backoff
      retryMaxDelay: 10000, // Maximum retry delay
      fallbackToSynthesis: true,
      fallbackToRinaClips: true,
      enableConnectionHealth: true,
      healthCheckInterval: 30000, // 30 seconds
      cacheFailedRequests: true,
      ...options.fallbackConfig
    };
    
    // Voice configuration
    this.config = {
      voiceId: 'uSI3HxQeb8HZOrDcaj83', // Specified voice ID
      model: 'eleven_monolingual_v1',
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.0,
      useSpeakerBoost: true,
      optimizeStreamingLatency: 0, // Balance between latency and quality
      outputFormat: 'mp3_44100_128', // High quality audio
      ...options.voiceConfig
    };
    
    // Mood-based voice modulation
    this.moodSettings = {
      confident: { stability: 0.7, similarityBoost: 0.8, style: 0.2 },
      neutral: { stability: 0.5, similarityBoost: 0.75, style: 0.0 },
      uncertain: { stability: 0.3, similarityBoost: 0.6, style: 0.1 },
      frustrated: { stability: 0.4, similarityBoost: 0.65, style: 0.3 },
      confused: { stability: 0.35, similarityBoost: 0.6, style: 0.15 },
      excited: { stability: 0.6, similarityBoost: 0.85, style: 0.4 },
      focused: { stability: 0.65, similarityBoost: 0.8, style: 0.1 },
      curious: { stability: 0.55, similarityBoost: 0.7, style: 0.25 },
      overwhelmed: { stability: 0.3, similarityBoost: 0.55, style: 0.2 }
    };
    
    // Enhanced audio cache for performance
    this.audioCache = new Map();
    this.failedRequestsCache = new Map(); // Cache failed requests to avoid retrying
    this.maxCacheSize = options.maxCacheSize || 50;
    this.maxFailedCacheSize = 100;
    this.cacheExpirationTime = 1000 * 60 * 60; // 1 hour
    
    // Request queue for rate limiting
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.rateLimitDelay = 100; // ms between requests
    
    // Enhanced performance metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      fallbackHits: 0,
      averageLatency: 0,
      fallbackUsage: 0,
      retryAttempts: 0,
      apiHealth: 'unknown',
      lastHealthCheck: null,
      connectionErrors: 0,
      rateLimitErrors: 0,
      authErrors: 0
    };
    
    // API Health monitoring
    this.apiHealth = {
      isAvailable: null,
      lastCheck: null,
      consecutiveFailures: 0,
      maxConsecutiveFailures: 5,
      isQuotaExceeded: false,
      responseTimeAvg: 0
    };
    
    // Fallback systems registry
    this.fallbackSystems = {
      synthesis: null,
      rinaClips: null
    };
    
    // Current mood state
    this.currentMood = 'neutral';
    
    // Initialize health monitoring if enabled
    if (this.fallbackConfig.enableConnectionHealth) {
      this.startHealthMonitoring();
    }
    
    // Initialize fallback systems
    this.initializeFallbackSystems();
    
    logger.info('ElevenLabs Voice Provider initialized with enhanced fallback mechanisms');
    console.log('🎙️ ElevenLabs Voice Provider initialized');
  }

  /**
   * Initialize the ElevenLabs client with API key
   */
  async initialize(apiKey) {
    try {
      if (!apiKey) {
        // Try to get API key from environment or storage
        apiKey = this.getApiKeyFromStorage() || process.env.ELEVENLABS_API_KEY;
        
        if (!apiKey) {
          throw new Error('ElevenLabs API key not provided. Please set ELEVENLABS_API_KEY or call initialize(apiKey)');
        }
      }
      
      this.apiKey = apiKey;
      this.client = new ElevenLabsAPI({ apiKey });
      
      // Test the connection
      await this.testConnection();
      
      // Initialize audio context if not provided
      if (!this.audioContext) {
        await this.initializeAudioContext();
      }
      
      // Start request queue processor
      this.startQueueProcessor();
      
      this.isInitialized = true;
      console.log('✅ ElevenLabs Voice Provider initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize ElevenLabs Voice Provider:', error.message);
      return false;
    }
  }

  /**
   * Initialize audio context for playback
   */
  async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      console.log('🔊 Audio context initialized for ElevenLabs playback');
    } catch (error) {
      console.warn('⚠️ Failed to initialize audio context:', error.message);
    }
  }

  /**
   * Test connection to ElevenLabs API
   */
  async testConnection() {
    try {
      // Test with a minimal request
      const voices = await this.client.voices.getAll();
      
      if (!voices || voices.length === 0) {
        throw new Error('No voices available');
      }
      
      // Verify our specific voice exists
      const targetVoice = voices.find(voice => voice.voice_id === this.config.voiceId);
      if (!targetVoice) {
        console.warn(`⚠️ Target voice ${this.config.voiceId} not found, using first available voice`);
        this.config.voiceId = voices[0].voice_id;
      }
      
      console.log(`🎯 Connected to ElevenLabs API with voice: ${targetVoice?.name || voices[0].name}`);
      return true;
    } catch (error) {
      throw new Error(`ElevenLabs API connection failed: ${error.message}`);
    }
  }

  /**
   * Convert text to speech using ElevenLabs API
   */
  async textToSpeech(text, options = {}) {
    if (!this.isInitialized) {
      throw new Error('ElevenLabs provider not initialized');
    }

    const {
      mood = this.currentMood,
      priority = 'normal',
      useCache = true,
      onProgress = null
    } = options;

    // Generate cache key
    const cacheKey = this.generateCacheKey(text, mood);
    
    // Check cache first
    if (useCache && this.audioCache.has(cacheKey)) {
      this.metrics.cacheHits++;
      console.log('📦 Using cached audio for:', text.substring(0, 50) + '...');
      return this.audioCache.get(cacheKey);
    }

    // Add to request queue
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        text,
        mood,
        priority,
        cacheKey,
        resolve,
        reject,
        onProgress,
        timestamp: Date.now()
      });

      this.processQueue();
    });
  }

  /**
   * Process the request queue with rate limiting
   */
  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      // Sort by priority (high -> normal -> low)
      this.requestQueue.sort((a, b) => {
        const priorityOrder = { 'high': 3, 'normal': 2, 'low': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      const request = this.requestQueue.shift();
      
      try {
        const startTime = Date.now();
        const audioBuffer = await this.makeTextToSpeechRequest(request);
        
        // Update metrics
        const latency = Date.now() - startTime;
        this.updateMetrics(true, latency);
        
        // Cache the result
        this.cacheAudioBuffer(request.cacheKey, audioBuffer);
        
        request.resolve(audioBuffer);
        
      } catch (error) {
        this.updateMetrics(false);
        
        // Try fallback if enabled
        if (this.fallbackEnabled) {
          try {
            const fallbackAudio = await this.fallbackTextToSpeech(request.text, request.mood);
            request.resolve(fallbackAudio);
          } catch (fallbackError) {
            request.reject(new Error(`ElevenLabs and fallback failed: ${error.message}`));
          }
        } else {
          request.reject(error);
        }
      }

      // Rate limiting delay
      if (this.requestQueue.length > 0) {
        await this.delay(this.rateLimitDelay);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Make the actual text-to-speech request to ElevenLabs
   */
  async makeTextToSpeechRequest(request) {
    const { text, mood, onProgress } = request;
    
    // Get mood-specific voice settings
    const moodConfig = this.moodSettings[mood] || this.moodSettings.neutral;
    
    // Prepare request parameters
    const voiceSettings = {
      stability: moodConfig.stability,
      similarity_boost: moodConfig.similarityBoost,
      style: moodConfig.style,
      use_speaker_boost: this.config.useSpeakerBoost
    };

    console.log(`🎙️ Generating speech for: "${text.substring(0, 50)}..." (mood: ${mood})`);

    try {
      // Make the API request
      const audioStream = await this.client.textToSpeech.convert({
        voice_id: this.config.voiceId,
        model_id: this.config.model,
        text: text,
        voice_settings: voiceSettings,
        output_format: this.config.outputFormat,
        optimize_streaming_latency: this.config.optimizeStreamingLatency
      });

      // Convert stream to audio buffer
      const audioBuffer = await this.streamToAudioBuffer(audioStream);
      
      console.log('✅ ElevenLabs TTS generation complete');
      return audioBuffer;

    } catch (error) {
      console.error('❌ ElevenLabs TTS request failed:', error.message);
      throw error;
    }
  }

  /**
   * Convert audio stream to AudioBuffer
   */
  async streamToAudioBuffer(audioStream) {
    try {
      // Convert stream to array buffer
      const chunks = [];
      const reader = audioStream.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      // Combine chunks into single ArrayBuffer
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const combinedArray = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        combinedArray.set(chunk, offset);
        offset += chunk.length;
      }
      
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(combinedArray.buffer);
      return audioBuffer;
      
    } catch (error) {
      console.error('❌ Failed to convert stream to audio buffer:', error.message);
      throw error;
    }
  }

  /**
   * Play audio buffer through the audio context
   */
  async playAudio(audioBuffer, options = {}) {
    if (!this.audioContext || !audioBuffer) {
      throw new Error('Audio context or buffer not available');
    }

    try {
      const {
        volume = 0.8,
        playbackRate = 1.0,
        onEnded = null,
        onError = null
      } = options;

      // Create audio source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Create gain node for volume control
      const gainNode = this.audioContext.createGain();
      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      
      // Connect audio graph
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      // Set playback rate (for speed adjustment)
      source.playbackRate.setValueAtTime(playbackRate, this.audioContext.currentTime);
      
      // Set up event handlers
      source.onended = () => {
        console.log('✅ ElevenLabs audio playback completed');
        if (onEnded) onEnded();
      };
      
      // Start playback
      source.start(0);
      
      console.log('🔊 Playing ElevenLabs generated audio');
      return source;
      
    } catch (error) {
      console.error('❌ Audio playback failed:', error.message);
      if (options.onError) options.onError(error);
      throw error;
    }
  }

  /**
   * High-level speak method combining TTS and playback
   */
  async speak(text, options = {}) {
    try {
      const {
        mood = this.currentMood,
        volume = 0.8,
        playbackRate = 1.0,
        priority = 'normal',
        onStart = null,
        onEnd = null,
        onError = null
      } = options;

      console.log(`🎙️ ElevenLabs speaking: "${text}" (mood: ${mood})`);
      
      if (onStart) onStart();
      
      // Generate speech
      const audioBuffer = await this.textToSpeech(text, { mood, priority });
      
      // Play audio
      const audioSource = await this.playAudio(audioBuffer, {
        volume,
        playbackRate,
        onEnded: onEnd,
        onError
      });
      
      return audioSource;
      
    } catch (error) {
      console.error('❌ ElevenLabs speak failed:', error.message);
      
      // Try fallback if enabled
      if (this.fallbackEnabled && options.onError) {
        options.onError(error);
      } else {
        throw error;
      }
    }
  }

  /**
   * Fallback text-to-speech using browser's speech synthesis
   */
  async fallbackTextToSpeech(text, mood = 'neutral') {
    this.metrics.fallbackUsage++;
    console.log('🔄 Using fallback speech synthesis');

    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('Speech synthesis not available'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply mood-based settings
      const moodConfig = this.getSynthesisMoodConfig(mood);
      utterance.rate = moodConfig.rate;
      utterance.pitch = moodConfig.pitch;
      utterance.volume = moodConfig.volume;
      
      utterance.onend = () => resolve(null); // Return null for fallback
      utterance.onerror = (error) => reject(error);
      
      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Get mood configuration for fallback synthesis
   */
  getSynthesisMoodConfig(mood) {
    const configs = {
      confident: { rate: 1.1, pitch: 1.05, volume: 0.9 },
      neutral: { rate: 1.0, pitch: 1.0, volume: 0.8 },
      uncertain: { rate: 0.9, pitch: 0.95, volume: 0.7 },
      frustrated: { rate: 0.85, pitch: 0.9, volume: 0.75 },
      confused: { rate: 0.9, pitch: 0.95, volume: 0.7 },
      excited: { rate: 1.2, pitch: 1.1, volume: 1.0 },
      focused: { rate: 1.05, pitch: 1.0, volume: 0.85 },
      curious: { rate: 1.0, pitch: 1.02, volume: 0.8 },
      overwhelmed: { rate: 0.8, pitch: 0.9, volume: 0.6 }
    };
    
    return configs[mood] || configs.neutral;
  }

  /**
   * Set current mood for voice modulation
   */
  setMood(mood) {
    if (this.moodSettings[mood]) {
      this.currentMood = mood;
      console.log(`🧠 ElevenLabs voice mood set to: ${mood}`);
      
      // Dispatch mood change event
      const event = new CustomEvent('elevenlabs-mood-change', {
        detail: { mood, timestamp: Date.now() }
      });
      window.dispatchEvent(event);
    } else {
      console.warn(`⚠️ Unknown mood: ${mood}, keeping current mood: ${this.currentMood}`);
    }
  }

  /**
   * Update mood settings dynamically
   */
  updateMoodSettings(mood, settings) {
    if (this.moodSettings[mood]) {
      this.moodSettings[mood] = { ...this.moodSettings[mood], ...settings };
      console.log(`🔧 Updated mood settings for ${mood}:`, settings);
    }
  }

  /**
   * Cache management
   */
  generateCacheKey(text, mood) {
    return `${mood}_${this.hashString(text)}`;
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  cacheAudioBuffer(key, audioBuffer) {
    // Implement LRU cache
    if (this.audioCache.size >= this.maxCacheSize) {
      const firstKey = this.audioCache.keys().next().value;
      this.audioCache.delete(firstKey);
    }
    
    this.audioCache.set(key, audioBuffer);
  }

  clearCache() {
    this.audioCache.clear();
    console.log('🗑️ ElevenLabs audio cache cleared');
  }

  /**
   * Utility methods
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  startQueueProcessor() {
    // Process queue periodically
    setInterval(() => {
      this.processQueue();
    }, this.rateLimitDelay);
  }

  updateMetrics(success, latency = 0) {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
      
      // Update average latency
      const totalLatency = this.metrics.averageLatency * (this.metrics.successfulRequests - 1);
      this.metrics.averageLatency = (totalLatency + latency) / this.metrics.successfulRequests;
    } else {
      this.metrics.failedRequests++;
    }
  }

  getApiKeyFromStorage() {
    try {
      return localStorage.getItem('elevenlabs_api_key') || null;
    } catch {
      return null;
    }
  }

  /**
   * Integration with existing mood system
   */
  integrateWithMoodSystem(moodDetectionEngine) {
    if (!moodDetectionEngine) return;

    // Listen for mood changes
    moodDetectionEngine.on('moodChange', (mood) => {
      this.setMood(mood);
    });

    console.log('🔗 Integrated with mood detection engine');
  }

  /**
   * Integration with existing voice system
   */
  integrateWithVoiceSystem(voiceEngine) {
    if (!voiceEngine) return;

    // Override speak method to use ElevenLabs when available
    const originalSpeak = voiceEngine.speak.bind(voiceEngine);
    
    voiceEngine.speak = async (text, options = {}) => {
      try {
        if (this.isInitialized && options.useElevenLabs !== false) {
          return await this.speak(text, options);
        } else {
          return await originalSpeak(text, options);
        }
      } catch (error) {
        console.warn('Falling back to original voice system:', error.message);
        return await originalSpeak(text, options);
      }
    };

    console.log('🔗 Integrated with existing voice engine');
  }

  /**
   * Initialize fallback systems
   */
  initializeFallbackSystems() {
    // Initialize browser speech synthesis fallback
    if (this.fallbackConfig.fallbackToSynthesis && 'speechSynthesis' in window) {
      this.fallbackSystems.synthesis = {
        available: true,
        voices: this.getAvailableSynthesisVoices(),
        preferredVoice: null
      };
      
      // Find best voice for Rina
      const voices = this.fallbackSystems.synthesis.voices;
      this.fallbackSystems.synthesis.preferredVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') ||
        voice.name.toLowerCase().includes('woman') ||
        voice.name.toLowerCase().includes('samantha') ||
        voice.gender === 'female'
      ) || voices[0];
      
      logger.info('Browser speech synthesis fallback initialized', {
        voicesAvailable: voices.length,
        preferredVoice: this.fallbackSystems.synthesis.preferredVoice?.name
      });
    }
    
    // Initialize Rina clips fallback (will be connected later)
    if (this.fallbackConfig.fallbackToRinaClips) {
      this.fallbackSystems.rinaClips = {
        available: false,
        system: null
      };
      logger.info('Rina clips fallback prepared for connection');
    }
  }
  
  /**
   * Get available synthesis voices
   */
  getAvailableSynthesisVoices() {
    try {
      return window.speechSynthesis?.getVoices() || [];
    } catch (error) {
      logger.warn('Failed to get synthesis voices', { error: error.message });
      return [];
    }
  }
  
  /**
   * Connect Rina clips fallback system
   */
  connectRinaClips(rinaVoiceSystem) {
    if (this.fallbackConfig.fallbackToRinaClips && rinaVoiceSystem) {
      this.fallbackSystems.rinaClips = {
        available: true,
        system: rinaVoiceSystem
      };
      logger.info('Rina clips fallback system connected');
    }
  }
  
  /**
   * Start API health monitoring
   */
  startHealthMonitoring() {
    // Perform initial health check
    setTimeout(() => this.performHealthCheck(), 1000);
    
    // Set up periodic health checks
    setInterval(() => {
      this.performHealthCheck();
    }, this.fallbackConfig.healthCheckInterval);
    
    logger.info('API health monitoring started', {
      interval: this.fallbackConfig.healthCheckInterval
    });
  }
  
  /**
   * Perform API health check
   */
  async performHealthCheck() {
    if (!this.isInitialized) return;
    
    const startTime = Date.now();
    try {
      // Simple ping to check API availability
      await this.client.voices.getAll();
      
      const responseTime = Date.now() - startTime;
      this.apiHealth = {
        isAvailable: true,
        lastCheck: Date.now(),
        consecutiveFailures: 0,
        isQuotaExceeded: false,
        responseTimeAvg: this.calculateAverageResponseTime(responseTime)
      };
      
      this.metrics.apiHealth = 'healthy';
      this.metrics.lastHealthCheck = Date.now();
      
      logger.debug('API health check passed', {
        responseTime,
        averageResponseTime: this.apiHealth.responseTimeAvg
      });
      
    } catch (error) {
      this.apiHealth.consecutiveFailures++;
      this.apiHealth.lastCheck = Date.now();
      
      if (this.apiHealth.consecutiveFailures >= this.apiHealth.maxConsecutiveFailures) {
        this.apiHealth.isAvailable = false;
        this.metrics.apiHealth = 'degraded';
      }
      
      // Check for specific error types
      if (error.message.includes('quota') || error.message.includes('limit')) {
        this.apiHealth.isQuotaExceeded = true;
        this.metrics.rateLimitErrors++;
      } else if (error.message.includes('auth') || error.message.includes('401')) {
        this.metrics.authErrors++;
      } else {
        this.metrics.connectionErrors++;
      }
      
      logger.warn('API health check failed', {
        error: error.message,
        consecutiveFailures: this.apiHealth.consecutiveFailures,
        errorType: this.categorizeError(error)
      });
      
      // Triage the health check error
      await triageError(error, {
        subsystem: 'elevenlabs-api',
        component: 'health-monitor',
        operation: 'health-check',
        consecutiveFailures: this.apiHealth.consecutiveFailures
      });
    }
  }
  
  /**
   * Calculate average response time
   */
  calculateAverageResponseTime(newTime) {
    if (this.apiHealth.responseTimeAvg === 0) {
      return newTime;
    }
    return (this.apiHealth.responseTimeAvg * 0.7) + (newTime * 0.3);
  }
  
  /**
   * Categorize error for appropriate handling
   */
  categorizeError(error) {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('quota') || message.includes('limit') || message.includes('429')) {
      return 'rate_limit';
    }
    if (message.includes('auth') || message.includes('401') || message.includes('403')) {
      return 'authentication';
    }
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('voice') || message.includes('404')) {
      return 'resource';
    }
    return 'unknown';
  }
  
  /**
   * Enhanced text-to-speech with retry logic and fallbacks
   */
  async textToSpeechWithRetry(text, options = {}) {
    const {
      mood = this.currentMood,
      priority = 'normal',
      useCache = true,
      maxRetries = this.fallbackConfig.maxRetries,
      retryCount = 0
    } = options;
    
    const cacheKey = this.generateCacheKey(text, mood);
    
    // Check failed requests cache first
    if (this.fallbackConfig.cacheFailedRequests && this.failedRequestsCache.has(cacheKey)) {
      const cached = this.failedRequestsCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpirationTime) {
        logger.debug('Request cached as failed, using fallback immediately', { cacheKey });
        return await this.executeSmartFallback(text, mood, cached.lastError);
      } else {
        this.failedRequestsCache.delete(cacheKey);
      }
    }
    
    // Check successful cache
    if (useCache && this.audioCache.has(cacheKey)) {
      this.metrics.cacheHits++;
      logger.debug('Using cached audio', { textPreview: text.substring(0, 50) });
      return this.audioCache.get(cacheKey);
    }
    
    // Check API health before attempting
    if (!this.apiHealth.isAvailable) {
      logger.info('API marked as unhealthy, using fallback immediately');
      return await this.executeSmartFallback(text, mood, new Error('API unavailable'));
    }
    
    try {
      const startTime = Date.now();
      
      // Make the request
      const audioBuffer = await this.makeTextToSpeechRequest({
        text,
        mood,
        cacheKey
      });
      
      const latency = Date.now() - startTime;
      this.updateMetrics(true, latency);
      
      // Cache successful result
      this.cacheAudioBuffer(cacheKey, audioBuffer);
      
      // Reset health status on success
      if (this.apiHealth.consecutiveFailures > 0) {
        this.apiHealth.consecutiveFailures = 0;
        this.apiHealth.isAvailable = true;
        logger.info('API health recovered after successful request');
      }
      
      return audioBuffer;
      
    } catch (error) {
      this.updateMetrics(false);
      this.metrics.retryAttempts++;
      
      const errorType = this.categorizeError(error);
      logger.warn('ElevenLabs TTS request failed', {
        error: error.message,
        errorType,
        retryCount,
        maxRetries
      });
      
      // Cache failed request if configured
      if (this.fallbackConfig.cacheFailedRequests) {
        this.cacheFailedRequest(cacheKey, error);
      }
      
      // Try retry with exponential backoff
      if (this.fallbackConfig.enableRetry && retryCount < maxRetries && this.shouldRetryError(errorType)) {
        const delay = this.calculateRetryDelay(retryCount);
        logger.info('Retrying ElevenLabs request', { delay, attempt: retryCount + 1 });
        
        await this.delay(delay);
        
        return await this.textToSpeechWithRetry(text, {
          ...options,
          retryCount: retryCount + 1
        });
      }
      
      // All retries failed, use smart fallback
      logger.info('Max retries reached, using fallback strategy');
      return await this.executeSmartFallback(text, mood, error);
    }
  }
  
  /**
   * Determine if error type should be retried
   */
  shouldRetryError(errorType) {
    const retryableErrors = ['network', 'timeout', 'unknown'];
    const nonRetryableErrors = ['authentication', 'resource'];
    
    if (nonRetryableErrors.includes(errorType)) {
      return false;
    }
    
    // Rate limit errors should be retried with longer delays
    if (errorType === 'rate_limit') {
      return true;
    }
    
    return retryableErrors.includes(errorType);
  }
  
  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(retryCount) {
    const baseDelay = this.fallbackConfig.retryBaseDelay;
    const maxDelay = this.fallbackConfig.retryMaxDelay;
    
    // Exponential backoff: 1s, 2s, 4s, 8s...
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);
    
    // Add jitter to avoid thundering herd
    const jitter = Math.random() * 0.3 * exponentialDelay;
    
    return Math.min(exponentialDelay + jitter, maxDelay);
  }
  
  /**
   * Cache failed request to avoid immediate retries
   */
  cacheFailedRequest(cacheKey, error) {
    if (this.failedRequestsCache.size >= this.maxFailedCacheSize) {
      const firstKey = this.failedRequestsCache.keys().next().value;
      this.failedRequestsCache.delete(firstKey);
    }
    
    this.failedRequestsCache.set(cacheKey, {
      timestamp: Date.now(),
      lastError: error,
      errorType: this.categorizeError(error)
    });
  }
  
  /**
   * Execute smart fallback strategy
   */
  async executeSmartFallback(text, mood, originalError) {
    this.metrics.fallbackHits++;
    
    logger.info('Executing smart fallback strategy', {
      originalError: originalError.message,
      rinaClipsAvailable: this.fallbackSystems.rinaClips.available,
      synthesisAvailable: this.fallbackSystems.synthesis.available
    });
    
    // Try Rina clips first if available (more natural for character responses)
    if (this.fallbackSystems.rinaClips.available) {
      try {
        const result = await this.tryRinaClipsFallback(text, mood);
        if (result) {
          logger.info('Successfully used Rina clips fallback');
          return result;
        }
      } catch (error) {
        logger.warn('Rina clips fallback failed', { error: error.message });
      }
    }
    
    // Try browser synthesis fallback
    if (this.fallbackSystems.synthesis.available) {
      try {
        const result = await this.tryBrowserSynthesisFallback(text, mood);
        logger.info('Successfully used browser synthesis fallback');
        return result;
      } catch (error) {
        logger.warn('Browser synthesis fallback failed', { error: error.message });
      }
    }
    
    // All fallbacks failed
    const fallbackError = new Error(
      `All fallback mechanisms failed. Original error: ${originalError.message}`
    );
    
    await triageError(fallbackError, {
      subsystem: 'elevenlabs-api',
      component: 'fallback-system',
      operation: 'smart-fallback',
      originalError: originalError.message
    });
    
    throw fallbackError;
  }
  
  /**
   * Try Rina clips fallback
   */
  async tryRinaClipsFallback(text, mood) {
    const rinaSystem = this.fallbackSystems.rinaClips.system;
    if (!rinaSystem) return null;
    
    // Try to map text to appropriate Rina clip
    const clipKey = this.mapTextToRinaClip(text, mood);
    if (clipKey) {
      try {
        await rinaSystem.speak(clipKey, { mood });
        return 'rina-clip'; // Special return value indicating clip was used
      } catch (error) {
        logger.debug('Specific Rina clip not found', { clipKey });
      }
    }
    
    // Fallback to generic clips based on mood
    const genericClip = this.getGenericRinaClip(mood);
    if (genericClip) {
      try {
        await rinaSystem.speak(genericClip, { mood });
        return 'rina-clip-generic';
      } catch (error) {
        logger.debug('Generic Rina clip failed', { genericClip });
      }
    }
    
    return null;
  }
  
  /**
   * Map text content to appropriate Rina clips
   */
  mapTextToRinaClip(text, mood) {
    const lowerText = text.toLowerCase();
    
    // Common responses that have dedicated clips
    if (lowerText.includes('hello') || lowerText.includes('hi ')) {
      return 'greeting';
    }
    if (lowerText.includes('error') || lowerText.includes('failed')) {
      return 'error';
    }
    if (lowerText.includes('complete') || lowerText.includes('done')) {
      return 'success';
    }
    if (lowerText.includes('loading') || lowerText.includes('processing')) {
      return 'processing';
    }
    if (lowerText.includes('help') || lowerText.includes('assist')) {
      return 'helpful';
    }
    
    return null;
  }
  
  /**
   * Get generic Rina clip based on mood
   */
  getGenericRinaClip(mood) {
    const moodToClip = {
      confident: 'affirmative',
      frustrated: 'understanding',
      uncertain: 'thinking',
      excited: 'positive',
      focused: 'acknowledgment'
    };
    
    return moodToClip[mood] || 'acknowledgment';
  }
  
  /**
   * Try browser synthesis fallback with enhanced voice selection
   */
  async tryBrowserSynthesisFallback(text, mood) {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('Speech synthesis not available'));
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Use preferred voice if available
      if (this.fallbackSystems.synthesis.preferredVoice) {
        utterance.voice = this.fallbackSystems.synthesis.preferredVoice;
      }
      
      // Apply enhanced mood-based settings
      const moodConfig = this.getEnhancedSynthesisMoodConfig(mood);
      utterance.rate = moodConfig.rate;
      utterance.pitch = moodConfig.pitch;
      utterance.volume = moodConfig.volume;
      
      // Set up event handlers with timeout
      const timeoutId = setTimeout(() => {
        window.speechSynthesis.cancel();
        reject(new Error('Speech synthesis timeout'));
      }, 30000); // 30 second timeout
      
      utterance.onend = () => {
        clearTimeout(timeoutId);
        resolve(null); // Return null for synthesis fallback
      };
      
      utterance.onerror = (event) => {
        clearTimeout(timeoutId);
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };
      
      logger.debug('Starting browser synthesis fallback', {
        text: text.substring(0, 50),
        voice: utterance.voice?.name,
        mood,
        moodConfig
      });
      
      window.speechSynthesis.speak(utterance);
    });
  }
  
  /**
   * Get enhanced mood configuration for synthesis fallback
   */
  getEnhancedSynthesisMoodConfig(mood) {
    const configs = {
      confident: { rate: 1.1, pitch: 1.05, volume: 0.9 },
      neutral: { rate: 1.0, pitch: 1.0, volume: 0.8 },
      uncertain: { rate: 0.9, pitch: 0.95, volume: 0.7 },
      frustrated: { rate: 0.85, pitch: 0.9, volume: 0.75 },
      confused: { rate: 0.9, pitch: 0.95, volume: 0.7 },
      excited: { rate: 1.2, pitch: 1.1, volume: 1.0 },
      focused: { rate: 1.05, pitch: 1.0, volume: 0.85 },
      curious: { rate: 1.0, pitch: 1.02, volume: 0.8 },
      overwhelmed: { rate: 0.8, pitch: 0.9, volume: 0.6 },
      helpful: { rate: 1.0, pitch: 1.0, volume: 0.85 },
      professional: { rate: 1.05, pitch: 0.98, volume: 0.9 }
    };
    
    return configs[mood] || configs.neutral;
  }
  
  /**
   * Enhanced speak method with comprehensive fallback
   */
  async speakWithFallback(text, options = {}) {
    const startTime = Date.now();
    
    try {
      const {
        mood = this.currentMood,
        volume = 0.8,
        playbackRate = 1.0,
        priority = 'normal',
        onStart = null,
        onEnd = null,
        onError = null,
        onFallback = null
      } = options;
      
      logger.info('Speaking with fallback protection', {
        text: text.substring(0, 50),
        mood,
        priority
      });
      
      if (onStart) onStart();
      
      // Use enhanced TTS with retry
      const audioBuffer = await this.textToSpeechWithRetry(text, { mood, priority });
      
      // Handle different return types
      if (typeof audioBuffer === 'string') {
        // Rina clip or synthesis fallback was used
        if (onFallback) onFallback(audioBuffer);
        if (onEnd) onEnd();
        return audioBuffer;
      }
      
      if (audioBuffer === null) {
        // Browser synthesis was used
        if (onFallback) onFallback('browser-synthesis');
        if (onEnd) onEnd();
        return null;
      }
      
      // ElevenLabs audio buffer - play it
      const audioSource = await this.playAudio(audioBuffer, {
        volume,
        playbackRate,
        onEnded: onEnd,
        onError
      });
      
      const duration = Date.now() - startTime;
      logger.debug('Speak completed successfully', {
        duration,
        fallbackUsed: false
      });
      
      return audioSource;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Speak with fallback failed completely', {
        error: error.message,
        duration
      });
      
      if (options.onError) {
        options.onError(error);
      }
      
      // Final triage for complete failure
      await triageError(error, {
        subsystem: 'elevenlabs-api',
        component: 'speak-with-fallback',
        operation: 'complete-speak-operation',
        text: text.substring(0, 100)
      });
      
      throw error;
    }
  }
  
  /**
   * Get current status and metrics
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      currentMood: this.currentMood,
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessingQueue,
      cacheSize: this.audioCache.size,
      failedCacheSize: this.failedRequestsCache.size,
      maxCacheSize: this.maxCacheSize,
      apiHealth: { ...this.apiHealth },
      fallbackSystems: {
        synthesis: this.fallbackSystems.synthesis?.available || false,
        rinaClips: this.fallbackSystems.rinaClips?.available || false
      },
      metrics: { ...this.metrics },
      config: {
        voiceId: this.config.voiceId,
        model: this.config.model,
        fallbackEnabled: this.fallbackEnabled,
        fallbackConfig: { ...this.fallbackConfig }
      }
    };
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    // Clear cache
    this.clearCache();
    
    // Clear request queue
    this.requestQueue = [];
    
    // Close audio context if we created it
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    // Reset state
    this.isInitialized = false;
    this.client = null;
    
    console.log('🧹 ElevenLabs Voice Provider destroyed');
  }
}

export default ElevenLabsVoiceProvider;
