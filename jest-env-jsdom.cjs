module.exports = {
  testEnvironment: 'jsdom',
  testRunner: 'jest-circus/runner',
  transform: {
    '^.+\.m?js$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  testTimeout: 30000,
  globals: {
    'window': {},
  },
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/out/',
    '<rootDir>/deprecated/'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/out/',
    '/deprecated/'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(puppeteer)/)'
  ],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  extensionsToTreatAsEsm: [],
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node']
};
