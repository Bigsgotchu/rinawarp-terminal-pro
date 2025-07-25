/**
 * RinaWarp Terminal - Advanced Threat Detection System
 * Automated response system with pattern matching, persistent blocking, and alerting
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ThreatDetector {
  constructor() {
    this.blockedIPs = new Map(); // IP -> { reason, blockedAt, expiresAt, attempts }
    this.suspiciousActivity = new Map(); // IP -> { attempts: [], firstSeen, lastSeen }
    this.blocklistFile = path.join(__dirname, '../../data/blocklist.json');
    this.alertWebhooks = [];

    // Configuration
    this.config = {
      // Rate limiting thresholds
      maxRequestsPerMinute: 60,
      maxRequestsPerHour: 300,
      maxSuspiciousRequestsPerMinute: 5,

      // Pattern detection
      suspiciousPatterns: [
        // WordPress scanners
        /\/wp-admin/i,
        /\/wp-content/i,
        /\/wp-includes/i,
        /\/wordpress/i,
        /\/wp-login\.php/i,
        /\/xmlrpc\.php/i,

        // Common attack patterns
        /\/phpmyadmin/i,
        /\/admin/i,
        /\/administrator/i,
        /\.php$/i,
        /\.env$/i,
        /\.git/i,
        /\/config/i,
        /\/backup/i,
        /\/database/i,
        /\/sql/i,

        // Directory traversal
        /\.\.\//,
        /\.\.%2f/i,
        /%2e%2e/i,

        // SQL injection patterns
        /union.*select/i,
        /select.*from/i,
        /drop.*table/i,
        /insert.*into/i,

        // XSS patterns
        /<script/i,
        /javascript:/i,
        /onerror=/i,
        /onload=/i,
      ],

      suspiciousUserAgents: [
        /scanner/i,
        /crawler/i,
        /bot/i,
        /spider/i,
        /scraper/i,
        /curl/i,
        /wget/i,
        /python-requests/i,
        /go-http-client/i,
        /masscan/i,
        /nmap/i,
        /nikto/i,
        /sqlmap/i,
        /burp/i,
        /nuclei/i,
      ],

      // Block durations (in milliseconds)
      blockDuration: {
        light: 15 * 60 * 1000, // 15 minutes
        moderate: 60 * 60 * 1000, // 1 hour
        severe: 24 * 60 * 60 * 1000, // 24 hours
        permanent: 365 * 24 * 60 * 60 * 1000, // 1 year
      },

      // Auto-cleanup interval
      cleanupInterval: 60 * 60 * 1000, // 1 hour
    };

    this.loadBlocklist();
    this.startCleanupTimer();

    console.log('🛡️ Advanced Threat Detection System initialized');
  }

  /**
   * Main threat detection middleware
   */
  createMiddleware() {
    return (req, res, next) => {
      const clientIP = this.getClientIP(req);
      const userAgent = req.get('User-Agent') || '';
      const url = req.url;
      const method = req.method;

      // Check if IP is already blocked
      if (this.isBlocked(clientIP)) {
        const blockInfo = this.blockedIPs.get(clientIP);
        console.log(`🚫 Blocked request from ${clientIP}: ${method} ${url} (${blockInfo.reason})`);

        return res.status(403).json({
          error: 'Access denied',
          message: 'Your IP has been temporarily blocked due to suspicious activity',
          blocked_until: new Date(blockInfo.expiresAt).toISOString(),
        });
      }

      // Track request for rate limiting
      this.trackRequest(clientIP, {
        url,
        method,
        userAgent,
        timestamp: Date.now(),
      });

      // Analyze request for threats
      const threatLevel = this.analyzeRequest(clientIP, url, userAgent, method);

      if (threatLevel > 0) {
        this.handleThreat(clientIP, {
          url,
          method,
          userAgent,
          threatLevel,
          timestamp: Date.now(),
        });

        if (threatLevel >= 3) {
          // High threat - block immediately
          return res.status(403).json({
            error: 'Access denied',
            message: 'Request blocked due to suspicious activity',
          });
        }
      }

      next();
    };
  }

  /**
   * Extract real client IP considering proxies
   */
  getClientIP(req) {
    return (
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.connection?.socket?.remoteAddress ||
      '0.0.0.0'
    );
  }

  /**
   * Check if IP is currently blocked
   */
  isBlocked(ip) {
    const blockInfo = this.blockedIPs.get(ip);
    if (!blockInfo) return false;

    if (Date.now() > blockInfo.expiresAt) {
      this.blockedIPs.delete(ip);
      this.saveBlocklist();
      return false;
    }

    return true;
  }

  /**
   * Track request for rate limiting analysis
   */
  trackRequest(ip, requestInfo) {
    if (!this.suspiciousActivity.has(ip)) {
      this.suspiciousActivity.set(ip, {
        attempts: [],
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      });
    }

    const activity = this.suspiciousActivity.get(ip);
    activity.attempts.push(requestInfo);
    activity.lastSeen = Date.now();

    // Keep only recent attempts (last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    activity.attempts = activity.attempts.filter(attempt => attempt.timestamp > oneHourAgo);
  }

  /**
   * Analyze request for threat patterns
   */
  analyzeRequest(ip, url, userAgent, _method) {
    let threatScore = 0;
    const reasons = [];

    // Check URL patterns
    for (const pattern of this.config.suspiciousPatterns) {
      if (pattern.test(url)) {
        threatScore += 2;
        reasons.push(`Suspicious URL pattern: ${pattern.source}`);
        break;
      }
    }

    // Check User-Agent patterns
    for (const pattern of this.config.suspiciousUserAgents) {
      if (pattern.test(userAgent)) {
        threatScore += 1;
        reasons.push(`Suspicious User-Agent: ${pattern.source}`);
        break;
      }
    }

    // Check for empty or suspicious User-Agent
    if (!userAgent || userAgent.length < 10) {
      threatScore += 1;
      reasons.push('Missing or suspicious User-Agent');
    }

    // Rate limiting analysis
    const activity = this.suspiciousActivity.get(ip);
    if (activity) {
      const now = Date.now();
      const oneMinuteAgo = now - 60 * 1000;
      const oneHourAgo = now - 60 * 60 * 1000;

      const requestsLastMinute = activity.attempts.filter(a => a.timestamp > oneMinuteAgo).length;
      const requestsLastHour = activity.attempts.filter(a => a.timestamp > oneHourAgo).length;
      const suspiciousRequestsLastMinute = activity.attempts.filter(
        a => a.timestamp > oneMinuteAgo && this.isSuspiciousRequest(a.url, a.userAgent)
      ).length;

      if (requestsLastMinute > this.config.maxRequestsPerMinute) {
        threatScore += 2;
        reasons.push(`Rate limiting: ${requestsLastMinute} requests in last minute`);
      }

      if (requestsLastHour > this.config.maxRequestsPerHour) {
        threatScore += 1;
        reasons.push(`Rate limiting: ${requestsLastHour} requests in last hour`);
      }

      if (suspiciousRequestsLastMinute > this.config.maxSuspiciousRequestsPerMinute) {
        threatScore += 3;
        reasons.push(
          `Multiple suspicious requests: ${suspiciousRequestsLastMinute} in last minute`
        );
      }
    }

    if (threatScore > 0) {
      console.log(
        `⚠️ Threat detected for ${ip}: Score ${threatScore}, Reasons: ${reasons.join(', ')}`
      );
    }

    return threatScore;
  }

  /**
   * Check if individual request is suspicious
   */
  isSuspiciousRequest(url, userAgent) {
    return (
      this.config.suspiciousPatterns.some(pattern => pattern.test(url)) ||
      this.config.suspiciousUserAgents.some(pattern => pattern.test(userAgent))
    );
  }

  /**
   * Handle detected threats
   */
  async handleThreat(ip, threatInfo) {
    const activity = this.suspiciousActivity.get(ip);
    const threatLevel = threatInfo.threatLevel;

    let blockDuration;
    let blockReason;

    // Determine block duration based on threat level and history
    if (threatLevel >= 5) {
      blockDuration = this.config.blockDuration.severe;
      blockReason = 'Severe threat detected';
    } else if (threatLevel >= 3) {
      blockDuration = this.config.blockDuration.moderate;
      blockReason = 'Moderate threat detected';
    } else if (threatLevel >= 2) {
      blockDuration = this.config.blockDuration.light;
      blockReason = 'Light threat detected';
    } else {
      // Just log, don't block yet
      console.log(`📝 Suspicious activity logged for ${ip}: ${JSON.stringify(threatInfo)}`);
      return;
    }

    // Check if this IP has been blocked before (escalate)
    const existingBlock = this.blockedIPs.get(ip);
    if (existingBlock) {
      blockDuration = Math.min(blockDuration * 2, this.config.blockDuration.permanent);
      blockReason += ' (repeat offender)';
    }

    // Block the IP
    this.blockIP(ip, blockReason, blockDuration);

    // Send alert
    await this.sendThreatAlert({
      ip,
      threatInfo,
      blockDuration,
      blockReason,
      activity: activity
        ? {
            totalAttempts: activity.attempts.length,
            firstSeen: new Date(activity.firstSeen),
            recentUrls: activity.attempts.slice(-5).map(a => a.url),
          }
        : null,
    });
  }

  /**
   * Block an IP address
   */
  blockIP(ip, reason, duration = this.config.blockDuration.moderate) {
    const expiresAt = Date.now() + duration;
    const blockInfo = {
      reason,
      blockedAt: Date.now(),
      expiresAt,
      attempts: this.blockedIPs.has(ip) ? this.blockedIPs.get(ip).attempts + 1 : 1,
    };

    this.blockedIPs.set(ip, blockInfo);
    this.saveBlocklist();

    const durationHours = Math.round(duration / (60 * 60 * 1000));
    console.log(`🔒 Blocked IP ${ip} for ${durationHours}h: ${reason}`);
  }

  /**
   * Send threat alert to configured webhooks
   */
  async sendThreatAlert(alertData) {
    const alert = {
      timestamp: new Date().toISOString(),
      service: 'RinaWarp Terminal Security',
      severity: this.getSeverityLevel(alertData.threatInfo.threatLevel),
      title: `🚨 Threat Detected: ${alertData.ip}`,
      description: `IP ${alertData.ip} has been automatically blocked`,
      fields: [
        { name: 'IP Address', value: alertData.ip, inline: true },
        { name: 'Threat Level', value: alertData.threatInfo.threatLevel.toString(), inline: true },
        {
          name: 'Block Duration',
          value: this.formatDuration(alertData.blockDuration),
          inline: true,
        },
        { name: 'Reason', value: alertData.blockReason, inline: false },
        { name: 'URL', value: alertData.threatInfo.url, inline: true },
        {
          name: 'User-Agent',
          value: alertData.threatInfo.userAgent.substring(0, 100),
          inline: false,
        },
      ],
      color: this.getSeverityColor(alertData.threatInfo.threatLevel),
    };

    // Log alert
    console.log(`🚨 SECURITY ALERT: ${JSON.stringify(alert, null, 2)}`);

    // Send to webhooks (Discord, Slack, etc.)
    for (const webhook of this.alertWebhooks) {
      try {
        await this.sendWebhookAlert(webhook, alert);
      } catch (error) {
        console.error(`❌ Failed to send alert to webhook: ${error.message}`);
      }
    }
  }

  /**
   * Send alert to webhook (Discord/Slack format)
   */
  async sendWebhookAlert(webhook, alert) {
    const payload = {
      embeds: [
        {
          title: alert.title,
          description: alert.description,
          color: alert.color,
          fields: alert.fields,
          timestamp: alert.timestamp,
          footer: {
            text: alert.service,
            icon_url: 'https://rinawarptech.com/favicon.ico',
          },
        },
      ],
    };

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status}`);
    }
  }

  /**
   * Add webhook for alerts
   */
  addWebhook(url, type = 'discord') {
    this.alertWebhooks.push({ url, type });
    console.log(`📡 Added ${type} webhook for security alerts`);
  }

  /**
   * Get severity level string
   */
  getSeverityLevel(threatLevel) {
    if (threatLevel >= 5) return 'CRITICAL';
    if (threatLevel >= 3) return 'HIGH';
    if (threatLevel >= 2) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get color for severity level
   */
  getSeverityColor(threatLevel) {
    if (threatLevel >= 5) return 0xff0000; // Red
    if (threatLevel >= 3) return 0xff6600; // Orange
    if (threatLevel >= 2) return 0xffff00; // Yellow
    return 0x00ff00; // Green
  }

  /**
   * Format duration in human readable format
   */
  formatDuration(ms) {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  }

  /**
   * Load blocklist from persistent storage
   */
  loadBlocklist() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.blocklistFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.blocklistFile)) {
        const data = JSON.parse(fs.readFileSync(this.blocklistFile, 'utf8'));

        // Convert back to Map and filter expired entries
        const now = Date.now();
        for (const [ip, blockInfo] of Object.entries(data)) {
          if (blockInfo.expiresAt > now) {
            this.blockedIPs.set(ip, blockInfo);
          }
        }

        console.log(`📋 Loaded ${this.blockedIPs.size} active blocked IPs from persistent storage`);
      }
    } catch (error) {
      console.error(`❌ Error loading blocklist: ${error.message}`);
    }
  }

  /**
   * Save blocklist to persistent storage
   */
  saveBlocklist() {
    try {
      const data = Object.fromEntries(this.blockedIPs);
      fs.writeFileSync(this.blocklistFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`❌ Error saving blocklist: ${error.message}`);
    }
  }

  /**
   * Start cleanup timer to remove expired blocks
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanupExpiredBlocks();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up expired blocks and old suspicious activity
   */
  cleanupExpiredBlocks() {
    const now = Date.now();
    let removedBlocks = 0;
    let removedActivity = 0;

    // Clean expired blocks
    for (const [ip, blockInfo] of this.blockedIPs.entries()) {
      if (now > blockInfo.expiresAt) {
        this.blockedIPs.delete(ip);
        removedBlocks++;
      }
    }

    // Clean old suspicious activity (older than 24 hours)
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    for (const [ip, activity] of this.suspiciousActivity.entries()) {
      if (activity.lastSeen < oneDayAgo) {
        this.suspiciousActivity.delete(ip);
        removedActivity++;
      }
    }

    if (removedBlocks > 0 || removedActivity > 0) {
      console.log(
        `🧹 Cleanup: Removed ${removedBlocks} expired blocks, ${removedActivity} old activity records`
      );
      if (removedBlocks > 0) {
        this.saveBlocklist();
      }
    }
  }

  /**
   * Get current statistics
   */
  getStats() {
    const now = Date.now();
    const activeBlocks = Array.from(this.blockedIPs.values()).filter(b => b.expiresAt > now);

    return {
      activeBlocks: activeBlocks.length,
      totalBlocks: this.blockedIPs.size,
      trackedIPs: this.suspiciousActivity.size,
      topBlockReasons: this.getTopBlockReasons(activeBlocks),
      recentActivity: this.getRecentActivity(),
    };
  }

  /**
   * Get top block reasons
   */
  getTopBlockReasons(activeBlocks) {
    const reasons = {};
    for (const block of activeBlocks) {
      reasons[block.reason] = (reasons[block.reason] || 0) + 1;
    }

    return Object.entries(reasons)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));
  }

  /**
   * Get recent activity summary
   */
  getRecentActivity() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentAttempts = [];

    for (const [ip, activity] of this.suspiciousActivity.entries()) {
      const recent = activity.attempts.filter(a => a.timestamp > oneHourAgo);
      if (recent.length > 0) {
        recentAttempts.push({
          ip,
          attempts: recent.length,
          lastSeen: Math.max(...recent.map(a => a.timestamp)),
        });
      }
    }

    return recentAttempts.sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 10);
  }

  /**
   * Manually block an IP
   */
  manualBlock(ip, reason, duration = this.config.blockDuration.moderate) {
    this.blockIP(ip, `Manual block: ${reason}`, duration);
    console.log(`👮 Manually blocked IP ${ip}: ${reason}`);
  }

  /**
   * Unblock an IP
   */
  unblockIP(ip) {
    if (this.blockedIPs.has(ip)) {
      this.blockedIPs.delete(ip);
      this.saveBlocklist();
      console.log(`🔓 Unblocked IP ${ip}`);
      return true;
    }
    return false;
  }

  /**
   * Add IP to whitelist (trusted IPs that bypass all checks)
   */
  whitelist = new Set([
    '127.0.0.1',
    '::1',
    // Add trusted IPs here
  ]);

  isWhitelisted(ip) {
    return this.whitelist.has(ip);
  }
}

export default ThreatDetector;
