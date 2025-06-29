/**
 * RinaWarp Terminal - License Manager
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * This file is part of RinaWarp Terminal, an advanced open-source terminal emulator with
 * AI assistance, live collaboration, and enterprise-grade security features.
 *
 * Licensed under the MIT License.
 * See LICENSE file for detailed terms and conditions.
 *
 * Project repository: https://github.com/rinawarp/terminal
 */
// Basic License Management System
class LicenseManager {
  constructor() {
    this.licenseKey = localStorage.getItem('rinawarp_license_key');
    this.licenseType = localStorage.getItem('rinawarp_license_type') || 'trial';
    this.trialStartDate = localStorage.getItem('rinawarp_trial_start') || Date.now();
    this.lastValidation = localStorage.getItem('rinawarp_last_validation') || 0;
  }

  // Check if current license is valid
  isValidLicense() {
    const now = Date.now();
    const trialDays = 30;
    const validationInterval = 24 * 60 * 60 * 1000; // 24 hours

    // Check trial period
    if (this.licenseType === 'trial') {
      const trialEnd = parseInt(this.trialStartDate) + trialDays * 24 * 60 * 60 * 1000;
      return now < trialEnd;
    }

    // Check if we need to validate with server
    if (now - parseInt(this.lastValidation) > validationInterval) {
      this.validateWithServer();
    }

    return this.licenseKey && this.licenseType !== 'expired';
  }

  // Get license tier (personal, professional, team, enterprise)
  getLicenseTier() {
    if (!this.isValidLicense()) return 'expired';
    return this.licenseType;
  }

  // Check if specific feature is available
  hasFeature(feature) {
    const tier = this.getLicenseTier();

    const features = {
      trial: ['basic_ai', 'themes', 'history', 'cloud_sync', 'advanced_ai'],
      personal: ['basic_ai', 'themes', 'history'],
      professional: ['basic_ai', 'themes', 'history', 'cloud_sync', 'advanced_ai', 'custom_themes'],
      team: [
        'basic_ai',
        'themes',
        'history',
        'cloud_sync',
        'advanced_ai',
        'custom_themes',
        'team_features',
        'sso_basic',
      ],
      enterprise: [
        'basic_ai',
        'themes',
        'history',
        'cloud_sync',
        'advanced_ai',
        'custom_themes',
        'team_features',
        'sso_advanced',
        'on_premise',
        'custom_integrations',
      ],
    };

    return features[tier]?.includes(feature) || false;
  }

  // Get AI query limit
  getAIQueryLimit() {
    const tier = this.getLicenseTier();

    switch (tier) {
      case 'personal':
        return 5; // 5 per day
      case 'professional':
      case 'team':
      case 'enterprise':
      case 'trial':
        return -1; // unlimited
      default:
        return 0;
    }
  }

  // Track AI usage
  trackAIUsage() {
    const today = new Date().toDateString();
    const usageKey = `ai_usage_${today}`;
    const currentUsage = parseInt(localStorage.getItem(usageKey) || '0');
    localStorage.setItem(usageKey, (currentUsage + 1).toString());
    return currentUsage + 1;
  }

  // Check if can use AI
  canUseAI() {
    const limit = this.getAIQueryLimit();
    if (limit === -1) return true; // unlimited
    if (limit === 0) return false; // no access

    const today = new Date().toDateString();
    const usageKey = `ai_usage_${today}`;
    const currentUsage = parseInt(localStorage.getItem(usageKey) || '0');
    return currentUsage < limit;
  }

  // Activate license
  activateLicense(licenseKey, licenseType) {
    this.licenseKey = licenseKey;
    this.licenseType = licenseType;
    localStorage.setItem('rinawarp_license_key', licenseKey);
    localStorage.setItem('rinawarp_license_type', licenseType);
    localStorage.setItem('rinawarp_last_validation', Date.now().toString());
    return true;
  }

  // Start trial
  startTrial() {
    if (!localStorage.getItem('rinawarp_trial_start')) {
      localStorage.setItem('rinawarp_trial_start', Date.now().toString());
      localStorage.setItem('rinawarp_license_type', 'trial');
      this.trialStartDate = Date.now();
      this.licenseType = 'trial';
    }
  }

  // Get days remaining in trial
  getTrialDaysRemaining() {
    if (this.licenseType !== 'trial') return 0;
    const trialDays = 30;
    const elapsed = (Date.now() - parseInt(this.trialStartDate)) / (24 * 60 * 60 * 1000);
    return Math.max(0, Math.ceil(trialDays - elapsed));
  }

  // Validate with server
  async validateWithServer() {
    try {
      const response = await fetch('/api/validate-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: this.licenseKey }),
      });

      const result = await response.json();

      if (result.valid) {
        // Update local license information
        this.licenseType = result.licenseType;
        localStorage.setItem('rinawarp_license_type', result.licenseType);
        localStorage.setItem('rinawarp_last_validation', Date.now().toString());

        if (result.expires) {
          localStorage.setItem('rinawarp_license_expires', result.expires.toString());
        }

        console.log('License validation successful:', result.licenseType);
        return true;
      } else {
        console.error('License validation failed:', result.error);
        this.licenseType = 'expired';
        localStorage.setItem('rinawarp_license_type', 'expired');
        return false;
      }
    } catch (error) {
      console.log('License validation failed, using cached license:', error);
      return false;
    }
  }

  // Show upgrade dialog
  showUpgradeDialog(feature) {
    const upgradeModal = document.createElement('div');
    upgradeModal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; text-align: center;">
                    <h2>Upgrade Required</h2>
                    <p>The feature "${feature}" requires a higher license tier.</p>
                    <p>Current tier: <strong>${this.getLicenseTier()}</strong></p>
                    <div style="margin: 20px 0;">
                        <button onclick="window.open('https://rinawarp-terminal.web.app/pricing', '_blank')" style="background: #007acc; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin: 5px; cursor: pointer;">View Pricing</button>
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: #666; color: white; padding: 10px 20px; border: none; border-radius: 5px; margin: 5px; cursor: pointer;">Close</button>
                    </div>
                </div>
            </div>
        `;
    document.body.appendChild(upgradeModal);
  }

  // Get license status summary
  getStatus() {
    return {
      isValid: this.isValidLicense(),
      tier: this.getLicenseTier(),
      trialDaysRemaining: this.getTrialDaysRemaining(),
      aiQueriesRemaining:
        this.getAIQueryLimit() === -1
          ? 'unlimited'
          : this.getAIQueryLimit() -
            parseInt(localStorage.getItem(`ai_usage_${new Date().toDateString()}`) || '0'),
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LicenseManager;
} else {
  window.LicenseManager = LicenseManager;
}
