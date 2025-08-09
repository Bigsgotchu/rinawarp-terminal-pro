/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Enhanced Performance Monitor with Vercel Speed Insights Integration
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * Combines local performance monitoring with Vercel Speed Insights
 * for comprehensive performance analytics.
 */

// Speed Insights removed - not compatible with Electron applications
const _speedInsights = null;

export class EnhancedPerformanceMonitor {
  constructor(terminal) {
    this.terminal = terminal;
    this.history = [];
    this.metrics = {
      commandCount: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      memoryUsage: [],
      errorCount: 0,
      aiRequestCount: 0,
      aiResponseTime: [],
    };

    this.setupPerformanceObserver();
  }

  setupPerformanceObserver() {
    // Monitor Web Vitals if available
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        // Create a single consolidated observer for all performance entries
        const observer = new PerformanceObserver(list => {
          const entries = list.getEntries();
          this.batchProcessEntries(entries);
        });

        // Observe multiple entry types with a single observer
        observer.observe({
          entryTypes: [
            'measure',
            'navigation',
            'paint',
            'largest-contentful-paint',
            'layout-shift',
            'first-input',
            'longtask',
          ],
          buffered: true,
        });

        // Create a single MutationObserver for DOM changes
        this.setupMutationObserver();
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error.message);
      }
    }
  }

  setupMutationObserver() {
    // Use a single MutationObserver for all DOM changes
    const mutationCallback = mutations => {
      // Batch process mutations
      let addedNodes = 0;
      let removedNodes = 0;
      let attributeChanges = 0;

      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          addedNodes += mutation.addedNodes.length;
          removedNodes += mutation.removedNodes.length;
        } else if (mutation.type === 'attributes') {
          attributeChanges++;
        }
      }

      // Report significant changes
      if (addedNodes + removedNodes + attributeChanges > 10) {
        console.debug(
          `DOM Changes - Added: ${addedNodes}, Removed: ${removedNodes}, Attributes: ${attributeChanges}`
        );
      }
    };

    const observer = new MutationObserver(mutationCallback);

    // Observe the entire document with optimized options
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-*'], // Only observe relevant attributes
      characterData: false, // Don't observe text changes
    });
  }

  batchProcessEntries(entries) {
    const metrics = {
      paint: [],
      navigation: [],
      measure: [],
      lcp: null,
      cls: [],
      fid: null,
      longtask: [],
    };

    // Group entries by type
    entries.forEach(entry => {
      switch (entry.entryType) {
        case 'paint':
          metrics.paint.push(entry);
          break;
        case 'navigation':
          metrics.navigation.push(entry);
          break;
        case 'measure':
          metrics.measure.push(entry);
          break;
        case 'largest-contentful-paint':
          metrics.lcp = entry; // Keep only the latest LCP
          break;
        case 'layout-shift':
          metrics.cls.push(entry);
          break;
        case 'first-input':
          metrics.fid = entry; // Keep only the first FID
          break;
        case 'longtask':
          metrics.longtask.push(entry);
          break;
      }
    });

    // Process batched metrics
    this.processPerformanceMetrics(metrics);
  }

  processPerformanceMetrics(metrics) {
    // Process paint metrics
    if (metrics.paint.length > 0) {
      const fcp = metrics.paint.find(p => p.name === 'first-contentful-paint');
      if (fcp) this.trackWebVital({ name: 'FCP', value: fcp.startTime });
    }

    // Process LCP
    if (metrics.lcp) {
      this.trackWebVital({ name: 'LCP', value: metrics.lcp.startTime });
    }

    // Process CLS
    if (metrics.cls.length > 0) {
      const totalCLS = metrics.cls.reduce((sum, entry) => sum + entry.value, 0);
      this.trackWebVital({ name: 'CLS', value: totalCLS });
    }

    // Process FID
    if (metrics.fid) {
      this.trackWebVital({
        name: 'FID',
        value: metrics.fid.processingStart - metrics.fid.startTime,
      });
    }

    // Process long tasks
    if (metrics.longtask.length > 0) {
      const totalBlockingTime = metrics.longtask.reduce((sum, task) => sum + task.duration, 0);
      this.trackWebVital({ name: 'TBT', value: totalBlockingTime });
    }
  }

  trackWebVital(entry) {
    const vital = {
      name: entry.name,
      value: entry.duration || entry.startTime,
      timestamp: Date.now(),
    };

    // Analytics tracking removed - not compatible with Electron

    console.log(`📊 Web Vital: ${entry.name} = ${vital.value}ms`);
  }

  async trackCommand(command, execFn) {
    const startTime = performance.now();
    const memoryBefore = this.getMemoryUsage();

    // Create performance mark
    if (typeof performance.mark === 'function') {
      performance.mark(`command-${command}-start`);
    }

    try {
      const result = await execFn();
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      const memoryAfter = this.getMemoryUsage();

      // Create performance measure
      if (typeof performance.measure === 'function') {
        performance.measure(`command-${command}`, `command-${command}-start`);
      }

      const metrics = {
        command,
        executionTime,
        memoryUsed: memoryAfter - memoryBefore,
        timestamp: Date.now(),
        success: true,
      };

      this.recordMetrics(metrics);
      this.displayMetrics(metrics);

      // Analytics tracking removed - not compatible with Electron

      return result;
    } catch (error) {
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      const metrics = {
        command,
        executionTime,
        timestamp: Date.now(),
        success: false,
        error: error.message,
      };

      this.recordMetrics(metrics);
      this.metrics.errorCount++;

      // Analytics tracking removed - not compatible with Electron

      throw new Error(error);
    }
  }

  async trackAIRequest(operation, execFn) {
    const startTime = performance.now();

    try {
      const result = await execFn();
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      this.metrics.aiRequestCount++;
      this.metrics.aiResponseTime.push(responseTime);

      // Analytics tracking removed - not compatible with Electron

      return result;
    } catch (error) {
      const endTime = performance.now();
      const _responseTime = endTime - startTime;

      // Analytics tracking removed - not compatible with Electron

      throw new Error(error);
    }
  }

  recordMetrics(metrics) {
    this.history.push(metrics);

    // Update running metrics
    this.metrics.commandCount++;
    this.metrics.totalExecutionTime += metrics.executionTime;
    this.metrics.averageExecutionTime = this.metrics.totalExecutionTime / this.metrics.commandCount;

    if (metrics.memoryUsed) {
      this.metrics.memoryUsage.push(metrics.memoryUsed);
    }

    // Keep only last 1000 entries
    if (this.history.length > 1000) {
      this.history.shift();
    }
  }

  displayMetrics(metrics) {
    if (metrics.executionTime > 1000) {
      this.terminal.log(
        `⚠️ Slow command: ${metrics.command} took ${Math.round(metrics.executionTime)}ms`
      );
    } else if (metrics.executionTime > 100) {
      this.terminal.log(`⏱️ ${metrics.command} took ${Math.round(metrics.executionTime)}ms`);
    }

    if (metrics.memoryUsed > 10 * 1024 * 1024) {
      // 10MB
      this.terminal.log(`💾 High memory usage: ${Math.round(metrics.memoryUsed / 1024 / 1024)}MB`);
    }
  }

  getMemoryUsage() {
    if (typeof performance.memory !== 'undefined') {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  getAnalytics() {
    const sorted = this.history.slice().sort((a, b) => b.executionTime - a.executionTime);

    return {
      summary: this.metrics,
      slowestCommands: sorted.slice(0, 10),
      recentCommands: this.history.slice(-20),
      averageAIResponseTime:
        this.metrics.aiResponseTime.length > 0
          ? this.metrics.aiResponseTime.reduce((a, b) => a + b, 0) /
            this.metrics.aiResponseTime.length
          : 0,
    };
  }

  generateReport() {
    const analytics = this.getAnalytics();

    return {
      timestamp: new Date().toISOString(),
      totalCommands: this.metrics.commandCount,
      averageExecutionTime: Math.round(this.metrics.averageExecutionTime),
      errorRate: ((this.metrics.errorCount / this.metrics.commandCount) * 100).toFixed(2),
      aiUsage: {
        requestCount: this.metrics.aiRequestCount,
        averageResponseTime: Math.round(analytics.averageAIResponseTime),
      },
      topSlowCommands: analytics.slowestCommands.slice(0, 5).map(cmd => ({
        command: cmd.command,
        time: Math.round(cmd.executionTime),
      })),
    };
  }

  // Export metrics for external analytics
  exportMetrics() {
    return {
      history: this.history,
      metrics: this.metrics,
      webVitals: this.webVitals || [],
      timestamp: Date.now(),
    };
  }
}
