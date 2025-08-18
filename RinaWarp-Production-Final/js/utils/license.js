/**
 * License Management System
 * Handles license validation, feature gating, and upgrade prompts
 */

class LicenseManager {
  constructor() {
    this.license = null;
    this.features = null;
    this.limits = null;
    this.usage = this.loadUsage();
    this.init();
  }

  async init() {
    await this.loadLicense();
    this.validateLicense();
    this.setupFeatureGating();
  }

  async loadLicense() {
    try {
      // 💰 LIVE API: Try to validate license from server first
      const storedLicense = localStorage.getItem('rinawarp_license_key');
      const deviceId = this.getDeviceId();

      if (storedLicense && window.apiClient) {
        try {
          const validation = await window.apiClient.validateLicense(storedLicense, deviceId);
          if (validation.valid) {
            this.license = {
              version: validation.tier,
              tier: validation.tier,
              licenseKey: storedLicense,
              features: validation.features,
              expiresAt: validation.expiresAt,
            };
            this.features = validation.features;
            this.limits = this.getLimitsForTier(validation.tier);
            console.log('✅ License validated with live API:', validation.tier);
            return;
          }
        } catch (error) {
          console.warn('License validation failed, falling back to local:', error);
        }
      }

      // Fallback: Try to load license from config
      const response = await fetch('./config/license.json');
      if (response.ok) {
        const licenseData = await response.json();
        this.license = licenseData;
        this.features = licenseData.features || {};
        this.limits = licenseData.limits || {};
      } else {
        // Default to Creator Edition if no license file found
        this.license = {
          version: 'creator',
          tier: 'creator',
          features: {
            ai_integration: true,
            basic_terminal: true,
            themes: true,
            accessibility: true,
            cloud_sync: true,
            analytics: true,
            automation_builder: true,
            voice_control: true,
            collaboration: true,
            unlimited_ai_requests: true,
            priority_support: true,
          },
          limits: {
            ai_requests_per_day: -1, // unlimited
            saved_sessions: -1, // unlimited
            custom_themes: -1, // unlimited
          },
        };
        this.features = this.license.features;
        this.limits = this.license.limits;
      }
    } catch (error) {
      console.error('Failed to load license:', error);
      this.setDefaultLicense();
    }
  }

  setDefaultLicense() {
    // Default free license
    this.license = {
      version: 'free',
      tier: 'free',
      features: {
        ai_integration: true,
        basic_terminal: true,
        themes: true,
        accessibility: true,
        cloud_sync: false,
        analytics: false,
        automation_builder: false,
        voice_control: false,
        collaboration: false,
        unlimited_ai_requests: false,
        priority_support: false,
      },
      limits: {
        ai_requests_per_day: 50,
        saved_sessions: 10,
        custom_themes: 3,
      },
    };
    this.features = this.license.features;
    this.limits = this.license.limits;
  }

  validateLicense() {
    if (!this.license) {
      this.setDefaultLicense();
      return false;
    }

    // Check if license is expired (if applicable)
    if (this.license.expires && new Date() > new Date(this.license.expires)) {
      console.warn('License expired, reverting to free tier');
      this.setDefaultLicense();
      return false;
    }

    return true;
  }

  // Feature gating methods
  hasFeature(featureName) {
    return this.features[featureName] === true;
  }

  checkLimit(limitName, currentUsage = 0) {
    const limit = this.limits[limitName];
    if (limit === -1) return true; // unlimited
    return currentUsage < limit;
  }

  canUseAI() {
    if (!this.hasFeature('ai_integration')) {
      return { allowed: false, reason: 'AI integration not available in your plan' };
    }

    if (this.hasFeature('unlimited_ai_requests')) {
      return { allowed: true };
    }

    const dailyUsage = this.getDailyAIUsage();
    const limit = this.limits.ai_requests_per_day || 50;

    if (dailyUsage >= limit) {
      return {
        allowed: false,
        reason: `Daily AI limit reached (${limit} requests). Upgrade to Pro for unlimited access.`,
        showUpgrade: true,
      };
    }

    return { allowed: true, remaining: limit - dailyUsage };
  }

  canSaveSession() {
    const savedSessions = this.getSavedSessionsCount();
    const limit = this.limits.saved_sessions || 10;

    if (limit === -1) return { allowed: true };

    if (savedSessions >= limit) {
      return {
        allowed: false,
        reason: `Session limit reached (${limit} sessions). Upgrade to Pro for unlimited sessions.`,
        showUpgrade: true,
      };
    }

    return { allowed: true, remaining: limit - savedSessions };
  }

  canUseCustomTheme() {
    const customThemes = this.getCustomThemesCount();
    const limit = this.limits.custom_themes || 3;

    if (limit === -1) return { allowed: true };

    if (customThemes >= limit) {
      return {
        allowed: false,
        reason: `Custom theme limit reached (${limit} themes). Upgrade to Pro for unlimited themes.`,
        showUpgrade: true,
      };
    }

    return { allowed: true, remaining: limit - customThemes };
  }

  // Usage tracking
  incrementAIUsage() {
    const today = new Date().toDateString();
    if (!this.usage.aiRequests[today]) {
      this.usage.aiRequests[today] = 0;
    }
    this.usage.aiRequests[today]++;
    this.saveUsage();
  }

  getDailyAIUsage() {
    const today = new Date().toDateString();
    return this.usage.aiRequests[today] || 0;
  }

  getSavedSessionsCount() {
    return this.usage.savedSessions || 0;
  }

  getCustomThemesCount() {
    return this.usage.customThemes || 0;
  }

  incrementSavedSessions() {
    this.usage.savedSessions = (this.usage.savedSessions || 0) + 1;
    this.saveUsage();
  }

  incrementCustomThemes() {
    this.usage.customThemes = (this.usage.customThemes || 0) + 1;
    this.saveUsage();
  }

  loadUsage() {
    try {
      const stored = localStorage.getItem('rinawarp_usage');
      return stored
        ? JSON.parse(stored)
        : {
            aiRequests: {},
            savedSessions: 0,
            customThemes: 0,
          };
    } catch (error) {
      return {
        aiRequests: {},
        savedSessions: 0,
        customThemes: 0,
      };
    }
  }

  saveUsage() {
    try {
      localStorage.setItem('rinawarp_usage', JSON.stringify(this.usage));
    } catch (error) {
      console.error('Failed to save usage data:', error);
    }
  }

  // Upgrade prompts
  showUpgradeModal(feature, reason) {
    const modal = document.createElement('div');
    modal.className = 'upgrade-modal';
    modal.innerHTML = `
            <div class="upgrade-modal-content">
                <div class="upgrade-header">
                    <h2>🚀 Upgrade to Pro</h2>
                    <button class="close-modal" onclick="this.closest('.upgrade-modal').remove()">×</button>
                </div>
                <div class="upgrade-body">
                    <p>${reason}</p>
                    <div class="upgrade-benefits">
                        <h3>Pro Benefits:</h3>
                        <ul>
                            <li>✨ Unlimited AI requests</li>
                            <li>☁️ Cloud sync across devices</li>
                            <li>📊 Advanced analytics</li>
                            <li>🤖 Automation builder</li>
                            <li>🎨 Unlimited custom themes</li>
                            <li>🏆 Priority support</li>
                        </ul>
                    </div>
                    <div class="upgrade-pricing">
                        <div class="price">$9.99/month</div>
                        <div class="price-note">Cancel anytime</div>
                    </div>
                </div>
                <div class="upgrade-actions">
                    <button class="btn-upgrade" onclick="window.open('https://rinawarp.com/upgrade', '_blank')">
                        Upgrade Now
                    </button>
                    <button class="btn-dismiss" onclick="this.closest('.upgrade-modal').remove()">
                        Maybe Later
                    </button>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Auto-remove after 10 seconds if not interacted with
    setTimeout(() => {
      if (modal.parentNode) {
        modal.remove();
      }
    }, 10000);
  }

  setupFeatureGating() {
    // Add CSS for upgrade modal
    const style = document.createElement('style');
    style.textContent = `
            .upgrade-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(5px);
            }

            .upgrade-modal-content {
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                border-radius: 15px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .upgrade-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }

            .upgrade-header h2 {
                color: #ffd700;
                margin: 0;
            }

            .close-modal {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 5px;
            }

            .upgrade-body {
                color: white;
                margin-bottom: 25px;
            }

            .upgrade-benefits ul {
                list-style: none;
                padding: 0;
            }

            .upgrade-benefits li {
                padding: 5px 0;
                color: #e0e0e0;
            }

            .upgrade-pricing {
                text-align: center;
                margin: 20px 0;
            }

            .price {
                font-size: 2rem;
                color: #ffd700;
                font-weight: bold;
            }

            .price-note {
                color: #999;
                font-size: 0.9rem;
            }

            .upgrade-actions {
                display: flex;
                gap: 15px;
                justify-content: center;
            }

            .btn-upgrade {
                background: linear-gradient(45deg, #ffd700, #ff6b6b);
                border: none;
                color: black;
                padding: 12px 24px;
                border-radius: 25px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.3s;
            }

            .btn-upgrade:hover {
                transform: translateY(-2px);
            }

            .btn-dismiss {
                background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 12px 24px;
                border-radius: 25px;
                cursor: pointer;
            }

            .feature-locked {
                opacity: 0.5;
                pointer-events: none;
                position: relative;
            }

            .feature-locked::after {
                content: '🔒 Pro Feature';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: #ffd700;
                padding: 5px 10px;
                border-radius: 5px;
                font-size: 12px;
                white-space: nowrap;
            }
        `;
    document.head.appendChild(style);
  }

  // License info getters
  getLicenseInfo() {
    return {
      version: this.license.version,
      tier: this.license.tier,
      features: this.features,
      limits: this.limits,
      usage: this.usage,
    };
  }

  isCreatorEdition() {
    return this.license.tier === 'creator';
  }

  isProTier() {
    return this.license.tier === 'pro' || this.license.tier === 'creator';
  }

  isFreeTier() {
    return this.license.tier === 'free';
  }

  // 💰 REVENUE: Device ID generation for license validation
  getDeviceId() {
    let deviceId = localStorage.getItem('rinawarp_device_id');
    if (!deviceId) {
      // Generate unique device ID
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('rinawarp_device_id', deviceId);
    }
    return deviceId;
  }

  // 💰 REVENUE: Tier-specific limits mapping
  getLimitsForTier(tier) {
    const tierLimits = {
      free: {
        ai_requests_per_day: 10,
        saved_sessions: 5,
        custom_themes: 1,
        voice_minutes: 5,
      },
      personal: {
        ai_requests_per_day: 100,
        saved_sessions: 50,
        custom_themes: 10,
        voice_minutes: 60,
      },
      professional: {
        ai_requests_per_day: -1, // unlimited
        saved_sessions: -1, // unlimited
        custom_themes: -1, // unlimited
        voice_minutes: -1, // unlimited
      },
      team: {
        ai_requests_per_day: -1, // unlimited
        saved_sessions: -1, // unlimited
        custom_themes: -1, // unlimited
        voice_minutes: -1, // unlimited
      },
      creator: {
        ai_requests_per_day: -1, // unlimited
        saved_sessions: -1, // unlimited
        custom_themes: -1, // unlimited
        voice_minutes: -1, // unlimited
      },
    };

    return tierLimits[tier] || tierLimits.free;
  }

  // 💰 REVENUE: License key management
  async updateLicenseKey(newLicenseKey) {
    localStorage.setItem('rinawarp_license_key', newLicenseKey);
    await this.loadLicense(); // Re-validate with new key
    return this.license;
  }

  removeLicenseKey() {
    localStorage.removeItem('rinawarp_license_key');
    this.setDefaultLicense();
  }
}

// Global license manager instance
window.licenseManager = new LicenseManager();

export default LicenseManager;
