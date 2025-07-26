/**
 * RinaWarp Terminal - Pricing Tier Configuration
 * Defines all features and limits for each pricing tier
 */

export const PRICING_TIERS = {
  free: {
    name: 'Free Hobbyist',
    price: 0,
    icon: '🆓',
    features: {
      // Terminal Features
      terminal_basic: true,
      terminal_tabs: 1,
      terminal_split_panes: false,
      terminal_themes: ['default', 'dark', 'light'], // Only 3 basic themes
      terminal_custom_themes: false,

      // AI Features
      ai_assistant: false,
      ai_voice_control: false,
      ai_command_suggestions: false,
      ai_advanced: false,
      ai_query_limit: 0,

      // Cloud Features
      cloud_sync: false,
      cloud_devices: 0,
      cloud_storage_mb: 0,

      // Development Features
      ssh_key_management: false,
      plugin_system: false,
      custom_plugins: false,
      advanced_scripting: false,

      // Team Features
      team_collaboration: false,
      shared_configs: false,
      team_analytics: false,
      admin_dashboard: false,

      // Support
      support_level: 'community',
      support_response_time: 'none',

      // Limits
      command_history_limit: 100,
      saved_sessions: 1,
      export_formats: ['txt'],
    },
  },

  personal: {
    name: 'Reef Explorer',
    price: 15,
    icon: '🐟',
    features: {
      // Terminal Features
      terminal_basic: true,
      terminal_tabs: -1, // Unlimited
      terminal_split_panes: true,
      terminal_themes: 'all', // All 20+ themes
      terminal_custom_themes: false,

      // AI Features
      ai_assistant: true,
      ai_voice_control: true,
      ai_command_suggestions: true,
      ai_advanced: false,
      ai_query_limit: 100, // Per day

      // Cloud Features
      cloud_sync: true,
      cloud_devices: 3,
      cloud_storage_mb: 100,

      // Development Features
      ssh_key_management: false,
      plugin_system: false,
      custom_plugins: false,
      advanced_scripting: false,

      // Team Features
      team_collaboration: false,
      shared_configs: false,
      team_analytics: false,
      admin_dashboard: false,

      // Support
      support_level: 'email',
      support_response_time: '48h',

      // Limits
      command_history_limit: 10000,
      saved_sessions: 10,
      export_formats: ['txt', 'json', 'csv'],
    },
  },

  professional: {
    name: 'Mermaid Pro',
    price: 25,
    icon: '🧜‍♀️',
    popular: true,
    features: {
      // Terminal Features
      terminal_basic: true,
      terminal_tabs: -1,
      terminal_split_panes: true,
      terminal_themes: 'all',
      terminal_custom_themes: true,

      // AI Features
      ai_assistant: true,
      ai_voice_control: true,
      ai_command_suggestions: true,
      ai_advanced: true,
      ai_query_limit: -1, // Unlimited

      // Cloud Features
      cloud_sync: true,
      cloud_devices: 5,
      cloud_storage_mb: 500,

      // Development Features
      ssh_key_management: true,
      plugin_system: true,
      custom_plugins: true,
      advanced_scripting: true,

      // Team Features
      team_collaboration: false,
      shared_configs: false,
      team_analytics: false,
      admin_dashboard: false,

      // Support
      support_level: 'priority_email',
      support_response_time: '24h',

      // Limits
      command_history_limit: -1, // Unlimited
      saved_sessions: 50,
      export_formats: ['txt', 'json', 'csv', 'html', 'pdf'],
    },
  },

  team: {
    name: 'Ocean Fleet',
    price: 35,
    icon: '🌊',
    features: {
      // Terminal Features
      terminal_basic: true,
      terminal_tabs: -1,
      terminal_split_panes: true,
      terminal_themes: 'all',
      terminal_custom_themes: true,

      // AI Features
      ai_assistant: true,
      ai_voice_control: true,
      ai_command_suggestions: true,
      ai_advanced: true,
      ai_query_limit: -1,

      // Cloud Features
      cloud_sync: true,
      cloud_devices: 10,
      cloud_storage_mb: 2000,

      // Development Features
      ssh_key_management: true,
      plugin_system: true,
      custom_plugins: true,
      advanced_scripting: true,

      // Team Features
      team_collaboration: true,
      shared_configs: true,
      team_analytics: true,
      admin_dashboard: true,
      team_member_limit: 5,

      // Support
      support_level: 'live_chat',
      support_response_time: '2h',

      // Limits
      command_history_limit: -1,
      saved_sessions: -1,
      export_formats: ['txt', 'json', 'csv', 'html', 'pdf', 'custom'],
    },
  },

  enterprise: {
    name: 'Enterprise Navigator',
    price: 99,
    icon: '🏢',
    features: {
      // Terminal Features
      terminal_basic: true,
      terminal_tabs: -1,
      terminal_split_panes: true,
      terminal_themes: 'all',
      terminal_custom_themes: true,

      // AI Features
      ai_assistant: true,
      ai_voice_control: true,
      ai_command_suggestions: true,
      ai_advanced: true,
      ai_query_limit: -1,
      ai_custom_models: true,

      // Cloud Features
      cloud_sync: true,
      cloud_devices: -1, // Unlimited
      cloud_storage_mb: -1, // Unlimited
      cloud_self_hosted: true,

      // Development Features
      ssh_key_management: true,
      plugin_system: true,
      custom_plugins: true,
      advanced_scripting: true,
      custom_integrations: true,

      // Team Features
      team_collaboration: true,
      shared_configs: true,
      team_analytics: true,
      admin_dashboard: true,
      team_member_limit: -1, // Unlimited

      // Enterprise Features
      sso_saml: true,
      audit_logs: true,
      compliance_reports: true,
      white_labeling: true,
      custom_branding: true,
      api_access: true,
      webhooks: true,

      // Support
      support_level: '24/7',
      support_response_time: '30m',
      dedicated_account_manager: true,
      custom_sla: true,

      // Limits
      command_history_limit: -1,
      saved_sessions: -1,
      export_formats: 'all',
    },
  },

  // Beta tiers
  beta_early_bird: {
    name: 'Early Bird Beta',
    price: 29,
    icon: '🐦',
    beta: true,
    features: {
      ...this.professional.features,
      beta_features: true,
      early_access: true,
      beta_feedback_channel: true,
    },
  },

  beta_standard: {
    name: 'Beta Access',
    price: 39,
    icon: '🚀',
    beta: true,
    popular: true,
    features: {
      ...this.professional.features,
      beta_features: true,
      early_access: true,
      beta_feedback_channel: true,
      priority_feature_requests: true,
    },
  },

  beta_premium: {
    name: 'Premium Beta',
    price: 59,
    icon: '👑',
    beta: true,
    features: {
      ...this.team.features,
      beta_features: true,
      early_access: true,
      beta_feedback_channel: true,
      priority_feature_requests: true,
      direct_developer_access: true,
    },
  },
};

// Stripe Price IDs mapping
export const STRIPE_PRICE_IDS = {
  // Monthly subscriptions
  personal_monthly: process.env.STRIPE_PRICE_PERSONAL_MONTHLY || 'price_personal_monthly',
  professional_monthly:
    process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || 'price_professional_monthly',
  team_monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY || 'price_team_monthly',
  enterprise_monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_enterprise_monthly',

  // Annual subscriptions (20% off)
  personal_annual: process.env.STRIPE_PRICE_PERSONAL_ANNUAL || 'price_personal_annual',
  professional_annual: process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL || 'price_professional_annual',
  team_annual: process.env.STRIPE_PRICE_TEAM_ANNUAL || 'price_team_annual',
  enterprise_annual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL || 'price_enterprise_annual',

  // One-time beta purchases
  beta_early_bird: process.env.STRIPE_PRICE_BETA_EARLY || 'price_beta_early',
  beta_standard: process.env.STRIPE_PRICE_BETA_STANDARD || 'price_beta_standard',
  beta_premium: process.env.STRIPE_PRICE_BETA_PREMIUM || 'price_beta_premium',
};

// Feature checking utility
export function hasFeature(tier, feature) {
  const tierConfig = PRICING_TIERS[tier];
  if (!tierConfig) return false;

  const features = tierConfig.features;

  // Check direct feature
  if (features.hasOwnProperty(feature)) {
    return features[feature];
  }

  // Check nested features
  const featurePath = feature.split('.');
  let current = features;

  for (const part of featurePath) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return false;
    }
  }

  return current;
}

// Get feature limit
export function getFeatureLimit(tier, feature) {
  const tierConfig = PRICING_TIERS[tier];
  if (!tierConfig) return 0;

  const value = tierConfig.features[feature];

  // -1 means unlimited
  if (value === -1) return Infinity;

  // Arrays and strings return their content
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value;

  // Numbers return as-is
  if (typeof value === 'number') return value;

  // Booleans: true = 1, false = 0
  if (typeof value === 'boolean') return value ? 1 : 0;

  return 0;
}

// Check if tier has access to theme
export function hasTheme(tier, themeName) {
  const themes = getFeatureLimit(tier, 'terminal_themes');

  if (themes === 'all') return true;
  if (Array.isArray(themes)) return themes.includes(themeName);

  return false;
}

// Get upgrade message for feature
export function getUpgradeMessage(currentTier, feature) {
  // Find the lowest tier that has this feature
  const tierOrder = ['free', 'personal', 'professional', 'team', 'enterprise'];
  const currentIndex = tierOrder.indexOf(currentTier);

  for (let i = currentIndex + 1; i < tierOrder.length; i++) {
    if (hasFeature(tierOrder[i], feature)) {
      const upgradeTier = PRICING_TIERS[tierOrder[i]];
      return {
        message: `This feature requires ${upgradeTier.name} plan or higher`,
        upgradeTo: tierOrder[i],
        price: upgradeTier.price,
        icon: upgradeTier.icon,
      };
    }
  }

  return {
    message: 'This feature is not available in any plan',
    upgradeTo: null,
    price: null,
    icon: '🚫',
  };
}

// Check if user can perform action based on limits
export function canPerformAction(tier, action, currentUsage = 0) {
  const limit = getFeatureLimit(tier, action);

  if (limit === Infinity) return true;
  if (typeof limit === 'number') return currentUsage < limit;
  if (typeof limit === 'boolean') return limit;

  return false;
}

// Get tier display info
export function getTierDisplayInfo(tier) {
  const tierConfig = PRICING_TIERS[tier];
  if (!tierConfig) return null;

  return {
    name: tierConfig.name,
    icon: tierConfig.icon,
    price: tierConfig.price,
    popular: tierConfig.popular || false,
    beta: tierConfig.beta || false,
  };
}

// Export default configuration
export default {
  PRICING_TIERS,
  STRIPE_PRICE_IDS,
  hasFeature,
  getFeatureLimit,
  hasTheme,
  getUpgradeMessage,
  canPerformAction,
  getTierDisplayInfo,
};
