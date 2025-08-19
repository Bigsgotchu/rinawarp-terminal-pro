/**
 * RinaWarp Terminal Analytics Integration
 * Comprehensive client-side tracking for conversions and user behavior
 */

class RinaWarpAnalytics {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.isInitialized = false;
    this.eventQueue = [];
    this.config = {
      apiEndpoint: '/api/analytics',
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      maxRetries: 3,
    };

    // Initialize on construction
    this.initialize();
  }

  /**
   * Initialize analytics system
   */
  initialize() {
    try {
      // Get or create user ID
      this.userId = this.getUserId();

      // Start batch processing
      this.startBatchProcessing();

      // Set up page tracking
      this.setupPageTracking();

      // Set up interaction tracking
      this.setupInteractionTracking();

      this.isInitialized = true;
      console.log('✅ RinaWarp Analytics initialized');

      // Track page load
      this.track('page_view', {
        page: window.location.pathname,
        title: document.title,
        referrer: document.referrer,
        user_agent: navigator.userAgent,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('❌ Analytics initialization failed:', error);
    }
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get or create persistent user ID
   */
  getUserId() {
    let userId = localStorage.getItem('rina_user_id');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('rina_user_id', userId);
    }
    return userId;
  }

  /**
   * Set up page tracking
   */
  setupPageTracking() {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.track('page_hidden', {
          duration: Date.now() - this.pageStartTime,
        });
      } else {
        this.pageStartTime = Date.now();
        this.track('page_visible');
      }
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.track('page_unload', {
        duration: Date.now() - this.pageStartTime,
      });
      this.flush(true); // Force flush on unload
    });

    this.pageStartTime = Date.now();
  }

  /**
   * Set up interaction tracking
   */
  setupInteractionTracking() {
    // Track clicks on key elements
    document.addEventListener('click', event => {
      this.handleClick(event);
    });

    // Track form submissions
    document.addEventListener('submit', event => {
      this.handleFormSubmit(event);
    });

    // Track tier tab switching
    document.addEventListener('click', event => {
      if (event.target.matches('.tier-tab')) {
        const tier = event.target.dataset.tier;
        this.track('tier_viewed', {
          tier: tier,
          source: 'tab_switch',
        });
      }
    });
  }

  /**
   * Handle click events
   */
  handleClick(event) {
    const element = event.target;

    // Track download buttons
    if (element.matches('[href*="releases/"]') || element.textContent.includes('Download')) {
      const tier = this.detectTierFromContext(element);
      const platform = this.detectPlatformFromContext(element);

      this.track('download_attempted', {
        tier: tier,
        platform: platform,
        element_text: element.textContent,
        href: element.href,
      });
    }

    // Track purchase buttons
    if (
      element.matches('[onclick*="buyProfessional"]') ||
      element.textContent.includes('Buy Now') ||
      element.textContent.includes('Purchase')
    ) {
      this.track('purchase_attempted', {
        tier: 'professional',
        element_text: element.textContent,
        source: 'website_button',
      });
    }

    // Track demo requests
    if (
      element.matches('[onclick*="scheduleDemo"]') ||
      element.textContent.includes('Schedule Demo')
    ) {
      this.track('demo_requested', {
        tier: 'enterprise',
        element_text: element.textContent,
      });
    }

    // Track pricing card interactions
    if (element.closest('.pricing-card')) {
      const card = element.closest('.pricing-card');
      const tier = this.detectTierFromCard(card);

      this.track('pricing_card_clicked', {
        tier: tier,
        element_type: element.tagName,
        element_text: element.textContent,
      });
    }

    // Track feature card interactions
    if (element.closest('.feature-card')) {
      const card = element.closest('.feature-card');
      const featureName = card.querySelector('h3')?.textContent;

      this.track('feature_explored', {
        feature: featureName,
        element_type: element.tagName,
      });
    }

    // Track navigation
    if (element.matches('a[href^="#"]')) {
      const section = element.getAttribute('href').substring(1);
      this.track('navigation_clicked', {
        section: section,
        element_text: element.textContent,
      });
    }
  }

  /**
   * Handle form submissions
   */
  handleFormSubmit(event) {
    const form = event.target;
    const formData = new FormData(form);
    const formObject = Object.fromEntries(formData);

    // Determine form type
    let formType = 'unknown';
    if (form.action?.includes('demo') || formObject.company) {
      formType = 'demo_request';
    } else if (formObject.email) {
      formType = 'email_signup';
    }

    this.track('form_submitted', {
      form_type: formType,
      form_action: form.action,
      field_count: formData.size,
    });
  }

  /**
   * Track specific events
   */
  track(eventName, properties = {}) {
    if (!this.isInitialized) {
      this.eventQueue.push({ eventName, properties });
      return;
    }

    const event = {
      event_name: eventName,
      session_id: this.sessionId,
      user_id: this.userId,
      timestamp: Date.now(),
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer,
      ...properties,
    };

    this.eventQueue.push(event);

    // Auto-flush for critical events
    if (this.isCriticalEvent(eventName)) {
      this.flush();
    }
  }

  /**
   * Track purchase conversion
   */
  trackPurchase(tier, amount, currency = 'USD') {
    this.track('purchase_completed', {
      tier: tier,
      amount: amount,
      currency: currency,
      conversion_type: 'direct',
    });
  }

  /**
   * Track demo request
   */
  trackDemoRequest(company, email, details = {}) {
    this.track('demo_request_completed', {
      company: company,
      email: email,
      tier: 'enterprise',
      ...details,
    });
  }

  /**
   * Track tier interest/upgrade intent
   */
  trackTierInterest(fromTier, toTier, action = 'viewed') {
    this.track('tier_upgrade_interest', {
      from_tier: fromTier,
      to_tier: toTier,
      action: action,
    });
  }

  /**
   * Track feature usage intent
   */
  trackFeatureInterest(feature, context = '') {
    this.track('feature_interest', {
      feature: feature,
      context: context,
    });
  }

  /**
   * Detect tier from element context
   */
  detectTierFromContext(element) {
    // Look for tier indicators in the element or its parents
    const tierIndicators = ['free', 'personal', 'professional', 'enterprise'];

    // Check element text
    const text = element.textContent.toLowerCase();
    for (const tier of tierIndicators) {
      if (text.includes(tier)) return tier;
    }

    // Check parent containers
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      const parentText = parent.textContent.toLowerCase();
      for (const tier of tierIndicators) {
        if (parentText.includes(tier)) return tier;
      }

      // Check for tier-specific classes or IDs
      const className = parent.className.toLowerCase();
      const id = parent.id?.toLowerCase() || '';
      for (const tier of tierIndicators) {
        if (className.includes(tier) || id.includes(tier)) return tier;
      }

      parent = parent.parentElement;
    }

    return 'unknown';
  }

  /**
   * Detect platform from element context
   */
  detectPlatformFromContext(element) {
    const platforms = ['windows', 'macos', 'linux', 'web'];
    const text = element.textContent.toLowerCase();

    for (const platform of platforms) {
      if (text.includes(platform) || text.includes(platform.replace('os', ''))) {
        return platform;
      }
    }

    // Check href for platform indicators
    if (element.href) {
      const href = element.href.toLowerCase();
      if (href.includes('windows') || href.includes('.exe')) return 'windows';
      if (href.includes('macos') || href.includes('.dmg')) return 'macos';
      if (href.includes('linux') || href.includes('.tar.gz')) return 'linux';
    }

    return 'unknown';
  }

  /**
   * Detect tier from pricing card
   */
  detectTierFromCard(card) {
    const cardText = card.textContent.toLowerCase();
    if (cardText.includes('enterprise')) return 'enterprise';
    if (cardText.includes('professional') || cardText.includes('pro')) return 'professional';
    if (cardText.includes('personal') || cardText.includes('free')) return 'personal';
    return 'unknown';
  }

  /**
   * Check if event is critical and should be flushed immediately
   */
  isCriticalEvent(eventName) {
    const criticalEvents = [
      'purchase_attempted',
      'purchase_completed',
      'demo_requested',
      'demo_request_completed',
      'form_submitted',
      'page_unload',
    ];
    return criticalEvents.includes(eventName);
  }

  /**
   * Start batch processing
   */
  startBatchProcessing() {
    // Flush events periodically
    setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);

    // Flush when queue reaches batch size
    const originalPush = this.eventQueue.push;
    this.eventQueue.push = (...items) => {
      const result = originalPush.apply(this.eventQueue, items);
      if (this.eventQueue.length >= this.config.batchSize) {
        this.flush();
      }
      return result;
    };
  }

  /**
   * Flush events to server
   */
  async flush(force = false) {
    if (!this.eventQueue.length) return;

    const events = this.eventQueue.splice(0);

    try {
      const response = await fetch(`${this.config.apiEndpoint}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: events,
          session_id: this.sessionId,
          user_id: this.userId,
          flush_reason: force ? 'forced' : 'batch',
        }),
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }

      console.log(`✅ Analytics: Flushed ${events.length} events`);
    } catch (error) {
      console.error('❌ Analytics flush failed:', error);

      // Re-queue events for retry (unless it's a forced flush)
      if (!force && events.length > 0) {
        this.eventQueue.unshift(...events.slice(-10)); // Keep only last 10 for retry
      }
    }
  }

  /**
   * Get analytics summary
   */
  async getSummary() {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/summary`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get analytics summary:', error);
      return null;
    }
  }

  /**
   * Enable debug mode
   */
  enableDebug() {
    this.debug = true;
    console.log('🔍 Analytics debug mode enabled');

    // Log all tracked events
    const originalTrack = this.track;
    this.track = (eventName, properties) => {
      console.log(`📊 Analytics Event: ${eventName}`, properties);
      originalTrack.call(this, eventName, properties);
    };
  }
}

// Initialize analytics
const rinaAnalytics = new RinaWarpAnalytics();

// Global functions for easy integration
window.trackPurchase = (tier, amount) => rinaAnalytics.trackPurchase(tier, amount);
window.trackDemoRequest = (company, email) => rinaAnalytics.trackDemoRequest(company, email);
window.trackTierInterest = (from, to, action) => rinaAnalytics.trackTierInterest(from, to, action);
window.trackFeature = (feature, context) => rinaAnalytics.trackFeatureInterest(feature, context);

// Expose analytics instance globally
window.rinaAnalytics = rinaAnalytics;

// Enable debug mode in development
if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
  rinaAnalytics.enableDebug();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RinaWarpAnalytics;
}
