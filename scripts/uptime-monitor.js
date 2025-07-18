#!/usr/bin/env node

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  primaryDomain: 'https://rinawarptech.com',
  backupDomains: [
    'https://rinawarp-terminal.web.app'
  ],
  checkInterval: 60000, // 1 minute
  logFile: './logs/uptime.log',
  alertThreshold: 3, // consecutive failures before alert
  timeout: 10000 // 10 seconds
};

// Color utilities
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`
};

// State tracking
let failureCount = 0;
let lastStatus = 'unknown';
let uptimeStartTime = Date.now();
let totalChecks = 0;
let successfulChecks = 0;

// Ensure logs directory exists
const logDir = path.dirname(CONFIG.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Log function
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  
  // Console output with colors
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red
  };
  
  console.log(colorMap[level] ? colorMap[level](logEntry.trim()) : logEntry.trim());
  
  // File output
  fs.appendFileSync(CONFIG.logFile, logEntry);
}

// Check site availability
async function checkSite(url) {
  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      timeout: CONFIG.timeout,
      headers: {
        'User-Agent': 'RinaWarp-UptimeMonitor/1.0'
      }
    });
    
    const responseTime = Date.now() - startTime;
    const status = response.status;
    const isUp = status >= 200 && status < 400;
    
    // Check if content is correct (not Firebase default page)
    const content = await response.text();
    const hasCorrectContent = content.includes('RinaWarp Terminal') && 
                             content.includes('Advanced Terminal Emulator');
    
    return {
      url,
      isUp,
      status,
      responseTime,
      hasCorrectContent,
      contentLength: content.length
    };
  } catch (error) {
    return {
      url,
      isUp: false,
      status: 'ERROR',
      responseTime: CONFIG.timeout,
      hasCorrectContent: false,
      error: error.message
    };
  }
}

// Check all domains
async function checkAllDomains() {
  const results = [];
  
  // Check primary domain
  const primaryResult = await checkSite(CONFIG.primaryDomain);
  results.push(primaryResult);
  
  // Check backup domains
  for (const domain of CONFIG.backupDomains) {
    const result = await checkSite(domain);
    results.push(result);
  }
  
  return results;
}

// Generate uptime statistics
function getUptimeStats() {
  const uptimeHours = (Date.now() - uptimeStartTime) / (1000 * 60 * 60);
  const uptimePercentage = totalChecks > 0 ? (successfulChecks / totalChecks * 100).toFixed(2) : 0;
  
  return {
    uptimeHours: uptimeHours.toFixed(2),
    uptimePercentage,
    totalChecks,
    successfulChecks,
    failedChecks: totalChecks - successfulChecks
  };
}

// Send alert (placeholder - can be extended with Slack, email, etc.)
function sendAlert(message) {
  log(`🚨 ALERT: ${message}`, 'error');
  
  // TODO: Implement Slack webhook, email, or other alerting
  // Example Slack webhook:
  // const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  // if (webhookUrl) {
  //   fetch(webhookUrl, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ text: `🚨 RinaWarp Terminal Alert: ${message}` })
  //   });
  // }
}

// Main monitoring function
async function runMonitoring() {
  totalChecks++;
  
  try {
    const results = await checkAllDomains();
    const primaryResult = results[0];
    
    // Update counters
    if (primaryResult.isUp && primaryResult.hasCorrectContent) {
      successfulChecks++;
      failureCount = 0;
      
      if (lastStatus !== 'up') {
        log(`✅ PRIMARY DOMAIN RECOVERED: ${CONFIG.primaryDomain} - Status: ${primaryResult.status} (${primaryResult.responseTime}ms)`, 'success');
        lastStatus = 'up';
      }
    } else {
      failureCount++;
      
      if (lastStatus !== 'down') {
        log(`❌ PRIMARY DOMAIN DOWN: ${CONFIG.primaryDomain} - Status: ${primaryResult.status} - Error: ${primaryResult.error || 'Unknown'}`, 'error');
        lastStatus = 'down';
      }
      
      // Check if we should send an alert
      if (failureCount >= CONFIG.alertThreshold) {
        sendAlert(`Primary domain ${CONFIG.primaryDomain} has been down for ${failureCount} consecutive checks`);
      }
    }
    
    // Log detailed results
    results.forEach(result => {
      const statusIcon = result.isUp ? '✅' : '❌';
      const contentIcon = result.hasCorrectContent ? '📄' : '⚠️';
      const logMessage = `${statusIcon}${contentIcon} ${result.url} - ${result.status} (${result.responseTime}ms) - ${result.contentLength} bytes`;
      
      log(logMessage, result.isUp ? 'info' : 'warning');
    });
    
    // Log statistics periodically
    if (totalChecks % 60 === 0) { // Every hour
      const stats = getUptimeStats();
      log(`📊 UPTIME STATS: ${stats.uptimePercentage}% uptime over ${stats.uptimeHours}h (${stats.successfulChecks}/${stats.totalChecks} checks)`, 'info');
    }
    
  } catch (error) {
    log(`💥 MONITORING ERROR: ${error.message}`, 'error');
  }
}

// Start monitoring
function startMonitoring() {
  log(`🚀 Starting uptime monitoring for ${CONFIG.primaryDomain}`, 'info');
  log(`📋 Monitoring interval: ${CONFIG.checkInterval / 1000}s`, 'info');
  log(`🔔 Alert threshold: ${CONFIG.alertThreshold} consecutive failures`, 'info');
  log(`📁 Log file: ${CONFIG.logFile}`, 'info');
  
  // Run initial check
  runMonitoring();
  
  // Set up interval
  setInterval(runMonitoring, CONFIG.checkInterval);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  const stats = getUptimeStats();
  log(`🏁 Monitoring stopped. Final stats: ${stats.uptimePercentage}% uptime over ${stats.uptimeHours}h`, 'info');
  process.exit(0);
});

// Start monitoring if run directly
if (require.main === module) {
  startMonitoring();
}

module.exports = {
  checkSite,
  checkAllDomains,
  getUptimeStats,
  startMonitoring
};
