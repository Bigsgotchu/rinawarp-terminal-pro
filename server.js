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
 * RinaWarp Terminal - Configuration Server
 * Serves Stripe configuration securely using environment variables
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('.'));

// API endpoint to get Stripe configuration
app.get('/api/stripe-config', (req, res) => {
    // Only send publishable key and price IDs (never secret keys!)
    const config = {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        prices: {
            personal: process.env.STRIPE_PRICE_PERSONAL,
            professional: process.env.STRIPE_PRICE_PROFESSIONAL,
            team: process.env.STRIPE_PRICE_TEAM
        }
    };

    // Validate that all required config is present
    if (!config.publishableKey || !config.prices.personal || !config.prices.professional || !config.prices.team) {
        return res.status(500).json({ 
            error: 'Missing required Stripe configuration environment variables' 
        });
    }

    res.json(config);
});

// Serve the pricing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pricing.html'));
});

// Serve download page
app.get('/download', (req, res) => {
    res.sendFile(path.join(__dirname, 'website-deploy', 'download.html'));
});

// Serve success page
app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, 'success.html'));
});

// Serve release files
app.use('/releases', express.static('releases'));

// License validation API endpoint
app.post('/api/validate-license', express.json(), (req, res) => {
    const { licenseKey } = req.body;
    
    if (!licenseKey) {
        return res.status(400).json({ 
            valid: false, 
            error: 'License key is required' 
        });
    }
    
    // Simple license validation logic
    // In production, this would connect to your license database
    const validLicenses = {
        'RINAWARP-TRIAL-2025': { type: 'trial', expires: Date.now() + (30 * 24 * 60 * 60 * 1000) },
        'RINAWARP-PERSONAL-2025': { type: 'personal', expires: null },
        'RINAWARP-PROFESSIONAL-2025': { type: 'professional', expires: null },
        'RINAWARP-TEAM-2025': { type: 'team', expires: null },
        'RINAWARP-ENTERPRISE-2025': { type: 'enterprise', expires: null }
    };
    
    const license = validLicenses[licenseKey];
    
    if (!license) {
        return res.status(400).json({ 
            valid: false, 
            error: 'Invalid license key' 
        });
    }
    
    // Check if license is expired
    if (license.expires && Date.now() > license.expires) {
        return res.status(400).json({ 
            valid: false, 
            error: 'License has expired' 
        });
    }
    
    res.json({
        valid: true,
        licenseType: license.type,
        expires: license.expires,
        validatedAt: Date.now()
    });
});

app.listen(PORT, () => {
    console.log(`RinaWarp Terminal server running on http://localhost:${PORT}`);
    console.log('Environment variables loaded:');
    console.log('- STRIPE_PUBLISHABLE_KEY:', process.env.STRIPE_PUBLISHABLE_KEY ? '✓ Set' : '✗ Missing');
    console.log('- STRIPE_PRICE_PERSONAL:', process.env.STRIPE_PRICE_PERSONAL ? '✓ Set' : '✗ Missing');
    console.log('- STRIPE_PRICE_PROFESSIONAL:', process.env.STRIPE_PRICE_PROFESSIONAL ? '✓ Set' : '✗ Missing');
    console.log('- STRIPE_PRICE_TEAM:', process.env.STRIPE_PRICE_TEAM ? '✓ Set' : '✗ Missing');
});

