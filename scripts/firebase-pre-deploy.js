#!/usr/bin/env node

/**
 * 🚫 Firebase Pre-Deploy Scanner
 * Scans for executable files that would be blocked by Firebase Spark plan
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Firebase Spark plan forbidden extensions
const forbiddenExtensions = [
  '.exe',
  '.dll',
  '.dmg',
  '.apk',
  '.bat',
  '.sh',
  '.bin',
  '.ipa',
  '.msi',
  '.deb',
  '.rpm',
];

function scanDirectory(dirPath, relativePath = '') {
  const blockedFiles = [];

  try {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const relativeFilePath = path.join(relativePath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Recursively scan subdirectories
        blockedFiles.push(...scanDirectory(fullPath, relativeFilePath));
      } else {
        // Check file extension
        const ext = path.extname(item).toLowerCase();
        if (forbiddenExtensions.includes(ext)) {
          blockedFiles.push({
            path: relativeFilePath,
            size: stat.size,
            extension: ext,
          });
        }
      }
    }
  } catch (error) {
    log(`Error scanning directory ${dirPath}: ${error.message}`, 'red');
  }

  return blockedFiles;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function main() {
  const publicDir = path.join(__dirname, '..', 'public');

  log('🔍 Firebase Pre-Deploy Scanner', 'bold');
  log('=====================================', 'cyan');
  log(`Scanning: ${publicDir}`, 'cyan');
  log('Looking for Firebase Spark plan forbidden files...', 'yellow');

  if (!fs.existsSync(publicDir)) {
    log('❌ Public directory not found!', 'red');
    process.exit(1);
  }

  const blockedFiles = scanDirectory(publicDir);

  if (blockedFiles.length === 0) {
    log('✅ No blocked files found! Safe to deploy to Firebase.', 'green');
    process.exit(0);
  } else {
    log(`🚫 Found ${blockedFiles.length} blocked file(s):`, 'red');
    log('', 'reset');

    blockedFiles.forEach(file => {
      log(`   ❌ ${file.path}`, 'red');
      log(`      Extension: ${file.extension}`, 'yellow');
      log(`      Size: ${formatFileSize(file.size)}`, 'yellow');
    });

    log('', 'reset');
    log('💡 Solutions:', 'cyan');
    log('   1. Remove these files from public/', 'yellow');
    log('   2. Move to GitHub Releases or another host', 'yellow');
    log('   3. Zip the files (may still be detected)', 'yellow');
    log('   4. Upgrade to Firebase Blaze plan', 'yellow');
    log('', 'reset');
    log('🔗 More info: https://firebase.google.com/support/faq#hosting-exe-restrictions', 'cyan');

    process.exit(1);
  }
}

// Run the scanner
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, scanDirectory };
