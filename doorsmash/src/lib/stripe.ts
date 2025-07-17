/**
 * doorsmash - Elite Dating Platform
 * Stripe payment processing utilities
 * Copyright (c) 2024 rinawarp Technologies, LLC
 * All rights reserved.
 */

import Stripe from 'stripe';
import { db } from './database';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export const MINIMUM_PAYMENT_AMOUNT = parseInt(process.env.MINIMUM_PAYMENT_AMOUNT || '100');

export interface PaymentIntentData {
  amount: number;
  currency: string;
  userId: string;
  description?: string;
  metadata?: Record<string, string>;
}

export const payment = {
  // Create payment intent for user registration
  async createPaymentIntent(data: PaymentIntentData) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: data.amount * 100, // Convert to cents
        currency: data.currency.toLowerCase(),
        metadata: {
          userId: data.userId,
          ...data.metadata,
        },
        description: data.description || 'doorsmash Premium Membership',
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Save payment record to database
      await db.createPayment({
        user_id: data.userId,
        amount: data.amount,
        currency: data.currency,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
        description: data.description || 'Premium Membership',
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  },

  // Handle successful payment
  async handleSuccessfulPayment(paymentIntentId: string) {
    try {
      // Get payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        const userId = paymentIntent.metadata.userId;

        // Update payment record
        await db.updatePayment(paymentIntentId, {
          status: 'completed',
        });

        // Update user to premium status
        await db.updateUser(userId, {
          is_premium: true,
          subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        });

        return { success: true };
      }
    } catch (error) {
      console.error('Error handling successful payment:', error);
      throw new Error('Failed to process payment');
    }
  },

  // Handle failed payment
  async handleFailedPayment(paymentIntentId: string) {
    try {
      await db.updatePayment(paymentIntentId, {
        status: 'failed',
      });
    } catch (error) {
      console.error('Error handling failed payment:', error);
    }
  },

  // Validate minimum payment amount
  validatePaymentAmount(amount: number): boolean {
    return amount >= MINIMUM_PAYMENT_AMOUNT;
  },

  // Get payment history for user
  async getUserPayments(userId: string) {
    try {
      const { data, error } = await db.supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user payments:', error);
      throw new Error('Failed to fetch payment history');
    }
  },

  // Create subscription for recurring payments (optional feature)
  async createSubscription(userId: string, priceId: string) {
    try {
      const user = await db.getUserById(userId);

      // Create or retrieve customer
      let customer = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      let customerId: string;
      if (customer.data.length > 0) {
        customerId = customer.data[0].id;
      } else {
        const newCustomer = await stripe.customers.create({
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          metadata: {
            userId: userId,
          },
        });
        customerId = newCustomer.id;
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      return {
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }
  },

  // Cancel subscription
  async cancelSubscription(subscriptionId: string) {
    try {
      await stripe.subscriptions.cancel(subscriptionId);
      return { success: true };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  },

  // Process refund
  async processRefund(paymentIntentId: string, amount?: number) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? amount * 100 : undefined, // Convert to cents if specified
      });

      // Update payment record
      await db.updatePayment(paymentIntentId, {
        status: 'refunded',
      });

      return refund;
    } catch (error) {
      console.error('Error processing refund:', error);
      throw new Error('Failed to process refund');
    }
  },
};

// Webhook handler for Stripe events
export async function handleStripeWebhook(body: string, signature: string) {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await payment.handleSuccessfulPayment(paymentIntent.id);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      await payment.handleFailedPayment(failedPayment.id);
      break;

    case 'invoice.payment_succeeded':
      // Handle successful subscription payment
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const userId = subscription.metadata.userId;
        if (userId) {
          await db.updateUser(userId, {
            is_premium: true,
            subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
          });
        }
      }
      break;

    case 'invoice.payment_failed':
      // Handle failed subscription payment
      const failedInvoice = event.data.object as Stripe.Invoice;
      console.log('Subscription payment failed:', failedInvoice.id);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return { received: true };
}
