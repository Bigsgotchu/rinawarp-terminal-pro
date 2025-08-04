/**
 * Google Analytics 4 Enhanced Conversion Tracking Setup
 * Configures GA4 for comprehensive conversion tracking and attribution
 */

/* global dataLayer */

import { gtag } from 'ga-gtag';

class GA4ConversionSetup {
  constructor() {
    this.measurementId = process.env.GA4_MEASUREMENT_ID || 'G-G424CV5GGT';
    this.conversionIds = {
      trial_start: process.env.GA4_TRIAL_CONVERSION_ID || 'AW-TRIAL_ID',
      paid_subscription: process.env.GA4_SUBSCRIPTION_CONVERSION_ID || 'AW-SUB_ID',
      feature_activation: process.env.GA4_FEATURE_CONVERSION_ID || 'AW-FEATURE_ID',
    };
    this.isInitialized = false;
    this.debugMode = process.env.NODE_ENV === 'development';
  }

  /**
   * Initialize Google Analytics 4 with enhanced conversion tracking
   */
  initialize() {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    // Load GA4 script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    window.gtag = gtag;

    gtag('js', new Date());

    // Configure GA4 with enhanced settings
    gtag('config', this.measurementId, {
      // Enhanced measurement settings
      enhanced_measurement: true,

      // Attribution settings
      attribution_reporting_api: true,
      ads_data_redaction: false,

      // Conversion linker
      conversion_linker: true,

      // Custom parameters
      custom_map: {
        custom_parameter_1: 'audience_source',
        custom_parameter_2: 'user_segment',
        custom_parameter_3: 'conversion_path',
      },

      // Debug mode
      debug_mode: this.debugMode,

      // Cookie settings for cross-domain tracking
      cookie_domain: 'auto',
      cookie_expires: 63072000, // 2 years
      cookie_update: true,

      // User properties for attribution
      user_properties: {
        user_type: 'prospect',
        engagement_level: 'unknown',
        feature_usage: 'basic',
      },
    });

    // Configure Google Ads conversion tracking
    this.configureConversionTracking();

    // Set up enhanced ecommerce
    this.configureEnhancedEcommerce();

    // Configure audience segments
    this.configureAudienceSegments();

    this.isInitialized = true;
  }

  /**
   * Configure Google Ads conversion tracking
   */
  configureConversionTracking() {
    // Configure conversion events
    const conversionEvents = [
      {
        name: 'trial_start',
        conversionId: this.conversionIds.trial_start,
        value: 25.0,
      },
      {
        name: 'paid_subscription',
        conversionId: this.conversionIds.paid_subscription,
        value: 19.99,
      },
      {
        name: 'feature_activation',
        conversionId: this.conversionIds.feature_activation,
        value: 5.0,
      },
    ];

    conversionEvents.forEach(conversion => {
      if (conversion.conversionId && conversion.conversionId !== 'AW-TRIAL_ID') {
        gtag('config', conversion.conversionId, {
          conversion_linker: true,
        });
      }
    });
  }

  /**
   * Configure enhanced ecommerce tracking
   */
  configureEnhancedEcommerce() {
    // Set up enhanced ecommerce parameters
    gtag('config', this.measurementId, {
      // Enhanced ecommerce settings
      ecommerce: {
        currency: 'USD',
        item_list_id: 'rinawarp_plans',
        item_list_name: 'RinaWarp Subscription Plans',
        promotion_id: 'beta_launch_2024',
        promotion_name: 'Beta Launch Special',
      },
    });
  }

  /**
   * Configure audience segments for better attribution
   */
  configureAudienceSegments() {
    // Define custom audience segments
    const audienceSegments = [
      {
        name: 'high_value_users',
        criteria: 'lifetime_value >= 50',
        description: 'Users with high lifetime value',
      },
      {
        name: 'ai_early_adopters',
        criteria: 'ai_assistant_first_use = true',
        description: 'Users who tried AI assistant',
      },
      {
        name: 'voice_users',
        criteria: 'voice_command_activation = true',
        description: 'Users who use voice commands',
      },
      {
        name: 'engaged_users',
        criteria: 'session_duration >= 1800', // 30 minutes
        description: 'Users with long session duration',
      },
      {
        name: 'trial_users',
        criteria: 'trial_start = true',
        description: 'Users who started a trial',
      },
      {
        name: 'paying_customers',
        criteria: 'paid_subscription = true',
        description: 'Paying subscribers',
      },
    ];

    // Set audience parameters for Google Analytics
    audienceSegments.forEach(segment => {
      gtag('config', this.measurementId, {
        custom_map: {
          [segment.name]: segment.name,
        },
      });
    });

      'Audience segments configured:',
      audienceSegments.map(s => s.name)
    );
  }

  /**
   * Track primary conversion with enhanced data
   */
  trackPrimaryConversion(conversionType, data = {}) {
    const conversionData = {
      event_category: 'conversion',
      event_label: 'primary',
      value: data.value || this.getConversionValue(conversionType),
      currency: 'USD',

      // Attribution data
      audience_source: data.audience_source,
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign,

      // Conversion path data
      conversion_path: data.conversion_path,
      touch_point: data.touch_point || 1,

      // User segment data
      user_segment: data.user_segment,
      engagement_level: data.engagement_level,

      // Custom parameters
      ...data.custom_parameters,
    };

    // Send to GA4
    gtag('event', conversionType, conversionData);

    // Send to Google Ads if conversion ID is configured
    const conversionId = this.conversionIds[conversionType];
    if (conversionId && conversionId.startsWith('AW-')) {
      gtag('event', 'conversion', {
        send_to: conversionId,
        value: conversionData.value,
        currency: 'USD',
        event_callback: () => {},
      });
    }

    // Enhanced ecommerce for subscriptions
    if (conversionType === 'paid_subscription') {
      this.trackPurchase(data);
    }
  }

  /**
   * Track micro-conversion with attribution
   */
  trackMicroConversion(conversionType, data = {}) {
    const conversionData = {
      event_category: 'micro_conversion',
      event_label: conversionType,
      value: data.value || this.getConversionValue(conversionType),
      currency: 'USD',

      // Micro-conversion specific data
      milestone_type: data.milestone_type,
      feature_category: data.feature_category,
      interaction_depth: data.interaction_depth || 1,

      // Attribution data
      audience_source: data.audience_source,
      user_segment: data.user_segment,

      // Session context
      session_duration: data.session_duration,
      page_category: data.page_category,

      // Custom parameters
      ...data.custom_parameters,
    };

    gtag('event', conversionType, conversionData);
  }

  /**
   * Track enhanced ecommerce purchase
   */
  trackPurchase(purchaseData) {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    gtag('event', 'purchase', {
      transaction_id: transactionId,
      value: purchaseData.value,
      currency: 'USD',

      // Enhanced ecommerce item data
      items: [
        {
          item_id: purchaseData.plan_type || 'basic',
          item_name: `RinaWarp ${purchaseData.plan_type || 'Basic'} Plan`,
          item_category: 'subscription',
          item_variant: purchaseData.billing_cycle || 'monthly',
          quantity: 1,
          price: purchaseData.value,

          // Custom item parameters
          trial_converted: purchaseData.trial_converted || false,
          discount_code: purchaseData.discount_code || null,
          payment_method: purchaseData.payment_method || 'stripe',
        },
      ],

      // Transaction-level custom parameters
      user_segment: purchaseData.user_segment,
      audience_source: purchaseData.audience_source,
      conversion_path: purchaseData.conversion_path,

      // Attribution data
      utm_source: purchaseData.utm_source,
      utm_medium: purchaseData.utm_medium,
      utm_campaign: purchaseData.utm_campaign,
    });
  }

  /**
   * Set user properties for attribution
   */
  setUserProperties(properties) {
    gtag('config', this.measurementId, {
      user_properties: {
        ...properties,
      },
    });
  }

  /**
   * Track conversion path step
   */
  trackConversionPathStep(stepName, stepData = {}) {
    gtag('event', 'conversion_path_step', {
      event_category: 'conversion_funnel',
      event_label: stepName,

      step_name: stepName,
      step_number: stepData.step_number || 1,
      funnel_name: stepData.funnel_name || 'default',

      // User context
      user_segment: stepData.user_segment,
      audience_source: stepData.audience_source,

      // Step-specific data
      completion_rate: stepData.completion_rate,
      time_on_step: stepData.time_on_step,
      exit_point: stepData.exit_point || false,

      // Attribution data
      utm_source: stepData.utm_source,
      utm_medium: stepData.utm_medium,
      utm_campaign: stepData.utm_campaign,
    });
  }

  /**
   * Configure cross-device tracking
   */
  configureCrossDeviceTracking(userId) {
    if (userId) {
      gtag('config', this.measurementId, {
        user_id: userId,
      });
    }
  }

  /**
   * Set up data-driven attribution model
   */
  configureDataDrivenAttribution() {
    gtag('config', this.measurementId, {
      attribution_reporting_api: true,
      ads_data_redaction: false,
      url_passthrough: true,

      // Attribution settings
      attribution_timeout: 30, // days
      conversion_timeout: 90, // days

      // Data collection settings
      allow_ad_storage: true,
      allow_analytics_storage: true,
    });
  }

  /**
   * Generate conversion report data
   */
  getConversionReportData() {
    // This would typically fetch data from GA4 Reporting API
    // For now, return a structure that would be populated
    return {
      conversion_summary: {
        total_conversions: 0,
        total_value: 0,
        conversion_rate: 0,
      },
      conversion_paths: [],
      audience_performance: {},
      attribution_analysis: {},
      top_converting_sources: [],
      micro_conversion_funnel: {},
    };
  }

  /**
   * Helper method to get conversion values
   */
  getConversionValue(conversionType) {
    const values = {
      // Primary conversions
      trial_start: 25.0,
      paid_subscription_basic: 9.99,
      paid_subscription_pro: 19.99,
      paid_subscription_enterprise: 49.99,
      feature_activation_milestone: 5.0,

      // Micro-conversions
      ai_assistant_first_use: 2.5,
      voice_command_activation: 3.0,
      theme_customization: 1.5,
      session_30_minutes: 4.0,
      return_visit_7_days: 3.5,
      file_upload_first: 2.0,
      terminal_feature_use: 1.0,
      settings_customization: 1.5,
      help_documentation_view: 0.5,
      command_completion: 0.75,
      session_save: 2.0,
    };

    return values[conversionType] || 1.0;
  }

  /**
   * Enable debug mode
   */
  enableDebugMode() {
    if (typeof gtag !== 'undefined') {
      gtag('config', this.measurementId, {
        debug_mode: true,
      });
    }
    this.debugMode = true;
  }

  /**
   * Disable debug mode
   */
  disableDebugMode() {
    if (typeof gtag !== 'undefined') {
      gtag('config', this.measurementId, {
        debug_mode: false,
      });
    }
    this.debugMode = false;
  }
}

// Export singleton instance
export const ga4ConversionSetup = new GA4ConversionSetup();
export default GA4ConversionSetup;
