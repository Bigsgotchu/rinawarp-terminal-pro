/**
 * RinaWarp Revenue Boost Script
 * Adds urgency, social proof, and conversion optimization
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        launchDiscount: 50, // 50% off
        launchEndDate: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours from now
        viewerCount: Math.floor(Math.random() * 15) + 8, // 8-22 viewers
        customerCount: 127 + Math.floor(Math.random() * 20), // Dynamic count
    };

    // Create launch banner
    function createLaunchBanner() {
        const banner = document.createElement('div');
        banner.className = 'launch-banner';
        banner.innerHTML = `
            <div class="launch-banner-content">
                <span class="launch-emoji">🚀</span>
                <span class="launch-text">LAUNCH WEEK SPECIAL: ${CONFIG.launchDiscount}% OFF ALL PLANS!</span>
                <span class="countdown" id="countdown-timer">Loading...</span>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .launch-banner {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #ff1493, #00ffff);
                color: white;
                padding: 15px;
                text-align: center;
                z-index: 9999;
                box-shadow: 0 4px 20px rgba(255, 20, 147, 0.4);
                animation: bannerPulse 2s ease-in-out infinite;
            }
            
            @keyframes bannerPulse {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-2px); }
            }
            
            .launch-banner-content {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 15px;
                flex-wrap: wrap;
                font-weight: bold;
                font-size: 1.1rem;
            }
            
            .launch-emoji {
                font-size: 1.5rem;
                animation: rocket 3s ease-in-out infinite;
            }
            
            @keyframes rocket {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                25% { transform: translateY(-5px) rotate(-5deg); }
                75% { transform: translateY(3px) rotate(5deg); }
            }
            
            .countdown {
                background: rgba(255, 255, 255, 0.2);
                padding: 5px 15px;
                border-radius: 20px;
                font-size: 0.95rem;
            }
            
            body { padding-top: 70px !important; }
        `;
        document.head.appendChild(style);
        document.body.insertBefore(banner, document.body.firstChild);
        
        // Start countdown
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    // Update countdown timer
    function updateCountdown() {
        const now = new Date().getTime();
        const distance = CONFIG.launchEndDate - now;
        
        if (distance < 0) {
            document.getElementById('countdown-timer').textContent = 'EXPIRED';
            return;
        }
        
        const hours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        document.getElementById('countdown-timer').textContent = 
            `Ends in ${hours}h ${minutes}m ${seconds}s`;
    }

    // Add social proof section
    function addSocialProof() {
        const proofSection = document.createElement('div');
        proofSection.className = 'social-proof-section';
        proofSection.innerHTML = `
            <div class="proof-container">
                <div class="active-users">
                    <span class="pulse-dot"></span>
                    <span id="viewer-count">${CONFIG.viewerCount}</span> developers viewing this page
                </div>
                <div class="customer-count">
                    🎉 Join <span id="customer-count">${CONFIG.customerCount}</span>+ developers already using RinaWarp
                </div>
                <div class="testimonial">
                    ⭐⭐⭐⭐⭐ "This terminal changed how I code. The AI features save me hours daily!" 
                    - <em>Sarah Chen, Senior Developer</em>
                </div>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .social-proof-section {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 20, 147, 0.1));
                padding: 30px;
                margin: 30px auto;
                max-width: 1200px;
                border-radius: 20px;
                box-shadow: 0 10px 30px rgba(255, 20, 147, 0.2);
                text-align: center;
            }
            
            .proof-container {
                display: flex;
                flex-direction: column;
                gap: 20px;
                align-items: center;
            }
            
            .active-users {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 1.1rem;
                color: #ff1493;
                font-weight: bold;
            }
            
            .pulse-dot {
                width: 10px;
                height: 10px;
                background: #00ff00;
                border-radius: 50%;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 255, 0, 0.7); }
                70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(0, 255, 0, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 255, 0, 0); }
            }
            
            .customer-count {
                font-size: 1.3rem;
                color: #0a1628;
                font-weight: bold;
            }
            
            .testimonial {
                font-style: italic;
                color: #444;
                max-width: 600px;
                line-height: 1.6;
                padding: 20px;
                background: rgba(255, 255, 255, 0.5);
                border-radius: 15px;
            }
        `;
        document.head.appendChild(style);
        
        // Insert after header
        const header = document.querySelector('.header, .hero');
        if (header && header.parentNode) {
            header.parentNode.insertBefore(proofSection, header.nextSibling);
        }
        
        // Update viewer count dynamically
        setInterval(() => {
            const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
            CONFIG.viewerCount = Math.max(5, Math.min(30, CONFIG.viewerCount + change));
            document.getElementById('viewer-count').textContent = CONFIG.viewerCount;
        }, 5000);
        
        // Increment customer count occasionally
        setInterval(() => {
            CONFIG.customerCount += Math.floor(Math.random() * 3);
            document.getElementById('customer-count').textContent = CONFIG.customerCount;
        }, 30000);
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

    // Exit intent popup
    function setupExitIntent() {
        let shown = false;
        
        document.addEventListener('mouseout', (e) => {
            if (e.clientY < 10 && !shown) {
                shown = true;
                showExitPopup();
            }
        });
    }

    function showExitPopup() {
        const popup = document.createElement('div');
        popup.className = 'exit-popup';
        popup.innerHTML = `
            <div class="exit-popup-content">
                <button class="close-popup" onclick="this.parentElement.parentElement.remove()">×</button>
                <h2>Wait! Don't Leave Empty-Handed 🎁</h2>
                <p>Get an EXTRA 20% off (70% total discount!)</p>
                <div class="exit-offer">
                    <input type="email" placeholder="Enter your email" id="exit-email">
                    <button onclick="claimExitOffer()">Claim Extra Discount</button>
                </div>
                <p class="exit-note">Limited to next 10 users only!</p>
            </div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            .exit-popup {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .exit-popup-content {
                background: white;
                padding: 40px;
                border-radius: 20px;
                max-width: 500px;
                text-align: center;
                position: relative;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            
            .close-popup {
                position: absolute;
                top: 10px;
                right: 15px;
                font-size: 30px;
                background: none;
                border: none;
                cursor: pointer;
                color: #999;
            }
            
            .exit-offer {
                display: flex;
                gap: 10px;
                margin: 20px 0;
            }
            
            .exit-offer input {
                flex: 1;
                padding: 15px;
                border: 2px solid #ddd;
                border-radius: 10px;
                font-size: 16px;
            }
            
            .exit-offer button {
                background: linear-gradient(135deg, #ff1493, #00ffff);
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 10px;
                font-weight: bold;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(popup);
    }

    // Track conversions
    window.claimExitOffer = function() {
        const email = document.getElementById('exit-email').value;
        if (email) {
            // Track in GA4
            if (typeof gtag !== 'undefined') {
                gtag('event', 'exit_offer_claimed', {
                    value: 70,
                    currency: 'USD'
                });
            }
            
            // Redirect to pricing with special code
            window.location.href = '/pricing?code=EXIT70&email=' + encodeURIComponent(email);
        }
    };

    // Initialize everything when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // Only run on pricing-related pages
        if (window.location.pathname.includes('pricing') || 
            window.location.pathname === '/' ||
            window.location.pathname === '/index.html') {
            
            createLaunchBanner();
            addSocialProof();
            enhancePricingCards();
            setupExitIntent();
            
            console.log('💰 Revenue boost features activated!');
        }
    }
})();
