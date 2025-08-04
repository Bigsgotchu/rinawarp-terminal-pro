/**
 * Developer License Activation
 * Run this in the browser console to activate unlimited developer access
 */

// Generate developer license key
const developerKey = 'DEV-ADMIN-MD8N1R9H-VOGIBVRRF';

// Activate developer license
if (typeof window !== 'undefined' && window.LicenseManager) {
  const licenseManager = new window.LicenseManager();
  licenseManager.activateLicense(developerKey, 'developer');

  // Set additional developer flags
  localStorage.setItem('rinawarp_developer_mode', 'true');
  localStorage.setItem('rinawarp_admin_access', 'true');
  localStorage.setItem('rinawarp_debug_mode', 'true');
  localStorage.setItem('rinawarp_unlimited_features', 'true');

  // Force refresh to apply changes
  if (confirm('Developer license activated! Refresh the app to apply changes?')) {
    location.reload();
  }
} else {
  console.error('License manager not available. Please run this in the RinaWarp Terminal app.');
}
