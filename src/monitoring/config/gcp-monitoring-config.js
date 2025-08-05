import logger from '../utils/logger.js';
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 6 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

import { MonitoringClient } from '@google-cloud/monitoring';
import { Logging } from '@google-cloud/logging';
import { readFileSync } from 'fs';
import { _join } from 'path';

/**
 * Google Cloud Monitoring Configuration
 * Centralizes monitoring setup for RinaWarp Terminal
 */
class GCPMonitoringConfig {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    this.serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL;

    // Initialize clients
    this.monitoringClient = null;
    this.loggingClient = null;

    // Configuration flags
    this.isInitialized = false;
    this.retryAttempts = 3;
    this.retryDelay = 1000;

    this.validateEnvironment();
  }

  /**
   * Validate required environment variables
   */
  validateEnvironment() {
    const requiredEnvVars = ['GOOGLE_CLOUD_PROJECT_ID', 'GOOGLE_APPLICATION_CREDENTIALS'];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.warn(
        `⚠️  Missing required environment variables for GCP Monitoring: ${missingVars.join(', ')}`
      );
      console.warn('Please set these variables to enable monitoring features.');
      return false;
    }

    return true;
  }

  /**
   * Initialize Google Cloud Monitoring clients
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return { success: true, message: 'Already initialized' };
      }

      // Validate credentials file exists
      if (this.keyFile) {
        try {
          const credentialsContent = readFileSync(this.keyFile, 'utf8');
          const credentials = JSON.parse(credentialsContent);

          // Validate service account has required roles
          console.log(
            `📊 Initializing GCP Monitoring with service account: ${credentials.client_email}`
          );
        } catch (error) {
          console.error('❌ Error reading service account key file:', error.message);
          return { success: false, error: 'Invalid service account key file' };
        }
      }

      // Initialize Monitoring client
      this.monitoringClient = new MonitoringClient({
        projectId: this.projectId,
        keyFilename: this.keyFile,
      });

      // Initialize Logging client
      this.loggingClient = new Logging({
        projectId: this.projectId,
        keyFilename: this.keyFile,
      });

      // Test connection
      await this.testConnection();

      this.isInitialized = true;
      logger.debug('✅ Google Cloud Monitoring initialized successfully');

      return { success: true, message: 'Monitoring initialized successfully' };
    } catch (error) {
      console.error('❌ Failed to initialize GCP Monitoring:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test connection to Google Cloud Monitoring
   */
  async testConnection() {
    try {
      // Test monitoring client
      const projectPath = this.monitoringClient.projectPath(this.projectId);
      await this.monitoringClient.listMetricDescriptors({
        name: projectPath,
        pageSize: 1,
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Google Cloud Monitoring:', error.message);
      throw new Error(new Error(error));
    }
  }

  /**
   * Get monitoring client instance
   */
  getMonitoringClient() {
    if (!this.isInitialized) {
      throw new Error(
        new Error(new Error('Monitoring client not initialized. Call initialize() first.'))
      );
    }
    return this.monitoringClient;
  }

  /**
   * Get logging client instance
   */
  getLoggingClient() {
    if (!this.isInitialized) {
      throw new Error(
        new Error(new Error('Logging client not initialized. Call initialize() first.'))
      );
    }
    return this.loggingClient;
  }

  /**
   * Create custom metric descriptor
   */
  async createCustomMetric(
    metricType,
    displayName,
    description,
    metricKind = 'GAUGE',
    valueType = 'DOUBLE'
  ) {
    try {
      const client = this.getMonitoringClient();
      const projectPath = client.projectPath(this.projectId);

      const metricDescriptor = {
        type: `custom.googleapis.com/${metricType}`,
        displayName: displayName,
        description: description,
        metricKind: metricKind,
        valueType: valueType,
        unit: '1',
      };

      const request = {
        name: projectPath,
        metricDescriptor: metricDescriptor,
      };

      const [descriptor] = await client.createMetricDescriptor(request);

      return descriptor;
    } catch (error) {
      if (error.code === 6) {
        // ALREADY_EXISTS
        return null;
      }
      console.error('❌ Error creating custom metric:', error.message);
      throw new Error(new Error(error));
    }
  }

  /**
   * Write custom metric data
   */
  async writeMetricData(metricType, value, labels = {}) {
    try {
      const client = this.getMonitoringClient();
      const projectPath = client.projectPath(this.projectId);

      const dataPoint = {
        interval: {
          endTime: {
            seconds: Date.now() / 1000,
          },
        },
        value: {
          doubleValue: value,
        },
      };

      const timeSeries = {
        metric: {
          type: `custom.googleapis.com/${metricType}`,
          labels: labels,
        },
        resource: {
          type: 'global',
          labels: {
            project_id: this.projectId,
          },
        },
        points: [dataPoint],
      };

      const request = {
        name: projectPath,
        timeSeries: [timeSeries],
      };

      await client.createTimeSeries(request);
      logger.debug(`📊 Wrote metric data for ${metricType}: ${value}`);
    } catch (error) {
      console.error('❌ Error writing metric data:', error.message);
      throw new Error(new Error(error));
    }
  }

  /**
   * Create alert policy
   */
  async createAlertPolicy(policyConfig) {
    try {
      const client = this.getMonitoringClient();
      const projectPath = client.projectPath(this.projectId);

      const request = {
        name: projectPath,
        alertPolicy: policyConfig,
      };

      const [policy] = await client.createAlertPolicy(request);
      logger.debug(`✅ Created alert policy: ${policy.name}`);

      return policy;
    } catch (error) {
      console.error('❌ Error creating alert policy:', error.message);
      throw new Error(new Error(error));
    }
  }

  /**
   * Get project configuration
   */
  getProjectConfig() {
    return {
      projectId: this.projectId,
      serviceAccountEmail: this.serviceAccountEmail,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Health check for monitoring service
   */
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        return { status: 'error', message: 'Not initialized' };
      }

      await this.testConnection();

      return {
        status: 'healthy',
        projectId: this.projectId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Create singleton instance
const monitoringConfig = new GCPMonitoringConfig();

export default monitoringConfig;
export { GCPMonitoringConfig };
