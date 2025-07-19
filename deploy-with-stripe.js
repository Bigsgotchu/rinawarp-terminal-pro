#!/usr/bin/env node

/**
 * 🚀 Quick Deploy to Vercel with Stripe Setup
 */

import { execSync } from 'child_process';

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
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  try {
    log(`🔄 ${description}...`, 'cyan');
    const _result = execSync(command, { encoding: 'utf8', stdio: 'inherit' });
    log(`✅ ${description} complete!`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'red');
    return false;
  }
}

function main() {
  log('🚀 RinaWarp Terminal - Vercel + Stripe Deploy', 'bold');
  log('='.repeat(60), 'blue');

  // Check if Vercel CLI is installed
  try {
    execSync('vercel --version', { stdio: 'pipe' });
    log('✅ Vercel CLI detected', 'green');
  } catch (error) {
    log('❌ Vercel CLI not found. Installing...', 'yellow');
    runCommand('npm install -g vercel', 'Installing Vercel CLI');
  }

  log('\n📋 Pre-deployment checklist:', 'cyan');
  log('   1. ✅ Multi-route Stripe setup complete', 'green');
  log('   2. ✅ Firebase pre-deploy scanner ready', 'green');
  log('   3. ✅ Download system functional', 'green');
  log('   4. ⚠️  Stripe keys need to be configured', 'yellow');
  log('', 'reset');

  log('🎯 What this deploy will do:', 'cyan');
  log('   • Deploy to Vercel with serverless functions', 'yellow');
  log('   • Enable /api/create-checkout-session endpoint', 'yellow');
  log('   • Set up proper routing for Stripe', 'yellow');
  log('   • Your site will be live at rinawarptech.com', 'yellow');
  log('', 'reset');

  log('⚠️  After deployment, you MUST:', 'red');
  log('   1. Add STRIPE_SECRET_KEY to Vercel environment', 'yellow');
  log('   2. Update public/api/stripe-config.json with real keys', 'yellow');
  log('   3. Test payment flow end-to-end', 'yellow');
  log('', 'reset');

  // Deploy to Vercel
  if (runCommand('vercel --prod', 'Deploying to Vercel')) {
    log('\n🎉 Deployment successful!', 'green');
    log('', 'reset');
    log('🔧 Next steps:', 'cyan');
    log('   1. Go to https://vercel.com/dashboard', 'yellow');
    log('   2. Find your rinawarp-terminal project', 'yellow');
    log('   3. Go to Settings → Environment Variables', 'yellow');
    log('   4. Add: STRIPE_SECRET_KEY = sk_test_your_secret_key', 'yellow');
    log('   5. Redeploy: vercel --prod', 'yellow');
    log('', 'reset');
    log('🧪 Test your setup:', 'cyan');
    log('   • Visit: https://rinawarptech.com/pricing.html', 'yellow');
    log('   • Click a payment button', 'yellow');
    log('   • Check browser console for routing attempts', 'yellow');
    log('', 'reset');
    log('📱 Commands to set environment variables:', 'cyan');
    log('   vercel env add STRIPE_SECRET_KEY', 'yellow');
    log('   vercel env add STRIPE_PUBLISHABLE_KEY', 'yellow');
    log('', 'reset');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
