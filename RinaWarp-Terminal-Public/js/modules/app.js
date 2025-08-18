/**
 * RinaWarp Terminal Creator Edition - Main Application Module
 * Advanced AI-Integrated Terminal with Creator Features
 */

import { LoadingManager } from '../components/loadingManager.js';
import { NotificationSystem } from '../components/notifications.js';
import { TerminalManager } from '../components/terminalManager.js';
import { AIManager } from '../components/aiManager.js';
import { SecurityManager } from '../utils/security.js';
import { StorageManager } from '../utils/storage.js';
import { AccessibilityManager } from '../utils/accessibility.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { PerformanceMonitor } from '../utils/performance.js';

/**
 * Main Application Class
 * Coordinates all major components and manages application lifecycle
 */
export class RinaWarpApp {
  constructor() {
    this.initialized = false;
    this.components = {};
    this.config = {};
    this.version = '3.0.0-creator';

    // Bind methods to maintain context
    this.init = this.init.bind(this);
    this.shutdown = this.shutdown.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      console.log('🚀 Initializing RinaWarp Terminal Creator Edition...');

      // Show loading screen
      this.components.loading = new LoadingManager();
      this.components.loading.showGlobalLoading({
        title: 'RinaWarp Terminal Creator Edition',
        description: 'Initializing advanced AI-integrated terminal with creator features...',
        progress: 0,
      });

      // Update progress and initialize core components
      await this.initializeCore();
      this.components.loading.updateProgress(20, 'Core systems initialized');

      // Initialize security
      await this.initializeSecurity();
      this.components.loading.updateProgress(40, 'Security systems active');

      // Initialize storage
      await this.initializeStorage();
      this.components.loading.updateProgress(50, 'Storage systems ready');

      // Initialize UI components
      await this.initializeUI();
      this.components.loading.updateProgress(70, 'User interface loaded');

      // Initialize AI systems
      await this.initializeAI();
      this.components.loading.updateProgress(85, 'AI systems online');

      // Initialize terminal
      await this.initializeTerminal();
      this.components.loading.updateProgress(95, 'Terminal ready');

      // Final setup
      await this.finalizeSetup();
      this.components.loading.updateProgress(100, 'Initialization complete');

      // Hide loading screen
      setTimeout(() => {
        this.components.loading.hideGlobalLoading();
        this.showWelcomeMessage();
      }, 1000);

      this.initialized = true;
      console.log('✅ RinaWarp Terminal Creator Edition initialized successfully');
    } catch (error) {
      await this.handleError('Failed to initialize application', error);
    }
  }

  /**
   * Initialize core systems
   */
  async initializeCore() {
    // Error handling system
    this.components.errorHandler = new ErrorHandler();

    // Performance monitoring
    this.components.performance = new PerformanceMonitor();
    this.components.performance.start();

    // Notification system
    this.components.notifications = new NotificationSystem();

    // Set up global error handlers
    window.addEventListener('error', event => {
      this.components.errorHandler.handleError(event.error, 'Global Error');
    });

    window.addEventListener('unhandledrejection', event => {
      this.components.errorHandler.handleError(event.reason, 'Unhandled Promise Rejection');
    });

    // Set up application event listeners
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();

    console.log('✅ Core systems initialized');
  }

  /**
   * Initialize security systems
   */
  async initializeSecurity() {
    this.components.security = new SecurityManager();
    await this.components.security.init();

    // Set up Content Security Policy
    this.components.security.setupCSP();

    // Initialize input sanitization
    this.components.security.initializeSanitization();

    console.log('✅ Security systems initialized');
  }

  /**
   * Initialize storage systems
   */
  async initializeStorage() {
    this.components.storage = new StorageManager();
    await this.components.storage.init();

    // Load application configuration
    this.config = await this.components.storage.getConfig();

    console.log('✅ Storage systems initialized');
  }

  /**
   * Initialize UI components
   */
  async initializeUI() {
    // Accessibility manager
    this.components.accessibility = new AccessibilityManager();
    await this.components.accessibility.init();

    // Set up UI event listeners
    this.setupUIEventListeners();

    // Initialize responsive design handlers
    this.setupResponsiveHandlers();

    // Initialize theme system
    this.initializeTheme();

    console.log('✅ UI components initialized');
  }

  /**
   * Initialize AI systems
   */
  async initializeAI() {
    this.components.ai = new AIManager();
    await this.components.ai.init();

    // Load AI configuration
    const aiConfig = await this.components.storage.getAIConfig();
    if (aiConfig) {
      await this.components.ai.loadConfig(aiConfig);
    }

    console.log('✅ AI systems initialized');
  }

  /**
   * Initialize terminal
   */
  async initializeTerminal() {
    this.components.terminal = new TerminalManager();
    await this.components.terminal.init();

    // Connect terminal to AI
    this.components.terminal.setAIManager(this.components.ai);

    console.log('✅ Terminal initialized');
  }

  /**
   * Finalize setup
   */
  async finalizeSetup() {
    // Register service worker for PWA functionality
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered');
      } catch (error) {
        console.warn('⚠️ Service Worker registration failed:', error);
      }
    }

    // Initialize performance monitoring
    this.components.performance.mark('app-initialized');

    // Set up periodic cleanup
    this.setupPeriodicCleanup();

    console.log('✅ Setup finalized');
  }

  /**
   * Set up keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', event => {
      // Ctrl/Cmd + K for command palette
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        this.showCommandPalette();
      }

      // Ctrl/Cmd + Shift + P for feature palette
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        this.showFeaturePalette();
      }

      // Escape to close modals
      if (event.key === 'Escape') {
        this.closeAllModals();
      }

      // F11 for fullscreen
      if (event.key === 'F11') {
        event.preventDefault();
        this.toggleFullscreen();
      }
    });
  }

  /**
   * Set up UI event listeners
   */
  setupUIEventListeners() {
    // Sidebar toggle
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        this.toggleSidebar();
      });
    }

    // Feature buttons
    document.querySelectorAll('.feature-button').forEach(button => {
      button.addEventListener('click', event => {
        this.handleFeatureClick(event.target);
      });
    });

    // Control buttons
    document.querySelectorAll('.control-btn').forEach(button => {
      button.addEventListener('click', event => {
        this.handleControlClick(event.target);
      });
    });
  }

  /**
   * Set up responsive design handlers
   */
  setupResponsiveHandlers() {
    // Media query listeners
    const mediaQueries = {
      mobile: window.matchMedia('(max-width: 768px)'),
      tablet: window.matchMedia('(max-width: 1200px)'),
      desktop: window.matchMedia('(min-width: 1201px)'),
    };

    Object.entries(mediaQueries).forEach(([key, mq]) => {
      mq.addListener(() => {
        this.handleMediaQueryChange(key, mq.matches);
      });

      // Initial check
      this.handleMediaQueryChange(key, mq.matches);
    });
  }

  /**
   * Initialize theme system
   */
  initializeTheme() {
    // Detect user's preferred color scheme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    prefersDark.addListener(e => {
      this.updateTheme(e.matches ? 'dark' : 'light');
    });

    // Load saved theme or use system preference
    const savedTheme = this.components.storage.getTheme();
    const theme = savedTheme || (prefersDark.matches ? 'dark' : 'light');
    this.updateTheme(theme);
  }

  /**
   * Set up periodic cleanup
   */
  setupPeriodicCleanup() {
    // Clean up every 5 minutes
    setInterval(
      () => {
        this.performCleanup();
      },
      5 * 60 * 1000
    );
  }

  /**
   * Show welcome message
   */
  showWelcomeMessage() {
    const welcomeMessages = [
      'Welcome to RinaWarp Terminal Creator Edition!',
      'Your advanced AI-integrated terminal is ready.',
      'Experience the future of terminal computing.',
      'Creator-grade features at your fingertips.',
    ];

    const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];

    this.components.notifications.show({
      title: 'Welcome!',
      message: randomMessage,
      type: 'success',
      duration: 5000,
    });

    // Show version info
    console.log(`🎯 RinaWarp Terminal Creator Edition v${this.version}`);
    console.log('🚀 Developed with advanced AI integration and creator-focused features');
  }

  /**
   * Handle application errors
   */
  async handleError(message, error) {
    console.error('❌', message, error);

    if (this.components.errorHandler) {
      await this.components.errorHandler.handleError(error, message);
    }

    if (this.components.notifications) {
      this.components.notifications.show({
        title: 'Error',
        message: message,
        type: 'error',
        duration: 8000,
      });
    }

    // Hide loading if it's showing
    if (this.components.loading) {
      this.components.loading.hideGlobalLoading();
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    if (this.components.terminal) {
      this.components.terminal.handleResize();
    }

    if (this.components.accessibility) {
      this.components.accessibility.updateFocusManagement();
    }
  }

  /**
   * Handle visibility change
   */
  handleVisibilityChange() {
    if (document.hidden) {
      // Pause non-essential operations
      this.components.performance?.pause();
    } else {
      // Resume operations
      this.components.performance?.resume();
    }
  }

  /**
   * Handle media query changes
   */
  handleMediaQueryChange(breakpoint, matches) {
    document.body.setAttribute(`data-${breakpoint}`, matches.toString());

    if (this.components.accessibility) {
      this.components.accessibility.updateForBreakpoint(breakpoint, matches);
    }
  }

  /**
   * Toggle sidebar
   */
  toggleSidebar() {
    const sidebar = document.querySelector('.features-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('expanded');

      // Update accessibility
      const expanded = sidebar.classList.contains('expanded');
      sidebar.setAttribute('aria-expanded', expanded.toString());
    }
  }

  /**
   * Handle feature button clicks
   */
  async handleFeatureClick(button) {
    const featureId = button.getAttribute('data-feature');

    try {
      this.components.loading.showFeatureLoading(featureId);

      // Execute feature
      await this.executeFeature(featureId);

      // Update button state
      button.classList.add('active');
    } catch (error) {
      await this.handleError(`Failed to execute feature: ${featureId}`, error);
    } finally {
      this.components.loading.hideFeatureLoading(featureId);
    }
  }

  /**
   * Handle control button clicks
   */
  async handleControlClick(button) {
    const action = button.getAttribute('data-action');

    try {
      await this.executeControlAction(action);
    } catch (error) {
      await this.handleError(`Failed to execute control action: ${action}`, error);
    }
  }

  /**
   * Execute feature
   */
  async executeFeature(featureId) {
    switch (featureId) {
      case 'ai-chat':
        await this.components.ai.showChat();
        break;
      case 'ai-provider':
        await this.components.ai.showProviderDialog();
        break;
      case 'code-analysis':
        await this.components.ai.analyzeCode();
        break;
      case 'deployment':
        await this.executeDeployment();
        break;
      case 'collaboration':
        await this.startCollaboration();
        break;
      default:
        console.warn(`Unknown feature: ${featureId}`);
    }
  }

  /**
   * Execute control action
   */
  async executeControlAction(action) {
    switch (action) {
      case 'clear':
        this.components.terminal.clear();
        break;
      case 'export':
        await this.exportTerminalContent();
        break;
      case 'settings':
        this.showSettings();
        break;
      case 'help':
        this.showHelp();
        break;
      default:
        console.warn(`Unknown control action: ${action}`);
    }
  }

  /**
   * Show command palette
   */
  showCommandPalette() {
    // Implementation for command palette
    console.log('Opening command palette...');
  }

  /**
   * Show feature palette
   */
  showFeaturePalette() {
    // Implementation for feature palette
    console.log('Opening feature palette...');
  }

  /**
   * Close all modals
   */
  closeAllModals() {
    document
      .querySelectorAll('.modal-overlay, .ai-provider-panel, .ai-chat-overlay')
      .forEach(modal => {
        modal.classList.remove('active');
      });
  }

  /**
   * Toggle fullscreen
   */
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  /**
   * Update theme
   */
  updateTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    this.components.storage?.setTheme(theme);
  }

  /**
   * Perform cleanup
   */
  performCleanup() {
    // Clean up old notifications
    if (this.components.notifications) {
      this.components.notifications.cleanup();
    }

    // Clean up terminal history if needed
    if (this.components.terminal) {
      this.components.terminal.cleanup();
    }

    // Clean up AI chat history if needed
    if (this.components.ai) {
      this.components.ai.cleanup();
    }

    // Run garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }

  /**
   * Export terminal content
   */
  async exportTerminalContent() {
    try {
      const content = this.components.terminal.getContent();
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `terminal-export-${Date.now()}.txt`;
      a.click();

      URL.revokeObjectURL(url);

      this.components.notifications.show({
        title: 'Export Complete',
        message: 'Terminal content has been exported successfully.',
        type: 'success',
      });
    } catch (error) {
      await this.handleError('Failed to export terminal content', error);
    }
  }

  /**
   * Show settings
   */
  showSettings() {
    console.log('Opening settings...');
    // Implementation for settings dialog
  }

  /**
   * Show help
   */
  showHelp() {
    console.log('Opening help...');
    // Implementation for help dialog
  }

  /**
   * Execute deployment
   */
  async executeDeployment() {
    console.log('Starting deployment...');
    // Implementation for deployment features
  }

  /**
   * Start collaboration
   */
  async startCollaboration() {
    console.log('Starting collaboration...');
    // Implementation for collaboration features
  }

  /**
   * Shutdown application
   */
  async shutdown() {
    try {
      console.log('🛑 Shutting down RinaWarp Terminal...');

      // Stop performance monitoring
      if (this.components.performance) {
        this.components.performance.stop();
      }

      // Close all connections
      if (this.components.ai) {
        await this.components.ai.disconnect();
      }

      // Save state
      if (this.components.storage) {
        await this.components.storage.saveState();
      }

      // Clean up event listeners
      window.removeEventListener('resize', this.handleResize);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);

      this.initialized = false;
      console.log('✅ Application shutdown complete');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }

  /**
   * Get application status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      version: this.version,
      components: Object.keys(this.components),
      performance: this.components.performance?.getMetrics(),
      uptime: this.components.performance?.getUptime(),
    };
  }
}

// Export singleton instance
export const app = new RinaWarpApp();
