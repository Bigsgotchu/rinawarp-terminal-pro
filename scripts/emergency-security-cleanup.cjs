#!/usr/bin/env node

/**
 * 🚨 EMERGENCY SECURITY CLEANUP SCRIPT
 *
 * This script helps clean up exposed secrets and secure the repository.
 * Run immediately after detecting secret exposure.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class EmergencySecurityCleanup {
  constructor() {
    this.exposedKeys = [
      '{{REDACTED_API_KEY}}', // Google API Key
      '{{REDACTED_API_KEY}}', // Client Secret
      '{{REDACTED_API_KEY}}', // Cloud CLI Secret
      '{{REDACTED_API_KEY}}', // BQ CLI Secret
    ];

    this.dangerousFiles = [
      'secrets-scan-report.json',
      '.env.development',
      '.env.local.dev',
      'setup-email-service.js',
      'generate-admin-hash-simple.js',
      'add-api-key.js',
    ];
  }

  async run() {
    console.log('🚨 EMERGENCY SECURITY CLEANUP INITIATED');
    console.log('========================================\n');

    try {
      await this.removeSecretFiles();
      await this.sanitizeCodeFiles();
      await this.updateGitignore();
      await this.generateSecurityReport();

      console.log('\n✅ EMERGENCY CLEANUP COMPLETED');
      console.log('⚠️  NEXT: Manually revoke all exposed API keys!');
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }

  async removeSecretFiles() {
    console.log('🗑️  Removing dangerous files...');

    for (const file of this.dangerousFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`   ✅ Removed: ${file}`);
        } catch (error) {
          console.log(`   ⚠️  Could not remove: ${file} - ${error.message}`);
        }
      }
    }
  }

  async sanitizeCodeFiles() {
    console.log('\n🧹 Sanitizing code files...');

    const codeExtensions = ['.js', '.cjs', '.json', '.md', '.html', '.env'];
    const filesToScan = this.getAllFiles('.', codeExtensions);

    for (const filePath of filesToScan) {
      await this.sanitizeFile(filePath);
    }
  }

  async sanitizeFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Replace exposed secrets with placeholders
      for (const key of this.exposedKeys) {
        if (content.includes(key)) {
          content = content.replace(new RegExp(key, 'g'), '{{REDACTED_API_KEY}}');
          modified = true;
        }
      }

      // Remove common secret patterns
      const secretPatterns = [
        /sk_live_[a-zA-Z0-9]{24,}/g, // Stripe live keys
        /sk_test_[a-zA-Z0-9]{24,}/g, // Stripe test keys
        /pk_live_[a-zA-Z0-9]{24,}/g, // Stripe publishable live
        /pk_test_[a-zA-Z0-9]{24,}/g, // Stripe publishable test
        /whsec_[a-zA-Z0-9]{32,}/g, // Stripe webhook secrets
        /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g, // SendGrid API keys
        /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, // JWT tokens
      ];

      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, '{{REDACTED_SECRET}}');
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`   🔧 Sanitized: ${filePath}`);
      }
    } catch (error) {
      // Skip files that can't be read/written
    }
  }

  getAllFiles(dir, extensions) {
    const files = [];

    try {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          // Skip node_modules, .git, and other common directories
          if (!['node_modules', '.git', 'dist', 'build', '.cache'].includes(item)) {
            files.push(...this.getAllFiles(fullPath, extensions));
          }
        } else if (extensions.some(ext => fullPath.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }

    return files;
  }

  async updateGitignore() {
    console.log('\n📝 Updating .gitignore...');

    const gitignorePath = path.join(process.cwd(), '.gitignore');
    const securityPatterns = [
      '',
      '# 🚨 SECURITY - Emergency patterns added by cleanup script',
      'secrets-scan-report.json',
      '*secrets-report*',
      '*credentials*',
      '*api-keys*',
      '*.key',
      '*.secret',
      '.env.development',
      '.env.local.dev',
      'setup-email-service.js',
      'generate-admin-hash-simple.js',
      'add-api-key.js',
      '',
    ];

    let gitignoreContent = '';
    if (fs.existsSync(gitignorePath)) {
      gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    }

    // Only add if not already present
    if (!gitignoreContent.includes('Emergency patterns added by cleanup script')) {
      fs.appendFileSync(gitignorePath, securityPatterns.join('\n'));
      console.log('   ✅ Updated .gitignore with security patterns');
    }
  }

  async generateSecurityReport() {
    console.log('\n📊 Generating security status report...');

    const report = {
      timestamp: new Date().toISOString(),
      status: 'CLEANED',
      actions_taken: [
        'Removed dangerous files',
        'Sanitized exposed secrets in code',
        'Updated .gitignore patterns',
        'Generated security report',
      ],
      next_manual_steps: [
        'Revoke Google API Key: {{REDACTED_API_KEY}}',
        'Regenerate SendGrid API keys',
        'Rotate all Stripe keys',
        'Change database passwords',
        'Review and regenerate all OAuth client secrets',
        'Enable GitHub secret scanning alerts',
        'Conduct security audit',
      ],
      compromised_services: [
        'Google Cloud APIs',
        'SendGrid Email Service',
        'Stripe Payment Processing',
        'OAuth Authentication',
        'Database Access',
      ],
    };

    const reportPath = path.join(process.cwd(), 'SECURITY_CLEANUP_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`   ✅ Security report saved to: ${reportPath}`);
  }
}

// Run the cleanup if called directly
if (require.main === module) {
  const cleanup = new EmergencySecurityCleanup();
  cleanup.run().catch(console.error);
}

module.exports = EmergencySecurityCleanup;
