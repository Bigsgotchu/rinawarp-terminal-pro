/**
 * Module Configuration Helper
 * Fixes ES module loading issues and improves error handling
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

// ESM compatibility helpers
export const __filename = metaUrl => fileURLToPath(metaUrl);
export const __dirname = metaUrl => dirname(fileURLToPath(metaUrl));
export const require = metaUrl => createRequire(metaUrl);

// Module loading with error handling
export class ModuleLoader {
  static cache = new Map();
  static errors = new Map();

  /**
   * Load a module with proper error handling and caching
   */
  static async load(modulePath, options = {}) {
    const { fallback = null, retries = 3, cache = true, timeout = 5000 } = options;

    // Check cache first
    if (cache && this.cache.has(modulePath)) {
      return this.cache.get(modulePath);
    }

    let lastError = null;
    for (let i = 0; i < retries; i++) {
      try {
        const module = await this.loadWithTimeout(modulePath, timeout);

        if (cache) {
          this.cache.set(modulePath, module);
        }

        return module;
      } catch (error) {
        lastError = error;
        console.warn(
          `Failed to load module ${modulePath} (attempt ${i + 1}/${retries}):`,
          error.message
        );

        // Wait before retry with exponential backoff
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
        }
      }
    }

    // Store error for debugging
    this.errors.set(modulePath, lastError);

    // Use fallback if provided
    if (fallback !== null) {
      console.info(`Using fallback for module ${modulePath}`);
      return fallback;
    }

    throw new Error(
      `Failed to load module ${modulePath} after ${retries} attempts: ${lastError.message}`
    );
  }

  /**
   * Load module with timeout protection
   */
  static async loadWithTimeout(modulePath, timeout) {
    return Promise.race([
      import(modulePath),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Module load timeout: ${modulePath}`)), timeout)
      ),
    ]);
  }

  /**
   * Safe dynamic import with fallback
   */
  static async safeImport(modulePath, fallback = {}) {
    try {
      return await import(modulePath);
    } catch (error) {
      console.warn(`Safe import failed for ${modulePath}:`, error.message);
      return fallback;
    }
  }

  /**
   * Check if module exists before loading
   */
  static async exists(modulePath) {
    try {
      await import.meta.resolve(modulePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear module cache
   */
  static clearCache(modulePath = null) {
    if (modulePath) {
      this.cache.delete(modulePath);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get loading errors for debugging
   */
  static getErrors() {
    return Array.from(this.errors.entries()).map(([path, error]) => ({
      path,
      error: error.message,
      stack: error.stack,
    }));
  }
}

// Module resolution helpers
export const resolveModule = async (name, basePath = process.cwd()) => {
  try {
    return await import.meta.resolve(name, `file://${basePath}/`);
  } catch {
    // Fallback to Node resolution
    const require = createRequire(import.meta.url);
    return require.resolve(name);
  }
};

// CommonJS compatibility wrapper
export const compatibleExport = module => {
  if (module && typeof module === 'object') {
    // Handle both ESM and CommonJS exports
    return module.default || module;
  }
  return module;
};

// Error handling for module operations
export class ModuleError extends Error {
  constructor(message, modulePath, originalError) {
    super(message);
    this.name = 'ModuleError';
    this.modulePath = modulePath;
    this.originalError = originalError;
  }
}

// Module initialization helper
export const initializeModule = async (modulePath, config = {}) => {
  try {
    const module = await ModuleLoader.load(modulePath, {
      cache: config.cache !== false,
      retries: config.retries || 3,
    });

    // Initialize if module has init function
    if (module && typeof module.init === 'function') {
      await module.init(config);
    }

    return module;
  } catch (error) {
    throw new ModuleError(`Failed to initialize module: ${modulePath}`, modulePath, error);
  }
};

// Batch module loading
export const loadModules = async (modules, options = {}) => {
  const { parallel = true, stopOnError = false } = options;

  if (parallel) {
    const results = await Promise.allSettled(
      modules.map(module =>
        typeof module === 'string'
          ? ModuleLoader.load(module, options)
          : ModuleLoader.load(module.path, { ...options, ...module.options })
      )
    );

    if (stopOnError) {
      const failed = results.find(r => r.status === 'rejected');
      if (failed) {
        throw failed.reason;
      }
    }

    return results.map((result, index) => ({
      module: modules[index],
      loaded: result.status === 'fulfilled',
      value: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null,
    }));
  } else {
    const results = [];
    for (const module of modules) {
      try {
        const loaded =
          typeof module === 'string'
            ? await ModuleLoader.load(module, options)
            : await ModuleLoader.load(module.path, { ...options, ...module.options });

        results.push({
          module,
          loaded: true,
          value: loaded,
          error: null,
        });
      } catch (error) {
        results.push({
          module,
          loaded: false,
          value: null,
          error,
        });

        if (stopOnError) {
          throw error;
        }
      }
    }
    return results;
  }
};

// Export singleton instance for convenience
export const moduleLoader = new ModuleLoader();

// Default export for CommonJS compatibility
export default {
  ModuleLoader,
  moduleLoader,
  initializeModule,
  loadModules,
  resolveModule,
  compatibleExport,
  ModuleError,
  __filename,
  __dirname,
  require,
};
