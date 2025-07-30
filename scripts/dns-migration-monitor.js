/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

#!/usr/bin/env node

const https = require('https');
const dns = require('dns');
const { promisify } = require('node:util');
const fs = require('node:fs');
const _path = require('node:path');

const resolveTxt = promisify(dns.resolveTxt);
const resolveA = promisify(dns.resolve4);

class DNSMigrationMonitor {
  constructor() {
    this.domain = 'rinawarptech.com';
    this.workingUrl = 'https://rinawarp-terminal-test.web.app';
    this.customUrl = `https://${this.domain}`;
    this.expectedTxt = 'hosting-site=rinawarp-terminal-test';
    this.expectedIP = '199.36.158.100';
    this.checkInterval = 15000; // 15 seconds
    this.maxChecks = 240; // 1 hour
    this.checkCount = 0;
    this.startTime = new Date();
    this.logFile = `dns-migration-${new Date().toISOString().split('T')[0]}.log`;

    this.status = {
      txtRecord: false,
      aRecord: false,
      httpResponse: false,
      sslCert: false,
      contentMatch: false,
    };
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    fs.appendFileSync(this.logFile, logEntry + '\n');
  }

  async checkHttpResponse(url) {
    return new Promise(resolve => {
      const request = https.get(
        url,
        {
          timeout: 10000,
          headers: {
            'User-Agent': 'DNS-Migration-Monitor/1.0',
          },
        },
        res => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: data.substring(0, 500), // First 500 chars
            });
          });
        }
      );

      request.on('error', error => {
        resolve({
          statusCode: 0,
          error: error.message,
        });
      });

      request.on('timeout', () => {
        request.destroy();
        resolve({
          statusCode: 0,
          error: 'Timeout',
        });
      });
    });
  }

  async checkDNSRecords() {
    const results = {
      txt: null,
      a: null,
      txtMatch: false,
      aMatch: false,
    };

    try {
      const txtRecords = await resolveTxt(this.domain);
      results.txt = txtRecords.flat();
      results.txtMatch = results.txt.some(record =>
        record.includes('hosting-site=rinawarp-terminal-test')
      );

      const aRecords = await resolveA(this.domain);
      results.a = aRecords;
      results.aMatch = aRecords.includes(this.expectedIP);
    } catch (error) {
      results.error = error.message;
    }

    return results;
  }

  async performChecks() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    this.log(`🔍 Check #${this.checkCount + 1} (${elapsed}s elapsed)`);

    // Check DNS records
    const dnsResults = await this.checkDNSRecords();

    if (dnsResults.error) {
      this.log(`❌ DNS Error: ${dnsResults.error}`);
    } else {
      // TXT Record Check
      if (dnsResults.txtMatch) {
        if (!this.status.txtRecord) {
          this.log(
            `✅ TXT Record UPDATED! Found: ${dnsResults.txt.find(r => r.includes('hosting-site'))}`
          );
          this.status.txtRecord = true;
        }
      } else {
        this.log(
          `⏳ TXT Record: Still shows old value. Found: ${dnsResults.txt.find(r => r.includes('hosting-site')) || 'None'}`
        );
      }

      // A Record Check
      if (dnsResults.aMatch) {
        if (!this.status.aRecord) {
          this.log(`✅ A Record: ${dnsResults.a.join(', ')}`);
          this.status.aRecord = true;
        }
      } else {
        this.log(`⏳ A Record: ${dnsResults.a ? dnsResults.a.join(', ') : 'Not found'}`);
      }
    }

    // Check HTTP response on custom domain
    const httpResult = await this.checkHttpResponse(this.customUrl);

    if (httpResult.statusCode === 200) {
      if (!this.status.httpResponse) {
        this.log(`🎉 HTTP Response: WORKING! Status 200 from ${this.customUrl}`);
        this.status.httpResponse = true;
      }

      // Check if content matches our site
      if (
        httpResult.body.includes('RinaWarp Terminal') &&
        httpResult.body.includes('Advanced Terminal Emulator')
      ) {
        if (!this.status.contentMatch) {
          this.log('🎯 Content Match: CONFIRMED! Site is serving correct content');
          this.status.contentMatch = true;
        }
      } else {
        this.log('⚠️  Content Warning: HTTP 200 but content doesn\'t match expected site');
      }

      // Check SSL certificate
      if (httpResult.headers && httpResult.headers['strict-transport-security']) {
        if (!this.status.sslCert) {
          this.log('🔒 SSL Certificate: ACTIVE! HTTPS working properly');
          this.status.sslCert = true;
        }
      }
    } else if (httpResult.statusCode === 404) {
      this.log('❌ HTTP Response: 404 - Site not found (DNS may not be propagated yet)');
    } else if (httpResult.statusCode === 0) {
      this.log(`❌ HTTP Response: ${httpResult.error || 'Connection failed'}`);
    } else {
      this.log(`⚠️  HTTP Response: ${httpResult.statusCode} - Unexpected status`);
    }

    // Check if migration is complete
    const migrationComplete = Object.values(this.status).every(status => status === true);

    if (migrationComplete) {
      this.log('🎉🎉🎉 MIGRATION COMPLETE! 🎉🎉🎉');
      this.log('✅ All checks passed:');
      this.log('   - TXT record updated to rinawarp-terminal-test');
      this.log(`   - A record pointing to ${this.expectedIP}`);
      this.log('   - HTTPS working with SSL certificate');
      this.log('   - Site serving correct content');
      this.log(`   - Custom domain ${this.domain} is LIVE!`);
      this.log(`\n🌐 Your site is now accessible at: ${this.customUrl}`);

      await this.generateSuccessReport();
      return true;
    }

    return false;
  }

  async generateSuccessReport() {
    const report = {
      timestamp: new Date().toISOString(),
      domain: this.domain,
      migrationTime: Math.floor((Date.now() - this.startTime) / 1000),
      totalChecks: this.checkCount + 1,
      status: 'COMPLETE',
      urls: {
        primary: this.customUrl,
        firebase: this.workingUrl,
      },
      finalChecks: {
        dns: await this.checkDNSRecords(),
        http: await this.checkHttpResponse(this.customUrl),
      },
    };

    const reportFile = `dns-migration-success-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    this.log(`📊 Success report saved to: ${reportFile}`);
  }

  async start() {
    this.log('🚀 Starting DNS Migration Monitor');
    this.log(`📍 Monitoring domain: ${this.domain}`);
    this.log(`🎯 Target: ${this.workingUrl} → ${this.customUrl}`);
    this.log(`⏰ Check interval: ${this.checkInterval / 1000}s`);
    this.log(
      `🔄 Max checks: ${this.maxChecks} (${(this.maxChecks * this.checkInterval) / 1000 / 60} minutes)`
    );
    this.log(`📝 Log file: ${this.logFile}`);
    this.log('\n🔄 Starting monitoring...');

    const monitor = async () => {
      try {
        const complete = await this.performChecks();
        if (complete) {
          return;
        }

        this.checkCount++;

        if (this.checkCount >= this.maxChecks) {
          this.log(`⏰ Monitoring stopped after ${this.maxChecks} checks`);
          this.log(`📊 Final status: ${JSON.stringify(this.status, null, 2)}`);
          return;
        }

        setTimeout(monitor, this.checkInterval);
      } catch (error) {
        this.log(`❌ Monitor error: ${error.message}`);
        setTimeout(monitor, this.checkInterval);
      }
    };

    monitor();
  }
}

// Handle process interruption
process.on('SIGINT', () => {
  console.log('\n🛑 Monitoring stopped by user');
  process.exit(0);
});

// Start monitoring
const monitor = new DNSMigrationMonitor();
monitor.start();
