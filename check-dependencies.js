#!/usr/bin/env node

/**
 * RinaWarp Terminal Dependency Checker
 * Checks for deprecated packages and security vulnerabilities
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function runCommand(command, _description) {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return output;
  } catch (error) {
    console.log(`⚠️ ${error.message}`);
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

// 1. Check for outdated packages
runCommand('npm outdated', 'Checking for outdated packages');

// 2. Security audit
runCommand('npm audit --audit-level=low', 'Running security audit');

// 3. Check for deprecated packages

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
  deprecatedDeps.forEach(({ pkg, version, type }) => {
    console.log(`⚠️ Deprecated ${type} dependency: ${pkg}@${version}`);
  });
} else {
  console.log('✅ No known deprecated packages found');
}

// 4. Check Node.js and npm versions
runCommand('node --version', 'Node.js version');
runCommand('npm --version', 'npm version');

// 5. Check for unused dependencies

const _totalDeps = Object.keys(packageJson.dependencies || {}).length;
const _totalDevDeps = Object.keys(packageJson.devDependencies || {}).length;

// 6. Railway-specific checks

// Check if Dockerfile exists and is updated
const dockerfilePath = path.join(process.cwd(), 'Dockerfile');
if (fs.existsSync(dockerfilePath)) {
  const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');

  // Check if Dockerfile uses updated dependency versions
  const dockerDeps = dockerfile.match(/(\w+[@^]\^?\d+\.\d+\.\d+)/g) || [];

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
  } else {
    console.log('✅ Dockerfile dependencies appear up to date');
  }
} else {
}

// 7. Summary and recommendations

if (deprecatedDeps.length > 0) {
}

console.log('✅ Regular maintenance suggestions:');
