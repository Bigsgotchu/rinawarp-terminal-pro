/**
 * Global ThemeManager Initialization Script
 * Ensures ThemeManager is available across all environments
 */

(function() {
  'use strict';
    
  console.log('🧜‍♀️ Initializing Global ThemeManager...');
    
  // Check if ThemeManager is already available
  if (window.ThemeManager) {
    console.log('✅ ThemeManager already available globally');
    return;
  }
    
  // Try to load ThemeManager from different sources
  function loadThemeManager() {
    // Method 1: Check if it's available as ES6 module import
    if (typeof window.ThemeManagerModule !== 'undefined') {
      window.ThemeManager = window.ThemeManagerModule.default || window.ThemeManagerModule;
      console.log('✅ ThemeManager loaded from ES6 module');
      return true;
    }
        
    // Method 2: Check if it's available as CommonJS require
    if (typeof require !== 'undefined') {
      try {
        const ThemeManager = require('../src/renderer/theme-manager.js');
        window.ThemeManager = ThemeManager.default || ThemeManager;
        console.log('✅ ThemeManager loaded via CommonJS require');
        return true;
      } catch (error) {
        console.log('⚠️ Could not load ThemeManager via require:', error.message);
      }
    }
        
    // Method 3: Dynamic import (for modern browsers)
    if (typeof window.importThemeManager !== 'undefined') {
      window.importThemeManager().then(ThemeManager => {
        window.ThemeManager = ThemeManager.default || ThemeManager;
        console.log('✅ ThemeManager loaded via dynamic import');
        initializeIfReady();
      }).catch(error => {
        console.log('⚠️ Could not load ThemeManager via dynamic import:', error.message);
        createFallbackThemeManager();
      });
      return false; // Async loading
    }
        
    return false;
  }
    
  // Fallback ThemeManager for basic functionality
  function createFallbackThemeManager() {
    console.log('🌊 Creating fallback ThemeManager...');
        
    class FallbackThemeManager {
      constructor() {
        this.currentTheme = 'mermaid-depths';
        this.themes = [
          {
            id: 'mermaid-depths',
            name: '🧜‍♀️ Mermaid Depths',
            description: 'Mystical underwater theme with hot pinks and teal blues',
            category: 'Nature',
            className: 'theme-mermaid',
          }
        ];
      }
            
      getAvailableThemes() {
        return this.themes;
      }
            
      getCurrentTheme() {
        return this.themes.find(t => t.id === this.currentTheme);
      }
            
      applyTheme(themeId) {
        if (themeId) {
          this.currentTheme = themeId;
        }
                
        // Apply mermaid theme
        document.body.classList.remove('theme-default-dark', 'theme-mermaid-depths');
        document.body.classList.add('theme-mermaid');
                
        // Add fallback CSS
        this.injectFallbackCSS();
                
        console.log('🧜‍♀️ Fallback ThemeManager applied mermaid theme');
      }
            
      injectFallbackCSS() {
        if (document.getElementById('fallback-mermaid-theme')) return;
                
        const style = document.createElement('style');
        style.id = 'fallback-mermaid-theme';
        style.textContent = `
                    body.theme-mermaid {
                        background: linear-gradient(135deg, #0a0b1e 0%, #1a0b3d 50%, #2d1b69 100%) !important;
                        background-attachment: fixed !important;
                        color: #ff69b4 !important;
                    }
                    body.theme-mermaid h1, body.theme-mermaid h2, body.theme-mermaid h3 {
                        color: #ff1493 !important;
                        text-shadow: 0 0 10px rgba(255, 20, 147, 0.5) !important;
                    }
                    body.theme-mermaid a {
                        color: #00e5ff !important;
                    }
                    body.theme-mermaid button, body.theme-mermaid .btn {
                        background: linear-gradient(135deg, #ff1493, #ff69b4) !important;
                        border: 1px solid #00e5ff !important;
                        color: #0a0b1e !important;
                        box-shadow: 0 2px 4px rgba(0, 229, 255, 0.3) !important;
                    }
                    body.theme-mermaid button:hover, body.theme-mermaid .btn:hover {
                        background: linear-gradient(135deg, #00e5ff, #40e0d0) !important;
                        transform: translateY(-1px) !important;
                    }
                `;
        document.head.appendChild(style);
        console.log('💫 Fallback mermaid CSS injected');
      }
            
      saveTheme(themeId) {
        try {
          localStorage.setItem('rinawarp-current-theme', themeId);
        } catch (error) {
          console.log('Failed to save theme preference');
        }
      }
    }
        
    window.ThemeManager = FallbackThemeManager;
    console.log('✅ Fallback ThemeManager created and set globally');
  }
    
  // Initialize ThemeManager instance if class is available
  function initializeIfReady() {
    if (window.ThemeManager && !window.themeManagerInstance) {
      try {
        window.themeManagerInstance = new window.ThemeManager();
        console.log('✅ ThemeManager instance created globally');
                
        // Auto-apply mermaid theme
        setTimeout(() => {
          if (window.themeManagerInstance.applyTheme) {
            window.themeManagerInstance.applyTheme('mermaid-depths');
          }
        }, 100);
                
      } catch (error) {
        console.error('Failed to create ThemeManager instance:', error);
        createFallbackThemeManager();
      }
    }
  }
    
  // Try loading ThemeManager
  const loaded = loadThemeManager();
  if (loaded) {
    initializeIfReady();
  } else {
    // Fallback after a short delay
    setTimeout(() => {
      if (!window.ThemeManager) {
        createFallbackThemeManager();
        initializeIfReady();
      }
    }, 1000);
  }
    
  // Make sure mermaid theme gets applied on load
  function ensureMermaidTheme() {
    if (document.body.classList.contains('theme-mermaid')) return;
        
    console.log('🧜‍♀️ Ensuring mermaid theme is applied...');
    document.body.classList.add('theme-mermaid');
        
    // Inject basic mermaid CSS if not present
    if (!document.getElementById('emergency-mermaid-theme')) {
      const style = document.createElement('style');
      style.id = 'emergency-mermaid-theme';
      style.textContent = `
                body.theme-mermaid {
                    background: linear-gradient(135deg, #0a0b1e 0%, #1a0b3d 50%, #2d1b69 100%) !important;
                    background-attachment: fixed !important;
                    color: #ff69b4 !important;
                }
            `;
      document.head.appendChild(style);
    }
  }
    
  // Apply theme on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureMermaidTheme);
  } else {
    ensureMermaidTheme();
  }
    
  // Export for module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadThemeManager, createFallbackThemeManager };
  }
    
  console.log('🌊 Global ThemeManager initialization complete');
    
})();
