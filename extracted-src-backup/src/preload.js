/**
 * RinaWarp Terminal - Preload Script
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
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getShell: () => ipcRenderer.invoke('get-shell'),
  getHomeDir: () => ipcRenderer.invoke('get-home-dir'),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  
  // Terminal operations
  createTerminal: (terminalId, options) => ipcRenderer.invoke('create-terminal', terminalId, options),
  writeToTerminal: (terminalId, data) => ipcRenderer.send('terminal-input', terminalId, data),
  resizeTerminal: (terminalId, cols, rows) => ipcRenderer.send('terminal-resize', terminalId, cols, rows),
  closeTerminal: (terminalId) => ipcRenderer.send('terminal-close', terminalId),
  
  // Terminal event listeners
  onTerminalData: (callback) => {
    ipcRenderer.on('terminal-data', callback);
  },
  onTerminalExit: (callback) => {
    ipcRenderer.on('terminal-exit', callback);
  },
  onTerminalError: (callback) => {
    ipcRenderer.on('terminal-error', callback);
  },
  
  // File system operations (secure)
  readTextFile: (filepath) => ipcRenderer.invoke('read-text-file', filepath),
  writeTextFile: (filepath, content) => ipcRenderer.invoke('write-text-file', filepath, content),
  checkFileExists: (filepath) => ipcRenderer.invoke('check-file-exists', filepath),
  
  // Git operations
  getGitStatus: (directory) => ipcRenderer.invoke('git-status', directory),
  getGitBranch: (directory) => ipcRenderer.invoke('git-branch', directory),
  
  // Process operations
  executeCommand: (command, options) => ipcRenderer.invoke('execute-command', command, options),
  
  // Event management
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Log that preload script has loaded
console.log('🔒 RinaWarp Terminal preload script loaded - secure context established');

