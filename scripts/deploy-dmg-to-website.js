#!/usr/bin/env node

/**
 * Deploy DMG to RinaWarp Terminal Website
 * Uploads the fresh DMG build to rinawarptech.com
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🚀 Deploying DMG to RinaWarp Terminal Website');
console.log('=============================================');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠️ ${message}`, colors.yellow);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️ ${message}`, colors.blue);
}

// Check if DMG file exists
function checkDMGFile() {
  const dmgPaths = [
    path.join(projectRoot, 'dist', 'RinaWarp-Terminal-macOS.dmg'),
    path.join(projectRoot, 'public', 'releases', 'RinaWarp-Terminal-macOS.dmg'),
  ];

  for (const dmgPath of dmgPaths) {
    if (fs.existsSync(dmgPath)) {
      const stats = fs.statSync(dmgPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
      logSuccess(`Found DMG file: ${dmgPath} (${sizeMB} MB)`);
      return dmgPath;
    }
  }

  logError('DMG file not found in expected locations');
  logInfo('Expected locations:');
  dmgPaths.forEach(path => logInfo(`  - ${path}`));
  logInfo('Run: npm run build:mac to generate the DMG file');
  process.exit(1);
}

// Copy DMG to releases directory
function ensureDMGInReleases(dmgPath) {
  const releasesDir = path.join(projectRoot, 'public', 'releases');
  const targetPath = path.join(releasesDir, 'RinaWarp-Terminal-macOS.dmg');

  // Ensure releases directory exists
  if (!fs.existsSync(releasesDir)) {
    fs.mkdirSync(releasesDir, { recursive: true });
    logInfo('Created releases directory');
  }

  // Copy DMG if not already in releases
  if (dmgPath !== targetPath) {
    fs.copyFileSync(dmgPath, targetPath);
    logSuccess('DMG copied to releases directory');
  }

  return targetPath;
}

// Update release metadata
function updateReleaseMetadata() {
  const metadataPath = path.join(projectRoot, 'public', 'releases', 'metadata.json');
  const dmgPath = path.join(projectRoot, 'public', 'releases', 'RinaWarp-Terminal-macOS.dmg');

  if (fs.existsSync(dmgPath)) {
    const stats = fs.statSync(dmgPath);
    const metadata = {
      'RinaWarp-Terminal-macOS.dmg': {
        size: stats.size,
        sizeFormatted: formatBytes(stats.size),
        lastModified: stats.mtime.toISOString(),
        platform: 'macOS',
        type: 'disk-image',
        url: '/api/download?file=RinaWarp-Terminal-macOS.dmg',
      },
    };

    // Read existing metadata if it exists
    let existingMetadata = {};
    if (fs.existsSync(metadataPath)) {
      try {
        existingMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      } catch (error) {
        logWarning('Could not read existing metadata, creating new file');
      }
    }

    // Merge metadata
    const updatedMetadata = { ...existingMetadata, ...metadata };
    fs.writeFileSync(metadataPath, JSON.stringify(updatedMetadata, null, 2));
    logSuccess('Release metadata updated');
  }
}

// Format bytes to human readable
function formatBytes(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

// Deploy to Railway
function deployToRailway() {
  logInfo('Deploying to Railway...');

  try {
    // Check if Railway CLI is available
    execSync('railway --version', { stdio: 'ignore' });
  } catch (error) {
    logError('Railway CLI not found');
    logInfo('Install with: npm install -g @railway/cli');
    logInfo('Then run: railway login');
    process.exit(1);
  }

  try {
    // Check authentication
    execSync('railway whoami', { stdio: 'ignore' });
    logSuccess('Authenticated with Railway');
  } catch (error) {
    logError('Not authenticated with Railway');
    logInfo('Run: railway login');
    process.exit(1);
  }

  try {
    // Deploy
    logInfo('Uploading files to Railway...');
    execSync('railway up', {
      stdio: 'inherit',
      cwd: projectRoot,
    });
    logSuccess('Deployment completed successfully!');

    logInfo('');
    logSuccess('🎉 DMG is now available at:');
    logSuccess('   https://rinawarptech.com/api/download?file=RinaWarp-Terminal-macOS.dmg');
    logInfo('');
  } catch (error) {
    logError('Deployment failed');
    console.error(error.message);
    process.exit(1);
  }
}

// Alternative deployment methods
function showAlternativeDeployment() {
  logInfo('');
  logInfo('Alternative deployment methods:');
  logInfo('1. Manual FTP/SFTP upload');
  logInfo('2. Git push to hosting provider');
  logInfo('3. Cloud storage with CDN');
  logInfo('');
  logInfo('For manual deployment, upload these files:');
  logInfo('   - public/releases/RinaWarp-Terminal-macOS.dmg');
  logInfo('   - public/releases/metadata.json');
  logInfo('');
}

// Main deployment function
async function main() {
  try {
    // Check for DMG file
    const dmgPath = checkDMGFile();

    // Ensure it's in the releases directory
    const releaseDMGPath = ensureDMGInReleases(dmgPath);

    // Update metadata
    updateReleaseMetadata();

    // Ask user for deployment preference
    const args = process.argv.slice(2);
    if (args.includes('--railway') || args.includes('-r')) {
      deployToRailway();
    } else if (args.includes('--help') || args.includes('-h')) {
      console.log('');
      console.log('Usage: node deploy-dmg-to-website.js [options]');
      console.log('');
      console.log('Options:');
      console.log('  -r, --railway    Deploy to Railway');
      console.log('  -h, --help       Show this help message');
      console.log('');
      console.log('Without options, the script will prepare files for deployment');
      showAlternativeDeployment();
    } else {
      logSuccess('DMG prepared for deployment');
      showAlternativeDeployment();
      logInfo('To deploy to Railway automatically, run:');
      logInfo('   node scripts/deploy-dmg-to-website.js --railway');
    }
  } catch (error) {
    logError('Deployment preparation failed');
    console.error(error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default main;
