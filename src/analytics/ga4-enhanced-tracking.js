/**
 * RinaWarp Terminal - Enhanced Google Analytics 4 Tracking System
 * Complete conversion tracking, user behavior analysis, and business metrics
 *
 * Features:
 * - Complete GA4 e-commerce tracking
 * - Custom conversion events
 * - User journey mapping
 * - Revenue attribution
 * - Enhanced debugging
 * - Offline event queuing
 * - Privacy compliant
 */

/* global gtag */

class RinaWarpGA4Tracker {
  constructor(measurementId, options = {}) {
    this.measurementId = measurementId;
    this.debug = options.debug || false;
    this.enabled = options.enabled !== false;
    this.userId = null;
    this.sessionId = this.generateSessionId();
    this.eventQueue = [];
    this.isOnline = navigator.onLine;
    this.customParameters = {};

    // Initialize tracking
    this.init();
  }

  /**
   * Initialize GA4 tracking
   */
  async init() {
    if (!this.enabled) {
      console.log('🔇 GA4 tracking disabled');
      return;
    }

    try {
      // Load gtag if not already loaded
      await this.loadGtagScript();

      // Configure GA4
      this.configureGA4();

      // Set up event listeners
      this.setupEventListeners();

      // Set up offline/online handling
      this.setupNetworkHandling();

      // Start session tracking
      this.trackSession();

      console.log('✅ GA4 Enhanced Tracking initialized');

      if (this.debug) {
        console.log('🔍 GA4 Debug mode enabled');
        this.enableDebugMode();
      }
    } catch (error) {
      console.error('❌ Failed to initialize GA4 tracking:', error);
    }
  }

  /**
   * Load Google Tag Manager script
   */
  loadGtagScript() {
    return new Promise((resolve, reject) => {
      if (window.gtag) {
        resolve();
        return;
      }

      // Load gtag script
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
      script.onload = () => {
        // Initialize gtag
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () {
          window.dataLayer.push(arguments);
        };

        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Configure GA4 with enhanced settings
   */
  configureGA4() {
    gtag('js', new Date());

    // Enhanced configuration
    gtag('config', this.measurementId, {
      // Privacy settings
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,

      // Enhanced e-commerce
      send_page_view: true,

      // Custom parameters
      custom_map: {
        custom_parameter_1: 'user_type',
        custom_parameter_2: 'subscription_plan',
        custom_parameter_3: 'feature_used',
        custom_parameter_4: 'error_type',
      },

      // Debug mode
      debug_mode: this.debug,
    });

    // Set default parameters
    gtag('config', this.measurementId, {
      app_name: 'RinaWarp Terminal',
      app_version: '1.0.9',
      app_installer_id: 'official_website',
    });
  }

  /**
   * Enable debug mode for testing
   */
  enableDebugMode() {
    gtag('config', this.measurementId, {
      debug_mode: true,
    });

    // Debug event listener
    window.addEventListener('gtag-debug', event => {
      console.log('🔍 GA4 Debug Event:', event.detail);
    });
  }

  /**
   * Set user properties
   */
  setUser(userId, properties = {}) {
    this.userId = userId;

    gtag('config', this.measurementId, {
      user_id: userId,
      ...properties,
    });

    // Set user properties
    gtag('set', 'user_properties', {
      user_type: properties.userType || 'anonymous',
      subscription_plan: properties.plan || 'free',
      registration_date: properties.registrationDate,
      total_purchases: properties.totalPurchases || 0,
      ...properties,
    });

    this.log('👤 User identified:', { userId, properties });
  }

  /**
   * Track page views with enhanced data
   */
  trackPageView(page, title = null, additionalData = {}) {
    const eventData = {
      page_title: title || document.title,
      page_location: window.location.href,
      page_referrer: document.referrer,
      session_id: this.sessionId,
      timestamp: Date.now(),
      ...additionalData,
    };

    gtag('event', 'page_view', eventData);
    this.log('📄 Page view tracked:', eventData);
  }

  /**
   * Track custom events with enhanced parameters
   */
  trackEvent(eventName, parameters = {}) {
    const enhancedParams = {
      session_id: this.sessionId,
      timestamp: Date.now(),
      user_agent: navigator.userAgent,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      ...this.customParameters,
      ...parameters,
    };

    if (this.isOnline) {
      gtag('event', eventName, enhancedParams);
      this.log('📊 Event tracked:', { eventName, parameters: enhancedParams });
    } else {
      this.queueEvent(eventName, enhancedParams);
    }
  }

  /**
   * Track conversion events
   */
  trackConversion(conversionName, value = null, currency = 'USD', additionalData = {}) {
    const conversionData = {
      event_category: 'conversion',
      event_label: conversionName,
      value: value,
      currency: currency,
      conversion_id: this.generateConversionId(),
      ...additionalData,
    };

    this.trackEvent('conversion', conversionData);

    // Also send as a separate conversion event
    gtag('event', conversionName, {
      value: value,
      currency: currency,
      ...additionalData,
    });

    this.log('💰 Conversion tracked:', conversionData);
  }

  /**
   * Track e-commerce events (GA4 Enhanced Ecommerce)
   */
  trackPurchase(transactionData) {
    const {
      transaction_id,
      value,
      currency = 'USD',
      items = [],
      coupon,
      shipping,
      tax,
      ...additionalData
    } = transactionData;

    const purchaseEvent = {
      transaction_id,
      value,
      currency,
      coupon,
      shipping,
      tax,
      items: items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        item_category: item.category || 'software',
        item_brand: 'RinaWarp',
        price: item.price,
        quantity: item.quantity || 1,
        ...item,
      })),
      ...additionalData,
    };

    gtag('event', 'purchase', purchaseEvent);
    this.log('🛒 Purchase tracked:', purchaseEvent);

    // Track individual item purchases
    items.forEach(item => {
      this.trackEvent('item_purchased', {
        item_id: item.id,
        item_name: item.name,
        price: item.price,
        transaction_id,
      });
    });
  }

  /**
   * Track subscription events
   */
  trackSubscription(subscriptionData) {
    const {
      subscription_id,
      plan_name,
      plan_price,
      billing_cycle,
      trial_period,
      ...additionalData
    } = subscriptionData;

    // Track as purchase
    this.trackPurchase({
      transaction_id: subscription_id,
      value: plan_price,
      items: [
        {
          id: `subscription_${plan_name}`,
          name: `${plan_name} Plan`,
          category: 'subscription',
          price: plan_price,
          quantity: 1,
        },
      ],
      ...additionalData,
    });

    // Track subscription-specific event
    this.trackEvent('subscribe', {
      subscription_id,
      plan_name,
      plan_price,
      billing_cycle,
      trial_period,
      event_category: 'subscription',
      ...additionalData,
    });

    this.log('📅 Subscription tracked:', subscriptionData);
  }

  /**
   * Track user engagement metrics
   */
  trackEngagement(engagementData) {
    const { engagement_time_msec, engaged_session_event = 1, ...additionalData } = engagementData;

    this.trackEvent('user_engagement', {
      engagement_time_msec,
      engaged_session_event,
      ...additionalData,
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(featureName, featureData = {}) {
    this.trackEvent('feature_used', {
      feature_name: featureName,
      event_category: 'feature_usage',
      ...featureData,
    });

    this.log('⚡ Feature usage tracked:', { featureName, featureData });
  }

  /**
   * Track errors and exceptions
   */
  trackError(errorData) {
    const { error_type, error_message, error_stack, fatal = false, ...additionalData } = errorData;

    this.trackEvent('exception', {
      description: error_message,
      fatal,
      error_type,
      error_stack: error_stack ? error_stack.substring(0, 500) : undefined,
      ...additionalData,
    });

    this.log('❌ Error tracked:', errorData);
  }

  /**
   * Track form interactions
   */
  trackForm(formAction, formData = {}) {
    const actions = {
      form_start: () => this.trackEvent('form_start', formData),
      form_submit: () => this.trackEvent('form_submit', formData),
      form_error: () => this.trackEvent('form_error', formData),
      form_abandon: () => this.trackEvent('form_abandon', formData),
    };

    if (actions[formAction]) {
      actions[formAction]();
      this.log('📝 Form interaction tracked:', { formAction, formData });
    }
  }

  /**
   * Track scroll depth
   */
  trackScrollDepth(percentage) {
    if (percentage >= 25 && percentage % 25 === 0) {
      this.trackEvent('scroll', {
        event_category: 'engagement',
        event_label: `${percentage}%`,
        value: percentage,
      });
    }
  }

  /**
   * Track download events
   */
  trackDownload(downloadData) {
    const { file_name, file_type, file_size, download_url, ...additionalData } = downloadData;

    this.trackEvent('file_download', {
      file_name,
      file_extension: file_type,
      file_size,
      link_url: download_url,
      event_category: 'download',
      ...additionalData,
    });

    this.log('📥 Download tracked:', downloadData);
  }

  /**
   * Track search events
   */
  trackSearch(searchTerm, searchResults = null) {
    this.trackEvent('search', {
      search_term: searchTerm,
      event_category: 'search',
      search_results: searchResults,
      value: searchResults,
    });

    this.log('🔍 Search tracked:', { searchTerm, searchResults });
  }

  /**
   * Track video interactions
   */
  trackVideo(videoAction, videoData = {}) {
    const {
      video_title,
      video_duration,
      video_current_time,
      video_percent = 0,
      video_provider = 'html5',
      video_url,
      ...additionalData
    } = videoData;

    this.trackEvent(`video_${videoAction}`, {
      video_title,
      video_duration,
      video_current_time,
      video_percent,
      video_provider,
      video_url,
      event_category: 'video',
      ...additionalData,
    });
  }

  /**
   * Track timing events
   */
  trackTiming(timingData) {
    const { name, value, event_category = 'timing', event_label } = timingData;

    this.trackEvent('timing_complete', {
      name,
      value,
      event_category,
      event_label,
    });

    this.log('⏱️ Timing tracked:', timingData);
  }

  /**
   * Set custom parameters for all events
   */
  setCustomParameters(parameters) {
    this.customParameters = { ...this.customParameters, ...parameters };
  }

  /**
   * Track session data
   */
  trackSession() {
    const sessionData = {
      session_id: this.sessionId,
      session_start_time: Date.now(),
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      platform: navigator.platform,
      referrer: document.referrer,
      utm_source: this.getUrlParameter('utm_source'),
      utm_medium: this.getUrlParameter('utm_medium'),
      utm_campaign: this.getUrlParameter('utm_campaign'),
      utm_term: this.getUrlParameter('utm_term'),
      utm_content: this.getUrlParameter('utm_content'),
    };

    this.trackEvent('session_start', sessionData);

    // Track session end on page unload
    window.addEventListener('beforeunload', () => {
      this.trackEvent('session_end', {
        session_id: this.sessionId,
        session_duration: Date.now() - sessionData.session_start_time,
      });
    });
  }

  /**
   * Set up automatic event listeners
   */
  setupEventListeners() {
    // Track clicks on important elements
    document.addEventListener('click', event => {
      const element = event.target;

      // Track button clicks
      if (element.tagName === 'BUTTON' || element.classList.contains('btn')) {
        this.trackEvent('button_click', {
          button_text: element.textContent.trim(),
          button_id: element.id,
          button_class: element.className,
          event_category: 'ui_interaction',
        });
      }

      // Track link clicks
      if (element.tagName === 'A') {
        this.trackEvent('link_click', {
          link_text: element.textContent.trim(),
          link_url: element.href,
          link_target: element.target,
          event_category: 'navigation',
        });
      }

      // Track pricing plan clicks
      if (element.classList.contains('buy-button') || element.classList.contains('plan-button')) {
        const planCard = element.closest('.pricing-card');
        const planName = planCard?.querySelector('.plan-name')?.textContent || 'unknown';

        this.trackEvent('pricing_plan_selected', {
          plan_name: planName,
          button_text: element.textContent.trim(),
          event_category: 'conversion_funnel',
          value: this.extractPriceFromCard(planCard),
        });
      }
    });

    // Track form submissions
    document.addEventListener('submit', event => {
      const form = event.target;
      this.trackForm('form_submit', {
        form_id: form.id,
        form_action: form.action,
        form_method: form.method,
      });
    });

    // Track scroll depth
    let maxScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        this.trackScrollDepth(scrollPercent);
      }
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.trackEvent(document.hidden ? 'page_hidden' : 'page_visible', {
        event_category: 'engagement',
      });
    });
  }

  /**
   * Set up network handling for offline events
   */
  setupNetworkHandling() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushEventQueue();
      this.log('🌐 Connection restored, flushing event queue');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.log('📴 Connection lost, queuing events');
    });
  }

  /**
   * Queue events when offline
   */
  queueEvent(eventName, parameters) {
    this.eventQueue.push({ eventName, parameters, timestamp: Date.now() });
    this.log('📦 Event queued:', { eventName, parameters });

    // Limit queue size
    if (this.eventQueue.length > 100) {
      this.eventQueue.shift();
    }
  }

  /**
   * Flush queued events when back online
   */
  flushEventQueue() {
    while (this.eventQueue.length > 0) {
      const { eventName, parameters } = this.eventQueue.shift();
      gtag('event', eventName, parameters);
    }
  }

  /**
   * Utility functions
   */
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateConversionId() {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  extractPriceFromCard(card) {
    if (!card) return null;
    const priceElement = card.querySelector('.plan-price');
    const priceText = priceElement?.textContent || '';
    const match = priceText.match(/\$(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  log(message, data = null) {
    if (this.debug) {
      console.log(`[GA4] ${message}`, data || '');
    }
  }

  /**
   * Enable/disable tracking
   */
  enable() {
    this.enabled = true;
    this.log('✅ GA4 tracking enabled');
  }

  disable() {
    this.enabled = false;
    this.log('🔇 GA4 tracking disabled');
  }
}

// Export for use in other modules
export default RinaWarpGA4Tracker;

// Auto-initialize if measurement ID is available
if (typeof window !== 'undefined' && window.GA4_MEASUREMENT_ID) {
  window.rinaWarpGA4 = new RinaWarpGA4Tracker(window.GA4_MEASUREMENT_ID, {
    debug:
      window.location.hostname === 'localhost' || window.location.search.includes('debug=true'),
  });
}
