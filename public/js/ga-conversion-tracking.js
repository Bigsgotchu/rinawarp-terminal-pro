/**
 * Google Tag Manager Conversion Tracking
 * Tracks key revenue and engagement events for RinaWarp Terminal via GTM
 * GTM Container: GTM-5LDNPV8Z
 */

// Initialize conversion tracking
class GTMConversionTracker {
  constructor() {
    this.initialized = false;
    this.gtmContainerId = 'GTM-5LDNPV8Z';
    // this.trackingId = window.GA_TRACKING_ID || 'G-SZK23HMCVP'; // Now managed through GTM
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    if (!window.dataLayer) {
      console.warn('GTM Conversion Tracker: dataLayer not available');
      return;
    }

    this.initialized = true;
    this.setupEventListeners();
    this.trackPageView();
    console.log('✅ GTM Conversion Tracking initialized');
  }

  // Core tracking method - uses GTM dataLayer
  track(eventName, parameters = {}) {
    if (!this.initialized || !window.dataLayer) {
      console.warn('GTM tracking not available:', eventName);
      return;
    }

    // Prepare event data for GTM dataLayer
    const eventData = {
      event: eventName,
      event_category: parameters.category || 'engagement',
      event_label: parameters.label || '',
      value: parameters.value || 0,
      currency: parameters.currency || 'USD',
      gtm_container_id: this.gtmContainerId,
      timestamp: new Date().toISOString(),
      ...parameters
    };

    // Push to dataLayer for GTM
    window.dataLayer.push(eventData);
    console.log('📊 GTM Event:', eventName, eventData);
  }

  // Page tracking
  trackPageView(path = window.location.pathname) {
    this.track('page_view', {
      page_path: path,
      page_title: document.title
    });
  }

  // Revenue events
  trackDownload(platform, version = '1.3.1') {
    this.track('download', {
      category: 'downloads',
      label: `${platform}_${version}`,
      custom_parameters: {
        platform: platform,
        version: version,
        download_method: 'direct'
      }
    });
  }

  trackPurchase(planType, amount, currency = 'USD') {
    this.track('purchase', {
      category: 'revenue',
      transaction_id: Date.now().toString(),
      value: parseFloat(amount),
      currency: currency,
      items: [{
        item_id: `rinawarp_${planType.toLowerCase()}`,
        item_name: `RinaWarp Terminal ${planType}`,
        category: 'software',
        quantity: 1,
        price: parseFloat(amount)
      }]
    });
  }

  trackTrialStart(planType) {
    this.track('begin_trial', {
      category: 'conversion',
      label: planType,
      custom_parameters: {
        trial_plan: planType,
        trial_duration: '14_days'
      }
    });
  }

  trackSignup(method = 'email') {
    this.track('sign_up', {
      category: 'conversion',
      method: method,
      custom_parameters: {
        signup_method: method
      }
    });
  }

  // Engagement events
  trackFeatureUsage(featureName) {
    this.track('feature_use', {
      category: 'engagement',
      label: featureName,
      custom_parameters: {
        feature: featureName
      }
    });
  }

  trackVideoPlay(videoName) {
    this.track('video_play', {
      category: 'engagement',
      label: videoName,
      custom_parameters: {
        video_title: videoName
      }
    });
  }

  trackSearch(searchTerm) {
    this.track('search', {
      category: 'engagement',
      search_term: searchTerm
    });
  }

  // User behavior
  trackSession(duration) {
    this.track('session_end', {
      category: 'engagement',
      value: Math.round(duration / 1000), // seconds
      custom_parameters: {
        session_duration: duration
      }
    });
  }

  trackError(errorType, errorMessage) {
    this.track('exception', {
      category: 'errors',
      description: `${errorType}: ${errorMessage}`,
      fatal: false
    });
  }

  // Setup automatic event listeners
  setupEventListeners() {
    // Track downloads
    document.querySelectorAll('a[href*="download"], a[href*=".zip"], a[href*=".dmg"], a[href*=".exe"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = e.target.href;
        let platform = 'unknown';
        
        if (href.includes('mac') || href.includes('.dmg')) platform = 'macOS';
        else if (href.includes('windows') || href.includes('.exe')) platform = 'Windows';
        else if (href.includes('linux') || href.includes('.tar.gz')) platform = 'Linux';
        
        this.trackDownload(platform);
      });
    });

    // Track external links
    document.querySelectorAll('a[href^="http"]:not([href*="rinawarptech.com"])').forEach(link => {
      link.addEventListener('click', (e) => {
        this.track('click', {
          category: 'outbound',
          label: e.target.href,
          custom_parameters: {
            link_url: e.target.href,
            link_text: e.target.textContent.trim()
          }
        });
      });
    });

    // Track form submissions
    document.querySelectorAll('form').forEach(form => {
      form.addEventListener('submit', (e) => {
        const formName = form.id || form.className || 'unnamed_form';
        this.track('form_submit', {
          category: 'engagement',
          label: formName,
          custom_parameters: {
            form_name: formName
          }
        });
      });
    });

    // Track scroll depth
    let maxScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
      
      if (scrollPercent > maxScroll && scrollPercent % 25 === 0) {
        maxScroll = scrollPercent;
        this.track('scroll', {
          category: 'engagement',
          value: scrollPercent,
          custom_parameters: {
            scroll_depth: scrollPercent
          }
        });
      }
    });

    // Track time on page
    const startTime = Date.now();
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Date.now() - startTime;
      if (timeOnPage > 10000) { // Only track if user stayed > 10 seconds
        this.trackSession(timeOnPage);
      }
    });
  }

  // Custom revenue attribution
  setupRevenueAttribution() {
    // Track referrer information
    const referrer = document.referrer;
    const urlParams = new URLSearchParams(window.location.search);
    
    const attributionData = {
      referrer: referrer,
      utm_source: urlParams.get('utm_source'),
      utm_medium: urlParams.get('utm_medium'),
      utm_campaign: urlParams.get('utm_campaign'),
      landing_page: window.location.pathname
    };

    // Store attribution in session storage
    sessionStorage.setItem('ga_attribution', JSON.stringify(attributionData));

    // Send custom attribution event
    this.track('attribution', {
      category: 'acquisition',
      custom_parameters: attributionData
    });
  }
}

// Initialize global tracker
window.gtmTracker = new GTMConversionTracker();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GTMConversionTracker;
}

// Convenience functions for easy tracking
window.trackDownload = (platform) => window.gtmTracker?.trackDownload(platform);
window.trackPurchase = (plan, amount) => window.gtmTracker?.trackPurchase(plan, amount);
window.trackFeature = (feature) => window.gtmTracker?.trackFeatureUsage(feature);
window.trackError = (type, msg) => window.gtmTracker?.trackError(type, msg);
