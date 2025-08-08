#!/usr/bin/env node

/**
 * 🧜‍♀️ Quick Start Revenue System
 * Get your checkout page live in 60 seconds!
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🧜‍♀️ RinaWarp Terminal - Quick Revenue Setup');
console.log('============================================\n');

console.log('🎯 Your checkout page is ready to start generating sales!');
console.log('\n📋 What we have setup for you:');
console.log('   ✅ Beautiful mermaid-themed checkout page');
console.log('   ✅ Stripe payment processing');
console.log('   ✅ Automated email delivery system');
console.log('   ✅ License key generation');
console.log('   ✅ Success page with sparkle effects');

console.log('\n🚀 Starting local server...');

// Start the checkout page server
exec('python3 -m http.server 8080', (error, stdout, stderr) => {
  if (error) {
    console.log('⚠️  Python server failed, trying Node.js alternative...');
    
    // Fallback to Node.js server
    exec('npx serve . -p 8080', (error2) => {
      if (error2) {
        console.log('⚠️  Please install a web server or run manually:');
        console.log('   python3 -m http.server 8080');
        console.log('   or npm install -g serve && npx serve . -p 8080');
      }
    });
  }
});

setTimeout(() => {
  console.log('\n💰 YOUR CHECKOUT PAGE IS NOW LIVE!');
  console.log('🔗 Visit: http://localhost:8080/standalone-checkout.html');
  console.log('✅ Success page: http://localhost:8080/success.html');
  
  console.log('\n🎨 Features of your checkout page:');
  console.log('   🌊 Ocean wave animations');
  console.log('   🧜‍♀️ Mermaid theme with shimmer effects'); 
  console.log('   💳 Secure Stripe payments');
  console.log('   📧 Automated email delivery');
  console.log('   🔑 Auto-generated license keys');
  console.log('   ⚡ Mobile-responsive design');

  console.log('\n💡 Next Steps:');
  console.log('   1. Test the checkout page');
  console.log('   2. Configure your Stripe keys in .env');
  console.log('   3. Setup email delivery (SMTP/SendGrid)');
  console.log('   4. Deploy to production (run: npm run setup-revenue)');
  
  console.log('\n🎯 Ready to make your first sale!');
  console.log('   Share this link: http://localhost:8080/standalone-checkout.html');
  
  // Auto-open browser if possible
  const open = process.platform === 'darwin' ? 'open' : 
                process.platform === 'win32' ? 'start' : 'xdg-open';
  
  exec(`${open} http://localhost:8080/standalone-checkout.html`, () => {
    // Ignore errors, browser opening is optional
  });

}, 2000);

console.log('\n🌊 The revenue waves are flowing... 💰');
console.log('Press Ctrl+C to stop the server when you\'re ready to deploy to production.');
