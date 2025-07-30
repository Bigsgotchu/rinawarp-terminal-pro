/**
 * RinaWarp Terminal - Authentication & License API
 * Handles license validation, Stripe integration, and user authentication
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Joi from 'joi';
import { asyncHandler } from '../middleware/errorHandler.js';
import smtpService from '../utils/smtp.js';
import { generateToken } from '../middleware/auth.js';

const router = Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: {
    error: 'Too many authentication attempts from this IP. Please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schemas
const licenseValidationSchema = Joi.object({
  licenseKey: Joi.string()
    .required()
    .min(10)
    .max(200)
    .pattern(/^[A-Z0-9\-]+$/)
    .messages({
      'string.pattern.base':
        'License key must contain only uppercase letters, numbers, and hyphens',
    }),
});

const emailValidationSchema = Joi.object({
  email: Joi.string().email().required(),
  licenseType: Joi.string()
    .valid('trial', 'personal', 'professional', 'team', 'enterprise')
    .default('personal'),
});

// Joi validation middleware
const validate = schema => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }
    next();
  };
};

// Mock license database
const VALID_LICENSES = {
  'RINAWARP-TRIAL-2025': {
    type: 'trial',
    expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
    status: 'active',
    maxDevices: 1,
    features: ['basic_terminal', 'themes'],
  },
  'RINAWARP-PERSONAL-2025': {
    type: 'personal',
    expires: null,
    status: 'active',
    maxDevices: 3,
    features: ['full_terminal', 'themes', 'ai_assistant', 'cloud_sync'],
  },
  'RINAWARP-PRO-2025': {
    type: 'professional',
    expires: null,
    status: 'active',
    maxDevices: 5,
    features: [
      'full_terminal',
      'themes',
      'ai_assistant',
      'cloud_sync',
      'priority_support',
      'advanced_features',
    ],
  },
};

/**
 * POST /api/auth/generate-token
 * Generate JWT token for testing purposes
 */
router.post(
  '/generate-token',
  validate(
    Joi.object({
      userId: Joi.string().required(),
      email: Joi.string().email().required(),
      role: Joi.string().valid('USER', 'ADMIN', 'SUPER_ADMIN').default('USER'),
      permissions: Joi.array().items(Joi.string()).default([]),
    })
  ),
  asyncHandler(async (req, res) => {
    const { userId, email, role, permissions } = req.body;

    console.log(`[AUTH] Generating token for user: ${email} with role: ${role}`);

    const token = generateToken({
      userId,
      email,
      role,
      permissions,
    });

    res.json({
      success: true,
      token,
      user: {
        userId,
        email,
        role,
        permissions,
      },
      expiresIn: '24h',
    });
  })
);

/**
 * POST /api/auth/validate-license
 * Validate a license key
 */
router.post(
  '/validate-license',
  authLimiter,
  validate(licenseValidationSchema),
  asyncHandler(async (req, res) => {
    const { licenseKey } = req.body;

    console.log(`[LICENSE] Validation request for key: ${licenseKey.substring(0, 10)}...`);

    const license = VALID_LICENSES[licenseKey];

    if (!license) {
      return res.status(400).json({
        valid: false,
        error: 'Invalid license key',
      });
    }

    // Check if license is expired
    if (license.expires && Date.now() > license.expires) {
      return res.status(400).json({
        valid: false,
        error: 'License has expired',
        licenseType: license.type,
        expires: license.expires,
      });
    }

    const licenseData = {
      valid: true,
      licenseKey,
      licenseType: license.type,
      status: license.status,
      expires: license.expires,
      maxDevices: license.maxDevices,
      features: license.features,
      validatedAt: Date.now(),
    };

    console.log(`[LICENSE] Valid license found: ${license.type}`);
    res.json(licenseData);
  })
);

/**
 * GET /api/auth/license-status/:licenseKey
 * Get status of a specific license
 */
router.get(
  '/license-status/:licenseKey',
  asyncHandler(async (req, res) => {
    const { licenseKey } = req.params;

    const license = VALID_LICENSES[licenseKey];

    if (!license) {
      return res.status(404).json({
        error: 'License not found',
      });
    }

    res.json({
      licenseKey,
      type: license.type,
      status: license.status,
      expires: license.expires,
      maxDevices: license.maxDevices,
      features: license.features,
    });
  })
);

/**
 * POST /api/auth/test-license-email
 * Send a test license email
 */
router.post(
  '/test-license-email',
  validate(emailValidationSchema),
  asyncHandler(async (req, res) => {
    const { email, licenseType = 'personal' } = req.body;

    if (!smtpService.isInitialized()) {
      return res.status(503).json({
        error: 'Email service not available',
        details: 'SMTP service is not configured',
      });
    }

    const testLicenseKey = generateLicenseKey('test-customer', licenseType);

    try {
      await smtpService.sendLicenseEmail(email, testLicenseKey, licenseType);

      res.json({
        success: true,
        message: 'Test license email sent successfully',
        licenseKey: testLicenseKey,
        email: email,
        licenseType: licenseType,
      });
    } catch (error) {
      console.error('Error sending test license email:', error);
      res.status(500).json({
        error: 'Failed to send test email',
        details: error.message,
      });
    }
  })
);

/**
 * POST /api/auth/welcome
 * Send a welcome email to new users
 */
router.post(
  '/welcome',
  validate(
    Joi.object({
      email: Joi.string().email().required(),
      name: Joi.string().optional().default('RinaWarp User'),
    })
  ),
  asyncHandler(async (req, res) => {
    const { email, name } = req.body;

    // Reinitialize SMTP service if not initialized
    if (!smtpService.isInitialized()) {
      smtpService.reinitialize();
    }

    if (!smtpService.isInitialized()) {
      return res.status(503).json({
        error: 'Email service not available',
        details: 'SMTP service is not configured',
      });
    }

    try {
      await smtpService.sendEmail({
        to: email,
        subject: '🌊 Welcome to RinaWarp Terminal - Your Journey Begins! ✨',
        text: `Welcome to RinaWarp Terminal, ${name}!\n\nYour terminal journey begins here. Dive into the depths of productivity and let the waves guide you through your coding adventures.\n\nGet started:\n1. Download RinaWarp Terminal from https://rinawarptech.com/\n2. Install and launch the application\n3. Explore the features and customize your experience\n\nNeed help? Visit our documentation or contact support@rinawarp.com\n\nHappy coding!\nThe RinaWarp Team 🧜‍♀️`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #1a1a2e, #16213e);">
          <div style="background: linear-gradient(135deg, #0f3460, #16537e); padding: 40px; border-radius: 15px; color: white; text-align: center; box-shadow: 0 10px 30px rgba(0,255,136,0.1);">
            <h1 style="color: #00ff88; margin-bottom: 20px; font-size: 28px; text-shadow: 0 0 10px rgba(0,255,136,0.3);">🌊 Welcome aboard, ${name}! 🧜‍♀️</h1>
            <p style="font-size: 18px; margin-bottom: 30px; color: #e0e6ed; line-height: 1.6;">Your terminal journey begins here. Dive into the depths of productivity and let the waves guide you through your coding adventures.</p>
            
            <div style="background: rgba(0,255,136,0.1); padding: 25px; border-radius: 10px; margin: 30px 0; border: 1px solid rgba(0,255,136,0.3);">
              <h3 style="color: #00ff88; margin-bottom: 20px; font-size: 20px;">🚀 Get Started</h3>
              <ol style="color: #cccccc; line-height: 1.8; text-align: left; padding-left: 20px;">
                <li>Download RinaWarp Terminal from <a href="https://rinawarptech.com/" style="color: #00ff88; text-decoration: none; font-weight: bold;">our website</a></li>
                <li>Install and launch the application</li>
                <li>Explore the features and customize your experience</li>
                <li>Join our community and share your journey</li>
              </ol>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background: rgba(0,0,0,0.2); border-radius: 10px;">
              <p style="color: #888; font-size: 14px; margin: 0;">Need help? Visit our <a href="https://rinawarptech.com/docs" style="color: #00ff88;">documentation</a> or contact <a href="mailto:support@rinawarp.com" style="color: #00ff88;">support@rinawarp.com</a></p>
              <p style="color: #00ff88; font-size: 16px; margin: 15px 0 0 0; font-weight: bold;">Happy coding! 🐚</p>
            </div>
          </div>
        </div>
      `,
      });

      res.json({
        success: true,
        message: 'Welcome email sent successfully',
        recipient: email,
      });
    } catch (error) {
      console.error('Error sending welcome email:', error);
      res.status(500).json({
        error: 'Failed to send welcome email',
        details: error.message,
      });
    }
  })
);

/**
 * GET /api/auth/smtp-status
 * Get SMTP service status
 */
router.get('/smtp-status', (req, res) => {
  const status = smtpService.getStatus();
  res.json({
    smtp: status,
    timestamp: new Date().toISOString(),
  });
});

// Helper functions
function generateLicenseKey(customerId, licenseType) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const prefix =
    {
      personal: 'RINAWARP-PERSONAL',
      professional: 'RINAWARP-PRO',
      team: 'RINAWARP-TEAM',
      enterprise: 'RINAWARP-ENT',
    }[licenseType] || 'RINAWARP';

  return `${prefix}-${timestamp}-${random.toUpperCase()}`;
}

export default router;
