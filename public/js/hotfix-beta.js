/**
 * RinaWarp Terminal - Beta Hotfix Script
 * This script contains hotfixes for the beta version
 */

console.log('🔧 RinaWarp Terminal Beta Hotfix loaded');

// Simple hotfix placeholder
window.rinaWarpBetaHotfix = {
  version: '1.0.0',
  loaded: true,

  // Initialize hotfixes
  init: function() {
    console.log('📦 Beta hotfixes initialized');
  }
};

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.rinaWarpBetaHotfix.init);
} else {
  window.rinaWarpBetaHotfix.init();
}
