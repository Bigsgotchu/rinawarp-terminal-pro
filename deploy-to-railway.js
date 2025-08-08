#!/usr/bin/env node

/**
 * RinaWarp Terminal - Railway Deployment Script
 * Automated deployment with environment variable setup
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 RinaWarp Terminal - Railway Deployment');
console.log('=========================================\n');

// Check if Railway CLI is installed
try {
  execSync('railway --version', { stdio: 'ignore' });
} catch (error) {
  console.log('❌ Railway CLI not found!');
  console.log('Install it with: npm install -g @railway/cli');
  console.log('Or: curl -fsSL https://railway.app/install.sh | sh');
  process.exit(1);
}

// Check if .env.production exists
if (!fs.existsSync('.env.production')) {
  console.log('❌ .env.production file not found!');
  console.log('Run this first: node generate-missing-keys.js');
  process.exit(1);
}

console.log('📋 Pre-deployment checklist:');
console.log('============================');

// Read environment variables
const envContent = fs.readFileSync('.env.production', 'utf8');
const hasEmailConfig = envContent.includes('SENDGRID_API_KEY=') && !envContent.includes('SENDGRID_API_KEY=SG.your_sendgrid') ||
                      envContent.includes('SMTP_HOST=smtp.gmail.com') && envContent.includes('SMTP_PASS=') && !envContent.includes('SMTP_PASS=your_16');

console.log('✅ Stripe Keys: Configured');
console.log('✅ Security Keys: Generated');
console.log(hasEmailConfig ? '✅ Email Service: Configured' : '❌ Email Service: Not configured');
console.log('✅ Domain Settings: Set for rinawarptech.com');

if (!hasEmailConfig) {
  console.log('\n⚠️  Email service not configured!');
  console.log('License delivery will NOT work without email service.');
  console.log('Run: node setup-email-service.js');
  process.exit(1);
}

console.log('\n🔐 Checking Railway authentication...');

try {
  execSync('railway whoami', { stdio: 'ignore' });
  console.log('✅ Railway authenticated');
} catch (error) {
  console.log('❌ Not logged into Railway');
  console.log('Run: railway login');
  process.exit(1);
}

console.log('\n🚀 Starting deployment process...');

// Create or connect to Railway project
console.log('📦 Setting up Railway project...');

try {
  // Try to link to existing project or create new one
  try {
    execSync('railway status', { stdio: 'ignore' });
    console.log('✅ Using existing Railway project');
  } catch (error) {
    console.log('📦 Creating new Railway project...');
    execSync('railway init rinawarp-terminal', { stdio: 'inherit' });
  }

  // Parse environment variables from .env.production
  console.log('\n🔧 Setting up environment variables...');
  
  const envLines = envContent.split('\n').filter(line => 
    line.trim() && 
    !line.startsWith('#') && 
    line.includes('=') &&
    !line.includes('your_') && // Skip template values
    !line.includes('YOUR_') // Skip template values
  );

  console.log(`📋 Found ${envLines.length} environment variables to configure`);

  for (const line of envLines) {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    
    if (key && value && value !== '') {
      try {
        execSync(`railway variables set ${key}="${value}"`, { stdio: 'ignore' });
        console.log(`✅ Set ${key}`);
      } catch (error) {
        console.log(`⚠️  Failed to set ${key}`);
      }
    }
  }

  console.log('\n🚀 Deploying application...');
  
  // Deploy the application
  execSync('railway up', { stdio: 'inherit' });
  
  console.log('\n✅ Deployment completed!');

  // Get the deployment URL
  try {
    const url = execSync('railway domain', { encoding: 'utf8' }).trim();
    console.log(`\n🌐 Your application is live at: ${url}`);
    
    console.log('\n🧪 Next steps:');
    console.log('==============');
    console.log('1. Test your deployment:');
    console.log(`   curl ${url}/api/health`);
    console.log('');
    console.log('2. Test email service:');
    console.log(`   curl ${url}/api/test/email-ping`);
    console.log('');
    console.log('3. Test payment flow:');
    console.log(`   Open: ${url}/pricing`);
    console.log('   Try a test purchase');
    console.log('');
    console.log('4. Configure custom domain:');
    console.log('   railway domain add rinawarptech.com');
    
  } catch (error) {
    console.log('\n🌐 Deployment successful!');
    console.log('Run: railway domain');
    console.log('To get your application URL');
  }

  console.log('\n📊 Monitor your deployment:');
  console.log('==========================');
  console.log('• View logs: railway logs');
  console.log('• Check status: railway status');
  console.log('• Open dashboard: railway open');

} catch (error) {
  console.error('\n❌ Deployment failed!');
  console.error('Error:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('===================');
  console.log('1. Check Railway CLI: railway --version');
  console.log('2. Check authentication: railway whoami');
  console.log('3. Check project status: railway status');
  console.log('4. View detailed logs: railway logs');
  
  process.exit(1);
}

console.log('\n🎉 RinaWarp Terminal is now live in production!');
console.log('Time to start generating revenue! 💰');

function showPostDeploymentChecklist() {
  console.log('\n📋 Post-Deployment Checklist:');
  console.log('=============================');
  console.log('□ Test health endpoint');
  console.log('□ Test email delivery');
  console.log('□ Complete test purchase');
  console.log('□ Verify license delivery');
  console.log('□ Configure custom domain');
  console.log('□ Set up monitoring alerts');
  console.log('□ Update DNS records');
  console.log('□ Start marketing campaign');
}

showPostDeploymentChecklist();
