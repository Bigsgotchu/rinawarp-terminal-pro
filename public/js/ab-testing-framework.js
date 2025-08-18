/**
 * 🧪 RinaWarp A/B Testing Framework
 * Advanced conversion testing with statistical significance tracking
 * Integrates with existing conversion analytics
 */

class RinaWarpABTesting {
    constructor(options = {}) {
        this.debug = options.debug || false;
        this.userId = this.getUserId();
        this.sessionId = this.getSessionId();
        this.experiments = new Map();
        this.analytics = options.analytics || null;
        
        // Test configurations
        this.testConfigs = {
            pricing_headline: {
                name: 'Pricing Page Headline Test',
                variants: [
                    { id: 'control', weight: 34, content: 'Simple, Transparent Pricing' },
                    { id: 'power', weight: 33, content: 'Choose Your Power Level' },
                    { id: 'journey', weight: 33, content: 'Start Your AI Journey' }
                ],
                element: '.header h1',
                metric: 'plan_selection',
                minimumSampleSize: 100
            },
            
            cta_button_text: {
                name: 'CTA Button Copy Test',
                variants: [
                    { id: 'control', weight: 25, content: 'Get Started' },
                    { id: 'trial', weight: 25, content: 'Start My Free Trial' },
                    { id: 'power', weight: 25, content: 'Unlock AI Powers' },
                    { id: 'transform', weight: 25, content: 'Transform My Workflow' }
                ],
                element: '.cta-button:not([data-plan="free"])',
                metric: 'plan_selection',
                minimumSampleSize: 150
            },
            
            professional_price: {
                name: 'Professional Plan Pricing Test',
                variants: [
                    { id: 'control', weight: 50, content: '$25', price: 25 },
                    { id: 'premium', weight: 50, content: '$29', price: 29 }
                ],
                element: '.professional-card .price-amount, .pricing-card[data-plan="professional"] .price-amount',
                metric: 'professional_plan_selection',
                minimumSampleSize: 200
            },
            
            trust_signals_position: {
                name: 'Trust Signals Position Test',
                variants: [
                    { id: 'control', weight: 50, position: 'bottom' },
                    { id: 'top', weight: 50, position: 'top' }
                ],
                element: '.trust-signals',
                metric: 'plan_selection',
                minimumSampleSize: 120
            }
        };
        
        this.init();
    }
    
    /**
     * Initialize A/B testing system
     */
    init() {
        if (this.debug) {
            console.log('🧪 RinaWarp A/B Testing Framework initialized');
        }
        
        // Wait for DOM and analytics to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.runExperiments());
        } else {
            this.runExperiments();
        }
        
        // Set up experiment tracking
        this.setupExperimentTracking();
        
        // Clean up old experiments
        this.cleanupExpiredExperiments();
    }
    
    /**
     * Run all active experiments
     */
    runExperiments() {
        // Only run on pricing pages
        if (!this.isPricingPage()) {
            return;
        }
        
        Object.keys(this.testConfigs).forEach(experimentId => {
            const config = this.testConfigs[experimentId];
            
            // Check if user should see this experiment
            if (this.shouldRunExperiment(experimentId, config)) {
                this.runExperiment(experimentId, config);
            }
        });
    }
    
    /**
     * Determine if current page is a pricing page
     */
    isPricingPage() {
        const path = window.location.pathname.toLowerCase();
        return path.includes('pricing') || path === '/' || path === '/index.html';
    }
    
    /**
     * Check if user should participate in experiment
     */
    shouldRunExperiment(experimentId, config) {
        // Check if user is already in this experiment
        const existingVariant = this.getUserExperimentVariant(experimentId);
        if (existingVariant) {
            return true; // Continue with existing variant
        }
        
        // Check if experiment is active (you can add date-based logic here)
        return this.isExperimentActive(experimentId);
    }
    
    /**
     * Check if experiment is currently active
     */
    isExperimentActive(experimentId) {
        // You can add logic here to enable/disable experiments
        // For now, all experiments are active
        return true;
    }
    
    /**
     * Run a specific experiment
     */
    runExperiment(experimentId, config) {
        let variant = this.getUserExperimentVariant(experimentId);
        
        // If user not in experiment, assign variant
        if (!variant) {
            variant = this.assignVariant(experimentId, config);
            this.saveUserExperimentVariant(experimentId, variant);
        }
        
        // Apply the variant
        this.applyVariant(experimentId, config, variant);
        
        // Track experiment exposure
        this.trackExperimentExposure(experimentId, variant);
        
        if (this.debug) {
            console.log(`🧪 Experiment ${experimentId}: ${variant.id}`);
        }
    }
    
    /**
     * Assign user to a variant based on weights
     */
    assignVariant(experimentId, config) {
        const hash = this.hashUserId(experimentId);
        const random = (hash % 10000) / 10000; // Convert to 0-1 range
        
        let cumulativeWeight = 0;
        for (const variant of config.variants) {
            cumulativeWeight += variant.weight;
            if (random * 100 <= cumulativeWeight) {
                return variant;
            }
        }
        
        // Fallback to control
        return config.variants[0];
    }
    
    /**
     * Apply variant changes to the page
     */
    applyVariant(experimentId, config, variant) {
        try {
            switch (experimentId) {
                case 'pricing_headline':
                    this.applyHeadlineVariant(config, variant);
                    break;
                    
                case 'cta_button_text':
                    this.applyCTAVariant(config, variant);
                    break;
                    
                case 'professional_price':
                    this.applyPriceVariant(config, variant);
                    break;
                    
                case 'trust_signals_position':
                    this.applyTrustSignalsVariant(config, variant);
                    break;
            }
        } catch (error) {
            console.error(`❌ Error applying variant for ${experimentId}:`, error);
        }
    }
    
    /**
     * Apply headline variant
     */
    applyHeadlineVariant(config, variant) {
        const elements = document.querySelectorAll(config.element);
        elements.forEach(element => {
            if (element) {
                element.textContent = variant.content;
            }
        });
    }
    
    /**
     * Apply CTA button variant
     */
    applyCTAVariant(config, variant) {
        const elements = document.querySelectorAll(config.element);
        elements.forEach(element => {
            if (element) {
                // Store original text for restoration if needed
                element.setAttribute('data-original-text', element.textContent);
                element.textContent = variant.content;
            }
        });
    }
    
    /**
     * Apply pricing variant
     */
    applyPriceVariant(config, variant) {
        const elements = document.querySelectorAll(config.element);
        elements.forEach(element => {
            if (element) {
                element.textContent = variant.content;
                // Also update data attributes if they exist
                const card = element.closest('.pricing-card');
                if (card) {
                    card.setAttribute('data-test-price', variant.price);
                }
            }
        });
    }
    
    /**
     * Apply trust signals position variant
     */
    applyTrustSignalsVariant(config, variant) {
        const trustSignals = document.querySelector(config.element);
        if (!trustSignals) return;
        
        if (variant.position === 'top') {
            // Move trust signals to top of pricing section
            const pricingSection = document.querySelector('.pricing-grid');
            if (pricingSection && pricingSection.parentNode) {
                const clonedTrustSignals = trustSignals.cloneNode(true);
                pricingSection.parentNode.insertBefore(clonedTrustSignals, pricingSection);
                trustSignals.style.display = 'none';
            }
        }
        // Control variant keeps trust signals at bottom (no change needed)
    }
    
    /**
     * Track experiment exposure for analytics
     */
    trackExperimentExposure(experimentId, variant) {
        // Track with Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'experiment_exposure', {
                event_category: 'ab_testing',
                experiment_id: experimentId,
                variant_id: variant.id,
                user_id: this.userId,
                session_id: this.sessionId
            });
        }
        
        // Track with internal analytics if available
        if (this.analytics && this.analytics.trackEvent) {
            this.analytics.trackEvent('experiment_exposure', {
                experiment_id: experimentId,
                variant_id: variant.id,
                category: 'ab_testing'
            });
        }
    }
    
    /**
     * Track experiment conversion
     */
    trackConversion(metric, data = {}) {
        // Get all active experiments for this user
        const activeExperiments = this.getActiveUserExperiments();
        
        activeExperiments.forEach(({ experimentId, variant }) => {
            const config = this.testConfigs[experimentId];
            
            // Check if this conversion matches the experiment's target metric
            if (config && config.metric === metric) {
                // Track conversion with Google Analytics
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'experiment_conversion', {
                        event_category: 'ab_testing',
                        experiment_id: experimentId,
                        variant_id: variant.id,
                        metric: metric,
                        value: data.value || 1,
                        user_id: this.userId,
                        session_id: this.sessionId,
                        ...data
                    });
                }
                
                // Track with internal analytics
                if (this.analytics && this.analytics.trackEvent) {
                    this.analytics.trackEvent('experiment_conversion', {
                        experiment_id: experimentId,
                        variant_id: variant.id,
                        metric: metric,
                        category: 'ab_testing',
                        value: data.value || 1,
                        ...data
                    });
                }
                
                if (this.debug) {
                    console.log(`🎯 Conversion tracked for experiment ${experimentId}, variant ${variant.id}`);
                }
            }
        });
    }
    
    /**
     * Setup automatic conversion tracking
     */
    setupExperimentTracking() {
        // Track plan selections
        document.addEventListener('click', (e) => {
            const button = e.target;
            
            // Track plan selection conversions
            if (button.classList.contains('cta-button') || button.classList.contains('buy-button')) {
                const plan = button.dataset.plan || this.extractPlanFromButton(button);
                
                // General plan selection metric
                this.trackConversion('plan_selection', {
                    plan: plan,
                    button_text: button.textContent.trim()
                });
                
                // Specific plan metrics
                if (plan === 'professional') {
                    this.trackConversion('professional_plan_selection', {
                        plan: plan,
                        button_text: button.textContent.trim()
                    });
                }
            }
        });
        
        // Track page engagement metrics
        let maxScrollDepth = 0;
        window.addEventListener('scroll', () => {
            const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
            
            if (scrollPercent > maxScrollDepth && scrollPercent >= 75) {
                maxScrollDepth = scrollPercent;
                this.trackConversion('deep_engagement', {
                    scroll_depth: scrollPercent
                });
            }
        });
    }
    
    /**
     * Extract plan name from button context
     */
    extractPlanFromButton(button) {
        // Try to find plan from parent card
        const card = button.closest('.pricing-card');
        if (card) {
            const planName = card.querySelector('.plan-name');
            if (planName) {
                return planName.textContent.toLowerCase().replace(/\s+/g, '_');
            }
        }
        
        // Fallback to button text analysis
        const text = button.textContent.toLowerCase();
        if (text.includes('professional') || text.includes('pro')) return 'professional';
        if (text.includes('personal')) return 'personal';
        if (text.includes('team')) return 'team';
        if (text.includes('free')) return 'free';
        
        return 'unknown';
    }
    
    /**
     * Get user's current active experiments
     */
    getActiveUserExperiments() {
        const experiments = [];
        Object.keys(this.testConfigs).forEach(experimentId => {
            const variant = this.getUserExperimentVariant(experimentId);
            if (variant) {
                experiments.push({ experimentId, variant });
            }
        });
        return experiments;
    }
    
    /**
     * Get user's variant for specific experiment
     */
    getUserExperimentVariant(experimentId) {
        const key = `ab_test_${experimentId}`;
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return null;
            }
        }
        return null;
    }
    
    /**
     * Save user's variant assignment
     */
    saveUserExperimentVariant(experimentId, variant) {
        const key = `ab_test_${experimentId}`;
        const data = {
            ...variant,
            assigned_at: Date.now(),
            experiment_id: experimentId
        };
        localStorage.setItem(key, JSON.stringify(data));
    }
    
    /**
     * Generate consistent hash from user ID for experiment assignment
     */
    hashUserId(experimentId) {
        const input = this.userId + experimentId;
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    
    /**
     * Get or create user ID
     */
    getUserId() {
        let userId = localStorage.getItem('ab_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('ab_user_id', userId);
        }
        return userId;
    }
    
    /**
     * Get session ID
     */
    getSessionId() {
        let sessionId = sessionStorage.getItem('ab_session_id');
        if (!sessionId) {
            sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('ab_session_id', sessionId);
        }
        return sessionId;
    }
    
    /**
     * Clean up expired experiments
     */
    cleanupExpiredExperiments() {
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        const now = Date.now();
        
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('ab_test_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data.assigned_at && (now - data.assigned_at) > maxAge) {
                        localStorage.removeItem(key);
                    }
                } catch (e) {
                    // Remove corrupted data
                    localStorage.removeItem(key);
                }
            }
        });
    }
    
    /**
     * Get experiment results (for admin/debugging)
     */
    getExperimentResults() {
        if (!this.debug) return;
        
        const results = {};
        Object.keys(this.testConfigs).forEach(experimentId => {
            const variant = this.getUserExperimentVariant(experimentId);
            if (variant) {
                results[experimentId] = {
                    variant_id: variant.id,
                    variant_content: variant.content || variant.position,
                    assigned_at: new Date(variant.assigned_at).toLocaleString()
                };
            }
        });
        
        console.table(results);
        return results;
    }
}

// Global function to track conversions from external scripts
window.trackABConversion = function(metric, data = {}) {
    if (window.rinaWarpABTesting) {
        window.rinaWarpABTesting.trackConversion(metric, data);
    }
};

// Export for use
window.RinaWarpABTesting = RinaWarpABTesting;
