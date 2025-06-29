/**
 * RinaWarp Terminal - Jest.Config
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * This file is part of RinaWarp Terminal, an advanced open-source terminal emulator with
 * AI assistance, live collaboration, and enterprise-grade security features.
 *
 * Licensed under the MIT License.
 * See LICENSE file for detailed terms and conditions.
 *
 * Project repository: https://github.com/rinawarp/terminal
 */
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js', '<rootDir>/tests/**/*.spec.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js', '!src/**/*.spec.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(@testing-library|@xterm)/)'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/reports/',
    '<rootDir>/tools/',
    '<rootDir>/ip-evidence-*/',
  ],
  testTimeout: 10000,
  verbose: true,
};
