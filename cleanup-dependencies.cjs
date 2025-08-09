#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🧹 Cleaning up dependencies...\n');

// Unused dependencies to remove
const unusedDeps = ['morgan'];

const unusedDevDeps = [
  '@babel/plugin-syntax-dynamic-import',
  '@babel/preset-typescript',
  '@electron/notarize',
  '@electron/packager',
  '@semantic-release/changelog',
  '@semantic-release/commit-analyzer',
  '@semantic-release/git',
  '@semantic-release/github',
  '@semantic-release/npm',
  '@semantic-release/release-notes-generator',
  '@sentry/replay',
  'assert',
  'autoprefixer',
  'babel-loader',
  'buffer',
  'css-loader',
  'dmg-license',
  'html-loader',
  'husky',
  'jest-circus',
  'jest-environment-jsdom',
  'jest-jasmine2',
  'json5-loader',
  'postcss',
  'postcss-cli',
  'postcss-loader',
  'process',
  'raw-loader',
  'sass',
  'sass-loader',
  'semantic-release',
  'source-map-loader',
  'style-loader',
  'tailwindcss',
  'url',
  'webpack-cli',
  'webpack-dev-server',
  'webpack-merge',
  'worker-loader',
];

// Optional: Dependencies that seem to be used by optional features
const optionalDeps = {
  'discord.js': 'Used by check-setup.js',
  'js-yaml': 'Used by diagnose-github-workflow.cjs',
  glob: 'Used by remove-console-logs.js',
  'crypto-browserify': 'Used by webpack.config.cjs',
  'node-pty': 'Core terminal dependency',
  'winston-daily-rotate-file': 'Enhanced logging',
  'electron-updater': 'Auto-update functionality',
  vm2: 'Plugin sandbox (deprecated, needs alternative)',
  axios: 'Community features',
  bcryptjs: 'License server',
  'http-proxy-middleware': 'API gateway',
  'express-graphql': 'GraphQL API',
  graphql: 'GraphQL API',
  googleapis: 'GA4 integration',
};

console.log('📋 Unused dependencies found:');
console.log('  Dependencies:', unusedDeps.length);
console.log('  DevDependencies:', unusedDevDeps.length);
console.log();

// Create backup of package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
fs.writeFileSync('package.json.backup', JSON.stringify(packageJson, null, 2));
console.log('✅ Created package.json.backup');

// Remove unused dependencies
console.log('\n🗑️  Removing unused dependencies...');

try {
  if (unusedDeps.length > 0) {
    console.log('  Removing dependencies:', unusedDeps.join(' '));
    execSync(`npm uninstall ${unusedDeps.join(' ')}`, { stdio: 'inherit' });
  }

  if (unusedDevDeps.length > 0) {
    console.log('  Removing devDependencies:', unusedDevDeps.join(' '));
    execSync(`npm uninstall ${unusedDevDeps.join(' ')}`, { stdio: 'inherit' });
  }

  console.log('\n✅ Dependencies cleaned up successfully!');

  console.log('\n📦 Optional dependencies to consider:');
  Object.entries(optionalDeps).forEach(([dep, usage]) => {
    console.log(`  - ${dep}: ${usage}`);
  });

  console.log('\n💡 To add any missing dependencies, run:');
  console.log('  npm install <package-name>');
} catch (error) {
  console.error('\n❌ Error cleaning dependencies:', error.message);
  console.log('Restoring package.json from backup...');
  const backup = fs.readFileSync('package.json.backup', 'utf8');
  fs.writeFileSync('package.json', backup);
}
