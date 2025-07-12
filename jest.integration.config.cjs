module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.js'],
  testTimeout: 30000, // 30 seconds for integration tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup/integration-setup.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js', '!**/node_modules/**'],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  bail: false, // Continue running tests even if some fail
  maxWorkers: 1, // Run tests sequentially for integration tests

  // Mock modules that require Electron or browser environment
  moduleNameMapper: {
    '^electron$': '<rootDir>/tests/mocks/electron.js',
  },

  // Transform settings
  transform: {
    '^.+\\.js$': 'babel-jest',
  },

  // Global variables for tests
  globals: {
    'process.env.NODE_ENV': 'test',
  },
};
