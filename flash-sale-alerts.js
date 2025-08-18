/**
 * RinaWarp Flash Sale - Automated Alert System
 * Monitors conversion milestones and sends real-time alerts
 */

class FlashSaleAlerts {
  constructor() {
    this.apiEndpoint = 'http://18.212.105.169/api';
    this.alertEndpoint = 'http://18.212.105.169/api/alerts';
    this.webhookUrl = null; // Set your Slack/Discord webhook URL here

    this.milestones = {
      revenue: [500, 1000, 2500, 5000, 7500, 10000],
      conversions: [10, 25, 50, 100, 200, 500],
      visitors: [100, 250, 500, 1000, 2000, 5000],
      conversionRate: [5, 10, 15, 20, 25, 30], // percentages
    };

    this.reachedMilestones = {
      revenue: new Set(),
      conversions: new Set(),
      visitors: new Set(),
      conversionRate: new Set(),
    };

    this.alertHistory = [];
    this.isMonitoring = false;
    this.checkInterval = 30000; // 30 seconds

    this.init();
  }

  init() {
    console.log('🚨 Flash Sale Alert System initialized');
    this.startMonitoring();

    // Set up emergency thresholds
    this.setupEmergencyAlerts();

    // Check for existing milestones on startup
    this.performInitialCheck();
  }

  async startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('👀 Starting flash sale monitoring...');

    // Start periodic checks
    this.monitoringInterval = setInterval(() => {
      this.checkMetrics();
    }, this.checkInterval);

    // Send startup alert
    await this.sendAlert('🚀 Flash Sale Alert System ONLINE', 'info', {
      message: 'Monitoring started - watching for conversion milestones',
      timestamp: new Date().toISOString(),
    });
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    console.log('⏸️ Flash sale monitoring stopped');
  }

  async performInitialCheck() {
    try {
      const metrics = await this.fetchCurrentMetrics();
      this.checkAllMilestones(metrics);
      console.log('✅ Initial milestone check completed');
    } catch (error) {
      console.error('❌ Initial check failed:', error);
    }
  }

  async checkMetrics() {
    try {
      const metrics = await this.fetchCurrentMetrics();

      // Check all milestone categories
      this.checkAllMilestones(metrics);

      // Check for emergency conditions
      this.checkEmergencyConditions(metrics);

      // Log status
      this.logStatus(metrics);
    } catch (error) {
      console.error('❌ Metrics check failed:', error);
      await this.sendAlert('⚠️ Metrics Check Failed', 'error', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async fetchCurrentMetrics() {
    // In real implementation, this would call your actual API
    // For now, simulate with mock data that increases over time
    const baseTime = Date.now() - 1000 * 60 * 60 * 2; // Started 2 hours ago
    const timeElapsed = Date.now() - baseTime;
    const hoursElapsed = timeElapsed / (1000 * 60 * 60);

    // Simulate growing metrics over time
    const growthFactor = Math.min(hoursElapsed / 24, 1); // Max out at 24 hours

    return {
      totalVisitors: Math.floor((Math.random() * 200 + 300) * (1 + growthFactor)),
      conversions: Math.floor((Math.random() * 50 + 30) * (1 + growthFactor)),
      revenue: Math.floor((Math.random() * 2000 + 1500) * (1 + growthFactor)),
      conversionRate: ((Math.random() * 5 + 8) * (1 + growthFactor * 0.5)).toFixed(1),
      pageViews: Math.floor((Math.random() * 500 + 800) * (1 + growthFactor)),
      bannerClicks: Math.floor((Math.random() * 100 + 150) * (1 + growthFactor)),
      popupShows: Math.floor((Math.random() * 80 + 100) * (1 + growthFactor)),
      downloadStarts: Math.floor((Math.random() * 60 + 80) * (1 + growthFactor)),
      timestamp: Date.now(),
    };
  }

  checkAllMilestones(metrics) {
    // Check revenue milestones
    this.milestones.revenue.forEach(milestone => {
      if (metrics.revenue >= milestone && !this.reachedMilestones.revenue.has(milestone)) {
        this.reachedMilestones.revenue.add(milestone);
        this.sendMilestoneAlert('revenue', milestone, metrics.revenue);
      }
    });

    // Check conversion milestones
    this.milestones.conversions.forEach(milestone => {
      if (metrics.conversions >= milestone && !this.reachedMilestones.conversions.has(milestone)) {
        this.reachedMilestones.conversions.add(milestone);
        this.sendMilestoneAlert('conversions', milestone, metrics.conversions);
      }
    });

    // Check visitor milestones
    this.milestones.visitors.forEach(milestone => {
      if (metrics.totalVisitors >= milestone && !this.reachedMilestones.visitors.has(milestone)) {
        this.reachedMilestones.visitors.add(milestone);
        this.sendMilestoneAlert('visitors', milestone, metrics.totalVisitors);
      }
    });

    // Check conversion rate milestones
    const conversionRate = parseFloat(metrics.conversionRate);
    this.milestones.conversionRate.forEach(milestone => {
      if (conversionRate >= milestone && !this.reachedMilestones.conversionRate.has(milestone)) {
        this.reachedMilestones.conversionRate.add(milestone);
        this.sendMilestoneAlert('conversion rate', milestone, conversionRate);
      }
    });
  }

  async sendMilestoneAlert(type, milestone, currentValue) {
    const emoji =
      {
        revenue: '💰',
        conversions: '🎯',
        visitors: '👥',
        'conversion rate': '📈',
      }[type] || '🎉';

    const unit = type === 'revenue' ? '$' : type === 'conversion rate' ? '%' : '';

    const message = `${emoji} MILESTONE REACHED: ${milestone}${unit} ${type}!`;
    const details = {
      milestone_type: type,
      milestone_value: milestone,
      current_value: currentValue,
      timestamp: new Date().toISOString(),
      celebration: true,
    };

    await this.sendAlert(message, 'success', details);
    console.log(`🎉 ${message} (Current: ${currentValue})`);
  }

  checkEmergencyConditions(metrics) {
    const conversionRate = parseFloat(metrics.conversionRate);

    // Low conversion rate warning
    if (conversionRate < 3 && metrics.totalVisitors > 100) {
      this.sendEmergencyAlert('Low Conversion Rate', {
        rate: conversionRate,
        visitors: metrics.totalVisitors,
        suggestion: 'Consider adjusting pricing or messaging',
      });
    }

    // High traffic, low conversions
    if (metrics.totalVisitors > 500 && metrics.conversions < 20) {
      this.sendEmergencyAlert('High Traffic, Low Conversions', {
        visitors: metrics.totalVisitors,
        conversions: metrics.conversions,
        suggestion: 'Check for technical issues or optimize funnel',
      });
    }

    // Revenue plateau warning
    if (this.detectRevenuePlateau(metrics.revenue)) {
      this.sendEmergencyAlert('Revenue Plateau Detected', {
        current_revenue: metrics.revenue,
        suggestion: 'Consider increasing marketing spend or extending sale',
      });
    }

    // Flash sale ending soon
    this.checkTimeBasedAlerts();
  }

  detectRevenuePlateau(_currentRevenue) {
    // Simple plateau detection - more sophisticated logic could be added
    const recentRevenues = this.alertHistory
      .filter(alert => alert.details && alert.details.revenue)
      .slice(-5)
      .map(alert => alert.details.revenue);

    if (recentRevenues.length >= 3) {
      const variance = this.calculateVariance(recentRevenues);
      return variance < 100; // Less than $100 variance indicates plateau
    }

    return false;
  }

  calculateVariance(numbers) {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
  }

  checkTimeBasedAlerts() {
    const saleStartTime = Date.now() - 1000 * 60 * 60 * 2; // Started 2 hours ago for demo
    const saleEndTime = saleStartTime + 24 * 60 * 60 * 1000; // 24 hour sale
    const timeLeft = saleEndTime - Date.now();

    // Alert at 6, 3, 1 hour remaining
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));

    if (hoursLeft === 6 || hoursLeft === 3 || hoursLeft === 1) {
      this.sendTimeAlert(hoursLeft);
    }

    // Alert at 30, 15, 5 minutes remaining
    const minutesLeft = Math.floor(timeLeft / (1000 * 60));

    if (minutesLeft === 30 || minutesLeft === 15 || minutesLeft === 5) {
      this.sendTimeAlert(`${minutesLeft} minutes`);
    }
  }

  async sendTimeAlert(timeLeft) {
    const message = `⏰ Flash Sale Alert: ${timeLeft} remaining!`;
    const details = {
      time_left: timeLeft,
      urgency: 'high',
      action_suggested: 'Increase marketing push',
      timestamp: new Date().toISOString(),
    };

    await this.sendAlert(message, 'warning', details);
  }

  async sendEmergencyAlert(title, details) {
    const message = `🚨 URGENT: ${title}`;
    await this.sendAlert(message, 'error', {
      ...details,
      emergency: true,
      timestamp: new Date().toISOString(),
    });
  }

  setupEmergencyAlerts() {
    // Set up alerts for critical system events
    window.addEventListener('error', event => {
      this.sendAlert('🐛 JavaScript Error Detected', 'error', {
        error: event.error.message,
        filename: event.filename,
        line: event.lineno,
        timestamp: new Date().toISOString(),
      });
    });

    // Monitor page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('📱 User switched away from page');
      } else {
        console.log('👀 User returned to page');
      }
    });

    // Monitor performance issues
    if (window.performance && window.performance.timing) {
      const checkPerformance = () => {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;

        if (loadTime > 5000) {
          // Page took more than 5 seconds to load
          this.sendAlert('🐌 Slow Page Load Detected', 'warning', {
            load_time: loadTime,
            suggestion: 'Check server performance',
            timestamp: new Date().toISOString(),
          });
        }
      };

      window.addEventListener('load', checkPerformance);
    }
  }

  async sendAlert(message, level = 'info', details = {}) {
    const alert = {
      id: this.generateAlertId(),
      message,
      level,
      details,
      timestamp: new Date().toISOString(),
      flash_sale: true,
    };

    // Store in history
    this.alertHistory.push(alert);

    // Keep only last 100 alerts
    if (this.alertHistory.length > 100) {
      this.alertHistory = this.alertHistory.slice(-100);
    }

    // Log to console
    const emoji =
      {
        success: '✅',
        warning: '⚠️',
        error: '❌',
        info: 'ℹ️',
      }[level] || 'ℹ️';

    console.log(`${emoji} ALERT: ${message}`, details);

    // Send to server
    try {
      await fetch(this.alertEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });
    } catch (error) {
      console.warn('Failed to send alert to server:', error);
    }

    // Send to webhook (Slack/Discord) if configured
    if (this.webhookUrl) {
      await this.sendWebhookAlert(alert);
    }

    // Show in-browser notification if supported and urgent
    if (level === 'error' || (level === 'success' && details.celebration)) {
      this.showBrowserNotification(message, level);
    }

    return alert;
  }

  async sendWebhookAlert(alert) {
    if (!this.webhookUrl) return;

    const color =
      {
        success: '#00ff88',
        warning: '#ff6b35',
        error: '#ff4444',
        info: '#4444ff',
      }[alert.level] || '#4444ff';

    const webhookPayload = {
      embeds: [
        {
          title: '🔥 Flash Sale Alert',
          description: alert.message,
          color: parseInt(color.slice(1), 16),
          fields: Object.entries(alert.details).map(([key, value]) => ({
            name: key.replace(/_/g, ' ').toUpperCase(),
            value: String(value),
            inline: true,
          })),
          timestamp: alert.timestamp,
          footer: {
            text: 'RinaWarp Flash Sale Monitor',
          },
        },
      ],
    };

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });
    } catch (error) {
      console.warn('Failed to send webhook alert:', error);
    }
  }

  showBrowserNotification(message, level) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification('RinaWarp Flash Sale', {
        body: message,
        icon: level === 'success' ? '🎉' : level === 'error' ? '🚨' : 'ℹ️',
        tag: 'flash-sale-alert',
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('RinaWarp Flash Sale', {
            body: message,
            icon: level === 'success' ? '🎉' : level === 'error' ? '🚨' : 'ℹ️',
            tag: 'flash-sale-alert',
          });
        }
      });
    }
  }

  generateAlertId() {
    return 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  logStatus(metrics) {
    const summary = {
      visitors: metrics.totalVisitors,
      conversions: metrics.conversions,
      revenue: `$${metrics.revenue}`,
      conversion_rate: `${metrics.conversionRate}%`,
      milestones_reached: {
        revenue: this.reachedMilestones.revenue.size,
        conversions: this.reachedMilestones.conversions.size,
        visitors: this.reachedMilestones.visitors.size,
        conversion_rate: this.reachedMilestones.conversionRate.size,
      },
      total_alerts: this.alertHistory.length,
      last_check: new Date().toLocaleTimeString(),
    };

    console.log('📊 Flash Sale Status:', summary);
  }

  // Public methods for configuration
  setWebhook(url) {
    this.webhookUrl = url;
    console.log('🔗 Webhook URL configured for alerts');
  }

  addCustomMilestone(type, value) {
    if (this.milestones[type]) {
      this.milestones[type].push(value);
      this.milestones[type].sort((a, b) => a - b);
      console.log(`📈 Added ${type} milestone: ${value}`);
    }
  }

  getAlertHistory() {
    return [...this.alertHistory];
  }

  getReachedMilestones() {
    return {
      revenue: Array.from(this.reachedMilestones.revenue),
      conversions: Array.from(this.reachedMilestones.conversions),
      visitors: Array.from(this.reachedMilestones.visitors),
      conversionRate: Array.from(this.reachedMilestones.conversionRate),
    };
  }
}

// Initialize the alert system
window.flashSaleAlerts = new FlashSaleAlerts();

// Global configuration functions
window.configureFlashSaleAlerts = config => {
  if (config.webhookUrl) {
    window.flashSaleAlerts.setWebhook(config.webhookUrl);
  }

  if (config.customMilestones) {
    Object.entries(config.customMilestones).forEach(([type, values]) => {
      values.forEach(value => {
        window.flashSaleAlerts.addCustomMilestone(type, value);
      });
    });
  }
};

// Export alert system for manual triggering
window.triggerFlashSaleAlert = (message, level = 'info', details = {}) => {
  return window.flashSaleAlerts.sendAlert(message, level, details);
};

console.log('🚨 Flash Sale Alert System loaded and ready!');
console.log('Use configureFlashSaleAlerts() to customize settings');
console.log('Use triggerFlashSaleAlert() to manually send alerts');
