// Success Page JavaScript - External file for CSP compliance

// Parse URL parameters
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('session_id');
const plan = urlParams.get('plan');

// Update order details
if (plan) {
    const planNames = {
        'basic': 'Basic Plan ($29/month)',
        'pro': 'Professional Plan ($99/month)',
        'enterprise': 'Enterprise Plan ($299/month)',
        'personal': 'Personal Plan ($15/month)',
        'professional': 'Professional Plan ($25/month)',
        'team': 'Team Plan ($35/month)',
        'beta-earlybird': 'Beta Early Bird ($29)',
        'beta': 'Beta Access ($39)',
        'beta-premium': 'Premium Beta ($59)'
    };
    const planNameElement = document.getElementById('planName');
    if (planNameElement) {
        planNameElement.textContent = planNames[plan] || plan;
    }
}

if (sessionId) {
    const orderIdElement = document.getElementById('orderId');
    if (orderIdElement) {
        orderIdElement.textContent = sessionId.substring(0, 16) + '...';
    }
}

// Track conversion with Google Analytics
if (typeof gtag !== 'undefined') {
    // Determine the value based on plan
    let planValue = 0;
    const planPrices = {
        'basic': 29,
        'pro': 99,
        'enterprise': 299,
        'personal': 15,
        'professional': 25,
        'team': 35,
        'beta-earlybird': 29,
        'beta': 39,
        'beta-premium': 59
    };
    
    planValue = planPrices[plan] || 0;
    
    gtag('event', 'purchase', {
        transaction_id: sessionId || 'unknown',
        value: planValue,
        currency: 'USD',
        items: [{
            item_name: 'RinaWarp Terminal',
            item_category: 'Software',
            item_variant: plan || 'unknown',
            quantity: 1,
            price: planValue
        }]
    });
    
    // Also send a conversion event
    gtag('event', 'conversion', {
        'send_to': 'G-G424CV5GGT/conversion',
        'value': planValue,
        'currency': 'USD',
        'transaction_id': sessionId || 'unknown'
    });
}
