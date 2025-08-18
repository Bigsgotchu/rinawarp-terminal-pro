/**
 * Performance Monitor - Tracks and optimizes application performance
 */

export class PerformanceMonitor {
  constructor() {
    this.initialized = false;
    this.metrics = {};
    this.observers = {};
    this.isMonitoring = false;
  }

  start() {
    if (this.isMonitoring) return;

    console.log('📊 Starting Performance Monitor...');

    this.initializeObservers();
    this.trackInitialMetrics();

    this.isMonitoring = true;
    console.log('✅ Performance monitoring started');
  }

  stop() {
    if (!this.isMonitoring) return;

    // Disconnect observers
    Object.values(this.observers).forEach(observer => {
      if (observer && typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
    });

    this.isMonitoring = false;
    console.log('⏹️ Performance monitoring stopped');
  }

  initializeObservers() {
    // Performance Observer for navigation timing
    if ('PerformanceObserver' in window) {
      try {
        this.observers.navigation = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            this.processNavigationEntry(entry);
          }
        });
        this.observers.navigation.observe({ entryTypes: ['navigation'] });

        // Performance Observer for resource timing
        this.observers.resource = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            this.processResourceEntry(entry);
          }
        });
        this.observers.resource.observe({ entryTypes: ['resource'] });

        // Performance Observer for long tasks
        this.observers.longTask = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            this.processLongTaskEntry(entry);
          }
        });
        this.observers.longTask.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Some performance observers not supported:', error);
      }
    }

    // Intersection Observer for visibility tracking
    if ('IntersectionObserver' in window) {
      this.observers.intersection = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.trackElementVisibility(entry.target);
          }
        });
      });
    }
  }

  trackInitialMetrics() {
    // Core Web Vitals and basic metrics
    this.trackCoreWebVitals();
    this.trackMemoryUsage();
    this.trackNetworkInformation();

    // Set up periodic tracking
    setInterval(() => {
      this.trackMemoryUsage();
      this.trackFrameRate();
    }, 30000); // Every 30 seconds
  }

  trackCoreWebVitals() {
    // First Contentful Paint (FCP)
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
    if (fcpEntry) {
      this.metrics.fcp = fcpEntry.startTime;
    }

    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.lcp = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('LCP observer not supported');
      }
    }

    // Cumulative Layout Shift (CLS)
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          this.metrics.cls = clsValue;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS observer not supported');
      }
    }
  }

  trackMemoryUsage() {
    if ('memory' in performance) {
      this.metrics.memory = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        timestamp: Date.now(),
      };
    }
  }

  trackNetworkInformation() {
    if ('connection' in navigator) {
      this.metrics.network = {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData,
      };
    }
  }

  trackFrameRate() {
    let lastTime = performance.now();
    let frameCount = 0;

    const measureFrameRate = currentTime => {
      frameCount++;
      if (currentTime - lastTime >= 1000) {
        this.metrics.fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
      }
      if (this.isMonitoring) {
        requestAnimationFrame(measureFrameRate);
      }
    };

    requestAnimationFrame(measureFrameRate);
  }

  processNavigationEntry(entry) {
    this.metrics.navigation = {
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      ttfb: entry.responseStart - entry.requestStart,
      domInteractive: entry.domInteractive - entry.navigationStart,
    };
  }

  processResourceEntry(entry) {
    if (!this.metrics.resources) {
      this.metrics.resources = [];
    }

    if (entry.name.includes('.css') || entry.name.includes('.js')) {
      this.metrics.resources.push({
        name: entry.name.split('/').pop(),
        type: entry.name.includes('.css') ? 'css' : 'js',
        duration: entry.duration,
        size: entry.transferSize || 0,
        timestamp: Date.now(),
      });

      // Keep only last 50 resource entries
      if (this.metrics.resources.length > 50) {
        this.metrics.resources = this.metrics.resources.slice(-50);
      }
    }
  }

  processLongTaskEntry(entry) {
    if (!this.metrics.longTasks) {
      this.metrics.longTasks = [];
    }

    this.metrics.longTasks.push({
      duration: entry.duration,
      startTime: entry.startTime,
      timestamp: Date.now(),
    });

    // Keep only last 20 long tasks
    if (this.metrics.longTasks.length > 20) {
      this.metrics.longTasks = this.metrics.longTasks.slice(-20);
    }

    // Log warning for very long tasks
    if (entry.duration > 100) {
      console.warn(`Long task detected: ${entry.duration}ms`);
    }
  }

  trackElementVisibility(element) {
    const elementId = element.id || element.className || 'unknown';
    if (!this.metrics.elementVisibility) {
      this.metrics.elementVisibility = {};
    }
    this.metrics.elementVisibility[elementId] = Date.now();
  }

  getMetrics() {
    return {
      ...this.metrics,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
  }

  getPerformanceScore() {
    const metrics = this.getMetrics();
    let score = 100;

    // Penalize slow FCP
    if (metrics.fcp > 3000) score -= 20;
    else if (metrics.fcp > 1800) score -= 10;

    // Penalize slow LCP
    if (metrics.lcp > 4000) score -= 25;
    else if (metrics.lcp > 2500) score -= 15;

    // Penalize high CLS
    if (metrics.cls > 0.25) score -= 20;
    else if (metrics.cls > 0.1) score -= 10;

    // Penalize low FPS
    if (metrics.fps && metrics.fps < 30) score -= 15;
    else if (metrics.fps && metrics.fps < 50) score -= 5;

    // Penalize excessive memory usage
    if (metrics.memory && metrics.memory.used > 100 * 1024 * 1024) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  generateReport() {
    const metrics = this.getMetrics();
    const score = this.getPerformanceScore();

    return {
      score,
      metrics,
      recommendations: this.getRecommendations(metrics, score),
      timestamp: new Date().toISOString(),
    };
  }

  getRecommendations(metrics, score) {
    const recommendations = [];

    if (metrics.fcp > 1800) {
      recommendations.push(
        'Consider optimizing CSS loading or reducing initial render blocking resources'
      );
    }

    if (metrics.lcp > 2500) {
      recommendations.push('Optimize largest content element loading time');
    }

    if (metrics.cls > 0.1) {
      recommendations.push('Reduce cumulative layout shift by specifying image dimensions');
    }

    if (metrics.fps && metrics.fps < 50) {
      recommendations.push('Consider reducing animation complexity or JavaScript execution time');
    }

    if (metrics.longTasks && metrics.longTasks.length > 5) {
      recommendations.push('Break up long-running JavaScript tasks');
    }

    if (metrics.memory && metrics.memory.used > 50 * 1024 * 1024) {
      recommendations.push('Monitor memory usage and implement cleanup strategies');
    }

    return recommendations;
  }
}
