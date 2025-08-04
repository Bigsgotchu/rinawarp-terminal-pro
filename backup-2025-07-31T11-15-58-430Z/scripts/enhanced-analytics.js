#!/usr/bin/env node
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  primaryDomain: 'https://rinawarptech.com',
  backupDomain: 'https://rinawarp-terminal.web.app',
  analyticsFile: './logs/enhanced-analytics.json',
  alertsFile: './logs/alerts.json',
  downloadTrackingFile: './logs/download-tracking.json',
  userBehaviorFile: './logs/user-behavior.json',
  checkInterval: 2 * 60 * 1000, // 2 minutes for demo
  reportInterval: 30 * 60 * 1000, // 30 minutes
  alertConfig: {
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      enabled: !!process.env.SLACK_WEBHOOK_URL,
    },
    email: {
      enabled: false, // Set to true when configured
      smtp: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      to: process.env.ALERT_EMAIL || 'rinawarptechnologies25@gmail.com',
    },
  },
  thresholds: {
    uptimeWarning: 98,
    uptimeCritical: 95,
    responseTimeWarning: 1500,
    responseTimeCritical: 3000,
    errorRateWarning: 2,
    errorRateCritical: 5,
    downloadFailureWarning: 5,
    downloadFailureCritical: 15,
  },
};

// Color utilities
const colors = {
  green: text => `\x1b[32m${text}\x1b[0m`,
  red: text => `\x1b[31m${text}\x1b[0m`,
  yellow: text => `\x1b[33m${text}\x1b[0m`,
  blue: text => `\x1b[34m${text}\x1b[0m`,
  cyan: text => `\x1b[36m${text}\x1b[0m`,
  magenta: text => `\x1b[35m${text}\x1b[0m`,
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

// Enhanced analytics data structure
let analytics = {
  startTime: Date.now(),
  lastUpdated: Date.now(),

  // Site performance
  siteHealth: {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    uptimePercentage: 100,
    lastCheck: null,
    errors: [],
  },

  // Download tracking
  downloads: {
    total: 0,
    byPlatform: {
      windows: { total: 0, installer: 0, portable: 0 },
      macOS: 0,
      linux: 0,
    },
    byHour: {},
    byDay: {},
    failures: 0,
    successRate: 100,
  },

  // User behavior simulation
  userBehavior: {
    pageViews: 0,
    uniqueVisitors: 0,
    bounceRate: 0,
    averageSessionDuration: 0,
    topPages: {},
    referrers: {},
    devices: { desktop: 0, mobile: 0, tablet: 0 },
  },

  // Alerts
  alerts: [],
  alertsSent: 0,
  lastAlertTime: 0,
};

// Load existing analytics
function loadAnalytics() {
  try {
    if (fs.existsSync(CONFIG.analyticsFile)) {
      const data = JSON.parse(fs.readFileSync(CONFIG.analyticsFile, 'utf8'));
      analytics = { ...analytics, ...data };
    }
  } catch (error) {
    log(`Error loading analytics: ${error.message}`, 'error');
  }
}

// Save analytics
function saveAnalytics() {
  try {
    fs.writeFileSync(CONFIG.analyticsFile, JSON.stringify(analytics, null, 2));
  } catch (error) {
    log(`Error saving analytics: ${error.message}`, 'error');
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
    critical: colors.bgRed,
    alert: colors.bgYellow,
  };

  console.log(colorMap[level] ? colorMap[level](logEntry) : logEntry);
}

// Check site health
async function checkSiteHealth() {
  try {
    const _startTime = Date.now();

    // Test primary domain
    const primaryResult = await testEndpoint(CONFIG.primaryDomain);

    // Test download endpoints
    const downloadTests = await testDownloadEndpoints();

    const _endTime = Date.now();

    // Update analytics
    analytics.siteHealth.totalRequests++;
    analytics.siteHealth.lastCheck = Date.now();
    analytics.lastUpdated = Date.now();

    if (primaryResult.status >= 200 && primaryResult.status < 400) {
      analytics.siteHealth.successfulRequests++;

      // Update average response time
      const responseTime = primaryResult.responseTime;
      analytics.siteHealth.averageResponseTime =
        (analytics.siteHealth.averageResponseTime * (analytics.siteHealth.successfulRequests - 1) +
          responseTime) /
        analytics.siteHealth.successfulRequests;

      log(
        `✅ Site healthy - Status: ${primaryResult.status}, Response: ${responseTime.toFixed(2)}ms`,
        'success'
      );
    } else {
      analytics.siteHealth.failedRequests++;
      analytics.siteHealth.errors.push({
        timestamp: Date.now(),
        status: primaryResult.status,
        error: primaryResult.error || `HTTP ${primaryResult.status}`,
      });

      log(`❌ Site error - Status: ${primaryResult.status}`, 'error');
    }

    // Calculate uptime
    analytics.siteHealth.uptimePercentage =
      (analytics.siteHealth.successfulRequests / analytics.siteHealth.totalRequests) * 100;

    // Update download success rate
    updateDownloadMetrics(downloadTests);

    // Check thresholds
    checkAlertThresholds();

    // Simulate user behavior
    simulateUserBehavior();

    // Save data
    saveAnalytics();
  } catch (error) {
    analytics.siteHealth.failedRequests++;
    log(`💥 Health check error: ${error.message}`, 'error');
  }
}

// Test endpoint
async function testEndpoint(url) {
  try {
    const startTime = Date.now();
    const curlResult = execSync(
      `curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" -L "${url}"`,
      { encoding: 'utf8', timeout: 10000 }
    );

    const statusMatch = curlResult.match(/HTTPSTATUS:(\d+)/);
    const timeMatch = curlResult.match(/TIME:([0-9.]+)/);

    return {
      status: statusMatch ? parseInt(statusMatch[1]) : 0,
      responseTime: timeMatch ? parseFloat(timeMatch[1]) * 1000 : Date.now() - startTime,
      content: curlResult.replace(/HTTPSTATUS:\d+;TIME:[0-9.]+$/, ''),
    };
  } catch (error) {
    return {
      status: 0,
      responseTime: 10000,
      error: error.message,
    };
  }
}

// Test download endpoints
async function testDownloadEndpoints() {
  const downloadUrls = [
    `${CONFIG.primaryDomain}/releases/RinaWarp-Terminal-Setup-Windows.exe`,
    `${CONFIG.primaryDomain}/releases/RinaWarp-Terminal-Portable-Windows.exe`,
    `${CONFIG.primaryDomain}/releases/RinaWarp-Terminal-Linux.tar.gz`,
    `${CONFIG.primaryDomain}/releases/RinaWarp-Terminal-macOS.dmg`,
  ];

  const results = [];

  for (const url of downloadUrls) {
    try {
      const result = execSync(`curl -I -s "${url}"`, { encoding: 'utf8', timeout: 5000 });
      const statusMatch = result.match(/HTTP\/[12]\.[01] (\d+)/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 0;

      results.push({
        url,
        status,
        success: status >= 200 && status < 400,
      });
    } catch (error) {
      results.push({
        url,
        status: 0,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

// Update download metrics
function updateDownloadMetrics(downloadTests) {
  const successfulDownloads = downloadTests.filter(test => test.success).length;
  const totalTests = downloadTests.length;

  analytics.downloads.successRate = (successfulDownloads / totalTests) * 100;

  if (successfulDownloads < totalTests) {
    analytics.downloads.failures += totalTests - successfulDownloads;
    log(`⚠️ Download availability: ${successfulDownloads}/${totalTests} working`, 'warning');
  }
}

// Simulate user behavior (for demonstration)
function simulateUserBehavior() {
  // Simulate some realistic user activity
  if (Math.random() < 0.3) {
    // 30% chance of user activity
    analytics.userBehavior.pageViews++;

    if (Math.random() < 0.7) {
      // 70% chance it's a unique visitor
      analytics.userBehavior.uniqueVisitors++;
    }

    // Simulate device types
    const _deviceTypes = ['desktop', 'mobile', 'tablet'];
    const deviceWeights = [0.6, 0.3, 0.1]; // Desktop 60%, Mobile 30%, Tablet 10%
    const randomDevice = Math.random();
    let deviceType = 'desktop';

    if (randomDevice < deviceWeights[1]) deviceType = 'mobile';
    else if (randomDevice < deviceWeights[1] + deviceWeights[2]) deviceType = 'tablet';

    analytics.userBehavior.devices[deviceType]++;

    // Simulate download activity
    if (Math.random() < 0.15) {
      // 15% chance of download
      simulateDownload();
    }
  }
}

// Simulate download
function simulateDownload() {
  const platforms = ['windows', 'macOS', 'linux'];
  const platform = platforms[Math.floor(Math.random() * platforms.length)];

  analytics.downloads.total++;

  if (platform === 'windows') {
    const type = Math.random() < 0.7 ? 'installer' : 'portable';
    analytics.downloads.byPlatform.windows[type]++;
    analytics.downloads.byPlatform.windows.total++;
  } else {
    analytics.downloads.byPlatform[platform]++;
  }

  // Track by hour
  const hour = new Date().getHours();
  analytics.downloads.byHour[hour] = (analytics.downloads.byHour[hour] || 0) + 1;

  // Track by day
  const day = new Date().toDateString();
  analytics.downloads.byDay[day] = (analytics.downloads.byDay[day] || 0) + 1;

  log(`📥 Download simulated: ${platform}`, 'info');
}

// Check alert thresholds
function checkAlertThresholds() {
  const _now = Date.now();
  const uptime = analytics.siteHealth.uptimePercentage;
  const responseTime = analytics.siteHealth.averageResponseTime;
  const errorRate =
    (analytics.siteHealth.failedRequests / analytics.siteHealth.totalRequests) * 100;
  const downloadSuccessRate = analytics.downloads.successRate;

  // Uptime alerts
  if (uptime < CONFIG.thresholds.uptimeCritical) {
    createAlert('UPTIME_CRITICAL', `Site uptime critically low: ${uptime.toFixed(2)}%`, 'critical');
  } else if (uptime < CONFIG.thresholds.uptimeWarning) {
    createAlert('UPTIME_WARNING', `Site uptime warning: ${uptime.toFixed(2)}%`, 'warning');
  }

  // Response time alerts
  if (responseTime > CONFIG.thresholds.responseTimeCritical) {
    createAlert(
      'RESPONSE_TIME_CRITICAL',
      `Response time critically high: ${responseTime.toFixed(2)}ms`,
      'critical'
    );
  } else if (responseTime > CONFIG.thresholds.responseTimeWarning) {
    createAlert(
      'RESPONSE_TIME_WARNING',
      `Response time warning: ${responseTime.toFixed(2)}ms`,
      'warning'
    );
  }

  // Error rate alerts
  if (errorRate > CONFIG.thresholds.errorRateCritical) {
    createAlert(
      'ERROR_RATE_CRITICAL',
      `Error rate critically high: ${errorRate.toFixed(2)}%`,
      'critical'
    );
  } else if (errorRate > CONFIG.thresholds.errorRateWarning) {
    createAlert('ERROR_RATE_WARNING', `Error rate warning: ${errorRate.toFixed(2)}%`, 'warning');
  }

  // Download success rate alerts
  if (downloadSuccessRate < 100 - CONFIG.thresholds.downloadFailureCritical) {
    createAlert(
      'DOWNLOAD_CRITICAL',
      `Download success rate critically low: ${downloadSuccessRate.toFixed(2)}%`,
      'critical'
    );
  } else if (downloadSuccessRate < 100 - CONFIG.thresholds.downloadFailureWarning) {
    createAlert(
      'DOWNLOAD_WARNING',
      `Download success rate warning: ${downloadSuccessRate.toFixed(2)}%`,
      'warning'
    );
  }
}

// Create alert
function createAlert(type, message, severity = 'warning') {
  const alert = {
    timestamp: Date.now(),
    type,
    message,
    severity,
    id: `${type}_${Date.now()}`,
  };

  analytics.alerts.push(alert);
  analytics.alertsSent++;
  analytics.lastAlertTime = Date.now();

  log(`🚨 ${severity.toUpperCase()} ALERT [${type}]: ${message}`, severity);

  // Send notifications
  sendAlertNotifications(alert);

  // Keep only last 50 alerts
  if (analytics.alerts.length > 50) {
    analytics.alerts = analytics.alerts.slice(-50);
  }
}

// Send alert notifications
async function sendAlertNotifications(alert) {
  try {
    // Slack notification
    if (CONFIG.alertConfig.slack.enabled) {
      await sendSlackAlert(alert);
    }

    // Email notification (placeholder)
    if (CONFIG.alertConfig.email.enabled) {
      await sendEmailAlert(alert);
    }
  } catch (error) {
    log(`Error sending alert notifications: ${error.message}`, 'error');
  }
}

// Send Slack alert
async function sendSlackAlert(alert) {
  try {
    const webhookUrl = CONFIG.alertConfig.slack.webhookUrl;
    if (!webhookUrl) return;

    const emoji = {
      warning: '⚠️',
      critical: '🚨',
      info: 'ℹ️',
    };

    const color = {
      warning: '#ff9500',
      critical: '#ff0000',
      info: '#0099ff',
    };

    const payload = {
      text: `${emoji[alert.severity] || '📊'} RinaWarp Terminal Alert`,
      attachments: [
        {
          color: color[alert.severity] || '#0099ff',
          fields: [
            { title: 'Alert Type', value: alert.type, short: true },
            { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
            { title: 'Message', value: alert.message, short: false },
            { title: 'Time', value: new Date(alert.timestamp).toLocaleString(), short: true },
          ],
        },
      ],
    };

    // Use curl to send Slack notification
    const curlCommand = `curl -X POST -H 'Content-type: application/json' --data '${JSON.stringify(payload)}' "${webhookUrl}"`;
    execSync(curlCommand, { timeout: 5000 });

    log(`📤 Slack alert sent for ${alert.type}`, 'info');
  } catch (error) {
    log(`Failed to send Slack alert: ${error.message}`, 'error');
  }
}

// Send email alert (placeholder)
async function sendEmailAlert(alert) {
  // Placeholder for email functionality
  log(`📧 Email alert would be sent for ${alert.type}`, 'info');
}

// Generate comprehensive report
function generateReport() {
  const uptime = (Date.now() - analytics.startTime) / 1000 / 60 / 60; // hours
  const errorRate =
    analytics.siteHealth.totalRequests > 0
      ? (analytics.siteHealth.failedRequests / analytics.siteHealth.totalRequests) * 100
      : 0;

  console.log(colors.bold(colors.cyan('\\n📊 RinaWarp Terminal Enhanced Analytics Report')));
  console.log(colors.cyan('='.repeat(60)));

  // Site Performance
  console.log(colors.bold('\\n🌐 Site Performance:'));
  console.log(`   Total Requests: ${analytics.siteHealth.totalRequests}`);
  console.log(
    `   Successful: ${analytics.siteHealth.successfulRequests} (${analytics.siteHealth.uptimePercentage.toFixed(2)}%)`
  );
  console.log(`   Failed: ${analytics.siteHealth.failedRequests} (${errorRate.toFixed(2)}%)`);
  console.log(`   Average Response Time: ${analytics.siteHealth.averageResponseTime.toFixed(2)}ms`);
  console.log(`   Monitoring Duration: ${uptime.toFixed(2)} hours`);

  // Download Statistics
  console.log(colors.bold('\\n📥 Download Statistics:'));
  console.log(`   Total Downloads: ${analytics.downloads.total}`);
  console.log(
    `   Windows: ${analytics.downloads.byPlatform.windows.total} (Installer: ${analytics.downloads.byPlatform.windows.installer}, Portable: ${analytics.downloads.byPlatform.windows.portable})`
  );
  console.log(`   macOS: ${analytics.downloads.byPlatform.macOS}`);
  console.log(`   Linux: ${analytics.downloads.byPlatform.linux}`);
  console.log(`   Success Rate: ${analytics.downloads.successRate.toFixed(2)}%`);
  console.log(`   Failures: ${analytics.downloads.failures}`);

  // User Behavior
  console.log(colors.bold('\\n👥 User Behavior:'));
  console.log(`   Page Views: ${analytics.userBehavior.pageViews}`);
  console.log(`   Unique Visitors: ${analytics.userBehavior.uniqueVisitors}`);
  console.log(
    `   Desktop: ${analytics.userBehavior.devices.desktop}, Mobile: ${analytics.userBehavior.devices.mobile}, Tablet: ${analytics.userBehavior.devices.tablet}`
  );

  // Alerts
  console.log(colors.bold('\\n🚨 Alert Summary:'));
  console.log(`   Total Alerts Sent: ${analytics.alertsSent}`);
  const recentAlerts = analytics.alerts.slice(-3);
  if (recentAlerts.length === 0) {
    console.log('   No recent alerts');
  } else {
    console.log('   Recent Alerts:');
    recentAlerts.forEach(alert => {
      const date = new Date(alert.timestamp).toLocaleString();
      console.log(`     [${date}] ${alert.severity.toUpperCase()}: ${alert.message}`);
    });
  }

  // Configuration
  console.log(colors.bold('\\n⚙️ Configuration:'));
  console.log(`   Primary Domain: ${CONFIG.primaryDomain}`);
  console.log(`   Check Interval: ${CONFIG.checkInterval / 1000}s`);
  console.log(`   Slack Alerts: ${CONFIG.alertConfig.slack.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`   Email Alerts: ${CONFIG.alertConfig.email.enabled ? 'Enabled' : 'Disabled'}`);

  console.log(colors.cyan('\\n' + '='.repeat(60)));
}

// Start monitoring
function startEnhancedMonitoring() {
  log('🚀 Starting Enhanced Analytics & Monitoring', 'info');
  log(`📊 Primary Domain: ${CONFIG.primaryDomain}`, 'info');
  log(`⏱️  Check Interval: ${CONFIG.checkInterval / 1000}s`, 'info');
  log(`📋 Analytics File: ${CONFIG.analyticsFile}`, 'info');
  log(`📤 Slack Alerts: ${CONFIG.alertConfig.slack.enabled ? 'Enabled' : 'Disabled'}`, 'info');

  loadAnalytics();

  // Initial check
  checkSiteHealth();

  // Set up intervals
  const healthInterval = setInterval(checkSiteHealth, CONFIG.checkInterval);
  const reportInterval = setInterval(generateReport, CONFIG.reportInterval);

  // Generate initial report after 10 seconds
  setTimeout(generateReport, 10000);

  // Handle shutdown
  process.on('SIGINT', () => {
    log('🛑 Shutting down enhanced monitoring...', 'info');
    clearInterval(healthInterval);
    clearInterval(reportInterval);
    generateReport();
    process.exit(0);
  });
}

// Export functions
module.exports = {
  checkSiteHealth,
  generateReport,
  startEnhancedMonitoring,
  createAlert,
  simulateDownload,
  analytics,
  loadAnalytics,
  saveAnalytics,
};

// Start if run directly
if (require.main === module) {
  startEnhancedMonitoring();
}
