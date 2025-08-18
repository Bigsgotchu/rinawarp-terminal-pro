// DEPRECATED: Google Analytics 4 Direct Initialization
// This file is now DISABLED because we're using Google Tag Manager (GTM-5LDNPV8Z)
// GTM will handle GA4 configuration and initialization

/*
// Google Analytics 4 Initialization - CSP Compliant
// This file replaces inline gtag initialization scripts

// Initialize dataLayer
window.dataLayer = window.dataLayer || [];

// Define gtag function
function gtag() {
    dataLayer.push(arguments);
}

// Set global gtag function
window.gtag = gtag;

// Initialize GA4 with current timestamp
gtag('js', new Date());

// Configure GA4 with your measurement ID
// This ID should match the one in your gtag script src
const GA4_MEASUREMENT_ID = 'G-SZK23HMCVP';
gtag('config', GA4_MEASUREMENT_ID, {
    // Enhanced measurement features
    'send_page_view': true,
    'anonymize_ip': true,
    'link_attribution': true,
    'allow_display_features': true,
    
    // Custom dimensions can be added here
    'custom_map.dimension1': 'user_type',
    'custom_map.dimension2': 'plan_type'
});

// Export for use in other scripts
window.GA4_MEASUREMENT_ID = GA4_MEASUREMENT_ID;

// Log initialization for debugging
console.log('✅ GA4 initialized with ID:', GA4_MEASUREMENT_ID);
*/

// GTM will handle all analytics initialization
console.log('📊 Analytics handled by GTM container: GTM-5LDNPV8Z');
