/**
 * RinaWarp Terminal - Error Triage System
 * "Catch, Categorize, Cure" - Medical-grade error handling
 * 
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 */

class ErrorTriageSystem {
  constructor() {
    this.errors = new Map();
    this.categories = {
      C100: { name: 'Critical Pass', severity: 'info', color: '✅' },
      W200: { name: 'Warning Only', severity: 'warning', color: '⚠️' },
      E300: { name: 'Recoverable Fault', severity: 'error', color: '❌' },
      F500: { name: 'Hard Failure', severity: 'critical', color: '🛑' }
    };
    
    this.retryStrategies = new Map();
    this.fallbackHandlers = new Map();
    this.healthMonitors = new Map();
    
    this.setupRetryStrategies();
    this.setupFallbackHandlers();
    this.initializeHealthMonitoring();
    
    console.log('🩺 Error Triage System initialized - Ready for diagnosis');
  }

  /**
   * Main triage entry point - like emergency room intake
   */
  async triage(error, context = {}) {
    const triageId = this.generateTriageId();
    const timestamp = new Date().toISOString();
    
    try {
      // Stage 1: Detection & Initial Assessment
      const detection = this.detectError(error, context);
      
      // Stage 2: Categorization
      const category = this.categorizeError(detection);
      
      // Stage 3: Route to resolution
      const resolution = await this.routeToResolution(category, detection);
      
      // Stage 4: Monitor status
      this.monitorStatus(triageId, category, resolution);
      
      // Log comprehensive triage report
      this.logTriageReport(triageId, {
        timestamp,
        detection,
        category,
        resolution,
        context
      });
      
      return {
        triageId,
        category: category.code,
        severity: category.severity,
        resolution: resolution.action,
        success: resolution.success
      };
      
    } catch (triageError) {
      console.error('🚨 Triage system failure:', triageError);
      return this.emergencyFallback(error, context);
    }
  }

  /**
   * Stage 1: Detection - Gather all diagnostic information
   */
  detectError(error, context) {
    return {
      message: error.message || 'Unknown error',
      stack: error.stack,
      name: error.name || 'Error',
      code: error.code,
      origin: this.detectOrigin(error, context),
      subsystem: context.subsystem || 'unknown',
      component: context.component || 'unknown',
      operationContext: context.operation || 'unknown',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'Node.js',
      timestamp: new Date().toISOString(),
      processInfo: this.getProcessInfo()
    };
  }

  detectOrigin(error, context) {
    if (error.stack) {
      const stackLines = error.stack.split('\n');
      const relevantLine = stackLines.find(line => 
        line.includes('rinawarp-terminal') || 
        line.includes('src/') ||
        line.includes('renderer/')
      );
      
      if (relevantLine) {
        const match = relevantLine.match(/at\s+(.+)\s+\((.+):(\d+):(\d+)\)/);
        if (match) {
          return {
            function: match[1],
            file: match[2],
            line: parseInt(match[3]),
            column: parseInt(match[4])
          };
        }
      }
    }
    
    return {
      function: context.function || 'unknown',
      file: context.file || 'unknown',
      line: context.line || 0,
      column: context.column || 0
    };
  }

  /**
   * Stage 2: Categorization - Assign error codes like medical diagnosis
   */
  categorizeError(detection) {
    const { message, code, subsystem, component } = detection;
    
    // Critical Pass - Everything working
    if (message.includes('success') || message.includes('✅')) {
      return { code: 'C100', ...this.categories.C100 };
    }
    
    // Hard Failure - System-breaking issues
    if (this.isHardFailure(detection)) {
      return { code: 'F500', ...this.categories.F500 };
    }
    
    // Recoverable Fault - Can be retried/fixed
    if (this.isRecoverableFault(detection)) {
      return { code: 'E300', ...this.categories.E300 };
    }
    
    // Warning Only - Non-blocking issues
    return { code: 'W200', ...this.categories.W200 };
  }

  isHardFailure(detection) {
    const hardFailurePatterns = [
      /electron.*not.*found/i,
      /cannot.*access.*main.*process/i,
      /preload.*script.*failed/i,
      /contextbridge.*undefined/i,
      /fatal.*error/i,
      /segmentation.*fault/i,
      /out.*of.*memory/i
    ];
    
    return hardFailurePatterns.some(pattern => 
      pattern.test(detection.message) || 
      pattern.test(detection.stack)
    );
  }

  isRecoverableFault(detection) {
    const recoverablePatterns = [
      /ipc.*failed/i,
      /connection.*refused/i,
      /timeout/i,
      /network.*error/i,
      /resource.*not.*found/i,
      /permission.*denied/i,
      /file.*not.*found/i
    ];
    
    return recoverablePatterns.some(pattern => 
      pattern.test(detection.message)
    );
  }

  /**
   * Stage 3: Route to Resolution - Medical treatment plan
   */
  async routeToResolution(category, detection) {
    const { code } = category;
    
    switch (code) {
      case 'C100':
        return await this.handleCriticalPass(detection);
      case 'W200':
        return await this.handleWarningOnly(detection);
      case 'E300':
        return await this.handleRecoverableFault(detection);
      case 'F500':
        return await this.handleHardFailure(detection);
      default:
        return await this.handleUnknownError(detection);
    }
  }

  async handleCriticalPass(detection) {
    return {
      action: 'monitor',
      success: true,
      message: 'System operating normally',
      recommendation: 'Continue monitoring'
    };
  }

  async handleWarningOnly(detection) {
    const fallbackAction = this.fallbackHandlers.get(detection.subsystem);
    
    if (fallbackAction) {
      try {
        await fallbackAction(detection);
        return {
          action: 'fallback_applied',
          success: true,
          message: 'Fallback strategy applied successfully',
          recommendation: 'Monitor for stability'
        };
      } catch (fallbackError) {
        console.warn('Fallback failed:', fallbackError);
      }
    }
    
    return {
      action: 'logged',
      success: true,
      message: 'Warning logged, system continues',
      recommendation: 'Review logs periodically'
    };
  }

  async handleRecoverableFault(detection) {
    const retryStrategy = this.retryStrategies.get(detection.subsystem);
    
    if (retryStrategy) {
      try {
        const result = await retryStrategy(detection);
        return {
          action: 'retry_successful',
          success: true,
          message: 'Error resolved through retry',
          recommendation: 'Monitor for recurrence'
        };
      } catch (retryError) {
        console.error('Retry failed:', retryError);
      }
    }
    
    // Fall back to showing user-friendly error
    return {
      action: 'user_notification',
      success: false,
      message: 'Recoverable error - user notified',
      recommendation: 'Implement specific retry logic'
    };
  }

  async handleHardFailure(detection) {
    // Log critical error
    console.error('🛑 CRITICAL SYSTEM FAILURE:', detection);
    
    // Attempt emergency recovery
    try {
      await this.emergencyRecovery(detection);
      return {
        action: 'emergency_recovery',
        success: true,
        message: 'Emergency recovery successful',
        recommendation: 'Full system diagnostics required'
      };
    } catch (recoveryError) {
      return {
        action: 'system_halt',
        success: false,
        message: 'System requires manual intervention',
        recommendation: 'Contact support immediately'
      };
    }
  }

  /**
   * Setup retry strategies for different subsystems
   */
  setupRetryStrategies() {
    // IPC Retry Strategy
    this.retryStrategies.set('ipc', async (detection) => {
      console.log('🔄 Attempting IPC reconnection...');
      
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (window.electronAPI) {
        const testResult = await window.electronAPI.ping();
        if (testResult === 'pong') {
          console.log('✅ IPC reconnection successful');
          return true;
        }
      }
      
      throw new Error('IPC retry failed');
    });

    // UI Subsystem Retry
    this.retryStrategies.set('ui', async (detection) => {
      console.log('🔄 Attempting UI recovery...');
      
      // Reload stylesheets
      const links = document.querySelectorAll('link[rel="stylesheet"]');
      links.forEach(link => {
        const href = link.href;
        link.href = href + '?reload=' + Date.now();
      });
      
      // Wait for styles to load
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('✅ UI recovery completed');
      return true;
    });

    // Performance Monitor Retry
    this.retryStrategies.set('performance', async (detection) => {
      console.log('🔄 Attempting performance monitor restart...');
      
      if (window.nodeAPI && window.nodeAPI.performanceMonitor) {
        try {
          const health = await window.nodeAPI.performanceMonitor.getSystemHealth();
          if (health) {
            console.log('✅ Performance monitor reconnected');
            return true;
          }
        } catch (error) {
          console.warn('Performance monitor still unavailable');
        }
      }
      
      throw new Error('Performance monitor retry failed');
    });
  }

  /**
   * Setup fallback handlers for graceful degradation
   */
  setupFallbackHandlers() {
    // CSS Feature Fallback
    this.fallbackHandlers.set('css', async (detection) => {
      console.log('🎨 Applying CSS fallbacks...');
      
      // Add fallback classes
      document.body.classList.add('legacy-css-support');
      
      // Inject fallback styles
      const fallbackCSS = `
        .legacy-css-support .backdrop-blur {
          background: rgba(0, 0, 0, 0.8) !important;
        }
        .legacy-css-support .grid-container {
          display: flex !important;
          flex-wrap: wrap !important;
        }
      `;
      
      const style = document.createElement('style');
      style.textContent = fallbackCSS;
      document.head.appendChild(style);
      
      console.log('✅ CSS fallbacks applied');
    });

    // Analytics Fallback
    this.fallbackHandlers.set('analytics', async (detection) => {
      console.log('📊 Switching to local analytics...');
      
      // Use local storage for analytics
      window.localAnalytics = {
        track: (event, data) => {
          const events = JSON.parse(localStorage.getItem('local_analytics') || '[]');
          events.push({ event, data, timestamp: Date.now() });
          localStorage.setItem('local_analytics', JSON.stringify(events.slice(-100)));
        }
      };
      
      console.log('✅ Local analytics fallback active');
    });
  }

  /**
   * Stage 4: Monitor Status - Continuous health monitoring
   */
  initializeHealthMonitoring() {
    // System Health Check
    this.healthMonitors.set('system', () => {
      const health = {
        timestamp: Date.now(),
        electronAPI: !!window.electronAPI,
        nodeAPI: !!window.nodeAPI,
        processAPI: !!window.processAPI,
        ipcConnection: this.testIPCConnection(),
        memoryUsage: this.getMemoryUsage(),
        errorCount: this.errors.size
      };
      
      return health;
    });

    // Start health monitoring
    setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  async performHealthCheck() {
    const health = this.healthMonitors.get('system')();
    
    // Check for critical issues
    if (!health.electronAPI || !health.nodeAPI) {
      await this.triage(new Error('Critical API missing'), {
        subsystem: 'ipc',
        component: 'api-bridge',
        operation: 'health-check'
      });
    }
    
    // Log health status
    if (health.errorCount > 10) {
      console.warn('⚠️ High error count detected:', health.errorCount);
    } else {
      console.log('💚 System health: Good');
    }
  }

  /**
   * Emergency Recovery Procedures
   */
  async emergencyRecovery(detection) {
    console.log('🚨 Initiating emergency recovery...');
    
    // Step 1: Save current state
    this.saveEmergencyState();
    
    // Step 2: Reset to safe mode
    await this.resetToSafeMode();
    
    // Step 3: Reinitialize core systems
    await this.reinitializeCoreystems();
    
    console.log('🏥 Emergency recovery completed');
  }

  saveEmergencyState() {
    const state = {
      timestamp: Date.now(),
      errors: Array.from(this.errors.entries()),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    localStorage.setItem('emergency_state', JSON.stringify(state));
  }

  async resetToSafeMode() {
    // Clear problematic elements
    const problematicElements = document.querySelectorAll('.phase2-ui, .enhanced-terminal');
    problematicElements.forEach(el => el.style.display = 'none');
    
    // Reset to basic terminal
    document.body.className = 'safe-mode';
  }

  async reinitializeCoreystems() {
    // Reinitialize basic IPC
    if (window.electronAPI) {
      try {
        await window.electronAPI.ping();
        console.log('✅ IPC restored');
      } catch (error) {
        console.error('❌ IPC still unavailable');
      }
    }
  }

  /**
   * Utility methods
   */
  generateTriageId() {
    return `triage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getProcessInfo() {
    return {
      platform: typeof window !== 'undefined' ? 'renderer' : 'main',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'Node.js',
      memory: this.getMemoryUsage(),
      timestamp: Date.now()
    };
  }

  getMemoryUsage() {
    if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
      return {
        used: window.performance.memory.usedJSHeapSize,
        total: window.performance.memory.totalJSHeapSize,
        limit: window.performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  testIPCConnection() {
    return new Promise((resolve) => {
      if (window.electronAPI && window.electronAPI.ping) {
        window.electronAPI.ping()
          .then(() => resolve(true))
          .catch(() => resolve(false));
      } else {
        resolve(false);
      }
    });
  }

  logTriageReport(triageId, report) {
    const logLevel = this.getLogLevel(report.category.code);
    const message = `${report.category.color} [${report.category.code}] ${report.detection.message}`;
    
    console[logLevel](`🩺 Triage Report [${triageId}]:`, {
      category: report.category.name,
      severity: report.category.severity,
      resolution: report.resolution.action,
      subsystem: report.detection.subsystem,
      component: report.detection.component,
      timestamp: report.timestamp
    });
  }

  getLogLevel(code) {
    switch (code) {
      case 'C100': return 'log';
      case 'W200': return 'warn';
      case 'E300': return 'error';
      case 'F500': return 'error';
      default: return 'log';
    }
  }

  emergencyFallback(error, context) {
    console.error('🚨 Emergency fallback activated:', error);
    return {
      triageId: 'emergency_' + Date.now(),
      category: 'F500',
      severity: 'critical',
      resolution: 'emergency_fallback',
      success: false
    };
  }

  /**
   * Public API for external systems
   */
  async reportError(error, context) {
    return await this.triage(error, context);
  }

  getHealthStatus() {
    return this.healthMonitors.get('system')();
  }

  getErrorSummary() {
    const summary = {
      total: this.errors.size,
      categories: {}
    };
    
    Object.keys(this.categories).forEach(code => {
      summary.categories[code] = 0;
    });
    
    this.errors.forEach(error => {
      const category = error.category || 'unknown';
      summary.categories[category] = (summary.categories[category] || 0) + 1;
    });
    
    return summary;
  }
}

// Global error handler integration
class GlobalErrorHandler {
  constructor(triageSystem) {
    this.triage = triageSystem;
    this.setupGlobalHandlers();
  }

  setupGlobalHandlers() {
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.triage.reportError(event.reason, {
        subsystem: 'promise',
        component: 'global-handler',
        operation: 'unhandled-rejection'
      });
    });

    // Global JavaScript errors
    window.addEventListener('error', (event) => {
      this.triage.reportError(event.error, {
        subsystem: 'javascript',
        component: 'global-handler',
        operation: 'uncaught-exception',
        file: event.filename,
        line: event.lineno,
        column: event.colno
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.triage.reportError(new Error(`Resource failed to load: ${event.target.src || event.target.href}`), {
          subsystem: 'resources',
          component: 'asset-loader',
          operation: 'resource-load'
        });
      }
    }, true);
  }
}

// Initialize and export
const errorTriageSystem = new ErrorTriageSystem();
const globalErrorHandler = new GlobalErrorHandler(errorTriageSystem);

// Enhanced console methods with triage integration
const originalConsoleError = console.error;
console.error = function(...args) {
  originalConsoleError.apply(console, args);
  
  // If first argument is an error object, triage it
  if (args[0] instanceof Error) {
    errorTriageSystem.reportError(args[0], {
      subsystem: 'console',
      component: 'error-log',
      operation: 'manual-log'
    });
  }
};

// Enhanced API for external integrations
const triageError = (error, context) => errorTriageSystem.reportError(error, context);
const monitorSystemHealth = (config = {}) => {
  const { interval = 30000, modules = [] } = config;
  
  console.log(`🩺 Starting system health monitoring (${interval}ms interval)`);
  
  const monitorInterval = setInterval(async () => {
    const healthStatus = errorTriageSystem.getHealthStatus();
    const errorSummary = errorTriageSystem.getErrorSummary();
    
    // Check specific modules if provided
    if (modules.length > 0) {
      modules.forEach(module => {
        const moduleHealthy = checkModuleHealth(module);
        if (!moduleHealthy) {
          errorTriageSystem.reportError(new Error(`Module ${module} health check failed`), {
            subsystem: 'monitoring',
            component: 'health-check',
            operation: 'module-check',
            module: module,
            severity: 'warning'
          });
        }
      });
    }
    
    // Log health summary
    if (healthStatus.errorCount > 10) {
      console.warn('⚠️ High error count detected:', healthStatus.errorCount);
    } else {
      console.log('💚 System health: Good');
    }
  }, interval);
  
  return monitorInterval;
};

const simulateFault = async (config = {}) => {
  const { type, severity = 'medium', module = 'unknown' } = config;
  
  console.log(`🧪 Simulating fault: ${type} (${severity}) in ${module}`);
  
  let simulatedError;
  switch (type) {
    case 'ipc':
      simulatedError = new Error('Simulated IPC connection timeout');
      break;
    case 'css':
      simulatedError = new Error('Simulated CSS feature not supported');
      break;
    case 'ui':
      simulatedError = new Error('Simulated UI component render failure');
      break;
    case 'performance':
      simulatedError = new Error('Simulated performance threshold exceeded');
      break;
    default:
      simulatedError = new Error(`Simulated ${type} error`);
  }
  
  const result = await errorTriageSystem.reportError(simulatedError, {
    subsystem: type,
    component: 'simulator',
    operation: 'fault-simulation',
    module: module,
    severity: severity,
    simulated: true
  });
  
  console.log(`📊 Fault simulation result:`, result);
  return result;
};

const getSystemStatusSnapshot = () => {
  const healthStatus = errorTriageSystem.getHealthStatus();
  const errorSummary = errorTriageSystem.getErrorSummary();
  
  return {
    timestamp: Date.now(),
    overall: {
      healthy: healthStatus.errorCount < 5,
      errorCount: healthStatus.errorCount,
      uptime: Date.now() - (healthStatus.timestamp || Date.now())
    },
    modules: {
      electronAPI: {
        ok: healthStatus.electronAPI === true,
        status: healthStatus.electronAPI ? 'operational' : 'fault',
        severity: healthStatus.electronAPI ? 'low' : 'high'
      },
      nodeAPI: {
        ok: healthStatus.nodeAPI === true,
        status: healthStatus.nodeAPI ? 'operational' : 'fault',
        severity: healthStatus.nodeAPI ? 'low' : 'high'
      },
      ipcConnection: {
        ok: healthStatus.ipcConnection === true,
        status: healthStatus.ipcConnection ? 'operational' : 'fault',
        severity: healthStatus.ipcConnection ? 'low' : 'medium'
      },
      memory: {
        ok: healthStatus.memoryUsage !== null,
        status: healthStatus.memoryUsage ? 'operational' : 'unknown',
        severity: 'low'
      }
    },
    errorCategories: errorSummary.categories
  };
};

const checkModuleHealth = (moduleName) => {
  switch (moduleName) {
    case 'aiCopilot':
      return window.aiCopilot && window.aiCopilot.isReady;
    case 'pluginLoader':
      return window.pluginLoader && window.pluginLoader.isInitialized;
    case 'uiManager':
      return window.RinaWarpPhase2 && window.RinaWarpPhase2.isReady();
    case 'ipcBridge':
      return window.electronAPI && window.nodeAPI;
    default:
      return true; // Unknown modules are assumed healthy
  }
};

// Export for global use
if (typeof window !== 'undefined') {
  window.ErrorTriageSystem = errorTriageSystem;
  window.reportError = (error, context) => errorTriageSystem.reportError(error, context);
  window.triageError = triageError;
  window.monitorSystemHealth = monitorSystemHealth;
  window.simulateFault = simulateFault;
  window.getSystemStatusSnapshot = getSystemStatusSnapshot;
}

export { ErrorTriageSystem, GlobalErrorHandler, triageError, monitorSystemHealth, simulateFault, getSystemStatusSnapshot };
export default errorTriageSystem;
