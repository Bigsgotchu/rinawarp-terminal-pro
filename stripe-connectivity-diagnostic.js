#!/usr/bin/env node

/**
 * RinaWarp Terminal - Stripe Connectivity Diagnostic
 * Comprehensive script to diagnose Stripe API connectivity issues
 * Based on the Final Stripe Connectivity Checklist
 */

// Simple logger replacement
const logger = {
  info: msg => console.log(`ℹ️  ${msg}`),
  error: msg => console.log(`❌ ${msg}`),
  warn: msg => console.log(`⚠️  ${msg}`),
  success: msg => console.log(`✅ ${msg}`),
};
import https from 'https';
import { Buffer } from 'buffer';

logger.info('🔍 RinaWarp Terminal - Stripe Connectivity Diagnostic');
logger.info('=====================================================\n');

// Configuration
const _PRODUCTION_URL = 'https://rinawarptech.com';
const _STRIPE_API_BASE = 'https://api.stripe.com/v1';

async function _makeStripeAPICall(endpoint, _method = 'GET', _data = null) {
  return new Promise((resolve, reject) => {
    // Note: secretKey would need to be passed in or retrieved from environment
    const auth = Buffer.from(`${process.env.STRIPE_SECRET_KEY || ''}:`).toString('base64');

    const options = {
      hostname: 'api.stripe.com',
      port: 443,
      path: `/v1/${endpoint}`,
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        'User-Agent': 'RinaWarp-Diagnostic/1.0',
      },
    };

    const req = https.request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (_e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', error => {
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
        'User-Agent': 'RinaWarp-Diagnostic/1.0',
      },
    };

    const req = https.request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (_e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function _testCheckoutSession() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID || 'price_default',
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: 'https://rinawarptech.com/success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://rinawarptech.com/pricing.html',
    });

    const auth = Buffer.from(`${process.env.STRIPE_SECRET_KEY || ''}:`).toString('base64');

    const options = {
      hostname: 'api.stripe.com',
      port: 443,
      path: '/v1/checkout/sessions',
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'RinaWarp-Diagnostic/1.0',
      },
    };

    const req = https.request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (_e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', error => {
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
  logger.info('1️⃣ Testing Production Configuration...');
  logger.info('=====================================');

  let productionConfig;
  try {
    const configResult = await fetchProductionConfig();
    if (configResult.status === 200) {
      logger.info('✅ Production config endpoint accessible');
      productionConfig = configResult.data;

      // Analyze the configuration
      logger.info(`✅ Publishable key: ${productionConfig.publishableKey?.substring(0, 20)}...`);

      const keyType = productionConfig.publishableKey?.startsWith('pk_live_')
        ? 'LIVE'
        : productionConfig.publishableKey?.startsWith('pk_test_')
          ? 'TEST'
          : 'UNKNOWN';
      logger.info(`🔑 Key environment: ${keyType}`);

      logger.info(
        `📦 Standard plans configured: ${Object.keys(productionConfig.prices || {}).length}`
      );
      logger.info(
        `🚀 Beta plans configured: ${Object.keys(productionConfig.betaPrices || {}).length}`
      );
    } else {
      logger.info(`❌ Production config failed: HTTP ${configResult.status}`);
      return;
    }
  } catch (error) {
    logger.info(`❌ Cannot reach production config: ${error.message}`);
    return;
  }

  logger.info('\n2️⃣ Attempting Direct Stripe API Test...');
  logger.info('========================================');

  // We can't access the secret key directly, but we can test the public key environment
  const isLiveKey = productionConfig.publishableKey?.startsWith('pk_live_');
  logger.info(`🔍 Detected ${isLiveKey ? 'LIVE' : 'TEST'} environment from publishable key`);

  // Test price ID format
  const samplePriceId = productionConfig.prices?.personal;
  if (samplePriceId) {
    const priceIdType = samplePriceId.startsWith('price_') ? 'VALID_FORMAT' : 'INVALID_FORMAT';
    logger.info(`💰 Price ID format: ${priceIdType} (${samplePriceId})`);
  }

  logger.info('\n3️⃣ Testing Checkout Session Creation...');
  logger.info('=======================================');

  // Test through our API (this will show us the actual error)
  try {
    logger.info('🧪 Testing through production API...');

    const testResult = await new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        priceId: samplePriceId,
        successUrl: 'https://rinawarptech.com/success.html?plan=diagnostic-test',
        cancelUrl: 'https://rinawarptech.com/pricing.html',
      });

      const options = {
        hostname: 'rinawarptech.com',
        port: 443,
        path: '/api/create-checkout-session',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'RinaWarp-Diagnostic/1.0',
        },
      };

      const req = https.request(options, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } catch (_e) {
            resolve({ status: res.statusCode, data: data });
          }
        });
      });

      req.on('error', error => {
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
      logger.info('✅ Checkout session created successfully!');
      logger.info(`   Session ID: ${testResult.data.sessionId}`);
      logger.info('🎉 ALL PRICING SYSTEMS ARE WORKING!');
    } else {
      logger.info(`❌ Checkout session failed: HTTP ${testResult.status}`);
      logger.info(`   Error: ${JSON.stringify(testResult.data, null, 2)}`);

      // Analyze the error
      if (testResult.data.details?.includes('connection to Stripe')) {
        logger.info('\n🔧 DIAGNOSIS: Stripe API Connectivity Issue');
        logger.info('   Possible causes:');
        logger.info('   • Invalid or expired Stripe secret key');
        logger.info('   • Environment mismatch (test price IDs with live key or vice versa)');
        logger.info('   • Stripe account restrictions or suspensions');
        logger.info('   • Network connectivity issues');
      }
    }
  } catch (error) {
    logger.info(`❌ API test failed: ${error.message}`);
  }

  logger.info('\n4️⃣ Final Recommendations...');
  logger.info('============================');

  if (isLiveKey) {
    logger.info('🔧 LIVE Environment Detected:');
    logger.info('   1. Verify STRIPE_SECRET_KEY starts with sk_live_');
    logger.info('   2. Ensure all price IDs are from live mode');
    logger.info('   3. Check Stripe dashboard for account issues');
  } else {
    logger.info('🧪 TEST Environment Detected:');
    logger.info('   1. Verify STRIPE_SECRET_KEY starts with sk_test_');
    logger.info('   2. Ensure all price IDs are from test mode');
    logger.info('   3. Test keys should work unless there are API issues');
  }

  logger.info('\n🎯 Voice Integration Command:');
  logger.info('============================');
  logger.info('Add this to your voice commands for ongoing monitoring:');
  logger.info('"Check Stripe status" → Run stripe connectivity diagnostic');

  logger.info('\n📊 Summary:');
  logger.info('===========');
  logger.info(`Configuration Status: ${productionConfig ? '✅ Working' : '❌ Failed'}`);
  logger.info(`Environment Type: ${isLiveKey ? 'LIVE' : 'TEST'}`);
  logger.info('Checkout API Status: Testing above...');
}

// Voice integration helper (for future RinaWarp integration)
function generateVoiceIntegrationCode() {
  return `
// Add to your voice command system:
async function checkStripeStatus() {
  try {
    logger.info('🎤 Voice command: Checking Stripe status...');
    
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
      logger.error('Stripe error:', error);
    }
  } catch (error) {
    voiceHandler?.speak('Unable to reach Stripe. There may be a network issue.');
    logger.error('Stripe connectivity error:', error);
  }
}`;
}

// Run diagnostics
runDiagnostics()
  .then(() => {
    logger.info('\n🏁 Diagnostic Complete!');
    logger.info('\nVoice Integration Code:');
    logger.info(generateVoiceIntegrationCode());
  })
  .catch(error => {
    logger.error('\n💥 Diagnostic failed:', error);
    process.exit(1);
  });
