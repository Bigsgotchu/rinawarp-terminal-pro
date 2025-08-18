/**
 * RinaWarp Terminal Backend API
 * Handles payment processing, license validation, and user management
 */

// Load environment variables first
require('dotenv').config({ path: '../.env.sentry' });

// Initialize Sentry FIRST (before importing other modules)
const { initSentryBackend, sentryRequestHandler, sentryErrorHandler } = require('./sentry-backend');
initSentryBackend();

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const emailService = require('./email-service');

const app = express();
const PORT = process.env.PORT || 3000;

// Sentry request tracing middleware - must be first
app.use(sentryRequestHandler());

// Middleware
app.use(helmet());
app.use(logger.middleware()); // Add logging middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://rinawarptech.com'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Database mock (replace with actual database)
const users = new Map();
const licenses = new Map();
const subscriptions = new Map();
const downloadTokens = new Map();

// Crypto for secure tokens
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Stripe webhook endpoint (must be raw body)
app.use('/webhook', express.raw({ type: 'application/json' }));

// Routes

/**
 * Basic Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Detailed Health check with system information
 */
app.get('/health/detailed', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'rinawarp-terminal-api',
    version: process.env.npm_package_version || '1.0.0',
    uptime: uptime,
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    },
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    dependencies: {
      stripe: 'connected',
      database: 'memory', // Update when you add real database
    },
  });
});

/**
 * Readiness check for load balancers
 */
app.get('/ready', (req, res) => {
  // Add any readiness checks here (database connectivity, external services, etc.)
  const isReady = true; // Implement actual readiness logic

  if (isReady) {
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } else {
    res.status(503).json({ status: 'not_ready', timestamp: new Date().toISOString() });
  }
});

/**
 * Liveness check for container orchestrators
 */
app.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

/**
 * Create Stripe checkout session
 */
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { priceId, customerEmail, successUrl, cancelUrl } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    // Determine mode based on price ID (beta is one-time payment)
    const mode = priceId === 'price_1Rp8OHG2ToGP7ChnZxNr7sqz' ? 'payment' : 'subscription';

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        app: 'rinawarp-terminal',
      },
    };

    if (customerEmail) {
      sessionConfig.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({ id: session.id });
  } catch (error) {
    logger.error('Checkout session error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Activate license after successful payment
 */
app.post('/api/activate-license', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    const customer = await stripe.customers.retrieve(session.customer);
    let tier = 'free';
    let priceId;
    let expires;
    let subscriptionId = null;

    // Handle both subscription and one-time payments
    if (session.mode === 'subscription') {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      priceId = subscription.items.data[0].price.id;
      subscriptionId = subscription.id;
      expires = new Date(subscription.current_period_end * 1000).toISOString();
    } else {
      // One-time payment (beta)
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      priceId = lineItems.data[0].price.id;
      expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year for beta
    }

    // Determine tier based on price ID
    if (priceId === 'price_1Rp8OHG2ToGP7ChnZxNr7sqz') {
      tier = 'beta';
    } else if (priceId === 'price_1Rpt4gG2ToGP7ChnRtkTclRq') {
      tier = 'pro';
    } else if (priceId === 'price_1Rpt4qG2ToGP7ChnEqCcc6kZ') {
      tier = 'team';
    }

    // Create license
    const licenseId = uuidv4();
    const licenseData = {
      id: licenseId,
      tier,
      customerId: customer.id,
      subscriptionId: subscriptionId,
      email: customer.email,
      status: 'active',
      expires: expires,
      createdAt: new Date().toISOString(),
    };

    licenses.set(licenseId, licenseData);
    if (subscriptionId) {
      subscriptions.set(subscriptionId, licenseData);
    }

    // Send purchase confirmation email
    try {
      await emailService.sendPurchaseConfirmation(licenseData);
    } catch (emailError) {
      logger.error('Failed to send purchase confirmation email', {
        licenseId: licenseId,
        error: emailError.message,
      });
      // Don't fail the license creation if email fails
    }

    res.json({
      success: true,
      license: licenseData,
    });
  } catch (error) {
    logger.error('License activation error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start free trial
 */
app.post('/api/start-trial', async (req, res) => {
  try {
    const { plan = 'pro', email } = req.body;

    // Check if trial already used (implement proper checking)
    const trialId = uuidv4();
    const trialData = {
      id: trialId,
      tier: plan,
      trial: true,
      email,
      status: 'trial',
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      createdAt: new Date().toISOString(),
    };

    licenses.set(trialId, trialData);

    // Send trial started email
    try {
      await emailService.sendTrialStarted(trialData);
    } catch (emailError) {
      logger.error('Failed to send trial started email', {
        trialId: trialId,
        error: emailError.message,
      });
      // Don't fail the trial creation if email fails
    }

    res.json({
      success: true,
      trial: trialData,
    });
  } catch (error) {
    logger.error('Trial activation error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create customer portal session
 */
app.post('/api/create-portal-session', async (req, res) => {
  try {
    const { customerId, returnUrl } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || 'https://rinawarp.com/account',
    });

    res.json({ url: portalSession.url });
  } catch (error) {
    logger.error('Portal session error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Validate license
 */
app.post('/api/validate-license', async (req, res) => {
  try {
    const { licenseId, machineId } = req.body;

    if (!licenseId) {
      return res.status(400).json({ error: 'License ID is required' });
    }

    const license = licenses.get(licenseId);

    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    // Check if license is expired
    if (new Date() > new Date(license.expires)) {
      return res.json({
        valid: false,
        reason: 'License expired',
        license,
      });
    }

    // Check subscription status if not trial
    if (!license.trial && license.subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(license.subscriptionId);

      if (subscription.status !== 'active') {
        return res.json({
          valid: false,
          reason: 'Subscription not active',
          license,
        });
      }
    }

    res.json({
      valid: true,
      license,
    });
  } catch (error) {
    logger.error('License validation error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get pricing information
 */
app.get('/api/pricing', (req, res) => {
  res.json({
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        interval: 'forever',
        features: {
          ai_integration: true,
          basic_terminal: true,
          themes: true,
          accessibility: true,
          cloud_sync: false,
          analytics: false,
          automation_builder: false,
          unlimited_ai_requests: false,
          priority_support: false,
        },
        limits: {
          ai_requests_per_day: 50,
          saved_sessions: 10,
          custom_themes: 3,
        },
      },
      {
        id: 'beta',
        name: 'Beta Access',
        price: 39.0,
        interval: 'one-time',
        priceId: 'price_1Rp8OHG2ToGP7ChnZxNr7sqz',
        badge: 'LIMITED BETA',
        features: {
          ai_integration: true,
          basic_terminal: true,
          themes: true,
          accessibility: true,
          cloud_sync: true,
          analytics: true,
          automation_builder: true,
          unlimited_ai_requests: true,
          priority_support: true,
          beta_features: true,
          direct_developer_access: true,
        },
        limits: {
          ai_requests_per_day: -1,
          saved_sessions: -1,
          custom_themes: -1,
        },
      },
      {
        id: 'pro',
        name: 'Professional',
        price: 29.0,
        interval: 'month',
        priceId: 'price_1Rpt4gG2ToGP7ChnRtkTclRq',
        features: {
          ai_integration: true,
          basic_terminal: true,
          themes: true,
          accessibility: true,
          cloud_sync: true,
          analytics: true,
          automation_builder: true,
          unlimited_ai_requests: true,
          priority_support: true,
        },
        limits: {
          ai_requests_per_day: -1,
          saved_sessions: -1,
          custom_themes: -1,
        },
      },
      {
        id: 'team',
        name: 'Team',
        price: 49.0,
        interval: 'month',
        priceId: 'price_1Rpt4qG2ToGP7ChnEqCcc6kZ',
        features: {
          ai_integration: true,
          basic_terminal: true,
          themes: true,
          accessibility: true,
          cloud_sync: true,
          analytics: true,
          automation_builder: true,
          collaboration: true,
          unlimited_ai_requests: true,
          priority_support: true,
        },
        limits: {
          ai_requests_per_day: -1,
          saved_sessions: -1,
          custom_themes: -1,
        },
      },
    ],
  });
});

/**
 * Secure download endpoint - requires valid license
 */
app.get('/download/:tier/:platform/:filename', async (req, res) => {
  try {
    const { tier, platform, filename } = req.params;
    const { licenseId, token } = req.query;

    // Validate tier and platform
    const validTiers = ['free', 'beta', 'pro', 'team'];
    const validPlatforms = ['mac', 'windows', 'linux'];

    if (!validTiers.includes(tier) || !validPlatforms.includes(platform)) {
      return res.status(400).json({ error: 'Invalid tier or platform' });
    }

    // For free tier, no license required
    if (tier === 'free') {
      return serveDownload(res, tier, platform, filename);
    }

    // For paid tiers, validate license
    if (!licenseId) {
      return res.status(401).json({ error: 'License ID required' });
    }

    const license = licenses.get(licenseId);
    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    // Check if license is valid and matches tier
    if (license.tier !== tier) {
      return res.status(403).json({ error: 'License tier mismatch' });
    }

    // Check if license is expired
    if (new Date() > new Date(license.expires)) {
      return res.status(403).json({ error: 'License expired' });
    }

    // Check subscription status if not trial
    if (!license.trial && license.subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(license.subscriptionId);
      if (subscription.status !== 'active') {
        return res.status(403).json({ error: 'Subscription not active' });
      }
    }

    // Serve the download
    serveDownload(res, tier, platform, filename);
  } catch (error) {
    logger.error('Download error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generate secure download link
 */
app.post('/api/generate-download-link', async (req, res) => {
  try {
    const { licenseId, platform } = req.body;

    if (!licenseId) {
      return res.status(400).json({ error: 'License ID required' });
    }

    const license = licenses.get(licenseId);
    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    // Generate secure token (expires in 1 hour)
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token temporarily
    downloadTokens.set(token, {
      licenseId,
      platform,
      expiresAt,
    });

    const downloadUrl = `/download/${license.tier}/${platform}/RinaWarp-Terminal-${license.tier}-3.0.0.${getFileExtension(platform)}?licenseId=${licenseId}&token=${token}`;

    res.json({
      success: true,
      downloadUrl,
      expiresAt,
    });
  } catch (error) {
    logger.error('Generate download link error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Stripe webhook handler
 */
app.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Webhook signature verification failed', { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      logger.info('Payment succeeded', {
        sessionId: event.data.object.id,
        customerId: event.data.object.customer,
      });
      break;
    case 'customer.subscription.updated':
      handleSubscriptionUpdate(event.data.object);
      break;
    case 'customer.subscription.deleted':
      handleSubscriptionCanceled(event.data.object);
      break;
    case 'invoice.payment_failed':
      handlePaymentFailed(event.data.object);
      break;
    default:
      logger.warn('Unhandled webhook event', { eventType: event.type });
  }

  res.json({ received: true });
});

/**
 * Handle subscription updates
 */
function handleSubscriptionUpdate(subscription) {
  const licenseData = subscriptions.get(subscription.id);
  if (licenseData) {
    licenseData.expires = new Date(subscription.current_period_end * 1000).toISOString();
    licenseData.status = subscription.status;
    licenses.set(licenseData.id, licenseData);
    subscriptions.set(subscription.id, licenseData);
  }
}

/**
 * Handle subscription cancellation
 */
function handleSubscriptionCanceled(subscription) {
  const licenseData = subscriptions.get(subscription.id);
  if (licenseData) {
    licenseData.status = 'canceled';
    licenses.set(licenseData.id, licenseData);
    subscriptions.set(subscription.id, licenseData);
  }
}

/**
 * Handle payment failures
 */
function handlePaymentFailed(invoice) {
  const subscription = invoice.subscription;
  const licenseData = subscriptions.get(subscription);
  if (licenseData) {
    licenseData.status = 'past_due';
    licenses.set(licenseData.id, licenseData);
    subscriptions.set(subscription, licenseData);

    // Send payment failed email
    emailService.sendPaymentFailed(licenseData).catch(error => {
      logger.error('Failed to send payment failed email', {
        licenseId: licenseData.id,
        error: error.message,
      });
    });
  }
}

/**
 * Error handling middleware
 */
// Sentry error handler - must be before other error handlers
app.use(sentryErrorHandler());

app.use(logger.errorHandler());
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Something went wrong!' });
});

/**
 * 404 handler
 */
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize email service
emailService.initialize().catch(error => {
  logger.error('Failed to initialize email service', { error: error.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 RinaWarp Terminal API server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Set up log rotation every hour
  setInterval(
    () => {
      logger.rotateLogs();
    },
    60 * 60 * 1000
  );
});

/**
 * Helper Functions
 */

// Generate secure token for downloads
function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Get file extension for platform
function getFileExtension(platform) {
  const extensions = {
    mac: 'dmg',
    windows: 'exe',
    linux: 'AppImage',
  };
  return extensions[platform] || 'bin';
}

// Serve download file
function serveDownload(res, tier, platform, filename) {
  const downloadsDir = path.join(__dirname, '../dist');
  let actualFilename;

  // Map to actual built files
  if (platform === 'mac') {
    actualFilename = 'RinaWarp Terminal-3.0.0.dmg';
  } else if (platform === 'windows') {
    actualFilename = 'RinaWarp Terminal Setup 3.0.0.exe';
  } else if (platform === 'linux') {
    actualFilename = 'RinaWarp Terminal-3.0.0.AppImage';
  }

  const filePath = path.join(downloadsDir, actualFilename);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Download file not found' });
  }

  // Set appropriate headers
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  res.setHeader('Content-Disposition', `attachment; filename="${actualFilename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', fileSize);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  // Log download
  logger.info('File downloaded', {
    tier,
    platform,
    filename: actualFilename,
    size: fileSize,
  });
}

// Clean up expired download tokens
setInterval(
  () => {
    const now = new Date();
    for (const [token, data] of downloadTokens.entries()) {
      if (now > data.expiresAt) {
        downloadTokens.delete(token);
      }
    }
  },
  60 * 60 * 1000
); // Clean up every hour

module.exports = app;
