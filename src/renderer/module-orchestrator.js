/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 4 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * ModuleOrchestrator - Intelligent module loading with environment detection
 * and adaptive fallback strategies for XTerm and related modules
 */

export class ModuleOrchestrator {
  constructor(config = {}) {
    this.config = {
      timeout: 10000,
      retryAttempts: 2,
      enableFallbacks: true,
      debugMode: config.debugMode || false,
      ...config,
    };

    this.environment = this.detectEnvironment();
    this.modules = new Map();
    this.strategyLog = [];
    this.loadAttempts = new Map();

    if (this.config.debugMode) {
    }
  }

  detectEnvironment() {
    const isElectron = !!(window?.electronAPI || window?.require);
    const isDev =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'file:';
    const isSecure = window.location.protocol === 'https:' || isDev;
    const origin = window.location.origin;
    const protocol = window.location.protocol;

    return {
      isElectron,
      isDev,
      isSecure,
      origin,
      protocol,
      canLoadExternal: isSecure && navigator.onLine,
      supportsDynamicImport:
        'import' in window.HTMLScriptElement.prototype || window.location.protocol !== 'file:',
    };
  }

  logStrategy(strategy, success, details = {}) {
    const entry = {
      strategy,
      success,
      timestamp: Date.now(),
      environment: this.environment.isElectron ? 'electron' : 'browser',
      ...details,
    };

    this.strategyLog.push(entry);

    if (this.config.debugMode) {
      const _status = success ? '✅' : '❌';
    }

    return entry;
  }

  async loadXTermModules() {
    const strategies = [
      { name: 'CDN-Enhanced', method: this.tryCdnEnhancedLoad.bind(this) },
      { name: 'CDN-Direct', method: this.tryCdnDirectLoad.bind(this) },
      { name: 'Bundled', method: this.tryBundledLoad.bind(this) },
      { name: 'Direct', method: this.tryDirectLoad.bind(this) },
      { name: 'Fallback', method: this.tryFallbackLoad.bind(this) },
    ];

    for (const strategy of strategies) {
      try {
        if (this.config.debugMode) {
        }

        const startTime = performance.now();
        const result = await Promise.race([
          strategy.method(),
          this.createTimeout(this.config.timeout, `${strategy.name} timeout`),
        ]);

        const loadTime = performance.now() - startTime;

        if (this.validateModules(result)) {
          this.logStrategy(strategy.name, true, {
            loadTime: Math.round(loadTime),
            modules: Object.keys(result),
          });

          // Cache successful modules
          for (const [key, value] of Object.entries(result)) {
            this.modules.set(key, value);
          }

          return { ...result, source: strategy.name, loadTime };
        }

        this.logStrategy(strategy.name, false, {
          reason: 'Module validation failed',
          loadTime: Math.round(loadTime),
        });
      } catch (error) {
        this.logStrategy(strategy.name, false, {
          error: error.message,
          reason: this.categorizeError(error),
        });
      }
    }

    throw new Error(new Error(
      new Error(
        `All module loading strategies failed. Environment: ${JSON.stringify(this.environment)}`
      )
    ));
  }

  async tryCdnEnhancedLoad() {
    const cdnUrls = {
      jsdelivr: {
        terminal: 'https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/+esm',
        fit: 'https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.8.0/+esm',
        webLinks: 'https://cdn.jsdelivr.net/npm/@xterm/addon-web-links@0.9.0/+esm',
      },
      unpkg: {
        terminal: 'https://unpkg.com/@xterm/xterm@5.5.0?module',
        fit: 'https://unpkg.com/@xterm/addon-fit@0.8.0?module',
        webLinks: 'https://unpkg.com/@xterm/addon-web-links@0.9.0?module',
      },
      esm: {
        terminal: 'https://esm.sh/@xterm/xterm@5.5.0',
        fit: 'https://esm.sh/@xterm/addon-fit@0.8.0',
        webLinks: 'https://esm.sh/@xterm/addon-web-links@0.9.0',
      },
    };

    // Try each CDN provider
    for (const [provider, urls] of Object.entries(cdnUrls)) {
      try {
        const [terminalMod, fitMod, webLinksMod] = await Promise.all([
          import(urls.terminal),
          import(urls.fit),
          import(urls.webLinks),
        ]);

        const result = this.normalizeModuleExports({
          terminal: terminalMod,
          fit: fitMod,
          webLinks: webLinksMod,
        });

        if (this.validateModules(result)) {
          return { ...result, provider };
        }
      } catch (error) {
        if (this.config.debugMode) {
          console.warn(`${provider} CDN failed:`, error.message);
        }
        continue;
      }
    }

    throw new Error(new Error(new Error('All CDN providers failed')));
  }

  async tryCdnDirectLoad() {
    // Direct script tag loading as fallback
    const scriptLoads = [
      this.loadScript('https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.min.js'),
      this.loadScript('https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.8.0/lib/addon-fit.min.js'),
      this.loadScript(
        'https://cdn.jsdelivr.net/npm/@xterm/addon-web-links@0.9.0/lib/addon-web-links.min.js'
      ),
    ];

    await Promise.all(scriptLoads);

    // Check if globals are available
    if (typeof window.Terminal !== 'undefined') {
      return {
        Terminal: window.Terminal,
        FitAddon: window.FitAddon,
        WebLinksAddon: window.WebLinksAddon,
      };
    }

    throw new Error(new Error(new Error('Global XTerm objects not found after script loading')));
  }

  async tryBundledLoad() {
    if (!this.environment.supportsDynamicImport) {
      throw new Error(new Error(new Error('Dynamic import not supported')));
    }

    const [terminalMod, fitMod, webLinksMod] = await Promise.all([
      import('@xterm/xterm'),
      import('@xterm/addon-fit'),
      import('@xterm/addon-web-links'),
    ]);

    return this.normalizeModuleExports({
      terminal: terminalMod,
      fit: fitMod,
      webLinks: webLinksMod,
    });
  }

  async tryDirectLoad() {
    const paths = [
      './node_modules/@xterm/xterm/lib/xterm.js',
      './node_modules/@xterm/addon-fit/lib/addon-fit.js',
      './node_modules/@xterm/addon-web-links/lib/addon-web-links.js',
    ];

    const [terminalMod, fitMod, webLinksMod] = await Promise.all(paths.map(path => import(path)));

    return this.normalizeModuleExports({
      terminal: terminalMod,
      fit: fitMod,
      webLinks: webLinksMod,
    });
  }

  async tryFallbackLoad() {
    // Create minimal fallback implementations
    const FallbackTerminal = class {
      constructor(options = {}) {
        this.options = options;
        this.element = null;
        this.listeners = new Map();
        console.warn('Using fallback Terminal implementation');
      }

      open(container) {
        this.element = document.createElement('div');
        this.element.style.cssText = `
                    background: #000;
                    color: #fff;
                    font-family: monospace;
                    padding: 10px;
                    height: 100%;
                    overflow-y: auto;
                `;
        this.element.innerHTML = `
                    <div style="color: #ffd93d;">⚠️ Using Fallback Terminal</div>
                    <div>XTerm modules failed to load. Limited functionality available.</div>
                    <div style="margin-top: 10px;">Try running from: http://localhost:8080</div>
                `;
        container.appendChild(this.element);
      }

      writeln(text) {
        if (this.element) {
          const line = document.createElement('div');
          line.textContent = text;
          this.element.appendChild(line);
        }
      }

      write(text) {
        this.writeln(text);
      }
      onData(callback) {
        this.listeners.set('data', callback);
      }
      loadAddon() {
        /* no-op */
      }
      focus() {
        /* no-op */
      }
      dispose() {
        /* no-op */
      }
    };

    const FallbackAddon = class {
      constructor() {}
      activate() {}
      dispose() {}
    };

    return {
      Terminal: FallbackTerminal,
      FitAddon: FallbackAddon,
      WebLinksAddon: FallbackAddon,
    };
  }

  normalizeModuleExports(modules) {
    const result = {};

    // Normalize Terminal
    const terminalExport =
      modules.terminal?.Terminal ||
      modules.terminal?.default?.Terminal ||
      modules.terminal?.default;
    if (typeof terminalExport === 'function') {
      result.Terminal = terminalExport;
    }

    // Normalize FitAddon
    const fitExport =
      modules.fit?.FitAddon || modules.fit?.default?.FitAddon || modules.fit?.default;
    if (typeof fitExport === 'function') {
      result.FitAddon = fitExport;
    }

    // Normalize WebLinksAddon
    const webLinksExport =
      modules.webLinks?.WebLinksAddon ||
      modules.webLinks?.default?.WebLinksAddon ||
      modules.webLinks?.default;
    if (typeof webLinksExport === 'function') {
      result.WebLinksAddon = webLinksExport;
    }

    return result;
  }

  validateModules(modules) {
    const required = ['Terminal'];
    const _optional = ['FitAddon', 'WebLinksAddon'];

    // Check required modules
    for (const moduleName of required) {
      if (!modules[moduleName] || typeof modules[moduleName] !== 'function') {
        if (this.config.debugMode) {
          console.warn(`Required module ${moduleName} is missing or invalid`);
        }
        return false;
      }
    }

    // Test instantiation
    try {
      const testTerminal = new modules.Terminal({ rows: 1, cols: 1 });
      testTerminal.dispose?.();
      return true;
    } catch (error) {
      if (this.config.debugMode) {
        console.warn('Module validation failed:', error.message);
      }
      return false;
    }
  }

  categorizeError(error) {
    const message = error.message.toLowerCase();

    if (message.includes('cors') || message.includes('cross-origin')) {
      return 'CORS Policy Violation';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network/CDN Unavailable';
    }
    if (message.includes('specifier') || message.includes('resolve')) {
      return 'Module Resolution Failed';
    }
    if (message.includes('timeout')) {
      return 'Loading Timeout';
    }
    if (message.includes('constructor') || message.includes('function')) {
      return 'Export Format Issue';
    }

    return 'Unknown Error';
  }

  createTimeout(ms, reason) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout: ${reason}`)), ms);
    });
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  getReport() {
    return {
      environment: this.environment,
      strategies: this.strategyLog,
      loadedModules: Array.from(this.modules.keys()),
      recommendations: this.generateRecommendations(),
    };
  }

  generateRecommendations() {
    const recommendations = [];

    if (!this.environment.isSecure) {
      recommendations.push('Use HTTPS or localhost for secure module loading');
    }

    if (!this.environment.canLoadExternal) {
      recommendations.push('Check internet connection for CDN access');
    }

    if (this.environment.protocol === 'file:') {
      recommendations.push('Run from http://localhost for proper module resolution');
    }

    if (!this.environment.isElectron) {
      recommendations.push('Use Electron for full shell integration features');
    }

    return recommendations;
  }
}

// Factory function for easy use
export function createModuleOrchestrator(config = {}) {
  return new ModuleOrchestrator(config);
}

// Global initialization helper
export function initializeGlobalModuleOrchestrator(config = {}) {
  if (!window.moduleOrchestrator) {
    window.moduleOrchestrator = new ModuleOrchestrator(config);
  }
  return window.moduleOrchestrator;
}
