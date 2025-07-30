/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 8 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Webhook Notification System
 * Handles immediate notifications for beta sign-ups via multiple channels
 */

const fs = require('node:fs');
const path = require('node:path');
const axios = require('axios');
const crypto = require('node:crypto');

class WebhookNotificationSystem {
  constructor() {
    this.webhookConfig = {
      slack: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
        channel: process.env.SLACK_CHANNEL || '#beta-signups',
        username: 'RinaWarp Bot',
        iconEmoji: ':rocket:',
        enabled: !!process.env.SLACK_WEBHOOK_URL,
      },
      discord: {
        webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
        username: 'RinaWarp Bot',
        avatarUrl: 'https://your-domain.com/bot-avatar.png',
        enabled: !!process.env.DISCORD_WEBHOOK_URL,
      },
      teams: {
        webhookUrl: process.env.TEAMS_WEBHOOK_URL || '',
        enabled: !!process.env.TEAMS_WEBHOOK_URL,
      },
      email: {
        smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
        smtpPort: process.env.SMTP_PORT || 587,
        username: process.env.EMAIL_USERNAME || '',
        password: process.env.EMAIL_PASSWORD || '',
        from: process.env.EMAIL_FROM || 'notifications@rinawarp.com',
        to: process.env.EMAIL_TO || 'team@rinawarp.com',
        enabled: !!process.env.EMAIL_USERNAME,
      },
      custom: {
        webhookUrl: process.env.CUSTOM_WEBHOOK_URL || '',
        apiKey: process.env.CUSTOM_API_KEY || '',
        enabled: !!process.env.CUSTOM_WEBHOOK_URL,
      },
    };

    this.rateLimits = {
      slack: { maxPerMinute: 50, current: 0, lastReset: Date.now() },
      discord: { maxPerMinute: 30, current: 0, lastReset: Date.now() },
      teams: { maxPerMinute: 20, current: 0, lastReset: Date.now() },
      email: { maxPerMinute: 10, current: 0, lastReset: Date.now() },
      custom: { maxPerMinute: 100, current: 0, lastReset: Date.now() },
    };
  }

  /**
   * Send notification for new beta sign-up
   */
  async sendSignupNotification(signupData) {
    const notification = {
      id: crypto.randomBytes(16).toString('hex'),
      timestamp: new Date().toISOString(),
      type: 'beta_signup',
      data: signupData,
    };

    console.log(`📤 Sending signup notification: ${notification.id}`);

    // Send to all enabled channels
    const promises = [];

    if (this.webhookConfig.slack.enabled) {
      promises.push(this.sendSlackNotification(notification));
    }

    if (this.webhookConfig.discord.enabled) {
      promises.push(this.sendDiscordNotification(notification));
    }

    if (this.webhookConfig.teams.enabled) {
      promises.push(this.sendTeamsNotification(notification));
    }

    if (this.webhookConfig.email.enabled) {
      promises.push(this.sendEmailNotification(notification));
    }

    if (this.webhookConfig.custom.enabled) {
      promises.push(this.sendCustomNotification(notification));
    }

    const results = await Promise.allSettled(promises);

    // Log results
    results.forEach((result, index) => {
      const channels = ['slack', 'discord', 'teams', 'email', 'custom'];
      const channel = channels[index];

      if (result.status === 'fulfilled') {
        console.log(`✅ ${channel} notification sent successfully`);
      } else {
        console.error(`❌ ${channel} notification failed:`, result.reason);
      }
    });

    return notification;
  }

  /**
   * Send Slack notification
   */
  async sendSlackNotification(notification) {
    if (!this.checkRateLimit('slack')) {
      throw new Error(new Error('Slack rate limit exceeded'));
    }

    const { data } = notification;
    const formattedMessage = {
      channel: this.webhookConfig.slack.channel,
      username: this.webhookConfig.slack.username,
      icon_emoji: this.webhookConfig.slack.iconEmoji,
      text: `🎉 New Beta Sign-up!`,
      attachments: [
        {
          color: 'good',
          fields: [
            {
              title: 'Email',
              value: data.formData?.email || 'N/A',
              short: true,
            },
            {
              title: 'Name',
              value: data.formData?.name || 'N/A',
              short: true,
            },
            {
              title: 'Company',
              value: data.formData?.company || 'N/A',
              short: true,
            },
            {
              title: 'Campaign',
              value: data.campaignId || 'Unknown',
              short: true,
            },
            {
              title: 'UTM Source',
              value: data.utmParams?.source || 'Direct',
              short: true,
            },
            {
              title: 'UTM Medium',
              value: data.utmParams?.medium || 'N/A',
              short: true,
            },
            {
              title: 'Timestamp',
              value: new Date(data.timestamp).toLocaleString(),
              short: false,
            },
            {
              title: 'User Agent',
              value: data.userAgent?.slice(0, 100) + '...',
              short: false,
            },
          ],
          footer: 'RinaWarp Beta Campaign',
          ts: Math.floor(new Date(data.timestamp).getTime() / 1000),
        },
      ],
    };

    const response = await axios.post(this.webhookConfig.slack.webhookUrl, formattedMessage);
    return response.data;
  }

  /**
   * Send Discord notification
   */
  async sendDiscordNotification(notification) {
    if (!this.checkRateLimit('discord')) {
      throw new Error(new Error('Discord rate limit exceeded'));
    }

    const { data } = notification;
    const embed = {
      title: '🎉 New Beta Sign-up!',
      color: 3066993, // Green
      fields: [
        {
          name: '📧 Email',
          value: data.formData?.email || 'N/A',
          inline: true,
        },
        {
          name: '👤 Name',
          value: data.formData?.name || 'N/A',
          inline: true,
        },
        {
          name: '🏢 Company',
          value: data.formData?.company || 'N/A',
          inline: true,
        },
        {
          name: '📊 Campaign',
          value: data.campaignId || 'Unknown',
          inline: true,
        },
        {
          name: '🔗 Source',
          value: data.utmParams?.source || 'Direct',
          inline: true,
        },
        {
          name: '📱 Medium',
          value: data.utmParams?.medium || 'N/A',
          inline: true,
        },
      ],
      timestamp: data.timestamp,
      footer: {
        text: 'RinaWarp Beta Campaign',
      },
    };

    const message = {
      username: this.webhookConfig.discord.username,
      avatar_url: this.webhookConfig.discord.avatarUrl,
      embeds: [embed],
    };

    const response = await axios.post(this.webhookConfig.discord.webhookUrl, message);
    return response.data;
  }

  /**
   * Send Microsoft Teams notification
   */
  async sendTeamsNotification(notification) {
    if (!this.checkRateLimit('teams')) {
      throw new Error(new Error('Teams rate limit exceeded'));
    }

    const { data } = notification;
    const card = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: 'New Beta Sign-up',
      themeColor: '28a745',
      sections: [
        {
          activityTitle: '🎉 New Beta Sign-up!',
          activitySubtitle: `Campaign: ${data.campaignId || 'Unknown'}`,
          facts: [
            {
              name: '📧 Email:',
              value: data.formData?.email || 'N/A',
            },
            {
              name: '👤 Name:',
              value: data.formData?.name || 'N/A',
            },
            {
              name: '🏢 Company:',
              value: data.formData?.company || 'N/A',
            },
            {
              name: '🔗 Source:',
              value: data.utmParams?.source || 'Direct',
            },
            {
              name: '📱 Medium:',
              value: data.utmParams?.medium || 'N/A',
            },
            {
              name: '⏰ Time:',
              value: new Date(data.timestamp).toLocaleString(),
            },
          ],
        },
      ],
    };

    const response = await axios.post(this.webhookConfig.teams.webhookUrl, card);
    return response.data;
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(notification) {
    if (!this.checkRateLimit('email')) {
      throw new Error(new Error('Email rate limit exceeded'));
    }

    const nodemailer = require('nodemailer');
    const { data } = notification;

    const transporter = nodemailer.createTransporter({
      host: this.webhookConfig.email.smtpHost,
      port: this.webhookConfig.email.smtpPort,
      secure: this.webhookConfig.email.smtpPort === 465,
      auth: {
        user: this.webhookConfig.email.username,
        pass: this.webhookConfig.email.password,
      },
    });

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
                <h1>🎉 New Beta Sign-up!</h1>
            </div>
            
            <div style="padding: 20px; background: #f8f9fa;">
                <h2 style="color: #333; margin-bottom: 20px;">Sign-up Details</h2>
                
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">📧 Email:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.formData?.email || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">👤 Name:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.formData?.name || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">🏢 Company:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.formData?.company || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">📊 Campaign:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.campaignId || 'Unknown'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">🔗 Source:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.utmParams?.source || 'Direct'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">📱 Medium:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${data.utmParams?.medium || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">⏰ Time:</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${new Date(data.timestamp).toLocaleString()}</td>
                    </tr>
                </table>
            </div>
            
            <div style="padding: 20px; text-align: center; color: #666;">
                <p>RinaWarp Beta Campaign Notification System</p>
            </div>
        </div>
        `;

    const mailOptions = {
      from: this.webhookConfig.email.from,
      to: this.webhookConfig.email.to,
      subject: '🎉 New Beta Sign-up - RinaWarp',
      html: htmlContent,
    };

    const result = await transporter.sendMail(mailOptions);
    return result;
  }

  /**
   * Send custom webhook notification
   */
  async sendCustomNotification(notification) {
    if (!this.checkRateLimit('custom')) {
      throw new Error(new Error('Custom webhook rate limit exceeded'));
    }

    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.webhookConfig.custom.apiKey) {
      headers['Authorization'] = `Bearer ${this.webhookConfig.custom.apiKey}`;
    }

    const payload = {
      event: 'beta_signup',
      timestamp: notification.timestamp,
      id: notification.id,
      data: notification.data,
    };

    const response = await axios.post(this.webhookConfig.custom.webhookUrl, payload, { headers });
    return response.data;
  }

  /**
   * Check rate limit for a specific channel
   */
  checkRateLimit(channel) {
    const limit = this.rateLimits[channel];
    const now = Date.now();

    // Reset counter if a minute has passed
    if (now - limit.lastReset > 60000) {
      limit.current = 0;
      limit.lastReset = now;
    }

    if (limit.current >= limit.maxPerMinute) {
      return false;
    }

    limit.current++;
    return true;
  }

  /**
   * Test webhook connections
   */
  async testWebhooks() {
    console.log('🧪 Testing webhook connections...');

    const testData = {
      formData: {
        email: 'test@example.com',
        name: 'Test User',
        company: 'Test Company',
      },
      campaignId: 'test-campaign',
      utmParams: {
        source: 'test',
        medium: 'email',
        campaign: 'webhook-test',
      },
      timestamp: new Date().toISOString(),
      userAgent: 'Test User Agent',
    };

    const results = await this.sendSignupNotification(testData);
    console.log('✅ Webhook test completed');
    return results;
  }

  /**
   * Get webhook configuration status
   */
  getWebhookStatus() {
    return {
      slack: {
        enabled: this.webhookConfig.slack.enabled,
        configured: !!this.webhookConfig.slack.webhookUrl,
      },
      discord: {
        enabled: this.webhookConfig.discord.enabled,
        configured: !!this.webhookConfig.discord.webhookUrl,
      },
      teams: {
        enabled: this.webhookConfig.teams.enabled,
        configured: !!this.webhookConfig.teams.webhookUrl,
      },
      email: {
        enabled: this.webhookConfig.email.enabled,
        configured: !!this.webhookConfig.email.username,
      },
      custom: {
        enabled: this.webhookConfig.custom.enabled,
        configured: !!this.webhookConfig.custom.webhookUrl,
      },
    };
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus() {
    return Object.entries(this.rateLimits).map(([channel, limit]) => ({
      channel,
      current: limit.current,
      max: limit.maxPerMinute,
      remaining: limit.maxPerMinute - limit.current,
      resetTime: new Date(limit.lastReset + 60000).toISOString(),
    }));
  }
}

module.exports = WebhookNotificationSystem;

// Example usage if run directly
if (require.main === module) {
  const webhookSystem = new WebhookNotificationSystem();

  // Test webhooks
  webhookSystem
    .testWebhooks()
    .then(() => {
      console.log('Webhook test completed');
    })
    .catch(error => {
      console.error('Webhook test failed:', error);
    });
}
