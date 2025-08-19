/**
 * A/B Testing System for RinaWarp Terminal
 * Optimizes pricing, messaging, and conversion flows
 */

class ABTestingManager {
  constructor() {
    this.tests = {};
    this.userVariants = {};
    this.analytics = null;
    this.userId = null;
    this.isInitialized = false;

    // Test configurations
    this.testConfigs = {
      pricing_display: {
        name: 'Pricing Display Test',
        description: 'Test different ways of displaying pricing',
        variants: {
          control: { weight: 50 },
          monthly_focus: { weight: 25 },
          annual_discount: { weight: 25 },
        },
        goals: ['purchase_click', 'conversion'],
      },

      cta_buttons: {
        name: 'CTA Button Test',
        description: 'Test different call-to-action button texts',
        variants: {
          control: { weight: 33 },
          urgency: { weight: 33 },
          benefit_focused: { weight: 34 },
        },
        goals: ['button_click', 'purchase_click'],
      },

      purchase_urgency: {
        name: 'Purchase Urgency Test',
        description: 'Test different urgency messaging for purchases',
        variants: {
          control: { weight: 50 },
          limited_time: { weight: 50 },
        },
        goals: ['purchase_click', 'conversion'],
      },

      feature_positioning: {
        name: 'Feature Positioning Test',
        description: 'Test which features to highlight first',
        variants: {
          control: { weight: 33 },
          ai_focused: { weight: 33 },
          productivity_focused: { weight: 34 },
        },
        goals: ['engagement', 'purchase_click'],
      },

      social_proof: {
        name: 'Social Proof Test',
        description: 'Test different types of social proof',
        variants: {
          control: { weight: 25 },
          testimonials: { weight: 25 },
          usage_stats: { weight: 25 },
          github_stars: { weight: 25 },
        },
        goals: ['trust_signal', 'purchase_click'],
      },
    };
  }

  /**
   * Initialize A/B testing system
   */
  async initialize(userId = null) {
    try {
      this.userId = userId || this.generateAnonymousId();

      // Load active tests
      await this.loadActiveTests();

      // Assign user to variants
      this.assignVariants();

      // Load analytics integration
      if (typeof gtag !== 'undefined') {
        this.analytics = 'gtag';
      }

      this.isInitialized = true;
      console.log('A/B Testing initialized for user:', this.userId);
    } catch (error) {
      console.error('A/B Testing initialization failed:', error);
    }
  }

  /**
   * Generate anonymous user ID
   */
  generateAnonymousId() {
    let userId = localStorage.getItem('ab_user_id');
    if (!userId) {
      userId = 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('ab_user_id', userId);
    }
    return userId;
  }

  /**
   * Load active tests from server or local config
   */
  async loadActiveTests() {
    try {
      // In production, this would fetch from your API
      // const response = await fetch('/api/ab-tests/active');
      // this.tests = await response.json();

      // For now, use local configuration
      this.tests = this.testConfigs;
    } catch (error) {
      console.error('Failed to load A/B tests:', error);
      this.tests = this.testConfigs; // Fall back to local config
    }
  }

  /**
   * Assign user to variants for all active tests
   */
  assignVariants() {
    // Load cached assignments
    const cachedAssignments = localStorage.getItem('ab_variants');
    if (cachedAssignments) {
      try {
        this.userVariants = JSON.parse(cachedAssignments);
      } catch (error) {
        console.warn('Invalid cached A/B test assignments');
      }
    }

    // Assign to new tests
    Object.keys(this.tests).forEach(testName => {
      if (!this.userVariants[testName]) {
        this.userVariants[testName] = this.assignVariant(testName);
        this.trackTestExposure(testName, this.userVariants[testName]);
      }
    });

    // Save assignments
    localStorage.setItem('ab_variants', JSON.stringify(this.userVariants));
  }

  /**
   * Assign user to a specific variant for a test
   */
  assignVariant(testName) {
    const test = this.tests[testName];
    if (!test) return 'control';

    // Use consistent hashing based on user ID and test name
    const hash = this.hashString(this.userId + testName);
    const variants = Object.keys(test.variants);

    // Calculate cumulative weights
    let totalWeight = 0;
    const cumulativeWeights = variants.map(variant => {
      totalWeight += test.variants[variant].weight;
      return { variant, cumulativeWeight: totalWeight };
    });

    // Select variant based on hash
    const threshold = ((hash % 100) * totalWeight) / 100;

    for (const { variant, cumulativeWeight } of cumulativeWeights) {
      if (threshold < cumulativeWeight) {
        return variant;
      }
    }

    return variants[0]; // Fallback to first variant
  }

  /**
   * Hash string to number for consistent assignment
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get variant for a specific test
   */
  getVariant(testName) {
    if (!this.isInitialized) {
      console.warn('A/B Testing not initialized');
      return 'control';
    }

    return this.userVariants[testName] || 'control';
  }

  /**
   * Check if user is in a specific variant
   */
  isInVariant(testName, variantName) {
    return this.getVariant(testName) === variantName;
  }

  /**
   * Apply variant-specific changes to the page
   */
  applyVariants() {
    if (!this.isInitialized) return;

    // Apply pricing display variants
    this.applyPricingVariants();

    // Apply CTA button variants
    this.applyCTAVariants();

    // Apply feature positioning variants
    this.applyFeatureVariants();

    // Apply social proof variants
    this.applySocialProofVariants();
  }

  /**
   * Apply pricing display variants
   */
  applyPricingVariants() {
    const variant = this.getVariant('pricing_display');

    switch (variant) {
      case 'monthly_focus':
        // Highlight monthly pricing
        document.querySelectorAll('.pricing-card').forEach(card => {
          const monthlyPrice = card.querySelector('.monthly-price');
          if (monthlyPrice) {
            monthlyPrice.style.fontSize = '1.2em';
            monthlyPrice.style.fontWeight = 'bold';
          }
        });
        break;

      case 'annual_discount':
        // Show annual discount prominently
        const professionalCard = document.querySelector('.pricing-card.featured');
        if (professionalCard) {
          const discount = document.createElement('div');
          discount.className = 'annual-discount-badge';
          discount.innerHTML = '💰 Save 20% with annual billing';
          discount.style.cssText = `
            background: #28a745;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            margin: 10px 0;
            font-size: 0.9em;
            text-align: center;
          `;
          professionalCard.insertBefore(discount, professionalCard.querySelector('.btn'));
        }
        break;
    }
  }

  /**
   * Apply CTA button variants
   */
  applyCTAVariants() {
    const variant = this.getVariant('cta_buttons');

    const buttonTexts = {
      control: {
        trial: 'Start Trial',
        download: 'Download Now',
        upgrade: 'Buy Now - $29/month',
      },
      urgency: {
        trial: 'Start Free Trial Today!',
        download: 'Download Free Now!',
        upgrade: 'Upgrade Now - Limited Time!',
      },
      benefit_focused: {
        trial: 'Get AI-Powered Terminal',
        download: 'Get Advanced Terminal',
        upgrade: 'Unlock All Features - $29/month',
      },
    };

    const texts = buttonTexts[variant] || buttonTexts.control;

    // Update trial buttons
    document.querySelectorAll('[onclick*="startProfessionalTrial"]').forEach(btn => {
      btn.textContent = texts.trial;
    });

    // Update download buttons
    document.querySelectorAll('.btn-primary[href*="releases/"]').forEach(btn => {
      if (btn.textContent.includes('Download')) {
        btn.textContent = texts.download;
      }
    });

    // Update upgrade buttons
    document.querySelectorAll('[onclick*="buyProfessional"]').forEach(btn => {
      btn.textContent = texts.upgrade;
    });
  }

  /**
   * Apply feature positioning variants
   */
  applyFeatureVariants() {
    const variant = this.getVariant('feature_positioning');

    if (variant === 'ai_focused') {
      // Move AI features to the top
      const featuresGrid = document.querySelector('.features-grid');
      if (featuresGrid) {
        const aiFeatures = Array.from(featuresGrid.children).filter(
          card => card.textContent.includes('AI') || card.textContent.includes('intelligence')
        );

        aiFeatures.forEach((card, index) => {
          featuresGrid.insertBefore(card, featuresGrid.children[index]);
        });
      }
    } else if (variant === 'productivity_focused') {
      // Emphasize productivity features
      document.querySelectorAll('.feature-card').forEach(card => {
        if (card.textContent.includes('Fast') || card.textContent.includes('Performance')) {
          card.style.border = '2px solid #FF1493';
          card.style.transform = 'scale(1.02)';
        }
      });
    }
  }

  /**
   * Apply social proof variants
   */
  applySocialProofVariants() {
    const variant = this.getVariant('social_proof');

    // Create social proof element
    const heroSection = document.querySelector('.hero .container');
    if (!heroSection) return;

    let socialProof = document.createElement('div');
    socialProof.className = 'social-proof-test';
    socialProof.style.cssText = `
      margin: 20px 0;
      text-align: center;
      opacity: 0.9;
      font-size: 0.9em;
    `;

    switch (variant) {
      case 'testimonials':
        socialProof.innerHTML = `
          <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px;">
            "RinaWarp Terminal transformed my development workflow!" - Sarah K., Senior Developer
          </div>
        `;
        break;

      case 'usage_stats':
        socialProof.innerHTML = `
          <div style="color: #20B2AA; font-weight: bold;">
            ⚡ 10,000+ developers trust RinaWarp Terminal
          </div>
        `;
        break;

      case 'github_stars':
        socialProof.innerHTML = `
          <div style="color: #20B2AA;">
            ⭐ 4.8/5 stars • 2,000+ GitHub stars • Open source
          </div>
        `;
        break;
    }

    if (variant !== 'control') {
      const insertAfter = heroSection.querySelector('.cta-buttons');
      if (insertAfter) {
        insertAfter.after(socialProof);
      }
    }
  }

  /**
   * Track test exposure
   */
  trackTestExposure(testName, variant) {
    this.trackEvent('ab_test_exposure', {
      test_name: testName,
      variant: variant,
    });
  }

  /**
   * Track goal completion
   */
  trackGoal(goalName, additionalData = {}) {
    if (!this.isInitialized) return;

    // Track for all relevant tests
    Object.keys(this.tests).forEach(testName => {
      const test = this.tests[testName];
      if (test.goals && test.goals.includes(goalName)) {
        const variant = this.getVariant(testName);

        this.trackEvent('ab_test_goal', {
          test_name: testName,
          variant: variant,
          goal: goalName,
          ...additionalData,
        });
      }
    });

    // Track the goal itself
    this.trackEvent(goalName, additionalData);
  }

  /**
   * Track analytics event
   */
  trackEvent(eventName, eventData) {
    try {
      // Google Analytics
      if (this.analytics === 'gtag' && typeof gtag !== 'undefined') {
        gtag('event', eventName, {
          ...eventData,
          user_id: this.userId,
        });
      }

      // Custom analytics endpoint - commented out for static site
      // if (typeof fetch !== 'undefined') {
      //   fetch('/api/analytics/track', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({
      //       event: eventName,
      //       data: eventData,
      //       user_id: this.userId,
      //       timestamp: Date.now(),
      //     }),
      //   }).catch(error => {
      //     console.warn('Analytics tracking failed:', error);
      //   });
      // }

      console.log(`A/B Test Event: ${eventName}`, eventData);
    } catch (error) {
      console.error('Event tracking failed:', error);
    }
  }

  /**
   * Get test results (for admin dashboard)
   */
  async getTestResults(testName) {
    try {
      // This would typically fetch from your analytics API - static site fallback
      // const response = await fetch(`/api/ab-tests/${testName}/results`);
      // return await response.json();
      console.warn("getTestResults is not available on a static site");
      return null;
    } catch (error) {
      console.error('Failed to get test results:', error);
      return null;
    }
  }

  /**
   * Force user into specific variant (for testing)
   */
  forceVariant(testName, variantName) {
    if (this.tests[testName] && this.tests[testName].variants[variantName]) {
      this.userVariants[testName] = variantName;
      localStorage.setItem('ab_variants', JSON.stringify(this.userVariants));
      console.log(`Forced into ${testName}: ${variantName}`);

      // Re-apply variants
      this.applyVariants();
    }
  }

  /**
   * Reset all test assignments
   */
  resetTests() {
    this.userVariants = {};
    localStorage.removeItem('ab_variants');
    console.log('A/B test assignments reset');
  }
}

// Initialize A/B testing when page loads
const abTesting = new ABTestingManager();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    abTesting.initialize();
    setTimeout(() => abTesting.applyVariants(), 100);
  });
} else {
  abTesting.initialize();
  setTimeout(() => abTesting.applyVariants(), 100);
}

// Track page view
setTimeout(() => {
  if (abTesting.isInitialized) {
    abTesting.trackEvent('page_view', {
      page: window.location.pathname,
      referrer: document.referrer,
    });
  }
}, 1000);

// Expose globally for debugging and integration
window.abTesting = abTesting;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ABTestingManager;
}
