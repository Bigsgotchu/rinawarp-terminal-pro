/**
 * RinaWarp Terminal - Developer License Setup
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * This script sets up a special developer license for the app creator
 * with unlimited access to all features.
 */

const fs = require('fs');
const path = require('path');

// Generate a unique developer license key
function generateDeveloperLicenseKey() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `DEV-ADMIN-${timestamp}-${random}`.toUpperCase();
}

// Create enhanced license manager with developer tier
function createEnhancedLicenseManager() {
  const licenseManagerPath = path.join(__dirname, '../src/license-manager.js');
  let content = fs.readFileSync(licenseManagerPath, 'utf8');

  // Add developer tier to features
  const featuresSection = content.match(/const features = \{[\s\S]*?\};/);
  if (featuresSection) {
    const enhancedFeatures = featuresSection[0].replace(
      /enterprise: \[[\s\S]*?\],/,
      `enterprise: [
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
      developer: [
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
        'admin_panel',
        'debug_mode',
        'unlimited_ai',
        'all_features',
        'bypass_restrictions'
      ],`
    );

    content = content.replace(featuresSection[0], enhancedFeatures);
  }

  // Add developer tier to AI query limits
  const aiLimitSection = content.match(/getAIQueryLimit\(\) \{[\s\S]*?\}/);
  if (aiLimitSection) {
    const enhancedAILimit = aiLimitSection[0].replace(
      /case 'enterprise':/,
      `case 'developer':
      return -1; // unlimited (developer)
    case 'enterprise':`
    );

    content = content.replace(aiLimitSection[0], enhancedAILimit);
  }

  // Add developer license validation bypass
  const validationSection = content.match(/isValidLicense\(\) \{[\s\S]*?\}/);
  if (validationSection) {
    const enhancedValidation = validationSection[0].replace(
      /const now = Date\.now\(\);/,
      `const now = Date.now();
    
    // Developer license always valid
    if (this.licenseType === 'developer') {
      return true;
    }`
    );

    content = content.replace(validationSection[0], enhancedValidation);
  }

  // Write enhanced license manager
  fs.writeFileSync(licenseManagerPath, content);
  console.log('✅ Enhanced license manager with developer tier');
}

// Create developer license activation script
function createDeveloperActivationScript() {
  const activationScript = `
/**
 * Developer License Activation
 * Run this in the browser console to activate unlimited developer access
 */

// Generate developer license key
const developerKey = "${generateDeveloperLicenseKey()}";

// Activate developer license
if (typeof window !== 'undefined' && window.LicenseManager) {
    const licenseManager = new window.LicenseManager();
    licenseManager.activateLicense(developerKey, 'developer');
    
    // Set additional developer flags
    localStorage.setItem('rinawarp_developer_mode', 'true');
    localStorage.setItem('rinawarp_admin_access', 'true');
    localStorage.setItem('rinawarp_debug_mode', 'true');
    localStorage.setItem('rinawarp_unlimited_features', 'true');
    
    console.log('🎉 Developer license activated successfully!');
    console.log('License Key:', developerKey);
    console.log('License Type: developer');
    console.log('Features: Unlimited access to all features');
    
    // Force refresh to apply changes
    if (confirm('Developer license activated! Refresh the app to apply changes?')) {
        location.reload();
    }
} else {
    console.error('License manager not available. Please run this in the RinaWarp Terminal app.');
}
`;

  fs.writeFileSync(path.join(__dirname, '../activate-developer-license.js'), activationScript);
  console.log('✅ Created developer license activation script');
}

// Create developer build configuration
function createDeveloperBuildConfig() {
  const buildConfigPath = path.join(__dirname, '../developer-build.js');
  const buildConfig = `
/**
 * Developer Build Configuration
 * Builds RinaWarp Terminal with developer license pre-activated
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building RinaWarp Terminal with Developer License...');

// Create developer environment
process.env.RINAWARP_DEVELOPER_MODE = 'true';
process.env.RINAWARP_BYPASS_LICENSE = 'true';

// Pre-activate developer license in build
const preloadScript = \`
// Developer license pre-activation
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
        const licenseKey = "${generateDeveloperLicenseKey()}";
        
        localStorage.setItem('rinawarp_license_key', licenseKey);
        localStorage.setItem('rinawarp_license_type', 'developer');
        localStorage.setItem('rinawarp_developer_mode', 'true');
        localStorage.setItem('rinawarp_admin_access', 'true');
        localStorage.setItem('rinawarp_debug_mode', 'true');
        localStorage.setItem('rinawarp_unlimited_features', 'true');
        localStorage.setItem('rinawarp_last_validation', Date.now().toString());
        
        console.log('🎉 Developer license pre-activated in build');
    });
}
\`;

// Inject preload script
const preloadPath = path.join(__dirname, 'src/preload.js');
if (fs.existsSync(preloadPath)) {
    let preloadContent = fs.readFileSync(preloadPath, 'utf8');
    preloadContent = preloadScript + '\\n' + preloadContent;
    fs.writeFileSync(preloadPath, preloadContent);
    console.log('✅ Injected developer license into preload script');
}

// Build the application
try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('🎉 Developer build completed successfully!');
    console.log('📦 Your build includes unlimited developer access');
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}
`;

  fs.writeFileSync(buildConfigPath, buildConfig);
  console.log('✅ Created developer build configuration');
}

// Main setup function
function setupDeveloperLicense() {
  console.log('🚀 Setting up Developer License for RinaWarp Terminal...');
  console.log('👤 Creator: Karina Gilley');
  console.log('🏢 Company: Rinawarp Technologies, LLC');
  console.log('');

  try {
    // Create enhanced license manager
    createEnhancedLicenseManager();

    // Create activation script
    createDeveloperActivationScript();

    // Create developer build config
    createDeveloperBuildConfig();

    console.log('');
    console.log('🎉 Developer License Setup Complete!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Run: node activate-developer-license.js (in browser console)');
    console.log('2. Or run: node developer-build.js (for pre-activated build)');
    console.log('3. Or manually activate in the app settings');
    console.log('');
    console.log('✨ You now have unlimited access to all features!');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
setupDeveloperLicense();
