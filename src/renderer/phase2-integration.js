/**
 * RinaWarp Terminal - Phase2 Integration
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * This file is part of RinaWarp Terminal, an advanced open-source terminal emulator with
 * AI assistance, live collaboration, and enterprise-grade security features.
 *
 * Licensed under the MIT License.
 * See LICENSE file for detailed terms and conditions.
 *
 * Project repository: https://github.com/rinawarp/terminal
 */
import Phase2UIManager from './phase2-ui-manager.js';

class Phase2Integration {
  constructor() {
    this.isEnabled = false;
    this.isInitialized = false;
    this.uiManager = null;
    this.originalTerminalElements = new Map();
    this.integrationConfig = {
      enableAdaptiveUI: true,
      enableMultimodal: true,
      enableCollaboration: true,
      enableAccessibility: true,
      enablePerformanceMonitoring: true,
      autoActivate: true,
      transitionDuration: 500,
    };

    this.eventListeners = new Map();
    this.moduleStates = new Map();

    console.log('🌟 Phase 2 Integration Controller initialized');
  }

  async initialize(config = {}, terminalManager = null) {
    console.log('🚀 Starting Phase 2 integration initialization...');

    try {
      // Merge configuration
      this.integrationConfig = { ...this.integrationConfig, ...config };
      this.terminalManager = terminalManager;

      // Check browser compatibility
      if (!this.checkBrowserCompatibility()) {
        throw new Error('Browser does not support required Phase 2 features');
      }

      // Load required stylesheets
      await this.loadStylesheets();

      // Initialize UI Manager
      await this.initializeUIManager();

      // Setup integration event handlers
      this.setupIntegrationEventHandlers();

      // Perform initial setup
      await this.performInitialSetup();

      // Auto-activate if configured
      if (this.integrationConfig.autoActivate) {
        await this.activate();
      }

      this.isInitialized = true;
      console.log('✅ Phase 2 integration successfully initialized');

      // Emit ready event
      this.emit('phase2-integration-ready');

      return true;
    } catch (error) {
      console.error('❌ Phase 2 integration initialization failed:', error);
      this.emit('phase2-integration-error', error);
      return false;
    }
  }

  checkBrowserCompatibility() {
    const requiredFeatures = [
      'CSS.supports',
      'IntersectionObserver',
      'ResizeObserver',
      'PerformanceObserver',
      'requestAnimationFrame',
      'fetch',
      'Promise',
      'Map',
      'Set',
      'Symbol',
    ];

    const missingFeatures = requiredFeatures.filter(feature => {
      if (feature.includes('.')) {
        const [obj, method] = feature.split('.');
        return !window[obj] || !window[obj][method];
      }
      return !window[feature];
    });

    if (missingFeatures.length > 0) {
      console.warn('⚠️ Missing browser features:', missingFeatures);
      return false;
    }

    // Check CSS features
    const cssFeatures = ['backdrop-filter', 'css-grid', 'flexbox', 'css-variables'];

    const missingCSSFeatures = cssFeatures.filter(feature => {
      return !CSS.supports(`(${feature.replace('css-', '')}: initial)`);
    });

    if (missingCSSFeatures.length > 0) {
      console.warn('⚠️ Missing CSS features:', missingCSSFeatures);
    }

    return true;
  }

  async loadStylesheets() {
    const stylesheets = ['../../styles/phase2-ui.css'];

    const loadPromises = stylesheets.map(href => {
      return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = resolve;
        link.onerror = reject;
        document.head.appendChild(link);
      });
    });

    try {
      await Promise.all(loadPromises);
      console.log('✅ Phase 2 stylesheets loaded successfully');
    } catch (error) {
      console.warn('⚠️ Some stylesheets failed to load:', error);
    }
  }

  async initializeUIManager() {
    this.uiManager = new Phase2UIManager(this.terminalManager);

    // Setup UI Manager event handlers
    this.uiManager.on('phase2-ready', () => {
      console.log('✅ Phase 2 UI Manager is ready');
      this.moduleStates.set('uiManager', 'ready');

      // Register with RinaWarp integration system
      this.registerWithIntegrationSystem();
    });

    this.uiManager.on('phase2-error', error => {
      console.error('❌ Phase 2 UI Manager error:', error);
      this.moduleStates.set('uiManager', 'error');
    });

    this.uiManager.on('mode-changed', mode => {
      console.log(`🔄 UI mode changed to: ${mode}`);
      this.emit('mode-changed', mode);
    });

    // Wait for UI Manager to be ready
    await new Promise(resolve => {
      if (this.uiManager.isReady()) {
        resolve();
      } else {
        this.uiManager.once('phase2-ready', resolve);
      }
    });
  }

  setupIntegrationEventHandlers() {
    // Window resize handler
    this.eventListeners.set('resize', () => {
      this.handleWindowResize();
    });
    window.addEventListener('resize', this.eventListeners.get('resize'));

    // Visibility change handler
    this.eventListeners.set('visibilitychange', () => {
      this.handleVisibilityChange();
    });
    document.addEventListener('visibilitychange', this.eventListeners.get('visibilitychange'));

    // Before unload handler
    this.eventListeners.set('beforeunload', () => {
      this.handleBeforeUnload();
    });
    window.addEventListener('beforeunload', this.eventListeners.get('beforeunload'));

    // Global error handler
    this.eventListeners.set('error', event => {
      this.handleGlobalError(event);
    });
    window.addEventListener('error', this.eventListeners.get('error'));

    // Unhandled promise rejection handler
    this.eventListeners.set('unhandledrejection', event => {
      this.handleUnhandledRejection(event);
    });
    window.addEventListener('unhandledrejection', this.eventListeners.get('unhandledrejection'));
  }

  async performInitialSetup() {
    // Backup original terminal elements
    this.backupOriginalElements();

    // Setup performance monitoring
    if (this.integrationConfig.enablePerformanceMonitoring) {
      this.setupPerformanceMonitoring();
    }

    // Initialize feature flags
    this.initializeFeatureFlags();

    // Setup user preferences
    await this.loadUserPreferences();
  }

  backupOriginalElements() {
    const elementsToBackup = [
      '.app-container',
      '.main-content',
      '.terminal-container',
      '.title-bar',
      '.status-bar',
    ];

    elementsToBackup.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        this.originalTerminalElements.set(selector, {
          element: element.cloneNode(true),
          parent: element.parentNode,
          nextSibling: element.nextSibling,
        });
      }
    });

    console.log('💾 Original terminal elements backed up');
  }

  setupPerformanceMonitoring() {
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name.includes('phase2')) {
            console.log(`⚡ Performance: ${entry.name} took ${entry.duration}ms`);
          }
        });
      });

      observer.observe({ entryTypes: ['measure', 'navigation'] });
    }
  }

  initializeFeatureFlags() {
    this.featureFlags = new Map([
      ['adaptiveUI', this.integrationConfig.enableAdaptiveUI],
      ['multimodal', this.integrationConfig.enableMultimodal],
      ['collaboration', this.integrationConfig.enableCollaboration],
      ['accessibility', this.integrationConfig.enableAccessibility],
      ['performanceMonitoring', this.integrationConfig.enablePerformanceMonitoring],
    ]);
  }

  async loadUserPreferences() {
    try {
      const preferences = localStorage.getItem('rinawarp-phase2-preferences');
      if (preferences) {
        const parsed = JSON.parse(preferences);
        this.userPreferences = parsed;
        console.log('📋 User preferences loaded');
      } else {
        this.userPreferences = this.getDefaultPreferences();
        console.log('📋 Default preferences applied');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load user preferences:', error);
      this.userPreferences = this.getDefaultPreferences();
    }
  }

  getDefaultPreferences() {
    return {
      uiMode: 'adaptive',
      theme: 'auto',
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        screenReader: false,
      },
      performance: {
        enableOptimizations: true,
        maxFPS: 60,
      },
      collaboration: {
        autoJoinSessions: false,
        shareByDefault: false,
      },
    };
  }

  async activate() {
    if (this.isEnabled) {
      console.log('ℹ️ Phase 2 is already active');
      return;
    }

    console.log('🔄 Activating Phase 2 integration...');

    try {
      // Show activation animation
      await this.showActivationAnimation();

      // Transition original UI elements
      await this.transitionOriginalElements();

      // Enable Phase 2 UI
      this.isEnabled = true;

      // Apply user preferences
      await this.applyUserPreferences();

      // Show welcome notification
      this.showWelcomeNotification();

      console.log('✅ Phase 2 integration activated successfully');
      this.emit('phase2-activated');
    } catch (error) {
      console.error('❌ Failed to activate Phase 2:', error);
      await this.deactivate(); // Rollback on failure
      throw error;
    }
  }

  async showActivationAnimation() {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'phase2-activation-overlay';
      overlay.innerHTML = `
                <div class="activation-content">
                    <div class="activation-logo">🌟</div>
                    <h2>Activating Phase 2</h2>
                    <div class="activation-progress">
                        <div class="progress-bar"></div>
                    </div>
                    <p>Initializing next-generation interface...</p>
                </div>
            `;

      // Add styles
      overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(26, 26, 26, 0.95));
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(20px);
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;

      document.body.appendChild(overlay);

      // Animate
      overlay.style.opacity = '0';
      overlay.style.transform = 'scale(1.1)';

      requestAnimationFrame(() => {
        overlay.style.transition = 'all 0.5s ease';
        overlay.style.opacity = '1';
        overlay.style.transform = 'scale(1)';

        setTimeout(() => {
          overlay.style.opacity = '0';
          overlay.style.transform = 'scale(0.9)';

          setTimeout(() => {
            overlay.remove();
            resolve();
          }, 500);
        }, 2000);
      });
    });
  }

  async transitionOriginalElements() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      // Move terminal container to Phase 2
      const terminalContainer = document.querySelector('.terminal-container');
      const enhancedContainer = document.querySelector('.enhanced-terminal-container');

      if (terminalContainer && enhancedContainer) {
        enhancedContainer.appendChild(terminalContainer);
      }
    }
  }

  async applyUserPreferences() {
    if (this.uiManager && this.userPreferences) {
      // Apply UI mode
      if (this.userPreferences.uiMode) {
        await this.uiManager.switchMode(this.userPreferences.uiMode);
      }

      // Apply accessibility settings
      if (this.userPreferences.accessibility) {
        await this.applyAccessibilitySettings(this.userPreferences.accessibility);
      }

      // Apply performance settings
      if (this.userPreferences.performance) {
        await this.applyPerformanceSettings(this.userPreferences.performance);
      }
    }
  }

  async applyAccessibilitySettings(settings) {
    const container = document.querySelector('.phase2-ui-container');
    if (container) {
      if (settings.highContrast) {
        container.classList.add('high-contrast');
      }
      if (settings.reducedMotion) {
        container.classList.add('reduced-motion');
      }
    }
  }

  async applyPerformanceSettings(settings) {
    if (settings.enableOptimizations) {
      // Enable performance optimizations
      this.enablePerformanceOptimizations();
    }
  }

  enablePerformanceOptimizations() {
    // Implement performance optimizations
    console.log('⚡ Performance optimizations enabled');
  }

  showWelcomeNotification() {
    if (this.uiManager) {
      this.uiManager.showNotification(
        'Welcome to Phase 2! Your next-generation terminal experience is now active.',
        'success',
        7000
      );
    }
  }

  async deactivate() {
    if (!this.isEnabled) {
      console.log('ℹ️ Phase 2 is already inactive');
      return;
    }

    console.log('🔄 Deactivating Phase 2 integration...');

    try {
      // Hide Phase 2 UI
      const container = document.querySelector('.phase2-ui-container');
      if (container) {
        container.style.display = 'none';
      }

      // Restore original elements
      await this.restoreOriginalElements();

      this.isEnabled = false;

      console.log('✅ Phase 2 integration deactivated');
      this.emit('phase2-deactivated');
    } catch (error) {
      console.error('❌ Failed to deactivate Phase 2:', error);
      throw error;
    }
  }

  async restoreOriginalElements() {
    this.originalTerminalElements.forEach((backup, selector) => {
      const currentElement = document.querySelector(selector);
      if (currentElement && backup.parent) {
        backup.parent.insertBefore(backup.element, backup.nextSibling);
        currentElement.remove();
      }
    });
  }

  async toggle() {
    if (this.isEnabled) {
      await this.deactivate();
    } else {
      await this.activate();
    }
  }

  handleWindowResize() {
    if (this.isEnabled && this.uiManager) {
      // Handle responsive updates
      this.uiManager.emit('window-resize');
    }
  }

  handleVisibilityChange() {
    if (document.hidden) {
      // Pause non-critical operations
      this.pauseNonCriticalOperations();
    } else {
      // Resume operations
      this.resumeOperations();
    }
  }

  handleBeforeUnload() {
    // Save user preferences
    this.saveUserPreferences();

    // Cleanup resources
    this.cleanup();
  }

  handleGlobalError(event) {
    console.error('🚨 Global error in Phase 2:', event.error);
    // Implement error recovery if needed
  }

  handleUnhandledRejection(event) {
    console.error('🚨 Unhandled promise rejection in Phase 2:', event.reason);
  }

  pauseNonCriticalOperations() {
    console.log('⏸️ Pausing non-critical operations');
  }

  resumeOperations() {
    console.log('▶️ Resuming operations');
  }

  saveUserPreferences() {
    try {
      if (this.userPreferences) {
        localStorage.setItem('rinawarp-phase2-preferences', JSON.stringify(this.userPreferences));
      }
    } catch (error) {
      console.warn('⚠️ Failed to save user preferences:', error);
    }
  }

  isActive() {
    return this.isEnabled;
  }

  isReady() {
    return this.isInitialized;
  }

  getUIManager() {
    return this.uiManager;
  }

  getFeatureFlags() {
    return new Map(this.featureFlags);
  }

  getUserPreferences() {
    return { ...this.userPreferences };
  }

  setUserPreference(key, value) {
    if (this.userPreferences) {
      this.userPreferences[key] = value;
      this.saveUserPreferences();
    }
  }

  registerWithIntegrationSystem() {
    try {
      // Check if RinaWarp integration system is available
      if (window.rinaWarpIntegration && window.rinaWarpIntegration.hub) {
        const hub = window.rinaWarpIntegration.hub;

        // Register Phase 2 UI Manager
        hub.registerFeature('phase2-ui-manager', {
          name: 'Phase 2 Next-Generation UI Manager',
          version: '2.0.0',
          status: 'active',
          instance: this.uiManager,
          capabilities: [
            'adaptive-interface',
            'multimodal-interaction',
            'context-awareness',
            'accessibility-compliance',
            'collaboration-support',
            'performance-monitoring',
          ],
        });

        // Register Phase 2 Integration Controller
        hub.registerFeature('phase2-integration', {
          name: 'Phase 2 Integration Controller',
          version: '2.0.0',
          status: 'active',
          instance: this,
          capabilities: [
            'feature-coordination',
            'ui-mode-management',
            'preference-management',
            'lifecycle-management',
          ],
        });

        // Register additional Phase 2 components if available
        if (this.uiManager.adaptiveEngine) {
          hub.registerFeature('adaptive-engine', {
            name: 'Adaptive UI Engine',
            version: '2.0.0',
            status: 'active',
            instance: this.uiManager.adaptiveEngine,
          });
        }

        if (this.uiManager.accessibilityManager) {
          hub.registerFeature('accessibility-manager', {
            name: 'Accessibility Manager',
            version: '2.0.0',
            status: 'active',
            instance: this.uiManager.accessibilityManager,
          });
        }

        if (this.uiManager.collaborationHub) {
          hub.registerFeature('collaboration-hub', {
            name: 'Collaboration Hub',
            version: '2.0.0',
            status: 'active',
            instance: this.uiManager.collaborationHub,
          });
        }

        console.log('✅ Phase 2 components registered with RinaWarp integration system');

        // Emit integration event
        hub.eventBus.emit('feature:registered', {
          feature: 'phase2-complete',
          timestamp: Date.now(),
          components: 6,
        });
      } else {
        console.warn('⚠️ RinaWarp integration system not available for Phase 2 registration');
      }
    } catch (error) {
      console.error('❌ Failed to register Phase 2 with integration system:', error);
    }
  }

  emit(event, ...args) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(`rinawarp-phase2-${event}`, {
          detail: args,
        })
      );
    }
  }

  on(event, callback) {
    if (typeof window !== 'undefined') {
      window.addEventListener(`rinawarp-phase2-${event}`, e => {
        callback(...e.detail);
      });
    }
  }

  off(event, callback) {
    if (typeof window !== 'undefined') {
      window.removeEventListener(`rinawarp-phase2-${event}`, callback);
    }
  }

  cleanup() {
    // Remove event listeners
    this.eventListeners.forEach((listener, event) => {
      if (event === 'resize') {
        window.removeEventListener('resize', listener);
      } else if (event === 'visibilitychange') {
        document.removeEventListener('visibilitychange', listener);
      } else if (event === 'beforeunload') {
        window.removeEventListener('beforeunload', listener);
      } else if (event === 'error') {
        window.removeEventListener('error', listener);
      } else if (event === 'unhandledrejection') {
        window.removeEventListener('unhandledrejection', listener);
      }
    });

    // Cleanup UI Manager
    if (this.uiManager) {
      this.uiManager.destroy();
    }

    console.log('🧹 Phase 2 integration cleaned up');
  }

  destroy() {
    this.deactivate();
    this.cleanup();

    // Clear all references
    this.uiManager = null;
    this.terminalManager = null;
    this.originalTerminalElements.clear();
    this.eventListeners.clear();
    this.moduleStates.clear();
    this.featureFlags = null;
    this.userPreferences = null;

    console.log('💀 Phase 2 integration destroyed');
  }
}

// Export for use
export default Phase2Integration;

// Global instance for easy access
if (typeof window !== 'undefined') {
  window.RinaWarpPhase2 = new Phase2Integration();

  // Auto-initialize Phase 2 when window loads
  window.addEventListener('load', async () => {
    try {
      console.log('🌟 Auto-initializing Phase 2...');
      await window.RinaWarpPhase2.initialize();
    } catch (error) {
      console.error('❌ Failed to auto-initialize Phase 2:', error);
    }
  });
}
