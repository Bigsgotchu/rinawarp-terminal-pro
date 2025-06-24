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
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
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

// Terminal management (mock mode until node-pty is properly installed)
const terminals = new Map();

ipcMain.handle('create-terminal', (event, terminalId, options = {}) => {
  try {
    // Mock terminal process for demonstration
    const mockProcess = {
      write: (data) => {
        console.log(`Terminal ${terminalId} input:`, data);
        // Echo back the input for demonstration
        if (mainWindow) {
          mainWindow.webContents.send('terminal-data', terminalId, data);
        }
      },
      kill: () => {
        terminals.delete(terminalId);
        if (mainWindow) {
          mainWindow.webContents.send('terminal-exit', terminalId, 0);
        }
      },
      resize: (cols, rows) => {
        console.log(`Terminal ${terminalId} resized to ${cols}x${rows}`);
      }
    };
    
    terminals.set(terminalId, mockProcess);
    
    // Send initial welcome message
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.webContents.send('terminal-data', terminalId, '\r\n🚀 RinaWarp Terminal Ready!\r\n');
        mainWindow.webContents.send('terminal-data', terminalId, 'PS C:\\Users\\gille> ');
      }
    }, 100);
    
    return { success: true, terminalId };
  } catch (error) {
    console.error('Failed to create terminal:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.on('terminal-input', (event, terminalId, data) => {
  const terminal = terminals.get(terminalId);
  if (terminal) {
    terminal.write(data);
  }
});

ipcMain.on('terminal-resize', (event, terminalId, cols, rows) => {
  const terminal = terminals.get(terminalId);
  if (terminal) {
    terminal.resize(cols, rows);
  }
});

ipcMain.on('terminal-close', (event, terminalId) => {
  const terminal = terminals.get(terminalId);
  if (terminal) {
    terminal.kill();
  }
});

// File system operations (secure)
ipcMain.handle('read-text-file', async (event, filepath) => {
  try {
    const fs = require('fs').promises;
    const data = await fs.readFile(filepath, 'utf8');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-text-file', async (event, filepath, content) => {
  try {
    const fs = require('fs').promises;
    await fs.writeFile(filepath, content, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-file-exists', async (event, filepath) => {
  try {
    const fs = require('fs').promises;
    await fs.access(filepath);
    return { success: true, exists: true };
  } catch (error) {
    return { success: true, exists: false };
  }
});

// Git operations
ipcMain.handle('git-status', async (event, directory) => {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    const { stdout } = await execAsync('git status --porcelain', { cwd: directory });
    return { success: true, status: stdout.trim() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-branch', async (event, directory) => {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    const { stdout } = await execAsync('git branch --show-current', { cwd: directory });
    return { success: true, branch: stdout.trim() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Execute command
ipcMain.handle('execute-command', async (event, command, options = {}) => {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    const { stdout, stderr } = await execAsync(command, {
      cwd: options.cwd || os.homedir(),
      timeout: options.timeout || 10000
    });
    return { success: true, stdout, stderr };
  } catch (error) {
    return { success: false, error: error.message };
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

