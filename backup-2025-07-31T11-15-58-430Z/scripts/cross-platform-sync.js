#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import kleur from 'kleur';

// Configurable secrets list - easily extensible
const SECRETS_CONFIG = [
  {
    key: 'STRIPE_SECRET_KEY',
    required: true,
    environments: ['production', 'preview', 'development'],
  },
  {
    key: 'STRIPE_PUBLISHABLE_KEY',
    required: true,
    environments: ['production', 'preview', 'development'],
  },
  {
    key: 'SENDGRID_API_KEY',
    required: true,
    environments: ['production', 'preview', 'development'],
  },
  { key: 'ADMIN_TOKEN', required: false, environments: ['development'] },
  { key: 'RINAWARP_API_KEY', required: false, environments: ['production', 'preview'] },
  { key: 'STRIPE_WEBHOOK_SECRET', required: false, environments: ['production'] },
  { key: 'GA_MEASUREMENT_ID', required: false, environments: ['production', 'preview'] },
  { key: 'SENTRY_DSN', required: false, environments: ['production', 'preview'] },
];

const ALL_ENVIRONMENTS = ['production', 'preview', 'development'];

class CrossPlatformSecretSync {
  constructor() {
    this.localSecrets = {};
    this.vercelSecrets = {};
    this.syncResults = {};
    this.alertsEnabled = process.env.SLACK_WEBHOOK_URL || false;
  }

  // Enhanced secret loading with validation
  loadLocalSecrets() {
    const envFiles = ['.env.local', '.env', '.env.production'];
    let secretsFound = 0;

    console.log(kleur.cyan('📁 Loading secrets from local files...'));

    envFiles.forEach(file => {
      const envPath = path.join(process.cwd(), file);
      if (fs.existsSync(envPath)) {
        console.log(kleur.blue(`  Reading ${file}...`));
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

        lines.forEach(line => {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=').trim();
          const secretConfig = SECRETS_CONFIG.find(s => s.key === key.trim());

          if (secretConfig && value && !value.includes('your_')) {
            this.localSecrets[key.trim()] = {
              value: value,
              source: file,
              required: secretConfig.required,
              environments: secretConfig.environments,
            };
            secretsFound++;
          }
        });
      }
    });

    console.log(kleur.green(`✅ Found ${secretsFound} secrets in local files`));
    return secretsFound > 0;
  }

  // Enhanced Vercel secret detection
  async loadVercelSecrets() {
    try {
      console.log(kleur.cyan('☁️  Checking Vercel environment variables...'));
      const output = execSync('vercel env ls', { encoding: 'utf8', stdio: 'pipe' });
      const lines = output.split('\n').filter(line => line.trim());

      // Initialize tracking structure
      SECRETS_CONFIG.forEach(config => {
        this.vercelSecrets[config.key] = {
          production: false,
          preview: false,
          development: false,
          count: 0,
        };
      });

      // Parse Vercel output
      lines.forEach(line => {
        SECRETS_CONFIG.forEach(config => {
          if (line.includes(config.key)) {
            ALL_ENVIRONMENTS.forEach(env => {
              if (line.toLowerCase().includes(env.toLowerCase())) {
                this.vercelSecrets[config.key][env] = true;
                this.vercelSecrets[config.key].count++;
              }
            });
          }
        });
      });

      console.log(kleur.green('✅ Vercel environment variables loaded'));
      return true;
    } catch (error) {
      console.log(
        kleur.red(
          "❌ Failed to load Vercel secrets. Make sure you're logged in with `vercel login`"
        )
      );
      return false;
    }
  }

  // Enhanced secret synchronization with selective environment targeting
  async syncSecretToEnvironments(secretName, secretValue, targetEnvironments) {
    console.log(
      kleur.cyan(`🔄 Syncing ${secretName} to environments: ${targetEnvironments.join(', ')}`)
    );

    const results = {};

    for (const env of targetEnvironments) {
      try {
        // Remove existing secret (ignore errors)
        try {
          execSync(`vercel env remove ${secretName} ${env} --yes`, { stdio: 'pipe' });
        } catch (_e) {
          // Ignore removal errors
        }

        // Add the secret
        execSync(`echo "${secretValue}" | vercel env add ${secretName} ${env}`, {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        console.log(kleur.green(`  ✅ ${env}`));
        results[env] = { success: true, timestamp: new Date().toISOString() };
      } catch (error) {
        console.log(kleur.red(`  ❌ ${env} - ${error.message}`));
        results[env] = { success: false, error: error.message };
      }
    }

    return results;
  }

  // Intelligent sync based on configuration
  async performSmartSync() {
    console.log(kleur.magenta('\n🚀 Starting intelligent secret synchronization...'));

    for (const [secretName, secretData] of Object.entries(this.localSecrets)) {
      const targetEnvironments = secretData.environments;
      console.log(
        kleur.blue(`\nProcessing ${secretName} for environments: ${targetEnvironments.join(', ')}`)
      );

      const syncResult = await this.syncSecretToEnvironments(
        secretName,
        secretData.value,
        targetEnvironments
      );

      this.syncResults[secretName] = {
        ...syncResult,
        required: secretData.required,
        source: secretData.source,
      };
    }
  }

  // Enhanced validation with environment-specific checks
  validateSecretConsistency() {
    console.log(kleur.magenta('\n🔍 Validating secret consistency...'));

    const validation = {
      overall: { valid: true, issues: [] },
      secrets: {},
    };

    SECRETS_CONFIG.forEach(config => {
      const secretName = config.key;
      const hasLocal = !!this.localSecrets[secretName];
      const vercelStatus = this.vercelSecrets[secretName];

      const secretValidation = {
        local: hasLocal,
        vercel: vercelStatus,
        required: config.required,
        status: 'unknown',
        issues: [],
      };

      // Check local presence for required secrets
      if (config.required && !hasLocal) {
        secretValidation.issues.push('Missing in local environment');
        validation.overall.issues.push(`${secretName}: Missing locally`);
        validation.overall.valid = false;
      }

      // Check Vercel environment presence
      config.environments.forEach(env => {
        if (hasLocal && !vercelStatus[env]) {
          secretValidation.issues.push(`Missing in ${env} environment`);
          validation.overall.issues.push(`${secretName}: Missing in ${env}`);
          if (config.required) {
            validation.overall.valid = false;
          }
        }
      });

      // Determine overall status
      if (secretValidation.issues.length === 0) {
        secretValidation.status = '✅ Synchronized';
        console.log(kleur.green(`  ✅ ${secretName} - Fully synchronized`));
      } else if (config.required) {
        secretValidation.status = '❌ Critical issues';
        console.log(kleur.red(`  ❌ ${secretName} - ${secretValidation.issues.join(', ')}`));
      } else {
        secretValidation.status = '⚠️  Optional issues';
        console.log(kleur.yellow(`  ⚠️  ${secretName} - ${secretValidation.issues.join(', ')}`));
      }

      validation.secrets[secretName] = secretValidation;
    });

    return validation;
  }

  // Enhanced dashboard report with UI-ready data
  generateDashboardReport(validation) {
    const report = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      deployment: {
        vercel: {
          connected: true,
          environments: ALL_ENVIRONMENTS,
        },
      },
      secrets: {},
      summary: {
        total: SECRETS_CONFIG.length,
        synchronized: 0,
        warnings: 0,
        critical: 0,
        optional_missing: 0,
      },
      ui_status: {
        overall: validation.overall.valid ? 'success' : 'error',
        color: validation.overall.valid ? '#10B981' : '#EF4444',
        message: validation.overall.valid
          ? 'All secrets synchronized'
          : `${validation.overall.issues.length} issues detected`,
      },
      last_sync: this.syncResults,
      recommendations: [],
    };

    // Process each secret for dashboard display
    SECRETS_CONFIG.forEach(config => {
      const secretName = config.key;
      const secretValidation = validation.secrets[secretName];
      const localSecret = this.localSecrets[secretName];
      const vercelSecret = this.vercelSecrets[secretName];

      const secretReport = {
        name: secretName,
        required: config.required,
        environments: config.environments,
        local: {
          present: !!localSecret,
          source: localSecret?.source || null,
        },
        vercel: vercelSecret,
        status: secretValidation.status,
        ui_class: this.getUIClass(secretValidation.status),
        issues: secretValidation.issues,
        last_updated: this.syncResults[secretName]?.timestamp || null,
      };

      // Count for summary
      if (secretValidation.status.includes('✅')) {
        report.summary.synchronized++;
      } else if (secretValidation.status.includes('❌')) {
        report.summary.critical++;
      } else if (secretValidation.status.includes('⚠️')) {
        if (config.required) {
          report.summary.warnings++;
        } else {
          report.summary.optional_missing++;
        }
      }

      report.secrets[secretName] = secretReport;
    });

    // Generate recommendations
    if (report.summary.critical > 0) {
      report.recommendations.push({
        type: 'critical',
        message: 'Run `npm run sync:secrets:auto` to fix critical issues',
        action: 'sync:secrets:auto',
      });
    }

    if (report.summary.warnings > 0) {
      report.recommendations.push({
        type: 'warning',
        message: 'Review environment-specific secret requirements',
        action: 'review',
      });
    }

    // Save dashboard report
    const dashboardPath = path.join(process.cwd(), 'analytics-dashboard');
    fs.mkdirSync(dashboardPath, { recursive: true });

    const reportPath = path.join(dashboardPath, 'secret-sync-status.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Also generate a legacy compatible report
    const legacyReport = {
      timestamp: report.timestamp,
      secrets: {},
      status: validation.overall.valid ? 'synchronized' : 'needs_sync',
      environments: {
        local: Object.keys(this.localSecrets).length > 0,
        vercel: {
          production: true,
          preview: true,
          development: true,
        },
      },
    };

    Object.keys(report.secrets).forEach(key => {
      const secret = report.secrets[key];
      legacyReport.secrets[key] = {
        local: secret.local.present,
        vercel: {
          production: secret.vercel.production,
          preview: secret.vercel.preview,
          development: secret.vercel.development,
        },
      };
    });

    fs.writeFileSync(
      path.join(dashboardPath, 'deployment-status.json'),
      JSON.stringify(legacyReport, null, 2)
    );

    console.log(kleur.blue('📊 Dashboard reports saved:'));
    console.log(kleur.blue(`  - ${reportPath}`));
    console.log(kleur.blue(`  - ${path.join(dashboardPath, 'deployment-status.json')}`));

    return report;
  }

  // UI class helper for dashboard styling
  getUIClass(status) {
    if (status.includes('✅')) return 'secret-status success';
    if (status.includes('❌')) return 'secret-status error';
    if (status.includes('⚠️')) return 'secret-status warning';
    return 'secret-status unknown';
  }

  // Slack/webhook notifications
  async sendAlert(report) {
    if (!this.alertsEnabled) return;

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    const message = {
      text: '🔐 RinaWarp Terminal - Secret Sync Report',
      attachments: [
        {
          color: report.ui_status.overall === 'success' ? 'good' : 'danger',
          fields: [
            {
              title: 'Status',
              value: report.ui_status.message,
              short: true,
            },
            {
              title: 'Summary',
              value: `✅ ${report.summary.synchronized} | ⚠️ ${report.summary.warnings} | ❌ ${report.summary.critical}`,
              short: true,
            },
          ],
          footer: 'RinaWarp Secret Sync',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    try {
      const fetch = (await import('node-fetch')).default;
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
      console.log(kleur.green('✅ Alert sent to Slack'));
    } catch (error) {
      console.log(kleur.yellow(`⚠️  Failed to send Slack alert: ${error.message}`));
    }
  }

  // Main execution method
  async run(options = {}) {
    console.log(kleur.cyan('\n🔐 RinaWarp Terminal - Cross-Platform Secret Sync\n'));

    // Load local secrets
    const hasLocalSecrets = this.loadLocalSecrets();
    if (!hasLocalSecrets && !options.force) {
      console.log(kleur.yellow('No secrets found in local environment files.'));
      if (!options.dryRun) {
        console.log(kleur.yellow('Use --force to continue anyway.'));
        return false;
      }
    }

    // Load Vercel secrets
    const vercelConnected = await this.loadVercelSecrets();
    if (!vercelConnected) {
      console.log(kleur.red('Cannot connect to Vercel. Please run `vercel login` first.'));
      return false;
    }

    // Perform sync if requested
    if (options.sync && !options.dryRun) {
      await this.performSmartSync();
      // Reload Vercel secrets after sync
      await this.loadVercelSecrets();
    }

    // Validate consistency
    const validation = this.validateSecretConsistency();

    // Generate reports
    const report = this.generateDashboardReport(validation);

    // Send alerts if enabled
    if (options.alert || process.env.AUTO_ALERT === 'true') {
      await this.sendAlert(report);
    }

    // Display summary
    this.displaySummary(report);

    return validation.overall.valid;
  }

  displaySummary(report) {
    console.log('\n' + '='.repeat(80));
    console.log(kleur.cyan('📊 Cross-Platform Secret Sync Summary'));
    console.log('='.repeat(80));

    const { summary, ui_status } = report;

    if (ui_status.overall === 'success') {
      console.log(kleur.green('🎉 All secrets are synchronized across platforms!'));
    } else {
      console.log(kleur.yellow('⚠️  Some secrets need attention:'));
      console.log(kleur.green(`  ✅ Synchronized: ${summary.synchronized}`));
      console.log(kleur.yellow(`  ⚠️  Warnings: ${summary.warnings}`));
      console.log(kleur.red(`  ❌ Critical: ${summary.critical}`));
      console.log(kleur.blue(`  💡 Optional Missing: ${summary.optional_missing}`));
    }

    console.log('\n📈 Dashboard Integration:');
    console.log(kleur.blue('  Status API: /analytics-dashboard/secret-sync-status.json'));
    console.log(kleur.blue('  Legacy API: /analytics-dashboard/deployment-status.json'));

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => {
        const color = rec.type === 'critical' ? kleur.red : kleur.yellow;
        console.log(color(`  ${rec.message}`));
      });
    }

    console.log('='.repeat(80) + '\n');
  }
}

// CLI interface
const args = process.argv.slice(2);
const options = {
  sync: args.includes('--sync') || args.includes('-s'),
  force: args.includes('--force') || args.includes('-f'),
  dryRun: args.includes('--dry-run') || args.includes('--check'),
  alert: args.includes('--alert') || args.includes('-a'),
};

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔐 Cross-Platform Secret Synchronization Tool

Usage:
  node scripts/cross-platform-sync.js [options]

Options:
  --sync, -s       Automatically sync secrets to all platforms
  --dry-run        Check status without making changes  
  --force, -f      Continue even if no local secrets found
  --alert, -a      Send Slack notification (requires SLACK_WEBHOOK_URL)
  --help, -h       Show this help message

Examples:
  node scripts/cross-platform-sync.js --dry-run    # Check status only
  node scripts/cross-platform-sync.js --sync       # Sync all secrets
  node scripts/cross-platform-sync.js --sync --alert # Sync and notify

Environment Variables:
  SLACK_WEBHOOK_URL     # Webhook URL for Slack notifications
  AUTO_ALERT=true       # Enable automatic alerts on sync
`);
  process.exit(0);
}

// Run the sync
const sync = new CrossPlatformSecretSync();
sync
  .run(options)
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(kleur.red('❌ Sync failed:'), error.message);
    process.exit(1);
  });
