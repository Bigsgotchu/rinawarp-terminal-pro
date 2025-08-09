const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const os = require('os');
const axios = require('axios');

class LicenseManager {
  constructor() {
    this.licenseData = null;
    this.features = null;
    this.configPath = path.join(app.getPath('userData'), 'license.json');
    this.serverUrl = process.env.LICENSE_SERVER_URL || 'https://api.rinawarptech.com';
    this.checkInterval = null;
    this.isInitialized = false;
  }

  /**
   * Initialize license manager
   */
  async initialize() {
    try {
      // Load cached license data
      await this.loadCachedLicense();

      // Verify license with server (non-blocking)
      this.verifyLicenseAsync();

      // Set up periodic verification (every 24 hours)
      this.setupPeriodicVerification();

      this.isInitialized = true;
      console.log('License Manager initialized successfully');
    } catch (error) {
      console.error('License Manager initialization failed:', error);
      // Fall back to free tier
      this.setFreeTierDefaults();
    }
  }

  /**
   * Load cached license from disk
   */
  async loadCachedLicense() {
    try {
      const data = await fs.readFile(this.configPath, 'utf8');
      const cachedLicense = JSON.parse(data);

      // Check if cache is still valid (within 7 days)
      const cacheAge = Date.now() - cachedLicense.lastVerified;
      const maxCacheAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      if (cacheAge < maxCacheAge && cachedLicense.valid) {
        this.licenseData = cachedLicense;
        this.features = cachedLicense.features;
        console.log(`Loaded cached license: ${cachedLicense.tier} tier`);
        return true;
      }
    } catch (error) {
      console.log('No valid cached license found');
    }

    return false;
  }

  /**
   * Save license data to cache
   */
  async saveLicenseCache(licenseData) {
    try {
      const cacheData = {
        ...licenseData,
        lastVerified: Date.now(),
        machineId: this.getMachineId(),
      };

      await fs.writeFile(this.configPath, JSON.stringify(cacheData, null, 2));
      console.log('License cache updated');
    } catch (error) {
      console.error('Failed to save license cache:', error);
    }
  }

  /**
   * Generate unique machine identifier
   */
  getMachineId() {
    const platform = os.platform();
    const arch = os.arch();
    const hostname = os.hostname();
    const userInfo = os.userInfo();

    const machineString = `${platform}-${arch}-${hostname}-${userInfo.username}`;
    return crypto.createHash('sha256').update(machineString).digest('hex');
  }

  /**
   * Verify license with server (async)
   */
  async verifyLicenseAsync() {
    try {
      if (!this.licenseData?.licenseKey) {
        console.log('No license key found, using free tier');
        this.setFreeTierDefaults();
        return;
      }

      const response = await axios.post(
        `${this.serverUrl}/api/auth/verify-license`,
        {
          licenseKey: this.licenseData.licenseKey,
          machineId: this.getMachineId(),
          platform: os.platform(),
          appVersion: app.getVersion(),
        },
        {
          timeout: 10000, // 10 second timeout
        }
      );

      const result = response.data;

      if (result.valid) {
        this.licenseData = {
          ...this.licenseData,
          valid: true,
          tier: result.tier,
          features: result.features,
          subscription: result.subscription,
          lastVerified: Date.now(),
        };

        this.features = result.features;
        await this.saveLicenseCache(this.licenseData);

        console.log(`License verified: ${result.tier} tier`);
        this.notifyLicenseUpdated();
      } else {
        console.warn('License verification failed:', result.error);
        this.handleInvalidLicense(result.error);
      }
    } catch (error) {
      console.warn('License verification request failed:', error.message);
      // Don't invalidate cached license on network errors
      if (!this.licenseData?.valid) {
        this.setFreeTierDefaults();
      }
    }
  }

  /**
   * Set license key (from user input or registration)
   */
  async setLicenseKey(licenseKey) {
    try {
      this.licenseData = {
        licenseKey,
        valid: false,
        lastVerified: 0,
      };

      // Verify immediately
      await this.verifyLicenseAsync();

      return this.licenseData.valid;
    } catch (error) {
      console.error('Failed to set license key:', error);
      return false;
    }
  }

  /**
   * Remove license (logout)
   */
  async removeLicense() {
    try {
      this.licenseData = null;
      this.features = null;

      // Delete cache file
      try {
        await fs.unlink(this.configPath);
      } catch (error) {
        // File might not exist
      }

      this.setFreeTierDefaults();
      this.notifyLicenseUpdated();

      console.log('License removed, switched to free tier');
    } catch (error) {
      console.error('Failed to remove license:', error);
    }
  }

  /**
   * Set free tier defaults
   */
  setFreeTierDefaults() {
    this.licenseData = {
      valid: true,
      tier: 'free',
      lastVerified: Date.now(),
    };

    this.features = {
      ai_suggestions: false,
      voice_control: false,
      max_themes: 3,
      plugin_development: false,
      team_features: false,
      advanced_security: false,
      priority_support: false,
      performance_analytics: false,
    };
  }

  /**
   * Handle invalid license
   */
  handleInvalidLicense(reason) {
    console.warn('License invalid:', reason);

    // Grace period for network issues
    if (this.licenseData?.lastVerified) {
      const gracePeriod = 30 * 24 * 60 * 60 * 1000; // 30 days
      const timeSinceLastVerified = Date.now() - this.licenseData.lastVerified;

      if (timeSinceLastVerified < gracePeriod) {
        console.log('Using grace period for license verification');
        return;
      }
    }

    // Downgrade to free tier
    this.setFreeTierDefaults();
    this.notifyLicenseUpdated();

    // Show user notification
    this.showLicenseInvalidDialog(reason);
  }

  /**
   * Setup periodic license verification
   */
  setupPeriodicVerification() {
    // Clear existing interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check every 24 hours
    this.checkInterval = setInterval(
      () => {
        this.verifyLicenseAsync();
      },
      24 * 60 * 60 * 1000
    );
  }

  /**
   * Check if feature is enabled
   */
  hasFeature(featureName) {
    // Creator always has all features
    if (this.getCurrentTier() === 'creator') return true;

    if (!this.features) return false;
    return this.features[featureName] === true || this.features[featureName] === 'unlimited';
  }

  /**
   * Get feature value (for limits like max_themes)
   */
  getFeatureValue(featureName) {
    if (!this.features) return null;
    return this.features[featureName];
  }

  /**
   * Get current tier
   */
  getCurrentTier() {
    // Check if running as creator
    const currentUser =
      process.env.USER || process.env.USERNAME || require('os').userInfo().username;
    if (currentUser === 'kgilley' || process.env.RINAWARP_CREATOR_MODE === 'true') {
      return 'creator';
    }

    return this.licenseData?.tier || 'free';
  }

  /**
   * Check if license is valid
   */
  isLicenseValid() {
    return this.licenseData?.valid === true;
  }

  /**
   * Get license information for UI
   */
  getLicenseInfo() {
    return {
      tier: this.getCurrentTier(),
      valid: this.isLicenseValid(),
      features: this.features || {},
      subscription: this.licenseData?.subscription,
      lastVerified: this.licenseData?.lastVerified,
      hasLicenseKey: !!this.licenseData?.licenseKey,
    };
  }

  /**
   * Notify renderer processes of license updates
   */
  notifyLicenseUpdated() {
    const { BrowserWindow } = require('electron');
    const windows = BrowserWindow.getAllWindows();

    windows.forEach(window => {
      window.webContents.send('license-updated', this.getLicenseInfo());
    });
  }

  /**
   * Show license invalid dialog
   */
  showLicenseInvalidDialog(reason) {
    const { dialog } = require('electron');

    dialog
      .showMessageBox({
        type: 'warning',
        title: 'License Issue',
        message: 'Your RinaWarp Terminal license could not be verified.',
        detail: `Reason: ${reason}\n\nThe application will continue with free tier features. Please check your subscription or contact support if this issue persists.`,
        buttons: ['OK', 'Check Subscription', 'Contact Support'],
      })
      .then(result => {
        if (result.response === 1) {
          // Open subscription management
          require('electron').shell.openExternal('https://rinawarptech.com/account');
        } else if (result.response === 2) {
          // Open support
          require('electron').shell.openExternal('mailto:support@rinawarptech.com');
        }
      });
  }

  /**
   * Cleanup on app quit
   */
  cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

// Singleton instance
let licenseManager = null;

function getLicenseManager() {
  if (!licenseManager) {
    licenseManager = new LicenseManager();
  }
  return licenseManager;
}

module.exports = { LicenseManager, getLicenseManager };
