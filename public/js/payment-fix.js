// Payment System Fix - RinaWarp Terminal
// This script provides fallback mechanisms for payment processing

(function() {
    console.log('🔧 Payment fix script loaded');
    
    // Override the purchasePlan function with enhanced error handling
    window.purchasePlan = async function(planType) {
        console.log(`🛒 Purchase initiated for plan: ${planType}`);
        
        if (planType === 'free') {
            window.location.href = '/api/download';
            return;
        }
        
        const button = event.target;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Processing...';
        
        try {
            // First, check if we're in production
            const isProduction = window.location.hostname === 'rinawarptech.com';
            
            // Try Stripe checkout first
            const stripeResponse = await attemptStripeCheckout(planType);
            if (stripeResponse.success) {
                return;
            }
            
            // Fallback to payment links
            const paymentLink = await getPaymentLink(planType);
            if (paymentLink) {
                console.log('📎 Using payment link fallback');
                window.location.href = paymentLink;
                return;
            }
            
            // Final fallback - show contact info
            showPaymentFallback(planType);
            
        } catch (error) {
            console.error('❌ Payment error:', error);
            showPaymentError(error.message);
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    };
    
    // Override purchaseBeta function
    window.purchaseBeta = async function(betaType) {
        console.log(`🚀 Beta purchase initiated: ${betaType}`);
        
        const button = event.target;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Processing...';
        
        try {
            const betaPriceMap = {
                'earlybird': { price: 29, priceId: 'price_1Rp8O5G2ToGP7ChnenRdFKyi' },
                'beta': { price: 39, priceId: 'price_1Rp8OHG2ToGP7ChnZxNr7sqz' },
                'premium': { price: 59, priceId: 'price_1Rp8OSG2ToGP7ChnXMUEevfi' }
            };
            
            const betaInfo = betaPriceMap[betaType];
            if (!betaInfo) {
                throw new Error('Invalid beta type');
            }
            
            // Try Stripe checkout
            const stripeResponse = await attemptStripeCheckout(`beta-${betaType}`, betaInfo.priceId);
            if (stripeResponse.success) {
                return;
            }
            
            // Fallback
            showBetaFallback(betaType, betaInfo.price);
            
        } catch (error) {
            console.error('❌ Beta purchase error:', error);
            showPaymentError(error.message);
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    };
    
    // Attempt Stripe checkout with multiple routes
    async function attemptStripeCheckout(planType, priceId) {
        const routes = [
            '/api/create-checkout-session',
            '/.netlify/functions/create-checkout-session',
            '/api/stripe-checkout'
        ];
        
        if (!priceId) {
            // Get price ID from config
            const config = await getStripeConfig();
            priceId = getPriceIdForPlan(planType, config);
        }
        
        for (const route of routes) {
            try {
                console.log(`🔄 Trying route: ${route}`);
                const response = await fetch(route, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        priceId: priceId,
                        successUrl: window.location.origin + '/success.html?plan=' + planType,
                        cancelUrl: window.location.href
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.url) {
                        window.location.href = data.url;
                        return { success: true };
                    } else if (data.sessionId && window.stripe) {
                        await window.stripe.redirectToCheckout({ sessionId: data.sessionId });
                        return { success: true };
                    }
                }
            } catch (error) {
                console.log(`Route ${route} failed:`, error.message);
            }
        }
        
        return { success: false };
    }
    
    // Get Stripe configuration
    async function getStripeConfig() {
        try {
            const response = await fetch('/api/stripe-config');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Failed to load Stripe config:', error);
        }
        
        // Fallback config
        return {
            publishableKey: "pk_live_51RaxSiG2ToGP7Chntmrt8SEr2jO7MxKH6Y6XtFS4MttiPvE5DkQ67aNNzjfnhn9J4SPKRVW0qCIqHF2OjO9T04Vr00qtnxd5Qj",
            prices: {
                personal: "price_1RlLBwG2ToGP7ChnhstisPz0",
                professional: "price_1RlLC4G2ToGP7ChndbHLotM7",
                team: "price_1RlLCEG2ToGP7ChnZa5Px0ow"
            }
        };
    }
    
    // Get price ID for plan
    function getPriceIdForPlan(planType, config) {
        const priceMap = {
            'personal': config.prices?.personal,
            'professional': config.prices?.professional,
            'team': config.prices?.team,
            'beta-earlybird': config.betaPrices?.earlybird,
            'beta-beta': config.betaPrices?.beta,
            'beta-premium': config.betaPrices?.premium
        };
        
        return priceMap[planType];
    }
    
    // Get payment link fallback
    async function getPaymentLink(planType) {
        const fallbackLinks = {
            'personal': 'https://buy.stripe.com/14k6sU0b10Gk7V68wF',
            'professional': 'https://buy.stripe.com/6oE2cEeTT0Gk3EC8wG',
            'team': 'https://buy.stripe.com/28o7wY6zp5WA81c6oz'
        };
        
        return fallbackLinks[planType];
    }
    
    // Show payment fallback
    function showPaymentFallback(planType) {
        const message = `
            <div style="text-align: center; padding: 20px;">
                <h3>🌊 Payment System Loading...</h3>
                <p>Our payment system is being optimized for a smoother experience.</p>
                <p>Please contact us to complete your purchase:</p>
                <div style="margin: 20px 0;">
                    <a href="mailto:support@rinawarp.com?subject=Purchase ${planType} plan" 
                       style="background: #00ff88; color: #1a1a2e; padding: 12px 24px; 
                              border-radius: 5px; text-decoration: none; font-weight: bold;">
                        📧 Email Support
                    </a>
                </div>
                <p>Or call: +1 (555) 123-4567</p>
                <p style="color: #888; font-size: 0.9em; margin-top: 20px;">
                    We'll process your order immediately and send you the download link.
                </p>
            </div>
        `;
        
        showModal(message);
    }
    
    // Show beta fallback
    function showBetaFallback(betaType, price) {
        const message = `
            <div style="text-align: center; padding: 20px;">
                <h3>🚀 Beta Access - $${price}</h3>
                <p>Ready to join the beta program!</p>
                <p>Complete your purchase via:</p>
                <div style="margin: 20px 0;">
                    <a href="mailto:beta@rinawarp.com?subject=Beta ${betaType} purchase" 
                       style="background: #ff1493; color: white; padding: 12px 24px; 
                              border-radius: 5px; text-decoration: none; font-weight: bold;">
                        📧 Secure Beta Access
                    </a>
                </div>
                <p>You'll receive:</p>
                <ul style="text-align: left; display: inline-block;">
                    <li>Immediate beta access</li>
                    <li>Full license on release</li>
                    <li>Priority support</li>
                    <li>Early feature access</li>
                </ul>
            </div>
        `;
        
        showModal(message);
    }
    
    // Show error message
    function showPaymentError(error) {
        showNotification(`Payment error: ${error}. Please try again or contact support.`, 'error');
    }
    
    // Show modal
    function showModal(content) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 10px; padding: 30px; 
                        max-width: 500px; position: relative; color: #333;">
                <button onclick="this.closest('div').parentElement.remove()" 
                        style="position: absolute; top: 10px; right: 10px; 
                               background: none; border: none; font-size: 24px; 
                               cursor: pointer;">×</button>
                ${content}
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    // Show notification
    function showNotification(message, type = 'info') {
        const colors = {
            info: '#3498db',
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12'
        };
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 10001;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
    
    // Add CSS animations
    if (!document.querySelector('#payment-fix-styles')) {
        const style = document.createElement('style');
        style.id = 'payment-fix-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    console.log('✅ Payment fix script initialized');
})();
