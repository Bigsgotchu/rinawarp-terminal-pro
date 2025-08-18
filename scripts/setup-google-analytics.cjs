#!/usr/bin/env node

/**
 * Google Analytics Setup CLI
 * Configures GA4 tracking across all RinaWarp Terminal components
 */

const fs = require('fs');
const _path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function setupGoogleAnalytics() {
  console.log('🌊 RinaWarp Terminal - Google Analytics Setup');
  console.log('============================================');
  console.log('');

  // Check if user has a GA tracking ID
  const hasGA = await ask('Do you have a Google Analytics 4 property set up? (y/n): ');

  let trackingId;

  if (hasGA.toLowerCase() === 'y') {
    trackingId = await ask('Enter your GA4 Measurement ID (format: G-XXXXXXXXXX): ');

    // Validate format
    if (!/^G-[A-Z0-9]{10}$/.test(trackingId)) {
      console.log('❌ Invalid format. GA4 Measurement IDs should be like G-ABC1234567');
      console.log('Please check your Google Analytics dashboard and try again.');
      rl.close();
      return;
    }
  } else {
    console.log('');
    console.log('📋 To create a Google Analytics 4 property:');
    console.log('1. Go to https://analytics.google.com/');
    console.log('2. Click "Admin" → "Create Property"');
    console.log('3. Enter "RinaWarp Terminal" as property name');
    console.log('4. Set up a data stream for your website');
    console.log('5. Copy the Measurement ID (G-XXXXXXXXXX)');
    console.log('');

    const shouldContinue = await ask('Would you like to continue with a placeholder? (y/n): ');
    if (shouldContinue.toLowerCase() !== 'y') {
      rl.close();
      return;
    }

    trackingId = 'G-PLACEHOLDER';
  }

  console.log('');
  console.log('🔧 Configuring Google Analytics...');

  // Update files with tracking ID
  await updateFiles(trackingId);

  // Update environment files
  await updateEnvironmentFiles(trackingId);

  // Update website files
  await updateWebsiteFiles(trackingId);

  console.log('');
  console.log('✅ Google Analytics configuration complete!');
  console.log('');
  console.log('📊 What was configured:');
  console.log('- Marketing website tracking');
  console.log('- Desktop app analytics');
  console.log('- Backend API event tracking');
  console.log('- E-commerce conversion tracking');
  console.log('');
  console.log('🚀 Next steps:');
  console.log('1. Deploy your updated code');
  console.log('2. Test tracking with Real-Time reports in GA');
  console.log('3. Set up conversion goals in GA dashboard');

  if (trackingId === 'G-PLACEHOLDER') {
    console.log('');
    console.log('⚠️  Remember to replace G-PLACEHOLDER with your real tracking ID!');
  }

  rl.close();
}

async function updateFiles(trackingId) {
  const files = [
    {
      path: './public/js/ga4-init.js',
      replace: /const GA4_MEASUREMENT_ID = '[^']*'/,
      with: `const GA4_MEASUREMENT_ID = '${trackingId}'`,
    },
    {
      path: './public/js/analytics-unified.js',
      replace: /GA_TRACKING_ID:\s*'[^']*'/,
      with: `GA_TRACKING_ID: '${trackingId}'`,
    },
    {
      path: './public/index.html',
      replace: /window\.GA_TRACKING_ID\s*=\s*'[^']*'/,
      with: `window.GA_TRACKING_ID = '${trackingId}'`,
    },
  ];

  for (const file of files) {
    try {
      if (fs.existsSync(file.path)) {
        let content = fs.readFileSync(file.path, 'utf8');
        content = content.replace(file.replace, file.with);
        fs.writeFileSync(file.path, content);
        console.log(`✅ Updated ${file.path}`);
      }
    } catch (error) {
      console.log(`⚠️  Could not update ${file.path}: ${error.message}`);
    }
  }
}

async function updateEnvironmentFiles(trackingId) {
  const envFiles = ['./production.env', './.env.production', './.env.local'];

  for (const envFile of envFiles) {
    try {
      if (fs.existsSync(envFile)) {
        let content = fs.readFileSync(envFile, 'utf8');

        // Update or add GA tracking ID
        if (content.includes('GOOGLE_ANALYTICS_ID') || content.includes('GA_TRACKING_ID')) {
          content = content.replace(/GA_TRACKING_ID=.*/g, `GA_TRACKING_ID=${trackingId}`);
          content = content.replace(/GOOGLE_ANALYTICS_ID=.*/g, `GOOGLE_ANALYTICS_ID=${trackingId}`);
        } else {
          content += `\n# Google Analytics\nGA_TRACKING_ID=${trackingId}\n`;
        }

        fs.writeFileSync(envFile, content);
        console.log(`✅ Updated ${envFile}`);
      }
    } catch (error) {
      console.log(`⚠️  Could not update ${envFile}: ${error.message}`);
    }
  }
}

async function updateWebsiteFiles(trackingId) {
  // Update the production website
  const websiteIndex = './website/index.html';
  if (fs.existsSync(websiteIndex)) {
    try {
      let content = fs.readFileSync(websiteIndex, 'utf8');

      // Add GA4 tracking to website if not present
      if (!content.includes('gtag') && !content.includes('googletagmanager')) {
        const gaScript = `
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${trackingId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${trackingId}', {
    send_page_view: true,
    anonymize_ip: true
  });
</script>
`;

        content = content.replace('</head>', `${gaScript}\n</head>`);
        fs.writeFileSync(websiteIndex, content);
        console.log('✅ Added GA tracking to website');
      }
    } catch (error) {
      console.log(`⚠️  Could not update website: ${error.message}`);
    }
  }
}

// Run the setup
setupGoogleAnalytics().catch(console.error);
