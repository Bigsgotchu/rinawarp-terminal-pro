#!/usr/bin/env node

/*
 * 🧜‍♀️ RinaWarp Terminal - Stripe Price Verification
 * Checks if Stripe price IDs match consolidated pricing structure
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  pink: '\x1b[95m',
};

function log(message, color = 'cyan') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function warn(message) {
  console.log(`${colors.yellow}⚠️ ${message}${colors.reset}`);
}

function error(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function verifyStripePricing() {
  log('🧜‍♀️ Verifying Stripe price configuration...', 'pink');

  // Load environment variables
  const envPath = path.join(__dirname, '../.env');
  const envPrices = {};

  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');

    envLines.forEach(line => {
      const [key, value] = line.split('=');
      if (key && key.includes('STRIPE_PRICE')) {
        envPrices[key] = value;
      }
    });
  } catch (err) {
    error(`Failed to read .env file: ${err.message}`);
    return;
  }

  // Load Stripe config from API
  const stripeConfigPath = path.join(__dirname, '../public/api/stripe-config.js');
  const configPrices = {};

  try {
    const configContent = fs.readFileSync(stripeConfigPath, 'utf8');
    const priceMatches = configContent.match(/personal: '([^']+)'/);
    const profMatches = configContent.match(/professional: '([^']+)'/);
    const teamMatches = configContent.match(/team: '([^']+)'/);

    if (priceMatches) configPrices.personal = priceMatches[1];
    if (profMatches) configPrices.professional = profMatches[1];
    if (teamMatches) configPrices.team = teamMatches[1];
  } catch (err) {
    error(`Failed to read stripe-config.js: ${err.message}`);
    return;
  }

  // Master pricing structure
  const MASTER_PRICING = {
    personal: {
      name: '🐟 Reef Explorer',
      price: '$15/month',
      envKey: 'STRIPE_PRICE_PERSONAL_MONTHLY',
      expectedPrice: 'price_1RlLBwG2ToGP7ChnhstisPz0',
    },
    professional: {
      name: '🧜‍♀️ Mermaid Pro',
      price: '$25/month',
      envKey: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
      expectedPrice: 'price_1RlLC4G2ToGP7ChndbHLotM7',
      popular: true,
    },
    team: {
      name: '🌊 Ocean Fleet',
      price: '$35/month',
      envKey: 'STRIPE_PRICE_TEAM_MONTHLY',
      expectedPrice: 'price_1RlLCEG2ToGP7ChnZa5Px0ow',
    },
  };

  console.log('\n🔍 STRIPE PRICE VERIFICATION RESULTS:\n');

  let allMatch = true;

  // Check each pricing tier
  Object.entries(MASTER_PRICING).forEach(([tier, config]) => {
    console.log(`${config.name} ${config.popular ? '⭐' : ''}`);
    console.log(`   💰 Price: ${config.price}`);

    // Check .env file
    const envPrice = envPrices[config.envKey];
    if (envPrice === config.expectedPrice) {
      success(`   ✓ .env matches: ${envPrice}`);
    } else {
      error(`   ✗ .env mismatch: ${envPrice} ≠ ${config.expectedPrice}`);
      allMatch = false;
    }

    // Check config file
    const configPrice = configPrices[tier];
    if (configPrice === config.expectedPrice) {
      success(`   ✓ stripe-config.js matches: ${configPrice}`);
    } else {
      error(`   ✗ stripe-config.js mismatch: ${configPrice} ≠ ${config.expectedPrice}`);
      allMatch = false;
    }

    console.log('');
  });

  // Beta pricing verification
  console.log('🚀 BETA PRICING VERIFICATION:\n');

  const betaPrices = {
    earlybird: envPrices['STRIPE_PRICE_BETA_EARLYBIRD'],
    access: envPrices['STRIPE_PRICE_BETA_ACCESS'],
    premium: envPrices['STRIPE_PRICE_PREMIUM'],
  };

  console.log(`🐦 Early Bird: $29 (${betaPrices.earlybird})`);
  console.log(`🚀 Beta Access: $39 (${betaPrices.access}) ⭐`);
  console.log(`👑 Premium Beta: $59 (${betaPrices.premium})`);

  // Overall result
  console.log('\n' + '='.repeat(50));
  if (allMatch) {
    success('🎉 ALL STRIPE PRICES MATCH CONSOLIDATED PRICING!');
    console.log('✅ Your Stripe integration is properly configured');
    console.log('✅ Customers will be charged correct amounts');
    console.log('✅ Ready for production releases');
  } else {
    error('🚨 STRIPE PRICE MISMATCHES DETECTED!');
    console.log('⚠️  Fix these before processing real payments');
    console.log('⚠️  Update Stripe price IDs or pricing pages');
  }

  // Show payment test URLs
  console.log('\n🧪 TEST PAYMENT FLOWS:');
  console.log('   • /public/simple-payment-test.html');
  console.log('   • /public/checkout.html');
  console.log('   • /public/pricing.html');

  return allMatch;
}

// Quick fix function
function generateStripeFix() {
  console.log('\n🔧 QUICK FIX COMMANDS:\n');

  const fixes = [
    "If prices don't match, you can:",
    '1. Update Stripe Dashboard to match your pricing',
    '2. Update .env file with correct price IDs',
    '3. Update stripe-config.js with correct price IDs',
    '4. Run consolidate-pricing.cjs again',
  ];

  fixes.forEach(fix => console.log(`   ${fix}`));
}

if (require.main === module) {
  const allGood = verifyStripePricing();
  if (!allGood) {
    generateStripeFix();
  }
}
