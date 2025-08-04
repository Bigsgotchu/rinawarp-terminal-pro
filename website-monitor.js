#!/usr/bin/env node

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Configuration
const SITE_URL = process.env.SITE_URL || 'https://rinawarptech.com';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const LOG_FILE = path.join(__dirname, 'logs', 'website-health.log');

// Ensure logs directory exists
if (!fs.existsSync(path.join(__dirname, 'logs'))) {
  fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
}

// Health checks to perform
const healthChecks = [
  {
    name: 'Homepage Load',
    url: '/',
    expectedStatus: 200,
    checkContent: ['RinaWarp Terminal', 'pricing', 'download'],
  },
  {
    name: 'Pricing Page',
    url: '/pricing.html',
    expectedStatus: 200,
    checkContent: ['$29', '$99', '$299'],
  },
  {
    name: 'Payment API',
    url: '/api/payment/config',
    expectedStatus: 200,
    checkJson: true,
  },
  {
    name: 'Health Check',
    url: '/health',
    expectedStatus: 200,
    checkJson: true,
  },
  {
    name: 'Success Page',
    url: '/public/success.html',
    expectedStatus: 200,
    checkContent: ['Thank You'],
  },
];

// Log function
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;

  fs.appendFileSync(LOG_FILE, logMessage);
}

// Check a single endpoint
async function checkEndpoint(check) {
  return new Promise(resolve => {
    const url = check.url.startsWith('http') ? check.url : `${SITE_URL}${check.url}`;
    const protocol = url.startsWith('https') ? https : http;

    const startTime = Date.now();

    protocol
      .get(url, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          const result = {
            name: check.name,
            url: check.url,
            status: res.statusCode,
            responseTime,
            success: res.statusCode === check.expectedStatus,
            issues: [],
          };

          // Check content if specified
          if (check.checkContent && result.success) {
            check.checkContent.forEach(content => {
              if (!data.includes(content)) {
                result.success = false;
                result.issues.push(`Missing expected content: "${content}"`);
              }
            });
          }

          // Check JSON validity if specified
          if (check.checkJson && result.success) {
            try {
              JSON.parse(data);
            } catch (_e) {
              result.success = false;
              result.issues.push('Invalid JSON response');
            }
          }

          resolve(result);
        });
      })
      .on('error', err => {
        resolve({
          name: check.name,
          url: check.url,
          status: 0,
          responseTime: Date.now() - startTime,
          success: false,
          issues: [`Connection error: ${err.message}`],
        });
      });
  });
}

// Run all health checks
async function runHealthChecks() {
  log('Starting health checks...');
  const results = [];

  for (const check of healthChecks) {
    const result = await checkEndpoint(check);
    results.push(result);

    if (result.success) {
      log(`✅ ${result.name}: OK (${result.responseTime}ms)`);
    } else {
      log(`❌ ${result.name}: FAILED - ${result.issues.join(', ')}`, 'ERROR');
    }
  }

  return results;
}

// Check local configuration
function checkLocalConfiguration() {
  log('Checking local configuration...');
  const issues = [];

  // Check environment variables
  if (!process.env.STRIPE_SECRET_KEY) {
    issues.push('Missing STRIPE_SECRET_KEY in .env');
  }
  if (!process.env.STRIPE_PUBLISHABLE_KEY) {
    issues.push('Missing STRIPE_PUBLISHABLE_KEY in .env');
  }

  // Check critical files
  const criticalFiles = [
    'index.html',
    'final-server.js',
    'src/payment/stripe-checkout.js',
    'public/success.html',
  ];

  criticalFiles.forEach(file => {
    if (!fs.existsSync(path.join(__dirname, file))) {
      issues.push(`Missing critical file: ${file}`);
    }
  });

  if (issues.length === 0) {
    log('✅ Local configuration OK');
  } else {
    issues.forEach(issue => {
      log(`⚠️  ${issue}`, 'WARNING');
    });
  }

  return issues;
}

// Generate status report
function generateStatusReport(results, configIssues) {
  const totalChecks = results.length;
  const passedChecks = results.filter(r => r.success).length;
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / totalChecks;

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalChecks,
      passedChecks,
      failedChecks: totalChecks - passedChecks,
      avgResponseTime: Math.round(avgResponseTime),
      configIssues: configIssues.length,
    },
    details: results,
    configuration: configIssues,
    status:
      passedChecks === totalChecks && configIssues.length === 0 ? 'HEALTHY' : 'ISSUES_DETECTED',
  };

  // Save report
  const reportPath = path.join(__dirname, 'logs', 'latest-health-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return report;
}

// Send alert if issues detected (you can integrate with email/Slack/Discord)
function sendAlert(report) {
  if (report.status === 'ISSUES_DETECTED') {
    log('🚨 ALERT: Website issues detected!', 'ALERT');

    // Log specific issues
    report.details
      .filter(d => !d.success)
      .forEach(detail => {
        log(`  - ${detail.name}: ${detail.issues.join(', ')}`, 'ALERT');
      });

    report.configuration.forEach(issue => {
      log(`  - Config: ${issue}`, 'ALERT');
    });

    // TODO: Add email/Slack/Discord notification here
  }
}

// Auto-fix common issues
async function autoFixIssues(_report) {
  log('Attempting auto-fixes...');
  let fixCount = 0;

  // Fix missing directories
  const dirs = ['releases', 'logs', 'public'];
  dirs.forEach(dir => {
    if (!fs.existsSync(path.join(__dirname, dir))) {
      fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
      log(`✅ Created missing directory: ${dir}`);
      fixCount++;
    }
  });

  // Fix missing .env.example
  if (!fs.existsSync(path.join(__dirname, '.env.example'))) {
    const envExample = `# RinaWarp Terminal Environment Variables

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Server Configuration
PORT=3000
NODE_ENV=production

# Site Configuration
SITE_URL=https://rinawarptech.com

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Analytics (optional)
GA_TRACKING_ID=G-G424CV5GGT
`;
    fs.writeFileSync(path.join(__dirname, '.env.example'), envExample);
    log('✅ Created .env.example file');
    fixCount++;
  }

  return fixCount;
}

// Main monitoring loop
async function startMonitoring() {
  log('🚀 RinaWarp Website Monitor Started');
  log(`Monitoring: ${SITE_URL}`);
  log(`Check interval: ${CHECK_INTERVAL / 1000} seconds`);

  // Run initial check
  await runCheck();

  // Schedule regular checks
  setInterval(runCheck, CHECK_INTERVAL);
}

async function runCheck() {
  log('═'.repeat(60));

  // Check local configuration
  const configIssues = checkLocalConfiguration();

  // Run health checks
  const results = await runHealthChecks();

  // Generate report
  const report = generateStatusReport(results, configIssues);

  // Send alerts if needed
  sendAlert(report);

  // Attempt auto-fixes
  if (report.status === 'ISSUES_DETECTED') {
    const fixes = await autoFixIssues(report);
    if (fixes > 0) {
      log(`🔧 Applied ${fixes} automatic fixes`);
    }
  }

  log(`📊 Status: ${report.status}`);
  log(`📈 Avg Response Time: ${report.summary.avgResponseTime}ms`);
  log('═'.repeat(60));
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('Stopping website monitor...');
  process.exit(0);
});

// Start monitoring
startMonitoring();
