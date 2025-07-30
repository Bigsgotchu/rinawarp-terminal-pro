/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal - Module Loading Utility
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * Provides centralized module loading with error handling and fallback mechanisms.
 */

/**
 * Safely loads a module with error handling and fallback options
 * @param {string} modulePath - Path to the module to load
 * @param {Object} options - Loading options
 * @returns {Promise<Object>} - Module or fallback object
 */
export async function safeImport(modulePath, options = {}) {
  const {
    fallback = null,
    timeout = 10000,
    retries = 1,
    logErrors = true,
    name = modulePath,
  } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Set up timeout for module loading
      const importPromise = import(modulePath);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Module import timeout: ${modulePath}`)), timeout);
      });

      const module = await Promise.race([importPromise, timeoutPromise]);

      if (logErrors && attempt > 0) {
        console.log(`✅ Module loaded successfully on attempt ${attempt + 1}: ${name}`);
      }

      return module;
    } catch (error) {
      const isLastAttempt = attempt === retries;

      if (logErrors) {
        const message = isLastAttempt
          ? `❌ Failed to load module "${name}" after ${retries + 1} attempts: ${error.message}`
          : `⚠️ Module load attempt ${attempt + 1} failed for "${name}": ${error.message}`;

        if (isLastAttempt) {
          console.error(message);
        } else {
          console.warn(message);
        }
      }

      if (isLastAttempt) {
        if (fallback) {
          if (logErrors) {
            console.log(`🔄 Using fallback for module "${name}"`);
          }
          return typeof fallback === 'function' ? fallback() : fallback;
        }
        throw new Error(new ModuleLoadError(`Failed to load module: ${modulePath}`, error));
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

/**
 * Loads multiple modules with error handling
 * @param {Array<string|Object>} moduleSpecs - Array of module specifications
 * @returns {Promise<Object>} - Object with loaded modules
 */
export async function loadModules(moduleSpecs) {
  const results = {};
  const errors = [];

  for (const spec of moduleSpecs) {
    const modulePath = typeof spec === 'string' ? spec : spec.path;
    const name = typeof spec === 'string' ? modulePath : spec.name;
    const options = typeof spec === 'object' ? spec : {};

    try {
      results[name] = await safeImport(modulePath, options);
    } catch (error) {
      errors.push({ name, error });
    }
  }

  if (errors.length > 0) {
    console.warn(
      '⚠️ Some modules failed to load:',
      errors.map(e => e.name)
    );
  }

  return {
    modules: results,
    errors,
    success: errors.length === 0,
  };
}

/**
 * Creates a module registry with lazy loading
 */
export class ModuleRegistry {
  constructor() {
    this.modules = new Map();
    this.loading = new Map();
    this.fallbacks = new Map();
  }

  /**
   * Register a module for lazy loading
   * @param {string} name - Module name
   * @param {string} path - Module path
   * @param {Object} options - Loading options
   */
  register(name, path, options = {}) {
    this.modules.set(name, { path, options });

    if (options.fallback) {
      this.fallbacks.set(name, options.fallback);
    }
  }

  /**
   * Get a module (loads if not already loaded)
   * @param {string} name - Module name
   * @returns {Promise<Object>} - Module
   */
  async get(name) {
    // Check if already loaded
    if (this.loading.has(name)) {
      return await this.loading.get(name);
    }

    const moduleSpec = this.modules.get(name);
    if (!moduleSpec) {
      throw new Error(new ModuleLoadError(`Module not registered: ${name}`));
    }

    // Load the module
    const loadPromise = this.loadModule(name, moduleSpec);
    this.loading.set(name, loadPromise);

    try {
      const module = await loadPromise;
      this.loading.delete(name);
      return module;
    } catch (error) {
      this.loading.delete(name);
      throw new Error(error);
    }
  }

  async loadModule(name, spec) {
    const options = {
      ...spec.options,
      name,
      fallback: this.fallbacks.get(name),
    };

    return await safeImport(spec.path, options);
  }

  /**
   * Check if a module is available
   * @param {string} name - Module name
   * @returns {boolean} - True if module is registered
   */
  has(name) {
    return this.modules.has(name);
  }

  /**
   * Get all registered module names
   * @returns {Array<string>} - Array of module names
   */
  getRegisteredNames() {
    return Array.from(this.modules.keys());
  }

  /**
   * Clear all registered modules
   */
  clear() {
    this.modules.clear();
    this.loading.clear();
    this.fallbacks.clear();
  }
}

/**
 * Custom error class for module loading errors
 */
export class ModuleLoadError extends Error {
  constructor(message, cause = null) {
    super(message);
    this.name = 'ModuleLoadError';
    this.cause = cause;
  }
}

/**
 * Creates a fallback module factory
 * @param {string} name - Module name
 * @param {Object} methods - Fallback methods
 * @returns {Function} - Fallback factory function
 */
export function createFallback(name, methods = {}) {
  return () => {
    console.log(`🔄 Creating fallback module for: ${name}`);

    const fallbackModule = {
      __isFallback: true,
      __name: name,
      ...methods,
    };

    // Add default methods if not provided
    if (!fallbackModule.initialize) {
      fallbackModule.initialize = async () => {
        console.log(`📦 Fallback module "${name}" initialized`);
      };
    }

    if (!fallbackModule.getStatus) {
      fallbackModule.getStatus = () => ({
        name,
        status: 'fallback',
        available: true,
      });
    }

    return { default: fallbackModule };
  };
}

/**
 * Global module registry instance
 */
export const globalRegistry = new ModuleRegistry();

// Make available globally for browser environment
if (typeof window !== 'undefined') {
  window.ModuleLoader = {
    safeImport,
    loadModules,
    ModuleRegistry,
    ModuleLoadError,
    createFallback,
    globalRegistry,
  };
}
