/**
 * RinaWarp Terminal - License Server
 * Handles license validation, user management, and subscription tracking
 */

import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

class LicenseServer {
  constructor(config = {}) {
    this.app = express();
    this.port = config.port || 3001;
    this.jwtSecret = config.jwtSecret || crypto.randomBytes(64).toString('hex');
    this.licenseDatabase = new Map(); // In production, use PostgreSQL/MongoDB
    this.userDatabase = new Map();
    this.activeSessions = new Map();

    this.setupMiddleware();
    this.setupRoutes();
    this.initializeDefaultLicenses();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests, please try again later',
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    // License validation
    this.app.post('/api/license/validate', this.validateLicense.bind(this));

    // User registration
    this.app.post('/api/user/register', this.registerUser.bind(this));

    // User authentication
    this.app.post('/api/user/login', this.authenticateUser.bind(this));

    // License purchase/activation
    this.app.post('/api/license/activate', this.authenticateToken, this.activateLicense.bind(this));

    // Get user licenses
    this.app.get('/api/user/licenses', this.authenticateToken, this.getUserLicenses.bind(this));

    // Hardware fingerprint registration
    this.app.post(
      '/api/hardware/register',
      this.authenticateToken,
      this.registerHardware.bind(this)
    );

    // License usage analytics
    this.app.post('/api/analytics/usage', this.recordUsage.bind(this));

    // Admin routes
    this.app.get('/api/admin/stats', this.authenticateAdmin, this.getSystemStats.bind(this));
    this.app.post(
      '/api/admin/license/create',
      this.authenticateAdmin,
      this.createLicense.bind(this)
    );
  }

  /**
   * License validation endpoint
   */
  async validateLicense(req, res) {
    try {
      const { licenseKey, hardwareId, version } = req.body;

      if (!licenseKey || !hardwareId) {
        return res.status(400).json({
          valid: false,
          error: 'Missing required fields',
        });
      }

      const license = this.licenseDatabase.get(licenseKey);

      if (!license) {
        return res.status(404).json({
          valid: false,
          error: 'License not found',
        });
      }

      // Check license status
      if (license.status !== 'active') {
        return res.status(403).json({
          valid: false,
          error: 'License inactive',
          status: license.status,
        });
      }

      // Check expiration
      if (license.expiresAt && new Date() > new Date(license.expiresAt)) {
        return res.status(403).json({
          valid: false,
          error: 'License expired',
          expiresAt: license.expiresAt,
        });
      }

      // Check hardware binding
      if (license.hardwareIds && license.hardwareIds.length > 0) {
        if (!license.hardwareIds.includes(hardwareId)) {
          // Allow adding new hardware up to limit
          if (license.hardwareIds.length >= license.maxDevices) {
            return res.status(403).json({
              valid: false,
              error: 'Maximum devices exceeded',
              maxDevices: license.maxDevices,
            });
          }

          // Add new hardware
          license.hardwareIds.push(hardwareId);
          license.lastUpdated = new Date().toISOString();
        }
      } else {
        // First activation
        license.hardwareIds = [hardwareId];
        license.firstActivated = new Date().toISOString();
      }

      // Update last seen
      license.lastSeen = new Date().toISOString();
      license.usageCount = (license.usageCount || 0) + 1;

      // Generate session token
      const sessionToken = jwt.sign(
        {
          licenseKey,
          hardwareId,
          tier: license.tier,
          features: license.features,
        },
        this.jwtSecret,
        { expiresIn: '24h' }
      );

      res.json({
        valid: true,
        tier: license.tier,
        features: license.features,
        expiresAt: license.expiresAt,
        sessionToken,
        maxDevices: license.maxDevices,
        devicesUsed: license.hardwareIds.length,
      });
    } catch (error) {
      console.error('License validation error:', error);
      res.status(500).json({
        valid: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * User registration
   */
  async registerUser(req, res) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
        });
      }

      // Check if user exists
      const existingUser = Array.from(this.userDatabase.values()).find(u => u.email === email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'User already exists',
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Generate user ID
      const userId = crypto.randomUUID();

      // Create user
      const user = {
        id: userId,
        email,
        name,
        passwordHash,
        createdAt: new Date().toISOString(),
        tier: 'free',
        licenses: [],
      };

      this.userDatabase.set(userId, user);

      // Generate free trial license
      const freeLicense = this.generateLicense('free', userId);
      user.licenses.push(freeLicense.key);

      // Generate JWT token
      const token = jwt.sign(
        {
          userId,
          email,
          tier: 'free',
        },
        this.jwtSecret,
        { expiresIn: '30d' }
      );

      res.status(201).json({
        success: true,
        user: {
          id: userId,
          email,
          name,
          tier: 'free',
        },
        token,
        license: {
          key: freeLicense.key,
          tier: freeLicense.tier,
          features: freeLicense.features,
        },
      });
    } catch (error) {
      console.error('User registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * User authentication
   */
  async authenticateUser(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Missing email or password',
        });
      }

      // Find user
      const user = Array.from(this.userDatabase.values()).find(u => u.email === email);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          tier: user.tier,
        },
        this.jwtSecret,
        { expiresIn: '30d' }
      );

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
        },
        token,
      });
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Generate a new license
   */
  generateLicense(tier, userId, duration = null) {
    const licenseKey = this.generateLicenseKey();

    const tierConfig = {
      free: {
        features: ['basic_terminal', 'basic_themes'],
        maxDevices: 1,
        maxTabs: 5,
        aiAssistance: false,
        support: 'community',
      },
      individual: {
        features: ['unlimited_terminals', 'all_themes', 'basic_ai', 'email_support'],
        maxDevices: 3,
        maxTabs: -1, // unlimited
        aiAssistance: 'basic',
        support: 'email',
      },
      professional: {
        features: [
          'unlimited_terminals',
          'all_themes',
          'advanced_ai',
          'priority_support',
          'commercial_use',
        ],
        maxDevices: 5,
        maxTabs: -1,
        aiAssistance: 'advanced',
        support: 'priority',
      },
      enterprise: {
        features: [
          'unlimited_terminals',
          'all_themes',
          'advanced_ai',
          'dedicated_support',
          'sso',
          'custom_branding',
        ],
        maxDevices: -1, // unlimited
        maxTabs: -1,
        aiAssistance: 'advanced',
        support: 'dedicated',
      },
    };

    const config = tierConfig[tier] || tierConfig.free;

    let expiresAt = null;
    if (duration && tier !== 'free') {
      expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + duration);
      expiresAt = expiresAt.toISOString();
    }

    const license = {
      key: licenseKey,
      userId,
      tier,
      status: 'active',
      features: config.features,
      maxDevices: config.maxDevices,
      createdAt: new Date().toISOString(),
      expiresAt,
      hardwareIds: [],
      usageCount: 0,
    };

    this.licenseDatabase.set(licenseKey, license);

    return license;
  }

  /**
   * Generate a cryptographically secure license key
   */
  generateLicenseKey() {
    const prefix = 'RWTP'; // RinaWarp Terminal Pro
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(8).toString('hex').toUpperCase();
    const checksum = crypto
      .createHash('md5')
      .update(timestamp + random)
      .digest('hex')
      .substring(0, 4)
      .toUpperCase();

    return `${prefix}-${timestamp}-${random}-${checksum}`;
  }

  /**
   * JWT authentication middleware
   */
  authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, this.jwtSecret, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid token' });
      }
      req.user = decoded;
      next();
    });
  }

  /**
   * Admin authentication middleware
   */
  authenticateAdmin(req, res, next) {
    // In production, implement proper admin role checking
    const adminToken = req.headers['x-admin-token'];
    if (adminToken !== 'ADMIN_SECRET_TOKEN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  }

  /**
   * Initialize default licenses for testing
   */
  initializeDefaultLicenses() {
    // Create a test license for development
    const testLicense = this.generateLicense('professional', 'test-user-id', 1);
    console.log(`Test license created: ${testLicense.key}`);

    // Create admin user
    const adminUser = {
      id: 'admin-id',
      email: 'admin@rinawarp.com',
      name: 'Admin User',
      passwordHash: bcrypt.hashSync('admin123', 10),
      createdAt: new Date().toISOString(),
      tier: 'admin',
      licenses: [],
    };
    this.userDatabase.set('admin-id', adminUser);
  }

  /**
   * Additional route handlers
   */
  async activateLicense(req, res) {
    // Implementation for license activation
    res.json({ success: true, message: 'License activated' });
  }

  async getUserLicenses(req, res) {
    // Implementation for getting user licenses
    const user = this.userDatabase.get(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const licenses = user.licenses.map(key => {
      const license = this.licenseDatabase.get(key);
      return {
        key,
        tier: license.tier,
        status: license.status,
        expiresAt: license.expiresAt,
        features: license.features,
      };
    });

    res.json({ licenses });
  }

  async registerHardware(req, res) {
    // Implementation for hardware registration
    res.json({ success: true, message: 'Hardware registered' });
  }

  async recordUsage(req, res) {
    // Implementation for usage analytics
    res.json({ success: true, message: 'Usage recorded' });
  }

  async getSystemStats(req, res) {
    // Implementation for admin stats
    const stats = {
      totalUsers: this.userDatabase.size,
      totalLicenses: this.licenseDatabase.size,
      activeLicenses: Array.from(this.licenseDatabase.values()).filter(l => l.status === 'active')
        .length,
      timestamp: new Date().toISOString(),
    };
    res.json(stats);
  }

  async createLicense(req, res) {
    // Implementation for admin license creation
    const { tier, userId, duration } = req.body;
    const license = this.generateLicense(tier, userId, duration);
    res.json({ success: true, license });
  }

  /**
   * Start the license server
   */
  start() {
    this.app.listen(this.port, () => {
      console.log(`🔐 RinaWarp License Server running on port ${this.port}`);
      console.log(`🌐 Health check: http://localhost:${this.port}/health`);
      console.log(`📊 Admin stats: http://localhost:${this.port}/api/admin/stats`);
    });
  }
}

export default LicenseServer;
