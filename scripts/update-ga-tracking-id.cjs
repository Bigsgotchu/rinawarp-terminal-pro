#!/usr/bin/env node

/**
 * Update Google Analytics Tracking ID
 * Replaces placeholder with real tracking ID: G-SZK23HMCVP
 */

const fs = require('fs');

const NEW_TRACKING_ID = 'G-SZK23HMCVP';
const OLD_TRACKING_ID = 'G-G424CV5GGT';

console.log('🌊 RinaWarp Terminal - Google Analytics Update');
console.log('==============================================');
console.log('');
console.log(`🔄 Replacing ${OLD_TRACKING_ID} with ${NEW_TRACKING_ID}`);
console.log('');

// Files to update with the new tracking ID
const filesToUpdate = [
  {
    path: './public/js/ga4-init.js',
    description: 'GA4 Initialization Script',
  },
  {
    path: './public/js/analytics-unified.js',
    description: 'Unified Analytics System',
  },
  {
    path: './public/js/ga-conversion-tracking.js',
    description: 'Conversion Tracking Script',
  },
  {
    path: './production.env',
    description: 'Production Environment Config',
  },
  {
    path: './public/index.html',
    description: 'Marketing Website',
  },
  {
    path: './RinaWarp-Production-Final/index.html',
    description: 'Desktop Application',
  },
  {
    path: './website/index.html',
    description: 'Production Website',
  },
];

let updatedCount = 0;
let totalReplacements = 0;

for (const file of filesToUpdate) {
  if (fs.existsSync(file.path)) {
    try {
      let content = fs.readFileSync(file.path, 'utf8');
      const matches = content.match(new RegExp(OLD_TRACKING_ID, 'g'));

      if (matches && matches.length > 0) {
        content = content.replace(new RegExp(OLD_TRACKING_ID, 'g'), NEW_TRACKING_ID);
        fs.writeFileSync(file.path, content);
        console.log(
          `✅ Updated ${file.path} (${file.description}) - ${matches.length} replacement(s)`
        );
        updatedCount++;
        totalReplacements += matches.length;
      } else {
        console.log(`ℹ️  No changes needed in ${file.path}`);
      }
    } catch (error) {
      console.log(`❌ Error updating ${file.path}: ${error.message}`);
    }
  } else {
    console.log(`⚠️  File not found: ${file.path}`);
  }
}

console.log('');
console.log('📊 Update Summary:');
console.log(`✅ Files updated: ${updatedCount}`);
console.log(`🔄 Total replacements: ${totalReplacements}`);
console.log(`🆔 New tracking ID: ${NEW_TRACKING_ID}`);
console.log('');

// Add Google Analytics tracking script to main website if not present
const websiteIndexPath = './public/index.html';
if (fs.existsSync(websiteIndexPath)) {
  let content = fs.readFileSync(websiteIndexPath, 'utf8');

  // Check if Google Analytics script is already present
  if (!content.includes('googletagmanager.com/gtag/js')) {
    console.log('📄 Adding Google Analytics script to marketing website...');

    const gaScript = `
<!-- Google Analytics 4 - RinaWarp Terminal -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${NEW_TRACKING_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  
  gtag('config', '${NEW_TRACKING_ID}', {
    send_page_view: true,
    anonymize_ip: true,
    allow_display_features: false,
    cookie_flags: 'SameSite=Strict;Secure'
  });

  // Set global tracking ID for other scripts
  window.GA_TRACKING_ID = '${NEW_TRACKING_ID}';
</script>`;

    content = content.replace('</head>', `${gaScript}\n</head>`);
    fs.writeFileSync(websiteIndexPath, content);
    console.log('✅ Added Google Analytics tracking script to marketing website');
  } else {
    console.log('✅ Google Analytics script already present in marketing website');
  }
}

console.log('');
console.log('🚀 Next steps:');
console.log('1. Test configuration: node scripts/test-google-analytics.cjs');
console.log('2. Deploy to live server: node scripts/deploy-ga-to-server.cjs');
console.log('3. Check Real-Time reports in GA dashboard');
console.log('');
console.log('🧜‍♀️ RinaWarp Terminal analytics are ready to track revenue!');
