/**
 * RinaWarp Terminal - Main Process
 * Copyright (c) 2025 RinaWarp Technologies. All rights reserved.
 * 
 * This file is part of RinaWarp Terminal, an advanced terminal emulator with
 * AI assistance, live collaboration, and enterprise-grade security features.
 * 
 * CONFIDENTIAL AND PROPRIETARY
 * This source code is proprietary and confidential information of RinaWarp Technologies.
 * Unauthorized reproduction, distribution, or disclosure is strictly prohibited.
 * 
 * Patent Pending - Advanced Terminal Integration Architecture
 * 
 * Licensed under RinaWarp Commercial License.
 * See LICENSE file for detailed terms and conditions.
 * 
 * For licensing inquiries, contact: licensing@rinawarp.com
 */

const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');

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
      enableRemoteModule: true
    },
    titleBarStyle: 'hidden',
    frame: false,
    show: false,
    icon: path.join(__dirname, '../assets/icon.png')
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
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
    return process.env.COMSPEC || 'powershell.exe';
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

