import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Product and Price configurations
const STRIPE_CONFIG = {
  products: {
    professional: {
      name: 'RinaWarp Terminal Professional',
      description: 'Advanced terminal with AI features, voice control, and priority support',
      price_id: process.env.STRIPE_PROFESSIONAL_PRICE_ID, // Set in environment
      amount: 2900, // $29.00 in cents
      currency: 'usd',
      interval: 'month',
    },
  },

  // Success and cancel URLs
  urls: {
    success: process.env.FRONTEND_URL + '/success?session_id={CHECKOUT_SESSION_ID}',
    cancel: process.env.FRONTEND_URL + '/pricing?cancelled=true',
  },

  // Customer portal settings
  portal: {
    configuration: process.env.STRIPE_PORTAL_CONFIG_ID,
    return_url: process.env.FRONTEND_URL + '/account',
  },
};

/**
 * Create a Stripe checkout session for Professional tier
 */
async function createCheckoutSession(customerId = null) {
  try {
    const sessionConfig = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: STRIPE_CONFIG.products.professional.price_id,
          quantity: 1,
        },
      ],
      success_url: STRIPE_CONFIG.urls.success,
      cancel_url: STRIPE_CONFIG.urls.cancel,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: {
        enabled: true,
      },

      // Subscription configuration
      subscription_data: {
        metadata: {
          tier: 'professional',
          source: 'website_checkout',
        },
      },

      // Metadata for tracking
      metadata: {
        tier: 'professional',
        source: 'website',
      },
    };

    // If existing customer, add customer ID
    if (customerId) {
      sessionConfig.customer = customerId;
    } else {
      sessionConfig.customer_creation = 'always';
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Create customer portal session for subscription management
 */
async function createPortalSession(customerId, returnUrl = null) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || STRIPE_CONFIG.urls.success,
      configuration: STRIPE_CONFIG.portal.configuration,
    });

    return session;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
}

/**
 * Retrieve customer subscription information
 */
async function getCustomerSubscription(customerId) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
    });

    // Find active RinaWarp subscription
    const activeSubscription = subscriptions.data.find(
      sub => ['active', 'trialing'].includes(sub.status) && sub.metadata.tier === 'professional'
    );

    return {
      subscription: activeSubscription,
      all_subscriptions: subscriptions.data,
    };
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    throw error;
  }
}

/**
 * Handle Stripe webhook events
 */
async function handleWebhookEvent(event) {
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        return await handleCheckoutCompleted(event.data.object);

      case 'customer.subscription.created':
        return await handleSubscriptionCreated(event.data.object);

      case 'customer.subscription.updated':
        return await handleSubscriptionUpdated(event.data.object);

      case 'customer.subscription.deleted':
        return await handleSubscriptionDeleted(event.data.object);

      case 'invoice.payment_succeeded':
        return await handlePaymentSucceeded(event.data.object);

      case 'invoice.payment_failed':
        return await handlePaymentFailed(event.data.object);

      default:
        console.log(`Unhandled event type: ${event.type}`);
        return { received: true };
    }
  } catch (error) {
    console.error('Error handling webhook:', error);
    throw error;
  }
}

import { getAnalyticsService } from '../services/analytics.js';

const analytics = getAnalyticsService();

async function handleCheckoutCompleted(session) {
  console.log('Checkout completed:', session.id);

  // Track conversion in analytics
  await analytics.trackConversion(
    session.customer || session.client_reference_id,
    session.subscription,
    session.amount_total,
    session.currency?.toUpperCase() || 'USD'
  );

  // Update user record with subscription details
  // This would integrate with your user database
  const customerData = {
    stripe_customer_id: session.customer,
    subscription_id: session.subscription,
    tier: 'professional',
    status: 'active',
  };

  // TODO: Update user database
  // await updateUserSubscription(session.customer_email, customerData);

  return { processed: true };
}

async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id);

  // Track subscription creation
  await analytics.trackGA4Event(subscription.customer, 'subscription_created', {
    subscription_id: subscription.id,
    plan: subscription.items.data[0]?.price?.nickname || 'professional',
    amount: subscription.items.data[0]?.price?.unit_amount || 2900,
    interval: subscription.items.data[0]?.price?.recurring?.interval || 'month',
    tier: subscription.metadata.tier || 'professional',
  });

  // Generate download links and send welcome email
  const tier = subscription.metadata.tier || 'professional';

  // TODO: Send welcome email with download links
  // await sendWelcomeEmail(subscription.customer, tier);

  return { processed: true };
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id);

  // Handle tier changes, billing updates, etc.
  // TODO: Update user permissions in application

  return { processed: true };
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription cancelled:', subscription.id);

  // Track cancellation
  await analytics.trackCancellation(
    subscription.customer,
    subscription.id,
    subscription.cancellation_details?.reason || 'unknown',
    subscription.cancellation_details?.comment || ''
  );

  // Revoke access to Professional features
  // TODO: Update user tier to 'free'
  // await updateUserTier(subscription.customer, 'free');

  return { processed: true };
}

async function handlePaymentSucceeded(invoice) {
  console.log('Payment succeeded:', invoice.id);

  // Ensure continued access to Professional features
  return { processed: true };
}

async function handlePaymentFailed(invoice) {
  console.log('Payment failed:', invoice.id);

  // Handle dunning logic, send notification emails
  // TODO: Implement grace period logic

  return { processed: true };
}

export {
  stripe,
  STRIPE_CONFIG,
  createCheckoutSession,
  createPortalSession,
  getCustomerSubscription,
  handleWebhookEvent,
};
