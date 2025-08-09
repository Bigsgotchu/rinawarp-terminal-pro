/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 8 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * 🚦 Feature Flags System
 * Risk-Based Progressive Rollout for RinaWarp Terminal
 *
 * Manages feature activation based on risk levels, user profiles,
 * and system performance metrics
 */

const EventEmitter = require('events');
const fs = require('node:fs').promises;
const path = require('node:path');

class FeatureFlagManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.configPath = options.configPath || path.join(__dirname, '../../config/feature-flags.json');
    this.runtimeMode = options.runtimeMode || process.env.RUNTIME_MODE || 'development';
    this.userProfile = options.userProfile || 'default';

    // Risk-based feature categories
    this.riskLevels = {
      STABLE: {
        emoji: '🟢',
        description: 'Production-ready, low risk',
        defaultEnabled: true,
        requiresApproval: false,
      },
      EXPERIMENTAL: {
        emoji: '🟡',
        description: 'Medium risk, testing phase',
        defaultEnabled: false,
        requiresApproval: true,
      },
      DANGEROUS: {
        emoji: '🔴',
        description: 'High risk, development only',
        defaultEnabled: false,
        requiresApproval: true,
        requiresPerformanceCheck: true,
      },
    };

    // Feature registry with risk classifications
    this.featureRegistry = {
      // Core Terminal Features (STABLE)
      coreTerminal: {
        name: 'Core Terminal Engine',
        risk: 'STABLE',
        enabled: true,
        dependencies: [],
        description: 'v1.0.7 proven terminal engine',
      },
      legacyThemes: {
        name: 'Legacy Theme System',
        risk: 'STABLE',
        enabled: true,
        dependencies: ['coreTerminal'],
        description: 'Original oceanic theme system',
      },

      // Enhanced Features (EXPERIMENTAL)
      advancedThemes: {
        name: 'Advanced Multi-Theme System',
        risk: 'EXPERIMENTAL',
        enabled: false,
        dependencies: ['coreTerminal'],
        description: '6+ themes with smooth transitions',
        performanceImpact: 'medium',
      },
      hybridEmail: {
        name: 'Hybrid Email Service',
        risk: 'EXPERIMENTAL',
        enabled: false,
        dependencies: [],
        description: 'SendGrid + Nodemailer fallback system',
      },
      performanceMonitoring: {
        name: 'Real-time Performance Monitoring',
        risk: 'EXPERIMENTAL',
        enabled: false,
        dependencies: [],
        description: 'GCP-based analytics and monitoring',
      },

      // Enterprise Features (DANGEROUS - High complexity)
      discordBot: {
        name: 'Discord Bot Integration',
        risk: 'DANGEROUS',
        enabled: false,
        dependencies: [],
        description: 'Community Discord bot with slash commands',
        performanceImpact: 'high',
        memoryRequirement: '50MB+',
      },
      mobileCompanion: {
        name: 'React Native Mobile Companion',
        risk: 'DANGEROUS',
        enabled: false,
        dependencies: ['performanceMonitoring'],
        description: 'Mobile app for remote terminal monitoring',
        performanceImpact: 'high',
      },
      aiAssistant: {
        name: 'Advanced AI Assistant',
        risk: 'DANGEROUS',
        enabled: false,
        dependencies: ['performanceMonitoring'],
        description: 'Context-aware AI with multiple models',
        performanceImpact: 'very-high',
        memoryRequirement: '100MB+',
      },
      voiceRecognition: {
        name: 'Enhanced Voice Recognition',
        risk: 'DANGEROUS',
        enabled: false,
        dependencies: ['aiAssistant'],
        description: 'Multi-provider voice engine',
        performanceImpact: 'high',
      },
    };

    // Performance monitoring for feature impact
    this.performanceMetrics = {
      startupTime: null,
      memoryUsage: null,
      featureLoadTimes: new Map(),
      errors: [],
    };

    this.initialized = false;
  }

  async initialize() {
    console.log('🚦 Initializing Feature Flag Manager...');

    try {
      await this.loadConfiguration();
      await this.validateDependencies();
      await this.checkPerformanceConstraints();

      this.initialized = true;
      this.emit('initialized');

      console.log('✅ Feature Flag Manager ready');
      this.logEnabledFeatures();
    } catch (error) {
      console.error('❌ Feature Flag Manager initialization failed:', error);
      throw new Error(new Error(error));
    }
  }

  async loadConfiguration() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      const config = JSON.parse(configData);

      // Merge with runtime overrides
      for (const [featureName, settings] of Object.entries(config.features || {})) {
        if (this.featureRegistry[featureName]) {
          this.featureRegistry[featureName] = { ...this.featureRegistry[featureName], ...settings };
        }
      }

      // Apply environment-specific rules
      this.applyEnvironmentRules();
    } catch (error) {
      console.warn('⚠️  Could not load feature config, using defaults:', error.message);
    }
  }

  applyEnvironmentRules() {
    switch (this.runtimeMode) {
      case 'production':
        // Only stable features in production
        Object.keys(this.featureRegistry).forEach(key => {
          if (this.featureRegistry[key].risk !== 'STABLE') {
            this.featureRegistry[key].enabled = false;
          }
        });
        break;

      case 'staging':
        // Stable + experimental in staging
        Object.keys(this.featureRegistry).forEach(key => {
          if (this.featureRegistry[key].risk === 'DANGEROUS') {
            this.featureRegistry[key].enabled = false;
          }
        });
        break;

      case 'development':
        // Enable experimental features in development for testing
        Object.keys(this.featureRegistry).forEach(key => {
          if (this.featureRegistry[key].risk === 'EXPERIMENTAL') {
            this.featureRegistry[key].enabled = true;
          }
          // Keep dangerous features disabled by default but allow manual enablement
        });
        break;
    }
  }

  async validateDependencies() {
    for (const [featureName, feature] of Object.entries(this.featureRegistry)) {
      if (feature.enabled && feature.dependencies) {
        for (const dependency of feature.dependencies) {
          if (!this.featureRegistry[dependency]?.enabled) {
            console.warn(`⚠️  Disabling ${featureName}: dependency ${dependency} not enabled`);
            feature.enabled = false;
            break;
          }
        }
      }
    }
  }

  async checkPerformanceConstraints() {
    const enabledFeatures = Object.entries(this.featureRegistry).filter(
      ([_, feature]) => feature.enabled
    );

    // Calculate memory requirements
    let totalMemoryRequirement = 0;
    for (const [_, feature] of enabledFeatures) {
      if (feature.memoryRequirement) {
        const memory = parseInt(feature.memoryRequirement.replace(/[^\d]/g, '')) || 0;
        totalMemoryRequirement += memory;
      }
    }

    // Check system constraints
    if (totalMemoryRequirement > 200) {
      // 200MB limit
      console.warn(`⚠️  High memory usage projected: ${totalMemoryRequirement}MB`);
      this.emit('performance-warning', {
        type: 'memory',
        projected: totalMemoryRequirement,
      });
    }
  }

  isEnabled(featureName) {
    if (!this.initialized) {
      console.warn(`⚠️  Feature flag check before initialization: ${featureName}`);
      return false;
    }

    const feature = this.featureRegistry[featureName];
    if (!feature) {
      console.warn(`⚠️  Unknown feature flag: ${featureName}`);
      return false;
    }

    return feature.enabled === true;
  }

  async enableFeature(featureName, options = {}) {
    const feature = this.featureRegistry[featureName];
    if (!feature) {
      throw new Error(new Error(new Error(`Unknown feature: ${featureName}`)));
    }

    // Risk-based validation
    if (feature.risk === 'DANGEROUS' && !options.force) {
      if (this.runtimeMode === 'production') {
        throw new Error(
          new Error(new Error(`Cannot enable dangerous feature ${featureName} in production`))
        );
      }

      if (!options.approvedBy) {
        throw new Error(new Error(new Error(`Dangerous feature ${featureName} requires approval`)));
      }
    }

    // Performance check
    if (feature.performanceImpact === 'very-high') {
      const startTime = Date.now();
      await this.performanceCheck();
      const checkTime = Date.now() - startTime;

      if (checkTime > 100) {
        console.warn(`⚠️  System showing performance stress (${checkTime}ms check time)`);
      }
    }

    // Enable with monitoring
    feature.enabled = true;
    feature.enabledAt = Date.now();
    feature.enabledBy = options.approvedBy || 'system';

    console.log(
      `✅ Feature enabled: ${feature.name} (${this.riskLevels[feature.risk].emoji} ${feature.risk})`
    );

    this.emit('feature-enabled', { featureName, feature });
    await this.saveConfiguration();
  }

  async disableFeature(featureName, reason = 'manual') {
    const feature = this.featureRegistry[featureName];
    if (!feature) {
      throw new Error(new Error(new Error(`Unknown feature: ${featureName}`)));
    }

    // Check for dependent features
    const dependents = Object.entries(this.featureRegistry).filter(
      ([_, f]) => f.dependencies?.includes(featureName) && f.enabled
    );

    if (dependents.length > 0) {
      console.warn(
        `⚠️  Disabling dependent features: ${dependents.map(([name, _]) => name).join(', ')}`
      );
      for (const [dependentName, _] of dependents) {
        await this.disableFeature(dependentName, `dependency-${featureName}-disabled`);
      }
    }

    feature.enabled = false;
    feature.disabledAt = Date.now();
    feature.disabledReason = reason;

    console.log(`🔄 Feature disabled: ${feature.name} (${reason})`);

    this.emit('feature-disabled', { featureName, feature, reason });
    await this.saveConfiguration();
  }

  async performanceCheck() {
    const startTime = Date.now();
    const memUsage = process.memoryUsage();

    this.performanceMetrics.startupTime = startTime;
    this.performanceMetrics.memoryUsage = memUsage.heapUsed;

    // If memory usage is too high, suggest feature reduction
    if (memUsage.heapUsed > 200 * 1024 * 1024) {
      // 200MB
      console.warn('🔥 High memory usage detected, consider disabling heavy features');

      // Auto-disable non-critical dangerous features
      const heavyFeatures = Object.entries(this.featureRegistry).filter(
        ([_, f]) => f.enabled && f.risk === 'DANGEROUS' && f.performanceImpact === 'very-high'
      );

      for (const [featureName, _] of heavyFeatures) {
        await this.disableFeature(featureName, 'auto-performance-optimization');
      }
    }
  }

  getEnabledFeatures() {
    return Object.entries(this.featureRegistry)
      .filter(([_, feature]) => feature.enabled)
      .map(([name, feature]) => ({
        name,
        displayName: feature.name,
        risk: feature.risk,
        emoji: this.riskLevels[feature.risk].emoji,
      }));
  }

  getRiskSummary() {
    const summary = { STABLE: 0, EXPERIMENTAL: 0, DANGEROUS: 0 };

    Object.values(this.featureRegistry).forEach(feature => {
      if (feature.enabled) {
        summary[feature.risk]++;
      }
    });

    return summary;
  }

  logEnabledFeatures() {
    const enabled = this.getEnabledFeatures();
    const riskSummary = this.getRiskSummary();

    console.log('\n🎯 Feature Flag Status:');
    console.log(`   ${this.riskLevels.STABLE.emoji} Stable: ${riskSummary.STABLE}`);
    console.log(
      `   ${this.riskLevels.EXPERIMENTAL.emoji} Experimental: ${riskSummary.EXPERIMENTAL}`
    );
    console.log(`   ${this.riskLevels.DANGEROUS.emoji} Dangerous: ${riskSummary.DANGEROUS}`);

    if (enabled.length > 0) {
      console.log('\n📋 Enabled Features:');
      enabled.forEach(feature => {
        console.log(`   ${feature.emoji} ${feature.displayName}`);
      });
    }
  }

  async saveConfiguration() {
    const config = {
      lastUpdated: new Date().toISOString(),
      runtimeMode: this.runtimeMode,
      userProfile: this.userProfile,
      features: {},
    };

    // Save only dynamic settings
    Object.entries(this.featureRegistry).forEach(([name, feature]) => {
      config.features[name] = {
        enabled: feature.enabled,
        enabledAt: feature.enabledAt,
        enabledBy: feature.enabledBy,
        disabledAt: feature.disabledAt,
        disabledReason: feature.disabledReason,
      };
    });

    try {
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.warn('⚠️  Could not save feature configuration:', error.message);
    }
  }

  // Convenience methods for common feature checks
  get features() {
    return {
      // Core features
      coreTerminal: () => this.isEnabled('coreTerminal'),
      legacyThemes: () => this.isEnabled('legacyThemes'),

      // Enhanced features
      advancedThemes: () => this.isEnabled('advancedThemes'),
      hybridEmail: () => this.isEnabled('hybridEmail'),
      performanceMonitoring: () => this.isEnabled('performanceMonitoring'),

      // Enterprise features
      discordBot: () => this.isEnabled('discordBot'),
      mobileCompanion: () => this.isEnabled('mobileCompanion'),
      aiAssistant: () => this.isEnabled('aiAssistant'),
      voiceRecognition: () => this.isEnabled('voiceRecognition'),

      // Convenience combinations
      hasEnterpriseFeatures: () =>
        this.isEnabled('discordBot') || this.isEnabled('mobileCompanion'),
      hasAdvancedUI: () => this.isEnabled('advancedThemes'),
      hasAI: () => this.isEnabled('aiAssistant') || this.isEnabled('voiceRecognition'),
    };
  }
}

// Singleton instance
let globalFeatureFlags = null;

function createFeatureFlags(options = {}) {
  if (!globalFeatureFlags) {
    globalFeatureFlags = new FeatureFlagManager(options);
  }
  return globalFeatureFlags;
}

function getFeatureFlags() {
  if (!globalFeatureFlags) {
    throw new Error(
      new Error(new Error('Feature flags not initialized. Call createFeatureFlags() first.'))
    );
  }
  return globalFeatureFlags;
}

// Export both class and convenience functions
module.exports = {
  FeatureFlagManager,
  createFeatureFlags,
  getFeatureFlags,

  // Convenience function for quick checks
  isEnabled: featureName => {
    try {
      return getFeatureFlags().isEnabled(featureName);
    } catch {
      return false;
    }
  },
};
