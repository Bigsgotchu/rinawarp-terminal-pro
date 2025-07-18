/**
 * RinaWarp Email Personalization Engine
 * Handles merge tags, dynamic content, A/B testing, and behavior-triggered sequences
 */

import crypto from 'crypto';

class EmailPersonalizationEngine {
  constructor() {
    this.mergeTagPatterns = {
      firstName: /\{\{firstName\}\}/g,
      companyName: /\{\{companyName\}\}/g,
      audienceType: /\{\{audienceType\}\}/g,
      uniqueCode: /\{\{uniqueCode\}\}/g,
      customField: /\{\{([^}]+)\}\}/g,
    };

    this.audienceSegments = {
      early_adopter: {
        type: 'early_adopter',
        discountPrefix: 'BETA-DEV',
        pricingTier: 'developer',
        contentBlocks: ['cutting_edge_features', 'early_access_benefits', 'beta_community'],
      },
      developer: {
        type: 'developer',
        discountPrefix: 'BETA-DEV',
        pricingTier: 'developer',
        contentBlocks: ['technical_features', 'developer_workflow', 'integration_capabilities'],
      },
      enterprise_lead: {
        type: 'enterprise_lead',
        discountPrefix: 'BETA-ENT',
        pricingTier: 'enterprise',
        contentBlocks: ['enterprise_features', 'team_collaboration', 'security_compliance'],
      },
      decision_maker: {
        type: 'decision_maker',
        discountPrefix: 'BETA-PWR',
        pricingTier: 'power',
        contentBlocks: ['roi_metrics', 'business_impact', 'team_productivity'],
      },
      individual_user: {
        type: 'individual_user',
        discountPrefix: 'BETA-DEV',
        pricingTier: 'individual',
        contentBlocks: ['personal_productivity', 'workflow_optimization', 'learning_resources'],
      },
    };

    this.abTestVariants = {
      subject_lines: [
        {
          variant: 'A',
          template: "You're invited to RinaWarp Beta, {{firstName}}!",
          weight: 33,
        },
        {
          variant: 'B',
          template: 'Transform your terminal with AI, {{firstName}}',
          weight: 33,
        },
        {
          variant: 'C',
          template: '{{companyName}} - Your RinaWarp Beta access is ready',
          weight: 34,
        },
      ],
      call_to_action: [
        {
          variant: 'A',
          template: 'Join Beta Now',
          weight: 50,
        },
        {
          variant: 'B',
          template: 'Start Your Beta Journey',
          weight: 50,
        },
      ],
    };

    this.behaviorTriggers = {
      email_opened: {
        delay: 24, // hours
        template: 'follow_up_opened',
        conditions: { clicked: false },
      },
      link_clicked: {
        delay: 2, // hours
        template: 'follow_up_clicked',
        conditions: { signed_up: false },
      },
      signup_started: {
        delay: 1, // hours
        template: 'signup_assistance',
        conditions: { completed: false },
      },
      no_engagement: {
        delay: 168, // 7 days
        template: 're_engagement',
        conditions: { opened: false, clicked: false },
      },
    };
  }

  /**
   * Generate personalized email content
   * @param {Object} recipient - Recipient data
   * @param {string} template - Email template
   * @param {Object} options - Personalization options
   * @returns {Object} Personalized email content
   */
  personalizeEmail(recipient, template, options = {}) {
    const segment =
      this.audienceSegments[recipient.audience_type] || this.audienceSegments['individual_user'];
    const uniqueCode = this.generateUniqueCode(recipient.user_id);
    const discountCode = `${segment.discountPrefix}-${uniqueCode}`;

    // Apply merge tags
    let personalizedContent = this.applyMergeTags(template, {
      firstName: recipient.firstName || recipient.name || 'Valued User',
      companyName: recipient.companyName || recipient.company || 'Your Organization',
      audienceType: segment.type,
      uniqueCode: uniqueCode,
      discountCode: discountCode,
      ...recipient.customFields,
    });

    // Apply dynamic content blocks
    personalizedContent = this.applyDynamicContent(personalizedContent, segment);

    // Apply A/B testing variants
    const abTestResults = this.applyAbTesting(personalizedContent, recipient, options);

    // Generate dynamic pricing
    const pricingTable = this.generatePricingTable(segment.pricingTier, discountCode);

    return {
      content: abTestResults.content,
      subject: abTestResults.subject,
      discountCode: discountCode,
      pricingTable: pricingTable,
      abTestVariant: abTestResults.variant,
      audienceSegment: segment.type,
      personalizedElements: {
        mergeTags: this.extractMergeTags(template),
        dynamicBlocks: segment.contentBlocks,
        behaviorTriggers: this.getBehaviorTriggers(recipient),
      },
    };
  }

  /**
   * Apply merge tags to template
   * @param {string} template - Email template
   * @param {Object} data - Merge tag data
   * @returns {string} Template with merge tags replaced
   */
  applyMergeTags(template, data) {
    let result = template;

    Object.keys(data).forEach(key => {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(pattern, data[key] || '');
    });

    return result;
  }

  /**
   * Apply dynamic content blocks based on audience segment
   * @param {string} content - Email content
   * @param {Object} segment - Audience segment data
   * @returns {string} Content with dynamic blocks
   */
  applyDynamicContent(content, segment) {
    const dynamicBlocks = {
      cutting_edge_features: `
                <div class="dynamic-block early-adopter">
                    <h3>🚀 Early Access Features</h3>
                    <ul>
                        <li>Advanced AI command suggestions</li>
                        <li>Custom workflow automation</li>
                        <li>Beta community access</li>
                        <li>Direct feedback channel to dev team</li>
                    </ul>
                </div>
            `,
      technical_features: `
                <div class="dynamic-block developer">
                    <h3>🔧 Developer-Focused Features</h3>
                    <ul>
                        <li>IDE integration plugins</li>
                        <li>Git workflow optimization</li>
                        <li>Custom command scripting</li>
                        <li>API access for extensions</li>
                    </ul>
                </div>
            `,
      enterprise_features: `
                <div class="dynamic-block enterprise">
                    <h3>🏢 Enterprise-Ready Capabilities</h3>
                    <ul>
                        <li>Team collaboration tools</li>
                        <li>Advanced security controls</li>
                        <li>Audit logging and compliance</li>
                        <li>SSO integration</li>
                    </ul>
                </div>
            `,
      roi_metrics: `
                <div class="dynamic-block roi">
                    <h3>📊 Business Impact</h3>
                    <div class="metrics">
                        <div class="metric">
                            <span class="value">40%</span>
                            <span class="label">Faster Development</span>
                        </div>
                        <div class="metric">
                            <span class="value">25%</span>
                            <span class="label">Reduced Errors</span>
                        </div>
                        <div class="metric">
                            <span class="value">60%</span>
                            <span class="label">Team Productivity</span>
                        </div>
                    </div>
                </div>
            `,
      personal_productivity: `
                <div class="dynamic-block personal">
                    <h3>⚡ Personal Productivity Boost</h3>
                    <ul>
                        <li>Intelligent command completion</li>
                        <li>Personalized shortcuts</li>
                        <li>Learning path recommendations</li>
                        <li>Workflow optimization tips</li>
                    </ul>
                </div>
            `,
    };

    let result = content;

    // Replace dynamic content placeholders
    segment.contentBlocks.forEach(blockName => {
      const placeholder = `{{dynamic_${blockName}}}`;
      const blockContent = dynamicBlocks[blockName] || '';
      result = result.replace(placeholder, blockContent);
    });

    return result;
  }

  /**
   * Apply A/B testing variants
   * @param {string} content - Email content
   * @param {Object} recipient - Recipient data
   * @param {Object} options - Testing options
   * @returns {Object} Content with A/B variants applied
   */
  applyAbTesting(content, recipient, options = {}) {
    const userId = recipient.user_id;
    const hash = crypto.createHash('md5').update(userId).digest('hex');
    const hashValue = parseInt(hash.substring(0, 8), 16);

    // Subject line A/B testing
    const subjectVariant = this.selectAbTestVariant(this.abTestVariants.subject_lines, hashValue);

    // Call-to-action A/B testing
    const ctaVariant = this.selectAbTestVariant(this.abTestVariants.call_to_action, hashValue + 1);

    let personalizedContent = content;
    let personalizedSubject = this.applyMergeTags(subjectVariant.template, {
      firstName: recipient.firstName || recipient.name || 'Valued User',
      companyName: recipient.companyName || recipient.company || 'Your Organization',
    });

    // Replace CTA placeholders
    personalizedContent = personalizedContent.replace(/\{\{cta_text\}\}/g, ctaVariant.template);

    return {
      content: personalizedContent,
      subject: personalizedSubject,
      variant: {
        subject: subjectVariant.variant,
        cta: ctaVariant.variant,
      },
    };
  }

  /**
   * Select A/B test variant based on user hash
   * @param {Array} variants - Available variants
   * @param {number} hashValue - User hash value
   * @returns {Object} Selected variant
   */
  selectAbTestVariant(variants, hashValue) {
    const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0);
    const selector = hashValue % totalWeight;

    let currentWeight = 0;
    for (const variant of variants) {
      currentWeight += variant.weight;
      if (selector < currentWeight) {
        return variant;
      }
    }

    return variants[0]; // Fallback
  }

  /**
   * Generate unique discount code
   * @param {string} userId - User ID
   * @returns {string} Unique code
   */
  generateUniqueCode(userId) {
    const hash = crypto
      .createHash('md5')
      .update(userId + Date.now().toString())
      .digest('hex');
    return hash.substring(0, 8).toUpperCase();
  }

  /**
   * Generate dynamic pricing table
   * @param {string} tier - Pricing tier
   * @param {string} discountCode - Discount code
   * @returns {string} HTML pricing table
   */
  generatePricingTable(tier, discountCode) {
    const pricingTiers = {
      individual: {
        original: 29,
        discounted: 19,
        features: ['Personal AI assistant', 'Basic automation', 'Community support'],
      },
      developer: {
        original: 59,
        discounted: 39,
        features: [
          'Advanced AI features',
          'IDE integrations',
          'Priority support',
          'Custom workflows',
        ],
      },
      power: {
        original: 99,
        discounted: 69,
        features: [
          'Team collaboration',
          'Advanced analytics',
          'Custom integrations',
          'Dedicated support',
        ],
      },
      enterprise: {
        original: 199,
        discounted: 149,
        features: ['SSO integration', 'Advanced security', 'Audit logging', 'Custom deployment'],
      },
    };

    const pricing = pricingTiers[tier] || pricingTiers.individual;
    const savings = pricing.original - pricing.discounted;
    const savingsPercent = Math.round((savings / pricing.original) * 100);

    return `
            <div class="pricing-table">
                <div class="pricing-header">
                    <h3>Special Beta Pricing</h3>
                    <div class="discount-badge">Save ${savingsPercent}% with code: ${discountCode}</div>
                </div>
                <div class="pricing-content">
                    <div class="price-display">
                        <span class="original-price">$${pricing.original}/month</span>
                        <span class="discounted-price">$${pricing.discounted}/month</span>
                    </div>
                    <div class="features-list">
                        ${pricing.features.map(feature => `<div class="feature">✓ ${feature}</div>`).join('')}
                    </div>
                    <div class="pricing-cta">
                        <a href="#" class="btn-primary">Start Beta Trial</a>
                    </div>
                </div>
            </div>
        `;
  }

  /**
   * Get behavior triggers for recipient
   * @param {Object} recipient - Recipient data
   * @returns {Array} Applicable behavior triggers
   */
  getBehaviorTriggers(recipient) {
    const triggers = [];

    Object.keys(this.behaviorTriggers).forEach(triggerName => {
      const trigger = this.behaviorTriggers[triggerName];
      const conditions = trigger.conditions || {};

      // Check if trigger conditions are met
      let shouldTrigger = true;
      Object.keys(conditions).forEach(conditionKey => {
        if (recipient[conditionKey] !== conditions[conditionKey]) {
          shouldTrigger = false;
        }
      });

      if (shouldTrigger) {
        triggers.push({
          name: triggerName,
          delay: trigger.delay,
          template: trigger.template,
          conditions: conditions,
        });
      }
    });

    return triggers;
  }

  /**
   * Extract merge tags from template
   * @param {string} template - Email template
   * @returns {Array} Found merge tags
   */
  extractMergeTags(template) {
    const tags = [];
    const matches = template.match(/\{\{([^}]+)\}\}/g);

    if (matches) {
      matches.forEach(match => {
        const tag = match.replace(/[{}]/g, '');
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
      });
    }

    return tags;
  }

  /**
   * Process behavior-triggered follow-up
   * @param {string} triggerType - Type of trigger
   * @param {Object} recipient - Recipient data
   * @param {Object} eventData - Event data
   * @returns {Object} Follow-up email data
   */
  processBehaviorTrigger(triggerType, recipient, eventData) {
    const trigger = this.behaviorTriggers[triggerType];

    if (!trigger) {
      return null;
    }

    const segment =
      this.audienceSegments[recipient.audience_type] || this.audienceSegments['individual_user'];
    const followUpTemplate = this.getFollowUpTemplate(trigger.template, segment);

    return {
      template: followUpTemplate,
      delay: trigger.delay,
      recipient: recipient,
      triggerType: triggerType,
      eventData: eventData,
      personalizedContent: this.personalizeEmail(recipient, followUpTemplate, {
        triggerBased: true,
        eventData: eventData,
      }),
    };
  }

  /**
   * Get follow-up template based on trigger type
   * @param {string} templateName - Template name
   * @param {Object} segment - Audience segment
   * @returns {string} Follow-up template
   */
  getFollowUpTemplate(templateName, segment) {
    const templates = {
      follow_up_opened: `
                <p>Hi {{firstName}},</p>
                <p>Thanks for opening our email about RinaWarp Beta! We noticed you might be interested in learning more.</p>
                {{dynamic_${segment.contentBlocks[0]}}}
                <p>Have any questions? Just reply to this email - we'd love to hear from you.</p>
            `,
      follow_up_clicked: `
                <p>Hi {{firstName}},</p>
                <p>We saw you clicked through to learn more about RinaWarp Beta. That's awesome!</p>
                <p>If you need any help getting started or have questions about the beta program, we're here to help.</p>
                <p>Your personalized discount code: <strong>{{discountCode}}</strong></p>
            `,
      signup_assistance: `
                <p>Hi {{firstName}},</p>
                <p>We noticed you started the RinaWarp Beta signup process. Need any help completing it?</p>
                <p>If you're experiencing any issues, here are some quick solutions:</p>
                <ul>
                    <li>Check your spam folder for the verification email</li>
                    <li>Try a different browser if you're having technical issues</li>
                    <li>Contact our support team for immediate assistance</li>
                </ul>
            `,
      re_engagement: `
                <p>Hi {{firstName}},</p>
                <p>We haven't heard from you in a while! The RinaWarp Beta is still available, and we'd love to have you join our community.</p>
                <p>Here's what you might have missed:</p>
                {{dynamic_${segment.contentBlocks[1]}}}
                <p>Your exclusive discount code is still valid: <strong>{{discountCode}}</strong></p>
            `,
    };

    return templates[templateName] || templates.follow_up_opened;
  }
}

export default EmailPersonalizationEngine;
