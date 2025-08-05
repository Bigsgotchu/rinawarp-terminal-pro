/**
 * Master Analytics Integration
 * Orchestrates all conversion tracking and attribution systems
 */

import { enhancedConversionTracker } from './enhanced-conversion-tracker.js';
import { ga4ConversionSetup } from './ga4-conversion-setup.js';
import { analyticsService } from '../analytics-service.js';
import authService from '../auth-service-enhanced.js';

class MasterAnalyticsIntegration {
  constructor() {
    this.isInitialized = false;
    this.trackingEnabled = true;
    this.systems = {
      enhanced: enhancedConversionTracker,
      ga4: ga4ConversionSetup,
      firebase: analyticsService,
    };

    // Attribution and audience tracking
    this.audienceSegments = new Map();
    this.conversionFunnels = new Map();
    this.crossDeviceTracking = new Map();

    // Performance metrics
    this.performanceMetrics = {
      totalConversions: 0,
      totalValue: 0,
      sessionCount: 0,
      avgSessionDuration: 0,
      conversionRate: 0,
    };

    this.initialize();
  }

  /**
   * Initialize all tracking systems
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize GA4 first
      this.systems.ga4.initialize();

      // Configure data-driven attribution
      this.systems.ga4.configureDataDrivenAttribution();

      // Set up cross-device tracking if user is authenticated
      if (authService.isAuthenticated()) {
        const userId = authService.getCurrentUser().uid;
        this.systems.ga4.configureCrossDeviceTracking(userId);
      }

      // Initialize enhanced conversion tracker
      this.systems.enhanced.enable();

      // Set up event listeners for automatic tracking
      this.setupAutoTracking();

      // Initialize conversion funnels
      this.initializeConversionFunnels();

      this.isInitialized = true;

      // Track initialization
      this.trackEvent('analytics_initialized', {
        systems_enabled: Object.keys(this.systems),
        tracking_enabled: this.trackingEnabled,
      });
    } catch (error) {
      console.error('❌ Failed to initialize Master Analytics Integration:', error);
    }
  }

  /**
   * Initialize conversion funnels
   */
  initializeConversionFunnels() {
    const funnels = [
      {
        name: 'trial_to_paid',
        steps: [
          'landing_page_view',
          'trial_signup_form_view',
          'trial_start',
          'feature_exploration',
          'billing_info_view',
          'paid_subscription',
        ],
        primaryConversion: 'paid_subscription',
      },
      {
        name: 'ai_adoption',
        steps: [
          'ai_feature_discovery',
          'ai_assistant_first_use',
          'ai_query_success',
          'ai_feature_regular_use',
        ],
        primaryConversion: 'ai_feature_regular_use',
      },
      {
        name: 'engagement',
        steps: [
          'first_session',
          'session_30_minutes',
          'return_visit_7_days',
          'feature_activation_milestone',
          'power_user_behavior',
        ],
        primaryConversion: 'power_user_behavior',
      },
    ];

    funnels.forEach(funnel => {
      this.conversionFunnels.set(funnel.name, {
        ...funnel,
        steps_data: new Map(),
        conversion_data: [],
      });
    });

    console.log(
      '🎯 Conversion funnels initialized:',
      funnels.map(f => f.name)
    );
  }

  /**
   * Set up automatic event tracking
   */
  setupAutoTracking() {
    // Track AI assistant usage
    this.setupAIAssistantTracking();

    // Track voice command usage
    this.setupVoiceCommandTracking();

    // Track theme changes
    this.setupThemeChangeTracking();

    // Track file operations
    this.setupFileOperationTracking();

    // Track session milestones
    this.setupSessionMilestoneTracking();

    // Track feature usage
    this.setupFeatureUsageTracking();
  }

  /**
   * Track primary conversions across all systems
   */
  async trackPrimaryConversion(conversionType, data = {}) {
    if (!this.trackingEnabled) return;

    try {
      // Get enriched data
      const enrichedData = await this.enrichConversionData(data);

      // Track in Enhanced Conversion Tracker
      const enhancedResult = this.systems.enhanced.trackPrimaryConversion(
        conversionType,
        enrichedData
      );

      // Track in GA4
      this.systems.ga4.trackPrimaryConversion(conversionType, {
        ...enrichedData,
        conversion_id: enhancedResult.session_id,
      });

      // Track in non-Firebase Analytics (console-based)
      this.systems.firebase.trackEvent(`primary_${conversionType}`, enrichedData);

      // Update performance metrics
      this.updatePerformanceMetrics('primary', enhancedResult.conversion_value);

      // Update conversion funnel
      this.updateConversionFunnel(conversionType, enrichedData);

      // Update audience segments
      await this.updateAudienceSegments(conversionType, enrichedData);

      return enhancedResult;
    } catch (error) {
      console.error(`❌ Error tracking primary conversion ${conversionType}:`, error);
      this.systems.firebase.trackError(error, `primary_conversion_${conversionType}`);
    }
  }

  /**
   * Track micro-conversions across all systems
   */
  async trackMicroConversion(conversionType, data = {}) {
    if (!this.trackingEnabled) return;

    try {
      // Get enriched data
      const enrichedData = await this.enrichConversionData(data);

      // Track in Enhanced Conversion Tracker
      const enhancedResult = this.systems.enhanced.trackMicroConversion(
        conversionType,
        enrichedData
      );

      // Track in GA4
      this.systems.ga4.trackMicroConversion(conversionType, {
        ...enrichedData,
        conversion_id: enhancedResult.session_id,
      });

      // Track in non-Firebase Analytics (console-based)
      this.systems.firebase.trackEvent(`micro_${conversionType}`, enrichedData);

      // Update performance metrics
      this.updatePerformanceMetrics('micro', enhancedResult.conversion_value);

      // Update conversion funnel
      this.updateConversionFunnel(conversionType, enrichedData);

      return enhancedResult;
    } catch (error) {
      console.error(`❌ Error tracking micro-conversion ${conversionType}:`, error);
      this.systems.firebase.trackError(error, `micro_conversion_${conversionType}`);
    }
  }

  /**
   * Enrich conversion data with additional context
   */
  async enrichConversionData(data) {
    const user = authService.getCurrentUser();
    const attribution = this.systems.enhanced.getAttributionData();

    return {
      ...data,
      // User context
      user_id: user?.uid || 'anonymous',
      user_email: user?.email || null,
      user_authenticated: !!user,

      // Attribution data
      ...attribution,

      // Session context
      session_id: this.systems.enhanced.getSessionId(),
      page_url: window.location.href,
      page_title: document.title,
      timestamp: Date.now(),

      // Device/browser context
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,

      // Performance context
      connection_type: navigator.connection?.effectiveType || 'unknown',

      // Audience segment
      audience_segment: await this.getCurrentAudienceSegment(),
    };
  }

  /**
   * Track specific conversion types with convenience methods
   */

  // Trial starts
  async trackTrialStart(planType = 'basic', source = null) {
    return this.trackPrimaryConversion('trial_start', {
      plan_type: planType,
      audience_source: source || this.systems.enhanced.getAudienceSource(),
      trial_features: this.systems.enhanced.getTrialFeatures(planType),
      conversion_funnel: 'trial_to_paid',
      funnel_step: 'trial_start',
    });
  }

  // Paid subscriptions
  async trackPaidSubscription(planType, subscriptionData = {}) {
    return this.trackPrimaryConversion(`paid_subscription_${planType}`, {
      plan_type: planType,
      revenue:
        subscriptionData.amount ||
        this.systems.ga4.getConversionValue(`paid_subscription_${planType}`),
      billing_cycle: subscriptionData.billingCycle || 'monthly',
      payment_method: subscriptionData.paymentMethod || 'stripe',
      trial_converted: subscriptionData.fromTrial || false,
      discount_applied: subscriptionData.discount || null,
      conversion_funnel: 'trial_to_paid',
      funnel_step: 'paid_subscription',
      ...subscriptionData,
    });
  }

  // Feature activations
  async trackFeatureActivation(feature, milestone = 'first_use') {
    return this.trackPrimaryConversion('feature_activation_milestone', {
      feature_name: feature,
      milestone_type: milestone,
      feature_category: this.systems.enhanced.getFeatureCategory(feature),
      activation_method: 'user_initiated',
      conversion_funnel: 'engagement',
      funnel_step: 'feature_activation_milestone',
    });
  }

  // AI assistant first use
  async trackAIAssistantFirstUse(interactionData = {}) {
    return this.trackMicroConversion('ai_assistant_first_use', {
      interaction_type: interactionData.type || 'chat',
      query_category: interactionData.category || 'general',
      response_quality: interactionData.quality || null,
      session_context: this.systems.enhanced.getSessionContext(),
      conversion_funnel: 'ai_adoption',
      funnel_step: 'ai_assistant_first_use',
    });
  }

  // Voice command activation
  async trackVoiceCommandActivation(commandData = {}) {
    return this.trackMicroConversion('voice_command_activation', {
      command_type: commandData.type || 'unknown',
      recognition_accuracy: commandData.accuracy || null,
      command_success: commandData.success !== false,
      voice_engine: 'browser_api',
      conversion_funnel: 'engagement',
      funnel_step: 'voice_activation',
    });
  }

  // Theme customization
  async trackThemeCustomization(themeData = {}) {
    return this.trackMicroConversion('theme_customization', {
      theme_name: themeData.theme || 'custom',
      customization_type: themeData.type || 'color',
      previous_theme: themeData.previousTheme || 'default',
      custom_properties_count: Object.keys(themeData.properties || {}).length,
      conversion_funnel: 'engagement',
      funnel_step: 'theme_customization',
    });
  }

  // Session milestones
  async trackSessionMilestone(milestone, duration) {
    if (milestone === '30_minutes') {
      return this.trackMicroConversion('session_30_minutes', {
        session_duration: duration,
        milestone_reached: '30_minutes',
        engagement_level: 'high',
        conversion_funnel: 'engagement',
        funnel_step: 'session_30_minutes',
      });
    }
  }

  // Return visits
  async trackReturnVisit(daysSinceLastVisit) {
    if (daysSinceLastVisit <= 7) {
      return this.trackMicroConversion('return_visit_7_days', {
        days_since_last_visit: daysSinceLastVisit,
        return_user: true,
        visit_frequency: this.calculateVisitFrequency(),
        conversion_funnel: 'engagement',
        funnel_step: 'return_visit_7_days',
      });
    }
  }

  /**
   * Update conversion funnel data
   */
  updateConversionFunnel(step, data) {
    const funnelName = data.conversion_funnel || 'default';
    const funnel = this.conversionFunnels.get(funnelName);

    if (funnel) {
      if (!funnel.steps_data.has(step)) {
        funnel.steps_data.set(step, {
          step_name: step,
          count: 0,
          conversion_rate: 0,
          avg_time_to_complete: 0,
        });
      }

      const stepData = funnel.steps_data.get(step);
      stepData.count++;

      // Track in GA4 as funnel step
      this.systems.ga4.trackConversionPathStep(step, {
        funnel_name: funnelName,
        step_number: funnel.steps.indexOf(step) + 1,
        user_segment: data.audience_segment,
        audience_source: data.audience_source,
      });
    }
  }

  /**
   * Update audience segments
   */
  async updateAudienceSegments(conversionType, data) {
    const userId = data.user_id || 'anonymous';
    let userSegment = this.audienceSegments.get(userId);

    if (!userSegment) {
      userSegment = {
        user_id: userId,
        segments: [],
        behaviors: [],
        conversions: [],
        lifetime_value: 0,
        engagement_score: 0,
        last_activity: Date.now(),
      };
    }

    // Add conversion
    userSegment.conversions.push({
      type: conversionType,
      timestamp: Date.now(),
      value: data.conversion_value || 0,
      source: data.audience_source,
    });

    // Update lifetime value
    userSegment.lifetime_value += data.conversion_value || 0;

    // Update engagement score
    userSegment.engagement_score = this.calculateEngagementScore(userSegment);

    // Assign segments based on behavior
    this.assignBehavioralSegments(userSegment, conversionType, data);

    this.audienceSegments.set(userId, userSegment);

    // Update GA4 user properties
    this.systems.ga4.setUserProperties({
      user_segment: userSegment.segments.join(','),
      lifetime_value: userSegment.lifetime_value,
      engagement_score: userSegment.engagement_score,
    });
  }

  /**
   * Assign behavioral segments
   */
  assignBehavioralSegments(userSegment, conversionType, data) {
    const segments = userSegment.segments;

    // High-value user
    if (userSegment.lifetime_value >= 50) {
      this.addSegment(segments, 'high_value_user');
    }

    // Engagement-based segments
    if (userSegment.engagement_score >= 80) {
      this.addSegment(segments, 'highly_engaged');
    }

    // Feature-based segments
    if (conversionType === 'ai_assistant_first_use') {
      this.addSegment(segments, 'ai_early_adopter');
    }

    if (conversionType === 'voice_command_activation') {
      this.addSegment(segments, 'voice_user');
    }

    if (conversionType === 'session_30_minutes') {
      this.addSegment(segments, 'power_user');
    }

    // Subscription-based segments
    if (conversionType.includes('paid_subscription')) {
      this.addSegment(segments, 'paying_customer');
      this.addSegment(segments, `${data.plan_type}_subscriber`);
    }
  }

  /**
   * Helper methods
   */

  addSegment(segments, segment) {
    if (!segments.includes(segment)) {
      segments.push(segment);
    }
  }

  calculateEngagementScore(userSegment) {
    let score = 0;

    // Base score from conversions
    score += userSegment.conversions.length * 10;

    // Bonus for diversity of conversions
    const uniqueConversions = new Set(userSegment.conversions.map(c => c.type));
    score += uniqueConversions.size * 5;

    // Bonus for recent activity
    const daysSinceLastActivity = (Date.now() - userSegment.last_activity) / (1000 * 60 * 60 * 24);
    if (daysSinceLastActivity <= 1) score += 20;
    else if (daysSinceLastActivity <= 7) score += 10;

    return Math.min(score, 100);
  }

  calculateVisitFrequency() {
    const visits = parseInt(localStorage.getItem('visit_count') || '1');
    localStorage.setItem('visit_count', (visits + 1).toString());
    return visits;
  }

  async getCurrentAudienceSegment() {
    const userId = authService.getCurrentUser()?.uid || 'anonymous';
    const userSegment = this.audienceSegments.get(userId);
    return userSegment?.segments.join(',') || 'new_user';
  }

  updatePerformanceMetrics(type, value) {
    this.performanceMetrics.totalConversions++;
    this.performanceMetrics.totalValue += value || 0;

    if (type === 'primary') {
      // Calculate conversion rate based on primary conversions
      this.performanceMetrics.conversionRate =
        (this.getMetricCount('primary') / this.performanceMetrics.sessionCount) * 100;
    }
  }

  getMetricCount(type) {
    return this.systems.enhanced.conversionPaths.filter(c => c.conversion_type === type).length;
  }

  /**
   * Auto-tracking setup methods
   */

  setupAIAssistantTracking() {
    // Listen for AI assistant interactions
    document.addEventListener('ai-assistant-used', event => {
      this.trackAIAssistantFirstUse(event.detail);
    });
  }

  setupVoiceCommandTracking() {
    // Listen for voice command events
    document.addEventListener('voice-command-activated', event => {
      this.trackVoiceCommandActivation(event.detail);
    });
  }

  setupThemeChangeTracking() {
    // Listen for theme change events
    document.addEventListener('theme-changed', event => {
      this.trackThemeCustomization(event.detail);
    });
  }

  setupFileOperationTracking() {
    // Listen for file operations
    document.addEventListener('file-uploaded', event => {
      this.trackMicroConversion('file_upload_first', event.detail);
    });
  }

  setupSessionMilestoneTracking() {
    // Track session milestones
    setInterval(() => {
      const duration = Date.now() - this.systems.enhanced.sessionStartTime;
      if (duration >= 30 * 60 * 1000) {
        // 30 minutes
        this.trackSessionMilestone('30_minutes', duration);
      }
    }, 60000);
  }

  setupFeatureUsageTracking() {
    // Listen for feature usage events
    document.addEventListener('feature-used', event => {
      this.trackMicroConversion('terminal_feature_use', {
        feature_name: event.detail.feature,
        usage_type: event.detail.type || 'click',
      });
    });
  }

  /**
   * Generate comprehensive analytics report
   */
  generateAnalyticsReport() {
    return {
      performance_metrics: this.performanceMetrics,
      conversion_funnels: this.getConversionFunnelReport(),
      audience_segments: this.getAudienceSegmentReport(),
      attribution_analysis: this.getAttributionAnalysis(),
      system_status: this.getSystemStatus(),
      enhanced_tracker: this.systems.enhanced.generateReport(),
      timestamp: Date.now(),
    };
  }

  getConversionFunnelReport() {
    const funnelReport = {};

    this.conversionFunnels.forEach((funnel, name) => {
      funnelReport[name] = {
        steps: funnel.steps,
        step_data: Object.fromEntries(funnel.steps_data),
        conversion_rate: this.calculateFunnelConversionRate(funnel),
        drop_off_points: this.identifyDropOffPoints(funnel),
      };
    });

    return funnelReport;
  }

  getAudienceSegmentReport() {
    const segmentReport = {};

    this.audienceSegments.forEach((segment, _userId) => {
      const segmentKey = segment.segments.join('_') || 'unclassified';

      if (!segmentReport[segmentKey]) {
        segmentReport[segmentKey] = {
          user_count: 0,
          total_value: 0,
          avg_engagement_score: 0,
          conversion_rate: 0,
        };
      }

      segmentReport[segmentKey].user_count++;
      segmentReport[segmentKey].total_value += segment.lifetime_value;
      segmentReport[segmentKey].avg_engagement_score += segment.engagement_score;
    });

    // Calculate averages
    Object.values(segmentReport).forEach(segment => {
      segment.avg_engagement_score /= segment.user_count;
      segment.avg_ltv = segment.total_value / segment.user_count;
    });

    return segmentReport;
  }

  getAttributionAnalysis() {
    return this.systems.enhanced.generateConversionPaths();
  }

  getSystemStatus() {
    return {
      initialized: this.isInitialized,
      tracking_enabled: this.trackingEnabled,
      systems: {
        enhanced: this.systems.enhanced.isEnabled,
        ga4: this.systems.ga4.isInitialized,
        firebase: this.systems.firebase.isEnabled(),
      },
      total_conversions: this.performanceMetrics.totalConversions,
      total_value: this.performanceMetrics.totalValue,
    };
  }

  calculateFunnelConversionRate(funnel) {
    const firstStep = funnel.steps[0];
    const lastStep = funnel.steps[funnel.steps.length - 1];

    const firstStepData = funnel.steps_data.get(firstStep);
    const lastStepData = funnel.steps_data.get(lastStep);

    if (!firstStepData || !lastStepData || firstStepData.count === 0) {
      return 0;
    }

    return (lastStepData.count / firstStepData.count) * 100;
  }

  identifyDropOffPoints(funnel) {
    const dropOffs = [];

    for (let i = 0; i < funnel.steps.length - 1; i++) {
      const currentStep = funnel.steps_data.get(funnel.steps[i]);
      const nextStep = funnel.steps_data.get(funnel.steps[i + 1]);

      if (currentStep && nextStep && currentStep.count > 0) {
        const dropOffRate = ((currentStep.count - nextStep.count) / currentStep.count) * 100;
        if (dropOffRate > 50) {
          // Significant drop-off
          dropOffs.push({
            from_step: funnel.steps[i],
            to_step: funnel.steps[i + 1],
            drop_off_rate: dropOffRate,
          });
        }
      }
    }

    return dropOffs;
  }

  /**
   * Utility methods
   */

  trackEvent(eventName, data) {
    this.systems.firebase.trackEvent(eventName, data);
  }

  enable() {
    this.trackingEnabled = true;
    this.systems.enhanced.enable();
  }

  disable() {
    this.trackingEnabled = false;
    this.systems.enhanced.disable();
  }
}

// Export singleton instance
export const masterAnalyticsIntegration = new MasterAnalyticsIntegration();
export default MasterAnalyticsIntegration;
