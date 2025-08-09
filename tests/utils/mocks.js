// Mock implementations for integration tests

export const createMockTerminal = () => {
  const executedCommands = [];
  const outputBuffer = [];

  return {
    executeCommand: jest.fn(command => {
      executedCommands.push(command);

      // Simulate command execution with different responses
      if (command.includes('git status')) {
        const output =
          "On branch main\nYour branch is up to date with 'origin/main'.\n\nnothing to commit, working tree clean";
        outputBuffer.push(output);
        return Promise.resolve({ stdout: output, stderr: '', exitCode: 0 });
      }

      if (command.includes('npm test')) {
        const output = 'Test Suites: 5 passed, 5 total\nTests: 23 passed, 23 total';
        outputBuffer.push(output);
        return Promise.resolve({ stdout: output, stderr: '', exitCode: 0 });
      }

      // Default response
      const output = `Executed: ${command}`;
      outputBuffer.push(output);
      return Promise.resolve({ stdout: output, stderr: '', exitCode: 0 });
    }),

    getHistory: jest.fn(() => executedCommands),
    getOutput: jest.fn(() => outputBuffer),
    clear: jest.fn(() => {
      outputBuffer.length = 0;
    }),

    // Additional terminal methods
    write: jest.fn(text => {
      outputBuffer.push(text);
    }),

    setPrompt: jest.fn(),
    focus: jest.fn(),

    // State tracking
    executedCommands,
    outputBuffer,
  };
};

export const createMockAISystem = () => {
  const conversationHistory = [];
  const processingQueue = [];

  return {
    processQuery: jest.fn(async query => {
      conversationHistory.push({ role: 'user', content: query });

      // Simulate AI responses based on query content
      let response;

      if (query.toLowerCase().includes('git status')) {
        response = {
          text: "I'll check the git status for you. The repository is clean with no uncommitted changes.",
          suggestedCommand: 'git status',
          confidence: 0.95,
        };
      } else if (query.toLowerCase().includes('run tests')) {
        response = {
          text: "I'll run the tests for you. All tests are passing successfully.",
          suggestedCommand: 'npm test',
          confidence: 0.98,
        };
      } else if (query.toLowerCase().includes('deploy')) {
        response = {
          text: "I can help you deploy. First, let's ensure all tests pass and the build is successful.",
          suggestedCommand: 'npm run build && npm run deploy',
          confidence: 0.85,
        };
      } else if (query.toLowerCase().includes('remind')) {
        response = {
          text: "I've set a reminder for you. The reminder will appear in 30 minutes.",
          action: 'set_reminder',
          confidence: 0.9,
        };
      } else {
        response = {
          text: `I understand you want to: ${query}. Let me help you with that.`,
          confidence: 0.75,
        };
      }

      conversationHistory.push({ role: 'assistant', content: response.text });
      processingQueue.push({ query, response, timestamp: Date.now() });

      return response;
    }),

    getConversationHistory: jest.fn(() => conversationHistory),
    clearHistory: jest.fn(() => {
      conversationHistory.length = 0;
    }),

    // Additional AI methods
    analyzeCode: jest.fn(async code => {
      return {
        suggestions: ['Consider adding error handling', 'This function could be more modular'],
        complexity: 'medium',
        issues: [],
      };
    }),

    generateCode: jest.fn(async prompt => {
      return {
        code: `// Generated code for: ${prompt}\nfunction example() {\n  console.log('Generated code');\n}`,
        language: 'javascript',
      };
    }),

    setContext: jest.fn(),
    setModel: jest.fn(),

    // State tracking
    conversationHistory,
    processingQueue,
  };
};

// Mock for voice recognition results
export const createMockRecognitionResult = (transcript, confidence = 0.9) => {
  return {
    results: [
      {
        0: {
          transcript,
          confidence,
        },
        isFinal: true,
        length: 1,
      },
    ],
    resultIndex: 0,
  };
};

// Mock for voice synthesis
export const createMockSpeechSynthesis = () => {
  const utterances = [];

  return {
    speak: jest.fn(utterance => {
      utterances.push(utterance);
      // Simulate speaking completion
      setTimeout(() => {
        if (utterance.onend) utterance.onend();
      }, 100);
    }),
    cancel: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    getVoices: jest.fn(() => [
      { name: 'Google US English', lang: 'en-US', default: true },
      { name: 'Google UK English Female', lang: 'en-GB', default: false },
    ]),
    utterances,
    speaking: false,
    paused: false,
    pending: false,
  };
};

export default {
  createMockTerminal,
  createMockAISystem,
  createMockRecognitionResult,
  createMockSpeechSynthesis,
};
