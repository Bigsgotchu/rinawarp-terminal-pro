/**
 * 🔐 Enhanced Stripe Checkout Router with Graceful Error Handling
 * Uses the new StripeService for better error management
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import stripeService from '../services/stripe-service.js';
import logger from '../utilities/logger.js';

const router = express.Router();

// Rate limiting for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 payment attempts per windowMs
  message: { 
    success: false,
    error: 'Too many payment attempts, please try again later.',
    retryAfter: '15 minutes'
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Too many API requests, please try again later.',
    retryAfter: '15 minutes'
  },
});

// Stripe service status endpoint
router.get('/status', apiLimiter, (req, res) => {
  const status = stripeService.getStatus();
  res.json({
    success: true,
    stripe: status,
    timestamp: new Date().toISOString(),
  });
});

// Get Stripe configuration endpoint (enhanced)
router.get('/config', apiLimiter, (req, res) => {
  try {
    const publishableKey = stripeService.getPublishableKey();
    
    if (!publishableKey) {
      return res.status(503).json({
        success: false,
        error: 'Payment system configuration incomplete',
        available: false,
      });
    }

    const pricing = stripeService.getPricingConfig();

    res.json({
      success: true,
      publishableKey,
      available: stripeService.isAvailable(),
      pricing,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('❌ Error getting Stripe config:', error);
    res.status(503).json({
      success: false,
      error: 'Payment system temporarily unavailable',
      available: false,
    });
  }
});

// Get pricing configuration endpoint
router.get('/pricing-config', apiLimiter, (req, res) => {
  try {
    const pricing = stripeService.getPricingConfig();
    
    res.json({
      success: true,
      pricing,
      available: stripeService.isAvailable(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('❌ Error getting pricing config:', error);
    res.status(503).json({
      success: false,
      error: 'Pricing information temporarily unavailable',
    });
  }
});

// Create checkout session endpoint (enhanced)
router.post('/create-checkout-session', paymentLimiter, async (req, res) => {
  try {
    // Check if Stripe service is available
    if (!stripeService.isAvailable()) {
      const status = stripeService.getStatus();
      return res.status(503).json({
        success: false,
        error: 'Payment system is currently unavailable. Please try again later.',
        details: status.error,
        canRetry: status.attempts < 3,
      });
    }

    const { plan, priceId, successUrl, cancelUrl, customerEmail, metadata } = req.body;

    // Enhanced input validation
    if (!plan && !priceId) {
      return res.status(400).json({
        success: false,
        error: 'Either plan or priceId is required',
        details: 'Please specify a plan name or direct price ID',
      });
    }

    // Get price ID from plan or use direct priceId
    let finalPriceId;
    let planName;

    if (priceId) {
      finalPriceId = priceId;
      planName = 'custom';
    } else {
      const pricing = stripeService.getPricingConfig();
      if (pricing[plan]) {
        finalPriceId = pricing[plan].price_id;
        planName = plan;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid plan specified',
          availablePlans: Object.keys(pricing),
        });
      }
    }

    // Validate URLs
    const baseUrl = req.headers.origin || process.env.BASE_URL || 'https://rinawarptech.com';
    const validatedSuccessUrl = successUrl || `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`;
    const validatedCancelUrl = cancelUrl || `${baseUrl}/pricing.html`;

    // Create checkout session data
    const sessionData = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: validatedSuccessUrl,
      cancel_url: validatedCancelUrl,
      metadata: {
        plan: planName,
        source: 'rinawarp_terminal',
        timestamp: new Date().toISOString(),
        ...metadata, // Allow additional metadata
      },
      customer_email: customerEmail || undefined,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      invoice_creation: {
        enabled: true,
      },
      // Enhanced configuration
      payment_method_collection: 'if_required',
      customer_creation: 'if_required',
      consent_collection: {
        terms_of_service: 'required',
      },
    };

    // Create checkout session using the service
    const session = await stripeService.createCheckoutSession(sessionData);

    logger.info(`✅ Checkout session created: ${session.id} for plan: ${planName}`);

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      plan: planName,
      priceId: finalPriceId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('❌ Enhanced checkout error:', error);

    // The service handles most error formatting, but add some additional context
    let errorResponse = {
      success: false,
      error: error.message || 'Payment system error. Please try again.',
      timestamp: new Date().toISOString(),
    };

    // Add debug info in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.debug = {
        type: error.type || 'Unknown',
        code: error.code || 'Unknown',
        original: error.message,
      };
    }

    // Set appropriate HTTP status
    let statusCode = 500;
    if (error.message.includes('not available') || error.message.includes('check configuration')) {
      statusCode = 503; // Service Unavailable
    } else if (error.message.includes('configuration error') || error.message.includes('contact support')) {
      statusCode = 502; // Bad Gateway (configuration issue)
    } else if (error.message.includes('Customer information') || error.message.includes('check your details')) {
      statusCode = 400; // Bad Request
    }

    res.status(statusCode).json(errorResponse);
  }
});

// Webhook endpoint with enhanced error handling
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    logger.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({
      success: false,
      error: 'Webhook endpoint not properly configured',
    });
  }

  let event;
  try {
    // Check if service is available
    if (!stripeService.isAvailable()) {
      logger.error('❌ Stripe service not available for webhook processing');
      return res.status(503).json({
        success: false,
        error: 'Payment service temporarily unavailable',
      });
    }

    event = stripeService.constructWebhookEvent(req.body, sig, endpointSecret);
  } catch (err) {
    logger.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).json({
      success: false,
      error: 'Webhook signature verification failed',
    });
  }

  // Handle the event with comprehensive error handling
  try {
    await handleWebhookEvent(event);
    
    logger.info(`✅ Webhook event handled successfully: ${event.type} - ${event.id}`);
    res.json({ 
      success: true, 
      received: true,
      eventId: event.id,
      type: event.type,
    });

  } catch (error) {
    logger.error(`❌ Error handling webhook event ${event.type}:`, error);
    
    // Still return 200 to prevent Stripe from retrying on our internal errors
    // but log the issue for investigation
    res.json({ 
      success: false, 
      received: true,
      error: 'Internal processing error',
      eventId: event.id,
    });
  }
});

// Manual retry endpoint for Stripe initialization
router.post('/retry-init', apiLimiter, async (req, res) => {
  try {
    await stripeService.retry();
    const status = stripeService.getStatus();
    
    res.json({
      success: true,
      message: 'Stripe initialization retry completed',
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('❌ Manual retry failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry Stripe initialization',
      details: error.message,
    });
  }
});

// Helper function for webhook event handling
async function handleWebhookEvent(event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionCancelled(event.data.object);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;

    default:
      logger.info(`ℹ️ Unhandled webhook event type: ${event.type}`);
  }
}

async function handleCheckoutCompleted(session) {
  try {
    logger.info('✅ Processing successful checkout:', session.id);
    
    // Track conversion in analytics (if available)
    try {
      const { default: AnalyticsSystem } = await import('../analytics/AnalyticsSystem.js');
      const analytics = new AnalyticsSystem();
      
      await analytics.trackConversion({
        type: 'subscription_purchase',
        value: session.amount_total / 100,
        currency: session.currency,
        sessionId: session.id,
        userId: session.customer || 'anonymous',
        properties: {
          plan: session.metadata?.plan,
          source: session.metadata?.source,
          timestamp: session.metadata?.timestamp,
        },
      });
    } catch (analyticsError) {
      logger.warn('⚠️ Analytics tracking failed:', analyticsError.message);
    }

    // Additional processing (email, database updates, etc.)
    // This would be implemented based on your specific requirements
    
  } catch (error) {
    logger.error('❌ Error handling checkout completion:', error);
    throw error;
  }
}

async function handlePaymentSucceeded(invoice) {
  logger.info('✅ Payment succeeded:', invoice.id);
  // Add payment success handling logic here
}

async function handleSubscriptionCancelled(subscription) {
  logger.info('⚠️ Subscription cancelled:', subscription.id);
  // Add cancellation handling logic here
}

async function handlePaymentFailed(invoice) {
  logger.warn('❌ Payment failed:', invoice.id);
  // Add payment failure handling logic here
}

async function handleSubscriptionUpdated(subscription) {
  logger.info('🔄 Subscription updated:', subscription.id);
  // Add subscription update handling logic here
}

export default router;
