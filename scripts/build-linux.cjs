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

async function buildLinux() {
  try {
    console.log('🔄 Starting Linux build process...');
    
    // Clean dist directory
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true });
    }
    
    // Run prebuild steps
    console.log('📦 Running prebuild steps...');
    await runCommand('npm', ['run', 'prebuild']);
    
    // Run electron-builder for Linux
    console.log('📱 Packaging Electron app for Linux...');
    await runCommand('npx', ['electron-builder', '--linux']);
    
    // Check if AppImage was created
    const files = fs.readdirSync('dist');
    const appImageFile = files.find(file => file.endsWith('.AppImage'));
    
    if (appImageFile) {
      console.log(`✅ Linux build completed: dist/${appImageFile}`);
      const filePath = path.join('dist', appImageFile);
      const size = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
      console.log(`📏 AppImage size: ${size} MB`);
    } else {
      console.log('⚠️  No AppImage found, checking for other artifacts...');
      const artifacts = files.filter(file => 
        file.endsWith('.deb') || 
        file.endsWith('.rpm') || 
        file.endsWith('.tar.gz') || 
        fs.statSync(path.join('dist', file)).isDirectory()
      );
      console.log('📦 Found artifacts:', artifacts);
    }
    
  } catch (error) {
    console.error('❌ Linux build failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  buildLinux();
}

module.exports = buildLinux;
