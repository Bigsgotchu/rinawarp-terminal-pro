#!/usr/bin/env node
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal - Comprehensive Integration Verification
 *
 * This script systematically verifies all critical integration points:
 * 1. Email Delivery Configuration
 * 2. Stripe Configuration & Price Mapping
 * 3. Webhook Security & Event Processing
 * 4. Environment Configuration Audit
 * 5. Security Configuration Review
 */

import { config } from 'dotenv';
import fetch from 'node-fetch';
import Stripe from 'stripe';
import _crypto from 'crypto';

// Load environment variables
config();

const SERVER_URL = process.env.RAILWAY_URL || 'http://localhost:8080';
const WEBHOOK_URL = `${SERVER_URL}/webhook`;

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
};

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const levelColors = {
    INFO: colors.blue,
    SUCCESS: colors.green,
    WARNING: colors.yellow,
    ERROR: colors.red,
    DEBUG: colors.magenta,
  };

  const color = levelColors[level] || colors.white;


  if (data) {
  }
}

// Test 1: Environment Configuration Audit
async function testEnvironmentConfig() {
  log('INFO', '🔧 Testing Environment Configuration...');

  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_PERSONAL_MONTHLY',
    'STRIPE_PRICE_PERSONAL_YEARLY',
    'STRIPE_PRICE_PROFESSIONAL_MONTHLY',
    'STRIPE_PRICE_PROFESSIONAL_YEARLY',
    'STRIPE_PRICE_TEAM_MONTHLY',
    'STRIPE_PRICE_TEAM_YEARLY',
  ];

  const optionalVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SENDGRID_API_KEY', 'RAILWAY_URL'];

  let score = 0;
  const results = { required: {}, optional: {}, issues: [] };

  // Check required variables
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    const isSet = value && value !== `{{${varName}}}`;
    results.required[varName] = isSet;

    if (isSet) {
      score += 10;
      log('SUCCESS', `✅ ${varName}: Configured`);
    } else {
      log('ERROR', `❌ ${varName}: Missing or placeholder`);
      results.issues.push(`Missing required variable: ${varName}`);
    }
  });

  // Check optional variables
  optionalVars.forEach(varName => {
    const isSet = !!process.env[varName];
    results.optional[varName] = isSet;

    if (isSet) {
      log('SUCCESS', `✅ ${varName}: Configured`);
      score += 5;
    } else {
      log('WARNING', `⚠️ ${varName}: Not configured`);
    }
  });

  // Environment specific checks
  const nodeEnv = process.env.NODE_ENV || 'development';
  const usingLiveKeys = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');

  if (nodeEnv === 'development' && usingLiveKeys) {
    log('WARNING', '⚠️ Using live Stripe keys in development environment');
    results.issues.push('Live Stripe keys in development environment');
  }

  // Email configuration check
  const hasNodemailer = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  const hasSendGrid = process.env.SENDGRID_API_KEY;

  if (!hasNodemailer && !hasSendGrid) {
    log('ERROR', '❌ No email service configured (neither SMTP nor SendGrid)');
    results.issues.push('No email delivery mechanism configured');
  }

  return {
    score: Math.round((score / (requiredVars.length * 10 + optionalVars.length * 5)) * 100),
    ...results,
  };
}

// Test 2: Stripe Configuration Validation
async function testStripeConfig() {
  log('INFO', '💳 Testing Stripe Configuration...');

  try {
    // Test server endpoint
    const response = await fetch(`${SERVER_URL}/api/stripe-config`);
    if (!response.ok) {
      throw new Error(new Error(`Server responded with ${response.status}`));
    }

    const config = await response.json();
    log('SUCCESS', '✅ Stripe config endpoint responding');

    // Validate configuration structure
    const requiredFields = ['publishableKey', 'prices'];
    const missingFields = requiredFields.filter(field => !config[field]);

    if (missingFields.length > 0) {
      log('ERROR', `❌ Missing fields in config: ${missingFields.join(', ')}`);
      return { success: false, config, issues: [`Missing fields: ${missingFields.join(', ')}`] };
    }

    // Validate price structure
    const plans = ['personal', 'professional', 'team'];
    const billingCycles = ['monthly', 'yearly'];
    const issues = [];

    for (const plan of plans) {
      if (!config.prices[plan]) {
        issues.push(`Missing price configuration for ${plan} plan`);
        continue;
      }

      for (const cycle of billingCycles) {
        if (!config.prices[plan][cycle]) {
          issues.push(`Missing ${cycle} price for ${plan} plan`);
        } else {
          log('SUCCESS', `✅ ${plan} ${cycle}: ${config.prices[plan][cycle]}`);
        }
      }
    }

    // Test Stripe API connection
    if (
      process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_SECRET_KEY !== '{{STRIPE_SECRET_KEY}}'
    ) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      try {
        // Validate that all configured price IDs exist in Stripe
        for (const plan of plans) {
          for (const cycle of billingCycles) {
            const priceId = config.prices[plan]?.[cycle];
            if (priceId) {
              const price = await stripe.prices.retrieve(priceId);
              log(
                'SUCCESS',
                `✅ Stripe price ${priceId} exists: ${price.nickname || 'No nickname'}`
              );
            }
          }
        }
      } catch (stripeError) {
        log('ERROR', `❌ Stripe API error: ${stripeError.message}`);
        issues.push(`Stripe API error: ${stripeError.message}`);
      }
    }

    return {
      success: issues.length === 0,
      config,
      issues,
    };
  } catch (error) {
    log('ERROR', `❌ Failed to test Stripe config: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test 3: Webhook Security & Functionality
async function testWebhookSecurity() {
  log('INFO', '🔒 Testing Webhook Security...');

  const tests = [];

  // Test 1: Missing signature header
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'test', data: {} }),
    });

    tests.push({
      name: 'Missing Signature Header',
      expected: 400,
      actual: response.status,
      success: response.status === 400,
    });

    if (response.status === 400) {
      log('SUCCESS', '✅ Correctly rejects requests without signature');
    } else {
      log('ERROR', `❌ Expected 400, got ${response.status}`);
    }
  } catch (error) {
    log('ERROR', `❌ Webhook test failed: ${error.message}`);
    tests.push({
      name: 'Missing Signature Header',
      error: error.message,
      success: false,
    });
  }

  // Test 2: Invalid signature
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=1234567890,v1=invalid_signature',
      },
      body: JSON.stringify({ type: 'test', data: {} }),
    });

    tests.push({
      name: 'Invalid Signature',
      expected: 400,
      actual: response.status,
      success: response.status === 400,
    });

    if (response.status === 400) {
      log('SUCCESS', '✅ Correctly rejects requests with invalid signature');
    } else {
      log('ERROR', `❌ Expected 400, got ${response.status}`);
    }
  } catch (error) {
    log('ERROR', `❌ Invalid signature test failed: ${error.message}`);
    tests.push({
      name: 'Invalid Signature',
      error: error.message,
      success: false,
    });
  }

  return {
    tests,
    overallSuccess: tests.every(t => t.success),
  };
}

// Test 4: Email Delivery Configuration
async function testEmailConfig() {
  log('INFO', '📧 Testing Email Configuration...');

  const hasNodemailer = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  const hasSendGrid = process.env.SENDGRID_API_KEY;

  const results = {
    nodemailer: {
      configured: hasNodemailer,
      details: {
        host: !!process.env.SMTP_HOST,
        user: !!process.env.SMTP_USER,
        pass: !!process.env.SMTP_PASS,
        port: process.env.SMTP_PORT || '587',
      },
    },
    sendgrid: {
      configured: hasSendGrid,
      details: {
        apiKey: !!process.env.SENDGRID_API_KEY,
        fromEmail: !!process.env.SENDGRID_FROM_EMAIL,
      },
    },
  };

  if (!hasNodemailer && !hasSendGrid) {
    log('ERROR', '❌ No email service configured');
    return { ...results, success: false, recommendation: 'Configure either SMTP or SendGrid' };
  }

  if (hasNodemailer) {
    log('SUCCESS', '✅ Nodemailer SMTP configured');
  }

  if (hasSendGrid) {
    log('SUCCESS', '✅ SendGrid configured');
  }

  return { ...results, success: true };
}

// Test 5: Security Configuration Review
async function testSecurityConfig() {
  log('INFO', '🛡️ Testing Security Configuration...');

  const issues = [];
  const recommendations = [];

  // Check trust proxy setting
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.RAILWAY_URL) {
      issues.push('Trust proxy enabled but not on Railway - potential security risk');
      recommendations.push('Disable trust proxy or ensure proper reverse proxy');
    } else {
      log('SUCCESS', '✅ Trust proxy appropriate for Railway deployment');
    }
  }

  // Check webhook secret configuration
  if (
    !process.env.STRIPE_WEBHOOK_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET === '{{STRIPE_WEBHOOK_SECRET}}'
  ) {
    issues.push('Webhook secret not configured - signatures not verified');
    recommendations.push('Configure STRIPE_WEBHOOK_SECRET for webhook security');
  } else {
    log('SUCCESS', '✅ Webhook secret configured');
  }

  // Check environment appropriateness
  const nodeEnv = process.env.NODE_ENV || 'development';
  const usingLiveKeys = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');

  if (nodeEnv !== 'production' && usingLiveKeys) {
    issues.push('Live Stripe keys in non-production environment');
    recommendations.push('Use test keys for development/staging');
  }

  return {
    issues,
    recommendations,
    securityScore: Math.max(0, 100 - issues.length * 20),
  };
}

// Main verification function
async function runVerification() {
    `${colors.bold}${colors.cyan}🔍 RinaWarp Terminal Integration Verification${colors.reset}\n`
  );

  const results = {
    timestamp: new Date().toISOString(),
    serverUrl: SERVER_URL,
    tests: {},
  };

  try {
    // Run all tests
    log('INFO', '🚀 Starting comprehensive verification...\n');

    results.tests.environment = await testEnvironmentConfig();

    results.tests.stripe = await testStripeConfig();

    results.tests.webhook = await testWebhookSecurity();

    results.tests.email = await testEmailConfig();

    results.tests.security = await testSecurityConfig();

    // Generate summary

    const envScore = results.tests.environment.score;
    const stripeOk = results.tests.stripe.success;
    const webhookOk = results.tests.webhook.overallSuccess;
    const emailOk = results.tests.email.success;
    const securityScore = results.tests.security.securityScore;

      `Environment Configuration: ${envScore >= 80 ? colors.green : envScore >= 60 ? colors.yellow : colors.red}${envScore}%${colors.reset}`
    );
      `Stripe Configuration: ${stripeOk ? colors.green + '✅ PASS' : colors.red + '❌ FAIL'}${colors.reset}`
    );
      `Webhook Security: ${webhookOk ? colors.green + '✅ PASS' : colors.red + '❌ FAIL'}${colors.reset}`
    );
      `Email Configuration: ${emailOk ? colors.green + '✅ PASS' : colors.red + '❌ FAIL'}${colors.reset}`
    );
      `Security Score: ${securityScore >= 80 ? colors.green : securityScore >= 60 ? colors.yellow : colors.red}${securityScore}%${colors.reset}\n`
    );

    // Overall assessment
    const overallOk = envScore >= 70 && stripeOk && webhookOk && securityScore >= 60;
      `${colors.bold}Overall Status: ${overallOk ? colors.green + '✅ READY FOR PRODUCTION' : colors.yellow + '⚠️ NEEDS ATTENTION'}${colors.reset}\n`
    );

    // Critical issues
    const allIssues = [
      ...(results.tests.environment.issues || []),
      ...(results.tests.stripe.issues || []),
      ...(results.tests.security.issues || []),
    ];

    if (allIssues.length > 0) {
      allIssues.forEach((issue, index) => {
      });
    }

    // Recommendations
    const recommendations = results.tests.security.recommendations;
    if (recommendations.length > 0) {
      recommendations.forEach((rec, index) => {
      });
    }

    // Next steps

    if (!emailOk) {
        `${colors.yellow}Next Step: Configure email delivery (SMTP or SendGrid)${colors.reset}`
      );
    }

    if (!stripeOk) {
        `${colors.yellow}Next Step: Check Stripe configuration and price IDs${colors.reset}`
      );
    }

    if (securityScore < 80) {
        `${colors.yellow}Next Step: Review security recommendations above${colors.reset}`
      );
    }

    // Save results
    const outputFile = `verification-results-${Date.now()}.json`;
    const fs = await import('fs');
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    log('INFO', `📊 Results saved to: ${outputFile}`);
  } catch (error) {
    log('ERROR', `❌ Verification failed: ${error.message}`, error);
    process.exit(1);
  }
}

// Handle CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runVerification().catch(error => {
    console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error);
    process.exit(1);
  });
}

export { runVerification };
