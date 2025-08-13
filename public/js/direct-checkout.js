/**
 * Direct Stripe Checkout System - No backend required
 * Uses payment links and direct Stripe integration for immediate revenue
 */

// Production Stripe Configuration
const STRIPE_CONFIG = {
  publishableKey: '{{REDACTED_SECRET}}',
  
  // Working Stripe Payment Links (bypasses need for backend)
  paymentLinks: {
    personal: 'https://buy.stripe.com/14k6sU0b10Gk7V68wF',
    professional: 'https://buy.stripe.com/6oE2cEeTT0Gk3EC8wG', 
    team: 'https://buy.stripe.com/28o7wY6zp5WA81c6oz',
    
    // Beta access links
    earlybird: 'https://buy.stripe.com/5kAaIa7DtbiMahe6os',
    beta: 'https://buy.stripe.com/aEUbMe1f5090d9m004',
    premium: 'https://buy.stripe.com/00g6sU7Dt090ctq7sx'
  }
};

// Initialize Stripe
let stripe;

function initStripe() {
  try {
    stripe = Stripe(STRIPE_CONFIG.publishableKey);
    console.log('✅ Stripe initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Stripe initialization failed:', error);
    return false;
  }
}

// Direct purchase functions
function purchasePersonal() {
  gtag('event', 'begin_checkout', {
    currency: 'USD',
    value: 15.00,
    items: [{
      item_id: 'personal_plan',
      item_name: 'Reef Explorer Personal Plan',
      price: 15.00,
      quantity: 1
    }]
  });
  
  window.location.href = STRIPE_CONFIG.paymentLinks.personal;
}

function purchaseProfessional() {
  gtag('event', 'begin_checkout', {
    currency: 'USD', 
    value: 25.00,
    items: [{
      item_id: 'professional_plan',
      item_name: 'Mermaid Pro Professional Plan',
      price: 25.00,
      quantity: 1
    }]
  });
  
  window.location.href = STRIPE_CONFIG.paymentLinks.professional;
}

function purchaseTeam() {
  gtag('event', 'begin_checkout', {
    currency: 'USD',
    value: 35.00,
    items: [{
      item_id: 'team_plan',
      item_name: 'Ocean Fleet Team Plan',
      price: 35.00,
      quantity: 1
    }]
  });
  
  window.location.href = STRIPE_CONFIG.paymentLinks.team;
}

function purchaseFree() {
  gtag('event', 'begin_checkout', {
    currency: 'USD',
    value: 0,
    items: [{
      item_id: 'free_plan',
      item_name: 'Free Starter Plan',
      price: 0,
      quantity: 1
    }]
  });
  
  // Redirect to download for free plan
  window.location.href = '/download.html?plan=free&utm_source=pricing&utm_medium=web&utm_campaign=free_starter';
}

function purchaseEnterprise() {
  gtag('event', 'generate_lead', {
    currency: 'USD',
    value: 99.00,
    items: [{
      item_id: 'enterprise_plan',
      item_name: 'Enterprise Navigator Plan',
      price: 99.00,
      quantity: 1
    }]
  });
  
  // Open email client for enterprise inquiries
  window.open('mailto:enterprise@rinawarp.com?subject=Enterprise%20Inquiry&body=Hi%2C%0A%0AI%27m%20interested%20in%20the%20Enterprise%20Navigator%20plan%20for%20my%20organization.%0A%0APlease%20contact%20me%20to%20discuss%20our%20needs.%0A%0AThanks!', '_blank');
}

// Beta purchase functions
function purchaseBetaEarlybird() {
  gtag('event', 'begin_checkout', {
    currency: 'USD',
    value: 29.00,
    items: [{
      item_id: 'beta_earlybird',
      item_name: 'Early Bird Beta Access',
      price: 29.00,
      quantity: 1
    }]
  });
  
  window.location.href = STRIPE_CONFIG.paymentLinks.earlybird;
}

function purchaseBeta() {
  gtag('event', 'begin_checkout', {
    currency: 'USD',
    value: 39.00,
    items: [{
      item_id: 'beta_standard',
      item_name: 'Beta Access',
      price: 39.00,
      quantity: 1
    }]
  });
  
  window.location.href = STRIPE_CONFIG.paymentLinks.beta;
}

function purchaseBetaPremium() {
  gtag('event', 'begin_checkout', {
    currency: 'USD',
    value: 59.00,
    items: [{
      item_id: 'beta_premium', 
      item_name: 'Premium Beta Access',
      price: 59.00,
      quantity: 1
    }]
  });
  
  window.location.href = STRIPE_CONFIG.paymentLinks.premium;
}

// Success message helper
function showSuccess(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #00ff88, #00d4ff);
    color: white;
    padding: 20px;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0, 255, 136, 0.4);
    z-index: 10000;
    font-weight: bold;
    font-size: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(10px);
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.transform = 'translateX(500px)';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Stripe
  initStripe();
  
  // Setup event listeners for all buttons
  const buttonMappings = {
    'csp-safe-1753586469640-2': purchaseBetaEarlybird,
    'csp-safe-1753586469640-3': purchaseBeta,
    'csp-safe-1753586469640-4': purchaseBetaPremium,
    'csp-safe-1753586469640-5': purchasePersonal,
    'csp-safe-1753586469640-6': purchaseProfessional,
    'csp-safe-1753586469640-7': purchaseTeam,
    'csp-safe-1753586469640-8': purchaseFree,
    'csp-safe-1753586469640-9': purchaseEnterprise
  };
  
  // Attach event listeners
  Object.entries(buttonMappings).forEach(([handlerId, func]) => {
    const element = document.querySelector(`[data-handler-id="${handlerId}"]`);
    if (element) {
      element.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Add loading state
        const button = e.target;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Redirecting...';
        
        // Call the function
        try {
          func();
        } catch (error) {
          console.error('Payment error:', error);
          button.disabled = false;
          button.textContent = originalText;
          alert('Payment system error. Please try again or contact support.');
        }
      });
      
      console.log(`✅ Attached handler for ${handlerId}`);
    } else {
      console.warn(`⚠️ Button with handler ID ${handlerId} not found`);
    }
  });
  
  console.log('🚀 Direct checkout system initialized');
});
