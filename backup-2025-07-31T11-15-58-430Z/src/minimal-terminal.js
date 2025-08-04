/**
 * Minimal RinaWarp Terminal - Simplified Working Version
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    show: false,
    icon: path.join(__dirname, '../assets/ico/rinawarp-terminal.ico'),
  });

  // Load minimal HTML
  mainWindow.loadFile(path.join(__dirname, 'minimal-terminal.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.webContents.openDevTools();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('get-shell', () => {
  if (process.platform === 'win32') {
    return 'pwsh.exe';
  }
  return process.env.SHELL || '/bin/bash';
});
