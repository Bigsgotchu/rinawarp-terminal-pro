#!/usr/bin/env node

/**
 * 🔑 RinaWarp Terminal - Stripe Setup Helper
 * Securely configure Stripe keys and prices
 */

import logger from './utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  logger.info(`${colors[color]}${message}${colors.reset}`);
}

function updateStripeConfig(publishableKey, prices) {
  const configPath = path.join(__dirname, 'public', 'api', 'stripe-config.json');

  const config = {
    publishableKey: publishableKey,
    prices: prices,
    betaPrices: {
      earlybird: prices.earlybird || 'price_YOUR_EARLYBIRD_PRICE_ID',
      beta: prices.beta || 'price_YOUR_BETA_PRICE_ID',
      premium: prices.premium || 'price_YOUR_PREMIUM_BETA_PRICE_ID',
    },
    mode: publishableKey.startsWith('pk_live_') ? 'live' : 'test',
    currency: 'usd',
    features: {
      webhooks: true,
      subscriptions: true,
      oneTimePayments: true,
    },
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  log(`✅ Updated Stripe configuration: ${configPath}`, 'green');
}

function createEnvTemplate() {
  const envPath = path.join(__dirname, '.env.example');
  const envContent = `# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
VERCEL_URL=https://rinawarptech.com
URL=https://rinawarptech.com

# Price IDs from Stripe Dashboard
STRIPE_PRICE_PERSONAL=price_YOUR_PERSONAL_PLAN_PRICE_ID
STRIPE_PRICE_PROFESSIONAL=price_YOUR_PROFESSIONAL_PLAN_PRICE_ID
STRIPE_PRICE_TEAM=price_YOUR_TEAM_PLAN_PRICE_ID
STRIPE_PRICE_ENTERPRISE=price_YOUR_ENTERPRISE_PLAN_PRICE_ID

# Beta Price IDs
STRIPE_PRICE_EARLYBIRD=price_YOUR_EARLYBIRD_PRICE_ID
STRIPE_PRICE_BETA=price_YOUR_BETA_PRICE_ID
STRIPE_PRICE_PREMIUM=price_YOUR_PREMIUM_BETA_PRICE_ID
`;

  fs.writeFileSync(envPath, envContent);
  log(`✅ Created environment template: ${envPath}`, 'green');
}

function displaySetupInstructions() {
  log('🚀 RinaWarp Terminal - Stripe Setup Helper', 'bold');
  log('='.repeat(60), 'blue');
  log('', 'reset');

  log('📋 STEP 1: Get Stripe Keys', 'cyan');
  log('   1. Go to https://dashboard.stripe.com', 'yellow');
  log('   2. Navigate to Developers → API Keys', 'yellow');
  log('   3. Copy your Publishable Key (pk_test_... or pk_live_...)', 'yellow');
  log('   4. Copy your Secret Key (sk_test_... or sk_live_...)', 'yellow');
  log('', 'reset');

  log('📦 STEP 2: Create Products in Stripe', 'cyan');
  log('   1. Go to Products → Create Product', 'yellow');
  log(
    '   2. Create products for: Personal ($15/month), Professional ($25/month), Team ($35/month)',
    'yellow'
  );
  log('   3. Copy the Price IDs (price_...)', 'yellow');
  log('', 'reset');

  log('🔧 STEP 3: Update Configuration', 'cyan');
  log('   1. Edit public/api/stripe-config.json', 'yellow');
  log('   2. Replace YOUR_ACTUAL_PUBLISHABLE_KEY_HERE with your publishable key', 'yellow');
  log('   3. Replace price IDs with your actual price IDs', 'yellow');
  log('', 'reset');

  log('🌐 STEP 4: Deploy with Environment Variables', 'cyan');
  log('   For Vercel:', 'yellow');
  log('     vercel env add STRIPE_SECRET_KEY', 'yellow');
  log('     vercel --prod', 'yellow');
  log('', 'reset');
  log('   For Netlify:', 'yellow');
  log('     netlify env:set STRIPE_SECRET_KEY sk_test_your_key', 'yellow');
  log('     netlify deploy --prod', 'yellow');
  log('', 'reset');

  log('🧪 STEP 5: Test', 'cyan');
  log('   1. Visit https://rinawarptech.com/pricing.html', 'yellow');
  log('   2. Click a payment button', 'yellow');
  log('   3. Use test card: 4242 4242 4242 4242', 'yellow');
  log('', 'reset');

  log('🎯 Current Status:', 'bold');
  log('   ❌ Demo Mode (placeholder keys)', 'red');
  log('   ✅ Multi-route setup complete', 'green');
  log('   ✅ Fallback strategies ready', 'green');
  log('', 'reset');

  log('📁 Files to Update:', 'cyan');
  log('   • public/api/stripe-config.json (publishable key + price IDs)', 'yellow');
  log('   • Environment variables on hosting platform (secret key)', 'yellow');
  log('', 'reset');

  log('⚠️  Security Reminder:', 'red');
  log('   • Never commit secret keys to git', 'yellow');
  log('   • Use environment variables for secrets', 'yellow');
  log('   • Test with test keys first', 'yellow');
  log('', 'reset');
}

function main() {
  displaySetupInstructions();
  createEnvTemplate();

  log('🎉 Ready for Stripe setup!', 'green');
  log('   Run this script anytime for instructions.', 'cyan');
  log('   Need help? Check STRIPE_SETUP.md for detailed guide.', 'cyan');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { updateStripeConfig, createEnvTemplate };
