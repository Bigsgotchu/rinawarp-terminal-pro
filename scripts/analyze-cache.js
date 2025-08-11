#!/usr/bin/env node

/**
 * Cache Analysis Script
 * Analyzes cache usage and provides optimization recommendations
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getDirSize(dirPath) {
  try {
    const output = execSync(`du -sb "${dirPath}" 2>/dev/null || echo "0"`, { encoding: 'utf8' });
    return parseInt(output.split('\t')[0]) || 0;
  } catch (error) {
    return 0;
  }
}

function analyzeCache() {
  console.log('📊 RinaWarp Terminal - Cache Analysis Report');
  console.log('==========================================\n');

  const cacheDir = path.join(projectRoot, '.cache');

  if (!fs.existsSync(cacheDir)) {
    console.log('⚠️ No .cache directory found');
    console.log('Run: npm run cache:create');
    return;
  }

  // Analyze cache directories
  const cacheSubdirs = ['npm', 'webpack', 'electron-rebuild', 'assets', 'jest', 'tsc'];
  let totalSize = 0;

  console.log('📁 Cache Directory Usage:');
  console.log('-'.repeat(40));

  cacheSubdirs.forEach(subdir => {
    const subdirPath = path.join(cacheDir, subdir);
    const size = getDirSize(subdirPath);
    totalSize += size;

    const status = fs.existsSync(subdirPath) ? '✅' : '❌';
    console.log(`${status} ${subdir.padEnd(20)} ${formatBytes(size).padStart(10)}`);
  });

  console.log('-'.repeat(40));
  console.log(`📊 Total Cache Size:     ${formatBytes(totalSize).padStart(10)}`);

  // Analyze node_modules
  const nodeModulesSize = getDirSize(path.join(projectRoot, 'node_modules'));
  console.log(`📦 node_modules:         ${formatBytes(nodeModulesSize).padStart(10)}`);

  // Analyze build outputs
  const distSize = getDirSize(path.join(projectRoot, 'dist'));
  console.log(`🔨 dist/:                ${formatBytes(distSize).padStart(10)}`);

  console.log('\n🎯 Cache Efficiency Analysis:');
  console.log('-'.repeat(40));

  // Calculate efficiency metrics
  const webpackCacheSize = getDirSize(path.join(cacheDir, 'webpack'));
  const npmCacheSize = getDirSize(path.join(cacheDir, 'npm'));

  if (webpackCacheSize > 0) {
    console.log('✅ Webpack cache active - builds should be faster');
  } else {
    console.log('⚠️ Webpack cache empty - run a build to populate');
  }

  if (npmCacheSize > 0) {
    console.log('✅ NPM cache active - installs should be faster');
  } else {
    console.log('⚠️ NPM cache empty - run npm install to populate');
  }

  // Recommendations
  console.log('\n💡 Optimization Recommendations:');
  console.log('-'.repeat(40));

  if (totalSize > 1024 * 1024 * 500) {
    // 500MB
    console.log('⚠️ Cache size is large (>500MB) - consider cleaning old entries');
    console.log('   Run: npm run cache:clear');
  }

  if (webpackCacheSize === 0) {
    console.log('💡 Run a webpack build to populate build cache');
    console.log('   Run: npm run build:cache');
  }

  if (npmCacheSize === 0) {
    console.log('💡 Use cached npm install for faster dependency resolution');
    console.log('   Run: npm run install:cache');
  }

  console.log('\n📈 Performance Impact:');
  console.log('-'.repeat(40));
  console.log('- Webpack builds: ~60-80% faster with warm cache');
  console.log('- NPM installs: ~40-60% faster with cache');
  console.log('- CI/CD builds: ~30-50% faster overall');

  console.log('\n🔧 Maintenance Commands:');
  console.log('-'.repeat(40));
  console.log('- npm run cache:clear   # Clear all caches');
  console.log('- npm run cache:info    # Show cache sizes');
  console.log('- npm run cache:analyze # Run this analysis');
}

analyzeCache();
