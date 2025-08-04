#!/usr/bin/env node
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

const fs = require('node:fs');
const path = require('node:path');
const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const envLocalPath = path.join(__dirname, '..', '.env.local');

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

function updateEnvFile(key, value) {
  let content = fs.readFileSync(envLocalPath, 'utf8');
  const regex = new RegExp(`^${key}=.*$`, 'm');

  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content += `\n${key}=${value}`;
  }

  fs.writeFileSync(envLocalPath, content);
}

async function setupMacOS() {
  console.log('\n🍎 macOS Code Signing Setup\n');

  const hasCert = await question('Do you have an Apple Developer account and certificate? (y/n): ');

  if (hasCert.toLowerCase() !== 'y') {
    console.log('\n📋 Steps to get Apple Developer certificate:');
    console.log('1. Visit https://developer.apple.com and enroll ($99/year)');
    console.log('2. Create a Developer ID Application certificate');
    console.log('3. Export it as a .p12 file with a password');
    console.log('4. Come back and run this wizard again\n');
    return false;
  }

  const certPath = await question('Enter the full path to your .p12 certificate file: ');

  if (!fs.existsSync(certPath)) {
    console.log('❌ Certificate file not found at:', certPath);
    return false;
  }

  const certPassword = await question('Enter your certificate password: ');
  const appleId = await question('Enter your Apple ID email: ');
  const appPassword = await question('Enter your app-specific password (xxxx-xxxx-xxxx-xxxx): ');
  const teamId = await question('Enter your Team ID (10 characters): ');

  updateEnvFile('CSC_LINK', certPath);
  updateEnvFile('CSC_KEY_PASSWORD', certPassword);
  updateEnvFile('APPLE_ID', appleId);
  updateEnvFile('APPLE_ID_PASSWORD', appPassword);
  updateEnvFile('APPLE_TEAM_ID', teamId);

  console.log('✅ macOS signing configuration saved!');
  return true;
}

async function setupWindows() {
  console.log('\n🪟 Windows Code Signing Setup\n');

  const hasCert = await question('Do you have a Windows code signing certificate? (y/n): ');

  if (hasCert.toLowerCase() !== 'y') {
    console.log('\n📋 Steps to get Windows code signing certificate:');
    console.log('1. Purchase from DigiCert, Sectigo, or GlobalSign');
    console.log('2. Complete validation process (1-5 days)');
    console.log('3. Export as .pfx file with a password');
    console.log('4. Come back and run this wizard again\n');

    const skipWin = await question('Skip Windows signing for now? (y/n): ');
    return skipWin.toLowerCase() === 'y';
  }

  const certPath = await question('Enter the full path to your .pfx certificate file: ');

  if (!fs.existsSync(certPath)) {
    console.log('❌ Certificate file not found at:', certPath);
    return false;
  }

  const certPassword = await question('Enter your certificate password: ');

  updateEnvFile('WIN_CSC_LINK', certPath);
  updateEnvFile('WIN_CSC_KEY_PASSWORD', certPassword);

  console.log('✅ Windows signing configuration saved!');
  return true;
}

async function setupGitHub() {
  console.log('\n🐙 GitHub Token Setup\n');

  const hasToken = await question('Do you have a GitHub personal access token? (y/n): ');

  if (hasToken.toLowerCase() !== 'y') {
    console.log('\n📋 Steps to create GitHub token:');
    console.log('1. Visit https://github.com/settings/tokens');
    console.log('2. Click "Generate new token (classic)"');
    console.log('3. Select scopes: repo, write:packages, read:packages');
    console.log('4. Generate and copy the token immediately\n');

    const createNow = await question('Open GitHub tokens page now? (y/n): ');
    if (createNow.toLowerCase() === 'y') {
      try {
        execSync('open https://github.com/settings/tokens');
      } catch (_e) {
        console.log('Please visit: https://github.com/settings/tokens');
      }
    }
  }

  const token = await question('Enter your GitHub personal access token: ');

  if (!token || token.length < 20) {
    console.log('❌ Invalid token');
    return false;
  }

  updateEnvFile('GH_TOKEN', token);
  console.log('✅ GitHub token saved!');
  return true;
}

async function testBuild() {
  console.log('\n🔨 Ready to test build?\n');

  const doBuild = await question('Run a test build now? (y/n): ');

  if (doBuild.toLowerCase() === 'y') {
    console.log('\nRunning test build...');
    console.log('This may take several minutes...\n');

    try {
      execSync('npm run build:dev', { stdio: 'inherit' });
      console.log('\n✅ Build completed!');

      // Run verification
      console.log('\nRunning signature verification...');
      execSync('node scripts/verify-signing.cjs', { stdio: 'inherit' });
    } catch (error) {
      console.log('\n❌ Build failed. Check error messages above.');
    }
  }
}

async function main() {
  console.log('🔐 Code Signing Setup Wizard');
  console.log('===========================\n');

  if (!fs.existsSync(envLocalPath)) {
    console.log('❌ .env.local file not found!');
    console.log('Creating from template...');
    execSync('cp build/electron-builder.env.template .env.local');
  }

  // Setup each platform
  const macOK = await setupMacOS();
  const winOK = await setupWindows();
  const ghOK = await setupGitHub();

  console.log('\n📊 Setup Summary:');
  console.log(`  macOS:   ${macOK ? '✅' : '❌'}`);
  console.log(`  Windows: ${winOK ? '✅' : '❌'}`);
  console.log(`  GitHub:  ${ghOK ? '✅' : '❌'}`);

  if (macOK || winOK) {
    await testBuild();
  }

  console.log('\n✨ Setup wizard complete!');
  rl.close();
}

main().catch(console.error);
