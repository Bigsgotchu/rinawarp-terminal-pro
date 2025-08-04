import logger from '../utils/logger.js';
/**
 * RinaWarp Terminal - Error Triage Dashboard
 * "Real-time Error Monitoring & System Health Visualization"
 *
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 */

import errorTriageSystem from '../utils/error-triage-system.js';
import { HeartbeatMonitor } from '../overlays/HeartbeatMonitor.js';
import { SystemVitals } from '../overlays/SystemVitals.js';
import { VoiceNarrator } from '../overlays/VoiceNarrator.js';

// Performance monitoring
const PERFORMANCE_THRESHOLD = 50; // ms
const ANIMATION_DURATION = 300; // ms

// Configuration defaults
const DEFAULT_CONFIG = {
  overlays: {
    heartbeat: true,
    systemVitals: true,
    voiceNarrator: false,
  },
  updateInterval: 2000,
  animations: true,
  performanceMode: 'auto',
};

class ErrorTriageDashboard {
  constructor() {
    this.isVisible = false;
    this.updateInterval = null;
    this.errorHistory = [];
    this.maxHistorySize = 100;
    this.config = { ...DEFAULT_CONFIG };

    // Initialize overlay modules
    this.overlays = {
      heartbeat: new HeartbeatMonitor(),
      systemVitals: new SystemVitals(),
      voiceNarrator: new VoiceNarrator(),
    };

    // Performance tracking
    this.lastUpdateTime = 0;
    this.updateTimes = [];
    this.maxUpdateTimes = 10;

    // Animation states
    this.animationFrameId = null;
    this.transitionState = null;
  }

  show() {
    if (this.isVisible) return;

    this.createDashboard();
    this.startOverlays();
    this.startRealTimeUpdates();
    this.isVisible = true;

    if (this.config.animations) {
      this.animateDashboard('show');
    }

    logger.debug('📊 Error Triage Dashboard shown');
  }

  hide() {
    if (!this.isVisible) return;

    this.stopRealTimeUpdates();
    this.stopOverlays();

    if (this.config.animations) {
      this.animateDashboard('hide');
    } else {
      this.removeDashboard();
    }

    this.isVisible = false;
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  createDashboard() {
    // Create dashboard container
    const dashboard = document.createElement('div');
    dashboard.id = 'error-triage-dashboard';
    dashboard.className = 'error-triage-dashboard';

    dashboard.innerHTML = `
      <div class="dashboard-header">
        <h3>🩺 Error Triage System</h3>
        <div class="dashboard-controls">
          <button class="btn-toggle-details" onclick="errorTriageDashboard.toggleDetails()">
            📊 Details
          </button>
          <button class="btn-clear-history" onclick="errorTriageDashboard.clearHistory()">
            🗑️ Clear
          </button>
          <button class="btn-export-data" onclick="errorTriageDashboard.exportData()">
            📥 Export
          </button>
          <button class="btn-close" onclick="errorTriageDashboard.hide()">
            ✕
          </button>
        </div>
      </div>
      
      <div class="dashboard-content">
        <div class="system-health-section">
          <h4>💚 System Health</h4>
          <div class="health-indicators">
            <div class="health-indicator" id="health-electron-api">
              <span class="indicator-label">Electron API</span>
              <span class="indicator-status">⏳</span>
            </div>
            <div class="health-indicator" id="health-node-api">
              <span class="indicator-label">Node API</span>
              <span class="indicator-status">⏳</span>
            </div>
            <div class="health-indicator" id="health-ipc">
              <span class="indicator-label">IPC Connection</span>
              <span class="indicator-status">⏳</span>
            </div>
            <div class="health-indicator" id="health-memory">
              <span class="indicator-label">Memory Usage</span>
              <span class="indicator-status">⏳</span>
            </div>
          </div>
        </div>

        <div class="error-summary-section">
          <h4>📈 Error Summary</h4>
          <div class="error-categories">
            <div class="error-category" id="category-c100">
              <span class="category-icon">✅</span>
              <span class="category-label">Critical Pass</span>
              <span class="category-count">0</span>
            </div>
            <div class="error-category" id="category-w200">
              <span class="category-icon">⚠️</span>
              <span class="category-label">Warning Only</span>
              <span class="category-count">0</span>
            </div>
            <div class="error-category" id="category-e300">
              <span class="category-icon">❌</span>
              <span class="category-label">Recoverable Fault</span>
              <span class="category-count">0</span>
            </div>
            <div class="error-category" id="category-f500">
              <span class="category-icon">🛑</span>
              <span class="category-label">Hard Failure</span>
              <span class="category-count">0</span>
            </div>
          </div>
        </div>

        <div class="recent-errors-section">
          <h4>⏱️ Recent Errors</h4>
          <div class="error-timeline" id="error-timeline">
            <div class="no-errors">No recent errors</div>
          </div>
        </div>

        <div class="detailed-view" id="detailed-view" style="display: none;">
          <h4>🔍 Detailed Information</h4>
          <div class="detail-tabs">
            <button class="tab-btn active" onclick="errorTriageDashboard.showTab('metrics')">
              📊 Metrics
            </button>
            <button class="tab-btn" onclick="errorTriageDashboard.showTab('recovery')">
              🛠️ Recovery
            </button>
            <button class="tab-btn" onclick="errorTriageDashboard.showTab('history')">
              📝 History
            </button>
          </div>
          
          <div class="tab-content">
            <div class="tab-pane active" id="tab-metrics">
              <div class="metrics-grid">
                <div class="metric-card">
                  <h5>⏱️ Response Time</h5>
                  <div class="metric-value" id="metric-response-time">0ms</div>
                </div>
                <div class="metric-card">
                  <h5>🔄 Recovery Rate</h5>
                  <div class="metric-value" id="metric-recovery-rate">0%</div>
                </div>
                <div class="metric-card">
                  <h5>📊 Error Rate</h5>
                  <div class="metric-value" id="metric-error-rate">0/min</div>
                </div>
                <div class="metric-card">
                  <h5>💾 Memory Usage</h5>
                  <div class="metric-value" id="metric-memory-usage">0MB</div>
                </div>
              </div>
            </div>
            
            <div class="tab-pane" id="tab-recovery">
              <div class="recovery-strategies">
                <div class="strategy-item">
                  <h6>🔄 IPC Reconnection</h6>
                  <div class="strategy-status">Ready</div>
                </div>
                <div class="strategy-item">
                  <h6>🎨 UI Recovery</h6>
                  <div class="strategy-status">Ready</div>
                </div>
                <div class="strategy-item">
                  <h6>⚡ Performance Reset</h6>
                  <div class="strategy-status">Ready</div>
                </div>
                <div class="strategy-item">
                  <h6>🚨 Emergency Mode</h6>
                  <div class="strategy-status">Standby</div>
                </div>
              </div>
            </div>
            
            <div class="tab-pane" id="tab-history">
              <div class="history-log" id="history-log">
                <div class="no-history">No error history available</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add styles
    this.addDashboardStyles();

    // Add to DOM
    document.body.appendChild(dashboard);

    // Initialize data
    this.updateDashboard();
  }

  addDashboardStyles() {
    const style = document.createElement('style');
    style.id = 'error-triage-dashboard-styles';
    style.textContent = `
      .error-triage-dashboard {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 400px;
        max-height: 80vh;
        background: rgba(0, 0, 0, 0.95);
        color: white;
        border: 1px solid #333;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        overflow-y: auto;
        backdrop-filter: blur(10px);
      }

      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: rgba(255, 255, 255, 0.05);
        border-bottom: 1px solid #333;
      }

      .dashboard-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
      }

      .dashboard-controls {
        display: flex;
        gap: 5px;
      }

      .dashboard-controls button {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 10px;
        transition: background 0.2s;
      }

      .dashboard-controls button:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .dashboard-content {
        padding: 12px;
      }

      .system-health-section,
      .error-summary-section,
      .recent-errors-section,
      .detailed-view {
        margin-bottom: 16px;
      }

      .system-health-section h4,
      .error-summary-section h4,
      .recent-errors-section h4,
      .detailed-view h4 {
        margin: 0 0 8px 0;
        font-size: 12px;
        color: #ccc;
      }

      .health-indicators {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .health-indicator {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        font-size: 10px;
      }

      .indicator-label {
        flex: 1;
      }

      .indicator-status {
        font-weight: 600;
      }

      .error-categories {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .error-category {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        font-size: 10px;
      }

      .category-icon {
        font-size: 12px;
      }

      .category-label {
        flex: 1;
      }

      .category-count {
        font-weight: 600;
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 6px;
        border-radius: 10px;
      }

      .error-timeline {
        max-height: 150px;
        overflow-y: auto;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        padding: 8px;
      }

      .error-entry {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 10px;
      }

      .error-entry:last-child {
        border-bottom: none;
      }

      .error-icon {
        font-size: 12px;
        margin-right: 6px;
      }

      .error-message {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .error-time {
        color: #999;
        font-size: 9px;
      }

      .no-errors,
      .no-history {
        text-align: center;
        color: #999;
        font-style: italic;
        padding: 20px;
      }

      .detail-tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 12px;
      }

      .tab-btn {
        background: rgba(255, 255, 255, 0.05);
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 10px;
        transition: all 0.2s;
      }

      .tab-btn.active {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
      }

      .tab-btn:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .tab-pane {
        display: none;
      }

      .tab-pane.active {
        display: block;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .metric-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        padding: 8px;
        text-align: center;
      }

      .metric-card h5 {
        margin: 0 0 4px 0;
        font-size: 10px;
        color: #ccc;
      }

      .metric-value {
        font-size: 14px;
        font-weight: 600;
        color: #4CAF50;
      }

      .recovery-strategies {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .strategy-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
      }

      .strategy-item h6 {
        margin: 0;
        font-size: 10px;
        color: #ccc;
      }

      .strategy-status {
        font-size: 10px;
        color: #4CAF50;
        font-weight: 600;
      }

      .history-log {
        max-height: 200px;
        overflow-y: auto;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        padding: 8px;
      }

      .history-entry {
        padding: 6px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 10px;
      }

      .history-entry:last-child {
        border-bottom: none;
      }

      .history-timestamp {
        color: #999;
        font-size: 9px;
      }

      .history-details {
        margin-top: 2px;
        color: #ccc;
      }
    `;

    document.head.appendChild(style);
  }

  removeDashboard() {
    const dashboard = document.getElementById('error-triage-dashboard');
    if (dashboard) {
      dashboard.remove();
    }

    const styles = document.getElementById('error-triage-dashboard-styles');
    if (styles) {
      styles.remove();
    }
  }

  startRealTimeUpdates() {
    this.updateInterval = setInterval(() => {
      const startTime = performance.now();

      this.updateDashboard();

      // Track performance
      const updateTime = performance.now() - startTime;
      this.trackUpdatePerformance(updateTime);

      // Adjust update frequency based on performance
      this.adjustUpdateFrequency();
    }, this.config.updateInterval);
  }

  stopRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  updateDashboard() {
    try {
      this.updateHealthStatus();
      this.updateErrorSummary();
      this.updateRecentErrors();
      this.updateMetrics();

      // Update overlay modules
      if (this.config.overlays.heartbeat) {
        this.overlays.heartbeat.update();
      }
      if (this.config.overlays.systemVitals) {
        this.overlays.systemVitals.update();
      }
      if (this.config.overlays.voiceNarrator) {
        this.overlays.voiceNarrator.update();
      }
    } catch (error) {
      console.error('Error updating dashboard:', error);
      this.handleUpdateError(error);
    }
  }

  updateHealthStatus() {
    const healthStatus = errorTriageSystem.getHealthStatus();

    // Update health indicators
    this.updateHealthIndicator('health-electron-api', healthStatus.electronAPI);
    this.updateHealthIndicator('health-node-api', healthStatus.nodeAPI);
    this.updateHealthIndicator('health-ipc', healthStatus.ipcConnection);
    this.updateHealthIndicator('health-memory', healthStatus.memoryUsage);
  }

  updateHealthIndicator(id, status) {
    const indicator = document.getElementById(id);
    if (!indicator) return;

    const statusElement = indicator.querySelector('.indicator-status');
    if (status === true) {
      statusElement.textContent = '✅';
      statusElement.style.color = '#4CAF50';
    } else if (status === false) {
      statusElement.textContent = '❌';
      statusElement.style.color = '#F44336';
    } else {
      statusElement.textContent = '⏳';
      statusElement.style.color = '#FF9800';
    }
  }

  updateErrorSummary() {
    const summary = errorTriageSystem.getErrorSummary();

    // Update category counts
    document.querySelector('#category-c100 .category-count').textContent =
      summary.categories.C100 || 0;
    document.querySelector('#category-w200 .category-count').textContent =
      summary.categories.W200 || 0;
    document.querySelector('#category-e300 .category-count').textContent =
      summary.categories.E300 || 0;
    document.querySelector('#category-f500 .category-count').textContent =
      summary.categories.F500 || 0;
  }

  updateRecentErrors() {
    const timeline = document.getElementById('error-timeline');
    if (!timeline) return;

    if (this.errorHistory.length === 0) {
      timeline.innerHTML = '<div class="no-errors">No recent errors</div>';
      return;
    }

    const recentErrors = this.errorHistory.slice(-10).reverse();
    timeline.innerHTML = recentErrors
      .map(
        error => `
      <div class="error-entry">
        <div>
          <span class="error-icon">${this.getCategoryIcon(error.category)}</span>
          <span class="error-message">${error.message}</span>
        </div>
        <div class="error-time">${this.formatTime(error.timestamp)}</div>
      </div>
    `
      )
      .join('');
  }

  updateMetrics() {
    const healthStatus = errorTriageSystem.getHealthStatus();
    const _summary = errorTriageSystem.getErrorSummary();

    // Update response time (mock calculation)
    const responseTime = Math.floor(Math.random() * 50) + 10;
    document.getElementById('metric-response-time').textContent = `${responseTime}ms`;

    // Update recovery rate (mock calculation)
    const recoveryRate = Math.floor(Math.random() * 30) + 85;
    document.getElementById('metric-recovery-rate').textContent = `${recoveryRate}%`;

    // Update error rate (mock calculation)
    const errorRate = Math.floor(Math.random() * 5);
    document.getElementById('metric-error-rate').textContent = `${errorRate}/min`;

    // Update memory usage
    if (healthStatus.memoryUsage) {
      const memoryMB = Math.floor(healthStatus.memoryUsage.used / 1024 / 1024);
      document.getElementById('metric-memory-usage').textContent = `${memoryMB}MB`;
    }
  }

  getCategoryIcon(category) {
    const icons = {
      C100: '✅',
      W200: '⚠️',
      E300: '❌',
      F500: '🛑',
    };
    return icons[category] || '❓';
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  addErrorToHistory(error) {
    this.errorHistory.push({
      timestamp: Date.now(),
      message: error.message || 'Unknown error',
      category: error.category || 'W200',
      subsystem: error.subsystem || 'unknown',
    });

    // Keep history size manageable
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  toggleDetails() {
    const detailsView = document.getElementById('detailed-view');
    if (detailsView.style.display === 'none') {
      detailsView.style.display = 'block';
    } else {
      detailsView.style.display = 'none';
    }
  }

  showTab(tabName, event) {
    // Hide all tabs
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(`tab-${tabName}`).classList.add('active');
    if (event && event.target) {
      event.target.classList.add('active');
    }
  }

  clearHistory() {
    this.errorHistory = [];
    this.updateRecentErrors();
  }

  exportData() {
    const data = {
      timestamp: new Date().toISOString(),
      healthStatus: errorTriageSystem.getHealthStatus(),
      errorSummary: errorTriageSystem.getErrorSummary(),
      errorHistory: this.errorHistory,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-triage-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // API for external integrations
  reportError(error, context) {
    this.addErrorToHistory({ ...error, ...context });
    if (this.isVisible) {
      this.updateDashboard();
    }
  }

  getStatus() {
    return {
      isVisible: this.isVisible,
      errorCount: this.errorHistory.length,
      healthStatus: errorTriageSystem.getHealthStatus(),
      errorSummary: errorTriageSystem.getErrorSummary(),
    };
  }

  // Overlay management
  startOverlays() {
    Object.entries(this.overlays).forEach(([key, overlay]) => {
      if (this.config.overlays[key]) {
        overlay.start();
      }
    });
  }

  stopOverlays() {
    Object.values(this.overlays).forEach(overlay => {
      overlay.stop();
    });
  }

  pauseOverlays() {
    Object.values(this.overlays).forEach(overlay => {
      if (typeof overlay.pause === 'function') {
        overlay.pause();
      }
    });
  }

  resumeOverlays() {
    Object.values(this.overlays).forEach(overlay => {
      if (typeof overlay.resume === 'function') {
        overlay.resume();
      }
    });
  }

  // Performance monitoring
  trackUpdatePerformance(updateTime) {
    this.updateTimes.push(updateTime);
    if (this.updateTimes.length > this.maxUpdateTimes) {
      this.updateTimes.shift();
    }
  }

  adjustUpdateFrequency() {
    if (this.config.performanceMode !== 'auto') return;

    const avgUpdateTime = this.updateTimes.reduce((a, b) => a + b, 0) / this.updateTimes.length;

    if (avgUpdateTime > PERFORMANCE_THRESHOLD) {
      this.config.updateInterval = Math.min(5000, this.config.updateInterval + 500);
      this.restartUpdates();
    } else if (avgUpdateTime < PERFORMANCE_THRESHOLD / 2 && this.config.updateInterval > 2000) {
      this.config.updateInterval = Math.max(2000, this.config.updateInterval - 500);
      this.restartUpdates();
    }
  }

  restartUpdates() {
    this.stopRealTimeUpdates();
    this.startRealTimeUpdates();
  }

  // Animation management
  animateDashboard(action) {
    const dashboard = document.getElementById('error-triage-dashboard');
    if (!dashboard) return;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const startTime = performance.now();
    const initialOpacity = action === 'show' ? 0 : 1;
    const targetOpacity = action === 'show' ? 1 : 0;

    dashboard.style.opacity = initialOpacity;

    const animate = currentTime => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

      dashboard.style.opacity = initialOpacity + (targetOpacity - initialOpacity) * progress;

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else if (action === 'hide') {
        this.removeDashboard();
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  // Configuration interface
  updateConfig(newConfig) {
    const oldConfig = { ...this.config };
    this.config = {
      ...this.config,
      ...newConfig,
      overlays: { ...this.config.overlays, ...newConfig.overlays },
    };

    // Handle overlay changes
    if (newConfig.overlays) {
      Object.entries(newConfig.overlays).forEach(([key, enabled]) => {
        if (enabled !== oldConfig.overlays[key]) {
          if (enabled) {
            this.overlays[key].start();
          } else {
            this.overlays[key].stop();
          }
        }
      });
    }

    // Handle update interval changes
    if (newConfig.updateInterval && newConfig.updateInterval !== oldConfig.updateInterval) {
      this.restartUpdates();
    }

    return this.config;
  }

  getConfig() {
    return { ...this.config };
  }

  // Error handling
  handleUpdateError(error) {
    this.reportError({
      message: `Dashboard update failed: ${error.message}`,
      category: 'E300',
      subsystem: 'dashboard',
    });

    // Attempt recovery
    this.pauseOverlays();
    setTimeout(() => {
      this.resumeOverlays();
    }, 5000);
  }

  // Cleanup
  cleanup() {
    this.stopRealTimeUpdates();
    this.stopOverlays();
    this.removeDashboard();

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Reset state
    this.isVisible = false;
    this.errorHistory = [];
    this.updateTimes = [];
    this.config = { ...DEFAULT_CONFIG };
  }
}

// Create global instance
const errorTriageDashboard = new ErrorTriageDashboard();

// Add keyboard shortcut to toggle dashboard
document.addEventListener('keydown', event => {
  if (event.ctrlKey && event.shiftKey && event.key === 'E') {
    errorTriageDashboard.toggle();
  }
});

// Export for global use
if (typeof window !== 'undefined') {
  window.errorTriageDashboard = errorTriageDashboard;
}

export default errorTriageDashboard;
