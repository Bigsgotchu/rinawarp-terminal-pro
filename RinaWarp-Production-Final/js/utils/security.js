/**
 * Security Manager - Enhanced security utilities and protection
 */

export class SecurityManager {
  constructor() {
    this.initialized = false;
    this.sanitizer = null;
    this.cspViolations = [];
  }

  async init() {
    console.log('🔐 Initializing Security Manager...');

    // Initialize HTML sanitizer if available
    this.initializeSanitizer();

    // Set up CSP violation reporting
    this.setupCSPReporting();

    this.initialized = true;
    console.log('✅ Security Manager initialized');
  }

  initializeSanitizer() {
    try {
      // Use native Sanitizer API if available, otherwise fallback
      if ('Sanitizer' in window) {
        this.sanitizer = new Sanitizer();
      } else {
        // Fallback sanitization function
        this.sanitizer = {
          sanitizeFor: (element, input) => {
            const div = document.createElement('div');
            div.textContent = input;
            return div.innerHTML;
          },
        };
      }
    } catch (error) {
      console.warn('Sanitizer not available, using fallback');
      this.sanitizer = {
        sanitizeFor: (element, input) => {
          return String(input).replace(/[<>&"']/g, char => {
            const entities = {
              '<': '&lt;',
              '>': '&gt;',
              '&': '&amp;',
              '"': '&quot;',
              "'": '&#39;',
            };
            return entities[char];
          });
        },
      };
    }
  }

  setupCSP() {
    // Content Security Policy setup (would be handled by server in production)
    console.log('🛡️ CSP security headers should be configured on the server');
  }

  setupCSPReporting() {
    document.addEventListener('securitypolicyviolation', event => {
      this.cspViolations.push({
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        documentURI: event.documentURI,
        timestamp: new Date().toISOString(),
      });
      console.warn('CSP Violation:', event.violatedDirective, event.blockedURI);
    });
  }

  initializeSanitization() {
    // Input sanitization is now handled by the sanitizer
    console.log('✅ Input sanitization ready');
  }

  sanitizeHTML(html) {
    if (this.sanitizer) {
      return this.sanitizer.sanitizeFor('div', html);
    }
    return html; // Fallback - should implement proper sanitization
  }

  sanitizeInput(input) {
    if (typeof input !== 'string') {
      input = String(input);
    }
    return input.replace(/[<>&"']/g, char => {
      const entities = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[char];
    });
  }

  validateURL(url) {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:', 'mailto:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  getCSPViolations() {
    return this.cspViolations;
  }
}
