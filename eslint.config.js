// Clean ESLint configuration for RinaWarp Terminal
export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'public/releases/**',
      '.git/**',
      'coverage/**',
      '**/*.min.js'
    ]
  },
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly'
      }
    },
    rules: {
      // Error prevention
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_|^unused',
        varsIgnorePattern: '^_|^unused' 
      }],
      'no-undef': 'error',
      'no-console': 'off', // Allow console in terminal app
      
      // Code quality
      'prefer-const': 'warn',
      'no-var': 'warn',
      
      // Disable overly strict rules
      'no-empty': 'off',
      'no-explicit-any': 'off'
    }
  }
];
