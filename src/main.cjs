/**
 * RinaWarp Terminal - Simplified Version (Inspired by Warp's Clean Architecture)
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 */

const { app, BrowserWindow, BrowserView, ipcMain, _dialog } = require('electron');
const path = require('path');
const os = require('os');
const { _execSync } = require('child_process');
const config = require('./config/unified-config.cjs');

// Import performance monitor using dynamic import since it's an ES module
let PerformanceMonitor;
let monitor;

// Load ES modules dynamically
async function loadESModules() {
  try {
    const perfModule = await import('./renderer/performance-monitor.js');
    PerformanceMonitor = perfModule.PerformanceMonitor;
    monitor = new PerformanceMonitor();
    console.log('✅ Performance Monitor loaded successfully');
  } catch (error) {
    console.warn('⚠️ Performance Monitor not available:', error.message);
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

// Add error handlers
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Simple logger
const _logger = {
  info: (msg, ctx) => console.log(`[INFO] ${msg}`, ctx),
  error: (msg, ctx) => console.error(`[ERROR] ${msg}`, ctx),
};

let mainWindow;

function createWindow() {
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
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      safeDialogs: true,
      sandbox: false,
    },
    show: false,
    icon: path.join(__dirname, '../assets/ico/rinawarp-terminal.ico'),
    titleBarStyle: 'default',
  };

  mainWindow = new BrowserWindow(windowConfig);

  // Load preload test for verification
  mainWindow.loadFile(path.join(__dirname, '../test-preload-simple.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Enable dev tools to debug voice issues
    mainWindow.webContents.openDevTools();
    // if (config.get('ui.enableDevTools')) {
    //   mainWindow.webContents.openDevTools();
    // }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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

app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('ignore-certificate-errors');
// Enable microphone access
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
app.commandLine.appendSwitch('enable-usermedia-screen-capturing');
app.commandLine.appendSwitch('auto-select-desktop-capture-source', 'Entire screen');
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

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
      console.log(`Granting permission: ${permission}`);
      callback(true);
    } else {
      console.log(`Denying permission: ${permission}`);
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
  console.log('🧪 Test mode enabled - Added test IPC handlers');
}

// Error Triage System IPC handlers
ipcMain.handle('error-triage-report', async (event, error, context) => {
  try {
    // Log the error report in main process
    console.log('🩺 Error triage report received:', {
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
    console.error('Failed to process error triage report:', error);
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
    console.error('Health check failed:', error);
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
    console.error('Failed to get system metrics:', error);
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
    console.error('Error getting system health:', error);
    return null;
  }
});

ipcMain.handle('performance-monitor-get-trends', () => {
  try {
    return monitor.getHistoricalTrends();
  } catch (error) {
    console.error('Error getting performance trends:', error);
    return null;
  }
});

ipcMain.handle('performance-monitor-optimize-command', async (event, command, options) => {
  try {
    return await monitor.optimizeCommand(command, options);
  } catch (error) {
    console.error('Error optimizing command:', error);
    return null;
  }
});

ipcMain.handle('performance-monitor-predict-resource-usage', async (event, command) => {
  try {
    return await monitor.predictResourceUsage(command);
  } catch (error) {
    console.error('Error predicting resource usage:', error);
    return null;
  }
});

ipcMain.handle('performance-monitor-get-analytics', () => {
  try {
    return monitor.getPerformanceAnalytics();
  } catch (error) {
    console.error('Error getting performance analytics:', error);
    return null;
  }
});

ipcMain.handle('performance-monitor-update-thresholds', (event, thresholds) => {
  try {
    monitor.updateThresholds(thresholds);
    return true;
  } catch (error) {
    console.error('Error updating thresholds:', error);
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

    console.log('✅ Google Analytics integration loaded');
  } catch (error) {
    console.warn('⚠️ Google Analytics integration not available:', error.message);
  }
}

// IPC handlers for analytics events
ipcMain.handle('track-analytics-event', async (event, category, action, label, value) => {
  try {
    // Log locally
    console.log(`📊 Analytics event: ${category} - ${action} - ${label} - ${value}`);

    // Send to Google Analytics if available
    if (gaIntegration) {
      await gaIntegration.trackEvent(category, action, label, value);
    }

    // You could also send to other analytics services here
    // e.g., Mixpanel, Amplitude, or custom endpoints

    return true;
  } catch (error) {
    console.error('Failed to track analytics event:', error);
    return false;
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
    console.error('Failed to track page view:', error);
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
    console.error('Failed to track timing:', error);
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
    console.error('Failed to track exception:', error);
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

    console.log(`Shell process created: ${processId}`);

    return {
      id: processId,
      pid: shellProcess.pid,
      shell,
      shellArgs,
      platform,
    };
  } catch (error) {
    console.error('Failed to create shell process:', error);
    throw error;
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
    console.error('Failed to write to shell process:', error);
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
    console.error('Failed to kill shell process:', error);
    return false;
  }
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
//   console.info(log_message);
// });

// autoUpdater.on('update-downloaded', _info => {
//   console.info('Update downloaded');
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
