/**
 * Manual Developer License Activation for RinaWarp Terminal
 *
 * Instructions:
 * 1. Open RinaWarp Terminal
 * 2. Open Developer Tools (F12 or Cmd+Option+I)
 * 3. Go to Console tab
 * 4. Copy and paste this entire script
 * 5. Press Enter to run
 */

// Generate unique developer license key
const timestamp = Date.now().toString(36);
const random = Math.random().toString(36).substr(2, 9);
const developerKey = `DEV-ADMIN-${timestamp}-${random}`.toUpperCase();

// Set developer license in localStorage
localStorage.setItem('rinawarp_license_key', developerKey);
localStorage.setItem('rinawarp_license_type', 'developer');
localStorage.setItem('rinawarp_developer_mode', 'true');
localStorage.setItem('rinawarp_admin_access', 'true');
localStorage.setItem('rinawarp_debug_mode', 'true');
localStorage.setItem('rinawarp_unlimited_features', 'true');
localStorage.setItem('rinawarp_last_validation', Date.now().toString());

// Clear any existing trial limitations
localStorage.removeItem('rinawarp_trial_start');
localStorage.removeItem('ai_usage_' + new Date().toDateString());

// Try to activate with LicenseManager if available
if (typeof window !== 'undefined' && window.LicenseManager) {
  try {
    const licenseManager = new window.LicenseManager();
    licenseManager.activateLicense(developerKey, 'developer');
    console.log('✅ LicenseManager integration successful');
  } catch (error) {
    console.log('⚠️  LicenseManager not available, using localStorage method');
  }
}
