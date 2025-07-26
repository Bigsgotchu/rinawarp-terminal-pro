/**
 * Unified Checkout Frontend Script
 * Handles all pricing plan purchases and redirects to rinawarptech.com
 */

document.addEventListener('DOMContentLoaded', function() {
    // Add click handlers to all CTA buttons
    const ctaButtons = document.querySelectorAll('.cta-button[data-plan]');
    
    ctaButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            const plan = this.getAttribute('data-plan');
            const planNames = {
                'basic': 'Basic',
                'pro': 'Professional', 
                'enterprise': 'Enterprise'
            };
            
            // Show loading state
            const originalText = this.textContent;
            this.textContent = 'Redirecting...';
            this.disabled = true;
            
            // Add some visual feedback
            this.style.opacity = '0.7';
            
            // Track the click for analytics
            if (typeof gtag !== 'undefined') {
                gtag('event', 'pricing_plan_click', {
                    'plan': plan,
                    'plan_name': planNames[plan] || plan,
                    'source': 'pricing_page'
                });
            }
            
            // Redirect to rinawarptech.com with plan parameter
            setTimeout(() => {
                window.location.href = `https://rinawarptech.com/?plan=${plan}&from=pricing`;
            }, 1000);
        });
    });
    
    // Add hover effects for better UX
    ctaButtons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 10px 20px rgba(0, 206, 209, 0.3)';
        });
        
        button.addEventListener('mouseleave', function() {
            if (!this.disabled) {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = 'none';
            }
        });
    });
    
    // Optional: Add keyboard navigation support
    ctaButtons.forEach(button => {
        button.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
    
    // Log that the pricing page loaded successfully
    console.log('🌊 RinaWarp Pricing Page Loaded Successfully');
    
    // Track page view for analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', 'page_view', {
            'page_title': 'Pricing Plans',
            'page_location': window.location.href,
            'source': 'rinawarp_terminal'
        });
    }
});

// Export for potential use in other scripts
window.RinaWarpCheckout = {
    redirectToPlan: function(plan) {
        window.location.href = `https://rinawarptech.com/?plan=${plan}&from=pricing`;
    },
    
    trackPlanInterest: function(plan) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'pricing_plan_interest', {
                'plan': plan,
                'source': 'pricing_page'
            });
        }
    }
};
