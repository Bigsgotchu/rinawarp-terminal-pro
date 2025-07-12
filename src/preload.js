/**
 * Preload Script for RinaWarp Terminal
 *
 * This script runs in the renderer process before the web content loads.
 * It provides a secure bridge between the main process and renderer process.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Terminal operations
  executeCommand: command => ipcRenderer.invoke('execute-command', command),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // Settings
  saveSettings: settings => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),

  // Theme management
  setTheme: theme => ipcRenderer.invoke('set-theme', theme),
  getTheme: () => ipcRenderer.invoke('get-theme'),

  // File operations
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // AI features
  getCommandSuggestion: context => ipcRenderer.invoke('get-command-suggestion', context),

  // Session management
  createSession: config => ipcRenderer.invoke('create-session', config),
  closeSession: sessionId => ipcRenderer.invoke('close-session', sessionId),
  listSessions: () => ipcRenderer.invoke('list-sessions'),

  // Listeners for main process events
  onMenuAction: callback => ipcRenderer.on('menu-action', callback),
  onThemeChanged: callback => ipcRenderer.on('theme-changed', callback),
  onSettingsChanged: callback => ipcRenderer.on('settings-changed', callback),

  // Remove listeners
  removeAllListeners: channel => ipcRenderer.removeAllListeners(channel),

  // Version info
  getVersion: () => ipcRenderer.invoke('get-version'),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Development mode
  isDev: () => ipcRenderer.invoke('is-dev-mode'),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateAvailable: callback => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: callback => ipcRenderer.on('update-downloaded', callback),
});

// Expose Node.js process information safely
contextBridge.exposeInMainWorld('processAPI', {
  platform: process.platform,
  arch: process.arch,
  versions: process.versions,
});

// Security: Remove access to Node.js APIs
delete window.require;
delete window.exports;
delete window.module;

console.log('🔒 Preload script loaded - Security context established');
