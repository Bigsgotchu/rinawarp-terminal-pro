/**
 * RinaWarp Terminal - Test Setup
 * Copyright (c) 2025 RinaWarp Technologies
 */

// Global test setup
global.console = {
  ...console,
  // Suppress logs during tests unless explicitly needed
  log: process.env.NODE_ENV === 'test' ? jest.fn() : console.log,
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock electron APIs
global.electronAPI = {
  invoke: jest.fn(),
  send: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn(),
};

// Mock window object for Node.js environment
global.window = {
  location: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
  },
};

// Mock localStorage
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock sessionStorage
global.sessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock fetch API
global.fetch = jest.fn();

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
};

// Mock crypto API
global.crypto = {
  randomUUID: jest.fn(() => 'test-uuid'),
  getRandomValues: jest.fn(arr => arr.fill(0)),
};

// Mock File APIs
global.File = class File {
  constructor(chunks, filename, options = {}) {
    this.chunks = chunks;
    this.name = filename;
    this.type = options.type || '';
    this.lastModified = options.lastModified || Date.now();
    this.size = chunks.reduce((size, chunk) => size + chunk.length, 0);
  }
};

global.FileReader = class FileReader {
  constructor() {
    this.readyState = 0;
    this.result = null;
    this.error = null;
  }

  readAsText(file) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = 'mock file content';
      if (this.onload) this.onload();
    }, 0);
  }
};

// Mock Blob API
global.Blob = class Blob {
  constructor(chunks = [], options = {}) {
    this.chunks = chunks;
    this.type = options.type || '';
    this.size = chunks.reduce((size, chunk) => size + chunk.length, 0);
  }

  text() {
    return Promise.resolve(this.chunks.join(''));
  }
};

// Mock URL API
global.URL = class URL {
  constructor(url, base) {
    this.href = url;
    this.origin = base || 'http://localhost:3000';
    this.pathname = '/';
    this.search = '';
    this.hash = '';
  }

  static createObjectURL(blob) {
    return 'blob:http://localhost:3000/mock-url';
  }

  static revokeObjectURL(url) {
    // Mock implementation
  }
};

// Global test helpers
global.sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

global.createMockLogger = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  system: jest.fn(),
  security: jest.fn(),
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

// Setup DOM environment
import 'jest-environment-jsdom';
