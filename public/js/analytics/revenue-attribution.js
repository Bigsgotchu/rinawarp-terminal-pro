/**
 * 💰 Revenue Attribution Tracking System
 * Track customer journey from first visit to purchase
 * Perfect for SaaS conversion optimization
 */

class RevenueAttributionTracker {
  constructor() {
    this.measurementId = 'G-G424CV5GGT';
    this.sessionData = this.getSessionData();
    this.userJourney = this.getUserJourney();
    
    this.init();
  }

  init() {
    this.trackFirstVisit();
    this.setupAttributionTracking();
    this.trackUtmParameters();
    this.setupFormTracking();
  }

  // 🎯 Track first-touch attribution
  trackFirstVisit() {
    const firstVisit = localStorage.getItem('rinawarp_first_visit');
    const currentTime = Date.now();
    
    if (!firstVisit) {
      const attributionData = {
        timestamp: currentTime,
        referrer: document.referrer || 'direct',
        utm_source: this.getUrlParameter('utm_source') || 'direct',
        utm_medium: this.getUrlParameter('utm_medium') || 'none',
        utm_campaign: this.getUrlParameter('utm_campaign') || 'none',
        landing_page: window.location.pathname,
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`
      };
      
      localStorage.setItem('rinawarp_first_visit', JSON.stringify(attributionData));
      
      // Send first visit event to GA4
      gtag('event', 'first_visit', {
        event_category: 'attribution',
        first_touch_source: attributionData.utm_source,
        first_touch_medium: attributionData.utm_medium,
        first_touch_campaign: attributionData.utm_campaign,
        landing_page: attributionData.landing_page,
        referrer: attributionData.referrer
      });
    }
  }

  // 📊 Track complete customer journey
  setupAttributionTracking() {
    // Track page views with attribution context
    this.trackPageViewWithAttribution();
    
    // Track pricing page visits
    if (window.location.pathname.includes('pricing')) {
      this.trackPricingPageVisit();
    }
    
    // Track demo interactions
    this.setupDemoTracking();
    
    // Track download attempts
    this.setupDownloadTracking();
  }

  trackPageViewWithAttribution() {
    const firstVisit = JSON.parse(localStorage.getItem('rinawarp_first_visit') || '{}');
    const currentVisit = {
      utm_source: this.getUrlParameter('utm_source'),
      utm_medium: this.getUrlParameter('utm_medium'),
      utm_campaign: this.getUrlParameter('utm_campaign'),
      referrer: document.referrer
    };

    gtag('event', 'page_view_attributed', {
      event_category: 'attribution',
      page_location: window.location.href,
      page_title: document.title,
      
      // First-touch attribution
      first_touch_source: firstVisit.utm_source || 'direct',
      first_touch_medium: firstVisit.utm_medium || 'none',
      first_touch_campaign: firstVisit.utm_campaign || 'none',
      first_touch_timestamp: firstVisit.timestamp,
      
      // Current-touch attribution
      current_touch_source: currentVisit.utm_source || 'direct',
      current_touch_medium: currentVisit.utm_medium || 'none',
      current_touch_campaign: currentVisit.utm_campaign || 'none',
      
      // Session data
      session_number: this.getSessionNumber(),
      days_since_first_visit: this.getDaysSinceFirstVisit()
    });
  }

  // 💳 Track pricing page engagement
  trackPricingPageVisit() {
    const timeOnPricing = Date.now();
    
    gtag('event', 'view_promotion', {
      event_category: 'ecommerce',
      promotion_id: 'pricing_page',
      promotion_name: 'RinaWarp Pricing Plans',
      creative_name: 'Main Pricing Page',
      creative_slot: 'header',
      location_id: 'pricing_page',
      
      // Attribution context
      ...this.getAttributionContext()
    });

    // Track time spent on pricing
    window.addEventListener('beforeunload', () => {
      const timeSpent = Math.round((Date.now() - timeOnPricing) / 1000);
      
      gtag('event', 'pricing_page_engagement', {
        event_category: 'engagement',
        engagement_time_msec: timeSpent * 1000,
        time_on_pricing: timeSpent,
        
        // Attribution context
        ...this.getAttributionContext()
      });
    });
  }

  // 🎮 Setup demo tracking
  setupDemoTracking() {
    // Track demo button clicks with attribution
    document.querySelectorAll('[data-demo], .demo-button, [onclick*="demo"]').forEach(button => {
      button.addEventListener('click', (e) => {
        const demoType = button.dataset.demo || 
                        button.textContent.trim().toLowerCase() ||
                        'unknown_demo';
        
        gtag('event', 'select_content', {
          event_category: 'demo_interaction',
          content_type: 'demo',
          item_id: demoType,
          content_id: demoType,
          
          // Attribution context
          ...this.getAttributionContext()
        });
      });
    });
  }

  // ⬇️ Setup download tracking with attribution
  setupDownloadTracking() {
    document.querySelectorAll('a[href*="download"], .download-button').forEach(link => {
      link.addEventListener('click', (e) => {
        const platform = this.extractPlatform(link.href || link.textContent);
        
        gtag('event', 'file_download', {
          event_category: 'downloads',
          file_name: `RinaWarp-Terminal-${platform}`,
          file_extension: platform === 'windows' ? 'exe' : 'zip',
          link_url: link.href,
          
          // Attribution context
          ...this.getAttributionContext(),
          
          // Download-specific attribution
          download_source: window.location.pathname,
          download_trigger: link.textContent.trim()
        });
      });
    });
  }

  // 🛒 Track purchase with full attribution
  trackPurchaseWithAttribution(transactionData) {
    const firstVisit = JSON.parse(localStorage.getItem('rinawarp_first_visit') || '{}');
    const journeyData = this.calculateJourneyMetrics();
    
    gtag('event', 'purchase', {
      transaction_id: transactionData.id,
      value: transactionData.amount,
      currency: 'USD',
      
      // Standard e-commerce data
      items: [{
        item_id: transactionData.plan_id,
        item_name: `RinaWarp Terminal ${transactionData.plan_name}`,
        category: 'software_subscription',
        quantity: 1,
        price: transactionData.amount
      }],
      
      // Full attribution context
      ...this.getAttributionContext(),
      
      // Journey metrics
      days_to_conversion: journeyData.daysToConversion,
      sessions_to_conversion: journeyData.sessionsToConversion,
      pages_viewed_before_purchase: journeyData.pagesViewed,
      total_engagement_time: journeyData.totalEngagementTime,
      
      // Revenue attribution
      attributed_channel: firstVisit.utm_source || 'direct',
      attributed_medium: firstVisit.utm_medium || 'none',
      attributed_campaign: firstVisit.utm_campaign || 'none'
    });

    // Track customer lifetime value start
    this.initializeCLVTracking(transactionData);
  }

  // 📈 Initialize Customer Lifetime Value tracking
  initializeCLVTracking(transactionData) {
    const customerData = {
      first_purchase_date: Date.now(),
      first_purchase_amount: transactionData.amount,
      plan_type: transactionData.plan_name,
      attribution_source: this.getAttributionContext().first_touch_source
    };
    
    localStorage.setItem('rinawarp_clv_data', JSON.stringify(customerData));
    
    gtag('event', 'customer_created', {
      event_category: 'clv_tracking',
      customer_value: transactionData.amount,
      plan_type: transactionData.plan_name,
      
      // Attribution for CLV
      ...this.getAttributionContext()
    });
  }

  // 🔧 Helper functions
  getAttributionContext() {
    const firstVisit = JSON.parse(localStorage.getItem('rinawarp_first_visit') || '{}');
    
    return {
      first_touch_source: firstVisit.utm_source || 'direct',
      first_touch_medium: firstVisit.utm_medium || 'none',
      first_touch_campaign: firstVisit.utm_campaign || 'none',
      first_touch_timestamp: firstVisit.timestamp,
      session_number: this.getSessionNumber()
    };
  }

  getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  getSessionNumber() {
    let sessionNum = parseInt(localStorage.getItem('rinawarp_session_count') || '0');
    sessionNum += 1;
    localStorage.setItem('rinawarp_session_count', sessionNum.toString());
    return sessionNum;
  }

  getDaysSinceFirstVisit() {
    const firstVisit = JSON.parse(localStorage.getItem('rinawarp_first_visit') || '{}');
    if (!firstVisit.timestamp) return 0;
    
    return Math.floor((Date.now() - firstVisit.timestamp) / (1000 * 60 * 60 * 24));
  }

  calculateJourneyMetrics() {
    const firstVisit = JSON.parse(localStorage.getItem('rinawarp_first_visit') || '{}');
    const sessionCount = parseInt(localStorage.getItem('rinawarp_session_count') || '1');
    
    return {
      daysToConversion: this.getDaysSinceFirstVisit(),
      sessionsToConversion: sessionCount,
      pagesViewed: parseInt(localStorage.getItem('rinawarp_pages_viewed') || '1'),
      totalEngagementTime: parseInt(localStorage.getItem('rinawarp_total_time') || '0')
    };
  }

  extractPlatform(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('mac') || lowerText.includes('darwin')) return 'macos';
    if (lowerText.includes('win') || lowerText.includes('windows')) return 'windows';
    if (lowerText.includes('linux') || lowerText.includes('ubuntu')) return 'linux';
    return 'unknown';
  }

  // 📊 Get journey summary for analytics
  getJourneySummary() {
    return {
      attribution: this.getAttributionContext(),
      journey: this.calculateJourneyMetrics(),
      clv: JSON.parse(localStorage.getItem('rinawarp_clv_data') || '{}')
    };
  }
}

// Global functions for easy integration
window.revenueTracker = new RevenueAttributionTracker();

// Helper function for Stripe integration
window.trackStripeRevenue = function(session) {
  window.revenueTracker.trackPurchaseWithAttribution({
    id: session.id,
    amount: session.amount_total / 100, // Stripe amounts are in cents
    plan_id: session.metadata?.plan_id || 'unknown',
    plan_name: session.metadata?.plan_name || 'Unknown Plan'
  });
};

console.log('💰 Revenue Attribution Tracking initialized');
