#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, options = {}) {
  try {
    return execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return packageJson.version;
}

function generateChangelog() {
  try {
    const lastTag = runCommand('git describe --tags --abbrev=0 2>/dev/null || echo ""', { silent: true }).trim();
    let changelog;
    
    if (!lastTag) {
      changelog = runCommand('git log --oneline --pretty=format:"- %s" | head -20', { silent: true });
    } else {
      changelog = runCommand(`git log ${lastTag}..HEAD --oneline --pretty=format:"- %s"`, { silent: true });
    }
    
    return changelog.trim();
  } catch (error) {
    return 'No changelog available';
  }
}

function createRelease(versionType = 'patch', dryRun = false) {
  console.log(`🚀 Starting release process (${versionType})...`);
  
  // Check if git is clean
  try {
    const status = runCommand('git status --porcelain', { silent: true });
    if (status.trim()) {
      console.log('⚠️  Working directory not clean. Please commit or stash changes first.');
      console.log('Uncommitted changes:');
      console.log(status);
      return;
    }
  } catch (error) {
    console.log('⚠️  Cannot check git status. Make sure you are in a git repository.');
    return;
  }
  
  const currentVersion = getCurrentVersion();
  console.log(`📦 Current version: ${currentVersion}`);
  
  if (dryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made');
    
    // Show what would happen
    const newVersion = runCommand(`npm version ${versionType} --no-git-tag-version`, { silent: true }).trim();
    runCommand('git checkout -- package.json package-lock.json');
    
    console.log(`📈 Would bump version to: ${newVersion}`);
    console.log(`🏷️  Would create tag: ${newVersion}`);
    
    const changelog = generateChangelog();
    console.log('📝 Changelog:');
    console.log(changelog);
    
    return;
  }
  
  // Generate changelog before version bump
  const changelog = generateChangelog();
  
  // Bump version
  const newVersion = runCommand(`npm version ${versionType} --no-git-tag-version`, { silent: true }).trim();
  console.log(`📈 Bumped version to: ${newVersion}`);
  
  // Commit and tag
  runCommand(`git add package.json package-lock.json`);
  runCommand(`git commit -m "chore: bump version to ${newVersion}"`);
  runCommand(`git tag ${newVersion}`);
  
  console.log(`🏷️  Created tag: ${newVersion}`);
  
  // Push to remote
  console.log('📤 Pushing to remote...');
  runCommand('git push origin main');
  runCommand(`git push origin ${newVersion}`);
  
  console.log('✅ Release process completed!');
  console.log(`📦 Version ${newVersion} has been tagged and pushed.`);
  console.log('🔄 GitHub Actions will automatically build and create the release.');
  console.log(`🌐 Release will be available at: https://github.com/${getRepoUrl()}/releases/tag/${newVersion}`);
}

function getRepoUrl() {
  try {
    const remote = runCommand('git config --get remote.origin.url', { silent: true }).trim();
    return remote.replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '');
  } catch (error) {
    return 'your-org/your-repo';
  }
}

function showHelp() {
  console.log(`
🚀 RinaWarp Terminal Release Tool

Usage: node scripts/release.cjs [command] [options]

Commands:
  patch       Bump patch version (1.0.0 -> 1.0.1)
  minor       Bump minor version (1.0.0 -> 1.1.0)
  major       Bump major version (1.0.0 -> 2.0.0)
  prerelease  Create prerelease version (1.0.0 -> 1.0.1-0)
  
  status      Show current version and git status
  changelog   Generate changelog from git commits
  help        Show this help message

Options:
  --dry-run   Show what would happen without making changes

Examples:
  node scripts/release.cjs patch
  node scripts/release.cjs minor --dry-run
  node scripts/release.cjs status
  node scripts/release.cjs changelog
`);
}

function showStatus() {
  console.log('📊 Release Status');
  console.log('================');
  console.log(`📦 Current version: ${getCurrentVersion()}`);
  
  try {
    const status = runCommand('git status --porcelain', { silent: true });
    if (status.trim()) {
      console.log('⚠️  Working directory: DIRTY');
      console.log('Uncommitted changes:');
      console.log(status);
    } else {
      console.log('✅ Working directory: CLEAN');
    }
  } catch (error) {
    console.log('⚠️  Cannot check git status');
  }
  
  try {
    const branch = runCommand('git branch --show-current', { silent: true }).trim();
    console.log(`🌿 Current branch: ${branch}`);
  } catch (error) {
    console.log('⚠️  Cannot determine current branch');
  }
  
  try {
    const lastTag = runCommand('git describe --tags --abbrev=0 2>/dev/null || echo "No tags found"', { silent: true }).trim();
    console.log(`🏷️  Last tag: ${lastTag}`);
  } catch (error) {
    console.log('🏷️  Last tag: No tags found');
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0] || 'help';
const isDryRun = args.includes('--dry-run');

switch (command) {
  case 'patch':
  case 'minor':
  case 'major':
  case 'prerelease':
    createRelease(command, isDryRun);
    break;
  case 'status':
    showStatus();
    break;
  case 'changelog':
    console.log('📝 Changelog:');
    console.log(generateChangelog());
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    console.log(`❌ Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
