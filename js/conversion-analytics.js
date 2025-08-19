/**
 * Conversion Analytics & User Feedback System
 * Copyright (c) 2025 RinaWarp Technologies, LLC
 */

class ConversionAnalytics {
    constructor() {
        this.userId = this.getUserId();
        this.sessionId = this.generateSessionId();
        this.conversionFunnel = [];
        this.userBehavior = [];
        this.exitIntentDetected = false;
        this.init();
    }

    init() {
        this.trackPageLoad();
        this.setupScrollTracking();
        this.setupClickTracking();
        this.setupExitIntentDetection();
        this.setupTimeOnPageTracking();
        this.setupFormAbandonment();
        this.setupFeedbackCollection();
        console.log('🎯 Conversion Analytics initialized for user:', this.userId);
    }

    getUserId() {
        let userId = localStorage.getItem('rinawarp_user_id');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem('rinawarp_user_id', userId);
        }
        return userId;
    }

    generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    trackPageLoad() {
        const pageData = {
            event: 'page_load',
            timestamp: Date.now(),
            url: window.location.href,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            screenResolution: `${screen.width}x${screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`
        };
        
        this.conversionFunnel.push(pageData);
        this.logEvent('📄 Page Load', pageData);
    }

    setupScrollTracking() {
        let maxScroll = 0;
        const scrollMilestones = [25, 50, 75, 90];
        const reachedMilestones = new Set();

        window.addEventListener('scroll', () => {
            const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
            maxScroll = Math.max(maxScroll, scrollPercent);

            scrollMilestones.forEach(milestone => {
                if (scrollPercent >= milestone && !reachedMilestones.has(milestone)) {
                    reachedMilestones.add(milestone);
                    this.trackEvent('scroll_milestone', {
                        milestone: milestone,
                        time_to_reach: Date.now() - performance.timing.navigationStart
                    });
                }
            });
        });

        // Track max scroll on page unload
        window.addEventListener('beforeunload', () => {
            this.trackEvent('max_scroll_reached', { maxScroll });
        });
    }

    setupClickTracking() {
        // Track CTA button clicks
        document.addEventListener('click', (e) => {
            const element = e.target;
            const isButton = element.tagName === 'BUTTON' || element.tagName === 'A';
            const isPricingCTA = element.closest('.btn-primary, .buy-button, [onclick*="buyProfessional"]');
            const isDownloadCTA = element.closest('[href*="download"], .download-button');
            
            if (isButton) {
                this.trackEvent('button_click', {
                    text: element.textContent.trim(),
                    className: element.className,
                    section: this.getCurrentSection(element),
                    isPricing: !!isPricingCTA,
                    isDownload: !!isDownloadCTA
                });

                // Special tracking for conversion buttons
                if (isPricingCTA) {
                    this.trackConversionAttempt('pricing_click', element);
                } else if (isDownloadCTA) {
                    this.trackConversionAttempt('download_click', element);
                }
            }
        });
    }

    setupExitIntentDetection() {
        let mouseLeaveDetected = false;
        
        document.addEventListener('mouseleave', (e) => {
            if (!mouseLeaveDetected && e.clientY <= 0) {
                mouseLeaveDetected = true;
                this.exitIntentDetected = true;
                this.handleExitIntent();
            }
        });

        // Mobile: detect rapid back gestures or tab switching
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && !this.exitIntentDetected) {
                this.exitIntentDetected = true;
                this.handleExitIntent();
            }
        });
    }

    handleExitIntent() {
        this.trackEvent('exit_intent_detected', {
            timeOnPage: Date.now() - performance.timing.navigationStart,
            scrollDepth: this.getScrollPercent()
        });

        // Show exit survey after a brief delay
        setTimeout(() => {
            this.showExitSurvey();
        }, 500);
    }

    showExitSurvey() {
        if (document.getElementById('exit-survey-modal')) return; // Already shown

        const modal = document.createElement('div');
        modal.id = 'exit-survey-modal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; justify-content: center; align-items: center;">
                <div style="background: linear-gradient(135deg, #1976d2, #26c6da); padding: 30px; border-radius: 15px; max-width: 500px; margin: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                    <h3 style="color: white; margin-bottom: 15px; font-size: 1.4rem;">Wait! Help us improve 🚀</h3>
                    <p style="color: #e0ffff; margin-bottom: 20px;">What almost made you try RinaWarp Terminal?</p>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; color: white; margin-bottom: 10px; cursor: pointer;">
                            <input type="radio" name="exit-reason" value="price" style="margin-right: 8px;"> Price concerns
                        </label>
                        <label style="display: block; color: white; margin-bottom: 10px; cursor: pointer;">
                            <input type="radio" name="exit-reason" value="features" style="margin-right: 8px;"> Not enough features
                        </label>
                        <label style="display: block; color: white; margin-bottom: 10px; cursor: pointer;">
                            <input type="radio" name="exit-reason" value="trust" style="margin-right: 8px;"> Need more proof/testimonials
                        </label>
                        <label style="display: block; color: white; margin-bottom: 10px; cursor: pointer;">
                            <input type="radio" name="exit-reason" value="comparison" style="margin-right: 8px;"> Want to compare alternatives
                        </label>
                        <label style="display: block; color: white; margin-bottom: 10px; cursor: pointer;">
                            <input type="radio" name="exit-reason" value="later" style="margin-right: 8px;"> Will decide later
                        </label>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="conversionAnalytics.submitExitSurvey()" style="flex: 1; background: linear-gradient(135deg, #ff69b4, #ff1493); color: white; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">Submit</button>
                        <button onclick="conversionAnalytics.closeExitSurvey()" style="flex: 1; background: rgba(255,255,255,0.2); color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer;">Skip</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        this.trackEvent('exit_survey_shown', {});
    }

    submitExitSurvey() {
        const selectedReason = document.querySelector('input[name="exit-reason"]:checked');
        const reason = selectedReason ? selectedReason.value : 'no_selection';
        
        this.trackEvent('exit_survey_submitted', {
            reason: reason,
            timeToSubmit: Date.now() - performance.timing.navigationStart
        });

        // Show thank you and offer incentive
        const modal = document.getElementById('exit-survey-modal');
        if (modal) {
            modal.innerHTML = `
                <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; justify-content: center; align-items: center;">
                    <div style="background: linear-gradient(135deg, #26c6da, #ff69b4); padding: 30px; border-radius: 15px; max-width: 500px; margin: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); text-align: center;">
                        <h3 style="color: white; margin-bottom: 15px;">Thanks for the feedback! 🙏</h3>
                        <p style="color: #e0ffff; margin-bottom: 20px;">Get 50% off your first month with code: <strong style="color: #ff5722;">FEEDBACK50</strong></p>
                        <button onclick="conversionAnalytics.closeExitSurvey()" style="background: linear-gradient(135deg, #ff69b4, #ff1493); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">Continue Browsing</button>
                    </div>
                </div>
            `;
        }
    }

    closeExitSurvey() {
        const modal = document.getElementById('exit-survey-modal');
        if (modal) {
            modal.remove();
        }
    }

    setupTimeOnPageTracking() {
        const timeCheckpoints = [10, 30, 60, 120, 300]; // seconds
        const reachedCheckpoints = new Set();

        setInterval(() => {
            const timeOnPage = Math.floor((Date.now() - performance.timing.navigationStart) / 1000);
            
            timeCheckpoints.forEach(checkpoint => {
                if (timeOnPage >= checkpoint && !reachedCheckpoints.has(checkpoint)) {
                    reachedCheckpoints.add(checkpoint);
                    this.trackEvent('time_on_page', {
                        seconds: checkpoint,
                        engagement_level: this.calculateEngagement(checkpoint)
                    });
                }
            });
        }, 5000);
    }

    setupFormAbandonment() {
        // Track interaction with pricing/contact forms
        document.addEventListener('focus', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                this.trackEvent('form_field_focus', {
                    fieldType: e.target.type || e.target.tagName,
                    fieldName: e.target.name || e.target.id
                });
            }
        });

        document.addEventListener('blur', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                this.trackEvent('form_field_blur', {
                    fieldType: e.target.type || e.target.tagName,
                    fieldName: e.target.name || e.target.id,
                    hasValue: !!e.target.value
                });
            }
        });
    }

    setupFeedbackCollection() {
        // Add floating feedback button if it doesn't exist
        if (!document.querySelector('.conversion-feedback-btn')) {
            const feedbackBtn = document.createElement('button');
            feedbackBtn.className = 'conversion-feedback-btn';
            feedbackBtn.innerHTML = '💬 Quick Feedback';
            feedbackBtn.style.cssText = `
                position: fixed;
                bottom: 30px;
                left: 30px;
                background: linear-gradient(135deg, #26c6da, #2196f3);
                color: white;
                border: none;
                padding: 15px 20px;
                border-radius: 25px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 6px 20px rgba(38, 198, 218, 0.4);
                transition: all 0.3s ease;
                z-index: 1000;
                font-size: 14px;
            `;
            
            feedbackBtn.addEventListener('click', () => {
                this.showQuickFeedback();
            });

            document.body.appendChild(feedbackBtn);
        }
    }

    showQuickFeedback() {
        const modal = document.createElement('div');
        modal.id = 'quick-feedback-modal';
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10001; display: flex; justify-content: center; align-items: center;">
                <div style="background: linear-gradient(135deg, #2196f3, #26c6da); padding: 30px; border-radius: 15px; max-width: 500px; margin: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                    <h3 style="color: white; margin-bottom: 15px;">What's preventing you from trying RinaWarp? 🤔</h3>
                    <textarea id="feedback-text" placeholder="Tell us what would make you more likely to download or purchase..." style="width: 100%; height: 100px; padding: 10px; border: none; border-radius: 8px; margin-bottom: 15px; font-family: inherit;"></textarea>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="conversionAnalytics.submitQuickFeedback()" style="flex: 1; background: linear-gradient(135deg, #ff69b4, #ff1493); color: white; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">Send Feedback</button>
                        <button onclick="conversionAnalytics.closeQuickFeedback()" style="flex: 1; background: rgba(255,255,255,0.2); color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer;">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    submitQuickFeedback() {
        const feedback = document.getElementById('feedback-text').value;
        
        this.trackEvent('quick_feedback_submitted', {
            feedback: feedback,
            length: feedback.length,
            timeOnPage: Date.now() - performance.timing.navigationStart
        });

        this.closeQuickFeedback();
        
        // Show thank you
        const thankYou = document.createElement('div');
        thankYou.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #00ff88, #26c6da);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 10002;
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        `;
        thankYou.textContent = '✅ Thanks! Your feedback helps us improve.';
        document.body.appendChild(thankYou);
        
        setTimeout(() => thankYou.remove(), 4000);
    }

    closeQuickFeedback() {
        const modal = document.getElementById('quick-feedback-modal');
        if (modal) modal.remove();
    }

    trackConversionAttempt(type, element) {
        this.trackEvent('conversion_attempt', {
            type: type,
            element: element.textContent.trim(),
            section: this.getCurrentSection(element),
            timeToConvert: Date.now() - performance.timing.navigationStart,
            scrollDepth: this.getScrollPercent(),
            previousEvents: this.conversionFunnel.length
        });
    }

    trackEvent(event, data) {
        const eventData = {
            event: event,
            timestamp: Date.now(),
            userId: this.userId,
            sessionId: this.sessionId,
            ...data
        };

        this.conversionFunnel.push(eventData);
        this.logEvent(`🎯 ${event}`, eventData);

        // Send to analytics (in a real app, this would go to your analytics service)
        this.sendToAnalytics(eventData);
    }

    getCurrentSection(element) {
        const sections = ['hero', 'features', 'pricing', 'download', 'testimonials'];
        const rect = element.getBoundingClientRect();
        const elementY = rect.top + window.scrollY;

        for (const section of sections) {
            const sectionEl = document.getElementById(section) || document.querySelector(`.${section}`);
            if (sectionEl) {
                const sectionRect = sectionEl.getBoundingClientRect();
                const sectionY = sectionRect.top + window.scrollY;
                if (elementY >= sectionY && elementY <= sectionY + sectionEl.offsetHeight) {
                    return section;
                }
            }
        }
        return 'unknown';
    }

    getScrollPercent() {
        return Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    }

    calculateEngagement(timeOnPage) {
        if (timeOnPage >= 300) return 'very_high';
        if (timeOnPage >= 120) return 'high';
        if (timeOnPage >= 60) return 'medium';
        if (timeOnPage >= 30) return 'low';
        return 'very_low';
    }

    logEvent(message, data) {
        console.log(message, data);
    }

    sendToAnalytics(eventData) {
        // In a real application, send to your analytics service
        // fetch('/api/analytics', { method: 'POST', body: JSON.stringify(eventData) });
        
        // For now, store in localStorage for debugging
        const analyticsData = JSON.parse(localStorage.getItem('rinawarp_analytics') || '[]');
        analyticsData.push(eventData);
        
        // Keep only last 100 events
        if (analyticsData.length > 100) {
            analyticsData.splice(0, analyticsData.length - 100);
        }
        
        localStorage.setItem('rinawarp_analytics', JSON.stringify(analyticsData));
    }

    // Method to get conversion insights (for debugging/analysis)
    getConversionInsights() {
        const analytics = JSON.parse(localStorage.getItem('rinawarp_analytics') || '[]');
        
        const insights = {
            totalEvents: analytics.length,
            conversionAttempts: analytics.filter(e => e.event === 'conversion_attempt').length,
            exitIntentTriggers: analytics.filter(e => e.event === 'exit_intent_detected').length,
            averageTimeOnPage: this.getAverageTimeOnPage(analytics),
            commonExitReasons: this.getCommonExitReasons(analytics),
            scrollDepths: analytics.filter(e => e.event === 'scroll_milestone').map(e => e.milestone)
        };

        console.log('📊 Conversion Insights:', insights);
        return insights;
    }

    getAverageTimeOnPage(analytics) {
        const timeEvents = analytics.filter(e => e.timeOnPage);
        return timeEvents.length > 0 
            ? Math.round(timeEvents.reduce((sum, e) => sum + e.timeOnPage, 0) / timeEvents.length / 1000)
            : 0;
    }

    getCommonExitReasons(analytics) {
        const exitReasons = analytics.filter(e => e.event === 'exit_survey_submitted').map(e => e.reason);
        const reasonCounts = {};
        exitReasons.forEach(reason => {
            reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });
        return Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);
    }
}

// Initialize conversion analytics
window.conversionAnalytics = new ConversionAnalytics();

// Expose method to get insights in console
window.getConversionInsights = () => window.conversionAnalytics.getConversionInsights();
