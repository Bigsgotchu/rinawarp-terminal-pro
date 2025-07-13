/**
 * RinaWarp Terminal - DevTools Overlay
 * Copyright (c) 2025 RinaWarp Technologies
 * 
 * Interactive diagnostic overlay with live DOM tests, theme controls, 
 * and visual feedback for development and testing.
 */

class RinaWarpDevTools {
  constructor() {
    this.overlay = null;
    this.results = [];
    this.currentTheme = 'default';
    this.init();
  }

  init() {
    this.createOverlay();
    this.attachEventListeners();
    this.runInitialChecks();
    console.log('🧜‍♀️ RinaWarp DevTools Overlay initialized');
  }

  createOverlay() {
    // Remove existing overlay if present
    const existing = document.getElementById('rinawarp-devtools');
    if (existing) existing.remove();

    // Create overlay HTML
    this.overlay = document.createElement('div');
    this.overlay.id = 'rinawarp-devtools';
    this.overlay.innerHTML = `
            <div class="floating-panel">
                <div class="panel-header">
                    <h3>🧜‍♀️ RinaWarp Diagnostics</h3>
                    <button class="minimize-btn" id="minimize-devtools">−</button>
                    <button class="close-btn" id="close-devtools">×</button>
                </div>
                <div class="panel-content">
                    <div class="button-group">
                        <button id="check-elements" class="diag-btn primary">
                            <span class="btn-icon">🧪</span>
                            <span class="btn-text">Element Checks</span>
                        </button>
                        <button id="toggle-theme" class="diag-btn secondary">
                            <span class="btn-icon">🎨</span>
                            <span class="btn-text">Toggle Theme</span>
                        </button>
                        <button id="check-api" class="diag-btn warning">
                            <span class="btn-icon">💾</span>
                            <span class="btn-text">Test API</span>
                        </button>
                        <button id="activate-modal" class="diag-btn success">
                            <span class="btn-icon">🎯</span>
                            <span class="btn-text">Activate Modal</span>
                        </button>
                        <button id="inject-fallback" class="diag-btn info">
                            <span class="btn-icon">⚡</span>
                            <span class="btn-text">Inject CSS</span>
                        </button>
                    </div>
                    <div class="test-results" id="test-results">
                        <div class="results-header">📋 Test Results</div>
                        <div class="results-content" id="results-content">
                            Click a button to run diagnostics...
                        </div>
                    </div>
                </div>
            </div>
        `;

    // Add styles
    this.injectStyles();
        
    // Add to document
    document.body.appendChild(this.overlay);
  }

  injectStyles() {
    const styleId = 'rinawarp-devtools-styles';
    if (document.getElementById(styleId)) return;

    const styles = document.createElement('style');
    styles.id = styleId;
    styles.textContent = `
            #rinawarp-devtools {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                user-select: none;
            }

            #rinawarp-devtools .floating-panel {
                background: linear-gradient(135deg, rgba(0, 139, 139, 0.95) 0%, rgba(255, 20, 147, 0.95) 50%, rgba(0, 170, 255, 0.95) 100%);
                backdrop-filter: blur(15px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 16px;
                box-shadow: 
                    0 8px 32px rgba(0, 0, 0, 0.3),
                    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
                min-width: 320px;
                max-width: 400px;
                color: white;
                overflow: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            #rinawarp-devtools .panel-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 20px 12px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.15);
            }

            #rinawarp-devtools .panel-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }

            #rinawarp-devtools .minimize-btn,
            #rinawarp-devtools .close-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                color: white;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                margin-left: 8px;
                transition: all 0.2s ease;
            }

            #rinawarp-devtools .minimize-btn:hover,
            #rinawarp-devtools .close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.1);
            }

            #rinawarp-devtools .panel-content {
                padding: 20px;
            }

            #rinawarp-devtools .button-group {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-bottom: 20px;
            }

            #rinawarp-devtools .diag-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
                border: none;
                border-radius: 10px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            #rinawarp-devtools .diag-btn.primary {
                background: rgba(0, 123, 255, 0.8);
            }

            #rinawarp-devtools .diag-btn.secondary {
                background: rgba(108, 117, 125, 0.8);
            }

            #rinawarp-devtools .diag-btn.warning {
                background: rgba(255, 193, 7, 0.8);
                color: #212529;
            }

            #rinawarp-devtools .diag-btn.success {
                background: rgba(40, 167, 69, 0.8);
            }

            #rinawarp-devtools .diag-btn.info {
                background: rgba(23, 162, 184, 0.8);
            }

            #rinawarp-devtools .diag-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }

            #rinawarp-devtools .btn-icon {
                font-size: 16px;
            }

            #rinawarp-devtools .btn-text {
                font-size: 12px;
            }

            #rinawarp-devtools .test-results {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                overflow: hidden;
            }

            #rinawarp-devtools .results-header {
                padding: 12px 16px;
                background: rgba(0, 0, 0, 0.2);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                font-size: 13px;
                font-weight: 600;
            }

            #rinawarp-devtools .results-content {
                padding: 16px;
                font-size: 12px;
                line-height: 1.5;
                max-height: 200px;
                overflow-y: auto;
            }

            #rinawarp-devtools .result-item {
                margin-bottom: 8px;
                padding: 8px 12px;
                border-radius: 6px;
                background: rgba(255, 255, 255, 0.05);
            }

            #rinawarp-devtools .result-success {
                border-left: 3px solid #28a745;
            }

            #rinawarp-devtools .result-error {
                border-left: 3px solid #dc3545;
            }

            #rinawarp-devtools .result-warning {
                border-left: 3px solid #ffc107;
            }

            #rinawarp-devtools .minimized .panel-content {
                display: none;
            }

            #rinawarp-devtools .minimized .floating-panel {
                min-width: auto;
            }

            /* Custom scrollbar */
            #rinawarp-devtools .results-content::-webkit-scrollbar {
                width: 6px;
            }

            #rinawarp-devtools .results-content::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
            }

            #rinawarp-devtools .results-content::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.3);
                border-radius: 3px;
            }

            #rinawarp-devtools .results-content::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.5);
            }
        `;
    document.head.appendChild(styles);
  }

  attachEventListeners() {
    // Panel controls
    document.getElementById('minimize-devtools').addEventListener('click', () => {
      this.overlay.classList.toggle('minimized');
    });

    document.getElementById('close-devtools').addEventListener('click', () => {
      this.destroy();
    });

    // Diagnostic buttons
    document.getElementById('check-elements').addEventListener('click', () => {
      this.runElementChecks();
    });

    document.getElementById('toggle-theme').addEventListener('click', () => {
      this.toggleTheme();
    });

    document.getElementById('check-api').addEventListener('click', () => {
      this.checkAPI();
    });

    document.getElementById('activate-modal').addEventListener('click', () => {
      this.activateModal();
    });

    document.getElementById('inject-fallback').addEventListener('click', () => {
      this.injectFallbackCSS();
    });

    // Make draggable
    this.makeDraggable();
  }

  makeDraggable() {
    const header = this.overlay.querySelector('.panel-header h3');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    header.style.cursor = 'move';

    header.addEventListener('mousedown', (e) => {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
            
      if (e.target === header) {
        isDragging = true;
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
                
        xOffset = currentX;
        yOffset = currentY;
                
        this.overlay.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  runElementChecks() {
    const checks = [
      { name: 'Settings Button', id: 'settings-btn', type: 'element' },
      { name: 'AI Assistance Checkbox', id: 'ai-assistance', type: 'element' },
      { name: 'Settings Modal', id: 'settings-modal', type: 'element' },
      { name: 'Terminal Manager', prop: 'window.terminalManager', type: 'object' },
      { name: 'AI Integration', prop: 'window.aiIntegration', type: 'object' },
      { name: 'Theme Manager', prop: 'window.themeManager', type: 'object' },
      { name: 'Voice Engine', prop: 'window.voiceEngine', type: 'object' }
    ];

    const results = checks.map(check => {
      let exists = false;
      let status = '';

      if (check.type === 'element') {
        const element = document.getElementById(check.id);
        exists = !!element;
        if (exists) {
          const styles = window.getComputedStyle(element);
          const visible = styles.display !== 'none' && styles.visibility !== 'hidden';
          status = visible ? 'Visible' : 'Hidden';
        }
      } else if (check.type === 'object') {
        try {
          exists = !!eval(check.prop);
          status = exists ? 'Active' : 'Inactive';
        } catch (e) {
          exists = false;
          status = 'Error';
        }
      }

      return {
        name: check.name,
        exists,
        status,
        type: exists ? 'success' : 'error'
      };
    });

    this.displayResults('Element Checks', results);
  }

  toggleTheme() {
    const themeManager = window.terminalManager?.themeManager;
        
    if (themeManager) {
      const currentTheme = themeManager.currentTheme;
      const newTheme = currentTheme === 'mermaid' ? 'dark' : 'mermaid';
            
      themeManager.setTheme(newTheme);
            
      this.displayResults('Theme Toggle', [{
        name: `Theme switched from ${currentTheme} to ${newTheme}`,
        exists: true,
        status: 'Success',
        type: 'success'
      }]);
    } else {
      // Fallback theme toggle
      document.body.classList.toggle('theme-mermaid');
      const isMermaid = document.body.classList.contains('theme-mermaid');
            
      this.displayResults('Theme Toggle', [{
        name: `Fallback theme applied: ${isMermaid ? 'Mermaid' : 'Default'}`,
        exists: true,
        status: 'Fallback',
        type: 'warning'
      }]);
    }
  }

  async checkAPI() {
    const endpoints = [
      'https://api.github.com/repos/rinawarp/terminal',
      'https://jsonplaceholder.typicode.com/posts/1', // Test endpoint
      window.location.origin + '/api/status'
    ];

    const results = [];

    for (const url of endpoints) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        results.push({
          name: `API: ${url}`,
          exists: response.ok,
          status: `${response.status} ${response.statusText}`,
          type: response.ok ? 'success' : 'error'
        });
      } catch (error) {
        results.push({
          name: `API: ${url}`,
          exists: false,
          status: error.message,
          type: 'error'
        });
      }
    }

    this.displayResults('API Tests', results);
  }

  activateModal() {
    const modal = document.getElementById('settings-modal');
    const settingsBtn = document.getElementById('settings-btn');
        
    const results = [];

    if (modal) {
      modal.classList.remove('hidden');
      modal.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      modal.style.opacity = '1';
      modal.style.transform = 'scale(1)';
      modal.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.5)';
            
      results.push({
        name: 'Settings Modal',
        exists: true,
        status: 'Activated and highlighted',
        type: 'success'
      });
    } else {
      results.push({
        name: 'Settings Modal',
        exists: false,
        status: 'Not found in DOM',
        type: 'error'
      });
    }

    if (settingsBtn) {
      settingsBtn.style.boxShadow = '0 0 15px rgba(255, 20, 147, 0.8)';
      settingsBtn.style.transform = 'scale(1.1)';
            
      setTimeout(() => {
        settingsBtn.style.boxShadow = '';
        settingsBtn.style.transform = '';
      }, 2000);
            
      results.push({
        name: 'Settings Button',
        exists: true,
        status: 'Highlighted',
        type: 'success'
      });
    } else {
      results.push({
        name: 'Settings Button',
        exists: false,
        status: 'Not found',
        type: 'error'
      });
    }

    this.displayResults('Modal Activation', results);
  }

  injectFallbackCSS() {
    const fallbackId = 'rinawarp-fallback-styles';
        
    if (document.getElementById(fallbackId)) {
      document.getElementById(fallbackId).remove();
      this.displayResults('CSS Injection', [{
        name: 'Fallback CSS',
        exists: false,
        status: 'Removed',
        type: 'warning'
      }]);
      return;
    }

    const fallbackStyles = document.createElement('style');
    fallbackStyles.id = fallbackId;
    fallbackStyles.textContent = `
            /* RinaWarp Fallback Mermaid Theme */
            .theme-mermaid,
            body.theme-mermaid {
                background: linear-gradient(135deg, #0a0b1e 0%, #1a1b3e 50%, #2a2b5e 100%) !important;
                color: #ff1493 !important;
            }
            
            .theme-mermaid .terminal {
                background: rgba(10, 11, 30, 0.9) !important;
                border: 2px solid #ff69b4 !important;
            }
            
            .theme-mermaid button {
                background: linear-gradient(45deg, #ff1493, #00ffcc) !important;
                border: none !important;
            }
            
            .theme-mermaid .modal-content {
                background: linear-gradient(135deg, #0a0b1e, #2d1b69) !important;
                border: 1px solid #ff69b4 !important;
            }
        `;
        
    document.head.appendChild(fallbackStyles);
    document.body.classList.add('theme-mermaid');
        
    this.displayResults('CSS Injection', [{
      name: 'Fallback Mermaid CSS',
      exists: true,
      status: 'Injected and applied',
      type: 'success'
    }]);
  }

  displayResults(title, results) {
    const content = document.getElementById('results-content');
    const timestamp = new Date().toLocaleTimeString();
        
    const resultHTML = `
            <div class="result-group">
                <strong>${title}</strong> <small>(${timestamp})</small>
                ${results.map(result => `
                    <div class="result-item result-${result.type}">
                        ${result.exists ? '✅' : '❌'} ${result.name}
                        <br><small>${result.status}</small>
                    </div>
                `).join('')}
            </div>
        `;
        
    content.innerHTML = resultHTML + content.innerHTML;
  }

  runInitialChecks() {
    setTimeout(() => {
      this.runElementChecks();
    }, 1000);
  }

  destroy() {
    if (this.overlay) {
      this.overlay.remove();
    }
    const styles = document.getElementById('rinawarp-devtools-styles');
    if (styles) {
      styles.remove();
    }
    console.log('🧜‍♀️ RinaWarp DevTools Overlay destroyed');
  }
}

// Auto-initialize if not already present
if (!window.rinaWarpDevTools) {
  window.rinaWarpDevTools = new RinaWarpDevTools();
}

// Export for manual initialization
window.RinaWarpDevTools = RinaWarpDevTools;
