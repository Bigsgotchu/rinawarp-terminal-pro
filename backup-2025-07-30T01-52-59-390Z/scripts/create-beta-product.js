#!/usr/bin/env node

/**
 * Create RinaWarp Terminal v1.0.9 Beta Access Product in Stripe
 * Run this script to set up the beta access product and pricing
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.development');
dotenv.config({ path: envPath });

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createBetaProduct() {
  try {
    console.log('🚀 Creating RinaWarp Terminal v1.0.9 Beta Access Product...\n');

    // Create the product
    const product = await stripe.products.create({
      name: 'RinaWarp Terminal v1.0.9 Beta Access',
      description:
        'Early access to RinaWarp Terminal v1.0.9 with enhanced AI, cloud sync, collaboration features, and plugin ecosystem. Includes full license upon official release.',
      images: [
        'https://rinawarp-terminal-fresh-2024.web.app/assets/marketing/beta-access-banner.jpg',
      ],
      metadata: {
        type: 'beta-access',
        version: '1.0.9',
        includes_full_license: 'true',
        created_by: 'beta-product-script',
        features: JSON.stringify([
          'Enhanced AI with personalized learning',
          'Cloud settings synchronization',
          'Team collaboration features',
          'Plugin ecosystem foundation',
          '30% performance improvements',
          'Beta testing participation',
          'Full license upon release',
          'Direct developer access',
        ]),
      },
      tax_code: 'txcd_10103001', // Software as a Service
      url: 'https://rinawarp-terminal-fresh-2024.web.app/beta',
    });

    console.log('✅ Product created successfully:');
    console.log(`   Product ID: ${product.id}`);
    console.log(`   Name: ${product.name}`);
    console.log(`   Description: ${product.description}\n`);

    // Create pricing options
    const pricingOptions = [
      {
        name: 'Beta Access - One-time Payment',
        amount: 3900, // $39.00
        currency: 'usd',
        type: 'one_time',
        nickname: 'Beta Access',
        metadata: {
          type: 'beta-access-onetime',
          includes: 'Beta access + Full license on release',
          popular: 'true',
        },
      },
      {
        name: 'Beta Access + Priority Support',
        amount: 5900, // $59.00
        currency: 'usd',
        type: 'one_time',
        nickname: 'Beta Access Premium',
        metadata: {
          type: 'beta-access-premium',
          includes: 'Beta access + Full license + Priority support + Direct developer access',
          popular: 'false',
        },
      },
      {
        name: 'Early Bird Special',
        amount: 2900, // $29.00
        currency: 'usd',
        type: 'one_time',
        nickname: 'Early Bird',
        metadata: {
          type: 'beta-access-earlybird',
          includes: 'Limited time offer - Beta access + Full license',
          popular: 'false',
          limited_time: 'true',
        },
      },
    ];

    const createdPrices = [];

    for (const priceOption of pricingOptions) {
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: priceOption.amount,
        currency: priceOption.currency,
        nickname: priceOption.nickname,
        metadata: priceOption.metadata,
      });

      createdPrices.push(price);

      console.log(`✅ Price created: ${priceOption.nickname}`);
      console.log(`   Price ID: ${price.id}`);
      console.log(`   Amount: $${(priceOption.amount / 100).toFixed(2)}`);
      console.log(`   Type: ${priceOption.type}\n`);
    }

    // Generate environment variables
    console.log('🔧 Environment Variables to Add:');
    console.log('=====================================');
    console.log(`STRIPE_PRODUCT_BETA_ACCESS=${product.id}`);
    console.log(`STRIPE_PRICE_BETA_ACCESS=${createdPrices[0].id}`);
    console.log(`STRIPE_PRICE_BETA_PREMIUM=${createdPrices[1].id}`);
    console.log(`STRIPE_PRICE_BETA_EARLYBIRD=${createdPrices[2].id}`);
    console.log('=====================================\n');

    // Generate HTML snippet for pricing page
    const htmlSnippet = `
<!-- Beta Access Pricing Section -->
<div class="beta-access-section">
  <h2>🚀 Beta Access Available Now!</h2>
  <p>Get early access to RinaWarp Terminal v1.0.9 with cutting-edge features</p>
  
  <div class="beta-pricing-grid">
    <div class="beta-card early-bird">
      <h3>Early Bird Special</h3>
      <div class="price">$29</div>
      <p>Limited time offer</p>
      <button onclick="purchaseBeta('${createdPrices[2].id}')">Get Early Access</button>
    </div>
    
    <div class="beta-card popular">
      <h3>Beta Access</h3>
      <div class="price">$39</div>
      <p>Most popular choice</p>
      <button onclick="purchaseBeta('${createdPrices[0].id}')">Get Beta Access</button>
    </div>
    
    <div class="beta-card premium">
      <h3>Premium Beta</h3>
      <div class="price">$59</div>
      <p>Priority support included</p>
      <button onclick="purchaseBeta('${createdPrices[1].id}')">Get Premium Beta</button>
    </div>
  </div>
</div>`;

    console.log('📝 HTML Snippet for Pricing Page:');
    console.log('=====================================');
    console.log(htmlSnippet);
    console.log('=====================================\n');

    // Summary
    console.log('🎉 Beta Product Setup Complete!');
    console.log('Next steps:');
    console.log('1. Add the environment variables to your .env file');
    console.log('2. Update your pricing page with the HTML snippet');
    console.log('3. Test the payment flow');
    console.log('4. Launch your beta sales announcement');
    console.log('5. Monitor sales in your Stripe dashboard\n');

    console.log('📊 Stripe Dashboard Links:');
    console.log(`   Product: https://dashboard.stripe.com/products/${product.id}`);
    console.log('   Prices: https://dashboard.stripe.com/prices');
    console.log('   Payments: https://dashboard.stripe.com/payments\n');

    return {
      product,
      prices: createdPrices,
      success: true,
    };
  } catch (error) {
    console.error('❌ Error creating beta product:', error.message);

    if (error.type === 'StripeInvalidRequestError') {
      console.error('💡 Make sure your Stripe secret key is set correctly in .env');
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  createBetaProduct()
    .then(result => {
      if (result.success) {
        console.log('✅ Script completed successfully!');
        process.exit(0);
      } else {
        console.error('❌ Script failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

export default createBetaProduct;
