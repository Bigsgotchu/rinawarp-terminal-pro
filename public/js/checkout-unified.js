/**
 * 🎯 UNIFIED CHECKOUT SYSTEM - FIXED FOR CONVERSIONS
 * This replaces all conflicting checkout implementations
 * Connects to the working /api/create-checkout-session endpoint
 */

// Configuration - matches your .env file
const CHECKOUT_CONFIG = {
    endpoint: '/api/create-checkout-session',
    plans: {
        // Your actual price IDs from .env
        personal: 'price_1RlLBwG2ToGP7ChnhstisPz0',
        professional: 'price_1RlLC4G2ToGP7ChndbHLotM7', 
        team: 'price_1RlLCEG2ToGP7ChnZa5Px0ow'
    },
    pricing: {
        personal: { amount: 15, name: 'Personal' },
        professional: { amount: 25, name: 'Professional' },
        team: { amount: 35, name: 'Team' }
    }
};

// Global checkout state
let isCheckoutProcessing = false;

/**
 * Initialize checkout system when page loads
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Unified Checkout System initialized');
    setupCheckoutButtons();
    setupAnalyticsTracking();
});

/**
 * Setup all checkout buttons on the page
 */
function setupCheckoutButtons() {
    // Find all checkout buttons
    const selectors = [
        '[data-plan]',           // New standard
        '.purchase-btn',         // Existing buttons
        '.checkout-btn',         // Existing buttons  
        '.plan-button',          // Pricing page buttons
        '[onclick*="purchase"]', // Legacy onclick buttons
        '.btn-primary[href="#"]' // Generic buttons
    ];
    
    selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(button => {
            // Remove existing onclick handlers to avoid conflicts
            button.removeAttribute('onclick');
            
            // Add new click handler
            button.addEventListener('click', handleCheckoutClick);
            
            console.log(`✅ Checkout button connected: ${button.textContent.trim()}`);
        });
    });
}

/**
 * Handle checkout button clicks
 */
async function handleCheckoutClick(event) {
    event.preventDefault();
    
    if (isCheckoutProcessing) {
        console.log('⏳ Checkout already in progress...');
        return;
    }
    
    const button = event.target;
    const plan = determinePlan(button);
    
    if (!plan) {
        console.error('❌ Could not determine plan for button:', button);
        showError('Unable to determine plan. Please try again or contact support.');
        return;
    }
    
    console.log(`🚀 Starting checkout for plan: ${plan}`);
    
    // Track checkout attempt
    trackCheckoutEvent('checkout_initiated', { plan: plan });
    
    await startCheckout(plan, button);
}

/**
 * Determine which plan was clicked
 */
function determinePlan(button) {
    // 1. Check data-plan attribute
    if (button.dataset.plan) {
        return button.dataset.plan.toLowerCase();
    }
    
    // 2. Check button text content
    const text = button.textContent.toLowerCase();
    if (text.includes('personal') || text.includes('basic')) return 'personal';
    if (text.includes('professional') || text.includes('pro')) return 'professional';
    if (text.includes('team') || text.includes('enterprise')) return 'team';
    
    // 3. Check parent container for plan info
    const container = button.closest('.pricing-card, .plan-card, [class*="plan"], [class*="tier"]');
    if (container) {
        const containerText = container.textContent.toLowerCase();
        if (containerText.includes('personal') || containerText.includes('basic')) return 'personal';
        if (containerText.includes('professional') || containerText.includes('pro')) return 'professional';
        if (containerText.includes('team') || containerText.includes('enterprise')) return 'team';
        
        // Check for price indicators
        if (containerText.includes('$15') || containerText.includes('15/')) return 'personal';
        if (containerText.includes('$25') || containerText.includes('25/')) return 'professional';
        if (containerText.includes('$35') || containerText.includes('35/')) return 'team';
    }
    
    // 4. Default fallback based on common patterns
    if (text.includes('get started') || text.includes('start free')) return 'personal';
    if (text.includes('most popular') || text.includes('recommended')) return 'professional';
    if (text.includes('enterprise') || text.includes('business')) return 'team';
    
    return null;
}

/**
 * Start the checkout process
 */
async function startCheckout(plan, button) {
    isCheckoutProcessing = true;
    
    // Update button state
    const originalText = button.textContent;
    const originalDisabled = button.disabled;
    
    button.disabled = true;
    button.textContent = 'Starting checkout...';
    button.classList.add('processing');
    
    try {
        const priceId = CHECKOUT_CONFIG.plans[plan];
        if (!priceId) {
            throw new Error(`No price ID configured for plan: ${plan}`);
        }
        
        console.log(`💳 Creating checkout session for plan: ${plan}, priceId: ${priceId}`);
        
        // Create checkout session
        const response = await fetch(CHECKOUT_CONFIG.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                priceId: priceId,
                plan: plan,
                successUrl: `${window.location.origin}/success.html?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
                cancelUrl: window.location.href,
                metadata: {
                    plan: plan,
                    amount: CHECKOUT_CONFIG.pricing[plan].amount,
                    planName: CHECKOUT_CONFIG.pricing[plan].name
                }
            })
        });
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { error: `Server error: ${response.status}` };
            }
            
            // Handle specific Stripe configuration errors
            if (response.status === 500 && errorData.error && errorData.error.includes('Stripe not configured')) {
                throw new Error('Payment system is not yet configured. Please contact support@rinawarptech.com to complete your purchase.');
            }
            
            // Handle authentication errors (missing API keys)
            if (errorData.error && errorData.error.includes('did not provide an API key')) {
                throw new Error('Payment system requires configuration. Please contact support@rinawarptech.com to complete your purchase.');
            }
            
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        
        const session = await response.json();
        
        if (!session.url) {
            throw new Error(session.error || 'No checkout URL received');
        }
        
        console.log('✅ Checkout session created:', session.sessionId);
        
        // Track successful session creation
        trackCheckoutEvent('checkout_session_created', { 
            plan: plan, 
            sessionId: session.sessionId 
        });
        
        // Update button for redirect
        button.textContent = 'Redirecting to payment...';
        
        // Redirect to Stripe Checkout
        window.location.href = session.url;
        
    } catch (error) {
        console.error('❌ Checkout failed:', error);
        
        // Track checkout error
        trackCheckoutEvent('checkout_error', { 
            plan: plan, 
            error: error.message 
        });
        
        // Show user-friendly error
        let errorMessage = 'Unable to start checkout. ';
        
        if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage += 'Please check your internet connection and try again.';
        } else if (error.message.includes('price') || error.message.includes('configured')) {
            errorMessage += 'There\'s a configuration issue. Please contact support@rinawarptech.com.';
        } else {
            errorMessage += 'Please try again or contact support if the issue persists.';
        }
        
        showError(errorMessage);
        
    } finally {
        // Reset button state
        isCheckoutProcessing = false;
        button.disabled = originalDisabled;
        button.textContent = originalText;
        button.classList.remove('processing');
    }
}

/**
 * Show error message to user
 */
function showError(message) {
    // Try to find existing error container
    let errorContainer = document.querySelector('.checkout-error');
    
    if (!errorContainer) {
        // Create error container
        errorContainer = document.createElement('div');
        errorContainer.className = 'checkout-error';
        errorContainer.style.cssText = `
            background: #fee;
            border: 1px solid #fcc;
            color: #c33;
            padding: 12px 16px;
            border-radius: 4px;
            margin: 16px 0;
            font-size: 14px;
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 400px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        `;
        document.body.appendChild(errorContainer);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (errorContainer.parentNode) {
                errorContainer.parentNode.removeChild(errorContainer);
            }
        }, 8000);
    }
    
    errorContainer.textContent = message;
    console.error('🚨 Checkout Error:', message);
}

/**
 * Setup analytics tracking
 */
function setupAnalyticsTracking() {
    // Track page view with intent
    trackCheckoutEvent('pricing_page_view', {
        url: window.location.href,
        timestamp: new Date().toISOString()
    });
}

/**
 * Track checkout-related events
 */
function trackCheckoutEvent(eventName, data = {}) {
    try {
        // Google Analytics 4
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                event_category: 'checkout',
                event_label: data.plan || 'unknown',
                value: data.amount || 0,
                currency: 'USD',
                ...data
            });
        }
        
        // Custom analytics
        if (typeof window.RinaWarpAnalytics !== 'undefined') {
            window.RinaWarpAnalytics.trackEvent(eventName, data);
        }
        
        // Log for debugging
        console.log(`📊 Tracked event: ${eventName}`, data);
        
    } catch (error) {
        console.warn('⚠️ Analytics tracking failed:', error);
    }
}

// Export for testing
window.RinaWarpCheckout = {
    startCheckout,
    determinePlan,
    trackCheckoutEvent
};

console.log('✅ Unified Checkout System loaded successfully');
