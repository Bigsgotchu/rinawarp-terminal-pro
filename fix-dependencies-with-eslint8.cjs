/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('child_process');

console.log('🔧 Dependency Resolution with ESLint 8 Compatibility');
console.log('===================================================\n');

// Updated resolutions with ESLint 8
const resolutions = {
  '@anthropic-ai/sdk': '^0.24.3',
  'dotenv': '^16.4.7',
  'express-rate-limit': '^7.4.1',
  'helmet': '^8.1.0',
  'joi': '^17.13.3',
  'nodemailer': '^6.10.1',
  'openai': '^4.67.1',
  'ws': '^8.18.0',
  'eslint': '^8.57.0',  // Changed from 9.31.0 to maintain compatibility
  'express': '^4.21.2', // Let's use Express 4 latest for now to avoid breaking changes
  'jest': '^29.7.0',    // Keep Jest 29 for stability
  'axios': '^1.7.10',
  'socket.io': '^4.8.1',
  'winston': '^3.20.1',
  '@types/node': '^20.12.0'
};

// Function to update package.json
function updatePackageJson(filePath, packageName) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
    
  console.log(`\n📦 Updating ${packageName}...`);
  const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let modified = false;
    
  Object.entries(resolutions).forEach(([dep, version]) => {
    let updated = false;
        
    if (pkg.dependencies && pkg.dependencies[dep]) {
      const oldVersion = pkg.dependencies[dep];
      if (oldVersion !== version) {
        console.log(`  📦 ${dep}: ${oldVersion} → ${version}`);
        pkg.dependencies[dep] = version;
        modified = true;
        updated = true;
      }
    }
        
    if (pkg.devDependencies && pkg.devDependencies[dep] && !updated) {
      const oldVersion = pkg.devDependencies[dep];
      if (oldVersion !== version) {
        console.log(`  📦 ${dep}: ${oldVersion} → ${version} (dev)`);
        pkg.devDependencies[dep] = version;
        modified = true;
      }
    }
  });
    
  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`  ✅ Updated ${packageName}`);
  } else {
    console.log(`  ℹ️  No changes needed for ${packageName}`);
  }
}

// Update all package.json files
const packagesToUpdate = [
  { path: 'package.json', name: 'main project' },
  { path: 'cloud-ai-service/package.json', name: 'cloud-ai-service' },
  { path: 'sdk/javascript/package.json', name: 'SDK' },
  { path: 'tools/rinawarp-cleanup/package.json', name: 'cleanup tool' },
  { path: 'deprecated/email-testing-suite/package.json', name: 'email testing suite' }
];

console.log('📝 Updating all package.json files to use consistent versions...');

packagesToUpdate.forEach(({ path: pkgPath, name }) => {
  updatePackageJson(path.join(__dirname, pkgPath), name);
});

// Set up monorepo with workspaces
console.log('\n📋 Setting up monorepo configuration...\n');

const rootPkgPath = path.join(__dirname, 'package.json');
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));

if (!rootPkg.workspaces) {
  console.log('✅ Adding workspace configuration...');
  rootPkg.workspaces = [
    'cloud-ai-service',
    'sdk/javascript',
    'tools/rinawarp-cleanup',
    'deprecated/email-testing-suite'
  ];
    
  // Add useful workspace scripts
  const workspaceScripts = {
    'install:all': 'npm install --workspaces --if-present',
    'test:all': 'npm test --workspaces --if-present',
    'build:all': 'npm run build --workspaces --if-present',
    'audit:all': 'npm audit --workspaces',
    'audit:fix:all': 'npm audit fix --workspaces',
    'clean:all': 'npm run clean --workspaces --if-present && npm run clean:node_modules',
    'clean:node_modules': 'rm -rf node_modules */node_modules */*/node_modules'
  };
    
  Object.entries(workspaceScripts).forEach(([key, value]) => {
    if (!rootPkg.scripts[key]) {
      rootPkg.scripts[key] = value;
    }
  });
    
  fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
  console.log('✅ Workspace configuration added!');
} else {
  console.log('ℹ️  Workspace configuration already exists');
}

console.log('\n🔧 Installing dependencies...\n');

// Install dependencies
try {
  console.log('📌 Installing root dependencies...');
  execSync('npm install', { stdio: 'inherit', cwd: __dirname });
    
  console.log('\n📌 Installing workspace dependencies...');
  execSync('npm install --workspaces --if-present', { stdio: 'inherit', cwd: __dirname });
    
  console.log('\n✅ All dependencies installed successfully!');
} catch (error) {
  console.log('\n⚠️  Some dependencies failed to install. You may need to run npm install manually.');
}

console.log('\n📊 Final Steps:');
console.log('==============');
console.log('1. Run: npm audit fix --workspaces');
console.log('2. Run: npm test to verify everything works');
console.log('3. Consider migrating to Express 5 and Jest 30 when ready');
console.log('\n✅ Dependency standardization complete!');
