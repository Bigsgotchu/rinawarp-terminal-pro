/**
 * 🔍 Advanced Analytics & Performance Monitoring Setup
 * RinaWarp Terminal - Production Analytics Suite
 */

// Enhanced Google Analytics 4 Configuration
class RinaWarpAnalytics {
  constructor() {
    this.initialized = false;
    this.events = [];
    this.userProperties = {};
  }

  // Initialize GA4 with enhanced tracking
  init() {
    if (this.initialized) return;
    
    // Enhanced GA4 setup
    gtag('config', 'G-G424CV5GGT', {
      // Enhanced measurement
      enhanced_measurements: {
        scrolls: true,
        outbound_clicks: true,
        site_search: true,
        video_engagement: true,
        file_downloads: true
      },
      // Custom parameters
      custom_map: {
        'custom_parameter_1': 'plan_type',
        'custom_parameter_2': 'user_segment',
        'custom_parameter_3': 'feature_used'
      },
      // Privacy settings
      anonymize_ip: true,
      cookie_flags: 'secure;samesite=strict',
      // Performance monitoring
      performance_timing: true
    });

    // Set up conversion tracking
    this.setupConversionTracking();
    this.setupUserJourneyTracking();
    this.setupErrorTracking();
    
    this.initialized = true;
    console.log('🔍 RinaWarp Analytics initialized');
  }

  // Conversion tracking for revenue optimization
  setupConversionTracking() {
    // Purchase conversion
    window.trackPurchase = (planType, value, currency = 'USD') => {
      gtag('event', 'purchase', {
        transaction_id: Date.now().toString(),
        value: value,
        currency: currency,
        items: [{
          item_id: `rinawarp_${planType}`,
          item_name: `RinaWarp Terminal ${planType}`,
          category: 'software',
          quantity: 1,
          price: value
        }]
      });
      
      // LogRocket revenue tracking
      if (window.LogRocket) {
        LogRocket.track('Purchase Completed', {
          plan: planType,
          value: value,
          currency: currency,
          timestamp: new Date().toISOString()
        });
      }
    };

    // Trial signup conversion
    window.trackTrialSignup = (planType) => {
      gtag('event', 'sign_up', {
        method: 'trial',
        plan_type: planType
      });
      
      if (window.LogRocket) {
        LogRocket.track('Trial Started', {
          plan: planType,
          source: 'website',
          timestamp: new Date().toISOString()
        });
      }
    };

    // Download tracking
    window.trackDownload = (platform, planType) => {
      gtag('event', 'file_download', {
        file_name: `RinaWarp-Terminal-${platform}`,
        plan_type: planType,
        file_extension: platform === 'Windows' ? 'exe' : 'zip'
      });
    };
  }

  // User journey tracking
  setupUserJourneyTracking() {
    // Page engagement tracking
    let maxScroll = 0;
    let timeOnPage = Date.now();

    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        
        // Track milestone scrolls
        if ([25, 50, 75, 90].includes(scrollPercent)) {
          gtag('event', 'scroll', {
            percent_scrolled: scrollPercent
          });
        }
      }
    });

    // Demo interaction tracking
    window.trackDemoInteraction = (demoType) => {
      gtag('event', 'demo_interaction', {
        demo_type: demoType,
        engagement_type: 'click'
      });
      
      if (window.LogRocket) {
        LogRocket.track('Demo Interaction', {
          demo: demoType,
          timestamp: new Date().toISOString()
        });
      }
    };

    // Pricing card interaction
    window.trackPricingInteraction = (planType, action) => {
      gtag('event', 'pricing_interaction', {
        plan_type: planType,
        action: action // 'view', 'click', 'hover'
      });
    };

    // Exit intent tracking
    document.addEventListener('mouseleave', (e) => {
      if (e.clientY <= 0) {
        gtag('event', 'exit_intent', {
          time_on_page: Math.round((Date.now() - timeOnPage) / 1000)
        });
      }
    });
  }

  // Error and performance tracking
  setupErrorTracking() {
    // JavaScript error tracking
    window.addEventListener('error', (event) => {
      gtag('event', 'exception', {
        description: event.error?.message || 'Unknown error',
        fatal: false,
        filename: event.filename,
        lineno: event.lineno
      });
      
      if (window.LogRocket) {
        LogRocket.captureException(event.error || new Error(event.message));
      }
    });

    // Performance monitoring
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        
        gtag('event', 'timing_complete', {
          name: 'load_time',
          value: Math.round(perfData.loadEventEnd - perfData.fetchStart)
        });

        // Track Core Web Vitals
        if ('web-vitals' in window) {
          getCLS(metric => gtag('event', 'web_vitals', { name: 'CLS', value: metric.value }));
          getFID(metric => gtag('event', 'web_vitals', { name: 'FID', value: metric.value }));
          getLCP(metric => gtag('event', 'web_vitals', { name: 'LCP', value: metric.value }));
        }
      }, 0);
    });

    // API error tracking
    window.trackAPIError = (endpoint, status, error) => {
      gtag('event', 'api_error', {
        endpoint: endpoint,
        status_code: status,
        error_message: error
      });
      
      if (window.LogRocket) {
        LogRocket.track('API Error', {
          endpoint,
          status,
          error,
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  // Custom business metrics
  trackBusinessMetric(metric, value, properties = {}) {
    gtag('event', 'custom_business_metric', {
      metric_name: metric,
      metric_value: value,
      ...properties
    });
  }

  // User segmentation
  identifyUser(userId, properties = {}) {
    // Set user properties for analytics
    gtag('set', { user_id: userId });
    gtag('set', 'user_properties', properties);
    
    // LogRocket user identification
    if (window.LogRocket) {
      LogRocket.identify(userId, properties);
    }
  }
}

// Initialize analytics
const analytics = new RinaWarpAnalytics();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => analytics.init());
} else {
  analytics.init();
}

// Export for global use
window.RinaWarpAnalytics = analytics;

// Enhanced monitoring dashboard data
window.getAnalyticsDashboard = async () => {
  const data = {
    pageviews: await getPageviewData(),
    conversions: await getConversionData(),
    userJourney: await getUserJourneyData(),
    performance: await getPerformanceData(),
    errors: await getErrorData()
  };
  
  return data;
};

export default RinaWarpAnalytics;
