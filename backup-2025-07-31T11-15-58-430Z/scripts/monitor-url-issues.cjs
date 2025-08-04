#!/usr/bin/env node
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal - URL Issue Monitoring Script
 * Monitors for URL-related issues after deployment
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 */

const fs = require('node:fs');
const _path = require('node:path');
const { execSync } = require('child_process');

class URLMonitor {
  constructor() {
    this.logFile = 'monitoring/url-issues.log';
    this.issuesFound = [];
    this.startTime = new Date();

    // Ensure monitoring directory exists
    if (!fs.existsSync('monitoring')) {
      fs.mkdirSync('monitoring', { recursive: true });
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}`;

    console.log(logEntry);

    // Write to log file
    fs.appendFileSync(this.logFile, logEntry + '\n');
  }

  /**
   * Check for broken URLs in the application
   */
  async checkBrokenURLs() {
    this.log('🔍 Checking for broken URLs...');

    try {
      // Run the URL audit script
      const auditResult = execSync('npm run audit:urls', { encoding: 'utf8' });

      if (auditResult.includes('❌') || auditResult.includes('ERROR')) {
        this.issuesFound.push({
          type: 'BROKEN_URL',
          message: 'URL audit found broken links',
          details: auditResult,
          timestamp: new Date(),
        });
        this.log('❌ URL audit detected broken links', 'ERROR');
      } else {
        this.log('✅ URL audit passed - no broken links found');
      }
    } catch (error) {
      this.log(`❌ Error running URL audit: ${error.message}`, 'ERROR');
      this.issuesFound.push({
        type: 'AUDIT_ERROR',
        message: 'Failed to run URL audit',
        details: error.message,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Check application logs for URL-related errors
   */
  async checkApplicationLogs() {
    this.log('📋 Checking application logs for URL errors...');

    const logPatterns = [
      'URL not found',
      'Invalid URL',
      'Connection refused',
      'Network error',
      'Failed to load resource',
      'CORS error',
      'Mixed content',
      'Insecure content',
    ];

    try {
      // Check for recent log files
      const logFiles = ['app.log', 'error.log', 'access.log'];

      for (const logFile of logFiles) {
        if (fs.existsSync(logFile)) {
          const logContent = fs.readFileSync(logFile, 'utf8');

          for (const pattern of logPatterns) {
            if (logContent.includes(pattern)) {
              this.issuesFound.push({
                type: 'LOG_ERROR',
                message: `Found URL-related error in ${logFile}`,
                details: `Pattern: ${pattern}`,
                timestamp: new Date(),
              });
              this.log(`❌ Found URL error in ${logFile}: ${pattern}`, 'WARN');
            }
          }
        }
      }

      if (this.issuesFound.filter(issue => issue.type === 'LOG_ERROR').length === 0) {
        this.log('✅ No URL-related errors found in application logs');
      }
    } catch (error) {
      this.log(`❌ Error checking application logs: ${error.message}`, 'ERROR');
    }
  }

  /**
   * Check deployment health endpoints
   */
  async checkHealthEndpoints() {
    this.log('🏥 Checking deployment health endpoints...');

    const healthEndpoints = [
      process.env.RAILWAY_URL && `${process.env.RAILWAY_URL}/health`,
      process.env.VERCEL_URL && `${process.env.VERCEL_URL}/health`,
      'http://localhost:3000/health',
      'https://rinawarptech.com/health',
    ].filter(Boolean);

    for (const endpoint of healthEndpoints) {
      try {
        this.log(`Checking health endpoint: ${endpoint}`);

        // Use curl to check the endpoint
        const result = execSync(
          `curl -s -o /dev/null -w "%{http_code}" ${endpoint} || echo "000"`,
          { encoding: 'utf8' }
        );
        const statusCode = parseInt(result.trim());

        if (statusCode >= 200 && statusCode < 300) {
          this.log(`✅ Health endpoint ${endpoint} is healthy (${statusCode})`);
        } else {
          this.issuesFound.push({
            type: 'HEALTH_CHECK_FAILED',
            message: 'Health endpoint returned error status',
            details: `${endpoint} returned ${statusCode}`,
            timestamp: new Date(),
          });
          this.log(`❌ Health endpoint ${endpoint} failed with status ${statusCode}`, 'ERROR');
        }
      } catch (error) {
        this.log(`❌ Could not check health endpoint ${endpoint}: ${error.message}`, 'WARN');
      }
    }
  }

  /**
   * Check for SSL/TLS certificate issues
   */
  async checkSSLCertificates() {
    this.log('🔐 Checking SSL/TLS certificates...');

    const domains = ['rinawarptech.com', 'www.rinawarptech.com'];

    for (const domain of domains) {
      try {
        const result = execSync(`curl -s -I https://${domain} | head -1`, { encoding: 'utf8' });

        if (result.includes('200 OK')) {
          this.log(`✅ SSL certificate for ${domain} is valid`);
        } else {
          this.issuesFound.push({
            type: 'SSL_ERROR',
            message: `SSL certificate issue for ${domain}`,
            details: result,
            timestamp: new Date(),
          });
          this.log(`❌ SSL certificate issue for ${domain}: ${result}`, 'ERROR');
        }
      } catch (error) {
        this.log(`❌ Could not check SSL for ${domain}: ${error.message}`, 'WARN');
      }
    }
  }

  /**
   * Check for security-related URL issues
   */
  async checkSecurityIssues() {
    this.log('🔒 Checking for security-related URL issues...');

    try {
      // Check for mixed content issues
      const securityPatterns = [
        'http://', // HTTP in HTTPS context
        'insecure',
        'mixed content',
        'blocked by CORS',
        'X-Frame-Options',
      ];

      // Check source files for potential security issues
      const sourceFiles = ['src/renderer/index.html', 'src/renderer/renderer.js', 'src/main.cjs'];

      for (const file of sourceFiles) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');

          for (const pattern of securityPatterns) {
            if (content.includes(pattern)) {
              this.log(`⚠️ Security concern in ${file}: ${pattern}`, 'WARN');
            }
          }
        }
      }

      this.log('✅ Security check completed');
    } catch (error) {
      this.log(`❌ Error during security check: ${error.message}`, 'ERROR');
    }
  }

  /**
   * Monitor network connectivity
   */
  async checkNetworkConnectivity() {
    this.log('🌐 Checking network connectivity...');

    const testUrls = [
      'https://google.com',
      'https://github.com',
      'https://api.github.com',
      'https://rinawarptech.com',
    ];

    for (const url of testUrls) {
      try {
        const result = execSync(`curl -s -o /dev/null -w "%{http_code}" ${url} || echo "000"`, {
          encoding: 'utf8',
        });
        const statusCode = parseInt(result.trim());

        if (statusCode >= 200 && statusCode < 400) {
          this.log(`✅ Network connectivity to ${url} is good (${statusCode})`);
        } else {
          this.issuesFound.push({
            type: 'NETWORK_ERROR',
            message: 'Network connectivity issue',
            details: `${url} returned ${statusCode}`,
            timestamp: new Date(),
          });
          this.log(`❌ Network connectivity issue to ${url}: ${statusCode}`, 'ERROR');
        }
      } catch (error) {
        this.log(`❌ Could not test connectivity to ${url}: ${error.message}`, 'WARN');
      }
    }
  }

  /**
   * Generate monitoring report
   */
  generateReport() {
    const endTime = new Date();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);

    this.log('\n📊 URL MONITORING REPORT');
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.log(`⏱️ Monitoring duration: ${duration} seconds`);
    this.log(`📅 Start time: ${this.startTime.toISOString()}`);
    this.log(`📅 End time: ${endTime.toISOString()}`);
    this.log(`🔍 Issues found: ${this.issuesFound.length}`);

    if (this.issuesFound.length === 0) {
      this.log('✅ No URL-related issues detected! System is healthy.');
    } else {
      this.log('❌ Issues detected that need attention:');

      // Group issues by type
      const issuesByType = {};
      this.issuesFound.forEach(issue => {
        if (!issuesByType[issue.type]) {
          issuesByType[issue.type] = [];
        }
        issuesByType[issue.type].push(issue);
      });

      Object.entries(issuesByType).forEach(([type, issues]) => {
        this.log(`\n${type} (${issues.length} issues):`);
        issues.forEach(issue => {
          this.log(`  • ${issue.message}`);
          if (issue.details) {
            this.log(`    Details: ${issue.details}`);
          }
        });
      });
    }

    // Save report to file
    const reportData = {
      timestamp: endTime.toISOString(),
      duration: duration,
      issuesFound: this.issuesFound,
      summary: {
        totalIssues: this.issuesFound.length,
        healthy: this.issuesFound.length === 0,
      },
    };

    fs.writeFileSync('monitoring/url-monitoring-report.json', JSON.stringify(reportData, null, 2));
    this.log('📄 Report saved to monitoring/url-monitoring-report.json');
  }

  /**
   * Run all monitoring checks
   */
  async runAll() {
    this.log('🌊 Starting RinaWarp Terminal URL Monitoring...');
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      await this.checkBrokenURLs();
      await this.checkApplicationLogs();
      await this.checkHealthEndpoints();
      await this.checkSSLCertificates();
      await this.checkSecurityIssues();
      await this.checkNetworkConnectivity();

      this.generateReport();

      // Exit with error code if issues found
      if (this.issuesFound.length > 0) {
        this.log('\n❌ URL monitoring detected issues. Please review and address them.');
        process.exit(1);
      } else {
        this.log('\n✅ URL monitoring completed successfully. No issues detected!');
        process.exit(0);
      }
    } catch (error) {
      this.log(`❌ Fatal error during monitoring: ${error.message}`, 'ERROR');
      process.exit(1);
    }
  }
}

// Run monitoring if called directly
if (require.main === module) {
  const monitor = new URLMonitor();
  monitor.runAll().catch(error => {
    console.error('❌ Monitoring failed:', error);
    process.exit(1);
  });
}

module.exports = URLMonitor;
