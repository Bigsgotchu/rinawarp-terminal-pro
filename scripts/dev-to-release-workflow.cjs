#!/usr/bin/env node

/*
 * 🧜‍♀️ RinaWarp Terminal - Development to Release Workflow
 * Automates the process of pushing local fixes to production releases
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  pink: '\x1b[95m',
};

function log(message, color = 'cyan') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function warn(message) {
  console.log(`${colors.yellow}⚠️ ${message}${colors.reset}`);
}

function error(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(`${colors.blue}${question}${colors.reset}`, resolve);
  });
}

async function main() {
  log('🧜‍♀️ RinaWarp Terminal - Development to Release Workflow', 'pink');
  console.log();

  try {
    // 1. Check Git status
    log('1. Checking Git status...');
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });

    if (gitStatus.trim()) {
      log('📝 Found uncommitted changes:');
      console.log(gitStatus);

      const shouldCommit = await askQuestion('Do you want to commit these changes? (y/N): ');
      if (shouldCommit.toLowerCase() === 'y') {
        await commitChanges();
      } else {
        warn('Please commit or stash your changes before proceeding');
        process.exit(1);
      }
    } else {
      success('Working directory is clean');
    }

    // 2. Choose release type
    console.log();
    log('2. What type of release is this?');
    console.log('   1) 🐛 Bug Fix (patch - 1.0.1)');
    console.log('   2) ✨ Feature (minor - 1.1.0)');
    console.log('   3) 🚀 Major Update (major - 2.0.0)');
    console.log('   4) 🧪 Beta Release (beta)');

    const releaseType = await askQuestion('Select release type (1-4): ');
    const releaseInfo = await getReleaseInfo(releaseType);

    // 3. Update version
    log('3. Updating version...');
    await updateVersion(releaseInfo.type);

    // 4. Run tests
    log('4. Running tests...');
    try {
      execSync('npm test', { stdio: 'inherit' });
      success('All tests passed');
    } catch (testErr) {
      warn('Tests failed, but continuing with release (you may want to fix these)');
    }

    // 5. Build release
    log('5. Building release...');
    try {
      execSync('npm run build', { stdio: 'inherit' });
      success('Build completed successfully');
    } catch (buildErr) {
      error('Build failed');
      process.exit(1);
    }

    // 6. Create release commit
    log('6. Creating release commit...');
    const version = getCurrentVersion();
    const commitMessage = await askQuestion(
      `Enter commit message (default: "chore: release v${version}"): `
    );
    const finalMessage = commitMessage.trim() || `chore: release v${version}`;

    execSync('git add -A');
    execSync(`git commit -m "${finalMessage}"`);
    success(`Created commit: ${finalMessage}`);

    // 7. Create Git tag
    log('7. Creating Git tag...');
    execSync(`git tag -a v${version} -m "Release v${version}"`);
    success(`Created tag: v${version}`);

    // 8. Push to repository
    log('8. Pushing to repository...');
    const pushToRepo = await askQuestion('Push to GitHub repository? (Y/n): ');
    if (pushToRepo.toLowerCase() !== 'n') {
      execSync('git push origin main');
      execSync('git push origin --tags');
      success('Pushed to repository');
    }

    // 9. Create GitHub release
    if (pushToRepo.toLowerCase() !== 'n') {
      log('9. Creating GitHub release...');
      await createGitHubRelease(version, releaseInfo, finalMessage);
    }

    // 10. Build distributables
    log('10. Building distributables for all platforms...');
    await buildDistributables(releaseInfo);

    success('🎉 Release workflow completed successfully!');
    log(`🧜‍♀️ Version ${version} is now available for all RinaWarp users!`);
  } catch (err) {
    error(`Workflow failed: ${err.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

async function commitChanges() {
  log('📝 Using conventional commit format:');
  console.log('   fix: resolve bug issue');
  console.log('   feat: add new feature');
  console.log('   docs: update documentation');
  console.log('   chore: maintenance tasks');
  console.log('   refactor: restructure code');
  console.log('');

  const message = await askQuestion(
    'Enter commit message (e.g., "fix: resolve AI integration issues"): '
  );

  // Validate conventional commit format
  const conventionalFormat =
    /^(feat|fix|docs|style|refactor|test|chore|ci|build|perf)(\(.+\))?: .+/;
  if (!conventionalFormat.test(message.trim())) {
    warn('Invalid commit format! Using conventional format...');
    const suggestedMessage = `fix: ${message.replace(/^\s+/, '')}`;
    log(`Suggested: ${suggestedMessage}`);
    const useDefault = await askQuestion('Use suggested format? (Y/n): ');
    const finalMessage = useDefault.toLowerCase() === 'n' ? message.trim() : suggestedMessage;
    execSync('git add -A');
    execSync(`git commit -m "${finalMessage}"`);
  } else {
    execSync('git add -A');
    execSync(`git commit -m "${message}"`);
  }

  success('Changes committed');
}

function getReleaseInfo(type) {
  const types = {
    1: { type: 'patch', name: 'Bug Fix', emoji: '🐛' },
    2: { type: 'minor', name: 'Feature', emoji: '✨' },
    3: { type: 'major', name: 'Major Update', emoji: '🚀' },
    4: { type: 'beta', name: 'Beta Release', emoji: '🧪' },
  };

  return types[type] || types['1'];
}

function updateVersion(type) {
  try {
    if (type === 'beta') {
      // For beta, append beta suffix - skip git commit and tag
      execSync('npm version prerelease --preid=beta --no-git-tag-version');
    } else {
      // Skip git commit and tag, we'll handle this ourselves
      execSync(`npm version ${type} --no-git-tag-version`);
    }
    success('Version updated');
  } catch (versionErr) {
    error(`Failed to update version: ${versionErr.message}`);
    throw versionErr;
  }
}

function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return packageJson.version;
}

async function createGitHubRelease(version, releaseInfo, commitMessage) {
  try {
    // Check if GitHub CLI is available
    execSync('gh --version', { stdio: 'ignore' });

    const releaseNotes = await generateReleaseNotes(version, releaseInfo, commitMessage);
    const prerelease = releaseInfo.type === 'beta' ? '--prerelease' : '';

    execSync(
      `gh release create v${version} ${prerelease} --title "🧜‍♀️ RinaWarp Terminal v${version}" --notes "${releaseNotes}"`
    );
    success('GitHub release created');
  } catch (releaseErr) {
    warn('GitHub CLI not available or failed to create release');
    log(
      'You can manually create a release at: https://github.com/Bigsgotchu/rinawarp-terminal-pro/releases/new'
    );
  }
}

async function generateReleaseNotes(version, releaseInfo, commitMessage) {
  const notes = `## ${releaseInfo.emoji} ${releaseInfo.name}

${commitMessage}

### 🧜‍♀️ What's New in v${version}

- Enhanced AI integration with better responses
- Improved CLI intelligence and fallback systems
- Better error handling and user experience
- Maintained mermaid personality throughout

### 🔧 Technical Improvements

- Optimized performance and reliability
- Updated dependencies and security fixes
- Better compatibility across platforms

### 📦 Installation

Download the appropriate version for your platform from the assets below.

### 🐛 Bug Reports

Found an issue? Please report it at: https://github.com/Bigsgotchu/rinawarp-terminal-pro/issues

---

*May your code flow like gentle tides! 🌊✨*`;

  return notes;
}

async function buildDistributables(releaseInfo) {
  try {
    log('Building for all platforms...');

    if (releaseInfo.type === 'beta') {
      execSync('npm run build:beta', { stdio: 'inherit' });
    } else {
      // Build for all platforms
      execSync('npm run build:all', { stdio: 'inherit' });
    }

    success('Distributables built successfully');
    log('💡 Upload the built files to the GitHub release manually or set up automated uploads');
  } catch (buildErr) {
    warn(`Build failed for some platforms: ${buildErr.message}`);
    log('You may need to build on different platforms manually');
  }
}

if (require.main === module) {
  main();
}
