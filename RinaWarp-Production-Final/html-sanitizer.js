/**
 * HTML Sanitization Utility for RinaWarp Terminal
 * Prevents XSS attacks by sanitizing HTML content before insertion
 */

class HTMLSanitizer {
  constructor() {
    // Define allowed HTML tags and attributes
    this.allowedTags = new Set([
      'div',
      'span',
      'p',
      'br',
      'strong',
      'em',
      'b',
      'i',
      'u',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'code',
      'pre',
      'small',
      'blockquote',
    ]);

    this.allowedAttributes = new Set(['style', 'class', 'id']);

    // Define allowed CSS properties for style attribute
    this.allowedCSSProperties = new Set([
      'color',
      'background-color',
      'font-size',
      'font-weight',
      'font-style',
      'text-align',
      'text-decoration',
      'margin',
      'margin-top',
      'margin-bottom',
      'margin-left',
      'margin-right',
      'padding',
      'border',
      'border-radius',
      'display',
      'opacity',
      'line-height',
    ]);
  }

  /**
   * Sanitize HTML string by removing dangerous elements and attributes
   */
  sanitizeHTML(html) {
    if (typeof html !== 'string') {
      return '';
    }

    // Create a temporary DOM element to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Recursively sanitize all elements
    this.sanitizeElement(tempDiv);

    return tempDiv.innerHTML;
  }

  /**
   * Recursively sanitize DOM elements
   */
  sanitizeElement(element) {
    const children = Array.from(element.children);

    children.forEach(child => {
      // Check if tag is allowed
      if (!this.allowedTags.has(child.tagName.toLowerCase())) {
        // Replace disallowed tag with its text content
        const textNode = document.createTextNode(child.textContent || '');
        child.parentNode.replaceChild(textNode, child);
        return;
      }

      // Sanitize attributes
      this.sanitizeAttributes(child);

      // Recursively sanitize children
      this.sanitizeElement(child);
    });
  }

  /**
   * Sanitize element attributes
   */
  sanitizeAttributes(element) {
    const attributes = Array.from(element.attributes);

    attributes.forEach(attr => {
      const attrName = attr.name.toLowerCase();

      // Remove disallowed attributes
      if (!this.allowedAttributes.has(attrName)) {
        element.removeAttribute(attr.name);
        return;
      }

      // Special handling for style attribute
      if (attrName === 'style') {
        element.setAttribute('style', this.sanitizeCSS(attr.value));
      }

      // Special handling for event handlers (remove all)
      if (attrName.startsWith('on')) {
        element.removeAttribute(attr.name);
      }
    });
  }

  /**
   * Sanitize CSS styles
   */
  sanitizeCSS(cssText) {
    if (!cssText) return '';

    const sanitizedRules = [];
    const rules = cssText.split(';');

    rules.forEach(rule => {
      const [property, value] = rule.split(':').map(s => s.trim());

      if (property && value && this.allowedCSSProperties.has(property.toLowerCase())) {
        // Additional validation for CSS values
        if (this.isValidCSSValue(property, value)) {
          sanitizedRules.push(`${property}: ${value}`);
        }
      }
    });

    return sanitizedRules.join('; ');
  }

  /**
   * Validate CSS values to prevent CSS injection
   */
  isValidCSSValue(property, value) {
    // Remove potentially dangerous CSS functions and values
    const dangerousPatterns = [
      /javascript:/i,
      /expression\(/i,
      /url\(/i,
      /import/i,
      /@/,
      /behavior:/i,
    ];

    return !dangerousPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Safe method to set HTML content with sanitization
   */
  safeSetHTML(element, html) {
    if (!element) return;

    const sanitizedHTML = this.sanitizeHTML(html);
    element.innerHTML = sanitizedHTML;
  }

  /**
   * Create safe text content (alternative to innerHTML)
   */
  safeSetText(element, text) {
    if (!element) return;

    // Use textContent for plain text to prevent any HTML injection
    element.textContent = text || '';
  }

  /**
   * Escape HTML entities in text
   */
  escapeHTML(text) {
    if (typeof text !== 'string') return '';

    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };

    return text.replace(/[&<>"'/]/g, char => escapeMap[char]);
  }

  /**
   * Create safe HTML for terminal output with basic formatting
   */
  createSafeTerminalHTML(text, className = '', style = '') {
    const escapedText = this.escapeHTML(text);
    const safeClass = this.escapeHTML(className);
    const safeStyle = this.sanitizeCSS(style);

    return `<div class="${safeClass}" style="${safeStyle}">${escapedText}</div>`;
  }

  /**
   * Sanitize AI response for safe display
   */
  sanitizeAIResponse(response) {
    if (typeof response !== 'string') return '';

    // First escape all HTML to prevent injection
    let sanitized = this.escapeHTML(response);

    // Allow basic formatting by converting markdown-like syntax to safe HTML
    sanitized = sanitized
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/`(.*?)`/g, '<code>$1</code>') // Code
      .replace(/\n/g, '<br>'); // Line breaks

    // Final sanitization pass
    return this.sanitizeHTML(sanitized);
  }
}

// Create global instance
window.HTMLSanitizer = HTMLSanitizer;
window.htmlSanitizer = new HTMLSanitizer();
