#!/usr/bin/env node

/**
 * Railway Deployment Script for RinaWarp Terminal
 * Handles pre-deployment tasks and configuration validation
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🚀 RinaWarp Terminal - Railway Deployment Script');
console.log('================================================');

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

// Check if Railway CLI is installed
function checkRailwayCLI() {
  try {
    execSync('railway --version', { stdio: 'ignore' });
    logSuccess('Railway CLI is installed');
    return true;
  } catch (error) {
    logError('Railway CLI is not installed');
    logInfo('Install it with: npm install -g @railway/cli');
    logInfo('Then run: railway login');
    return false;
  }
}

// Validate critical environment variables
function validateEnvironment() {
  logInfo('Validating environment configuration...');

  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_PRICE_PERSONAL',
    'NODE_ENV',
  ];

  const recommendedVars = ['SENDGRID_API_KEY', 'ENCRYPTION_KEY', 'JWT_SECRET'];

  let hasErrors = false;
  let hasWarnings = false;

  // Check required variables
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.includes('YOUR_') || value.includes('{{')) {
      logError(`Required environment variable ${varName} is missing or not configured`);
      hasErrors = true;
    } else {
      logSuccess(`${varName} is configured`);
    }
  });

  // Check recommended variables
  recommendedVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.includes('YOUR_') || value.includes('{{')) {
      logWarning(`Recommended environment variable ${varName} is missing`);
      hasWarnings = true;
    } else {
      logSuccess(`${varName} is configured`);
    }
  });

  if (hasErrors) {
    logError('Deployment cannot continue with missing required environment variables');
    process.exit(1);
  }

  if (hasWarnings) {
    logWarning('Some recommended environment variables are missing');
    logWarning('The application will work but some features may be limited');
  }
}

// Pre-deployment checks
function preDeploymentChecks() {
  logInfo('Running pre-deployment checks...');

  // Check if package.json exists
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    logError('package.json not found');
    process.exit(1);
  }
  logSuccess('package.json found');

  // Check if server.js exists
  const serverPath = path.join(projectRoot, 'server.js');
  if (!fs.existsSync(serverPath)) {
    logError('server.js not found');
    process.exit(1);
  }
  logSuccess('server.js found');

  // Check if railway.json exists
  const railwayJsonPath = path.join(projectRoot, 'railway.json');
  if (!fs.existsSync(railwayJsonPath)) {
    logWarning('railway.json not found - using default Railway configuration');
  } else {
    logSuccess('railway.json found');
  }

  // Check if public directory exists
  const publicDir = path.join(projectRoot, 'public');
  if (!fs.existsSync(publicDir)) {
    logWarning('public directory not found - static files may not be served');
  } else {
    logSuccess('public directory found');
  }
}

// Build assets
function buildAssets() {
  logInfo('Building application assets...');

  try {
    // Copy assets
    if (fs.existsSync(path.join(projectRoot, 'scripts', 'copy-assets.cjs'))) {
      execSync('npm run copy-assets', {
        stdio: 'inherit',
        cwd: projectRoot,
      });
      logSuccess('Assets copied successfully');
    }

    // Build web assets if script exists
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    if (packageJson.scripts && packageJson.scripts['build:web']) {
      execSync('npm run build:web', {
        stdio: 'inherit',
        cwd: projectRoot,
      });
      logSuccess('Web assets built successfully');
    }
  } catch (error) {
    logWarning('Asset building failed, continuing with deployment...');
    console.error(error.message);
  }
}

// Deploy to Railway
function deployToRailway() {
  logInfo('Deploying to Railway...');

  try {
    // Check if logged in to Railway
    execSync('railway whoami', { stdio: 'ignore' });
    logSuccess('Authenticated with Railway');
  } catch (error) {
    logError('Not authenticated with Railway');
    logInfo('Run: railway login');
    process.exit(1);
  }

  try {
    // Deploy using Railway CLI
    execSync('railway up', {
      stdio: 'inherit',
      cwd: projectRoot,
    });
    logSuccess('Deployment completed successfully!');
  } catch (error) {
    logError('Deployment failed');
    console.error(error.message);
    process.exit(1);
  }
}

// Show post-deployment instructions
function showPostDeploymentInstructions() {
  console.log('');
  log('🎉 Deployment Complete!', colors.green);
  console.log('');
  log('📋 Post-deployment checklist:', colors.cyan);
  console.log('   1. Test your application at your Railway URL');
  console.log('   2. Verify health endpoint: /health');
  console.log('   3. Test Stripe integration: /api/stripe-config');
  console.log('   4. Check logs: railway logs');
  console.log('   5. Monitor metrics in Railway dashboard');
  console.log('');
  log('🔧 Useful Railway commands:', colors.cyan);
  console.log('   - railway logs           # View application logs');
  console.log('   - railway status         # Check service status');
  console.log('   - railway variables      # Manage environment variables');
  console.log('   - railway open           # Open Railway dashboard');
  console.log('   - railway domain         # Manage custom domains');
  console.log('');
  log('📊 Monitoring endpoints:', colors.cyan);
  console.log('   - /health                # Railway health check');
  console.log('   - /api/status/health     # Detailed health status');
  console.log('   - /api/ping              # Simple ping endpoint');
  console.log('');
}

// Main deployment process
async function main() {
  try {
    // Step 1: Check Railway CLI
    if (!checkRailwayCLI()) {
      process.exit(1);
    }

    // Step 2: Load environment variables
    logInfo('Loading environment variables...');
    if (fs.existsSync(path.join(projectRoot, '.env'))) {
      // Import dotenv dynamically
      const { config } = await import('dotenv');
      config();
      logSuccess('Environment variables loaded from .env');
    } else {
      logWarning('No .env file found - using system environment variables');
    }

    // Step 3: Validate environment
    validateEnvironment();

    // Step 4: Pre-deployment checks
    preDeploymentChecks();

    // Step 5: Build assets
    buildAssets();

    // Step 6: Deploy to Railway
    deployToRailway();

    // Step 7: Show post-deployment instructions
    showPostDeploymentInstructions();
  } catch (error) {
    logError(`Deployment failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('RinaWarp Terminal Railway Deployment Script');
  console.log('');
  console.log('Usage: node scripts/deploy-railway.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h     Show this help message');
  console.log('');
  console.log('Prerequisites:');
  console.log('  1. Install Railway CLI: npm install -g @railway/cli');
  console.log('  2. Login to Railway: railway login');
  console.log('  3. Set up environment variables in Railway dashboard');
  console.log('');
  process.exit(0);
}

// Run the deployment
main();
