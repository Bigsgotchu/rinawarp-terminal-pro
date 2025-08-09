import logger from '../utilities/logger.js';
// Performance Monitor for RinaWarp Terminal
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      startupTime: 0,
      firstRenderTime: 0,
      aiLoadTime: 0,
      terminalReadyTime: 0,
    };
    this.startTime = performance.now();
  }

  mark(name) {
    performance.mark(name);
    const time = performance.now() - this.startTime;
    logger.debug(`Performance: ${name} at ${time.toFixed(2)}ms`);

    switch (name) {
      case 'firstRender':
        this.metrics.firstRenderTime = time;
        break;
      case 'aiLoaded':
        this.metrics.aiLoadTime = time;
        break;
      case 'terminalReady':
        this.metrics.terminalReadyTime = time;
        this.reportMetrics();
        break;
    }
  }

  reportMetrics() {
    logger.debug('=== Performance Report ===');
    Object.entries(this.metrics).forEach(([key, value]) => {
      if (value > 0) {
        logger.debug(`${key}: ${value.toFixed(2)}ms`);
      }
    });
  }
}

module.exports = PerformanceMonitor;
