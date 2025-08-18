/**
 * 🔐 Enhanced Stripe Service with Graceful Error Handling
 * Replaces the problematic process.exit(1) pattern with proper error management
 */

import Stripe from 'stripe';
import logger from '../utilities/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class StripeService {
  constructor() {
    this.stripe = null;
    this.isInitialized = false;
    this.initializationError = null;
    this.initializationAttempts = 0;
    this.maxRetries = 3;

    // Initialize on construction
    this.initialize();
  }

  /**
   * Initialize Stripe with enhanced error handling
   */
  async initialize() {
    try {
      this.initializationAttempts++;

      // Check for required environment variables
      const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
      const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY?.trim();

      if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY environment variable is required but not set');
      }

      if (!publishableKey) {
        logger.warn('⚠️ STRIPE_PUBLISHABLE_KEY not set - some client-side features may not work');
      }

      // Validate key format
      if (!this.isValidStripeKey(secretKey)) {
        throw new Error('STRIPE_SECRET_KEY format is invalid');
      }

      // Initialize Stripe
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16', // Use a specific API version
        timeout: 10000, // 10 second timeout
        maxNetworkRetries: 2,
      });

      // Test the connection with a lightweight API call
      await this.testConnection();

      this.isInitialized = true;
      this.initializationError = null;

      logger.info('✅ Stripe service initialized successfully');
    } catch (error) {
      this.initializationError = error;
      this.isInitialized = false;

      logger.error(
        `❌ Stripe initialization failed (attempt ${this.initializationAttempts}/${this.maxRetries}):`,
        error.message
      );

      // Don't crash the app - instead set a flag and log the error
      if (this.initializationAttempts < this.maxRetries) {
        logger.info('🔄 Retrying Stripe initialization in 5 seconds...');
        setTimeout(() => this.initialize(), 5000);
      } else {
        logger.error(
          '🚨 Stripe service failed to initialize after maximum retries. Payment features will be disabled.'
        );
      }
    }
  }

  /**
   * Test Stripe connection with a lightweight API call
   */
  async testConnection() {
    try {
      // Use account retrieve as a lightweight test
      await this.stripe.accounts.retrieve();
    } catch (error) {
      if (error.type === 'StripePermissionError') {
        // This is expected for restricted keys, but means connection is working
        logger.info('🔑 Stripe connection verified (restricted key permissions)');
        return;
      }
      throw new Error(`Stripe connection test failed: ${error.message}`);
    }
  }

  /**
   * Validate Stripe key format
   */
  isValidStripeKey(key) {
    if (!key || typeof key !== 'string') return false;

    // Check for common Stripe key patterns
    const patterns = [
      /^sk_test_[a-zA-Z0-9]{99}$/, // Test secret key
      /^sk_live_[a-zA-Z0-9]{99}$/, // Live secret key
      /^rk_test_[a-zA-Z0-9]{99}$/, // Restricted test key
      /^rk_live_[a-zA-Z0-9]{99}$/, // Restricted live key
    ];

    return patterns.some(pattern => pattern.test(key));
  }

  /**
   * Get Stripe instance with initialization check
   */
  getStripe() {
    if (!this.isInitialized) {
      throw new Error(
        'Stripe service not initialized. ' +
          (this.initializationError
            ? `Error: ${this.initializationError.message}`
            : 'Unknown error')
      );
    }
    return this.stripe;
  }

  /**
   * Check if Stripe is available
   */
  isAvailable() {
    return this.isInitialized && this.stripe !== null;
  }

  /**
   * Get initialization status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      attempts: this.initializationAttempts,
      error: this.initializationError?.message || null,
      available: this.isAvailable(),
    };
  }

  /**
   * Force retry initialization
   */
  async retry() {
    logger.info('🔄 Manually retrying Stripe initialization...');
    this.initializationAttempts = 0; // Reset attempt counter
    await this.initialize();
  }

  /**
   * Safe method to create checkout session
   */
  async createCheckoutSession(sessionData) {
    if (!this.isAvailable()) {
      throw new Error('Stripe service is not available. Please check configuration and try again.');
    }

    try {
      return await this.stripe.checkout.sessions.create(sessionData);
    } catch (error) {
      // Enhanced error handling for specific Stripe errors
      if (error.type === 'StripeInvalidRequestError') {
        if (error.message.includes('price')) {
          throw new Error('Price configuration error. Please contact support.');
        } else if (error.message.includes('customer')) {
          throw new Error('Customer information error. Please check your details.');
        }
      } else if (error.type === 'StripeAPIError') {
        throw new Error(
          'Payment service temporarily unavailable. Please try again in a few minutes.'
        );
      } else if (error.type === 'StripeConnectionError') {
        throw new Error(
          'Unable to connect to payment service. Please check your internet connection.'
        );
      } else if (error.type === 'StripeAuthenticationError') {
        throw new Error('Payment service authentication failed. Please contact support.');
      }

      // Re-throw with original message if no specific handling
      throw error;
    }
  }

  /**
   * Safe method to construct webhook event
   */
  constructWebhookEvent(body, signature, secret) {
    if (!this.isAvailable()) {
      throw new Error('Stripe service is not available for webhook processing.');
    }

    try {
      return this.stripe.webhooks.constructEvent(body, signature, secret);
    } catch (error) {
      throw new Error(`Webhook verification failed: ${error.message}`);
    }
  }

  /**
   * Get publishable key for client-side use
   */
  getPublishableKey() {
    return process.env.STRIPE_PUBLISHABLE_KEY?.trim() || null;
  }

  /**
   * Get pricing configuration with environment-based overrides
   */
  getPricingConfig() {
    return {
      // Personal Plan (🐟 Reef Explorer - $15/month)
      personal: {
        name: '🐟 Reef Explorer',
        price_id: process.env.STRIPE_PRICE_PERSONAL_MONTHLY || 'price_1RlLBwG2ToGP7ChnhstisPz0',
        price: 15.0,
        features: [
          'AI Terminal Assistant',
          'Basic Voice Commands',
          '5 Custom Themes',
          'Email Support',
        ],
      },
      // Professional Plan (🧜‍♀️ Mermaid Pro - $25/month) ⭐ POPULAR
      professional: {
        name: '🧜‍♀️ Mermaid Pro',
        price_id: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || 'price_1RlLC4G2ToGP7ChndbHLotM7',
        price: 25.0,
        features: [
          'Everything in Personal',
          'Advanced AI Features',
          'Full Voice Control Suite',
          'Unlimited Themes',
          'Priority Support',
          'Team Collaboration',
        ],
        recommended: true,
      },
      // Team Plan (🌊 Ocean Fleet - $35/month)
      team: {
        name: '🌊 Ocean Fleet',
        price_id: process.env.STRIPE_PRICE_TEAM_MONTHLY || 'price_1RlLCEG2ToGP7ChnZa5Px0ow',
        price: 35.0,
        features: [
          'Everything in Professional',
          'Team Management',
          'Advanced Collaboration',
          'Custom Integrations',
          'Enhanced Security',
        ],
      },
      // Enterprise Plan
      enterprise: {
        name: 'Enterprise',
        price_id: process.env.STRIPE_PRICE_ENTERPRISE || 'price_1Rp0a9G2ToGP7ChnKvoEStKW',
        price: 99.0,
        features: [
          'Everything in Team',
          'SSO & Advanced Security',
          'Dedicated Account Manager',
          'Custom Training & Onboarding',
          'SLA Guarantee',
        ],
      },
      // Legacy aliases for backward compatibility
      basic: {
        name: 'Basic (Legacy)',
        price_id: process.env.STRIPE_PRICE_PERSONAL_MONTHLY || 'price_1RlLBwG2ToGP7ChnhstisPz0',
        price: 15.0,
        features: ['Redirects to Personal plan'],
      },
      pro: {
        name: 'Pro (Legacy)',
        price_id: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || 'price_1RlLC4G2ToGP7ChndbHLotM7',
        price: 25.0,
        features: ['Redirects to Professional plan'],
      },
    };
  }
}

// Create singleton instance
const stripeService = new StripeService();

export default stripeService;
