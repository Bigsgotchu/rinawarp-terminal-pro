/**
 * RinaWarp Terminal - Advanced Rate Limiting System
 * Intelligent protection against abuse with different security tiers
 */

import UserManager from '../database/users.js';

// Rate limit storage (In production, use Redis for distributed systems)
const rateLimitStore = new Map();
const blockedIPs = new Set();
const suspiciousIPs = new Map();

// Rate limit configurations
const RATE_LIMITS = {
  // General API endpoints
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests, please try again later',
  },

  // Authentication endpoints (stricter)
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts',
  },

  // Public endpoints (more lenient)
  PUBLIC: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    message: 'Rate limit exceeded',
  },

  // Critical operations (very strict)
  CRITICAL: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    message: 'Critical operation rate limit exceeded',
  },

  // Analytics/tracking (moderate)
  ANALYTICS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'Analytics rate limit exceeded',
  },
};

// Get client identifier (IP + User-Agent fingerprint)
function getClientId(req) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const userAgent = req.get('user-agent') || 'unknown';
  return `${ip}:${Buffer.from(userAgent).toString('base64').slice(0, 20)}`;
}

// Clean up old entries from rate limit store
function cleanupRateLimit() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore) {
    if (now - data.resetTime > data.windowMs) {
      rateLimitStore.delete(key);
    }
  }

  // Clean up suspicious IPs older than 24 hours
  for (const [ip, timestamp] of suspiciousIPs) {
    if (now - timestamp > 24 * 60 * 60 * 1000) {
      suspiciousIPs.delete(ip);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimit, 5 * 60 * 1000);

// Advanced rate limiter with intelligent detection
export function advancedRateLimit(type = 'GENERAL', options = {}) {
  const config = { ...RATE_LIMITS[type], ...options };

  return (req, res, next) => {
    const clientId = getClientId(req);
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    const key = `${type}:${clientId}`;

    // Check if IP is blocked
    if (blockedIPs.has(ip)) {
      UserManager.logAuditEvent(
        req.user?.id || null,
        'BLOCKED_IP_ACCESS',
        'rate_limit',
        { ip, endpoint: req.path, type },
        ip,
        req.get('user-agent')
      );

      return res.status(403).json({
        error: 'Access denied - IP blocked due to suspicious activity',
        code: 'IP_BLOCKED',
        retryAfter: 3600, // 1 hour
      });
    }

    // Get or create rate limit record
    let record = rateLimitStore.get(key);
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + config.windowMs,
        windowMs: config.windowMs,
        firstRequest: now,
      };
    }

    record.count++;
    rateLimitStore.set(key, record);

    // Check if limit exceeded
    if (record.count > config.maxRequests) {
      const remainingTime = Math.ceil((record.resetTime - now) / 1000);

      // Track suspicious activity
      const suspiciousCount = (suspiciousIPs.get(ip) || 0) + 1;
      suspiciousIPs.set(ip, now);

      // Block IP if too many rate limit violations
      if (suspiciousCount > 5 && type === 'AUTH') {
        blockedIPs.add(ip);
        console.log(`🚨 Blocking suspicious IP: ${ip} (${suspiciousCount} violations)`);

        // Unblock after 1 hour
        setTimeout(
          () => {
            blockedIPs.delete(ip);
            console.log(`🔓 Unblocked IP: ${ip}`);
          },
          60 * 60 * 1000
        );
      }

      // Log rate limit violation
      UserManager.logAuditEvent(
        req.user?.id || null,
        'RATE_LIMITED',
        'security',
        {
          type,
          count: record.count,
          limit: config.maxRequests,
          endpoint: req.path,
          suspiciousCount,
        },
        ip,
        req.get('user-agent')
      );

      return res.status(429).json({
        error: config.message,
        code: 'RATE_LIMITED',
        retryAfter: remainingTime,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: record.resetTime,
      });
    }

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': config.maxRequests,
      'X-RateLimit-Remaining': Math.max(0, config.maxRequests - record.count),
      'X-RateLimit-Reset': record.resetTime,
    });

    next();
  };
}

// Specific rate limiters for different endpoint types
export const authRateLimit = () => advancedRateLimit('AUTH');
export const publicRateLimit = () => advancedRateLimit('PUBLIC');
export const criticalRateLimit = () => advancedRateLimit('CRITICAL');
export const analyticsRateLimit = () => advancedRateLimit('ANALYTICS');

// Dynamic rate limiter based on user authentication status
export function dynamicRateLimit(authenticatedConfig = {}, anonymousConfig = {}) {
  return (req, res, next) => {
    const isAuthenticated = !!req.user;
    const baseType = isAuthenticated ? 'GENERAL' : 'PUBLIC';
    const config = isAuthenticated ? authenticatedConfig : anonymousConfig;

    return advancedRateLimit(baseType, config)(req, res, next);
  };
}

// Burst protection for high-frequency operations
export function burstProtection(burstLimit = 10, burstWindow = 1000) {
  return (req, res, next) => {
    const clientId = getClientId(req);
    const now = Date.now();
    const key = `burst:${clientId}`;

    let record = rateLimitStore.get(key);
    if (!record || now - record.firstRequest > burstWindow) {
      record = {
        count: 0,
        firstRequest: now,
      };
    }

    record.count++;
    rateLimitStore.set(key, record);

    if (record.count > burstLimit) {
      const ip = req.ip || 'unknown';
      UserManager.logAuditEvent(
        req.user?.id || null,
        'BURST_LIMIT_EXCEEDED',
        'security',
        {
          burstCount: record.count,
          burstLimit,
          endpoint: req.path,
        },
        ip,
        req.get('user-agent')
      );

      return res.status(429).json({
        error: 'Request burst limit exceeded',
        code: 'BURST_LIMITED',
        retryAfter: Math.ceil((burstWindow - (now - record.firstRequest)) / 1000),
      });
    }

    next();
  };
}

// Whitelist bypass for trusted IPs/API keys
export function whitelistBypass(whitelist = []) {
  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress;
    const hasApiKey = req.headers['x-api-key'] || req.apiKey;

    // Skip rate limiting for whitelisted IPs or API key requests
    if (whitelist.includes(ip) || hasApiKey) {
      return next();
    }

    next();
  };
}

// Rate limit status endpoint
export function getRateLimitStats(req, res) {
  const clientId = getClientId(req);
  const ip = req.ip || 'unknown';
  const now = Date.now();

  const stats = {
    clientId: clientId.split(':')[0], // Don't expose user agent hash
    isBlocked: blockedIPs.has(ip),
    isSuspicious: suspiciousIPs.has(ip),
    limits: {},
  };

  // Get current limits for all types
  Object.keys(RATE_LIMITS).forEach(type => {
    const key = `${type}:${clientId}`;
    const record = rateLimitStore.get(key);

    if (record && now < record.resetTime) {
      stats.limits[type.toLowerCase()] = {
        remaining: Math.max(0, RATE_LIMITS[type].maxRequests - record.count),
        resetTime: record.resetTime,
        limit: RATE_LIMITS[type].maxRequests,
      };
    } else {
      stats.limits[type.toLowerCase()] = {
        remaining: RATE_LIMITS[type].maxRequests,
        resetTime: now + RATE_LIMITS[type].windowMs,
        limit: RATE_LIMITS[type].maxRequests,
      };
    }
  });

  res.json(stats);
}

export default {
  advancedRateLimit,
  authRateLimit,
  publicRateLimit,
  criticalRateLimit,
  analyticsRateLimit,
  dynamicRateLimit,
  burstProtection,
  whitelistBypass,
  getRateLimitStats,
};
