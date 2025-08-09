#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execAsync = promisify(exec);

const STEPS = {
  validateConfig: 'Validating configuration',
  runTests: 'Running tests',
  runLinter: 'Running linter',
  cleanBuild: 'Cleaning build directories',
  buildApp: 'Building application',
  verifyBuilds: 'Verifying build outputs',
};

async function runStep(stepName, command) {
  console.log(`\n🔄 ${STEPS[stepName]}...`);

  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('warn')) console.error(stderr);
    console.log(`✅ ${STEPS[stepName]} - Complete`);
    return true;
  } catch (error) {
    console.error(`❌ ${STEPS[stepName]} - Failed`);
    console.error(error.message);
    return false;
  }
}

async function buildProduction() {
  console.log('🚀 RinaWarp Terminal - Production Build Process');
  console.log('='.repeat(60));
  console.log(`📅 Build started at: ${new Date().toISOString()}\n`);

  const results = [];

  // Step 1: Validate configuration
  results.push(await runStep('validateConfig', 'npm run validate:config'));

  // Step 2: Run tests
  results.push(await runStep('runTests', 'npm test'));

  // Step 3: Run linter
  results.push(await runStep('runLinter', 'npm run lint'));

  // Step 4: Clean build directories
  results.push(await runStep('cleanBuild', 'rm -rf dist build-cache'));

  // Step 5: Build application for all platforms
  console.log('\n🏗️  Building for all platforms (this may take several minutes)...');
  results.push(await runStep('buildApp', 'npm run build:all'));

  // Step 6: Verify build outputs
  console.log('\n🔍 Verifying build outputs...');
  const distPath = path.join(__dirname, '../dist');

  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath);
    console.log('\n📦 Build artifacts:');

    const expectedFiles = {
      mac: files.filter(f => f.endsWith('.dmg') || f.endsWith('.zip')),
      win: files.filter(f => f.endsWith('.exe')),
      linux: files.filter(f => f.endsWith('.AppImage') || f.endsWith('.tar.gz')),
    };

    console.log(`  • macOS: ${expectedFiles.mac.length} files`);
    expectedFiles.mac.forEach(f =>
      console.log(`    - ${f} (${getFileSize(path.join(distPath, f))})`)
    );

    console.log(`  • Windows: ${expectedFiles.win.length} files`);
    expectedFiles.win.forEach(f =>
      console.log(`    - ${f} (${getFileSize(path.join(distPath, f))})`)
    );

    console.log(`  • Linux: ${expectedFiles.linux.length} files`);
    expectedFiles.linux.forEach(f =>
      console.log(`    - ${f} (${getFileSize(path.join(distPath, f))})`)
    );

    results.push(true);
  } else {
    console.error('❌ No build outputs found in dist directory');
    results.push(false);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 BUILD SUMMARY\n');

  const failed = results.filter(r => !r).length;
  const passed = results.filter(r => r).length;

  console.log(`✅ Passed: ${passed}/${results.length} steps`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}/${results.length} steps`);
  }

  if (failed === 0) {
    console.log('\n🎉 Production build completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Test the builds on each platform');
    console.log('2. Upload to GitHub releases: gh release create v1.0.0 dist/*');
    console.log('3. Deploy backend to Railway: npm run deploy:railway');
    console.log('4. Update website download links');
    console.log('5. Send announcement to beta users');
  } else {
    console.log('\n❌ Production build failed. Please fix the errors above and try again.');
    process.exit(1);
  }
}

function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  const bytes = stats.size;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

// Run the build
buildProduction().catch(error => {
  console.error('\n❌ Build process failed:', error);
  process.exit(1);
});
