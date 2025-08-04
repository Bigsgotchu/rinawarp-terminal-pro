/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * XTerm.js Compatibility Layer
 * Provides cross-platform import/export handling for XTerm modules
 */

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

// Dynamic import strategy for XTerm modules
let Terminal, FitAddon, WebLinksAddon;

/**
 * Initialize XTerm modules with fallback strategies
 */
export async function initializeXTerm() {
  try {
    // Strategy 1: Try ES module imports
    if (isBrowser) {
      try {
        const xtermModule = await import('@xterm/xterm');
        const fitModule = await import('@xterm/addon-fit');
        const webLinksModule = await import('@xterm/addon-web-links');

        Terminal = xtermModule.Terminal;
        FitAddon = fitModule.FitAddon;
        WebLinksAddon = webLinksModule.WebLinksAddon;

        console.log('✅ XTerm modules loaded via ES imports');
        return { Terminal, FitAddon, WebLinksAddon };
      } catch (importError) {
        console.warn('⚠️ ES module import failed:', importError.message);
      }
    }

    // Strategy 2: Try CommonJS require (Electron context)
    if (typeof require !== 'undefined') {
      try {
        const xtermModule = require('@xterm/xterm');
        const fitModule = require('@xterm/addon-fit');
        const webLinksModule = require('@xterm/addon-web-links');

        Terminal = xtermModule.Terminal;
        FitAddon = fitModule.FitAddon;
        WebLinksAddon = webLinksModule.WebLinksAddon;

        return { Terminal, FitAddon, WebLinksAddon };
      } catch (requireError) {
        console.warn('⚠️ CommonJS require failed:', requireError.message);
      }
    }

    // Strategy 3: Try global window objects (loaded via script tags)
    if (isBrowser && window.Terminal) {
      Terminal = window.Terminal;
      FitAddon = window.FitAddon;
      WebLinksAddon = window.WebLinksAddon;

      return { Terminal, FitAddon, WebLinksAddon };
    }

    // Strategy 4: Load via script tags dynamically
    if (isBrowser) {
      await loadXTermScripts();

      Terminal = window.Terminal;
      FitAddon = window.FitAddon;
      WebLinksAddon = window.WebLinksAddon;

      if (Terminal) {
        return { Terminal, FitAddon, WebLinksAddon };
      }
    }

    throw new Error(new Error('All XTerm loading strategies failed'));
  } catch (error) {
    console.error('❌ XTerm initialization failed:', error);

    // Provide fallback Terminal implementation
    return createFallbackTerminal();
  }
}

/**
 * Load XTerm scripts dynamically
 */
async function loadXTermScripts() {
  const scripts = [
    {
      src: '/node_modules/@xterm/xterm/lib/xterm.js',
      global: 'Terminal',
    },
    {
      src: '/node_modules/@xterm/addon-fit/lib/addon-fit.js',
      global: 'FitAddon',
    },
    {
      src: '/node_modules/@xterm/addon-web-links/lib/addon-web-links.js',
      global: 'WebLinksAddon',
    },
  ];

  const fallbackPaths = [
    '/public/vendor/xterm/',
    '/public/assets/xterm/',
    '/vendor/xterm/',
    '/assets/xterm/',
  ];

  for (const script of scripts) {
    let loaded = false;

    // Try each path until one works
    for (const basePath of ['/node_modules/@xterm/', ...fallbackPaths]) {
      try {
        const scriptPath = basePath + script.src.split('/').pop();
        await loadScript(scriptPath);

        // Check if global is available
        if (window[script.global]) {
          loaded = true;
          break;
        }
      } catch (error) {
        // Continue to next path
      }
    }

    if (!loaded) {
      console.warn(`⚠️ Failed to load ${script.global}`);
    }
  }
}

/**
 * Load a single script
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Create fallback terminal implementation
 */
function createFallbackTerminal() {
  class FallbackTerminal {
    constructor(options = {}) {
      this.options = options;
      this.element = null;
      this.onDataHandlers = [];
      this.onResizeHandlers = [];
    }

    open(element) {
      this.element = element;
      element.innerHTML = `
        <div style="
          background: ${this.options.theme?.background || '#000'};
          color: ${this.options.theme?.foreground || '#fff'};
          font-family: ${this.options.fontFamily || 'monospace'};
          font-size: ${this.options.fontSize || 14}px;
          padding: 10px;
          height: 100%;
          overflow-y: auto;
          white-space: pre-wrap;
        ">
          <div style="color: #ff6b6b; margin-bottom: 10px;">
            ⚠️ Terminal fallback mode - XTerm.js not available
          </div>
          <div style="color: #74c0fc;">
            Some features may be limited in this mode.
          </div>
          <div style="margin-top: 10px;">
            <span style="color: #51cf66;">$</span> <span id="terminal-cursor">|</span>
          </div>
        </div>
      `;

      // Add blinking cursor
      const cursor = element.querySelector('#terminal-cursor');
      if (cursor) {
        setInterval(() => {
          cursor.style.opacity = cursor.style.opacity === '0' ? '1' : '0';
        }, 500);
      }

      // Add basic keyboard input
      element.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          this.write('\r\n$ ');
        } else if (e.key.length === 1) {
          this.write(e.key);
        }
      });

      element.setAttribute('tabindex', '0');
      element.focus();
    }

    write(data) {
      if (!this.element) return;

      const content = this.element.querySelector('div > div:last-child');
      if (content) {
        content.insertAdjacentText('beforeend', data);
        this.element.scrollTop = this.element.scrollHeight;
      }
    }

    onData(callback) {
      this.onDataHandlers.push(callback);
    }

    onResize(callback) {
      this.onResizeHandlers.push(callback);
    }

    loadAddon(addon) {
      if (addon.activate) {
        addon.activate(this);
      }
    }

    focus() {
      if (this.element) {
        this.element.focus();
      }
    }

    dispose() {
      this.onDataHandlers = [];
      this.onResizeHandlers = [];
      if (this.element) {
        this.element.innerHTML = '';
      }
    }
  }

  class FallbackFitAddon {
    constructor() {}

    activate(terminal) {
      this.terminal = terminal;
    }

    fit() {
      // Basic resize handling
      if (this.terminal && this.terminal.element) {
        const _rect = this.terminal.element.getBoundingClientRect();
      }
    }
  }

  class FallbackWebLinksAddon {
    constructor() {}

    activate(terminal) {
      this.terminal = terminal;
    }
  }

  return {
    Terminal: FallbackTerminal,
    FitAddon: FallbackFitAddon,
    WebLinksAddon: FallbackWebLinksAddon,
  };
}

/**
 * Export compatibility functions
 */
export { Terminal, FitAddon, WebLinksAddon };

// Auto-initialize if this module is imported
if (isBrowser) {
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeXTerm);
  } else {
    initializeXTerm();
  }
}

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initializeXTerm, Terminal, FitAddon, WebLinksAddon };
}
