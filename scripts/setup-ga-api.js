#!/usr/bin/env node

/**
 * Google Analytics API Setup Script
 * Helps configure authentication and test the connection
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class GoogleAnalyticsSetup {
  constructor() {
    this.configDir = path.join(__dirname, '../config');
    this.envFile = path.join(__dirname, '../.env');
  }

  /**
   * Check if required dependencies are installed
   */
  checkDependencies() {
    console.log('📦 Checking required dependencies...');

    try {
      require('googleapis');
      console.log('✅ googleapis package is installed');
    } catch (error) {
      console.log('❌ googleapis package not found');
      console.log('📦 Installing googleapis...');
      execSync('npm install googleapis', { stdio: 'inherit' });
    }
  }

  /**
   * Create config directory if it doesn't exist
   */
  createConfigDir() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
      console.log('📁 Created config directory');
    }
  }

  /**
   * Setup service account authentication
   */
  setupServiceAccount() {
    console.log('\n🔑 Setting up Service Account Authentication');
    console.log('Follow these steps:');
    console.log('');
    console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/');
    console.log('2. Create a new project or select existing project');
    console.log('3. Enable Google Analytics Reporting API');
    console.log('4. Go to IAM & Admin > Service Accounts');
    console.log('5. Create a new service account');
    console.log('6. Download the JSON key file');
    console.log('7. Save it as: config/ga-service-account.json');
    console.log('8. Add the service account email to your GA property with "Edit" permissions');
    console.log('');
    console.log('Service account permissions needed:');
    console.log('- Google Analytics Reporting API');
    console.log('- Google Analytics Management API');
    console.log('');

    const serviceAccountPath = path.join(this.configDir, 'ga-service-account.json');
    if (fs.existsSync(serviceAccountPath)) {
      console.log('✅ Service account file found at: config/ga-service-account.json');
      return true;
    } else {
      console.log('❌ Service account file not found');
      console.log(
        '   Please save your service account JSON file to: config/ga-service-account.json'
      );
      return false;
    }
  }

  /**
   * Get GA property information
   */
  async getGAPropertyInfo() {
    console.log('\n📊 Getting Google Analytics Property Information');
    console.log('');
    console.log('To find your GA Account ID, Property ID, and View ID:');
    console.log('1. Go to Google Analytics: https://analytics.google.com/');
    console.log('2. Go to Admin (gear icon in bottom left)');
    console.log('3. Account ID: Found in Account column');
    console.log('4. Property ID: Found in Property column (starts with UA- or G-)');
    console.log('5. View ID: Found in View column');
    console.log('');
    console.log('Example:');
    console.log('- Account ID: 123456789');
    console.log('- Property ID: UA-123456789-1 (Universal Analytics) or G-XXXXXXXXXX (GA4)');
    console.log('- View ID: 198765432');
    console.log('');
  }

  /**
   * Update environment variables
   */
  updateEnvFile() {
    console.log('\n📝 Updating environment variables...');

    const envTemplatePath = path.join(__dirname, '../.env.ga-audience');

    if (fs.existsSync(envTemplatePath)) {
      console.log('✅ Found GA environment template');
      console.log('');
      console.log('Please update your .env file with the following variables:');
      console.log('');

      const envTemplate = fs.readFileSync(envTemplatePath, 'utf8');
      const envVars = envTemplate
        .split('\n')
        .filter(line => line.includes('=') && !line.startsWith('#'))
        .map(line => line.split('=')[0]);

      envVars.forEach(envVar => {
        console.log(`${envVar}=your_value_here`);
      });

      console.log('');
      console.log('Or copy the template:');
      console.log('cp .env.ga-audience .env.local');
    }
  }

  /**
   * Test the connection
   */
  async testConnection() {
    console.log('\n🧪 Testing Google Analytics API connection...');

    try {
      const GoogleAnalyticsAudienceCreator = require('./create-ga-audience.js');
      const creator = new GoogleAnalyticsAudienceCreator();

      if (!creator.accountId || !creator.propertyId) {
        console.log('❌ Missing environment variables');
        console.log('   Please set GA_ACCOUNT_ID, GA_PROPERTY_ID, and GA_VIEW_ID');
        return false;
      }

      const initialized = await creator.initialize();
      if (initialized) {
        console.log('✅ Google Analytics API connection successful!');

        // Try to list audiences as a test
        const audiences = await creator.listAudiences();
        console.log(`📊 Found ${audiences.length} existing audiences`);

        return true;
      } else {
        console.log('❌ Failed to initialize Google Analytics API');
        return false;
      }
    } catch (error) {
      console.log('❌ Connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Run the complete setup process
   */
  async runSetup() {
    console.log('🚀 Google Analytics API Setup');
    console.log('================================');

    this.checkDependencies();
    this.createConfigDir();
    this.setupServiceAccount();
    await this.getGAPropertyInfo();
    this.updateEnvFile();

    console.log('\n✅ Setup complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Add your service account JSON file to config/ga-service-account.json');
    console.log('2. Update your .env file with your GA Account ID, Property ID, and View ID');
    console.log('3. Test the connection: node setup-ga-api.js test');
    console.log('4. Create your first audience: node create-ga-audience.js create power-users');
    console.log('');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const setup = new GoogleAnalyticsSetup();

  if (command === 'test') {
    await setup.testConnection();
  } else {
    await setup.runSetup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = GoogleAnalyticsSetup;
