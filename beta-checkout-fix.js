/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 4 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

// Fixed Beta Checkout Function - exported for use in HTML
window.purchaseBeta = async function purchaseBeta(betaType, event) {
  // Check if stripe is available globally
  if (typeof window.Stripe === 'undefined' || !window.Stripe) {
    console.error('Payment system not ready. Please refresh and try again.');
    return;
  }

  // Initialize stripe with public key if available
  const stripe =
    window.Stripe && window.stripePublicKey ? window.Stripe(window.stripePublicKey) : null;
  if (!stripe) {
    console.error('Payment system not initialized. Please refresh and try again.');
    return;
  }

  const button = event.currentTarget;
  const originalText = button.textContent;

  // Validate beta type
  const validBetaTypes = ['earlybird', 'beta', 'premium'];
  if (!validBetaTypes.includes(betaType)) {
    console.error('Invalid beta type selected.');
    return;
  }

  // Show loading state
  button.disabled = true;
  button.textContent = 'Processing...';

  try {
    // Get the appropriate price ID
    const priceId = getBetaPriceId(betaType);

    if (!priceId) {
      throw new Error(
        new Error(new Error(`Beta pricing not configured for ${betaType}. Please contact support.`))
      );
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
          product: 'RinaWarp Terminal Beta',
        },
      }),
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
      sessionId: session.sessionId,
    });

    if (result.error) {
      throw new Error(new Error(new Error(result.error.message)));
    }
  } catch (error) {
    console.error('❌ Beta checkout error:', error);

    // Improved error messages
    let errorMessage = 'Failed to start beta checkout. ';

    if (error.message.includes('not configured')) {
      errorMessage +=
        'Beta pricing is being set up. Please contact support@rinawarp.com for early access.';
    } else if (error.message.includes('Server error: 500')) {
      errorMessage += 'Our servers are having issues. Please try again in a few minutes.';
    } else if (error.message.includes('Network')) {
      errorMessage += 'Please check your internet connection and try again.';
    } else {
      errorMessage += 'Please try again or contact support@rinawarp.com if the issue persists.';
    }

    console.error(errorMessage);

    // Reset button state
    button.disabled = false;
    button.textContent = originalText;
  }
};

// Enhanced price ID getter with fallbacks
function getBetaPriceId(betaType) {
  // Try to get from server configuration first
  const betaPrices =
    (typeof window.stripeConfig !== 'undefined' && window.stripeConfig.betaPrices) || {};

  const betaPriceMap = {
    earlybird: betaPrices.earlybird,
    beta: betaPrices.beta,
    premium: betaPrices.premium,
  };

  const priceId = betaPriceMap[betaType];

  // Log for debugging

  return priceId;
}
