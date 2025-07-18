/**
 * RinaWarp Terminal - Basic Tests
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 */

// Mock fetch and localStorage for testing
const mockFetch = jest.fn();
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Set up globals if they don't exist
if (typeof global.fetch === 'undefined') {
  global.fetch = mockFetch;
}
if (typeof global.localStorage === 'undefined') {
  global.localStorage = mockLocalStorage;
}
if (typeof global.window === 'undefined') {
  global.window = { localStorage: mockLocalStorage };
}

describe('RinaWarp Terminal - Basic Tests', () => {
  it('should pass basic sanity check', () => {
    expect(true).toBe(true);
  });

  it('should have correct environment setup', () => {
    expect(typeof global.fetch).toBe('function');
    expect(typeof global.localStorage).toBe('object');
    expect(typeof global.window).toBe('object');
  });

  it('should validate package.json structure', () => {
    const packageJson = require('../package.json');
    expect(packageJson.name).toBe('rinawarp-terminal');
    expect(packageJson.version).toBeDefined();
    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.dependencies).toBeDefined();
  });

  it('should verify server.js exists', () => {
    const fs = require('fs');
    const path = require('path');
    const serverPath = path.join(__dirname, '..', 'server.js');
    expect(fs.existsSync(serverPath)).toBe(true);
  });
});
