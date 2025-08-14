/**
 * RinaWarp Terminal - Unified Analytics System
 * Single script that replaces all the duplicate analytics integrations
 * 
 * This script consolidates:
 * - GA4 initialization and configuration
 * - Stripe payment tracking
 * - Website interaction tracking
 * - Error monitoring integration
 * - Revenue optimization features
 * 
 * Version: 2.0 (Unified)
 */

(function() {
  'use strict';

  const CONFIG = {
    GA4_MEASUREMENT_ID: 'G-G424CV5GGT',
    DEBUG: window.location.hostname === 'localhost' || window.location.search.includes('debug=true'),
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000
  };

  class UnifiedAnalytics {
    constructor() {
      this.initialized = false;
      this.retryCount = 0;
      this.eventQueue = [];
      this.userId = null;
      this.sessionId = this.generateSessionId();
      this.purchaseFlow = {};
      
      // Initialize immediately
      this.init();
    }

    async init() {
      try {
        this.retryCount++;
        
        // Load gtag script
        await this.loadGtagScript();
        
        // Configure GA4
        this.configureGA4();
        
        // Set up tracking
        this.setupEventListeners();
        this.setupStripeIntegration();
        
        this.initialized = true;
        this.flushEventQueue();
        
        this.log('✅ Unified Analytics initialized successfully');
        
      } catch (error) {
        this.log('❌ Analytics initialization failed:', error);
        
        if (this.retryCount < CONFIG.RETRY_ATTEMPTS) {
          const delay = CONFIG.RETRY_DELAY * this.retryCount;
          this.log(`🔄 Retrying in ${delay/1000}s (attempt ${this.retryCount}/${CONFIG.RETRY_ATTEMPTS})`);
          setTimeout(() => this.init(), delay);
        }
      }
    }

    loadGtagScript() {
      return new Promise((resolve, reject) => {
        // Check if gtag already exists
        if (window.gtag) {
          resolve();
          return;
        }

        // Initialize dataLayer
        window.dataLayer = window.dataLayer || [];
        window.gtag = function() { window.dataLayer.push(arguments); };
        
        // Create script element
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.GA4_MEASUREMENT_ID}`;
        
        script.onload = () => {
          gtag('js', new Date());
          resolve();
        };
        
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    configureGA4() {
      gtag('config', CONFIG.GA4_MEASUREMENT_ID, {
        // Privacy-first configuration
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        
        // Enhanced e-commerce
        send_page_view: true,
        
        // Custom parameters
        custom_map: {
          'custom_parameter_1': 'user_type',
          'custom_parameter_2': 'subscription_plan',
          'custom_parameter_3': 'feature_used',
          'custom_parameter_4': 'plan_type'
        },
        
        // App info
        app_name: 'RinaWarp Terminal',
        app_version: '1.0.9',
        app_installer_id: 'official_website',
        
        // Debug mode
        debug_mode: CONFIG.DEBUG
      });

      this.log('🎯 GA4 configured with ID:', CONFIG.GA4_MEASUREMENT_ID);
    }

    setupEventListeners() {
      // Track page interactions
      document.addEventListener('click', (event) => this.handleClick(event));
      document.addEventListener('submit', (event) => this.handleFormSubmit(event));
      
      // Track page engagement
      this.setupEngagementTracking();
      
      // Track page visibility
      document.addEventListener('visibilitychange', () => {
        this.track(document.hidden ? 'page_hidden' : 'page_visible', {
          event_category: 'engagement'
        });
      });

      this.log('👂 Event listeners configured');
    }

    setupEngagementTracking() {
      let maxScroll = 0;
      let pageStartTime = Date.now();
      
      // Track scroll depth
      window.addEventListener('scroll', () => {
        const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
        
        if (scrollPercent > maxScroll && scrollPercent >= 25 && scrollPercent % 25 === 0) {
          maxScroll = scrollPercent;
          this.track('scroll', {
            event_category: 'engagement',
            event_label: `${scrollPercent}%`,
            value: scrollPercent
          });
        }
      });

      // Track page unload
      window.addEventListener('beforeunload', () => {
        const timeOnPage = Date.now() - pageStartTime;
        this.track('page_unload', {
          time_on_page: timeOnPage,
          engagement_time_msec: timeOnPage
        });
      });
    }

    setupStripeIntegration() {
      // Override purchase functions if they exist
      if (typeof window.purchasePlan === 'function') {
        const originalPurchasePlan = window.purchasePlan;
        window.purchasePlan = (planType) => {
          this.trackCheckoutInitiated(planType);
          return originalPurchasePlan(planType);
        };
      }

      // Track checkout success from URL
      this.trackCheckoutSuccessFromUrl();
      
      this.log('💳 Stripe integration configured');
    }

    handleClick(event) {
      const element = event.target;
      
      // Track download buttons
      if (element.matches('[href*="releases/"]') || element.textContent.includes('Download')) {
        const platform = this.detectPlatform(element);
        const tier = this.detectTier(element);
        
        this.track('file_download', {
          file_name: `RinaWarp-Terminal-${platform}`,
          plan_type: tier,
          event_category: 'download',
          link_url: element.href
        });
      }
      
      // Track purchase/buy buttons
      if (element.matches('.buy-button, .plan-button') || element.textContent.includes('Buy Now')) {
        const planType = this.extractPlanFromButton(element);
        const planInfo = this.getPlanInfo(planType);
        
        this.track('begin_checkout', {
          currency: 'USD',
          value: planInfo.price,
          items: [{
            item_id: planInfo.id,
            item_name: planInfo.name,
            item_category: 'subscription',
            item_brand: 'RinaWarp',
            price: planInfo.price,
            quantity: 1
          }],
          plan_type: planType,
          event_category: 'ecommerce'
        });
      }
      
      // Track pricing plan interactions
      if (element.closest('.pricing-card')) {
        const card = element.closest('.pricing-card');
        const planType = this.detectTierFromCard(card);
        
        this.track('pricing_plan_selected', {
          plan_type: planType,
          event_category: 'conversion_funnel',
          element_type: element.tagName
        });
      }
      
      // Track navigation clicks
      if (element.matches('a[href^="#"]')) {
        const section = element.getAttribute('href').substring(1);
        this.track('navigation_clicked', {
          section: section,
          event_category: 'navigation'
        });
      }
    }

    handleFormSubmit(event) {
      const form = event.target;
      const formData = new FormData(form);
      
      let formType = 'unknown';
      if (form.action?.includes('lead') || formData.get('email')) {
        formType = 'email_capture';
      } else if (form.action?.includes('demo')) {
        formType = 'demo_request';
      }
      
      this.track('form_submit', {
        form_type: formType,
        form_id: form.id,
        event_category: 'engagement'
      });
    }

    // Stripe-specific tracking methods
    trackCheckoutInitiated(planType, planData = {}) {
      const planInfo = this.getPlanInfo(planType);
      this.purchaseFlow[planType] = {
        initiated_at: Date.now(),
        plan_info: planInfo,
        step: 'checkout_initiated'
      };

      this.track('begin_checkout', {
        currency: 'USD',
        value: planInfo.price,
        items: [{
          item_id: planInfo.id,
          item_name: planInfo.name,
          item_category: 'subscription',
          item_brand: 'RinaWarp',
          price: planInfo.price,
          quantity: 1
        }],
        plan_type: planType,
        checkout_method: 'stripe',
        ...planData
      });

      this.log('🛒 Checkout initiated:', planType);
    }

    trackPurchaseCompleted(transactionData) {
      const { sessionId, planType, amount, currency = 'USD', customerId, ...additionalData } = transactionData;
      const planInfo = this.getPlanInfo(planType);

      // Track purchase
      this.track('purchase', {
        transaction_id: sessionId,
        value: amount,
        currency: currency,
        items: [{
          item_id: planInfo.id,
          item_name: planInfo.name,
          item_category: 'subscription',
          item_brand: 'RinaWarp',
          price: amount,
          quantity: 1
        }],
        ...additionalData
      });

      // Update user properties
      if (customerId) {
        this.setUser(customerId, {
          userType: 'paying_customer',
          plan: planType,
          totalPurchases: 1,
          lastPurchaseAmount: amount
        });
      }

      this.log('💰 Purchase completed:', transactionData);
    }

    trackCheckoutSuccessFromUrl() {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      const planType = urlParams.get('plan');

      if (sessionId && planType) {
        // Delay to ensure everything is loaded
        setTimeout(() => {
          this.trackPurchaseCompleted({
            sessionId,
            planType,
            amount: this.getPlanInfo(planType).price,
            source: 'url_redirect'
          });
        }, 1000);
      }
    }

    // Core tracking methods
    track(eventName, parameters = {}) {
      const eventData = {
        session_id: this.sessionId,
        timestamp: Date.now(),
        user_agent: navigator.userAgent,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        ...parameters
      };

      if (this.initialized) {
        gtag('event', eventName, eventData);
        this.log(`📊 Event tracked: ${eventName}`, eventData);
      } else {
        this.eventQueue.push({ eventName, eventData });
        this.log(`📦 Event queued: ${eventName}`);
      }
    }

    setUser(userId, properties = {}) {
      this.userId = userId;
      
      if (this.initialized) {
        gtag('config', CONFIG.GA4_MEASUREMENT_ID, {
          user_id: userId,
          ...properties
        });
        
        gtag('set', 'user_properties', {
          user_type: properties.userType || 'anonymous',
          subscription_plan: properties.plan || 'free',
          ...properties
        });
        
        this.log('👤 User identified:', { userId, properties });
      }
    }

    // Utility methods
    flushEventQueue() {
      while (this.eventQueue.length > 0) {
        const { eventName, eventData } = this.eventQueue.shift();
        gtag('event', eventName, eventData);
      }
      this.log(`🚀 Flushed ${this.eventQueue.length} queued events`);
    }

    generateSessionId() {
      return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    detectPlatform(element) {
      const text = element.textContent.toLowerCase();
      const href = element.href?.toLowerCase() || '';
      
      if (text.includes('windows') || href.includes('.exe')) return 'Windows';
      if (text.includes('macos') || href.includes('.dmg')) return 'macOS';
      if (text.includes('linux') || href.includes('.tar.gz')) return 'Linux';
      
      return 'Unknown';
    }

    detectTier(element) {
      const text = element.textContent.toLowerCase();
      const parent = element.closest('.pricing-card, .beta-card');
      const parentText = parent?.textContent?.toLowerCase() || '';
      
      if (text.includes('professional') || parentText.includes('professional')) return 'professional';
      if (text.includes('personal') || parentText.includes('personal')) return 'personal';
      if (text.includes('enterprise') || parentText.includes('enterprise')) return 'enterprise';
      if (text.includes('free') || parentText.includes('free')) return 'free';
      
      return 'unknown';
    }

    detectTierFromCard(card) {
      const cardText = card.textContent.toLowerCase();
      if (cardText.includes('enterprise')) return 'enterprise';
      if (cardText.includes('professional') || cardText.includes('pro')) return 'professional';
      if (cardText.includes('personal')) return 'personal';
      if (cardText.includes('free')) return 'free';
      return 'unknown';
    }

    extractPlanFromButton(button) {
      // Try onclick attribute
      if (button.onclick) {
        const match = button.onclick.toString().match(/purchasePlan\(['"]([^'"]+)['"]\)/);
        if (match) return match[1];
      }

      // Try data attributes
      if (button.dataset.plan) return button.dataset.plan;

      // Try parent card
      const card = button.closest('.pricing-card');
      if (card) {
        return this.detectTierFromCard(card);
      }

      return 'unknown';
    }

    getPlanInfo(planType) {
      const plans = {
        free: { id: 'rinawarp_free', name: 'Free Plan', price: 0 },
        personal: { id: 'rinawarp_personal', name: 'Personal Plan', price: 15 },
        professional: { id: 'rinawarp_professional', name: 'Professional Plan', price: 29 },
        team: { id: 'rinawarp_team', name: 'Team Plan', price: 49 },
        enterprise: { id: 'rinawarp_enterprise', name: 'Enterprise Plan', price: 99 }
      };

      return plans[planType] || {
        id: `rinawarp_${planType}`,
        name: `${planType} Plan`,
        price: 0
      };
    }

    log(message, data = null) {
      if (CONFIG.DEBUG) {
        console.log(`[RinaWarp Analytics] ${message}`, data || '');
      }
    }

    // Public API methods
    trackCustomEvent(eventName, parameters = {}) {
      this.track(eventName, parameters);
    }

    trackPurchase(planType, amount) {
      this.trackPurchaseCompleted({ planType, amount, sessionId: Date.now().toString() });
    }

    trackFeature(featureName, context = '') {
      this.track('feature_used', {
        feature_name: featureName,
        context: context,
        event_category: 'feature_usage'
      });
    }

    trackError(error, fatal = false) {
      this.track('exception', {
        description: error.message || error,
        fatal: fatal,
        error_stack: error.stack?.substring(0, 500)
      });
    }
  }

  // Initialize analytics
  const analytics = new UnifiedAnalytics();

  // Export global functions for backward compatibility
  window.rinaAnalytics = analytics;
  window.trackPurchase = (planType, amount) => analytics.trackPurchase(planType, amount);
  window.trackFeature = (feature, context) => analytics.trackFeature(feature, context);
  window.trackError = (error, fatal) => analytics.trackError(error, fatal);
  
  // Also set GA4 measurement ID for other scripts that might need it
  window.GA4_MEASUREMENT_ID = CONFIG.GA4_MEASUREMENT_ID;

  console.log('🧜‍♀️ RinaWarp Unified Analytics loaded successfully');

})();
