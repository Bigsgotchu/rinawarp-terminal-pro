#!/usr/bin/env node

/**
 * Production Deployment Script for RinaWarp Terminal
 * Validates and prepares the application for production deployment
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

console.log(chalk.blue.bold('\n🚀 RinaWarp Terminal Production Deployment Checklist\n'));

const checks = [];
const warnings = [];
const errors = [];

// Check 1: Environment Variables
console.log(chalk.yellow('📋 Checking environment variables...'));
const requiredEnvVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_BETA_PREMIUM',
  'TELEMETRY_ENDPOINT',
  'ANALYTICS_ENDPOINT',
];

const missingEnvVars = requiredEnvVars.filter(
  key => !process.env[key] || process.env[key].includes('{{')
);
if (missingEnvVars.length > 0) {
  errors.push(`Missing environment variables: ${missingEnvVars.join(', ')}`);
} else {
  checks.push('✅ All required environment variables are set');
}

// Check 2: Node Version
console.log(chalk.yellow('📋 Checking Node.js version...'));
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
if (majorVersion < 18) {
  errors.push(`Node.js version ${nodeVersion} is too old. Required: v18.0.0 or higher`);
} else {
  checks.push(`✅ Node.js version ${nodeVersion} is compatible`);
}

// Check 3: Dependencies
console.log(chalk.yellow('📋 Checking dependencies...'));
try {
  execSync('npm audit --production', { stdio: 'pipe' });
  checks.push('✅ No security vulnerabilities in production dependencies');
} catch (error) {
  const output = error.stdout?.toString() || '';
  if (output.includes('found 0 vulnerabilities')) {
    checks.push('✅ No security vulnerabilities in production dependencies');
  } else {
    warnings.push(
      '⚠️  Security vulnerabilities found in dependencies. Run "npm audit" for details'
    );
  }
}

// Check 4: Build Status
console.log(chalk.yellow('📋 Checking build status...'));
const distExists = fs.existsSync(path.join(__dirname, '../dist'));
const publicExists = fs.existsSync(path.join(__dirname, '../public'));
if (!distExists) {
  warnings.push('⚠️  No dist directory found. Run "npm run build" to create production builds');
}
if (!publicExists) {
  errors.push('❌ No public directory found. This is required for the web server');
} else {
  checks.push('✅ Public directory exists');
}

// Check 5: Critical Files
console.log(chalk.yellow('📋 Checking critical files...'));
const criticalFiles = [
  'server.js',
  'package.json',
  'railway.json',
  'public/index.html',
  'public/pricing.html',
];

const missingFiles = criticalFiles.filter(file => !fs.existsSync(path.join(__dirname, '..', file)));

if (missingFiles.length > 0) {
  errors.push(`Missing critical files: ${missingFiles.join(', ')}`);
} else {
  checks.push('✅ All critical files present');
}

// Check 6: SSL/TLS Configuration
console.log(chalk.yellow('📋 Checking SSL/TLS configuration...'));
if (process.env.NODE_ENV === 'production' && !process.env.FORCE_HTTPS) {
  warnings.push('⚠️  FORCE_HTTPS not set. Consider enabling for production');
} else {
  checks.push('✅ SSL/TLS configuration ready');
}

// Check 7: Database Configuration
console.log(chalk.yellow('📋 Checking database configuration...'));
if (!process.env.DATABASE_URL) {
  warnings.push(
    '⚠️  No DATABASE_URL set. Using in-memory storage (not recommended for production)'
  );
} else {
  checks.push('✅ Database configured');
}

// Check 8: Email Service
console.log(chalk.yellow('📋 Checking email service...'));
const hasSmtp = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
const hasSendgrid = process.env.SENDGRID_API_KEY;
if (!hasSmtp && !hasSendgrid) {
  warnings.push('⚠️  No email service configured. License delivery will not work');
} else {
  checks.push('✅ Email service configured');
}

// Check 9: Monitoring Services
console.log(chalk.yellow('📋 Checking monitoring services...'));
if (!process.env.SENTRY_DSN) {
  warnings.push('⚠️  Sentry not configured. Error tracking will be limited');
} else {
  checks.push('✅ Sentry error tracking configured');
}

// Check 10: Domain Configuration
console.log(chalk.yellow('📋 Checking domain configuration...'));
if (!process.env.SITE_URL || process.env.SITE_URL === 'http://localhost:3000') {
  warnings.push('⚠️  SITE_URL not properly configured for production');
} else {
  checks.push('✅ Domain configuration ready');
}

// Summary
console.log(chalk.blue.bold('\n📊 Deployment Readiness Summary\n'));

if (checks.length > 0) {
  console.log(chalk.green.bold('Passed Checks:'));
  checks.forEach(check => console.log(chalk.green(check)));
}

if (warnings.length > 0) {
  console.log(chalk.yellow.bold('\nWarnings:'));
  warnings.forEach(warning => console.log(chalk.yellow(warning)));
}

if (errors.length > 0) {
  console.log(chalk.red.bold('\nErrors (Must Fix):'));
  errors.forEach(error => console.log(chalk.red(error)));
}

// Final recommendation
console.log(chalk.blue.bold('\n🎯 Deployment Recommendation:\n'));

if (errors.length > 0) {
  console.log(chalk.red('❌ NOT READY FOR DEPLOYMENT'));
  console.log(chalk.red('Please fix all errors before deploying to production.'));
  process.exit(1);
} else if (warnings.length > 5) {
  console.log(chalk.yellow('⚠️  DEPLOY WITH CAUTION'));
  console.log(chalk.yellow('Multiple warnings detected. Review and address if possible.'));
} else {
  console.log(chalk.green('✅ READY FOR DEPLOYMENT'));
  console.log(chalk.green('All critical checks passed. You can proceed with deployment.'));
}

// Deployment commands
console.log(chalk.blue.bold('\n🚀 Deployment Commands:\n'));
console.log(chalk.cyan('1. Install Railway CLI:'));
console.log(chalk.white('   npm install -g @railway/cli'));
console.log(chalk.cyan('\n2. Login to Railway:'));
console.log(chalk.white('   railway login'));
console.log(chalk.cyan('\n3. Deploy to Railway:'));
console.log(chalk.white('   railway up'));
console.log(chalk.cyan('\n4. Set environment variables:'));
console.log(chalk.white('   railway variables set KEY=value'));
console.log(chalk.cyan('\n5. Check deployment status:'));
console.log(chalk.white('   railway status'));
console.log(chalk.cyan('\n6. View logs:'));
console.log(chalk.white('   railway logs'));

console.log(chalk.blue.bold('\n📚 Additional Resources:\n'));
console.log(chalk.white('- Production Checklist: PRODUCTION_CHECKLIST.md'));
console.log(chalk.white('- Railway Docs: https://docs.railway.app'));
console.log(chalk.white('- Support: support@rinawarptech.com\n'));
