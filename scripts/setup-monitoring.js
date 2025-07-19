#!/usr/bin/env node

/**
 * Google Cloud Monitoring Setup Script
 * Helps initialize and configure Google Cloud Monitoring for RinaWarp Terminal
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { _join } from 'path';

const execAsync = promisify(exec);

class MonitoringSetup {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'rinawarp-terminal-monitoring';
    this.serviceAccountName = 'rinawarp-monitoring';
    this.serviceAccountEmail = `${this.serviceAccountName}@${this.projectId}.iam.gserviceaccount.com`;
    this.keyFilePath = './secrets/gcp-service-account-key.json';

    this.requiredRoles = [
      'roles/monitoring.metricWriter',
      'roles/monitoring.dashboardEditor',
      'roles/monitoring.alertPolicyEditor',
      'roles/logging.logWriter',
    ];
  }

  /**
   * Main setup function
   */
  async setup() {
    console.log('🚀 Setting up Google Cloud Monitoring for RinaWarp Terminal...\n');

    try {
      // Check if gcloud CLI is installed
      await this.checkGcloudCLI();

      // Check if project exists or create it
      await this.setupProject();

      // Enable required APIs
      await this.enableAPIs();

      // Create service account
      await this.createServiceAccount();

      // Create service account key
      await this.createServiceAccountKey();

      // Update .env.monitoring file
      await this.updateEnvFile();

      console.log('✅ Google Cloud Monitoring setup completed successfully!');
      console.log('\\n📋 Next steps:');
      console.log('1. Review the .env.monitoring file and update any remaining placeholders');
      console.log('2. Test the monitoring setup by running: npm run test:monitoring');
      console.log('3. Initialize the monitoring service in your application');
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      console.log('\\n🔧 Manual setup instructions:');
      this.showManualSetupInstructions();
    }
  }

  /**
   * Check if gcloud CLI is installed
   */
  async checkGcloudCLI() {
    try {
      await execAsync('gcloud version');
      console.log('✅ Google Cloud CLI is installed');
    } catch (error) {
      throw new Error(
        'Google Cloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install'
      );
    }
  }

  /**
   * Set up Google Cloud project
   */
  async setupProject() {
    try {
      // Check if project exists
      const { stdout } = await execAsync(
        `gcloud projects describe ${this.projectId} --format="value(projectId)"`
      );

      if (stdout.trim() === this.projectId) {
        console.log(`✅ Project ${this.projectId} exists`);
      } else {
        console.log(`📋 Creating project ${this.projectId}...`);
        await execAsync(
          `gcloud projects create ${this.projectId} --name="RinaWarp Terminal Monitoring"`
        );
        console.log('✅ Project created successfully');
      }

      // Set current project
      await execAsync(`gcloud config set project ${this.projectId}`);
      console.log(`✅ Set current project to ${this.projectId}`);
    } catch (error) {
      throw new Error(`Failed to setup project: ${error.message}`);
    }
  }

  /**
   * Enable required Google Cloud APIs
   */
  async enableAPIs() {
    const apis = [
      'monitoring.googleapis.com',
      'logging.googleapis.com',
      'cloudresourcemanager.googleapis.com',
    ];

    console.log('📋 Enabling required APIs...');

    for (const api of apis) {
      try {
        await execAsync(`gcloud services enable ${api}`);
        console.log(`✅ Enabled ${api}`);
      } catch (error) {
        console.warn(`⚠️  Failed to enable ${api}: ${error.message}`);
      }
    }
  }

  /**
   * Create service account
   */
  async createServiceAccount() {
    try {
      console.log('📋 Creating service account...');

      // Check if service account exists
      try {
        await execAsync(`gcloud iam service-accounts describe ${this.serviceAccountEmail}`);
        console.log('✅ Service account already exists');
      } catch (error) {
        // Create service account
        await execAsync(
          `gcloud iam service-accounts create ${this.serviceAccountName} --display-name="RinaWarp Terminal Monitoring"`
        );
        console.log('✅ Service account created');
      }

      // Assign roles
      console.log('📋 Assigning IAM roles...');
      for (const role of this.requiredRoles) {
        try {
          await execAsync(
            `gcloud projects add-iam-policy-binding ${this.projectId} --member="serviceAccount:${this.serviceAccountEmail}" --role="${role}"`
          );
          console.log(`✅ Assigned role: ${role}`);
        } catch (error) {
          console.warn(`⚠️  Failed to assign role ${role}: ${error.message}`);
        }
      }
    } catch (error) {
      throw new Error(`Failed to create service account: ${error.message}`);
    }
  }

  /**
   * Create service account key
   */
  async createServiceAccountKey() {
    try {
      if (existsSync(this.keyFilePath)) {
        console.log('✅ Service account key already exists');
        return;
      }

      console.log('📋 Creating service account key...');
      await execAsync(
        `gcloud iam service-accounts keys create ${this.keyFilePath} --iam-account=${this.serviceAccountEmail}`
      );
      console.log('✅ Service account key created');
    } catch (error) {
      throw new Error(`Failed to create service account key: ${error.message}`);
    }
  }

  /**
   * Update .env.monitoring file with actual values
   */
  async updateEnvFile() {
    try {
      if (!existsSync('.env.monitoring')) {
        console.log('⚠️  .env.monitoring file not found, creating from template...');
        if (existsSync('.env.monitoring.template')) {
          const template = readFileSync('.env.monitoring.template', 'utf8');
          writeFileSync('.env.monitoring', template);
        }
      }

      let envContent = readFileSync('.env.monitoring', 'utf8');

      // Update with actual values
      envContent = envContent.replace(
        /GOOGLE_CLOUD_PROJECT_ID=.*/,
        `GOOGLE_CLOUD_PROJECT_ID=${this.projectId}`
      );

      envContent = envContent.replace(
        /GCP_SERVICE_ACCOUNT_EMAIL=.*/,
        `GCP_SERVICE_ACCOUNT_EMAIL=${this.serviceAccountEmail}`
      );

      writeFileSync('.env.monitoring', envContent);
      console.log('✅ Updated .env.monitoring file');
    } catch (error) {
      console.warn('⚠️  Failed to update .env.monitoring file:', error.message);
    }
  }

  /**
   * Show manual setup instructions
   */
  showManualSetupInstructions() {
    console.log(`
📋 Manual Google Cloud Monitoring Setup Instructions:

1. Install Google Cloud CLI:
   https://cloud.google.com/sdk/docs/install

2. Create a Google Cloud project:
   gcloud projects create ${this.projectId}

3. Enable required APIs:
   gcloud services enable monitoring.googleapis.com
   gcloud services enable logging.googleapis.com
   gcloud services enable cloudresourcemanager.googleapis.com

4. Create service account:
   gcloud iam service-accounts create ${this.serviceAccountName} --display-name="RinaWarp Terminal Monitoring"

5. Assign IAM roles:
   ${this.requiredRoles
     .map(
       role =>
         `gcloud projects add-iam-policy-binding ${this.projectId} --member="serviceAccount:${this.serviceAccountEmail}" --role="${role}"`
     )
     .join('\\n   ')}

6. Create service account key:
   gcloud iam service-accounts keys create ${this.keyFilePath} --iam-account=${this.serviceAccountEmail}

7. Update .env.monitoring file with your project details.
`);
  }

  /**
   * Test monitoring setup
   */
  async testSetup() {
    console.log('🧪 Testing Google Cloud Monitoring setup...');

    try {
      // Import and test the monitoring configuration
      const { default: monitoringConfig } = await import(
        '../src/monitoring/config/gcp-monitoring-config.js'
      );

      const result = await monitoringConfig.initialize();

      if (result.success) {
        console.log('✅ Monitoring setup test passed!');

        // Test health check
        const health = await monitoringConfig.healthCheck();
        console.log('📊 Health check:', health);
      } else {
        console.error('❌ Monitoring setup test failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new MonitoringSetup();

  const command = process.argv[2];

  switch (command) {
    case 'test':
      await setup.testSetup();
      break;
    case 'manual':
      setup.showManualSetupInstructions();
      break;
    default:
      await setup.setup();
  }
}

export default MonitoringSetup;
