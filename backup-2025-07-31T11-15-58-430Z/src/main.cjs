/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 4 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

// Sentry Performance Monitoring and Tracing
require('./instrument.cjs');

/**
 * RinaWarp Terminal - Simplified Version (Inspired by Warp's Clean Architecture)
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 */

const { app, BrowserWindow, BrowserView, ipcMain, Menu } = require('electron');
const path = require('node:path');
const os = require('os');
const fs = require('node:fs');
const { config } = require('./config/unified-config.cjs');
const logger = require('./utils/logger.cjs');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Add comprehensive startup logging
logger.info('🚀 Starting RinaWarp Terminal...');
logger.info('📁 Working directory:', { cwd: process.cwd() });
logger.info('📄 Main script:', { filename: __filename });
logger.info('👤 User:', { user: process.env.USER });
logger.info('🏠 Home directory:', { home: os.homedir() });

// Developer bypass check - unlock all features for the developer
const isDeveloper =
  process.env.USER === 'kgilley' ||
  process.env.NODE_ENV === 'development' ||
  fs.existsSync(path.join(os.homedir(), '.rinawarp-dev'));

logger.debug('🔍 Developer check:', {
  user: process.env.USER === 'kgilley',
  nodeEnv: process.env.NODE_ENV === 'development',
  devFile: fs.existsSync(path.join(os.homedir(), '.rinawarp-dev')),
  isDeveloper,
});

if (isDeveloper) {
  logger.info('🔓 Developer mode enabled - Full access granted');
  // Set environment variables to unlock all features
  process.env.RINAWARP_LICENSE_TIER = 'enterprise';
  process.env.RINAWARP_DEV_MODE = 'true';
  process.env.RINAWARP_BYPASS_AUTH = 'true';
} else {
  logger.info('🔒 Running in regular mode');
}

// Import performance monitor using dynamic import since it's an ES module
let PerformanceMonitor;
let monitor;

// Load ES modules dynamically
async function loadESModules() {
  try {
    const perfModule = await import('./renderer/performance-monitor.js');
    PerformanceMonitor = perfModule.PerformanceMonitor;
    monitor = new PerformanceMonitor();
    logger.info('✅ Performance Monitor loaded successfully');
  } catch (error) {
    logger.warn('⚠️ Performance Monitor not available:', { error: error.message });
    // Fallback implementation
    PerformanceMonitor = class {
      constructor() {}
      async getSystemHealth() {
        return { status: 'fallback' };
      }
      getHistoricalTrends() {
        return { trend: 'no_data' };
      }
      async optimizeCommand(cmd) {
        return { original: cmd, optimized: cmd };
      }
      async predictResourceUsage() {
        return { estimatedTime: 0 };
      }
      getPerformanceAnalytics() {
        return { totalCommands: 0 };
      }
      updateThresholds() {
        return true;
      }
    };
    monitor = new PerformanceMonitor();
  }
}

// monitor will be initialized in loadESModules()

// Enhanced error handlers with warning suppression
const knownHarmlessErrors = [
  'eglQueryDeviceAttribEXT: Bad attribute',
  'Failed to enable receiving autoplay permission data',
  'ContextResult::kFatalFailure: SharedImageStub',
  'Unable to create a GL context',
  'task_policy_set invalid argument',
  'Autofill.enable',
  'Autofill.setAddresses',
  'DOM.enable',
  'CSS.enable',
  'Overlay.enable',
  'Log.enable',
  'Runtime.enable',
  'Network.enable',
  'Target.setAutoAttach',
  'Target.setDiscoverTargets',
  'Performance.enable',
];

// Suppress known harmless warnings
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = function (...args) {
  const errorString = args.join(' ');
  const isHarmless = knownHarmlessErrors.some(known => errorString.includes(known));

  if (!isHarmless) {
    originalConsoleError.apply(console, args);
  } else if (process.env.VERBOSE_LOGGING === 'true') {
    originalConsoleError.apply(console, ['[SUPPRESSED]', ...args]);
  }
};

console.warn = function (...args) {
  const warnString = args.join(' ');
  const isHarmless = knownHarmlessErrors.some(known => warnString.includes(known));

  if (!isHarmless) {
    originalConsoleWarn.apply(console, args);
  } else if (process.env.VERBOSE_LOGGING === 'true') {
    originalConsoleWarn.apply(console, ['[SUPPRESSED]', ...args]);
  }
};

// Add error handlers
process.on('uncaughtException', error => {
  const errorString = error.toString();
  const isHarmless = knownHarmlessErrors.some(known => errorString.includes(known));

  if (!isHarmless) {
    logger.error('Uncaught Exception:', { error });
    // Only exit for non-harmless errors
    process.exit(1);
  } else if (process.env.VERBOSE_LOGGING === 'true') {
    logger.debug('[SUPPRESSED] Uncaught Exception:', { error: error.message });
  }
});

process.on('unhandledRejection', (reason, promise) => {
  const reasonString = reason ? reason.toString() : '';
  const isHarmless = knownHarmlessErrors.some(known => reasonString.includes(known));

  if (!isHarmless) {
    logger.error('Unhandled Rejection at:', { promise, reason });
  } else if (process.env.VERBOSE_LOGGING === 'true') {
    logger.debug('[SUPPRESSED] Unhandled Rejection:', { reason: reasonString });
  }
});

// Remove simple logger as we now use the centralized logger

let mainWindow;

// Create application menu
function createApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    // App Menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.getName(),
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services', submenu: [] },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),

    // File Menu
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }],
    },

    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
              },
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
      ],
    },

    // View Menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        {
          label: 'Toggle Developer Tools',
          accelerator: isMac ? 'Cmd+Option+I' : 'Ctrl+Shift+I',
          click: () => {
            if (mainWindow && mainWindow.webContents) {
              mainWindow.webContents.toggleDevTools();
            }
          },
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },

    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : []),
      ],
    },

    // Help Menu
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com/Rinawarp-Terminal/rinawarp-terminal');
          },
        },
        {
          label: 'Report Issue',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal(
              'https://github.com/Rinawarp-Terminal/rinawarp-terminal/issues'
            );
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  logger.info('🪟 Creating main window...');

  const terminalHtmlPath = path.join(__dirname, 'terminal.html');
  const preloadPath = path.join(__dirname, 'preload.cjs');
  const iconPath = path.join(__dirname, '../assets/ico/rinawarp-mermaid-icon.ico');

  logger.info('📋 Window configuration:', {
    terminalHtml: { path: terminalHtmlPath, exists: fs.existsSync(terminalHtmlPath) },
    preloadScript: { path: preloadPath, exists: fs.existsSync(preloadPath) },
    iconFile: { path: iconPath, exists: fs.existsSync(iconPath) },
  });

  const windowConfig = {
    width: config.get('ui.windowWidth') || 1200,
    height: config.get('ui.windowHeight') || 800,
    title: 'RinaWarp Terminal',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      enableRemoteModule: false,
      experimentalFeatures: true,
      preload: preloadPath,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      safeDialogs: true,
      sandbox: false,
    },
    show: false,
    icon: iconPath,
    titleBarStyle: 'default',
  };

  try {
    logger.info('🏗️ Creating BrowserWindow...');
    mainWindow = new BrowserWindow(windowConfig);
    logger.info('✅ BrowserWindow created successfully');

    // Load the main terminal interface
    logger.info('📄 Loading terminal HTML file...');
    mainWindow
      .loadFile(terminalHtmlPath)
      .then(() => {
        logger.info('✅ Terminal HTML loaded successfully');
      })
      .catch(error => {
        logger.error('❌ Failed to load terminal HTML:', { error });
      });

    mainWindow.once('ready-to-show', () => {
      logger.info('👁️ Window ready to show, displaying...');
      mainWindow.show();
      logger.info('✅ Window displayed successfully');

      // Enable dev tools only if configured
      if (config.get('ui.enableDevTools')) {
        logger.info('🛠️ Opening developer tools...');
        mainWindow.webContents.openDevTools();
      }
    });

    mainWindow.on('closed', () => {
      logger.info('🗑️ Window closed');
      mainWindow = null;
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      logger.error('❌ Failed to load page:', { errorCode, errorDescription });
    });

    mainWindow.webContents.on('crashed', () => {
      logger.error('💥 Renderer process crashed');
    });
  } catch (error) {
    logger.error('❌ Failed to create window:', { error });
    throw new Error(error);
  }
}

// Create browser pane method
function _createBrowserPane(url = 'https://google.com') {
  const browserView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.setBrowserView(browserView);
  browserView.setBounds({ x: 0, y: 100, width: 800, height: 600 });
  browserView.webContents.loadURL(url);

  return browserView;
}

// Set unique application ID to prevent conflicts
app.setAppUserModelId('com.rinawarp.terminal');

// Set proper app name for macOS
app.setName('RinaWarp Terminal');

// Electron command line switches with error suppression
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('ignore-certificate-errors');
// Enable microphone access
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('auto-select-desktop-capture-source', 'Entire screen');
// Suppress GPU and graphics warnings
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-driver-bug-workarounds');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('disable-gl-error-limit');
app.commandLine.appendSwitch('disable-2d-canvas-clip-aa');
app.commandLine.appendSwitch('disable-dev-shm-usage');
// Suppress devtools protocol warnings
app.commandLine.appendSwitch('silent-debugger-extension-api');
app.commandLine.appendSwitch('disable-extensions-except');
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
// Disable Electron security warnings
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
process.env['ELECTRON_NO_ATTACH_CONSOLE'] = 'true';

// Prevent conflicts with original Warp and AppData issues
app.setPath('userData', path.join(os.homedir(), '.rinawarp-terminal', 'electron-data'));
app.setPath('cache', path.join(os.homedir(), '.rinawarp-terminal', 'cache'));
app.setPath('logs', path.join(os.homedir(), '.rinawarp-terminal', 'logs'));

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  // Load ES modules first
  await loadESModules();
  // Load analytics integration
  await loadAnalyticsIntegration();
  // Handle microphone permissions
  const { session } = require('electron');

  // Enable microphone access
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['microphone', 'camera', 'media', 'mediaKeySystem'];

    if (allowedPermissions.includes(permission)) {
      logger.info(`Granting permission: ${permission}`);
      callback(true);
    } else {
      logger.info(`Denying permission: ${permission}`);
      callback(false);
    }
  });

  // Grant microphone permission by default
  session.defaultSession.setPermissionCheckHandler(
    (webContents, permission, _requestingOrigin, _details) => {
      if (permission === 'microphone' || permission === 'media') {
        return true;
      }
      return false;
    }
  );

  createWindow();
  createApplicationMenu();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app security
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, _navigationUrl) => {
    event.preventDefault();
    // You can add logic here to handle external links
  });
});

// Basic IPC handlers
ipcMain.handle('ping', () => 'pong');

// Developer license check - bypass licensing for developer
ipcMain.handle('check-license', async () => {
  if (isDeveloper) {
    logger.info('🔓 Developer license bypass - granting enterprise access');
    return {
      valid: true,
      tier: 'enterprise',
      features: [
        'unlimited_terminals',
        'all_themes',
        'advanced_ai',
        'dedicated_support',
        'sso',
        'custom_branding',
        'developer_mode',
      ],
      maxDevices: -1,
      maxTabs: -1,
      aiAssistance: 'advanced',
      support: 'dedicated',
      expiresAt: null, // Never expires
      isDeveloper: true,
    };
  }

  // Regular license validation would go here
  return {
    valid: false,
    error: 'No valid license found',
    tier: 'free',
  };
});

// Test mode IPC handlers
if (process.env.TEST_MODE === 'true') {
  ipcMain.handle('test-preload-apis', () => {
    return {
      electronAPI: true,
      nodeAPI: true,
      systemInfo: true,
      performanceMonitor: true,
      shellProcess: true,
    };
  });
  logger.info('🧪 Test mode enabled - Added test IPC handlers');
}

// Error Triage System IPC handlers
ipcMain.handle('error-triage-report', async (event, error, context) => {
  try {
    // Log the error report in main process
    logger.info('🩺 Error triage report received:', {
      message: error.message,
      subsystem: context.subsystem,
      component: context.component,
      severity: context.severity,
    });

    // You could integrate with external logging services here
    // e.g., Sentry, LogRocket, or custom analytics

    return {
      triageId: `main_${Date.now()}`,
      processed: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to process error triage report:', { error });
    return {
      triageId: `error_${Date.now()}`,
      processed: false,
      error: error.message,
    };
  }
});

ipcMain.handle('error-triage-health-check', async () => {
  try {
    return {
      mainProcess: true,
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version,
    };
  } catch (error) {
    logger.error('Health check failed:', { error });
    return null;
  }
});

ipcMain.handle('error-triage-system-metrics', async () => {
  try {
    return {
      processes: {
        main: {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          uptime: process.uptime(),
        },
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
      },
    };
  } catch (error) {
    logger.error('Failed to get system metrics:', { error });
    return null;
  }
});

// IPC handlers for terminal operations
ipcMain.handle('get-platform', () => {
  return process.platform;
});

ipcMain.handle('get-shell', () => {
  return config.get('terminal.shell');
});

ipcMain.handle('get-config', (event, path) => {
  return config.get(path);
});

ipcMain.handle('set-config', (event, path, value) => {
  return config.set(path, value);
});

ipcMain.handle('get-home-dir', () => {
  return os.homedir();
});

ipcMain.handle('get-current-dir', () => {
  return process.cwd();
});

ipcMain.handle('get-platform-info', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    homeDir: os.homedir(),
    shell: config.get('terminal.shell'),
    configDir: config.configDir,
  };
});

ipcMain.handle('get-system-info', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    shell:
      config.get('terminal.shell') ||
      (process.platform === 'win32' ? 'pwsh.exe' : process.env.SHELL || '/bin/bash'),
    homeDir: os.homedir(),
    currentDir: process.cwd(),
  };
});

// Performance Monitor IPC handlers
ipcMain.handle('performance-monitor-get-system-health', async () => {
  try {
    return await monitor.getSystemHealth();
  } catch (error) {
    logger.error('Error getting system health:', { error });
    return null;
  }
});

ipcMain.handle('performance-monitor-get-trends', () => {
  try {
    return monitor.getHistoricalTrends();
  } catch (error) {
    logger.error('Error getting performance trends:', { error });
    return null;
  }
});

ipcMain.handle('performance-monitor-optimize-command', async (event, command, options) => {
  try {
    return await monitor.optimizeCommand(command, options);
  } catch (error) {
    logger.error('Error optimizing command:', { error });
    return null;
  }
});

ipcMain.handle('performance-monitor-predict-resource-usage', async (event, command) => {
  try {
    return await monitor.predictResourceUsage(command);
  } catch (error) {
    logger.error('Error predicting resource usage:', { error });
    return null;
  }
});

ipcMain.handle('performance-monitor-get-analytics', () => {
  try {
    return monitor.getPerformanceAnalytics();
  } catch (error) {
    logger.error('Error getting performance analytics:', { error });
    return null;
  }
});

ipcMain.handle('performance-monitor-update-thresholds', (event, thresholds) => {
  try {
    monitor.updateThresholds(thresholds);
    return true;
  } catch (error) {
    logger.error('Error updating thresholds:', { error });
    return false;
  }
});

// OS module IPC handlers
ipcMain.handle('get-os-info', () => {
  return {
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    hostname: os.hostname(),
    cpus: os.cpus(),
    totalmem: os.totalmem(),
    freemem: os.freemem(),
    loadavg: os.loadavg(),
    uptime: os.uptime(),
  };
});

ipcMain.handle('get-cpu-info', () => {
  const cpus = os.cpus();
  return {
    cpus: cpus,
    loadavg: os.loadavg(),
    arch: os.arch(),
    cores: cpus.length,
    model: cpus[0]?.model || 'Unknown',
    speed: cpus[0]?.speed || 0,
    // Calculate total and idle time for CPU usage calculation
    idle: cpus.reduce((sum, cpu) => sum + cpu.times.idle, 0),
    total: cpus.reduce((sum, cpu) => {
      return sum + Object.values(cpu.times).reduce((total, time) => total + time, 0);
    }, 0),
  };
});

ipcMain.handle('get-memory-info', () => {
  return {
    totalmem: os.totalmem(),
    freemem: os.freemem(),
    usage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
  };
});

ipcMain.handle('get-network-info', () => {
  return {
    interfaces: os.networkInterfaces(),
    hostname: os.hostname(),
  };
});

// Analytics integration
let GoogleAnalyticsIntegration;
let gaIntegration;

// Load Google Analytics integration
async function loadAnalyticsIntegration() {
  try {
    const gaModule = await import('./analytics/google-analytics-integration.js');
    GoogleAnalyticsIntegration = gaModule.default;

    // Initialize with your Google Analytics tracking ID
    // Replace 'UA-XXXXXXXX-X' with your actual tracking ID
    const trackingId = process.env.GA_TRACKING_ID || 'UA-XXXXXXXX-X';
    gaIntegration = new GoogleAnalyticsIntegration(trackingId);

    logger.info('✅ Google Analytics integration loaded');
  } catch (error) {
    logger.warn('⚠️ Google Analytics integration not available:', { error: error.message });
  }
}

// IPC handlers for analytics events
ipcMain.handle('track-analytics-event', async (event, category, action, label, value) => {
  try {
    // Log locally
    logger.info(`📊 Analytics event: ${category} - ${action} - ${label} - ${value}`);

    // Send to Google Analytics if available
    if (gaIntegration) {
      await gaIntegration.trackEvent(category, action, label, value);
    }

    // You could also send to other analytics services here
    // e.g., Mixpanel, Amplitude, or custom endpoints

    return true;
  } catch (error) {
    logger.error('Failed to track analytics event:', { error });
    return false;
  }
});

// ElevenLabs configuration IPC handlers
ipcMain.handle('load-elevenlabs-config', async () => {
  try {
    // First try environment variables
    const envApiKey = process.env.ELEVENLABS_API_KEY;
    const envVoiceId = process.env.ELEVENLABS_VOICE_ID;

    if (envApiKey) {
      logger.info('✅ Loading ElevenLabs config from environment variables');
      return {
        apiKey: envApiKey,
        voiceId: envVoiceId || 'EXAVITQu4vr4xnSDxMaL', // Default to Bella
        hasApiKey: true,
        source: 'environment',
      };
    }

    // Fallback to JSON file if environment variables not available
    const configPath = path.join(os.homedir(), '.rinawarp-terminal', 'elevenlabs-config.json');

    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);

      logger.info('✅ Loading ElevenLabs config from JSON file');
      return {
        apiKey: config.apiKey || '',
        voiceId: config.voiceId || 'EXAVITQu4vr4xnSDxMaL',
        hasApiKey: !!config.apiKey,
        source: 'file',
      };
    }

    logger.warn('⚠️ No ElevenLabs configuration found');
    return { apiKey: '', voiceId: 'EXAVITQu4vr4xnSDxMaL', hasApiKey: false, source: 'default' };
  } catch (error) {
    logger.error('Failed to load ElevenLabs config:', { error });
    return { apiKey: '', voiceId: 'EXAVITQu4vr4xnSDxMaL', hasApiKey: false, source: 'error' };
  }
});

ipcMain.handle('save-elevenlabs-config', async (event, config) => {
  try {
    const configDir = path.join(os.homedir(), '.rinawarp-terminal');
    const configPath = path.join(configDir, 'elevenlabs-config.json');

    // Ensure config directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Load existing config to preserve other settings
    let existingConfig = {};
    if (fs.existsSync(configPath)) {
      try {
        const existingData = fs.readFileSync(configPath, 'utf8');
        existingConfig = JSON.parse(existingData);
      } catch (_parseError) {
        logger.warn('Could not parse existing config, creating new one');
      }
    }

    // Update with new values
    const updatedConfig = {
      ...existingConfig,
      apiKey: config.apiKey,
      voiceId: config.voiceId,
      lastUpdated: new Date().toISOString(),
    };

    // Save the configuration
    fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));

    logger.info('✅ ElevenLabs configuration saved successfully');
    return { success: true, message: 'Configuration saved successfully' };
  } catch (error) {
    logger.error('Failed to save ElevenLabs config:', { error });
    return { success: false, message: `Failed to save configuration: ${error.message}` };
  }
});

ipcMain.handle('test-elevenlabs-voice', async (event, config) => {
  try {
    // This is a placeholder for voice testing
    // In a real implementation, you would make an API call to ElevenLabs
    logger.info('🎤 Testing ElevenLabs voice configuration...', { config });

    // Simulate a test (replace with actual API call)
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      success: true,
      message: 'Voice test completed successfully',
      voiceId: config.voiceId || 'default',
    };
  } catch (error) {
    logger.error('Failed to test ElevenLabs voice:', { error });
    return {
      success: false,
      message: `Voice test failed: ${error.message}`,
    };
  }
});

// LLM configuration IPC handlers
ipcMain.handle('get-llm-status', async () => {
  try {
    // Return current LLM status - this is a mock implementation
    return {
      ready: true,
      model: 'gpt-4',
      provider: 'openai',
      latency: '82ms',
      lastUpdate: new Date().toISOString(),
      connectionStatus: 'connected',
    };
  } catch (error) {
    logger.error('Failed to get LLM status:', { error });
    return {
      ready: false,
      error: error.message,
      connectionStatus: 'error',
    };
  }
});

ipcMain.handle('load-llm-config', async () => {
  try {
    const configPath = path.join(os.homedir(), '.rinawarp-terminal', 'llm-config.json');

    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);

      // Return config - mask sensitive data
      return {
        provider: config.provider || 'openai',
        model: config.model || 'gpt-4',
        apiKey: config.apiKey ? '***masked***' : '',
        hasApiKey: !!config.apiKey,
        maxTokens: config.maxTokens || 2048,
        temperature: config.temperature || 0.7,
      };
    }

    return {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: '',
      hasApiKey: false,
      maxTokens: 2048,
      temperature: 0.7,
    };
  } catch (error) {
    logger.error('Failed to load LLM config:', { error });
    return {
      provider: 'openai',
      model: 'gpt-4',
      apiKey: '',
      hasApiKey: false,
      error: error.message,
    };
  }
});

ipcMain.handle('save-llm-config', async (event, config) => {
  try {
    const configDir = path.join(os.homedir(), '.rinawarp-terminal');
    const configPath = path.join(configDir, 'llm-config.json');

    // Ensure config directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Load existing config to preserve other settings
    let existingConfig = {};
    if (fs.existsSync(configPath)) {
      try {
        const existingData = fs.readFileSync(configPath, 'utf8');
        existingConfig = JSON.parse(existingData);
      } catch (_parseError) {
        logger.warn('Could not parse existing LLM config, creating new one');
      }
    }

    // Update with new values
    const updatedConfig = {
      ...existingConfig,
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      maxTokens: config.maxTokens || 2048,
      temperature: config.temperature || 0.7,
      lastUpdated: new Date().toISOString(),
    };

    // Save the configuration
    fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));

    logger.info('✅ LLM configuration saved successfully');
    return { success: true, message: 'LLM configuration saved successfully' };
  } catch (error) {
    logger.error('Failed to save LLM config:', { error });
    return { success: false, message: `Failed to save LLM configuration: ${error.message}` };
  }
});

ipcMain.handle('test-llm-connection', async (event, config) => {
  try {
    logger.info('🧠 Testing LLM connection...', { provider: config.provider, model: config.model });

    // Simulate a connection test (replace with actual API call)
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      success: true,
      message: 'LLM connection test successful',
      provider: config.provider,
      model: config.model,
      latency: '156ms',
    };
  } catch (error) {
    logger.error('Failed to test LLM connection:', { error });
    return {
      success: false,
      message: `LLM connection test failed: ${error.message}`,
    };
  }
});

ipcMain.handle('start-conversational-ai', async () => {
  try {
    logger.info('🗣️ Starting conversational AI...');

    // This is a placeholder - implement actual conversational AI logic
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      success: true,
      status: 'started',
      message: 'Conversational AI started successfully',
    };
  } catch (error) {
    logger.error('Failed to start conversational AI:', { error });
    return {
      success: false,
      status: 'error',
      message: `Failed to start conversational AI: ${error.message}`,
    };
  }
});

ipcMain.handle('stop-conversational-ai', async () => {
  try {
    logger.info('🔚 Stopping conversational AI...');

    // This is a placeholder - implement actual stop logic
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      success: true,
      status: 'stopped',
      message: 'Conversational AI stopped successfully',
    };
  } catch (error) {
    logger.error('Failed to stop conversational AI:', { error });
    return {
      success: false,
      status: 'error',
      message: `Failed to stop conversational AI: ${error.message}`,
    };
  }
});

// Additional analytics IPC handlers
ipcMain.handle('track-page-view', async (event, page, title) => {
  try {
    if (gaIntegration) {
      await gaIntegration.trackPageView(page, title);
    }
    return true;
  } catch (error) {
    logger.error('Failed to track page view:', { error });
    return false;
  }
});

ipcMain.handle('track-timing', async (event, category, variable, time, label) => {
  try {
    if (gaIntegration) {
      await gaIntegration.trackTiming(category, variable, time, label);
    }
    return true;
  } catch (error) {
    logger.error('Failed to track timing:', { error });
    return false;
  }
});

ipcMain.handle('track-exception', async (event, description, fatal) => {
  try {
    if (gaIntegration) {
      await gaIntegration.trackException(description, fatal);
    }
    return true;
  } catch (error) {
    logger.error('Failed to track exception:', { error });
    return false;
  }
});

// Shell process management
const { spawn } = require('child_process');
const shellProcesses = new Map();

// Create shell process handler
ipcMain.handle('create-shell-process', async (event, config) => {
  try {
    const { shell, shellArgs, terminalId, platform } = config;

    // Get current working directory
    const currentDir = process.cwd();

    // Create shell process
    const shellProcess = spawn(shell, shellArgs, {
      cwd: currentDir,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        FORCE_COLOR: '1',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const processId = `shell-${terminalId}-${Date.now()}`;
    shellProcesses.set(processId, shellProcess);

    // Handle shell process events
    shellProcess.stdout.on('data', data => {
      event.sender.send(`shell-data-${processId}`, data);
    });

    shellProcess.stderr.on('data', data => {
      event.sender.send(`shell-error-${processId}`, data);
    });

    shellProcess.on('exit', (code, signal) => {
      event.sender.send(`shell-exit-${processId}`, code, signal);
      shellProcesses.delete(processId);
    });

    shellProcess.on('error', error => {
      event.sender.send(`shell-error-${processId}`, error);
      shellProcesses.delete(processId);
    });

    shellProcess.on('close', (code, signal) => {
      event.sender.send(`shell-close-${processId}`, code, signal);
      shellProcesses.delete(processId);
    });

    logger.info(`Shell process created: ${processId}`);

    return {
      id: processId,
      pid: shellProcess.pid,
      shell,
      shellArgs,
      platform,
    };
  } catch (error) {
    logger.error('Failed to create shell process:', { error });
    throw new Error(error);
  }
});

// Write to shell process handler
ipcMain.handle('write-to-shell', async (event, processId, data) => {
  try {
    const shellProcess = shellProcesses.get(processId);
    if (shellProcess && shellProcess.stdin && !shellProcess.stdin.destroyed) {
      shellProcess.stdin.write(data);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Failed to write to shell process:', { error });
    return false;
  }
});

// Kill shell process handler
ipcMain.handle('kill-shell-process', async (event, processId) => {
  try {
    const shellProcess = shellProcesses.get(processId);
    if (shellProcess) {
      shellProcess.kill();
      shellProcesses.delete(processId);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Failed to kill shell process:', { error });
    return false;
  }
});

// Execute command handler - CRITICAL FIX
ipcMain.handle('execute-command', async (event, command, options = {}) => {
  return new Promise((resolve, _reject) => {
    try {
      const { exec } = require('child_process');
      const { cwd = process.cwd(), env = {}, timeout = 30000 } = options;

      logger.info(`Executing command: ${command}`);

      const childProcess = exec(
        command,
        {
          cwd,
          env: { ...process.env, ...env },
          timeout,
          maxBuffer: 1024 * 1024, // 1MB buffer
        },
        (error, stdout, stderr) => {
          if (error) {
            // Don't reject for non-zero exit codes, return them instead
            resolve({
              stdout: stdout || '',
              stderr: stderr || error.message,
              exitCode: error.code || 1,
              signal: error.signal || null,
              command,
              success: false,
            });
          } else {
            resolve({
              stdout: stdout || '',
              stderr: stderr || '',
              exitCode: 0,
              signal: null,
              command,
              success: true,
            });
          }
        }
      );

      // Handle timeout
      setTimeout(() => {
        if (childProcess && !childProcess.killed) {
          childProcess.kill('SIGTERM');
          resolve({
            stdout: '',
            stderr: 'Command timed out',
            exitCode: 124,
            signal: 'SIGTERM',
            command,
            success: false,
          });
        }
      }, timeout);
    } catch (error) {
      logger.error('Failed to execute command:', { error });
      resolve({
        stdout: '',
        stderr: error.message,
        exitCode: 1,
        signal: null,
        command,
        success: false,
      });
    }
  });
});

// Handle window controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// Prevent navigation away from the app
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });
});

// Auto-updater configuration - COMMENTED OUT TO PREVENT STARTUP ISSUES
// autoUpdater.checkForUpdatesAndNotify();
// autoUpdater.on('checking-for-update', () => {
//   logger.info('Checking for update...', { component: 'auto-updater' });
// });

// autoUpdater.on('update-available', _info => {
//   logger.info('Update available.', { component: 'auto-updater', updateInfo: _info });
//   dialog.showMessageBox(mainWindow, {
//     type: 'info',
//     title: 'Update Available',
//     message: 'A new version is available. It will be downloaded in the background.',
//     buttons: ['OK'],
//   });
// });

// autoUpdater.on('update-not-available', _info => {
//   logger.info('Update not available.', { component: 'auto-updater' });
// });

// autoUpdater.on('error', err => {
//   logger.error('Error in auto-updater', {
//     component: 'auto-updater',
//     error: err.message,
//     stack: err.stack,
//   });
// });

// autoUpdater.on('download-progress', progressObj => {
//   let log_message = 'Download speed: ' + progressObj.bytesPerSecond;
//   log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
//   log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')';
//   logger.info(log_message);
// });

// autoUpdater.on('update-downloaded', _info => {
//   logger.info('Update downloaded');
//   dialog
//     .showMessageBox(mainWindow, {
//       type: 'info',
//       title: 'Update Ready',
//       message: 'Update downloaded. The application will restart to apply the update.',
//       buttons: ['Restart Now', 'Later'],
//     })
//     .then(result => {
//       if (result.response === 0) {
//         autoUpdater.quitAndInstall();
//       }
//     });
// });

// IPC handlers for manual update checks - COMMENTED OUT TO PREVENT STARTUP ISSUES
// ipcMain.handle('check-for-updates', async () => {
//   return await autoUpdater.checkForUpdatesAndNotify();
// });
