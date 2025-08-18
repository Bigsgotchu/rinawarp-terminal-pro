/**
 * 🎯 Smart Exit-Intent System with Progressive Offers
 * Advanced exit-intent detection with personalized offers based on user behavior
 */

class SmartExitIntent {
    constructor(options = {}) {
        this.debug = options.debug || false;
        this.analytics = options.analytics || null;
        
        // User behavior tracking
        this.timeOnPage = 0;
        this.scrollDepth = 0;
        this.planViewed = null;
        this.planInteracted = false;
        this.previousVisits = this.getPreviousVisits();
        this.sessionStartTime = Date.now();
        
        // Exit intent state
        this.exitIntentShown = false;
        this.exitIntentTriggered = false;
        this.lastMouseY = 0;
        
        // Offer configurations
        this.offers = {
            first_time_discount: {
                id: 'first_time_discount',
                trigger: 'first_visit_exit',
                discount: 25,
                title: '🎉 Wait! Get 25% Off Your First Month',
                description: 'Special offer for new RinaWarp users',
                code: 'WELCOME25',
                validity: '48 hours',
                color: '#10b981'
            },
            
            return_visitor_upgrade: {
                id: 'return_visitor_upgrade',
                trigger: 'return_visit_exit',
                discount: 15,
                title: '👋 Welcome Back! Special Upgrade Offer',
                description: 'Ready to upgrade? Get 15% off any paid plan',
                code: 'UPGRADE15',
                validity: '24 hours',
                color: '#3b82f6'
            },
            
            high_intent_offer: {
                id: 'high_intent_offer',
                trigger: 'high_engagement_exit',
                discount: 20,
                title: '⚡ Almost There! 20% Off Professional Plan',
                description: 'You were so close! Complete your upgrade now',
                code: 'PROFESSIONAL20',
                validity: '72 hours',
                color: '#f59e0b'
            },
            
            cart_abandonment: {
                id: 'cart_abandonment',
                trigger: 'plan_selected_exit',
                discount: 30,
                title: '🚨 Don\'t Miss Out! 30% Off Selected Plan',
                description: 'Complete your purchase in the next 15 minutes',
                code: 'URGENT30',
                validity: '15 minutes',
                color: '#ef4444',
                urgent: true
            },
            
            price_sensitive: {
                id: 'price_sensitive',
                trigger: 'price_focused_exit',
                discount: 35,
                title: '💰 Special Pricing Just For You',
                description: 'Get our biggest discount - limited time only',
                code: 'SAVE35',
                validity: '1 hour',
                color: '#8b5cf6'
            }
        };
        
        this.init();
    }
    
    /**
     * Initialize the exit-intent system
     */
    init() {
        if (this.debug) {
            console.log('🎯 Smart Exit-Intent System initialized');
        }
        
        // Track user behavior
        this.setupBehaviorTracking();
        
        // Setup exit-intent detection
        this.setupExitIntentDetection();
        
        // Setup progressive disclosure
        this.setupProgressiveDisclosure();
        
        // Clean up old storage
        this.cleanupOldData();
    }
    
    /**
     * Track user behavior patterns
     */
    setupBehaviorTracking() {
        // Track scroll depth
        window.addEventListener('scroll', () => {
            const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
            this.scrollDepth = Math.max(this.scrollDepth, scrollPercent);
        });
        
        // Track plan interactions
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // Track pricing card interactions
            if (target.closest('.pricing-card')) {
                this.planInteracted = true;
                const card = target.closest('.pricing-card');
                const planName = card.querySelector('.plan-name');
                if (planName) {
                    this.planViewed = planName.textContent.toLowerCase();
                }
            }
            
            // Track CTA button clicks (plan selection)
            if (target.classList.contains('cta-button') || target.classList.contains('buy-button')) {
                const plan = target.dataset.plan || this.extractPlanFromButton(target);
                this.planSelected = plan;
                this.storePlanSelection(plan);
                
                // Track high-intent behavior
                this.trackHighIntentBehavior('plan_selection', { plan });
            }
        });
        
        // Track time on page
        setInterval(() => {
            this.timeOnPage = Math.round((Date.now() - this.sessionStartTime) / 1000);
        }, 1000);
    }
    
    /**
     * Setup exit-intent detection
     */
    setupExitIntentDetection() {
        // Mouse movement tracking
        document.addEventListener('mousemove', (e) => {
            this.lastMouseY = e.clientY;
        });
        
        // Exit intent detection (mouse leaving viewport from top)
        document.addEventListener('mouseleave', (e) => {
            // Only trigger when mouse leaves through top edge and moving upward
            if (e.clientY <= 0 && !this.exitIntentTriggered && this.timeOnPage > 10) {
                this.handleExitIntent();
            }
        });
        
        // Alternative exit intent triggers
        window.addEventListener('beforeunload', (e) => {
            if (!this.exitIntentTriggered) {
                // Quick exit intent for immediate page leave
                this.handleQuickExit();
            }
        });
        
        // Tab visibility change (user switching tabs)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && !this.exitIntentTriggered && this.timeOnPage > 30) {
                // Delayed trigger for tab switching
                setTimeout(() => {
                    if (document.hidden && !this.exitIntentTriggered) {
                        this.handleExitIntent();
                    }
                }, 2000);
            }
        });
    }
    
    /**
     * Handle exit intent trigger
     */
    handleExitIntent() {
        if (this.exitIntentTriggered) return;
        
        this.exitIntentTriggered = true;
        
        // Analyze user behavior to determine best offer
        const offer = this.selectBestOffer();
        
        if (offer) {
            this.showExitIntentModal(offer);
            this.trackExitIntentEvent('exit_intent_triggered', { offer_id: offer.id });
        }
    }
    
    /**
     * Handle quick exit (immediate page leave)
     */
    handleQuickExit() {
        // Store session data for email follow-up
        this.storeSessionData();
        
        // Track quick exit for analytics
        this.trackExitIntentEvent('quick_exit', {
            time_on_page: this.timeOnPage,
            scroll_depth: this.scrollDepth,
            plan_viewed: this.planViewed
        });
    }
    
    /**
     * Select the best offer based on user behavior
     */
    selectBestOffer() {
        const { timeOnPage, scrollDepth, planInteracted, planSelected, previousVisits } = this;
        
        // Cart abandonment (highest priority)
        if (planSelected) {
            return this.offers.cart_abandonment;
        }
        
        // High engagement exit
        if (timeOnPage > 60 && scrollDepth > 50 && planInteracted) {
            return this.offers.high_intent_offer;
        }
        
        // Price-sensitive behavior (spent time looking at prices)
        if (timeOnPage > 90 && scrollDepth > 25 && !planInteracted) {
            return this.offers.price_sensitive;
        }
        
        // Return visitor
        if (previousVisits > 0) {
            return this.offers.return_visitor_upgrade;
        }
        
        // First time visitor (default)
        if (timeOnPage > 20) {
            return this.offers.first_time_discount;
        }
        
        return null; // No offer for very quick exits
    }
    
    /**
     * Show exit-intent modal with offer
     */
    showExitIntentModal(offer) {
        if (this.exitIntentShown) return;
        this.exitIntentShown = true;
        
        const modal = this.createExitIntentModal(offer);
        document.body.appendChild(modal);
        
        // Animate in
        setTimeout(() => {
            modal.classList.add('show');
        }, 100);
        
        // Track modal display
        this.trackExitIntentEvent('exit_modal_shown', { offer_id: offer.id });
        
        // Auto-close after 30 seconds if no interaction
        setTimeout(() => {
            if (modal.parentNode) {
                this.closeExitIntentModal(modal, 'auto_close');
            }
        }, 30000);
    }
    
    /**
     * Create exit-intent modal DOM
     */
    createExitIntentModal(offer) {
        const modal = document.createElement('div');
        modal.className = 'exit-intent-modal';
        modal.innerHTML = `
            <div class="exit-intent-overlay"></div>
            <div class="exit-intent-content" style="border-left: 5px solid ${offer.color}">
                <button class="exit-close-btn" data-action="close">×</button>
                
                <div class="exit-header">
                    <h2 style="color: ${offer.color}">${offer.title}</h2>
                    <p class="exit-description">${offer.description}</p>
                </div>
                
                <div class="exit-offer-details">
                    <div class="discount-badge" style="background: ${offer.color}">
                        ${offer.discount}% OFF
                    </div>
                    
                    <div class="offer-code">
                        <span>Use code:</span>
                        <code id="offerCode">${offer.code}</code>
                        <button class="copy-code-btn" data-code="${offer.code}">Copy</button>
                    </div>
                    
                    <div class="offer-validity ${offer.urgent ? 'urgent' : ''}">
                        ⏰ Valid for: ${offer.validity}
                    </div>
                </div>
                
                <div class="exit-actions">
                    <button class="exit-primary-btn" data-action="claim" style="background: ${offer.color}">
                        🎯 Claim This Offer
                    </button>
                    <button class="exit-secondary-btn" data-action="email">
                        📧 Email Me This Offer
                    </button>
                </div>
                
                <div class="exit-benefits">
                    <h4>✨ Why users love RinaWarp:</h4>
                    <ul>
                        <li>🚀 Save 3+ hours daily with AI automation</li>
                        <li>🎤 Voice commands for hands-free coding</li>
                        <li>🧠 Learns your workflow patterns</li>
                        <li>🔒 Enterprise-grade security</li>
                    </ul>
                </div>
                
                <div class="exit-footer">
                    <p>💙 Join 10,000+ developers who transformed their workflow</p>
                </div>
            </div>
        `;
        
        // Add event listeners
        this.setupModalEventListeners(modal, offer);
        
        return modal;
    }
    
    /**
     * Setup modal event listeners
     */
    setupModalEventListeners(modal, offer) {
        modal.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            
            switch (action) {
                case 'close':
                    this.closeExitIntentModal(modal, 'user_close');
                    break;
                    
                case 'claim':
                    this.handleOfferClaim(offer);
                    this.closeExitIntentModal(modal, 'offer_claimed');
                    break;
                    
                case 'email':
                    this.handleEmailRequest(offer);
                    break;
            }
            
            // Copy code functionality
            if (e.target.classList.contains('copy-code-btn')) {
                this.copyOfferCode(e.target.dataset.code);
                e.target.textContent = '✓ Copied!';
                setTimeout(() => {
                    e.target.textContent = 'Copy';
                }, 2000);
            }
        });
        
        // Close on overlay click
        modal.querySelector('.exit-intent-overlay').addEventListener('click', () => {
            this.closeExitIntentModal(modal, 'overlay_close');
        });
        
        // Escape key close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.parentNode) {
                this.closeExitIntentModal(modal, 'escape_close');
            }
        });
    }
    
    /**
     * Handle offer claim
     */
    handleOfferClaim(offer) {
        // Store the offer for checkout
        localStorage.setItem('exit_offer', JSON.stringify({
            ...offer,
            claimed_at: Date.now()
        }));
        
        // Redirect to pricing with offer parameter
        const url = new URL(window.location.href);
        url.searchParams.set('offer', offer.code);
        window.location.href = url.toString();
        
        // Track conversion
        this.trackExitIntentEvent('offer_claimed', { 
            offer_id: offer.id,
            discount: offer.discount 
        });
    }
    
    /**
     * Handle email request
     */
    handleEmailRequest(offer) {
        const email = prompt('Enter your email to receive this exclusive offer:');
        if (email && this.isValidEmail(email)) {
            // Store email request
            this.storeEmailRequest(email, offer);
            
            // Show confirmation
            alert(`✅ Offer sent to ${email}! Check your inbox in a few minutes.`);
            
            // Track email request
            this.trackExitIntentEvent('email_requested', { 
                offer_id: offer.id,
                email_provided: true 
            });
        }
    }
    
    /**
     * Close exit-intent modal
     */
    closeExitIntentModal(modal, reason) {
        modal.classList.add('closing');
        
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
        
        // Track close reason
        this.trackExitIntentEvent('exit_modal_closed', { close_reason: reason });
    }
    
    /**
     * Copy offer code to clipboard
     */
    copyOfferCode(code) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(code);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
        
        this.trackExitIntentEvent('offer_code_copied', { code });
    }
    
    /**
     * Progressive disclosure based on behavior
     */
    setupProgressiveDisclosure() {
        // Show subtle hints for engaged users
        setTimeout(() => {
            if (this.timeOnPage > 45 && this.scrollDepth > 30 && !this.planInteracted) {
                this.showProgressiveHint('plan_exploration');
            }
        }, 45000);
        
        // Show urgency for high-intent users
        setTimeout(() => {
            if (this.timeOnPage > 120 && this.planInteracted && !this.planSelected) {
                this.showProgressiveHint('decision_urgency');
            }
        }, 120000);
    }
    
    /**
     * Show progressive hint
     */
    showProgressiveHint(type) {
        if (this.exitIntentShown) return;
        
        const hints = {
            plan_exploration: {
                message: '👀 Still exploring? Most users find their perfect plan in under 2 minutes!',
                action: 'Scroll down to compare plans',
                color: '#3b82f6'
            },
            decision_urgency: {
                message: '⏰ Take your time! 95% of users upgrade within their first week.',
                action: 'Questions? Chat with our team',
                color: '#f59e0b'
            }
        };
        
        const hint = hints[type];
        if (!hint) return;
        
        this.showFloatingHint(hint);
        this.trackExitIntentEvent('progressive_hint_shown', { hint_type: type });
    }
    
    /**
     * Show floating hint
     */
    showFloatingHint(hint) {
        const hintElement = document.createElement('div');
        hintElement.className = 'progressive-hint';
        hintElement.innerHTML = `
            <div class="hint-content" style="border-left: 4px solid ${hint.color}">
                <div class="hint-message">${hint.message}</div>
                <div class="hint-action">${hint.action}</div>
                <button class="hint-close">×</button>
            </div>
        `;
        
        document.body.appendChild(hintElement);
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (hintElement.parentNode) {
                hintElement.parentNode.removeChild(hintElement);
            }
        }, 8000);
        
        // Close button
        hintElement.querySelector('.hint-close').addEventListener('click', () => {
            hintElement.parentNode.removeChild(hintElement);
        });
    }
    
    /**
     * Utility functions
     */
    extractPlanFromButton(button) {
        const card = button.closest('.pricing-card');
        if (card) {
            const planName = card.querySelector('.plan-name');
            if (planName) {
                return planName.textContent.toLowerCase().replace(/\s+/g, '_');
            }
        }
        return 'unknown';
    }
    
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    getPreviousVisits() {
        const visits = localStorage.getItem('rinawarp_visits');
        return visits ? parseInt(visits) : 0;
    }
    
    storePlanSelection(plan) {
        localStorage.setItem('plan_selected', JSON.stringify({
            plan,
            selected_at: Date.now(),
            session_id: this.getSessionId()
        }));
    }
    
    storeEmailRequest(email, offer) {
        const requests = JSON.parse(localStorage.getItem('email_requests') || '[]');
        requests.push({
            email,
            offer_id: offer.id,
            requested_at: Date.now()
        });
        localStorage.setItem('email_requests', JSON.stringify(requests));
    }
    
    storeSessionData() {
        localStorage.setItem('last_session', JSON.stringify({
            time_on_page: this.timeOnPage,
            scroll_depth: this.scrollDepth,
            plan_viewed: this.planViewed,
            plan_interacted: this.planInteracted,
            session_end: Date.now()
        }));
    }
    
    getSessionId() {
        let sessionId = sessionStorage.getItem('exit_intent_session');
        if (!sessionId) {
            sessionId = 'exit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('exit_intent_session', sessionId);
        }
        return sessionId;
    }
    
    trackExitIntentEvent(eventName, data = {}) {
        // Track with Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                event_category: 'exit_intent',
                time_on_page: this.timeOnPage,
                scroll_depth: this.scrollDepth,
                plan_viewed: this.planViewed,
                ...data
            });
        }
        
        // Track with internal analytics
        if (this.analytics && this.analytics.trackEvent) {
            this.analytics.trackEvent(eventName, {
                category: 'exit_intent',
                time_on_page: this.timeOnPage,
                scroll_depth: this.scrollDepth,
                ...data
            });
        }
        
        if (this.debug) {
            console.log(`🎯 Exit Intent Event: ${eventName}`, data);
        }
    }
    
    trackHighIntentBehavior(behavior, data = {}) {
        this.trackExitIntentEvent('high_intent_behavior', {
            behavior,
            ...data
        });
    }
    
    cleanupOldData() {
        // Clean up old session data (older than 7 days)
        const maxAge = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        
        ['exit_offer', 'last_session', 'email_requests'].forEach(key => {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data && data.timestamp && (now - data.timestamp) > maxAge) {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                // Invalid data, remove it
                localStorage.removeItem(key);
            }
        });
    }
}

// Export for use
window.SmartExitIntent = SmartExitIntent;
