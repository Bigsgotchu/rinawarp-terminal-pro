const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // File dialogs
  showSaveDialog: options => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: options => ipcRenderer.invoke('show-open-dialog', options),
  showMessageBox: options => ipcRenderer.invoke('show-message-box', options),

  // Menu event listeners
  onMenuAction: callback => {
    // AI menu actions
    ipcRenderer.on('menu-setup-ai', () => callback('setup-ai'));
    ipcRenderer.on('menu-ai-chat', () => callback('ai-chat'));
    ipcRenderer.on('menu-code-generation', () => callback('code-generation'));
    ipcRenderer.on('menu-debug', () => callback('debug'));
    ipcRenderer.on('menu-architecture', () => callback('architecture'));

    // Feature menu actions
    ipcRenderer.on('menu-voice-control', () => callback('voice-control'));
    ipcRenderer.on('menu-performance', () => callback('performance'));
    ipcRenderer.on('menu-collaboration', () => callback('collaboration'));
    ipcRenderer.on('menu-cloud-sync', () => callback('cloud-sync'));
    ipcRenderer.on('menu-analytics', () => callback('analytics'));
    ipcRenderer.on('menu-automation', () => callback('automation'));

    // Terminal menu actions
    ipcRenderer.on('menu-new-terminal', () => callback('new-terminal'));
    ipcRenderer.on('menu-save-session', () => callback('save-session'));
    ipcRenderer.on('menu-load-session', () => callback('load-session'));
    ipcRenderer.on('menu-find', () => callback('find'));

    // View menu actions
    ipcRenderer.on('menu-toggle-sidebar', () => callback('toggle-sidebar'));
    ipcRenderer.on('menu-themes', () => callback('themes'));

    // Config menu actions
    ipcRenderer.on('menu-export-config', () => callback('export-config'));
    ipcRenderer.on('menu-import-config', () => callback('import-config'));
  },

  // Remove listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('menu-setup-ai');
    ipcRenderer.removeAllListeners('menu-ai-chat');
    ipcRenderer.removeAllListeners('menu-code-generation');
    ipcRenderer.removeAllListeners('menu-debug');
    ipcRenderer.removeAllListeners('menu-architecture');
    ipcRenderer.removeAllListeners('menu-voice-control');
    ipcRenderer.removeAllListeners('menu-performance');
    ipcRenderer.removeAllListeners('menu-collaboration');
    ipcRenderer.removeAllListeners('menu-cloud-sync');
    ipcRenderer.removeAllListeners('menu-analytics');
    ipcRenderer.removeAllListeners('menu-automation');
    ipcRenderer.removeAllListeners('menu-new-terminal');
    ipcRenderer.removeAllListeners('menu-save-session');
    ipcRenderer.removeAllListeners('menu-load-session');
    ipcRenderer.removeAllListeners('menu-find');
    ipcRenderer.removeAllListeners('menu-toggle-sidebar');
    ipcRenderer.removeAllListeners('menu-themes');
    ipcRenderer.removeAllListeners('menu-export-config');
    ipcRenderer.removeAllListeners('menu-import-config');
  },
});

// Expose a simple notification system
contextBridge.exposeInMainWorld('notifications', {
  show: (title, body, options = {}) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, ...options });
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body, ...options });
        }
      });
    }
  },
});

// Expose platform info
contextBridge.exposeInMainWorld('platform', {
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',
});

// Console logging for debugging
contextBridge.exposeInMainWorld('debug', {
  log: (...args) => console.log('[Renderer]', ...args),
  error: (...args) => console.error('[Renderer]', ...args),
  warn: (...args) => console.warn('[Renderer]', ...args),
});
