import axios from 'axios';

class AnalyticsService {
  constructor() {
    this.googleAnalyticsId = process.env.GA_MEASUREMENT_ID;
    this.mixpanelToken = process.env.MIXPANEL_TOKEN;
    this.webhookUrls = {
      slack: process.env.SLACK_WEBHOOK_URL,
      discord: process.env.DISCORD_WEBHOOK_URL,
    };
    this.isEnabled = process.env.NODE_ENV === 'production';
  }

  /**
   * Track event in Google Analytics 4
   */
  async trackGA4Event(clientId, eventName, eventParams = {}) {
    if (!this.isEnabled || !this.googleAnalyticsId) return;

    try {
      await axios.post(
        `https://www.google-analytics.com/mp/collect`,
        {
          client_id: clientId,
          events: [
            {
              name: eventName,
              params: {
                ...eventParams,
                timestamp: Date.now(),
              },
            },
          ],
        },
        {
          params: {
            measurement_id: this.googleAnalyticsId,
            api_secret: process.env.GA_API_SECRET,
          },
          timeout: 5000,
        }
      );

      console.log(`GA4 event tracked: ${eventName}`);
    } catch (error) {
      console.error('GA4 tracking error:', error.message);
    }
  }

  /**
   * Track event in Mixpanel
   */
  async trackMixpanelEvent(distinctId, eventName, properties = {}) {
    if (!this.isEnabled || !this.mixpanelToken) return;

    try {
      const eventData = {
        event: eventName,
        properties: {
          token: this.mixpanelToken,
          distinct_id: distinctId,
          time: Math.floor(Date.now() / 1000),
          ...properties,
        },
      };

      await axios.post('https://api.mixpanel.com/track', [eventData], {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });

      console.log(`Mixpanel event tracked: ${eventName}`);
    } catch (error) {
      console.error('Mixpanel tracking error:', error.message);
    }
  }

  /**
   * Send notification to team channels
   */
  async sendTeamNotification(message, channel = 'general') {
    if (!this.isEnabled) return;

    const notifications = [];

    // Slack notification
    if (this.webhookUrls.slack) {
      notifications.push(
        axios
          .post(this.webhookUrls.slack, {
            text: message,
            channel: channel,
            username: 'RinaWarp Analytics',
            icon_emoji: ':chart_with_upwards_trend:',
          })
          .catch(error => console.error('Slack notification error:', error.message))
      );
    }

    // Discord notification
    if (this.webhookUrls.discord) {
      notifications.push(
        axios
          .post(this.webhookUrls.discord, {
            content: message,
            username: 'RinaWarp Analytics',
          })
          .catch(error => console.error('Discord notification error:', error.message))
      );
    }

    await Promise.allSettled(notifications);
  }

  /**
   * Track trial signup
   */
  async trackTrialSignup(userId, platform, userAgent, ipAddress) {
    const eventData = {
      user_id: userId,
      platform: platform,
      user_agent: userAgent,
      ip_address: ipAddress,
      timestamp: new Date().toISOString(),
    };

    // Track in both analytics platforms
    await Promise.all([
      this.trackGA4Event(userId, 'trial_signup', {
        platform: platform,
        engagement_time_msec: 1,
      }),
      this.trackMixpanelEvent(userId, 'Trial Signup', eventData),
    ]);

    // Send team notification
    const message =
      `🎯 **New Professional Trial Signup**\n` +
      `Platform: ${platform}\n` +
      `User: ${userId}\n` +
      `Time: ${new Date().toLocaleString()}`;

    await this.sendTeamNotification(message, 'sales');

    console.log(`Trial signup tracked for user ${userId} on ${platform}`);
  }

  /**
   * Track successful conversion (trial to paid)
   */
  async trackConversion(userId, subscriptionId, amount, currency = 'USD') {
    const eventData = {
      user_id: userId,
      subscription_id: subscriptionId,
      amount: amount,
      currency: currency,
      timestamp: new Date().toISOString(),
    };

    // Track conversion in analytics
    await Promise.all([
      this.trackGA4Event(userId, 'purchase', {
        transaction_id: subscriptionId,
        value: amount / 100, // Convert cents to dollars
        currency: currency,
        item_name: 'RinaWarp Terminal Professional',
      }),
      this.trackMixpanelEvent(userId, 'Subscription Created', eventData),
    ]);

    // Send team notification
    const message =
      `💰 **New Subscription Conversion!**\n` +
      `Amount: ${currency} ${(amount / 100).toFixed(2)}\n` +
      `User: ${userId}\n` +
      `Subscription: ${subscriptionId}\n` +
      `Time: ${new Date().toLocaleString()}`;

    await this.sendTeamNotification(message, 'sales');

    console.log(`Conversion tracked: ${userId} - ${currency} ${amount / 100}`);
  }

  /**
   * Track demo request (Enterprise)
   */
  async trackDemoRequest(email, company, requestDetails) {
    const eventData = {
      email: email,
      company: company,
      ...requestDetails,
      timestamp: new Date().toISOString(),
    };

    // Track in analytics
    await Promise.all([
      this.trackGA4Event(email, 'demo_request', {
        company: company,
        engagement_time_msec: 1,
      }),
      this.trackMixpanelEvent(email, 'Demo Requested', eventData),
    ]);

    // Send team notification
    const message =
      `🏢 **Enterprise Demo Request**\n` +
      `Company: ${company}\n` +
      `Email: ${email}\n` +
      `Details: ${JSON.stringify(requestDetails, null, 2)}\n` +
      `Time: ${new Date().toLocaleString()}`;

    await this.sendTeamNotification(message, 'sales');

    console.log(`Demo request tracked: ${company} (${email})`);
  }

  /**
   * Track download events
   */
  async trackDownload(userId, platform, tier, version) {
    const eventData = {
      user_id: userId,
      platform: platform,
      tier: tier,
      version: version,
      timestamp: new Date().toISOString(),
    };

    // Track in analytics
    await Promise.all([
      this.trackGA4Event(userId, 'download', {
        platform: platform,
        tier: tier,
        version: version,
      }),
      this.trackMixpanelEvent(userId, 'App Downloaded', eventData),
    ]);

    console.log(`Download tracked: ${userId} - ${platform} ${tier} ${version}`);
  }

  /**
   * Track subscription cancellation
   */
  async trackCancellation(userId, subscriptionId, reason, feedback) {
    const eventData = {
      user_id: userId,
      subscription_id: subscriptionId,
      cancellation_reason: reason,
      feedback: feedback,
      timestamp: new Date().toISOString(),
    };

    // Track in analytics
    await Promise.all([
      this.trackGA4Event(userId, 'subscription_cancel', {
        subscription_id: subscriptionId,
        cancellation_reason: reason,
      }),
      this.trackMixpanelEvent(userId, 'Subscription Cancelled', eventData),
    ]);

    // Send team notification
    const message =
      `😞 **Subscription Cancelled**\n` +
      `User: ${userId}\n` +
      `Subscription: ${subscriptionId}\n` +
      `Reason: ${reason}\n` +
      `Feedback: ${feedback}\n` +
      `Time: ${new Date().toLocaleString()}`;

    await this.sendTeamNotification(message, 'customer-success');

    console.log(`Cancellation tracked: ${userId} - ${reason}`);
  }

  /**
   * Track feature usage (from desktop app)
   */
  async trackFeatureUsage(userId, feature, usage_data) {
    const eventData = {
      user_id: userId,
      feature: feature,
      ...usage_data,
      timestamp: new Date().toISOString(),
    };

    // Track in analytics
    await Promise.all([
      this.trackGA4Event(userId, 'feature_usage', {
        feature_name: feature,
        ...usage_data,
      }),
      this.trackMixpanelEvent(userId, 'Feature Used', eventData),
    ]);

    console.log(`Feature usage tracked: ${userId} - ${feature}`);
  }

  /**
   * Track license activation
   */
  async trackLicenseActivation(userId, licenseKey, platform, machineId) {
    const eventData = {
      user_id: userId,
      license_key: licenseKey.substring(0, 8) + '****', // Partial key for privacy
      platform: platform,
      machine_id: machineId.substring(0, 8) + '****', // Partial machine ID
      timestamp: new Date().toISOString(),
    };

    // Track in analytics
    await Promise.all([
      this.trackGA4Event(userId, 'license_activation', {
        platform: platform,
      }),
      this.trackMixpanelEvent(userId, 'License Activated', eventData),
    ]);

    console.log(`License activation tracked: ${userId} on ${platform}`);
  }

  /**
   * Generate analytics report
   */
  async generateReport(startDate, endDate) {
    // This would typically query your analytics database
    // For now, return a placeholder structure

    const report = {
      period: {
        start: startDate,
        end: endDate,
      },
      metrics: {
        trial_signups: 0,
        conversions: 0,
        conversion_rate: 0,
        demo_requests: 0,
        downloads: {
          total: 0,
          by_platform: {
            windows: 0,
            macos: 0,
            linux: 0,
          },
          by_tier: {
            free: 0,
            professional: 0,
            enterprise: 0,
          },
        },
        revenue: {
          total: 0,
          currency: 'USD',
        },
        cancellations: 0,
        churn_rate: 0,
      },
      top_features: [],
      user_feedback: [],
    };

    return report;
  }

  /**
   * A/B test tracking
   */
  async trackABTest(userId, testName, variant, outcome = null) {
    const eventData = {
      user_id: userId,
      test_name: testName,
      variant: variant,
      outcome: outcome,
      timestamp: new Date().toISOString(),
    };

    // Track in analytics
    await Promise.all([
      this.trackGA4Event(userId, 'ab_test_exposure', {
        test_name: testName,
        variant: variant,
        outcome: outcome,
      }),
      this.trackMixpanelEvent(userId, 'A/B Test', eventData),
    ]);

    console.log(`A/B test tracked: ${testName} - ${variant} (${userId})`);
  }
}

// Singleton instance
let analyticsService = null;

function getAnalyticsService() {
  if (!analyticsService) {
    analyticsService = new AnalyticsService();
  }
  return analyticsService;
}

export { AnalyticsService, getAnalyticsService };
