/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 4 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Terminal Main Entry Point
 * Consolidated entry point that dynamically loads terminal features
 */

// Import terminal dependencies (currently disabled in this stub version)
// import { Terminal, FitAddon, WebLinksAddon } from './vendor.js';
import '@/utils/module-loader.js';
import '@/utils/global-registry.js';

// Terminal core functionality
import { RinaWarpTerminal } from '@/renderer/terminal-core.js';

// Dynamic feature loading system
class FeatureLoader {
  constructor() {
    this.loadedFeatures = new Map();
    this.loadingPromises = new Map();
  }

  async loadFeature(featureName) {
    if (this.loadedFeatures.has(featureName)) {
      return this.loadedFeatures.get(featureName);
    }

    if (this.loadingPromises.has(featureName)) {
      return this.loadingPromises.get(featureName);
    }

    const loadPromise = this._loadFeatureModule(featureName);
    this.loadingPromises.set(featureName, loadPromise);

    try {
      const module = await loadPromise;
      this.loadedFeatures.set(featureName, module);
      this.loadingPromises.delete(featureName);
      return module;
    } catch (error) {
      this.loadingPromises.delete(featureName);
      console.error(`Failed to load feature ${featureName}:`, error);
      throw new Error(error);
    }
  }

  async _loadFeatureModule(featureName) {
    switch (featureName) {
    case 'ai-assistant':
      return import(/* webpackChunkName: "ai-assistant" */ './ai-assistant.js');
    case 'system-vitals':
      return import(/* webpackChunkName: "system-vitals" */ './system-vitals.js');
    case 'voice-engine':
      return import(/* webpackChunkName: "voice-engine" */ './voice-engine.js');
    case 'plugin-system':
      return import(/* webpackChunkName: "plugin-system" */ './plugin-system.js');
    default:
      throw new Error(new Error(`Unknown feature: ${featureName}`));
    }
  }

  getLoadedFeatures() {
    return Array.from(this.loadedFeatures.keys());
  }

  isFeatureLoaded(featureName) {
    return this.loadedFeatures.has(featureName);
  }
}

// Enhanced shell manager factory available but not imported to avoid unused variable warning
// import { createEnhancedShellManager } from '../renderer/enhanced-shell-process-manager.js';
import '../renderer/global-integration-system.js'; // Auto-initializes on DOM ready

// Enhanced Terminal class with feature loading
class RinaWarpEnhancedTerminal extends RinaWarpTerminal {
  constructor(options = {}) {
    super(options);
    this.featureLoader = new FeatureLoader();
    this.features = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    // Initialize core terminal
    await super.initialize();

    // Set up feature loading commands
    this.setupFeatureCommands();

    // Auto-load essential features based on configuration
    await this.loadEssentialFeatures();

    this.initialized = true;
    this.emitEvent('terminal:ready', { features: this.featureLoader.getLoadedFeatures() });
  }

  setupFeatureCommands() {
    // Add commands for loading features dynamically
    this.addCommand('load-ai', () => this.loadFeature('ai-assistant'));
    this.addCommand('load-vitals', () => this.loadFeature('system-vitals'));
    this.addCommand('load-voice', () => this.loadFeature('voice-engine'));
    this.addCommand('load-plugins', () => this.loadFeature('plugin-system'));
    this.addCommand('features', () => this.showFeatureStatus());
  }

  async loadFeature(featureName) {
    try {
      this.showLoadingIndicator(`Loading ${featureName}...`);

      const featureModule = await this.featureLoader.loadFeature(featureName);

      // Initialize the feature
      if (featureModule.default) {
        const FeatureClass = featureModule.default;
        const featureInstance = new FeatureClass(this);
        await featureInstance.initialize?.();
        this.features.set(featureName, featureInstance);
      }

      this.hideLoadingIndicator();
      this.writeSuccess(`✅ ${featureName} loaded successfully!`);
      this.emitEvent('feature:loaded', { feature: featureName });

      return featureModule;
    } catch (error) {
      this.hideLoadingIndicator();
      this.writeError(`❌ Failed to load ${featureName}: ${error.message}`);
      throw new Error(error);
    }
  }

  async loadEssentialFeatures() {
    const essentialFeatures = ['system-vitals']; // Start with minimal set

    for (const feature of essentialFeatures) {
      try {
        await this.loadFeature(feature);
      } catch (error) {
        console.warn(`Non-critical feature ${feature} failed to load:`, error);
      }
    }
  }

  showFeatureStatus() {
    const loaded = this.featureLoader.getLoadedFeatures();
    const available = ['ai-assistant', 'system-vitals', 'voice-engine', 'plugin-system'];

    this.writeLine('\n🦾 RinaWarp Feature Status:');
    this.writeLine('========================');

    available.forEach(feature => {
      const status = loaded.includes(feature) ? '✅ Loaded' : '⏳ Available';
      const command = loaded.includes(feature) ? '' : ` (use 'load-${feature.split('-')[0]}')`;
      this.writeLine(`  ${feature}: ${status}${command}`);
    });

    this.writeLine('');
  }

  showLoadingIndicator(message) {
    this.writeLine(`\n${message}`);
  }

  hideLoadingIndicator() {
    // Implementation depends on terminal capabilities
  }

  writeSuccess(message) {
    this.writeLine(`\\x1b[32m${message}\\x1b[0m`);
  }

  writeError(message) {
    this.writeLine(`\\x1b[31m${message}\\x1b[0m`);
  }

  emitEvent(eventName, data) {
    if (window) {
      window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
  }

  // Feature management API
  getFeature(featureName) {
    return this.features.get(featureName);
  }

  isFeatureEnabled(featureName) {
    return this.features.has(featureName);
  }

  async unloadFeature(featureName) {
    const feature = this.features.get(featureName);
    if (feature) {
      await feature.cleanup?.();
      this.features.delete(featureName);
      this.emitEvent('feature:unloaded', { feature: featureName });
    }
  }
}

// Application initialization
class RinaWarpApp {
  constructor() {
    this.__VERSION__ = '1.0.0';
    this.terminal = null;
    this.config = this.loadConfig();
  }

  loadConfig() {
    // Load configuration from various sources
    return {
      terminal: {
        theme: 'rinawarp-dark',
        fontSize: 14,
        fontFamily: 'SF Mono, Monaco, Inconsolata, Fira Code, monospace',
      },
      features: {
        autoLoad: ['system-vitals'],
        available: ['ai-assistant', 'voice-engine', 'plugin-system'],
      },
      debug: typeof process !== 'undefined' && process.env.NODE_ENV === 'development',
    };
  }

  async initialize() {
    try {
      // Initialize terminal
      this.terminal = new RinaWarpEnhancedTerminal(this.config.terminal);
      await this.terminal.initialize();

      // Set up global access
      if (typeof window !== 'undefined') {
        window.RinaWarp = {
          terminal: this.terminal,
          version: this.__VERSION__ || '1.0.0',
          buildDate: typeof process !== 'undefined' ? process.env.BUILD_DATE : 'Unknown',
          config: this.config,
        };
      }

      // Set up error handling
      this.setupErrorHandling();

      return this.terminal;
    } catch (error) {
      console.error('Failed to initialize RinaWarp Terminal:', error);
      this.handleInitializationError(error);
      throw new Error(error);
    }
  }

  setupErrorHandling() {
    window.addEventListener('error', event => {
      console.error('Global error:', event.error);
      this.terminal?.writeError(`System error: ${event.error.message}`);
    });

    window.addEventListener('unhandledrejection', event => {
      console.error('Unhandled promise rejection:', event.reason);
      this.terminal?.writeError(`Promise rejection: ${event.reason}`);
    });
  }

  handleInitializationError(error) {
    const errorContainer = document.getElementById('error-container') || document.body;
    errorContainer.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #1a1a2e;
        color: #ff6b6b;
        padding: 2rem;
        border-radius: 8px;
        border: 1px solid #ff6b6b;
        font-family: monospace;
        z-index: 9999;
      ">
        <h2>🚨 Terminal Initialization Failed</h2>
        <p>Error: ${error.message}</p>
        <p>Please refresh the page or check the console for details.</p>
        <button onclick="window.location.reload()" style="
          background: #00ff88;
          color: #000;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 1rem;
        ">Refresh Page</button>
      </div>
    `;
  }
}

// Auto-initialize when DOM is ready
let app = null;

function initializeApp() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
    return;
  }

  app = new RinaWarpApp();
  app.initialize().catch(error => {
    console.error('App initialization failed:', error);
  });
}

// Start the application
initializeApp();

// Export for module usage
export { RinaWarpEnhancedTerminal, RinaWarpApp, FeatureLoader };
export default RinaWarpEnhancedTerminal;
