/**
 * RinaWarp Terminal Creator Edition - Accessibility Manager
 * Comprehensive accessibility features including advanced keyboard navigation,
 * screen reader support, and WCAG 2.1 AA compliance
 */

/**
 * AccessibilityManager class
 * Manages all accessibility features and ensures WCAG compliance
 */
export class AccessibilityManager {
  constructor() {
    this.focusHistory = [];
    this.focusTrapStack = [];
    this.announcements = [];
    this.keyboardShortcuts = new Map();
    this.isHighContrastMode = false;
    this.isReducedMotionMode = false;
    this.screenReaderActive = false;
    this.currentFocusRing = null;
    this.voiceoverActive = false;

    // Keyboard navigation state
    this.currentFocusIndex = -1;
    this.focusableElements = [];
    this.navigationModes = {
      NORMAL: 'normal',
      BROWSE: 'browse',
      FORMS: 'forms',
      APPLICATION: 'application',
    };
    this.currentNavigationMode = this.navigationModes.NORMAL;

    // Bind methods
    this.init = this.init.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.handleMediaQueryChange = this.handleMediaQueryChange.bind(this);
    this.announceToScreenReader = this.announceToScreenReader.bind(this);
  }

  /**
   * Initialize accessibility features
   */
  async init() {
    try {
      console.log('🦾 Initializing comprehensive accessibility features...');

      // Detect accessibility preferences
      await this.detectAccessibilityPreferences();

      // Set up keyboard navigation
      this.setupAdvancedKeyboardNavigation();

      // Initialize screen reader support
      this.initializeScreenReaderSupport();

      // Set up focus management
      this.setupFocusManagement();

      // Initialize skip links
      this.setupSkipLinks();

      // Set up live regions
      this.setupLiveRegions();

      // Initialize high contrast support
      this.setupHighContrastMode();

      // Set up reduced motion support
      this.setupReducedMotionMode();

      // Initialize voice commands (if available)
      this.initializeVoiceCommands();

      // Set up accessibility monitoring
      this.setupAccessibilityMonitoring();

      console.log('✅ Comprehensive accessibility features initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize accessibility features:', error);
      return false;
    }
  }

  /**
   * Detect user accessibility preferences
   */
  async detectAccessibilityPreferences() {
    // Detect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.isReducedMotionMode = prefersReducedMotion.matches;
    prefersReducedMotion.addListener(e => {
      this.isReducedMotionMode = e.matches;
      this.updateReducedMotionMode();
    });

    // Detect high contrast preference
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
    this.isHighContrastMode = prefersHighContrast.matches;
    prefersHighContrast.addListener(e => {
      this.isHighContrastMode = e.matches;
      this.updateHighContrastMode();
    });

    // Detect color scheme preference
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    prefersDarkScheme.addListener(e => {
      this.updateColorScheme(e.matches ? 'dark' : 'light');
    });

    // Detect screen reader (heuristic approach)
    this.detectScreenReader();
  }

  /**
   * Detect if screen reader is active (heuristic)
   */
  detectScreenReader() {
    // Check for common screen reader indicators
    const indicators = [
      navigator.userAgent.includes('NVDA'),
      navigator.userAgent.includes('JAWS'),
      navigator.userAgent.includes('VoiceOver'),
      navigator.userAgent.includes('TalkBack'),
      window.speechSynthesis && window.speechSynthesis.speaking,
      document.querySelector('[aria-live]')?.getAttribute('aria-live') === 'polite',
    ];

    this.screenReaderActive = indicators.some(indicator => indicator);

    if (this.screenReaderActive) {
      console.log('🔊 Screen reader detected, enabling enhanced support');
      this.enableScreenReaderMode();
    }
  }

  /**
   * Set up advanced keyboard navigation
   */
  setupAdvancedKeyboardNavigation() {
    // Global keyboard event handler
    document.addEventListener('keydown', this.handleKeydown, true);

    // Set up roving tabindex for complex components
    this.setupRovingTabindex();

    // Initialize keyboard shortcuts
    this.initializeKeyboardShortcuts();

    // Set up spatial navigation
    this.setupSpatialNavigation();
  }

  /**
   * Global keyboard event handler with accessibility features
   */
  handleKeydown(event) {
    const { key, ctrlKey, metaKey, shiftKey, altKey } = event;
    const modifierPressed = ctrlKey || metaKey || shiftKey || altKey;

    // Handle accessibility keyboard shortcuts
    if (this.handleAccessibilityShortcuts(event)) {
      return;
    }

    // Handle focus management
    if (this.handleFocusNavigation(event)) {
      return;
    }

    // Handle modal and trap navigation
    if (this.handleModalNavigation(event)) {
      return;
    }

    // Handle application shortcuts
    this.handleApplicationShortcuts(event);
  }

  /**
   * Handle accessibility-specific keyboard shortcuts
   */
  handleAccessibilityShortcuts(event) {
    const { key, ctrlKey, metaKey, shiftKey, altKey } = event;

    // Alt + Shift + A: Accessibility menu
    if (altKey && shiftKey && key === 'A') {
      event.preventDefault();
      this.showAccessibilityMenu();
      return true;
    }

    // Alt + Shift + H: Toggle high contrast
    if (altKey && shiftKey && key === 'H') {
      event.preventDefault();
      this.toggleHighContrast();
      return true;
    }

    // Alt + Shift + M: Toggle reduced motion
    if (altKey && shiftKey && key === 'M') {
      event.preventDefault();
      this.toggleReducedMotion();
      return true;
    }

    // Alt + Shift + F: Focus mode toggle
    if (altKey && shiftKey && key === 'F') {
      event.preventDefault();
      this.toggleFocusMode();
      return true;
    }

    // Alt + Shift + R: Read current element
    if (altKey && shiftKey && key === 'R') {
      event.preventDefault();
      this.readCurrentElement();
      return true;
    }

    // Alt + Shift + S: Skip to main content
    if (altKey && shiftKey && key === 'S') {
      event.preventDefault();
      this.skipToMainContent();
      return true;
    }

    return false;
  }

  /**
   * Handle focus navigation
   */
  handleFocusNavigation(event) {
    const { key, ctrlKey, metaKey, shiftKey } = event;

    // Tab navigation with enhancements
    if (key === 'Tab') {
      return this.handleTabNavigation(event);
    }

    // Arrow key navigation for complex components
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      return this.handleArrowNavigation(event);
    }

    // Home/End navigation
    if (key === 'Home' || key === 'End') {
      return this.handleHomeEndNavigation(event);
    }

    return false;
  }

  /**
   * Enhanced Tab navigation
   */
  handleTabNavigation(event) {
    const activeElement = document.activeElement;

    // Check if we're in a focus trap
    if (this.focusTrapStack.length > 0) {
      const currentTrap = this.focusTrapStack[this.focusTrapStack.length - 1];
      return this.handleTrapTabNavigation(event, currentTrap);
    }

    // Check if current element has custom tab behavior
    if (activeElement && activeElement.hasAttribute('data-custom-tab')) {
      return this.handleCustomTabBehavior(event, activeElement);
    }

    // Standard tab navigation with announcements
    this.announceTabNavigation(event.shiftKey ? 'backward' : 'forward');
    return false;
  }

  /**
   * Handle arrow key navigation
   */
  handleArrowNavigation(event) {
    const activeElement = document.activeElement;
    const { key } = event;

    // Check if we're in a component that uses arrow navigation
    const arrowComponent = activeElement.closest(
      '[role="tablist"], [role="menu"], [role="listbox"], [role="grid"], .feature-group'
    );

    if (arrowComponent) {
      event.preventDefault();

      const role = arrowComponent.getAttribute('role');
      switch (role) {
        case 'tablist':
          return this.handleTabListNavigation(event, arrowComponent);
        case 'menu':
          return this.handleMenuNavigation(event, arrowComponent);
        case 'listbox':
          return this.handleListboxNavigation(event, arrowComponent);
        case 'grid':
          return this.handleGridNavigation(event, arrowComponent);
        default:
          return this.handleGenericArrowNavigation(event, arrowComponent);
      }
    }

    return false;
  }

  /**
   * Set up roving tabindex for complex components
   */
  setupRovingTabindex() {
    // Find all components that need roving tabindex
    const components = document.querySelectorAll('[data-roving-tabindex]');

    components.forEach(component => {
      this.initializeRovingTabindex(component);
    });
  }

  /**
   * Initialize roving tabindex for a component
   */
  initializeRovingTabindex(component) {
    const items = component.querySelectorAll(
      '[role="tab"], [role="menuitem"], [role="option"], .feature-button'
    );

    items.forEach((item, index) => {
      item.tabIndex = index === 0 ? 0 : -1;
      item.addEventListener('focus', () => {
        // Remove tabindex from siblings
        items.forEach(sibling => (sibling.tabIndex = -1));
        // Set tabindex on focused item
        item.tabIndex = 0;
      });
    });
  }

  /**
   * Initialize screen reader support
   */
  initializeScreenReaderSupport() {
    // Create live region for announcements
    this.createLiveRegions();

    // Set up dynamic content announcements
    this.setupDynamicContentAnnouncements();

    // Initialize semantic markup validation
    this.validateSemanticMarkup();

    // Set up form labeling
    this.enhanceFormLabeling();
  }

  /**
   * Create live regions for screen reader announcements
   */
  createLiveRegions() {
    // Polite announcements
    const politeRegion = document.createElement('div');
    politeRegion.id = 'polite-announcements';
    politeRegion.setAttribute('aria-live', 'polite');
    politeRegion.setAttribute('aria-atomic', 'true');
    politeRegion.className = 'sr-only';
    document.body.appendChild(politeRegion);

    // Assertive announcements
    const assertiveRegion = document.createElement('div');
    assertiveRegion.id = 'assertive-announcements';
    assertiveRegion.setAttribute('aria-live', 'assertive');
    assertiveRegion.setAttribute('aria-atomic', 'true');
    assertiveRegion.className = 'sr-only';
    document.body.appendChild(assertiveRegion);

    // Status announcements
    const statusRegion = document.createElement('div');
    statusRegion.id = 'status-announcements';
    statusRegion.setAttribute('role', 'status');
    statusRegion.setAttribute('aria-live', 'polite');
    statusRegion.className = 'sr-only';
    document.body.appendChild(statusRegion);
  }

  /**
   * Announce message to screen reader
   */
  announceToScreenReader(message, priority = 'polite') {
    if (!message) return;

    const regionId =
      priority === 'assertive'
        ? 'assertive-announcements'
        : priority === 'status'
          ? 'status-announcements'
          : 'polite-announcements';

    const region = document.getElementById(regionId);
    if (region) {
      // Clear previous announcement
      region.textContent = '';

      // Add new announcement after a brief delay
      setTimeout(() => {
        region.textContent = message;
      }, 100);

      // Clear announcement after it's been read
      setTimeout(() => {
        region.textContent = '';
      }, 5000);
    }

    // Log for debugging
    console.log(`📢 Screen reader announcement (${priority}): ${message}`);
  }

  /**
   * Set up focus management
   */
  setupFocusManagement() {
    // Track focus changes
    document.addEventListener('focusin', this.handleFocus);
    document.addEventListener('focusout', event => {
      this.handleFocusOut(event);
    });

    // Set initial focus
    this.setInitialFocus();

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.restoreFocus();
      }
    });
  }

  /**
   * Handle focus events
   */
  handleFocus(event) {
    const element = event.target;

    // Add to focus history
    this.focusHistory.push({
      element,
      timestamp: Date.now(),
      tagName: element.tagName,
      id: element.id,
      className: element.className,
    });

    // Limit focus history size
    if (this.focusHistory.length > 50) {
      this.focusHistory = this.focusHistory.slice(-25);
    }

    // Announce focus change if screen reader is active
    if (this.screenReaderActive) {
      this.announceFocusChange(element);
    }

    // Update visual focus indicator
    this.updateFocusIndicator(element);
  }

  /**
   * Announce focus change to screen reader
   */
  announceFocusChange(element) {
    let announcement = '';

    // Get element description
    const label =
      element.getAttribute('aria-label') ||
      element.getAttribute('title') ||
      element.textContent?.trim() ||
      element.value ||
      element.alt;

    const role = element.getAttribute('role') || element.tagName.toLowerCase();

    if (label) {
      announcement = `${label}, ${role}`;

      // Add state information
      if (element.hasAttribute('aria-expanded')) {
        announcement +=
          element.getAttribute('aria-expanded') === 'true' ? ', expanded' : ', collapsed';
      }

      if (element.hasAttribute('aria-selected')) {
        announcement +=
          element.getAttribute('aria-selected') === 'true' ? ', selected' : ', not selected';
      }

      if (element.disabled) {
        announcement += ', disabled';
      }

      this.announceToScreenReader(announcement);
    }
  }

  /**
   * Set up skip links
   */
  setupSkipLinks() {
    // Create skip links container if it doesn't exist
    let skipLinks = document.querySelector('.skip-links');
    if (!skipLinks) {
      skipLinks = document.createElement('div');
      skipLinks.className = 'skip-links';
      document.body.insertBefore(skipLinks, document.body.firstChild);
    }

    const skipTargets = [
      { href: '#main-content', text: 'Skip to main content' },
      { href: '#features-sidebar', text: 'Skip to navigation' },
      { href: '#terminal', text: 'Skip to terminal' },
      { href: '#status-bar', text: 'Skip to status' },
    ];

    skipTargets.forEach(target => {
      if (document.querySelector(target.href)) {
        const link = document.createElement('a');
        link.href = target.href;
        link.textContent = target.text;
        link.className = 'skip-link';
        skipLinks.appendChild(link);
      }
    });
  }

  /**
   * Set up live regions for dynamic content
   */
  setupLiveRegions() {
    // Monitor terminal output for announcements
    const terminal = document.getElementById('terminal');
    if (terminal) {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            const newContent = Array.from(mutation.addedNodes)
              .filter(node => node.nodeType === Node.ELEMENT_NODE)
              .map(node => node.textContent)
              .join(' ');

            if (newContent.trim() && this.screenReaderActive) {
              this.announceToScreenReader(`Terminal output: ${newContent}`);
            }
          }
        });
      });

      observer.observe(terminal, { childList: true, subtree: true });
    }

    // Monitor status changes
    const statusBar = document.getElementById('status-bar');
    if (statusBar) {
      const statusObserver = new MutationObserver(() => {
        if (this.screenReaderActive) {
          this.announceToScreenReader(statusBar.textContent, 'status');
        }
      });

      statusObserver.observe(statusBar, { childList: true, characterData: true, subtree: true });
    }
  }

  /**
   * Set up high contrast mode
   */
  setupHighContrastMode() {
    if (this.isHighContrastMode) {
      this.enableHighContrastMode();
    }
  }

  /**
   * Enable high contrast mode
   */
  enableHighContrastMode() {
    document.body.classList.add('high-contrast');
    this.announceToScreenReader('High contrast mode enabled');
  }

  /**
   * Toggle high contrast mode
   */
  toggleHighContrast() {
    this.isHighContrastMode = !this.isHighContrastMode;

    if (this.isHighContrastMode) {
      this.enableHighContrastMode();
    } else {
      document.body.classList.remove('high-contrast');
      this.announceToScreenReader('High contrast mode disabled');
    }
  }

  /**
   * Set up reduced motion mode
   */
  setupReducedMotionMode() {
    if (this.isReducedMotionMode) {
      this.enableReducedMotionMode();
    }
  }

  /**
   * Enable reduced motion mode
   */
  enableReducedMotionMode() {
    document.body.classList.add('reduced-motion');
    this.announceToScreenReader('Reduced motion mode enabled');
  }

  /**
   * Toggle reduced motion mode
   */
  toggleReducedMotion() {
    this.isReducedMotionMode = !this.isReducedMotionMode;

    if (this.isReducedMotionMode) {
      this.enableReducedMotionMode();
    } else {
      document.body.classList.remove('reduced-motion');
      this.announceToScreenReader('Reduced motion mode disabled');
    }
  }

  /**
   * Initialize voice commands (if available)
   */
  initializeVoiceCommands() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.speechRecognition = new SpeechRecognition();

      this.speechRecognition.continuous = false;
      this.speechRecognition.interimResults = false;
      this.speechRecognition.lang = 'en-US';

      this.speechRecognition.onresult = event => {
        const command = event.results[0][0].transcript.toLowerCase();
        this.handleVoiceCommand(command);
      };

      console.log('🎤 Voice commands available');
    }
  }

  /**
   * Handle voice commands
   */
  handleVoiceCommand(command) {
    const commands = {
      'open ai chat': () => document.querySelector('[data-feature="ai-chat"]')?.click(),
      'configure ai': () => document.querySelector('[data-feature="ai-provider"]')?.click(),
      'clear terminal': () => document.querySelector('[data-action="clear"]')?.click(),
      'show help': () => document.querySelector('[data-action="help"]')?.click(),
      'toggle sidebar': () => document.querySelector('.sidebar-toggle')?.click(),
      'focus terminal': () => document.getElementById('terminal')?.focus(),
      'read status': () => this.readCurrentStatus(),
    };

    const matchedCommand = Object.keys(commands).find(cmd => command.includes(cmd));
    if (matchedCommand) {
      commands[matchedCommand]();
      this.announceToScreenReader(`Executed command: ${matchedCommand}`);
    }
  }

  /**
   * Show accessibility menu
   */
  showAccessibilityMenu() {
    // Create or show accessibility menu
    let menu = document.getElementById('accessibility-menu');
    if (!menu) {
      menu = this.createAccessibilityMenu();
    }

    menu.style.display = 'block';
    menu.focus();
    this.trapFocus(menu);
  }

  /**
   * Create accessibility menu
   */
  createAccessibilityMenu() {
    const menu = document.createElement('div');
    menu.id = 'accessibility-menu';
    menu.className = 'accessibility-menu';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-labelledby', 'accessibility-menu-title');
    menu.setAttribute('aria-modal', 'true');
    menu.tabIndex = -1;

    menu.innerHTML = `
            <div class="accessibility-menu-content">
                <h2 id="accessibility-menu-title">Accessibility Options</h2>
                
                <div class="accessibility-options">
                    <button class="accessibility-option" data-action="toggle-high-contrast">
                        <span class="option-icon">${this.isHighContrastMode ? '✓' : '○'}</span>
                        High Contrast Mode
                    </button>
                    
                    <button class="accessibility-option" data-action="toggle-reduced-motion">
                        <span class="option-icon">${this.isReducedMotionMode ? '✓' : '○'}</span>
                        Reduced Motion
                    </button>
                    
                    <button class="accessibility-option" data-action="toggle-focus-mode">
                        <span class="option-icon">${this.focusMode ? '✓' : '○'}</span>
                        Focus Mode
                    </button>
                    
                    <button class="accessibility-option" data-action="voice-commands">
                        <span class="option-icon">🎤</span>
                        Voice Commands Help
                    </button>
                    
                    <button class="accessibility-option" data-action="keyboard-shortcuts">
                        <span class="option-icon">⌨️</span>
                        Keyboard Shortcuts
                    </button>
                </div>
                
                <div class="accessibility-menu-actions">
                    <button class="control-btn" data-action="close-accessibility-menu">Close</button>
                </div>
            </div>
        `;

    // Add event listeners
    menu.addEventListener('click', event => {
      const action = event.target.getAttribute('data-action');
      this.handleAccessibilityMenuAction(action);
    });

    document.body.appendChild(menu);
    return menu;
  }

  /**
   * Handle accessibility menu actions
   */
  handleAccessibilityMenuAction(action) {
    switch (action) {
      case 'toggle-high-contrast':
        this.toggleHighContrast();
        break;
      case 'toggle-reduced-motion':
        this.toggleReducedMotion();
        break;
      case 'toggle-focus-mode':
        this.toggleFocusMode();
        break;
      case 'voice-commands':
        this.showVoiceCommandsHelp();
        break;
      case 'keyboard-shortcuts':
        this.showKeyboardShortcuts();
        break;
      case 'close-accessibility-menu':
        this.closeAccessibilityMenu();
        break;
    }
  }

  /**
   * Focus trap implementation
   */
  trapFocus(container) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const trap = {
      container,
      firstElement,
      lastElement,
      previousFocus: document.activeElement,
    };

    this.focusTrapStack.push(trap);

    // Focus first element
    if (firstElement) {
      firstElement.focus();
    }

    return trap;
  }

  /**
   * Release focus trap
   */
  releaseFocusTrap() {
    const trap = this.focusTrapStack.pop();
    if (trap && trap.previousFocus) {
      trap.previousFocus.focus();
    }
  }

  /**
   * Update for breakpoint changes
   */
  updateForBreakpoint(breakpoint, matches) {
    if (matches) {
      document.body.setAttribute(`data-${breakpoint}`, 'true');

      // Announce layout changes to screen reader
      if (this.screenReaderActive) {
        this.announceToScreenReader(`Layout changed to ${breakpoint} view`);
      }
    } else {
      document.body.removeAttribute(`data-${breakpoint}`);
    }
  }

  /**
   * Update focus management for responsive changes
   */
  updateFocusManagement() {
    // Recalculate focusable elements
    this.focusableElements = Array.from(
      document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => this.isVisible(el));
  }

  /**
   * Check if element is visible
   */
  isVisible(element) {
    return element.offsetWidth > 0 && element.offsetHeight > 0;
  }

  /**
   * Additional utility methods for enhanced accessibility
   */

  skipToMainContent() {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
      this.announceToScreenReader('Skipped to main content');
    }
  }

  readCurrentElement() {
    const activeElement = document.activeElement;
    if (activeElement) {
      this.announceFocusChange(activeElement);
    }
  }

  readCurrentStatus() {
    const statusBar = document.getElementById('status-bar');
    if (statusBar) {
      this.announceToScreenReader(`Status: ${statusBar.textContent}`);
    }
  }

  toggleFocusMode() {
    this.focusMode = !this.focusMode;
    document.body.classList.toggle('focus-mode', this.focusMode);
    this.announceToScreenReader(`Focus mode ${this.focusMode ? 'enabled' : 'disabled'}`);
  }

  closeAccessibilityMenu() {
    const menu = document.getElementById('accessibility-menu');
    if (menu) {
      menu.style.display = 'none';
      this.releaseFocusTrap();
    }
  }

  /**
   * Cleanup method
   */
  destroy() {
    document.removeEventListener('keydown', this.handleKeydown, true);
    document.removeEventListener('focusin', this.handleFocus);

    // Clean up observers and event listeners
    if (this.speechRecognition) {
      this.speechRecognition.stop();
    }

    console.log('🦾 Accessibility manager cleaned up');
  }
}

// Export singleton instance
export const accessibilityManager = new AccessibilityManager();
