/**
 * Enhanced Conversion Tracking and Attribution System
 * Comprehensive tracking for measuring audience effectiveness
 */

/* global gtag */

import authService from '../auth-service-enhanced.js';

class EnhancedConversionTracker {
  constructor() {
    this.isEnabled = true;
    this.sessionStartTime = Date.now();
    this.conversionValues = this.initializeConversionValues();
    this.attributionModel = 'data_driven';
    this.audienceSegments = new Map();
    this.conversionPaths = [];
    this.sessionEvents = [];

    // Initialize user properties for attribution
    this.initializeUserProperties();

    // Set up session tracking
    this.setupSessionTracking();
  }

  /**
   * Initialize conversion values for different types
   */
  initializeConversionValues() {
    return {
      // Primary Conversions
      trial_start: 25.0,
      paid_subscription_basic: 9.99,
      paid_subscription_pro: 19.99,
      paid_subscription_enterprise: 49.99,
      feature_activation_milestone: 5.0,

      // Micro-Conversions
      ai_assistant_first_use: 2.5,
      voice_command_activation: 3.0,
      theme_customization: 1.5,
      session_30_minutes: 4.0,
      return_visit_7_days: 3.5,

      // Additional micro-conversions
      file_upload_first: 2.0,
      terminal_feature_use: 1.0,
      settings_customization: 1.5,
      help_documentation_view: 0.5,
      command_completion: 0.75,
      session_save: 2.0,
    };
  }

  /**
   * Initialize user properties for attribution
   */
  initializeUserProperties() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get('utm_source') || 'direct';
      const utmMedium = urlParams.get('utm_medium') || 'none';
      const utmCampaign = urlParams.get('utm_campaign') || 'none';

      // Store attribution data
      const attributionData = {
        first_touch_source: utmSource,
        first_touch_medium: utmMedium,
        first_touch_campaign: utmCampaign,
        first_touch_timestamp: Date.now(),
        user_agent: navigator.userAgent,
        referrer: document.referrer || 'direct',
        landing_page: window.location.pathname,
      };

      // Store in localStorage for session persistence
      localStorage.setItem('attribution_data', JSON.stringify(attributionData));

      // Firebase removed - user properties stored locally only
    } catch (error) {
      console.error('Error initializing user properties:', error);
    }
  }

  /**
   * Setup session tracking for micro-conversions
   */
  setupSessionTracking() {
    // Track session duration
    setInterval(() => {
      const sessionDuration = Date.now() - this.sessionStartTime;
      if (sessionDuration >= 30 * 60 * 1000) {
        // 30 minutes
        this.trackMicroConversion('session_30_minutes', {
          session_duration: sessionDuration,
          milestone_reached: '30_minutes',
        });
      }
    }, 60000); // Check every minute

    // Track return visits
    this.trackReturnVisits();

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('session_pause', {
          session_duration: Date.now() - this.sessionStartTime,
        });
      } else {
        this.trackEvent('session_resume', {
          pause_duration: Date.now() - this.sessionStartTime,
        });
      }
    });
  }

  /**
   * Track return visits within 7 days
   */
  trackReturnVisits() {
    const lastVisit = localStorage.getItem('last_visit_timestamp');
    const currentVisit = Date.now();

    if (lastVisit) {
      const timeDiff = currentVisit - parseInt(lastVisit);
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

      if (daysDiff <= 7) {
        this.trackMicroConversion('return_visit_7_days', {
          days_since_last_visit: daysDiff.toFixed(2),
          return_user: true,
        });
      }
    }

    localStorage.setItem('last_visit_timestamp', currentVisit.toString());
  }

  /**
   * Track primary conversions
   */
  trackPrimaryConversion(conversionType, data = {}) {
    const attributionData = this.getAttributionData();
    const conversionValue = this.conversionValues[conversionType] || 0;

    const conversionEvent = {
      conversion_type: 'primary',
      conversion_name: conversionType,
      conversion_value: conversionValue,
      currency: 'USD',
      ...attributionData,
      ...data,
      timestamp: Date.now(),
      session_id: this.getSessionId(),
    };

    // Firebase removed - conversions logged to console only

    // Add to conversion path
    this.conversionPaths.push(conversionEvent);

    // Update audience segments
    this.updateAudienceSegment(conversionType, data);

    // Send to Google Analytics with enhanced ecommerce
    this.sendToGoogleAnalytics(conversionEvent);

    return conversionEvent;
  }

  /**
   * Track micro-conversions
   */
  trackMicroConversion(conversionType, data = {}) {
    const attributionData = this.getAttributionData();
    const conversionValue = this.conversionValues[conversionType] || 0;

    const conversionEvent = {
      conversion_type: 'micro',
      conversion_name: conversionType,
      conversion_value: conversionValue,
      currency: 'USD',
      ...attributionData,
      ...data,
      timestamp: Date.now(),
      session_id: this.getSessionId(),
    };

    // Firebase removed - micro conversions logged to console only

    // Add to conversion path
    this.conversionPaths.push(conversionEvent);

    // Update audience segments
    this.updateAudienceSegment(conversionType, data);

    return conversionEvent;
  }

  /**
   * Track trial starts with audience source
   */
  trackTrialStart(planType = 'basic', audienceSource = null) {
    return this.trackPrimaryConversion('trial_start', {
      plan_type: planType,
      audience_source: audienceSource || this.getAudienceSource(),
      trial_duration: '14_days',
      trial_features_enabled: this.getTrialFeatures(planType),
    });
  }

  /**
   * Track paid subscriptions by plan type
   */
  trackPaidSubscription(planType, subscriptionData = {}) {
    const conversionType = `paid_subscription_${planType}`;
    return this.trackPrimaryConversion(conversionType, {
      plan_type: planType,
      subscription_method: subscriptionData.method || 'stripe',
      billing_cycle: subscriptionData.billingCycle || 'monthly',
      discount_applied: subscriptionData.discount || null,
      revenue: this.conversionValues[conversionType],
      ...subscriptionData,
    });
  }

  /**
   * Track feature activation milestones
   */
  trackFeatureActivation(feature, milestone = 'first_use') {
    return this.trackPrimaryConversion('feature_activation_milestone', {
      feature_name: feature,
      milestone_type: milestone,
      activation_method: 'user_initiated',
      feature_category: this.getFeatureCategory(feature),
    });
  }

  /**
   * Track AI assistant first use
   */
  trackAIAssistantFirstUse(interactionData = {}) {
    return this.trackMicroConversion('ai_assistant_first_use', {
      interaction_type: interactionData.type || 'chat',
      query_category: interactionData.category || 'general',
      response_satisfaction: interactionData.satisfaction || null,
      session_context: this.getSessionContext(),
    });
  }

  /**
   * Track voice command activation
   */
  trackVoiceCommandActivation(commandData = {}) {
    return this.trackMicroConversion('voice_command_activation', {
      command_type: commandData.type || 'unknown',
      recognition_accuracy: commandData.accuracy || null,
      command_success: commandData.success || true,
      voice_engine: 'browser_api',
    });
  }

  /**
   * Track theme customization
   */
  trackThemeCustomization(themeData = {}) {
    return this.trackMicroConversion('theme_customization', {
      theme_name: themeData.theme || 'custom',
      customization_type: themeData.type || 'color',
      previous_theme: themeData.previousTheme || 'default',
      custom_properties: themeData.properties || {},
    });
  }

  /**
   * Update audience segment based on conversion
   */
  updateAudienceSegment(conversionType, data) {
    const userId = authService.getCurrentUser()?.uid || 'anonymous';
    const userSegment = this.audienceSegments.get(userId) || {
      user_id: userId,
      segments: [],
      conversions: [],
      lifetime_value: 0,
      first_conversion: null,
      last_activity: Date.now(),
    };

    // Add conversion to user segment
    userSegment.conversions.push({
      type: conversionType,
      value: this.conversionValues[conversionType] || 0,
      timestamp: Date.now(),
      ...data,
    });

    // Update lifetime value
    userSegment.lifetime_value += this.conversionValues[conversionType] || 0;

    // Set first conversion
    if (!userSegment.first_conversion) {
      userSegment.first_conversion = {
        type: conversionType,
        timestamp: Date.now(),
      };
    }

    // Update segments based on behavior
    this.assignAudienceSegments(userSegment, conversionType, data);

    this.audienceSegments.set(userId, userSegment);
  }

  /**
   * Assign audience segments based on behavior
   */
  assignAudienceSegments(userSegment, conversionType, data) {
    const segments = userSegment.segments;

    // High-value user
    if (userSegment.lifetime_value >= 50) {
      this.addSegment(segments, 'high_value_user');
    }

    // Power user segments
    if (conversionType === 'session_30_minutes') {
      this.addSegment(segments, 'engaged_user');
    }

    if (conversionType === 'ai_assistant_first_use') {
      this.addSegment(segments, 'ai_early_adopter');
    }

    if (conversionType === 'voice_command_activation') {
      this.addSegment(segments, 'voice_user');
    }

    // Feature-based segments
    if (conversionType === 'theme_customization') {
      this.addSegment(segments, 'customization_enthusiast');
    }

    // Subscription segments
    if (conversionType.includes('paid_subscription')) {
      this.addSegment(segments, 'paying_customer');
      this.addSegment(segments, `${data.plan_type}_subscriber`);
    }

    // Trial segments
    if (conversionType === 'trial_start') {
      this.addSegment(segments, 'trial_user');
    }
  }

  /**
   * Add segment if not already present
   */
  addSegment(segments, segment) {
    if (!segments.includes(segment)) {
      segments.push(segment);
    }
  }

  /**
   * Get attribution data
   */
  getAttributionData() {
    const stored = localStorage.getItem('attribution_data');
    if (stored) {
      return JSON.parse(stored);
    }

    return {
      first_touch_source: 'direct',
      first_touch_medium: 'none',
      first_touch_campaign: 'none',
      first_touch_timestamp: Date.now(),
    };
  }

  /**
   * Get audience source from attribution data
   */
  getAudienceSource() {
    const attribution = this.getAttributionData();
    return `${attribution.first_touch_source}_${attribution.first_touch_medium}`;
  }

  /**
   * Get session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Send to Google Analytics with enhanced ecommerce
   */
  sendToGoogleAnalytics(conversionEvent) {
    if (typeof gtag !== 'undefined') {
      // Send conversion event
      gtag('event', 'conversion', {
        send_to: 'AW-CONVERSION_ID', // Replace with actual conversion ID
        value: conversionEvent.conversion_value,
        currency: 'USD',
        event_category: conversionEvent.conversion_type,
        event_label: conversionEvent.conversion_name,
        custom_parameters: {
          audience_source: conversionEvent.audience_source,
          utm_source: conversionEvent.first_touch_source,
          utm_medium: conversionEvent.first_touch_medium,
          utm_campaign: conversionEvent.first_touch_campaign,
        },
      });

      // Send enhanced ecommerce event for paid subscriptions
      if (conversionEvent.conversion_name.includes('paid_subscription')) {
        gtag('event', 'purchase', {
          transaction_id: `txn_${conversionEvent.session_id}_${Date.now()}`,
          value: conversionEvent.conversion_value,
          currency: 'USD',
          items: [
            {
              item_id: conversionEvent.plan_type,
              item_name: `RinaWarp ${conversionEvent.plan_type} Plan`,
              category: 'subscription',
              quantity: 1,
              price: conversionEvent.conversion_value,
            },
          ],
        });
      }
    }
  }

  /**
   * Generate conversion paths analysis
   */
  generateConversionPaths() {
    const paths = {};

    this.audienceSegments.forEach((userSegment, _userId) => {
      const userPaths = userSegment.conversions
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(c => c.type);

      const pathKey = userPaths.join(' -> ');
      if (!paths[pathKey]) {
        paths[pathKey] = {
          path: userPaths,
          count: 0,
          total_value: 0,
          avg_time_to_convert: 0,
        };
      }

      paths[pathKey].count++;
      paths[pathKey].total_value += userSegment.lifetime_value;
    });

    return Object.values(paths).sort((a, b) => b.count - a.count);
  }

  /**
   * Generate audience overlap report
   */
  generateAudienceOverlap() {
    const segmentOverlap = {};

    this.audienceSegments.forEach(userSegment => {
      const segments = userSegment.segments;

      // Check all segment combinations
      for (let i = 0; i < segments.length; i++) {
        for (let j = i + 1; j < segments.length; j++) {
          const combo = [segments[i], segments[j]].sort().join(' + ');
          segmentOverlap[combo] = (segmentOverlap[combo] || 0) + 1;
        }
      }
    });

    return Object.entries(segmentOverlap)
      .sort((a, b) => b[1] - a[1])
      .map(([combo, count]) => ({ combination: combo, count }));
  }

  /**
   * Get lifetime value by audience segment
   */
  getLifetimeValueBySegment() {
    const segmentLTV = {};

    this.audienceSegments.forEach(userSegment => {
      userSegment.segments.forEach(segment => {
        if (!segmentLTV[segment]) {
          segmentLTV[segment] = {
            total_value: 0,
            user_count: 0,
            avg_ltv: 0,
          };
        }

        segmentLTV[segment].total_value += userSegment.lifetime_value;
        segmentLTV[segment].user_count++;
      });
    });

    // Calculate averages
    Object.values(segmentLTV).forEach(segment => {
      segment.avg_ltv = segment.total_value / segment.user_count;
    });

    return segmentLTV;
  }

  /**
   * Get cost per acquisition by audience
   */
  getCostPerAcquisitionByAudience() {
    // This would integrate with ad spend data
    // Placeholder implementation
    const cpaData = {};

    this.audienceSegments.forEach(userSegment => {
      const source = userSegment.conversions[0]?.audience_source || 'direct';

      if (!cpaData[source]) {
        cpaData[source] = {
          acquisitions: 0,
          total_value: 0,
          estimated_cost: 0, // This would come from ad platforms
          cpa: 0,
        };
      }

      cpaData[source].acquisitions++;
      cpaData[source].total_value += userSegment.lifetime_value;
    });

    return cpaData;
  }

  /**
   * Helper methods
   */
  getTrialFeatures(planType) {
    const features = {
      basic: ['terminal_access', 'basic_themes', 'file_storage_1gb'],
      pro: ['terminal_access', 'all_themes', 'ai_assistant', 'file_storage_10gb'],
      enterprise: [
        'terminal_access',
        'all_themes',
        'ai_assistant',
        'unlimited_storage',
        'priority_support',
      ],
    };
    return features[planType] || features.basic;
  }

  getFeatureCategory(feature) {
    const categories = {
      ai_assistant: 'ai',
      voice_commands: 'voice',
      theme_manager: 'customization',
      file_manager: 'productivity',
      terminal: 'core',
    };
    return categories[feature] || 'other';
  }

  getSessionContext() {
    return {
      page_url: window.location.href,
      page_title: document.title,
      session_duration: Date.now() - this.sessionStartTime,
      user_authenticated: authService.isAuthenticated(),
    };
  }

  trackEvent(eventName, data) {
    if (this.isEnabled) {
      // Track event implementation would go here
      const _eventData = {
        event_name: eventName,
        ...data,
        timestamp: Date.now(),
        session_id: this.getSessionId(),
      };
      // Send to analytics service
    }
  }

  /**
   * Enable/disable tracking
   */
  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    return {
      conversion_paths: this.generateConversionPaths(),
      audience_overlap: this.generateAudienceOverlap(),
      lifetime_value_by_segment: this.getLifetimeValueBySegment(),
      cost_per_acquisition: this.getCostPerAcquisitionByAudience(),
      total_conversions: this.conversionPaths.length,
      total_segments: this.audienceSegments.size,
      attribution_model: this.attributionModel,
      session_summary: {
        session_start: this.sessionStartTime,
        session_duration: Date.now() - this.sessionStartTime,
        events_tracked: this.conversionPaths.length,
      },
    };
  }
}

// Export singleton instance
export const enhancedConversionTracker = new EnhancedConversionTracker();
export default EnhancedConversionTracker;
