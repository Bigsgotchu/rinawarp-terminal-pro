/**
 * RinaWarp Conversion Analysis Tool
 * Captures key analytics events and user interactions to identify conversion barriers
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        trackingId: 'G-G424CV5GGT',  // Replace with your GA4 tracking ID
        debugMode: true
    };

    // Capture key events for conversion analysis
    function captureConversionEvents() {
        document.addEventListener('DOMContentLoaded', () => {
            // Track clicks on pricing buttons
            const pricingButtons = document.querySelectorAll('.plan-button');
            pricingButtons.forEach(button => {
                button.addEventListener('click', () => {
                    gtag('event', 'button_click', {
                        event_category: 'engagement',
                        event_label: 'Pricing Button',
                        value: 1
                    });
                    console.log('📊 Pricing button clicked!');
                });
            });

            // Track checkout starts
            const checkoutButtons = document.querySelectorAll('.checkout-button');
            checkoutButtons.forEach(button => {
                button.addEventListener('click', () => {
                    gtag('event', 'begin_checkout', {
                        currency: 'USD',
                        value: 29.99,
                        items: [{
                            item_id: 'plan_pro',
                            item_name: 'Pro Plan'
                        }]
                    });
                });
            });

            // Track conversions
            const purchaseButtons = document.querySelectorAll('.purchase-button');
            purchaseButtons.forEach(button => {
                button.addEventListener('click', () => {
                    gtag('event', 'purchase', {
                        currency: 'USD',
                        transaction_id: `TXN${Math.round(Math.random() * 10000)}`,
                        value: 29.99,
                        items: [{
                            item_id: 'plan_pro',
                            item_name: 'Pro Plan'
                        }]
                    });
                });
            });
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        if (gtag) {
            console.log('✅ GA4 is configured correctly for conversion analysis.');
        } else {
            console.error('❌ GA4 is not configured. Please check setup.');
        }
        captureConversionEvents();
    }
})();

