export default [
  {
    files: ['**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '*.min.js',
      'webpack.config.js',
      'obfuscation-config.js',
      'ip-evidence-*/**',
      'config.js',
      '**/obfuscated/**',
      '**/build-evidence/**',
      '**/code-evidence/**',
      'public/assets/**',
      'public/**/xterm/**',
      '**/xterm.js',
      '**/vendor/**',
      '**/third-party/**',
      'public/vendor/**',
      'public/vendor/prism/**',
      'public/vendor/prism/prism.js',
      // Cleanup and modernization scripts
      'scan-deprecated.*',
      'modernize-deprecated-packages.js',
      'cleanup-deps.js',
      'server-improvements.js',
      'codemods/**',
      'scripts/auto-replace-deprecated.js',
      'scripts/modernize-github-workflows.js',
      'scripts/upgrade-workflows-to-v4.cjs',
      // Temporarily ignore problematic files
      'sdk/**',
      'analytics-dashboard/**',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Node.js globals
        electronAPI: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        globalThis: 'readonly',

        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        history: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        indexedDB: 'readonly',

        // Timers
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',

        // Network
        fetch: 'readonly',
        XMLHttpRequest: 'readonly',
        WebSocket: 'readonly',
        AbortController: 'readonly',

        // DOM and Events
        Event: 'readonly',
        CustomEvent: 'readonly',
        EventTarget: 'readonly',
        MutationObserver: 'readonly',
        ResizeObserver: 'readonly',
        IntersectionObserver: 'readonly',

        // File and Blob APIs
        File: 'readonly',
        FileReader: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',

        // UI APIs
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',

        // Crypto
        crypto: 'readonly',

        // Performance
        performance: 'readonly',

        // Canvas and Graphics
        ImageData: 'readonly',

        // Audio/Video
        Audio: 'readonly',

        // Worker APIs
        Worker: 'readonly',
        SharedWorker: 'readonly',

        // WebAPIs and Browser Features
        screen: 'readonly',
        PerformanceObserver: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        CSS: 'readonly',

        // WebRTC and Media APIs
        RTCPeerConnection: 'readonly',
        MediaRecorder: 'readonly',
        MediaStream: 'readonly',

        // Speech APIs
        speechSynthesis: 'readonly',
        SpeechSynthesisUtterance: 'readonly',
        webkitSpeechRecognition: 'readonly',
        SpeechRecognition: 'readonly',

        // Node.js process APIs (for main process)
        spawn: 'readonly',

        // Terminal and xterm
        Terminal: 'readonly',

        // React globals
        React: 'readonly',
        ReactDOM: 'readonly',

        // Application-specific globals
        RinaWarpIntegration: 'writable',
        rinaWarpIntegration: 'writable',
        beginnerUI: 'writable',
        agentManager: 'writable',
        globalObjectManager: 'writable',
        LicenseManager: 'writable',
        ComplianceAuditLogger: 'writable',
        AccessControlEngine: 'writable',
        BiometricAuthentication: 'writable',
        BehaviorAnalyzer: 'writable',
        RiskAssessmentEngine: 'writable',

        // Testing globals (if needed)
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    rules: {
      indent: ['error', 2],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern:
            '^_|^req$|^res$|^next$|^err$|^error$|^event$|^data$|^options$|^config$|^result$|^callback$|^cb$|^done$',
          varsIgnorePattern: '^_|^unused',
          caughtErrorsIgnorePattern: '^_|^err$|^error$',
          ignoreRestSiblings: true,
        },
      ],
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error', 'info', 'log', 'debug', 'trace'],
        },
      ],
      'no-debugger': ['error'],
      'prefer-const': ['error'],
      'no-var': ['error'],
      'no-undef': ['error'],
    },
  },
];
