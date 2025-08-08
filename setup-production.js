#!/usr/bin/env node

/**
 * RinaWarp Terminal - Production Setup Script
 * Interactive script to configure production environment
 */

import fs from 'fs';
import crypto from 'crypto';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function askSecret(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let input = '';
    const onData = (char) => {
      if (char === '\r' || char === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.off('data', onData);
        console.log(''); // New line
        resolve(input);
      } else if (char === '\u0003') { // Ctrl+C
        process.exit();
      } else if (char === '\u007f') { // Backspace
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        input += char;
        process.stdout.write('*');
      }
    };
    
    process.stdin.on('data', onData);
  });
}

function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

async function main() {
  console.log('🚀 RinaWarp Terminal - Production Setup');
  console.log('=====================================\n');

  console.log('This script will help you configure your production environment.');
  console.log('Please have your Stripe dashboard and email service credentials ready.\n');

  const config = {};

  // Stripe Configuration
  console.log('📝 STRIPE CONFIGURATION');
  console.log('Get these from: https://dashboard.stripe.com/apikeys\n');

  config.STRIPE_SECRET_KEY = await askSecret('Stripe Live Secret Key (starts with sk_live_): ');
  config.STRIPE_PUBLISHABLE_KEY = await ask('Stripe Live Publishable Key (starts with pk_live_): ');
  config.STRIPE_WEBHOOK_SECRET = await askSecret('Stripe Webhook Secret (starts with whsec_): ');

  console.log('\n📦 PRICING CONFIGURATION');
  console.log('Create these price IDs in your Stripe Dashboard first.\n');
  
  config.STRIPE_PRICE_PERSONAL_MONTHLY = await ask('Personal Plan Monthly Price ID: ');
  config.STRIPE_PRICE_PROFESSIONAL_MONTHLY = await ask('Professional Plan Monthly Price ID: ');
  config.STRIPE_PRICE_TEAM_MONTHLY = await ask('Team Plan Monthly Price ID: ');

  // Email Configuration
  console.log('\n📧 EMAIL SERVICE CONFIGURATION');
  const emailChoice = await ask('Choose email service (1=SendGrid, 2=SMTP): ');

  if (emailChoice === '1') {
    config.SENDGRID_API_KEY = await askSecret('SendGrid API Key: ');
    config.SENDGRID_FROM_EMAIL = await ask('From Email Address: ');
  } else {
    config.SMTP_HOST = await ask('SMTP Host (e.g., smtp.gmail.com): ');
    config.SMTP_PORT = await ask('SMTP Port (default 587): ') || '587';
    config.SMTP_USER = await ask('SMTP Username: ');
    config.SMTP_PASS = await askSecret('SMTP Password/App Password: ');
    config.SMTP_FROM_EMAIL = await ask('From Email Address: ');
  }

  // Domain Configuration
  console.log('\n🌐 DOMAIN CONFIGURATION');
  config.URL = await ask('Production URL (https://rinawarptech.com): ') || 'https://rinawarptech.com';
  config.RAILWAY_PUBLIC_DOMAIN = await ask('Railway Domain (rinawarptech.com): ') || 'rinawarptech.com';

  // Security Keys
  console.log('\n🔐 SECURITY CONFIGURATION');
  console.log('Generating secure keys...');
  config.ENCRYPTION_KEY = generateSecureKey(32);
  config.ENCRYPTION_SALT = generateSecureKey(16);
  config.JWT_SECRET = generateSecureKey(32);
  console.log('✅ Security keys generated');

  // Optional Services
  console.log('\n🤖 AI SERVICES (Optional)');
  const setupAI = await ask('Configure AI services? (y/n): ');
  if (setupAI.toLowerCase() === 'y') {
    config.ELEVENLABS_API_KEY = await askSecret('ElevenLabs API Key (optional): ');
    config.OPENAI_API_KEY = await askSecret('OpenAI API Key (optional): ');
  }

  // Basic settings
  config.NODE_ENV = 'production';
  config.APP_VERSION = '1.0.0';
  config.LOG_LEVEL = 'info';
  config.PORT = '8080';
  config.ENABLE_AI_FEATURES = 'true';
  config.ENABLE_VOICE_FEATURES = 'true';
  config.ENABLE_TELEMETRY = 'true';

  // Generate .env.production file
  console.log('\n📝 Creating .env.production file...');

  const envContent = Object.entries(config)
    .filter(([key, value]) => value && value.trim() !== '')
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const fullEnvContent = `# RinaWarp Terminal - Production Environment
# Generated on ${new Date().toISOString()}
# KEEP THIS FILE SECURE AND NEVER COMMIT TO VERSION CONTROL

${envContent}

# Additional optional configurations can be added manually:
# SENTRY_DSN=https://your_sentry_dsn@sentry.io/project
# GA_MEASUREMENT_ID=G-YOUR_GA4_ID
# DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
`;

  fs.writeFileSync('.env.production', fullEnvContent);

  console.log('✅ .env.production file created successfully!');
  console.log('\n🔒 SECURITY REMINDER:');
  console.log('- Never commit .env.production to version control');
  console.log('- Keep your API keys secure');
  console.log('- Use environment variables in Railway deployment');

  console.log('\n🚀 NEXT STEPS:');
  console.log('1. Review the .env.production file');
  console.log('2. Test your configuration locally: NODE_ENV=production npm run server');
  console.log('3. Deploy to Railway with these environment variables');

  rl.close();
}

main().catch(console.error);
