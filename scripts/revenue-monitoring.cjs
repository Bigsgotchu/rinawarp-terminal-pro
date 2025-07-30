/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

#!/usr/bin/env node

const axios = require('axios');
const fs = require('node:fs');
const path = require('node:path');

class RevenueCriticalMonitoring {
  constructor() {
    this.revenueCriticalEndpoints = [
      {
        name: 'Download API',
        url: 'https://rinawarp-terminal.web.app/api/download',
        method: 'GET',
        critical: true,
        revenueImpact: 'HIGH',
        description: 'Primary download endpoint - drives user acquisition',
        expectedStatus: [200, 302],
        timeout: 10000,
      },
      {
        name: 'Pricing Page',
        url: 'https://rinawarp-terminal.web.app/pricing.html',
        method: 'GET',
        critical: true,
        revenueImpact: 'HIGH',
        description: 'Pricing information - conversion critical',
        expectedStatus: [200],
        timeout: 5000,
      },
      {
        name: 'Beta Download',
        url: 'https://rinawarp-terminal.web.app/beta-download.html',
        method: 'GET',
        critical: true,
        revenueImpact: 'HIGH',
        description: 'Beta access - premium feature gateway',
        expectedStatus: [200],
        timeout: 5000,
      },
      {
        name: 'Downloads Page',
        url: 'https://rinawarp-terminal.web.app/downloads.html',
        method: 'GET',
        critical: true,
        revenueImpact: 'HIGH',
        description: 'Download page - conversion funnel',
        expectedStatus: [200],
        timeout: 5000,
      },
      {
        name: 'Main Landing Page',
        url: 'https://rinawarp-terminal.web.app/',
        method: 'GET',
        critical: true,
        revenueImpact: 'HIGH',
        description: 'Main landing page - first impression',
        expectedStatus: [200],
        timeout: 5000,
      },
      {
        name: 'Case Studies',
        url: 'https://rinawarp-terminal.web.app/case-studies.html',
        method: 'GET',
        critical: false,
        revenueImpact: 'MEDIUM',
        description: 'Social proof - conversion support',
        expectedStatus: [200],
        timeout: 5000,
      },
      {
        name: 'API Health Check',
        url: 'https://rinawarp-terminal.web.app/api/health',
        method: 'GET',
        critical: true,
        revenueImpact: 'HIGH',
        description: 'API health - backend dependency',
        expectedStatus: [200],
        timeout: 3000,
      },
    ];

    this.alertChannels = {
      email: {
        enabled: false,
        recipients: ['rinawarptechnologies25@gmail.com'],
      },
      slack: {
        enabled: false,
        webhook: process.env.SLACK_WEBHOOK_URL,
      },
      discord: {
        enabled: false,
        webhook: process.env.DISCORD_WEBHOOK_URL,
      },
      sms: {
        enabled: false,
        service: 'twilio',
      },
    };

    this.escalationRules = {
      HIGH: {
        immediateAlert: true,
        escalationDelay: 300000, // 5 minutes
        maxRetries: 3,
        retryInterval: 30000, // 30 seconds
      },
      MEDIUM: {
        immediateAlert: true,
        escalationDelay: 900000, // 15 minutes
        maxRetries: 2,
        retryInterval: 60000, // 1 minute
      },
      LOW: {
        immediateAlert: false,
        escalationDelay: 1800000, // 30 minutes
        maxRetries: 1,
        retryInterval: 300000, // 5 minutes
      },
    };

    this.monitoringState = {
      alerts: [],
      metrics: {
        totalChecks: 0,
        failedChecks: 0,
        avgResponseTime: 0,
        uptime: 100,
        lastDowntime: null,
        revenueImpactScore: 0,
      },
      history: [],
      isRunning: false,
    };

    this.loadState();
  }

  async checkRevenueCriticalEndpoints() {
    console.log(`\\n💰 [${new Date().toISOString()}] Checking revenue-critical endpoints...`);

    const results = [];
    let totalRevenueImpact = 0;
    let failedRevenueImpact = 0;

    for (const endpoint of this.revenueCriticalEndpoints) {
      try {
        const startTime = Date.now();
        const response = await axios({
          method: endpoint.method,
          url: endpoint.url,
          timeout: endpoint.timeout,
          validateStatus: () => true,
        });
        const responseTime = Date.now() - startTime;

        const isHealthy = endpoint.expectedStatus.includes(response.status);
        const impactValue = this.getRevenueImpactValue(endpoint.revenueImpact);

        totalRevenueImpact += impactValue;
        if (!isHealthy) {
          failedRevenueImpact += impactValue;
        }

        const result = {
          name: endpoint.name,
          url: endpoint.url,
          status: response.status,
          responseTime,
          healthy: isHealthy,
          critical: endpoint.critical,
          revenueImpact: endpoint.revenueImpact,
          description: endpoint.description,
          timestamp: new Date().toISOString(),
        };

        if (isHealthy) {
          const performanceIcon = responseTime < 1000 ? '🚀' : responseTime < 3000 ? '⚡' : '🐌';
          console.log(
            `✅ ${performanceIcon} [${endpoint.name}] ${response.status} | ${responseTime}ms | ${endpoint.revenueImpact} impact`
          );
        } else {
          console.error(
            `❌ 💸 [${endpoint.name}] FAILED ${response.status} | ${responseTime}ms | ${endpoint.revenueImpact} REVENUE IMPACT`
          );

          await this.triggerRevenueAlert(endpoint, result);
        }

        results.push(result);
        this.updateMetrics(result);
      } catch (error) {
        const impactValue = this.getRevenueImpactValue(endpoint.revenueImpact);
        totalRevenueImpact += impactValue;
        failedRevenueImpact += impactValue;

        const result = {
          name: endpoint.name,
          url: endpoint.url,
          status: 0,
          responseTime: 0,
          healthy: false,
          critical: endpoint.critical,
          revenueImpact: endpoint.revenueImpact,
          description: endpoint.description,
          error: error.message,
          timestamp: new Date().toISOString(),
        };

        console.error(
          `💥 💸 [${endpoint.name}] CRITICAL FAILURE: ${error.message} | ${endpoint.revenueImpact} REVENUE IMPACT`
        );

        await this.triggerRevenueAlert(endpoint, result);
        results.push(result);
        this.updateMetrics(result);
      }
    }

    // Calculate revenue impact score
    const revenueImpactScore =
      totalRevenueImpact > 0
        ? Math.round(((totalRevenueImpact - failedRevenueImpact) / totalRevenueImpact) * 100)
        : 100;

    this.monitoringState.metrics.revenueImpactScore = revenueImpactScore;

    console.log(`\\n📊 Revenue Impact Score: ${revenueImpactScore}%`);
    if (revenueImpactScore < 80) {
      console.log('🚨 WARNING: Revenue impact score below 80%!');
    }

    this.monitoringState.history.push({
      timestamp: new Date().toISOString(),
      results,
      revenueImpactScore,
      summary: this.generateRevenueSummary(results),
    });

    // Keep only last 50 records
    if (this.monitoringState.history.length > 50) {
      this.monitoringState.history = this.monitoringState.history.slice(-50);
    }

    this.saveState();
    return results;
  }

  getRevenueImpactValue(impact) {
    const values = { HIGH: 10, MEDIUM: 5, LOW: 1 };
    return values[impact] || 1;
  }

  async triggerRevenueAlert(endpoint, result) {
    const escalationRule = this.escalationRules[endpoint.revenueImpact];

    const alert = {
      id: Date.now().toString(),
      type: 'REVENUE_CRITICAL',
      endpoint: endpoint.name,
      impact: endpoint.revenueImpact,
      message: `Revenue-critical endpoint ${endpoint.name} is failing`,
      description: endpoint.description,
      status: result.status,
      responseTime: result.responseTime,
      error: result.error,
      timestamp: new Date().toISOString(),
      escalated: false,
      acknowledged: false,
    };

    this.monitoringState.alerts.push(alert);
    console.log(`🚨 REVENUE ALERT [${endpoint.revenueImpact}]: ${alert.message}`);

    if (escalationRule.immediateAlert) {
      await this.sendImmediateAlert(alert);
    }

    // Set up escalation if needed
    if (escalationRule.escalationDelay > 0) {
      setTimeout(async () => {
        if (!alert.acknowledged) {
          await this.escalateAlert(alert);
        }
      }, escalationRule.escalationDelay);
    }

    this.saveState();
  }

  async sendImmediateAlert(alert) {
    const message = `
🚨 REVENUE CRITICAL ALERT 🚨
Service: ${alert.endpoint}
Impact: ${alert.impact}
Status: ${alert.status}
Description: ${alert.description}
Time: ${alert.timestamp}
`;

    console.log(`📧 Sending immediate alert for ${alert.endpoint}`);
    await this.sendAlert(alert, message, 'immediate');
  }

  async escalateAlert(alert) {
    alert.escalated = true;

    const message = `
🔥 ESCALATED REVENUE ALERT 🔥
Service: ${alert.endpoint}
Impact: ${alert.impact}
Status: ${alert.status}
Description: ${alert.description}
Duration: ${new Date() - new Date(alert.timestamp)}ms
Time: ${new Date().toISOString()}

This alert has been escalated due to no acknowledgment.
`;

    console.log(`🔥 Escalating alert for ${alert.endpoint}`);
    await this.sendAlert(alert, message, 'escalated');
  }

  async sendAlert(alert, message, priority = 'normal') {
    // Log to file
    const alertFile = path.join(process.cwd(), 'revenue-alerts.log');
    const alertLine = `[${alert.timestamp}] ${priority.toUpperCase()}: ${message}\\n`;
    fs.appendFileSync(alertFile, alertLine);

    // Send to configured channels
    if (this.alertChannels.slack.enabled && this.alertChannels.slack.webhook) {
      await this.sendSlackAlert(message, priority);
    }

    if (this.alertChannels.discord.enabled && this.alertChannels.discord.webhook) {
      await this.sendDiscordAlert(message, priority);
    }

    if (this.alertChannels.email.enabled) {
      await this.sendEmailAlert(message, priority);
    }

    console.log('📧 Alert sent via configured channels');
  }

  async sendSlackAlert(message, priority) {
    try {
      const color =
        priority === 'escalated' ? '#ff0000' : priority === 'immediate' ? '#ff9900' : '#ffff00';

      await axios.post(this.alertChannels.slack.webhook, {
        text: message,
        attachments: [
          {
            color,
            fields: [
              {
                title: 'Priority',
                value: priority,
                short: true,
              },
            ],
          },
        ],
      });
    } catch (error) {
      console.error(`Failed to send Slack alert: ${error.message}`);
    }
  }

  async sendDiscordAlert(message, priority) {
    try {
      const color =
        priority === 'escalated' ? 16711680 : priority === 'immediate' ? 16753920 : 16777215;

      await axios.post(this.alertChannels.discord.webhook, {
        embeds: [
          {
            title: '🚨 Revenue Critical Alert',
            description: message,
            color,
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } catch (error) {
      console.error(`Failed to send Discord alert: ${error.message}`);
    }
  }

  async sendEmailAlert(message, _priority) {
    // Implement email sending logic here
    // You can use services like SendGrid, Nodemailer, etc.
    console.log(`📧 Email alert would be sent: ${message}`);
  }

  generateRevenueSummary(results) {
    const total = results.length;
    const healthy = results.filter(r => r.healthy).length;
    const critical = results.filter(r => r.critical && !r.healthy).length;
    const highImpact = results.filter(r => r.revenueImpact === 'HIGH' && !r.healthy).length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / total;

    return {
      total,
      healthy,
      unhealthy: total - healthy,
      critical,
      highImpact,
      avgResponseTime: Math.round(avgResponseTime),
      healthScore: Math.round((healthy / total) * 100),
    };
  }

  updateMetrics(result) {
    this.monitoringState.metrics.totalChecks++;

    if (!result.healthy) {
      this.monitoringState.metrics.failedChecks++;
      this.monitoringState.metrics.lastDowntime = new Date().toISOString();
    }

    // Update uptime
    this.monitoringState.metrics.uptime =
      ((this.monitoringState.metrics.totalChecks - this.monitoringState.metrics.failedChecks) /
        this.monitoringState.metrics.totalChecks) *
      100;

    // Update average response time
    const total = this.monitoringState.metrics.totalChecks;
    const current = this.monitoringState.metrics.avgResponseTime;
    this.monitoringState.metrics.avgResponseTime = Math.round(
      (current * (total - 1) + result.responseTime) / total
    );
  }

  showRevenueDashboard() {
    /* eslint-disable-next-line no-console */
    console.clear();
    console.log(`
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                         💰 REVENUE CRITICAL MONITORING DASHBOARD                      ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║ Revenue Impact Score: ${this.monitoringState.metrics.revenueImpactScore}%                                                             ║
║ Uptime: ${this.monitoringState.metrics.uptime.toFixed(2)}%                                                                        ║
║ Avg Response Time: ${this.monitoringState.metrics.avgResponseTime}ms                                                         ║
║ Failed Checks: ${this.monitoringState.metrics.failedChecks}/${this.monitoringState.metrics.totalChecks}                                                                  ║
║ Last Downtime: ${this.monitoringState.metrics.lastDowntime || 'Never'}                                      ║
║ Active Alerts: ${this.monitoringState.alerts.filter(a => !a.acknowledged).length}                                                                      ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
    `);

    if (this.monitoringState.history.length > 0) {
      const latest = this.monitoringState.history[this.monitoringState.history.length - 1];
      console.log('\\n💼 Revenue-Critical Endpoints Status:');
      console.log(
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      );

      latest.results.forEach(result => {
        const statusIcon = result.healthy ? '✅' : '❌';
        const impactIcon =
          result.revenueImpact === 'HIGH' ? '🔴' : result.revenueImpact === 'MEDIUM' ? '🟡' : '🟢';
        const perfIcon =
          result.responseTime < 1000 ? '🚀' : result.responseTime < 3000 ? '⚡' : '🐌';
        console.log(
          `${statusIcon} ${impactIcon} ${perfIcon} ${result.name.padEnd(20)} | ${result.status.toString().padEnd(3)} | ${result.responseTime}ms`
        );
      });
    }

    if (this.monitoringState.alerts.length > 0) {
      console.log('\\n🚨 Revenue-Critical Alerts:');
      console.log(
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      );

      this.monitoringState.alerts.slice(-3).forEach(alert => {
        const ackIcon = alert.acknowledged ? '✅' : '❌';
        const escIcon = alert.escalated ? '🔥' : '🚨';
        console.log(`${ackIcon} ${escIcon} [${alert.impact}] ${alert.endpoint}: ${alert.message}`);
      });
    }
  }

  async startRevenueMonitoring(interval = 30000) {
    console.log('💰 Starting revenue-critical monitoring system...');
    console.log(
      `📊 Monitoring ${this.revenueCriticalEndpoints.length} revenue-critical endpoints every ${interval / 1000} seconds`
    );

    this.monitoringState.isRunning = true;
    this.saveState();

    // Initial check
    await this.checkRevenueCriticalEndpoints();
    this.showRevenueDashboard();

    // Set up periodic monitoring
    const monitoringInterval = setInterval(async () => {
      try {
        await this.checkRevenueCriticalEndpoints();
        this.showRevenueDashboard();
      } catch (error) {
        console.error(`❌ Revenue monitoring error: ${error.message}`);
        await this.triggerRevenueAlert(
          {
            name: 'Monitoring System',
            revenueImpact: 'HIGH',
            description: 'Revenue monitoring system failure',
          },
          { error: error.message }
        );
      }
    }, interval);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\\n⏹️  Stopping revenue monitoring system...');
      clearInterval(monitoringInterval);
      this.monitoringState.isRunning = false;
      this.saveState();
      process.exit(0);
    });

    console.log('✅ Revenue monitoring system started. Press Ctrl+C to stop.');
  }

  loadState() {
    try {
      const stateFile = path.join(process.cwd(), 'revenue-monitoring-state.json');
      if (fs.existsSync(stateFile)) {
        const data = fs.readFileSync(stateFile, 'utf-8');
        this.monitoringState = { ...this.monitoringState, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error(`Warning: Could not load revenue monitoring state: ${error.message}`);
    }
  }

  saveState() {
    try {
      const stateFile = path.join(process.cwd(), 'revenue-monitoring-state.json');
      fs.writeFileSync(stateFile, JSON.stringify(this.monitoringState, null, 2));
    } catch (error) {
      console.error(`Warning: Could not save revenue monitoring state: ${error.message}`);
    }
  }
}

// CLI interface
async function main() {
  const monitor = new RevenueCriticalMonitoring();
  const command = process.argv[2] || 'check';

  switch (command) {
  case 'start':
    await monitor.startRevenueMonitoring();
    break;
  case 'check':
    await monitor.checkRevenueCriticalEndpoints();
    monitor.showRevenueDashboard();
    break;
  case 'dashboard':
    monitor.showRevenueDashboard();
    break;
  case 'alerts':
    console.log('🚨 Revenue-Critical Alerts:');
    monitor.monitoringState.alerts.forEach(alert => {
      console.log(`- [${alert.impact}] ${alert.endpoint}: ${alert.message} (${alert.timestamp})`);
    });
    break;
  default:
    console.log(`
💰 Revenue-Critical Monitoring Commands:
  start      - Start continuous revenue monitoring
  check      - Check revenue-critical endpoints
  dashboard  - Show revenue dashboard
  alerts     - List revenue-critical alerts
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = RevenueCriticalMonitoring;
