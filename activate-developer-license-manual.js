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

console.log('🚀 RinaWarp Terminal Developer License Activation');
console.log('👤 Creator: Karina Gilley');
console.log('🏢 Company: Rinawarp Technologies, LLC');
console.log('');

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

console.log('✅ Developer license activated successfully!');
console.log('🔑 License Key:', developerKey);
console.log('🎯 License Type: developer');
console.log('🌟 Features: Unlimited access to ALL features');
console.log('');
console.log('🎉 You now have:');
console.log('  • Unlimited AI assistance');
console.log('  • All themes and customizations');
console.log('  • Cloud sync (unlimited devices)');
console.log('  • Team collaboration features');
console.log('  • Advanced scripting and plugins');
console.log('  • Admin panel access');
console.log('  • Debug mode');
console.log('  • All enterprise features');
console.log('  • No restrictions whatsoever');
console.log('');

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

console.log('🔄 Please restart RinaWarp Terminal for changes to take effect.');
console.log('');
console.log('🎊 Welcome to your unlimited RinaWarp Terminal experience!');
