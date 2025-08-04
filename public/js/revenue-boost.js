/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Revenue Boost Script
 * Implements: Exit Intent Popup, Limited Seats Counter, Email Capture, Trust Badges
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        // Limited seats configuration
        limitedSeatsTotal: 100,
        limitedSeatsSold: 73, // Realistic starting number
        
        // Email lead magnet
        emailLeadMagnet: '10 Terminal Productivity Hacks PDF',
        
        // Trust badges
        trustBadges: [
            { icon: '🔒', text: 'SSL Secured' },
            { icon: '💳', text: 'Secure Payments' },
            { icon: '✅', text: '30-Day Guarantee' }
        ],
        
        // Exit intent configuration
        exitIntentDelay: 1000,
        exitDiscount: 20 // 20% exit discount
    };

    // 1. LIMITED SEATS COUNTER
    class LimitedSeatsCounter {
        init() {
            this.addToAllBetaCards();
            this.startCountdown();
        }

        addToAllBetaCards() {
            const betaCards = document.querySelectorAll('.beta-card');
            betaCards.forEach(card => {
                const seatsLeft = CONFIG.limitedSeatsTotal - CONFIG.limitedSeatsSold;
                const urgencyHTML = `
                    <div class="limited-seats-badge" style="
                        background: rgba(255, 20, 147, 0.9);
                        color: white;
                        padding: 8px 15px;
                        border-radius: 20px;
                        font-size: 0.9rem;
                        font-weight: bold;
                        margin: 10px 0;
                        animation: pulse 2s infinite;
                    ">
                        🔥 Only <span class="seats-counter">${seatsLeft}</span> spots left!
                    </div>
                `;
                
                card.insertAdjacentHTML('afterbegin', urgencyHTML);
            });

            // Add pulse animation
            const pulseStyle = `
                <style>
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
                </style>
            `;
            if (!document.querySelector('style[data-pulse]')) {
                const style = document.createElement('style');
                style.setAttribute('data-pulse', 'true');
                style.textContent = pulseStyle;
                document.head.appendChild(style);
            }
        }

        startCountdown() {
            // Simulate real-time seat reduction
            setInterval(() => {
                const counters = document.querySelectorAll('.seats-counter');
                counters.forEach(counter => {
                    let current = parseInt(counter.textContent);
                    if (current > 10 && Math.random() > 0.7) { // 30% chance every interval
                        current--;
                        counter.textContent = current;
                        
                        // Add urgency effect
                        counter.style.color = '#ffff00';
                        setTimeout(() => counter.style.color = '', 300);
                    }
                });
            }, 45000); // Update every 45 seconds
        }
    }

    // 2. EMAIL CAPTURE WITH LEAD MAGNET
    class EmailCapture {
        init() {
            this.addCaptureForm();
        }

        addCaptureForm() {
            const formHTML = `
                <div class="email-capture-section" style="
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(0, 255, 255, 0.1));
                    border-radius: 25px;
                    padding: 40px;
                    margin: 40px auto;
                    max-width: 800px;
                    text-align: center;
                    box-shadow: 0 20px 40px rgba(0, 206, 209, 0.3);
                    border: 2px solid rgba(0, 206, 209, 0.4);
                ">
                    <h3 style="
                        font-size: 2rem;
                        margin-bottom: 15px;
                        background: linear-gradient(45deg, #00ced1, #20b2aa);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                    ">
                        🎁 Free Gift: ${CONFIG.emailLeadMagnet}
                    </h3>
                    <p style="color: #666; margin-bottom: 25px; font-size: 1.1rem;">
                        Join developers boosting their terminal productivity
                    </p>
                    <form id="email-capture-form" style="display: flex; gap: 15px; max-width: 500px; margin: 0 auto; flex-wrap: wrap; justify-content: center;">
                        <input type="email" 
                            placeholder="Enter your email" 
                            required 
                            style="
                                flex: 1;
                                min-width: 250px;
                                padding: 15px 20px;
                                border: 2px solid rgba(0, 206, 209, 0.3);
                                border-radius: 10px;
                                font-size: 1rem;
                                outline: none;
                                transition: border-color 0.3s;
                            "
                            onfocus="this.style.borderColor='#00ced1'"
                            onblur="this.style.borderColor='rgba(0, 206, 209, 0.3)'"
                        >
                        <button type="submit" style="
                            background: linear-gradient(135deg, #00ced1, #20b2aa);
                            color: white;
                            border: none;
                            padding: 15px 30px;
                            border-radius: 10px;
                            font-size: 1rem;
                            font-weight: bold;
                            cursor: pointer;
                            transition: all 0.3s;
                            box-shadow: 0 5px 15px rgba(0, 206, 209, 0.4);
                        ">
                            Get Free Guide
                        </button>
                    </form>
                    <p style="color: #999; font-size: 0.85rem; margin-top: 15px;">
                        We respect your privacy. Unsubscribe at any time.
                    </p>
                </div>
            `;

            // Insert after testimonials section
            const testimonials = document.querySelector('.testimonials-section');
            if (testimonials) {
                testimonials.insertAdjacentHTML('afterend', formHTML);
            }

            // Handle form submission
            document.getElementById('email-capture-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = e.target.querySelector('input[type="email"]').value;
                
                try {
                    const response = await fetch('/api/capture-lead', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, source: 'lead_magnet' })
                    });

                    if (response.ok) {
                        e.target.innerHTML = '<p style="color: #27ae60; font-size: 1.2rem;">✅ Check your email for the guide!</p>';
                        
                        // Track conversion
                        if (typeof gtag !== 'undefined') {
                            gtag('event', 'generate_lead', {
                                'event_category': 'engagement',
                                'event_label': 'Email Capture - Lead Magnet'
                            });
                        }
                    } else {
                        throw new Error(new Error(new Error('Submission failed')));
                    }
                } catch (error) {
                    console.error('Email capture error:', error);
                    alert('Something went wrong. Please try again or email us at support@rinawarp.com');
                }
            });
        }
    }

    // 3. TRUST BADGES
    class TrustBadges {
        init() {
            this.addBadgesToButtons();
            this.addSecuritySection();
        }

        addBadgesToButtons() {
            // Add trust badges near each purchase button
            const purchaseButtons = document.querySelectorAll('.plan-button');
            purchaseButtons.forEach(button => {
                const badgesHTML = `
                    <div class="trust-badges" style="
                        display: flex;
                        justify-content: center;
                        gap: 20px;
                        margin-top: 15px;
                        flex-wrap: wrap;
                    ">
                        ${CONFIG.trustBadges.map(badge => `
                            <div style="
                                display: flex;
                                align-items: center;
                                gap: 5px;
                                color: #666;
                                font-size: 0.9rem;
                            ">
                                <span style="font-size: 1.2rem;">${badge.icon}</span>
                                <span>${badge.text}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
                
                button.insertAdjacentHTML('afterend', badgesHTML);
            });
            // Add beta buttons too
            const betaButtons = document.querySelectorAll('.beta-card button');
            betaButtons.forEach(button => {
                if (!button.nextElementSibling?.classList.contains('trust-badges')) {
                    const badgesHTML = `
                        <div class="trust-badges" style="
                            display: flex;
                            justify-content: center;
                            gap: 15px;
                            margin-top: 10px;
                            flex-wrap: wrap;
                        ">
                            ${CONFIG.trustBadges.map(badge => `
                                <div style="
                                    display: flex;
                                    align-items: center;
                                    gap: 3px;
                                    color: rgba(255,255,255,0.9);
                                    font-size: 0.85rem;
                                ">
                                    <span style="font-size: 1rem;">${badge.icon}</span>
                                    <span>${badge.text}</span>
                                </div>
                            `).join('')}
                        </div>
                    `;
                    
                    button.insertAdjacentHTML('afterend', badgesHTML);
                }
            });
        }

        addSecuritySection() {
            const securityHTML = `
                <div class="security-section" style="
                    text-align: center;
                    margin: 60px 0;
                    padding: 40px;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 20, 147, 0.05));
                    border-radius: 25px;
                    border: 2px solid rgba(255, 20, 147, 0.2);
                ">
                    <h3 style="
                        font-size: 2rem;
                        margin-bottom: 30px;
                        background: linear-gradient(45deg, #ff1493, #00ffff);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                    ">
                        Your Security is Our Priority
                    </h3>
                    <div style="
                        display: flex;
                        justify-content: center;
                        gap: 40px;
                        flex-wrap: wrap;
                        margin-top: 30px;
                    ">
                        <div style="text-align: center;">
                            <div style="font-size: 3rem; margin-bottom: 10px;">🔒</div>
                            <h4 style="color: #ff1493; margin-bottom: 5px;">SSL Encrypted</h4>
                            <p style="color: #666;">256-bit encryption</p>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 3rem; margin-bottom: 10px;">💳</div>
                            <h4 style="color: #20b2aa; margin-bottom: 5px;">Secure Payments</h4>
                            <p style="color: #666;">Powered by Stripe</p>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 3rem; margin-bottom: 10px;">🛡️</div>
                            <h4 style="color: #00ced1; margin-bottom: 5px;">Privacy First</h4>
                            <p style="color: #666;">GDPR Compliant</p>
                        </div>
                    </div>
                </div>
            `;

            // Insert before footer
            const container = document.querySelector('.container');
            if (container) {
                const lastChild = container.lastElementChild;
                if (lastChild && !document.querySelector('.security-section')) {
                    lastChild.insertAdjacentHTML('beforebegin', securityHTML);
                }
            }
        }
    }

    // Add urgency to pricing cards
    function enhancePricingCards() {
        const pricingCards = document.querySelectorAll('.pricing-card');
        
        pricingCards.forEach((card, index) => {
            // Add "Most Popular" badge to middle card
            if (index === 1 && !card.classList.contains('popular')) {
                card.classList.add('popular');
            }
            
            // Add original price with strikethrough
            const priceElement = card.querySelector('.plan-price');
            if (priceElement && !card.querySelector('.original-price')) {
                const currentPrice = parseFloat(priceElement.textContent.replace(/[^0-9.]/g, ''));
                const originalPrice = (currentPrice * 2).toFixed(2);
                
                const strikePrice = document.createElement('div');
                strikePrice.className = 'original-price';
                strikePrice.innerHTML = `<s>$${originalPrice}</s> <span class="save-badge">SAVE 50%</span>`;
                priceElement.parentNode.insertBefore(strikePrice, priceElement);
            }
            
            // Make buttons more compelling
            const button = card.querySelector('.plan-button, button');
            if (button) {
                button.textContent = button.textContent.includes('Contact') 
                    ? 'Get Custom Quote' 
                    : 'Start Free Trial →';
                
                // Add hover effect
                button.addEventListener('mouseenter', () => {
                    button.textContent = 'Claim 50% Discount';
                });
                
                button.addEventListener('mouseleave', () => {
                    button.textContent = button.textContent.includes('Custom') 
                        ? 'Get Custom Quote' 
                        : 'Start Free Trial →';
                });
            }
        });
        
        // Add styles for enhancements
        const style = document.createElement('style');
        style.textContent = `
            .original-price {
                color: #999;
                margin-bottom: 10px;
                font-size: 1.2rem;
            }
            
            .save-badge {
                background: #ff1493;
                color: white;
                padding: 3px 10px;
                border-radius: 20px;
                font-size: 0.8rem;
                font-weight: bold;
                margin-left: 10px;
                animation: badgePulse 2s infinite;
            }
            
            @keyframes badgePulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            
            .plan-button:hover {
                animation: buttonShake 0.5s ease;
            }
            
            @keyframes buttonShake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
        `;
        document.head.appendChild(style);
    }

    // 4. EXIT INTENT POPUP
    class ExitIntentPopup {
        constructor() {
            this.shown = false;
            this.init();
        }

        init() {
            // Desktop exit intent
            document.addEventListener('mouseout', (e) => {
                if (!this.shown && e.clientY <= 0 && e.relatedTarget == null) {
                    setTimeout(() => this.show(), CONFIG.exitIntentDelay);
                }
            });

            // Mobile exit intent (scroll up quickly)
            let lastScrollTop = 0;
            let scrollVelocity = 0;
            window.addEventListener('scroll', () => {
                const st = window.pageYOffset;
                scrollVelocity = lastScrollTop - st;
                if (!this.shown && scrollVelocity > 50 && st < 200) {
                    this.show();
                }
                lastScrollTop = st;
            });
        }

        show() {
            if (this.shown || document.getElementById('exit-intent-popup')) return;
            this.shown = true;
            
            const popup = document.createElement('div');
            popup.id = 'exit-intent-popup';
            popup.innerHTML = `
                <div class="exit-popup-overlay"></div>
                <div class="exit-popup-content">
                    <button class="exit-popup-close">&times;</button>
                    <h2>🚀 Wait! Don't Miss Out!</h2>
                    <p class="exit-popup-subtitle">Get ${CONFIG.exitDiscount}% OFF Beta Access - Today Only!</p>
                    <div class="exit-popup-features">
                        <div>✅ AI-Powered Terminal</div>
                        <div>✅ Cloud Sync Included</div>
                        <div>✅ Priority Support</div>
                    </div>
                    <div class="exit-popup-timer">
                        Offer expires in: <span id="exit-timer">15:00</span>
                    </div>
                    <button class="exit-popup-cta" onclick="window.applyExitDiscount()">
                        Claim Your ${CONFIG.exitDiscount}% Discount
                    </button>
                    <p class="exit-popup-disclaimer">No credit card required • 14-day free trial</p>
                </div>
            `;
            // Add styles
            const styles = `
                <style>
                #exit-intent-popup {
                    display: block;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                }
                
                .exit-popup-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(5px);
                }
                
                .exit-popup-content {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 20, 147, 0.05));
                    border-radius: 25px;
                    padding: 40px;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    border: 3px solid rgba(255, 20, 147, 0.3);
                    text-align: center;
                    animation: popupBounce 0.5s ease-out;
                }
                
                @keyframes popupBounce {
                    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                    60% { transform: translate(-50%, -50%) scale(1.05); }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
                
                .exit-popup-close {
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: none;
                    border: none;
                    font-size: 30px;
                    cursor: pointer;
                    color: #666;
                    transition: color 0.3s;
                }
                
                .exit-popup-close:hover {
                    color: #ff1493;
                }
                
                .exit-popup-content h2 {
                    font-size: 2.5rem;
                    margin-bottom: 15px;
                    background: linear-gradient(45deg, #ff1493, #00ffff);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                .exit-popup-subtitle {
                    font-size: 1.3rem;
                    color: #ff1493;
                    margin-bottom: 20px;
                    font-weight: bold;
                }
                
                .exit-popup-features {
                    display: flex;
                    justify-content: space-around;
                    margin: 25px 0;
                    flex-wrap: wrap;
                    gap: 15px;
                }
                
                .exit-popup-features div {
                    color: #20b2aa;
                    font-weight: 600;
                }
                
                .exit-popup-timer {
                    font-size: 1.2rem;
                    color: #ff1493;
                    margin: 20px 0;
                    font-weight: bold;
                }
                
                .exit-popup-cta {
                    background: linear-gradient(135deg, #ff1493, #00ffff);
                    color: white;
                    border: none;
                    padding: 18px 40px;
                    font-size: 1.2rem;
                    border-radius: 30px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: all 0.3s;
                    box-shadow: 0 5px 20px rgba(255, 20, 147, 0.4);
                }
                
                .exit-popup-cta:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 30px rgba(255, 20, 147, 0.6);
                }
                
                .exit-popup-disclaimer {
                    margin-top: 15px;
                    color: #666;
                    font-size: 0.9rem;
                }
                </style>
            `;

            document.head.insertAdjacentHTML('beforeend', styles);
            document.body.appendChild(popup);

            // Close button functionality
            popup.querySelector('.exit-popup-close').addEventListener('click', () => this.hide());
            popup.querySelector('.exit-popup-overlay').addEventListener('click', () => this.hide());
            
            this.startTimer();
            
            // Track event
            if (typeof gtag !== 'undefined') {
                gtag('event', 'exit_intent_shown', {
                    'event_category': 'engagement',
                    'event_label': 'Exit Intent Popup'
                });
            }
        }

        hide() {
            const popup = document.getElementById('exit-intent-popup');
            if (popup) popup.remove();
        }

        startTimer() {
            let minutes = 15;
            let seconds = 0;
            const timerElement = document.getElementById('exit-timer');
            
            const countdown = setInterval(() => {
                seconds--;
                if (seconds < 0) {
                    minutes--;
                    seconds = 59;
                }
                
                if (minutes < 0) {
                    clearInterval(countdown);
                    timerElement.textContent = '00:00';
                    return;
                }
                
                timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }, 1000);
        }
    }

    // Apply exit discount function
    window.applyExitDiscount = function() {
        // Close popup
        const popup = document.getElementById('exit-intent-popup');
        if (popup) popup.remove();
        
        // Scroll to pricing
        const pricingSection = document.querySelector('.pricing-grid, .beta-access-section');
        if (pricingSection) {
            pricingSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Show discount notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: linear-gradient(135deg, #ff1493, #00ffff);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 9999;
            font-weight: bold;
            animation: slideIn 0.5s ease-out;
        `;
        notification.innerHTML = `🎉 ${CONFIG.exitDiscount}% Discount Applied! Use code: SAVE${CONFIG.exitDiscount}`;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 5000);
        
        // Track conversion
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exit_discount_applied', {
                'event_category': 'conversions',
                'event_label': 'Exit Intent Discount',
                'value': CONFIG.exitDiscount
            });
        }
    };

    // Initialize all features when DOM is ready
    function init() {
        // Only initialize on pricing page
        if (!window.location.pathname.includes('pricing')) return;

        // Initialize all features
        new LimitedSeatsCounter().init();
        new EmailCapture().init();
        new TrustBadges().init();
        new ExitIntentPopup();
        
        console.log('💰 Revenue boost features activated: Exit Intent, Limited Seats, Email Capture, Trust Badges');
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
