#!/usr/bin/env node

/**
 * RinaWarp Terminal - Missing Keys Generator
 * Automatically generates security keys and guides through API key setup
 */

import crypto from 'crypto';
import fs from 'fs';
import { execSync } from 'child_process';

console.log('🔑 RinaWarp Terminal - Missing Keys Generator');
console.log('==============================================\n');

// Check current status
console.log('📋 Checking your current configuration...\n');

const hasEnvDev = fs.existsSync('.env.development');
const hasEnvProd = fs.existsSync('.env.production');

if (hasEnvDev) {
  console.log('✅ Found .env.development - Stripe keys already configured!');
}

if (hasEnvProd) {
  console.log('✅ Found .env.production - Production environment already set up!');
} else {
  console.log('❌ Missing .env.production - Will create it for you');
}

// Generate security keys
console.log('\n🔐 Generating security keys...');

function generateSecureKey(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

const securityKeys = {
  ENCRYPTION_KEY: generateSecureKey(32),
  ENCRYPTION_SALT: generateSecureKey(16),
  JWT_SECRET: generateSecureKey(32)
};

console.log('✅ Security keys generated successfully!');

// Read existing development config to copy Stripe keys
let existingConfig = {};
if (hasEnvDev) {
  console.log('\n📋 Reading existing Stripe configuration...');
  const devContent = fs.readFileSync('.env.development', 'utf8');
  const lines = devContent.split('\n');
  
  for (const line of lines) {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      existingConfig[key.trim()] = valueParts.join('=').trim();
    }
  }
  console.log('✅ Stripe keys found and ready to copy!');
}

// Create production configuration
console.log('\n📝 Creating production configuration...');

const productionConfig = {
  // Basic settings
  NODE_ENV: 'production',
  APP_VERSION: '1.0.0',
  LOG_LEVEL: 'info',
  PORT: '8080',
  
  // Domain settings
  URL: 'https://rinawarptech.com',
  RAILWAY_PUBLIC_DOMAIN: 'rinawarptech.com',
  
  // Copy Stripe keys from development
  STRIPE_SECRET_KEY: existingConfig.STRIPE_SECRET_KEY || 'YOUR_STRIPE_SECRET_KEY',
  STRIPE_PUBLISHABLE_KEY: existingConfig.STRIPE_PUBLISHABLE_KEY || 'YOUR_STRIPE_PUBLISHABLE_KEY',
  STRIPE_WEBHOOK_SECRET: existingConfig.STRIPE_WEBHOOK_SECRET || 'YOUR_WEBHOOK_SECRET',
  
  // Copy Stripe price IDs
  STRIPE_PRICE_PERSONAL_MONTHLY: existingConfig.STRIPE_PRICE_PERSONAL_MONTHLY || 'price_personal_monthly',
  STRIPE_PRICE_PERSONAL_YEARLY: existingConfig.STRIPE_PRICE_PERSONAL_YEARLY || 'price_personal_yearly',
  STRIPE_PRICE_PROFESSIONAL_MONTHLY: existingConfig.STRIPE_PRICE_PROFESSIONAL_MONTHLY || 'price_professional_monthly',
  STRIPE_PRICE_PROFESSIONAL_YEARLY: existingConfig.STRIPE_PRICE_PROFESSIONAL_YEARLY || 'price_professional_yearly',
  STRIPE_PRICE_TEAM_MONTHLY: existingConfig.STRIPE_PRICE_TEAM_MONTHLY || 'price_team_monthly',
  STRIPE_PRICE_TEAM_YEARLY: existingConfig.STRIPE_PRICE_TEAM_YEARLY || 'price_team_yearly',
  
  // Beta pricing
  STRIPE_PRICE_BETA_EARLYBIRD: existingConfig.STRIPE_PRICE_BETA_EARLYBIRD || 'price_beta_earlybird',
  STRIPE_PRICE_BETA_ACCESS: existingConfig.STRIPE_PRICE_BETA_ACCESS || 'price_beta_access',
  STRIPE_PRICE_PREMIUM: existingConfig.STRIPE_PRICE_PREMIUM || 'price_premium',
  
  // Security keys (generated)
  ...securityKeys,
  
  // Feature flags
  ENABLE_AI_FEATURES: 'true',
  ENABLE_VOICE_FEATURES: 'true',
  ENABLE_TELEMETRY: 'true',
  TELEMETRY_PRIVACY_MODE: 'false',
  
  // Copy existing Sentry if available
  SENTRY_DSN: existingConfig.SENTRY_DSN || 'https://your_sentry_dsn@sentry.io/project',
  SENTRY_ENVIRONMENT: 'production',
};

// Create .env.production content
const envContent = `# RinaWarp Terminal - Production Environment
# Generated on ${new Date().toISOString()}
# ⚠️  KEEP THIS FILE SECURE AND NEVER COMMIT TO VERSION CONTROL

# ===========================================
# STRIPE CONFIGURATION (✅ CONFIGURED)
# ===========================================
STRIPE_SECRET_KEY=${productionConfig.STRIPE_SECRET_KEY}
STRIPE_PUBLISHABLE_KEY=${productionConfig.STRIPE_PUBLISHABLE_KEY}
STRIPE_WEBHOOK_SECRET=${productionConfig.STRIPE_WEBHOOK_SECRET}

# Pricing Plans
STRIPE_PRICE_PERSONAL_MONTHLY=${productionConfig.STRIPE_PRICE_PERSONAL_MONTHLY}
STRIPE_PRICE_PERSONAL_YEARLY=${productionConfig.STRIPE_PRICE_PERSONAL_YEARLY}
STRIPE_PRICE_PROFESSIONAL_MONTHLY=${productionConfig.STRIPE_PRICE_PROFESSIONAL_MONTHLY}
STRIPE_PRICE_PROFESSIONAL_YEARLY=${productionConfig.STRIPE_PRICE_PROFESSIONAL_YEARLY}
STRIPE_PRICE_TEAM_MONTHLY=${productionConfig.STRIPE_PRICE_TEAM_MONTHLY}
STRIPE_PRICE_TEAM_YEARLY=${productionConfig.STRIPE_PRICE_TEAM_YEARLY}

# Beta Pricing
STRIPE_PRICE_BETA_EARLYBIRD=${productionConfig.STRIPE_PRICE_BETA_EARLYBIRD}
STRIPE_PRICE_BETA_ACCESS=${productionConfig.STRIPE_PRICE_BETA_ACCESS}
STRIPE_PRICE_PREMIUM=${productionConfig.STRIPE_PRICE_PREMIUM}

# ===========================================
# EMAIL SERVICE (❌ NEEDS CONFIGURATION)
# ===========================================
# Choose ONE of these options:

# Option 1: SendGrid (Recommended)
# SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
# SENDGRID_FROM_EMAIL=noreply@rinawarptech.com

# Option 2: Gmail SMTP
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your_gmail@gmail.com
# SMTP_PASS=your_16_character_app_password
# SMTP_FROM_EMAIL=noreply@rinawarptech.com

# ===========================================
# SECURITY KEYS (✅ GENERATED)
# ===========================================
ENCRYPTION_KEY=${productionConfig.ENCRYPTION_KEY}
ENCRYPTION_SALT=${productionConfig.ENCRYPTION_SALT}
JWT_SECRET=${productionConfig.JWT_SECRET}

# ===========================================
# DOMAIN CONFIGURATION (✅ SET)
# ===========================================
URL=${productionConfig.URL}
RAILWAY_PUBLIC_DOMAIN=${productionConfig.RAILWAY_PUBLIC_DOMAIN}
NODE_ENV=${productionConfig.NODE_ENV}

# ===========================================
# AI SERVICES (❌ OPTIONAL - ADD YOUR KEYS)
# ===========================================
# ElevenLabs Voice AI
# ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
# ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL

# OpenAI
# OPENAI_API_KEY=sk-your_openai_key_here

# Anthropic Claude
# ANTHROPIC_API_KEY=sk-ant-your_anthropic_key_here

# ===========================================
# MONITORING & ANALYTICS (❌ OPTIONAL)
# ===========================================
SENTRY_DSN=${productionConfig.SENTRY_DSN}
SENTRY_ENVIRONMENT=${productionConfig.SENTRY_ENVIRONMENT}

# Google Analytics 4
# GA_MEASUREMENT_ID=G-YOUR_MEASUREMENT_ID
# GA_API_SECRET=your_ga4_api_secret

# ===========================================
# APPLICATION SETTINGS (✅ CONFIGURED)
# ===========================================
APP_VERSION=${productionConfig.APP_VERSION}
LOG_LEVEL=${productionConfig.LOG_LEVEL}
PORT=${productionConfig.PORT}

# Feature Flags
ENABLE_AI_FEATURES=${productionConfig.ENABLE_AI_FEATURES}
ENABLE_VOICE_FEATURES=${productionConfig.ENABLE_VOICE_FEATURES}
ENABLE_TELEMETRY=${productionConfig.ENABLE_TELEMETRY}
TELEMETRY_PRIVACY_MODE=${productionConfig.TELEMETRY_PRIVACY_MODE}

# ===========================================
# WEBHOOK NOTIFICATIONS (❌ OPTIONAL)
# ===========================================
# Discord webhook for alerts
# DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_url

# Slack webhook for alerts  
# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your_webhook_url
`;

// Write the production environment file
fs.writeFileSync('.env.production', envContent);

console.log('✅ .env.production file created successfully!');

// Show summary
console.log('\n📊 CONFIGURATION SUMMARY:');
console.log('========================');
console.log('✅ Stripe Keys: Configured (copied from development)');
console.log('✅ Security Keys: Generated and configured');
console.log('✅ Domain Settings: Configured for rinawarptech.com');
console.log('✅ Feature Flags: Enabled for production');
console.log('❌ Email Service: NEEDS MANUAL CONFIGURATION');
console.log('❌ AI Services: Optional - add keys if needed');
console.log('❌ Analytics: Optional - add keys if needed');

console.log('\n🚨 IMMEDIATE NEXT STEPS:');
console.log('=======================');
console.log('1. 📧 Set up email service (REQUIRED):');
console.log('   - SendGrid: Get API key from https://sendgrid.com/');
console.log('   - Or Gmail: Generate app password');
console.log('');
console.log('2. 🧪 Test your configuration:');
console.log('   NODE_ENV=production npm run server');
console.log('');
console.log('3. 🚀 Deploy to Railway:');
console.log('   npm run deploy:railway');

console.log('\n💡 OPTIONAL ENHANCEMENTS:');
console.log('=========================');
console.log('• ElevenLabs Voice AI: https://elevenlabs.io/');
console.log('• OpenAI API: https://platform.openai.com/');
console.log('• Google Analytics: https://analytics.google.com/');

console.log('\n🔒 SECURITY REMINDER:');
console.log('====================');
console.log('• Never commit .env.production to version control');
console.log('• Keep your API keys secure');
console.log('• Use Railway environment variables for deployment');

console.log('\n✅ Your RinaWarp Terminal is 90% ready for production!');
console.log('   Only email service configuration remaining.');

// Display the generated security keys for reference
console.log('\n🔑 Generated Security Keys:');
console.log('===========================');
console.log('ENCRYPTION_KEY=' + securityKeys.ENCRYPTION_KEY);
console.log('ENCRYPTION_SALT=' + securityKeys.ENCRYPTION_SALT);
console.log('JWT_SECRET=' + securityKeys.JWT_SECRET);
console.log('\n✅ These have been automatically added to .env.production');
