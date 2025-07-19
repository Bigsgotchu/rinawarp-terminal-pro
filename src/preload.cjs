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

  // Shell process management
  createShellProcess: config => ipcRenderer.invoke('create-shell-process', config),
  writeToShell: (processId, data) => ipcRenderer.invoke('write-to-shell', processId, data),
  killShellProcess: processId => ipcRenderer.invoke('kill-shell-process', processId),

  // Shell process event listeners
  onShellData: (processId, callback) =>
    ipcRenderer.on(`shell-data-${processId}`, (_event, data) => callback(data)),
  onShellError: (processId, callback) =>
    ipcRenderer.on(`shell-error-${processId}`, (_event, data) => callback(data)),
  onShellExit: (processId, callback) =>
    ipcRenderer.on(`shell-exit-${processId}`, (_event, code, signal) => callback(code, signal)),
  onShellClose: (processId, callback) =>
    ipcRenderer.on(`shell-close-${processId}`, (_event, code, signal) => callback(code, signal)),

  // Remove shell process listeners
  removeShellListeners: processId => {
    ipcRenderer.removeAllListeners(`shell-data-${processId}`);
    ipcRenderer.removeAllListeners(`shell-error-${processId}`);
    ipcRenderer.removeAllListeners(`shell-exit-${processId}`);
    ipcRenderer.removeAllListeners(`shell-close-${processId}`);
  },

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

  // Analytics
  trackAnalyticsEvent: (category, action, label, value) =>
    ipcRenderer.invoke('track-analytics-event', category, action, label, value),

  // Test mode functions
  ping: () => ipcRenderer.invoke('ping'),
  testPreloadAPIs: () => ipcRenderer.invoke('test-preload-apis'),

  // Error triage system
  'error-triage-report': (error, context) =>
    ipcRenderer.invoke('error-triage-report', error, context),
  'error-triage-health-check': () => ipcRenderer.invoke('error-triage-health-check'),
  'error-triage-system-metrics': () => ipcRenderer.invoke('error-triage-system-metrics'),
});

// Expose Node.js process information safely
contextBridge.exposeInMainWorld('processAPI', {
  platform: process.platform,
  arch: process.arch,
  versions: process.versions,
});

// Expose OS module functions via IPC
contextBridge.exposeInMainWorld('nodeAPI', {
  // OS module functions
  getHomeDir: () => ipcRenderer.invoke('get-home-dir'),
  getCurrentDir: () => ipcRenderer.invoke('get-current-dir'),
  getPlatformInfo: () => ipcRenderer.invoke('get-platform-info'),
  getOSInfo: () => ipcRenderer.invoke('get-os-info'),
  getCPUInfo: () => ipcRenderer.invoke('get-cpu-info'),
  getMemoryInfo: () => ipcRenderer.invoke('get-memory-info'),
  getNetworkInfo: () => ipcRenderer.invoke('get-network-info'),

  // Performance Monitor functions
  performanceMonitor: {
    getSystemHealth: () => ipcRenderer.invoke('performance-monitor-get-system-health'),
    getTrends: () => ipcRenderer.invoke('performance-monitor-get-trends'),
    optimizeCommand: (command, options) =>
      ipcRenderer.invoke('performance-monitor-optimize-command', command, options),
    predictResourceUsage: command =>
      ipcRenderer.invoke('performance-monitor-predict-resource-usage', command),
    getAnalytics: () => ipcRenderer.invoke('performance-monitor-get-analytics'),
    updateThresholds: thresholds =>
      ipcRenderer.invoke('performance-monitor-update-thresholds', thresholds),
  },
});

// Security: Remove access to Node.js APIs
delete window.require;
delete window.exports;
delete window.module;

console.log('🔒 Preload script loaded - Security context established');
