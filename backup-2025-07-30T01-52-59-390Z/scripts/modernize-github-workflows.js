#!/usr/bin/env node

/**
 * 🧜‍♀️ RinaWarp Terminal - GitHub Workflows Modernization Script
 *
 * This script automatically updates GitHub Actions workflows to latest versions
 * and implements modern best practices while preserving your excellent security setup.
 *
 * Usage: node scripts/modernize-github-workflows.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧜‍♀️ RinaWarp Terminal - GitHub Workflows Modernization');
console.log('======================================================');

// Action version updates mapping
const ACTION_UPDATES = {
  'actions/cache@v3': 'actions/cache@v4',
  'actions/download-artifact@v3': 'actions/download-artifact@v4',
  'actions/upload-artifact@v3': 'actions/upload-artifact@v4',
  'actions/setup-node@v3': 'actions/setup-node@v4',
  'actions/checkout@v3': 'actions/checkout@v4',

  // Keep latest versions
  'actions/checkout@v4': 'actions/checkout@v4',
  'actions/setup-node@v4': 'actions/setup-node@v4',
  'actions/cache@v4': 'actions/cache@v4',
  'actions/upload-artifact@v4': 'actions/upload-artifact@v4',
  'actions/download-artifact@v4': 'actions/download-artifact@v4',
};

// Node.js version modernization
const NODE_UPDATES = {
  'NODE_VERSION: "18"': 'NODE_VERSION: "20"  # Latest LTS',
  'node-version: "18"': 'node-version: "20"',
  'node-version: ${{ env.NODE_VERSION }}': 'node-version: ${{ env.NODE_VERSION }}',
};

// Enhanced caching patterns
const CACHE_IMPROVEMENTS = {
  // Electron cache enhancement
  'path: ${{': 'path: |\n      ${{',

  // Simple string replacements for caching
  'env.ELECTRON_CACHE }}': 'env.ELECTRON_CACHE }}\n      ~/.npm',
  'env.ELECTRON_BUILDER_CACHE }}': 'env.ELECTRON_BUILDER_CACHE }}\n      ~/.cache/electron-builder',
};

const stats = {
  filesProcessed: 0,
  filesModified: 0,
  actionsUpdated: 0,
  nodeVersionsUpdated: 0,
  cachingImproved: 0,
  totalChanges: 0,
};

async function modernizeWorkflow(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    let modifiedContent = content;
    let hasChanges = false;
    let fileChanges = 0;

    console.log(`\n🔍 Processing: ${path.relative(process.cwd(), filePath)}`);

    // 1. Update action versions
    for (const [oldAction, newAction] of Object.entries(ACTION_UPDATES)) {
      const regex = new RegExp(`uses:\\s*${oldAction.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
      const matches = modifiedContent.match(regex);
      if (matches && oldAction !== newAction) {
        modifiedContent = modifiedContent.replace(regex, `uses: ${newAction}`);
        const count = matches.length;
        stats.actionsUpdated += count;
        fileChanges += count;
        console.log(`  ✅ Updated ${count}x: ${oldAction} → ${newAction}`);
        hasChanges = true;
      }
    }

    // 2. Update Node.js versions
    for (const [oldNode, newNode] of Object.entries(NODE_UPDATES)) {
      if (modifiedContent.includes(oldNode) && oldNode !== newNode) {
        modifiedContent = modifiedContent.replace(
          new RegExp(oldNode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          newNode
        );
        stats.nodeVersionsUpdated++;
        fileChanges++;
        console.log(`  ✅ Updated Node.js: ${oldNode} → ${newNode}`);
        hasChanges = true;
      }
    }

    // 3. Enhance caching strategies
    for (const [oldCache, newCache] of Object.entries(CACHE_IMPROVEMENTS)) {
      if (modifiedContent.includes(oldCache)) {
        modifiedContent = modifiedContent.replace(oldCache, newCache);
        stats.cachingImproved++;
        fileChanges++;
        console.log('  ✅ Enhanced caching strategy');
        hasChanges = true;
      }
    }

    // 4. Add modern environment variables (only if not present)
    if (
      filePath.includes('main-pipeline.yml') &&
      !modifiedContent.includes('ARTIFACT_RETENTION_DAYS')
    ) {
      const envSection = modifiedContent.match(/env:\s*\n(.*?\n)*?(?=\n\w|\n$)/s);
      if (envSection) {
        const enhancedEnv =
          envSection[0] +
          `  # Modern configuration
  ARTIFACT_RETENTION_DAYS: "14"
  CACHE_VERSION: "v2"
  
`;
        modifiedContent = modifiedContent.replace(envSection[0], enhancedEnv);
        console.log('  ✅ Added modern environment variables');
        hasChanges = true;
        fileChanges++;
      }
    }

    // 5. Enhance artifact retention based on context
    const artifactRetentionPattern = /retention-days:\s*\d+/g;
    const matches = modifiedContent.match(artifactRetentionPattern);
    if (matches) {
      // Update retention policies to be more contextual
      modifiedContent = modifiedContent.replace(
        /retention-days:\s*30/g,
        "retention-days: ${{ github.event_name == 'schedule' && 7 || 14 }}"
      );
      modifiedContent = modifiedContent.replace(
        /retention-days:\s*7/g,
        "retention-days: ${{ github.ref == 'refs/heads/main' && 14 || 7 }}"
      );
      if (modifiedContent !== content) {
        console.log('  ✅ Enhanced artifact retention policies');
        hasChanges = true;
        fileChanges++;
      }
    }

    if (hasChanges) {
      // Add modernization header if not present
      if (!modifiedContent.includes('🧜‍♀️ Modernized by RinaWarp')) {
        const headerComment = `# 🧜‍♀️ Modernized by RinaWarp Terminal Workflow Updater
# ${fileChanges} modernizations applied
# Last updated: ${new Date().toISOString().split('T')[0]}

`;
        modifiedContent = headerComment + modifiedContent;
      }

      await fs.writeFile(filePath, modifiedContent, 'utf8');
      stats.filesModified++;
      stats.totalChanges += fileChanges;
      console.log(`  📝 Applied ${fileChanges} modernizations`);
    } else {
      console.log('  ✨ Already modern!');
    }

    stats.filesProcessed++;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

async function scanWorkflows() {
  const workflowsDir = '.github/workflows';

  try {
    const files = await fs.readdir(workflowsDir);
    const yamlFiles = files.filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));

    console.log(`Found ${yamlFiles.length} workflow files to check...\n`);

    for (const file of yamlFiles) {
      const filePath = path.join(workflowsDir, file);
      await modernizeWorkflow(filePath);
    }
  } catch (error) {
    console.error('❌ Error scanning workflows directory:', error.message);
    return;
  }
}

function generateReport() {
  console.log('\n📊 Modernization Report');
  console.log('=======================');
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Files modernized: ${stats.filesModified}`);
  console.log(`Total changes applied: ${stats.totalChanges}`);
  console.log('\n🔄 Breakdown:');
  console.log(`  Actions updated: ${stats.actionsUpdated}`);
  console.log(`  Node.js versions updated: ${stats.nodeVersionsUpdated}`);
  console.log(`  Caching strategies improved: ${stats.cachingImproved}`);

  if (stats.totalChanges > 0) {
    console.log('\n🧜‍♀️ Modernization Benefits:');
    console.log('✅ Latest GitHub Actions versions');
    console.log('✅ Enhanced caching strategies');
    console.log('✅ Improved artifact retention policies');
    console.log('✅ Modern Node.js LTS versions');
    console.log('✅ Better resource utilization');

    console.log('\n📋 Next Steps:');
    console.log('1. Review the changes in each workflow file');
    console.log('2. Test the workflows with a small PR');
    console.log('3. Monitor build performance improvements');
    console.log('4. Consider enabling GitHub Actions insights');
  } else {
    console.log('\n✨ Your workflows are already swimming in modern waters!');
    console.log('🏆 No outdated patterns found - excellent maintenance!');
  }
}

async function validateModernizations() {
  console.log('\n🔍 Validating modernized workflows...');

  try {
    const workflowsDir = '.github/workflows';
    const files = await fs.readdir(workflowsDir);
    const yamlFiles = files.filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));

    let validationIssues = 0;

    for (const file of yamlFiles) {
      const filePath = path.join(workflowsDir, file);
      const content = await fs.readFile(filePath, 'utf8');

      // Check for remaining v3 actions
      if (content.includes('@v3') && !content.includes('# legacy')) {
        console.log(`⚠️ ${file}: Still contains @v3 actions`);
        validationIssues++;
      }

      // Check for proper permissions
      if (!content.includes('permissions:')) {
        console.log(`⚠️ ${file}: Missing permissions block`);
        validationIssues++;
      }

      // Check for Node.js version
      if (content.includes('NODE_VERSION: "18"') && !content.includes('# compatibility')) {
        console.log(`⚠️ ${file}: Could upgrade to Node.js 20`);
        validationIssues++;
      }
    }

    if (validationIssues === 0) {
      console.log('✅ All workflows passed validation!');
    } else {
      console.log(`⚠️ Found ${validationIssues} potential improvements`);
    }
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
  }
}

async function main() {
  console.log('Starting workflow modernization...\n');

  // Check if workflows directory exists
  try {
    await fs.access('.github/workflows');
  } catch (error) {
    console.error('❌ .github/workflows directory not found!');
    console.error('Are you running this from the project root?');
    process.exit(1);
  }

  await scanWorkflows();
  generateReport();
  await validateModernizations();

  console.log('\n🌊 Workflow modernization complete!');
  console.log('Your CI/CD pipeline is now swimming in the latest waters! 🧜‍♀️✨');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { modernizeWorkflow, ACTION_UPDATES };
