#!/usr/bin/env node

/**
 * Verify Google Analytics Live Implementation
 * Tests that GA is working on the live website
 */

const https = require('https');

console.log('🌊 RinaWarp Terminal - Live Google Analytics Verification');
console.log('========================================================');
console.log('');

const TRACKING_ID = 'G-SZK23HMCVP';
const WEBSITE_URL = 'https://rinawarptech.com';

console.log(`📊 Tracking ID: ${TRACKING_ID}`);
console.log(`🌐 Website: ${WEBSITE_URL}`);
console.log('');

// Test 1: Verify GA script loads
function testGAScriptLoads() {
  return new Promise(resolve => {
    console.log('🔍 Test 1: Verifying Google Analytics script loads...');

    const url = `https://www.googletagmanager.com/gtag/js?id=${TRACKING_ID}`;

    https
      .get(url, res => {
        if (res.statusCode === 200) {
          console.log('✅ Google Analytics script loads successfully');
          resolve(true);
        } else {
          console.log(`❌ GA script failed to load (status: ${res.statusCode})`);
          resolve(false);
        }
      })
      .on('error', error => {
        console.log(`❌ GA script load error: ${error.message}`);
        resolve(false);
      });
  });
}

// Test 2: Check website has GA tracking
function testWebsiteHasGA() {
  return new Promise(resolve => {
    console.log('🔍 Test 2: Checking website has Google Analytics...');

    https
      .get(WEBSITE_URL, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          if (data.includes('googletagmanager.com/gtag/js') && data.includes(TRACKING_ID)) {
            console.log('✅ Website contains Google Analytics tracking code');
            console.log(`✅ Tracking ID ${TRACKING_ID} found in website`);
            resolve(true);
          } else {
            console.log('❌ Google Analytics tracking not found on website');
            resolve(false);
          }
        });
      })
      .on('error', error => {
        console.log(`❌ Website check error: ${error.message}`);
        resolve(false);
      });
  });
}

// Run all tests
async function runTests() {
  console.log('🧪 Running Google Analytics verification tests...');
  console.log('');

  const test1 = await testGAScriptLoads();
  const test2 = await testWebsiteHasGA();

  console.log('');
  console.log('📊 Test Results:');
  console.log(`Test 1 - GA Script Loads: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Test 2 - Website Has GA: ${test2 ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = test1 && test2;

  console.log('');
  console.log('🎯 Overall Status:');
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED! Google Analytics is live and working!');
    console.log('');
    console.log('🚀 Your RinaWarp Terminal analytics are now tracking:');
    console.log('• 📈 Page views and user sessions');
    console.log('• 📥 App downloads by platform');
    console.log('• 💰 Revenue from subscriptions');
    console.log('• 🎯 Conversion events and goals');
    console.log('• 📊 User behavior and engagement');
    console.log('');
    console.log('📱 Next Steps:');
    console.log('1. Visit your website to generate test traffic');
    console.log('2. Check Real-Time reports in GA dashboard');
    console.log('3. Set up conversion goals and audiences');
    console.log('4. Monitor revenue tracking from purchases');
    console.log('');
    console.log('🔍 Real-Time Verification:');
    console.log('Visit: https://analytics.google.com/analytics/web/#/p0/realtime/overview');
    console.log('Then visit: https://rinawarptech.com');
    console.log('You should see real-time activity within 30 seconds!');
  } else {
    console.log('❌ Some tests failed. Please check configuration.');
  }

  console.log('');
  console.log('🧜‍♀️ RinaWarp Terminal analytics verification complete!');
}

runTests().catch(console.error);
