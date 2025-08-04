/**
 * Jest configuration for plugin system tests
 */

export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.js$': ['babel-jest', { presets: ['@babel/preset-env'] }],
  },
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['../**/*.js', '!../tests/**/*.js'],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/test-setup.js'],
  testTimeout: 10000,
};
