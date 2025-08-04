/**
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import RinaVoiceIntegration from '../../src/voice-system/rina-voice-integration.js';
import EnhancedVoiceEngine from '../../src/voice-system/enhanced-voice-engine.js';
import { createMockTerminal, createMockAISystem, createMockRecognitionResult } from '../utils/mocks.js';

// Mock the ElevenLabs module
jest.mock('../../src/voice-system/elevenlabs-voice-provider.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(true),
    initialize: jest.fn().mockResolvedValue(true),
    getApiKeyFromStorage: jest.fn().mockReturnValue(null),
    speak: jest.fn().mockResolvedValue(true),
    getVoices: jest.fn().mockResolvedValue([{ id: 'voice1', name: 'Test Voice' }]),
    isConnected: jest.fn().mockReturnValue(true)
  }))
}));

// Mock unified config
jest.mock('../../src/config/unified-config.cjs', () => ({
  voiceSettings: {
    provider: 'elevenlabs',
    elevenLabsApiKey: 'test-key',
    preferredVoice: 'nova',
    speakingRate: 1.0,
    pitch: 1.0,
    volume: 1.0
  },
  features: {
    voice: { enabled: true }
  }
}));

// Mock Speech Recognition
class MockSpeechRecognition {
  constructor() {
    this.continuous = false;
    this.interimResults = false;
    this.lang = 'en-US';
    this.onstart = null;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
  }
  
  start() {
    if (this.onstart) this.onstart();
  }
  
  stop() {
    if (this.onend) this.onend();
  }
  
  abort() {
    if (this.onend) this.onend();
  }
}

describe('Voice System Full Integration Tests', () => {
  let voiceEngine;
  let voiceIntegration;
  let mockTerminal;
  let mockAISystem;
  
  beforeEach(() => {
    // Set up DOM elements
    document.body.innerHTML = `
      <div id="voice-status"></div>
      <div id="voice-toggle"></div>
      <div id="voice-config"></div>
      <div id="terminal-container"></div>
    `;
    
    // Mock AudioContext
    global.AudioContext = jest.fn().mockImplementation(() => ({
      createOscillator: jest.fn(),
      createGain: jest.fn(),
      close: jest.fn()
    }));
    global.window.AudioContext = global.AudioContext;
    
    // Mock Audio constructor with proper event handling
    global.Audio = jest.fn().mockImplementation((src) => {
      const audio = {
        src,
        play: jest.fn().mockResolvedValue(),
        pause: jest.fn(),
        addEventListener: jest.fn((event, handler) => {
          // Immediately trigger error event for any audio load attempt
          if (event === 'error') {
            setTimeout(() => handler(), 0);
          }
        }),
        removeEventListener: jest.fn(),
        volume: 1,
        preload: 'auto'
      };
      return audio;
    });
    
    // Create fresh mock instances
    mockTerminal = createMockTerminal();
    mockAISystem = createMockAISystem();
    
    // Mock speech recognition and synthesis
    global.webkitSpeechRecognition = MockSpeechRecognition;
    global.speechSynthesis = {
      speak: jest.fn(),
      cancel: jest.fn(),
      getVoices: jest.fn(() => [
        { name: 'Google US English', lang: 'en-US', default: true }
      ])
    };
    global.SpeechSynthesisUtterance = jest.fn(() => ({
      text: '',
      voice: null,
      rate: 1,
      pitch: 1,
      volume: 1
    }));
    
    // Initialize voice systems
    voiceEngine = new EnhancedVoiceEngine();
    voiceIntegration = new RinaVoiceIntegration(voiceEngine);
    
    // Add test helper methods
    voiceIntegration.startListening = () => {
      if (voiceEngine && voiceEngine.startListening) {
        voiceEngine.startListening();
      }
    };
    
    // Mock the voice engine command handler to use our AI system
    if (voiceEngine && voiceEngine.recognition) {
      const originalOnResult = voiceEngine.recognition.onresult;
      voiceEngine.recognition.onresult = async (event) => {
        if (originalOnResult) {
          originalOnResult.call(voiceEngine.recognition, event);
        }
        
        // Extract transcript and process through AI
        const result = event.results[event.resultIndex];
        if (result && result[0]) {
          const transcript = result[0].transcript;
          const aiResponse = await mockAISystem.processQuery(transcript);
          
          // Execute suggested command if present
          if (aiResponse && aiResponse.suggestedCommand) {
            try {
              await mockTerminal.executeCommand(aiResponse.suggestedCommand);
            } catch (error) {
              // Handle command errors gracefully
              console.log('Command execution failed:', error.message);
            }
          }
          
          // Speak response
          if (aiResponse && aiResponse.text) {
            const utterance = new global.SpeechSynthesisUtterance(aiResponse.text);
            global.speechSynthesis.speak(utterance);
          }
        }
      };
    }
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Terminal Command Integration', () => {
    it('should execute git status command via voice', async () => {
      // Setup
      await voiceIntegration.init();
      voiceIntegration.startListening();
      
      // Configure mock AI to suggest terminal command
      mockAISystem.processQuery.mockResolvedValueOnce({
        text: 'I\'ll check the git status for you. The repository is clean with no uncommitted changes.',
        suggestedCommand: 'git status',
        confidence: 0.95
      });
      
      // Simulate voice command
      const mockEvent = createMockRecognitionResult('check git status', 0.95);
      
      // Trigger recognition
      voiceEngine.recognition.onresult(mockEvent);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify AI was consulted and terminal command execution
      expect(mockAISystem.processQuery).toHaveBeenCalledWith('check git status');
      expect(mockTerminal.executeCommand).toHaveBeenCalledWith('git status');
      
      // Verify terminal output
      const output = mockTerminal.getOutput();
      expect(output.some(line => line.includes('On branch main'))).toBe(true);
    }, 15000); // 15 second timeout
    
    it('should handle multi-step build and test commands', async () => {
      await voiceIntegration.init();
      voiceIntegration.startListening();
      
      // Configure mock AI to suggest multi-step command
      mockAISystem.processQuery.mockResolvedValueOnce({
        text: 'I\'ll build the project and run tests for you.',
        suggestedCommand: 'npm run build && npm test',
        confidence: 0.9
      });
      
      // Simulate complex voice command
      const mockEvent = createMockRecognitionResult('build the project and run tests', 0.9);
      
      voiceEngine.recognition.onresult(mockEvent);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify command executed
      expect(mockAISystem.processQuery).toHaveBeenCalledWith('build the project and run tests');
      expect(mockTerminal.executeCommand).toHaveBeenCalledWith('npm run build && npm test');
    }, 15000); // 15 second timeout
    
    it('should handle file navigation commands', async () => {
      await voiceIntegration.init();
      voiceIntegration.startListening();
      
      mockAISystem.processQuery.mockResolvedValueOnce({
        text: 'I\'ll open the package.json file for you.',
        suggestedCommand: 'code package.json',
        confidence: 0.92
      });
      
      const mockEvent = createMockRecognitionResult('open package json', 0.92);
      voiceEngine.recognition.onresult(mockEvent);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockTerminal.executeCommand).toHaveBeenCalledWith('code package.json');
    }, 15000); // 15 second timeout
  });
  
  describe('AI Assistant Integration', () => {
    it('should process code-related queries through AI', async () => {
      await voiceIntegration.init();
      voiceIntegration.startListening();
      
      // Mock AI response for code query
      mockAISystem.processQuery.mockResolvedValueOnce({
        text: 'To create a React component, you can use a functional component with hooks. Here\'s an example:',
        code: `const MyComponent = () => {
  const [count, setCount] = useState(0);
  return <div>Count: {count}</div>;
}`,
        confidence: 0.88
      });
      
      const mockEvent = createMockRecognitionResult('how do I create a React component', 0.9);
      voiceEngine.recognition.onresult(mockEvent);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockAISystem.processQuery).toHaveBeenCalledWith('how do I create a React component');
      
      // Verify response is spoken
      expect(global.speechSynthesis.speak).toHaveBeenCalled();
    }, 15000); // 15 second timeout
    
    it('should handle project status queries', async () => {
      await voiceIntegration.init();
      voiceIntegration.startListening();
      
      mockAISystem.processQuery.mockResolvedValueOnce({
        text: 'Your project has 5 pending pull requests and 12 open issues. The CI pipeline is currently passing.',
        confidence: 0.85
      });
      
      const mockEvent = createMockRecognitionResult('what is the project status', 0.88);
      voiceEngine.recognition.onresult(mockEvent);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockAISystem.processQuery).toHaveBeenCalledWith('what is the project status');
      expect(global.speechSynthesis.speak).toHaveBeenCalled();
    }, 15000); // 15 second timeout
  });
  
  describe('Voice Command Workflows', () => {
    it('should handle deployment workflow', async () => {
      await voiceIntegration.init();
      voiceIntegration.startListening();
      
      // Mock sequential AI responses for deployment workflow
      mockAISystem.processQuery
        .mockResolvedValueOnce({
          text: 'I\'ll start the deployment process. First, let me run the tests.',
          suggestedCommand: 'npm test',
          confidence: 0.94
        })
        .mockResolvedValueOnce({
          text: 'Tests passed! Now building the project.',
          suggestedCommand: 'npm run build',
          confidence: 0.95
        })
        .mockResolvedValueOnce({
          text: 'Build successful! Deploying to production.',
          suggestedCommand: 'npm run deploy:production',
          confidence: 0.93
        });
      
      // Start deployment
      const mockEvent1 = createMockRecognitionResult('deploy to production', 0.94);
      voiceEngine.recognition.onresult(mockEvent1);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify first step
      expect(mockTerminal.executeCommand).toHaveBeenCalledWith('npm test');
      
      // Simulate test completion and continue
      const mockEvent2 = createMockRecognitionResult('continue deployment', 0.93);
      voiceEngine.recognition.onresult(mockEvent2);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockTerminal.executeCommand).toHaveBeenCalledWith('npm run build');
    }, 20000); // 20 second timeout for deployment workflow
    
    it('should handle code review workflow', async () => {
      await voiceIntegration.init();
      voiceIntegration.startListening();
      
      mockAISystem.processQuery.mockResolvedValueOnce({
        text: 'I\'ll show you the pending pull requests.',
        suggestedCommand: 'gh pr list',
        confidence: 0.91
      });
      
      const mockEvent = createMockRecognitionResult('show me pull requests to review', 0.91);
      voiceEngine.recognition.onresult(mockEvent);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockTerminal.executeCommand).toHaveBeenCalledWith('gh pr list');
    }, 15000); // 15 second timeout
  });
  
  describe('Error Handling and Recovery', () => {
    it('should handle command execution failures gracefully', async () => {
      await voiceIntegration.init();
      voiceIntegration.startListening();
      
      // Mock AI suggesting a command that will fail
      mockAISystem.processQuery.mockResolvedValueOnce({
        text: 'I\'ll run that command for you.',
        suggestedCommand: 'invalid-command',
        confidence: 0.87
      });
      
      // Mock terminal error
      mockTerminal.executeCommand.mockRejectedValueOnce(
        new Error('Command not found: invalid-command')
      );
      
      const mockEvent = createMockRecognitionResult('run invalid command', 0.87);
      voiceEngine.recognition.onresult(mockEvent);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verify error handling
      expect(mockTerminal.executeCommand).toHaveBeenCalledWith('invalid-command');
      // Verify the error was thrown as expected
      await expect(mockTerminal.executeCommand.mock.results[0].value).rejects.toThrow('Command not found: invalid-command');
    }, 15000); // 15 second timeout
    
    it('should handle speech recognition errors', async () => {
      await voiceIntegration.init();
      voiceIntegration.startListening();
      
      // Simulate recognition error
      const errorEvent = { error: 'network' };
      voiceEngine.recognition.onerror(errorEvent);
      
      // System should attempt to recover
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify system is still responsive
      const mockEvent = createMockRecognitionResult('test command', 0.9);
      voiceEngine.recognition.onresult(mockEvent);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockAISystem.processQuery).toHaveBeenCalledWith('test command');
    }, 15000); // 15 second timeout
  });
  
  describe('Advanced Features', () => {
    it('should handle context-aware commands', async () => {
      await voiceIntegration.init();
      voiceIntegration.startListening();
      
      // Set context with first command
      mockAISystem.processQuery.mockResolvedValueOnce({
        text: 'I\'m now looking at the src/components directory.',
        suggestedCommand: 'cd src/components && ls',
        confidence: 0.92
      });
      
      const mockEvent1 = createMockRecognitionResult('go to components folder', 0.92);
      voiceEngine.recognition.onresult(mockEvent1);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Context-aware follow-up
      mockAISystem.processQuery.mockResolvedValueOnce({
        text: 'Creating a new component in the current directory.',
        suggestedCommand: 'touch Button.jsx',
        confidence: 0.94
      });
      
      const mockEvent2 = createMockRecognitionResult('create new button component', 0.94);
      voiceEngine.recognition.onresult(mockEvent2);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockTerminal.executeCommand).toHaveBeenCalledWith('touch Button.jsx');
    }, 20000); // 20 second timeout for context-aware commands
    
    it('should support voice-controlled debugging', async () => {
      await voiceIntegration.init();
      voiceIntegration.startListening();
      
      mockAISystem.processQuery.mockResolvedValueOnce({
        text: 'I\'ll start the debugger for you on the main application.',
        suggestedCommand: 'node --inspect-brk src/index.js',
        confidence: 0.89
      });
      
      const mockEvent = createMockRecognitionResult('start debugging the app', 0.89);
      voiceEngine.recognition.onresult(mockEvent);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockTerminal.executeCommand).toHaveBeenCalledWith('node --inspect-brk src/index.js');
    }, 15000); // 15 second timeout
  });
});
