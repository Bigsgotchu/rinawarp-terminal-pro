#!/usr/bin/env node

/**
 * RinaWarp Terminal - Stripe Connectivity Diagnostic
 * Comprehensive script to diagnose Stripe API connectivity issues
 * Based on the Final Stripe Connectivity Checklist
 */

import https from 'https';
import { Buffer } from 'buffer';

console.log('🔍 RinaWarp Terminal - Stripe Connectivity Diagnostic');
console.log('=====================================================\n');

// Configuration
const PRODUCTION_URL = 'https://rinawarptech.com';
const STRIPE_API_BASE = 'https://api.stripe.com/v1';

async function makeStripeAPICall(endpoint, secretKey) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${secretKey}:`).toString('base64');
    
    const options = {
      hostname: 'api.stripe.com',
      port: 443,
      path: `/v1/${endpoint}`,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'RinaWarp-Diagnostic/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function fetchProductionConfig() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'rinawarptech.com',
      port: 443,
      path: '/api/stripe-config',
      method: 'GET',
      headers: {
        'User-Agent': 'RinaWarp-Diagnostic/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testCheckoutSession(priceId, secretKey) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: 'https://rinawarptech.com/success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://rinawarptech.com/pricing.html',
    });

    const auth = Buffer.from(`${secretKey}:`).toString('base64');
    
    const options = {
      hostname: 'api.stripe.com',
      port: 443,
      path: '/v1/checkout/sessions',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'RinaWarp-Diagnostic/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

async function runDiagnostics() {
  console.log('1️⃣ Testing Production Configuration...');
  console.log('=====================================');
  
  let productionConfig;
  try {
    const configResult = await fetchProductionConfig();
    if (configResult.status === 200) {
      console.log('✅ Production config endpoint accessible');
      productionConfig = configResult.data;
      
      // Analyze the configuration
      console.log(`✅ Publishable key: ${productionConfig.publishableKey?.substring(0, 20)}...`);
      
      const keyType = productionConfig.publishableKey?.startsWith('pk_live_') ? 'LIVE' : 
        productionConfig.publishableKey?.startsWith('pk_test_') ? 'TEST' : 'UNKNOWN';
      console.log(`🔑 Key environment: ${keyType}`);
      
      console.log(`📦 Standard plans configured: ${Object.keys(productionConfig.prices || {}).length}`);
      console.log(`🚀 Beta plans configured: ${Object.keys(productionConfig.betaPrices || {}).length}`);
      
    } else {
      console.log(`❌ Production config failed: HTTP ${configResult.status}`);
      return;
    }
  } catch (error) {
    console.log(`❌ Cannot reach production config: ${error.message}`);
    return;
  }

  console.log('\n2️⃣ Attempting Direct Stripe API Test...');
  console.log('========================================');
  
  // We can't access the secret key directly, but we can test the public key environment
  const isLiveKey = productionConfig.publishableKey?.startsWith('pk_live_');
  console.log(`🔍 Detected ${isLiveKey ? 'LIVE' : 'TEST'} environment from publishable key`);
  
  // Test price ID format
  const samplePriceId = productionConfig.prices?.personal;
  if (samplePriceId) {
    const priceIdType = samplePriceId.startsWith('price_') ? 'VALID_FORMAT' : 'INVALID_FORMAT';
    console.log(`💰 Price ID format: ${priceIdType} (${samplePriceId})`);
  }

  console.log('\n3️⃣ Testing Checkout Session Creation...');
  console.log('=======================================');
  
  // Test through our API (this will show us the actual error)
  try {
    console.log('🧪 Testing through production API...');
    
    const testResult = await new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        priceId: samplePriceId,
        successUrl: 'https://rinawarptech.com/success.html?plan=diagnostic-test',
        cancelUrl: 'https://rinawarptech.com/pricing.html'
      });

      const options = {
        hostname: 'rinawarptech.com',
        port: 443,
        path: '/api/create-checkout-session',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'RinaWarp-Diagnostic/1.0'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(postData);
      req.end();
    });

    if (testResult.status === 200 && testResult.data.sessionId) {
      console.log('✅ Checkout session created successfully!');
      console.log(`   Session ID: ${testResult.data.sessionId}`);
      console.log('🎉 ALL PRICING SYSTEMS ARE WORKING!');
    } else {
      console.log(`❌ Checkout session failed: HTTP ${testResult.status}`);
      console.log(`   Error: ${JSON.stringify(testResult.data, null, 2)}`);
      
      // Analyze the error
      if (testResult.data.details?.includes('connection to Stripe')) {
        console.log('\n🔧 DIAGNOSIS: Stripe API Connectivity Issue');
        console.log('   Possible causes:');
        console.log('   • Invalid or expired Stripe secret key');
        console.log('   • Environment mismatch (test price IDs with live key or vice versa)');
        console.log('   • Stripe account restrictions or suspensions');
        console.log('   • Network connectivity issues');
      }
    }

  } catch (error) {
    console.log(`❌ API test failed: ${error.message}`);
  }

  console.log('\n4️⃣ Final Recommendations...');
  console.log('============================');
  
  if (isLiveKey) {
    console.log('🔧 LIVE Environment Detected:');
    console.log('   1. Verify STRIPE_SECRET_KEY starts with sk_live_');
    console.log('   2. Ensure all price IDs are from live mode');
    console.log('   3. Check Stripe dashboard for account issues');
  } else {
    console.log('🧪 TEST Environment Detected:');
    console.log('   1. Verify STRIPE_SECRET_KEY starts with sk_test_');
    console.log('   2. Ensure all price IDs are from test mode');
    console.log('   3. Test keys should work unless there are API issues');
  }
  
  console.log('\n🎯 Voice Integration Command:');
  console.log('============================');
  console.log('Add this to your voice commands for ongoing monitoring:');
  console.log('"Check Stripe status" → Run stripe connectivity diagnostic');
  
  console.log('\n📊 Summary:');
  console.log('===========');
  console.log(`Configuration Status: ${productionConfig ? '✅ Working' : '❌ Failed'}`);
  console.log(`Environment Type: ${isLiveKey ? 'LIVE' : 'TEST'}`);
  console.log('Checkout API Status: Testing above...');
}

// Voice integration helper (for future RinaWarp integration)
function generateVoiceIntegrationCode() {
  return `
// Add to your voice command system:
async function checkStripeStatus() {
  try {
    console.log('🎤 Voice command: Checking Stripe status...');
    
    const response = await fetch('/api/stripe-config');
    if (!response.ok) {
      voiceHandler?.speak('Stripe configuration endpoint is not responding.');
      return;
    }
    
    const config = await response.json();
    const isLive = config.publishableKey?.startsWith('pk_live_');
    
    // Test checkout session creation
    const testResponse = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: config.prices?.personal,
        successUrl: window.location.origin + '/success.html',
        cancelUrl: window.location.href
      })
    });
    
    if (testResponse.ok) {
      voiceHandler?.speak(\`Stripe API is responding. \${isLive ? 'Live' : 'Test'} environment is ready.\`);
    } else {
      const error = await testResponse.json();
      voiceHandler?.speak('Stripe API returned an error. Please check your credentials.');
      console.error('Stripe error:', error);
    }
  } catch (error) {
    voiceHandler?.speak('Unable to reach Stripe. There may be a network issue.');
    console.error('Stripe connectivity error:', error);
  }
}`;
}

// Run diagnostics
runDiagnostics()
  .then(() => {
    console.log('\n🏁 Diagnostic Complete!');
    console.log('\nVoice Integration Code:');
    console.log(generateVoiceIntegrationCode());
  })
  .catch((error) => {
    console.error('\n💥 Diagnostic failed:', error);
    process.exit(1);
  });
