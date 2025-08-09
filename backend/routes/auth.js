const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const { createPortalSession } = require('../config/stripe');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().isLength({ min: 2 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { email, password, name, company, role } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists with this email' });
      }

      // Create new user
      const user = new User({
        email,
        password,
        name,
        profile: {
          company,
          role,
        },
        verification_token: crypto.randomBytes(32).toString('hex'),
      });

      await user.save();

      // Generate JWT token
      const token = user.generateJWT();

      // TODO: Send verification email
      // await sendVerificationEmail(user.email, user.verification_token);

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          tier: user.subscription.tier,
          email_verified: user.email_verified,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Registration failed',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      user.last_login = new Date();
      await user.save();

      // Generate JWT token
      const token = user.generateJWT();

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          tier: user.subscription.tier,
          status: user.subscription.status,
          email_verified: user.email_verified,
          hasValidSubscription: user.hasValidSubscription(),
          features: user.getActiveFeatures(),
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Login failed',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/auth/profile
 * Get current user profile and subscription information
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profile: user.profile,
        subscription: {
          tier: user.subscription.tier,
          status: user.subscription.status,
          trial_end: user.subscription.trial_end,
          current_period_end: user.subscription.current_period_end,
          cancel_at_period_end: user.subscription.cancel_at_period_end,
        },
        licenses: user.licenses
          .filter(l => l.is_active)
          .map(l => ({
            key: l.key,
            platform: l.platform,
            tier: l.tier,
            created_at: l.created_at,
            last_used: l.last_used,
          })),
        features: user.getActiveFeatures(),
        hasValidSubscription: user.hasValidSubscription(),
        email_verified: user.email_verified,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile information
 */
router.put(
  '/profile',
  authenticateToken,
  [
    body('name').optional().trim().isLength({ min: 2 }),
    body('profile.company').optional().trim(),
    body('profile.role').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const user = req.user;
      const updates = req.body;

      // Update allowed fields
      if (updates.name) user.name = updates.name;
      if (updates.profile) {
        user.profile = { ...user.profile, ...updates.profile };
      }

      await user.save();

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          profile: user.profile,
        },
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

/**
 * POST /api/auth/generate-license
 * Generate a new license key for the authenticated user
 */
router.post(
  '/generate-license',
  authenticateToken,
  [body('platform').isIn(['windows', 'macos', 'linux', 'universal'])],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const user = req.user;
      const { platform } = req.body;

      // Check if user has valid subscription for license generation
      if (!user.hasValidSubscription() || user.subscription.tier === 'free') {
        return res.status(403).json({
          error: 'Valid Professional or Enterprise subscription required',
        });
      }

      // Generate license key
      const license = await user.addLicense(platform, user.subscription.tier);

      res.json({
        message: 'License key generated successfully',
        license: {
          key: license.key,
          platform: license.platform,
          tier: license.tier,
          created_at: license.created_at,
        },
      });
    } catch (error) {
      console.error('License generation error:', error);
      res.status(500).json({ error: 'Failed to generate license key' });
    }
  }
);

/**
 * GET /api/auth/download/:platform/:tier
 * Generate secure download URL for authenticated user
 */
router.get('/download/:platform/:tier', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { platform, tier } = req.params;

    // Validate platform and tier
    if (!['windows', 'macos', 'linux'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    if (!['free', 'professional', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    // Check if user can download this tier
    if (!user.canDownloadTier(tier)) {
      return res.status(403).json({
        error: `Your ${user.subscription.tier} subscription does not include access to ${tier} tier`,
      });
    }

    // Log download
    user.downloads.push({
      platform,
      tier,
      version: '1.0.8', // Should be dynamic
      ip_address: req.ip,
    });
    await user.save();

    // Generate secure download URL (would typically use signed URLs)
    const downloadUrl = generateSecureDownloadUrl(platform, tier, user.id);

    res.json({
      downloadUrl,
      expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      platform,
      tier,
      version: '1.0.8',
    });
  } catch (error) {
    console.error('Download URL generation error:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

/**
 * POST /api/auth/customer-portal
 * Create Stripe customer portal session for subscription management
 */
router.post('/customer-portal', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    if (!user.subscription.stripe_customer_id) {
      return res.status(400).json({
        error: 'No active subscription found',
      });
    }

    const portalSession = await createPortalSession(
      user.subscription.stripe_customer_id,
      `${process.env.FRONTEND_URL}/account`
    );

    res.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error('Customer portal error:', error);
    res.status(500).json({ error: 'Failed to create customer portal session' });
  }
});

/**
 * POST /api/auth/verify-license
 * Verify license key validity (for desktop app)
 */
router.post(
  '/verify-license',
  [body('licenseKey').notEmpty(), body('machineId').optional(), body('platform').optional()],
  async (req, res) => {
    try {
      const { licenseKey, machineId, platform } = req.body;

      const user = await User.findByLicenseKey(licenseKey);
      if (!user) {
        return res.status(404).json({
          valid: false,
          error: 'License key not found',
        });
      }

      const license = user.licenses.find(l => l.key === licenseKey);
      if (!license || !license.is_active) {
        return res.status(400).json({
          valid: false,
          error: 'License key inactive',
        });
      }

      // Check subscription validity
      if (!user.hasValidSubscription()) {
        return res.status(400).json({
          valid: false,
          error: 'Subscription expired',
        });
      }

      // Update license usage
      license.last_used = new Date();
      if (machineId) license.machine_id = machineId;
      await user.save();

      res.json({
        valid: true,
        tier: license.tier,
        features: user.getActiveFeatures(),
        subscription: {
          status: user.subscription.status,
          current_period_end: user.subscription.current_period_end,
        },
      });
    } catch (error) {
      console.error('License verification error:', error);
      res.status(500).json({
        valid: false,
        error: 'License verification failed',
      });
    }
  }
);

// Helper function to generate secure download URLs
function generateSecureDownloadUrl(platform, tier, userId) {
  const token = jwt.sign(
    { platform, tier, userId },
    process.env.DOWNLOAD_SECRET || process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  return `${process.env.BACKEND_URL}/api/downloads/secure/${token}`;
}

module.exports = router;
