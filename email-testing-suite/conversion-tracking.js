/**
 * RinaWarp Beta Sign-up Conversion Tracking System
 * Tracks conversions, integrates with analytics, and provides real-time notifications
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

class ConversionTracker {
    constructor() {
        this.conversions = [];
        this.trackingPixels = new Map();
        this.webhookEndpoints = [];
        this.analyticsConfig = {
            googleAnalytics: {
                trackingId: process.env.GA_TRACKING_ID || 'UA-XXXXXXX-X',
                enabled: true
            },
            mixpanel: {
                token: process.env.MIXPANEL_TOKEN || 'your-mixpanel-token',
                enabled: false
            },
            customEndpoint: {
                url: process.env.CUSTOM_ANALYTICS_URL || 'https://your-domain.com/api/track',
                enabled: false
            }
        };
        
        this.utmMappings = {
            'utm_source': 'source',
            'utm_medium': 'medium', 
            'utm_campaign': 'campaign',
            'utm_term': 'term',
            'utm_content': 'content'
        };
    }

    /**
     * Generate tracking pixel HTML for email templates
     */
    generateTrackingPixel(userId, emailId, campaignId) {
        const pixelId = crypto.randomBytes(16).toString('hex');
        const trackingUrl = `https://your-domain.com/track/pixel/${pixelId}`;
        
        const pixelData = {
            pixelId,
            userId,
            emailId,
            campaignId,
            timestamp: new Date().toISOString(),
            type: 'email_open'
        };
        
        this.trackingPixels.set(pixelId, pixelData);
        
        // Return HTML pixel
        return `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;
    }

    /**
     * Generate conversion tracking code for sign-up forms
     */
    generateConversionTrackingCode(formId, campaignId) {
        return `
<script>
(function() {
    // RinaWarp Conversion Tracking
    window.RinaWarpTracker = window.RinaWarpTracker || {};
    
    RinaWarpTracker.trackConversion = function(formData) {
        const conversionData = {
            formId: '${formId}',
            campaignId: '${campaignId}',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            url: window.location.href,
            utmParams: RinaWarpTracker.getUtmParams(),
            formData: formData
        };
        
        // Send to tracking endpoint
        fetch('/api/track/conversion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(conversionData)
        }).catch(console.error);
        
        // Send to Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'conversion', {
                'send_to': '${this.analyticsConfig.googleAnalytics.trackingId}',
                'value': 1,
                'currency': 'USD',
                'event_category': 'Beta Signup',
                'event_label': '${campaignId}'
            });
        }
        
        // Send to Mixpanel
        if (typeof mixpanel !== 'undefined') {
            mixpanel.track('Beta Signup', {
                'Campaign ID': '${campaignId}',
                'Form ID': '${formId}',
                'UTM Source': conversionData.utmParams.source,
                'UTM Medium': conversionData.utmParams.medium,
                'UTM Campaign': conversionData.utmParams.campaign
            });
        }
    };
    
    RinaWarpTracker.getUtmParams = function() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            source: urlParams.get('utm_source'),
            medium: urlParams.get('utm_medium'),
            campaign: urlParams.get('utm_campaign'),
            term: urlParams.get('utm_term'),
            content: urlParams.get('utm_content')
        };
    };
    
    // Auto-track form submissions
    document.addEventListener('DOMContentLoaded', function() {
        const forms = document.querySelectorAll('form[data-track-conversion]');
        forms.forEach(function(form) {
            form.addEventListener('submit', function(e) {
                const formData = new FormData(form);
                const data = Object.fromEntries(formData);
                RinaWarpTracker.trackConversion(data);
            });
        });
    });
})();
</script>`;
    }

    /**
     * Track email open events
     */
    async trackEmailOpen(pixelId, req) {
        const pixelData = this.trackingPixels.get(pixelId);
        if (!pixelData) {
            console.log(`Unknown pixel ID: ${pixelId}`);
            return false;
        }

        const openEvent = {
            ...pixelData,
            type: 'email_open',
            timestamp: new Date().toISOString(),
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip,
            referer: req.headers.referer
        };

        await this.recordEvent(openEvent);
        return true;
    }

    /**
     * Track conversion events
     */
    async trackConversion(conversionData) {
        const conversion = {
            id: crypto.randomBytes(16).toString('hex'),
            timestamp: new Date().toISOString(),
            type: 'beta_signup',
            ...conversionData
        };

        this.conversions.push(conversion);
        await this.recordEvent(conversion);
        await this.sendWebhookNotifications(conversion);
        await this.sendToAnalytics(conversion);
        
        console.log(`✅ Conversion tracked: ${conversion.id}`);
        return conversion;
    }

    /**
     * Record event to storage
     */
    async recordEvent(event) {
        const eventLogPath = path.join(__dirname, 'tracking-events.json');
        let events = [];

        if (fs.existsSync(eventLogPath)) {
            const data = fs.readFileSync(eventLogPath, 'utf8');
            events = JSON.parse(data);
        }

        events.push(event);
        fs.writeFileSync(eventLogPath, JSON.stringify(events, null, 2));
    }

    /**
     * Send webhook notifications for immediate alerts
     */
    async sendWebhookNotifications(conversion) {
        const webhookPayload = {
            event: 'beta_signup',
            data: conversion,
            timestamp: new Date().toISOString()
        };

        // Default webhook endpoints
        const webhooks = [
            process.env.SLACK_WEBHOOK_URL,
            process.env.DISCORD_WEBHOOK_URL,
            process.env.CUSTOM_WEBHOOK_URL
        ].filter(Boolean);

        for (const webhookUrl of webhooks) {
            try {
                await axios.post(webhookUrl, {
                    text: `🎉 New Beta Sign-up!
                    
📧 Email: ${conversion.formData?.email || 'N/A'}
📝 Name: ${conversion.formData?.name || 'N/A'}
🏢 Company: ${conversion.formData?.company || 'N/A'}
📊 Campaign: ${conversion.campaignId}
🔗 Source: ${conversion.utmParams?.source || 'Direct'}
⏰ Time: ${new Date(conversion.timestamp).toLocaleString()}`,
                    
                    attachments: [{
                        color: 'good',
                        fields: [
                            {
                                title: 'UTM Source',
                                value: conversion.utmParams?.source || 'Direct',
                                short: true
                            },
                            {
                                title: 'UTM Medium',
                                value: conversion.utmParams?.medium || 'N/A',
                                short: true
                            },
                            {
                                title: 'Campaign',
                                value: conversion.campaignId,
                                short: true
                            },
                            {
                                title: 'User Agent',
                                value: conversion.userAgent?.slice(0, 50) + '...',
                                short: false
                            }
                        ]
                    }]
                });
                
                console.log(`✅ Webhook notification sent to: ${webhookUrl}`);
            } catch (error) {
                console.error(`❌ Failed to send webhook to ${webhookUrl}:`, error.message);
            }
        }
    }

    /**
     * Send data to analytics platforms
     */
    async sendToAnalytics(conversion) {
        // Google Analytics
        if (this.analyticsConfig.googleAnalytics.enabled) {
            try {
                await this.sendToGoogleAnalytics(conversion);
            } catch (error) {
                console.error('❌ Google Analytics error:', error.message);
            }
        }

        // Mixpanel
        if (this.analyticsConfig.mixpanel.enabled) {
            try {
                await this.sendToMixpanel(conversion);
            } catch (error) {
                console.error('❌ Mixpanel error:', error.message);
            }
        }

        // Custom endpoint
        if (this.analyticsConfig.customEndpoint.enabled) {
            try {
                await this.sendToCustomEndpoint(conversion);
            } catch (error) {
                console.error('❌ Custom endpoint error:', error.message);
            }
        }
    }

    /**
     * Send to Google Analytics (Measurement Protocol)
     */
    async sendToGoogleAnalytics(conversion) {
        const payload = {
            v: '1',
            tid: this.analyticsConfig.googleAnalytics.trackingId,
            cid: conversion.id,
            t: 'event',
            ec: 'Beta Signup',
            ea: 'conversion',
            el: conversion.campaignId,
            ev: 1,
            cs: conversion.utmParams?.source,
            cm: conversion.utmParams?.medium,
            cn: conversion.utmParams?.campaign,
            ck: conversion.utmParams?.term,
            cc: conversion.utmParams?.content
        };

        const params = new URLSearchParams(payload);
        
        await axios.post('https://www.google-analytics.com/collect', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        console.log('✅ Sent to Google Analytics');
    }

    /**
     * Send to Mixpanel
     */
    async sendToMixpanel(conversion) {
        const eventData = {
            event: 'Beta Signup',
            properties: {
                token: this.analyticsConfig.mixpanel.token,
                distinct_id: conversion.formData?.email || conversion.id,
                'Campaign ID': conversion.campaignId,
                'Form ID': conversion.formId,
                'UTM Source': conversion.utmParams?.source,
                'UTM Medium': conversion.utmParams?.medium,
                'UTM Campaign': conversion.utmParams?.campaign,
                'UTM Term': conversion.utmParams?.term,
                'UTM Content': conversion.utmParams?.content,
                'User Agent': conversion.userAgent,
                'Referrer': conversion.referrer,
                'Email': conversion.formData?.email,
                'Name': conversion.formData?.name,
                'Company': conversion.formData?.company,
                time: Math.floor(new Date(conversion.timestamp).getTime() / 1000)
            }
        };

        const data = Buffer.from(JSON.stringify(eventData)).toString('base64');
        
        await axios.post('https://api.mixpanel.com/track', {
            data: data
        });
        
        console.log('✅ Sent to Mixpanel');
    }

    /**
     * Send to custom analytics endpoint
     */
    async sendToCustomEndpoint(conversion) {
        await axios.post(this.analyticsConfig.customEndpoint.url, {
            event: 'beta_signup',
            data: conversion
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.CUSTOM_ANALYTICS_TOKEN}`
            }
        });
        
        console.log('✅ Sent to custom endpoint');
    }

    /**
     * Generate daily performance report
     */
    generateDailyReport(date = new Date()) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        const eventLogPath = path.join(__dirname, 'tracking-events.json');
        if (!fs.existsSync(eventLogPath)) {
            return { error: 'No tracking data available' };
        }

        const events = JSON.parse(fs.readFileSync(eventLogPath, 'utf8'));
        const dailyEvents = events.filter(event => {
            const eventDate = new Date(event.timestamp);
            return eventDate >= startDate && eventDate <= endDate;
        });

        const opens = dailyEvents.filter(e => e.type === 'email_open');
        const conversions = dailyEvents.filter(e => e.type === 'beta_signup');

        const report = {
            date: date.toISOString().split('T')[0],
            metrics: {
                totalEvents: dailyEvents.length,
                emailOpens: opens.length,
                conversions: conversions.length,
                conversionRate: opens.length > 0 ? ((conversions.length / opens.length) * 100).toFixed(2) : 0
            },
            conversions: conversions.map(c => ({
                id: c.id,
                timestamp: c.timestamp,
                email: c.formData?.email,
                source: c.utmParams?.source,
                campaign: c.campaignId
            })),
            topSources: this.getTopSources(conversions),
            topCampaigns: this.getTopCampaigns(conversions)
        };

        return report;
    }

    /**
     * Get top traffic sources
     */
    getTopSources(conversions) {
        const sources = {};
        conversions.forEach(c => {
            const source = c.utmParams?.source || 'Direct';
            sources[source] = (sources[source] || 0) + 1;
        });

        return Object.entries(sources)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([source, count]) => ({ source, count }));
    }

    /**
     * Get top campaigns
     */
    getTopCampaigns(conversions) {
        const campaigns = {};
        conversions.forEach(c => {
            const campaign = c.campaignId || 'Unknown';
            campaigns[campaign] = (campaigns[campaign] || 0) + 1;
        });

        return Object.entries(campaigns)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([campaign, count]) => ({ campaign, count }));
    }

    /**
     * Save daily report to file
     */
    saveDailyReport(date = new Date()) {
        const report = this.generateDailyReport(date);
        const reportPath = path.join(__dirname, `daily-report-${date.toISOString().split('T')[0]}.json`);
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📊 Daily report saved: ${reportPath}`);
        
        return report;
    }

    /**
     * Get conversion statistics
     */
    getConversionStats(days = 7) {
        const eventLogPath = path.join(__dirname, 'tracking-events.json');
        if (!fs.existsSync(eventLogPath)) {
            return { error: 'No tracking data available' };
        }

        const events = JSON.parse(fs.readFileSync(eventLogPath, 'utf8'));
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const recentEvents = events.filter(event => {
            return new Date(event.timestamp) >= cutoffDate;
        });

        const opens = recentEvents.filter(e => e.type === 'email_open');
        const conversions = recentEvents.filter(e => e.type === 'beta_signup');

        return {
            period: `${days} days`,
            totalEvents: recentEvents.length,
            emailOpens: opens.length,
            conversions: conversions.length,
            conversionRate: opens.length > 0 ? ((conversions.length / opens.length) * 100).toFixed(2) : 0,
            averageDaily: (conversions.length / days).toFixed(1),
            topSources: this.getTopSources(conversions),
            topCampaigns: this.getTopCampaigns(conversions)
        };
    }
}

module.exports = ConversionTracker;

// Example usage if run directly
if (require.main === module) {
    const tracker = new ConversionTracker();
    
    // Example: Generate tracking code
    const trackingCode = tracker.generateConversionTrackingCode('beta-signup-form', 'beta-launch-2024');
    console.log('Tracking code generated:');
    console.log(trackingCode);
    
    // Example: Generate daily report
    const report = tracker.generateDailyReport();
    console.log('\nDaily report:');
    console.log(JSON.stringify(report, null, 2));
}
