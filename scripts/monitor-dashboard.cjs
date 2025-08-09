#!/usr/bin/env node
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal - Continuous Monitoring Dashboard
 * Provides real-time monitoring of URL-related issues after deployment
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 */

const fs = require('node:fs');
const _path = require('node:path');
const { spawn } = require('child_process');

class MonitoringDashboard {
  constructor() {
    this.isRunning = false;
    this.monitoringInterval = null;
    this.checkInterval = 60000; // 1 minute
    this.lastReport = null;
    this.issueHistory = [];
    this.alertThreshold = 3; // Number of consecutive issues before alert

    // Ensure monitoring directory exists
    if (!fs.existsSync('monitoring')) {
      fs.mkdirSync('monitoring', { recursive: true });
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}`;
    console.log(logEntry);

    // Write to dashboard log
    fs.appendFileSync('monitoring/dashboard.log', logEntry + '\n');
  }

  /**
   * Clear the terminal and show header
   */
  clearAndShowHeader() {
    /* eslint-disable-next-line no-console */
    console.clear();
    console.log('🌊 RinaWarp Terminal - Continuous Monitoring Dashboard');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📅 Started: ${new Date().toLocaleString()}`);
    console.log(`🔄 Check interval: ${this.checkInterval / 1000} seconds`);
    console.log(`📊 Issues threshold: ${this.alertThreshold} consecutive issues`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  /**
   * Run URL monitoring check
   */
  async runMonitoringCheck() {
    return new Promise((resolve, reject) => {
      const monitor = spawn('node', ['scripts/monitor-url-issues.cjs'], {
        stdio: 'pipe',
        cwd: process.cwd(),
      });

      let output = '';
      let error = '';

      monitor.stdout.on('data', data => {
        output += data.toString();
      });

      monitor.stderr.on('data', data => {
        error += data.toString();
      });

      monitor.on('close', code => {
        const result = {
          exitCode: code,
          output: output,
          error: error,
          timestamp: new Date(),
          healthy: code === 0,
        };

        resolve(result);
      });

      monitor.on('error', err => {
        reject(err);
      });
    });
  }

  /**
   * Analyze monitoring results
   */
  analyzeResults(result) {
    const issues = [];

    if (!result.healthy) {
      issues.push({
        type: 'MONITORING_FAILURE',
        message: 'URL monitoring check failed',
        details: result.error || 'Unknown error',
        timestamp: result.timestamp,
      });
    }

    // Parse output for specific issues
    if (result.output.includes('❌')) {
      const errorLines = result.output.split('\n').filter(line => line.includes('❌'));
      errorLines.forEach(line => {
        issues.push({
          type: 'URL_ISSUE',
          message: line.trim(),
          timestamp: result.timestamp,
        });
      });
    }

    // Check for network issues
    if (result.output.includes('Network connectivity issue')) {
      issues.push({
        type: 'NETWORK_ISSUE',
        message: 'Network connectivity problems detected',
        timestamp: result.timestamp,
      });
    }

    // Check for SSL issues
    if (result.output.includes('SSL certificate issue')) {
      issues.push({
        type: 'SSL_ISSUE',
        message: 'SSL certificate problems detected',
        timestamp: result.timestamp,
      });
    }

    return issues;
  }

  /**
   * Update dashboard display
   */
  updateDashboard(result) {
    const issues = this.analyzeResults(result);
    this.issueHistory.push({ timestamp: result.timestamp, issues, healthy: result.healthy });

    // Keep only last 50 checks
    if (this.issueHistory.length > 50) {
      this.issueHistory.shift();
    }

    this.clearAndShowHeader();

    // Current status
    console.log('\n📊 CURRENT STATUS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (result.healthy && issues.length === 0) {
      console.log('✅ System is healthy - no issues detected');
    } else {
      console.log(`❌ ${issues.length} issue(s) detected`);
      issues.forEach(issue => {
        console.log(`   • ${issue.type}: ${issue.message}`);
      });
    }

    console.log(`🕐 Last check: ${result.timestamp.toLocaleString()}`);
    console.log(`🔄 Next check: ${new Date(Date.now() + this.checkInterval).toLocaleString()}`);

    // Health history
    console.log('\n📈 HEALTH HISTORY (Last 10 checks)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const recentHistory = this.issueHistory.slice(-10);
    recentHistory.forEach((check, _index) => {
      const status = check.healthy ? '✅' : '❌';
      const time = check.timestamp.toLocaleTimeString();
      const issueCount = check.issues.length;
      console.log(`${status} ${time} - ${issueCount} issue(s)`);
    });

    // Alert status
    const recentIssues = this.issueHistory.slice(-this.alertThreshold);
    const consecutiveIssues = recentIssues.every(check => !check.healthy);

    if (consecutiveIssues && recentIssues.length === this.alertThreshold) {
      console.log('\n🚨 ALERT: Consecutive issues detected!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`⚠️  ${this.alertThreshold} consecutive failed checks detected`);
      console.log('🔧 Immediate attention required!');
    }

    // Success rate
    const totalChecks = this.issueHistory.length;
    const successfulChecks = this.issueHistory.filter(check => check.healthy).length;
    const successRate = totalChecks > 0 ? ((successfulChecks / totalChecks) * 100).toFixed(1) : 0;

    console.log('\n📊 STATISTICS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎯 Success rate: ${successRate}% (${successfulChecks}/${totalChecks})`);
    console.log(`📊 Total checks: ${totalChecks}`);
    console.log(`✅ Successful: ${successfulChecks}`);
    console.log(`❌ Failed: ${totalChecks - successfulChecks}`);

    // Controls
    console.log('\n🎛️  CONTROLS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Press Ctrl+C to stop monitoring');
    console.log('Press Ctrl+Z to pause/resume (if supported)');
    console.log('\n💡 For detailed logs, check: monitoring/url-issues.log');
    console.log('📄 For reports, check: monitoring/url-monitoring-report.json');
  }

  /**
   * Start continuous monitoring
   */
  async startMonitoring() {
    if (this.isRunning) {
      console.log('⚠️  Monitoring is already running');
      return;
    }

    this.isRunning = true;
    this.log('🚀 Starting continuous monitoring dashboard...');

    const runCheck = async () => {
      if (!this.isRunning) return;

      try {
        const result = await this.runMonitoringCheck();
        this.updateDashboard(result);

        // Save dashboard state
        const dashboardState = {
          timestamp: new Date().toISOString(),
          isRunning: this.isRunning,
          checkInterval: this.checkInterval,
          issueHistory: this.issueHistory.slice(-20), // Keep last 20 for state
          lastResult: result,
        };

        fs.writeFileSync(
          'monitoring/dashboard-state.json',
          JSON.stringify(dashboardState, null, 2)
        );
      } catch (error) {
        this.log(`❌ Error running monitoring check: ${error.message}`, 'ERROR');
      }
    };

    // Run initial check
    await runCheck();

    // Set up interval for continuous monitoring
    this.monitoringInterval = setInterval(runCheck, this.checkInterval);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stopMonitoring();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.stopMonitoring();
      process.exit(0);
    });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.log('🛑 Stopped continuous monitoring dashboard');
    console.log('\n🌊 RinaWarp Terminal Monitoring Dashboard Stopped');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Final statistics:');

    if (this.issueHistory.length > 0) {
      const totalChecks = this.issueHistory.length;
      const successfulChecks = this.issueHistory.filter(check => check.healthy).length;
      const successRate = ((successfulChecks / totalChecks) * 100).toFixed(1);

      console.log(`   🎯 Success rate: ${successRate}%`);
      console.log(`   📊 Total checks: ${totalChecks}`);
      console.log(`   ✅ Successful: ${successfulChecks}`);
      console.log(`   ❌ Failed: ${totalChecks - successfulChecks}`);
    }

    console.log('💡 Logs saved to monitoring/dashboard.log');
    console.log('📄 Dashboard state saved to monitoring/dashboard-state.json');
  }
}

// Command line interface
if (require.main === module) {
  const dashboard = new MonitoringDashboard();

  const command = process.argv[2];

  switch (command) {
    case 'start':
      dashboard.startMonitoring().catch(error => {
        console.error('❌ Failed to start monitoring:', error);
        process.exit(1);
      });
      break;

    case 'stop':
      dashboard.stopMonitoring();
      break;

    case 'status':
      // Show current status from saved state
      try {
        const state = JSON.parse(fs.readFileSync('monitoring/dashboard-state.json', 'utf8'));
        console.log('📊 Dashboard Status:');
        console.log(`   🔄 Running: ${state.isRunning ? 'Yes' : 'No'}`);
        console.log(`   🕐 Last check: ${state.timestamp}`);
        console.log(`   📊 Check interval: ${state.checkInterval / 1000} seconds`);
        console.log(`   📈 Recent checks: ${state.issueHistory.length}`);
      } catch (error) {
        console.log('❌ No dashboard state found. Dashboard is not running.');
      }
      break;

    default:
      console.log('🌊 RinaWarp Terminal - Monitoring Dashboard');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Usage:');
      console.log('  node scripts/monitor-dashboard.cjs start   - Start continuous monitoring');
      console.log('  node scripts/monitor-dashboard.cjs stop    - Stop monitoring');
      console.log('  node scripts/monitor-dashboard.cjs status  - Show current status');
      console.log('');
      console.log('The dashboard will continuously monitor for URL-related issues');
      console.log('and provide real-time feedback on system health.');
  }
}

module.exports = MonitoringDashboard;
