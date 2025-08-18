/**
 * 📱 RinaWarp Mobile CTA Optimizer
 * 
 * Features:
 * - Sticky mobile CTAs with smart show/hide logic
 * - Mobile-specific urgency elements
 * - One-tap checkout optimization
 * - Mobile-friendly interaction tracking
 * - Progressive engagement hints
 */

class RinaWarpMobileCTAOptimizer {
    constructor(options = {}) {
        this.options = {
            debug: options.debug || false,
            stickyThreshold: options.stickyThreshold || 300,
            urgencyEnabled: options.urgencyEnabled !== false,
            trackingEnabled: options.trackingEnabled !== false,
            ...options
        };

        this.state = {
            isMobile: false,
            selectedPlan: null,
            stickyVisible: false,
            scrolledPastPlans: false,
            urgencyShown: false
        };

        this.elements = {};
        this.observers = [];
        this.timers = [];

        this.init();
    }

    /**
     * Initialize the mobile CTA optimizer
     */
    init() {
        this.log('🚀 Initializing Mobile CTA Optimizer');
        
        // Check if we're on mobile
        this.checkMobileDevice();
        
        if (!this.state.isMobile) {
            this.log('📱 Not a mobile device, skipping mobile optimizations');
            return;
        }

        // Setup DOM elements
        this.createStickyMobileCTA();
        
        // Setup observers and listeners
        this.setupScrollTracking();
        this.setupPlanSelectionTracking();
        this.setupUrgencyElements();
        this.setupMobileEnhancements();
        
        this.log('✅ Mobile CTA Optimizer initialized successfully');
    }

    /**
     * Check if the device is mobile
     */
    checkMobileDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
        
        // Check user agent
        const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
        
        // Check screen size
        const isMobileScreen = window.innerWidth <= 768;
        
        // Check touch capability
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        this.state.isMobile = isMobileUA || (isMobileScreen && isTouchDevice);
        
        this.log(`📱 Mobile detection: UA=${isMobileUA}, Screen=${isMobileScreen}, Touch=${isTouchDevice}, Result=${this.state.isMobile}`);
    }

    /**
     * Create sticky mobile CTA element
     */
    createStickyMobileCTA() {
        // Remove existing sticky CTA if present
        const existingStickyModal = document.querySelector('.mobile-sticky-cta');
        if (existingStickyModal) {
            existingStickyModal.remove();
        }

        // Create sticky CTA container
        const stickyContainer = document.createElement('div');
        stickyContainer.className = 'mobile-sticky-cta';
        stickyContainer.innerHTML = `
            <div class="mobile-sticky-content">
                <div class="mobile-plan-info">
                    <div class="mobile-plan-name">Choose Your Plan</div>
                    <div class="mobile-plan-price">Start from $15/month</div>
                </div>
                <button class="cta-button mobile-sticky-button" data-action="view-plans">
                    View Plans
                </button>
            </div>
            <div class="mobile-urgency-banner" style="display: none;">
                <span class="urgency-text">⚡ Limited Time: 20% off first month</span>
            </div>
        `;

        document.body.appendChild(stickyContainer);
        this.elements.stickyModal = stickyContainer;
        this.elements.stickyButton = stickyContainer.querySelector('.mobile-sticky-button');
        this.elements.urgencyBanner = stickyContainer.querySelector('.mobile-urgency-banner');
        this.elements.planInfo = stickyContainer.querySelector('.mobile-plan-info');

        // Setup sticky CTA interactions
        this.setupStickyInteractions();
    }

    /**
     * Setup sticky CTA interactions
     */
    setupStickyInteractions() {
        if (!this.elements.stickyButton) return;

        this.elements.stickyButton.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            
            this.trackEvent('mobile_sticky_cta_click', {
                action: action,
                plan_selected: this.state.selectedPlan,
                sticky_visible: this.state.stickyVisible
            });

            if (action === 'view-plans') {
                this.scrollToPlans();
            } else if (action === 'select-plan') {
                this.handlePlanSelection(this.state.selectedPlan);
            }
        });

        // Add haptic feedback for mobile
        this.elements.stickyButton.addEventListener('touchstart', () => {
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        });
    }

    /**
     * Setup scroll tracking for sticky CTA
     */
    setupScrollTracking() {
        let scrollTimer;
        
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                this.handleScroll();
            }, 10);
        });

        // Setup intersection observer for pricing grid
        const pricingGrid = document.querySelector('.pricing-grid');
        if (pricingGrid) {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            this.state.scrolledPastPlans = false;
                            this.hideStickyModal();
                        } else if (entry.boundingClientRect.top < 0) {
                            this.state.scrolledPastPlans = true;
                            this.showStickyModal();
                        }
                    });
                },
                { threshold: 0.1 }
            );

            observer.observe(pricingGrid);
            this.observers.push(observer);
        }
    }

    /**
     * Handle scroll events
     */
    handleScroll() {
        const scrollY = window.scrollY;
        const shouldShowSticky = scrollY > this.options.stickyThreshold && this.state.scrolledPastPlans;
        
        if (shouldShowSticky && !this.state.stickyVisible) {
            this.showStickyModal();
        } else if (!shouldShowSticky && this.state.stickyVisible) {
            this.hideStickyModal();
        }
    }

    /**
     * Show sticky mobile CTA
     */
    showStickyModal() {
        if (!this.elements.stickyModal || this.state.stickyVisible) return;

        this.elements.stickyModal.classList.add('show');
        this.state.stickyVisible = true;

        this.trackEvent('mobile_sticky_cta_shown', {
            plan_selected: this.state.selectedPlan,
            scroll_trigger: true
        });

        // Show urgency after delay
        if (this.options.urgencyEnabled && !this.state.urgencyShown) {
            this.timers.push(setTimeout(() => {
                this.showUrgencyBanner();
            }, 3000));
        }
    }

    /**
     * Hide sticky mobile CTA
     */
    hideStickyModal() {
        if (!this.elements.stickyModal || !this.state.stickyVisible) return;

        this.elements.stickyModal.classList.remove('show');
        this.state.stickyVisible = false;
    }

    /**
     * Setup plan selection tracking
     */
    setupPlanSelectionTracking() {
        // Track plan card interactions
        document.querySelectorAll('.pricing-card').forEach((card, index) => {
            const planName = card.querySelector('.plan-name')?.textContent;
            const planPrice = card.querySelector('.price-amount')?.textContent;
            
            if (!planName || !planPrice) return;

            // Track plan card taps
            card.addEventListener('click', () => {
                this.selectPlan(planName, planPrice);
            });

            // Track CTA button clicks
            const ctaButton = card.querySelector('.cta-button');
            if (ctaButton) {
                ctaButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectPlan(planName, planPrice);
                    this.handlePlanSelection(planName);
                });
            }
        });
    }

    /**
     * Select a plan and update sticky CTA
     */
    selectPlan(planName, planPrice) {
        this.state.selectedPlan = planName;
        
        // Update sticky CTA content
        if (this.elements.planInfo) {
            this.elements.planInfo.innerHTML = `
                <div class="mobile-plan-name">${planName} Plan</div>
                <div class="mobile-plan-price">${planPrice}/month</div>
            `;
        }

        if (this.elements.stickyButton) {
            this.elements.stickyButton.textContent = `Get ${planName}`;
            this.elements.stickyButton.dataset.action = 'select-plan';
        }

        this.trackEvent('mobile_plan_selected', {
            plan_name: planName,
            plan_price: planPrice,
            selection_method: 'card_tap'
        });
    }

    /**
     * Handle plan selection action
     */
    handlePlanSelection(planName) {
        if (!planName) return;

        this.trackEvent('mobile_plan_purchase_intent', {
            plan_name: planName,
            interaction_source: 'sticky_cta'
        });

        // Trigger checkout flow (integrate with existing checkout system)
        if (window.checkoutSystem) {
            window.checkoutSystem.startCheckout(planName.toLowerCase());
        } else {
            // Fallback: scroll to plan and highlight
            this.scrollToPlan(planName);
        }
    }

    /**
     * Setup urgency elements
     */
    setupUrgencyElements() {
        // Add mobile-specific urgency indicators
        document.querySelectorAll('.pricing-card').forEach((card, index) => {
            if (index === 1) { // Professional plan
                const urgencyBadge = document.createElement('div');
                urgencyBadge.className = 'mobile-urgency-indicator';
                urgencyBadge.innerHTML = '🔥 Most Popular Choice';
                urgencyBadge.style.cssText = `
                    position: absolute;
                    bottom: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    display: none;
                `;

                card.appendChild(urgencyBadge);
                
                // Show after delay
                this.timers.push(setTimeout(() => {
                    urgencyBadge.style.display = 'block';
                    urgencyBadge.style.animation = 'fadeInBounce 0.5s ease-out';
                }, 2000));
            }
        });
    }

    /**
     * Show urgency banner in sticky CTA
     */
    showUrgencyBanner() {
        if (!this.elements.urgencyBanner || this.state.urgencyShown) return;

        this.elements.urgencyBanner.style.display = 'block';
        this.elements.urgencyBanner.style.animation = 'slideDown 0.3s ease-out';
        this.state.urgencyShown = true;

        this.trackEvent('mobile_urgency_shown', {
            urgency_type: 'discount_banner',
            plan_selected: this.state.selectedPlan
        });
    }

    /**
     * Setup mobile-specific enhancements
     */
    setupMobileEnhancements() {
        // Add mobile-specific CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInBounce {
                0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
                60% { opacity: 1; transform: translateX(-50%) translateY(-5px); }
                100% { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            
            @keyframes slideDown {
                0% { opacity: 0; transform: translateY(-100%); }
                100% { opacity: 1; transform: translateY(0); }
            }
            
            .mobile-sticky-cta {
                box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
            }
            
            .mobile-sticky-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
            }
            
            .mobile-plan-info {
                flex: 1;
                min-width: 0;
            }
            
            .mobile-plan-name {
                font-weight: 600;
                font-size: 0.9rem;
                color: white;
                margin-bottom: 2px;
            }
            
            .mobile-plan-price {
                font-size: 0.8rem;
                color: #94a3b8;
            }
            
            .mobile-sticky-button {
                flex-shrink: 0;
                min-width: 120px;
                font-weight: 700;
                font-size: 0.9rem;
            }
            
            .mobile-urgency-banner {
                background: linear-gradient(135deg, #f59e0b, #d97706);
                padding: 6px 12px;
                text-align: center;
                font-size: 0.75rem;
                font-weight: 600;
                color: white;
            }
            
            .urgency-text {
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.8; }
            }
            
            .mobile-urgency-indicator {
                z-index: 10;
            }
            
            /* Enhanced touch targets */
            @media (max-width: 768px) {
                .cta-button {
                    min-height: 48px;
                    font-size: 1rem;
                    padding: 14px 20px;
                }
                
                .pricing-card {
                    cursor: pointer;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                
                .pricing-card:active {
                    transform: translateY(-2px) scale(0.98);
                }
            }
        `;
        document.head.appendChild(style);

        // Add swipe gesture support for plan comparison
        this.setupSwipeGestures();
        
        // Optimize for mobile performance
        this.optimizeMobilePerformance();
    }

    /**
     * Setup swipe gestures for plan comparison
     */
    setupSwipeGestures() {
        const pricingGrid = document.querySelector('.pricing-grid');
        if (!pricingGrid) return;

        let startX, startY, currentX, currentY;
        let isSwipingHorizontally = false;

        pricingGrid.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isSwipingHorizontally = false;
        }, { passive: true });

        pricingGrid.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;

            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;

            const diffX = Math.abs(currentX - startX);
            const diffY = Math.abs(currentY - startY);

            if (diffX > diffY && diffX > 30) {
                isSwipingHorizontally = true;
            }
        }, { passive: true });

        pricingGrid.addEventListener('touchend', (e) => {
            if (!startX || !startY || !isSwipingHorizontally) return;

            const diffX = currentX - startX;
            
            if (Math.abs(diffX) > 100) {
                const direction = diffX > 0 ? 'right' : 'left';
                this.handleSwipeGesture(direction);
            }

            startX = null;
            startY = null;
            currentX = null;
            currentY = null;
            isSwipingHorizontally = false;
        }, { passive: true });
    }

    /**
     * Handle swipe gesture
     */
    handleSwipeGesture(direction) {
        this.trackEvent('mobile_swipe_gesture', {
            direction: direction,
            section: 'pricing_plans'
        });

        // Visual feedback for swipe
        const pricingGrid = document.querySelector('.pricing-grid');
        if (pricingGrid) {
            pricingGrid.style.transform = direction === 'left' ? 'translateX(-10px)' : 'translateX(10px)';
            setTimeout(() => {
                pricingGrid.style.transform = 'translateX(0)';
            }, 200);
        }
    }

    /**
     * Optimize mobile performance
     */
    optimizeMobilePerformance() {
        // Lazy load non-critical elements
        const lazyElements = document.querySelectorAll('.testimonial, .trust-item');
        const lazyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    lazyObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        lazyElements.forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            lazyObserver.observe(element);
        });

        this.observers.push(lazyObserver);
    }

    /**
     * Scroll to plans section
     */
    scrollToPlans() {
        const pricingGrid = document.querySelector('.pricing-grid');
        if (pricingGrid) {
            pricingGrid.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    }

    /**
     * Scroll to specific plan
     */
    scrollToPlan(planName) {
        const planCards = document.querySelectorAll('.pricing-card');
        const targetCard = Array.from(planCards).find(card => 
            card.querySelector('.plan-name')?.textContent === planName
        );

        if (targetCard) {
            targetCard.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // Highlight the card
            targetCard.style.boxShadow = '0 0 30px rgba(59, 130, 246, 0.5)';
            setTimeout(() => {
                targetCard.style.boxShadow = '';
            }, 2000);
        }
    }

    /**
     * Track mobile-specific events
     */
    trackEvent(eventName, properties = {}) {
        if (!this.options.trackingEnabled) return;

        const eventData = {
            device_type: 'mobile',
            screen_width: window.innerWidth,
            screen_height: window.innerHeight,
            user_agent: navigator.userAgent,
            timestamp: Date.now(),
            ...properties
        };

        // Track with Google Analytics
        if (typeof gtag === 'function') {
            gtag('event', eventName, eventData);
        }

        // Track with conversion analytics
        if (window.conversionAnalytics) {
            window.conversionAnalytics.trackEvent(eventName, eventData);
        }

        this.log(`📊 Mobile event tracked: ${eventName}`, eventData);
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Clear timers
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers = [];

        // Disconnect observers
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];

        // Remove sticky CTA
        if (this.elements.stickyModal) {
            this.elements.stickyModal.remove();
        }

        this.log('🧹 Mobile CTA Optimizer cleaned up');
    }

    /**
     * Debug logging
     */
    log(...args) {
        if (this.options.debug) {
            console.log('[MobileCTAOptimizer]', ...args);
        }
    }
}

// Auto-initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    window.rinaWarpMobileCTAOptimizer = new RinaWarpMobileCTAOptimizer({
        debug: window.location.hostname === 'localhost',
        urgencyEnabled: true,
        trackingEnabled: true
    });
});
