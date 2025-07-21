#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔍 Verifying Code Signing\n');

const platform = process.platform;

if (platform === 'darwin') {
  // macOS verification
  const appPath = path.join(__dirname, '..', 'dist', 'mac', 'RinaWarp Terminal.app');

  if (fs.existsSync(appPath)) {
    try {
      console.log('Verifying signature...');
      const result = execSync(`codesign --verify --deep --strict --verbose=2 "${appPath}"`, {
        encoding: 'utf8',
      });
      console.log('✅ Signature verified successfully');

      console.log('\nChecking notarization...');
      const spctl = execSync(`spctl -a -t exec -vvv "${appPath}"`, { encoding: 'utf8' });
      console.log('✅ Notarization verified successfully');
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
    }
  } else {
    console.log('❌ App not found. Build the app first.');
  }
} else if (platform === 'win32') {
  // Windows verification
  const exePath = path.join(__dirname, '..', 'dist', 'RinaWarp Terminal Setup.exe');

  if (fs.existsSync(exePath)) {
    try {
      console.log('Verifying signature...');
      const result = execSync(`powershell "Get-AuthenticodeSignature '${exePath}'"`, {
        encoding: 'utf8',
      });
      console.log(result);

      if (result.includes('Valid')) {
        console.log('✅ Signature verified successfully');
      } else {
        console.log('❌ Signature verification failed');
      }
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
    }
  } else {
    console.log('❌ Installer not found. Build the app first.');
  }
}
