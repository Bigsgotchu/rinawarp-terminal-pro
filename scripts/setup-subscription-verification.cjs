#!/usr/bin/env node

/**
 * Subscription Verification System
 * Server-side validation for user subscriptions and feature access
 */

const fs = require('fs').promises;
const _path = require('path');

console.log('🔐 Setting up Subscription Verification System...\n');

async function setupSubscriptionVerification() {
  try {
    // 0. Create necessary directories first
    await createDirectories();

    // 1. Create backend API endpoints
    await createAPIEndpoints();

    // 2. Create subscription verification middleware
    await createVerificationMiddleware();

    // 3. Create user authentication system
    await createAuthSystem();

    // 4. Create feature access controls
    await createFeatureControls();

    // 5. Create Stripe webhook handler
    await createWebhookHandler();

    console.log('\n✅ Subscription verification system setup complete!');
    console.log('🔒 Users will now be authenticated before accessing premium features');
  } catch (error) {
    console.error('❌ Failed to setup subscription verification:', error);
  }
}

async function createDirectories() {
  const directories = [
    'src/backend',
    'src/backend/api',
    'src/backend/middleware',
    'src/backend/auth',
    'src/backend/features',
    'src/backend/webhooks',
  ];

  console.log('📁 Creating backend directories...');

  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's fine
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  console.log('✅ Created backend directory structure');
}

async function createAPIEndpoints() {
  const apiCode = `
const express = require('express');
const Stripe = require('stripe');
const jwt = require('jsonwebtoken');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// Verify subscription status
router.post('/verify-subscription', async (req, res) => {
  try {
    const { userId, subscriptionId } = req.body;
    
    // Verify with Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    if (subscription.status === 'active') {
      const userTier = getTierFromPrice(subscription.items.data[0].price.id);
      
      // Generate JWT token with subscription info
      const token = jwt.sign({
        userId,
        tier: userTier,
        subscriptionId,
        expiresAt: subscription.current_period_end * 1000
      }, process.env.JWT_SECRET, { expiresIn: '1d' });
      
      res.json({
        success: true,
        tier: userTier,
        token,
        features: getFeaturesByTier(userTier)
      });
    } else {
      res.status(403).json({
        success: false,
        message: 'Subscription inactive'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Verification failed'
    });
  }
});

// Get user tier from price ID
function getTierFromPrice(priceId) {
  const priceTierMap = {
    'price_personal': 'personal',
    'price_professional': 'professional', 
    'price_team': 'team',
    'price_enterprise': 'enterprise'
  };
  return priceTierMap[priceId] || 'free';
}

// Get features by tier
function getFeaturesByTier(tier) {
  const features = {
    free: ['basic_terminal', 'limited_ai'],
    personal: ['basic_terminal', 'full_ai', 'cloud_sync'],
    professional: ['all_features', 'priority_support', 'advanced_ai'],
    team: ['all_features', 'team_management', 'shared_configs'],
    enterprise: ['all_features', 'sso', 'dedicated_support', 'custom_integrations']
  };
  return features[tier] || features.free;
}

module.exports = router;
`;

  await fs.writeFile('src/backend/api/subscription.js', apiCode, 'utf8');
  console.log('✅ Created subscription API endpoints');
}

async function createVerificationMiddleware() {
  const middlewareCode = `
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware to verify subscription tokens
const verifySubscription = (requiredTier = 'free') => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'No auth token provided' });
      }
      
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if subscription is still active
      if (Date.now() > decoded.expiresAt) {
        return res.status(403).json({ error: 'Subscription expired' });
      }
      
      // Verify tier access
      if (!hasAccess(decoded.tier, requiredTier)) {
        return res.status(403).json({ 
          error: 'Insufficient subscription tier',
          currentTier: decoded.tier,
          requiredTier
        });
      }
      
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};

// Check if user tier has access to required tier
function hasAccess(userTier, requiredTier) {
  const tierHierarchy = ['free', 'personal', 'professional', 'team', 'enterprise'];
  const userLevel = tierHierarchy.indexOf(userTier);
  const requiredLevel = tierHierarchy.indexOf(requiredTier);
  
  return userLevel >= requiredLevel;
}

// Rate limiting by tier
const rateLimitByTier = (req, res, next) => {
  const tier = req.user?.tier || 'free';
  const limits = {
    free: { requests: 10, window: 60000 }, // 10 per minute
    personal: { requests: 100, window: 60000 }, // 100 per minute  
    professional: { requests: 500, window: 60000 }, // 500 per minute
    team: { requests: 1000, window: 60000 }, // 1000 per minute
    enterprise: { requests: 10000, window: 60000 } // 10000 per minute
  };
  
  // Implement rate limiting logic based on tier
  const limit = limits[tier];
  // Add rate limiting implementation here
  
  next();
};

module.exports = { verifySubscription, rateLimitByTier };
`;

  await fs.writeFile('src/backend/middleware/auth.js', middlewareCode, 'utf8');
  console.log('✅ Created verification middleware');
}

async function createAuthSystem() {
  const authCode = `
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

class AuthManager {
  constructor() {
    this.users = new Map(); // In production, use a database
    this.sessions = new Map();
  }
  
  async register(email, password, name) {
    try {
      if (this.users.has(email)) {
        throw new Error('User already exists');
      }
      
      const hashedPassword = await bcrypt.hash(password, 12);
      const userId = uuidv4();
      
      const user = {
        id: userId,
        email,
        name,
        password: hashedPassword,
        tier: 'free',
        subscriptionId: null,
        createdAt: new Date().toISOString()
      };
      
      this.users.set(email, user);
      return { userId, email, name, tier: 'free' };
    } catch (error) {
      throw new Error(\`Registration failed: \${error.message}\`);
    }
  }
  
  async login(email, password) {
    try {
      const user = this.users.get(email);
      if (!user) {
        throw new Error('User not found');
      }
      
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        throw new Error('Invalid password');
      }
      
      // Create session token
      const sessionToken = jwt.sign({
        userId: user.id,
        email: user.email,
        tier: user.tier
      }, process.env.JWT_SECRET, { expiresIn: '7d' });
      
      this.sessions.set(sessionToken, {
        userId: user.id,
        email: user.email,
        tier: user.tier,
        lastActive: Date.now()
      });
      
      return {
        token: sessionToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier
        }
      };
    } catch (error) {
      throw new Error(\`Login failed: \${error.message}\`);
    }
  }
  
  async updateSubscription(userId, tier, subscriptionId) {
    try {
      // Find user and update subscription
      for (const [email, user] of this.users.entries()) {
        if (user.id === userId) {
          user.tier = tier;
          user.subscriptionId = subscriptionId;
          user.updatedAt = new Date().toISOString();
          return true;
        }
      }
      throw new Error('User not found');
    } catch (error) {
      throw new Error(\`Subscription update failed: \${error.message}\`);
    }
  }
  
  validateSession(token) {
    const session = this.sessions.get(token);
    if (!session) {
      throw new Error('Invalid session');
    }
    
    // Update last active
    session.lastActive = Date.now();
    return session;
  }
  
  logout(token) {
    this.sessions.delete(token);
  }
}

module.exports = new AuthManager();
`;

  await fs.writeFile('src/backend/auth/AuthManager.js', authCode, 'utf8');
  console.log('✅ Created user authentication system');
}

async function createFeatureControls() {
  const featureCode = `
class FeatureManager {
  constructor() {
    this.featureDefinitions = {
      // AI Features
      'ai_assistant': {
        tiers: ['personal', 'professional', 'team', 'enterprise'],
        limits: {
          personal: { requests: 100 },
          professional: { requests: 1000 },
          team: { requests: 5000 },
          enterprise: { requests: 'unlimited' }
        }
      },
      'advanced_ai': {
        tiers: ['professional', 'team', 'enterprise'],
        limits: {
          professional: { models: ['gpt-3.5', 'claude-sonnet'] },
          team: { models: ['gpt-4', 'claude-sonnet', 'claude-opus'] },
          enterprise: { models: 'all' }
        }
      },
      
      // Terminal Features
      'custom_themes': {
        tiers: ['personal', 'professional', 'team', 'enterprise'],
        limits: {
          personal: { themes: 5 },
          professional: { themes: 25 },
          team: { themes: 'unlimited' },
          enterprise: { themes: 'unlimited' }
        }
      },
      'cloud_sync': {
        tiers: ['personal', 'professional', 'team', 'enterprise'],
        limits: {
          personal: { storage: '1GB' },
          professional: { storage: '10GB' },
          team: { storage: '100GB' },
          enterprise: { storage: 'unlimited' }
        }
      },
      
      // Team Features
      'team_management': {
        tiers: ['team', 'enterprise'],
        limits: {
          team: { members: 10 },
          enterprise: { members: 'unlimited' }
        }
      },
      'shared_configs': {
        tiers: ['team', 'enterprise']
      },
      
      // Enterprise Features
      'sso': {
        tiers: ['enterprise']
      },
      'dedicated_support': {
        tiers: ['enterprise']
      },
      'custom_integrations': {
        tiers: ['enterprise']
      }
    };
  }
  
  hasFeature(userTier, featureName) {
    const feature = this.featureDefinitions[featureName];
    if (!feature) return false;
    
    return feature.tiers.includes(userTier);
  }
  
  getFeatureLimit(userTier, featureName) {
    const feature = this.featureDefinitions[featureName];
    if (!feature || !this.hasFeature(userTier, featureName)) {
      return null;
    }
    
    return feature.limits?.[userTier] || null;
  }
  
  getAvailableFeatures(userTier) {
    const available = [];
    
    for (const [featureName, feature] of Object.entries(this.featureDefinitions)) {
      if (feature.tiers.includes(userTier)) {
        available.push({
          name: featureName,
          limits: feature.limits?.[userTier] || null
        });
      }
    }
    
    return available;
  }
  
  validateFeatureAccess(userTier, featureName, usage = {}) {
    if (!this.hasFeature(userTier, featureName)) {
      return {
        allowed: false,
        reason: 'Feature not available in your tier',
        upgradeRequired: true
      };
    }
    
    const limits = this.getFeatureLimit(userTier, featureName);
    if (!limits) {
      return { allowed: true };
    }
    
    // Check usage against limits
    for (const [limitType, limitValue] of Object.entries(limits)) {
      if (limitValue === 'unlimited') continue;
      
      const currentUsage = usage[limitType] || 0;
      if (typeof limitValue === 'number' && currentUsage >= limitValue) {
        return {
          allowed: false,
          reason: \`\${limitType} limit exceeded (\${currentUsage}/\${limitValue})\`,
          upgradeRequired: false
        };
      }
    }
    
    return { allowed: true };
  }
}

module.exports = new FeatureManager();
`;

  await fs.writeFile('src/backend/features/FeatureManager.js', featureCode, 'utf8');
  console.log('✅ Created feature access controls');
}

async function createWebhookHandler() {
  const webhookCode = `
const express = require('express');
const Stripe = require('stripe');
const AuthManager = require('../auth/AuthManager');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// Stripe webhook endpoint
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.log(\`Webhook signature verification failed.\`, err.message);
    return res.status(400).send(\`Webhook Error: \${err.message}\`);
  }
  
  // Handle the event
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      default:
        console.log(\`Unhandled event type \${event.type}\`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handleSubscriptionChange(subscription) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer);
    const priceId = subscription.items.data[0].price.id;
    const tier = getTierFromPrice(priceId);
    
    // Update user subscription in our system
    const userId = customer.metadata.userId;
    if (userId) {
      await AuthManager.updateSubscription(userId, tier, subscription.id);
      console.log(\`Updated subscription for user \${userId} to \${tier}\`);
    }
  } catch (error) {
    console.error('Failed to handle subscription change:', error);
  }
}

async function handleSubscriptionCancelled(subscription) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer);
    const userId = customer.metadata.userId;
    
    if (userId) {
      await AuthManager.updateSubscription(userId, 'free', null);
      console.log(\`Downgraded user \${userId} to free tier\`);
    }
  } catch (error) {
    console.error('Failed to handle subscription cancellation:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  try {
    console.log(\`Payment succeeded for invoice \${invoice.id}\`);
    // Add any payment success logic here
  } catch (error) {
    console.error('Failed to handle payment success:', error);
  }
}

async function handlePaymentFailed(invoice) {
  try {
    console.log(\`Payment failed for invoice \${invoice.id}\`);
    // Add payment failure handling (notifications, grace period, etc.)
  } catch (error) {
    console.error('Failed to handle payment failure:', error);
  }
}

function getTierFromPrice(priceId) {
  const priceTierMap = {
    'price_personal': 'personal',
    'price_professional': 'professional',
    'price_team': 'team', 
    'price_enterprise': 'enterprise'
  };
  return priceTierMap[priceId] || 'free';
}

module.exports = router;
`;

  await fs.writeFile('src/backend/webhooks/stripe.js', webhookCode, 'utf8');
  console.log('✅ Created Stripe webhook handler');
}

// Safety check before running
if (process.argv.includes('--setup')) {
  setupSubscriptionVerification();
} else {
  console.log('🔐 Subscription Verification System Setup');
  console.log(
    '\nThis will create a complete user authentication and subscription verification system.'
  );
  console.log('\n📋 Components to be created:');
  console.log('1. Backend API endpoints for subscription verification');
  console.log('2. Authentication middleware with JWT tokens');
  console.log('3. User authentication system with registration/login');
  console.log('4. Feature access controls based on subscription tiers');
  console.log('5. Stripe webhook handler for real-time subscription updates');
  console.log('\n🚀 To setup: node scripts/setup-subscription-verification.cjs --setup');
}
