/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

// RinaWarp Terminal - Advanced Sales Analytics & Conversion Tracking
// This script tracks sales performance and user behavior for revenue optimization

class RinaWarpAnalytics {
  constructor() {
    this.apiUrl = 'https://www.rinawarptech.com/api/analytics';
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.events = [];

    // Initialize tracking
    this.init();
  }

  init() {
    console.log('🎯 RinaWarp Analytics initialized');

    // Track page views
    this.trackPageView();

    // Track user interactions
    this.setupEventListeners();

    // Track checkout conversions
    this.trackCheckoutEvents();

    // Send data every 30 seconds
    setInterval(() => this.sendBatch(), 30000);

    // Send data before page unload
    window.addEventListener('beforeunload', () => this.sendBatch());
  }

  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  trackEvent(eventName, data = {}) {
    const event = {
      id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      sessionId: this.sessionId,
      eventName,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      ...data,
    };

    this.events.push(event);
    console.log('📊 Event tracked:', eventName, data);

    // Send immediately for critical events
    if (['checkout_initiated', 'payment_success', 'purchase_completed'].includes(eventName)) {
      this.sendBatch();
    }
  }

  trackPageView() {
    this.trackEvent('page_view', {
      title: document.title,
      path: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    });
  }

  setupEventListeners() {
    // Track button clicks
    document.addEventListener('click', e => {
      if (e.target.tagName === 'BUTTON' || e.target.onclick) {
        this.trackEvent('button_click', {
          buttonText: e.target.textContent?.trim(),
          buttonId: e.target.id,
          buttonClass: e.target.className,
        });
      }

      // Track pricing plan selection
      if (e.target.textContent?.includes('GET ') && e.target.textContent?.includes('$')) {
        const planMatch = e.target.textContent.match(/(PERSONAL|PRO|TEAM)/);
        const priceMatch = e.target.textContent.match(/\$(\d+)/);

        this.trackEvent('pricing_plan_selected', {
          plan: planMatch ? planMatch[1] : 'unknown',
          price: priceMatch ? priceMatch[1] : 'unknown',
          buttonText: e.target.textContent.trim(),
        });
      }
    });

    // Track form interactions
    document.addEventListener('input', e => {
      if (e.target.type === 'email') {
        this.trackEvent('email_input', {
          fieldId: e.target.id,
          hasValue: e.target.value.length > 0,
        });
      }
    });

    // Track scroll depth
    let maxScrollPercent = 0;
    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      if (scrollPercent > maxScrollPercent && scrollPercent % 25 === 0) {
        maxScrollPercent = scrollPercent;
        this.trackEvent('scroll_depth', { percent: scrollPercent });
      }
    });

    // Track time on page
    setInterval(() => {
      const timeOnPage = Date.now() - this.startTime;
      if (timeOnPage % 60000 === 0) {
        // Every minute
        this.trackEvent('time_on_page', {
          seconds: Math.floor(timeOnPage / 1000),
        });
      }
    }, 1000);
  }

  trackCheckoutEvents() {
    // Track checkout initiation
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [url, options] = args;

      if (url.includes('/api/create-checkout-session')) {
        this.trackEvent('checkout_initiated', {
          url: url,
          method: options?.method || 'GET',
        });

        try {
          const response = await originalFetch(...args);
          if (response.ok) {
            this.trackEvent('checkout_session_created', {
              status: response.status,
            });
          }
          return response;
        } catch (error) {
          this.trackEvent('checkout_error', {
            error: error.message,
          });
          throw new Error(error);
        }
      }

      return originalFetch(...args);
    };
  }

  // Track purchase completion (call this from success page)
  trackPurchaseSuccess(data) {
    this.trackEvent('purchase_completed', {
      sessionId: data.sessionId,
      plan: data.plan,
      amount: data.amount,
      customerId: data.customerId,
    });
  }

  async sendBatch() {
    if (this.events.length === 0) return;

    const batch = {
      sessionId: this.sessionId,
      events: [...this.events],
      metadata: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        timestamp: Date.now(),
      },
    };

    try {
      // Send to our analytics endpoint
      await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      console.log(`📊 Analytics batch sent: ${this.events.length} events`);
      this.events = []; // Clear sent events
    } catch (error) {
      console.warn('Analytics batch failed:', error);
      // Keep events for retry, but limit to prevent memory issues
      if (this.events.length > 100) {
        this.events = this.events.slice(-50);
      }
    }
  }

  // Get real-time conversion metrics
  getMetrics() {
    const pageViews = this.events.filter(e => e.eventName === 'page_view').length;
    const checkoutInitiated = this.events.filter(e => e.eventName === 'checkout_initiated').length;
    const purchases = this.events.filter(e => e.eventName === 'purchase_completed').length;

    return {
      sessionId: this.sessionId,
      pageViews,
      checkoutInitiated,
      purchases,
      conversionRate: pageViews > 0 ? ((purchases / pageViews) * 100).toFixed(2) : 0,
      timeOnSite: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}

// Auto-initialize analytics
if (typeof window !== 'undefined') {
  window.RinaWarpAnalytics = new RinaWarpAnalytics();

  // Expose metrics to console for debugging
  window.getAnalytics = () => window.RinaWarpAnalytics.getMetrics();
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RinaWarpAnalytics;
}
