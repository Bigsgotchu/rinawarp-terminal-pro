/**
 * RinaWarp Email Campaign Analytics Dashboard
 * Real-time monitoring of open rates, click rates, and conversions
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const ConversionTracker = require('./conversion-tracking.js');

class AnalyticsDashboard {
    constructor() {
        this.tracker = new ConversionTracker();
        this.server = null;
        this.port = process.env.DASHBOARD_PORT || 3000;
        this.refreshInterval = 30000; // 30 seconds
        this.metrics = {
            campaigns: new Map(),
            dailyStats: new Map(),
            realTimeEvents: []
        };
        
        this.initializeMetrics();
    }

    /**
     * Initialize metrics from stored data
     */
    initializeMetrics() {
        const eventLogPath = path.join(__dirname, 'tracking-events.json');
        if (fs.existsSync(eventLogPath)) {
            const events = JSON.parse(fs.readFileSync(eventLogPath, 'utf8'));
            this.processEvents(events);
        }
    }

    /**
     * Process events for dashboard metrics
     */
    processEvents(events) {
        events.forEach(event => {
            this.updateMetrics(event);
        });
    }

    /**
     * Update metrics with new event
     */
    updateMetrics(event) {
        const campaignId = event.campaignId || 'unknown';
        const date = event.timestamp.split('T')[0];

        // Update campaign metrics
        if (!this.metrics.campaigns.has(campaignId)) {
            this.metrics.campaigns.set(campaignId, {
                emailsSent: 0,
                emailOpens: 0,
                linkClicks: 0,
                conversions: 0,
                uniqueOpens: new Set(),
                uniqueClicks: new Set(),
                uniqueConversions: new Set()
            });
        }

        const campaign = this.metrics.campaigns.get(campaignId);

        switch (event.type) {
            case 'email_open':
                campaign.emailOpens++;
                campaign.uniqueOpens.add(event.userId || event.pixelId);
                break;
            case 'link_click':
                campaign.linkClicks++;
                campaign.uniqueClicks.add(event.userId || event.sessionId);
                break;
            case 'beta_signup':
                campaign.conversions++;
                campaign.uniqueConversions.add(event.formData?.email || event.id);
                break;
        }

        // Update daily stats
        if (!this.metrics.dailyStats.has(date)) {
            this.metrics.dailyStats.set(date, {
                opens: 0,
                clicks: 0,
                conversions: 0,
                campaigns: new Set()
            });
        }

        const dailyStat = this.metrics.dailyStats.get(date);
        dailyStat.campaigns.add(campaignId);

        switch (event.type) {
            case 'email_open':
                dailyStat.opens++;
                break;
            case 'link_click':
                dailyStat.clicks++;
                break;
            case 'beta_signup':
                dailyStat.conversions++;
                break;
        }

        // Add to real-time events (keep last 100)
        this.metrics.realTimeEvents.unshift(event);
        if (this.metrics.realTimeEvents.length > 100) {
            this.metrics.realTimeEvents.pop();
        }
    }

    /**
     * Get dashboard data
     */
    getDashboardData() {
        const campaigns = Array.from(this.metrics.campaigns.entries()).map(([id, data]) => ({
            id,
            emailsSent: data.emailsSent,
            emailOpens: data.emailOpens,
            linkClicks: data.linkClicks,
            conversions: data.conversions,
            uniqueOpens: data.uniqueOpens.size,
            uniqueClicks: data.uniqueClicks.size,
            uniqueConversions: data.uniqueConversions.size,
            openRate: data.emailsSent > 0 ? ((data.uniqueOpens.size / data.emailsSent) * 100).toFixed(2) : 0,
            clickRate: data.uniqueOpens.size > 0 ? ((data.uniqueClicks.size / data.uniqueOpens.size) * 100).toFixed(2) : 0,
            conversionRate: data.uniqueClicks.size > 0 ? ((data.uniqueConversions.size / data.uniqueClicks.size) * 100).toFixed(2) : 0
        }));

        const dailyStats = Array.from(this.metrics.dailyStats.entries())
            .sort((a, b) => new Date(b[0]) - new Date(a[0]))
            .slice(0, 30)
            .map(([date, data]) => ({
                date,
                opens: data.opens,
                clicks: data.clicks,
                conversions: data.conversions,
                campaigns: data.campaigns.size
            }));

        const totalMetrics = campaigns.reduce((acc, campaign) => ({
            totalOpens: acc.totalOpens + campaign.emailOpens,
            totalClicks: acc.totalClicks + campaign.linkClicks,
            totalConversions: acc.totalConversions + campaign.conversions,
            totalUniqueOpens: acc.totalUniqueOpens + campaign.uniqueOpens,
            totalUniqueClicks: acc.totalUniqueClicks + campaign.uniqueClicks,
            totalUniqueConversions: acc.totalUniqueConversions + campaign.uniqueConversions
        }), {
            totalOpens: 0,
            totalClicks: 0,
            totalConversions: 0,
            totalUniqueOpens: 0,
            totalUniqueClicks: 0,
            totalUniqueConversions: 0
        });

        return {
            campaigns,
            dailyStats,
            totalMetrics,
            realTimeEvents: this.metrics.realTimeEvents.slice(0, 20),
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Generate HTML dashboard
     */
    generateDashboardHTML() {
        const data = this.getDashboardData();
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RinaWarp Email Campaign Analytics</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f5f5f5;
            color: #333;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .metric-card {
            background: white;
            border-radius: 10px;
            padding: 1.5rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .metric-card h3 {
            color: #666;
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .metric-value {
            font-size: 2.5rem;
            font-weight: bold;
            color: #333;
            margin-bottom: 0.5rem;
        }
        
        .metric-change {
            font-size: 0.9rem;
            color: #28a745;
        }
        
        .campaigns-table {
            background: white;
            border-radius: 10px;
            padding: 1.5rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
        }
        
        .campaigns-table h2 {
            margin-bottom: 1rem;
            color: #333;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th, td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #666;
        }
        
        .rate-good { color: #28a745; }
        .rate-medium { color: #ffc107; }
        .rate-poor { color: #dc3545; }
        
        .real-time {
            background: white;
            border-radius: 10px;
            padding: 1.5rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .real-time h2 {
            margin-bottom: 1rem;
            color: #333;
        }
        
        .event-item {
            display: flex;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #eee;
        }
        
        .event-icon {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 0.75rem;
        }
        
        .event-open { background-color: #007bff; }
        .event-click { background-color: #28a745; }
        .event-conversion { background-color: #ffc107; }
        
        .event-time {
            font-size: 0.8rem;
            color: #999;
            margin-left: auto;
        }
        
        .chart-container {
            background: white;
            border-radius: 10px;
            padding: 1.5rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
        }
        
        .refresh-info {
            text-align: center;
            color: #666;
            font-size: 0.9rem;
            margin-top: 1rem;
        }
        
        @media (max-width: 768px) {
            .dashboard {
                padding: 1rem;
            }
            
            .metrics-grid {
                grid-template-columns: 1fr;
            }
            
            table {
                font-size: 0.9rem;
            }
            
            th, td {
                padding: 0.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 RinaWarp Email Analytics</h1>
        <p>Real-time campaign performance monitoring</p>
    </div>
    
    <div class="dashboard">
        <div class="metrics-grid">
            <div class="metric-card">
                <h3>Total Opens</h3>
                <div class="metric-value">${data.totalMetrics.totalOpens.toLocaleString()}</div>
                <div class="metric-change">↗ ${data.totalMetrics.totalUniqueOpens} unique</div>
            </div>
            
            <div class="metric-card">
                <h3>Total Clicks</h3>
                <div class="metric-value">${data.totalMetrics.totalClicks.toLocaleString()}</div>
                <div class="metric-change">↗ ${data.totalMetrics.totalUniqueClicks} unique</div>
            </div>
            
            <div class="metric-card">
                <h3>Conversions</h3>
                <div class="metric-value">${data.totalMetrics.totalConversions.toLocaleString()}</div>
                <div class="metric-change">↗ ${data.totalMetrics.totalUniqueConversions} unique</div>
            </div>
            
            <div class="metric-card">
                <h3>Active Campaigns</h3>
                <div class="metric-value">${data.campaigns.length}</div>
                <div class="metric-change">↗ Running</div>
            </div>
        </div>
        
        <div class="campaigns-table">
            <h2>📧 Campaign Performance</h2>
            <table>
                <thead>
                    <tr>
                        <th>Campaign</th>
                        <th>Opens</th>
                        <th>Clicks</th>
                        <th>Conversions</th>
                        <th>Open Rate</th>
                        <th>Click Rate</th>
                        <th>Conversion Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.campaigns.map(campaign => `
                        <tr>
                            <td><strong>${campaign.id}</strong></td>
                            <td>${campaign.emailOpens} (${campaign.uniqueOpens} unique)</td>
                            <td>${campaign.linkClicks} (${campaign.uniqueClicks} unique)</td>
                            <td>${campaign.conversions} (${campaign.uniqueConversions} unique)</td>
                            <td class="${this.getRateClass(campaign.openRate)}">${campaign.openRate}%</td>
                            <td class="${this.getRateClass(campaign.clickRate)}">${campaign.clickRate}%</td>
                            <td class="${this.getRateClass(campaign.conversionRate)}">${campaign.conversionRate}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="chart-container">
            <h2>📈 Daily Performance (Last 30 Days)</h2>
            <canvas id="performanceChart" width="800" height="400"></canvas>
        </div>
        
        <div class="real-time">
            <h2>🔴 Real-Time Events</h2>
            <div id="realTimeEvents">
                ${data.realTimeEvents.map(event => `
                    <div class="event-item">
                        <div class="event-icon event-${event.type.replace('_', '-')}"></div>
                        <div>
                            <strong>${event.type.replace('_', ' ').toUpperCase()}</strong>
                            ${event.campaignId ? `- ${event.campaignId}` : ''}
                            ${event.formData?.email ? `- ${event.formData.email}` : ''}
                        </div>
                        <div class="event-time">${new Date(event.timestamp).toLocaleTimeString()}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="refresh-info">
            📊 Dashboard updates every 30 seconds | Last updated: ${new Date(data.lastUpdated).toLocaleString()}
        </div>
    </div>
    
    <script>
        // Auto-refresh dashboard
        setInterval(() => {
            location.reload();
        }, 30000);
        
        // Simple chart rendering (you can replace with Chart.js for more advanced charts)
        const canvas = document.getElementById('performanceChart');
        const ctx = canvas.getContext('2d');
        
        const dailyData = ${JSON.stringify(data.dailyStats)};
        
        // Simple bar chart
        const maxValue = Math.max(...dailyData.map(d => Math.max(d.opens, d.clicks, d.conversions)));
        const barWidth = canvas.width / (dailyData.length * 3 + dailyData.length);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        dailyData.forEach((day, index) => {
            const x = index * (barWidth * 4);
            const openHeight = (day.opens / maxValue) * (canvas.height - 40);
            const clickHeight = (day.clicks / maxValue) * (canvas.height - 40);
            const conversionHeight = (day.conversions / maxValue) * (canvas.height - 40);
            
            // Opens (blue)
            ctx.fillStyle = '#007bff';
            ctx.fillRect(x, canvas.height - openHeight - 20, barWidth, openHeight);
            
            // Clicks (green)
            ctx.fillStyle = '#28a745';
            ctx.fillRect(x + barWidth, canvas.height - clickHeight - 20, barWidth, clickHeight);
            
            // Conversions (yellow)
            ctx.fillStyle = '#ffc107';
            ctx.fillRect(x + barWidth * 2, canvas.height - conversionHeight - 20, barWidth, conversionHeight);
            
            // Date label
            ctx.fillStyle = '#666';
            ctx.font = '10px Arial';
            ctx.fillText(day.date.slice(5), x, canvas.height - 5);
        });
        
        // Legend
        ctx.fillStyle = '#007bff';
        ctx.fillRect(10, 10, 15, 15);
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.fillText('Opens', 30, 22);
        
        ctx.fillStyle = '#28a745';
        ctx.fillRect(80, 10, 15, 15);
        ctx.fillText('Clicks', 100, 22);
        
        ctx.fillStyle = '#ffc107';
        ctx.fillRect(150, 10, 15, 15);
        ctx.fillText('Conversions', 170, 22);
    </script>
</body>
</html>`;
    }

    /**
     * Get CSS class for rate coloring
     */
    getRateClass(rate) {
        const numRate = parseFloat(rate);
        if (numRate >= 20) return 'rate-good';
        if (numRate >= 10) return 'rate-medium';
        return 'rate-poor';
    }

    /**
     * Start dashboard server
     */
    startServer() {
        this.server = http.createServer((req, res) => {
            const parsedUrl = url.parse(req.url, true);
            
            if (parsedUrl.pathname === '/') {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(this.generateDashboardHTML());
            } else if (parsedUrl.pathname === '/api/data') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(this.getDashboardData()));
            } else if (parsedUrl.pathname === '/api/track/conversion' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', async () => {
                    try {
                        const conversionData = JSON.parse(body);
                        await this.tracker.trackConversion(conversionData);
                        this.updateMetrics({ ...conversionData, type: 'beta_signup' });
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } catch (error) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: error.message }));
                    }
                });
            } else if (parsedUrl.pathname.startsWith('/track/pixel/')) {
                const pixelId = parsedUrl.pathname.split('/')[3];
                this.tracker.trackEmailOpen(pixelId, req);
                this.updateMetrics({ 
                    type: 'email_open', 
                    pixelId, 
                    timestamp: new Date().toISOString() 
                });
                
                // Return 1x1 transparent pixel
                const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
                res.writeHead(200, { 'Content-Type': 'image/png' });
                res.end(pixel);
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            }
        });

        this.server.listen(this.port, () => {
            console.log(`📊 Analytics Dashboard running at http://localhost:${this.port}`);
        });
    }

    /**
     * Stop dashboard server
     */
    stopServer() {
        if (this.server) {
            this.server.close();
            console.log('📊 Analytics Dashboard stopped');
        }
    }
}

module.exports = AnalyticsDashboard;

// Run dashboard if this file is executed directly
if (require.main === module) {
    const dashboard = new AnalyticsDashboard();
    dashboard.startServer();
}
