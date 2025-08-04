import logger from './utils/logger.js';

/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

// Security Dashboard JavaScript - CSP Compliant Version
let refreshInterval;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners for buttons
    const refreshBtn = document.getElementById('refreshBtn');
    const testAlertBtn = document.getElementById('testAlertBtn');
    const blockIPBtn = document.getElementById('blockIPBtn');
    const submitBlockBtn = document.getElementById('submitBlockBtn');
    const cancelBlockBtn = document.getElementById('cancelBlockBtn');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshData);
    }
    
    if (testAlertBtn) {
        testAlertBtn.addEventListener('click', testAlert);
    }
    
    if (blockIPBtn) {
        blockIPBtn.addEventListener('click', showBlockIPModal);
    }
    
    if (submitBlockBtn) {
        submitBlockBtn.addEventListener('click', blockIP);
    }
    
    if (cancelBlockBtn) {
        cancelBlockBtn.addEventListener('click', hideBlockIPModal);
    }
    
    // Start dashboard
    refreshData();
    startAutoRefresh();
});

function startAutoRefresh() {
    refreshInterval = setInterval(refreshData, 30000); // 30 seconds
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
}

async function refreshData() {
    try {
        await Promise.all([
            loadSystemHealth(),
            loadSecurityStats(),
            loadBlockedIPs(),
            loadSuspiciousActivity()
        ]);
        
        document.getElementById('lastUpdated').textContent = 
            `Last updated: ${new Date().toLocaleTimeString()}`;
    } catch (error) {
        logger.error('Error refreshing data:', error);
        showError('Failed to refresh dashboard data');
    }
}

async function loadSystemHealth() {
    try {
        const response = await fetch('/api/security/health');
        const data = await response.json();
        
        const statusHtml = `
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <span class="status-indicator ${data.status === 'healthy' ? 'status-healthy' : 'status-danger'}"></span>
                <span style="font-size: 1.2rem; font-weight: bold;">
                    ${data.status === 'healthy' ? 'System Healthy' : 'System Issues'}
                </span>
            </div>
            <div style="font-size: 0.9rem; color: #ccc;">
                <div>Uptime: ${Math.floor(data.system.uptime / 3600)}h ${Math.floor((data.system.uptime % 3600) / 60)}m</div>
                <div>Memory: ${Math.round(data.system.memoryUsage.heapUsed / 1024 / 1024)}MB used</div>
                <div>Threat Detection: ${data.threatDetection.enabled ? '✅ Active' : '❌ Disabled'}</div>
                <div>Active Blocks: ${data.threatDetection.activeBlocks}</div>
                <div>Tracked IPs: ${data.threatDetection.trackedIPs}</div>
            </div>
        `;
        
        document.getElementById('systemStatus').innerHTML = statusHtml;
    } catch (error) {
        document.getElementById('systemStatus').innerHTML = '<div class="error">Failed to load system health</div>';
    }
}

async function loadSecurityStats() {
    try {
        const response = await fetch('/api/security/stats');
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(new Error(new Error(data.error || 'Failed to load stats')));
        }
        
        const stats = data.stats;
        const statsHtml = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <div class="stat-value">${stats.totalRequests || 0}</div>
                    <div class="stat-label">Total Requests</div>
                </div>
                <div>
                    <div class="stat-value">${stats.threatsBlocked || 0}</div>
                    <div class="stat-label">Threats Blocked</div>
                </div>
                <div>
                    <div class="stat-value">${stats.suspiciousRequests || 0}</div>
                    <div class="stat-label">Suspicious Requests</div>
                </div>
                <div>
                    <div class="stat-value">${stats.activeBlocks || 0}</div>
                    <div class="stat-label">Active Blocks</div>
                </div>
            </div>
        `;
        
        document.getElementById('securityStats').innerHTML = statsHtml;
    } catch (error) {
        document.getElementById('securityStats').innerHTML = '<div class="error">Failed to load security stats</div>';
    }
}

async function loadBlockedIPs() {
    try {
        const response = await fetch('/api/security/blocked-ips');
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(new Error(new Error(data.error || 'Failed to load blocked IPs')));
        }
        
        const blockedIPs = data.blockedIPs || [];
        
        if (blockedIPs.length === 0) {
            document.getElementById('blockedIPs').innerHTML = 
                '<div style="color: #00ff88; text-align: center;">No IPs currently blocked</div>';
            return;
        }
        
        let html = '<div style="max-height: 200px; overflow-y: auto;">';
        blockedIPs.forEach(entry => {
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #333;">
                    <span>${entry.ip}</span>
                    <span style="color: #888; font-size: 0.8rem;">${entry.reason || 'No reason specified'}</span>
                </div>
            `;
        });
        html += '</div>';
        
        document.getElementById('blockedIPs').innerHTML = html;
    } catch (error) {
        document.getElementById('blockedIPs').innerHTML = '<div class="error">Failed to load blocked IPs</div>';
    }
}

async function loadSuspiciousActivity() {
    try {
        const response = await fetch('/api/security/suspicious');
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(new Error(new Error(data.error || 'Failed to load suspicious activity')));
        }
        
        const activities = data.activities || [];
        
        if (activities.length === 0) {
            document.getElementById('suspiciousActivity').innerHTML = 
                '<div style="color: #00ff88; text-align: center;">No suspicious activity detected</div>';
            return;
        }
        
        let html = '<div style="max-height: 200px; overflow-y: auto;">';
        activities.slice(0, 10).forEach(activity => {
            html += `
                <div style="padding: 10px; border-bottom: 1px solid #333;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="color: #ff4444;">${activity.type}</span>
                        <span style="color: #888; font-size: 0.8rem;">${new Date(activity.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style="font-size: 0.9rem; color: #ccc;">
                        <div>IP: ${activity.ip}</div>
                        <div>Path: ${activity.path || 'N/A'}</div>
                        ${activity.details ? `<div>Details: ${activity.details}</div>` : ''}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        document.getElementById('suspiciousActivity').innerHTML = html;
    } catch (error) {
        document.getElementById('suspiciousActivity').innerHTML = '<div class="error">Failed to load suspicious activity</div>';
    }
}

function testAlert() {
    alert('🚨 Security Alert Test!\n\nThis is a test of the security alert system.\nIn a real scenario, this would trigger notifications to administrators.');
}

function showBlockIPModal() {
    document.getElementById('blockIPModal').style.display = 'flex';
}

function hideBlockIPModal() {
    document.getElementById('blockIPModal').style.display = 'none';
    document.getElementById('ipToBlock').value = '';
    document.getElementById('blockReason').value = '';
}

async function blockIP() {
    const ip = document.getElementById('ipToBlock').value.trim();
    const reason = document.getElementById('blockReason').value.trim();
    
    if (!ip) {
        alert('Please enter an IP address');
        return;
    }
    
    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
        alert('Please enter a valid IP address (e.g., 192.168.1.1)');
        return;
    }
    
    try {
        const response = await fetch('/api/security/block-ip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ip, reason })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ IP ${ip} has been blocked successfully`);
            hideBlockIPModal();
            refreshData(); // Refresh the dashboard to show the new blocked IP
        } else {
            alert(`❌ Failed to block IP: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        logger.error('Error blocking IP:', error);
        alert('❌ Failed to block IP: Network error');
    }
}

function showError(message) {
    logger.error(message);
    // You could also show this in a toast notification or modal
}
