/**
 * Enhanced Error Handling System for RinaWarp Terminal
 * Provides graceful error recovery and user-friendly error messages
 */

export class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.errorCallbacks = new Map();
    this.isDebugMode = false;
    
    // Initialize
    this.init();
  }
  
  init() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'global',
        error: event.error,
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
    
    // Unhandled promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'unhandledRejection',
        error: event.reason,
        promise: event.promise
      });
    });
    
    // Override console.error for better tracking
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      this.handleError({
        type: 'console',
        error: new Error(args.join(' ')),
        args: args
      });
    };
    
    // Create error notification UI
    this.createErrorUI();
  }
  
  createErrorUI() {
    // Create error notification container
    this.errorContainer = document.createElement('div');
    this.errorContainer.id = 'error-notification-container';
    this.errorContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 400px;
      z-index: 10000;
      pointer-events: none;
    `;
    document.body.appendChild(this.errorContainer);
    
    // Create debug panel
    this.createDebugPanel();
  }
  
  createDebugPanel() {
    this.debugPanel = document.createElement('div');
    this.debugPanel.id = 'error-debug-panel';
    this.debugPanel.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 300px;
      background: rgba(0, 0, 0, 0.95);
      border-top: 2px solid rgba(255, 0, 0, 0.5);
      display: none;
      z-index: 9999;
      overflow: hidden;
    `;
    
    this.debugPanel.innerHTML = `
      <div style="padding: 10px; border-bottom: 1px solid #333;">
        <h3 style="color: #ff6b6b; margin: 0; display: inline-block;">🐛 Debug Console</h3>
        <button onclick="window.errorHandler.toggleDebugMode()" style="float: right;">Close</button>
        <button onclick="window.errorHandler.clearErrors()" style="float: right; margin-right: 10px;">Clear</button>
      </div>
      <div id="error-log-container" style="height: calc(100% - 50px); overflow-y: auto; padding: 10px; font-family: monospace; font-size: 12px;">
      </div>
    `;
    
    document.body.appendChild(this.debugPanel);
  }
  
  handleError(errorInfo) {
    // Log error
    this.logError(errorInfo);
    
    // Determine error severity
    const severity = this.determineErrorSeverity(errorInfo);
    
    // Show notification based on severity
    if (severity >= 2) {
      this.showErrorNotification(errorInfo, severity);
    }
    
    // Execute callbacks
    this.executeErrorCallbacks(errorInfo, severity);
    
    // Attempt recovery if possible
    this.attemptRecovery(errorInfo);
  }
  
  logError(errorInfo) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...errorInfo,
      stack: errorInfo.error?.stack
    };
    
    this.errorLog.push(logEntry);
    
    // Maintain log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
    
    // Update debug panel if open
    if (this.isDebugMode) {
      this.updateDebugPanel();
    }
    
    // Save to localStorage for persistence
    try {
      localStorage.setItem('rinawarp-error-log', JSON.stringify(this.errorLog.slice(-20)));
    } catch (e) {
      // Ignore storage errors
    }
  }
  
  determineErrorSeverity(errorInfo) {
    const error = errorInfo.error;
    const message = error?.message || errorInfo.message || '';
    
    // Critical errors (severity 3)
    if (message.includes('terminal') && message.includes('fail')) return 3;
    if (message.includes('crash')) return 3;
    if (errorInfo.type === 'unhandledRejection') return 3;
    
    // Warning level errors (severity 2)
    if (message.includes('deprecated')) return 2;
    if (message.includes('warning')) return 2;
    if (errorInfo.type === 'console') return 2;
    
    // Info level (severity 1)
    return 1;
  }
  
  showErrorNotification(errorInfo, severity) {
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    
    const severityConfig = {
      3: { icon: '❌', color: '#ff4444', title: 'Error' },
      2: { icon: '⚠️', color: '#ffaa00', title: 'Warning' },
      1: { icon: 'ℹ️', color: '#00aaff', title: 'Info' }
    };
    
    const config = severityConfig[severity] || severityConfig[1];
    const error = errorInfo.error;
    const message = this.getUserFriendlyMessage(error?.message || errorInfo.message || 'Unknown error');
    
    notification.style.cssText = `
      background: rgba(0, 0, 0, 0.9);
      border: 2px solid ${config.color};
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 10px;
      pointer-events: all;
      cursor: pointer;
      animation: slideIn 0.3s ease-out;
      position: relative;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start;">
        <span style="font-size: 24px; margin-right: 10px;">${config.icon}</span>
        <div style="flex: 1;">
          <h4 style="color: ${config.color}; margin: 0 0 5px 0;">${config.title}</h4>
          <p style="color: #fff; margin: 0; font-size: 14px;">${message}</p>
          ${this.isDebugMode ? `<pre style="color: #888; font-size: 11px; margin-top: 5px;">${error?.stack || ''}</pre>` : ''}
          <button onclick="window.errorHandler.dismissNotification(this.parentElement.parentElement.parentElement)" 
                  style="position: absolute; top: 5px; right: 5px; background: none; border: none; color: #888; cursor: pointer;">✖</button>
        </div>
      </div>
    `;
    
    // Add click handler for debug mode
    notification.addEventListener('click', () => {
      if (!this.isDebugMode) {
        this.toggleDebugMode();
      }
    });
    
    this.errorContainer.appendChild(notification);
    
    // Auto-dismiss after 10 seconds for non-critical errors
    if (severity < 3) {
      setTimeout(() => {
        this.dismissNotification(notification);
      }, 10000);
    }
  }
  
  getUserFriendlyMessage(message) {
    // Map technical errors to user-friendly messages
    const errorMappings = {
      'Cannot read property': 'An unexpected error occurred. Please try again.',
      'Network error': 'Connection problem. Please check your internet.',
      'Permission denied': 'Access denied. Please check your permissions.',
      'command not found': 'Command not recognized. Type "help" for available commands.',
      'ENOENT': 'File or directory not found.',
      'EACCES': 'Permission denied to access this resource.',
      'ETIMEDOUT': 'Operation timed out. Please try again.',
      'Module not found': 'Required component is missing. Please refresh the page.',
      'Invalid argument': 'Invalid input provided. Please check your command.',
      'Out of memory': 'System is running low on memory. Please close some applications.'
    };
    
    for (const [key, friendly] of Object.entries(errorMappings)) {
      if (message.includes(key)) {
        return friendly;
      }
    }
    
    return message;
  }
  
  dismissNotification(notification) {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }
  
  attemptRecovery(errorInfo) {
    const error = errorInfo.error;
    const message = error?.message || '';
    
    // Terminal-specific recovery
    if (message.includes('terminal') || message.includes('xterm')) {
      console.log('Attempting terminal recovery...');
      this.recoverTerminal();
    }
    
    // Shell process recovery
    if (message.includes('shell') || message.includes('process')) {
      console.log('Attempting shell recovery...');
      this.recoverShellProcess();
    }
    
    // Network-related recovery
    if (message.includes('fetch') || message.includes('network')) {
      console.log('Network error detected, will retry...');
      // Network errors often resolve themselves
    }
  }
  
  recoverTerminal() {
    if (window.terminalWrapper) {
      try {
        // Try to recreate terminal
        const container = document.getElementById('terminal');
        if (container) {
          container.innerHTML = '';
          window.terminalWrapper.initialize('terminal').then(() => {
            console.log('Terminal recovered successfully');
            this.showRecoveryNotification('Terminal has been restored');
          });
        }
      } catch (e) {
        console.error('Terminal recovery failed:', e);
      }
    }
  }
  
  recoverShellProcess() {
    if (window.terminalState?.shellHarness) {
      try {
        // Attempt to restart shell
        window.terminalState.shellHarness.restart?.();
        this.showRecoveryNotification('Shell process restarted');
      } catch (e) {
        console.error('Shell recovery failed:', e);
      }
    }
  }
  
  showRecoveryNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      background: rgba(0, 139, 139, 0.9);
      border: 2px solid #00FF88;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 10px;
      pointer-events: all;
      animation: slideIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center;">
        <span style="font-size: 24px; margin-right: 10px;">✅</span>
        <div>
          <h4 style="color: #00FF88; margin: 0;">Recovery Successful</h4>
          <p style="color: #fff; margin: 5px 0 0 0; font-size: 14px;">${message}</p>
        </div>
      </div>
    `;
    
    this.errorContainer.appendChild(notification);
    
    setTimeout(() => {
      this.dismissNotification(notification);
    }, 5000);
  }
  
  toggleDebugMode() {
    this.isDebugMode = !this.isDebugMode;
    this.debugPanel.style.display = this.isDebugMode ? 'block' : 'none';
    
    if (this.isDebugMode) {
      this.updateDebugPanel();
    }
  }
  
  updateDebugPanel() {
    const logContainer = document.getElementById('error-log-container');
    if (!logContainer) return;
    
    logContainer.innerHTML = this.errorLog.map(entry => {
      const color = entry.type === 'unhandledRejection' ? '#ff4444' : 
                   entry.type === 'console' ? '#ffaa00' : '#ff6b6b';
      
      return `
        <div style="margin-bottom: 15px; padding: 10px; background: rgba(255, 255, 255, 0.05); border-radius: 5px;">
          <div style="color: ${color}; font-weight: bold;">
            [${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.type.toUpperCase()}
          </div>
          <div style="color: #fff; margin: 5px 0;">${entry.message || entry.error?.message || 'Unknown error'}</div>
          ${entry.stack ? `<pre style="color: #888; font-size: 11px; overflow-x: auto;">${entry.stack}</pre>` : ''}
        </div>
      `;
    }).join('');
    
    // Scroll to bottom
    logContainer.scrollTop = logContainer.scrollHeight;
  }
  
  clearErrors() {
    this.errorLog = [];
    this.updateDebugPanel();
    localStorage.removeItem('rinawarp-error-log');
  }
  
  // Register error callbacks
  on(event, callback) {
    if (!this.errorCallbacks.has(event)) {
      this.errorCallbacks.set(event, []);
    }
    this.errorCallbacks.get(event).push(callback);
  }
  
  executeErrorCallbacks(errorInfo, severity) {
    const callbacks = this.errorCallbacks.get('error') || [];
    callbacks.forEach(callback => {
      try {
        callback(errorInfo, severity);
      } catch (e) {
        console.error('Error in error callback:', e);
      }
    });
  }
  
  // Export error log
  exportErrorLog() {
    const data = JSON.stringify(this.errorLog, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rinawarp-error-log-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Initialize and export
window.errorHandler = new ErrorHandler();
