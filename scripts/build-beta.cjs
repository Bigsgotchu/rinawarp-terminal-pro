#!/usr/bin/env node

// Beta Build Script
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Building RinaWarp Terminal Beta...');

try {
  // Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  execSync('rm -rf dist/', { stdio: 'inherit' });

  // Copy beta config
  console.log('📋 Copying beta configuration...');
  fs.copyFileSync(
    path.join(__dirname, '../beta-release/beta-config.json'),
    path.join(__dirname, '../src/config/beta-config.json')
  );

  // Build for all platforms
  console.log('🔨 Building for all platforms...');
  execSync('npm run build:all', { stdio: 'inherit' });

  // Tag builds as beta
  console.log('🏷️  Tagging builds as beta...');
  const distDir = path.join(__dirname, '../dist');
  const files = fs.readdirSync(distDir);

  files.forEach(file => {
    if (file.includes('RinaWarp') && !file.includes('beta')) {
      const oldPath = path.join(distDir, file);
      const newPath = path.join(distDir, file.replace('RinaWarp', 'RinaWarp-Beta'));
      fs.renameSync(oldPath, newPath);
    }
  });

  console.log('✅ Beta build complete!');
  console.log('📁 Builds available in dist/');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
