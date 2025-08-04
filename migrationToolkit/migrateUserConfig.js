#!/usr/bin/env node
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * 🧜‍♀️ RinaWarp Terminal - Configuration Migration Script
 *
 * Smart transformation of user configurations from v1.0.7 to v1.0.19
 * Preserves user preferences while enabling new features
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { UserDataBackup } from './backupUserData.js';

class ConfigurationMigrator {
  constructor(options = {}) {
    this.options = {
      backup: options.backup !== false,
      verify: options.verify !== false,
      verbose: options.verbose || false,
      dryRun: options.dryRun || false,
      preserveLegacy: options.preserveLegacy !== false,
      ...options,
    };

    this.migrationRules = this.defineMigrationRules();
    this.migrationResults = {
      success: false,
      changes: [],
      warnings: [],
      errors: [],
      backupPath: null,
    };
  }

  /**
   * Main migration process
   */
  async migrate() {
    try {
      this.log('🧜‍♀️ Starting configuration migration v1.0.7 → v1.0.19...');

      // Step 1: Create backup if requested
      if (this.options.backup) {
        await this.createMigrationBackup();
      }

      // Step 2: Detect existing configuration format
      const existingConfig = await this.detectExistingConfiguration();

      // Step 3: Transform configuration
      const newConfig = await this.transformConfiguration(existingConfig);

      // Step 4: Validate new configuration
      if (this.options.verify) {
        await this.validateConfiguration(newConfig);
      }

      // Step 5: Write new configuration
      if (!this.options.dryRun) {
        await this.writeNewConfiguration(newConfig);
        await this.updateEnvironmentFiles();
        await this.createFeatureFlagConfig();
      }

      // Step 6: Generate migration report
      await this.generateMigrationReport();

      this.migrationResults.success = true;
      this.log('✅ Configuration migration completed successfully!');

      return this.migrationResults;
    } catch (error) {
      this.log(`❌ Migration failed: ${error.message}`, 'error');
      this.migrationResults.errors.push(error.message);
      throw new Error(new Error(error));
    }
  }

  /**
   * Create backup before migration
   */
  async createMigrationBackup() {
    this.log('📦 Creating pre-migration backup...');

    const backup = new UserDataBackup({
      verbose: this.options.verbose,
      dryRun: this.options.dryRun,
    });

    const result = await backup.backup();
    this.migrationResults.backupPath = result.backupPath;

    this.log(`✅ Backup created: ${result.backupPath}`);
  }

  /**
   * Detect existing configuration format and version
   */
  async detectExistingConfiguration() {
    this.log('🔍 Detecting existing configuration...');

    const configSources = [
      { path: '.rinawarprc', format: 'json', priority: 1 },
      { path: 'user-config.json', format: 'json', priority: 2 },
      { path: 'terminal-config.json', format: 'json', priority: 3 },
      { path: 'preferences.json', format: 'json', priority: 4 },
      { path: path.join(os.homedir(), '.rinawarp/config.json'), format: 'json', priority: 5 },
    ];

    let existingConfig = {};
    let configSource = null;

    // Find the highest priority existing config
    for (const source of configSources.sort((a, b) => a.priority - b.priority)) {
      if (fs.existsSync(source.path)) {
        try {
          const configContent = fs.readFileSync(source.path, 'utf8');
          existingConfig = JSON.parse(configContent);
          configSource = source;
          this.log(`📝 Found configuration: ${source.path}`);
          break;
        } catch (error) {
          this.log(`⚠️ Could not parse ${source.path}: ${error.message}`, 'warn');
        }
      }
    }

    // Detect version
    const detectedVersion = this.detectConfigVersion(existingConfig);
    this.log(`🔍 Detected configuration version: ${detectedVersion}`);

    return {
      version: detectedVersion,
      source: configSource,
      config: existingConfig,
    };
  }

  /**
   * Detect configuration version based on structure
   */
  detectConfigVersion(config) {
    // Check for v1.0.19 specific features
    if (config.features && config.monitoring) {
      return '1.0.19';
    }

    // Check for v1.0.7 specific structure
    if (config.sendgridAPIKey || config.appearance) {
      return '1.0.7';
    }

    // Default to legacy if unclear
    return 'legacy';
  }

  /**
   * Transform configuration based on migration rules
   */
  async transformConfiguration(existingConfig) {
    this.log('🔄 Transforming configuration...');

    const { version, config } = existingConfig;
    let newConfig = {
      version: '1.0.19',
      migrated: true,
      migratedFrom: version,
      migratedAt: new Date().toISOString(),
      ...this.getDefaultV1019Config(),
    };

    // Apply version-specific transformations
    if (version === '1.0.7') {
      newConfig = await this.migrateFromV107(config, newConfig);
    } else if (version === 'legacy') {
      newConfig = await this.migrateFromLegacy(config, newConfig);
    } else if (version === '1.0.19') {
      this.log('ℹ️ Configuration is already v1.0.19 format', 'info');
      return config;
    }

    // Apply transformation rules
    newConfig = await this.applyMigrationRules(config, newConfig);

    this.log(
      `✅ Configuration transformed (${Object.keys(this.migrationResults.changes).length} changes)`
    );
    return newConfig;
  }

  /**
   * Get default v1.0.19 configuration structure
   */
  getDefaultV1019Config() {
    return {
      terminal: {
        theme: 'oceanic',
        fontSize: 14,
        fontFamily: 'Monaco, Consolas, monospace',
        cursorBlink: true,
        scrollback: 1000,
        glowEffects: false,
        smoothTransitions: true,
        responsiveDesign: true,
      },
      email: {
        provider: 'sendgrid',
        fallbackEnabled: true,
        rateLimitPerHour: 100,
        templates: {
          welcome: 'default',
          notification: 'default',
        },
      },
      monitoring: {
        enabled: true,
        level: 'basic',
        interval: 60000,
        gcpEnabled: false,
        metricsRetention: '7d',
        realTimeUpdates: true,
      },
      features: {
        discordBot: false,
        mobileCompanion: true,
        voiceRecognition: false,
        aiAssistant: false,
        performanceOptimization: true,
        advancedThemes: true,
      },
      security: {
        encryptionEnabled: true,
        sessionTimeout: 3600000,
        maxLoginAttempts: 5,
        auditLogging: true,
        csrfProtection: true,
        rateLimiting: true,
      },
      ui: {
        animations: true,
        soundEffects: false,
        notifications: true,
        compactMode: false,
        darkMode: true,
        accessibility: {
          highContrast: false,
          reduceMotion: false,
          screenReader: false,
        },
      },
      performance: {
        progressiveLoading: true,
        caching: true,
        compressionEnabled: true,
        lazyLoading: true,
      },
    };
  }

  /**
   * Migrate from v1.0.7 configuration
   */
  async migrateFromV107(oldConfig, newConfig) {
    this.log('🔄 Applying v1.0.7 → v1.0.19 transformations...');

    // Terminal settings migration
    if (oldConfig.appearance) {
      newConfig.terminal.theme = this.mapLegacyTheme(oldConfig.appearance);
      this.addChange('terminal.theme', oldConfig.appearance, newConfig.terminal.theme);
    }

    if (oldConfig.fontSize) {
      newConfig.terminal.fontSize = oldConfig.fontSize;
      this.addChange('terminal.fontSize', 'default', oldConfig.fontSize);
    }

    if (oldConfig.fontFamily) {
      newConfig.terminal.fontFamily = oldConfig.fontFamily;
      this.addChange('terminal.fontFamily', 'default', oldConfig.fontFamily);
    }

    if (oldConfig.enableEffects !== undefined) {
      newConfig.terminal.glowEffects = oldConfig.enableEffects;
      this.addChange('terminal.glowEffects', false, oldConfig.enableEffects);
    }

    // Email configuration migration
    if (oldConfig.sendgridAPIKey) {
      // Keep SendGrid as primary but enable fallback
      newConfig.email.provider = 'sendgrid';
      newConfig.email.sendgrid = {
        apiKey: '${SENDGRID_API_KEY}', // Reference to environment variable
      };
      this.addChange('email.provider', 'hybrid', 'sendgrid-primary');
      this.addWarning('SendGrid API key needs to be set in environment variables');
    }

    // Monitoring migration
    if (oldConfig.useTelemetry !== undefined) {
      newConfig.monitoring.enabled = oldConfig.useTelemetry;
      newConfig.monitoring.level = oldConfig.useTelemetry ? 'standard' : 'basic';
      this.addChange('monitoring.enabled', false, oldConfig.useTelemetry);
    }

    // Security migration
    if (oldConfig.enableSecurity !== undefined) {
      newConfig.security.encryptionEnabled = oldConfig.enableSecurity;
      this.addChange('security.encryptionEnabled', true, oldConfig.enableSecurity);
    }

    // Mobile companion (new feature, conservative default)
    if (oldConfig.enableMobile !== undefined) {
      newConfig.features.mobileCompanion = oldConfig.enableMobile;
    } else {
      newConfig.features.mobileCompanion = false; // Conservative default
    }

    return newConfig;
  }

  /**
   * Migrate from legacy configuration
   */
  async migrateFromLegacy(oldConfig, newConfig) {
    this.log('🔄 Applying legacy → v1.0.19 transformations...');

    // Basic terminal settings
    Object.assign(newConfig.terminal, {
      theme: oldConfig.theme || 'oceanic',
      fontSize: oldConfig.fontSize || 14,
      fontFamily: oldConfig.fontFamily || newConfig.terminal.fontFamily,
    });

    // Conservative feature defaults for legacy users
    Object.assign(newConfig.features, {
      discordBot: false,
      mobileCompanion: false,
      voiceRecognition: false,
      aiAssistant: false,
    });

    // Basic monitoring only
    Object.assign(newConfig.monitoring, {
      enabled: false,
      level: 'basic',
    });

    this.addChange('migration.type', null, 'legacy-to-v1.0.19');

    return newConfig;
  }

  /**
   * Apply specific migration rules
   */
  async applyMigrationRules(oldConfig, newConfig) {
    for (const rule of this.migrationRules) {
      if (rule.condition(oldConfig)) {
        newConfig = rule.transform(oldConfig, newConfig);
        this.log(`✅ Applied rule: ${rule.name}`);
      }
    }

    return newConfig;
  }

  /**
   * Define migration transformation rules
   */
  defineMigrationRules() {
    return [
      {
        name: 'Preserve custom keybindings',
        condition: config => config.keybindings && Object.keys(config.keybindings).length > 0,
        transform: (oldConfig, newConfig) => {
          newConfig.keybindings = oldConfig.keybindings;
          this.addChange('keybindings', null, 'preserved');
          return newConfig;
        },
      },
      {
        name: 'Migrate color customizations',
        condition: config => config.colors || config.colorScheme,
        transform: (oldConfig, newConfig) => {
          if (oldConfig.colors) {
            newConfig.terminal.customColors = oldConfig.colors;
            this.addChange('terminal.customColors', null, 'migrated');
          }
          return newConfig;
        },
      },
      {
        name: 'Preserve window preferences',
        condition: config => config.window,
        transform: (oldConfig, newConfig) => {
          newConfig.window = {
            width: oldConfig.window.width || 1200,
            height: oldConfig.window.height || 800,
            position: oldConfig.window.position || 'center',
            ...oldConfig.window,
          };
          this.addChange('window', null, 'preserved');
          return newConfig;
        },
      },
      {
        name: 'Migrate plugin configurations',
        condition: config => config.plugins,
        transform: (oldConfig, newConfig) => {
          newConfig.plugins = oldConfig.plugins;
          this.addChange('plugins', null, 'preserved');
          return newConfig;
        },
      },
    ];
  }

  /**
   * Map legacy theme names to new theme names
   */
  mapLegacyTheme(legacyTheme) {
    const themeMap = {
      default: 'oceanic',
      dark: 'oceanic',
      light: 'minimal',
      blue: 'oceanic',
      green: 'neon',
      purple: 'glassmorphic',
      ocean: 'oceanic',
      cyber: 'neon',
    };

    return themeMap[legacyTheme] || 'oceanic';
  }

  /**
   * Validate the new configuration
   */
  async validateConfiguration(config) {
    this.log('🔍 Validating new configuration...');

    const validationRules = [
      {
        name: 'Required fields present',
        validate: cfg => cfg.version && cfg.terminal && cfg.email && cfg.monitoring,
      },
      {
        name: 'Theme is valid',
        validate: cfg =>
          ['oceanic', 'neon', 'glassmorphic', 'minimal', 'high-contrast'].includes(
            cfg.terminal.theme
          ),
      },
      {
        name: 'Email provider is valid',
        validate: cfg => ['sendgrid', 'nodemailer', 'hybrid'].includes(cfg.email.provider),
      },
      {
        name: 'Monitoring level is valid',
        validate: cfg => ['basic', 'standard', 'advanced'].includes(cfg.monitoring.level),
      },
    ];

    let validationErrors = 0;
    for (const rule of validationRules) {
      if (!rule.validate(config)) {
        this.addError(`Validation failed: ${rule.name}`);
        validationErrors++;
      }
    }

    if (validationErrors > 0) {
      throw new Error(new Error(new Error(`Configuration validation failed with ${validationErrors} errors`)));
    }

    this.log('✅ Configuration validation passed');
  }

  /**
   * Write the new configuration to files
   */
  async writeNewConfiguration(config) {
    this.log('💾 Writing new configuration files...');

    // Main configuration file
    const configPath = 'user-config.json';
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    this.log(`✅ Written: ${configPath}`);

    // Theme-specific configuration
    const themeConfigPath = 'theme-config.json';
    const themeConfig = {
      currentTheme: config.terminal.theme,
      customizations: {
        fontSize: config.terminal.fontSize,
        fontFamily: config.terminal.fontFamily,
        glowEffects: config.terminal.glowEffects,
        customColors: config.terminal.customColors,
      },
      availableThemes: ['oceanic', 'neon', 'glassmorphic', 'minimal', 'high-contrast', 'custom'],
    };
    fs.writeFileSync(themeConfigPath, JSON.stringify(themeConfig, null, 2));
    this.log(`✅ Written: ${themeConfigPath}`);

    // Legacy compatibility file (if preserving legacy)
    if (this.options.preserveLegacy) {
      const legacyConfigPath = '.rinawarprc.legacy';
      fs.writeFileSync(legacyConfigPath, JSON.stringify(config, null, 2));
      this.log(`✅ Written: ${legacyConfigPath} (legacy compatibility)`);
    }
  }

  /**
   * Update environment files with new configuration
   */
  async updateEnvironmentFiles() {
    this.log('🔧 Updating environment configuration...');

    const envUpdates = [
      '# RinaWarp Terminal v1.0.19 Configuration',
      '# Generated during migration on ' + new Date().toISOString(),
      '',
      '# Email Configuration (choose one)',
      '# SENDGRID_API_KEY=your_sendgrid_api_key_here',
      '# SMTP_HOST=smtp.gmail.com',
      '# SMTP_PORT=587',
      '# SMTP_USER=your_email@gmail.com',
      '# SMTP_PASS=your_app_password',
      '',
      '# Feature Flags',
      'ENABLE_DISCORD=false',
      'ENABLE_MOBILE=true',
      'MONITORING_LEVEL=basic',
      'THEME_EFFECTS=disabled',
      '',
      '# Performance Settings',
      'PROGRESSIVE_LOADING=true',
      'ENABLE_CACHING=true',
      '',
      '# Security Settings',
      'ENABLE_AUDIT_LOGGING=true',
      'SESSION_TIMEOUT=3600000',
      'MAX_LOGIN_ATTEMPTS=5',
      '',
    ];

    // Update .env.template
    const envTemplatePath = '.env.template';
    if (!fs.existsSync(envTemplatePath) || this.options.forceEnvUpdate) {
      fs.writeFileSync(envTemplatePath, envUpdates.join('\n'));
      this.log(`✅ Updated: ${envTemplatePath}`);
    }

    // Create .env.migration for user reference
    const envMigrationPath = '.env.migration';
    fs.writeFileSync(envMigrationPath, envUpdates.join('\n'));
    this.log(`✅ Created: ${envMigrationPath} (migration reference)`);
  }

  /**
   * Create feature flag configuration
   */
  async createFeatureFlagConfig() {
    this.log('🚩 Creating feature flag configuration...');

    const featureFlagConfig = {
      version: '1.0.19',
      flags: {
        discordBot: {
          enabled: false,
          description: 'Discord bot integration for community management',
          dependencies: ['discord.js'],
          rolloutStrategy: 'opt-in',
        },
        mobileCompanion: {
          enabled: true,
          description: 'React Native companion app for monitoring',
          dependencies: ['react-native'],
          rolloutStrategy: 'gradual',
        },
        advancedMonitoring: {
          enabled: false,
          description: 'Advanced monitoring with GCP integration',
          dependencies: ['@google-cloud/monitoring'],
          rolloutStrategy: 'enterprise',
        },
        voiceRecognition: {
          enabled: false,
          description: 'Enhanced voice command system',
          dependencies: ['voice-engine'],
          rolloutStrategy: 'beta',
        },
        aiAssistant: {
          enabled: false,
          description: 'AI-powered terminal assistant',
          dependencies: ['openai'],
          rolloutStrategy: 'beta',
        },
        glowEffects: {
          enabled: false,
          description: 'Visual glow effects and animations',
          dependencies: [],
          rolloutStrategy: 'opt-in',
        },
      },
      rolloutProfiles: {
        conservative: ['mobileCompanion'],
        standard: ['mobileCompanion', 'advancedMonitoring'],
        advanced: ['mobileCompanion', 'advancedMonitoring', 'voiceRecognition', 'glowEffects'],
        enterprise: ['mobileCompanion', 'advancedMonitoring', 'discordBot', 'aiAssistant'],
      },
    };

    fs.writeFileSync('feature-flags.json', JSON.stringify(featureFlagConfig, null, 2));
    this.log(`✅ Created: feature-flags.json`);
  }

  /**
   * Generate migration report
   */
  async generateMigrationReport() {
    const report = {
      migration: {
        timestamp: new Date().toISOString(),
        success: this.migrationResults.success,
        version: {
          from: 'v1.0.7',
          to: 'v1.0.19',
        },
      },
      changes: this.migrationResults.changes,
      warnings: this.migrationResults.warnings,
      errors: this.migrationResults.errors,
      nextSteps: [
        'Review environment configuration in .env.migration',
        'Update API keys and credentials as needed',
        'Run npm install to install new dependencies',
        'Test application with npm run test:migration',
        'Configure feature flags in feature-flags.json',
        'Start application with npm start',
      ],
      support: {
        documentation: 'docs/migration-guide.md',
        troubleshooting: 'docs/troubleshooting.md',
        community: 'https://discord.gg/rinawarp',
        email: 'rinawarptechnologies25@gmail.com',
      },
    };

    const reportPath = 'migration-report.json';
    if (!this.options.dryRun) {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    }

    this.log(`📋 Generated migration report: ${reportPath}`);

    // Print summary
    this.printMigrationSummary(report);
  }

  /**
   * Print migration summary
   */
  printMigrationSummary(report) {
    console.log(`⚠️ Warnings: ${report.warnings.length}`);
    console.log(`❌ Errors: ${report.errors.length}`);

    if (report.changes.length > 0) {
      for (const change of report.changes.slice(0, 10)) {
        // Show first 10
      }
      if (report.changes.length > 10) {
      }
    }

    if (report.warnings.length > 0) {
      for (const warning of report.warnings) {
      }
    }

    if (report.errors.length > 0) {
      for (const error of report.errors) {
      }
    }

    for (const step of report.nextSteps.slice(0, 5)) {
      // Show first 5 steps
    }
  }

  /**
   * Helper methods for tracking changes
   */
  addChange(field, from, to) {
    this.migrationResults.changes.push({ field, from, to, timestamp: new Date().toISOString() });
  }

  addWarning(message) {
    this.migrationResults.warnings.push(message);
    this.log(`⚠️ Warning: ${message}`, 'warn');
  }

  addError(message) {
    this.migrationResults.errors.push(message);
    this.log(`❌ Error: ${message}`, 'error');
  }

  /**
   * Logging utility
   */
  log(message, level = 'info') {
    if (!this.options.verbose && level === 'debug') return;

    const prefix =
      {
        info: '💙',
        warn: '⚠️',
        error: '❌',
        debug: '🔍',
      }[level] || '📝';
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {
    backup: !args.includes('--no-backup'),
    verify: !args.includes('--no-verify'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    dryRun: args.includes('--dry-run'),
    preserveLegacy: !args.includes('--no-legacy'),
    forceEnvUpdate: args.includes('--force-env'),
  };

  const migrator = new ConfigurationMigrator(options);

  migrator
    .migrate()
    .then(result => {
      if (result.success) {
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('\n❌ Migration failed:', error.message);
      console.error('🆘 Restore backup with: node migrationToolkit/rollback.js');
      process.exit(1);
    });
}

export { ConfigurationMigrator };
export default ConfigurationMigrator;
