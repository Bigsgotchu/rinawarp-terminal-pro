#!/usr/bin/env node

/**
 * GitHub Workflow Diagnostic Tool
 * Helps identify why GitHub Actions workflows are failing
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

console.log('🔍 RinaWarp Terminal - GitHub Workflow Diagnostic');
console.log('='.repeat(50));

// Check workflow files
const workflowDir = '.github/workflows';
const workflowFiles = fs
  .readdirSync(workflowDir)
  .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

console.log(`\n📁 Found ${workflowFiles.length} workflow files:`);

workflowFiles.forEach(file => {
  const filePath = path.join(workflowDir, file);
  console.log(`\n📄 ${file}:`);

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const workflow = yaml.load(content);

    console.log('  ✅ YAML syntax: Valid');
    console.log(`  📝 Name: ${workflow.name || 'Unnamed'}`);

    // Check triggers
    if (workflow.on) {
      const triggers = Object.keys(workflow.on);
      console.log(`  🎯 Triggers: ${triggers.join(', ')}`);

      // Check for problematic triggers
      if (workflow.on.schedule) {
        console.log('  ⚠️  WARNING: Has scheduled triggers that might cause issues');
      }
    }

    // Check jobs
    if (workflow.jobs) {
      const jobNames = Object.keys(workflow.jobs);
      console.log(`  🏗️  Jobs: ${jobNames.join(', ')}`);

      // Check job dependencies
      jobNames.forEach(jobName => {
        const job = workflow.jobs[jobName];
        if (job.needs) {
          const needs = Array.isArray(job.needs) ? job.needs : [job.needs];
          console.log(`    📋 ${jobName} depends on: ${needs.join(', ')}`);
        }
      });
    }
  } catch (error) {
    console.log(`  ❌ YAML syntax: ERROR - ${error.message}`);
  }
});

// Check package.json for potential conflicts
console.log('\n📦 Package.json analysis:');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`  📛 Name: ${pkg.name}`);
  console.log(`  🏷️  Version: ${pkg.version}`);
  console.log(`  📋 Type: ${pkg.type || 'commonjs'}`);

  if (pkg.type === 'module') {
    console.log("  ⚠️  WARNING: Package type is 'module' - this might affect some scripts");
  }

  // Check for potential CI-related scripts
  if (pkg.scripts) {
    const ciScripts = Object.keys(pkg.scripts).filter(
      s => s.includes('test') || s.includes('build') || s.includes('lint') || s.includes('ci')
    );
    console.log(`  🛠️  CI-related scripts: ${ciScripts.join(', ')}`);
  }
} catch (error) {
  console.log(`  ❌ Cannot read package.json: ${error.message}`);
}

// Check for common problematic files
console.log('\n🔍 Environment check:');

const checkFiles = [
  '.env',
  '.env.local',
  '.env.production',
  '.gitignore',
  'node_modules',
  'dist',
  'build',
];

checkFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    console.log(`  ✅ ${file}: ${stats.isDirectory() ? 'Directory' : 'File'} exists`);
  } else {
    console.log(`  ❌ ${file}: Not found`);
  }
});

// Recommendations
console.log('\n💡 Recommendations:');
console.log("  1. Ensure default branch is set to 'main' in GitHub settings");
console.log('  2. Remove any scheduled workflow triggers that might be problematic');
console.log('  3. Check that all workflow dependencies (actions) are available');
console.log('  4. Verify repository permissions allow workflow execution');
console.log("  5. Consider using 'workflow_dispatch' for manual testing");

console.log('\n🌊 RinaWarp Terminal Diagnostic Complete!');
console.log('📧 If issues persist, check GitHub Actions tab in your repository');
