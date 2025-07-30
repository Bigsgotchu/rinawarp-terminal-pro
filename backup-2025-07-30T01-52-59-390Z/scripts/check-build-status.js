#!/usr/bin/env node

/**
 * Check GitHub Actions Build Status
 * Monitors the cross-platform build workflow
 */

import { execSync } from 'child_process';

console.log('🔍 Checking GitHub Actions workflow status...\n');

try {
  // Check if GitHub CLI is available
  execSync('gh --version', { stdio: 'ignore' });

  // Check workflow status
  console.log('📊 Current workflow runs:');
  execSync('gh run list --repo Rinawarp-Terminal/rinawarp-terminal --limit 5', {
    stdio: 'inherit',
  });

  console.log('\n🔧 Build and Release workflow status:');
  execSync(
    'gh run list --repo Rinawarp-Terminal/rinawarp-terminal --workflow="Build and Release RinaWarp Terminal" --limit 3',
    { stdio: 'inherit' }
  );

  console.log('\n💡 To watch a specific run:');
  console.log('gh run watch [RUN_ID] --repo Rinawarp-Terminal/rinawarp-terminal');

  console.log('\n📥 To download artifacts when ready:');
  console.log('npm run download:releases');
} catch (error) {
  console.error('❌ GitHub CLI not found or not authenticated.');
  console.log('\n📋 Setup Instructions:');
  console.log('1. Install GitHub CLI: https://cli.github.com/');
  console.log('2. Authenticate: gh auth login');
  console.log('3. Alternative: Check manually at:');
  console.log('   https://github.com/Rinawarp-Terminal/rinawarp-terminal/actions');
}
