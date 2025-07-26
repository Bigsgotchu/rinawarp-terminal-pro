/**
 * Unified Frontend Checkout System
 * Replaces multiple conflicting checkout implementations
 */

// Global variables
let isProcessing = false;
let pricingConfig = null;

// Initialize checkout system
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 RinaWarp Checkout System initializing...');
    
    try {
        // Load pricing configuration
        await loadPricingConfig();
        
        // Initialize checkout buttons
        initializeCheckoutButtons();
        
        console.log('✅ Checkout system ready');
    } catch (error) {
        console.error('❌ Failed to initialize checkout system:', error);
        showError('Payment system is temporarily unavailable. Please try again later.');
    }
});

/**
 * Load pricing configuration from backend
 */
async function loadPricingConfig() {
    try {
        const response = await fetch('/api/payment/pricing-config');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
            pricingConfig = data.pricing;
            console.log('📋 Pricing config loaded:', pricingConfig);
        } else {
            throw new Error('Invalid pricing config response');
        }
    } catch (error) {
        console.error('❌ Failed to load pricing config:', error);
        throw error;
    }
}

/**
 * Initialize all checkout buttons on the page
 */
function initializeCheckoutButtons() {
    // Find all checkout buttons
    const checkoutButtons = document.querySelectorAll('[data-plan], .purchase-btn, .checkout-btn');
    
    checkoutButtons.forEach(button => {
        button.addEventListener('click', handleCheckoutClick);
        
        // Add loading state styles if not present
        if (!button.classList.contains('checkout-ready')) {
            button.classList.add('checkout-ready');
        }
    });
    
    console.log(`🔘 Initialized ${checkoutButtons.length} checkout buttons`);
}

/**
 * Handle checkout button clicks
 */
async function handleCheckoutClick(event) {
    event.preventDefault();
    
    if (isProcessing) {
        console.log('⏳ Checkout already in progress');
        return;
    }
    
    const button = event.target;
    const plan = button.dataset.plan || button.dataset.planId || extractPlanFromButton(button);
    
    if (!plan) {
        console.error('❌ No plan specified for button:', button);
        showError('Plan not specified. Please try again or contact support.');
        return;
    }
    
    await startCheckout(plan, button);
}

/**
 * Extract plan name from button text or classes
 */
function extractPlanFromButton(button) {
    const text = button.textContent.toLowerCase();
    const classes = button.className.toLowerCase();
    
    if (text.includes('basic') || classes.includes('basic')) return 'basic';
    if (text.includes('pro') || classes.includes('pro')) return 'pro';
    if (text.includes('enterprise') || classes.includes('enterprise')) return 'enterprise';
    
    return null;
}

/**
 * Start the checkout process
 */
async function startCheckout(plan, button) {
    isProcessing = true;
    
    // Update button state
    const originalText = button.textContent;
    const originalDisabled = button.disabled;
    
    button.disabled = true;
    button.textContent = 'Starting checkout...';
    button.classList.add('processing');
    
    try {
        console.log(`🛒 Starting checkout for plan: ${plan}`);
        
        // Validate plan
        if (pricingConfig && !pricingConfig[plan]) {
            throw new Error(`Invalid plan: ${plan}`);
        }
        
        // Track checkout start event
        trackEvent('checkout_start', {
            plan: plan,
            button_text: originalText,
            timestamp: new Date().toISOString()
        });
        
        // Create checkout session
        const response = await fetch('/api/payment/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                plan: plan,
                successUrl: window.location.origin + '/success.html?session_id={CHECKOUT_SESSION_ID}&plan=' + plan,
                cancelUrl: window.location.href
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        
        const session = await response.json();
        
        if (!session.success || !session.url) {
            throw new Error(session.error || 'Invalid session response');
        }
        
        console.log('✅ Checkout session created:', session.sessionId);
        
        // Track checkout session created
        trackEvent('checkout_session_created', {
            plan: plan,
            session_id: session.sessionId
        });
        
        // Update button for redirect
        button.textContent = 'Redirecting to payment...';
        
        // Redirect to Stripe Checkout
        window.location.href = session.url;
        
    } catch (error) {
        console.error('❌ Checkout error:', error);
        
        // Track checkout error
        trackEvent('checkout_error', {
            plan: plan,
            error: error.message
        });
        
        // Show user-friendly error message
        let errorMessage = 'Unable to start checkout. ';
        
        if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage += 'Please check your internet connection and try again.';
        } else if (error.message.includes('configuration') || error.message.includes('price')) {
            errorMessage += 'There\'s a configuration issue. Please contact support@rinawarp.com.';
        } else if (error.message.includes('rate limit')) {
            errorMessage += 'Too many attempts. Please wait a few minutes and try again.';
        } else {
            errorMessage += 'Please try again or contact support if the issue persists.';
        }
        
        showError(errorMessage);
        
        // Reset button state
        button.disabled = originalDisabled;
        button.textContent = originalText;
        button.classList.remove('processing');
        
    } finally {
        isProcessing = false;
    }
}

/**
 * Show error message to user
 */
function showError(message) {
    // Remove existing error messages
    const existingErrors = document.querySelectorAll('.checkout-error');
    existingErrors.forEach(error => error.remove());
    
    // Create error element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'checkout-error';
    errorDiv.style.cssText = `
        background: #fee;
        border: 1px solid #fcc;
        color: #c33;
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(204, 51, 51, 0.1);
    `;
    errorDiv.textContent = message;
    
    // Insert error message near checkout buttons
    const firstCheckoutButton = document.querySelector('[data-plan], .purchase-btn, .checkout-btn');
    if (firstCheckoutButton && firstCheckoutButton.parentNode) {
        firstCheckoutButton.parentNode.insertBefore(errorDiv, firstCheckoutButton);
    } else {
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 10000);
}

/**
 * Track events for analytics
 */
function trackEvent(eventName, data) {
    try {
        // Send to analytics system
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                custom_parameter_1: data.plan || 'unknown',
                custom_parameter_2: data.error || '',
                value: data.value || 0
            });
        }
        
        // Send to internal analytics
        fetch('/api/analytics/track', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                event: eventName,
                properties: data,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent
            })
        }).catch(err => console.log('Analytics tracking failed:', err));
        
        console.log(`📊 Event tracked: ${eventName}`, data);
    } catch (error) {
        console.log('Failed to track event:', error);
    }
}

/**
 * Show success message
 */
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'checkout-success';
    successDiv.style.cssText = `
        background: #efe;
        border: 1px solid #cfc;
        color: #3c3;
        padding: 15px;
        border-radius: 8px;
        margin: 20px 0;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(51, 204, 51, 0.1);
    `;
    successDiv.textContent = message;
    
    document.body.insertBefore(successDiv, document.body.firstChild);
    
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 5000);
}

// Make functions globally available
window.startCheckout = startCheckout;
window.purchasePlan = (plan) => startCheckout(plan, null);
window.showCheckoutError = showError;
window.showCheckoutSuccess = showSuccess;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        startCheckout,
        showError,
        showSuccess,
        trackEvent
    };
}
