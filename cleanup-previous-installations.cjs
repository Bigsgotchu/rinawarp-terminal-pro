#!/usr/bin/env node

/**
 * RinaWarp Terminal - Installation Cleanup Script
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * This script removes previous RinaWarp installations to prevent conflicts
 * with the new creator license system
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

console.log('\n🧜‍♀️ RinaWarp Terminal - Installation Cleanup');
console.log('═══════════════════════════════════════════════════');
console.log('🧹 Removing previous installations to prevent conflicts');
console.log('');

// Track what we're cleaning up
const cleanupActions = [];
const backupActions = [];

// Helper function to safely remove files/directories
function safeRemove(targetPath, description) {
  try {
    if (fs.existsSync(targetPath)) {
      const stats = fs.statSync(targetPath);

      if (stats.isDirectory()) {
        execSync(`rm -rf "${targetPath}"`, { stdio: 'pipe' });
      } else {
        fs.unlinkSync(targetPath);
      }

      cleanupActions.push(`✅ Removed ${description}: ${targetPath}`);
      return true;
    } else {
      cleanupActions.push(`ℹ️  ${description} not found: ${targetPath}`);
      return false;
    }
  } catch (error) {
    cleanupActions.push(`❌ Failed to remove ${description}: ${error.message}`);
    return false;
  }
}

// Helper function to backup important data
function backupUserData(sourcePath, backupPath, description) {
  try {
    if (fs.existsSync(sourcePath)) {
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const stats = fs.statSync(sourcePath);
      if (stats.isDirectory()) {
        execSync(`cp -r "${sourcePath}" "${backupPath}"`, { stdio: 'pipe' });
      } else {
        fs.copyFileSync(sourcePath, backupPath);
      }

      backupActions.push(`💾 Backed up ${description}: ${backupPath}`);
      return true;
    }
    return false;
  } catch (error) {
    backupActions.push(`❌ Backup failed for ${description}: ${error.message}`);
    return false;
  }
}

// Create backup directory
const backupDir = path.join(
  os.homedir(),
  '.rinawarp-cleanup-backup',
  new Date().toISOString().split('T')[0]
);

console.log('🔍 Scanning for existing RinaWarp installations...');
console.log('');

// 1. Backup user data before cleanup
console.log('📦 Creating backups of user data...');

// Backup application support data
const appSupportPath = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'rinawarp-terminal'
);
const appSupportBackup = path.join(backupDir, 'application-support');
backupUserData(appSupportPath, appSupportBackup, 'Application Support data');

// Backup preferences
const prefsPath = path.join(
  os.homedir(),
  'Library',
  'Preferences',
  'com.rinawarptech.terminal.plist'
);
const prefsBackup = path.join(backupDir, 'preferences.plist');
backupUserData(prefsPath, prefsBackup, 'Preferences');

// Backup any existing creator license (shouldn't exist but just in case)
const existingCreatorLicense = path.join(os.homedir(), '.rinawarp-creator');
const creatorLicenseBackup = path.join(backupDir, 'creator-license-backup.json');
backupUserData(existingCreatorLicense, creatorLicenseBackup, 'Existing creator license');

console.log('');

// 2. Remove Applications
console.log('🗑️  Cleaning up installed applications...');

// Remove main application
safeRemove('/Applications/RinaWarp Terminal - Creator Edition.app', 'Creator Edition app');
safeRemove('/Applications/RinaWarp Terminal.app', 'Main application');
safeRemove('/Applications/RinaWarp.app', 'RinaWarp app');

// Check for apps in user Applications folder
const userAppsDir = path.join(os.homedir(), 'Applications');
if (fs.existsSync(userAppsDir)) {
  const userApps = fs
    .readdirSync(userAppsDir)
    .filter(app => app.toLowerCase().includes('rinawarp'));
  userApps.forEach(app => {
    safeRemove(path.join(userAppsDir, app), `User application: ${app}`);
  });
}

console.log('');

// 3. Remove Application Support data
console.log('🗂️  Cleaning up application data...');

safeRemove(appSupportPath, 'Application Support data');
safeRemove(
  path.join(os.homedir(), 'Library', 'Application Support', 'RinaWarp'),
  'RinaWarp Application Support'
);
safeRemove(
  path.join(os.homedir(), 'Library', 'Application Support', 'com.rinawarptech.terminal'),
  'App identifier data'
);

console.log('');

// 4. Remove Preferences and caches
console.log('⚙️  Cleaning up preferences and caches...');

safeRemove(prefsPath, 'Main preferences');
safeRemove(
  path.join(os.homedir(), 'Library', 'Preferences', 'com.rinawarptech.RinaWarp.plist'),
  'Alt preferences'
);
safeRemove(path.join(os.homedir(), 'Library', 'Caches', 'rinawarp-terminal'), 'Cache files');
safeRemove(path.join(os.homedir(), 'Library', 'Caches', 'com.rinawarptech.terminal'), 'App cache');

console.log('');

// 5. Remove saved application states
console.log('💾 Cleaning up saved application states...');

safeRemove(
  path.join(
    os.homedir(),
    'Library',
    'Saved Application State',
    'com.rinawarptech.terminal.savedState'
  ),
  'Saved app state'
);

console.log('');

// 6. Remove any global npm packages (if any)
console.log('📦 Checking for global npm packages...');

try {
  const globalPackages = execSync('npm list -g --depth=0', { encoding: 'utf8', stdio: 'pipe' });
  if (globalPackages.includes('rinawarp')) {
    console.log('🗑️  Found global RinaWarp package, removing...');
    try {
      execSync('npm uninstall -g rinawarp-terminal', { stdio: 'pipe' });
      cleanupActions.push('✅ Removed global npm package: rinawarp-terminal');
    } catch (error) {
      cleanupActions.push(`❌ Failed to remove global package: ${error.message}`);
    }
  } else {
    cleanupActions.push('ℹ️  No global npm packages found');
  }
} catch (error) {
  cleanupActions.push('ℹ️  Could not check global npm packages');
}

console.log('');

// 7. Remove old license files (but preserve new creator license)
console.log('🔑 Cleaning up old license files...');

// Remove old license files but keep the new creator license
const oldLicensePaths = [
  path.join(os.homedir(), '.rinawarp-license'),
  path.join(os.homedir(), '.rinawarp-dev'),
  path.join(os.homedir(), 'Library', 'Application Support', 'rinawarp-terminal', 'license.json'),
];

oldLicensePaths.forEach(licensePath => {
  safeRemove(licensePath, 'Old license file');
});

console.log('');

// 8. Clean up browser data (localStorage/sessionStorage - manual step)
console.log('🌐 Browser cleanup (manual step required)...');
console.log('   For complete cleanup, clear browser data for:');
console.log('   • localhost:3000 (if testing locally)');
console.log("   • Any RinaWarp domains you've used");
console.log('   • Browser DevTools → Application → Storage → Clear All');

console.log('');
console.log('═══════════════════════════════════════════════════');
console.log('🎉 CLEANUP COMPLETE!');
console.log('═══════════════════════════════════════════════════');
console.log('');

// Summary of actions
console.log('📋 Cleanup Summary:');
cleanupActions.forEach(action => console.log('  ' + action));

if (backupActions.length > 0) {
  console.log('');
  console.log('💾 Backup Summary:');
  backupActions.forEach(action => console.log('  ' + action));
  console.log('');
  console.log(`📁 Backups stored in: ${backupDir}`);
}

console.log('');
console.log('✅ Your system is now clean and ready for testing!');
console.log('🧜‍♀️ Your NEW creator license is preserved and ready to use.');
console.log('');
console.log('🚀 Next steps:');
console.log('  1. node verify-creator-license.cjs  # Verify creator license');
console.log('  2. node launch-creator-terminal.cjs  # Launch with creator access');
console.log('  3. npm run dev  # Or launch normally (auto-detects creator)');
console.log('');
