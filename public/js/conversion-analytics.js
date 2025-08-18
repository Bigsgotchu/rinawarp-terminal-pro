/**
 * 🎯 CONVERSION ANALYTICS - REAL USER BEHAVIOR TRACKING
 * This system captures actual user interactions and conversion events
 */

class ConversionAnalytics {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.userId = this.getUserId();
        this.sessionStartTime = Date.now();
        this.events = [];
        this.currentFunnelStep = 'page_view';
        this.maxScrollDepth = 0;
        
        this.init();
    }
    
    init() {
        console.log('🎯 Conversion Analytics initialized');
        
        // Track initial page view
        this.trackEvent('page_view', {
            page: window.location.pathname,
            url: window.location.href,
            referrer: document.referrer || 'direct',
            timestamp: Date.now()
        });
        
        // Set up automatic tracking
        this.setupEventListeners();
        this.trackUserEngagement();
        this.setupFunnelTracking();
        
        // Send data periodically
        setInterval(() => this.sendBatch(), 30000); // Every 30 seconds
        window.addEventListener('beforeunload', () => this.sendBatch());
    }
    
    /**
     * Generate unique session ID
     */
    generateSessionId() {
        const stored = sessionStorage.getItem('conversion_session_id');
        if (stored) return stored;
        
        const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('conversion_session_id', sessionId);
        return sessionId;
    }
    
    /**
     * Get or create user ID
     */
    getUserId() {
        const stored = localStorage.getItem('conversion_user_id');
        if (stored) return stored;
        
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('conversion_user_id', userId);
        return userId;
    }
    
    /**
     * Track conversion events
     */
    trackEvent(eventName, data = {}) {
        const event = {
            id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            sessionId: this.sessionId,
            userId: this.userId,
            eventName,
            timestamp: Date.now(),
            url: window.location.href,
            path: window.location.pathname,
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`,
            ...data
        };
        
        this.events.push(event);
        
        // Also send to Google Analytics if available
        this.sendToGA4(eventName, data);
        
        console.log('📊 Event tracked:', eventName, data);
        
        // Send critical events immediately
        if (['checkout_initiated', 'payment_success', 'signup', 'trial_start'].includes(eventName)) {
            this.sendBatch();
        }
    }
    
    /**
     * Send event to Google Analytics 4
     */
    sendToGA4(eventName, data) {
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                event_category: data.category || 'conversion',
                event_label: data.label || '',
                value: data.value || 0,
                currency: 'USD',
                custom_parameters: {
                    session_id: this.sessionId,
                    user_id: this.userId,
                    funnel_step: this.currentFunnelStep,
                    ...data
                }
            });
        }
    }
    
    /**
     * Set up automatic event listeners
     */
    setupEventListeners() {
        // Track button clicks
        document.addEventListener('click', (e) => {
            const button = e.target;
            
            // Pricing plan clicks
            if (button.dataset.plan || button.classList.contains('buy-button') || button.classList.contains('cta-button')) {
                const plan = button.dataset.plan || this.extractPlanFromButton(button);
                this.trackEvent('plan_click', {
                    category: 'funnel',
                    plan: plan,
                    buttonText: button.textContent.trim(),
                    location: this.getElementLocation(button)
                });
                this.updateFunnelStep('plan_selection');
            }
            
            // Download button clicks
            if (button.textContent.includes('Download') || button.textContent.includes('Start Free') || button.href?.includes('download')) {
                this.trackEvent('download_click', {
                    category: 'conversion',
                    buttonText: button.textContent.trim(),
                    location: this.getElementLocation(button)
                });
                this.updateFunnelStep('download_intent');
            }
            
            // Demo button clicks
            if (button.classList.contains('demo-button') || button.textContent.includes('Demo')) {
                this.trackEvent('demo_click', {
                    category: 'engagement',
                    demoType: this.getDemoType(button),
                    location: this.getElementLocation(button)
                });
            }
            
            // External links
            if (button.href && !button.href.includes(window.location.hostname)) {
                this.trackEvent('external_link_click', {
                    category: 'engagement',
                    url: button.href,
                    linkText: button.textContent.trim()
                });
            }
        });
        
        // Track form interactions
        document.addEventListener('input', (e) => {
            if (e.target.type === 'email') {
                this.trackEvent('email_input', {
                    category: 'funnel',
                    fieldId: e.target.id,
                    hasValue: e.target.value.length > 0
                });
                this.updateFunnelStep('email_capture');
            }
        });
        
        // Track form submissions
        document.addEventListener('submit', (e) => {
            const form = e.target;
            this.trackEvent('form_submit', {
                category: 'conversion',
                formId: form.id || 'unnamed_form',
                formAction: form.action || 'none',
                fieldCount: form.querySelectorAll('input, select, textarea').length
            });
        });
    }
    
    /**
     * Track user engagement metrics
     */
    trackUserEngagement() {
        // Scroll depth tracking
        window.addEventListener('scroll', () => {
            const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
            
            if (scrollPercent > this.maxScrollDepth && scrollPercent % 25 === 0) {
                this.maxScrollDepth = scrollPercent;
                this.trackEvent('scroll_depth', {
                    category: 'engagement',
                    scrollPercent: scrollPercent,
                    page: window.location.pathname
                });
                
                // Update funnel based on scroll depth
                if (scrollPercent >= 75) {
                    this.updateFunnelStep('high_engagement');
                } else if (scrollPercent >= 50) {
                    this.updateFunnelStep('medium_engagement');
                }
            }
        });
        
        // Time on page tracking
        setInterval(() => {
            const timeOnPage = Date.now() - this.sessionStartTime;
            const timeInMinutes = Math.floor(timeOnPage / 60000);
            
            // Track engagement milestones
            if (timeInMinutes > 0 && timeInMinutes % 1 === 0) { // Every minute
                this.trackEvent('time_milestone', {
                    category: 'engagement',
                    timeOnPage: Math.floor(timeOnPage / 1000),
                    minutes: timeInMinutes
                });
                
                // Update funnel for engaged users
                if (timeInMinutes >= 2) {
                    this.updateFunnelStep('engaged_user');
                }
            }
        }, 60000);
        
        // Page visibility tracking
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackEvent('page_hidden', {
                    category: 'engagement',
                    timeVisible: Date.now() - this.sessionStartTime
                });
            } else {
                this.trackEvent('page_visible', {
                    category: 'engagement',
                    returnedAt: Date.now()
                });
            }
        });
    }
    
    /**
     * Set up conversion funnel tracking
     */
    setupFunnelTracking() {
        // Pricing page specific tracking
        if (window.location.pathname.includes('pricing')) {
            this.updateFunnelStep('pricing_view');
            this.trackPricingPageBehavior();
        }
        
        // Checkout page specific tracking
        if (window.location.pathname.includes('checkout') || window.location.pathname.includes('payment')) {
            this.updateFunnelStep('checkout_start');
        }
        
        // Success page tracking
        if (window.location.pathname.includes('success')) {
            this.updateFunnelStep('conversion_complete');
            this.trackConversionSuccess();
        }
    }
    
    /**
     * Track pricing page specific behavior
     */
    trackPricingPageBehavior() {
        // Track which pricing cards are viewed
        const pricingCards = document.querySelectorAll('.pricing-card, [data-plan]');
        
        pricingCards.forEach((card, index) => {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const plan = card.dataset.plan || this.extractPlanFromElement(card);
                        this.trackEvent('pricing_card_view', {
                            category: 'funnel',
                            plan: plan,
                            cardPosition: index + 1,
                            totalCards: pricingCards.length
                        });
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });
            
            observer.observe(card);
        });
        
        // Track time spent comparing plans
        setTimeout(() => {
            this.trackEvent('pricing_comparison', {
                category: 'funnel',
                timeOnPricing: Date.now() - this.sessionStartTime,
                totalCards: pricingCards.length
            });
        }, 30000); // After 30 seconds
    }
    
    /**
     * Track successful conversions
     */
    trackConversionSuccess() {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        const plan = urlParams.get('plan');
        
        if (sessionId) {
            this.trackEvent('payment_success', {
                category: 'conversion',
                checkoutSessionId: sessionId,
                plan: plan || 'unknown',
                conversionValue: this.getConversionValue(plan)
            });
            
            // Track the complete conversion funnel
            this.trackEvent('conversion_funnel_complete', {
                category: 'funnel',
                totalTime: Date.now() - this.sessionStartTime,
                plan: plan,
                funnelSteps: this.getFunnelSteps()
            });
        }
    }
    
    /**
     * Update current funnel step
     */
    updateFunnelStep(step) {
        if (this.currentFunnelStep !== step) {
            this.trackEvent('funnel_step_change', {
                category: 'funnel',
                fromStep: this.currentFunnelStep,
                toStep: step,
                stepDuration: Date.now() - this.sessionStartTime
            });
            
            this.currentFunnelStep = step;
        }
    }
    
    /**
     * Send batch of events to backend
     */
    async sendBatch() {
        if (this.events.length === 0) return;
        
        const batch = {
            sessionId: this.sessionId,
            userId: this.userId,
            events: [...this.events],
            metadata: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                screenResolution: `${screen.width}x${screen.height}`,
                timestamp: Date.now(),
                currentFunnelStep: this.currentFunnelStep,
                maxScrollDepth: this.maxScrollDepth,
                sessionDuration: Date.now() - this.sessionStartTime
            }
        };
        
        try {
            // Send to your analytics endpoint
            await fetch('/api/analytics/conversion-batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(batch)
            });
            
            // Clear sent events
            this.events = [];
            console.log('📊 Analytics batch sent successfully');
            
        } catch (error) {
            console.warn('⚠️ Analytics batch failed:', error);
            
            // Keep events for retry but limit to prevent memory issues
            if (this.events.length > 100) {
                this.events = this.events.slice(-50);
            }
        }
    }
    
    /**
     * Helper methods
     */
    extractPlanFromButton(button) {
        const text = button.textContent.toLowerCase();
        if (text.includes('personal') || text.includes('basic')) return 'personal';
        if (text.includes('professional') || text.includes('pro')) return 'professional';  
        if (text.includes('team') || text.includes('enterprise')) return 'team';
        return 'unknown';
    }
    
    extractPlanFromElement(element) {
        const text = element.textContent.toLowerCase();
        if (text.includes('personal') || text.includes('$15')) return 'personal';
        if (text.includes('professional') || text.includes('$25')) return 'professional';
        if (text.includes('team') || text.includes('$35')) return 'team';
        return 'unknown';
    }
    
    getElementLocation(element) {
        const rect = element.getBoundingClientRect();
        return {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        };
    }
    
    getDemoType(button) {
        const text = button.textContent.toLowerCase();
        if (text.includes('ai')) return 'ai_demo';
        if (text.includes('voice')) return 'voice_demo';
        if (text.includes('theme')) return 'theme_demo';
        return 'general_demo';
    }
    
    getConversionValue(plan) {
        const values = {
            personal: 15,
            professional: 25,
            team: 35
        };
        return values[plan] || 0;
    }
    
    getFunnelSteps() {
        return this.events
            .filter(e => e.eventName === 'funnel_step_change')
            .map(e => ({
                step: e.toStep,
                timestamp: e.timestamp,
                duration: e.stepDuration
            }));
    }
    
    /**
     * Get conversion metrics for debugging
     */
    getMetrics() {
        const pageViews = this.events.filter(e => e.eventName === 'page_view').length;
        const planClicks = this.events.filter(e => e.eventName === 'plan_click').length;
        const checkoutStarts = this.events.filter(e => e.eventName === 'checkout_initiated').length;
        const conversions = this.events.filter(e => e.eventName === 'payment_success').length;
        
        return {
            sessionId: this.sessionId,
            userId: this.userId,
            currentFunnelStep: this.currentFunnelStep,
            sessionDuration: Math.floor((Date.now() - this.sessionStartTime) / 1000),
            maxScrollDepth: this.maxScrollDepth,
            eventCount: this.events.length,
            pageViews,
            planClicks,
            checkoutStarts,
            conversions,
            conversionRate: pageViews > 0 ? ((conversions / pageViews) * 100).toFixed(2) : 0
        };
    }
}

// Initialize conversion analytics
const conversionAnalytics = new ConversionAnalytics();

// Export for global access
window.ConversionAnalytics = conversionAnalytics;
window.trackConversion = (eventName, data) => conversionAnalytics.trackEvent(eventName, data);

console.log('✅ Conversion Analytics loaded successfully');
