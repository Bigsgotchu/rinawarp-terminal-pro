/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

#!/usr/bin/env node

/**
 * 🧜‍♀️ RinaWarp Terminal - Workflow v4 Upgrade Script
 *
 * This script upgrades all GitHub Actions to v4 and implements the three key improvements:
 * 1. Action versions → @v4
 * 2. Node.js → 20 LTS
 * 3. Enhanced dependency caching
 *
 * Usage: node scripts/upgrade-workflows-to-v4.cjs
 */

const fs = require('node:fs');
const path = require('node:path');
const glob = require('glob');

console.log('🧜‍♀️ RinaWarp Terminal - GitHub Actions v4 Upgrade');
console.log('=================================================');

// Action version upgrades
const ACTION_UPGRADES = {
  'actions/checkout@v3': 'actions/checkout@v4',
  'actions/setup-node@v3': 'actions/setup-node@v4',
  'actions/cache@v3': 'actions/cache@v4',
  'actions/upload-artifact@v3': 'actions/upload-artifact@v4',
  'actions/download-artifact@v3': 'actions/download-artifact@v4',
  'actions/github-script@v6': 'actions/github-script@v7',
};

// Node.js version upgrades
const NODE_UPGRADES = {
  'NODE_VERSION: "18"': 'NODE_VERSION: "20"  # Latest LTS with enhanced performance',
  'node-version: "18"': 'node-version: "20"',
  'node-version: 18': 'node-version: 20',
};

const stats = {
  filesProcessed: 0,
  filesModified: 0,
  actionsUpgraded: 0,
  nodeUpgraded: 0,
  cachingEnhanced: 0,
};

function upgradeWorkflowFile(filePath) {
  try {
    console.log(`\n🔍 Processing: ${path.relative('.', filePath)}`);

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    const changes = [];

    // 1. Upgrade action versions
    for (const [oldAction, newAction] of Object.entries(ACTION_UPGRADES)) {
      const regex = new RegExp(`uses:\\s*${oldAction.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, `uses: ${newAction}`);
        changes.push(`✅ ${oldAction} → ${newAction}`);
        stats.actionsUpgraded++;
      }
    }

    // 2. Upgrade Node.js versions
    for (const [oldNode, newNode] of Object.entries(NODE_UPGRADES)) {
      if (content.includes(oldNode)) {
        content = content.replace(
          new RegExp(oldNode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          newNode
        );
        changes.push(`✅ Node.js: ${oldNode} → ${newNode.split('#')[0].trim()}`);
        stats.nodeUpgraded++;
      }
    }

    // 3. Enhance caching strategies
    const cacheEnhancements = [
      {
        find: /- name: Cache Electron\s*\n\s*uses: actions\/cache@v[34]\s*\n\s*with:\s*\n\s*path: \$\{\{ env\.ELECTRON_CACHE \}\}/g,
        replace: `- name: Cache Electron & Dependencies
        uses: actions/cache@v4
        with:
          path: |
            \${{ env.ELECTRON_CACHE }}
            ~/.npm`,
      },
      {
        find: /- name: Cache Electron Builder\s*\n\s*uses: actions\/cache@v[34]\s*\n\s*with:\s*\n\s*path: \$\{\{ env\.ELECTRON_BUILDER_CACHE \}\}/g,
        replace: `- name: Cache Electron Builder & Dependencies
        uses: actions/cache@v4
        with:
          path: |
            \${{ env.ELECTRON_BUILDER_CACHE }}
            ~/.cache/electron-builder
            ~/.npm`,
      },
    ];

    for (const enhancement of cacheEnhancements) {
      if (enhancement.find.test(content)) {
        content = content.replace(enhancement.find, enhancement.replace);
        changes.push('✅ Enhanced caching strategy');
        stats.cachingEnhanced++;
      }
    }

    // 4. Add Node.js native caching where missing
    if (
      content.includes('actions/setup-node@v4') &&
      !content.includes("cache: 'npm'") &&
      content.includes('npm ci')
    ) {
      content = content.replace(
        /(uses: actions\/setup-node@v4\s*\n\s*with:\s*\n\s*node-version: [^\n]+)/g,
        `$1
          cache: 'npm'  # Native npm caching`
      );
      changes.push('✅ Added native npm caching to setup-node');
      stats.cachingEnhanced++;
    }

    if (changes.length > 0) {
      // Add upgrade header
      const header = `# 🧜‍♀️ Upgraded to GitHub Actions v4 - ${new Date().toISOString().split('T')[0]}
# ${changes.length} improvements applied
# - Latest action versions for better performance and security
# - Node.js 20 LTS for enhanced capabilities  
# - Optimized caching for faster builds

`;
      content = header + content;

      fs.writeFileSync(filePath, content, 'utf8');
      stats.filesModified++;

      console.log('   Changes applied:');
      changes.forEach(change => console.log(`   ${change}`));
    } else {
      console.log('   ✨ Already up to date!');
    }

    stats.filesProcessed++;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function createModernWorkflowExample() {
  const modernWorkflow = `# 🧜‍♀️ Modern RinaWarp Terminal CI/CD Example
# This workflow demonstrates all the latest v4 improvements

name: 🌊 Modern RinaWarp Build & Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

permissions:
  contents: read
  actions: read
  checks: write

env:
  NODE_VERSION: "20"  # Latest LTS with enhanced performance
  CACHE_VERSION: "v2"

jobs:
  modern-build:
    name: 🧪 Modern Build & Test Pipeline
    runs-on: ubuntu-latest

    steps:
      - name: 📦 Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: 🧜‍♀️ Setup Node.js 20 LTS
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'  # Native npm caching for faster installs

      - name: 🌊 Enhanced dependency caching
        uses: actions/cache@v4
        with:
          path: |
            node_modules
            ~/.npm
            .cache
          key: \${{ runner.os }}-deps-\${{ env.CACHE_VERSION }}-\${{ hashFiles('package-lock.json') }}
          restore-keys: |
            \${{ runner.os }}-deps-\${{ env.CACHE_VERSION }}-
            \${{ runner.os }}-deps-

      - name: 🐚 Install dependencies
        run: npm ci

      - name: 🧪 Run linting
        run: npm run lint

      - name: 🔍 Run tests with coverage
        run: npm test -- --coverage

      - name: 🐠 Build project
        run: npm run build

      - name: 📊 Upload test artifacts
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results-\${{ github.sha }}
          path: |
            coverage/
            test-results.xml
          retention-days: 7

      - name: ✨ Success notification
        if: success()
        run: |
          echo "🧜‍♀️ RinaWarp build completed successfully!"
          echo "🌊 All tests passed and artifacts uploaded"
          echo "✨ Your code is swimming in pristine waters!"
`;

  fs.writeFileSync('.github/workflows/modern-example.yml', modernWorkflow);
  console.log('✅ Created modern workflow example: .github/workflows/modern-example.yml');
}

function main() {
  console.log('Starting GitHub Actions v4 upgrade...\n');

  // Find all workflow files
  const workflowFiles = glob
    .sync('.github/workflows/*.yml')
    .concat(glob.sync('.github/workflows/*.yaml'));

  if (workflowFiles.length === 0) {
    console.log('❌ No workflow files found in .github/workflows/');
    return;
  }

  console.log(`Found ${workflowFiles.length} workflow files to upgrade...\n`);

  // Process each workflow file
  workflowFiles.forEach(upgradeWorkflowFile);

  // Create modern example workflow
  createModernWorkflowExample();

  // Generate report
  console.log('\n📊 Upgrade Report');
  console.log('==================');
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Files modified: ${stats.filesModified}`);
  console.log(`Actions upgraded: ${stats.actionsUpgraded}`);
  console.log(`Node.js versions updated: ${stats.nodeUpgraded}`);
  console.log(`Caching enhancements: ${stats.cachingEnhanced}`);

  console.log('\n🧜‍♀️ Benefits of v4 Upgrades:');
  console.log('✅ Faster action execution with improved performance');
  console.log('✅ Enhanced security with latest action versions');
  console.log('✅ Node.js 20 LTS with native fs.glob(), crypto.randomUUID(), etc.');
  console.log('✅ Optimized caching for faster build times');
  console.log('✅ Better ESM support and stability');

  console.log('\n🌊 Your workflows are now swimming in the latest waters!');
  console.log('🏆 GitHub Actions v4 upgrade complete! ✨');
}

if (require.main === module) {
  main();
}
