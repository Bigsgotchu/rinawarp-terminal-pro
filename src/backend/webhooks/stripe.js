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
    console.log('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
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
        console.log(`Unhandled event type ${event.type}`);
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
      console.log(`Updated subscription for user ${userId} to ${tier}`);
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
      console.log(`Downgraded user ${userId} to free tier`);
    }
  } catch (error) {
    console.error('Failed to handle subscription cancellation:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  try {
    console.log(`Payment succeeded for invoice ${invoice.id}`);
    // Add any payment success logic here
  } catch (error) {
    console.error('Failed to handle payment success:', error);
  }
}

async function handlePaymentFailed(invoice) {
  try {
    console.log(`Payment failed for invoice ${invoice.id}`);
    // Add payment failure handling (notifications, grace period, etc.)
  } catch (error) {
    console.error('Failed to handle payment failure:', error);
  }
}

function getTierFromPrice(priceId) {
  const priceTierMap = {
    price_personal: 'personal',
    price_professional: 'professional',
    price_team: 'team',
    price_enterprise: 'enterprise',
  };
  return priceTierMap[priceId] || 'free';
}

module.exports = router;
