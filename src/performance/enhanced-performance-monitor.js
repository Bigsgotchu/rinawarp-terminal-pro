/**
 * Enhanced Performance Monitor with Vercel Speed Insights Integration
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * Combines local performance monitoring with Vercel Speed Insights
 * for comprehensive performance analytics.
 */

// Try to import Speed Insights, fallback gracefully if not available
let speedInsights;
try {
  speedInsights = await import('@vercel/speed-insights');
} catch (error) {
  console.warn('Speed Insights not available:', error.message);
  speedInsights = null;
}

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
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            this.trackWebVital(entry);
          }
        });

        observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error.message);
      }
    }
  }

  trackWebVital(entry) {
    const vital = {
      name: entry.name,
      value: entry.duration || entry.startTime,
      timestamp: Date.now(),
    };

    // Send to Vercel Speed Insights if available
    if (speedInsights && speedInsights.track) {
      speedInsights.track(entry.name, entry.duration || entry.startTime);
    }

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

      // Track with Vercel Speed Insights
      if (speedInsights && speedInsights.track) {
        speedInsights.track('terminal-command', executionTime, {
          command: command.split(' ')[0], // First word only for privacy
          success: true,
        });
      }

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

      // Track errors with Speed Insights
      if (speedInsights && speedInsights.track) {
        speedInsights.track('terminal-error', executionTime, {
          command: command.split(' ')[0],
          success: false,
        });
      }

      throw error;
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

      // Track AI performance
      if (speedInsights && speedInsights.track) {
        speedInsights.track('ai-request', responseTime, {
          operation,
          success: true,
        });
      }

      console.log(`🤖 AI ${operation} took ${Math.round(responseTime)}ms`);
      return result;
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      if (speedInsights && speedInsights.track) {
        speedInsights.track('ai-request', responseTime, {
          operation,
          success: false,
        });
      }

      throw error;
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
