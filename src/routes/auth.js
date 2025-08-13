/**
 * RinaWarp Terminal - Authentication API Routes
 * Handles user registration, login, logout, and token management
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import UserManager, { ROLES } from '../database/users.js';
import {
  AuthService,
  requireAuth,
  requireAdmin,
  authRateLimit,
  validatePasswordStrength,
  validateEmail,
} from '../middleware/auth.js';
import logger from '../utilities/logger.js';

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts',
    code: 'RATE_LIMITED',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: {
    error: 'Too many registration attempts',
    code: 'REGISTRATION_RATE_LIMITED',
    retryAfter: '1 hour',
  },
});

// Helper function to get client IP and user agent
function getClientInfo(req) {
  return {
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  };
}

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = ROLES.USER } = req.body;
    const { ipAddress, userAgent } = getClientInfo(req);

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'All fields are required',
        code: 'MISSING_FIELDS',
        required: ['email', 'password', 'firstName', 'lastName'],
      });
    }

    // Email validation
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        code: 'INVALID_EMAIL',
      });
    }

    // Password strength validation
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        code: 'WEAK_PASSWORD',
        requirements: passwordValidation.errors,
      });
    }

    // Role validation (only admins can create non-user accounts)
    if (role !== ROLES.USER && (!req.user || req.user.role !== ROLES.ADMIN)) {
      return res.status(403).json({
        error: 'Only administrators can create accounts with elevated roles',
        code: 'INSUFFICIENT_PRIVILEGES',
      });
    }

    // Create user
    const newUser = await UserManager.createUser({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role,
      emailVerified: false,
    });

    // Log registration
    logger.info('User registered', {
      userId: newUser.id,
      email: newUser.email,
      ipAddress,
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        emailVerified: newUser.emailVerified,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'An account with this email already exists',
        code: 'EMAIL_EXISTS',
      });
    }

    res.status(500).json({
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR',
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and create session
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;
    const { ipAddress, userAgent } = getClientInfo(req);

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS',
      });
    }

    // Login user
    const loginResult = await AuthService.loginUser(
      email.toLowerCase(),
      password,
      ipAddress,
      userAgent
    );

    // Set secure HTTP-only cookie for token storage
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 7 days or 1 day
    };

    res.cookie('auth_token', loginResult.tokens.accessToken, cookieOptions);
    res.cookie('refresh_token', loginResult.tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // Always 7 days for refresh token
    });

    logger.info('User logged in', {
      userId: loginResult.user.id,
      email: loginResult.user.email,
      ipAddress,
    });

    res.json({
      message: 'Login successful',
      user: loginResult.user,
      tokens: {
        accessToken: loginResult.tokens.accessToken,
        expiresIn: loginResult.tokens.expiresIn,
        // Don't send refresh token in response for security
      },
    });
  } catch (error) {
    logger.error('Login error:', error);

    // Generic error message to prevent user enumeration
    res.status(401).json({
      error: 'Invalid credentials',
      code: 'AUTHENTICATION_FAILED',
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        code: 'NO_REFRESH_TOKEN',
      });
    }

    const result = await AuthService.refreshToken(refreshToken);

    // Update access token cookie
    res.cookie('auth_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.json({
      message: 'Token refreshed successfully',
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    logger.error('Token refresh error:', error);

    res.status(401).json({
      error: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and revoke session
 */
router.post('/logout', requireAuth(), async (req, res) => {
  try {
    const { ipAddress } = getClientInfo(req);

    // Revoke session
    AuthService.logoutUser(req.authToken, req.user.id);

    // Clear cookies
    res.clearCookie('auth_token');
    res.clearCookie('refresh_token');

    logger.info('User logged out', {
      userId: req.user.id,
      email: req.user.email,
      ipAddress,
    });

    res.json({
      message: 'Logout successful',
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR',
    });
  }
});

/**
 * POST /api/auth/logout-all
 * Logout from all devices (revoke all sessions)
 */
router.post('/logout-all', requireAuth(), async (req, res) => {
  try {
    const { ipAddress } = getClientInfo(req);

    UserManager.revokeAllUserSessions(req.user.id);

    // Clear cookies
    res.clearCookie('auth_token');
    res.clearCookie('refresh_token');

    logger.info('User logged out from all devices', {
      userId: req.user.id,
      email: req.user.email,
      ipAddress,
    });

    res.json({
      message: 'Logged out from all devices',
    });
  } catch (error) {
    logger.error('Logout all error:', error);
    res.status(500).json({
      error: 'Logout all failed',
      code: 'LOGOUT_ALL_ERROR',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', requireAuth(), async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        emailVerified: req.user.emailVerified,
        lastLogin: req.user.lastLogin,
        createdAt: req.user.createdAt,
        permissions: req.user.permissions,
      },
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      error: 'Failed to get profile',
      code: 'PROFILE_ERROR',
    });
  }
});

/**
 * PUT /api/auth/password
 * Update user password
 */
router.put('/password', requireAuth(), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { ipAddress, userAgent } = getClientInfo(req);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required',
        code: 'MISSING_PASSWORDS',
      });
    }

    // Verify current password
    try {
      await UserManager.authenticateUser(req.user.email, currentPassword, ipAddress, userAgent);
    } catch (error) {
      return res.status(401).json({
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD',
      });
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'New password does not meet requirements',
        code: 'WEAK_NEW_PASSWORD',
        requirements: passwordValidation.errors,
      });
    }

    // Update password
    await UserManager.updatePassword(req.user.id, newPassword);

    // Clear all cookies to force re-login
    res.clearCookie('auth_token');
    res.clearCookie('refresh_token');

    logger.info('Password updated', {
      userId: req.user.id,
      email: req.user.email,
      ipAddress,
    });

    res.json({
      message: 'Password updated successfully. Please log in again.',
    });
  } catch (error) {
    logger.error('Password update error:', error);
    res.status(500).json({
      error: 'Password update failed',
      code: 'PASSWORD_UPDATE_ERROR',
    });
  }
});

/**
 * POST /api/auth/generate-token
 * Generate admin token (for backward compatibility with existing admin dashboard)
 */
router.post('/generate-token', authLimiter, async (req, res) => {
  try {
    // Create a temporary admin user for demo purposes
    // In production, this should require proper authentication
    const demoAdminUser = {
      id: 1,
      email: 'admin@rinawarp.com',
      firstName: 'Admin',
      lastName: 'User',
      role: ROLES.ADMIN,
    };

    const token = AuthService.generateToken(demoAdminUser);

    res.json({
      success: true,
      token: token,
      expiresIn: '24h',
      message: 'Admin token generated successfully',
    });
  } catch (error) {
    logger.error('Admin token generation error:', error);
    res.status(500).json({
      error: 'Token generation failed',
      code: 'TOKEN_GENERATION_ERROR',
    });
  }
});

/**
 * GET /api/auth/audit-log
 * Get authentication audit log (admin only)
 */
router.get('/audit-log', requireAdmin(), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const auditLog = UserManager.getAuditLog(limit);

    res.json({
      auditLog,
      total: auditLog.length,
    });
  } catch (error) {
    logger.error('Audit log error:', error);
    res.status(500).json({
      error: 'Failed to get audit log',
      code: 'AUDIT_LOG_ERROR',
    });
  }
});

export default router;
