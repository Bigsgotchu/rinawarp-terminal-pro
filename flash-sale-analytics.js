/**
 * RinaWarp Flash Sale Analytics & Conversion Tracking
 * Monitors flash sale effectiveness and user behavior
 */

class FlashSaleAnalytics {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.events = [];
    this.apiEndpoint = 'http://18.212.105.169/api/analytics';
    this.conversionGoals = {
      banner_click: 5,
      popup_show: 10,
      popup_convert: 2,
      download_start: 1,
      purchase_complete: 1,
    };

    this.init();
  }

  generateSessionId() {
    return 'fs_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  init() {
    this.trackPageView();
    this.setupEventTracking();
    this.startPerformanceMonitoring();
    this.setupRealtimeReporting();

    // Track flash sale specific metrics
    this.trackFlashSaleMetrics();
  }

  trackEvent(eventName, properties = {}) {
    const event = {
      sessionId: this.sessionId,
      eventName,
      properties: {
        ...properties,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      },
    };

    this.events.push(event);

    // Send immediately for critical events
    const criticalEvents = ['purchase_complete', 'download_start', 'popup_convert'];
    if (criticalEvents.includes(eventName)) {
      this.sendEvent(event);
    }

    // Check conversion goals
    this.checkConversionGoals(eventName);

    console.log('🔥 Flash Sale Event:', eventName, properties);
  }

  trackPageView() {
    this.trackEvent('page_view', {
      page_title: document.title,
      flash_sale_active: true,
    });
  }

  setupEventTracking() {
    // Track banner interactions
    this.trackBannerEvents();

    // Track popup events
    this.trackPopupEvents();

    // Track download attempts
    this.trackDownloadEvents();

    // Track scroll behavior
    this.trackScrollBehavior();

    // Track time on page
    this.trackTimeOnPage();
  }

  trackBannerEvents() {
    // Track banner visibility
    const banner = document.querySelector('.urgency-banner');
    if (banner) {
      this.trackEvent('banner_shown', {
        banner_text: banner.textContent.trim(),
      });

      // Track banner clicks
      banner.addEventListener('click', e => {
        this.trackEvent('banner_click', {
          click_target: e.target.tagName,
          click_text: e.target.textContent,
        });
      });

      // Track banner close (if close button exists)
      const closeBtn = banner.querySelector('.close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.trackEvent('banner_closed');
        });
      }
    }
  }

  trackPopupEvents() {
    // Track exit-intent popup
    let popupShown = false;

    document.addEventListener('mouseleave', () => {
      if (!popupShown) {
        this.trackEvent('exit_intent_triggered');
        popupShown = true;
      }
    });

    // Track popup interactions
    document.addEventListener('click', e => {
      if (e.target.matches('.popup-overlay, .popup-close')) {
        this.trackEvent('popup_dismissed');
      }

      if (e.target.matches('.popup-cta')) {
        this.trackEvent('popup_convert', {
          cta_text: e.target.textContent,
        });
      }
    });
  }

  trackDownloadEvents() {
    // Track download button clicks
    document.addEventListener('click', e => {
      if (e.target.matches('[href*="download"], .download-btn, .cta-button')) {
        this.trackEvent('download_start', {
          button_text: e.target.textContent,
          button_location: this.getElementContext(e.target),
        });
      }
    });
  }

  trackScrollBehavior() {
    let maxScroll = 0;
    const scrollMilestones = [25, 50, 75, 90, 100];
    const trackedMilestones = new Set();

    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      maxScroll = Math.max(maxScroll, scrollPercent);

      scrollMilestones.forEach(milestone => {
        if (scrollPercent >= milestone && !trackedMilestones.has(milestone)) {
          this.trackEvent('scroll_milestone', {
            milestone: milestone,
            max_scroll: maxScroll,
          });
          trackedMilestones.add(milestone);
        }
      });
    });
  }

  trackTimeOnPage() {
    // Track engagement milestones
    const milestones = [10, 30, 60, 120, 300]; // seconds
    const trackedTime = new Set();

    setInterval(() => {
      const timeOnPage = Math.round((Date.now() - this.startTime) / 1000);

      milestones.forEach(milestone => {
        if (timeOnPage >= milestone && !trackedTime.has(milestone)) {
          this.trackEvent('time_milestone', {
            time_on_page: timeOnPage,
            milestone: milestone,
          });
          trackedTime.add(milestone);
        }
      });
    }, 5000);
  }

  trackFlashSaleMetrics() {
    // Track countdown timer interactions
    const timer = document.querySelector('.countdown-timer');
    if (timer) {
      this.trackEvent('countdown_shown');

      // Track timer urgency (when time is low)
      setInterval(() => {
        const timeLeft = this.parseCountdownTime(timer.textContent);
        if (timeLeft && timeLeft < 3600000) {
          // Less than 1 hour
          this.trackEvent('countdown_urgent', {
            time_remaining: timeLeft,
          });
        }
      }, 60000); // Check every minute
    }

    // Track social proof counter
    const socialProof = document.querySelector('.social-proof');
    if (socialProof) {
      this.trackEvent('social_proof_shown', {
        proof_text: socialProof.textContent,
      });
    }
  }

  parseCountdownTime(timeText) {
    // Parse countdown timer text to get milliseconds remaining
    const timeMatch = timeText.match(/(\d+)h (\d+)m (\d+)s/);
    if (timeMatch) {
      const [, hours, minutes, seconds] = timeMatch;
      return (parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds)) * 1000;
    }
    return null;
  }

  checkConversionGoals(eventName) {
    if (this.conversionGoals[eventName]) {
      this.trackEvent('conversion_goal_reached', {
        goal_event: eventName,
        goal_value: this.conversionGoals[eventName],
      });
    }
  }

  getElementContext(element) {
    const rect = element.getBoundingClientRect();
    return {
      section: element.closest('section')?.className || 'unknown',
      position: `${rect.top}px from top`,
      visible: rect.top < window.innerHeight && rect.bottom > 0,
    };
  }

  startPerformanceMonitoring() {
    // Monitor page performance
    if (window.performance && window.performance.timing) {
      window.addEventListener('load', () => {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;

        this.trackEvent('page_performance', {
          load_time: loadTime,
          dom_ready: timing.domContentLoadedEventEnd - timing.navigationStart,
          first_paint: timing.responseStart - timing.navigationStart,
        });
      });
    }
  }

  setupRealtimeReporting() {
    // Send batched events every 30 seconds
    setInterval(() => {
      this.sendBatchedEvents();
    }, 30000);

    // Send events before page unload
    window.addEventListener('beforeunload', () => {
      this.sendBatchedEvents(true);
    });

    // Send events on visibility change (tab switch)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('tab_hidden');
        this.sendBatchedEvents();
      } else {
        this.trackEvent('tab_visible');
      }
    });
  }

  sendEvent(event) {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(this.apiEndpoint + '/event', JSON.stringify(event));
    } else {
      fetch(this.apiEndpoint + '/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        keepalive: true,
      }).catch(err => console.warn('Analytics error:', err));
    }
  }

  sendBatchedEvents(urgent = false) {
    if (this.events.length === 0) return;

    const batch = {
      sessionId: this.sessionId,
      events: [...this.events],
      flash_sale: true,
      batch_time: Date.now(),
    };

    this.events = []; // Clear sent events

    if (urgent && navigator.sendBeacon) {
      navigator.sendBeacon(this.apiEndpoint + '/batch', JSON.stringify(batch));
    } else {
      fetch(this.apiEndpoint + '/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
        keepalive: true,
      }).catch(err => console.warn('Analytics batch error:', err));
    }
  }

  // Public methods for manual tracking
  trackPurchaseStart(plan) {
    this.trackEvent('purchase_start', { plan });
  }

  trackPurchaseComplete(plan, amount) {
    this.trackEvent('purchase_complete', {
      plan,
      amount,
      conversion_time: Date.now() - this.startTime,
    });
  }

  trackFormSubmit(formType, formData = {}) {
    this.trackEvent('form_submit', {
      form_type: formType,
      ...formData,
    });
  }

  // Get real-time stats
  getSessionStats() {
    const eventCounts = {};
    this.events.forEach(event => {
      eventCounts[event.eventName] = (eventCounts[event.eventName] || 0) + 1;
    });

    return {
      sessionId: this.sessionId,
      duration: Date.now() - this.startTime,
      eventCounts,
      totalEvents: this.events.length,
    };
  }
}

// Initialize flash sale analytics
window.flashSaleAnalytics = new FlashSaleAnalytics();

// Global tracking functions
window.trackFlashSalePurchase = (plan, amount) => {
  window.flashSaleAnalytics.trackPurchaseComplete(plan, amount);
};

window.trackFlashSaleAction = (action, properties) => {
  window.flashSaleAnalytics.trackEvent(action, properties);
};

console.log('🔥 Flash Sale Analytics initialized!');
