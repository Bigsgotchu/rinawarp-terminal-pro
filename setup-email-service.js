#!/usr/bin/env node

/**
 * RinaWarp Terminal - Email Service Quick Setup
 * Helps configure SendGrid or Gmail SMTP for license delivery
 */

import fs from 'fs';
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
        console.log('');
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

async function main() {
  console.log('📧 RinaWarp Terminal - Email Service Setup');
  console.log('==========================================\n');

  console.log('This service is REQUIRED for automatic license delivery.');
  console.log('Choose your preferred email service:\n');

  console.log('1. 🚀 SendGrid (Recommended - Professional email delivery)');
  console.log('2. 📨 Gmail SMTP (Simple setup with existing Gmail)');
  console.log('3. ℹ️  Show me setup instructions only\n');

  const choice = await ask('Enter your choice (1-3): ');

  if (choice === '3') {
    showInstructions();
    rl.close();
    return;
  }

  const emailConfig = {};

  if (choice === '1') {
    // SendGrid setup
    console.log('\n🚀 SendGrid Setup');
    console.log('=================');
    console.log('\n📝 First, create your SendGrid account:');
    console.log('1. Go to: https://sendgrid.com/');
    console.log('2. Click "Start for Free"');
    console.log('3. Complete the signup process');
    console.log('4. Verify your email address\n');

    const hasAccount = await ask('Do you have a SendGrid account ready? (y/n): ');
    if (hasAccount.toLowerCase() !== 'y') {
      console.log('\n⏸️  Please create your SendGrid account first, then run this script again.');
      rl.close();
      return;
    }

    console.log('\n🔑 Now get your API key:');
    console.log('1. Login to SendGrid Dashboard');
    console.log('2. Go to Settings → API Keys');
    console.log('3. Click "Create API Key"');
    console.log('4. Name: "RinaWarp Terminal"');
    console.log('5. Select "Restricted Access"');
    console.log('6. Enable: Mail Send permissions');
    console.log('7. Copy the API key (starts with SG.)\n');

    emailConfig.SENDGRID_API_KEY = await askSecret('Paste your SendGrid API Key: ');
    emailConfig.SENDGRID_FROM_EMAIL = await ask('From Email (noreply@rinawarptech.com): ') || 'noreply@rinawarptech.com';

    console.log('\n📧 Email Verification:');
    console.log('1. Go to Settings → Sender Authentication');
    console.log('2. Choose "Single Sender Verification"');
    console.log(`3. Add: ${emailConfig.SENDGRID_FROM_EMAIL}`);
    console.log('4. Complete verification process');

  } else if (choice === '2') {
    // Gmail SMTP setup
    console.log('\n📨 Gmail SMTP Setup');
    console.log('===================');
    console.log('\n🔒 First, enable 2-Factor Authentication:');
    console.log('1. Go to: https://myaccount.google.com/security');
    console.log('2. Enable 2-Step Verification if not already enabled\n');

    const has2FA = await ask('Do you have 2-Factor Authentication enabled? (y/n): ');
    if (has2FA.toLowerCase() !== 'y') {
      console.log('\n⏸️  Please enable 2FA first, then run this script again.');
      rl.close();
      return;
    }

    console.log('\n🔑 Generate App Password:');
    console.log('1. Go to Google Account → Security');
    console.log('2. Click "App passwords"');
    console.log('3. Select app: "Mail"');
    console.log('4. Select device: "Other"');
    console.log('5. Enter name: "RinaWarp Terminal"');
    console.log('6. Copy the 16-character password\n');

    emailConfig.SMTP_HOST = 'smtp.gmail.com';
    emailConfig.SMTP_PORT = '587';
    emailConfig.SMTP_USER = await ask('Your Gmail address: ');
    emailConfig.SMTP_PASS = await askSecret('Gmail App Password (16 chars): ');
    emailConfig.SMTP_FROM_EMAIL = await ask('From Email (noreply@rinawarptech.com): ') || 'noreply@rinawarptech.com';
  }

  // Update .env.production file
  console.log('\n📝 Updating .env.production file...');

  if (!fs.existsSync('.env.production')) {
    console.log('❌ .env.production file not found!');
    console.log('Please run: node generate-missing-keys.js first');
    rl.close();
    return;
  }

  let envContent = fs.readFileSync('.env.production', 'utf8');

  // Remove existing email configuration comments
  envContent = envContent.replace(/# Choose ONE of these options:[\s\S]*?# SMTP_FROM_EMAIL=noreply@rinawarptech\.com/g, '');

  // Add new email configuration
  const emailSection = Object.entries(emailConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  envContent = envContent.replace(
    '# EMAIL SERVICE (❌ NEEDS CONFIGURATION)',
    '# EMAIL SERVICE (✅ CONFIGURED)'
  );

  envContent = envContent.replace(
    '# ===========================================',
    `# ===========================================\n\n${emailSection}\n`
  );

  fs.writeFileSync('.env.production', envContent);

  console.log('✅ Email service configured successfully!');

  // Test email configuration
  console.log('\n🧪 Testing email configuration...');
  console.log('NODE_ENV=production npm run server');
  console.log('Then visit: http://localhost:8080/api/test/email-ping');

  console.log('\n🚀 Next Steps:');
  console.log('==============');
  console.log('1. Test your configuration locally');
  console.log('2. Deploy to Railway: npm run deploy:railway');
  console.log('3. Test end-to-end payment flow');

  rl.close();
}

function showInstructions() {
  console.log('\n📧 Email Service Setup Instructions');
  console.log('====================================\n');

  console.log('🚀 OPTION 1: SendGrid (Recommended)');
  console.log('====================================');
  console.log('✅ Professional email delivery');
  console.log('✅ High deliverability rates');
  console.log('✅ Detailed analytics');
  console.log('✅ Free tier: 100 emails/day\n');

  console.log('Setup Steps:');
  console.log('1. Create account: https://sendgrid.com/');
  console.log('2. Get API key: Settings → API Keys');
  console.log('3. Verify sender email: Settings → Sender Authentication');
  console.log('4. Add to .env.production:');
  console.log('   SENDGRID_API_KEY=SG.your_key_here');
  console.log('   SENDGRID_FROM_EMAIL=noreply@rinawarptech.com\n');

  console.log('📨 OPTION 2: Gmail SMTP');
  console.log('========================');
  console.log('✅ Use existing Gmail account');
  console.log('✅ Simple setup');
  console.log('⚠️  Lower sending limits\n');

  console.log('Setup Steps:');
  console.log('1. Enable 2FA: https://myaccount.google.com/security');
  console.log('2. Generate App Password: Security → App passwords');
  console.log('3. Add to .env.production:');
  console.log('   SMTP_HOST=smtp.gmail.com');
  console.log('   SMTP_PORT=587');
  console.log('   SMTP_USER=your_gmail@gmail.com');
  console.log('   SMTP_PASS=your_16_char_app_password');
  console.log('   SMTP_FROM_EMAIL=noreply@rinawarptech.com\n');

  console.log('🧪 Testing Your Setup:');
  console.log('======================');
  console.log('1. Start server: NODE_ENV=production npm run server');
  console.log('2. Test endpoint: curl http://localhost:8080/api/test/email-ping');
  console.log('3. Send test email: curl -X POST http://localhost:8080/api/test-license-email \\');
  console.log('   -H "Content-Type: application/json" \\');
  console.log('   -d \'{"email":"your_email@example.com"}\'');
}

main().catch(console.error);
