/**
 * RinaWarp Terminal - Authentication Middleware
 * Handles JWT tokens, session validation, and permission checks
 */

import jwt from 'jsonwebtoken';
import UserManager, { ROLES, PERMISSIONS } from '../database/users.js';
import logger from '../utilities/logger.js';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'rinawarp-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// API Key Configuration for service-to-service authentication
const API_KEYS = {
  ADMIN: process.env.ADMIN_API_KEY || 'rw-admin-dev-key-change-in-production',
  LICENSE_SERVICE: process.env.LICENSE_API_KEY || 'rw-license-dev-key-change-in-production',
  ANALYTICS_SERVICE: process.env.ANALYTICS_API_KEY || 'rw-analytics-dev-key-change-in-production',
  WEBHOOK_SERVICE: process.env.WEBHOOK_API_KEY || 'rw-webhook-dev-key-change-in-production',
};

// IP Whitelist for sensitive operations (comma-separated in env)
const ADMIN_IP_WHITELIST = process.env.ADMIN_IP_WHITELIST
  ? process.env.ADMIN_IP_WHITELIST.split(',').map(ip => ip.trim())
  : ['127.0.0.1', '::1', 'localhost'];

// Audit logger for administrative actions
class AuditLogger {
  static log(userId, action, resource, details = null, ipAddress = null, userAgent = null) {
    try {
      UserManager.logAuditEvent(userId, action, resource, details, ipAddress, userAgent);
      console.log(`🔍 AUDIT: ${action} on ${resource} by user ${userId} from ${ipAddress}`);
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  static logAdminAction(req, action, resource, details = null) {
    this.log(req.user?.id || 'system', action, resource, details, req.ip, req.get('user-agent'));
  }
}

export class AuthService {
  // Generate JWT token for user
  static generateToken(user, expiresIn = JWT_EXPIRES_IN) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      permissions: UserManager.getUserPermissions(user.id, user.role),
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn,
      issuer: 'rinawarp-terminal',
      audience: 'rinawarp-users',
    });
  }

  // Generate refresh token
  static generateRefreshToken(userId) {
    return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'rinawarp-terminal',
      audience: 'rinawarp-refresh',
    });
  }

  // Verify and decode JWT token
  static verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'rinawarp-terminal',
        audience: 'rinawarp-users',
      });
      return decoded;
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return null;
    }
  }

  // Verify refresh token
  static verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'rinawarp-terminal',
        audience: 'rinawarp-refresh',
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      console.error('Refresh token verification failed:', error.message);
      return null;
    }
  }

  // Login user and create session
  static async loginUser(email, password, ipAddress, userAgent) {
    try {
      // Authenticate user
      const user = await UserManager.authenticateUser(email, password, ipAddress, userAgent);

      // Create session
      const session = UserManager.createSession(user.id, ipAddress, userAgent);

      // Generate tokens
      const accessToken = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user.id);

      return {
        user,
        session,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: JWT_EXPIRES_IN,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Refresh access token
  static async refreshToken(refreshToken) {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);
      if (!decoded) {
        throw new Error('Invalid refresh token');
      }

      // Get user
      const user = UserManager.getUserById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new access token
      const accessToken = this.generateToken(user);

      return {
        accessToken,
        expiresIn: JWT_EXPIRES_IN,
      };
    } catch (error) {
      throw error;
    }
  }

  // Logout user (revoke session)
  static logoutUser(sessionToken, userId) {
    try {
      if (sessionToken) {
        UserManager.revokeSession(sessionToken);
      }

      // Log audit event
      if (userId) {
        UserManager.logAuditEvent(userId, 'LOGOUT', 'authentication', null, null, null);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}

// Authentication middleware
export function requireAuth(options = {}) {
  const { permissions = [], roles = [], allowApiKey = false } = options;

  return async (req, res, next) => {
    try {
      let token = null;
      const authMethod = 'jwt';

      // Extract token from various sources
      if (req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        } else if (authHeader.startsWith('Token ')) {
          token = authHeader.substring(6);
        }
      } else if (req.query.token) {
        token = req.query.token;
      } else if (req.cookies && req.cookies.auth_token) {
        token = req.cookies.auth_token;
      }

      if (!token) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'NO_TOKEN',
        });
      }

      // Verify token
      const decoded = AuthService.verifyToken(token);
      if (!decoded) {
        return res.status(401).json({
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        });
      }

      // Get fresh user data
      const user = UserManager.getUserById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      // Check role requirements
      if (roles.length > 0 && !roles.includes(user.role)) {
        return res.status(403).json({
          error: 'Insufficient role privileges',
          code: 'INSUFFICIENT_ROLE',
          required: roles,
          current: user.role,
        });
      }

      // Check permission requirements
      if (permissions.length > 0) {
        const userPermissions = UserManager.getUserPermissions(user.id, user.role);
        const hasRequiredPermissions = permissions.every(permission =>
          userPermissions.includes(permission)
        );

        if (!hasRequiredPermissions) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS',
            required: permissions,
            current: userPermissions,
          });
        }
      }

      // Add user data to request
      req.user = {
        ...user,
        permissions: UserManager.getUserPermissions(user.id, user.role),
        authMethod,
      };

      req.authToken = token;

      next();
    } catch (error) {
      console.error('Authentication middleware error:', error);
      res.status(500).json({
        error: 'Authentication service error',
        code: 'AUTH_SERVICE_ERROR',
      });
    }
  };
}

// Optional authentication middleware (allows both authenticated and anonymous access)
export function optionalAuth() {
  return async (req, res, next) => {
    try {
      let token = null;

      // Extract token
      if (req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.substring(7);
      } else if (req.query.token) {
        token = req.query.token;
      } else if (req.cookies?.auth_token) {
        token = req.cookies.auth_token;
      }

      if (token) {
        const decoded = AuthService.verifyToken(token);
        if (decoded) {
          const user = UserManager.getUserById(decoded.userId);
          if (user) {
            req.user = {
              ...user,
              permissions: UserManager.getUserPermissions(user.id, user.role),
              authMethod: 'jwt',
            };
            req.authToken = token;
          }
        }
      }

      next();
    } catch (error) {
      console.error('Optional auth error:', error);
      // Continue without authentication
      next();
    }
  };
}

// Admin authentication middleware (requires admin or super admin role)
export function requireAdmin() {
  return requireAuth({
    roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    permissions: ['admin:dashboard'],
  });
}

// Permission-based middleware
export function requirePermission(...permissions) {
  return requireAuth({ permissions });
}

// Role-based middleware
export function requireRole(...roles) {
  return requireAuth({ roles });
}

// Rate limiting for authentication endpoints
export function authRateLimit() {
  const attempts = new Map(); // In production, use Redis or similar
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    // Clean up old attempts
    const userAttempts = attempts.get(key) || [];
    const recentAttempts = userAttempts.filter(time => now - time < WINDOW_MS);

    if (recentAttempts.length >= MAX_ATTEMPTS) {
      return res.status(429).json({
        error: 'Too many authentication attempts',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil((WINDOW_MS - (now - recentAttempts[0])) / 1000),
      });
    }

    // Track this attempt
    recentAttempts.push(now);
    attempts.set(key, recentAttempts);

    next();
  };
}

// WebSocket authentication helper
export function authenticateWebSocket(token) {
  try {
    if (!token) return null;

    const decoded = AuthService.verifyToken(token);
    if (!decoded) return null;

    const user = UserManager.getUserById(decoded.userId);
    if (!user) return null;

    return {
      ...user,
      permissions: UserManager.getUserPermissions(user.id, user.role),
    };
  } catch (error) {
    console.error('WebSocket auth error:', error);
    return null;
  }
}

// Password strength validation
export function validatePasswordStrength(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Email validation
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Legacy compatibility functions
export function generateToken(user, options = {}) {
  return AuthService.generateToken(user, options.expiresIn);
}

export function verifyToken(token) {
  return AuthService.verifyToken(token);
}

export function authenticateToken(req, res, next) {
  return requireAuth()(req, res, next);
}

// 🔒 ENTERPRISE SECURITY ENHANCEMENTS 🔒

// API Key authentication for service-to-service communication
export function requireApiKey(keyType = null) {
  return (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('ApiKey ', '');

    if (!apiKey) {
      AuditLogger.log(
        'system',
        'API_KEY_MISSING',
        'api_auth',
        { endpoint: req.path },
        req.ip,
        req.get('user-agent')
      );
      return res.status(401).json({
        error: 'API key required',
        code: 'MISSING_API_KEY',
      });
    }

    // Check if API key is valid
    const validKey = Object.values(API_KEYS).includes(apiKey);
    if (!validKey) {
      AuditLogger.log(
        'system',
        'API_KEY_INVALID',
        'api_auth',
        {
          endpoint: req.path,
          keyPrefix: apiKey.substring(0, 8) + '...',
        },
        req.ip,
        req.get('user-agent')
      );
      return res.status(401).json({
        error: 'Invalid API key',
        code: 'INVALID_API_KEY',
      });
    }

    // If specific key type required, validate it
    if (keyType && API_KEYS[keyType] !== apiKey) {
      AuditLogger.log(
        'system',
        'API_KEY_WRONG_TYPE',
        'api_auth',
        {
          endpoint: req.path,
          required: keyType,
          keyPrefix: apiKey.substring(0, 8) + '...',
        },
        req.ip,
        req.get('user-agent')
      );
      return res.status(403).json({
        error: `API key not authorized for ${keyType} operations`,
        code: 'UNAUTHORIZED_API_KEY',
      });
    }

    // Add API key info to request
    req.apiKey = {
      key: apiKey,
      type: Object.keys(API_KEYS).find(key => API_KEYS[key] === apiKey),
      authMethod: 'api-key',
    };

    AuditLogger.log(
      'system',
      'API_KEY_AUTH_SUCCESS',
      'api_auth',
      {
        endpoint: req.path,
        keyType: req.apiKey.type,
      },
      req.ip,
      req.get('user-agent')
    );

    next();
  };
}

// Hybrid authentication: JWT or API Key
export function requireAuthOrApiKey(options = {}) {
  return async (req, res, next) => {
    const hasApiKey =
      req.headers['x-api-key'] || req.headers['authorization']?.startsWith('ApiKey ');
    const hasJwtToken = req.headers['authorization']?.startsWith('Bearer ');

    if (hasApiKey) {
      // Use API Key authentication
      return requireApiKey(options.apiKeyType)(req, res, next);
    } else if (hasJwtToken) {
      // Use JWT authentication
      return requireAuth(options)(req, res, next);
    } else {
      return res.status(401).json({
        error: 'Authentication required - provide either JWT token or API key',
        code: 'NO_AUTHENTICATION',
      });
    }
  };
}

// IP Whitelist middleware for sensitive admin operations
export function requireWhitelistedIP() {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    // Check if IP is whitelisted
    const isWhitelisted = ADMIN_IP_WHITELIST.some(allowedIP => {
      if (allowedIP === 'localhost') {
        return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(clientIP);
      }
      return clientIP === allowedIP || clientIP === `::ffff:${allowedIP}`;
    });

    if (!isWhitelisted) {
      AuditLogger.log(
        req.user?.id || 'anonymous',
        'IP_BLOCKED',
        'security',
        {
          endpoint: req.path,
          blockedIP: clientIP,
          whitelist: ADMIN_IP_WHITELIST,
        },
        clientIP,
        req.get('user-agent')
      );

      return res.status(403).json({
        error: 'Access denied - IP not whitelisted for admin operations',
        code: 'IP_NOT_WHITELISTED',
        clientIP: process.env.NODE_ENV === 'development' ? clientIP : undefined,
      });
    }

    next();
  };
}

// Enhanced admin authentication with IP whitelist
export function requireSecureAdmin() {
  return [requireWhitelistedIP(), requireAdmin()];
}

// Role-based access with specific permission for license generation
export function requireLicenseAdmin() {
  return requireAuth({
    roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
    permissions: ['licenses:write'],
  });
}

// Audit logging middleware for sensitive operations
export function auditLog(action, resource) {
  return (req, res, next) => {
    // Store audit info in request for later logging
    req.auditInfo = { action, resource };

    // Override res.json to log successful operations
    const originalJson = res.json;
    res.json = function (data) {
      if (res.statusCode < 400) {
        AuditLogger.logAdminAction(req, action, resource, {
          endpoint: req.path,
          method: req.method,
          success: true,
          responseStatus: res.statusCode,
        });
      }
      return originalJson.call(this, data);
    };

    next();
  };
}

// Security headers middleware
export function securityHeaders() {
  return (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  };
}

// Export AuditLogger for use in other modules
export { AuditLogger };

export default {
  AuthService,
  requireAuth,
  optionalAuth,
  requireAdmin,
  requirePermission,
  requireRole,
  authRateLimit,
  authenticateWebSocket,
  validatePasswordStrength,
  validateEmail,
  generateToken,
  verifyToken,
  authenticateToken,
  ROLES,
  PERMISSIONS,
};
