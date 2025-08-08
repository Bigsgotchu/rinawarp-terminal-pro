// Stripe Webhook Handler
// This endpoint processes Stripe events like successful payments

import logger from '../src/utilities/logger.js';
import Stripe from 'stripe';
import emailService from '../utils/smtp.js';
import database from '../database-service.js';

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
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    logger.error('⚠️  Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      logger.info('✅ Payment successful for session:', session.id);

      // Extract metadata
      const { customer_email, metadata } = session;
      const plan = metadata?.plan || 'unknown';

      // Send welcome email
      await emailService.sendEmail({
        to: customer_email,
        subject: 'Welcome to RinaWarp Terminal!',
        template: 'welcome',
        data: {
          plan,
          customerName: session.customer_details?.name || 'Developer',
        },
      });

      // Store purchase record and grant access
      await database.createCustomer({
        stripeCustomerId: session.customer,
        email: customer_email,
        plan,
        subscriptionId: session.subscription,
        status: 'active',
        createdAt: new Date(),
      });

      logger.info('Access granted and purchase recorded for:', customer_email);

      logger.info(`Customer ${customer_email} purchased ${plan} plan`);
      break;

    case 'customer.subscription.created':
      const subscription = event.data.object;
      logger.info('📅 New subscription created:', subscription.id);
      break;

    case 'customer.subscription.updated':
      const updatedSub = event.data.object;
      logger.info('🔄 Subscription updated:', updatedSub.id);
      break;

    case 'customer.subscription.deleted':
      const deletedSub = event.data.object;
      logger.info('❌ Subscription cancelled:', deletedSub.id);

      // Revoke access
      await database.updateCustomerStatus(deletedSub.customer, 'cancelled');

      // Send cancellation email
      const cancelCustomer = await database.getCustomerByStripeId(deletedSub.customer);
      if (cancelCustomer?.email) {
        await emailService.sendEmail({
          to: cancelCustomer.email,
          subject: 'Your subscription has been cancelled',
          template: 'cancellation',
          data: {
            customerName: cancelCustomer.name || 'Developer',
            plan: deletedSub.metadata?.plan || 'your plan',
          },
        });
      }
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      logger.info('💰 Payment successful for invoice:', invoice.id);
      break;

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      logger.info('⚠️ Payment failed for invoice:', failedInvoice.id);

      // Send payment failure notification
      const failedCustomer = await database.getCustomerByStripeId(failedInvoice.customer);
      if (failedCustomer?.email) {
        await emailService.sendEmail({
          to: failedCustomer.email,
          subject: 'Payment Failed - Action Required',
          template: 'payment-failed',
          data: {
            customerName: failedCustomer.name || 'Developer',
            amount: (failedInvoice.amount_due / 100).toFixed(2),
            currency: failedInvoice.currency.toUpperCase(),
            updatePaymentUrl: `${process.env.URL}/account/update-payment`,
          },
        });
      }

      // Handle grace period
      // Assuming a default grace period handler function
      const defaultGracePeriodDays = 5;
      await database.applyGracePeriod(failedInvoice.customer, defaultGracePeriodDays);
      break;

    default:
      logger.info(`ℹ️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// Disable body parsing to receive raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
