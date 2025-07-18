const { SpeechRecognitionEngine } = require('../src/renderer/speech-recognition.js');

// Mock dependencies
const mockTerminal = {
  terminal: {
    write: jest.fn(),
  },
  element: {
    textContent: 'Terminal output here',
  },
};

const mockAiAssistant = {
  getCommandSuggestion: jest.fn(async transcript => {
    if (transcript.includes('list files')) return 'ls -la';
    if (transcript.includes('git status')) return 'git status';
    return 'echo Hello World';
  }),
};

const mockVoiceEngine = {
  speak: jest.fn(),
  mute: jest.fn(),
  unmute: jest.fn(),
};

// Initialize speech recognition engine
const engine = new SpeechRecognitionEngine(mockTerminal, mockAiAssistant, mockVoiceEngine);

// Mock methods
engine.speakResponse = jest.fn();
engine.executeTerminalCommand = jest.fn();
engine.createSpeechUI = jest.fn(); // Avoid adding UI elements during tests

// Test configurations
engine.updateSettings({
  enabled: true,
  aiAssistance: true,
  confirmCommands: false, // Auto-confirm for testing
  continuous: false,
});

// Test handler simulate
function simulateRecognitionResult(transcript, confidence = 1) {
  return {
    resultIndex: 0,
    results: [
      [
        {
          transcript,
          confidence,
        },
      ],
    ],
  };
}

// Tests
(async () => {
  console.log('Testing Speech Recognition Engine...');

  // Start listening
  engine.startListening();
  console.log('Started listening');

  // Simulate speech recognition
  const result = simulateRecognitionResult('list files');
  engine.processRecognitionResults(result);

  // Check if the command was executed
  if (engine.executeTerminalCommand.mock.calls.length > 0) {
    console.log('Test PASSED: Command executed:', engine.executeTerminalCommand.mock.calls[0][0]);
  } else {
    console.error('Test FAILED: No command was executed');
  }

  // Check if AI assistant was used
  if (mockAiAssistant.getCommandSuggestion.mock.calls.length > 0) {
    console.log('AI Assistant was used for command interpretation');
  } else {
    console.error('AI Assistant was NOT used');
  }

  // Check if voice response was given
  if (mockVoiceEngine.speak.mock.calls.length > 0) {
    console.log('Voice Engine was used for response');
  } else {
    console.error('Voice Engine was NOT used for response');
  }
})();
