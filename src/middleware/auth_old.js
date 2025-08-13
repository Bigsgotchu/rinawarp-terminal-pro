/**
 * RinaWarp Terminal - Authentication Middleware
 * Handles JWT tokens, session validation, and permission checks
 */

import jwt from 'jsonwebtoken';
import UserManager, { ROLES, PERMISSIONS } from '../database/users.js';
import logger from '../utilities/logger.js';

// Role permissions mapping
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.READ_USERS,
    PERMISSIONS.WRITE_USERS,
    PERMISSIONS.READ_ANALYTICS,
    PERMISSIONS.WRITE_ANALYTICS,
    PERMISSIONS.READ_SUPPORT,
    PERMISSIONS.WRITE_SUPPORT,
    PERMISSIONS.ADMIN_ACCESS,
  ],
  [ROLES.ANALYTICS]: [PERMISSIONS.READ_ANALYTICS, PERMISSIONS.WRITE_ANALYTICS],
  [ROLES.SUPPORT]: [PERMISSIONS.READ_SUPPORT, PERMISSIONS.WRITE_SUPPORT, PERMISSIONS.READ_USERS],
  [ROLES.USER]: [],
};

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'rinawarp-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_SECRET =
  process.env.REFRESH_SECRET ||
  process.env.JWT_SECRET ||
  'rinawarp-refresh-secret-change-in-production';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

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

// Legacy token functions for backward compatibility
export function legacyGenerateToken(user, options = {}) {
  return AuthService.generateToken(user, options.expiresIn);
}

export function legacyVerifyToken(token) {
  return AuthService.verifyToken(token);
}

/**
 * Generate JWT token for user
 */
export function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role || ROLES.USER,
    permissions: ROLE_PERMISSIONS[user.role] || [],
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'rinawarp-terminal',
    audience: 'rinawarp-users',
  });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(user) {
  const payload = {
    id: user.id,
    type: 'refresh',
  };

  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: '7d',
    issuer: 'rinawarp-terminal',
  });
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'rinawarp-terminal',
      audience: 'rinawarp-users',
    });
  } catch (error) {
    throw new Error(new Error(new Error('Invalid token')));
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET, {
      issuer: 'rinawarp-terminal',
    });
  } catch (error) {
    throw new Error(new Error(new Error('Invalid refresh token')));
  }
}

/**
 * Extract token from request headers
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Support both "Bearer token" and "token" formats
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return authHeader;
}

/**
 * Authentication middleware - validates JWT tokens
 */
export function authenticateToken(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      code: 'TOKEN_MISSING',
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Token validation failed:', error.message);
    return res.status(403).json({
      error: 'Invalid or expired token',
      code: 'TOKEN_INVALID',
    });
  }
}

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export function optionalAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
  } catch (error) {
    // Log but don't fail - optional auth
    logger.warn('Optional auth token invalid:', error.message);
    req.user = null;
  }

  next();
}

/**
 * Role-based access control middleware
 */
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    if (req.user.role !== role && req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({
        error: `Access denied. Required role: ${role}`,
        code: 'INSUFFICIENT_ROLE',
      });
    }

    next();
  };
}

/**
 * Permission-based access control middleware
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const userPermissions = req.user.permissions || [];
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        error: `Access denied. Required permission: ${permission}`,
        code: 'INSUFFICIENT_PERMISSION',
      });
    }

    next();
  };
}

/**
 * Admin-only middleware
 */
export function requireAdmin(req, res, next) {
  return requireRole(ROLES.ADMIN)(req, res, next);
}

/**
 * API Key authentication for external services
 */
export function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      code: 'API_KEY_MISSING',
    });
  }

  // Validate API key (in production, store these securely)
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];

  if (!validApiKeys.includes(apiKey)) {
    return res.status(403).json({
      error: 'Invalid API key',
      code: 'API_KEY_INVALID',
    });
  }

  // Set API user context
  req.user = {
    type: 'api',
    key: apiKey,
    permissions: ['api:access'],
  };

  next();
}

/**
 * Rate limiting by user ID
 */
export function createUserRateLimit(windowMs = 15 * 60 * 1000, max = 100) {
  const userLimits = new Map();

  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();

    if (!userLimits.has(userId)) {
      userLimits.set(userId, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const userLimit = userLimits.get(userId);

    if (now > userLimit.resetTime) {
      userLimit.count = 1;
      userLimit.resetTime = now + windowMs;
      return next();
    }

    if (userLimit.count >= max) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        resetTime: userLimit.resetTime,
      });
    }

    userLimit.count++;
    next();
  };
}

export default {
  authenticateToken,
  optionalAuth,
  requireRole,
  requirePermission,
  requireAdmin,
  authenticateApiKey,
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  createUserRateLimit,
  ROLES,
  PERMISSIONS,
};
