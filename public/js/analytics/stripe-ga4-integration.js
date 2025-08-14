import logger from '../utils/logger.js';

/**
 * RinaWarp Terminal - Stripe + GA4 Integration
 * Complete purchase tracking and conversion attribution
 *
 * This module integrates Stripe payments with GA4 analytics to provide
 * comprehensive e-commerce tracking, conversion attribution, and revenue analytics.
 */

class StripeGA4Integration {
  constructor(ga4Tracker, stripe) {
    this.ga4 = ga4Tracker;
    this.stripe = stripe;
    this.purchaseFlow = {};
    this.checkoutStartTime = null;

    this.init();
  }

  init() {
    if (!this.ga4 || !this.stripe) {
      logger.warn('⚠️ Stripe GA4 Integration: Missing required dependencies');
      return;
    }

    logger.info('🔗 Stripe GA4 Integration initialized');
    this.setupPurchaseFlowTracking();
  }

  /**
   * Set up purchase flow tracking hooks
   */
  setupPurchaseFlowTracking() {
    // Override the global purchasePlan function if it exists
    if (typeof window.purchasePlan === 'function') {
      const originalPurchasePlan = window.purchasePlan;
      window.purchasePlan = planType => {
        this.trackCheckoutInitiated(planType);
        return originalPurchasePlan(planType);
      };
    }

    // Track checkout button clicks
    document.addEventListener('click', event => {
      if (this.isCheckoutButton(event.target)) {
        const planType = this.extractPlanFromButton(event.target);
        this.trackCheckoutInitiated(planType);
      }
    });

    // Track successful checkouts from URL parameters
    this.trackCheckoutSuccessFromUrl();

    // Track checkout abandonment
    this.setupAbandonmentTracking();
  }

  /**
   * Track when user initiates checkout
   */
  trackCheckoutInitiated(planType, planData = {}) {
    this.checkoutStartTime = Date.now();
    const planInfo = this.getPlanInfo(planType);

    // GA4 e-commerce event: begin_checkout
    this.ga4.trackEvent('begin_checkout', {
      currency: 'USD',
      value: planInfo.price,
      items: [
        {
          item_id: planInfo.id,
          item_name: planInfo.name,
          item_category: 'subscription',
          item_brand: 'RinaWarp',
          price: planInfo.price,
          quantity: 1,
        },
      ],
      coupon: planData.coupon || null,
      event_category: 'ecommerce',
      plan_type: planType,
      checkout_method: 'stripe',
      ...planData,
    });

    // Custom conversion tracking
    this.ga4.trackConversion('checkout_initiated', planInfo.price, 'USD', {
      plan_type: planType,
      plan_name: planInfo.name,
      checkout_method: 'stripe',
    });

    this.purchaseFlow[planType] = {
      initiated_at: Date.now(),
      plan_info: planInfo,
      step: 'checkout_initiated',
    };

    logger.info('🛒 Checkout initiated:', { planType, planInfo });
  }

  /**
   * Track successful purchase
   */
  trackPurchaseCompleted(transactionData) {
    const {
      sessionId,
      planType,
      customerId,
      customerEmail,
      amount,
      currency = 'USD',
      subscriptionId,
      ...additionalData
    } = transactionData;

    const planInfo = this.getPlanInfo(planType);
    const checkoutDuration = this.checkoutStartTime ? Date.now() - this.checkoutStartTime : null;

    // GA4 e-commerce event: purchase
    this.ga4.trackPurchase({
      transaction_id: subscriptionId || sessionId,
      value: amount,
      currency: currency,
      items: [
        {
          item_id: planInfo.id,
          item_name: planInfo.name,
          item_category: 'subscription',
          item_brand: 'RinaWarp',
          price: amount,
          quantity: 1,
        },
      ],
      customer_id: customerId,
      customer_email: customerEmail,
      payment_method: 'stripe',
      checkout_duration: checkoutDuration,
      ...additionalData,
    });

    // Track subscription specifically
    this.ga4.trackSubscription({
      subscription_id: subscriptionId || sessionId,
      plan_name: planType,
      plan_price: amount,
      billing_cycle: planInfo.billing_cycle || 'monthly',
      customer_id: customerId,
      customer_email: customerEmail,
    });

    // Custom conversion tracking
    this.ga4.trackConversion('purchase_completed', amount, currency, {
      plan_type: planType,
      plan_name: planInfo.name,
      subscription_id: subscriptionId,
      customer_id: customerId,
      checkout_duration: checkoutDuration,
    });

    // Track conversion funnel completion
    this.trackConversionFunnelComplete(planType, amount);

    // Update user properties
    if (customerId) {
      this.ga4.setUser(customerId, {
        userType: 'paying_customer',
        plan: planType,
        totalPurchases: 1, // Could be incremented based on history
        lastPurchaseDate: new Date().toISOString(),
        lastPurchaseAmount: amount,
      });
    }

    logger.info('💰 Purchase completed:', transactionData);
  }

  /**
   * Track checkout steps (for funnel analysis)
   */
  trackCheckoutStep(step, planType, stepData = {}) {
    const stepMap = {
      plan_selected: 1,
      checkout_initiated: 2,
      payment_info_entered: 3,
      payment_submitted: 4,
      purchase_completed: 5,
    };

    const stepNumber = stepMap[step] || 0;
    const planInfo = this.getPlanInfo(planType);

    this.ga4.trackEvent('checkout_progress', {
      checkout_step: stepNumber,
      checkout_option: step,
      currency: 'USD',
      value: planInfo.price,
      items: [
        {
          item_id: planInfo.id,
          item_name: planInfo.name,
          item_category: 'subscription',
          price: planInfo.price,
          quantity: 1,
        },
      ],
      event_category: 'ecommerce_funnel',
      plan_type: planType,
      ...stepData,
    });

    // Update purchase flow tracking
    if (this.purchaseFlow[planType]) {
      this.purchaseFlow[planType].step = step;
      this.purchaseFlow[planType][`${step}_at`] = Date.now();
    }

    logger.info('📊 Checkout step tracked:', { step, stepNumber, planType });
  }

  /**
   * Track checkout abandonment
   */
  setupAbandonmentTracking() {
    let abandonmentTimer;

    // Set abandonment timer when checkout is initiated
    const originalTrackCheckoutInitiated = this.trackCheckoutInitiated.bind(this);
    this.trackCheckoutInitiated = (planType, planData) => {
      originalTrackCheckoutInitiated(planType, planData);

      // Clear existing timer
      if (abandonmentTimer) {
        clearTimeout(abandonmentTimer);
      }

      // Set 5-minute abandonment timer
      abandonmentTimer = setTimeout(
        () => {
          this.trackCheckoutAbandoned(planType);
        },
        5 * 60 * 1000
      ); // 5 minutes
    };

    // Clear timer on successful purchase
    const originalTrackPurchaseCompleted = this.trackPurchaseCompleted.bind(this);
    this.trackPurchaseCompleted = transactionData => {
      if (abandonmentTimer) {
        clearTimeout(abandonmentTimer);
      }
      originalTrackPurchaseCompleted(transactionData);
    };

    // Track abandonment on page unload
    window.addEventListener('beforeunload', () => {
      Object.keys(this.purchaseFlow).forEach(planType => {
        const flow = this.purchaseFlow[planType];
        if (flow.step !== 'purchase_completed') {
          this.trackCheckoutAbandoned(planType);
        }
      });
    });
  }

  /**
   * Track checkout abandonment
   */
  trackCheckoutAbandoned(planType) {
    const flow = this.purchaseFlow[planType];
    if (!flow) return;

    const timeSpent = Date.now() - flow.initiated_at;
    const planInfo = flow.plan_info;

    this.ga4.trackEvent('checkout_abandoned', {
      event_category: 'ecommerce',
      plan_type: planType,
      plan_name: planInfo.name,
      plan_price: planInfo.price,
      abandonment_step: flow.step,
      time_spent: timeSpent,
      checkout_method: 'stripe',
    });

    // Track as negative conversion
    this.ga4.trackConversion('checkout_abandoned', planInfo.price, 'USD', {
      plan_type: planType,
      abandonment_step: flow.step,
      time_spent: timeSpent,
    });

    logger.info('🚫 Checkout abandoned:', { planType, step: flow.step, timeSpent });
  }

  /**
   * Track conversion funnel completion
   */
  trackConversionFunnelComplete(planType, amount) {
    const funnelSteps = [
      'page_view',
      'pricing_viewed',
      'plan_selected',
      'checkout_initiated',
      'purchase_completed',
    ];

    // Track each step completion
    funnelSteps.forEach((step, index) => {
      this.ga4.trackEvent('funnel_step_completed', {
        funnel_name: 'subscription_purchase',
        funnel_step: index + 1,
        funnel_step_name: step,
        plan_type: planType,
        value: step === 'purchase_completed' ? amount : null,
        event_category: 'conversion_funnel',
      });
    });

    // Track funnel completion
    this.ga4.trackEvent('funnel_completed', {
      funnel_name: 'subscription_purchase',
      plan_type: planType,
      value: amount,
      currency: 'USD',
      event_category: 'conversion_funnel',
    });
  }

  /**
   * Track refunds and cancellations
   */
  trackRefund(refundData) {
    const { transaction_id, amount, reason, currency = 'USD', ...additionalData } = refundData;

    this.ga4.trackEvent('refund', {
      transaction_id,
      value: amount,
      currency,
      refund_reason: reason,
      event_category: 'ecommerce',
      ...additionalData,
    });

    logger.info('💸 Refund tracked:', refundData);
  }

  /**
   * Track subscription cancellations
   */
  trackCancellation(cancellationData) {
    const { subscription_id, plan_type, reason, days_active, ...additionalData } = cancellationData;

    this.ga4.trackEvent('subscription_cancelled', {
      subscription_id,
      plan_type,
      cancellation_reason: reason,
      days_active,
      event_category: 'subscription',
      ...additionalData,
    });

    logger.info('❌ Cancellation tracked:', cancellationData);
  }

  /**
   * Track discount/coupon usage
   */
  trackCouponUsage(couponData) {
    const { coupon_code, discount_amount, discount_type, plan_type, ...additionalData } =
      couponData;

    this.ga4.trackEvent('coupon_used', {
      coupon_code,
      discount_amount,
      discount_type,
      plan_type,
      event_category: 'promotion',
      ...additionalData,
    });

    logger.info('🎫 Coupon usage tracked:', couponData);
  }

  /**
   * Utility functions
   */

  isCheckoutButton(element) {
    return (
      element.classList.contains('buy-button') ||
      element.classList.contains('plan-button') ||
      element.classList.contains('checkout-button') ||
      (element.onclick && element.onclick.toString().includes('purchasePlan'))
    );
  }

  extractPlanFromButton(button) {
    // Try to extract from onclick
    if (button.onclick) {
      const onclickStr = button.onclick.toString();
      const match = onclickStr.match(/purchasePlan\(['"]([^'"]+)['"]\)/);
      if (match) return match[1];
    }

    // Try to extract from data attributes
    if (button.dataset.plan) return button.dataset.plan;

    // Try to extract from parent card
    const card = button.closest('.pricing-card');
    if (card) {
      const planName = card.querySelector('.plan-name')?.textContent?.toLowerCase();
      if (planName?.includes('personal')) return 'personal';
      if (planName?.includes('professional') || planName?.includes('pro')) return 'professional';
      if (planName?.includes('team')) return 'team';
      if (planName?.includes('enterprise')) return 'enterprise';
    }

    return 'unknown';
  }

  getPlanInfo(planType) {
    const plans = {
      personal: {
        id: 'rinawarp_personal',
        name: 'Personal Plan',
        price: 15,
        billing_cycle: 'monthly',
      },
      professional: {
        id: 'rinawarp_professional',
        name: 'Professional Plan',
        price: 29,
        billing_cycle: 'monthly',
      },
      team: {
        id: 'rinawarp_team',
        name: 'Team Plan',
        price: 49,
        billing_cycle: 'monthly',
      },
      enterprise: {
        id: 'rinawarp_enterprise',
        name: 'Enterprise Plan',
        price: 99,
        billing_cycle: 'monthly',
      },
      beta: {
        id: 'rinawarp_beta',
        name: 'Beta Access',
        price: 39,
        billing_cycle: 'one_time',
      },
      earlybird: {
        id: 'rinawarp_earlybird',
        name: 'Early Bird',
        price: 29,
        billing_cycle: 'one_time',
      },
      premium: {
        id: 'rinawarp_premium_beta',
        name: 'Premium Beta',
        price: 59,
        billing_cycle: 'one_time',
      },
    };

    return (
      plans[planType] || {
        id: `rinawarp_${planType}`,
        name: `${planType} Plan`,
        price: 0,
        billing_cycle: 'unknown',
      }
    );
  }

  trackCheckoutSuccessFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const planType = urlParams.get('plan');

    if (sessionId && planType) {
      // Track successful purchase from URL parameters
      setTimeout(() => {
        this.trackPurchaseCompleted({
          sessionId,
          planType,
          amount: this.getPlanInfo(planType).price,
          source: 'url_success_redirect',
        });
      }, 1000); // Delay to ensure GA4 is loaded
    }
  }

  /**
   * Manual tracking methods for integration with existing code
   */

  onCheckoutInitiated(planType, planData = {}) {
    this.trackCheckoutInitiated(planType, planData);
  }

  onPurchaseCompleted(transactionData) {
    this.trackPurchaseCompleted(transactionData);
  }

  onCheckoutStep(step, planType, stepData = {}) {
    this.trackCheckoutStep(step, planType, stepData);
  }

  onRefund(refundData) {
    this.trackRefund(refundData);
  }

  onCancellation(cancellationData) {
    this.trackCancellation(cancellationData);
  }

  onCouponUsage(couponData) {
    this.trackCouponUsage(couponData);
  }
}

// Export for use in other modules
export default StripeGA4Integration;

// Auto-initialize if both GA4 tracker and Stripe are available
if (typeof window !== 'undefined') {
  // Wait for both GA4 and Stripe to be available
  const initStripeGA4Integration = () => {
    if (window.rinaWarpGA4 && window.Stripe) {
      window.stripeGA4Integration = new StripeGA4Integration(window.rinaWarpGA4, window.Stripe);
      logger.info('🔗 Stripe GA4 Integration auto-initialized');
    }
  };

  // Try to initialize immediately
  initStripeGA4Integration();

  // Also try after page load
  window.addEventListener('load', initStripeGA4Integration);

  // And after a short delay in case scripts are still loading
  setTimeout(initStripeGA4Integration, 2000);
}
