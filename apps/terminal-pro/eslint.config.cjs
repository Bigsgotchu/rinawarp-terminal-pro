const tsParser = require('@typescript-eslint/parser')
const tsPlugin = require('@typescript-eslint/eslint-plugin')
const sonarjs = require('eslint-plugin-sonarjs')
const unicorn = require('eslint-plugin-unicorn')

module.exports = [
  {
    ignores: ['dist/**', 'dist-electron/**', 'out/**', 'node_modules/**', 'tests/e2e-artifacts/**'],
  },
  // Default rules for all files
  {
    files: ['**/*.{ts,tsx,js,cjs,mjs}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      sonarjs,
      unicorn,
    },
    rules: {
      'no-undef': 'off',
      complexity: ['warn', 15],
      'max-params': ['warn', 6],
      'max-lines-per-function': ['warn', { max: 60, skipBlankLines: true, skipComments: true }],
      'max-lines': ['warn', { max: 600, skipBlankLines: true, skipComments: true }],
      'sonarjs/cognitive-complexity': ['warn', 20],
      'unicorn/consistent-function-scoping': 'warn',
    },
  },
  // Legacy hotspots: relaxed thresholds (ratchet approach)
  // These files are large legacy modules that will be refactored incrementally
  {
    files: ['src/main.ts', 'src/main.js', 'src/structured-session.ts'],
    rules: {
      'max-lines': ['warn', { max: 4000, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 250, skipBlankLines: true, skipComments: true }],
      'sonarjs/cognitive-complexity': ['warn', 70],
      complexity: ['warn', 45],
    },
  },
  // New modular folders: strict thresholds
  // All new code in these directories must meet higher standards
  {
    files: ['src/main/**/*.ts', 'src/security/**/*.ts'],
    rules: {
      'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
      'sonarjs/cognitive-complexity': ['warn', 20],
      complexity: ['warn', 15],
    },
  },
  // Renderer settings modules: UI panels can be longer but keep strict quality
  {
    files: ['src/renderer/settings/**/*.ts'],
    rules: {
      'max-lines-per-function': ['warn', { max: 120, skipBlankLines: true, skipComments: true }],
      'max-params': ['warn', 3],
      complexity: ['warn', 12],
    },
  },
  // Test files: relaxed
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
    },
  },
]
