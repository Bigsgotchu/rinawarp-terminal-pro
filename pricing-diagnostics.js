#!/usr/bin/env node

import https from 'https';

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
  for (const test of tests) {
    const result = await testEndpoint(test);

    const _status = result.success ? '✅' : '❌';

    if (result.error) {
    }

    if (result.data && test.name === 'Stripe Config API') {
      try {
        const _config = JSON.parse(result.data);
      } catch (_e) {}
    }
  }

  // Test checkout session creation

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
          const _response = JSON.parse(data);
          console.log('✅ Checkout Session Created');
        } catch (e) {
          console.log(`❌ Response Parse Error: ${e.message}`);
        }
      } else {
      }
    });
  });

  req.on('error', err => {});

  req.write(postData);
  req.end();
}

// Run diagnostics
runDiagnostics().catch(console.error);
