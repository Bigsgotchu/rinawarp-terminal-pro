/**
 * RinaWarp Terminal - Main Process
 * Copyright (c) 2025 RinaWarp Technologies
 * 
 * This file is part of RinaWarp Terminal, an advanced open-source terminal emulator with
 * AI assistance, live collaboration, and enterprise-grade security features.
 * 
 * Licensed under the MIT License.
 * See LICENSE file for detailed terms and conditions.
 * 
 * Project repository: https://github.com/rinawarp/terminal
 */
import { app, BrowserWindow, BrowserView, Menu, ipcMain, dialog } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES6 module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    },
    titleBarStyle: 'hidden',
    frame: false,
    show: false,
    icon: path.join(__dirname, '../assets/ico/rinawarp-terminal.ico')
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Always open DevTools for debugging
    mainWindow.webContents.openDevTools();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

// Create browser pane method
function createBrowserPane(url = 'https://google.com') {
  const browserView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });
  
  mainWindow.setBrowserView(browserView);
  browserView.setBounds({ x: 0, y: 100, width: 800, height: 600 });
  browserView.webContents.loadURL(url);
  
  return browserView;
}

// Set unique application ID to prevent conflicts
app.setAppUserModelId('com.rinawarp.terminal');

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
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
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    // You can add logic here to handle external links
  });
});

// IPC handlers for terminal operations
ipcMain.handle('get-platform', () => {
  return process.platform;
});

ipcMain.handle('get-shell', () => {
  if (process.platform === 'win32') {
    // Advanced shell detection for Windows
    // Try PowerShell Core first, then Windows PowerShell, then CMD
    try {
      const { execSync } = require('child_process');
      try {
        execSync('pwsh --version', { stdio: 'pipe' });
        return 'pwsh.exe';
      } catch {
        try {
          execSync('powershell -Command "$PSVersionTable.PSVersion"', { stdio: 'pipe' });
          return 'powershell.exe';
        } catch {
          return 'cmd.exe';
        }
      }
    } catch {
      return process.env.COMSPEC || 'cmd.exe';
    }
  } else {
    return process.env.SHELL || '/bin/bash';
  }
});

ipcMain.handle('get-home-dir', () => {
  return os.homedir();
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

// Auto-updater configuration
autoUpdater.checkForUpdatesAndNotify();

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available.');
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: 'A new version is available. It will be downloaded in the background.',
    buttons: ['OK']
  });
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available.');
});

autoUpdater.on('error', (err) => {
  console.error('Error in auto-updater. ' + err);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  console.log(log_message);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded');
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update Ready',
    message: 'Update downloaded. The application will restart to apply the update.',
    buttons: ['Restart Now', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

// IPC handlers for manual update checks
ipcMain.handle('check-for-updates', async () => {
  return await autoUpdater.checkForUpdatesAndNotify();
});

