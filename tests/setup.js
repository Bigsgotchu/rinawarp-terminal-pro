/**
 * RinaWarp Terminal - Jest Test Setup
 * Copyright (c) 2025 RinaWarp Terminal. All rights reserved.
 * This software is protected by copyright and international treaties.
 * Unauthorized copying, reproduction, or distribution is strictly prohibited.
 */

// Global test setup configuration
global.console = {
  ...console,
  // Suppress console logs during tests unless debugging
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set up test environment
process.env.NODE_ENV = 'test';

// Mock Electron APIs that might be used during testing
if (typeof window !== 'undefined') {
  window.electronAPI = {
    // Mock electron preload APIs
    invoke: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn(),
  };
}

// Global test utilities
global.testUtils = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  mockConsole: () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  },
  restoreConsole: () => {
    console.log.mockRestore?.();
    console.warn.mockRestore?.();
    console.error.mockRestore?.();
  }
};

