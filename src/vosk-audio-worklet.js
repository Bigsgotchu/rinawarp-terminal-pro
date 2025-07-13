/**
 * Modern AudioWorklet Processor for Vosk Speech Recognition
 * Replaces the deprecated ScriptProcessorNode for future-proof audio processing
 */

/* global AudioWorkletProcessor, registerProcessor */

class VoskAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isListening = false;
    this.audioLevel = 0;
    this.voiceThreshold = 0.01;

    // Listen for messages from the main thread
    this.port.onmessage = event => {
      const { type, data } = event.data;

      switch (type) {
      case 'start':
        this.isListening = true;
        break;
      case 'stop':
        this.isListening = false;
        break;
      case 'setThreshold':
        this.voiceThreshold = data.threshold;
        break;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];

    if (!this.isListening || !input || input.length === 0) {
      return true;
    }

    const audioData = input[0]; // First channel

    if (audioData && audioData.length > 0) {
      // Calculate audio level for voice activity detection
      this.audioLevel = this.calculateAudioLevel(audioData);

      // Send audio data and level to main thread
      this.port.postMessage({
        type: 'audioData',
        data: {
          audioData: Array.from(audioData), // Convert Float32Array to regular array
          audioLevel: this.audioLevel,
          hasVoice: this.audioLevel > this.voiceThreshold,
        },
      });
    }

    return true; // Keep the processor alive
  }

  calculateAudioLevel(audioData) {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }
}

registerProcessor('vosk-audio-processor', VoskAudioProcessor);
