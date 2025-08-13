#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function buildSimple() {
  console.log('🚀 Building RinaWarp Terminal - Simple Build Process');
  console.log('='.repeat(60));

  // Clean dist directory
  try {
    await execAsync('rm -rf dist');
    console.log('✅ Cleaned dist directory');
  } catch (_error) {
    console.log('⚠️  No dist directory to clean');
  }

  // Copy assets
  console.log('📁 Copying assets...');
  await execAsync('npm run copy-assets');

  // Build for macOS (ZIP format, no signing)
  console.log('🍎 Building for macOS...');
  try {
    await execAsync('electron-builder --mac --publish=never');
    console.log('✅ macOS build completed');
  } catch (error) {
    console.error('❌ macOS build failed:', error.message);
  }

  // Create Windows portable (this should work without signing on Mac)
  console.log('🪟 Building for Windows...');
  try {
    await execAsync('electron-builder --win --publish=never');
    console.log('✅ Windows build completed');
  } catch (error) {
    console.error('❌ Windows build failed:', error.message);
  }

  // Build for Linux
  console.log('🐧 Building for Linux...');
  try {
    await execAsync('electron-builder --linux --publish=never');
    console.log('✅ Linux build completed');
  } catch (error) {
    console.error('❌ Linux build failed:', error.message);
  }

  // Package everything
  console.log('📦 Packaging releases...');
  await packageReleases();

  console.log('\n✨ Build process completed!');
}

async function packageReleases() {
  const distPath = 'dist';
  const releasesPath = 'public/releases';

  // Ensure releases directory exists
  if (!fs.existsSync(releasesPath)) {
    fs.mkdirSync(releasesPath, { recursive: true });
  }

  // Package macOS
  const macFiles = fs.readdirSync(distPath).filter(f => f.endsWith('-mac.zip'));
  for (const file of macFiles) {
    const srcPath = path.join(distPath, file);
    const destPath = path.join(releasesPath, 'RinaWarp-Terminal-macOS.zip');
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Copied ${file} to releases`);
    }
  }

  // Package Windows
  const winFiles = fs.readdirSync(distPath).filter(f => f.includes('win') && f.endsWith('.exe'));
  for (const file of winFiles) {
    const srcPath = path.join(distPath, file);
    const destPath = path.join(releasesPath, 'RinaWarp-Terminal-Windows-Portable.zip');

    // Create a ZIP from the Windows executable
    await execAsync(
      `cd ${distPath} && zip -r ../public/releases/RinaWarp-Terminal-Windows-Portable.zip ${file}`
    );
    console.log('✅ Packaged Windows build to releases');
  }

  // Package Linux
  const linuxFiles = fs.readdirSync(distPath).filter(f => f.endsWith('.AppImage'));
  for (const file of linuxFiles) {
    const srcPath = path.join(distPath, file);
    const destPath = path.join(releasesPath, 'RinaWarp-Terminal-Linux.AppImage');
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Copied ${file} to releases`);
    }
  }

  // Create universal rinawarp.zip (currently same as macOS)
  const macZipPath = path.join(releasesPath, 'RinaWarp-Terminal-macOS.zip');
  const universalZipPath = path.join(releasesPath, 'rinawarp.zip');
  if (fs.existsSync(macZipPath)) {
    fs.copyFileSync(macZipPath, universalZipPath);
    console.log('✅ Created universal rinawarp.zip');
  }

  console.log('\n📋 Available downloads:');
  const files = fs.readdirSync(releasesPath);
  files.forEach(file => {
    const stats = fs.statSync(path.join(releasesPath, file));
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
    console.log(`  • ${file} (${sizeMB} MB)`);
  });
}

buildSimple().catch(error => {
  console.error('\n❌ Build failed:', error);
  process.exit(1);
});
