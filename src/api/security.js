/**
 * RinaWarp Terminal - Security Dashboard API
 * API routes for monitoring and managing the threat detection system
 */

import logger from '../utilities/logger.js';
import express from 'express';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for security endpoints
const securityApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many security API requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
});

// Apply rate limiting to all security routes
router.use(securityApiLimiter);

// Security dashboard stats endpoint
router.get('/stats', (req, res) => {
  try {
    const threatDetector = req.app.get('threatDetector');

    if (!threatDetector) {
      return res.status(500).json({
        error: 'Threat detection system not initialized',
      });
    }

    const stats = threatDetector.getStats();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        ...stats,
        systemInfo: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version,
        },
      },
    });
  } catch (error) {
    logger.error('Error getting security stats:', error);
    res.status(500).json({
      error: 'Failed to retrieve security statistics',
      details: error.message,
    });
  }
});

// Get blocked IPs list
router.get('/blocked-ips', (req, res) => {
  try {
    const threatDetector = req.app.get('threatDetector');

    if (!threatDetector) {
      return res.status(500).json({
        error: 'Threat detection system not initialized',
      });
    }

    const now = Date.now();
    const blockedIPs = [];

    for (const [ip, blockInfo] of threatDetector.blockedIPs.entries()) {
      if (blockInfo.expiresAt > now) {
        blockedIPs.push({
          ip,
          reason: blockInfo.reason,
          blockedAt: new Date(blockInfo.blockedAt).toISOString(),
          expiresAt: new Date(blockInfo.expiresAt).toISOString(),
          attempts: blockInfo.attempts,
          remainingTime: blockInfo.expiresAt - now,
        });
      }
    }

    // Sort by most recently blocked
    blockedIPs.sort((a, b) => new Date(b.blockedAt) - new Date(a.blockedAt));

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalBlocked: blockedIPs.length,
      blockedIPs,
    });
  } catch (error) {
    logger.error('Error getting blocked IPs:', error);
    res.status(500).json({
      error: 'Failed to retrieve blocked IPs',
      details: error.message,
    });
  }
});

// Get recent suspicious activity
router.get('/suspicious-activity', (req, res) => {
  try {
    const threatDetector = req.app.get('threatDetector');

    if (!threatDetector) {
      return res.status(500).json({
        error: 'Threat detection system not initialized',
      });
    }

    const limit = parseInt(req.query.limit) || 50;
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const suspiciousActivity = [];

    for (const [ip, activity] of threatDetector.suspiciousActivity.entries()) {
      const recentAttempts = activity.attempts.filter(a => a.timestamp > oneHourAgo);

      if (recentAttempts.length > 0) {
        suspiciousActivity.push({
          ip,
          totalAttempts: activity.attempts.length,
          recentAttempts: recentAttempts.length,
          firstSeen: new Date(activity.firstSeen).toISOString(),
          lastSeen: new Date(activity.lastSeen).toISOString(),
          recentUrls: [...new Set(recentAttempts.map(a => a.url))].slice(0, 5),
          userAgents: [...new Set(recentAttempts.map(a => a.userAgent))].slice(0, 3),
        });
      }
    }

    // Sort by most recent activity
    suspiciousActivity.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalSuspicious: suspiciousActivity.length,
      suspiciousActivity: suspiciousActivity.slice(0, limit),
    });
  } catch (error) {
    logger.error('Error getting suspicious activity:', error);
    res.status(500).json({
      error: 'Failed to retrieve suspicious activity',
      details: error.message,
    });
  }
});

// Manually block an IP
router.post('/block-ip', (req, res) => {
  try {
    const { ip, reason, duration } = req.body;

    if (!ip || !reason) {
      return res.status(400).json({
        error: 'IP address and reason are required',
      });
    }

    const threatDetector = req.app.get('threatDetector');

    if (!threatDetector) {
      return res.status(500).json({
        error: 'Threat detection system not initialized',
      });
    }

    // Validate IP format (basic validation)
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({
        error: 'Invalid IP address format',
      });
    }

    const blockDuration = duration || threatDetector.config.blockDuration.moderate;
    threatDetector.manualBlock(ip, reason, blockDuration);

    res.json({
      success: true,
      message: `IP ${ip} has been blocked`,
      ip,
      reason,
      duration: blockDuration,
      expiresAt: new Date(Date.now() + blockDuration).toISOString(),
    });
  } catch (error) {
    logger.error('Error blocking IP:', error);
    res.status(500).json({
      error: 'Failed to block IP',
      details: error.message,
    });
  }
});

// Unblock an IP
router.post('/unblock-ip', (req, res) => {
  try {
    const { ip } = req.body;

    if (!ip) {
      return res.status(400).json({
        error: 'IP address is required',
      });
    }

    const threatDetector = req.app.get('threatDetector');

    if (!threatDetector) {
      return res.status(500).json({
        error: 'Threat detection system not initialized',
      });
    }

    const success = threatDetector.unblockIP(ip);

    if (success) {
      res.json({
        success: true,
        message: `IP ${ip} has been unblocked`,
        ip,
      });
    } else {
      res.status(404).json({
        error: 'IP not found in blocklist',
        ip,
      });
    }
  } catch (error) {
    logger.error('Error unblocking IP:', error);
    res.status(500).json({
      error: 'Failed to unblock IP',
      details: error.message,
    });
  }
});

// Add webhook for alerts
router.post('/webhooks', (req, res) => {
  try {
    const { url, type } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'Webhook URL is required',
      });
    }

    const threatDetector = req.app.get('threatDetector');

    if (!threatDetector) {
      return res.status(500).json({
        error: 'Threat detection system not initialized',
      });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        error: 'Invalid webhook URL format',
      });
    }

    threatDetector.addWebhook(url, type || 'discord');

    res.json({
      success: true,
      message: 'Webhook added successfully',
      webhook: { url, type: type || 'discord' },
    });
  } catch (error) {
    logger.error('Error adding webhook:', error);
    res.status(500).json({
      error: 'Failed to add webhook',
      details: error.message,
    });
  }
});

// Get threat patterns configuration
router.get('/patterns', (req, res) => {
  try {
    const threatDetector = req.app.get('threatDetector');

    if (!threatDetector) {
      return res.status(500).json({
        error: 'Threat detection system not initialized',
      });
    }

    res.json({
      success: true,
      patterns: {
        suspiciousPatterns: threatDetector.config.suspiciousPatterns.map(p => p.source),
        suspiciousUserAgents: threatDetector.config.suspiciousUserAgents.map(p => p.source),
        rateLimits: {
          maxRequestsPerMinute: threatDetector.config.maxRequestsPerMinute,
          maxRequestsPerHour: threatDetector.config.maxRequestsPerHour,
          maxSuspiciousRequestsPerMinute: threatDetector.config.maxSuspiciousRequestsPerMinute,
        },
        blockDurations: threatDetector.config.blockDuration,
      },
    });
  } catch (error) {
    logger.error('Error getting patterns:', error);
    res.status(500).json({
      error: 'Failed to retrieve threat patterns',
      details: error.message,
    });
  }
});

// Test endpoint to trigger a test alert
router.post('/test-alert', (req, res) => {
  try {
    const threatDetector = req.app.get('threatDetector');

    if (!threatDetector) {
      return res.status(500).json({
        error: 'Threat detection system not initialized',
      });
    }

    // Send a test alert
    const testAlert = {
      ip: '127.0.0.1',
      threatInfo: {
        url: '/test-alert',
        method: 'POST',
        userAgent: 'Test User Agent',
        threatLevel: 2,
        timestamp: Date.now(),
      },
      blockDuration: 0, // No actual block for test
      blockReason: 'Test alert (no actual block)',
      activity: {
        totalAttempts: 1,
        firstSeen: new Date(),
        recentUrls: ['/test-alert'],
      },
    };

    threatDetector.sendThreatAlert(testAlert);

    res.json({
      success: true,
      message: 'Test alert sent',
      alert: testAlert,
    });
  } catch (error) {
    logger.error('Error sending test alert:', error);
    res.status(500).json({
      error: 'Failed to send test alert',
      details: error.message,
    });
  }
});

// Get system health status
router.get('/health', (req, res) => {
  try {
    const threatDetector = req.app.get('threatDetector');

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      threatDetection: {
        enabled: !!threatDetector,
        activeBlocks: threatDetector ? threatDetector.blockedIPs.size : 0,
        trackedIPs: threatDetector ? threatDetector.suspiciousActivity.size : 0,
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
      },
    };

    res.json(healthStatus);
  } catch (error) {
    logger.error('Error getting security health:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Failed to retrieve health status',
      details: error.message,
    });
  }
});

export default router;
