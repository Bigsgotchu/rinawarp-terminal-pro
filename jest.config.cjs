module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\.(js|jsx|ts|tsx|mjs)$': ['babel-jest', {
      presets: [['@babel/preset-env', { targets: { node: 'current' } }]]
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  // setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000, // Increased timeout for Puppeteer tests
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
  // Fix for Puppeteer WebSocket issue
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  // Handle ES modules
  extensionsToTreatAsEsm: [],
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node']
};
