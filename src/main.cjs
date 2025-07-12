/**
 * RinaWarp Terminal - Simplified Version (Inspired by Warp's Clean Architecture)
 * Copyright (c) 2025 RinaWarp Technologies
 */

const { app, BrowserWindow, BrowserView, ipcMain, _dialog } = require('electron');
const path = require('path');
const os = require('os');
const { _execSync } = require('child_process');
const config = require('./config/unified-config.cjs');

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
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // Disable to allow microphone access
      allowRunningInsecureContent: true, // Allow for local development
      // Enable media access
      enableRemoteModule: true,
      // Additional permissions for microphone access
      experimentalFeatures: true,
    },
    show: false,
    icon: path.join(__dirname, '../assets/ico/rinawarp-terminal.ico'),
    titleBarStyle: 'default',
  };

  mainWindow = new BrowserWindow(windowConfig);

  // Load the AI-powered terminal with voice control
  mainWindow.loadFile(path.join(__dirname, 'terminal.html'));

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
app.whenReady().then(() => {
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
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    if (permission === 'microphone' || permission === 'media') {
      return true;
    }
    return false;
  });
  
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

ipcMain.handle('get-platform-info', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    homeDir: os.homedir(),
    shell: config.get('terminal.shell'),
    configDir: config.configDir,
  };
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
