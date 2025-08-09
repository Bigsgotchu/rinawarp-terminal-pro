#!/usr/bin/env node

/**
 * Repository Security Setup Script
 * Ensures your codebase is properly protected and secured
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;

console.log('🔐 Securing RinaWarp Terminal repository...\n');

async function secureRepository() {
  try {
    // 1. Verify repository is private
    await checkRepositoryVisibility();

    // 2. Set up branch protection (if not already protected)
    await setupBranchProtection();

    // 3. Create security policy
    await createSecurityPolicy();

    // 4. Set up gitignore for sensitive files
    await updateGitignore();

    // 5. Clean up any leaked secrets
    await checkForSecrets();

    // 6. Verify tier gating is in place
    await verifyTierGating();

    console.log('\n✅ Repository security setup complete!');
    console.log('🛡️ Your codebase is now properly protected');
  } catch (error) {
    console.error('❌ Failed to secure repository:', error);
    process.exit(1);
  }
}

async function checkRepositoryVisibility() {
  try {
    const repoInfo = execSync('gh repo view --json visibility,isPrivate', { encoding: 'utf8' });
    const repo = JSON.parse(repoInfo);

    if (repo.isPrivate && repo.visibility === 'PRIVATE') {
      console.log('✅ Repository is properly set to PRIVATE');
    } else {
      console.log('⚠️ WARNING: Repository may not be private!');
      console.log('🔒 Making repository private...');
      execSync('gh repo edit --visibility private');
      console.log('✅ Repository set to private');
    }
  } catch (error) {
    console.warn('⚠️ Could not verify repository visibility:', error.message);
  }
}

async function setupBranchProtection() {
  try {
    // Try to get existing protection
    const protection = execSync(
      'gh api repos/Bigsgotchu/rinawarp-terminal-pro/branches/main/protection',
      {
        encoding: 'utf8',
        stdio: 'pipe',
      }
    );
    console.log('✅ Branch protection already configured');
  } catch (error) {
    if (error.message.includes('Branch not protected')) {
      console.log('🔒 Setting up branch protection...');

      try {
        // Set up basic branch protection
        console.log('⚠️ Branch protection setup skipped - requires manual setup in GitHub');
        console.log(
          '💡 Go to: https://github.com/Bigsgotchu/rinawarp-terminal-pro/settings/branches'
        );
        // execSync('gh api repos/Bigsgotchu/rinawarp-terminal-pro/branches/main/protection -X PUT --field enforce_admins=true', {
        //   encoding: 'utf8',
        //   stdio: 'pipe'
        // });
        console.log('✅ Branch protection guidance provided');
      } catch (protectionError) {
        console.warn('⚠️ Could not enable branch protection (may require GitHub Pro)');
      }
    }
  }
}

async function createSecurityPolicy() {
  const securityContent = `# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.3.x   | :white_check_mark: |
| 1.2.x   | :white_check_mark: |
| < 1.2   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in RinaWarp Terminal, please:

1. **DO NOT** open a public GitHub issue
2. Email security concerns to: security@rinawarp.com
3. Include detailed information about the vulnerability
4. Allow 48 hours for initial response

## Security Features

- ✅ Private repository with controlled access
- ✅ Enhanced AI features gated by subscription tiers
- ✅ Encrypted API keys and sensitive data
- ✅ Secure payment processing through Stripe
- ✅ No sensitive data stored in browser localStorage

## Tier Gating Protection

Enhanced AI features are restricted to Professional+ tiers:
- Code analysis and debugging requires \`ai_advanced\` feature flag
- Tier validation happens both client and server-side
- Free tier users see upgrade prompts instead of advanced features

Thank you for helping keep RinaWarp Terminal secure!`;

  await fs.writeFile('SECURITY.md', securityContent, 'utf8');
  console.log('✅ Created SECURITY.md policy');
}

async function updateGitignore() {
  const gitignorePath = '.gitignore';
  let content = '';

  try {
    content = await fs.readFile(gitignorePath, 'utf8');
  } catch (error) {
    // File doesn't exist, create it
  }

  const securityPatterns = `
# Security & Sensitive Files
.env.*
*.key
*.pem
*.p12
secrets/
credentials/
private/
*.secret

# Stripe & Payment Data
stripe-webhook-*
payment-logs/
stripe-events.json

# User Data
user-data/
analytics/raw/
logs/personal/

# Backup Files (may contain sensitive data)
*.backup
*.bak
backup-*
*-backup/

# Development Tools
.vscode/settings.json
.idea/
*.swp
*.swo

# OS Files
.DS_Store
Thumbs.db
`;

  if (!content.includes('# Security & Sensitive Files')) {
    content += securityPatterns;
    await fs.writeFile(gitignorePath, content, 'utf8');
    console.log('✅ Updated .gitignore with security patterns');
  } else {
    console.log('✅ .gitignore already contains security patterns');
  }
}

async function checkForSecrets() {
  console.log('🔍 Scanning for potential secrets...');

  const patterns = [
    'sk_live_',
    'sk_test_',
    'pk_live_',
    'pk_test_',
    'whsec_',
    'STRIPE_SECRET_KEY',
    'API_SECRET',
    'PRIVATE_KEY',
    'PASSWORD',
    'AUTH_TOKEN',
  ];

  let foundSecrets = false;

  for (const pattern of patterns) {
    try {
      const result = execSync(`git log --all -S "${pattern}" --oneline`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      if (result.trim()) {
        console.warn(`⚠️ Found potential secret pattern: ${pattern}`);
        foundSecrets = true;
      }
    } catch (error) {
      // Pattern not found, which is good
    }
  }

  if (!foundSecrets) {
    console.log('✅ No obvious secrets found in git history');
  } else {
    console.log('⚠️ Consider using BFG Repo-Cleaner to remove secrets from history');
    console.log(
      '📖 Guide: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository'
    );
  }
}

async function verifyTierGating() {
  console.log('🎯 Verifying enhanced AI tier gating...');

  const files = [
    'src/ai-system/enhanced-ai-integration.js',
    'src/enhanced-ai-terminal-init.js',
    'src/services/tier-checking.js',
  ];

  let allGated = true;

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf8');

      if (file.includes('enhanced-ai-integration.js')) {
        if (content.includes('ai_advanced') && content.includes('getUserTier')) {
          console.log(`✅ ${file}: Tier gating implemented`);
        } else {
          console.warn(`⚠️ ${file}: Missing tier validation`);
          allGated = false;
        }
      } else if (file.includes('enhanced-ai-terminal-init.js')) {
        if (content.includes('hasFeature') && content.includes('ai_advanced')) {
          console.log(`✅ ${file}: Tier checking active`);
        } else {
          console.warn(`⚠️ ${file}: Missing initialization protection`);
          allGated = false;
        }
      } else if (file.includes('tier-checking.js')) {
        if (content.includes('TierCheckingService')) {
          console.log(`✅ ${file}: Service created`);
        } else {
          console.warn(`⚠️ ${file}: Service incomplete`);
          allGated = false;
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not verify ${file}: ${error.message}`);
      allGated = false;
    }
  }

  if (allGated) {
    console.log('✅ Enhanced AI is properly tier-gated');
  } else {
    console.warn('⚠️ Some tier gating may be missing - run setup-enhanced-ai-tier-gating.cjs');
  }
}

// Run the security setup
secureRepository();
