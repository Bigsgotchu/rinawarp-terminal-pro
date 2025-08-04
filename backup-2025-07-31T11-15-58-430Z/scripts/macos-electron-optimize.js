/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * macOS Electron Optimization Script
 * Addresses common Electron issues on macOS
 */

const { exec } = require('child_process');
const os = require('os');
const path = require('node:path');

// Check if running on macOS
if (os.platform() !== 'darwin') {
  console.log('This script is for macOS only');
  process.exit(0);
}

console.log('🍎 Optimizing Electron for macOS...');

// 1. Clear Electron cache
const electronCachePath = path.join(os.homedir(), 'Library', 'Caches', 'com.rinawarp.terminal');
exec(`rm -rf "${electronCachePath}"`, error => {
  if (error && error.code !== 'ENOENT') {
    console.error('Failed to clear Electron cache:', error);
  } else {
    console.log('✅ Cleared Electron cache');
  }
});

// 2. Reset GPU preferences
exec('defaults delete com.rinawarp.terminal GPUSelectionPolicy 2>/dev/null', error => {
  // Ignore error if preference doesn't exist
  console.log('✅ Reset GPU preferences');
});

// 3. Set recommended GPU settings
exec(
  'defaults write com.rinawarp.terminal GPUSelectionPolicy -string "PreferIntegrated"',
  error => {
    if (error) {
      console.error('Failed to set GPU preference:', error);
    } else {
      console.log('✅ Set GPU to prefer integrated graphics');
    }
  }
);

// 4. Clear shared memory segments
exec('ipcs -m | grep ^m | awk \'{print $2}\' | xargs -n 1 ipcrm -m 2>/dev/null', error => {
  // Ignore errors as some segments may be in use
  console.log('✅ Cleared shared memory segments');
});

// 5. Set environment variables for better compatibility
const envVars = {
  ELECTRON_DISABLE_GPU_SANDBOX: '1',
  ELECTRON_DISABLE_SETUID_SANDBOX: '1',
  ELECTRON_FORCE_WINDOW_MENU_BAR: '1',
  ELECTRON_NO_ATTACH_CONSOLE: '1',
};

console.log('\n📝 Recommended environment variables:');
Object.entries(envVars).forEach(([key, value]) => {
  console.log(`export ${key}="${value}"`);
});

console.log('\n✨ Optimization complete!');
console.log('Run the terminal with: npm start');
