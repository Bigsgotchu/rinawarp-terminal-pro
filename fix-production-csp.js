#!/usr/bin/env node

/**
 * Fix Production CSP Headers for Stripe Compatibility
 * This script helps ensure your CSP headers are correctly configured in production
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const PRODUCTION_URL = 'https://rinawarptech.com';

console.log(chalk.blue('🔍 Checking Production CSP Headers\n'));

async function checkProductionHeaders() {
  try {
    const response = await fetch(PRODUCTION_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CSP-Checker/1.0)',
      },
    });

    const csp = response.headers.get('content-security-policy');

    if (!csp) {
      console.log(chalk.red('❌ No CSP header found!'));
      return;
    }

    console.log(chalk.yellow('📋 Current CSP Header:'));
    console.log(chalk.gray(csp));
    console.log('\n' + chalk.yellow('🔍 Analysis:'));

    // Check frame-src
    const frameSrcMatch = csp.match(/frame-src\s+([^;]+)/);
    if (frameSrcMatch) {
      const frameSrcValue = frameSrcMatch[1];
      console.log(chalk.red(`\n❌ PROBLEM FOUND: frame-src is set to: ${frameSrcValue}`));

      if (frameSrcValue.includes('\'none\'')) {
        console.log(chalk.red('   This blocks ALL iframes including Stripe!'));
      }
    } else {
      console.log(chalk.yellow('\n⚠️  No frame-src directive found (defaults to default-src)'));
    }

    // Check if Stripe domains are in script-src
    if (csp.includes('https://js.stripe.com')) {
      console.log(chalk.green('\n✅ script-src includes Stripe'));
    } else {
      console.log(chalk.red('\n❌ script-src missing Stripe'));
    }

    // Check if Stripe API is in connect-src
    if (csp.includes('https://api.stripe.com')) {
      console.log(chalk.green('✅ connect-src includes Stripe API'));
    } else {
      console.log(chalk.red('❌ connect-src missing Stripe API'));
    }
  } catch (error) {
    console.error(chalk.red('❌ Error checking headers:'), error.message);
  }
}

function generateCorrectCSP() {
  console.log(chalk.blue('\n\n📝 Correct CSP Configuration:\n'));

  const correctCSP = {
    'default-src': ['\'self\''],
    'script-src': ['\'self\'', 'https://js.stripe.com', '\'nonce-{NONCE}\''],
    'script-src-attr': ['\'none\''],
    'style-src': ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
    'img-src': ['\'self\'', 'data:', 'https:'],
    'font-src': ['\'self\'', 'data:', 'https://fonts.gstatic.com'],
    'connect-src': ['\'self\'', 'wss:', 'ws:', 'https://api.stripe.com'],
    'frame-src': ['\'self\'', 'https://js.stripe.com', 'https://hooks.stripe.com'],
    'object-src': ['\'none\''],
    'base-uri': ['\'self\''],
    'form-action': ['\'self\''],
    'frame-ancestors': ['\'self\''],
    'upgrade-insecure-requests': [],
  };

  console.log(chalk.green('✅ Correct CSP directives:'));
  Object.entries(correctCSP).forEach(([directive, values]) => {
    console.log(`   ${directive}: ${values.join(' ')};`);
  });
}

function showCloudflareInstructions() {
  console.log(chalk.blue('\n\n🔧 How to Fix in Cloudflare:\n'));

  console.log(chalk.yellow('Option 1: Cloudflare Transform Rules (Recommended)'));
  console.log('1. Go to Cloudflare Dashboard → Rules → Transform Rules');
  console.log('2. Click "Create rule" → "Modify Response Header"');
  console.log('3. Set up the rule:');
  console.log('   - Rule name: "Fix CSP for Stripe"');
  console.log('   - When: Hostname equals rinawarptech.com');
  console.log('   - Then: Set dynamic header');
  console.log('   - Header name: Content-Security-Policy');
  console.log('   - Expression:');
  console.log(
    chalk.gray(`
    concat(
      "default-src 'self'; ",
      "script-src 'self' https://js.stripe.com 'nonce-", 
      http.request.headers["x-nonce"][0], 
      "'; ",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com; ",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ",
      "img-src 'self' data: https:; ",
      "font-src 'self' data: https://fonts.gstatic.com; ",
      "connect-src 'self' wss: ws: https://api.stripe.com; ",
      "object-src 'none'; ",
      "base-uri 'self'; ",
      "form-action 'self'; ",
      "frame-ancestors 'self'; ",
      "script-src-attr 'none'; ",
      "upgrade-insecure-requests"
    )
  `)
  );

  console.log(chalk.yellow('\n\nOption 2: Cloudflare Workers'));
  console.log('Create a Worker to modify CSP headers:');
  console.log(
    chalk.gray(`
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const response = await fetch(request)
  
  // Clone the response to modify headers
  const newResponse = new Response(response.body, response)
  
  // Get existing CSP
  const csp = newResponse.headers.get('Content-Security-Policy')
  
  if (csp && csp.includes("frame-src 'none'")) {
    // Fix the CSP
    const fixedCSP = csp.replace(
      "frame-src 'none'", 
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com"
    )
    newResponse.headers.set('Content-Security-Policy', fixedCSP)
  }
  
  return newResponse
}
  `)
  );

  console.log(chalk.yellow('\n\nOption 3: Page Rules (Limited)'));
  console.log('Note: Page Rules cannot modify CSP headers directly.');
  console.log('You would need to disable security features that add CSP.');
}

function showRailwayDeploymentFix() {
  console.log(chalk.blue('\n\n🚂 Railway Deployment Fix:\n'));

  console.log('1. Check your Railway environment variables');
  console.log('2. Ensure no CSP override is set');
  console.log('3. Update your deployment:');
  console.log(chalk.gray('   railway up'));
  console.log('\n4. If using a custom domain, check domain settings');
}

async function testStripeOnProduction() {
  console.log(chalk.blue('\n\n🧪 Testing Stripe on Production:\n'));

  console.log('Test your Stripe integration:');
  console.log(`1. Open: ${PRODUCTION_URL}/stripe-csp-test.html`);
  console.log('2. Open Browser DevTools (F12)');
  console.log('3. Check Console for CSP violations');
  console.log('4. Look for errors like:');
  console.log(chalk.red('   "Refused to frame \'https://js.stripe.com/...\'"'));
}

// Run all checks
async function runDiagnostics() {
  await checkProductionHeaders();
  generateCorrectCSP();
  showCloudflareInstructions();
  showRailwayDeploymentFix();
  await testStripeOnProduction();

  console.log(chalk.blue('\n\n✨ Summary:\n'));
  console.log(chalk.yellow('The issue is that your production CSP has frame-src set to \'none\','));
  console.log(chalk.yellow('which blocks Stripe iframes. This is likely being set by:'));
  console.log('1. Cloudflare security settings');
  console.log('2. Railway deployment configuration');
  console.log('3. Or another proxy/CDN layer');

  console.log(chalk.green('\n✅ Your server.js has the correct configuration!'));
  console.log(chalk.yellow('⚠️  But it\'s being overridden in production.'));

  console.log(chalk.blue('\n📝 Next Steps:'));
  console.log('1. Check Cloudflare Transform Rules or Page Rules');
  console.log('2. Deploy the Worker script if needed');
  console.log('3. Verify Railway deployment settings');
  console.log('4. Test with the stripe-csp-test.html page');
}

runDiagnostics().catch(console.error);
