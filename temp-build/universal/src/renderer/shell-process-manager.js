/**
 * ShellProcessManager - Core Engine for Terminal Process Management
 * 
 * Handles:
 * - Shell process lifecycle (spawn, pipe, cleanup)
 * - Tab isolation and session management
 * - Bidirectional I/O routing
 * - State monitoring and diagnostics
 * - Error recovery and restart capabilities
 */

export class ShellProcessManager {
  constructor(tabId, terminal, options = {}) {
    this.tabId = tabId;
    this.terminal = terminal;
    this.sessionId = null;
    this.state = 'idle'; // idle, starting, active, error, exited
    this.startTime = null;
    this.lastActivity = null;
    this.errorCount = 0;
    this.bytesWritten = 0;
    this.bytesReceived = 0;
        
    // Configuration
    this.options = {
      shell: options.shell || '/bin/bash',
      cwd: options.cwd || process.env.HOME,
      env: options.env || {},
      restartOnExit: options.restartOnExit !== false,
      maxRestarts: options.maxRestarts || 3,
      logLevel: options.logLevel || 'info',
      enableDiagnostics: options.enableDiagnostics !== false,
      ...options
    };
        
    // Event handlers storage
    this.handlers = {
      data: [],
      exit: [],
      error: [],
      restart: []
    };
        
    // Restart tracking
    this.restartCount = 0;
    this.lastRestart = null;
        
    // Diagnostics integration
    this.diagnostics = {
      commands: [],
      errors: [],
      performance: {
        avgResponseTime: 0,
        totalCommands: 0
      }
    };
        
    this.log('ShellProcessManager created', 'info');
  }
    
  /**
     * Initialize the shell process and set up I/O routing
     */
  async init() {
    try {
      this.setState('starting');
      this.startTime = Date.now();
            
      this.log('Initializing shell process...', 'info');
            
      if (!window.electronAPI) {
        throw new Error('Electron API not available - cannot create shell process');
      }
            
      // Create shell process
      const processInfo = await window.electronAPI.createShellProcess({
        shell: this.options.shell,
        cwd: this.options.cwd,
        env: this.options.env,
        terminalId: this.tabId
      });
            
      this.sessionId = processInfo.id || processInfo.pid || `shell-${this.tabId}`;
            
      this.log(`Shell process created: ${this.sessionId}`, 'success');
            
      // Set up data handlers
      this.setupDataHandlers();
            
      // Set up terminal input routing
      this.setupTerminalInput();
            
      // Set up lifecycle handlers
      this.setupLifecycleHandlers();
            
      this.setState('active');
      this.lastActivity = Date.now();
            
      // Send welcome message
      this.sendWelcomeMessage();
            
      // Start diagnostics monitoring if enabled
      if (this.options.enableDiagnostics) {
        this.startDiagnosticsMonitoring();
      }
            
      return this.sessionId;
            
    } catch (error) {
      this.handleError('Failed to initialize shell process', error);
      throw error;
    }
  }
    
  /**
     * Set up shell data handlers
     */
  setupDataHandlers() {
    if (!window.electronAPI.onShellData) {
      this.log('onShellData not available', 'warning');
      return;
    }
        
    window.electronAPI.onShellData(this.sessionId, (data) => {
      if (this.isCurrentTab()) {
        this.terminal.write(data);
        this.bytesReceived += data.length;
        this.lastActivity = Date.now();
                
        // Track for diagnostics
        if (this.options.enableDiagnostics) {
          this.trackDataReceived(data);
        }
                
        // Emit data event
        this.emit('data', { direction: 'received', data, size: data.length });
      }
    });
        
    this.log('Shell data handlers configured', 'info');
  }
    
  /**
     * Set up terminal input routing
     */
  setupTerminalInput() {
    this.terminal.onData((data) => {
      if (this.state === 'active' && this.sessionId) {
        this.writeToShell(data);
      }
    });
        
    this.log('Terminal input routing configured', 'info');
  }
    
  /**
     * Set up process lifecycle handlers
     */
  setupLifecycleHandlers() {
    if (window.electronAPI.onShellExit) {
      window.electronAPI.onShellExit(this.sessionId, (exitCode) => {
        this.handleExit(exitCode);
      });
    }
        
    if (window.electronAPI.onShellError) {
      window.electronAPI.onShellError(this.sessionId, (error) => {
        this.handleError('Shell process error', error);
      });
    }
        
    this.log('Lifecycle handlers configured', 'info');
  }
    
  /**
     * Write data to shell process
     */
  async writeToShell(data) {
    try {
      if (this.state !== 'active' || !this.sessionId) {
        this.log('Cannot write to shell - not active', 'warning');
        return false;
      }
            
      await window.electronAPI.sendToShell(this.sessionId, data);
      this.bytesWritten += data.length;
      this.lastActivity = Date.now();
            
      // Track command for diagnostics
      if (this.options.enableDiagnostics && data.includes('\r')) {
        this.trackCommand(data);
      }
            
      // Emit data event
      this.emit('data', { direction: 'sent', data, size: data.length });
            
      return true;
            
    } catch (error) {
      this.handleError('Failed to write to shell', error);
      return false;
    }
  }
    
  /**
     * Handle shell process exit
     */
  handleExit(exitCode = 0) {
    this.setState('exited');
        
    const message = exitCode === 0 
      ? `\r\n💀 Shell process exited normally (code: ${exitCode})\r\n`
      : `\r\n🧨 Shell process terminated with error (code: ${exitCode})\r\n`;
            
    this.terminal.write(message);
    this.log(`Shell process exited with code: ${exitCode}`, exitCode === 0 ? 'info' : 'warning');
        
    // Emit exit event
    this.emit('exit', { exitCode, sessionId: this.sessionId });
        
    // Attempt restart if configured
    if (this.options.restartOnExit && this.restartCount < this.options.maxRestarts) {
      this.scheduleRestart();
    } else {
      this.terminal.write('\r\n❓ Type "restart-shell" to create a new session\r\n');
    }
  }
    
  /**
     * Handle errors
     */
  handleError(message, error) {
    this.setState('error');
    this.errorCount++;
        
    const errorMsg = error?.message || error || 'Unknown error';
    const fullMessage = `${message}: ${errorMsg}`;
        
    this.log(fullMessage, 'error');
    this.terminal.write(`\r\n❌ ${fullMessage}\r\n`);
        
    // Track error for diagnostics
    if (this.options.enableDiagnostics) {
      this.diagnostics.errors.push({
        timestamp: Date.now(),
        message: fullMessage,
        error: error
      });
    }
        
    // Emit error event
    this.emit('error', { message: fullMessage, error, count: this.errorCount });
        
    // Suggest restart if too many errors
    if (this.errorCount >= 3) {
      this.terminal.write('\r\n🔄 Multiple errors detected. Consider restarting the shell.\r\n');
    }
  }
    
  /**
     * Schedule automatic restart
     */
  scheduleRestart() {
    this.restartCount++;
    this.lastRestart = Date.now();
        
    const delay = Math.min(1000 * Math.pow(2, this.restartCount - 1), 10000); // Exponential backoff
        
    this.terminal.write(`\r\n🔄 Restarting shell in ${Math.ceil(delay/1000)}s (attempt ${this.restartCount}/${this.options.maxRestarts})...\r\n`);
        
    setTimeout(() => {
      this.restart();
    }, delay);
  }
    
  /**
     * Restart the shell process
     */
  async restart() {
    this.log('Restarting shell process...', 'info');
        
    try {
      // Clean up current session
      await this.cleanup(false);
            
      // Reset state
      this.sessionId = null;
      this.errorCount = 0;
            
      // Initialize new session
      await this.init();
            
      this.terminal.write('\r\n✅ Shell restarted successfully\r\n');
      this.emit('restart', { attempt: this.restartCount, sessionId: this.sessionId });
            
    } catch (error) {
      this.handleError('Failed to restart shell', error);
    }
  }
    
  /**
     * Send welcome message
     */
  sendWelcomeMessage() {
    const uptime = Date.now() - this.startTime;
    this.terminal.write('\r\n🚀 RinaWarp Shell Session Started\r\n');
    this.terminal.write(`📊 Session: ${this.sessionId}\r\n`);
    this.terminal.write(`⚡ Ready in ${uptime}ms\r\n\r\n`);
  }
    
  /**
     * Check if this is the currently active tab
     */
  isCurrentTab() {
    return window.activeTabId === this.tabId || 
               document.querySelector(`[data-tab-id="${this.tabId}"]`)?.classList.contains('active');
  }
    
  /**
     * Set manager state
     */
  setState(newState) {
    const oldState = this.state;
    this.state = newState;
        
    this.log(`State changed: ${oldState} → ${newState}`, 'info');
        
    // Update UI indicators if available
    this.updateStateIndicators();
  }
    
  /**
     * Update UI state indicators
     */
  updateStateIndicators() {
    const indicator = document.querySelector(`[data-tab-id="${this.tabId}"] .shell-state`);
    if (indicator) {
      indicator.className = `shell-state state-${this.state}`;
      indicator.textContent = this.getStateEmoji();
    }
  }
    
  /**
     * Get emoji for current state
     */
  getStateEmoji() {
    const emojis = {
      idle: '⏸️',
      starting: '⏳',
      active: '🟢',
      error: '🔴',
      exited: '💀'
    };
    return emojis[this.state] || '❓';
  }
    
  /**
     * Start diagnostics monitoring
     */
  startDiagnosticsMonitoring() {
    // Monitor performance metrics
    setInterval(() => {
      if (this.state === 'active') {
        this.updatePerformanceMetrics();
      }
    }, 5000);
        
    this.log('Diagnostics monitoring started', 'info');
  }
    
  /**
     * Track received data for diagnostics
     */
  trackDataReceived(data) {
    // Track response patterns, command completions, etc.
    if (data.includes('$') || data.includes('#') || data.includes('>')) {
      // Likely a prompt - command completed
      if (this.lastCommandTime) {
        const responseTime = Date.now() - this.lastCommandTime;
        this.updateResponseTime(responseTime);
      }
    }
  }
    
  /**
     * Track command execution
     */
  trackCommand(data) {
    this.lastCommandTime = Date.now();
        
    this.diagnostics.commands.push({
      timestamp: this.lastCommandTime,
      command: data.trim(),
      tabId: this.tabId
    });
        
    this.diagnostics.performance.totalCommands++;
  }
    
  /**
     * Update response time metrics
     */
  updateResponseTime(responseTime) {
    const current = this.diagnostics.performance.avgResponseTime;
    const total = this.diagnostics.performance.totalCommands;
        
    this.diagnostics.performance.avgResponseTime = 
            (current * (total - 1) + responseTime) / total;
  }
    
  /**
     * Update performance metrics
     */
  updatePerformanceMetrics() {
    const now = Date.now();
    const sessionTime = now - this.startTime;
    const idleTime = this.lastActivity ? now - this.lastActivity : 0;
        
    // Update any performance UI elements
    const perfElement = document.querySelector(`#perf-${this.tabId}`);
    if (perfElement) {
      perfElement.innerHTML = `
                <div>Session: ${Math.round(sessionTime/1000)}s</div>
                <div>Idle: ${Math.round(idleTime/1000)}s</div>
                <div>Bytes: ↑${this.bytesWritten} ↓${this.bytesReceived}</div>
                <div>Avg Response: ${Math.round(this.diagnostics.performance.avgResponseTime)}ms</div>
            `;
    }
  }
    
  /**
     * Get current status for diagnostics
     */
  getStatus() {
    return {
      tabId: this.tabId,
      sessionId: this.sessionId,
      state: this.state,
      uptime: Date.now() - this.startTime,
      idleTime: this.lastActivity ? Date.now() - this.lastActivity : null,
      errorCount: this.errorCount,
      restartCount: this.restartCount,
      bytesWritten: this.bytesWritten,
      bytesReceived: this.bytesReceived,
      performance: this.diagnostics.performance,
      isActive: this.isCurrentTab()
    };
  }
    
  /**
     * Event emitter functionality
     */
  on(event, handler) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
  }
    
  emit(event, data) {
    if (this.handlers[event]) {
      this.handlers[event].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.log(`Event handler error for ${event}: ${error.message}`, 'error');
        }
      });
    }
  }
    
  /**
     * Cleanup resources
     */
  async cleanup(updateState = true) {
    this.log('Cleaning up shell process...', 'info');
        
    try {
      if (this.sessionId && window.electronAPI.closeShellProcess) {
        await window.electronAPI.closeShellProcess(this.sessionId);
      }
    } catch (error) {
      this.log(`Cleanup error: ${error.message}`, 'warning');
    }
        
    if (updateState) {
      this.setState('idle');
    }
        
    this.sessionId = null;
  }
    
  /**
     * Logging utility
     */
  log(message, level = 'info') {
    if (this.options.logLevel === 'silent') return;
        
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[ShellManager:${this.tabId}]`;
    const logMessage = `${prefix} ${message}`;
        
    // Use global logMessage if available, otherwise console
    if (window.logMessage) {
      window.logMessage(logMessage, level);
    } else {
      console[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log'](logMessage);
    }
  }
}


/**
 * Shell Manager Registry - Track all active managers
 */
export class ShellManagerRegistry {
  constructor() {
    this.managers = new Map();
  }
    
  register(tabId, manager) {
    this.managers.set(tabId, manager);
  }
    
  unregister(tabId) {
    const manager = this.managers.get(tabId);
    if (manager) {
      manager.cleanup();
      this.managers.delete(tabId);
    }
  }
    
  get(tabId) {
    return this.managers.get(tabId);
  }
    
  getActive() {
    return Array.from(this.managers.values()).filter(m => m.state === 'active');
  }
    
  getAll() {
    return Array.from(this.managers.values());
  }
    
  getStats() {
    const managers = this.getAll();
    return {
      total: managers.length,
      active: managers.filter(m => m.state === 'active').length,
      error: managers.filter(m => m.state === 'error').length,
      totalCommands: managers.reduce((sum, m) => sum + m.diagnostics.performance.totalCommands, 0),
      totalErrors: managers.reduce((sum, m) => sum + m.errorCount, 0)
    };
  }
}

// Global registry instance
export const shellRegistry = new ShellManagerRegistry();
