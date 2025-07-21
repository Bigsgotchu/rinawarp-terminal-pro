#!/usr/bin/env node

/**
 * RinaWarp Terminal Beta Testing Management
 * Helps manage beta distribution and feedback collection
 */

const fs = require('fs');
const path = require('path');

console.log('🧜‍♀️ RinaWarp Terminal Beta Testing Management\n');

// Configuration
const config = {
  betaVersion: '1.0.19-beta.1',
  downloadUrl: 'https://rinawarptech.com/beta-download.html',
  supportEmail: 'rinawarptechnologies25@gmail.com',
  feedbackEmail: 'rinawarptechnologies25@gmail.com',
};

// Display beta testing status
function showBetaStatus() {
  console.log('📊 Beta Testing Status:');
  console.log(`   Version: ${config.betaVersion}`);
  console.log(`   Download URL: ${config.downloadUrl}`);
  console.log(`   Support Email: ${config.supportEmail}`);
  console.log('');

  // Check if key files exist
  const keyFiles = [
    'beta-release/BETA_TESTING_GUIDE.md',
    'email-templates/developer-focused-beta-optimized.html',
    'email-templates/beta-campaign/README.md',
    'public/html/beta-download.html',
  ];

  console.log('✅ Beta Testing Infrastructure:');
  keyFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} (missing)`);
    }
  });
}

// Show beta testing resources
function showBetaResources() {
  console.log('\n🎯 Beta Testing Resources:');
  console.log('');
  console.log('📧 Email Templates:');
  console.log(
    '   • Developer-focused beta email: email-templates/developer-focused-beta-optimized.html'
  );
  console.log('   • Campaign materials: email-templates/beta-campaign/');
  console.log('   • A/B test variations: email-templates/testing/ab-test-variations/');
  console.log('');
  console.log('📖 Documentation:');
  console.log('   • Testing guide: beta-release/BETA_TESTING_GUIDE.md');
  console.log('   • Feedback template: beta-release/FEEDBACK_TEMPLATE.md');
  console.log('   • Known issues: beta-release/KNOWN_ISSUES.md');
  console.log('');
  console.log('🌐 Web Resources:');
  console.log('   • Beta download page: https://rinawarptech.com/beta-download.html');
  console.log('   • Main website: https://rinawarptech.com');
  console.log('');
  console.log('📱 Distribution Channels:');
  console.log('   • Email outreach (templates ready)');
  console.log('   • Developer communities');
  console.log('   • Social media announcements');
  console.log('   • Personal networks');
}

// Generate beta tester email template
function generateBetaEmail() {
  console.log('\n📧 Beta Tester Email Template:\n');

  const template = `
Subject: 🚀 Early Access: RinaWarp Terminal v${config.betaVersion} - AI-Powered Terminal

Hi [NAME],

I'm excited to invite you to beta test RinaWarp Terminal - an AI-powered terminal that revolutionizes command-line interactions!

🎯 What makes it special:
• AI assistant powered by OpenAI/Anthropic/Google AI  
• Natural language command interpretation
• Voice commands and TTS responses (ElevenLabs integration)
• Advanced terminal features with mermaid theme
• Cross-platform support (Windows, macOS, Linux)

🔗 Get your beta access:
${config.downloadUrl}

📖 Testing guide and setup instructions included
⏱️ Takes ~5 minutes to set up
🔧 All features unlocked in beta version

Your feedback will help shape the final release. As a beta tester, you'll get:
✅ Early access to new features
✅ Direct input on development priorities  
✅ Free upgrade to commercial version
✅ Recognition in our beta tester hall of fame

Questions? Reply to this email or contact ${config.supportEmail}

Happy testing! 🧜‍♀️
The RinaWarp Team

P.S. - Don't forget to test the voice features - Rina loves to chat!
`;

  console.log(template);
}

// Show next steps for beta distribution
function showNextSteps() {
  console.log('\n🎯 Next Steps for Beta Distribution:\n');

  console.log('1. 📧 Email Outreach:');
  console.log('   • Use the optimized email template');
  console.log('   • Target developers, DevOps engineers, power users');
  console.log('   • Send personalized invitations');
  console.log('   • Include clear value proposition');
  console.log('');

  console.log('2. 📱 Social Media:');
  console.log('   • Twitter/X announcements');
  console.log('   • LinkedIn developer posts');
  console.log('   • Reddit r/programming, r/terminal posts');
  console.log('   • Discord/Slack dev communities');
  console.log('');

  console.log('3. 📊 Feedback Collection:');
  console.log('   • Monitor download page visits');
  console.log('   • Track email responses');
  console.log('   • Collect bug reports and feature requests');
  console.log('   • Document common issues');
  console.log('');

  console.log('4. 🔧 Support:');
  console.log('   • Respond to beta tester questions within 24h');
  console.log('   • Provide technical assistance');
  console.log('   • Update documentation based on feedback');
  console.log('   • Release hotfixes as needed');
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'status') {
    showBetaStatus();
  } else if (command === 'resources') {
    showBetaResources();
  } else if (command === 'email') {
    generateBetaEmail();
  } else if (command === 'next') {
    showNextSteps();
  } else {
    // Default: show everything
    showBetaStatus();
    showBetaResources();
    showNextSteps();
  }
}

// Run the script
if (require.main === module) {
  main();
}
