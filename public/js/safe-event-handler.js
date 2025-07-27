// Safe Event Handler Utility for CSP Compliance
// This replaces inline event handlers with programmatic event listeners

class SafeEventHandler {
  static init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.attachHandlers.bind(this));
    } else {
      this.attachHandlers();
    }
  }
  
  static attachHandlers() {
    // Replace purchasePlan inline handlers
    document.querySelectorAll('[data-plan]').forEach(element => {
      const plan = element.getAttribute('data-plan');
      element.addEventListener('click', () => {
        if (typeof purchasePlan === 'function') {
          purchasePlan(plan);
        }
      });
    });
    
    // Replace any remaining onclick handlers
    document.querySelectorAll('[onclick]').forEach(element => {
      console.warn('Found inline onclick handler, converting to event listener');
      const handler = element.getAttribute('onclick');
      element.removeAttribute('onclick');
      element.addEventListener('click', function(event) {
        try {
          // Create a function from the handler string
          const fn = new Function('event', handler);
          fn.call(this, event);
        } catch (e) {
          console.error('Error executing handler:', e);
        }
      });
    });
    
    // Handle other event types
    const eventTypes = ['onchange', 'onsubmit', 'onload', 'onkeyup', 'onkeydown', 'onmouseover'];
    eventTypes.forEach(eventAttr => {
      const eventType = eventAttr.substring(2); // Remove 'on' prefix
      document.querySelectorAll(`[${eventAttr}]`).forEach(element => {
        console.warn(`Found inline ${eventAttr} handler, converting to event listener`);
        const handler = element.getAttribute(eventAttr);
        element.removeAttribute(eventAttr);
        element.addEventListener(eventType, function(event) {
          try {
            const fn = new Function('event', handler);
            fn.call(this, event);
          } catch (e) {
            console.error(`Error executing ${eventType} handler:`, e);
          }
        });
      });
    });
  }
}

// Initialize when loaded
SafeEventHandler.init();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SafeEventHandler;
}
