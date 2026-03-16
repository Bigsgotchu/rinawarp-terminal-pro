// RinaWarp Terminal Pro - Active Payment Links
// Updated: 2026-03-11
// Prices match https://rinawarptech.com/pricing

const STRIPE_PAYMENT_LINKS = {
  // Monthly Plans
  'pro': {
    url: 'https://buy.stripe.com/3cI6oH2TYeZce7A7vJ0480h',
    price: '$29/month',
    description: 'Execute fixes, High-impact actions, Streaming execution, Verification & audit exports, Priority System Doctor',
    active: true
  },
  'creator': {
    url: 'https://buy.stripe.com/6oU28rcuy6sG3sWcQ30480i',
    price: '$69/month',
    description: 'Everything in Pro + Advanced workflows, More execution context',
    active: true
  },
  'team': {
    url: 'https://buy.stripe.com/fZu3cv8eicR48NgcQ30480j',
    price: '$99/month',
    description: 'Everything in Creator + Team-ready workflows, Priority support',
    active: true
  },
  
  // Lifetime Plans (tiered, limited quantity)
  // NOTE: Enforce limits server-side before sending users to Stripe.
  'lifetime': {
    tiers: [
      {
        key: 'founder-100',
        url: 'https://buy.stripe.com/bJe5kDgKObN0e7A7vJ0480k',
        price: '$699 one-time',
        description: 'Founder Lifetime (first 100)',
        limit: 100,
        active: true
      },
      {
        key: 'pioneer-200',
        url: 'REPLACE_WITH_899_LIFETIME_LINK',
        price: '$899 one-time',
        description: 'Pioneer Lifetime (next 200)',
        limit: 200,
        active: false
      },
      {
        key: 'legacy-200',
        url: 'REPLACE_WITH_999_LIFETIME_LINK',
        price: '$999 one-time',
        description: 'Legacy Lifetime (last 200)',
        limit: 200,
        active: false
      }
    ]
  }
};

// Export for use in pricing page
if (typeof module !== 'undefined' && module.exports) {
  module.exports = STRIPE_PAYMENT_LINKS;
}
