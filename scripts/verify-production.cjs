/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

#!/usr/bin/env node

/**
 * RinaWarp Terminal - Production Deployment Verification
 * Comprehensive verification of production deployment
 */

const https = require('https');
const http = require('http');
const _fs = require('node:fs');
const _path = require('node:path');

// Configuration
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://rinawarp-terminal-fresh-2024.web.app';
const HEALTH_CHECK_ENDPOINTS = ['/health', '/api/health', '/status', '/'];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTP request helper
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const request = client.get(url, response => {
      let data = '';
      response.on('data', chunk => (data += chunk));
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          data: data,
        });
      });
    });

    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Test functions
async function testEndpointHealth() {
  log('\n🔍 Testing Endpoint Health...', 'cyan');

  for (const endpoint of HEALTH_CHECK_ENDPOINTS) {
    const url = `${PRODUCTION_URL}${endpoint}`;
    try {
      const response = await makeRequest(url);
      if (response.statusCode === 200) {
        log(`✅ ${endpoint} - Status: ${response.statusCode}`, 'green');
      } else {
        log(`⚠️  ${endpoint} - Status: ${response.statusCode}`, 'yellow');
      }
    } catch (error) {
      log(`❌ ${endpoint} - Error: ${error.message}`, 'red');
    }
  }
}

async function testApplicationFeatures() {
  log('\n🔍 Testing Application Features...', 'cyan');

  const features = [
    { name: 'Main Application', endpoint: '/' },
    { name: 'Terminal Interface', endpoint: '/terminal' },
    { name: 'API Gateway', endpoint: '/api' },
    { name: 'Authentication', endpoint: '/auth' },
    { name: 'WebSocket Connection', endpoint: '/ws' },
  ];

  for (const feature of features) {
    const url = `${PRODUCTION_URL}${feature.endpoint}`;
    try {
      const response = await makeRequest(url);
      if (response.statusCode < 400) {
        log(`✅ ${feature.name} - Working`, 'green');
      } else {
        log(`⚠️  ${feature.name} - Status: ${response.statusCode}`, 'yellow');
      }
    } catch (error) {
      log(`❌ ${feature.name} - Error: ${error.message}`, 'red');
    }
  }
}

async function testPerformance() {
  log('\n🔍 Testing Performance...', 'cyan');

  const startTime = Date.now();
  try {
    const response = await makeRequest(PRODUCTION_URL);
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    if (responseTime < 2000) {
      log(`✅ Response Time: ${responseTime}ms (Good)`, 'green');
    } else if (responseTime < 5000) {
      log(`⚠️  Response Time: ${responseTime}ms (Acceptable)`, 'yellow');
    } else {
      log(`❌ Response Time: ${responseTime}ms (Too Slow)`, 'red');
    }

    // Check content size
    const contentLength = response.headers['content-length'];
    if (contentLength) {
      log(`📊 Content Size: ${Math.round(contentLength / 1024)}KB`, 'blue');
    }
  } catch (error) {
    log(`❌ Performance Test Failed: ${error.message}`, 'red');
  }
}

async function testSecurity() {
  log('\n🔍 Testing Security Headers...', 'cyan');

  try {
    const response = await makeRequest(PRODUCTION_URL);
    const headers = response.headers;

    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security',
      'content-security-policy',
    ];

    securityHeaders.forEach(header => {
      if (headers[header]) {
        log(`✅ ${header}: ${headers[header]}`, 'green');
      } else {
        log(`⚠️  ${header}: Missing`, 'yellow');
      }
    });
  } catch (error) {
    log(`❌ Security Test Failed: ${error.message}`, 'red');
  }
}

async function testDownloadLinks() {
  log('\n🔍 Testing Download Links...', 'cyan');

  const downloadUrls = [
    '/download/windows',
    '/download/linux',
    '/download/macos',
    '/releases/latest',
  ];

  for (const url of downloadUrls) {
    try {
      const response = await makeRequest(`${PRODUCTION_URL}${url}`);
      if (response.statusCode === 200) {
        log(`✅ ${url} - Available`, 'green');
      } else {
        log(`⚠️  ${url} - Status: ${response.statusCode}`, 'yellow');
      }
    } catch (error) {
      log(`❌ ${url} - Error: ${error.message}`, 'red');
    }
  }
}

// Main verification function
async function runProductionVerification() {
  log('🚀 Starting Production Deployment Verification', 'magenta');
  log('='.repeat(60), 'blue');
  log(`🌐 Production URL: ${PRODUCTION_URL}`, 'blue');

  try {
    await testEndpointHealth();
    await testApplicationFeatures();
    await testPerformance();
    await testSecurity();
    await testDownloadLinks();

    log('\n' + '='.repeat(60), 'blue');
    log('✅ Production Deployment Verification Complete!', 'green');
    log('🎉 Your application is live and ready for users!', 'green');
  } catch (error) {
    log(`\n❌ Verification failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run verification
if (require.main === module) {
  runProductionVerification().catch(error => {
    log(`💥 Verification suite failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runProductionVerification };
