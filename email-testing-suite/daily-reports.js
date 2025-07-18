/**
 * RinaWarp Daily Campaign Performance Reports
 * Automated generation and distribution of daily performance summaries
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const ConversionTracker = require('./conversion-tracking.js');
const WebhookNotificationSystem = require('./webhook-notifications.js');

class DailyReportGenerator {
    constructor() {
        this.tracker = new ConversionTracker();
        this.webhookSystem = new WebhookNotificationSystem();
        this.reportConfig = {
            email: {
                enabled: process.env.DAILY_REPORTS_EMAIL_ENABLED === 'true',
                recipients: (process.env.DAILY_REPORT_RECIPIENTS || 'team@rinawarp.com').split(','),
                smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
                smtpPort: process.env.SMTP_PORT || 587,
                username: process.env.EMAIL_USERNAME || '',
                password: process.env.EMAIL_PASSWORD || '',
                from: process.env.EMAIL_FROM || 'reports@rinawarp.com'
            },
            slack: {
                enabled: process.env.DAILY_REPORTS_SLACK_ENABLED === 'true',
                webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
                channel: process.env.SLACK_REPORTS_CHANNEL || '#daily-reports'
            },
            storage: {
                directory: process.env.REPORTS_DIRECTORY || './reports',
                retention: parseInt(process.env.REPORTS_RETENTION_DAYS || '90')
            },
            schedule: {
                time: process.env.DAILY_REPORT_TIME || '09:00',
                timezone: process.env.DAILY_REPORT_TIMEZONE || 'UTC'
            }
        };
        
        this.ensureReportsDirectory();
    }

    /**
     * Ensure reports directory exists
     */
    ensureReportsDirectory() {
        if (!fs.existsSync(this.reportConfig.storage.directory)) {
            fs.mkdirSync(this.reportConfig.storage.directory, { recursive: true });
        }
    }

    /**
     * Generate daily performance report
     */
    async generateDailyReport(date = new Date()) {
        const reportDate = new Date(date);
        reportDate.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(reportDate);
        nextDay.setDate(nextDay.getDate() + 1);

        console.log(`📊 Generating daily report for ${reportDate.toISOString().split('T')[0]}`);

        const eventLogPath = path.join(__dirname, 'tracking-events.json');
        let events = [];

        if (fs.existsSync(eventLogPath)) {
            const data = fs.readFileSync(eventLogPath, 'utf8');
            events = JSON.parse(data);
        }

        // Filter events for the specific date
        const dailyEvents = events.filter(event => {
            const eventDate = new Date(event.timestamp);
            return eventDate >= reportDate && eventDate < nextDay;
        });

        // Process events by type
        const emailOpens = dailyEvents.filter(e => e.type === 'email_open');
        const linkClicks = dailyEvents.filter(e => e.type === 'link_click');
        const conversions = dailyEvents.filter(e => e.type === 'beta_signup');

        // Calculate metrics
        const metrics = {
            totalEvents: dailyEvents.length,
            emailOpens: emailOpens.length,
            linkClicks: linkClicks.length,
            conversions: conversions.length,
            uniqueOpens: new Set(emailOpens.map(e => e.userId || e.pixelId)).size,
            uniqueClicks: new Set(linkClicks.map(e => e.userId || e.sessionId)).size,
            uniqueConversions: new Set(conversions.map(e => e.formData?.email || e.id)).size
        };

        metrics.openRate = metrics.uniqueOpens > 0 ? ((metrics.uniqueOpens / metrics.emailOpens) * 100).toFixed(2) : 0;
        metrics.clickRate = metrics.uniqueOpens > 0 ? ((metrics.uniqueClicks / metrics.uniqueOpens) * 100).toFixed(2) : 0;
        metrics.conversionRate = metrics.uniqueClicks > 0 ? ((metrics.uniqueConversions / metrics.uniqueClicks) * 100).toFixed(2) : 0;

        // Campaign breakdown
        const campaignMetrics = this.getCampaignBreakdown(dailyEvents);
        
        // Traffic sources
        const trafficSources = this.getTrafficSources(conversions);
        
        // Hourly distribution
        const hourlyDistribution = this.getHourlyDistribution(dailyEvents);
        
        // User engagement
        const engagement = this.getEngagementMetrics(dailyEvents);

        // Get previous day for comparison
        const previousDay = new Date(reportDate);
        previousDay.setDate(previousDay.getDate() - 1);
        const previousReport = this.getPreviousDayComparison(previousDay);

        const report = {
            date: reportDate.toISOString().split('T')[0],
            generated: new Date().toISOString(),
            metrics,
            campaignMetrics,
            trafficSources,
            hourlyDistribution,
            engagement,
            previousDayComparison: previousReport,
            rawEvents: {
                total: dailyEvents.length,
                opens: emailOpens.length,
                clicks: linkClicks.length,
                conversions: conversions.length
            },
            topConversions: conversions.slice(0, 10).map(c => ({
                email: c.formData?.email,
                timestamp: c.timestamp,
                source: c.utmParams?.source,
                campaign: c.campaignId
            }))
        };

        // Save report to file
        await this.saveReport(report);
        
        // Send report via configured channels
        await this.distributeReport(report);

        console.log(`✅ Daily report generated and distributed for ${report.date}`);
        return report;
    }

    /**
     * Get campaign breakdown
     */
    getCampaignBreakdown(events) {
        const campaigns = {};
        
        events.forEach(event => {
            const campaignId = event.campaignId || 'unknown';
            if (!campaigns[campaignId]) {
                campaigns[campaignId] = {
                    opens: 0,
                    clicks: 0,
                    conversions: 0,
                    uniqueUsers: new Set()
                };
            }
            
            campaigns[campaignId].uniqueUsers.add(event.userId || event.pixelId || event.id);
            
            switch (event.type) {
                case 'email_open':
                    campaigns[campaignId].opens++;
                    break;
                case 'link_click':
                    campaigns[campaignId].clicks++;
                    break;
                case 'beta_signup':
                    campaigns[campaignId].conversions++;
                    break;
            }
        });

        return Object.entries(campaigns).map(([id, data]) => ({
            campaignId: id,
            opens: data.opens,
            clicks: data.clicks,
            conversions: data.conversions,
            uniqueUsers: data.uniqueUsers.size,
            clickRate: data.opens > 0 ? ((data.clicks / data.opens) * 100).toFixed(2) : 0,
            conversionRate: data.clicks > 0 ? ((data.conversions / data.clicks) * 100).toFixed(2) : 0
        })).sort((a, b) => b.conversions - a.conversions);
    }

    /**
     * Get traffic sources
     */
    getTrafficSources(conversions) {
        const sources = {};
        
        conversions.forEach(conversion => {
            const source = conversion.utmParams?.source || 'direct';
            const medium = conversion.utmParams?.medium || 'unknown';
            const key = `${source} / ${medium}`;
            
            if (!sources[key]) {
                sources[key] = {
                    source,
                    medium,
                    conversions: 0,
                    campaigns: new Set()
                };
            }
            
            sources[key].conversions++;
            sources[key].campaigns.add(conversion.campaignId || 'unknown');
        });

        return Object.entries(sources).map(([key, data]) => ({
            source: data.source,
            medium: data.medium,
            conversions: data.conversions,
            campaigns: Array.from(data.campaigns),
            percentage: conversions.length > 0 ? ((data.conversions / conversions.length) * 100).toFixed(1) : 0
        })).sort((a, b) => b.conversions - a.conversions);
    }

    /**
     * Get hourly distribution
     */
    getHourlyDistribution(events) {
        const hours = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            opens: 0,
            clicks: 0,
            conversions: 0
        }));

        events.forEach(event => {
            const hour = new Date(event.timestamp).getHours();
            switch (event.type) {
                case 'email_open':
                    hours[hour].opens++;
                    break;
                case 'link_click':
                    hours[hour].clicks++;
                    break;
                case 'beta_signup':
                    hours[hour].conversions++;
                    break;
            }
        });

        return hours;
    }

    /**
     * Get engagement metrics
     */
    getEngagementMetrics(events) {
        const userSessions = {};
        
        events.forEach(event => {
            const userId = event.userId || event.pixelId || event.id;
            if (!userSessions[userId]) {
                userSessions[userId] = {
                    opens: 0,
                    clicks: 0,
                    conversions: 0,
                    firstSeen: event.timestamp,
                    lastSeen: event.timestamp
                };
            }
            
            const session = userSessions[userId];
            session.lastSeen = event.timestamp;
            
            switch (event.type) {
                case 'email_open':
                    session.opens++;
                    break;
                case 'link_click':
                    session.clicks++;
                    break;
                case 'beta_signup':
                    session.conversions++;
                    break;
            }
        });

        const sessions = Object.values(userSessions);
        const totalSessions = sessions.length;
        const engagedUsers = sessions.filter(s => s.clicks > 0 || s.conversions > 0).length;
        const convertedUsers = sessions.filter(s => s.conversions > 0).length;

        return {
            totalSessions,
            engagedUsers,
            convertedUsers,
            engagementRate: totalSessions > 0 ? ((engagedUsers / totalSessions) * 100).toFixed(2) : 0,
            conversionRate: engagedUsers > 0 ? ((convertedUsers / engagedUsers) * 100).toFixed(2) : 0,
            averageActionsPerUser: totalSessions > 0 ? (events.length / totalSessions).toFixed(1) : 0
        };
    }

    /**
     * Get previous day comparison
     */
    getPreviousDayComparison(previousDate) {
        const previousReportPath = path.join(
            this.reportConfig.storage.directory,
            `daily-report-${previousDate.toISOString().split('T')[0]}.json`
        );

        if (fs.existsSync(previousReportPath)) {
            const previousReport = JSON.parse(fs.readFileSync(previousReportPath, 'utf8'));
            return {
                date: previousReport.date,
                metrics: previousReport.metrics
            };
        }

        return null;
    }

    /**
     * Save report to file
     */
    async saveReport(report) {
        const filename = `daily-report-${report.date}.json`;
        const filepath = path.join(this.reportConfig.storage.directory, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
        
        // Also save HTML version
        const htmlReport = this.generateHTMLReport(report);
        const htmlFilepath = path.join(this.reportConfig.storage.directory, `daily-report-${report.date}.html`);
        fs.writeFileSync(htmlFilepath, htmlReport);
        
        console.log(`💾 Report saved: ${filepath}`);
    }

    /**
     * Generate HTML report
     */
    generateHTMLReport(report) {
        const previousMetrics = report.previousDayComparison?.metrics || {};
        const getChange = (current, previous) => {
            if (!previous) return 'N/A';
            const change = ((current - previous) / previous) * 100;
            const arrow = change > 0 ? '↗' : change < 0 ? '↘' : '→';
            const color = change > 0 ? '#28a745' : change < 0 ? '#dc3545' : '#6c757d';
            return `<span style="color: ${color}">${arrow} ${Math.abs(change).toFixed(1)}%</span>`;
        };

        return `
<!DOCTYPE html>
<html>
<head>
    <title>Daily Campaign Report - ${report.date}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px; margin-bottom: 20px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .metric-value { font-size: 2.5em; font-weight: bold; color: #333; }
        .metric-change { font-size: 0.9em; margin-top: 5px; }
        .section { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .section h2 { color: #333; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
        th { background-color: #f8f9fa; font-weight: 600; }
        .chart { height: 200px; background: #f8f9fa; border-radius: 5px; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Daily Campaign Report</h1>
        <p>${report.date}</p>
        <p>Generated: ${new Date(report.generated).toLocaleString()}</p>
    </div>

    <div class="metrics-grid">
        <div class="metric-card">
            <div class="metric-value">${report.metrics.conversions}</div>
            <h3>Conversions</h3>
            <div class="metric-change">${getChange(report.metrics.conversions, previousMetrics.conversions)}</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${report.metrics.emailOpens}</div>
            <h3>Email Opens</h3>
            <div class="metric-change">${getChange(report.metrics.emailOpens, previousMetrics.emailOpens)}</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${report.metrics.linkClicks}</div>
            <h3>Link Clicks</h3>
            <div class="metric-change">${getChange(report.metrics.linkClicks, previousMetrics.linkClicks)}</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${report.metrics.conversionRate}%</div>
            <h3>Conversion Rate</h3>
            <div class="metric-change">${getChange(parseFloat(report.metrics.conversionRate), parseFloat(previousMetrics.conversionRate || 0))}</div>
        </div>
    </div>

    <div class="section">
        <h2>📈 Campaign Performance</h2>
        <table>
            <thead>
                <tr>
                    <th>Campaign</th>
                    <th>Opens</th>
                    <th>Clicks</th>
                    <th>Conversions</th>
                    <th>Click Rate</th>
                    <th>Conversion Rate</th>
                </tr>
            </thead>
            <tbody>
                ${report.campaignMetrics.map(campaign => `
                    <tr>
                        <td><strong>${campaign.campaignId}</strong></td>
                        <td>${campaign.opens}</td>
                        <td>${campaign.clicks}</td>
                        <td>${campaign.conversions}</td>
                        <td>${campaign.clickRate}%</td>
                        <td>${campaign.conversionRate}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>🚀 Traffic Sources</h2>
        <table>
            <thead>
                <tr>
                    <th>Source</th>
                    <th>Medium</th>
                    <th>Conversions</th>
                    <th>Percentage</th>
                </tr>
            </thead>
            <tbody>
                ${report.trafficSources.map(source => `
                    <tr>
                        <td>${source.source}</td>
                        <td>${source.medium}</td>
                        <td>${source.conversions}</td>
                        <td>${source.percentage}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>🎯 User Engagement</h2>
        <p><strong>Total Sessions:</strong> ${report.engagement.totalSessions}</p>
        <p><strong>Engaged Users:</strong> ${report.engagement.engagedUsers} (${report.engagement.engagementRate}%)</p>
        <p><strong>Converted Users:</strong> ${report.engagement.convertedUsers} (${report.engagement.conversionRate}%)</p>
        <p><strong>Average Actions per User:</strong> ${report.engagement.averageActionsPerUser}</p>
    </div>

    <div class="section">
        <h2>🏆 Top Conversions</h2>
        <table>
            <thead>
                <tr>
                    <th>Email</th>
                    <th>Time</th>
                    <th>Source</th>
                    <th>Campaign</th>
                </tr>
            </thead>
            <tbody>
                ${report.topConversions.map(conversion => `
                    <tr>
                        <td>${conversion.email || 'N/A'}</td>
                        <td>${new Date(conversion.timestamp).toLocaleTimeString()}</td>
                        <td>${conversion.source || 'Direct'}</td>
                        <td>${conversion.campaign || 'Unknown'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>`;
    }

    /**
     * Distribute report via configured channels
     */
    async distributeReport(report) {
        const promises = [];

        if (this.reportConfig.email.enabled) {
            promises.push(this.sendEmailReport(report));
        }

        if (this.reportConfig.slack.enabled) {
            promises.push(this.sendSlackReport(report));
        }

        const results = await Promise.allSettled(promises);
        
        results.forEach((result, index) => {
            const channels = ['email', 'slack'];
            if (result.status === 'fulfilled') {
                console.log(`✅ Report sent via ${channels[index]}`);
            } else {
                console.error(`❌ Failed to send report via ${channels[index]}:`, result.reason);
            }
        });
    }

    /**
     * Send email report
     */
    async sendEmailReport(report) {
        const transporter = nodemailer.createTransporter({
            host: this.reportConfig.email.smtpHost,
            port: this.reportConfig.email.smtpPort,
            secure: this.reportConfig.email.smtpPort === 465,
            auth: {
                user: this.reportConfig.email.username,
                pass: this.reportConfig.email.password
            }
        });

        const htmlReport = this.generateHTMLReport(report);
        const previousMetrics = report.previousDayComparison?.metrics || {};
        
        const mailOptions = {
            from: this.reportConfig.email.from,
            to: this.reportConfig.email.recipients,
            subject: `📊 Daily Campaign Report - ${report.date}`,
            html: htmlReport,
            attachments: [
                {
                    filename: `daily-report-${report.date}.json`,
                    content: JSON.stringify(report, null, 2),
                    contentType: 'application/json'
                }
            ]
        };

        await transporter.sendMail(mailOptions);
    }

    /**
     * Send Slack report
     */
    async sendSlackReport(report) {
        const previousMetrics = report.previousDayComparison?.metrics || {};
        const getChangeEmoji = (current, previous) => {
            if (!previous) return '➡️';
            const change = current - previous;
            return change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
        };

        const slackMessage = {
            text: `📊 Daily Campaign Report - ${report.date}`,
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: `📊 Daily Campaign Report - ${report.date}`
                    }
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: `*Conversions:*\n${report.metrics.conversions} ${getChangeEmoji(report.metrics.conversions, previousMetrics.conversions)}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Email Opens:*\n${report.metrics.emailOpens} ${getChangeEmoji(report.metrics.emailOpens, previousMetrics.emailOpens)}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Link Clicks:*\n${report.metrics.linkClicks} ${getChangeEmoji(report.metrics.linkClicks, previousMetrics.linkClicks)}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Conversion Rate:*\n${report.metrics.conversionRate}% ${getChangeEmoji(parseFloat(report.metrics.conversionRate), parseFloat(previousMetrics.conversionRate || 0))}`
                        }
                    ]
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Top Campaigns:*\n${report.campaignMetrics.slice(0, 3).map(c => `• ${c.campaignId}: ${c.conversions} conversions`).join('\n')}`
                    }
                }
            ]
        };

        await axios.post(this.reportConfig.slack.webhookUrl, slackMessage);
    }

    /**
     * Schedule daily report generation
     */
    scheduleDailyReports() {
        const [hour, minute] = this.reportConfig.schedule.time.split(':');
        const scheduleTime = new Date();
        scheduleTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
        
        // If the time has already passed today, schedule for tomorrow
        if (scheduleTime < new Date()) {
            scheduleTime.setDate(scheduleTime.getDate() + 1);
        }
        
        const timeUntilNext = scheduleTime.getTime() - Date.now();
        
        console.log(`📅 Daily reports scheduled for ${this.reportConfig.schedule.time} (${timeUntilNext}ms from now)`);
        
        setTimeout(() => {
            this.generateDailyReport();
            // Schedule recurring reports every 24 hours
            setInterval(() => {
                this.generateDailyReport();
            }, 24 * 60 * 60 * 1000);
        }, timeUntilNext);
    }

    /**
     * Clean up old reports
     */
    cleanupOldReports() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.reportConfig.storage.retention);
        
        const files = fs.readdirSync(this.reportConfig.storage.directory);
        let deleted = 0;
        
        files.forEach(file => {
            if (file.startsWith('daily-report-') && file.endsWith('.json')) {
                const filePath = path.join(this.reportConfig.storage.directory, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime < cutoffDate) {
                    fs.unlinkSync(filePath);
                    deleted++;
                }
            }
        });
        
        if (deleted > 0) {
            console.log(`🗑️ Cleaned up ${deleted} old reports`);
        }
    }
}

module.exports = DailyReportGenerator;

// Example usage if run directly
if (require.main === module) {
    const reportGenerator = new DailyReportGenerator();
    
    // Generate report for today
    reportGenerator.generateDailyReport().then(() => {
        console.log('Daily report generated successfully');
    }).catch(error => {
        console.error('Failed to generate daily report:', error);
    });
}
