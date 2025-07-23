// Smart File Manager Configuration
module.exports = {
  // Directories to watch and clean
  watchPaths: [
    'src/',
    'public/',
    'styles/',
    'scripts/',
    'components/',
    'assets/',
    'tools/',
    'docs/',
    '.'  // Root directory for misc files
  ],

  // File types to monitor
  fileTypes: [
    '.js', '.jsx', '.ts', '.tsx',
    '.css', '.scss', '.sass',
    '.html', '.htm',
    '.json', '.yaml', '.yml',
    '.md', '.txt',
    '.vue', '.svelte',
    '.cjs', '.mjs',
    '.py', '.rb', '.php',
    '.sh', '.bat', '.ps1'
  ],

  // Patterns for files that should be considered "broken" or temporary
  brokenPatterns: [
    /\.backup$/,
    /\.old$/,
    /\.tmp$/,
    /\.temp$/,
    /\.orig$/,
    /~$/,
    /-broken$/,
    /-copy(\d+)?$/,
    /-duplicate(\d+)?$/,
    /-conflict(-\d+)?$/,
    /-backup(-\d+)?$/,
    /\.save$/,
    /\.bak$/,
    /\.swp$/,
    /\.swo$/,
    /^#.*#$/,  // Emacs temp files
    /^\.\#/,   // Emacs lock files
  ],

  // Patterns for versioned files (will be cleaned if clean version exists)
  versionedPatterns: [
    /-v\d+(\.\d+)*$/,
    /-\d{4}-\d{2}-\d{2}$/,
    /-\d{13}$/,  // timestamps
    /-\d{8}-\d{6}$/,  // date-time format
    /-version-\d+$/,
    /-rev-\d+$/,
    /-build-\d+$/
  ],

  // Directories to ignore completely
  ignoreDirs: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    '.nuxt',
    'coverage',
    '.nyc_output',
    '.smart-backup',
    'exec -l /bin/bash'  // That weird directory that appeared in your file list
  ],

  // Files to never touch (exact matches)
  protectedFiles: [
    'package.json',
    'package-lock.json',
    'yarn.lock',
    '.gitignore',
    'README.md',
    'LICENSE',
    '.env',
    '.env.local',
    '.env.production'
  ],

  // Cleanup rules
  cleanup: {
    // Remove duplicates with identical content
    removeDuplicates: true,
    
    // Remove orphaned broken files (broken files without clean versions)
    removeOrphans: true,
    
    // Remove empty directories after cleanup
    removeEmptyDirs: true,
    
    // Maximum age in days for temp files before auto-removal
    maxTempFileAge: 7,
    
    // Create backups before removing files
    createBackups: true,
    
    // Backup directory
    backupDir: '.smart-backup',
    
    // Log file for all operations
    logFile: 'smart-file-manager.log',
    
    // Rotate log files after this many MB
    maxLogSize: 10
  },

  // Real-time watching
  watch: {
    // Enable file system watching
    enabled: true,
    
    // Delay in ms before processing file changes (debounce)
    debounceMs: 500,
    
    // Ignore dotfiles in watch mode
    ignoreDotFiles: true
  },

  // Integration with other tools
  integration: {
    // Run before git commit
    gitHooks: true,
    
    // Run before build
    preBuild: true,
    
    // Run after test
    postTest: false,
    
    // Integrate with existing cleanup script
    useExistingCleanup: true
  },

  // Notification settings
  notifications: {
    // Show desktop notifications (if supported)
    desktop: false,
    
    // Log level: 'error', 'warn', 'info', 'debug'
    logLevel: 'info',
    
    // Show summary after cleanup
    showSummary: true
  },

  // Custom patterns for your specific project
  customPatterns: {
    // RinaWarp specific patterns
    rinawarp: [
      /deployment-monitor-.*\.log$/,
      /dns-migration-.*\.log$/,
      /firebase-diagnostic-.*\.log$/,
      /test-.*\.cjs$/,
      /debug-.*\.js$/,
      /-test-\d+\.js$/,
      /.*-testing-suite\.js$/
    ],
    
    // Electron specific
    electron: [
      /electron-debug-.*$/,
      /build-.*\.tmp$/
    ],
    
    // Development artifacts
    dev: [
      /\.DS_Store$/,
      /Thumbs\.db$/,
      /desktop\.ini$/,
      /.*\.log\.\d+$/
    ]
  }
};
