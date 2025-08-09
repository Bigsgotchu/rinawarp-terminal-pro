/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 5 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal - Global Object Manager
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * Centralized manager for all global objects, state, and dependencies.
 * Prevents race conditions, conflicts, and unintentional reinitialization.
 */

// Fallback logger for environments where the full logger isn't available
const logger = {
  info: (msg, ctx) => console.info(`[INFO] ${msg}`, ctx || ''),
  warn: (msg, ctx) => console.warn(`[WARN] ${msg}`, ctx || ''),
  error: (msg, ctx) => console.error(`[ERROR] ${msg}`, ctx || ''),
  debug: (msg, ctx) => console.debug(`[DEBUG] ${msg}`, ctx || ''),
  system: (msg, ctx) => console.info(`[SYSTEM] ${msg}`, ctx || ''),
  security: (msg, ctx) => console.warn(`[SECURITY] ${msg}`, ctx || ''),
};

/**
 * Singleton Global Object Manager
 * Manages all global objects with controlled access and lifecycle management
 */
class GlobalObjectManager {
  constructor() {
    if (GlobalObjectManager.instance) {
      return GlobalObjectManager.instance;
    }

    this.globals = new Map();
    this.initializers = new Map();
    this.dependencies = new Map();
    this.initialized = new Set();
    this.initializationOrder = [];
    this.isInitializing = false;
    this.initializationPromises = new Map();

    // Track global side effects
    this.sideEffects = new Map();
    this.globalAccess = new Map();

    GlobalObjectManager.instance = this;
    logger.system('Global Object Manager initialized', { component: 'global-object-manager' });
  }

  /**
   * Register a global object with its initializer and dependencies
   * @param {string} name - Unique name for the global object
   * @param {Function} initializer - Function that creates/initializes the object
   * @param {Object} config - Configuration object
   */
  register(name, initializer, config = {}) {
    const {
      dependencies = [],
      singleton = true,
      lazy = true,
      sideEffects = [],
      namespace = 'window',
    } = config;

    if (this.globals.has(name)) {
      logger.warn('Global object already registered, skipping', {
        component: 'global-object-manager',
        object: name,
      });
      return;
    }

    this.initializers.set(name, {
      initializer,
      dependencies,
      singleton,
      lazy,
      sideEffects,
      namespace,
      config,
    });

    this.dependencies.set(name, dependencies);
    this.sideEffects.set(name, sideEffects);

    logger.debug('Global object registered', {
      component: 'global-object-manager',
      object: name,
      dependencies: dependencies.length,
      sideEffects: sideEffects.length,
    });
  }

  /**
   * Get a global object, initializing it if needed
   * @param {string} name - Name of the global object
   * @returns {Promise<any>} The global object instance
   */
  async get(name) {
    // Return existing instance if available
    if (this.globals.has(name)) {
      this.recordAccess(name);
      return this.globals.get(name);
    }

    // Return pending initialization promise if in progress
    if (this.initializationPromises.has(name)) {
      return this.initializationPromises.get(name);
    }

    // Initialize the object
    const promise = this._initialize(name);
    this.initializationPromises.set(name, promise);

    try {
      const instance = await promise;
      this.initializationPromises.delete(name);
      return instance;
    } catch (error) {
      this.initializationPromises.delete(name);
      throw new Error(new Error(error));
    }
  }

  /**
   * Initialize a global object and its dependencies
   * @private
   */
  async _initialize(name) {
    if (this.initialized.has(name)) {
      return this.globals.get(name);
    }

    if (!this.initializers.has(name)) {
      throw new Error(new Error(new Error(`Global object '${name}' not registered`)));
    }

    const config = this.initializers.get(name);
    const { initializer, dependencies, singleton, namespace } = config;

    logger.info('Initializing global object', {
      component: 'global-object-manager',
      object: name,
      dependencies: dependencies.length,
    });

    // Initialize dependencies first
    for (const dep of dependencies) {
      await this.get(dep);
    }

    try {
      // Create the instance
      const instance = await initializer();

      // Store the instance
      if (singleton) {
        this.globals.set(name, instance);
        this.initialized.add(name);
      }

      // Expose to global namespace
      this._exposeToGlobal(name, instance, namespace);

      // Track side effects
      this._recordSideEffects(name, config.sideEffects);

      this.initializationOrder.push(name);

      logger.system('Global object initialized successfully', {
        component: 'global-object-manager',
        object: name,
        namespace,
      });

      return instance;
    } catch (error) {
      logger.error('Failed to initialize global object', {
        component: 'global-object-manager',
        object: name,
        error: error.message,
        stack: error.stack,
      });
      throw new Error(new Error(error));
    }
  }

  /**
   * Expose object to global namespace safely
   * @private
   */
  _exposeToGlobal(name, instance, namespace) {
    const globalObj = this._getGlobalObject(namespace);

    if (!globalObj) {
      logger.warn('Target global namespace not available', {
        component: 'global-object-manager',
        object: name,
        namespace,
      });
      return;
    }

    // Check for conflicts
    if (globalObj[name] && globalObj[name] !== instance) {
      logger.warn('Global object conflict detected', {
        component: 'global-object-manager',
        object: name,
        namespace,
        existing: typeof globalObj[name],
      });
    }

    globalObj[name] = instance;

    this.globalAccess.set(`${namespace}.${name}`, {
      created: Date.now(),
      accessed: Date.now(),
      conflicts: globalObj[name] !== instance ? 1 : 0,
    });
  }

  /**
   * Get the appropriate global object (window, global, globalThis)
   * @private
   */
  _getGlobalObject(namespace) {
    switch (namespace) {
      case 'window':
        return typeof window !== 'undefined' ? window : null;
      case 'global':
        return typeof global !== 'undefined' ? global : null;
      case 'globalThis':
        return typeof globalThis !== 'undefined' ? globalThis : null;
      default:
        return typeof window !== 'undefined'
          ? window
          : typeof global !== 'undefined'
            ? global
            : typeof globalThis !== 'undefined'
              ? globalThis
              : null;
    }
  }

  /**
   * Record side effects for tracking
   * @private
   */
  _recordSideEffects(name, sideEffects) {
    if (sideEffects.length > 0) {
      this.sideEffects.set(name, {
        effects: sideEffects,
        recorded: Date.now(),
      });

      logger.debug('Global side effects recorded', {
        component: 'global-object-manager',
        object: name,
        effects: sideEffects,
      });
    }
  }

  /**
   * Record access to a global object
   * @private
   */
  recordAccess(name) {
    const existing = this.globalAccess.get(name) || { accessed: 0 };
    existing.accessed = Date.now();
    existing.accessCount = (existing.accessCount || 0) + 1;
    this.globalAccess.set(name, existing);
  }

  /**
   * Initialize all registered objects in dependency order
   */
  async initializeAll() {
    if (this.isInitializing) {
      logger.warn('Global initialization already in progress', {
        component: 'global-object-manager',
      });
      return;
    }

    this.isInitializing = true;
    logger.system('Starting global object initialization', {
      component: 'global-object-manager',
    });

    try {
      const sortedObjects = this._topologicalSort();

      for (const name of sortedObjects) {
        await this.get(name);
      }

      logger.system('All global objects initialized successfully', {
        component: 'global-object-manager',
        count: sortedObjects.length,
        order: this.initializationOrder,
      });
    } catch (error) {
      logger.error('Global initialization failed', {
        component: 'global-object-manager',
        error: error.message,
        stack: error.stack,
      });
      throw new Error(new Error(error));
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Topological sort for dependency resolution
   * @private
   */
  _topologicalSort() {
    const visited = new Set();
    const visiting = new Set();
    const result = [];

    const visit = name => {
      if (visiting.has(name)) {
        throw new Error(new Error(new Error(`Circular dependency detected involving: ${name}`)));
      }
      if (visited.has(name)) {
        return;
      }

      visiting.add(name);

      const dependencies = this.dependencies.get(name) || [];
      for (const dep of dependencies) {
        visit(dep);
      }

      visiting.delete(name);
      visited.add(name);
      result.push(name);
    };

    for (const name of this.initializers.keys()) {
      visit(name);
    }

    return result;
  }

  /**
   * Check for potential conflicts or issues
   */
  validateGlobals() {
    const issues = [];
    const globalObj = this._getGlobalObject('window');

    for (const [name, data] of this.globalAccess) {
      if (data.conflicts > 0) {
        issues.push({
          type: 'conflict',
          object: name,
          details: `Object was overwritten ${data.conflicts} times`,
        });
      }
    }

    // Check for untracked globals
    if (globalObj) {
      const trackedGlobals = new Set();
      for (const name of this.globals.keys()) {
        trackedGlobals.add(name);
      }

      // Common global objects to check
      const commonGlobals = [
        'RinaWarpIntegration',
        'rinaWarpIntegration',
        'beginnerUI',
        'agentManager',
        'securityDashboard',
        'AIContextEngine',
        'PerformanceMonitor',
        'TerminalSharing',
        'WorkflowAutomation',
        'ZeroTrustSecurity',
        'EnhancedSecurity',
        'NextGenUI',
      ];

      for (const global of commonGlobals) {
        if (globalObj[global] && !trackedGlobals.has(global)) {
          issues.push({
            type: 'untracked',
            object: global,
            details: 'Global object exists but is not managed',
          });
        }
      }
    }

    return issues;
  }

  /**
   * Get detailed status of all global objects
   */
  getStatus() {
    return {
      registered: this.initializers.size,
      initialized: this.initialized.size,
      pending: this.initializationPromises.size,
      initializationOrder: this.initializationOrder,
      sideEffects: Array.from(this.sideEffects.entries()),
      globalAccess: Array.from(this.globalAccess.entries()),
      issues: this.validateGlobals(),
    };
  }

  /**
   * Clean up all global objects and reset state
   */
  async cleanup() {
    logger.system('Starting global object cleanup', {
      component: 'global-object-manager',
    });

    // Call cleanup methods on instances that have them
    for (const [name, instance] of this.globals) {
      try {
        if (instance && typeof instance.cleanup === 'function') {
          await instance.cleanup();
        }
        if (instance && typeof instance.shutdown === 'function') {
          await instance.shutdown();
        }
      } catch (error) {
        logger.error('Error during object cleanup', {
          component: 'global-object-manager',
          object: name,
          error: error.message,
        });
      }
    }

    // Clear all state
    this.globals.clear();
    this.initialized.clear();
    this.initializationPromises.clear();
    this.initializationOrder = [];
    this.isInitializing = false;

    logger.system('Global object cleanup completed', {
      component: 'global-object-manager',
    });
  }
}

// Create singleton instance
const globalObjectManager = new GlobalObjectManager();

// Make available globally
if (typeof window !== 'undefined') {
  window.globalObjectManager = globalObjectManager;
}

export { GlobalObjectManager, globalObjectManager };
export default globalObjectManager;
