/**
 * 🔐 Enhanced Client-Side Stripe Integration with Graceful Error Handling
 * Replaces the fragile initialization patterns with robust error management
 */

class StripeClientService {
  constructor() {
    this.stripe = null;
    this.isInitialized = false;
    this.initializationError = null;
    this.config = null;
    this.retryAttempts = 0;
    this.maxRetries = 3;
    this.retryDelay = 2000; // Start with 2 seconds
    
    // Initialize on construction
    this.initialize();
  }

  /**
   * Initialize Stripe with comprehensive error handling
   */
  async initialize() {
    try {
      this.retryAttempts++;
      
      // Step 1: Check if Stripe.js is loaded
      if (typeof Stripe === 'undefined') {
        throw new Error('Stripe.js library not loaded. Please ensure the Stripe script tag is included.');
      }

      // Step 2: Fetch configuration from server
      const configResponse = await fetch('http://localhost:3001/api/stripe/config', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!configResponse.ok) {
        const errorData = await configResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${configResponse.status}`);
      }

      this.config = await configResponse.json();

      // Step 3: Validate configuration
      if (!this.config.success) {
        throw new Error(this.config.error || 'Invalid configuration received from server');
      }

      if (!this.config.available) {
        throw new Error('Payment system is currently unavailable on the server');
      }

      if (!this.config.publishableKey) {
        throw new Error('Stripe publishable key not configured');
      }

      // Step 4: Check for demo/test keys
      if (this.config.publishableKey.includes('placeholder') || 
          this.config.publishableKey.includes('your_key_here')) {
        this.showInfo('Demo mode: Payment system is in demonstration mode');
        this.isInitialized = false;
        return;
      }

      // Step 5: Initialize Stripe
      this.stripe = Stripe(this.config.publishableKey);

      // Step 6: Test the connection (optional - creates minimal overhead)
      await this.testConnection();

      this.isInitialized = true;
      this.initializationError = null;
      this.retryAttempts = 0;

      console.log('✅ Stripe client initialized successfully');
      this.showInfo('Payment system ready');

    } catch (error) {
      this.initializationError = error;
      this.isInitialized = false;

      console.error(`❌ Stripe initialization failed (attempt ${this.retryAttempts}/${this.maxRetries}):`, error.message);

      // Show user-friendly error
      this.showError(`Payment system initialization failed: ${error.message}`);

      // Retry logic with exponential backoff
      if (this.retryAttempts < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, this.retryAttempts - 1);
        console.log(`🔄 Retrying Stripe initialization in ${delay / 1000} seconds...`);
        
        setTimeout(() => this.initialize(), delay);
      } else {
        console.error('🚨 Stripe client failed to initialize after maximum retries');
        this.showError('Payment system is temporarily unavailable. Please refresh the page or try again later.');
        
        // Offer manual retry option
        this.showRetryOption();
      }
    }
  }

  /**
   * Test Stripe connection (lightweight check)
   */
  async testConnection() {
    try {
      // Create a minimal elements instance to test connectivity
      const elements = this.stripe.elements();
      // This doesn't make a network call but validates the Stripe instance
      elements.create('card');
      return true;
    } catch (error) {
      throw new Error(`Stripe connection test failed: ${error.message}`);
    }
  }

  /**
   * Check if Stripe is available for use
   */
  isAvailable() {
    return this.isInitialized && this.stripe !== null;
  }

  /**
   * Get Stripe instance with safety check
   */
  getStripe() {
    if (!this.isAvailable()) {
      throw new Error('Stripe is not available. ' + 
        (this.initializationError ? `Error: ${this.initializationError.message}` : 'Not initialized'));
    }
    return this.stripe;
  }

  /**
   * Get configuration safely
   */
  getConfig() {
    return this.config;
  }

  /**
   * Manual retry method
   */
  async retry() {
    console.log('🔄 Manually retrying Stripe initialization...');
    this.retryAttempts = 0; // Reset attempts
    await this.initialize();
  }

  /**
   * Enhanced checkout session creation with comprehensive error handling
   */
  async createCheckoutSession(planType, options = {}) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Payment system is not ready. Please wait for initialization or refresh the page.');
      }

      // Prepare request data
      const requestData = {
        plan: planType,
        successUrl: options.successUrl || `${window.location.origin}/success.html?plan=${planType}`,
        cancelUrl: options.cancelUrl || window.location.href,
        customerEmail: options.customerEmail,
        metadata: options.metadata,
      };

      // If priceId is provided directly, use that instead of plan
      if (options.priceId) {
        requestData.priceId = options.priceId;
        delete requestData.plan;
      }

      console.log('🛒 Creating checkout session for:', planType);

      const response = await fetch('http://localhost:3001/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const session = await response.json();

      if (!session.success) {
        throw new Error(session.error || 'Failed to create checkout session');
      }

      if (!session.sessionId && !session.url) {
        throw new Error('Invalid session response: missing session ID or URL');
      }

      console.log('✅ Checkout session created successfully');

      // Redirect to checkout
      if (session.url) {
        window.location.href = session.url;
      } else {
        const { error } = await this.stripe.redirectToCheckout({
          sessionId: session.sessionId
        });
        
        if (error) {
          throw new Error(error.message);
        }
      }

    } catch (error) {
      console.error('❌ Checkout session creation failed:', error);
      throw error;
    }
  }

  /**
   * Enhanced purchase flow with comprehensive error handling
   */
  async purchasePlan(planType, buttonElement, options = {}) {
    const originalButtonText = buttonElement ? buttonElement.textContent : '';
    
    try {
      // Handle free plan
      if (planType === 'free') {
        window.location.href = '/api/download';
        return;
      }

      // Show loading state
      if (buttonElement) {
        buttonElement.disabled = true;
        buttonElement.textContent = 'Processing...';
        buttonElement.classList.add('loading');
      }

      // Check system availability
      if (!this.isAvailable()) {
        // Try to get current status from server
        try {
          const statusResponse = await fetch('/api/stripe/status');
          const status = await statusResponse.json();
          
          if (status.success && status.stripe?.available) {
            // Server says it's available, try reinitializing
            await this.retry();
            if (!this.isAvailable()) {
              throw new Error('Payment system initialization failed. Please refresh the page.');
            }
          } else {
            throw new Error(status.stripe?.error || 'Payment system is currently unavailable');
          }
        } catch (statusError) {
          throw new Error('Payment system is currently unavailable. Please try again later.');
        }
      }

      await this.createCheckoutSession(planType, options);

    } catch (error) {
      console.error('❌ Purchase failed:', error);

      // Show user-friendly error message
      let userMessage = 'Unable to start checkout. ';
      
      if (error.message.includes('not ready') || error.message.includes('not initialized')) {
        userMessage += 'Please refresh the page and try again.';
      } else if (error.message.includes('unavailable') || error.message.includes('temporarily')) {
        userMessage += 'The payment system is temporarily unavailable. Please try again in a few minutes.';
      } else if (error.message.includes('configuration')) {
        userMessage += 'There\'s a configuration issue. Please contact support.';
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        userMessage += 'Please check your internet connection and try again.';
      } else {
        userMessage += 'Please try again or contact support if the issue persists.';
      }

      this.showError(userMessage);

      // Reset button state
      if (buttonElement) {
        buttonElement.disabled = false;
        buttonElement.textContent = originalButtonText;
        buttonElement.classList.remove('loading');
      }

      throw error;
    }
  }

  /**
   * Show user-friendly error messages
   */
  showError(message) {
    this.showNotification(message, 'error');
  }

  /**
   * Show informational messages
   */
  showInfo(message) {
    this.showNotification(message, 'info');
  }

  /**
   * Generic notification system
   */
  showNotification(message, type = 'info') {
    // Try to use existing notification system first
    if (typeof showNotification === 'function') {
      const colors = {
        error: '#ff4757',
        info: '#3498db',
        success: '#2ed573',
        warning: '#ffa502',
      };
      showNotification(message, colors[type] || colors.info);
      return;
    }

    // Fallback to console and simple alert for critical errors
    console.log(`${type.toUpperCase()}: ${message}`);
    
    if (type === 'error') {
      // Create a simple notification div
      this.createSimpleNotification(message, type);
    }
  }

  /**
   * Create simple notification when no notification system is available
   */
  createSimpleNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#ff4757' : '#3498db'};
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 10000;
      max-width: 400px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Show retry option for failed initialization
   */
  showRetryOption() {
    const retryButton = document.createElement('button');
    retryButton.textContent = '🔄 Retry Payment System';
    retryButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #3498db;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      z-index: 10000;
    `;
    
    retryButton.addEventListener('click', async () => {
      retryButton.textContent = 'Retrying...';
      retryButton.disabled = true;
      
      try {
        await this.retry();
        if (this.isAvailable()) {
          retryButton.parentNode.removeChild(retryButton);
          this.showInfo('Payment system restored successfully!');
        }
      } catch (error) {
        retryButton.textContent = '🔄 Retry Payment System';
        retryButton.disabled = false;
      }
    });
    
    document.body.appendChild(retryButton);
  }
}

// Create global instance
const stripeClient = new StripeClientService();

// Export for use in other scripts
window.stripeClient = stripeClient;

// Backward compatibility functions
window.initializeStripe = () => stripeClient.initialize();
window.purchasePlan = (planType) => {
  const button = event?.target;
  return stripeClient.purchasePlan(planType, button);
};

// Enhanced beta purchase function
window.purchaseBeta = (betaType) => {
  const button = event?.target;
  return stripeClient.purchasePlan(`beta-${betaType}`, button, {
    metadata: {
      betaType,
      product: 'RinaWarp Terminal Beta'
    }
  });
};

console.log('🔐 Enhanced Stripe client service loaded');
