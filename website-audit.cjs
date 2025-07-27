#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('🌊 RinaWarp Website Comprehensive Audit');
console.log('========================================\n');

// 1. Check Critical Files
console.log('📁 CRITICAL FILES CHECK:');
const criticalFiles = [
  { path: 'index.html', description: 'Main landing page' },
  { path: 'pricing.html', description: 'Pricing page' },
  { path: 'public/success.html', description: 'Payment success page' },
  { path: 'public/checkout.html', description: 'Checkout page' },
  { path: 'public/privacy.html', description: 'Privacy policy' },
  { path: 'public/terms.html', description: 'Terms of service' },
  { path: 'final-server.js', description: 'Main server' },
  { path: 'src/payment/stripe-checkout.js', description: 'Payment handler' },
];

let missingFiles = 0;
criticalFiles.forEach(file => {
  const exists = fs.existsSync(file.path);
  console.log(`   ${exists ? '✅' : '❌'} ${file.path} - ${file.description}`);
  if (!exists) missingFiles++;
});

// 2. Check Content Consistency
console.log('\n📝 CONTENT CONSISTENCY CHECK:');
if (fs.existsSync('index.html')) {
  const indexContent = fs.readFileSync('index.html', 'utf8');

  // Check pricing
  const prices = [...new Set(indexContent.match(/\$\d+(?:\.\d{2})?/g) || [])];
  console.log(`   💰 Prices found: ${prices.join(', ')}`);

  // Check if pricing matches what's in the payment handler
  if (fs.existsSync('src/payment/stripe-checkout.js')) {
    const paymentContent = fs.readFileSync('src/payment/stripe-checkout.js', 'utf8');
    const paymentPrices = [...new Set(paymentContent.match(/price: \d+(?:\.\d{2})?/g) || [])];
    console.log(`   💳 Payment handler prices: ${paymentPrices.join(', ')}`);
  }

  // Check version consistency
  const versions = [...new Set(indexContent.match(/v\d+\.\d+\.\d+/g) || [])];
  console.log(`   🏷️  Version references: ${versions.join(', ')}`);

  // Check for placeholder content
  const placeholders = indexContent.match(/PLACEHOLDER|TODO|FIXME|Lorem ipsum/gi) || [];
  console.log(`   ⚠️  Placeholder content found: ${placeholders.length} instances`);
}

// 3. Check Download Links
console.log('\n🔗 DOWNLOAD LINKS CHECK:');
if (fs.existsSync('index.html')) {
  const indexContent = fs.readFileSync('index.html', 'utf8');
  const downloadLinks = indexContent.match(/href="\/releases\/[^"]+"/g) || [];

  if (downloadLinks.length === 0) {
    console.log('   ⚠️  No download links found');
  } else {
    downloadLinks.forEach(link => {
      const filename = link.match(/href="([^"]+)"/)[1];
      const localPath = filename.replace(/^\//, '');
      const exists = fs.existsSync(localPath);
      console.log(`   ${exists ? '✅' : '❌'} ${filename}`);
    });
  }
}

// 4. Check Payment Integration
console.log('\n💳 PAYMENT INTEGRATION CHECK:');
if (fs.existsSync('index.html')) {
  const indexContent = fs.readFileSync('index.html', 'utf8');

  // Check for Stripe
  const hasStripeScript = indexContent.includes('https://js.stripe.com/v3/');
  const hasStripeKey = indexContent.includes('pk_test_') || indexContent.includes('pk_live_');
  console.log(`   ${hasStripeScript ? '✅' : '❌'} Stripe JS library loaded`);
  console.log(
    `   ${hasStripeKey ? '⚠️' : '✅'} Stripe key ${hasStripeKey ? 'hardcoded (should load from server)' : 'not hardcoded (good)'}`
  );

  // Check purchase function
  const hasPurchaseFunction = indexContent.includes('purchasePlan');
  console.log(`   ${hasPurchaseFunction ? '✅' : '❌'} Purchase function defined`);
}

// 5. Check Analytics
console.log('\n📊 ANALYTICS CHECK:');
if (fs.existsSync('index.html')) {
  const indexContent = fs.readFileSync('index.html', 'utf8');

  const hasGA = indexContent.includes('googletagmanager.com');
  const hasGAId = indexContent.includes('G-G424CV5GGT');
  console.log(`   ${hasGA ? '✅' : '❌'} Google Analytics script loaded`);
  console.log(`   ${hasGAId ? '✅' : '❌'} Google Analytics ID configured`);
}

// 6. Check Server Configuration
console.log('\n⚙️  SERVER CONFIGURATION:');
const hasEnvFile = fs.existsSync('.env');
const hasEnvExample = fs.existsSync('.env.example');
console.log(
  `   ${hasEnvFile ? '✅' : '⚠️'} .env file ${hasEnvFile ? 'exists' : 'missing (required for Stripe keys)'}`
);
console.log(`   ${hasEnvExample ? '✅' : '❌'} .env.example file for reference`);

if (hasEnvFile) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const hasStripeSecret = envContent.includes('STRIPE_SECRET_KEY');
  const hasStripePub = envContent.includes('STRIPE_PUBLISHABLE_KEY');
  console.log(`   ${hasStripeSecret ? '✅' : '❌'} STRIPE_SECRET_KEY configured`);
  console.log(`   ${hasStripePub ? '✅' : '❌'} STRIPE_PUBLISHABLE_KEY configured`);
}

// 7. Check for Common Issues
console.log('\n🔍 COMMON ISSUES CHECK:');
const issues = [];

if (fs.existsSync('public/success.html')) {
  const successContent = fs.readFileSync('public/success.html', 'utf8');
  if (successContent.includes('PLACEHOLDER')) {
    issues.push('Success page has placeholder content');
  }
}

if (fs.existsSync('public/checkout.html')) {
  const checkoutContent = fs.readFileSync('public/checkout.html', 'utf8');
  if (!checkoutContent.includes('stripe')) {
    issues.push('Checkout page might not be integrated with Stripe');
  }
}

if (issues.length === 0) {
  console.log('   ✅ No common issues detected');
} else {
  issues.forEach(issue => {
    console.log(`   ⚠️  ${issue}`);
  });
}

// 8. Recommendations
console.log('\n💡 RECOMMENDATIONS:');
const recommendations = [];

if (missingFiles > 0) {
  recommendations.push('Create missing critical files');
}

if (!hasEnvFile) {
  recommendations.push('Create .env file with Stripe keys');
}

if (fs.existsSync('index.html')) {
  const indexContent = fs.readFileSync('index.html', 'utf8');
  if (indexContent.includes('pk_test_51OX1234567890abcdef')) {
    recommendations.push('Replace placeholder Stripe key with actual test/live key');
  }
}

if (recommendations.length === 0) {
  console.log('   ✅ Everything looks good!');
} else {
  recommendations.forEach((rec, i) => {
    console.log(`   ${i + 1}. ${rec}`);
  });
}

console.log('\n========================================');
console.log('🏁 Audit Complete!\n');

// Test live site connectivity
console.log('🌐 TESTING LIVE SITE:');
https
  .get('https://rinawarptech.com', res => {
    console.log(`   ✅ Site is accessible (Status: ${res.statusCode})`);
  })
  .on('error', err => {
    console.log(`   ❌ Site is not accessible: ${err.message}`);
  });
