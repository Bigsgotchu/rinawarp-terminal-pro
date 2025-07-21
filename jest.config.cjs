module.exports = {
  testEnvironment: 'jsdom',
  injectGlobals: true,
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/src/plugins/',
    '<rootDir>/email-templates/',
    '<rootDir>/email-testing-suite/'
  ],
  testTimeout: 10000,
  maxWorkers: 1,
  setupFiles: ['<rootDir>/tests/setup.js']
};
