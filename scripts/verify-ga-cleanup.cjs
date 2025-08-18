#!/usr/bin/env node

/**
 * Verify Google Analytics Cleanup
 * Quick verification that duplicate is removed and ready for fresh setup
 */

const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function verifyCleanup() {
  console.log('🌊 RinaWarp Terminal - GA Cleanup Verification');
  console.log('==============================================');
  console.log('');

  const deleted = await ask('Have you deleted the duplicate property (494585728)? (y/n): ');

  if (deleted.toLowerCase() !== 'y') {
    console.log('');
    console.log('⏳ Please delete the duplicate property first:');
    console.log('1. Go to: https://analytics.google.com/analytics/web/#/a494585728w0p0/admin');
    console.log('2. Property Settings → Move to Trash Can');
    console.log('3. Confirm deletion');
    console.log('4. Run this script again');
    rl.close();
    return;
  }

  console.log('');
  console.log('✅ Great! Duplicate property deleted.');
  console.log('');

  const hasNew = await ask('Have you created a new clean GA4 property? (y/n): ');

  if (hasNew.toLowerCase() === 'y') {
    const newId = await ask('Enter your new GA4 Measurement ID (G-XXXXXXXXXX): ');

    if (!/^G-[A-Z0-9]{10}$/.test(newId)) {
      console.log('❌ Invalid format. Should be like G-ABC1234567');
      rl.close();
      return;
    }

    console.log('');
    console.log('🔧 Updating all configuration files with your new tracking ID...');

    // Update files with the new tracking ID
    const filesToUpdate = [
      { path: './public/js/ga4-init.js', pattern: /G-G424CV5GGT/g },
      { path: './public/js/analytics-unified.js', pattern: /G-G424CV5GGT/g },
      { path: './production.env', pattern: /G-G424CV5GGT/g },
      { path: './public/js/ga-conversion-tracking.js', pattern: /G-G424CV5GGT/g },
    ];

    let updatedCount = 0;
    for (const file of filesToUpdate) {
      if (fs.existsSync(file.path)) {
        let content = fs.readFileSync(file.path, 'utf8');
        if (content.match(file.pattern)) {
          content = content.replace(file.pattern, newId);
          fs.writeFileSync(file.path, content);
          console.log(`✅ Updated ${file.path}`);
          updatedCount++;
        }
      }
    }

    console.log('');
    console.log(`✅ Updated ${updatedCount} files with new tracking ID: ${newId}`);
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Deploy to live server: node scripts/deploy-ga-to-server.cjs');
    console.log('2. Test configuration: node scripts/test-google-analytics.cjs');
    console.log('3. Check Real-Time reports in GA dashboard');
  } else {
    console.log('');
    console.log('📋 Create your new GA4 property:');
    console.log('1. Go to: https://analytics.google.com/');
    console.log('2. Admin → Create Property');
    console.log('3. Name: "RinaWarp Terminal"');
    console.log('4. Add Web Stream: https://rinawarptech.com');
    console.log('5. Copy the Measurement ID');
    console.log('6. Run this script again with your new ID');
  }

  console.log('');
  console.log('🧜‍♀️ Clean Google Analytics setup in progress!');
  rl.close();
}

verifyCleanup().catch(console.error);
