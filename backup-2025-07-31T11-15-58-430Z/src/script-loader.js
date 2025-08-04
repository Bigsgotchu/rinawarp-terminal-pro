/**
 * Script Deduplication System for RinaWarp Terminal
 * Prevents duplicate script loading and declaration errors
 */

(function () {
  'use strict';

  // Track loaded scripts and prevent duplicates
  window.RinaWarpScriptLoader = window.RinaWarpScriptLoader || {
    loadedScripts: new Set(),
    loadedModules: new Map(),

    // Load script only if not already loaded
    loadScript: function (src, callback) {
      if (this.loadedScripts.has(src)) {
        console.log(`⚠️ Script already loaded: ${src}`);
        if (callback) callback();
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;

        script.onload = () => {
          this.loadedScripts.add(src);
          console.log(`✅ Script loaded: ${src}`);
          if (callback) callback();
          resolve();
        };

        script.onerror = error => {
          console.error(`❌ Failed to load script: ${src}`, error);
          reject(error);
        };

        document.head.appendChild(script);
      });
    },

    // Load module with deduplication
    loadModule: function (name, factory) {
      if (this.loadedModules.has(name)) {
        return this.loadedModules.get(name);
      }

      const module = factory();
      this.loadedModules.set(name, module);
      return module;
    },

    // Check if script is loaded
    isLoaded: function (src) {
      return this.loadedScripts.has(src);
    },

    // Get loaded module
    getModule: function (name) {
      return this.loadedModules.get(name);
    },
  };

  // Prevent duplicate class declarations
  window.RinaWarpClasses = window.RinaWarpClasses || new Set();

  // Helper function to safely declare classes
  window.declareClass = function (className, classFactory) {
    if (window.RinaWarpClasses.has(className)) {
      console.log(`⚠️ Class already declared: ${className}`);
      return window[className];
    }

    const ClassConstructor = classFactory();
    window[className] = ClassConstructor;
    window.RinaWarpClasses.add(className);
    console.log(`✅ Class declared: ${className}`);
    return ClassConstructor;
  };

  // Safe module loader for individual components
  window.safeLoadModule = function (moduleName, moduleFactory) {
    if (window[moduleName]) {
      return window[moduleName];
    }

    try {
      const module = moduleFactory();
      window[moduleName] = module;
      return module;
    } catch (error) {
      console.error(`❌ Error loading module ${moduleName}:`, error);
      return null;
    }
  };
})();
