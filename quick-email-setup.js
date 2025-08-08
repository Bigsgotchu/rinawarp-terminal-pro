#!/usr/bin/env node

/**
 * Quick Email Service Configuration for RinaWarp Terminal
 */

import fs from 'fs';
import { execSync } from 'child_process';

console.log('📧 Quick Email Service Configuration');
console.log('=====================================\n');

// Read current production env
let envContent = '';
try {
    envContent = fs.readFileSync('.env.production', 'utf8');
} catch (error) {
    console.log('❌ .env.production file not found. Run generate-missing-keys.js first.');
    process.exit(1);
}

console.log('🔍 Current email configuration status:');
if (envContent.includes('SENDGRID_API_KEY=SG.') && !envContent.includes('# SENDGRID_API_KEY=')) {
    console.log('✅ SendGrid already configured');
} else if (envContent.includes('SMTP_HOST=smtp.gmail.com') && !envContent.includes('# SMTP_HOST=')) {
    console.log('✅ Gmail SMTP already configured');
} else {
    console.log('❌ Email service not configured');
    
    console.log('\n📝 To complete email setup, you have two options:');
    console.log('\n🚀 Option 1: SendGrid (Recommended for production)');
    console.log('1. Go to https://sendgrid.com/ and create free account');
    console.log('2. Get your API key from Settings → API Keys');
    console.log('3. Add this to your .env.production:');
    console.log('   SENDGRID_API_KEY=SG.your_actual_api_key');
    console.log('   SENDGRID_FROM_EMAIL=noreply@rinawarptech.com');
    
    console.log('\n📨 Option 2: Gmail SMTP (Quick setup)');
    console.log('1. Enable 2FA on your Gmail account');
    console.log('2. Generate an App Password in Google Account settings');
    console.log('3. Add this to your .env.production:');
    console.log('   SMTP_HOST=smtp.gmail.com');
    console.log('   SMTP_PORT=587');
    console.log('   SMTP_USER=your_gmail@gmail.com');
    console.log('   SMTP_PASS=your_16_character_app_password');
    console.log('   SMTP_FROM_EMAIL=noreply@rinawarptech.com');
    
    console.log('\n⚠️  For now, I\'ll configure a basic SMTP setup for testing...');
    
    // Add basic SMTP configuration for testing
    const smtpConfig = `
# SMTP Configuration (Testing - Replace with real credentials)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
SMTP_FROM_EMAIL=noreply@rinawarptech.com
`;
    
    // Replace the email section
    envContent = envContent.replace(
        /# ===========================================\n# EMAIL SERVICE \(❌ NEEDS CONFIGURATION\)\n# ===========================================[\s\S]*?(?=\n# ==========================================)/,
        `# ===========================================
# EMAIL SERVICE (⚠️  CONFIGURED FOR TESTING)
# ===========================================${smtpConfig}
# IMPORTANT: Replace with your actual email credentials before going live!`
    );
    
    fs.writeFileSync('.env.production', envContent);
    console.log('✅ Basic email configuration added to .env.production');
    console.log('📝 Remember to update with your real credentials before launching!');
}

console.log('\n🚀 Production environment status:');
console.log('==================================');

// Check all critical configurations
const checks = {
    'Stripe Keys': envContent.includes('STRIPE_SECRET_KEY=sk_live_'),
    'Email Service': envContent.includes('SMTP_HOST=') || envContent.includes('SENDGRID_API_KEY=SG.'),
    'Security Keys': envContent.includes('ENCRYPTION_KEY=') && envContent.includes('JWT_SECRET='),
    'Domain': envContent.includes('URL=https://rinawarptech.com')
};

for (const [check, status] of Object.entries(checks)) {
    console.log(`${status ? '✅' : '❌'} ${check}`);
}

const allConfigured = Object.values(checks).every(status => status);

if (allConfigured) {
    console.log('\n🎉 Production environment is ready!');
    console.log('📦 Next step: Deploy to Railway');
} else {
    console.log('\n⚠️  Some configurations still needed before deployment');
}

console.log('\n💡 Don\'t forget to:');
console.log('1. Test email delivery before going live');
console.log('2. Replace test credentials with real ones');
console.log('3. Verify Stripe webhook endpoints work');
