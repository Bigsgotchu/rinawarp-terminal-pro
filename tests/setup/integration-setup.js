// Integration test setup
const path = require('path');

// Set up test environment
process.env.NODE_ENV = 'test';
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ choices: [{ message: { content: 'Mocked AI response' } }] }),
    text: () => Promise.resolve('Mocked response'),
    status: 200,
  })
);

// Mock File API
global.File = class File {
  constructor(bits, name, options = {}) {
    this.bits = bits;
    this.name = name;
    this.type = options.type || '';
    this.lastModified = options.lastModified || Date.now();
  }
};

// Mock Blob API
global.Blob = class Blob {
  constructor(array, options = {}) {
    this.array = array;
    this.type = options.type || '';
  }

  text() {
    return Promise.resolve(this.array.join(''));
  }
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(key => {
    return localStorageMock.store[key] || null;
  }),
  setItem: jest.fn((key, value) => {
    localStorageMock.store[key] = value.toString();
  }),
  removeItem: jest.fn(key => {
    delete localStorageMock.store[key];
  }),
  clear: jest.fn(() => {
    localStorageMock.store = {};
  }),
  store: {},
};

global.localStorage = localStorageMock;

// Mock Electron APIs
global.require = jest.fn(module => {
  if (module === 'electron') {
    return {
      ipcRenderer: {
        invoke: jest.fn(),
        on: jest.fn(),
        send: jest.fn(),
      },
      app: {
        getPath: jest.fn(() => '/mock/path'),
        getAppPath: jest.fn(() => '/mock/app/path'),
      },
    };
  }
  return jest.requireActual(module);
});

// Mock timers for async operations
jest.useFakeTimers();

// Custom matchers
expect.extend({
  toBeValidAIResponse(received) {
    const pass = typeof received === 'string' && received.length > 0;
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid AI response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid AI response (non-empty string)`,
        pass: false,
      };
    }
  },

  toBeValidCommandSuggestion(received) {
    const pass = typeof received === 'string' || (Array.isArray(received) && received.length > 0);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid command suggestion`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be a valid command suggestion (string or non-empty array)`,
        pass: false,
      };
    }
  },
});

// Global test cleanup
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  jest.clearAllTimers();
});

// Increase test timeout for integration tests
jest.setTimeout(30000);
