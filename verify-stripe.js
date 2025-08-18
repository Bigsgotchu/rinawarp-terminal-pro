#!/usr/bin/env node

/**
 * Stripe API Key Verification Script
 * Tests if Stripe keys are working correctly
 */

import { config } from 'dotenv';
import Stripe from 'stripe';

// Load environment variables
config();

console.log('🧪 Testing Stripe Configuration...\n');

// Check if environment variables exist
const secretKey = process.env.STRIPE_SECRET_KEY;
const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

if (!secretKey) {
  console.log('❌ STRIPE_SECRET_KEY not found in environment variables');
  process.exit(1);
}

if (!publishableKey) {
  console.log('❌ STRIPE_PUBLISHABLE_KEY not found in environment variables');
  process.exit(1);
}

// Check key format
const isLiveSecret = secretKey.startsWith('sk_live_');
const isTestSecret = secretKey.startsWith('sk_test_');
const isLivePublishable = publishableKey.startsWith('pk_live_');
const isTestPublishable = publishableKey.startsWith('pk_test_');

console.log(
  `🔑 Secret Key: ${secretKey.substring(0, 12)}...${secretKey.substring(secretKey.length - 4)}`
);
console.log(
  `🔑 Publishable Key: ${publishableKey.substring(0, 12)}...${publishableKey.substring(publishableKey.length - 4)}`
);

if (isLiveSecret && isLivePublishable) {
  console.log('🟢 Using LIVE keys (production mode)');
} else if (isTestSecret && isTestPublishable) {
  console.log('🟡 Using TEST keys (development mode)');
} else {
  console.log(
    '⚠️  Key type mismatch - secret and publishable keys should both be live OR both be test'
  );
}

// Initialize Stripe
let stripe;
try {
  stripe = new Stripe(secretKey);
  console.log('✅ Stripe initialized successfully');
} catch (error) {
  console.log('❌ Failed to initialize Stripe:', error.message);
  process.exit(1);
}

// Test API connection
console.log('\n🔍 Testing API connection...');

try {
  // Test 1: Get account information
  const account = await stripe.accounts.retrieve();
  console.log(
    `✅ Account connected: ${account.business_profile?.name || account.email || account.id}`
  );

  // Test 2: List some prices to verify access
  const prices = await stripe.prices.list({ limit: 3 });
  console.log(`✅ API access verified - found ${prices.data.length} price(s)`);

  // Test 3: Check specific price IDs from environment
  const priceIds = [
    process.env.STRIPE_PRICE_PERSONAL_MONTHLY,
    process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
    process.env.STRIPE_PRICE_TEAM_MONTHLY,
  ].filter(Boolean);

  console.log('\n📋 Checking configured price IDs:');
  for (const priceId of priceIds) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      const amount = price.unit_amount ? price.unit_amount / 100 : 'N/A';
      console.log(
        `✅ ${priceId}: $${amount} ${price.currency?.toUpperCase() || ''} (${price.recurring ? 'recurring' : 'one-time'})`
      );
    } catch (priceError) {
      console.log(`❌ ${priceId}: ${priceError.message}`);
    }
  }

  console.log('\n🎉 All tests passed! Stripe is configured correctly.');
  console.log('\n💡 Next steps:');
  console.log('   • Restart your server: npm start');
  console.log('   • Test checkout on your website');
  console.log('   • Monitor transactions in Stripe Dashboard');
} catch (error) {
  console.log('❌ API test failed:', error.message);

  if (error.type === 'StripeAuthenticationError') {
    console.log('\n🔧 This is usually caused by:');
    console.log('   • Expired API key');
    console.log('   • Invalid API key');
    console.log('   • Key not activated in Stripe Dashboard');
    console.log('\n💡 Solution: Get fresh API keys from https://dashboard.stripe.com/apikeys');
  }

  process.exit(1);
}
