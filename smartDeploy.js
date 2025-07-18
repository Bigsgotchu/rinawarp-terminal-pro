#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const open = require('open');

// Color utilities (lightweight alternative to kleur)
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  bgGreen: (text) => `\x1b[42m\x1b[30m${text}\x1b[0m`,
  bgRed: (text) => `\x1b[41m\x1b[37m${text}\x1b[0m`
};

console.log(colors.blue('🚀 Smart Firebase Deployment Script'));
console.log(colors.gray('=====================================\n'));

// 🔍 Audit: Check Firebase login
console.log(colors.cyan('🔍 Step 1: Verifying Firebase authentication...'));
try {
  const userInfo = execSync('firebase login:list', { encoding: 'utf8' });
  console.log(colors.green('✅ Firebase authentication verified.'));
  console.log(colors.gray(userInfo.split('\n')[0])); // Show first line only
} catch (err) {
  console.error(colors.red('❌ Not logged into Firebase. Please log in.'));
  try {
    execSync('firebase login', { stdio: 'inherit' });
  } catch (loginErr) {
    console.error(colors.red('Failed to login to Firebase. Please try manually.'));
    process.exit(1);
  }
}

// 🔍 Audit: Check active project alias
console.log(colors.cyan('\n🔍 Step 2: Checking active Firebase project...'));
try {
  const aliasInfo = execSync('firebase use', { encoding: 'utf8' });
  console.log(colors.green('📡 Active Firebase project:'));
  console.log(colors.gray(aliasInfo.trim()));
} catch (err) {
  console.error(colors.red('⚠️ Could not detect active project. Try running: firebase use default'));
  process.exit(1);
}

// 🔍 Audit: Check Firebase hosting sites
console.log(colors.cyan('\n🔍 Step 3: Listing Firebase hosting sites...'));
try {
  const sitesInfo = execSync('firebase hosting:sites:list', { encoding: 'utf8' });
  console.log(colors.green('📋 Available hosting sites:'));
  console.log(colors.gray(sitesInfo));
} catch (err) {
  console.error(colors.red('⚠️ Could not list hosting sites.'));
  console.error(colors.gray(err.message));
}

// 🔍 Check firebase.json configuration
console.log(colors.cyan('\n🔍 Step 4: Validating firebase.json configuration...'));
try {
  const firebaseConfig = JSON.parse(fs.readFileSync('./firebase.json', 'utf8'));
  console.log(colors.green('✅ firebase.json found and valid'));
  
  if (firebaseConfig.hosting) {
    console.log(colors.gray(`   Site: ${firebaseConfig.hosting.site || 'default'}`));
    console.log(colors.gray(`   Public dir: ${firebaseConfig.hosting.public || 'public'}`));
    console.log(colors.gray(`   Rewrites: ${firebaseConfig.hosting.rewrites ? firebaseConfig.hosting.rewrites.length : 0} rules`));
  }
} catch (err) {
  console.error(colors.red('❌ firebase.json not found or invalid'));
  process.exit(1);
}

// 🔍 Check if public directory exists and has content
console.log(colors.cyan('\n🔍 Step 5: Checking public directory...'));
try {
  const publicStats = fs.statSync('./public');
  if (publicStats.isDirectory()) {
    const files = fs.readdirSync('./public');
    console.log(colors.green(`✅ Public directory found with ${files.length} files`));
    
    if (files.includes('index.html')) {
      console.log(colors.green('✅ index.html found'));
    } else {
      console.log(colors.yellow('⚠️ No index.html found in public directory'));
    }
  }
} catch (err) {
  console.error(colors.red('❌ Public directory not found'));
  process.exit(1);
}

// 🧭 Optional: Prompt to open Firebase Console
console.log(colors.yellow('\n🔎 Opening Firebase Console for manual config check...'));
console.log(colors.gray('   URL: https://console.firebase.google.com/project/rinawarp-terminal/hosting'));
try {
  open('https://console.firebase.google.com/project/rinawarp-terminal/hosting');
  console.log(colors.green('✅ Firebase Console opened in browser'));
} catch (err) {
  console.log(colors.yellow('⚠️ Could not open browser automatically'));
}

// 🚀 Deploy
console.log(colors.blue('\n🚀 Step 6: Deploying to Firebase...'));
try {
  const deployResult = execSync('firebase deploy --only hosting', { encoding: 'utf8' });
  console.log(colors.green('✅ Deployment completed successfully!'));
  console.log(colors.gray(deployResult));
} catch (err) {
  console.error(colors.red('❌ Deployment failed'));
  console.error(colors.gray(err.message));
  process.exit(1);
}

// 🌐 Post-deploy site health check with delay
console.log(colors.blue('\n🔎 Step 7: Verifying live site availability...'));
console.log(colors.gray('   Waiting 6 seconds for CDN propagation...'));

setTimeout(() => {
  const primaryDomain = 'https://rinawarptech.com';
  const hostedURLs = [
    primaryDomain,
    'https://rinawarp-terminal.web.app' // Firebase backup domain
  ];
  
  for (const url of hostedURLs) {
    try {
      console.log(colors.gray(`   Testing: ${url}`));
      
      // Use curl to check the URL
      const curlResult = execSync(`curl -s -w "HTTPSTATUS:%{http_code}" -L "${url}"`, { encoding: 'utf8' });
      const statusMatch = curlResult.match(/HTTPSTATUS:(\d+)$/);
      const content = curlResult.replace(/HTTPSTATUS:\d+$/, '');
      const status = statusMatch ? parseInt(statusMatch[1]) : 0;
      
      if (status === 200) {
        console.log(colors.bgGreen(`✅ ${url} is live! (${status})`));
        
        // Check if it's actually our content (not Firebase's default page)
        if (content.includes('Site Not Found')) {
          console.log(colors.bgRed(`⚠️ ${url} serving Firebase default page - check console!`));
        } else if (content.includes('RinaWarp') || content.includes('Hello World')) {
          console.log(colors.green(`✅ ${url} serving correct content`));
        } else {
          console.log(colors.yellow(`⚠️ ${url} serving unknown content`));
        }
      } else {
        console.warn(colors.bgRed(`⚠️ ${url} responded with status: ${status}`));
        console.log(colors.yellow(`🧠 Double-check index.html and rewrite rules in firebase.json`));
      }
    } catch (err) {
      console.error(colors.red(`🚫 Unable to reach ${url}. Possible DNS/config error.`));
      console.error(colors.gray(err.message));
    }
  }
  
  // 📊 Summary
  console.log(colors.blue('\n📊 Deployment Summary:'));
  console.log(colors.gray('====================================='));
  console.log(colors.green('✅ Firebase CLI authenticated'));
  console.log(colors.green('✅ Project configuration valid'));
  console.log(colors.green('✅ Deployment completed'));
  console.log(colors.yellow('⚠️ If sites show "Site Not Found", check Firebase Console'));
  console.log(colors.cyan('🔗 Firebase Console: https://console.firebase.google.com/project/rinawarp-terminal/hosting'));
  console.log(colors.cyan('🔗 Primary Domain: https://rinawarptech.com'));
  
}, 6000);
