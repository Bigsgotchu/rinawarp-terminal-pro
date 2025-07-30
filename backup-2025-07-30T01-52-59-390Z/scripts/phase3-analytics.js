#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  primaryDomain: 'https://rinawarptech.com',
  analyticsFile: './logs/analytics.json',
  downloadTrackingFile: './logs/downloads.json',
  userInteractionFile: './logs/interactions.json',
  alertsFile: './logs/alerts.json',
  reportInterval: 24 * 60 * 60 * 1000, // 24 hours
  checkInterval: 5 * 60 * 1000, // 5 minutes
  thresholds: {
    uptimeWarning: 95, // Below 95% uptime
    responseTimeWarning: 2000, // Above 2 seconds
    errorRateWarning: 5, // Above 5% error rate
    downloadFailureWarning: 10, // Above 10% download failure rate
  },
};

// Color utilities
const colors = {
  green: text => `\x1b[32m${text}\x1b[0m`,
  red: text => `\x1b[31m${text}\x1b[0m`,
  yellow: text => `\x1b[33m${text}\x1b[0m`,
  blue: text => `\x1b[34m${text}\x1b[0m`,
  cyan: text => `\x1b[36m${text}\x1b[0m`,
  gray: text => `\x1b[90m${text}\x1b[0m`,
  bold: text => `\x1b[1m${text}\x1b[0m`,
  bgGreen: text => `\x1b[42m\x1b[30m${text}\x1b[0m`,
  bgRed: text => `\x1b[41m\x1b[37m${text}\x1b[0m`,
  bgYellow: text => `\x1b[43m\x1b[30m${text}\x1b[0m`,
};

// Ensure logs directory exists
const logsDir = path.dirname(CONFIG.analyticsFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Analytics data structure
let analytics = {
  startTime: Date.now(),
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  uptimePercentage: 100,
  downloads: {
    windows: 0,
    macOS: 0,
    linux: 0,
    portable: 0,
  },
  errors: [],
  alerts: [],
  dailyStats: {},
  lastUpdated: Date.now(),
};

// Load existing analytics
function loadAnalytics() {
  try {
    if (fs.existsSync(CONFIG.analyticsFile)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.analyticsFile, 'utf8'));
      analytics = { ...analytics, ...data };
    }
  } catch (error) {
    console.error(colors.red('Error loading analytics data:'), error.message);
  }
}

// Save analytics
function saveAnalytics() {
  try {
    fs.writeFileSync(CONFIG.analyticsFile, JSON.stringify(analytics, null, 2));
  } catch (error) {
    console.error(colors.red('Error saving analytics data:'), error.message);
  }
}

// Log function
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
    alert: colors.bgRed,
  };

  console.log(colorMap[level] ? colorMap[level](logEntry) : logEntry);
}

// Check site health and collect metrics
async function collectMetrics() {
  try {
    const startTime = Date.now();

    // Use curl to check site health
    const curlResult = execSync(
      `curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" -L "${CONFIG.primaryDomain}"`,
      { encoding: 'utf8' }
    );

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Parse curl output
    const statusMatch = curlResult.match(/HTTPSTATUS:(\d+)/);
    const timeMatch = curlResult.match(/TIME:([0-9.]+)/);

    const status = statusMatch ? parseInt(statusMatch[1]) : 0;
    const curlTime = timeMatch ? parseFloat(timeMatch[1]) * 1000 : responseTime;

    // Update analytics
    analytics.totalRequests++;
    analytics.lastUpdated = Date.now();

    if (status >= 200 && status < 400) {
      analytics.successfulRequests++;

      // Update average response time
      analytics.averageResponseTime =
        (analytics.averageResponseTime * (analytics.successfulRequests - 1) + curlTime) /
        analytics.successfulRequests;

      log(`✅ Site healthy - Status: ${status}, Response: ${curlTime.toFixed(2)}ms`, 'success');
    } else {
      analytics.failedRequests++;
      analytics.errors.push({
        timestamp: Date.now(),
        status,
        responseTime: curlTime,
        error: `HTTP ${status} error`,
      });

      log(`❌ Site error - Status: ${status}, Response: ${curlTime.toFixed(2)}ms`, 'error');
    }

    // Calculate uptime percentage
    analytics.uptimePercentage = (analytics.successfulRequests / analytics.totalRequests) * 100;

    // Check thresholds and generate alerts
    checkThresholds();

    // Save analytics
    saveAnalytics();
  } catch (error) {
    analytics.failedRequests++;
    analytics.errors.push({
      timestamp: Date.now(),
      error: error.message,
    });

    log(`💥 Metrics collection error: ${error.message}`, 'error');
  }
}

// Check thresholds and generate alerts
function checkThresholds() {
  const _now = Date.now();

  // Check uptime
  if (analytics.uptimePercentage < CONFIG.thresholds.uptimeWarning) {
    createAlert('UPTIME_LOW', `Uptime dropped to ${analytics.uptimePercentage.toFixed(2)}%`);
  }

  // Check response time
  if (analytics.averageResponseTime > CONFIG.thresholds.responseTimeWarning) {
    createAlert(
      'RESPONSE_TIME_HIGH',
      `Average response time: ${analytics.averageResponseTime.toFixed(2)}ms`
    );
  }

  // Check error rate
  const errorRate = (analytics.failedRequests / analytics.totalRequests) * 100;
  if (errorRate > CONFIG.thresholds.errorRateWarning) {
    createAlert('ERROR_RATE_HIGH', `Error rate: ${errorRate.toFixed(2)}%`);
  }
}

// Create alert
function createAlert(type, message) {
  const alert = {
    timestamp: Date.now(),
    type,
    message,
    severity: getSeverity(type),
  };

  analytics.alerts.push(alert);

  log(`🚨 ALERT [${type}]: ${message}`, 'alert');

  // Keep only last 100 alerts
  if (analytics.alerts.length > 100) {
    analytics.alerts = analytics.alerts.slice(-100);
  }
}

// Get alert severity
function getSeverity(type) {
  const severityMap = {
    UPTIME_LOW: 'HIGH',
    RESPONSE_TIME_HIGH: 'MEDIUM',
    ERROR_RATE_HIGH: 'HIGH',
    DOWNLOAD_FAILURE_HIGH: 'MEDIUM',
  };
  return severityMap[type] || 'LOW';
}

// Generate analytics report
function generateReport() {
  const uptime = (Date.now() - analytics.startTime) / 1000 / 60 / 60; // hours
  const errorRate = (analytics.failedRequests / analytics.totalRequests) * 100;

  console.log(colors.bold(colors.cyan('\\n📊 RinaWarp Terminal Analytics Report')));
  console.log(colors.cyan('='.repeat(50)));

  console.log(colors.bold('\\n🌐 Site Performance:'));
  console.log(`   Total Requests: ${analytics.totalRequests}`);
  console.log(
    `   Successful: ${analytics.successfulRequests} (${analytics.uptimePercentage.toFixed(2)}%)`
  );
  console.log(`   Failed: ${analytics.failedRequests} (${errorRate.toFixed(2)}%)`);
  console.log(`   Average Response Time: ${analytics.averageResponseTime.toFixed(2)}ms`);
  console.log(`   Monitoring Duration: ${uptime.toFixed(2)} hours`);

  console.log(colors.bold('\\n📥 Download Statistics:'));
  console.log(`   Windows: ${analytics.downloads.windows}`);
  console.log(`   macOS: ${analytics.downloads.macOS}`);
  console.log(`   Linux: ${analytics.downloads.linux}`);
  console.log(`   Portable: ${analytics.downloads.portable}`);

  console.log(colors.bold('\\n🚨 Recent Alerts:'));
  const recentAlerts = analytics.alerts.slice(-5);
  if (recentAlerts.length === 0) {
    console.log('   No recent alerts');
  } else {
    recentAlerts.forEach(alert => {
      const date = new Date(alert.timestamp).toLocaleString();
      console.log(`   [${date}] ${alert.type}: ${alert.message}`);
    });
  }

  console.log(colors.bold('\\n🔗 Quick Links:'));
  console.log(`   Primary Site: ${CONFIG.primaryDomain}`);
  console.log(`   Analytics File: ${CONFIG.analyticsFile}`);
  console.log(`   Log Directory: ${logsDir}`);

  console.log(colors.cyan('\\n' + '='.repeat(50)));
}

// Track download attempts
function trackDownload(platform) {
  analytics.downloads[platform] = (analytics.downloads[platform] || 0) + 1;
  log(`📥 Download tracked: ${platform}`, 'info');
  saveAnalytics();
}

// Create download tracking endpoint simulation
function simulateDownloadTracking() {
  // Simulate some download activity for demonstration
  const platforms = ['windows', 'macOS', 'linux', 'portable'];
  const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];

  if (Math.random() < 0.1) {
    // 10% chance of simulated download
    trackDownload(randomPlatform);
  }
}

// Start monitoring
function startMonitoring() {
  log('🚀 Starting Phase 3 Advanced Analytics & Monitoring', 'info');
  log(`📊 Primary Domain: ${CONFIG.primaryDomain}`, 'info');
  log(`⏱️  Check Interval: ${CONFIG.checkInterval / 1000}s`, 'info');
  log(`📋 Analytics File: ${CONFIG.analyticsFile}`, 'info');

  // Load existing data
  loadAnalytics();

  // Initial metrics collection
  collectMetrics();

  // Set up intervals
  const metricsInterval = setInterval(() => {
    collectMetrics();
    simulateDownloadTracking();
  }, CONFIG.checkInterval);

  const reportInterval = setInterval(() => {
    generateReport();
  }, CONFIG.reportInterval);

  // Generate initial report
  setTimeout(() => {
    generateReport();
  }, 5000);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log('🛑 Shutting down monitoring...', 'info');
    clearInterval(metricsInterval);
    clearInterval(reportInterval);
    generateReport();
    process.exit(0);
  });
}

// Export functions for use in other modules
module.exports = {
  collectMetrics,
  generateReport,
  trackDownload,
  startMonitoring,
  analytics,
  loadAnalytics,
  saveAnalytics,
};

// Start monitoring if run directly
if (require.main === module) {
  startMonitoring();
}
