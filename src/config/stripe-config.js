// Stripe Configuration for RinaWarp Terminal
// This file contains all the correct Stripe price IDs for production use

export const STRIPE_CONFIG = {
  // Test mode keys (for development)
  testPublishableKey: '{{REDACTED_SECRET}}',

  // Live mode keys (for production)
  livePublishableKey: '{{REDACTED_SECRET}}',

  // Monthly subscription prices
  prices: {
    // Main subscription tiers
    personal: {
      priceId: 'price_1RlLBwG2ToGP7ChnhstisPz0',
      productId: 'prod_Sgic0VtP9C5QgV',
      name: 'Reef Explorer',
      amount: 15,
      interval: 'month',
    },
    professional: {
      priceId: 'price_1RlLC4G2ToGP7ChndbHLotM7',
      productId: 'prod_SgicVo4VlnL12z',
      name: 'Mermaid Pro',
      amount: 25,
      interval: 'month',
    },
    team: {
      priceId: 'price_1RlLCEG2ToGP7ChnZa5Px0ow',
      productId: 'prod_SgidEHqlQDwHFu',
      name: 'Ocean Fleet',
      amount: 35,
      interval: 'month',
    },
    enterprise: {
      priceId: 'price_1Rp0a9G2ToGP7ChnKvoEStKW',
      productId: 'prod_SkVZMu3wvV6P6R',
      name: 'Enterprise Navigator',
      amount: 99,
      interval: 'month',
      note: 'Currently set to $299 in Stripe, needs update to $99',
    },
  },

  // Beta one-time purchase prices
  betaPrices: {
    earlybird: {
      priceId: 'price_1Rp8O5G2ToGP7ChnenRdFKyi',
      productId: 'prod_SkddQecpwRH1XE',
      name: 'Early Bird Beta',
      amount: 29,
      type: 'one_time',
    },
    beta: {
      priceId: 'price_1Rp8OHG2ToGP7ChnZxNr7sqz',
      productId: 'prod_SkdeQs8PEdzGLl',
      name: 'Beta Access',
      amount: 39,
      type: 'one_time',
    },
    premium: {
      priceId: 'price_1Rp8OSG2ToGP7ChnXMUEevfi',
      productId: 'prod_SkdeV7fCDU4UOe',
      name: 'Premium Beta',
      amount: 59,
      type: 'one_time',
    },
  },

  // Payment Links (backup method)
  paymentLinks: {
    personal: 'https://buy.stripe.com/14k6sU0b10Gk7V68wF',
    professional: 'https://buy.stripe.com/6oE2cEeTT0Gk3EC8wG',
    team: 'https://buy.stripe.com/28o7wY6zp5WA81c6oz',
  },

  // Webhook endpoint secret (needs to be set in environment)
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',

  // Success and cancel URLs
  urls: {
    success: 'https://rinawarptech.com/success.html',
    cancel: 'https://rinawarptech.com/pricing.html',
  },
};

// Helper function to get the correct Stripe key based on environment
export function getStripePublishableKey() {
  const isProduction = window.location.hostname === 'rinawarptech.com';
  return isProduction ? STRIPE_CONFIG.livePublishableKey : STRIPE_CONFIG.testPublishableKey;
}

// Helper function to get price ID by plan type
export function getPriceId(planType) {
  // Check regular prices
  if (STRIPE_CONFIG.prices[planType]) {
    return STRIPE_CONFIG.prices[planType].priceId;
  }

  // Check beta prices
  const betaType = planType.replace('beta-', '');
  if (STRIPE_CONFIG.betaPrices[betaType]) {
    return STRIPE_CONFIG.betaPrices[betaType].priceId;
  }

  return null;
}

// Export for use in other files
export default STRIPE_CONFIG;
