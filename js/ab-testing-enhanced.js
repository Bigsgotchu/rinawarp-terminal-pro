/**
 * Enhanced A/B Testing System for RinaWarp Terminal
 * Tests headlines, pricing strategies, and conversion elements
 */

class EnhancedABTesting {
    constructor() {
        this.experiments = {
            // Hero headline variations
            heroHeadline: {
                enabled: true,
                variants: [
                    {
                        id: 'control',
                        weight: 25,
                        headline: 'Stop Waiting 3 Seconds for AI Help',
                        subtitle: 'Get instant coding solutions with 10x faster AI responses than ChatGPT'
                    },
                    {
                        id: 'speed_focus',
                        weight: 25,
                        headline: 'Get AI Answers in 300ms, Not 3 Seconds',
                        subtitle: 'RinaWarp Terminal delivers 10x faster AI responses than any competitor'
                    },
                    {
                        id: 'productivity_focus',
                        weight: 25,
                        headline: 'Save 5+ Hours Every Week with Ultra-Fast AI',
                        subtitle: 'Stop context-switching. Get instant coding help without leaving your terminal'
                    },
                    {
                        id: 'free_focus',
                        weight: 25,
                        headline: 'The Only Terminal with FREE Ultra-Fast AI',
                        subtitle: 'Get instant coding help forever. No credit card required, no limits on personal use'
                    }
                ]
            },

            // Pricing strategy variations
            pricingStrategy: {
                enabled: true,
                variants: [
                    {
                        id: 'control',
                        weight: 33,
                        strategy: 'monthly_annual',
                        showAnnualSavings: true,
                        emphasizeRoi: true
                    },
                    {
                        id: 'free_emphasis',
                        weight: 33,
                        strategy: 'free_first',
                        showAnnualSavings: true,
                        emphasizeFree: true
                    },
                    {
                        id: 'value_focus',
                        weight: 34,
                        strategy: 'value_heavy',
                        showAnnualSavings: true,
                        showComparison: true
                    }
                ]
            },

            // CTA button variations
            ctaButtons: {
                enabled: true,
                variants: [
                    {
                        id: 'control',
                        weight: 25,
                        primary: 'Start Free - No Credit Card',
                        secondary: 'Watch Demo (2 min)'
                    },
                    {
                        id: 'urgency',
                        weight: 25,
                        primary: 'Start Free Today - No Credit Card',
                        secondary: 'See 2-Min Demo'
                    },
                    {
                        id: 'benefit',
                        weight: 25,
                        primary: 'Get Ultra-Fast AI Free',
                        secondary: 'Watch Demo'
                    },
                    {
                        id: 'social_proof',
                        weight: 25,
                        primary: 'Join 1000+ Developers - Start Free',
                        secondary: 'Watch Demo (2 min)'
                    }
                ]
            },

            // Professional pricing variations
            professionalPricing: {
                enabled: true,
                variants: [
                    {
                        id: 'control',
                        weight: 50,
                        monthlyPrice: 29,
                        annualPrice: 20,
                        emphasis: 'speed'
                    },
                    {
                        id: 'lower_entry',
                        weight: 50,
                        monthlyPrice: 24,
                        annualPrice: 17,
                        emphasis: 'value'
                    }
                ]
            }
        };

        this.userExperiments = {};
        this.sessionId = this.generateSessionId();
        this.userId = this.getUserId();
        
        this.init();
    }

    init() {
        // Load existing experiment assignments
        this.loadExperimentAssignments();
        
        // Assign user to experiments if not already assigned
        this.assignUserToExperiments();
        
        // Apply experiment variations
        this.applyExperimentVariations();
        
        // Set up tracking
        this.setupTracking();
        
        console.log('🧪 A/B Testing initialized:', this.userExperiments);
    }

    generateSessionId() {
        return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    getUserId() {
        let userId = localStorage.getItem('rinawarp_user_id');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem('rinawarp_user_id', userId);
        }
        return userId;
    }

    loadExperimentAssignments() {
        const stored = localStorage.getItem('rinawarp_ab_experiments');
        if (stored) {
            try {
                this.userExperiments = JSON.parse(stored);
            } catch (e) {
                console.warn('Failed to load A/B experiment assignments:', e);
                this.userExperiments = {};
            }
        }
    }

    saveExperimentAssignments() {
        localStorage.setItem('rinawarp_ab_experiments', JSON.stringify(this.userExperiments));
    }

    assignUserToExperiments() {
        Object.keys(this.experiments).forEach(experimentName => {
            const experiment = this.experiments[experimentName];
            
            if (!experiment.enabled) return;
            
            // If user is already assigned to this experiment, skip
            if (this.userExperiments[experimentName]) return;
            
            // Assign user to variant based on weights
            const variant = this.selectVariant(experiment.variants);
            
            this.userExperiments[experimentName] = {
                variantId: variant.id,
                assignedAt: Date.now(),
                sessionId: this.sessionId
            };
        });
        
        this.saveExperimentAssignments();
    }

    selectVariant(variants) {
        const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const variant of variants) {
            random -= variant.weight;
            if (random <= 0) {
                return variant;
            }
        }
        
        return variants[0]; // Fallback
    }

    getVariant(experimentName) {
        const userExperiment = this.userExperiments[experimentName];
        if (!userExperiment) return null;
        
        const experiment = this.experiments[experimentName];
        if (!experiment || !experiment.enabled) return null;
        
        return experiment.variants.find(v => v.id === userExperiment.variantId);
    }

    applyExperimentVariations() {
        // Apply hero headline variation
        this.applyHeroHeadlineVariation();
        
        // Apply pricing strategy variation
        this.applyPricingStrategyVariation();
        
        // Apply CTA button variation
        this.applyCTAButtonVariation();
        
        // Apply professional pricing variation
        this.applyProfessionalPricingVariation();
        
        // Apply urgency elements based on experiment
        this.applyUrgencyElements();
    }

    applyHeroHeadlineVariation() {
        const variant = this.getVariant('heroHeadline');
        if (!variant) return;

        // Update headline and subtitle
        const heroTitle = document.querySelector('.hero h1');
        const heroSubtitle = document.querySelector('.hero .subtitle');
        
        if (heroTitle) {
            heroTitle.textContent = variant.headline;
        }
        
        if (heroSubtitle) {
            heroSubtitle.textContent = variant.subtitle;
        }

        // Track experiment exposure
        this.trackExperimentExposure('heroHeadline', variant.id);
    }

    applyPricingStrategyVariation() {
        const variant = this.getVariant('pricingStrategy');
        if (!variant) return;

        switch (variant.strategy) {
            case 'free_first':
                this.emphasizeFreeOption();
                break;
            case 'value_heavy':
                this.emphasizeValueProposition();
                break;
            case 'monthly_annual':
            default:
                // Control - already implemented
                break;
        }

        this.trackExperimentExposure('pricingStrategy', variant.id);
    }

    applyCTAButtonVariation() {
        const variant = this.getVariant('ctaButtons');
        if (!variant) return;

        // Update primary CTA buttons
        const primaryButtons = document.querySelectorAll('.btn-primary');
        primaryButtons.forEach(btn => {
            if (btn.textContent.includes('Start Free') || btn.textContent.includes('Download')) {
                btn.textContent = variant.primary;
            }
        });

        // Update secondary CTA buttons
        const secondaryButtons = document.querySelectorAll('.btn-secondary');
        secondaryButtons.forEach(btn => {
            if (btn.textContent.includes('Demo') || btn.textContent.includes('Learn More')) {
                btn.textContent = variant.secondary;
            }
        });

        this.trackExperimentExposure('ctaButtons', variant.id);
    }

    applyProfessionalPricingVariation() {
        const variant = this.getVariant('professionalPricing');
        if (!variant) return;

        // Update professional pricing
        const monthlyPriceElements = document.querySelectorAll('.monthly-price');
        const annualPriceElements = document.querySelectorAll('.annual-price');
        
        monthlyPriceElements.forEach(el => {
            const priceSpan = el.querySelector('span') || el;
            if (priceSpan.textContent.includes('$29')) {
                priceSpan.innerHTML = `$${variant.monthlyPrice}<span>/month</span>`;
            }
        });
        
        annualPriceElements.forEach(el => {
            const priceSpan = el.querySelector('span') || el;
            if (priceSpan.textContent.includes('$20')) {
                priceSpan.innerHTML = `$${variant.annualPrice}<span>/month</span>`;
            }
        });

        // Update savings calculation
        const savingsElements = document.querySelectorAll('.annual-subtitle');
        savingsElements.forEach(el => {
            const annualTotal = variant.annualPrice * 12;
            const monthlyTotal = variant.monthlyPrice * 12;
            const savings = monthlyTotal - annualTotal;
            if (el.textContent.includes('Save $')) {
                el.textContent = `Billed annually ($${annualTotal}/year) • Save $${savings}`;
            }
        });

        this.trackExperimentExposure('professionalPricing', variant.id);
    }

    emphasizeFreeOption() {
        // Move free option to be more prominent
        const freeCard = document.querySelector('.pricing-card:first-child');
        if (freeCard) {
            freeCard.style.order = '-1';
            freeCard.style.transform = 'scale(1.05)';
            freeCard.style.boxShadow = '0 10px 30px rgba(255, 20, 147, 0.3)';
        }
    }

    emphasizeValueProposition() {
        // Add value indicators to pricing cards
        const professionalCard = document.querySelector('.pricing-card.featured');
        if (professionalCard) {
            const valueIndicator = document.createElement('div');
            valueIndicator.className = 'value-banner';
            valueIndicator.innerHTML = '<strong>Best Value!</strong> Save $6,960/year in productivity';
            valueIndicator.style.cssText = `
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                padding: 8px 15px;
                border-radius: 15px;
                font-size: 0.9rem;
                margin-bottom: 15px;
                text-align: center;
                font-weight: bold;
            `;
            professionalCard.insertBefore(valueIndicator, professionalCard.firstChild);
        }
    }

    applyUrgencyElements() {
        // Add limited-time urgency (only for certain variants)
        const pricingVariant = this.getVariant('pricingStrategy');
        const ctaVariant = this.getVariant('ctaButtons');
        
        if (ctaVariant && ctaVariant.id === 'urgency') {
            this.addUrgencyBanner();
        }
        
        if (pricingVariant && pricingVariant.id === 'value_focus') {
            this.addTimeLimitedOffer();
        }
    }

    addUrgencyBanner() {
        const urgencyBanner = document.createElement('div');
        urgencyBanner.className = 'urgency-banner';
        urgencyBanner.innerHTML = `
            <div class="container">
                ⚡ Limited Time: Get Professional for $20/month (normally $29) - Ends Soon!
            </div>
        `;
        document.body.insertBefore(urgencyBanner, document.body.firstChild);
    }

    addTimeLimitedOffer() {
        const professionalCard = document.querySelector('.pricing-card.featured');
        if (professionalCard) {
            const offerBadge = document.createElement('div');
            offerBadge.className = 'limited-offer';
            offerBadge.innerHTML = '⏰ Limited Time: 30% Off First Year!';
            offerBadge.style.cssText = `
                background: linear-gradient(135deg, #ff6b7d, #ff5722);
                color: white;
                padding: 6px 12px;
                border-radius: 12px;
                font-size: 0.8rem;
                margin-bottom: 10px;
                text-align: center;
                font-weight: bold;
                animation: pulse 2s infinite;
            `;
            professionalCard.insertBefore(offerBadge, professionalCard.querySelector('.plan-name'));
        }
    }

    setupTracking() {
        // Track page view with experiment variants
        this.trackEvent('page_view', {
            experiments: this.userExperiments,
            url: window.location.href,
            referrer: document.referrer
        });

        // Track CTA clicks
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn-primary, .btn-secondary')) {
                this.trackEvent('cta_click', {
                    buttonText: e.target.textContent.trim(),
                    buttonClass: e.target.className,
                    experiments: this.userExperiments
                });
            }
        });

        // Track scroll depth milestones
        this.setupScrollTracking();
    }

    setupScrollTracking() {
        let maxScroll = 0;
        const milestones = [25, 50, 75, 90];
        const reached = new Set();

        window.addEventListener('scroll', () => {
            const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
            maxScroll = Math.max(maxScroll, scrollPercent);

            milestones.forEach(milestone => {
                if (scrollPercent >= milestone && !reached.has(milestone)) {
                    reached.add(milestone);
                    this.trackEvent('scroll_milestone', {
                        milestone,
                        experiments: this.userExperiments
                    });
                }
            });
        });
    }

    trackExperimentExposure(experimentName, variantId) {
        this.trackEvent('experiment_exposure', {
            experiment: experimentName,
            variant: variantId,
            userId: this.userId,
            sessionId: this.sessionId
        });
    }

    trackConversion(conversionType, data = {}) {
        this.trackEvent('conversion', {
            type: conversionType,
            experiments: this.userExperiments,
            ...data
        });
    }

    trackEvent(eventName, data) {
        // Send to analytics service
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                custom_parameter_experiments: JSON.stringify(this.userExperiments),
                ...data
            });
        }

        // Log for debugging
        console.log(`🔬 A/B Test Event: ${eventName}`, {
            userId: this.userId,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            ...data
        });

        // Store locally for analysis
        this.storeEventLocally(eventName, data);
    }

    storeEventLocally(eventName, data) {
        const events = JSON.parse(localStorage.getItem('rinawarp_ab_events') || '[]');
        events.push({
            event: eventName,
            timestamp: Date.now(),
            data
        });
        
        // Keep only last 100 events
        if (events.length > 100) {
            events.splice(0, events.length - 100);
        }
        
        localStorage.setItem('rinawarp_ab_events', JSON.stringify(events));
    }

    // Public API for tracking conversions
    trackGoal(goalName, data = {}) {
        this.trackConversion(goalName, data);
    }

    // Get current experiment assignments (for debugging)
    getExperiments() {
        return this.userExperiments;
    }

    // Force reassign to experiments (for testing)
    resetExperiments() {
        localStorage.removeItem('rinawarp_ab_experiments');
        localStorage.removeItem('rinawarp_ab_events');
        this.userExperiments = {};
        this.assignUserToExperiments();
        this.applyExperimentVariations();
    }
}

// Initialize A/B testing when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.abTesting = new EnhancedABTesting();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedABTesting;
}
