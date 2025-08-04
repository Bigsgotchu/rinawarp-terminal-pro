#!/usr/bin/env node
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 4 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal - Beta Checkout Fix Script
 *
 * This script diagnoses and fixes the "failed to start beta checkout" error
 * by verifying Stripe configuration and environment variables.
 */

import { config } from 'dotenv';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

// Load environment variables
config();

console.log('🔧 RinaWarp Terminal - Beta Checkout Diagnostic Tool');
console.log('==================================================');

// Check if Stripe is configured
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey || stripeSecretKey === '{{STRIPE_SECRET_KEY}}') {
  console.log('❌ STRIPE_SECRET_KEY not configured');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey);

// Check beta price environment variables
const betaPrices = {
  earlybird: process.env.STRIPE_PRICE_EARLYBIRD,
  beta: process.env.STRIPE_PRICE_BETA,
  premium: process.env.STRIPE_PRICE_PREMIUM,
};

console.log('\n📋 Beta Price Configuration:');
console.log('============================');

for (const [type, priceId] of Object.entries(betaPrices)) {
  if (!priceId || priceId.startsWith('{{')) {
    console.log(`❌ ${type.toUpperCase()}: Not configured (${priceId || 'undefined'})`);
  } else {
    console.log(`✅ ${type.toUpperCase()}: ${priceId}`);
  }
}

// Verify beta prices exist in Stripe
console.log('\n🔍 Verifying Beta Prices in Stripe:');
console.log('===================================');

async function verifyBetaPrices() {
  for (const [type, priceId] of Object.entries(betaPrices)) {
    if (priceId && !priceId.startsWith('{{')) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        console.log(
          `✅ ${type.toUpperCase()}: Valid (${price.unit_amount / 100} ${price.currency.toUpperCase()}/${price.recurring?.interval || 'one-time'})`
        );
      } catch (error) {
        console.log(`❌ ${type.toUpperCase()}: Invalid price ID - ${error.message}`);
      }
    } else {
      console.log(`⚠️  ${type.toUpperCase()}: Skipped (not configured)`);
    }
  }
}

// Create test beta prices if needed
async function createTestBetaPrices() {
  console.log('\n🛠️  Creating Test Beta Prices:');
  console.log('=============================');

  const testPrices = [
    {
      type: 'earlybird',
      name: 'RinaWarp Terminal - Early Bird Beta',
      amount: 999, // $9.99
      description: 'Early bird access to RinaWarp Terminal beta with exclusive features',
    },
    {
      type: 'beta',
      name: 'RinaWarp Terminal - Beta Access',
      amount: 1499, // $14.99
      description: 'Full beta access to RinaWarp Terminal with all features',
    },
    {
      type: 'premium',
      name: 'RinaWarp Terminal - Premium Beta',
      amount: 2499, // $24.99
      description: 'Premium beta access with priority support and exclusive features',
    },
  ];

  const createdPrices = {};

  for (const priceData of testPrices) {
    try {
      // Create product first
      const product = await stripe.products.create({
        name: priceData.name,
        description: priceData.description,
        metadata: {
          type: 'beta',
          betaType: priceData.type,
        },
      });

      // Create price
      const price = await stripe.prices.create({
        currency: 'usd',
        unit_amount: priceData.amount,
        product: product.id,
        recurring: {
          interval: 'month',
        },
        metadata: {
          betaType: priceData.type,
        },
      });

      createdPrices[priceData.type] = price.id;
      console.log(
        `✅ Created ${priceData.type.toUpperCase()}: ${price.id} ($${priceData.amount / 100}/month)`
      );
    } catch (error) {
      console.log(`❌ Failed to create ${priceData.type.toUpperCase()}: ${error.message}`);
    }
  }

  return createdPrices;
}

// Update environment file with new prices
function updateEnvFile(prices) {
  console.log('\n📝 Updating Environment Variables:');
  console.log('==================================');

  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  for (const [type, priceId] of Object.entries(prices)) {
    const envVar = `STRIPE_PRICE_${type.toUpperCase()}`;
    const regex = new RegExp(`^${envVar}=.*$`, 'm');

    if (regex.test(envContent)) {
      // Update existing
      envContent = envContent.replace(regex, `${envVar}=${priceId}`);
      console.log(`✅ Updated ${envVar}=${priceId}`);
    } else {
      // Add new
      envContent += `\n${envVar}=${priceId}`;
      console.log(`✅ Added ${envVar}=${priceId}`);
    }
  }

  fs.writeFileSync(envPath, envContent);
  console.log(`📄 Environment file updated: ${envPath}`);
}

// Generate fixed pricing HTML
function generateFixedPricingHTML() {
  console.log('\n🧜‍♀️ Generating Fixed Beta Checkout Code:');
  console.log('==========================================');

  const fixedJS = `
// Fixed Beta Checkout Function
async function purchaseBeta(betaType) {
    if (!stripe) {
        showError('Payment system not ready. Please refresh and try again.');
        return;
    }
    
    const button = event.target;
    const originalText = button.textContent;
    
    // Validate beta type
    const validBetaTypes = ['earlybird', 'beta', 'premium'];
    if (!validBetaTypes.includes(betaType)) {
        showError('Invalid beta type selected.');
        return;
    }
    
    // Show loading state
    button.disabled = true;
    button.textContent = 'Processing...';
    
    try {
        // Get the appropriate price ID
        const priceId = getBetaPriceId(betaType);
        
        if (!priceId) {
            throw new Error(new Error(\`Beta pricing not configured for \${betaType}. Please contact support.\`));
        }
        
        // Enhanced error handling for checkout session
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                priceId: priceId,
                successUrl: window.location.origin + '/success.html?plan=beta-' + betaType,
                cancelUrl: window.location.href,
                metadata: {
                    betaType: betaType,
                    product: 'RinaWarp Terminal Beta'
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(new Error(errorData.error || \`Server error: \${response.status}\`));
        }
        
        const session = await response.json();
        
        if (!session.sessionId) {
            throw new Error(new Error('Invalid session response from server'));
        }
        
        // Redirect to Stripe Checkout
        const result = await stripe.redirectToCheckout({
            sessionId: session.sessionId
        });
        
        if (result.error) {
            throw new Error(new Error(result.error.message));
        }
        
    } catch (error) {
        console.error('❌ Beta checkout error:', error);
        
        // Improved error messages
        let errorMessage = 'Failed to start beta checkout. ';
        
        if (error.message.includes('not configured')) {
            errorMessage += 'Beta pricing is being set up. Please contact support@rinawarp.com for early access.';
        } else if (error.message.includes('Server error: 500')) {
            errorMessage += 'Our servers are having issues. Please try again in a few minutes.';
        } else if (error.message.includes('Network')) {
            errorMessage += 'Please check your internet connection and try again.';
        } else {
            errorMessage += 'Please try again or contact support@rinawarp.com if the issue persists.';
        }
        
        showError(errorMessage);
        
        // Reset button state
        button.disabled = false;
        button.textContent = originalText;
    }
}

// Enhanced price ID getter with fallbacks
function getBetaPriceId(betaType) {
    // Try to get from server configuration first
    const betaPrices = stripeConfig.betaPrices || {};
    
    const betaPriceMap = {
        'earlybird': betaPrices.earlybird,
        'beta': betaPrices.beta,
        'premium': betaPrices.premium
    };
    
    const priceId = betaPriceMap[betaType];
    
    // Log for debugging
    console.log(\`Getting price ID for \${betaType}: \${priceId}\`);
    
    return priceId;
}
`;

  console.log('✅ Generated fixed checkout code');
  return fixedJS;
}

// Main execution
async function main() {
  try {
    await verifyBetaPrices();

    // Check if any beta prices are missing
    const missingPrices = Object.entries(betaPrices).filter(
      ([_, priceId]) => !priceId || priceId.startsWith('{{')
    );

    if (missingPrices.length > 0) {
      console.log('\n⚠️  Missing beta prices detected. Would you like to create test prices?');
      console.log('   This will create new Stripe products and prices for beta testing.');

      // For now, create them automatically in development
      if (process.env.NODE_ENV !== 'production') {
        const newPrices = await createTestBetaPrices();
        if (Object.keys(newPrices).length > 0) {
          updateEnvFile(newPrices);
        }
      }
    }

    // Generate fixed code
    const fixedCode = generateFixedPricingHTML();
    fs.writeFileSync('beta-checkout-fix.js', fixedCode);

    console.log('\n🎉 Beta Checkout Diagnostic Complete!');
    console.log('=====================================');
    console.log('✅ Check the generated beta-checkout-fix.js file');
    console.log('✅ Restart your server to load new environment variables');
    console.log('✅ Test the beta checkout functionality');

    if (process.env.NODE_ENV === 'production') {
      console.log('\n⚠️  Production Environment Detected:');
      console.log('   Please manually configure beta prices in your Stripe dashboard');
      console.log('   and update the environment variables accordingly.');
    }
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  }
}

main();
