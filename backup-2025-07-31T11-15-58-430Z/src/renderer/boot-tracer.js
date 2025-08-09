/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal Boot Tracer
 * Comprehensive terminal initialization sequencing with debug visuals
 */

export class BootTracer {
  constructor(options = {}) {
    this.options = {
      enableVisualDebug: options.enableVisualDebug ?? true,
      enableTelemetryOverlay: options.enableTelemetryOverlay ?? true,
      enableBorderIndicator: options.enableBorderIndicator ?? true,
      logLevel: options.logLevel ?? 'info',
      autoCleanup: options.autoCleanup ?? 30000, // 30 seconds
      ...options,
    };

    this.bootSequence = [];
    this.startTime = Date.now();
    this.diagnosticOverlay = null;
    this.bootBanner = null;
  }

  log(message, type = 'info', data = null) {
    const timestamp = Date.now() - this.startTime;
    const logEntry = {
      timestamp,
      message,
      type,
      data,
      time: new Date().toLocaleTimeString(),
    };

    this.bootSequence.push(logEntry);

    // Console logging with colors
    const colors = {
      info: '\x1b[36m', // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      reset: '\x1b[0m',
    };

    const _color = colors[type] || colors.info;

    // Update diagnostic overlay if enabled
    this.updateDiagnosticOverlay();
  }

  async initializeTerminalSafely(tabId, terminalConstructor) {
    this.log('🎬 Terminal Boot Trace Start', 'info');

    try {
      // Inject visual indicators
      if (this.options.enableVisualDebug) {
        this.injectBootBanner();
        if (this.options.enableTelemetryOverlay) {
          this.injectBootOverlay();
        }
      }

      // Step 1: Wait for DOM to be fully ready
      await this.waitForDOMReady();

      // Step 2: Wait for CSS to be loaded
      await this.waitForCSSLoad();

      // Step 3: Ensure preload bindings are available
      await this.ensurePreloadBindings();

      // Step 4: Validate container exists
      const containerValid = await this.validateContainer(tabId);
      if (!containerValid) {
        throw new Error(new Error(`Terminal container 'terminal-tab-${tabId}' not found`));
      }

      // Step 5: Initialize terminal
      const terminal = await this.createTerminalInstance(tabId, terminalConstructor);

      this.log('✅ Terminal boot sequence completed successfully', 'success');

      // Success visual feedback
      if (this.options.enableBorderIndicator) {
        document.body.style.border = '4px solid #00ff88';
        setTimeout(() => {
          document.body.style.border = '';
        }, 2000);
      }

      // Auto-cleanup debug elements
      if (this.options.autoCleanup > 0) {
        setTimeout(() => this.cleanup(), this.options.autoCleanup);
      }

      return terminal;
    } catch (error) {
      this.log(`❌ Terminal boot failed: ${error.message}`, 'error', { stack: error.stack });

      // Error visual feedback
      if (this.options.enableBorderIndicator) {
        document.body.style.border = '4px solid #ff6b6b';
      }

      throw new Error(error);
    }
  }

  async waitForDOMReady() {
    this.log('⏳ Waiting for DOM ready state...', 'info');

    if (document.readyState === 'complete') {
      this.log('✅ DOM already complete', 'success');
      return;
    }

    if (document.readyState === 'interactive') {
      // Wait for full load
      await new Promise(resolve => {
        window.addEventListener('load', resolve, { once: true });
      });
    } else {
      // Wait for DOM content loaded first, then full load
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      });

      await new Promise(resolve => {
        window.addEventListener('load', resolve, { once: true });
      });
    }

    this.log('✅ DOM fully ready', 'success');
  }

  async waitForCSSLoad() {
    this.log('⏳ Waiting for CSS load...', 'info');

    return new Promise(resolve => {
      const checkCSS = () => {
        const styleSheets = document.styleSheets.length;
        const xtermCSSExists = Array.from(document.styleSheets).some(sheet => {
          try {
            return sheet.href && sheet.href.includes('xterm.css');
          } catch (_e) {
            return false;
          }
        });

        this.log(`📊 CSS Status: ${styleSheets} sheets, XTerm CSS: ${xtermCSSExists}`, 'info');

        // Wait a bit for stylesheets to fully apply
        setTimeout(() => {
          this.log('✅ CSS loading wait completed', 'success');
          resolve();
        }, 100);
      };

      if (document.readyState === 'complete') {
        checkCSS();
      } else {
        document.addEventListener('DOMContentLoaded', checkCSS);
      }
    });
  }

  async ensurePreloadBindings() {
    this.log('⏳ Ensuring preload bindings...', 'info');

    if (!window.electronAPI) {
      this.log('⚠️ Electron API not available - web mode', 'warning');
      return;
    }

    // Test key preload functions
    const requiredMethods = ['createShellProcess', 'onShellData', 'sendToShell', 'getSystemInfo'];

    const missing = requiredMethods.filter(
      method => typeof window.electronAPI[method] !== 'function'
    );

    if (missing.length > 0) {
      this.log(`⚠️ Missing preload methods: ${missing.join(', ')}`, 'warning');
    } else {
      this.log('✅ All preload bindings available', 'success');
    }

    // Test system info as a connectivity check
    try {
      const systemInfo = await window.electronAPI.getSystemInfo();
      this.log('✅ Preload connectivity verified', 'success', systemInfo);
    } catch (error) {
      this.log('⚠️ Preload connectivity test failed', 'warning', error.message);
    }
  }

  async validateContainer(tabId) {
    this.log(`⏳ Validating container 'terminal-tab-${tabId}'...`, 'info');

    const container = document.getElementById(`terminal-tab-${tabId}`);
    const isValid = !!container;

    if (isValid) {
      const rect = container.getBoundingClientRect();
      this.log('✅ Container found and measurable', 'success', {
        id: container.id,
        tagName: container.tagName,
        dimensions: `${rect.width}x${rect.height}`,
        visible: rect.width > 0 && rect.height > 0,
      });
    } else {
      this.log(`❌ Container 'terminal-tab-${tabId}' not found`, 'error');
    }

    return isValid;
  }

  async createTerminalInstance(tabId, terminalConstructor) {
    this.log('⏳ Creating terminal instance...', 'info');

    if (!terminalConstructor || typeof terminalConstructor !== 'function') {
      throw new Error(new Error('Terminal constructor function not provided'));
    }

    const container = document.getElementById(`terminal-tab-${tabId}`);
    const terminal = await terminalConstructor(container);

    this.log('✅ Terminal instance created', 'success');
    return terminal;
  }

  injectBootBanner() {
    if (this.bootBanner) return;

    this.bootBanner = document.createElement('div');
    this.bootBanner.innerText = '🔍 Terminal Booting...';
    this.bootBanner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            background: #222;
            color: #00ff88;
            padding: 8px 16px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            z-index: 10000;
            border-bottom: 2px solid #00ff88;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        `;
    document.body.appendChild(this.bootBanner);

    this.log('🎨 Boot banner injected', 'info');
  }

  injectBootOverlay() {
    if (this.diagnosticOverlay) return;

    this.diagnosticOverlay = document.createElement('div');
    this.diagnosticOverlay.id = 'boot-diagnostics';
    this.diagnosticOverlay.style.cssText = `
            position: fixed;
            top: 40px;
            left: 0;
            background: rgba(0, 0, 0, 0.9);
            color: #00ff88;
            padding: 12px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 11px;
            border: 1px solid #00ff88;
            border-top: none;
            max-height: 300px;
            overflow-y: auto;
            min-width: 300px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.7);
        `;

    document.body.appendChild(this.diagnosticOverlay);
    this.updateDiagnosticOverlay();

    this.log('🎨 Diagnostic overlay injected', 'info');
  }

  updateDiagnosticOverlay() {
    if (!this.diagnosticOverlay) return;

    const containerExists = !!document.getElementById('terminal-tab-main');
    const uptime = Date.now() - this.startTime;

    const diagnosticInfo = `
<div style="color: #55ffff; border-bottom: 1px solid #333; margin-bottom: 8px; padding-bottom: 4px;">
🔍 RinaWarp Boot Diagnostics
</div>
<div>⏱️ Uptime: ${uptime}ms</div>
<div>📄 DOM Ready: <span style="color: ${document.readyState === 'complete' ? '#00ff88' : '#ffdd44'}">${document.readyState}</span></div>
<div>🎨 CSS Sheets: <span style="color: #00ff88">${document.styleSheets.length}</span></div>
<div>🔗 ElectronAPI: <span style="color: ${window.electronAPI ? '#00ff88' : '#ff6b6b'}">${!!window.electronAPI}</span></div>
<div>📦 Terminal Container: <span style="color: ${containerExists ? '#00ff88' : '#ff6b6b'}">${containerExists}</span></div>
<div>🧪 Boot Sequence: <span style="color: #00ff88">${this.bootSequence.length} steps</span></div>
<div style="margin-top: 8px; border-top: 1px solid #333; padding-top: 4px; color: #aaa; font-size: 10px;">
Recent: ${this.bootSequence
      .slice(-3)
      .map(
        entry =>
          `<div style="color: ${entry.type === 'error' ? '#ff6b6b' : entry.type === 'success' ? '#00ff88' : '#74c0fc'}">${entry.message}</div>`
      )
      .join('')}
</div>
        `.trim();

    this.diagnosticOverlay.innerHTML = diagnosticInfo;
  }

  updateBootBanner(message, type = 'info') {
    if (!this.bootBanner) return;

    const colors = {
      info: '#00ff88',
      success: '#00ff88',
      warning: '#ffdd44',
      error: '#ff6b6b',
    };

    this.bootBanner.innerText = message;
    this.bootBanner.style.color = colors[type];
    this.bootBanner.style.borderBottomColor = colors[type];
  }

  cleanup() {
    this.log('🧹 Cleaning up debug elements', 'info');

    if (this.bootBanner) {
      this.bootBanner.remove();
      this.bootBanner = null;
    }

    if (this.diagnosticOverlay) {
      this.diagnosticOverlay.remove();
      this.diagnosticOverlay = null;
    }

    // Clear border indicator
    if (document.body.style.border) {
      document.body.style.border = '';
    }
  }

  getBootReport() {
    return {
      totalTime: Date.now() - this.startTime,
      steps: this.bootSequence.length,
      sequence: this.bootSequence,
      success: this.bootSequence.some(entry => entry.message.includes('completed successfully')),
      errors: this.bootSequence.filter(entry => entry.type === 'error'),
    };
  }

  // Static helper for quick initialization
  static async quickInit(tabId, terminalConstructor, options = {}) {
    const tracer = new BootTracer(options);
    return await tracer.initializeTerminalSafely(tabId, terminalConstructor);
  }
}

// Auto-enable for development builds
export function createDevBootTracer(isDev = false) {
  return new BootTracer({
    enableVisualDebug: isDev,
    enableTelemetryOverlay: isDev,
    enableBorderIndicator: isDev,
    autoCleanup: isDev ? 15000 : 5000, // Shorter cleanup in dev mode
  });
}

export default BootTracer;
