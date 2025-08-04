/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 11 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

import monitoringConfig from './config/gcp-monitoring-config.js';

/**
 * Alert Manager for RinaWarp Terminal
 * Handles alert policy creation and management for Google Cloud Monitoring
 */
class AlertManager {
  constructor() {
    this.isInitialized = false;
    this.alertPolicies = new Map();
    this.notificationChannels = new Map();

    this.initializeAlerts();
  }

  /**
   * Initialize the alert manager
   */
  async initializeAlerts() {
    try {
      await monitoringConfig.initialize();
      this.isInitialized = true;

      // Create default alert policies
      await this.createDefaultAlertPolicies();

      console.log('✅ Alert manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize alert manager:', error.message);
      this.isInitialized = false;
    }
  }

  /**
   * Create default alert policies for RinaWarp Terminal
   */
  async createDefaultAlertPolicies() {
    const defaultAlerts = [
      {
        name: 'High Memory Usage',
        condition: {
          displayName: 'Memory usage above 80%',
          metricFilter:
            'resource.type="global" AND metric.type="custom.googleapis.com/rinawarp/terminal/memory_usage"',
          threshold: 80,
          comparison: 'GREATER_THAN',
          duration: '300s',
        },
        documentation: 'Memory usage is consistently above 80% for 5 minutes',
      },
      {
        name: 'High CPU Usage',
        condition: {
          displayName: 'CPU usage above 85%',
          metricFilter:
            'resource.type="global" AND metric.type="custom.googleapis.com/rinawarp/terminal/cpu_usage"',
          threshold: 85,
          comparison: 'GREATER_THAN',
          duration: '300s',
        },
        documentation: 'CPU usage is consistently above 85% for 5 minutes',
      },
      {
        name: 'Terminal Errors Spike',
        condition: {
          displayName: 'Terminal errors rate spike',
          metricFilter:
            'resource.type="global" AND metric.type="custom.googleapis.com/rinawarp/terminal/errors"',
          threshold: 10,
          comparison: 'GREATER_THAN',
          duration: '60s',
        },
        documentation: 'Terminal error rate has spiked above 10 errors per minute',
      },
      {
        name: 'AI Response Time High',
        condition: {
          displayName: 'AI response time above 5 seconds',
          metricFilter:
            'resource.type="global" AND metric.type="custom.googleapis.com/rinawarp/ai/response_time"',
          threshold: 5000,
          comparison: 'GREATER_THAN',
          duration: '120s',
        },
        documentation: 'AI response time is consistently above 5 seconds',
      },
    ];

    for (const alert of defaultAlerts) {
      try {
        await this.createAlertPolicy(alert);
      } catch (error) {
        console.error(`❌ Failed to create alert policy ${alert.name}:`, error.message);
      }
    }
  }

  /**
   * Create an alert policy
   */
  async createAlertPolicy(alertConfig) {
    try {
      if (!this.isInitialized) {
        throw new Error(new Error('Alert manager not initialized'));
      }

      const client = monitoringConfig.getMonitoringClient();
      const _projectPath = client.projectPath(monitoringConfig.projectId);

      const alertPolicy = {
        displayName: alertConfig.name,
        documentation: {
          content: alertConfig.documentation || `Alert for ${alertConfig.name}`,
          mimeType: 'text/markdown',
        },
        conditions: [
          {
            displayName: alertConfig.condition.displayName,
            conditionThreshold: {
              filter: alertConfig.condition.metricFilter,
              comparison: alertConfig.condition.comparison,
              thresholdValue: alertConfig.condition.threshold,
              duration: {
                seconds: this.parseDuration(alertConfig.condition.duration),
              },
              aggregations: [
                {
                  alignmentPeriod: {
                    seconds: 60,
                  },
                  perSeriesAligner: 'ALIGN_MEAN',
                  crossSeriesReducer: 'REDUCE_MEAN',
                },
              ],
            },
          },
        ],
        combiner: 'OR',
        enabled: true,
        alertStrategy: {
          autoClose: {
            seconds: 86400, // 24 hours
          },
        },
      };

      const policy = await monitoringConfig.createAlertPolicy(alertPolicy);

      if (policy) {
        this.alertPolicies.set(alertConfig.name, policy);
      }

      return policy;
    } catch (error) {
      if (error.message.includes('already exists')) {
        return null;
      }
      console.error('❌ Error creating alert policy:', error.message);
      throw new Error(error);
    }
  }

  /**
   * Create a notification channel
   */
  async createNotificationChannel(channelConfig) {
    try {
      if (!this.isInitialized) {
        throw new Error(new Error('Alert manager not initialized'));
      }

      const client = monitoringConfig.getMonitoringClient();
      const projectPath = client.projectPath(monitoringConfig.projectId);

      const notificationChannel = {
        type: channelConfig.type, // e.g., 'email', 'slack', 'webhook'
        displayName: channelConfig.displayName,
        description: channelConfig.description || '',
        labels: channelConfig.labels || {},
        enabled: true,
      };

      const request = {
        name: projectPath,
        notificationChannel: notificationChannel,
      };

      const [channel] = await client.createNotificationChannel(request);

      this.notificationChannels.set(channelConfig.displayName, channel);

      return channel;
    } catch (error) {
      console.error('❌ Error creating notification channel:', error.message);
      throw new Error(error);
    }
  }

  /**
   * Update alert policy with notification channels
   */
  async updateAlertPolicyNotifications(policyName, notificationChannelNames) {
    try {
      const policy = this.alertPolicies.get(policyName);
      if (!policy) {
        throw new Error(new Error(`Alert policy ${policyName} not found`));
      }

      const client = monitoringConfig.getMonitoringClient();

      // Get notification channel resources
      const notificationChannels = notificationChannelNames.map(name => {
        const channel = this.notificationChannels.get(name);
        if (!channel) {
          throw new Error(new Error(`Notification channel ${name} not found`));
        }
        return channel.name;
      });

      // Update the policy
      const updatedPolicy = {
        ...policy,
        notificationChannels: notificationChannels,
      };

      const request = {
        alertPolicy: updatedPolicy,
      };

      const [updated] = await client.updateAlertPolicy(request);

      this.alertPolicies.set(policyName, updated);

      return updated;
    } catch (error) {
      console.error('❌ Error updating alert policy notifications:', error.message);
      throw new Error(error);
    }
  }

  /**
   * List existing alert policies
   */
  async listAlertPolicies() {
    try {
      if (!this.isInitialized) {
        throw new Error(new Error('Alert manager not initialized'));
      }

      const client = monitoringConfig.getMonitoringClient();
      const projectPath = client.projectPath(monitoringConfig.projectId);

      const request = {
        name: projectPath,
        filter: 'display_name.starts_with("RinaWarp")',
      };

      const [policies] = await client.listAlertPolicies(request);

      return policies.map(policy => ({
        name: policy.name,
        displayName: policy.displayName,
        enabled: policy.enabled,
        conditions: policy.conditions.length,
        notificationChannels: policy.notificationChannels.length,
      }));
    } catch (error) {
      console.error('❌ Error listing alert policies:', error.message);
      throw new Error(error);
    }
  }

  /**
   * Delete an alert policy
   */
  async deleteAlertPolicy(policyName) {
    try {
      const policy = this.alertPolicies.get(policyName);
      if (!policy) {
        throw new Error(new Error(`Alert policy ${policyName} not found`));
      }

      const client = monitoringConfig.getMonitoringClient();

      const request = {
        name: policy.name,
      };

      await client.deleteAlertPolicy(request);

      this.alertPolicies.delete(policyName);
      console.log(`✅ Deleted alert policy: ${policyName}`);
    } catch (error) {
      console.error('❌ Error deleting alert policy:', error.message);
      throw new Error(error);
    }
  }

  /**
   * Parse duration string to seconds
   */
  parseDuration(duration) {
    const match = duration.match(/^(\d+)([smh])$/);
    if (!match) {
      return 300; // Default to 5 minutes
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    default:
      return 300;
    }
  }

  /**
   * Create email notification channel
   */
  async createEmailNotificationChannel(email, displayName) {
    return await this.createNotificationChannel({
      type: 'email',
      displayName: displayName || `Email - ${email}`,
      description: `Email notifications for ${email}`,
      labels: {
        email_address: email,
      },
    });
  }

  /**
   * Create webhook notification channel
   */
  async createWebhookNotificationChannel(url, displayName) {
    return await this.createNotificationChannel({
      type: 'webhook_tokenauth',
      displayName: displayName || `Webhook - ${url}`,
      description: `Webhook notifications to ${url}`,
      labels: {
        url: url,
      },
    });
  }

  /**
   * Get alert manager status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      alertPolicies: Array.from(this.alertPolicies.keys()),
      notificationChannels: Array.from(this.notificationChannels.keys()),
      monitoringConfig: monitoringConfig.getProjectConfig(),
    };
  }
}

// Create singleton instance
const alertManager = new AlertManager();

export default alertManager;
export { AlertManager };
