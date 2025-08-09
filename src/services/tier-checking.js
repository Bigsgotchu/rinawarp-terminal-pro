/**
 * User Tier Checking Service
 * Centralized tier validation and feature access control
 */

import { hasFeature, getUpgradeMessage, getTierDisplayInfo } from '../config/pricing-tiers.js';

export class TierCheckingService {
  static getCurrentTier() {
    // Check multiple sources for user tier
    if (typeof window !== 'undefined') {
      // Browser environment
      return localStorage.getItem('userTier') || sessionStorage.getItem('userTier') || 'free';
    } else {
      // Node environment
      return process.env.USER_TIER || 'free';
    }
  }

  static setUserTier(tier) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userTier', tier);
      sessionStorage.setItem('userTier', tier);

      // Dispatch event for UI updates
      window.dispatchEvent(
        new CustomEvent('tierChanged', {
          detail: { tier, info: getTierDisplayInfo(tier) },
        })
      );
    }
  }

  static hasAccess(feature) {
    const tier = this.getCurrentTier();
    return hasFeature(tier, feature);
  }

  static getUpgradeInfo(feature) {
    const currentTier = this.getCurrentTier();
    return getUpgradeMessage(currentTier, feature);
  }

  static requiresTier(feature, minTier = 'professional') {
    return {
      hasAccess: this.hasAccess(feature),
      currentTier: this.getCurrentTier(),
      requiredTier: minTier,
      upgrade: this.hasAccess(feature) ? null : this.getUpgradeInfo(feature),
    };
  }

  static showUpgradeModal(feature) {
    const upgrade = this.getUpgradeInfo(feature);

    if (typeof window !== 'undefined') {
      // Create upgrade modal
      const modal = document.createElement('div');
      modal.className = 'tier-upgrade-modal';
      modal.innerHTML = `
        <div class="upgrade-content">
          <h3>🌊 Unlock Enhanced Features</h3>
          <p>${upgrade.message}</p>
          <div class="upgrade-actions">
            <button onclick="window.location.href='/pricing'" class="upgrade-btn">
              Upgrade to ${upgrade.upgradeTo} - $${upgrade.price}/month
            </button>
            <button onclick="this.closest('.tier-upgrade-modal').remove()" class="close-btn">
              Maybe Later
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
    }
  }
}

export default TierCheckingService;
