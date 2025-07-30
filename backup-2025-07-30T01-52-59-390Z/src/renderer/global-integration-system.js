/**
 * Global Integration System
 * Central coordination hub for all lifecycle management and process monitoring
 */

import { processLifecycleManager } from '../ai-services/process-lifecycle-manager.js';
import { createEnhancedShellManager } from './enhanced-shell-process-manager.js';
import { shellRegistry } from './shell-process-manager.js';

export class GlobalIntegrationSystem {
  constructor() {
    this.initialized = false;
    this.components = new Map();
    this.statusMonitor = null;
    this.performanceMonitor = null;
    this.healthDashboard = null;
        
    // Configuration
    this.config = {
      monitoring: {
        statusUpdateInterval: 5000,   // 5 seconds
        performanceInterval: 10000,   // 10 seconds
        healthCheckInterval: 30000,   // 30 seconds
      },
      ui: {
        showHealthIndicators: true,
        showPerformanceMetrics: true,
        enableNotifications: true
      },
      lifecycle: {
        autoRestart: true,
        maxRestarts: 5,
        enableResourceOptimization: true
      }
    };
        
    // Global event emitter
    this.eventBus = document.createElement('div');
  }

  /**
     * Initialize the global integration system
     */
  async initialize() {
    if (this.initialized) return;

    console.log('🚀 [GlobalIntegration] Initializing system...');
        
    try {
      // Register core components
      await this.registerCoreComponents();
            
      // Set up global event handlers
      this.setupGlobalEventHandlers();
            
      // Initialize monitoring systems
      this.initializeMonitoring();
            
      // Create UI components
      this.createHealthDashboard();
            
      // Register debug utilities
      this.registerDebugUtilities();
            
      // Set up cleanup handlers
      this.setupCleanupHandlers();
            
      this.initialized = true;
            
      console.log('✅ [GlobalIntegration] System initialized successfully');
      this.emitGlobalEvent('system:initialized');
            
    } catch (error) {
      console.error('❌ [GlobalIntegration] Failed to initialize:', error);
      throw error;
    }
  }

  /**
     * Register core components with the integration system
     */
  async registerCoreComponents() {
    // Register ProcessLifecycleManager
    this.components.set('processLifecycleManager', processLifecycleManager);
        
    // Register ShellRegistry
    this.components.set('shellRegistry', shellRegistry);
        
    // Register enhanced shell manager factory
    this.components.set('shellManagerFactory', createEnhancedShellManager);
        
    console.log('📦 [GlobalIntegration] Core components registered');
  }

  /**
     * Set up global event handlers for cross-component communication
     */
  setupGlobalEventHandlers() {
    // Process lifecycle events
    window.addEventListener('process:health-update', (event) => {
      this.handleProcessHealthUpdate(event.detail);
    });

    window.addEventListener('process:resource-alert', (event) => {
      this.handleResourceAlert(event.detail);
    });

    window.addEventListener('process:restart', (event) => {
      this.handleProcessRestart(event.detail);
    });

    // Terminal events
    window.addEventListener('terminal:ready', (event) => {
      this.handleTerminalReady(event.detail);
    });

    window.addEventListener('feature:loaded', (event) => {
      this.handleFeatureLoaded(event.detail);
    });

    // System events
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event);
    });

    window.addEventListener('beforeunload', () => {
      this.handleSystemShutdown();
    });

    console.log('🔗 [GlobalIntegration] Global event handlers configured');
  }

  /**
     * Initialize monitoring systems
     */
  initializeMonitoring() {
    // Status monitoring
    this.statusMonitor = setInterval(() => {
      this.updateSystemStatus();
    }, this.config.monitoring.statusUpdateInterval);

    // Performance monitoring
    this.performanceMonitor = setInterval(() => {
      this.updatePerformanceMetrics();
    }, this.config.monitoring.performanceInterval);

    console.log('📊 [GlobalIntegration] Monitoring systems started');
  }

  /**
     * Create health dashboard UI
     */
  createHealthDashboard() {
    if (!this.config.ui.showHealthIndicators) return;

    // Create dashboard container
    const dashboard = document.createElement('div');
    dashboard.id = 'rina-health-dashboard';
    dashboard.className = 'rina-health-dashboard';
        
    dashboard.innerHTML = `
            <div class="dashboard-header">
                <h3>🦾 RinaWarp System Health</h3>
                <button id="toggle-dashboard" class="dashboard-toggle">−</button>
            </div>
            <div class="dashboard-content">
                <div class="health-section">
                    <h4>Process Lifecycle</h4>
                    <div id="process-health-indicators"></div>
                </div>
                <div class="performance-section">
                    <h4>Performance Metrics</h4>
                    <div id="performance-metrics"></div>
                </div>
                <div class="alerts-section">
                    <h4>Recent Alerts</h4>
                    <div id="system-alerts"></div>
                </div>
            </div>
        `;

    // Add CSS styles
    this.addDashboardStyles();
        
    // Position dashboard
    dashboard.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            background: rgba(10, 10, 10, 0.95);
            border: 1px solid #00ff88;
            border-radius: 8px;
            z-index: 10000;
            font-family: 'SF Mono', monospace;
            font-size: 12px;
            color: #00ff88;
        `;

    // Add toggle functionality
    dashboard.querySelector('#toggle-dashboard').addEventListener('click', () => {
      const content = dashboard.querySelector('.dashboard-content');
      const toggle = dashboard.querySelector('#toggle-dashboard');
            
      if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '−';
      } else {
        content.style.display = 'none';
        toggle.textContent = '+';
      }
    });

    document.body.appendChild(dashboard);
    this.healthDashboard = dashboard;

    console.log('🎛️ [GlobalIntegration] Health dashboard created');
  }

  /**
     * Add CSS styles for the dashboard
     */
  addDashboardStyles() {
    const styleId = 'rina-dashboard-styles';
    if (document.getElementById(styleId)) return;

    const styles = document.createElement('style');
    styles.id = styleId;
    styles.textContent = `
            .rina-health-dashboard {
                backdrop-filter: blur(10px);
            }
            
            .dashboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                border-bottom: 1px solid #00ff88;
            }
            
            .dashboard-header h3 {
                margin: 0;
                font-size: 14px;
            }
            
            .dashboard-toggle {
                background: none;
                border: 1px solid #00ff88;
                color: #00ff88;
                cursor: pointer;
                padding: 2px 8px;
                border-radius: 3px;
                font-family: monospace;
            }
            
            .dashboard-toggle:hover {
                background: rgba(0, 255, 136, 0.1);
            }
            
            .dashboard-content {
                padding: 10px;
                max-height: 400px;
                overflow-y: auto;
            }
            
            .health-section, .performance-section, .alerts-section {
                margin-bottom: 15px;
            }
            
            .health-section h4, .performance-section h4, .alerts-section h4 {
                margin: 0 0 5px 0;
                font-size: 12px;
                color: #ffaa00;
            }
            
            .health-indicator {
                display: flex;
                justify-content: space-between;
                padding: 2px 0;
                border-bottom: 1px solid rgba(0, 255, 136, 0.2);
            }
            
            .metric-item {
                display: flex;
                justify-content: space-between;
                padding: 2px 0;
            }
            
            .alert-item {
                padding: 5px;
                margin: 2px 0;
                background: rgba(255, 107, 107, 0.1);
                border-left: 3px solid #ff6b6b;
                border-radius: 3px;
                font-size: 10px;
            }
            
            .alert-timestamp {
                color: #888;
                font-size: 9px;
            }
        `;
        
    document.head.appendChild(styles);
  }

  /**
     * Handle process health updates
     */
  handleProcessHealthUpdate(detail) {
    console.log('🔍 [GlobalIntegration] Process health update:', detail);
        
    // Update dashboard
    if (this.healthDashboard) {
      this.updateProcessHealthDisplay(detail);
    }
        
    // Emit to event bus
    this.emitGlobalEvent('integration:health-update', detail);
  }

  /**
     * Handle resource alerts
     */
  handleResourceAlert(alert) {
    console.warn('⚠️ [GlobalIntegration] Resource alert:', alert);
        
    // Show notification if enabled
    if (this.config.ui.enableNotifications) {
      this.showNotification('Resource Alert', 
        `High ${alert.resourceType} usage: ${Math.round(alert.value / 1024 / 1024)}MB`);
    }
        
    // Update dashboard
    this.addAlertToDashboard(alert);
        
    // Emit to event bus
    this.emitGlobalEvent('integration:resource-alert', alert);
  }

  /**
     * Handle process restart events
     */
  handleProcessRestart(detail) {
    console.log('🔄 [GlobalIntegration] Process restart:', detail);
        
    // Update performance metrics
    this.updatePerformanceMetrics();
        
    // Emit to event bus
    this.emitGlobalEvent('integration:process-restart', detail);
  }

  /**
     * Handle terminal ready event
     */
  handleTerminalReady(detail) {
    console.log('✅ [GlobalIntegration] Terminal ready:', detail);
        
    // Initialize enhanced shell manager for the terminal
    this.initializeTerminalIntegration(detail);
        
    // Emit to event bus
    this.emitGlobalEvent('integration:terminal-ready', detail);
  }

  /**
     * Handle feature loaded event
     */
  handleFeatureLoaded(detail) {
    console.log('🧩 [GlobalIntegration] Feature loaded:', detail);
        
    // Update system status
    this.updateSystemStatus();
        
    // Emit to event bus
    this.emitGlobalEvent('integration:feature-loaded', detail);
  }

  /**
     * Handle global errors
     */
  handleGlobalError(event) {
    console.error('💥 [GlobalIntegration] Global error:', event.error);
        
    // Add to alert system
    this.addAlertToDashboard({
      type: 'error',
      message: event.error.message,
      timestamp: Date.now()
    });
        
    // Emit to event bus
    this.emitGlobalEvent('integration:global-error', {
      message: event.error.message,
      stack: event.error.stack
    });
  }

  /**
     * Handle system shutdown
     */
  handleSystemShutdown() {
    console.log('🛑 [GlobalIntegration] System shutdown initiated');
        
    // Cleanup all components
    this.cleanup();
  }

  /**
     * Initialize terminal integration
     */
  async initializeTerminalIntegration(_terminalDetail) {
    try {
      // This would typically be called when a new terminal tab is created
      // For now, we'll set up integration for existing terminals
            
      console.log('🔗 [GlobalIntegration] Setting up terminal integration');
            
      // The enhanced shell manager will be created when needed
      // by the terminal system using our registered factory
            
    } catch (error) {
      console.error('❌ [GlobalIntegration] Terminal integration failed:', error);
    }
  }

  /**
     * Update system status
     */
  updateSystemStatus() {
    try {
      const status = {
        timestamp: Date.now(),
        processes: processLifecycleManager.getAllProcessStatuses(),
        shells: shellRegistry.getStats(),
        system: {
          uptime: Date.now() - (window.RinaWarpStartTime || Date.now()),
          memoryUsage: performance.memory ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
          } : null
        }
      };
            
      // Update dashboard
      if (this.healthDashboard) {
        this.updateSystemStatusDisplay(status);
      }
            
      // Emit status update
      this.emitGlobalEvent('integration:status-update', status);
            
    } catch (error) {
      console.error('❌ [GlobalIntegration] Status update failed:', error);
    }
  }

  /**
     * Update performance metrics
     */
  updatePerformanceMetrics() {
    try {
      const metrics = {
        timestamp: Date.now(),
        shells: shellRegistry.getAll().map(shell => ({
          tabId: shell.tabId,
          sessionId: shell.sessionId,
          state: shell.state,
          uptime: shell.startTime ? Date.now() - shell.startTime : 0,
          commands: shell.diagnostics.performance.totalCommands,
          avgResponseTime: shell.diagnostics.performance.avgResponseTime,
          errorCount: shell.errorCount
        })),
        system: {
          activeProcesses: processLifecycleManager.processes.size,
          totalRestarts: Array.from(processLifecycleManager.processes.values())
            .reduce((sum, p) => sum + (p.restartCount || 0), 0)
        }
      };
            
      // Update dashboard
      if (this.healthDashboard) {
        this.updatePerformanceMetricsDisplay(metrics);
      }
            
      // Emit metrics update
      this.emitGlobalEvent('integration:metrics-update', metrics);
            
    } catch (error) {
      console.error('❌ [GlobalIntegration] Performance metrics update failed:', error);
    }
  }

  /**
     * Update process health display in dashboard
     */
  updateProcessHealthDisplay(detail) {
    const container = this.healthDashboard.querySelector('#process-health-indicators');
    if (!container) return;
        
    let indicator = container.querySelector(`[data-process-id="${detail.processId}"]`);
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'health-indicator';
      indicator.setAttribute('data-process-id', detail.processId);
      container.appendChild(indicator);
    }
        
    const statusEmoji = detail.status === 'healthy' ? '💚' : 
      detail.status === 'unhealthy' ? '💛' : '❤️';
        
    indicator.innerHTML = `
            <span>${detail.processId}</span>
            <span>${statusEmoji} ${detail.status}</span>
        `;
  }

  /**
     * Update system status display
     */
  updateSystemStatusDisplay(status) {
    const container = this.healthDashboard.querySelector('#performance-metrics');
    if (!container) return;
        
    const uptimeHours = Math.round(status.system.uptime / 1000 / 3600 * 100) / 100;
    const memInfo = status.system.memoryUsage;
        
    container.innerHTML = `
            <div class="metric-item">
                <span>Uptime:</span>
                <span>${uptimeHours}h</span>
            </div>
            <div class="metric-item">
                <span>Active Shells:</span>
                <span>${status.shells.active}/${status.shells.total}</span>
            </div>
            <div class="metric-item">
                <span>Total Commands:</span>
                <span>${status.shells.totalCommands}</span>
            </div>
            ${memInfo ? `
                <div class="metric-item">
                    <span>Memory:</span>
                    <span>${memInfo.used}MB/${memInfo.total}MB</span>
                </div>
            ` : ''}
        `;
  }

  /**
     * Update performance metrics display
     */
  updatePerformanceMetricsDisplay(_metrics) {
    // This updates the performance section of the dashboard
    // Implementation would show detailed performance data
  }

  /**
     * Add alert to dashboard
     */
  addAlertToDashboard(alert) {
    const container = this.healthDashboard?.querySelector('#system-alerts');
    if (!container) return;
        
    const alertElement = document.createElement('div');
    alertElement.className = 'alert-item';
        
    const timestamp = new Date(alert.timestamp || Date.now()).toLocaleTimeString();
        
    alertElement.innerHTML = `
            <div>${alert.type || 'alert'}: ${alert.message}</div>
            <div class="alert-timestamp">${timestamp}</div>
        `;
        
    container.insertBefore(alertElement, container.firstChild);
        
    // Keep only last 10 alerts
    while (container.children.length > 10) {
      container.removeChild(container.lastChild);
    }
  }

  /**
     * Show system notification
     */
  showNotification(title, message) {
    if ('Notification' in window && window.Notification.permission === 'granted') {
      new window.Notification(title, {
        body: message, 
        icon: '/favicon.ico' 
      });
    } else {
      // Fallback to console or custom notification
      console.log(`🔔 [${title}] ${message}`);
    }
  }

  /**
     * Register debug utilities
     */
  registerDebugUtilities() {
    if (typeof window === 'undefined') return;
        
    window.RinaWarpIntegration = {
      // System status
      getSystemStatus: () => {
        return {
          processes: processLifecycleManager.getAllProcessStatuses(),
          shells: shellRegistry.getStats(),
          components: Array.from(this.components.keys())
        };
      },
            
      // Component access
      getComponent: (name) => this.components.get(name),
            
      // Event system
      emitEvent: (type, data) => this.emitGlobalEvent(type, data),
            
      // Dashboard control
      toggleDashboard: () => {
        const toggle = this.healthDashboard?.querySelector('#toggle-dashboard');
        toggle?.click();
      },
            
      // Cleanup utilities
      cleanup: () => this.cleanup(),
            
      // Configuration
      config: this.config
    };
        
    console.log('🛠️ [GlobalIntegration] Debug utilities registered');
  }

  /**
     * Set up cleanup handlers
     */
  setupCleanupHandlers() {
    // Register with process lifecycle manager
    processLifecycleManager.onCleanup(async () => {
      console.log('🧹 [GlobalIntegration] Running integration cleanup...');
      this.cleanup();
    });
  }

  /**
     * Emit global event
     */
  emitGlobalEvent(type, data) {
    const event = new CustomEvent(type, { detail: data });
    this.eventBus.dispatchEvent(event);
    window.dispatchEvent(event);
  }

  /**
     * Clean up the integration system
     */
  cleanup() {
    console.log('🧹 [GlobalIntegration] Cleaning up...');
        
    // Clear monitoring intervals
    if (this.statusMonitor) {
      clearInterval(this.statusMonitor);
      this.statusMonitor = null;
    }
        
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor);
      this.performanceMonitor = null;
    }
        
    // Remove dashboard
    if (this.healthDashboard && this.healthDashboard.parentNode) {
      this.healthDashboard.parentNode.removeChild(this.healthDashboard);
      this.healthDashboard = null;
    }
        
    // Clear components
    this.components.clear();
        
    // Remove debug utilities
    if (typeof window !== 'undefined') {
      delete window.RinaWarpIntegration;
    }
        
    this.initialized = false;
        
    console.log('✅ [GlobalIntegration] Cleanup complete');
  }

  /**
     * Get current system health summary
     */
  getHealthSummary() {
    const processStatuses = processLifecycleManager.getAllProcessStatuses();
    const shellStats = shellRegistry.getStats();
        
    const healthyProcesses = Object.values(processStatuses)
      .filter(p => p.status === 'healthy').length;
    const totalProcesses = Object.keys(processStatuses).length;
        
    return {
      overall: healthyProcesses === totalProcesses ? 'healthy' : 'degraded',
      processes: {
        healthy: healthyProcesses,
        total: totalProcesses
      },
      shells: shellStats,
      uptime: Date.now() - (window.RinaWarpStartTime || Date.now())
    };
  }
}

// Create and export global instance
export const globalIntegrationSystem = new GlobalIntegrationSystem();

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  // Set start time for uptime calculation
  window.RinaWarpStartTime = Date.now();
    
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      globalIntegrationSystem.initialize().catch(console.error);
    });
  } else {
    globalIntegrationSystem.initialize().catch(console.error);
  }
}

export default globalIntegrationSystem;
