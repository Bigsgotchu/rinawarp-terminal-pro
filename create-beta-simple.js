// Simple script to create beta product in Stripe
const Stripe = require('stripe');

// Your Stripe secret key
const stripe = new Stripe('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');

async function createBetaProduct() {
  try {
    console.log('🚀 Creating RinaWarp Terminal v1.0.9 Beta Access Product...\n');

    // Create the product
    const product = await stripe.products.create({
      name: 'RinaWarp Terminal v1.0.9 Beta Access',
      description: 'Early access to RinaWarp Terminal v1.0.9 with enhanced AI, cloud sync, collaboration features, and plugin ecosystem. Includes full license upon official release.',
      metadata: {
        type: 'beta-access',
        version: '1.0.9',
        includes_full_license: 'true',
        created_by: 'beta-product-script'
      }
    });

    console.log('✅ Product created successfully:');
    console.log(`   Product ID: ${product.id}`);
    console.log(`   Name: ${product.name}\n`);

    // Create pricing options
    const prices = [];
    
    // Early Bird - $29
    const earlyBird = await stripe.prices.create({
      product: product.id,
      unit_amount: 2900,
      currency: 'usd',
      nickname: 'Early Bird Beta Access'
    });
    prices.push(earlyBird);
    console.log(`✅ Early Bird price created: ${earlyBird.id} - $29`);

    // Beta Access - $39
    const betaAccess = await stripe.prices.create({
      product: product.id,
      unit_amount: 3900,
      currency: 'usd',
      nickname: 'Beta Access'
    });
    prices.push(betaAccess);
    console.log(`✅ Beta Access price created: ${betaAccess.id} - $39`);

    // Premium Beta - $59
    const premiumBeta = await stripe.prices.create({
      product: product.id,
      unit_amount: 5900,
      currency: 'usd',
      nickname: 'Premium Beta Access'
    });
    prices.push(premiumBeta);
    console.log(`✅ Premium Beta price created: ${premiumBeta.id} - $59\n`);

    // Environment variables
    console.log('🔧 Add these to your .env file:');
    console.log('=====================================');
    console.log(`STRIPE_PRODUCT_BETA_ACCESS=${product.id}`);
    console.log(`STRIPE_PRICE_BETA_EARLYBIRD=${earlyBird.id}`);
    console.log(`STRIPE_PRICE_BETA_ACCESS=${betaAccess.id}`);
    console.log(`STRIPE_PRICE_BETA_PREMIUM=${premiumBeta.id}`);
    console.log('=====================================\n');

    console.log('🎉 Beta Product Setup Complete!');
    console.log('📊 View in Stripe Dashboard:');
    console.log(`   https://dashboard.stripe.com/products/${product.id}`);

    return { product, prices };

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run the script
createBetaProduct()
  .then(() => {
    console.log('\n✅ Success! Beta product created in Stripe.');
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  });
