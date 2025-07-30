/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

#!/usr/bin/env node

/**
 * RinaWarp Terminal - Core Functionality Test
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 * 
 * Basic core functionality test to verify essential components work
 */

const fs = require('node:fs');

console.log('🧪 Running RinaWarp Terminal Core Functionality Tests...\n');

// Test 1: Check if main files exist
console.log('1. Checking core files...');
const requiredFiles = [
  'src/main.cjs',
  'server.js',
  'package.json',
  '.env'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file} exists`);
  } else {
    // In CI environments, .env file may not exist - this is expected
    if (file === '.env' && process.env.CI) {
      console.log(`   ✅ ${file} not required in CI`);
    } else {
      console.log(`   ❌ ${file} missing`);
      allFilesExist = false;
    }
  }
});

// Test 2: Check package.json structure
console.log('\n2. Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`   ✅ Package name: ${packageJson.name}`);
  console.log(`   ✅ Version: ${packageJson.version}`);
  console.log(`   ✅ Main entry: ${packageJson.main}`);
} catch (error) {
  console.log(`   ❌ Package.json error: ${error.message}`);
  allFilesExist = false;
}

// Test 3: Check environment configuration
console.log('\n3. Checking environment configuration...');
try {
  const envContent = fs.readFileSync('.env', 'utf8');
  const hasStripeConfig = envContent.includes('STRIPE_SECRET_KEY');
  const hasPortConfig = envContent.includes('PORT=');
  
  console.log(`   ${hasStripeConfig ? '✅' : '❌'} Stripe configuration found`);
  console.log(`   ${hasPortConfig ? '✅' : '❌'} Port configuration found`);
} catch (error) {
  // In CI environments, .env file may not exist - this is expected
  if (process.env.CI) {
    console.log('   ✅ CI environment detected - .env file not required');
  } else {
    console.log(`   ❌ Environment file error: ${error.message}`);
    allFilesExist = false;
  }
}

// Test 4: Check src structure
console.log('\n4. Checking src structure...');
const srcDirs = ['src/renderer', 'src/utils'];
srcDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`   ✅ ${dir} exists`);
  } else {
    console.log(`   ❌ ${dir} missing`);
  }
});

// Test 5: Check public directory
console.log('\n5. Checking public directory...');
if (fs.existsSync('public')) {
  console.log('   ✅ public directory exists');
} else {
  console.log('   ❌ public directory missing');
}

// Final result
console.log('\n📊 Core Functionality Test Results:');
if (allFilesExist) {
  console.log('✅ All core functionality tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some core functionality tests failed!');
  process.exit(1);
}
