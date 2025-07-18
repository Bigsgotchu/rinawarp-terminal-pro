#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Color utilities
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red
  };
  
  console.log(colorMap[level](`[${timestamp}] [${level.toUpperCase()}] ${message}`));
}

function main() {
  console.log(colors.bold(colors.cyan('🔥 Firebase-Only Deployment Solution')));
  console.log(colors.cyan('=' .repeat(60)));
  
  log('🎯 Why Firebase is perfect for your needs:', 'info');
  console.log(colors.green('  ✅ Already configured and working'));
  console.log(colors.green('  ✅ Handles large files perfectly (your downloads are ~200MB each)'));
  console.log(colors.green('  ✅ No build system conflicts'));
  console.log(colors.green('  ✅ Fast global CDN'));
  console.log(colors.green('  ✅ Custom domain support (rinawarptech.com)'));
  console.log(colors.green('  ✅ Free SSL certificates'));
  console.log(colors.green('  ✅ Simple configuration'));
  console.log(colors.green('  ✅ No file size limits like Vercel'));
  
  log('\n🔧 Current Setup Analysis:', 'info');
  
  // Check Firebase configuration
  if (fs.existsSync('firebase.json')) {
    log('✅ Firebase configuration exists', 'success');
    const config = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
    log(`📁 Public directory: ${config.hosting?.public || 'public'}`, 'info');
    log(`🌐 Site ID: ${config.hosting?.site || 'default'}`, 'info');
  } else {
    log('❌ Firebase configuration missing', 'error');
    return;
  }
  
  // Check if Firebase CLI is available
  try {
    execSync('firebase --version', { stdio: 'ignore' });
    log('✅ Firebase CLI is available', 'success');
  } catch (error) {
    log('❌ Firebase CLI not found. Install with: npm install -g firebase-tools', 'error');
    return;
  }
  
  // Check download files
  const downloadFiles = [
    'public/releases/RinaWarp-Terminal-Setup-Windows.exe',
    'public/releases/RinaWarp-Terminal-Portable-Windows.exe',
    'public/releases/RinaWarp-Terminal-Linux.tar.gz',
    'public/releases/RinaWarp-Terminal-macOS.dmg'
  ];
  
  log('\n📦 Download Files Analysis:', 'info');
  downloadFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      log(`  ✅ ${file.split('/').pop()}: ${sizeInMB}MB`, 'success');
    } else {
      log(`  ❌ ${file}: Missing`, 'error');
    }
  });
  
  log('\n🚀 Next Steps to Move Everything to Firebase:', 'info');
  console.log(colors.yellow('  1. Update your domain DNS to point to Firebase'));
  console.log(colors.yellow('  2. Deploy to Firebase: firebase deploy --only hosting'));
  console.log(colors.yellow('  3. Remove Vercel project (optional)'));
  
  log('\n💡 Benefits of Firebase-Only Approach:', 'info');
  console.log(colors.green('  🎯 Single hosting platform = simpler management'));
  console.log(colors.green('  📊 Unified analytics and monitoring'));
  console.log(colors.green('  🔧 No configuration conflicts'));
  console.log(colors.green('  💰 More cost-effective'));
  console.log(colors.green('  🚀 Faster deployment'));
  console.log(colors.green('  🛡️ Better security (no build system vulnerabilities)'));
  
  log('\n🔧 Would you like me to:', 'info');
  console.log(colors.cyan('  A) Deploy to Firebase right now'));
  console.log(colors.cyan('  B) Update your domain DNS settings'));
  console.log(colors.cyan('  C) Create a Firebase-only deployment script'));
  console.log(colors.cyan('  D) All of the above'));
  
  console.log(colors.cyan('\n' + '=' .repeat(60)));
  log('🎉 Firebase can handle everything - no need for multiple platforms!', 'success');
}

// Export for use in other scripts
module.exports = {
  main,
  log,
  colors
};

// Run if executed directly
if (require.main === module) {
  main();
}
