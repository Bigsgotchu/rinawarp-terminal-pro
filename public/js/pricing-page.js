/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 11 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

// Pricing Page JavaScript - External file for CSP compliance

// Countdown timer - 7 days from page load
function startCountdown() {
    const endTime = new Date();
    endTime.setDate(endTime.getDate() + 7);
    
    function updateCountdown() {
        const now = new Date().getTime();
        const distance = endTime - now;
        
        if (distance < 0) {
            document.getElementById('countdown').innerHTML = "ENDED";
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        document.getElementById('countdown').innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// Initialize Stripe
let stripe;
let stripeConfig = {};

async function initializeStripe() {
    try {
        // Fetch Stripe configuration from server
        const response = await fetch('/api/stripe-config');
        if (!response.ok) {
            throw new Error(new Error(new Error('Failed to load Stripe configuration')));
        }
        
        stripeConfig = await response.json();
        
        if (!stripeConfig.publishableKey) {
            throw new Error(new Error(new Error('Stripe publishable key not configured')));
        }
        
        // For demo/test purposes, check if it's a placeholder key
        if (stripeConfig.publishableKey.includes('51234567890abcdef')) {
            showInfo('Demo mode: Payment buttons will show checkout simulation.');
            return;
        }
        
        stripe = Stripe(stripeConfig.publishableKey);
    } catch (error) {
        console.error('❌ Error initializing Stripe:', error);
        // Show user-friendly error message
        showError('Payment system temporarily unavailable. Please try again later.');
    }
}

// Purchase plan function with multiple routing strategies
async function purchasePlan(planType) {
    if (planType === 'free') {
        // Redirect to download page for free plan
        window.location.href = '/api/download';
        return;
    }
    
    const button = event.target;
    const originalText = button.textContent;
    
    // Show loading state
    button.disabled = true;
    button.classList.add('loading');
    
    try {
        // Try multiple routing strategies
        const success = await tryMultipleRoutes(planType, button, originalText);
        
        if (!success) {
            // Fallback to direct payment link
            await handlePaymentLinkFallback(planType);
        }
        
    } catch (error) {
        console.error('❌ Error in purchase flow:', error);
        showError('Unable to start checkout. Please contact support.');
        
        // Reset button state
        button.disabled = false;
        button.classList.remove('loading');
        button.textContent = originalText;
    }
}

// Try multiple routing strategies for Stripe
async function tryMultipleRoutes(planType, button, originalText) {
    const routes = [
        '/api/create-checkout-session'              // Railway Express server
    ];
    
    const priceId = getPriceId(planType);
    if (!priceId) {
        throw new Error(new Error(new Error(`Price not configured for ${planType} plan`)));
    }
    
    const requestBody = {
        priceId: priceId,
        successUrl: window.location.origin + '/success.html?plan=' + planType,
        cancelUrl: window.location.href
    };
    
    for (let i = 0; i < routes.length; i++) {
        try {
            
            const response = await fetch(routes[i], {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error(new Error(new Error(`HTTP ${response.status}: ${response.statusText}`)));
            }
            
            const session = await response.json();
            
            if (!session.sessionId && !session.url) {
                throw new Error(new Error(new Error('Invalid response format')));
            }
            
            console.log(`✅ Route ${i + 1} successful!`);
            
            // Check if we have Stripe initialized for redirectToCheckout
            if (stripe && session.sessionId) {
                const result = await stripe.redirectToCheckout({
                    sessionId: session.sessionId
                });
                
                if (result.error) {
                    throw new Error(new Error(new Error(result.error.message)));
                }
            } else if (session.url) {
                // Direct URL redirect
                window.location.href = session.url;
            }
            
            return true;
            
        } catch (error) {
            console.log(`❌ Route ${i + 1} failed: ${error.message}`);
            if (i === routes.length - 1) {
                // All routes failed
                throw new Error(new Error(error));
            }
            // Try next route
            continue;
        }
    }
    
    return false;
}

// Fallback to payment links
async function handlePaymentLinkFallback(planType) {
    try {
        
        const response = await fetch('/api/stripe-payment-links.json');
        if (response.ok) {
            const paymentLinks = await response.json();
            const link = paymentLinks.paymentLinks[planType]?.monthly;
            
            if (link && !link.includes('test_')) {
                // Real payment link available
                window.location.href = link;
                return;
            }
        }
    } catch (error) {
    }
    
    // Final fallback - show contact message
    showError('Payment system temporarily unavailable. Please contact support@rinawarp.com to complete your purchase.');
}

// Fixed Beta Checkout Function with Enhanced Error Handling
async function purchaseBeta(betaType) {
    if (!stripe) {
        showError('Payment system not ready. Please refresh and try again.');
        return;
    }
    
    const button = event.target;
    const originalText = button.textContent;
    
    // Validate beta type
    const validBetaTypes = ['earlybird', 'beta', 'premium'];
    if (!validBetaTypes.includes(betaType)) {
        showError('Invalid beta type selected.');
        return;
    }
    
    // Show loading state
    button.disabled = true;
    button.textContent = 'Processing...';
    
    try {
        // Get the appropriate price ID
        const priceId = getBetaPriceId(betaType);
        
        if (!priceId) {
            throw new Error(new Error(new Error(`Beta pricing not configured for ${betaType}. Please contact support.`)));
        }
        
        // Enhanced error handling for checkout session
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                priceId: priceId,
                successUrl: window.location.origin + '/success.html?plan=beta-' + betaType,
                cancelUrl: window.location.href,
                metadata: {
                    betaType: betaType,
                    product: 'RinaWarp Terminal Beta'
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(new Error(new Error(errorData.error || `Server error: ${response.status}`)));
        }
        
        const session = await response.json();
        
        if (!session.sessionId) {
            throw new Error(new Error(new Error('Invalid session response from server')));
        }
        
        // Redirect to Stripe Checkout
        const result = await stripe.redirectToCheckout({
            sessionId: session.sessionId
        });
        
        if (result.error) {
            throw new Error(new Error(new Error(result.error.message)));
        }
        
    } catch (error) {
        console.error('❌ Beta checkout error:', error);
        
        // Improved error messages
        let errorMessage = 'Failed to start beta checkout. ';
        
        if (error.message.includes('not configured')) {
            errorMessage += 'Beta pricing is being set up. Please contact support@rinawarp.com for early access.';
        } else if (error.message.includes('Server error: 500')) {
            errorMessage += 'Our servers are having issues. Please try again in a few minutes.';
        } else if (error.message.includes('Network')) {
            errorMessage += 'Please check your internet connection and try again.';
        } else {
            errorMessage += 'Please try again or contact support@rinawarp.com if the issue persists.';
        }
        
        showError(errorMessage);
        
        // Reset button state
        button.disabled = false;
        button.textContent = originalText;
    }
}

// Enhanced getBetaPriceId function with debugging
function getBetaPriceId(betaType) {
    // Try to get from server configuration first
    const betaPrices = stripeConfig.betaPrices || {};
    
    
    const betaPriceMap = {
        'earlybird': betaPrices.earlybird || null,
        'beta': betaPrices.beta || null,
        'premium': betaPrices.premium || null
    };
    
    const priceId = betaPriceMap[betaType];
    
    // Enhanced logging for debugging
    console.log(`💰 Price ID for ${betaType}: ${priceId}`);
    
    if (!priceId) {
        console.warn(`⚠️ No price ID found for beta type: ${betaType}`);
    }
    
    return priceId;
}

// Get price ID based on plan type
function getPriceId(planType) {
    const priceMap = {
        'free': null, // Free plan doesn't need Stripe
        'personal': stripeConfig.prices?.personal,
        'professional': stripeConfig.prices?.professional,
        'team': stripeConfig.prices?.team,
        'enterprise': null // Enterprise is handled via email
    };
    
    return priceMap[planType];
}

// Show error message
function showError(message) {
    showNotification(message, '#ff4757');
}

// Show info message
function showInfo(message) {
    showNotification(message, '#3498db');
}

// Generic notification function
function showNotification(message, color) {
    const notificationDiv = document.createElement('div');
    notificationDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 9999;
        font-weight: bold;
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
    `;
    notificationDiv.textContent = message;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    if (!document.head.querySelector('style[data-notification]')) {
        style.setAttribute('data-notification', 'true');
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notificationDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notificationDiv.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notificationDiv.remove(), 300);
    }, 5000);
}

// Set up event handlers when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize countdown
    startCountdown();
    
    // Initialize Stripe
    initializeStripe();
    
    // Set up event handlers
    const handlers = [
        { id: 'csp-safe-1753586469640-1', action: () => document.getElementById('launch-banner').style.display='none' },
        { id: 'csp-safe-1753586469640-2', action: () => purchaseBeta('earlybird') },
        { id: 'csp-safe-1753586469640-3', action: () => purchaseBeta('beta') },
        { id: 'csp-safe-1753586469640-4', action: () => purchaseBeta('premium') },
        { id: 'csp-safe-1753586469640-5', action: () => purchasePlan('personal') },
        { id: 'csp-safe-1753586469640-6', action: () => purchasePlan('professional') },
        { id: 'csp-safe-1753586469640-7', action: () => purchasePlan('team') },
        { id: 'csp-safe-1753586469640-8', action: () => purchasePlan('free') },
        { id: 'csp-safe-1753586469640-9', action: () => window.open('mailto:enterprise@rinawarp.com?subject=Enterprise%20Inquiry', '_blank') }
    ];
    
    handlers.forEach(handler => {
        const element = document.querySelector(`[data-handler-id="${handler.id}"]`);
        if (element) {
            element.addEventListener('click', handler.action);
        }
    });
});

// Google Analytics functions
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

// Initialize GA4
gtag('js', new Date());
gtag('config', 'G-G424CV5GGT');

// Set GA4 measurement ID for auto-initialization
window.GA4_MEASUREMENT_ID = 'G-G424CV5GGT';

// Log page view for A/B testing (for the simple variant)
if (window.location.pathname === '/pricing' || window.location.pathname === '/pricing.html') {
    gtag('event', 'page_view', {
        page_title: 'Pricing - Ocean Theme',
        page_location: window.location.href,
        page_path: window.location.pathname,
        ab_variant: 'simple'
    });
}
