/**
 * Unified Stripe Checkout System
 * Replaces multiple conflicting checkout implementations
 */

import logger from '../utilities/logger.js';
import dotenv from 'dotenv';
import express from 'express';
import Stripe from 'stripe';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

const router = express.Router();

// Initialize Stripe with proper error handling
if (!process.env.STRIPE_SECRET_KEY) {
  logger.error('❌ STRIPE_SECRET_KEY environment variable is required');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Rate limiting for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 payment attempts per windowMs
  message: { error: 'Too many payment attempts, please try again later.' },
});

// Simplified pricing structure (3 tiers)
const PRICING_CONFIG = {
  basic: {
    name: 'Basic',
    price_id: process.env.STRIPE_PRICE_BASIC || 'price_basic_monthly',
    price: 29.0,
    features: ['AI Terminal Assistant', 'Basic Voice Commands', '5 Custom Themes', 'Email Support'],
  },
  pro: {
    name: 'Professional',
    price_id: process.env.STRIPE_PRICE_PRO || 'price_pro_monthly',
    price: 99.0,
    features: [
      'Everything in Basic',
      'Advanced AI Features',
      'Full Voice Control Suite',
      'Unlimited Themes',
      'Priority Support',
      'Team Collaboration',
    ],
    recommended: true,
  },
  enterprise: {
    name: 'Enterprise',
    price_id: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_monthly',
    price: 299.0,
    features: [
      'Everything in Pro',
      'Custom Integrations',
      'SSO & Advanced Security',
      'Dedicated Account Manager',
      'Custom Training & Onboarding',
      'SLA Guarantee',
    ],
  },
};

// Create checkout session endpoint
router.post('/create-checkout-session', paymentLimiter, async (req, res) => {
  try {
    const { plan, priceId, successUrl, cancelUrl } = req.body;

    // Validate input
    if (!plan && !priceId) {
      return res.status(400).json({
        success: false,
        error: 'Plan or priceId is required',
      });
    }

    // Get price ID from plan or use direct priceId
    let finalPriceId;
    let planName;

    if (priceId) {
      finalPriceId = priceId;
      planName = 'custom';
    } else if (PRICING_CONFIG[plan]) {
      finalPriceId = PRICING_CONFIG[plan].price_id;
      planName = plan;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan specified',
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url:
        successUrl ||
        `${req.headers.origin || 'https://rinawarptech.com'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.origin || 'https://rinawarptech.com'}/pricing.html`,
      metadata: {
        plan: planName,
        source: 'rinawarp_terminal',
        timestamp: new Date().toISOString(),
      },
      customer_email: req.body.customer_email || undefined,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      invoice_creation: {
        enabled: true,
      },
    });

    logger.info(`✅ Checkout session created: ${session.id} for plan: ${planName}`);

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      plan: planName,
    });
  } catch (error) {
    logger.error('❌ Stripe checkout error:', error);

    // Handle specific Stripe errors
    let errorMessage = 'Payment system error. Please try again.';

    if (error.type === 'StripeInvalidRequestError') {
      if (error.message.includes('price')) {
        errorMessage = 'Price configuration error. Please contact support.';
      } else if (error.message.includes('customer')) {
        errorMessage = 'Customer information error. Please check your details.';
      }
    } else if (error.type === 'StripeAPIError') {
      errorMessage = 'Payment service temporarily unavailable. Please try again in a few minutes.';
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Get pricing configuration endpoint
router.get('/pricing-config', (req, res) => {
  res.json({
    success: true,
    pricing: PRICING_CONFIG,
  });
});

// Get Stripe configuration endpoint
router.get('/config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    success: true,
  });
});

// Webhook endpoint for Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        logger.info('✅ Payment successful:', session.id, 'Plan:', session.metadata.plan);

        // Provision service, send welcome email, update user account
        await handleSuccessfulPayment(session);
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        logger.info('✅ Subscription payment succeeded:', invoice.id);
        break;

      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        logger.info('⚠️ Subscription cancelled:', subscription.id);

        // Handle subscription cancellation
        await handleSubscriptionCancelled(subscription);
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        logger.info('❌ Payment failed:', failedInvoice.id);

        // Handle failed payment, send notification
        await handleFailedPayment(failedInvoice);
        break;

      default:
        logger.info(`ℹ️ Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    logger.error('❌ Error handling webhook event:', error);
    return res.status(500).json({ error: 'Webhook handler error' });
  }

  res.json({ received: true });
});

// Helper functions for webhook handling
async function handleSuccessfulPayment(session) {
  try {
    // Track conversion in analytics
    logger.info('📊 Tracking conversion for session:', session.id);

    // Track successful conversion in analytics
    const { default: AnalyticsSystem } = await import('../analytics/AnalyticsSystem.js');
    const analytics = new AnalyticsSystem();

    await analytics.trackConversion({
      type: 'subscription_purchase',
      value: session.amount_total / 100,
      currency: session.currency,
      sessionId: session.id,
      userId: session.customer || 'anonymous',
      properties: {
        plan: session.metadata.plan,
        source: session.metadata.source,
        timestamp: session.metadata.timestamp,
      },
    });

    // Send welcome email
    const emailService = require('../utils/smtp.js');
    await emailService.sendEmail({
      to: session.customer_email,
      subject: 'Welcome to RinaWarp Terminal!',
      template: 'welcome',
      data: {
        plan: session.metadata.plan,
        customerName: session.customer_details?.name || 'Developer',
      },
    });

    // Store customer information
    const database = require('../database-service.js');
    await database.createCustomer({
      stripeCustomerId: session.customer,
      email: session.customer_email,
      plan: session.metadata.plan,
      subscriptionId: session.subscription,
      status: 'active',
      createdAt: new Date(),
    });
  } catch (error) {
    logger.error('Error handling successful payment:', error);
  }
}

async function handleSubscriptionCancelled(subscription) {
  try {
    // Revoke access
    const database = require('../database-service.js');
    await database.updateCustomerStatus(subscription.customer, 'cancelled');

    // Send cancellation email
    const emailService = require('../utils/smtp.js');
    const customer = await database.getCustomerByStripeId(subscription.customer);
    if (customer?.email) {
      await emailService.sendEmail({
        to: customer.email,
        subject: 'Your RinaWarp Terminal subscription has been cancelled',
        template: 'cancellation',
        data: {
          customerName: customer.name || 'Developer',
          plan: subscription.metadata?.plan || 'your plan',
        },
      });
    }
  } catch (error) {
    logger.error('Error handling subscription cancellation:', error);
  }
}

async function handleFailedPayment(invoice) {
  try {
    // Send payment failure notification
    const emailService = require('../utils/smtp.js');
    const database = require('../database-service.js');
    const customer = await database.getCustomerByStripeId(invoice.customer);

    if (customer?.email) {
      await emailService.sendEmail({
        to: customer.email,
        subject: 'Payment Failed - Action Required',
        template: 'payment-failed',
        data: {
          customerName: customer.name || 'Developer',
          amount: (invoice.amount_due / 100).toFixed(2),
          currency: invoice.currency.toUpperCase(),
          updatePaymentUrl: `${process.env.URL}/account/update-payment`,
        },
      });
    }
  } catch (error) {
    logger.error('Error handling failed payment:', error);
  }
}

export default router;
export { PRICING_CONFIG };
