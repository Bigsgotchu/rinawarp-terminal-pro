/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal - Plugin Performance Monitor
 * Monitors and optimizes plugin performance
 */

export class PluginPerformanceMonitor {
  constructor(pluginManager) {
    this.pluginManager = pluginManager;
    this.metrics = new Map();
    this.thresholds = {
      initTime: 5000, // 5 seconds
      memoryUsage: 50 * 1024 * 1024, // 50MB
      cpuUsage: 80, // 80%
      apiCallsPerSecond: 100,
    };
    this.monitoring = false;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.startMonitoring();
  }

  setupEventListeners() {
    this.pluginManager.on('plugin-loaded', pluginName => {
      this.initializeMetrics(pluginName);
    });

    this.pluginManager.on('plugin-unloaded', pluginName => {
      this.cleanupMetrics(pluginName);
    });
  }

  initializeMetrics(pluginName) {
    this.metrics.set(pluginName, {
      startTime: Date.now(),
      initTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      apiCalls: 0,
      errors: 0,
      warnings: [],
      performance: {
        slow: false,
        memoryHeavy: false,
        cpuIntensive: false,
        apiIntensive: false,
      },
    });
  }

  cleanupMetrics(pluginName) {
    this.metrics.delete(pluginName);
  }

  startMonitoring() {
    if (this.monitoring) return;

    this.monitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.analyzePerformance();
    }, 1000); // Monitor every second
  }

  stopMonitoring() {
    if (!this.monitoring) return;

    this.monitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  collectMetrics() {
    for (const [pluginName, _plugin] of this.pluginManager.plugins) {
      const metrics = this.metrics.get(pluginName);
      if (!metrics) continue;

      // Update memory usage (simulated)
      metrics.memoryUsage = this.getPluginMemoryUsage(pluginName);

      // Update CPU usage (simulated)
      metrics.cpuUsage = this.getPluginCPUUsage(pluginName);

      // API calls are tracked separately
      // Error count is tracked separately
    }
  }

  analyzePerformance() {
    for (const [pluginName, metrics] of this.metrics) {
      const plugin = this.pluginManager.plugins.get(pluginName);
      if (!plugin) continue;

      // Check initialization time
      if (metrics.initTime > this.thresholds.initTime) {
        metrics.performance.slow = true;
        this.addWarning(pluginName, 'Plugin initialization is slow');
      }

      // Check memory usage
      if (metrics.memoryUsage > this.thresholds.memoryUsage) {
        metrics.performance.memoryHeavy = true;
        this.addWarning(pluginName, 'Plugin is using excessive memory');
      }

      // Check CPU usage
      if (metrics.cpuUsage > this.thresholds.cpuUsage) {
        metrics.performance.cpuIntensive = true;
        this.addWarning(pluginName, 'Plugin is CPU intensive');
      }

      // Check API call rate
      if (metrics.apiCalls > this.thresholds.apiCallsPerSecond) {
        metrics.performance.apiIntensive = true;
        this.addWarning(pluginName, 'Plugin is making too many API calls');
      }

      // Reset API call counter
      metrics.apiCalls = 0;
    }
  }

  addWarning(pluginName, message) {
    const metrics = this.metrics.get(pluginName);
    if (!metrics) return;

    const warning = {
      message,
      timestamp: Date.now(),
      count: 1,
    };

    // Check if warning already exists
    const existingWarning = metrics.warnings.find(w => w.message === message);
    if (existingWarning) {
      existingWarning.count++;
      existingWarning.timestamp = Date.now();
    } else {
      metrics.warnings.push(warning);
    }

    // Limit warnings to prevent memory bloat
    if (metrics.warnings.length > 50) {
      metrics.warnings = metrics.warnings.slice(-25);
    }

    console.warn(`[Performance Monitor] ${pluginName}: ${message}`);
  }

  getPluginMemoryUsage(_pluginName) {
    // Simulate memory usage tracking
    // In a real implementation, this would use actual memory profiling
    return Math.random() * 30 * 1024 * 1024; // Random value up to 30MB
  }

  getPluginCPUUsage(_pluginName) {
    // Simulate CPU usage tracking
    // In a real implementation, this would use actual CPU profiling
    return Math.random() * 60; // Random value up to 60%
  }

  trackPluginInit(pluginName, startTime) {
    const metrics = this.metrics.get(pluginName);
    if (!metrics) return;

    metrics.initTime = Date.now() - startTime;
  }

  trackAPICall(pluginName) {
    const metrics = this.metrics.get(pluginName);
    if (!metrics) return;

    metrics.apiCalls++;
  }

  trackError(pluginName, error) {
    const metrics = this.metrics.get(pluginName);
    if (!metrics) return;

    metrics.errors++;
    console.error(`[Performance Monitor] ${pluginName}: ${error.message}`);
  }

  getMetrics(pluginName) {
    return this.metrics.get(pluginName);
  }

  getAllMetrics() {
    const result = {};
    for (const [pluginName, metrics] of this.metrics) {
      result[pluginName] = { ...metrics };
    }
    return result;
  }

  getPerformanceReport() {
    const report = {
      timestamp: Date.now(),
      totalPlugins: this.metrics.size,
      issues: {
        slow: 0,
        memoryHeavy: 0,
        cpuIntensive: 0,
        apiIntensive: 0,
      },
      plugins: {},
    };

    for (const [pluginName, metrics] of this.metrics) {
      report.plugins[pluginName] = {
        performance: metrics.performance,
        metrics: {
          initTime: metrics.initTime,
          memoryUsage: metrics.memoryUsage,
          cpuUsage: metrics.cpuUsage,
          errors: metrics.errors,
          warningCount: metrics.warnings.length,
        },
      };

      // Count issues
      if (metrics.performance.slow) report.issues.slow++;
      if (metrics.performance.memoryHeavy) report.issues.memoryHeavy++;
      if (metrics.performance.cpuIntensive) report.issues.cpuIntensive++;
      if (metrics.performance.apiIntensive) report.issues.apiIntensive++;
    }

    return report;
  }

  optimizePlugin(pluginName) {
    const metrics = this.metrics.get(pluginName);
    if (!metrics) return false;

    const optimizations = [];

    // Suggest optimizations based on performance issues
    if (metrics.performance.slow) {
      optimizations.push('Consider lazy loading or async initialization');
    }

    if (metrics.performance.memoryHeavy) {
      optimizations.push('Implement memory cleanup in plugin lifecycle');
      optimizations.push('Consider using WeakMap for caching');
    }

    if (metrics.performance.cpuIntensive) {
      optimizations.push('Move heavy computations to Web Workers');
      optimizations.push('Implement debouncing for frequent operations');
    }

    if (metrics.performance.apiIntensive) {
      optimizations.push('Implement request caching');
      optimizations.push('Use request batching where possible');
    }

    if (optimizations.length > 0) {
    }

    return optimizations;
  }

  setThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  getThresholds() {
    return { ...this.thresholds };
  }

  resetMetrics(pluginName) {
    if (pluginName) {
      this.cleanupMetrics(pluginName);
      this.initializeMetrics(pluginName);
    } else {
      // Reset all metrics
      this.metrics.clear();
      for (const [name] of this.pluginManager.plugins) {
        this.initializeMetrics(name);
      }
    }
  }

  exportMetrics() {
    const export_data = {
      timestamp: Date.now(),
      thresholds: this.thresholds,
      metrics: this.getAllMetrics(),
      report: this.getPerformanceReport(),
    };

    return JSON.stringify(export_data, null, 2);
  }

  importMetrics(data) {
    try {
      const imported = JSON.parse(data);

      if (imported.thresholds) {
        this.thresholds = imported.thresholds;
      }

      if (imported.metrics) {
        this.metrics.clear();
        for (const [pluginName, metrics] of Object.entries(imported.metrics)) {
          this.metrics.set(pluginName, metrics);
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to import performance metrics:', error);
      return false;
    }
  }
}

// Performance utilities
export class PluginPerformanceUtils {
  static measureExecutionTime(fn, context = null) {
    return async function (...args) {
      const start = performance.now();
      try {
        const result = await fn.apply(context, args);
        const end = performance.now();
        return {
          result,
          executionTime: end - start,
        };
      } catch (error) {
        const end = performance.now();
        throw new Error({
          error,
          executionTime: end - start,
        });
      }
    };
  }

  static debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };

      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);

      if (callNow) func(...args);
    };
  }

  static throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  static memoize(fn, keyGenerator) {
    const cache = new Map();

    return function (...args) {
      const key = keyGenerator ? keyGenerator(args) : JSON.stringify(args);

      if (cache.has(key)) {
        return cache.get(key);
      }

      const result = fn.apply(this, args);
      cache.set(key, result);

      // Limit cache size
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }

      return result;
    };
  }

  static createPool(factory, maxSize = 10) {
    const pool = [];
    let activeCount = 0;

    return {
      acquire() {
        if (pool.length > 0) {
          activeCount++;
          return pool.pop();
        }

        if (activeCount < maxSize) {
          activeCount++;
          return factory();
        }

        throw new Error(new Error('Pool exhausted'));
      },

      release(obj) {
        if (activeCount > 0) {
          activeCount--;
          pool.push(obj);
        }
      },

      size() {
        return pool.length;
      },

      active() {
        return activeCount;
      },
    };
  }
}
