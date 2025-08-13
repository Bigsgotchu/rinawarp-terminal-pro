class FeatureManager {
  constructor() {
    this.featureDefinitions = {
      // Basic Features
      basic_terminal: {
        tiers: ['free', 'personal', 'professional', 'team', 'enterprise'],
        limits: {
          free: { sessions: 1 },
          personal: { sessions: 5 },
          professional: { sessions: 'unlimited' },
          team: { sessions: 'unlimited' },
          enterprise: { sessions: 'unlimited' },
        },
      },
      limited_ai: {
        tiers: ['free', 'personal', 'professional', 'team', 'enterprise'],
        limits: {
          free: { requests: 5 },
          personal: { requests: 100 },
          professional: { requests: 1000 },
          team: { requests: 5000 },
          enterprise: { requests: 'unlimited' },
        },
      },

      // AI Features
      ai_assistant: {
        tiers: ['personal', 'professional', 'team', 'enterprise'],
        limits: {
          personal: { requests: 100 },
          professional: { requests: 1000 },
          team: { requests: 5000 },
          enterprise: { requests: 'unlimited' },
        },
      },
      advanced_ai: {
        tiers: ['professional', 'team', 'enterprise'],
        limits: {
          professional: { models: ['gpt-3.5', 'claude-sonnet'] },
          team: { models: ['gpt-4', 'claude-sonnet', 'claude-opus'] },
          enterprise: { models: 'all' },
        },
      },

      // Terminal Features
      custom_themes: {
        tiers: ['personal', 'professional', 'team', 'enterprise'],
        limits: {
          personal: { themes: 5 },
          professional: { themes: 25 },
          team: { themes: 'unlimited' },
          enterprise: { themes: 'unlimited' },
        },
      },
      cloud_sync: {
        tiers: ['personal', 'professional', 'team', 'enterprise'],
        limits: {
          personal: { storage: '1GB' },
          professional: { storage: '10GB' },
          team: { storage: '100GB' },
          enterprise: { storage: 'unlimited' },
        },
      },

      // Team Features
      team_management: {
        tiers: ['team', 'enterprise'],
        limits: {
          team: { members: 10 },
          enterprise: { members: 'unlimited' },
        },
      },
      shared_configs: {
        tiers: ['team', 'enterprise'],
      },

      // Enterprise Features
      sso: {
        tiers: ['enterprise'],
      },
      dedicated_support: {
        tiers: ['enterprise'],
      },
      custom_integrations: {
        tiers: ['enterprise'],
      },
    };
  }

  hasFeature(userTier, featureName) {
    const feature = this.featureDefinitions[featureName];
    if (!feature) return false;

    return feature.tiers.includes(userTier);
  }

  getFeatureLimit(userTier, featureName) {
    const feature = this.featureDefinitions[featureName];
    if (!feature || !this.hasFeature(userTier, featureName)) {
      return null;
    }

    return feature.limits?.[userTier] || null;
  }

  getAvailableFeatures(userTier) {
    const available = [];

    for (const [featureName, feature] of Object.entries(this.featureDefinitions)) {
      if (feature.tiers.includes(userTier)) {
        available.push({
          name: featureName,
          limits: feature.limits?.[userTier] || null,
        });
      }
    }

    return available;
  }

  validateFeatureAccess(userTier, featureName, usage = {}) {
    if (!this.hasFeature(userTier, featureName)) {
      return {
        allowed: false,
        reason: 'Feature not available in your tier',
        upgradeRequired: true,
      };
    }

    const limits = this.getFeatureLimit(userTier, featureName);
    if (!limits) {
      return { allowed: true };
    }

    // Check usage against limits
    for (const [limitType, limitValue] of Object.entries(limits)) {
      if (limitValue === 'unlimited') continue;

      const currentUsage = usage[limitType] || 0;
      if (typeof limitValue === 'number' && currentUsage >= limitValue) {
        return {
          allowed: false,
          reason: `${limitType} limit exceeded (${currentUsage}/${limitValue})`,
          upgradeRequired: false,
        };
      }
    }

    return { allowed: true };
  }
}

module.exports = new FeatureManager();
