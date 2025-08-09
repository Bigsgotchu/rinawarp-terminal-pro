/**
 * 🎯 Conversion Funnel Optimization Tracker
 * Track every step of the sales funnel for maximum conversion optimization
 * Perfect for identifying drop-off points and improving conversion rates
 */

class ConversionFunnelTracker {
  constructor() {
    this.measurementId = 'G-G424CV5GGT';
    this.funnelSteps = {
      'homepage_visit': 1,
      'pricing_view': 2,
      'plan_selection': 3,
      'checkout_start': 4,
      'payment_info': 5,
      'purchase_complete': 6,
      'app_download': 7,
      'first_app_usage': 8
    };
    
    this.userFunnelData = this.loadUserFunnelData();
    this.init();
  }

  init() {
    this.trackCurrentFunnelStep();
    this.setupFunnelEventListeners();
    this.trackScrollDepthOnPricing();
    this.trackTimeSpentOnSteps();
  }

  // 📊 Track current funnel step based on page
  trackCurrentFunnelStep() {
    const path = window.location.pathname;
    let currentStep = 'homepage_visit';
    
    if (path.includes('/pricing')) {
      currentStep = 'pricing_view';
      this.trackPricingPageFunnel();
    } else if (path.includes('/checkout') || path.includes('/payment')) {
      currentStep = 'checkout_start';
      this.trackCheckoutFunnel();
    } else if (path.includes('/success') || path.includes('/thank-you')) {
      currentStep = 'purchase_complete';
      this.trackPurchaseComplete();
    } else if (path.includes('/download')) {
      currentStep = 'app_download';
      this.trackDownloadFunnel();
    }
    
    this.recordFunnelStep(currentStep);
  }

  // 📝 Record funnel step with comprehensive data
  recordFunnelStep(stepName) {
    const stepNumber = this.funnelSteps[stepName];
    const previousSteps = this.userFunnelData.steps || [];
    const timeOnPreviousStep = this.calculateTimeOnPreviousStep();
    
    // Add current step to user journey
    const stepData = {
      step_name: stepName,
      step_number: stepNumber,
      timestamp: Date.now(),
      page_url: window.location.href,
      time_on_previous_step: timeOnPreviousStep,
      session_id: this.getSessionId()
    };
    
    previousSteps.push(stepData);
    this.userFunnelData.steps = previousSteps;
    this.saveUserFunnelData();
    
    // Send funnel step event to GA4
    gtag('event', 'funnel_step', {
      event_category: 'conversion_funnel',
      funnel_step: stepName,
      step_number: stepNumber,
      time_on_previous_step: timeOnPreviousStep,
      total_steps_completed: previousSteps.length,
      
      // Funnel progression data
      funnel_progression: this.calculateFunnelProgression(),
      drop_off_risk: this.calculateDropOffRisk(),
      
      // Attribution context
      ...this.getAttributionContext()
    });
  }

  // 💰 Pricing page specific funnel tracking
  trackPricingPageFunnel() {
    this.trackPricingCardViews();
    this.trackPlanInteractions();
    this.trackPricingScrollBehavior();
    this.trackPricingABTest();
  }

  trackPricingCardViews() {
    const pricingCards = document.querySelectorAll('.pricing-card, [class*="plan"], [class*="tier"]');
    
    pricingCards.forEach((card, index) => {
      // Track when pricing card enters viewport
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const planName = this.extractPlanName(card);
            
            gtag('event', 'view_item', {
              event_category: 'ecommerce',
              item_id: planName.toLowerCase().replace(/\s+/g, '_'),
              item_name: planName,
              item_category: 'subscription_plan',
              price: this.extractPlanPrice(card),
              currency: 'USD',
              
              // Funnel context
              funnel_step: 'pricing_view',
              plan_position: index + 1,
              total_plans_shown: pricingCards.length
            });
            
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      
      observer.observe(card);
    });
  }

  trackPlanInteractions() {
    // Track plan selection buttons
    document.querySelectorAll('.plan-button, .pricing-button, [onclick*="purchase"], [onclick*="checkout"]').forEach(button => {
      button.addEventListener('click', (e) => {
        const planCard = button.closest('.pricing-card, [class*="plan"], [class*="tier"]');
        const planName = this.extractPlanName(planCard || button);
        const planPrice = this.extractPlanPrice(planCard || button);
        
        // Track plan selection
        gtag('event', 'select_item', {
          event_category: 'ecommerce',
          item_id: planName.toLowerCase().replace(/\s+/g, '_'),
          item_name: planName,
          item_category: 'subscription_plan',
          price: planPrice,
          currency: 'USD',
          
          // Funnel progression
          funnel_step: 'plan_selection',
          selection_method: 'button_click',
          time_before_selection: this.getTimeOnPricingPage(),
          
          // User behavior
          scroll_depth_at_selection: this.getCurrentScrollDepth(),
          plans_viewed_before_selection: this.countPlanViewsBeforeSelection()
        });
        
        this.recordFunnelStep('plan_selection');
      });
    });
  }

  // 🛒 Checkout funnel tracking
  trackCheckoutFunnel() {
    this.trackCheckoutSteps();
    this.trackFormInteractions();
    this.trackPaymentMethodSelection();
    this.trackCheckoutAbandonmentSignals();
  }

  trackCheckoutSteps() {
    // Track beginning of checkout
    gtag('event', 'begin_checkout', {
      event_category: 'ecommerce',
      currency: 'USD',
      value: this.getSelectedPlanPrice(),
      items: this.getSelectedPlanItems(),
      
      // Funnel context
      funnel_step: 'checkout_start',
      checkout_method: 'direct',
      
      // Journey data
      time_from_pricing_to_checkout: this.calculateTimeFromPricingToCheckout(),
      pages_visited_before_checkout: this.getPagesVisitedCount()
    });
  }

  trackFormInteractions() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      const inputs = form.querySelectorAll('input, select, textarea');
      
      inputs.forEach(input => {
        // Track field interactions
        input.addEventListener('focus', () => {
          gtag('event', 'form_field_focus', {
            event_category: 'form_interaction',
            field_name: input.name || input.id || input.type,
            form_step: 'payment_info',
            funnel_step: 'payment_info'
          });
        });
        
        input.addEventListener('blur', () => {
          if (input.value) {
            gtag('event', 'form_field_complete', {
              event_category: 'form_interaction',
              field_name: input.name || input.id || input.type,
              form_step: 'payment_info',
              funnel_step: 'payment_info'
            });
          }
        });
      });
      
      // Track form submission attempts
      form.addEventListener('submit', () => {
        gtag('event', 'form_submit_attempt', {
          event_category: 'form_interaction',
          form_type: 'checkout_form',
          funnel_step: 'payment_info',
          
          // Form completion data
          fields_completed: this.countCompletedFields(form),
          total_fields: inputs.length,
          form_completion_rate: this.calculateFormCompletionRate(form)
        });
      });
    });
  }

  // ⚠️ Track checkout abandonment signals
  trackCheckoutAbandonmentSignals() {
    let timeOnCheckout = Date.now();
    
    // Track exit intent on checkout pages
    document.addEventListener('mouseleave', (e) => {
      if (e.clientY <= 0) {
        const timeSpent = Math.round((Date.now() - timeOnCheckout) / 1000);
        
        gtag('event', 'checkout_exit_intent', {
          event_category: 'abandonment_signals',
          funnel_step: 'checkout_abandonment',
          time_on_checkout: timeSpent,
          
          // Abandonment context
          abandonment_reason: 'exit_intent',
          checkout_progress: this.getCheckoutProgress(),
          form_completion: this.getFormCompletionPercentage()
        });
      }
    });
    
    // Track tab switching during checkout
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        gtag('event', 'checkout_tab_switch', {
          event_category: 'abandonment_signals',
          funnel_step: 'checkout_distraction',
          time_on_checkout: Math.round((Date.now() - timeOnCheckout) / 1000)
        });
      }
    });
  }

  // ✅ Track successful purchase completion
  trackPurchaseComplete() {
    // This should be called after successful payment
    const purchaseData = this.getPurchaseDataFromURL() || this.getStoredPurchaseData();
    
    if (purchaseData) {
      gtag('event', 'purchase', {
        transaction_id: purchaseData.transaction_id,
        value: purchaseData.amount,
        currency: 'USD',
        items: purchaseData.items,
        
        // Funnel completion data
        funnel_step: 'purchase_complete',
        conversion_complete: true,
        
        // Journey metrics
        total_funnel_time: this.calculateTotalFunnelTime(),
        funnel_steps_completed: this.userFunnelData.steps?.length || 0,
        conversion_path: this.getConversionPath(),
        
        // Attribution
        ...this.getAttributionContext()
      });
      
      // Track funnel completion success
      gtag('event', 'funnel_complete', {
        event_category: 'conversion_funnel',
        funnel_type: 'saas_subscription',
        completion_rate: 100,
        total_time_to_convert: this.calculateTotalFunnelTime(),
        total_steps: this.userFunnelData.steps?.length || 0
      });
    }
  }

  // 📱 Track app download and usage
  trackAppDownloadFunnel() {
    // Track download completion
    gtag('event', 'app_download_complete', {
      event_category: 'app_engagement',
      funnel_step: 'app_download',
      download_source: 'post_purchase',
      
      // Post-purchase funnel
      time_from_purchase_to_download: this.calculateTimeSincePurchase()
    });
  }

  // 🎯 Helper functions for funnel optimization
  calculateDropOffRisk() {
    const currentStep = this.userFunnelData.steps?.length || 1;
    const timeOnCurrentStep = Date.now() - (this.userFunnelData.steps?.[currentStep - 1]?.timestamp || Date.now());
    const avgTimeOnStep = this.getAverageTimeOnStep();
    
    if (timeOnCurrentStep > avgTimeOnStep * 2) {
      return 'high';
    } else if (timeOnCurrentStep > avgTimeOnStep * 1.5) {
      return 'medium';
    }
    return 'low';
  }

  calculateFunnelProgression() {
    const totalSteps = Object.keys(this.funnelSteps).length;
    const completedSteps = this.userFunnelData.steps?.length || 1;
    return Math.round((completedSteps / totalSteps) * 100);
  }

  getConversionPath() {
    return (this.userFunnelData.steps || [])
      .map(step => step.step_name)
      .join(' → ');
  }

  // 🔧 Utility functions
  loadUserFunnelData() {
    return JSON.parse(localStorage.getItem('rinawarp_funnel_data') || '{"steps": []}');
  }

  saveUserFunnelData() {
    localStorage.setItem('rinawarp_funnel_data', JSON.stringify(this.userFunnelData));
  }

  extractPlanName(element) {
    if (!element) return 'Unknown Plan';
    
    const planNameSelectors = ['.plan-name', '.tier-name', 'h3', 'h4', '[data-plan]'];
    
    for (const selector of planNameSelectors) {
      const nameElement = element.querySelector(selector);
      if (nameElement) {
        return nameElement.textContent.trim();
      }
    }
    
    return element.dataset.plan || 'Unknown Plan';
  }

  extractPlanPrice(element) {
    if (!element) return 0;
    
    const priceSelectors = ['.price', '.amount', '[class*="price"]', '[data-price]'];
    
    for (const selector of priceSelectors) {
      const priceElement = element.querySelector(selector);
      if (priceElement) {
        const priceText = priceElement.textContent.replace(/[^0-9.]/g, '');
        return parseFloat(priceText) || 0;
      }
    }
    
    return 0;
  }

  getCurrentScrollDepth() {
    return Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
  }

  getAttributionContext() {
    const firstVisit = JSON.parse(localStorage.getItem('rinawarp_first_visit') || '{}');
    return {
      first_touch_source: firstVisit.utm_source || 'direct',
      first_touch_medium: firstVisit.utm_medium || 'none',
      first_touch_campaign: firstVisit.utm_campaign || 'none'
    };
  }

  getSessionId() {
    return localStorage.getItem('rinawarp_session_id') || 'unknown';
  }

  // 📊 Analytics dashboard data
  getFunnelAnalytics() {
    return {
      currentStep: this.userFunnelData.steps?.slice(-1)[0]?.step_name || 'homepage_visit',
      progression: this.calculateFunnelProgression(),
      dropOffRisk: this.calculateDropOffRisk(),
      conversionPath: this.getConversionPath(),
      totalTime: this.calculateTotalFunnelTime()
    };
  }
}

// Initialize conversion funnel tracking
window.conversionFunnel = new ConversionFunnelTracker();

// Helper function for manual funnel step tracking
window.trackFunnelStep = function(stepName, customData = {}) {
  window.conversionFunnel.recordFunnelStep(stepName);
  
  gtag('event', 'custom_funnel_step', {
    event_category: 'conversion_funnel',
    funnel_step: stepName,
    ...customData
  });
};

console.log('🎯 Conversion Funnel Tracking initialized');
