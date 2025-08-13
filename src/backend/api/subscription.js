const express = require('express');
const Stripe = require('stripe');
const jwt = require('jsonwebtoken');
const { verifySubscription } = require('../middleware/auth');
const FeatureManager = require('../features/FeatureManager');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// Mock user storage (in production, use a proper database)
const users = new Map();

// Verify subscription status
router.post('/verify-subscription', async (req, res) => {
  try {
    const { userId, subscriptionId } = req.body;

    // Verify with Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (subscription.status === 'active') {
      const userTier = getTierFromPrice(subscription.items.data[0].price.id);

      // Generate JWT token with subscription info
      const token = jwt.sign(
        {
          userId,
          tier: userTier,
          subscriptionId,
          expiresAt: subscription.current_period_end * 1000,
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      res.json({
        success: true,
        tier: userTier,
        token,
        features: getFeaturesByTier(userTier),
      });
    } else {
      res.status(403).json({
        success: false,
        message: 'Subscription inactive',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Verification failed',
    });
  }
});

// Get user tier from price ID
function getTierFromPrice(priceId) {
  const priceTierMap = {
    price_personal: 'personal',
    price_professional: 'professional',
    price_team: 'team',
    price_enterprise: 'enterprise',
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
    enterprise: ['all_features', 'sso', 'dedicated_support', 'custom_integrations'],
  };
  return features[tier] || features.free;
}

// Get subscription status
router.get('/subscription/status', verifySubscription(), (req, res) => {
  try {
    const user = req.user;
    res.json({
      tier: user.tier,
      subscriptionId: user.subscriptionId,
      features: getFeaturesByTier(user.tier),
      expiresAt: user.expiresAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update subscription
router.post('/subscription/update', verifySubscription(), async (req, res) => {
  try {
    const { tier, stripeSubscriptionId } = req.body;
    const userId = req.user.userId;

    // In production, you would update the database and verify with Stripe
    // For now, we'll mock the update
    const updatedUser = {
      ...req.user,
      tier: tier,
      subscriptionId: stripeSubscriptionId,
      features: getFeaturesByTier(tier),
    };

    users.set(userId, updatedUser);

    res.json({
      success: true,
      tier: tier,
      features: getFeaturesByTier(tier),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify feature access
router.post('/subscription/verify-feature', verifySubscription(), (req, res) => {
  try {
    const { feature } = req.body;
    const userTier = req.user.tier;

    const access = FeatureManager.validateFeatureAccess(userTier, feature);

    res.json({
      allowed: access.allowed,
      reason: access.reason,
      tier: userTier,
      feature: feature,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
