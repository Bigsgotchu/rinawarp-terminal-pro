#!/usr/bin/env node

/**
 * Google Analytics Duplicate Cleanup Helper
 * Helps identify and guide cleanup of duplicate GA properties
 */

console.log('🌊 RinaWarp Terminal - Google Analytics Cleanup Helper');
console.log('====================================================');
console.log('');

console.log('🔍 Duplicate Property Detected: rinawarp-494585728');
console.log('');

console.log('📋 Steps to Clean Up Duplicate GA Property:');
console.log('');

console.log('1. 🌐 Go to Google Analytics Admin:');
console.log('   https://analytics.google.com/analytics/web/#/a494585728w0p0/admin');
console.log('');

console.log('2. 🗑️ Delete Duplicate Property:');
console.log('   • In Admin section, click on Property Settings');
console.log('   • Scroll down to find "Move to Trash Can"');
console.log('   • Click "Move to Trash Can"');
console.log('   • Confirm deletion');
console.log('');

console.log('3. 🆕 Create Clean Property:');
console.log('   • Go back to Admin → Create Property');
console.log('   • Property name: "RinaWarp Terminal"');
console.log('   • Industry: Technology/Software');
console.log('   • Reporting time zone: Your timezone');
console.log('   • Currency: USD');
console.log('');

console.log('4. 📊 Set Up Data Stream:');
console.log('   • Click "Add stream" → Web');
console.log('   • Website URL: https://rinawarptech.com');
console.log('   • Stream name: "RinaWarp Terminal Website"');
console.log('   • Enhanced measurement: ON (recommended)');
console.log('');

console.log('5. 🔑 Get Your New Measurement ID:');
console.log('   • After creating the stream, copy the Measurement ID');
console.log('   • Format will be: G-XXXXXXXXXX');
console.log("   • Save this ID - you'll need it for configuration");
console.log('');

console.log('6. 🧹 Clean Up Old References:');
console.log('   • Remove any bookmarks to the old property');
console.log('   • Update any documentation with new property ID');
console.log('   • Ensure team members use the new property');
console.log('');

console.log('🚨 Important Notes:');
console.log('• Deleting a property is permanent after 35 days');
console.log('• Data in deleted property cannot be recovered');
console.log('• Make sure you have the correct property before deleting');
console.log('• The duplicate might be empty/unused - check data first');
console.log('');

console.log('🔍 Current Configuration Status:');
console.log('• Using placeholder ID: G-G424CV5GGT');
console.log('• Ready to accept new tracking ID');
console.log('• All components configured and waiting');
console.log('');

console.log('📞 Need Help?');
console.log("If you're unsure which property to keep:");
console.log('1. Check data range in both properties');
console.log('2. Look at property creation dates');
console.log('3. Verify which has your website data');
console.log('4. Keep the one with actual traffic/data');
console.log('');

console.log('✅ After cleanup, run:');
console.log('   node scripts/configure-ga-complete.cjs');
console.log('   (with your new clean Measurement ID)');
console.log('');

// Check for any references to the duplicate
const fs = require('fs');
const _path = require('path');

function findDuplicateReferences() {
  console.log('🔍 Scanning for duplicate property references...');

  const filesToCheck = [
    './production.env',
    './public/index.html',
    './public/js/ga4-init.js',
    './public/js/analytics-unified.js',
    './docs/GOOGLE_ANALYTICS_SETUP.md',
  ];

  let foundReferences = false;

  for (const file of filesToCheck) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('494585728')) {
        console.log(`❌ Found duplicate reference in: ${file}`);
        foundReferences = true;
      }
    }
  }

  if (!foundReferences) {
    console.log('✅ No duplicate property references found in codebase');
  }
}

findDuplicateReferences();

console.log('');
console.log('🧜‍♀️ Ready to set up clean Google Analytics for RinaWarp Terminal!');
