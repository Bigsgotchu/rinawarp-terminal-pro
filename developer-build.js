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
const preloadScript = `
// Developer license pre-activation
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', function() {
        const licenseKey = "DEV-ADMIN-MD8N1R9H-6DMZJIB7Z";
        
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
`;

// Inject preload script
const preloadPath = path.join(__dirname, 'src/preload.js');
if (fs.existsSync(preloadPath)) {
  let preloadContent = fs.readFileSync(preloadPath, 'utf8');
  preloadContent = preloadScript + '\n' + preloadContent;
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
