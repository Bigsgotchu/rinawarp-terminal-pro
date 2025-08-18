#!/usr/bin/env node

/**
 * 🚀 RinaWarp Terminal - Unified Deployment Trigger
 * Multi-platform deployment orchestration with intelligent routing
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
      ...options,
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getCurrentBranch() {
  const result = execCommand('git rev-parse --abbrev-ref HEAD', { silent: true });
  return result.success ? result.output.trim() : 'unknown';
}

async function getCommitHash() {
  const result = execCommand('git rev-parse --short HEAD', { silent: true });
  return result.success ? result.output.trim() : 'unknown';
}

// DEPRECATED: Vercel and Railway deployments disabled - only rinawarptech.com production active
// These functions are preserved for backup/reference purposes only

async function _deployToVercel_DEPRECATED(_isProduction = false) {
  log('⚠️  Vercel deployment deprecated - theme preserved for RinaWarp UI', 'yellow');
  return false;
}

async function _deployToRailway_DEPRECATED(_isProduction = false) {
  log('⚠️  Railway deployment deprecated - kept as backup reference only', 'yellow');
  return false;
}

async function deployToRender() {
  log('🎨 Triggering Render deployment...', 'cyan');

  // Check if render webhook is configured
  const renderHookId = process.env.RENDER_DEPLOY_HOOK_ID;
  if (!renderHookId) {
    log('⚠️  RENDER_DEPLOY_HOOK_ID not configured, skipping Render deployment', 'yellow');
    return false;
  }

  const deployResult = execCommand(
    `curl -X POST https://api.render.com/deploy-hook/${renderHookId}`,
    { silent: true }
  );

  if (deployResult.success) {
    log('✅ Render deployment triggered!', 'green');
    return true;
  } else {
    log('❌ Render deployment failed', 'red');
    return false;
  }
}

async function deployToFirebase() {
  log('🔥 Deploying to Firebase...', 'cyan');

  // Check if Firebase CLI is available
  const checkResult = execCommand('which firebase', { silent: true });
  if (!checkResult.success) {
    log('⚠️  Firebase CLI not found, skipping Firebase deployment', 'yellow');
    return false;
  }

  // Run pre-deploy scanner for executable files
  log('🔍 Running Firebase pre-deploy scanner...', 'cyan');
  const scanResult = execCommand('node scripts/firebase-pre-deploy.js', { silent: true });
  if (!scanResult.success) {
    log('❌ Firebase pre-deploy scan failed - blocked files detected', 'red');
    log('💡 Run "node scripts/firebase-pre-deploy.js" for details', 'yellow');
    return false;
  }

  const deployResult = execCommand('firebase deploy --only hosting');

  if (deployResult.success) {
    log('✅ Firebase deployment successful!', 'green');
    return true;
  } else {
    log('❌ Firebase deployment failed', 'red');
    return false;
  }
}

async function deployToGitHubPages() {
  log('📚 Deploying to GitHub Pages...', 'cyan');

  // Check if there's a pages workflow
  const pagesWorkflowExists = fs.existsSync('.github/workflows/deploy-pages.yml');
  if (!pagesWorkflowExists) {
    log('⚠️  GitHub Pages workflow not found, skipping', 'yellow');
    return false;
  }

  // Trigger the pages workflow
  const triggerResult = execCommand('gh workflow run deploy-pages.yml', { silent: true });

  if (triggerResult.success) {
    log('✅ GitHub Pages deployment triggered!', 'green');
    return true;
  } else {
    log('❌ GitHub Pages deployment failed', 'red');
    return false;
  }
}

async function runProductionVerification() {
  log('🔍 Running production verification...', 'cyan');

  const verifyResult = execCommand('node scripts/verify-production.cjs', { silent: true });

  if (verifyResult.success) {
    log('✅ Production verification passed!', 'green');
    return true;
  } else {
    log('❌ Production verification failed', 'red');
    return false;
  }
}

async function updateDeploymentStatus(deploymentResults) {
  const statusFile = path.join(__dirname, '..', 'deployment-status.json');
  const currentBranch = await getCurrentBranch();
  const commitHash = await getCommitHash();

  const status = {
    lastDeployment: {
      timestamp: new Date().toISOString(),
      branch: currentBranch,
      commit: commitHash,
      platforms: deploymentResults,
    },
  };

  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
  log(`📊 Deployment status updated: ${statusFile}`, 'blue');
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const forceAll = args.includes('--force-all');

  const currentBranch = await getCurrentBranch();
  const commitHash = await getCommitHash();

  log('🚀 RinaWarp Terminal - Unified Deployment', 'bold');
  log('='.repeat(60), 'blue');
  log(`🌿 Branch: ${currentBranch}`, 'cyan');
  log(`📝 Commit: ${commitHash}`, 'cyan');

  if (isDryRun) {
    log('🧪 DRY RUN MODE - No actual deployments will be executed', 'yellow');
  }

  const isProduction = currentBranch === 'main';
  const deploymentResults = {};

  if (isProduction || forceAll) {
    log('\n🎯 Production deployment detected!', 'green');

    if (!isDryRun) {
      // Deploy to active platforms only (rinawarptech.com as primary)
      log('🏠 Primary deployment: rinawarptech.com (manual deployment)', 'green');
      deploymentResults.primary = true; // Primary server handled separately

      // Secondary platforms
      deploymentResults.render = await deployToRender();
      deploymentResults.firebase = await deployToFirebase();
      deploymentResults.githubPages = await deployToGitHubPages();

      // Run verification
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds for deployment
      deploymentResults.verification = await runProductionVerification();

      // Update status
      await updateDeploymentStatus(deploymentResults);
    } else {
      log('🧪 Would deploy to all production platforms', 'yellow');
    }
  } else {
    log(`\n⚠️  Branch "${currentBranch}" is not production`, 'yellow');
    log('Use --force-all to deploy anyway', 'yellow');

    if (!isDryRun && !forceAll) {
      process.exit(0);
    }
  }

  // Summary
  log('\n' + '='.repeat(60), 'blue');
  log('🎉 Deployment Summary:', 'bold');

  Object.entries(deploymentResults).forEach(([platform, success]) => {
    const status = success ? '✅' : '❌';
    const color = success ? 'green' : 'red';
    log(`${status} ${platform}`, color);
  });

  const successCount = Object.values(deploymentResults).filter(Boolean).length;
  const totalCount = Object.keys(deploymentResults).length;

  log(`\n📊 Success Rate: ${successCount}/${totalCount} platforms`, 'blue');

  if (successCount === totalCount) {
    log('🎉 All deployments successful! Your application is live!', 'green');
  } else if (successCount > 0) {
    log('⚠️  Partial deployment success. Check failed platforms.', 'yellow');
  } else {
    log('❌ All deployments failed. Check configuration and try again.', 'red');
    process.exit(1);
  }
}

// Run the deployment
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    log(`💥 Deployment failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

export { main };
