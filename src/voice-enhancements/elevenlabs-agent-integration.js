/**
 * ElevenLabs Conversational AI Agent Integration
 * Enables natural voice conversations with the terminal
 */

class ElevenLabsAgentIntegration {
  constructor(config = {}) {
    this.config = {
      apiKey: config.apiKey || '',
      agentId: config.agentId || 'agent_01k0q6eesye0ht7q1yr03tv5a8',
      voiceId: config.voiceId || 'EXAVITQu4vr4xnSDxMaL',
      modelId: config.modelId || 'eleven_monolingual_v1',
      baseUrl: 'https://api.elevenlabs.io/v1',
      conversationalBaseUrl: 'https://api.elevenlabs.io/v1/convai',
      ...config,
    };

    this.isInitialized = false;
    this.conversationId = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.websocket = null;
    this.isConversationActive = false;
    this.onTranscript = null;
    this.onResponse = null;
    this.onError = null;
    this.onStatusChange = null;
  }

  async initialize() {
    try {
      console.log('🎤 Initializing ElevenLabs Agent Integration...');

      // Validate API key
      if (!this.config.apiKey) {
        throw new Error('ElevenLabs API key is required');
      }

      // Initialize audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Test API connection
      const testResponse = await fetch(`${this.config.baseUrl}/user`, {
        headers: {
          'xi-api-key': this.config.apiKey,
        },
      });

      if (!testResponse.ok) {
        throw new Error('Invalid ElevenLabs API key or connection failed');
      }

      this.isInitialized = true;
      console.log('✅ ElevenLabs Agent Integration initialized');

      if (this.onStatusChange) {
        this.onStatusChange('initialized', { agentId: this.config.agentId });
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize ElevenLabs agent:', error);
      if (this.onError) {
        this.onError(error);
      }
      return false;
    }
  }

  async startConversation() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log('🗣️ Starting ElevenLabs conversation...');

      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create WebSocket connection for real-time conversation
      const wsUrl = 'wss://api.elevenlabs.io/v1/convai/conversation';
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('✅ WebSocket connection established');

        // Send authentication and configuration
        this.websocket.send(
          JSON.stringify({
            type: 'auth',
            apiKey: this.config.apiKey,
            agentId: this.config.agentId,
            config: {
              voiceId: this.config.voiceId,
              modelId: this.config.modelId,
              voiceSettings: {
                stability: 0.5,
                similarityBoost: 0.5,
                style: 0.5,
                useSpeakerBoost: true,
              },
            },
          })
        );

        this.isConversationActive = true;
        if (this.onStatusChange) {
          this.onStatusChange('conversation-started');
        }

        // Start streaming audio
        this.startAudioStreaming();
      };

      this.websocket.onmessage = async event => {
        const data = JSON.parse(event.data);
        await this.handleWebSocketMessage(data);
      };

      this.websocket.onerror = error => {
        console.error('WebSocket error:', error);
        if (this.onError) {
          this.onError(error);
        }
      };

      this.websocket.onclose = () => {
        console.log('WebSocket connection closed');
        this.isConversationActive = false;
        if (this.onStatusChange) {
          this.onStatusChange('conversation-ended');
        }
      };
    } catch (error) {
      console.error('Failed to start conversation:', error);
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  async handleWebSocketMessage(data) {
    switch (data.type) {
      case 'conversation_started':
        this.conversationId = data.conversationId;
        console.log('🎯 Conversation started:', this.conversationId);
        break;

      case 'user_transcript':
        console.log('👤 User:', data.text);
        if (this.onTranscript) {
          this.onTranscript(data.text, 'user');
        }
        break;

      case 'agent_response':
        console.log('🤖 Agent:', data.text);
        if (this.onResponse) {
          this.onResponse(data.text, data);
        }
        break;

      case 'audio_response':
        // Handle audio response from agent
        await this.playAudioResponse(data.audio);
        break;

      case 'function_call':
        // Handle function calls from the agent
        await this.handleFunctionCall(data.function, data.parameters);
        break;

      case 'error':
        console.error('Conversation error:', data.message);
        if (this.onError) {
          this.onError(new Error(data.message));
        }
        break;
    }
  }

  startAudioStreaming() {
    if (!this.mediaStream || !this.websocket) return;

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(this.audioContext.destination);

    processor.onaudioprocess = e => {
      if (!this.isConversationActive) return;

      const inputData = e.inputBuffer.getChannelData(0);
      const audioData = this.convertFloat32ToInt16(inputData);

      if (this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(
          JSON.stringify({
            type: 'audio_input',
            audio: this.arrayBufferToBase64(audioData.buffer),
          })
        );
      }
    };
  }

  async playAudioResponse(audioBase64) {
    try {
      const audioData = this.base64ToArrayBuffer(audioBase64);
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);
    } catch (error) {
      console.error('Failed to play audio response:', error);
    }
  }

  async handleFunctionCall(functionName, parameters) {
    console.log('⚡ Function call:', functionName, parameters);

    // Handle terminal-specific functions
    switch (functionName) {
      case 'execute_command':
        if (window.terminalState && window.terminalState.shellHarness) {
          const result = await window.terminalState.shellHarness.execute(parameters.command);
          // Send result back to agent
          this.sendFunctionResult(functionName, result);
        }
        break;

      case 'list_files':
        if (window.terminalState && window.terminalState.shellHarness) {
          const result = await window.terminalState.shellHarness.execute('ls -la');
          this.sendFunctionResult(functionName, result);
        }
        break;

      case 'get_system_info':
        if (window.electronAPI) {
          const info = await window.electronAPI.getSystemInfo();
          this.sendFunctionResult(functionName, info);
        }
        break;

      default:
        console.warn('Unknown function call:', functionName);
    }
  }

  sendFunctionResult(functionName, result) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(
        JSON.stringify({
          type: 'function_result',
          function: functionName,
          result: result,
        })
      );
    }
  }

  async sendTextMessage(text) {
    if (!this.isConversationActive || !this.websocket) {
      throw new Error('No active conversation');
    }

    this.websocket.send(
      JSON.stringify({
        type: 'text_input',
        text: text,
      })
    );
  }

  async endConversation() {
    console.log('🔚 Ending conversation...');

    this.isConversationActive = false;

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.onStatusChange) {
      this.onStatusChange('conversation-ended');
    }
  }

  // Utility functions
  convertFloat32ToInt16(buffer) {
    const l = buffer.length;
    const buf = new Int16Array(l);
    while (l--) {
      buf[l] = Math.min(1, buffer[l]) * 0x7fff;
    }
    return buf;
  }

  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // High-level API for terminal integration
  async processVoiceCommand(transcript) {
    console.log('🎯 Processing voice command:', transcript);

    // Send to ElevenLabs agent for processing
    await this.sendTextMessage(transcript);

    // The agent will respond via WebSocket messages
    // Results will be handled in handleWebSocketMessage
  }

  // Configuration methods
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('📝 ElevenLabs config updated:', this.config);
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      conversationActive: this.isConversationActive,
      conversationId: this.conversationId,
      agentId: this.config.agentId,
      hasApiKey: !!this.config.apiKey,
    };
  }
}

// Export for use in terminal
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ElevenLabsAgentIntegration;
} else {
  window.ElevenLabsAgentIntegration = ElevenLabsAgentIntegration;
}
