/**
 * Memory Management Utility for RinaWarp Terminal
 * Handles cleanup of event listeners, intervals, and other resources
 */

class MemoryManager {
  constructor() {
    this.eventListeners = new Map();
    this.intervals = new Set();
    this.timeouts = new Set();
    this.observers = new Set();
    this.cleanupCallbacks = new Set();

    // Auto-cleanup on window unload
    window.addEventListener('beforeunload', () => this.cleanup());

    // Monitor memory usage periodically
    this.memoryMonitorInterval = setInterval(() => this.monitorMemory(), 30000);
    this.intervals.add(this.memoryMonitorInterval);
  }

  /**
   * Register an event listener for automatic cleanup
   */
  addEventListener(element, event, handler, options = {}) {
    const key = `${element.constructor.name}_${event}_${Date.now()}`;

    // Add the event listener
    element.addEventListener(event, handler, options);

    // Store reference for cleanup
    this.eventListeners.set(key, {
      element,
      event,
      handler,
      options,
    });

    // Return a cleanup function
    return () => this.removeEventListener(key);
  }

  /**
   * Remove a specific event listener
   */
  removeEventListener(key) {
    const listener = this.eventListeners.get(key);
    if (listener) {
      listener.element.removeEventListener(listener.event, listener.handler, listener.options);
      this.eventListeners.delete(key);
    }
  }

  /**
   * Register an interval for automatic cleanup
   */
  setInterval(callback, delay) {
    const intervalId = setInterval(callback, delay);
    this.intervals.add(intervalId);

    // Return wrapped interval ID with cleanup
    return {
      id: intervalId,
      clear: () => this.clearInterval(intervalId),
    };
  }

  /**
   * Clear a specific interval
   */
  clearInterval(intervalId) {
    clearInterval(intervalId);
    this.intervals.delete(intervalId);
  }

  /**
   * Register a timeout for automatic cleanup
   */
  setTimeout(callback, delay) {
    const timeoutId = setTimeout(() => {
      callback();
      this.timeouts.delete(timeoutId);
    }, delay);

    this.timeouts.add(timeoutId);

    // Return wrapped timeout ID with cleanup
    return {
      id: timeoutId,
      clear: () => this.clearTimeout(timeoutId),
    };
  }

  /**
   * Clear a specific timeout
   */
  clearTimeout(timeoutId) {
    clearTimeout(timeoutId);
    this.timeouts.delete(timeoutId);
  }

  /**
   * Register an observer (MutationObserver, ResizeObserver, etc.)
   */
  addObserver(observer) {
    this.observers.add(observer);

    return () => {
      observer.disconnect();
      this.observers.delete(observer);
    };
  }

  /**
   * Add custom cleanup callback
   */
  addCleanupCallback(callback) {
    this.cleanupCallbacks.add(callback);

    return () => this.cleanupCallbacks.delete(callback);
  }

  /**
   * Clean up DOM elements and their references
   */
  cleanupDOMElement(element) {
    if (!element) return;

    // Remove all child nodes
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }

    // Remove from parent
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }

    // Clear any data attributes or custom properties
    Object.keys(element.dataset || {}).forEach(key => {
      delete element.dataset[key];
    });
  }

  /**
   * Monitor memory usage and warn if high
   */
  monitorMemory() {
    if ('memory' in performance) {
      const memory = performance.memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);

      // Log memory stats
      console.log(`Memory Usage: ${usedMB}MB / ${totalMB}MB (Limit: ${limitMB}MB)`);

      // Warn if memory usage is high
      if (usedMB / limitMB > 0.8) {
        console.warn('High memory usage detected. Consider running cleanup.');
        this.suggestCleanup();
      }
    }
  }

  /**
   * Suggest cleanup actions when memory is high
   */
  suggestCleanup() {
    console.log('Memory cleanup suggestions:');
    console.log(`- Active event listeners: ${this.eventListeners.size}`);
    console.log(`- Active intervals: ${this.intervals.size}`);
    console.log(`- Active timeouts: ${this.timeouts.size}`);
    console.log(`- Active observers: ${this.observers.size}`);

    // Auto-cleanup old autocomplete popups
    const oldPopups = document.querySelectorAll('#autocomplete-popup');
    oldPopups.forEach(popup => {
      const age = Date.now() - (parseInt(popup.dataset.created) || 0);
      if (age > 60000) {
        // Remove popups older than 1 minute
        this.cleanupDOMElement(popup);
      }
    });
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    return {
      eventListeners: this.eventListeners.size,
      intervals: this.intervals.size,
      timeouts: this.timeouts.size,
      observers: this.observers.size,
      cleanupCallbacks: this.cleanupCallbacks.size,
    };
  }

  /**
   * Force garbage collection (if available)
   */
  forceGarbageCollection() {
    if (window.gc && typeof window.gc === 'function') {
      console.log('Forcing garbage collection...');
      window.gc();
    } else {
      console.warn('Garbage collection not available');
    }
  }

  /**
   * Complete cleanup of all managed resources
   */
  cleanup() {
    console.log('Starting memory cleanup...');

    // Clear all event listeners
    this.eventListeners.forEach((listener, key) => {
      listener.element.removeEventListener(listener.event, listener.handler, listener.options);
    });
    this.eventListeners.clear();

    // Clear all intervals
    this.intervals.forEach(intervalId => {
      clearInterval(intervalId);
    });
    this.intervals.clear();

    // Clear all timeouts
    this.timeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.timeouts.clear();

    // Disconnect all observers
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();

    // Run custom cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Cleanup callback failed:', error);
      }
    });
    this.cleanupCallbacks.clear();

    // Clean up autocomplete system
    this.cleanupAutocompleteSystem();

    // Clean up visualization system
    this.cleanupVisualizationSystem();

    console.log('Memory cleanup completed');
  }

  /**
   * Clean up autocomplete system
   */
  cleanupAutocompleteSystem() {
    // Remove autocomplete popups
    const popups = document.querySelectorAll('#autocomplete-popup');
    popups.forEach(popup => this.cleanupDOMElement(popup));

    // Clear autocomplete state
    if (window.isAutocompleteActive) {
      window.isAutocompleteActive = false;
    }
    if (window.autocompleteSuggestions) {
      window.autocompleteSuggestions = [];
    }
  }

  /**
   * Clean up visualization system
   */
  cleanupVisualizationSystem() {
    // Remove visualization dashboards
    const dashboards = document.querySelectorAll('#visualization-dashboard');
    dashboards.forEach(dashboard => this.cleanupDOMElement(dashboard));

    // Clear visualization monitoring
    if (window.visualizationSystem && window.visualizationSystem.monitoring.interval) {
      clearInterval(window.visualizationSystem.monitoring.interval);
      window.visualizationSystem.monitoring.isActive = false;
    }
  }

  /**
   * Partial cleanup for specific components
   */
  cleanupComponent(componentName) {
    switch (componentName) {
      case 'autocomplete':
        this.cleanupAutocompleteSystem();
        break;
      case 'visualization':
        this.cleanupVisualizationSystem();
        break;
      case 'ai-chat':
        const chatOverlay = document.getElementById('aiChatOverlay');
        if (chatOverlay) {
          chatOverlay.style.display = 'none';
          const messages = document.getElementById('chatMessages');
          if (messages) {
            messages.innerHTML = '';
          }
        }
        break;
    }
  }
}

// Create global instance
window.MemoryManager = MemoryManager;
window.memoryManager = new MemoryManager();
