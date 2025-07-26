// Stripe Webhook Handler
// This endpoint processes Stripe events like successful payments

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('✅ Payment successful for session:', session.id);
        
        // Extract metadata
        const { customer_email, metadata } = session;
        const plan = metadata?.plan || 'unknown';
        
        // TODO: Send welcome email
        // TODO: Grant access to purchased plan
        // TODO: Store purchase record
        
        console.log(`Customer ${customer_email} purchased ${plan} plan`);
        break;

      case 'customer.subscription.created':
        const subscription = event.data.object;
        console.log('📅 New subscription created:', subscription.id);
        break;

      case 'customer.subscription.updated':
        const updatedSub = event.data.object;
        console.log('🔄 Subscription updated:', updatedSub.id);
        break;

      case 'customer.subscription.deleted':
        const deletedSub = event.data.object;
        console.log('❌ Subscription cancelled:', deletedSub.id);
        
        // TODO: Revoke access
        // TODO: Send cancellation email
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        console.log('💰 Payment successful for invoice:', invoice.id);
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        console.log('⚠️ Payment failed for invoice:', failedInvoice.id);
        
        // TODO: Send payment failure notification
        // TODO: Handle grace period
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// Disable body parsing to receive raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
