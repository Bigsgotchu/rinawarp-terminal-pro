/**
 * RinaWarp Terminal - Advanced Terminal Emulator
 * Copyright (c) 2025 RinaWarp Technologies. All rights reserved.
 * 
 * This file is part of RinaWarp Terminal, an advanced terminal emulator with
 * AI assistance, enterprise security, cloud sync, and revolutionary features.
 * 
 * CONFIDENTIAL AND PROPRIETARY
 * This source code is proprietary and confidential information of RinaWarp Technologies.
 * Unauthorized reproduction, distribution, or disclosure is strictly prohibited.
 * 
 * Patent Pending - Advanced Terminal Integration Architecture
 * U.S. Patent Application Filed: 2025
 * International Patent Applications: PCT, EU, CN, JP
 * 
 * Licensed under RinaWarp Commercial License.
 * See LICENSE file for detailed terms and conditions.
 * 
 * For licensing inquiries, contact: licensing@rinawarp.com
 * 
 * @author RinaWarp Technologies
 * @copyright 2025 RinaWarp Technologies. All rights reserved.
 * @license RinaWarp Commercial License
 * @version 1.0.0
 * @since 2025-01-01
 */
/**
 * Configuration loader for RinaWarp Terminal
 * Loads environment variables securely
 */

class Config {
    constructor() {
        this.stripe = {
            publishableKey: null,
            prices: {
                personal: null,
                professional: null,
                team: null
            }
        };
        this.loadConfig();
    }

    async loadConfig() {
        try {
            // In a real application, you would load these from your backend API
            // This is a client-side example - never expose secret keys in client code
            
            // For development, you might load from a secure endpoint
            // const response = await fetch('/api/config');
            // const config = await response.json();
            
            // For now, we'll use placeholders that need to be replaced
            this.stripe.publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_PUBLISHABLE_KEY_HERE';
            this.stripe.prices.personal = process.env.STRIPE_PRICE_PERSONAL || 'price_1234567890_personal';
            this.stripe.prices.professional = process.env.STRIPE_PRICE_PROFESSIONAL || 'price_1234567890_professional';
            this.stripe.prices.team = process.env.STRIPE_PRICE_TEAM || 'price_1234567890_team';
            
        } catch (error) {
            console.error('Failed to load configuration:', error);
        }
    }

    getStripeConfig() {
        return this.stripe;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
} else {
    window.Config = Config;
}

