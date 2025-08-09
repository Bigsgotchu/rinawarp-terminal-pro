#!/usr/bin/env node
/**
 * Production Health Monitor for RinaWarp Terminal
 */

import https from 'https';
import fs from 'fs';

const SITE_URL = 'https://rinawarptech.com';
const CHECK_INTERVAL = 60000; // 1 minute
const LOG_FILE = './monitoring.log';

function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  console.log(logEntry.trim());
  fs.appendFileSync(LOG_FILE, logEntry);
}

function checkHealth() {
  const req = https.get(`${SITE_URL}/api/health`, res => {
    let data = '';
    res.on('data', chunk => (data += chunk));
    res.on('end', () => {
      if (res.statusCode === 200) {
        const health = JSON.parse(data);
        logMessage(
          `✅ Site healthy - Status: ${health.status}, Uptime: ${Math.floor(health.uptime)}s`
        );
      } else {
        logMessage(`⚠️ Site issue - HTTP ${res.statusCode}`);
      }
    });
  });

  req.on('error', error => {
    logMessage(`❌ Site down - ${error.message}`);
  });

  req.setTimeout(10000, () => {
    logMessage(`⏰ Site timeout - No response in 10s`);
    req.abort();
  });
}

logMessage('🚀 Production monitoring started for RinaWarp Terminal');
checkHealth(); // Initial check
setInterval(checkHealth, CHECK_INTERVAL);
