#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');

class FirebaseDeploymentMonitor {
  constructor() {
    this.urls = ['https://rinawarptech.com', 'https://rinawarp-terminal.web.app'];
    this.checkInterval = 10000; // 10 seconds
    this.maxChecks = 360; // 1 hour of monitoring
    this.checkCount = 0;
    this.startTime = new Date();
    this.logFile = `deployment-monitor-${new Date().toISOString().split('T')[0]}.log`;
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);

    // Write to log file
    fs.appendFileSync(this.logFile, logEntry + '\n');
  }

  async checkUrl(url) {
    return new Promise(resolve => {
      const startTime = Date.now();
      exec(`curl -I -s -m 10 "${url}"`, (error, stdout, stderr) => {
        const responseTime = Date.now() - startTime;

        if (error) {
          resolve({
            url,
            status: 'ERROR',
            statusCode: null,
            error: error.message,
            responseTime,
          });
          return;
        }

        const statusMatch = stdout.match(/HTTP\/[12]\.\d\s+(\d+)/);
        const statusCode = statusMatch ? parseInt(statusMatch[1]) : null;
        const contentType = stdout.match(/content-type:\s*([^\r\n]+)/i);
        const cacheControl = stdout.match(/cache-control:\s*([^\r\n]+)/i);

        resolve({
          url,
          status: statusCode === 200 ? 'LIVE' : 'NOT_FOUND',
          statusCode,
          contentType: contentType ? contentType[1].trim() : null,
          cacheControl: cacheControl ? cacheControl[1].trim() : null,
          responseTime,
        });
      });
    });
  }

  async checkFirebaseStatus() {
    return new Promise(resolve => {
      exec('firebase hosting:channel:list --json', (error, stdout, stderr) => {
        if (error) {
          resolve({ error: error.message });
          return;
        }

        try {
          const data = JSON.parse(stdout);
          const liveChannel = data.find(channel => channel.name.includes('/live'));
          resolve({
            lastRelease: liveChannel ? liveChannel.releaseTime : null,
            liveChannel: liveChannel || null,
          });
        } catch (e) {
          resolve({ error: 'Failed to parse Firebase status' });
        }
      });
    });
  }

  async performHealthCheck() {
    this.checkCount++;
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);

    this.log(`🔍 Check #${this.checkCount} (${elapsed}s elapsed)`);

    // Check all URLs
    const urlResults = await Promise.all(this.urls.map(url => this.checkUrl(url)));

    // Check Firebase status
    const firebaseStatus = await this.checkFirebaseStatus();

    // Log results
    let allLive = true;
    urlResults.forEach(result => {
      if (result.status === 'LIVE') {
        this.log(`✅ ${result.url} - LIVE (${result.responseTime}ms)`);
        if (result.contentType) {
          this.log(`   Content-Type: ${result.contentType}`);
        }
      } else {
        this.log(`❌ ${result.url} - ${result.status} (${result.statusCode || 'N/A'})`);
        allLive = false;
      }
    });

    if (firebaseStatus.lastRelease) {
      this.log(`📡 Firebase last release: ${firebaseStatus.lastRelease}`);
    }

    if (allLive) {
      this.log('🎉 SUCCESS! All URLs are now LIVE!');
      this.log(`🕐 Total time to go live: ${elapsed} seconds`);
      this.generateSuccessReport(urlResults);
      return true;
    }

    return false;
  }

  generateSuccessReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      totalTime: Math.floor((Date.now() - this.startTime) / 1000),
      checks: this.checkCount,
      results: results,
    };

    fs.writeFileSync('deployment-success-report.json', JSON.stringify(report, null, 2));
    this.log('📊 Success report saved to deployment-success-report.json');
  }

  async start() {
    this.log('🚀 Starting Firebase Deployment Monitor');
    this.log(`📍 Monitoring URLs: ${this.urls.join(', ')}`);
    this.log(`⏰ Check interval: ${this.checkInterval / 1000}s`);
    this.log(
      `🔄 Max checks: ${this.maxChecks} (${(this.maxChecks * this.checkInterval) / 1000 / 60} minutes)`
    );
    this.log(`📝 Log file: ${this.logFile}`);
    this.log('');

    while (this.checkCount < this.maxChecks) {
      const isLive = await this.performHealthCheck();

      if (isLive) {
        process.exit(0);
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, this.checkInterval));
    }

    this.log('⏰ Maximum monitoring time reached. Deployment may still be propagating.');
    this.log('💡 You can manually check the URLs or run this script again.');
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Monitoring stopped by user');
  process.exit(0);
});

// Start monitoring
const monitor = new FirebaseDeploymentMonitor();
monitor.start().catch(console.error);
