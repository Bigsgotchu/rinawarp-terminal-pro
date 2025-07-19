#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class EnhancedMonitoringSystem {
  constructor() {
    this.urlsToMonitor = [
      { name: 'Firebase', url: 'https://rinawarp-terminal.web.app/', critical: true },
      { name: 'Vercel', url: 'https://rinawarp-terminal.vercel.app/', critical: true },
      {
        name: 'GitHub Pages',
        url: 'https://rinawarp-terminal.github.io/rinawarp-terminal/',
        critical: false,
      },
      { name: 'API Health', url: 'https://rinawarp-terminal.web.app/api/health', critical: true },
      {
        name: 'Download API',
        url: 'https://rinawarp-terminal.web.app/api/download',
        critical: true,
      },
      {
        name: 'Pricing Page',
        url: 'https://rinawarp-terminal.web.app/pricing.html',
        critical: true,
      },
      {
        name: 'Downloads Page',
        url: 'https://rinawarp-terminal.web.app/downloads.html',
        critical: true,
      },
      { name: 'Docs', url: 'https://rinawarp-terminal.web.app/docs.html', critical: false },
      {
        name: 'Beta Download',
        url: 'https://rinawarp-terminal.web.app/beta-download.html',
        critical: true,
      },
    ];

    this.alertThresholds = {
      responseTime: 5000, // 5 seconds
      errorRate: 0.1, // 10%
      downtime: 300000, // 5 minutes
    };

    this.monitoringState = {
      alerts: [],
      history: [],
      stats: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
      },
      isRunning: false,
    };

    this.loadState();
  }

  async checkServices() {
    console.log(`\n🔍 [${new Date().toISOString()}] Starting service health check...`);

    const results = [];

    for (const service of this.urlsToMonitor) {
      try {
        const startTime = Date.now();
        const response = await axios.get(service.url, {
          timeout: 10000,
          validateStatus: () => true, // Accept any status code
        });
        const responseTime = Date.now() - startTime;

        const result = {
          name: service.name,
          url: service.url,
          status: response.status,
          responseTime,
          timestamp: new Date().toISOString(),
          critical: service.critical,
          healthy: response.status < 400,
          headers: response.headers,
          contentLength: response.headers['content-length'] || 0,
        };

        if (result.healthy) {
          console.log(
            `✅ [${service.name}] Status: ${response.status} | Response: ${responseTime}ms`
          );
        } else {
          console.error(
            `❌ [${service.name}] ERROR: Status ${response.status} | Response: ${responseTime}ms`
          );

          if (service.critical) {
            this.triggerAlert(
              'SERVICE_DOWN',
              `Critical service ${service.name} is down (Status: ${response.status})`,
              service
            );
          }
        }

        results.push(result);
        this.updateStats(result);
      } catch (error) {
        const result = {
          name: service.name,
          url: service.url,
          status: 0,
          responseTime: 0,
          timestamp: new Date().toISOString(),
          critical: service.critical,
          healthy: false,
          error: error.message,
        };

        console.error(`💥 [${service.name}] FAILED: ${error.message}`);

        if (service.critical) {
          this.triggerAlert(
            'SERVICE_ERROR',
            `Critical service ${service.name} failed: ${error.message}`,
            service
          );
        }

        results.push(result);
        this.updateStats(result);
      }
    }

    this.monitoringState.history.push({
      timestamp: new Date().toISOString(),
      results,
      summary: this.generateSummary(results),
    });

    // Keep only last 100 records
    if (this.monitoringState.history.length > 100) {
      this.monitoringState.history = this.monitoringState.history.slice(-100);
    }

    this.saveState();
    return results;
  }

  async checkSSLCertificates() {
    console.log(`\n🔒 [${new Date().toISOString()}] Checking SSL certificates...`);

    for (const service of this.urlsToMonitor) {
      try {
        const hostname = new URL(service.url).hostname;

        // Use openssl to check certificate
        const result = execSync(
          `echo | openssl s_client -servername ${hostname} -connect ${hostname}:443 2>/dev/null | openssl x509 -noout -dates`,
          { encoding: 'utf-8' }
        );

        const notAfter = result.match(/notAfter=(.+)/);
        if (notAfter) {
          const expiryDate = new Date(notAfter[1]);
          const daysUntilExpiry = (expiryDate - new Date()) / (1000 * 60 * 60 * 24);

          if (daysUntilExpiry < 30) {
            console.log(
              `⚠️  [${service.name}] SSL certificate expires in ${Math.floor(daysUntilExpiry)} days`
            );
            this.triggerAlert(
              'SSL_EXPIRY',
              `SSL certificate for ${service.name} expires in ${Math.floor(daysUntilExpiry)} days`,
              service
            );
          } else {
            console.log(
              `✅ [${service.name}] SSL certificate valid for ${Math.floor(daysUntilExpiry)} days`
            );
          }
        }
      } catch (error) {
        console.error(`❌ [${service.name}] SSL check failed: ${error.message}`);
      }
    }
  }

  async checkLogErrors() {
    console.log(`\n📋 [${new Date().toISOString()}] Checking application logs...`);

    const logFiles = [
      'logs/app.log',
      'logs/error.log',
      'logs/access.log',
      'deployment-status.json',
    ];

    for (const logFile of logFiles) {
      try {
        if (fs.existsSync(logFile)) {
          const content = fs.readFileSync(logFile, 'utf-8');
          const lines = content.split('\n');

          // Check for errors in the last 100 lines
          const recentLines = lines.slice(-100);
          const errors = recentLines.filter(
            line =>
              line.toLowerCase().includes('error') ||
              line.toLowerCase().includes('failed') ||
              line.toLowerCase().includes('exception')
          );

          if (errors.length > 0) {
            console.log(`⚠️  Found ${errors.length} error(s) in ${logFile}`);
            if (errors.length > 10) {
              this.triggerAlert(
                'HIGH_ERROR_RATE',
                `High error rate detected in ${logFile}: ${errors.length} errors`,
                { logFile }
              );
            }
          } else {
            console.log(`✅ No errors found in ${logFile}`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to check log file ${logFile}: ${error.message}`);
      }
    }
  }

  async checkNetworkConnectivity() {
    console.log(`\n🌐 [${new Date().toISOString()}] Checking network connectivity...`);

    const testUrls = [
      'https://google.com',
      'https://github.com',
      'https://npmjs.com',
      'https://vercel.com',
      'https://firebase.google.com',
    ];

    for (const url of testUrls) {
      try {
        const startTime = Date.now();
        await axios.get(url, { timeout: 5000 });
        const responseTime = Date.now() - startTime;
        console.log(`✅ ${url} - ${responseTime}ms`);
      } catch (error) {
        console.error(`❌ ${url} - ${error.message}`);
        this.triggerAlert('NETWORK_ISSUE', `Network connectivity issue with ${url}`, { url });
      }
    }
  }

  triggerAlert(type, message, context = {}) {
    const alert = {
      id: Date.now().toString(),
      type,
      message,
      context,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    this.monitoringState.alerts.push(alert);
    console.log(`🚨 ALERT [${type}]: ${message}`);

    // Send email/SMS alert (implement based on your preferred service)
    this.sendAlert(alert);
  }

  async sendAlert(alert) {
    // Implement email/SMS/Slack notifications here
    // For now, just log to a file
    const alertFile = path.join(process.cwd(), 'alerts.log');
    const alertLine = `[${alert.timestamp}] ${alert.type}: ${alert.message}\n`;
    fs.appendFileSync(alertFile, alertLine);

    // You can integrate with services like:
    // - SendGrid for email
    // - Twilio for SMS
    // - Slack webhooks
    // - Discord webhooks
    // - PagerDuty

    console.log(`📧 Alert logged to ${alertFile}`);
  }

  generateSummary(results) {
    const total = results.length;
    const healthy = results.filter(r => r.healthy).length;
    const critical = results.filter(r => r.critical && !r.healthy).length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / total;

    return {
      total,
      healthy,
      unhealthy: total - healthy,
      critical,
      avgResponseTime: Math.round(avgResponseTime),
      healthScore: Math.round((healthy / total) * 100),
    };
  }

  updateStats(result) {
    this.monitoringState.stats.totalRequests++;

    if (result.healthy) {
      this.monitoringState.stats.successfulRequests++;
    } else {
      this.monitoringState.stats.failedRequests++;
    }

    // Update average response time
    const total = this.monitoringState.stats.totalRequests;
    const current = this.monitoringState.stats.averageResponseTime;
    this.monitoringState.stats.averageResponseTime = Math.round(
      (current * (total - 1) + result.responseTime) / total
    );
  }

  showDashboard() {
    /* eslint-disable-next-line no-console */
    console.clear();
    console.log(`
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                            🚀 RINAWARP TERMINAL MONITORING DASHBOARD                   ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║ Status: ${this.monitoringState.isRunning ? '🟢 RUNNING' : '🔴 STOPPED'}                                                                       ║
║ Last Check: ${this.monitoringState.history.length > 0 ? this.monitoringState.history[this.monitoringState.history.length - 1].timestamp : 'Never'}    ║
║ Total Requests: ${this.monitoringState.stats.totalRequests}                                                                    ║
║ Success Rate: ${this.monitoringState.stats.totalRequests > 0 ? Math.round((this.monitoringState.stats.successfulRequests / this.monitoringState.stats.totalRequests) * 100) : 0}%                                                                        ║
║ Avg Response Time: ${this.monitoringState.stats.averageResponseTime}ms                                                         ║
║ Active Alerts: ${this.monitoringState.alerts.filter(a => !a.acknowledged).length}                                                                      ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
    `);

    if (this.monitoringState.history.length > 0) {
      const latest = this.monitoringState.history[this.monitoringState.history.length - 1];
      console.log('\n📊 Latest Health Check Results:');
      console.log(
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      );

      latest.results.forEach(result => {
        const statusIcon = result.healthy ? '✅' : '❌';
        const criticalIcon = result.critical ? '🔴' : '🟡';
        console.log(
          `${statusIcon} ${criticalIcon} ${result.name.padEnd(20)} | ${result.status.toString().padEnd(3)} | ${result.responseTime}ms`
        );
      });

      console.log(
        `\n📈 Summary: ${latest.summary.healthy}/${latest.summary.total} services healthy (${latest.summary.healthScore}%)`
      );
    }

    if (this.monitoringState.alerts.length > 0) {
      console.log('\n🚨 Recent Alerts:');
      console.log(
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      );

      this.monitoringState.alerts.slice(-5).forEach(alert => {
        const ackIcon = alert.acknowledged ? '✅' : '❌';
        console.log(`${ackIcon} [${alert.type}] ${alert.message}`);
      });
    }
  }

  async startMonitoring(interval = 60000) {
    console.log('🚀 Starting enhanced monitoring system...');
    console.log(
      `📊 Monitoring ${this.urlsToMonitor.length} services every ${interval / 1000} seconds`
    );

    this.monitoringState.isRunning = true;
    this.saveState();

    // Initial check
    await this.runFullCheck();

    // Set up periodic monitoring
    const monitoringInterval = setInterval(async () => {
      try {
        await this.runFullCheck();
      } catch (error) {
        console.error(`❌ Monitoring error: ${error.message}`);
        this.triggerAlert('MONITORING_ERROR', `Monitoring system error: ${error.message}`);
      }
    }, interval);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n⏹️  Stopping monitoring system...');
      clearInterval(monitoringInterval);
      this.monitoringState.isRunning = false;
      this.saveState();
      process.exit(0);
    });

    console.log('✅ Enhanced monitoring system started. Press Ctrl+C to stop.');
  }

  async runFullCheck() {
    await this.checkServices();
    await this.checkSSLCertificates();
    await this.checkLogErrors();
    await this.checkNetworkConnectivity();
    this.showDashboard();
  }

  loadState() {
    try {
      const stateFile = path.join(process.cwd(), 'monitoring-state.json');
      if (fs.existsSync(stateFile)) {
        const data = fs.readFileSync(stateFile, 'utf-8');
        this.monitoringState = { ...this.monitoringState, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error(`Warning: Could not load monitoring state: ${error.message}`);
    }
  }

  saveState() {
    try {
      const stateFile = path.join(process.cwd(), 'monitoring-state.json');
      fs.writeFileSync(stateFile, JSON.stringify(this.monitoringState, null, 2));
    } catch (error) {
      console.error(`Warning: Could not save monitoring state: ${error.message}`);
    }
  }
}

// CLI interface
async function main() {
  const monitor = new EnhancedMonitoringSystem();
  const command = process.argv[2] || 'check';

  switch (command) {
    case 'start':
      await monitor.startMonitoring();
      break;
    case 'check':
      await monitor.runFullCheck();
      break;
    case 'dashboard':
      monitor.showDashboard();
      break;
    case 'alerts':
      console.log('🚨 Active Alerts:');
      monitor.monitoringState.alerts.forEach(alert => {
        console.log(`- [${alert.type}] ${alert.message} (${alert.timestamp})`);
      });
      break;
    default:
      console.log(`
🔧 Enhanced Monitoring System Commands:
  start      - Start continuous monitoring
  check      - Run one-time health check
  dashboard  - Show monitoring dashboard
  alerts     - List active alerts
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = EnhancedMonitoringSystem;
