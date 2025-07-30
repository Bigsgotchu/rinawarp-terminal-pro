#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function buildMac() {
  try {
    console.log('🛠️  Starting macOS build...');

    // Clean dist directory
    if (fs.existsSync('dist')) {
      console.log('🧹 Cleaning dist directory...');
      fs.rmSync('dist', { recursive: true });
    }

    // Set up environment variables for electron-builder
    process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
    process.env.ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES = 'true';
    process.env.CI = 'true';
    process.env.NOTARIZE = 'false';
    process.env.SIGN = 'false';

    // Run copy-assets instead of prebuild
    console.log('📦 Running copy-assets...');
    execSync('npm run copy-assets', {
      stdio: 'inherit',
      env: process.env,
    });

    console.log('✅ Assets copied successfully');

    // Run electron-builder to create DMG installer directly
    console.log('📱 Building macOS DMG with electron-builder...');
    execSync('npx electron-builder --mac --config.mac.target=dmg --publish=never', {
      stdio: 'inherit',
      env: process.env,
    });

    console.log('✅ Electron-builder completed successfully');

    // Check for DMG files
    const distDir = path.resolve('dist');
    const distFiles = fs.readdirSync(distDir);
    const dmgFiles = distFiles.filter(f => f.endsWith('.dmg'));
    const zipFiles = distFiles.filter(f => f.endsWith('.zip'));

    console.log('📁 Final dist directory contents:');
    distFiles.forEach(file => {
      const fullPath = path.join('dist', file);
      const stats = fs.statSync(fullPath);
      const size = stats.isFile() ? ` (${(stats.size / 1024 / 1024).toFixed(2)} MB)` : '';
      console.log(`  ${file} (${stats.isDirectory() ? 'directory' : 'file'})${size}`);
    });

    if (dmgFiles.length > 0) {
      console.log(`\n🎉 DMG created successfully: ${dmgFiles[0]}`);
    } else if (zipFiles.length > 0) {
      console.log(`\n📦 ZIP created successfully: ${zipFiles[0]}`);
    } else {
      console.log('\n⚠️  No DMG or ZIP files found, but build completed.');
    }
  } catch (error) {
    console.error('❌ macOS build failed with error:');
    if (error.stdout) console.error('STDOUT:', error.stdout.toString());
    if (error.stderr) console.error('STDERR:', error.stderr.toString());
    else console.error('ERROR:', error.message);

    // Additional debugging info
    console.log('🔍 Debug info:');
    console.log('  - Working directory:', process.cwd());
    console.log('  - Node version:', process.version);
    console.log('  - Platform:', process.platform);

    if (fs.existsSync('dist')) {
      console.log('  - Dist directory exists');
      const distFiles = fs.readdirSync('dist');
      console.log('  - Dist contents:', distFiles);
    } else {
      console.log('  - Dist directory does not exist');
    }

    process.exit(1);
  }
}

if (require.main === module) {
  buildMac();
}

module.exports = buildMac;
