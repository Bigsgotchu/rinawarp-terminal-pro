#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

async function buildMac() {
  try {
    console.log('🔄 Starting macOS build process...');
    
    // Clean dist directory
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true });
    }
    
    // Run prebuild steps
    console.log('📦 Running prebuild steps...');
    await runCommand('npm', ['run', 'prebuild']);
    
    // Run electron-builder with dir only (no zip/dmg creation)
    console.log('📱 Packaging Electron app...');
    await runCommand('npx', ['electron-builder', '--mac', '--dir'], {
      env: {
        ...process.env,
        CSC_IDENTITY_AUTO_DISCOVERY: 'false'
      }
    });
    
    // Check if app was created
    const appPath = path.join('dist', 'mac', 'Electron.app');
    if (!fs.existsSync(appPath)) {
      throw new Error('Electron app was not created');
    }
    
    // Manually create ZIP
    console.log('🗜️  Creating ZIP archive...');
    const zipName = 'RinaWarp-Terminal-1.0.8-mac.zip';
    await runCommand('ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', 'Electron.app', `../${zipName}`], {
      cwd: path.join('dist', 'mac')
    });
    
    console.log(`✅ macOS build completed: dist/${zipName}`);
    console.log(`📏 ZIP size: ${(fs.statSync(path.join('dist', zipName)).size / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  buildMac();
}

module.exports = buildMac;
