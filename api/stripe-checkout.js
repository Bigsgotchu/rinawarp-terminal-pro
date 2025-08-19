import logger from './utils/logger.js';
import express from 'express';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_51234567890abcdef'); // Replace with your actual secret key

const app = express();
app.use(express.json());

// CORS middleware for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Create checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { plan, price } = req.body;

    // Price IDs for different plans (replace with your actual price IDs from Stripe)
    const priceMap = {
      professional: 'price_1234567890abcdef', // Replace with your actual price ID
      enterprise: 'price_0987654321fedcba', // Replace with your actual price ID
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceMap[plan] || price,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/#pricing`,
      metadata: {
        plan: plan,
      },
    });

    res.json({ id: session.id });
  } catch (error) {
    logger.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint for Stripe events
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.info(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      logger.info('Payment was successful!', session);
      // TODO: Provision the service (e.g., create account, send license key)
      break;
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      logger.info('Subscription payment succeeded:', invoice);
      break;
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      logger.info('Subscription cancelled:', subscription);
      break;
    default:
      logger.info(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Stripe checkout API server running on port ${PORT}`);
});

export default app;
