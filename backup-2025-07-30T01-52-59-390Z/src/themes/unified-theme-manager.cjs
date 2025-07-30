/**
 * CommonJS wrapper for Unified Theme Manager
 * This file provides CommonJS compatibility for the ES module theme manager
 */

// Since this is a CommonJS file and unified-theme-manager.js is an ES module,
// we need to use dynamic import
let UnifiedThemeManager;
let themeManagerInstance;

async function loadThemeManager() {
  if (!UnifiedThemeManager) {
    const module = await import('./unified-theme-manager.js');
    UnifiedThemeManager = module.UnifiedThemeManager;
  }
  return UnifiedThemeManager;
}

async function getThemeManager() {
  if (!themeManagerInstance) {
    const ThemeManagerClass = await loadThemeManager();
    themeManagerInstance = new ThemeManagerClass();
  }
  return themeManagerInstance;
}

module.exports = {
  getThemeManager,
  loadThemeManager,
};
