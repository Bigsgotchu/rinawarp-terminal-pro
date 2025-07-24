/**
 * Preload Script for RinaWarp Terminal
 *
 * This script runs in the renderer process before the web content loads.
 * It provides a secure bridge between the main process and renderer process.
 */

const { contextBridge, ipcRenderer } = require('electron');
const { spawn } = require('child_process');
// const os = require('os'); // Removed - unused variable
const path = require('path');
const fs = require('fs');

// Load .env file if it exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

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

  // Shell configuration
  getShell: () => ipcRenderer.invoke('get-shell'),

  // ElevenLabs configuration
  loadElevenLabsConfig: () => ipcRenderer.invoke('load-elevenlabs-config'),
  saveElevenLabsConfig: config => ipcRenderer.invoke('save-elevenlabs-config', config),
  testElevenLabsVoice: config => ipcRenderer.invoke('test-elevenlabs-voice', config),

  // LLM and AI functions
  getLLMStatus: () => ipcRenderer.invoke('get-llm-status'),
  startConversationalAI: () => ipcRenderer.invoke('start-conversational-ai'),
  stopConversationalAI: () => ipcRenderer.invoke('stop-conversational-ai'),
  saveLLMConfig: config => ipcRenderer.invoke('save-llm-config', config),
  loadLLMConfig: () => ipcRenderer.invoke('load-llm-config'),
  testLLMConnection: config => ipcRenderer.invoke('test-llm-connection', config),

  // Error triage system
  'error-triage-report': (error, context) =>
    ipcRenderer.invoke('error-triage-report', error, context),
  'error-triage-health-check': () => ipcRenderer.invoke('error-triage-health-check'),
  'error-triage-system-metrics': () => ipcRenderer.invoke('error-triage-system-metrics'),

  // Version and platform info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  platform: process.platform,

  // Terminal-related functions
  createTerminal: shell => ipcRenderer.invoke('create-terminal', shell),

  // PTY handling (for terminal emulation)
  spawnPty: (shell, args, options) => {
    try {
      const pty = require('node-pty');
      const ptyProcess = pty.spawn(
        shell || (process.platform === 'win32' ? 'powershell.exe' : 'bash'),
        args || [],
        {
          name: 'xterm-color',
          cols: 80,
          rows: 30,
          cwd: options?.cwd || process.env.HOME || process.env.USERPROFILE,
          env: { ...process.env, ...options?.env },
        }
      );

      return {
        pid: ptyProcess.pid,
        write: data => ptyProcess.write(data),
        resize: (cols, rows) => ptyProcess.resize(cols, rows),
        onData: callback => ptyProcess.on('data', callback),
        onExit: callback => ptyProcess.on('exit', callback),
        kill: () => ptyProcess.kill(),
      };
    } catch (error) {
      console.error('Failed to spawn PTY:', error);
      return null;
    }
  },

  // Shell spawning for simple commands
  spawnShell: (command, args, options) => {
    const shell = spawn(command, args, options);

    return {
      pid: shell.pid,
      stdin: {
        write: data => shell.stdin.write(data),
        end: () => shell.stdin.end(),
      },
      stdout: {
        on: (event, callback) => shell.stdout.on(event, callback),
      },
      stderr: {
        on: (event, callback) => shell.stderr.on(event, callback),
      },
      on: (event, callback) => shell.on(event, callback),
      kill: () => shell.kill(),
    };
  },

  // File system operations
  readFile: filePath => fs.readFileSync(filePath, 'utf8'),
  writeFile: (filePath, data) => fs.writeFileSync(filePath, data),
  exists: filePath => fs.existsSync(filePath),

  // Environment variables (filtered for security)
  getEnvironmentVariables: keys => {
    const allowedKeys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'NODE_ENV', 'APP_VERSION'];

    const result = {};
    keys.forEach(key => {
      if (allowedKeys.includes(key)) {
        result[key] = process.env[key];
      }
    });
    return result;
  },

  // Window controls aliases (matching preload.js)
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
});

// Expose Node.js process information safely
contextBridge.exposeInMainWorld('processAPI', {
  platform: process.platform,
  arch: process.arch,
  versions: process.versions,
});

// Expose environment variables safely
contextBridge.exposeInMainWorld('env', {
  shell: process.env.SHELL || (process.platform === 'win32' ? 'pwsh.exe' : '/bin/bash'),
  home: process.env.HOME || process.env.USERPROFILE,
  user: process.env.USER || process.env.USERNAME,
  path: process.env.PATH,
  platform: process.platform,
  nodeEnv: process.env.NODE_ENV,
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
