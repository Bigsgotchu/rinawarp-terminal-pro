#!/usr/bin/env node
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * 🎛️ Boot Profile Visualizer
 * Real-time Feature Rollout Status Dashboard
 *
 * Tracks features by risk tier, performance impact, and rollout status
 * with beautiful terminal-based visualizations
 */

const { createFeatureFlags, getFeatureFlags } = require('../core/featureFlags.cjs');
const EventEmitter = require('events');
const fs = require('node:fs').promises;
const path = require('node:path');

class BootProfileVisualizer extends EventEmitter {
  constructor(options = {}) {
    super();

    this.refreshInterval = options.refreshInterval || 2000;
    this.logFile = options.logFile || path.join(__dirname, '../../logs/boot-profile.log');
    this.isRunning = false;

    // Terminal display settings
    this.colors = {
      STABLE: '\x1b[32m', // Green
      EXPERIMENTAL: '\x1b[33m', // Yellow
      DANGEROUS: '\x1b[31m', // Red
      RESET: '\x1b[0m',
      BOLD: '\x1b[1m',
      DIM: '\x1b[2m',
      UNDERLINE: '\x1b[4m',
    };

    this.emojis = {
      STABLE: '🟢',
      EXPERIMENTAL: '🟡',
      DANGEROUS: '🔴',
      LOADING: '⏳',
      SUCCESS: '✅',
      WARNING: '⚠️',
      ERROR: '❌',
      PERFORMANCE: '⚡',
      MEMORY: '🧠',
      NETWORK: '🌐',
    };

    // Performance tracking
    this.performanceLog = [];
    this.bootSequence = [];
    this.currentPhase = 'initialization';

    // Feature status tracking
    this.featureStatus = new Map();
    this.riskMetrics = {
      STABLE: { count: 0, loadTime: 0, memory: 0 },
      EXPERIMENTAL: { count: 0, loadTime: 0, memory: 0 },
      DANGEROUS: { count: 0, loadTime: 0, memory: 0 },
    };

    this.startTime = Date.now();
  }

  async initialize() {
    console.log(
      this.colors.BOLD + '🎛️  Initializing Boot Profile Visualizer...' + this.colors.RESET
    );

    try {
      // Create feature flags if not already initialized
      let featureFlags;
      try {
        featureFlags = getFeatureFlags();
      } catch {
        featureFlags = createFeatureFlags({ runtimeMode: 'development' });
        await featureFlags.initialize();
      }

      // Listen for feature flag events
      featureFlags.on('feature-enabled', data => this.onFeatureEnabled(data));
      featureFlags.on('feature-disabled', data => this.onFeatureDisabled(data));
      featureFlags.on('performance-warning', data => this.onPerformanceWarning(data));

      await this.setupLogging();
      this.isRunning = true;

      console.log(this.colors.BOLD + '✅ Boot Profile Visualizer ready\n' + this.colors.RESET);
    } catch (error) {
      console.error('❌ Visualizer initialization failed:', error);
      throw new Error(new Error(error));
    }
  }

  async setupLogging() {
    try {
      await fs.mkdir(path.dirname(this.logFile), { recursive: true });

      const logHeader = {
        timestamp: new Date().toISOString(),
        event: 'visualizer_started',
        bootSequence: 'initialization',
      };

      await fs.writeFile(this.logFile, JSON.stringify(logHeader) + '\n');
    } catch (error) {
      console.warn('⚠️  Could not setup logging:', error.message);
    }
  }

  onFeatureEnabled(data) {
    const { featureName, feature } = data;
    const timestamp = Date.now();

    this.featureStatus.set(featureName, {
      status: 'enabled',
      risk: feature.risk,
      enabledAt: timestamp,
      loadTime: 0,
      memoryImpact: this.estimateMemoryImpact(feature),
    });

    this.riskMetrics[feature.risk].count++;

    this.logEvent({
      timestamp: new Date().toISOString(),
      event: 'feature_enabled',
      feature: featureName,
      risk: feature.risk,
      bootTime: timestamp - this.startTime,
    });

    if (!this.isRunning) return;
    this.renderDashboard();
  }

  onFeatureDisabled(data) {
    const { featureName, feature, reason } = data;

    if (this.featureStatus.has(featureName)) {
      const status = this.featureStatus.get(featureName);
      status.status = 'disabled';
      status.disabledReason = reason;

      this.riskMetrics[feature.risk].count = Math.max(0, this.riskMetrics[feature.risk].count - 1);
    }

    this.logEvent({
      timestamp: new Date().toISOString(),
      event: 'feature_disabled',
      feature: featureName,
      reason: reason,
    });

    if (!this.isRunning) return;
    this.renderDashboard();
  }

  onPerformanceWarning(data) {
    this.performanceLog.push({
      timestamp: Date.now(),
      type: data.type,
      details: data,
    });

    this.logEvent({
      timestamp: new Date().toISOString(),
      event: 'performance_warning',
      type: data.type,
      details: data,
    });

    if (!this.isRunning) return;
    this.renderDashboard();
  }

  estimateMemoryImpact(feature) {
    if (feature.memoryRequirement) {
      return parseInt(feature.memoryRequirement.replace(/[^\d]/g, '')) || 0;
    }

    // Estimate based on performance impact
    switch (feature.performanceImpact) {
      case 'very-high':
        return 100;
      case 'high':
        return 50;
      case 'medium':
        return 20;
      case 'low':
        return 5;
      default:
        return 10;
    }
  }

  async startRealTimeMonitoring() {
    if (this.isRunning) return;

    console.log('🎛️  Starting real-time boot profile monitoring...\n');
    this.isRunning = true;

    // Initial render
    await this.renderDashboard();

    // Set up refresh interval
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
      this.renderDashboard();
    }, this.refreshInterval);

    // Listen for process termination
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  updateMetrics() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime() * 1000;

    this.performanceLog.push({
      timestamp: Date.now(),
      memory: memUsage.heapUsed,
      uptime: uptime,
    });

    // Keep only last 50 entries
    if (this.performanceLog.length > 50) {
      this.performanceLog = this.performanceLog.slice(-50);
    }
  }

  renderDashboard() {
    // Clear terminal
    process.stdout.write('\x1Bc');

    // Header
    this.renderHeader();

    // Risk-based feature matrix
    this.renderFeatureMatrix();

    // Performance metrics
    this.renderPerformanceMetrics();

    // Boot sequence timeline
    this.renderBootSequence();

    // Real-time status
    this.renderRealTimeStatus();

    // Footer
    this.renderFooter();
  }

  renderHeader() {
    const uptime = Math.round((Date.now() - this.startTime) / 1000);
    const title = '🧜‍♀️ RinaWarp Terminal - Boot Profile Dashboard';

    console.log(this.colors.BOLD + this.colors.UNDERLINE + title + this.colors.RESET);
    console.log(
      `${this.colors.DIM}Uptime: ${uptime}s | Phase: ${this.currentPhase} | Features: ${this.featureStatus.size}${this.colors.RESET}\n`
    );
  }

  renderFeatureMatrix() {
    console.log(this.colors.BOLD + '🎯 Feature Rollout Matrix' + this.colors.RESET);
    console.log('─'.repeat(60));

    const riskLevels = ['STABLE', 'EXPERIMENTAL', 'DANGEROUS'];

    for (const risk of riskLevels) {
      const metrics = this.riskMetrics[risk];
      const color = this.colors[risk];
      const emoji = this.emojis[risk];

      console.log(
        `${emoji} ${color}${risk.padEnd(12)}${this.colors.RESET} ` +
          `Count: ${metrics.count.toString().padStart(2)} | ` +
          `Memory: ${this.formatMemory(metrics.memory).padStart(6)} | ` +
          `Status: ${this.getRiskStatus(risk)}`
      );
    }

    console.log();
  }

  renderPerformanceMetrics() {
    console.log(this.colors.BOLD + '⚡ Performance Metrics' + this.colors.RESET);
    console.log('─'.repeat(60));

    const memUsage = process.memoryUsage();
    const uptime = process.uptime() * 1000;

    // Memory usage bar
    const memoryPercent = Math.min(100, (memUsage.heapUsed / (200 * 1024 * 1024)) * 100);
    const memoryBar = this.createProgressBar(memoryPercent, 20);
    const memoryColor =
      memoryPercent > 80
        ? this.colors.DANGEROUS
        : memoryPercent > 60
          ? this.colors.EXPERIMENTAL
          : this.colors.STABLE;

    console.log(
      `${this.emojis.MEMORY} Memory Usage: ${memoryColor}${memoryBar}${this.colors.RESET} ${Math.round(memoryPercent)}%`
    );
    console.log(`${this.emojis.PERFORMANCE} Heap Used: ${this.formatMemory(memUsage.heapUsed)}`);
    console.log(`${this.emojis.PERFORMANCE} Uptime: ${Math.round(uptime / 1000)}s`);

    // Performance warnings
    const recentWarnings = this.performanceLog.filter(
      log => Date.now() - log.timestamp < 10000 && log.type
    );

    if (recentWarnings.length > 0) {
      console.log(`${this.emojis.WARNING} Recent warnings: ${recentWarnings.length}`);
    }

    console.log();
  }

  renderBootSequence() {
    console.log(this.colors.BOLD + '🚀 Boot Sequence Timeline' + this.colors.RESET);
    console.log('─'.repeat(60));

    const features = Array.from(this.featureStatus.entries())
      .sort((a, b) => (a[1].enabledAt || 0) - (b[1].enabledAt || 0))
      .slice(-8); // Show last 8 features

    for (const [name, status] of features) {
      const emoji = this.emojis[status.risk];
      const color = this.colors[status.risk];
      const loadTime = status.enabledAt - this.startTime;
      const statusIcon = status.status === 'enabled' ? this.emojis.SUCCESS : this.emojis.ERROR;

      console.log(
        `${statusIcon} ${emoji} ${color}${name.padEnd(20)}${this.colors.RESET} ` +
          `${loadTime.toString().padStart(4)}ms | ` +
          `${this.formatMemory(status.memoryImpact).padStart(6)}`
      );
    }

    console.log();
  }

  renderRealTimeStatus() {
    console.log(this.colors.BOLD + '📊 Real-time Status' + this.colors.RESET);
    console.log('─'.repeat(60));

    // Feature counts by status
    const enabled = Array.from(this.featureStatus.values()).filter(
      f => f.status === 'enabled'
    ).length;
    const disabled = this.featureStatus.size - enabled;

    console.log(
      `${this.emojis.SUCCESS} Enabled: ${enabled} | ${this.emojis.ERROR} Disabled: ${disabled}`
    );

    // Risk distribution
    const total =
      this.riskMetrics.STABLE.count +
      this.riskMetrics.EXPERIMENTAL.count +
      this.riskMetrics.DANGEROUS.count;
    if (total > 0) {
      console.log(
        `${this.emojis.STABLE} Safe: ${this.riskMetrics.STABLE.count} | ` +
          `${this.emojis.EXPERIMENTAL} Testing: ${this.riskMetrics.EXPERIMENTAL.count} | ` +
          `${this.emojis.DANGEROUS} Risky: ${this.riskMetrics.DANGEROUS.count}`
      );
    }

    // System health indicator
    const health = this.calculateSystemHealth();
    const healthColor =
      health > 90
        ? this.colors.STABLE
        : health > 70
          ? this.colors.EXPERIMENTAL
          : this.colors.DANGEROUS;
    const healthBar = this.createProgressBar(health, 15);

    console.log(
      `🏥 System Health: ${healthColor}${healthBar}${this.colors.RESET} ${Math.round(health)}%`
    );
    console.log();
  }

  renderFooter() {
    const timestamp = new Date().toLocaleTimeString();
    console.log(this.colors.DIM + '─'.repeat(60));
    console.log(`Last updated: ${timestamp} | Press Ctrl+C to stop monitoring${this.colors.RESET}`);
  }

  createProgressBar(percent, width) {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  formatMemory(bytes) {
    if (bytes < 1024 * 1024) {
      return Math.round(bytes / 1024) + 'KB';
    }
    return Math.round(bytes / (1024 * 1024)) + 'MB';
  }

  getRiskStatus(risk) {
    const count = this.riskMetrics[risk].count;
    if (count === 0) return 'None';
    if (risk === 'DANGEROUS' && count > 2) return 'High Risk';
    if (risk === 'EXPERIMENTAL' && count > 5) return 'Testing';
    return 'Normal';
  }

  calculateSystemHealth() {
    const memUsage = process.memoryUsage();
    const memoryHealth = Math.max(0, 100 - (memUsage.heapUsed / (200 * 1024 * 1024)) * 100);

    const dangerousCount = this.riskMetrics.DANGEROUS.count;
    const riskHealth = Math.max(0, 100 - dangerousCount * 20);

    const recentErrors = this.performanceLog.filter(
      log => Date.now() - log.timestamp < 30000 && log.type === 'error'
    ).length;
    const errorHealth = Math.max(0, 100 - recentErrors * 25);

    return (memoryHealth + riskHealth + errorHealth) / 3;
  }

  async logEvent(event) {
    try {
      await fs.appendFile(this.logFile, JSON.stringify(event) + '\n');
    } catch (error) {
      // Silent fail for logging
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      features: Object.fromEntries(this.featureStatus),
      riskMetrics: this.riskMetrics,
      performanceLog: this.performanceLog.slice(-10),
      systemHealth: this.calculateSystemHealth(),
    };

    const reportPath = path.join(__dirname, '../../logs/boot-profile-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📊 Report saved to: ${reportPath}`);
    return report;
  }

  stop() {
    console.log('\n🛑 Stopping boot profile monitoring...');

    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.generateReport()
      .then(() => {
        console.log('✅ Boot profile data saved');
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Error saving report:', error);
        process.exit(1);
      });
  }
}

// CLI execution
if (require.main === module) {
  const visualizer = new BootProfileVisualizer();

  visualizer
    .initialize()
    .then(() => visualizer.startRealTimeMonitoring())
    .catch(error => {
      console.error('❌ Visualizer failed:', error);
      process.exit(1);
    });
}

module.exports = BootProfileVisualizer;
