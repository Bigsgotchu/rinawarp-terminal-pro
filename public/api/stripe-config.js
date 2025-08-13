// Simple Stripe Configuration API Endpoint
// Returns configuration for the frontend to use

const STRIPE_CONFIG = {
  publishableKey: '{{REDACTED_SECRET}}',
  
  prices: {
    personal: 'price_1RlLBwG2ToGP7ChnhstisPz0',
    professional: 'price_1RlLC4G2ToGP7ChndbHLotM7', 
    team: 'price_1RlLCEG2ToGP7ChnZa5Px0ow',
    enterprise: 'price_1Rp0a9G2ToGP7ChnKvoEStKW'
  },
  
  betaPrices: {
    earlybird: 'price_1Rp8O5G2ToGP7ChnenRdFKyi',
    beta: 'price_1Rp8OHG2ToGP7ChnZxNr7sqz', 
    premium: 'price_1Rp8OSG2ToGP7ChnXMUEevfi'
  }
};

// Export as JSON for frontend consumption
if (typeof window === 'undefined') {
  // Node.js environment
  module.exports = STRIPE_CONFIG;
} else {
  // Browser environment
  window.STRIPE_CONFIG = STRIPE_CONFIG;
}
