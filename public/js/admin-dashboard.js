// Admin Dashboard JavaScript - CSP Compliant Version
let refreshInterval;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners for tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const tabName = this.getAttribute('data-tab');
            showTab(tabName, e);
        });
    });
    
    // Add event listeners for refresh buttons
    const refreshButtons = document.querySelectorAll('.refresh-button');
    refreshButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            switch(action) {
                case 'overview':
                    refreshOverview();
                    break;
                case 'marketing':
                    refreshMarketing();
                    break;
                case 'analytics':
                    refreshAnalytics();
                    break;
                case 'support':
                    refreshSupport();
                    break;
                case 'security':
                    refreshSecurity();
                    break;
            }
        });
    });
    
    // Load initial data
    refreshOverview();
});

function showTab(tabName, event) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Load data for the selected tab
    loadTabData(tabName);
}

function loadTabData(tabName) {
    switch(tabName) {
        case 'overview':
            refreshOverview();
            break;
        case 'marketing':
            refreshMarketing();
            break;
        case 'analytics':
            refreshAnalytics();
            break;
        case 'support':
            refreshSupport();
            break;
        case 'security':
            refreshSecurity();
            break;
    }
}

async function refreshOverview() {
    try {
        // Load marketing stats
        const marketingResponse = await fetch('/api/marketing/stats');
        const marketingData = await marketingResponse.json();
        
        if (marketingData.success) {
            document.getElementById('total-leads').textContent = marketingData.data.total || 0;
            document.getElementById('leads-change').textContent = `+${marketingData.data.last7d || 0} this week`;
        }

        // Load analytics stats
        const analyticsResponse = await fetch('/api/analytics/data');
        const analyticsData = await analyticsResponse.json();
        
        if (analyticsData.success) {
            document.getElementById('active-sessions').textContent = analyticsData.data.overview?.totalSessions || 0;
            document.getElementById('conversion-rate').textContent = (analyticsData.data.overview?.conversionRate || 0) + '%';
        }

        // Load support stats
        const supportResponse = await fetch('/api/support/stats');
        const supportData = await supportResponse.json();
        
        if (supportData.success) {
            document.getElementById('open-tickets').textContent = supportData.data.open || 0;
            document.getElementById('tickets-change').textContent = `${supportData.data.last24h || 0} today`;
        }

        // Load system health
        const healthResponse = await fetch('/api/status/health');
        const healthData = await healthResponse.json();
        
        let healthHtml = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">';
        
        healthHtml += `<div><span class="status-indicator status-healthy"></span><strong>Server:</strong> ${healthData.status}</div>`;
        healthHtml += `<div><span class="status-indicator ${healthData.integrations.smtp.configured ? 'status-healthy' : 'status-warning'}"></span><strong>SMTP:</strong> ${healthData.integrations.smtp.provider}</div>`;
        healthHtml += `<div><span class="status-indicator ${healthData.integrations.stripe.configured ? 'status-healthy' : 'status-error'}"></span><strong>Stripe:</strong> ${healthData.integrations.stripe.configured ? 'Connected' : 'Not configured'}</div>`;
        healthHtml += `<div><span class="status-indicator status-healthy"></span><strong>Uptime:</strong> ${healthData.uptime.human}</div>`;
        
        healthHtml += '</div>';
        document.getElementById('system-health').innerHTML = healthHtml;

    } catch (error) {
        console.error('Error refreshing overview:', error);
        document.getElementById('system-health').innerHTML = '<div class="error">Error loading system data</div>';
    }
}

async function refreshMarketing() {
    try {
        const response = await fetch('/api/marketing/stats');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('marketing-total-leads').textContent = data.data.total || 0;
            document.getElementById('marketing-week-leads').textContent = data.data.last7d || 0;
            
            // Lead sources
            let sourcesHtml = '';
            Object.entries(data.data.sources || {}).forEach(([source, count]) => {
                sourcesHtml += `<div><strong>${source}:</strong> ${count}</div>`;
            });
            document.getElementById('lead-sources').innerHTML = sourcesHtml || 'No data';
            
            // Conversion funnel
            const funnel = data.data.conversionFunnel || {};
            let funnelHtml = '';
            if (funnel.visitors) {
                funnelHtml += `<div class="funnel-step"><span class="step-name">Visitors</span><span class="step-count">${funnel.visitors}</span></div>`;
                funnelHtml += `<div class="funnel-step"><span class="step-name">Signups</span><span class="step-count">${funnel.signups}</span></div>`;
                funnelHtml += `<div class="funnel-step"><span class="step-name">Downloads</span><span class="step-count">${funnel.downloads}</span></div>`;
                funnelHtml += `<div class="funnel-step"><span class="step-name">Conversions</span><span class="step-count">${funnel.conversions}</span></div>`;
            }
            document.getElementById('conversion-funnel').innerHTML = funnelHtml || 'No funnel data';
        }
        
        // Recent leads table (mock data for now)
        document.getElementById('recent-leads').innerHTML = `
            <table>
                <thead>
                    <tr><th>Email</th><th>Source</th><th>Date</th><th>Status</th></tr>
                </thead>
                <tbody>
                    <tr><td colspan="4" style="text-align: center; color: #7f8c8d;">Lead data will appear here when captured</td></tr>
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('Error refreshing marketing:', error);
        document.getElementById('recent-leads').innerHTML = '<div class="error">Error loading marketing data</div>';
    }
}

async function refreshAnalytics() {
    try {
        const response = await fetch('/api/analytics/data');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('total-events').textContent = data.data.overview?.totalEvents || 0;
            document.getElementById('total-sessions').textContent = data.data.overview?.totalSessions || 0;
            
            // Funnel analysis
            let funnelHtml = '';
            Object.entries(data.data.funnelAnalysis || {}).forEach(([funnelId, funnel]) => {
                funnelHtml += `<div><strong>${funnel.name}:</strong> ${funnel.overallConversion}% conversion</div>`;
            });
            document.getElementById('funnel-analysis').innerHTML = funnelHtml || 'No funnel data';
        }
        
        // Load real-time metrics
        const realtimeResponse = await fetch('/api/analytics/realtime');
        const realtimeData = await realtimeResponse.json();
        
        if (realtimeData.success) {
            let realtimeHtml = `
                <div><strong>Active Users:</strong> ${realtimeData.data.activeUsers}</div>
                <div><strong>Current Sessions:</strong> ${realtimeData.data.currentSessions}</div>
                <div><strong>Events/min:</strong> ${realtimeData.data.eventsPerMinute}</div>
            `;
            document.getElementById('realtime-metrics').innerHTML = realtimeHtml;
        }
        
        // Event breakdown table
        document.getElementById('event-breakdown').innerHTML = `
            <table>
                <thead>
                    <tr><th>Event Type</th><th>Count</th><th>Last 24h</th></tr>
                </thead>
                <tbody>
                    <tr><td>Page Views</td><td>${data.data.overview?.totalEvents || 0}</td><td>-</td></tr>
                    <tr><td>Button Clicks</td><td>-</td><td>-</td></tr>
                    <tr><td>Conversions</td><td>${data.data.overview?.totalConversions || 0}</td><td>-</td></tr>
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('Error refreshing analytics:', error);
        document.getElementById('event-breakdown').innerHTML = '<div class="error">Error loading analytics data</div>';
    }
}

async function refreshSupport() {
    try {
        const response = await fetch('/api/support/stats');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('support-total-tickets').textContent = data.data.total || 0;
            document.getElementById('support-open-tickets').textContent = data.data.open || 0;
            document.getElementById('avg-response-time').textContent = data.data.averageResponseTime || 0;
            document.getElementById('sla-breaches').textContent = data.data.slaBreaches || 0;
            
            // Ticket breakdown
            let breakdownHtml = `
                <table>
                    <thead>
                        <tr><th>Category</th><th>Count</th><th>Priority</th><th>Status</th></tr>
                    </thead>
                    <tbody>
            `;
            
            Object.entries(data.data.byCategory || {}).forEach(([category, count]) => {
                breakdownHtml += `<tr><td>${category}</td><td>${count}</td><td>-</td><td>-</td></tr>`;
            });
            
            breakdownHtml += '</tbody></table>';
            document.getElementById('ticket-breakdown').innerHTML = breakdownHtml;
        }
        
    } catch (error) {
        console.error('Error refreshing support:', error);
        document.getElementById('ticket-breakdown').innerHTML = '<div class="error">Error loading support data</div>';
    }
}

async function refreshSecurity() {
    try {
        const response = await fetch('/api/security/stats');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('threat-level').textContent = data.data.threatLevel || 'LOW';
            document.getElementById('blocked-ips').textContent = data.data.blockedIPs?.length || 0;
            document.getElementById('suspicious-activity').textContent = data.data.suspiciousActivity?.last24h || 0;
            document.getElementById('security-health').textContent = data.data.systemHealth || 'HEALTHY';
            
            // Security events table
            let eventsHtml = `
                <table>
                    <thead>
                        <tr><th>Time</th><th>Event</th><th>IP</th><th>Action</th></tr>
                    </thead>
                    <tbody>
            `;
            
            (data.data.recentEvents || []).forEach(event => {
                eventsHtml += `
                    <tr>
                        <td>${new Date(event.timestamp).toLocaleTimeString()}</td>
                        <td>${event.type}</td>
                        <td>${event.ip}</td>
                        <td>${event.action}</td>
                    </tr>
                `;
            });
            
            eventsHtml += '</tbody></table>';
            document.getElementById('security-events').innerHTML = eventsHtml;
        }
        
    } catch (error) {
        console.error('Error refreshing security:', error);
        document.getElementById('security-events').innerHTML = '<div class="error">Error loading security data</div>';
    }
}
