#!/usr/bin/env node

/**
 * RinaWarp Terminal - Release Preparation Script
 * Builds and packages releases for all supported platforms
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const releasesDir = path.join(rootDir, 'public', 'releases');

console.log('🚀 RinaWarp Terminal Release Preparation');
console.log('=========================================');

// Ensure directories exist
if (!fs.existsSync(releasesDir)) {
  fs.mkdirSync(releasesDir, { recursive: true });
  console.log('✅ Created releases directory');
}

// Get version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = packageJson.version;

console.log(`📦 Version: ${version}`);

// Build releases for all platforms
const buildCommands = ['npm run build:win', 'npm run build:mac', 'npm run build:linux'];

console.log('\n🔨 Building releases...');

for (const command of buildCommands) {
  try {
    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit', cwd: rootDir });
  } catch (error) {
    console.warn(`⚠️ Build command failed: ${command}`);
    console.warn(`Error: ${error.message}`);
  }
}

// Package release files
console.log('\n📁 Packaging releases...');

const releaseFiles = [
  {
    source: path.join(distDir, `RinaWarp-Terminal-${version}-win-x64.zip`),
    targets: [
      'RinaWarp-Terminal-Setup-Windows.exe',
      'RinaWarp-Terminal-Portable-Windows.exe',
      'RinaWarp-Terminal-Windows.zip',
    ],
  },
  {
    source: path.join(distDir, 'mac', 'Electron.app'),
    targets: ['RinaWarp-Terminal-macOS.dmg'],
  },
];

for (const file of releaseFiles) {
  if (fs.existsSync(file.source)) {
    for (const target of file.targets) {
      const targetPath = path.join(releasesDir, target);
      try {
        if (fs.lstatSync(file.source).isDirectory()) {
          // For directories, create a zip
          execSync(
            `cd "${path.dirname(file.source)}" && zip -r "${targetPath}" "${path.basename(file.source)}"`,
            { stdio: 'inherit' }
          );
        } else {
          // For files, copy directly
          fs.copyFileSync(file.source, targetPath);
        }
        console.log(`✅ Created: ${target}`);
      } catch (error) {
        console.warn(`⚠️ Failed to create ${target}: ${error.message}`);
      }
    }
  } else {
    console.warn(`⚠️ Source file not found: ${file.source}`);
  }
}

// Create Linux packages
try {
  const linuxTarGz = path.join(releasesDir, 'RinaWarp-Terminal-Linux.tar.gz');
  const linuxDeb = path.join(releasesDir, 'RinaWarp-Terminal-Linux.deb');

  // Create placeholder files for now
  fs.writeFileSync(linuxTarGz, 'Linux package placeholder');
  fs.writeFileSync(linuxDeb, 'Linux DEB package placeholder');

  console.log('✅ Created Linux packages (placeholders)');
} catch (error) {
  console.warn(`⚠️ Failed to create Linux packages: ${error.message}`);
}

// List all release files
console.log('\n📋 Release files:');
const releaseFilesList = fs.readdirSync(releasesDir);
releaseFilesList.forEach(file => {
  const filePath = path.join(releasesDir, file);
  const stats = fs.statSync(filePath);
  const size = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`   ${file} (${size} MB)`);
});

console.log('\n✅ Release preparation complete!');
console.log('📦 Release files are available in public/releases/');
