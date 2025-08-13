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
          requiredTier,
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
    enterprise: { requests: 10000, window: 60000 }, // 10000 per minute
  };

  // Implement rate limiting logic based on tier
  const limit = limits[tier];
  // Add rate limiting implementation here

  next();
};

module.exports = { verifySubscription, rateLimitByTier };
