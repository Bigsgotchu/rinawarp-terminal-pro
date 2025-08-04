/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * System Vitals Entry Point
 * Lazy-loaded system monitoring functionality
 */

import { SystemVitals } from '@/overlays/SystemVitals.js';
import { HeartbeatMonitor } from '@/overlays/HeartbeatMonitor.js';
import { PerformanceMonitor } from '@/renderer/performance-monitor.js';

class RinaWarpSystemVitalsFeature {
  constructor(terminal) {
    this.terminal = terminal;
    this.systemVitals = null;
    this.heartbeatMonitor = null;
    this.performanceMonitor = null;
    this.monitoringInterval = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize monitoring components
      this.systemVitals = new SystemVitals();
      this.heartbeatMonitor = new HeartbeatMonitor();
      this.performanceMonitor = new PerformanceMonitor();

      // Set up commands
      this.setupCommands();

      // Initialize components
      await this.systemVitals.initialize();
      await this.heartbeatMonitor.initialize();
      await this.performanceMonitor.initialize();

      // Start monitoring
      this.startMonitoring();

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize System Vitals:', error);
      throw new Error(error);
    }
  }

  setupCommands() {
    this.terminal.addCommand('vitals', () => this.showVitals());
    this.terminal.addCommand('performance', () => this.showPerformance());
    this.terminal.addCommand('heartbeat', () => this.showHeartbeat());
    this.terminal.addCommand('monitor', action => this.handleMonitorCommand(action));
  }

  startMonitoring() {
    // Update vitals every 5 seconds
    this.monitoringInterval = setInterval(() => {
      this.updateVitals();
    }, 5000);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  async updateVitals() {
    try {
      await this.systemVitals.update();
      await this.performanceMonitor.update();
      await this.heartbeatMonitor.pulse();
    } catch (error) {
      console.warn('Failed to update vitals:', error);
    }
  }

  showVitals() {
    const vitals = this.systemVitals.getCurrentVitals();

    this.terminal.writeLine(`
📊 System Vitals:
================
Memory Usage: ${vitals.memory.used}MB / ${vitals.memory.total}MB (${vitals.memory.percentage}%)
CPU Usage: ${vitals.cpu.percentage}%
Network: ↓ ${vitals.network.download} ↑ ${vitals.network.upload}
Uptime: ${vitals.uptime}
Terminal Sessions: ${vitals.terminals}
Active Features: ${vitals.features}
    `);
  }

  showPerformance() {
    const perf = this.performanceMonitor.getMetrics();

    this.terminal.writeLine(`
⚡ Performance Metrics:
======================
Frame Rate: ${perf.fps} FPS
Render Time: ${perf.renderTime}ms
Memory Heap: ${perf.heapUsed}MB / ${perf.heapTotal}MB
JavaScript Heap: ${perf.jsHeapSize}MB
Event Loop Lag: ${perf.eventLoopLag}ms
Features Loaded: ${perf.featuresCount}
    `);
  }

  showHeartbeat() {
    const heartbeat = this.heartbeatMonitor.getStatus();

    this.terminal.writeLine(`
💓 System Heartbeat:
===================
Status: ${heartbeat.status}
Last Pulse: ${heartbeat.lastPulse}
Pulse Rate: ${heartbeat.rate}/min
Health Score: ${heartbeat.healthScore}/100
Issues: ${heartbeat.issues.length}
    `);

    if (heartbeat.issues.length > 0) {
      this.terminal.writeLine('\\nIssues:');
      heartbeat.issues.forEach((issue, index) => {
        this.terminal.writeLine(`  ${index + 1}. ${issue}`);
      });
    }
  }

  handleMonitorCommand(action) {
    switch (action) {
    case 'start':
      if (!this.monitoringInterval) {
        this.startMonitoring();
        this.terminal.writeSuccess('✅ Monitoring started');
      } else {
        this.terminal.writeLine('Monitoring is already running');
      }
      break;

    case 'stop':
      if (this.monitoringInterval) {
        this.stopMonitoring();
        this.terminal.writeSuccess('✅ Monitoring stopped');
      } else {
        this.terminal.writeLine('Monitoring is not running');
      }
      break;

    case 'status':
      const status = this.monitoringInterval ? 'Running' : 'Stopped';
      this.terminal.writeLine(`Monitoring Status: ${status}`);
      break;

    default:
      this.terminal.writeLine(`
Monitor Commands:
================
  monitor start   - Start system monitoring
  monitor stop    - Stop system monitoring
  monitor status  - Show monitoring status
  vitals         - Show current system vitals
  performance    - Show performance metrics
  heartbeat      - Show system heartbeat
        `);
    }
  }

  async cleanup() {
    this.stopMonitoring();

    if (this.systemVitals) {
      await this.systemVitals.cleanup();
    }
    if (this.heartbeatMonitor) {
      await this.heartbeatMonitor.cleanup();
    }
    if (this.performanceMonitor) {
      await this.performanceMonitor.cleanup();
    }

    this.initialized = false;
  }

  // Public API
  getSystemVitals() {
    return this.systemVitals;
  }

  getHeartbeatMonitor() {
    return this.heartbeatMonitor;
  }

  getPerformanceMonitor() {
    return this.performanceMonitor;
  }

  isMonitoring() {
    return this.monitoringInterval !== null;
  }
}

export default RinaWarpSystemVitalsFeature;
