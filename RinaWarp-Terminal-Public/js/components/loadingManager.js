/**
 * RinaWarp Terminal Creator Edition - Loading Manager
 * Manages all loading states and visual indicators
 */

/**
 * LoadingManager class
 * Centralized management of loading states for the entire application
 */
export class LoadingManager {
  constructor() {
    this.activeLoadings = new Map();
    this.globalLoadingVisible = false;
    this.loadingElements = new Map();

    // Initialize loading elements
    this.initializeLoadingElements();

    // Bind methods
    this.showGlobalLoading = this.showGlobalLoading.bind(this);
    this.hideGlobalLoading = this.hideGlobalLoading.bind(this);
    this.updateProgress = this.updateProgress.bind(this);
    this.showFeatureLoading = this.showFeatureLoading.bind(this);
    this.hideFeatureLoading = this.hideFeatureLoading.bind(this);
    this.showButtonLoading = this.showButtonLoading.bind(this);
    this.hideButtonLoading = this.hideButtonLoading.bind(this);
  }

  /**
   * Initialize loading elements in the DOM
   */
  initializeLoadingElements() {
    // Create global loading overlay if it doesn't exist
    if (!document.querySelector('.global-loading-overlay')) {
      this.createGlobalLoadingElement();
    }
  }

  /**
   * Create the global loading overlay element
   */
  createGlobalLoadingElement() {
    const overlay = document.createElement('div');
    overlay.className = 'global-loading-overlay';
    overlay.innerHTML = `
            <div class="global-loading-content">
                <div class="loading-spinner loading-spinner-large"></div>
                <div class="global-loading-title">Loading...</div>
                <div class="global-loading-description">Please wait while the application initializes.</div>
                <div class="global-loading-progress">
                    <div class="global-loading-progress-bar"></div>
                </div>
                <div class="global-loading-status">Initializing...</div>
            </div>
        `;

    document.body.appendChild(overlay);
    this.loadingElements.set('global', overlay);
  }

  /**
   * Show global loading screen
   * @param {Object} options - Loading configuration
   * @param {string} options.title - Loading title
   * @param {string} options.description - Loading description
   * @param {number} options.progress - Initial progress (0-100)
   * @param {string} options.status - Status message
   */
  showGlobalLoading(options = {}) {
    const overlay =
      this.loadingElements.get('global') || document.querySelector('.global-loading-overlay');
    if (!overlay) {
      console.warn('⚠️ Global loading overlay not found');
      return;
    }

    // Update content
    const title = overlay.querySelector('.global-loading-title');
    const description = overlay.querySelector('.global-loading-description');
    const progressBar = overlay.querySelector('.global-loading-progress-bar');
    const status = overlay.querySelector('.global-loading-status');

    if (title && options.title) {
      title.textContent = options.title;
    }

    if (description && options.description) {
      description.textContent = options.description;
    }

    if (progressBar && typeof options.progress === 'number') {
      progressBar.style.width = `${Math.max(0, Math.min(100, options.progress))}%`;
    }

    if (status && options.status) {
      status.textContent = options.status;
    }

    // Show the overlay
    overlay.classList.remove('hidden');
    this.globalLoadingVisible = true;

    // Prevent body scrolling
    document.body.style.overflow = 'hidden';

    console.log('🔄 Global loading shown:', options);
  }

  /**
   * Hide global loading screen
   */
  hideGlobalLoading() {
    const overlay =
      this.loadingElements.get('global') || document.querySelector('.global-loading-overlay');
    if (!overlay) {
      return;
    }

    overlay.classList.add('hidden');
    this.globalLoadingVisible = false;

    // Restore body scrolling
    document.body.style.overflow = '';

    console.log('✅ Global loading hidden');
  }

  /**
   * Update global loading progress
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} status - Status message
   */
  updateProgress(progress, status) {
    const overlay =
      this.loadingElements.get('global') || document.querySelector('.global-loading-overlay');
    if (!overlay || !this.globalLoadingVisible) {
      return;
    }

    const progressBar = overlay.querySelector('.global-loading-progress-bar');
    const statusElement = overlay.querySelector('.global-loading-status');

    if (progressBar) {
      progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }

    if (statusElement && status) {
      statusElement.textContent = status;
    }

    console.log(`📊 Progress updated: ${progress}% - ${status}`);
  }

  /**
   * Show loading state for a specific feature
   * @param {string} featureId - ID of the feature
   * @param {Object} options - Loading options
   */
  showFeatureLoading(featureId, options = {}) {
    if (this.activeLoadings.has(featureId)) {
      return; // Already loading
    }

    const button = document.querySelector(`[data-feature="${featureId}"]`);
    if (button) {
      this.showButtonLoading(button, options);
    }

    // Create feature-specific loading overlay
    const loadingOverlay = this.createFeatureLoadingOverlay(featureId, options);
    if (loadingOverlay) {
      document.body.appendChild(loadingOverlay);
      this.loadingElements.set(`feature-${featureId}`, loadingOverlay);
    }

    this.activeLoadings.set(featureId, {
      startTime: Date.now(),
      options,
    });

    console.log(`🔄 Feature loading started: ${featureId}`, options);
  }

  /**
   * Hide loading state for a specific feature
   * @param {string} featureId - ID of the feature
   */
  hideFeatureLoading(featureId) {
    if (!this.activeLoadings.has(featureId)) {
      return; // Not loading
    }

    const button = document.querySelector(`[data-feature="${featureId}"]`);
    if (button) {
      this.hideButtonLoading(button);
    }

    // Remove feature loading overlay
    const loadingOverlay = this.loadingElements.get(`feature-${featureId}`);
    if (loadingOverlay && loadingOverlay.parentNode) {
      loadingOverlay.parentNode.removeChild(loadingOverlay);
      this.loadingElements.delete(`feature-${featureId}`);
    }

    const loadingInfo = this.activeLoadings.get(featureId);
    const duration = Date.now() - loadingInfo.startTime;
    this.activeLoadings.delete(featureId);

    console.log(`✅ Feature loading finished: ${featureId} (${duration}ms)`);
  }

  /**
   * Create a feature-specific loading overlay
   * @param {string} featureId - ID of the feature
   * @param {Object} options - Loading options
   * @returns {HTMLElement} The loading overlay element
   */
  createFeatureLoadingOverlay(featureId, options) {
    const overlay = document.createElement('div');
    overlay.className = 'feature-loading-overlay';
    overlay.innerHTML = `
            <div class="feature-loading-content">
                <div class="loading-spinner loading-spinner-medium"></div>
                <div class="feature-loading-title">${options.title || 'Loading Feature...'}</div>
                <div class="feature-loading-description">${options.description || 'Please wait while the feature loads.'}</div>
            </div>
        `;

    // Style the overlay
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '9999',
      animation: 'fadeIn 0.3s ease-out',
    });

    return overlay;
  }

  /**
   * Show loading state on a button
   * @param {HTMLElement} button - The button element
   * @param {Object} options - Loading options
   */
  showButtonLoading(button, options = {}) {
    if (!button) return;

    // Store original button content
    if (!button.dataset.originalContent) {
      button.dataset.originalContent = button.innerHTML;
    }

    // Add loading class
    button.classList.add('loading');
    button.disabled = true;

    // Create loading content
    const loadingContent = document.createElement('span');
    loadingContent.className = 'button-loading-content';
    loadingContent.innerHTML = `
            <span class="loading-spinner loading-spinner-small"></span>
            <span class="button-loading-text">${options.text || 'Loading...'}</span>
        `;

    // Replace button content
    button.innerHTML = '';
    button.appendChild(loadingContent);

    console.log('🔄 Button loading shown:', button);
  }

  /**
   * Hide loading state on a button
   * @param {HTMLElement} button - The button element
   */
  hideButtonLoading(button) {
    if (!button) return;

    // Remove loading class
    button.classList.remove('loading');
    button.disabled = false;

    // Restore original content
    if (button.dataset.originalContent) {
      button.innerHTML = button.dataset.originalContent;
      delete button.dataset.originalContent;
    }

    console.log('✅ Button loading hidden:', button);
  }

  /**
   * Show loading state in the terminal
   * @param {string} message - Loading message
   */
  showTerminalLoading(message = 'Processing...') {
    const terminal = document.getElementById('terminal');
    if (!terminal) return;

    const loadingLine = document.createElement('div');
    loadingLine.className = 'terminal-loading-line';
    loadingLine.innerHTML = `
            <span class="loading-spinner loading-spinner-small"></span>
            <span class="terminal-loading-text">${message}</span>
        `;

    terminal.appendChild(loadingLine);
    this.loadingElements.set('terminal-loading', loadingLine);

    // Auto-scroll to bottom
    terminal.scrollTop = terminal.scrollHeight;
  }

  /**
   * Hide loading state in the terminal
   */
  hideTerminalLoading() {
    const loadingLine = this.loadingElements.get('terminal-loading');
    if (loadingLine && loadingLine.parentNode) {
      loadingLine.parentNode.removeChild(loadingLine);
      this.loadingElements.delete('terminal-loading');
    }
  }

  /**
   * Show skeleton loading for a container
   * @param {HTMLElement|string} container - Container element or selector
   * @param {Object} options - Skeleton options
   */
  showSkeletonLoading(container, options = {}) {
    const element = typeof container === 'string' ? document.querySelector(container) : container;
    if (!element) return;

    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-loading';

    const lines = options.lines || 3;
    for (let i = 0; i < lines; i++) {
      const line = document.createElement('div');
      line.className = 'skeleton-line';
      if (i === lines - 1 && options.shortLastLine) {
        line.style.width = '60%';
      }
      skeleton.appendChild(line);
    }

    // Store original content
    element.dataset.originalContent = element.innerHTML;
    element.innerHTML = '';
    element.appendChild(skeleton);
    element.classList.add('loading-skeleton');

    this.loadingElements.set(`skeleton-${element.id || Date.now()}`, { element, skeleton });
  }

  /**
   * Hide skeleton loading
   * @param {HTMLElement|string} container - Container element or selector
   */
  hideSkeletonLoading(container) {
    const element = typeof container === 'string' ? document.querySelector(container) : container;
    if (!element) return;

    // Restore original content
    if (element.dataset.originalContent) {
      element.innerHTML = element.dataset.originalContent;
      delete element.dataset.originalContent;
    }

    element.classList.remove('loading-skeleton');
  }

  /**
   * Show AI thinking animation
   * @param {HTMLElement} container - Container for the animation
   */
  showAIThinking(container) {
    if (!container) return;

    const thinking = document.createElement('div');
    thinking.className = 'ai-thinking-animation';
    thinking.innerHTML = `
            <div class="ai-thinking-dots">
                <div class="ai-thinking-dot"></div>
                <div class="ai-thinking-dot"></div>
                <div class="ai-thinking-dot"></div>
            </div>
            <span class="ai-thinking-text">AI is thinking...</span>
        `;

    container.appendChild(thinking);
    this.loadingElements.set('ai-thinking', thinking);
  }

  /**
   * Hide AI thinking animation
   */
  hideAIThinking() {
    const thinking = this.loadingElements.get('ai-thinking');
    if (thinking && thinking.parentNode) {
      thinking.parentNode.removeChild(thinking);
      this.loadingElements.delete('ai-thinking');
    }
  }

  /**
   * Get loading state for a feature
   * @param {string} featureId - ID of the feature
   * @returns {Object|null} Loading state information
   */
  getLoadingState(featureId) {
    return this.activeLoadings.get(featureId) || null;
  }

  /**
   * Check if any loading is active
   * @returns {boolean} Whether any loading is active
   */
  isAnyLoadingActive() {
    return this.activeLoadings.size > 0 || this.globalLoadingVisible;
  }

  /**
   * Get all active loadings
   * @returns {Array} Array of active loading information
   */
  getActiveLoadings() {
    return Array.from(this.activeLoadings.entries()).map(([id, info]) => ({
      id,
      ...info,
      duration: Date.now() - info.startTime,
    }));
  }

  /**
   * Clear all loading states
   */
  clearAllLoadings() {
    // Hide global loading
    this.hideGlobalLoading();

    // Hide all feature loadings
    for (const featureId of this.activeLoadings.keys()) {
      this.hideFeatureLoading(featureId);
    }

    // Hide terminal loading
    this.hideTerminalLoading();

    // Hide AI thinking
    this.hideAIThinking();

    // Clean up all loading elements
    this.loadingElements.clear();

    console.log('🧹 All loading states cleared');
  }

  /**
   * Set up automatic timeout for loadings
   * @param {number} timeout - Timeout in milliseconds
   */
  setupLoadingTimeouts(timeout = 30000) {
    setInterval(() => {
      const now = Date.now();
      for (const [featureId, info] of this.activeLoadings.entries()) {
        if (now - info.startTime > timeout) {
          console.warn(`⚠️ Loading timeout for feature: ${featureId}`);
          this.hideFeatureLoading(featureId);
        }
      }
    }, 5000); // Check every 5 seconds
  }
}
