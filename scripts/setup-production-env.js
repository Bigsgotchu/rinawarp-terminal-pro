#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function setupProductionEnv() {
  console.log('🚀 RinaWarp Terminal - Production Environment Setup\n');
  
  const envPath = path.join(__dirname, '../.env.production');
  const envExamplePath = path.join(__dirname, '../.env.production');
  
  // Read the example env file
  let envContent = fs.readFileSync(envExamplePath, 'utf8');
  
  console.log('📋 This script will help you set up production environment variables.\n');
  
  // Generate security keys
  console.log('🔐 Generating security keys...');
  const encryptionKey = crypto.randomBytes(32).toString('hex');
  const encryptionSalt = crypto.randomBytes(16).toString('hex');
  
  envContent = envContent.replace('your_32_byte_hex_encryption_key_here', encryptionKey);
  envContent = envContent.replace('your_unique_salt_here', encryptionSalt);
  console.log('✅ Security keys generated\n');
  
  // Stripe Configuration
  console.log('💳 Stripe Configuration');
  console.log('Please have your Stripe dashboard open: https://dashboard.stripe.com\n');
  
  const stripeSecretKey = await question('Enter your Stripe SECRET key (sk_live_...): ');
  const stripePublishableKey = await question('Enter your Stripe PUBLISHABLE key (pk_live_...): ');
  
  envContent = envContent.replace('sk_test_YOUR_SECRET_KEY_HERE', stripeSecretKey);
  envContent = envContent.replace('pk_test_YOUR_PUBLISHABLE_KEY_HERE', stripePublishableKey);
  
  console.log('\n📦 Stripe Product Price IDs');
  console.log('Create these products in Stripe Dashboard first, then enter their price IDs:\n');
  
  const priceIds = {
    personal: await question('Personal Plan ($15/month) price ID: '),
    professional: await question('Professional Plan ($25/month) price ID: '),
    team: await question('Team Plan ($35/month) price ID: '),
    enterprise: await question('Enterprise Plan (custom) price ID: '),
    earlybird: await question('Early Bird Beta ($29 one-time) price ID: '),
    beta: await question('Beta Access ($39 one-time) price ID: ')
  };
  
  envContent = envContent.replace('price_YOUR_PERSONAL_PLAN_PRICE_ID', priceIds.personal);
  envContent = envContent.replace('price_YOUR_PROFESSIONAL_PLAN_PRICE_ID', priceIds.professional);
  envContent = envContent.replace('price_YOUR_TEAM_PLAN_PRICE_ID', priceIds.team);
  envContent = envContent.replace('price_YOUR_ENTERPRISE_PLAN_PRICE_ID', priceIds.enterprise);
  envContent = envContent.replace('price_YOUR_EARLYBIRD_PRICE_ID', priceIds.earlybird);
  envContent = envContent.replace('price_YOUR_BETA_PRICE_ID', priceIds.beta);
  
  // ElevenLabs Configuration
  console.log('\n🎙️ ElevenLabs Configuration');
  const elevenLabsKey = await question('Enter your ElevenLabs API key (or press Enter to skip): ');
  if (elevenLabsKey) {
    envContent = envContent.replace('your_elevenlabs_api_key_here', elevenLabsKey);
  }
  
  // Email Configuration
  console.log('\n📧 Email Configuration');
  const emailChoice = await question('Use SMTP (1) or SendGrid (2)? Enter 1 or 2: ');
  
  if (emailChoice === '1') {
    console.log('\nSMTP Configuration:');
    const smtpHost = await question('SMTP Host (default: smtp.gmail.com): ') || 'smtp.gmail.com';
    const smtpPort = await question('SMTP Port (default: 587): ') || '587';
    const smtpUser = await question('SMTP Username/Email: ');
    const smtpPass = await question('SMTP Password/App-specific password: ');
    
    envContent = envContent.replace('smtp.gmail.com', smtpHost);
    envContent = envContent.replace('587', smtpPort);
    envContent = envContent.replace('your_email@gmail.com', smtpUser);
    envContent = envContent.replace('your_app_specific_password', smtpPass);
  } else {
    console.log('\nSendGrid Configuration:');
    const sendGridKey = await question('Enter your SendGrid API key: ');
    envContent = envContent.replace('your_sendgrid_api_key_here', sendGridKey);
  }
  
  // Save the file
  const outputPath = path.join(__dirname, '../.env');
  fs.writeFileSync(outputPath, envContent);
  
  console.log('\n✅ Environment variables saved to .env');
  console.log('\n⚠️  IMPORTANT: Keep your .env file secure and never commit it to git!');
  console.log('\n📋 Next steps:');
  console.log('1. Review the .env file to ensure all values are correct');
  console.log('2. Set up Railway environment variables: npm run deploy:railway');
  console.log('3. Configure webhook endpoint in Stripe Dashboard');
  console.log('4. Test the configuration: npm run validate:config');
  
  rl.close();
}

setupProductionEnv().catch(console.error);
