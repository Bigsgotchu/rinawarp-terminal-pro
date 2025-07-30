/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('child_process');

console.log('🔧 RinaWarp Duplicate and Conflict Cleanup Script');
console.log('================================================\n');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose') || DRY_RUN;

if (DRY_RUN) {
  console.log('🔍 Running in DRY RUN mode - no changes will be made\n');
}

// Track all changes
const changes = {
  removed: [],
  moved: [],
  updated: [],
  conflicts: []
};

// Helper functions
function log(message, type = 'info') {
  const prefix = {
    info: '📌',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    action: '🔨'
  };
  console.log(`${prefix[type] || '📌'} ${message}`);
}

function executeCommand(command, dryRun = DRY_RUN) {
  if (dryRun) {
    log(`Would execute: ${command}`, 'action');
    return null;
  }
  try {
    return execSync(command, { encoding: 'utf8' });
  } catch (error) {
    log(`Command failed: ${command}`, 'error');
    return null;
  }
}

function removeDirectory(dirPath, dryRun = DRY_RUN) {
  if (fs.existsSync(dirPath)) {
    if (dryRun) {
      log(`Would remove directory: ${dirPath}`, 'action');
      changes.removed.push(dirPath);
    } else {
      fs.rmSync(dirPath, { recursive: true, force: true });
      log(`Removed directory: ${dirPath}`, 'success');
      changes.removed.push(dirPath);
    }
    return true;
  }
  return false;
}

function moveFile(src, dest, dryRun = DRY_RUN) {
  if (fs.existsSync(src)) {
    if (dryRun) {
      log(`Would move: ${src} → ${dest}`, 'action');
      changes.moved.push({ from: src, to: dest });
    } else {
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.renameSync(src, dest);
      log(`Moved: ${src} → ${dest}`, 'success');
      changes.moved.push({ from: src, to: dest });
    }
    return true;
  }
  return false;
}

// Main cleanup tasks

async function fixNestedDuplicateDirectory() {
  log('\n1. Fixing nested duplicate directory structure...', 'info');
    
  const duplicatePath = path.join(__dirname, 'email-templates/testing/rinawarp-terminal');
    
  if (fs.existsSync(duplicatePath)) {
    log('Found duplicate nested directory: email-templates/testing/rinawarp-terminal/', 'warning');
        
    // Check if there are any unique files in the nested directory
    const nestedEmailPath = path.join(duplicatePath, 'email-templates');
    if (fs.existsSync(nestedEmailPath)) {
      const files = fs.readdirSync(nestedEmailPath, { withFileTypes: true });
            
      for (const file of files) {
        if (file.isFile()) {
          const srcPath = path.join(nestedEmailPath, file.name);
          const destPath = path.join(__dirname, 'email-templates/testing', file.name);
                    
          if (!fs.existsSync(destPath)) {
            moveFile(srcPath, destPath);
          } else {
            log(`Duplicate file found: ${file.name} - skipping`, 'warning');
            changes.conflicts.push({ file: file.name, reason: 'duplicate in both locations' });
          }
        }
      }
    }
        
    removeDirectory(duplicatePath);
  } else {
    log('No nested duplicate directory found', 'success');
  }
}

async function consolidatePackageVersions() {
  log('\n2. Checking package.json dependency conflicts...', 'info');
    
  const packageFiles = [
    'package.json',
    'cloud-ai-service/package.json',
    'deprecated/email-testing-suite/package.json',
    'sdk/javascript/package.json',
    'tools/rinawarp-cleanup/package.json'
  ];
    
  const commonDeps = {};
  const conflicts = [];
    
  // Analyze dependencies
  for (const file of packageFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                
        for (const [dep, version] of Object.entries(deps)) {
          if (!commonDeps[dep]) {
            commonDeps[dep] = [];
          }
          commonDeps[dep].push({ file, version });
        }
      } catch (error) {
        log(`Error reading ${file}: ${error.message}`, 'error');
      }
    }
  }
    
  // Find conflicts
  for (const [dep, versions] of Object.entries(commonDeps)) {
    const uniqueVersions = [...new Set(versions.map(v => v.version))];
    if (uniqueVersions.length > 1) {
      conflicts.push({
        dependency: dep,
        versions: versions
      });
            
      if (VERBOSE) {
        log(`Conflict found for ${dep}:`, 'warning');
        versions.forEach(v => {
          console.log(`    ${v.file}: ${v.version}`);
        });
      }
    }
  }
    
  // Create conflict report
  if (conflicts.length > 0) {
    const report = {
      timestamp: new Date().toISOString(),
      conflicts: conflicts
    };
        
    const reportPath = path.join(__dirname, 'dependency-conflicts-report.json');
    if (!DRY_RUN) {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      log(`Created dependency conflict report: ${reportPath}`, 'success');
    } else {
      log(`Would create dependency conflict report: ${reportPath}`, 'action');
    }
        
    changes.conflicts.push(...conflicts.map(c => ({
      type: 'dependency',
      name: c.dependency,
      details: c.versions
    })));
  } else {
    log('No dependency conflicts found', 'success');
  }
}

async function fixURLConsistency() {
  log('\n3. Fixing URL consistency issues...', 'info');
    
  const urlMappings = {
    'http://localhost': 'https://localhost',
    'http://rinawarptech.com': 'https://rinawarptech.com',
    'www.rinawarptech.com': 'rinawarptech.com'
  };
    
  const filesToCheck = [
    '.env*',
    '**/*.js',
    '**/*.json',
    '**/*.md',
    '**/*.html',
    '**/*.yml',
    '**/*.yaml'
  ];
    
  // Find all relevant files
  const findCommand = `find . -type f \\( ${filesToCheck.map(pattern => `-name "${pattern}"`).join(' -o ')} \\) -not -path "./node_modules/*" -not -path "./dist/*" -not -path "./.git/*"`;
    
  if (!DRY_RUN) {
    const files = executeCommand(findCommand)?.split('\n').filter(f => f) || [];
        
    for (const file of files) {
      if (fs.existsSync(file)) {
        try {
          let content = fs.readFileSync(file, 'utf8');
          let modified = false;
                    
          for (const [oldUrl, newUrl] of Object.entries(urlMappings)) {
            const regex = new RegExp(oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            if (regex.test(content)) {
              content = content.replace(regex, newUrl);
              modified = true;
              if (VERBOSE) {
                log(`Updated URL in ${file}: ${oldUrl} → ${newUrl}`, 'success');
              }
            }
          }
                    
          if (modified) {
            fs.writeFileSync(file, content);
            changes.updated.push({ file, type: 'url-consistency' });
          }
        } catch (error) {
          log(`Error processing ${file}: ${error.message}`, 'error');
        }
      }
    }
  } else {
    log('Would check and fix URL consistency in all relevant files', 'action');
  }
}

async function consolidateEmailTemplates() {
  log('\n4. Consolidating duplicate email templates...', 'info');
    
  const templateDir = path.join(__dirname, 'email-templates/testing/ab-test-variations');
    
  if (fs.existsSync(templateDir)) {
    const templates = fs.readdirSync(templateDir);
    const templateGroups = {};
        
    // Group templates by their base name
    templates.forEach(template => {
      const match = template.match(/variation-A(\d+)B(\d+)\.html/);
      if (match) {
        const [, a, b] = match;
        const key = `A${a}B${b}`;
        if (!templateGroups[key]) {
          templateGroups[key] = [];
        }
        templateGroups[key].push(template);
      }
    });
        
    // Check for exact duplicates
    for (const [group, files] of Object.entries(templateGroups)) {
      if (files.length > 1) {
        log(`Found ${files.length} files for variation ${group}`, 'warning');
        changes.conflicts.push({
          type: 'duplicate-templates',
          group,
          files
        });
      }
    }
        
    // Check for content similarity
    const templateContents = new Map();
    for (const template of templates) {
      const filePath = path.join(templateDir, template);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const contentHash = require('node:crypto').createHash('md5').update(content).digest('hex');
                
        if (templateContents.has(contentHash)) {
          log(`Duplicate content found: ${template} matches ${templateContents.get(contentHash)}`, 'warning');
          changes.conflicts.push({
            type: 'duplicate-content',
            files: [template, templateContents.get(contentHash)],
            hash: contentHash
          });
        } else {
          templateContents.set(contentHash, template);
        }
      } catch (error) {
        log(`Error reading ${template}: ${error.message}`, 'error');
      }
    }
  }
}

async function createBackup() {
  log('\n5. Creating backup before changes...', 'info');
    
  const backupDir = path.join(__dirname, '.backups', `backup-${Date.now()}`);
    
  if (!DRY_RUN) {
    // Create backup of critical files
    const criticalPaths = [
      'package.json',
      'email-templates/testing',
      '.env*'
    ];
        
    for (const pathPattern of criticalPaths) {
      executeCommand(`mkdir -p "${backupDir}"`);
      executeCommand(`cp -r ${pathPattern} "${backupDir}/" 2>/dev/null || true`);
    }
        
    log(`Created backup at: ${backupDir}`, 'success');
  } else {
    log(`Would create backup at: ${backupDir}`, 'action');
  }
}

// Main execution
async function main() {
  try {
    await createBackup();
    await fixNestedDuplicateDirectory();
    await consolidatePackageVersions();
    await fixURLConsistency();
    await consolidateEmailTemplates();
        
    // Generate summary report
    log('\n📊 Cleanup Summary:', 'info');
    console.log(`   Removed: ${changes.removed.length} directories/files`);
    console.log(`   Moved: ${changes.moved.length} files`);
    console.log(`   Updated: ${changes.updated.length} files`);
    console.log(`   Conflicts found: ${changes.conflicts.length}`);
        
    // Save detailed report
    const reportPath = path.join(__dirname, 'cleanup-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      dryRun: DRY_RUN,
      changes: changes
    };
        
    if (!DRY_RUN) {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      log(`\n📄 Detailed report saved to: ${reportPath}`, 'success');
    } else {
      log('\n📄 Would save detailed report to: cleanup-report.json', 'action');
    }
        
    if (DRY_RUN) {
      log('\n✨ Dry run complete! Run without --dry-run to apply changes.', 'info');
    } else {
      log('\n✨ Cleanup complete!', 'success');
    }
        
    // Recommendations
    if (changes.conflicts.length > 0) {
      log('\n📋 Recommendations:', 'info');
      console.log('   1. Review dependency-conflicts-report.json and standardize versions');
      console.log('   2. Consider consolidating duplicate email templates');
      console.log('   3. Update all environment files to use consistent URLs');
      console.log('   4. Run npm install after resolving dependency conflicts');
    }
        
  } catch (error) {
    log(`\nError during cleanup: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Show help if requested
if (process.argv.includes('--help')) {
  console.log(`
Usage: node fix-duplicates-and-conflicts.js [options]

Options:
  --dry-run     Show what would be done without making changes
  --verbose     Show detailed output
  --help        Show this help message

This script will:
  1. Fix nested duplicate directories
  2. Identify package.json dependency conflicts
  3. Fix URL consistency issues
  4. Consolidate duplicate email templates
  5. Create backups before making changes
`);
  process.exit(0);
}

// Run the cleanup
main().catch(error => {
  log(`Unexpected error: ${error.message}`, 'error');
  process.exit(1);
});
