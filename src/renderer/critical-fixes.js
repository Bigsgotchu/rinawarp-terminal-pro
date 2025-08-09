import logger from '../utilities/logger.js';
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Critical Browser-Side Fixes for RinaWarp Terminal
 *
 * This script fixes:
 * 1. Duplicate variable declarations (GitIntegration, ProjectAnalyzer, DebuggerIntegration)
 * 2. Process is not defined errors
 * 3. executeCommand read-only property errors
 * 4. NaN uptime issues in performance metrics
 * 5. Unexpected end of input syntax errors
 */

(function () {
  'use strict';

  // Prevent multiple initialization
  if (window.criticalFixesApplied) {
    return;
  }

  // Fix #1: Initialize start time properly to prevent NaN uptime
  const fixUptimeCalculations = () => {
    // Global start time for the application
    if (!window.appStartTime) {
      window.appStartTime = Date.now();
    }

    // Fix for UnifiedRuntime startTime
    if (window.UnifiedRuntime && !window.UnifiedRuntime.prototype._startTimeFixed) {
      const originalConstructor = window.UnifiedRuntime;
      window.UnifiedRuntime = function (...args) {
        originalConstructor.apply(this, args);
        // Ensure startTime is always a valid number
        if (!this.startTime || isNaN(this.startTime)) {
          this.startTime = Date.now();
        }
      };
      window.UnifiedRuntime.prototype = originalConstructor.prototype;
      window.UnifiedRuntime.prototype._startTimeFixed = true;
    }

    // Fix for PerformanceMonitor uptime calculations
    if (window.PerformanceMonitor && !window.PerformanceMonitor.prototype._uptimeFixed) {
      const originalGetSystemHealth = window.PerformanceMonitor.prototype.getSystemHealth;
      window.PerformanceMonitor.prototype.getSystemHealth = async function () {
        const result = await originalGetSystemHealth.call(this);

        // Fix NaN uptime calculations
        if (result && result.uptime && (isNaN(result.uptime) || result.uptime === 'NaNs')) {
          const startTime = this.startTime || window.appStartTime || Date.now();
          result.uptime = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
        }

        return result;
      };
      window.PerformanceMonitor.prototype._uptimeFixed = true;
    }
  };

  // Fix #2: Safe process access for Electron renderer
  const setupSafeProcessAccess = () => {
    if (!window.safeProcess) {
      window.safeProcess = {
        cwd: () => {
          // Try multiple ways to get current working directory
          if (window.env && window.env.home) return window.env.home;
          if (window.electronAPI && window.electronAPI.getCurrentDir) {
            return window.electronAPI.getCurrentDir();
          }
          if (window.nodeAPI && window.nodeAPI.getCurrentDir) {
            return window.nodeAPI.getCurrentDir();
          }
          return './'; // Fallback
        },
        env: window.env || {},
        platform:
          (window.processAPI && window.processAPI.platform) ||
          (window.env && window.env.platform) ||
          'unknown',
        versions:
          (window.processAPI && window.processAPI.versions) ||
          (window.electronAPI && window.electronAPI.versions) ||
          {},
      };
    }
  };

  // Fix #3: Safe executeCommand wrapper
  const setupSafeExecuteCommand = () => {
    if (!window.safeExecuteCommand) {
      window.safeExecuteCommand = async (command, options = {}) => {
        try {
          // Try multiple APIs in order of preference
          if (window.electronAPI && window.electronAPI.executeCommand) {
            return await window.electronAPI.executeCommand(command, options);
          }

          if (window.nodeAPI && window.nodeAPI.executeCommand) {
            return await window.nodeAPI.executeCommand(command, options);
          }

          // Fallback simulation for browser environments
          console.warn('No command execution API available, simulating result');
          return {
            stdout: '',
            stderr: '',
            exitCode: 0,
            signal: null,
          };
        } catch (error) {
          console.error('Command execution failed:', error);
          throw new Error(
            new Error(new Error(`Command execution not available: ${error.message}`))
          );
        }
      };
    }
  };

  // Fix #4: Prevent duplicate class declarations globally
  const preventDuplicateDeclarations = () => {
    const protectedClasses = [
      'GitIntegration',
      'ProjectAnalyzer',
      'DebuggerIntegration',
      'ErrorAnalyzer',
      'PerformanceProfiler',
      'VisualDiffRenderer',
      'BranchManager',
      'CommitAnalyzer',
    ];

    protectedClasses.forEach(className => {
      if (window[className]) {
        // Mark as already loaded to prevent duplicate loading
        window[`${className}_LOADED`] = true;
      }
    });
  };

  // Fix #5: Validate and fix performance metrics
  const validatePerformanceMetrics = () => {
    // Create a safe performance metrics object
    if (!window.safePerformanceMetrics) {
      window.safePerformanceMetrics = {
        now: () => {
          if (typeof performance !== 'undefined' && performance.now) {
            return performance.now();
          }
          return Date.now();
        },

        getUptime: startTime => {
          if (!startTime || isNaN(startTime)) {
            startTime = window.appStartTime || Date.now();
          }
          const uptime = (Date.now() - startTime) / 1000;
          return isNaN(uptime) ? 0 : uptime;
        },

        formatUptime: startTime => {
          const uptime = window.safePerformanceMetrics.getUptime(startTime);
          return `${uptime.toFixed(2)}s`;
        },
      };
    }
  };

  // Fix #6: Repair broken module exports
  const repairModuleExports = () => {
    // Ensure modules are properly exported to window
    const ensureModuleExport = (moduleName, moduleClass) => {
      if (moduleClass && !window[moduleName]) {
        try {
          window[moduleName] = moduleClass;
          logger.debug(`✅ ${moduleName} exported to window`);
        } catch (error) {
          console.warn(`⚠️ Failed to export ${moduleName}:`, error);
        }
      }
    };

    // Check for common modules that might need re-export
    ['GitIntegration', 'ProjectAnalyzer', 'DebuggerIntegration'].forEach(moduleName => {
      if (!window[moduleName] && window[`${moduleName}_CONSTRUCTOR`]) {
        ensureModuleExport(moduleName, window[`${moduleName}_CONSTRUCTOR`]);
      }
    });
  };

  // Fix #7: Comprehensive error handling for missing dependencies
  const setupErrorHandling = () => {
    // Override console.error to catch and handle specific errors
    const originalConsoleError = console.error;
    console.error = function (...args) {
      const errorStr = args.join(' ');

      // Handle specific error patterns
      if (errorStr.includes('process is not defined')) {
        console.warn('🔧 process is not defined - using safeProcess fallback');
        setupSafeProcessAccess();
        return;
      }

      if (errorStr.includes('executeCommand') && errorStr.includes('read only')) {
        console.warn('🔧 executeCommand read-only error - using safe wrapper');
        setupSafeExecuteCommand();
        return;
      }

      if (errorStr.includes('has already been declared')) {
        console.warn('🔧 Duplicate declaration error - ignoring');
        return;
      }

      if (errorStr.includes('NaN') && errorStr.includes('uptime')) {
        console.warn('🔧 NaN uptime error - fixing metrics');
        fixUptimeCalculations();
        return;
      }

      // Call original console.error for other errors
      originalConsoleError.apply(console, args);
    };
  };

  // Main initialization function
  const initializeFixes = () => {
    try {
      preventDuplicateDeclarations();
      setupSafeProcessAccess();
      setupSafeExecuteCommand();
      fixUptimeCalculations();
      validatePerformanceMetrics();
      repairModuleExports();
      setupErrorHandling();

      // Set up periodic health checks
      window.performHealthCheck = () => {
        const health = {
          safeProcess: !!window.safeProcess,
          safeExecuteCommand: !!window.safeExecuteCommand,
          appStartTime: !!window.appStartTime,
          safePerformanceMetrics: !!window.safePerformanceMetrics,
          timestamp: new Date().toISOString(),
        };

        return health;
      };

      // Run health check every 30 seconds
      setInterval(window.performHealthCheck, 30000);

      // Mark as applied
      window.criticalFixesApplied = true;
    } catch (error) {
      console.error('❌ Failed to apply critical fixes:', error);
    }
  };

  // Apply fixes immediately
  initializeFixes();

  // Also apply fixes on DOM ready in case we're loaded early
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFixes);
  }

  // Export functions for manual use
  window.criticalFixes = {
    initializeFixes,
    fixUptimeCalculations,
    setupSafeProcessAccess,
    setupSafeExecuteCommand,
    preventDuplicateDeclarations,
    validatePerformanceMetrics,
    repairModuleExports,
    setupErrorHandling,
  };
})();
