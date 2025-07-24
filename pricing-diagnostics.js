#!/usr/bin/env node

import https from 'https';

console.log('🔍 RinaWarp Terminal Pricing Page Diagnostics');
console.log('='.repeat(50));

// Test endpoints
const tests = [
  {
    name: 'Health Check',
    url: 'https://www.rinawarptech.com/health',
    expected: 200,
  },
  {
    name: 'Pricing Page',
    url: 'https://www.rinawarptech.com/pricing.html',
    expected: 200,
  },
  {
    name: 'Stripe Config API',
    url: 'https://www.rinawarptech.com/api/stripe-config',
    expected: 200,
    checkContent: true,
  },
];

async function testEndpoint(test) {
  return new Promise(resolve => {
    const startTime = Date.now();

    https
      .get(test.url, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;

          const result = {
            name: test.name,
            url: test.url,
            status: res.statusCode,
            responseTime: `${responseTime}ms`,
            success: res.statusCode === test.expected,
            data: test.checkContent ? data : null,
          };

          resolve(result);
        });
      })
      .on('error', err => {
        resolve({
          name: test.name,
          url: test.url,
          status: 'ERROR',
          responseTime: 'N/A',
          success: false,
          error: err.message,
        });
      });
  });
}

async function runDiagnostics() {
  console.log('Running endpoint tests...\n');

  for (const test of tests) {
    const result = await testEndpoint(test);

    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Response Time: ${result.responseTime}`);

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    if (result.data && test.name === 'Stripe Config API') {
      try {
        const config = JSON.parse(result.data);
        console.log(`   Publishable Key: ${config.publishableKey ? 'Present' : 'Missing'}`);
        console.log(`   Personal Price: ${config.prices?.personal || 'Missing'}`);
        console.log(`   Professional Price: ${config.prices?.professional || 'Missing'}`);
        console.log(`   Team Price: ${config.prices?.team || 'Missing'}`);
        console.log(`   Beta Prices: ${Object.keys(config.betaPrices || {}).length} configured`);
      } catch (e) {
        console.log(`   Parse Error: ${e.message}`);
      }
    }

    console.log('');
  }

  // Test checkout session creation
  console.log('🛒 Testing Checkout Session Creation...');

  const checkoutTest = {
    priceId: 'price_1RayttG2ToGP7Chn6ectv20s', // Personal plan
    successUrl: 'https://www.rinawarptech.com/success.html',
    cancelUrl: 'https://www.rinawarptech.com/pricing.html',
  };

  const postData = JSON.stringify(checkoutTest);

  const options = {
    hostname: 'www.rinawarptech.com',
    port: 443,
    path: '/api/create-checkout-session',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const req = https.request(options, res => {
    let data = '';

    res.on('data', chunk => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const response = JSON.parse(data);
          console.log('✅ Checkout Session Created');
          console.log(`   Session ID: ${response.sessionId}`);
          console.log(`   Checkout URL: ${response.url ? 'Generated' : 'Missing'}`);
        } catch (e) {
          console.log(`❌ Response Parse Error: ${e.message}`);
        }
      } else {
        console.log('❌ Checkout Creation Failed');
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Response: ${data}`);
      }
    });
  });

  req.on('error', err => {
    console.log(`❌ Checkout Request Error: ${err.message}`);
  });

  req.write(postData);
  req.end();
}

// Run diagnostics
runDiagnostics().catch(console.error);
