/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

// purchasePlan.js - Fully Backend-Driven Checkout

/**
 * Initiates a Stripe Checkout session via backend (no direct Stripe frontend calls).
 * @param {string} planOrPriceId - Either a plan name ('personal', 'professional', 'team') or direct price ID ('price_123...')
 */
async function purchasePlan(planOrPriceId) {
  try {
    console.log(`🛒 Starting backend-driven checkout for: ${planOrPriceId}`);
    
    let priceId;
    
    // Check if it's a direct price ID (starts with 'price_')
    if (planOrPriceId.startsWith('price_')) {
      priceId = planOrPriceId;
      console.log(`💡 Using direct price ID: ${priceId}`);
    } else {
      // It's a plan name, get price ID from config
      if (!window.stripeConfig || !window.stripeConfig.prices) {
        console.log('⏳ Waiting for price config to load...');
        alert('Payment system is loading. Please try again in a moment.');
        return;
      }
      
      priceId = window.stripeConfig.prices[planOrPriceId];
      if (!priceId) {
        console.error(`❌ No price ID found for plan: ${planOrPriceId}`);
        alert('Price not configured for this plan. Please contact support.');
        return;
      }
      
      console.log(`💡 Using price ID from plan '${planOrPriceId}': ${priceId}`);
    }
    
    console.log('🔄 Calling backend to create checkout session...');
    
    // Call backend to create checkout session (backend handles mode detection)
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        priceId,
        successUrl: window.location.origin + '/success.html?session_id={CHECKOUT_SESSION_ID}',
        cancelUrl: window.location.origin + '/'
      }),
    });

    if (!response.ok) {
      throw new Error(new Error(`HTTP ${response.status}: ${response.statusText}`));
    }

    const data = await response.json();
    console.log('📦 Backend response:', data);

    if (data.url) {
      console.log('✅ Redirecting to Stripe Checkout via backend session...');
      // Direct redirect to Stripe-hosted checkout (no frontend Stripe SDK needed)
      window.location.href = data.url;
    } else {
      throw new Error(new Error(data.error || 'No checkout URL received from backend'));
    }
  } catch (error) {
    console.error('❌ Purchase error:', error.message);
    alert('There was a problem starting the checkout process. Please try again.');
  }
}

// Make it globally available
window.purchasePlan = purchasePlan;
