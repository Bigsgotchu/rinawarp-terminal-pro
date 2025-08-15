/**
 * RinaWarp Terminal - Frontend Sentry Integration
 * 
 * This file provides comprehensive client-side error tracking, performance monitoring,
 * and user session management using Sentry's browser SDK.
 * 
 * Features:
 * - Automatic error capturing
 * - Performance monitoring
 * - User context tracking
 * - Custom breadcrumbs
 * - Payment flow monitoring
 * - Form interaction tracking
 * - Network request monitoring
 */

// Initialize Sentry for browser error tracking and performance monitoring
window.sentryConfig = {
  dsn: 'https://4c22d2c576b2d0ebbeda9941d59fff95@o4508607128346624.ingest.us.sentry.io/4508607133655040',
  environment: window.location.hostname.includes('localhost') ? 'development' : 'production',
  release: 'rinawarp-terminal@1.0.9',
  
  // Performance monitoring
  tracesSampleRate: 1.0,
  
  // Session replay for debugging
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Advanced configuration
  beforeSend(event, hint) {
    // Filter out common non-critical errors
    const error = hint.originalException;
    
    if (error && typeof error.message === 'string') {
      // Skip common browser extension errors
      if (error.message.includes('Extension context invalidated') ||
          error.message.includes('chrome-extension://') ||
          error.message.includes('moz-extension://')) {
        return null;
      }
      
      // Skip network errors that are expected
      if (error.message.includes('NetworkError') && 
          window.location.hostname === 'localhost') {
        return null;
      }
    }
    
    // Add additional context
    if (event.tags) {
      event.tags.userAgent = navigator.userAgent;
      event.tags.url = window.location.href;
      event.tags.timestamp = new Date().toISOString();
    }
    
    return event;
  },
  
  beforeBreadcrumb(breadcrumb, hint) {
    // Filter out noisy breadcrumbs
    if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
      return null;
    }
    
    // Enhance navigation breadcrumbs
    if (breadcrumb.category === 'navigation') {
      breadcrumb.data = {
        ...breadcrumb.data,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      };
    }
    
    return breadcrumb;
  }
};

// Enhanced Sentry helpers for frontend use
window.SentryHelpers = {
  /**
   * Add a custom breadcrumb with enhanced context
   */
  addBreadcrumb(message, category = 'custom', level = 'info', data = {}) {
    try {
      if (typeof Sentry !== 'undefined' && Sentry.addBreadcrumb) {
        Sentry.addBreadcrumb({
          message: String(message || 'Unknown'),
          category: String(category || 'custom'),
          level: String(level || 'info'),
          data: {
            ...data,
            timestamp: new Date().toISOString(),
            url: window.location?.href || 'unknown',
            userAgent: navigator?.userAgent?.substring(0, 100) || 'unknown' // Truncate for privacy
          }
        });
      }
    } catch (e) {
      // Silently fail to prevent breaking application functionality
    }
  },
  
  /**
   * Capture an error with enhanced context
   */
  captureError(error, context = {}) {
    if (typeof Sentry !== 'undefined' && Sentry.captureException) {
      Sentry.withScope((scope) => {
        // Add user context if available
        const userContext = this.getUserContext();
        if (userContext) {
          scope.setUser(userContext);
        }
        
        // Add extra context
        scope.setContext('error_context', {
          ...context,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        });
        
        // Add tags for filtering
        scope.setTag('error_boundary', 'frontend');
        scope.setTag('page', window.location.pathname);
        
        Sentry.captureException(error);
      });
    }
  },
  
  /**
   * Track a custom event or metric
   */
  captureEvent(eventName, data = {}) {
    this.addBreadcrumb(`Event: ${eventName}`, 'custom', 'info', data);
    
    if (typeof Sentry !== 'undefined' && Sentry.captureMessage) {
      Sentry.withScope((scope) => {
        scope.setLevel('info');
        scope.setTag('event_type', 'custom');
        scope.setContext('event_data', data);
        Sentry.captureMessage(`Custom Event: ${eventName}`);
      });
    }
  },
  
  /**
   * Set user context for error tracking
   */
  setUser(userInfo) {
    if (typeof Sentry !== 'undefined' && Sentry.setUser) {
      // Sanitize user info for privacy
      const sanitizedUser = {
        id: userInfo.id || 'anonymous',
        email: userInfo.email ? userInfo.email.replace(/(.{3}).*@/, '$1***@') : undefined,
        plan: userInfo.plan || 'unknown',
        signup_date: userInfo.signup_date
      };
      
      Sentry.setUser(sanitizedUser);
      this.addBreadcrumb('User context updated', 'auth', 'info', { userId: sanitizedUser.id });
    }
  },
  
  /**
   * Get current user context
   */
  getUserContext() {
    // Try to get user info from localStorage or sessionStorage
    try {
      const userString = localStorage.getItem('rinawarp_user') || sessionStorage.getItem('rinawarp_user');
      return userString ? JSON.parse(userString) : null;
    } catch (e) {
      return null;
    }
  },
  
  /**
   * Track performance timing
   */
  trackTiming(name, duration, context = {}) {
    this.addBreadcrumb(`Performance: ${name}`, 'performance', 'info', {
      duration: `${duration}ms`,
      ...context
    });
    
    if (typeof Sentry !== 'undefined' && Sentry.metrics) {
      Sentry.metrics.distribution(name, duration, {
        tags: {
          page: window.location.pathname,
          ...context
        }
      });
    }
  },
  
  /**
   * Track payment flow events
   */
  trackPayment(action, data = {}) {
    const paymentEvent = `payment_${action}`;
    this.addBreadcrumb(`Payment: ${action}`, 'payment', 'info', {
      action,
      plan: data.plan,
      amount: data.amount,
      currency: data.currency
    });
    
    // Send to analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', paymentEvent, {
        event_category: 'payment',
        event_label: data.plan,
        value: data.amount
      });
    }
    
    this.captureEvent(paymentEvent, data);
  }
};

// Auto-track page load performance
window.addEventListener('load', () => {
  setTimeout(() => {
    const perfData = window.performance.timing;
    const loadTime = perfData.loadEventEnd - perfData.navigationStart;
    const domReady = perfData.domContentLoadedEventEnd - perfData.navigationStart;
    
    window.SentryHelpers.trackTiming('page_load_complete', loadTime, {
      dom_ready: domReady,
      page: window.location.pathname
    });
    
    window.SentryHelpers.addBreadcrumb('Page load completed', 'navigation', 'info', {
      loadTime: `${loadTime}ms`,
      domReady: `${domReady}ms`
    });
  }, 100);
});

// Track form interactions
document.addEventListener('DOMContentLoaded', () => {
  // Track form submissions
  document.addEventListener('submit', (event) => {
    const form = event.target;
    const formId = form.id || form.className || 'unknown';
    
    window.SentryHelpers.addBreadcrumb(`Form submitted: ${formId}`, 'ui', 'info', {
      formId: formId,
      action: form.action || 'none',
      method: form.method || 'GET'
    });
  });
  
  // Track button clicks on important actions
  document.addEventListener('click', (event) => {
    const target = event.target;
    
    // Track CTA button clicks
    if (target.matches('.cta-button, .pricing-button, [data-track="cta"]')) {
      const buttonText = target.textContent?.trim() || 'Unknown button';
      window.SentryHelpers.addBreadcrumb(`CTA clicked: ${buttonText}`, 'ui', 'info', {
        buttonText: buttonText,
        url: target.href || 'no-link'
      });
    }
    
    // Track pricing plan selections
    if (target.matches('.pricing-card, .plan-select, [data-plan]')) {
      const plan = target.dataset.plan || 'unknown';
      window.SentryHelpers.addBreadcrumb(`Pricing plan viewed: ${plan}`, 'conversion', 'info', {
        plan: plan
      });
    }
  });
  
  // Track errors in async operations
  window.addEventListener('unhandledrejection', (event) => {
    window.SentryHelpers.captureError(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
      type: 'unhandled_promise_rejection',
      reason: event.reason
    });
  });
});

// Enhanced error boundary for React-like error handling
window.ErrorBoundary = {
  handleError(error, errorInfo = {}) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    
    window.SentryHelpers.captureError(error, {
      errorBoundary: true,
      errorInfo: errorInfo,
      componentStack: errorInfo.componentStack || 'No stack available'
    });
    
    // Show user-friendly error message
    this.showUserFriendlyError(error);
  },
  
  showUserFriendlyError(error) {
    // Create or update error notification
    let errorDiv = document.getElementById('error-notification');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.id = 'error-notification';
      errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 400px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      `;
      document.body.appendChild(errorDiv);
    }
    
    errorDiv.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">⚠️ Something went wrong</div>
      <div style="font-size: 14px; opacity: 0.9;">We've been notified and are working on a fix. Please try refreshing the page.</div>
      <button onclick="this.parentElement.remove()" style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        margin-top: 10px;
        cursor: pointer;
      ">Dismiss</button>
    `;
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (errorDiv && errorDiv.parentElement) {
        errorDiv.remove();
      }
    }, 10000);
  }
};

// Stripe integration monitoring
window.StripeMonitoring = {
  trackCheckoutStart(plan, amount) {
    window.SentryHelpers.trackPayment('checkout_started', {
      plan: plan,
      amount: amount,
      timestamp: new Date().toISOString()
    });
  },
  
  trackCheckoutSuccess(sessionId) {
    window.SentryHelpers.trackPayment('checkout_success', {
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    });
  },
  
  trackCheckoutError(error, context = {}) {
    window.SentryHelpers.captureError(error, {
      category: 'stripe_checkout',
      ...context
    });
  }
};

// Performance observer for Core Web Vitals
if ('PerformanceObserver' in window) {
  // Largest Contentful Paint (LCP)
  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    const lastEntry = entries[entries.length - 1];
    window.SentryHelpers.trackTiming('largest_contentful_paint', lastEntry.startTime);
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  
  // First Input Delay (FID)
  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    entries.forEach(entry => {
      window.SentryHelpers.trackTiming('first_input_delay', entry.processingStart - entry.startTime);
    });
  }).observe({ type: 'first-input', buffered: true });
  
  // Cumulative Layout Shift (CLS)
  let clsValue = 0;
  new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
      }
    }
    window.SentryHelpers.trackTiming('cumulative_layout_shift', clsValue * 1000); // Convert to ms equivalent
  }).observe({ type: 'layout-shift', buffered: true });
}

// Network request monitoring
const originalFetch = window.fetch;
window.fetch = function(...args) {
  let url = 'unknown';
  let startTime = Date.now();
  
  try {
    // Safely extract URL
    url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || 'unknown';
    // Truncate very long URLs for logging
    if (url.length > 100) {
      url = url.substring(0, 97) + '...';
    }
  } catch (e) {
    // Ignore URL extraction errors
  }
  
  return originalFetch.apply(this, args)
    .then(response => {
      try {
        const duration = Date.now() - startTime;
        window.SentryHelpers.addBreadcrumb(`HTTP ${response.status}: ${url}`, 'http', 'info', {
          url: url,
          status: response.status,
          duration: `${duration}ms`
        });
      } catch (e) {
        // Ignore breadcrumb errors to prevent breaking fetch
      }
      return response;
    })
    .catch(error => {
      try {
        const duration = Date.now() - startTime;
        window.SentryHelpers.addBreadcrumb(`HTTP Error: ${url}`, 'http', 'error', {
          url: url,
          error: error.message || 'Unknown error',
          duration: `${duration}ms`
        });
      } catch (e) {
        // Ignore breadcrumb errors to prevent masking original error
      }
      throw error;
    });
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Set initial breadcrumb
  window.SentryHelpers.addBreadcrumb('Frontend initialized', 'navigation', 'info', {
    page: window.location.pathname,
    referrer: document.referrer || 'direct'
  });
  
  // Set user context if available
  const userContext = window.SentryHelpers.getUserContext();
  if (userContext) {
    window.SentryHelpers.setUser(userContext);
  }
  
  console.log('🔍 RinaWarp Frontend Sentry integration initialized');
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.SentryHelpers;
}
