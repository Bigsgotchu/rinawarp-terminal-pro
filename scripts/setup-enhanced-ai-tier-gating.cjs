#!/usr/bin/env node

/**
 * Enhanced AI Tier Gating Setup Script
 * Ensures enhanced AI features are only available to Professional+ tiers
 */

const fs = require('fs').promises;
const path = require('path');

console.log('🔐 Setting up Enhanced AI tier gating...\n');

async function setupTierGating() {
  try {
    // 1. Update enhanced AI integration to check user tiers
    await updateEnhancedAIIntegration();

    // 2. Add tier validation to main initialization
    await updateMainInitialization();

    // 3. Create user tier checking service
    await createTierCheckingService();

    // 4. Update pricing display to highlight enhanced AI
    await updatePricingDisplay();

    console.log('\n✅ Enhanced AI tier gating setup complete!');
    console.log('🔒 Enhanced AI features now restricted to Professional+ tiers');
  } catch (error) {
    console.error('❌ Failed to setup tier gating:', error);
    process.exit(1);
  }
}

async function updateEnhancedAIIntegration() {
  const filePath = path.join(process.cwd(), 'src/ai-system/enhanced-ai-integration.js');

  try {
    let content = await fs.readFile(filePath, 'utf8');

    // Add tier checking to shouldUseEnhancedMode
    const tierCheckCode = `
  shouldUseEnhancedMode(input) {
    if (!this.isEnhancedMode || !this.enhancedAssistant) return false;
    
    // Check user tier - Enhanced AI requires Professional+ tier
    const userTier = this.getUserTier();
    if (!this.hasTierAccess(userTier, 'ai_advanced')) {
      console.log('🧜‍♀️ Enhanced AI requires Professional tier or higher');
      return false;
    }

    // Check against enhanced trigger patterns
    return this.enhancedTriggers.some(pattern => pattern.test(input));
  }

  getUserTier() {
    // Get user tier from localStorage, session, or API
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userTier') || 'free';
    }
    return process.env.USER_TIER || 'free';
  }

  hasTierAccess(tier, feature) {
    // Import pricing tiers config
    const { hasFeature } = require('../config/pricing-tiers.js');
    return hasFeature(tier, feature);
  }

  showUpgradePrompt(feature) {
    const { getUpgradeMessage } = require('../config/pricing-tiers.js');
    const currentTier = this.getUserTier();
    const upgrade = getUpgradeMessage(currentTier, feature);
    
    return {
      response: \`🧜‍♀️ \${upgrade.icon} \${upgrade.message}
      
💫 Upgrade to unlock:
• Advanced code analysis and debugging
• AI-powered program generation  
• Enhanced context awareness
• Unlimited AI queries

🌊 Dive deeper: /pricing\`,
      needsUpgrade: true,
      upgradeTo: upgrade.upgradeTo,
      price: upgrade.price
    };
  }`;

    // Replace the existing shouldUseEnhancedMode method
    content = content.replace(
      /shouldUseEnhancedMode\(input\)\s*{[\s\S]*?return this\.enhancedTriggers\.some\(pattern => pattern\.test\(input\)\);\s*}/,
      tierCheckCode.trim()
    );

    // Add tier check to processEnhancedRequest
    content = content.replace(
      /async processEnhancedRequest\(input, context = \{\}\) \{/,
      `async processEnhancedRequest(input, context = {}) {
    // Check tier access first
    const userTier = this.getUserTier();
    if (!this.hasTierAccess(userTier, 'ai_advanced')) {
      return this.showUpgradePrompt('ai_advanced');
    }`
    );

    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Updated enhanced AI integration with tier checking');
  } catch (error) {
    console.warn('⚠️ Could not update enhanced AI integration:', error.message);
  }
}

async function updateMainInitialization() {
  const filePath = path.join(process.cwd(), 'src/enhanced-ai-terminal-init.js');

  try {
    let content = await fs.readFile(filePath, 'utf8');

    // Add tier validation before initializing enhanced AI
    const tierValidation = `
    // Check if user has access to enhanced AI features
    const userTier = getUserTier();
    const { hasFeature } = await import('./config/pricing-tiers.js');
    
    if (!hasFeature(userTier, 'ai_advanced')) {
      console.log('🧜‍♀️ Enhanced AI requires Professional tier - using basic mode');
      updateStatus('💎 Upgrade to Professional for Enhanced AI features');
      return;
    }`;

    // Insert tier validation after dependencies check
    content = content.replace(
      /await waitForDependencies\(\['terminal', 'shellHarness', 'terminalWrapper'\]\);/,
      `await waitForDependencies(['terminal', 'shellHarness', 'terminalWrapper']);
    
    ${tierValidation}`
    );

    // Add getUserTier helper function
    const getUserTierFunction = `
function getUserTier() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userTier') || 'free';
  }
  return process.env.USER_TIER || 'free';
}`;

    content = content.replace(
      /\/\/ Helper Functions/,
      `${getUserTierFunction}

// Helper Functions`
    );

    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Updated main initialization with tier validation');
  } catch (error) {
    console.warn('⚠️ Could not update main initialization:', error.message);
  }
}

async function createTierCheckingService() {
  const filePath = path.join(process.cwd(), 'src/services/tier-checking.js');

  const content = `/**
 * User Tier Checking Service
 * Centralized tier validation and feature access control
 */

import { hasFeature, getUpgradeMessage, getTierDisplayInfo } from '../config/pricing-tiers.js';

export class TierCheckingService {
  static getCurrentTier() {
    // Check multiple sources for user tier
    if (typeof window !== 'undefined') {
      // Browser environment
      return localStorage.getItem('userTier') || 
             sessionStorage.getItem('userTier') || 
             'free';
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
      window.dispatchEvent(new CustomEvent('tierChanged', { 
        detail: { tier, info: getTierDisplayInfo(tier) }
      }));
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
      upgrade: this.hasAccess(feature) ? null : this.getUpgradeInfo(feature)
    };
  }
  
  static showUpgradeModal(feature) {
    const upgrade = this.getUpgradeInfo(feature);
    
    if (typeof window !== 'undefined') {
      // Create upgrade modal
      const modal = document.createElement('div');
      modal.className = 'tier-upgrade-modal';
      modal.innerHTML = \`
        <div class="upgrade-content">
          <h3>🌊 Unlock Enhanced Features</h3>
          <p>\${upgrade.message}</p>
          <div class="upgrade-actions">
            <button onclick="window.location.href='/pricing'" class="upgrade-btn">
              Upgrade to \${upgrade.upgradeTo} - $\${upgrade.price}/month
            </button>
            <button onclick="this.closest('.tier-upgrade-modal').remove()" class="close-btn">
              Maybe Later
            </button>
          </div>
        </div>
      \`;
      
      document.body.appendChild(modal);
    }
  }
}

export default TierCheckingService;
`;

  // Create services directory if it doesn't exist
  const servicesDir = path.dirname(filePath);
  await fs.mkdir(servicesDir, { recursive: true });

  await fs.writeFile(filePath, content, 'utf8');
  console.log('✅ Created tier checking service');
}

async function updatePricingDisplay() {
  const filePath = path.join(process.cwd(), 'public/pricing.html');

  try {
    let content = await fs.readFile(filePath, 'utf8');

    // Highlight enhanced AI in Professional tier
    content = content.replace(
      /(Professional.*?features.*?)<ul>/s,
      '$1<ul><li class="enhanced-feature">🧠 <strong>Enhanced AI Assistant</strong> - Advanced code analysis & debugging</li>'
    );

    // Add CSS for enhanced features
    const enhancedCSS = `
<style>
.enhanced-feature {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white !important;
  padding: 8px 12px;
  border-radius: 8px;
  font-weight: bold;
  margin: 4px 0;
  border-left: 4px solid #FFD700;
}
</style>
`;

    content = content.replace('</head>', `${enhancedCSS}</head>`);

    await fs.writeFile(filePath, content, 'utf8');
    console.log('✅ Updated pricing display with enhanced AI highlights');
  } catch (error) {
    console.warn('⚠️ Could not update pricing display:', error.message);
  }
}

// Run the setup
setupTierGating();
