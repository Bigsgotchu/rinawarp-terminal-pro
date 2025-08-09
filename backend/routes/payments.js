import express from 'express';
import {
  createCheckoutSession,
  createPortalSession,
  getCustomerSubscription,
  handleWebhookEvent,
  stripe,
} from '../config/stripe.js';

const router = express.Router();

// Middleware for parsing Stripe webhooks
const parseStripeWebhook = (req, res, next) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    req.stripeEvent = event;
    next();
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

/**
 * POST /api/payments/create-checkout-session
 * Create a Stripe checkout session for Professional subscription
 */
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { platform, customerId } = req.body;

    // Validate request
    if (!platform || !['windows', 'macos', 'linux', 'web'].includes(platform)) {
      return res.status(400).json({
        error: 'Valid platform (windows, macos, linux, web) is required',
      });
    }

    // Create checkout session
    const session = await createCheckoutSession(customerId);

    // Log the checkout attempt
    console.log('Checkout session created:', {
      sessionId: session.id,
      platform,
      customerId: customerId || 'new_customer',
    });

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/payments/create-portal-session
 * Create a Stripe customer portal session for subscription management
 */
router.post('/create-portal-session', async (req, res) => {
  try {
    const { customerId, returnUrl } = req.body;

    if (!customerId) {
      return res.status(400).json({
        error: 'Customer ID is required',
      });
    }

    const portalSession = await createPortalSession(customerId, returnUrl);

    res.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({
      error: 'Failed to create portal session',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/payments/subscription/:customerId
 * Get customer subscription information
 */
router.get('/subscription/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const subscriptionData = await getCustomerSubscription(customerId);

    // Format response for frontend
    const response = {
      hasActiveSubscription: !!subscriptionData.subscription,
      subscription: subscriptionData.subscription
        ? {
            id: subscriptionData.subscription.id,
            status: subscriptionData.subscription.status,
            current_period_start: subscriptionData.subscription.current_period_start,
            current_period_end: subscriptionData.subscription.current_period_end,
            trial_end: subscriptionData.subscription.trial_end,
            tier: subscriptionData.subscription.metadata.tier || 'professional',
            cancel_at_period_end: subscriptionData.subscription.cancel_at_period_end,
          }
        : null,
    };

    res.json(response);
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    res.status(500).json({
      error: 'Failed to retrieve subscription',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/payments/webhook
 * Handle Stripe webhook events
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  parseStripeWebhook,
  async (req, res) => {
    try {
      const event = req.stripeEvent;

      console.log('Webhook received:', event.type, event.id);

      const result = await handleWebhookEvent(event);

      res.json(result);
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(500).json({
        error: 'Webhook processing failed',
      });
    }
  }
);

/**
 * GET /api/payments/config
 * Get public Stripe configuration for frontend
 */
router.get('/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    currency: 'usd',
    pricing: {
      professional: {
        amount: 2900,
        currency: 'usd',
        interval: 'month',
      },
    },
  });
});

export default router;
