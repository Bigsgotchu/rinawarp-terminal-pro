#!/usr/bin/env node

/**
 * RinaWarp Terminal Dependency Checker
 * Checks for deprecated packages and security vulnerabilities
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔍 RinaWarp Terminal - Dependency Health Check');
console.log('='.repeat(50));

function runCommand(command, description) {
  console.log(`\n📋 ${description}`);
  console.log('-'.repeat(30));

  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(output);
    return output;
  } catch (error) {
    console.log(`⚠️ ${error.message}`);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.log(error.stderr);
    return null;
  }
}

// Check package.json exists
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found in current directory');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log(`📦 Project: ${packageJson.name} v${packageJson.version}`);
console.log(`🏠 Description: ${packageJson.description}`);

// 1. Check for outdated packages
runCommand('npm outdated', 'Checking for outdated packages');

// 2. Security audit
runCommand('npm audit --audit-level=low', 'Running security audit');

// 3. Check for deprecated packages
console.log('\n🔍 Checking for deprecated packages...');
console.log('-'.repeat(30));

const knownDeprecated = [
  'node-domexception',
  'left-pad',
  'event-stream',
  'core-js@2',
  'babel-polyfill',
  'request',
  'bower',
];

function checkDeprecated(deps, type) {
  const deprecated = [];

  for (const [pkg, version] of Object.entries(deps || {})) {
    // Check against known deprecated packages
    if (knownDeprecated.some(dep => pkg.includes(dep))) {
      deprecated.push({ pkg, version, type });
    }
  }

  return deprecated;
}

const deprecatedDeps = [
  ...checkDeprecated(packageJson.dependencies, 'production'),
  ...checkDeprecated(packageJson.devDependencies, 'development'),
];

if (deprecatedDeps.length > 0) {
  console.log('⚠️ Found potentially deprecated packages:');
  deprecatedDeps.forEach(({ pkg, version, type }) => {
    console.log(`   - ${pkg}@${version} (${type})`);
  });
} else {
  console.log('✅ No known deprecated packages found');
}

// 4. Check Node.js and npm versions
console.log('\n🔧 Environment Versions');
console.log('-'.repeat(30));
runCommand('node --version', 'Node.js version');
runCommand('npm --version', 'npm version');

// 5. Check for unused dependencies
console.log('\n📊 Dependency Analysis');
console.log('-'.repeat(30));

const totalDeps = Object.keys(packageJson.dependencies || {}).length;
const totalDevDeps = Object.keys(packageJson.devDependencies || {}).length;

console.log(`Production dependencies: ${totalDeps}`);
console.log(`Development dependencies: ${totalDevDeps}`);
console.log(`Total dependencies: ${totalDeps + totalDevDeps}`);

// 6. Railway-specific checks
console.log('\n🚂 Railway Deployment Checks');
console.log('-'.repeat(30));

// Check if Dockerfile exists and is updated
const dockerfilePath = path.join(process.cwd(), 'Dockerfile');
if (fs.existsSync(dockerfilePath)) {
  console.log('✅ Dockerfile found');

  const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');

  // Check if Dockerfile uses updated dependency versions
  const dockerDeps = dockerfile.match(/(\w+[@^]\^?\d+\.\d+\.\d+)/g) || [];
  console.log(`📦 Dockerfile dependencies: ${dockerDeps.length}`);

  // Check for specific outdated versions in Dockerfile
  const outdatedInDocker = [];
  dockerDeps.forEach(dep => {
    if (dep.includes('express-rate-limit@^6.')) {
      outdatedInDocker.push('express-rate-limit should be ^7.4.1 or newer');
    }
    if (dep.includes('nodemailer@^6.9.')) {
      outdatedInDocker.push('nodemailer should be ^6.10.1 or newer');
    }
    if (dep.includes('stripe@^14.')) {
      outdatedInDocker.push('stripe should be ^16.12.0 or newer');
    }
  });

  if (outdatedInDocker.length > 0) {
    console.log('⚠️ Dockerfile has outdated dependencies:');
    outdatedInDocker.forEach(warning => console.log(`   - ${warning}`));
  } else {
    console.log('✅ Dockerfile dependencies appear up to date');
  }
} else {
  console.log('⚠️ No Dockerfile found');
}

// 7. Summary and recommendations
console.log('\n📋 Summary & Recommendations');
console.log('='.repeat(50));

if (deprecatedDeps.length > 0) {
  console.log('🔄 Action needed: Update deprecated packages');
  console.log('   Run: npm update');
}

console.log('✅ Regular maintenance suggestions:');
console.log('   - Run this check monthly: node check-dependencies.js');
console.log('   - Update dependencies: npm update');
console.log('   - Security audit: npm audit fix');
console.log('   - Deploy updates: ./deploy-railway.sh');

console.log('\n🎯 RinaWarp Terminal dependency check complete!');
