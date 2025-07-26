/**
 * Modern UI Theme System for RinaWarp
 * Inspired by WaveTerm's sophisticated theming architecture
 */

class ModernThemeSystem {
  constructor() {
    this.themes = new Map();
    this.activeTheme = 'default';
    this.customThemes = new Map();
    this.themeObservers = new Set();
    this.transitionDuration = 300;

    this.initializeDefaultThemes();
    this.loadCustomThemes();
    this.setupThemeWatchers();
  }

  initializeDefaultThemes() {
    // WaveTerm-inspired themes
    this.registerTheme('default', {
      name: 'Default',
      type: 'dark',
      colors: {
        // Background colors
        'app-bg': '#1e1e1e',
        'panel-bg': '#252526',
        'sidebar-bg': '#2d2d30',
        'header-bg': '#2d2d30',
        'terminal-bg': '#1e1e1e',
        'modal-bg': '#252526',

        // Border colors
        'border-color': '#404040',
        'border-focus': '#007acc',
        'border-hover': '#505050',

        // Text colors
        'text-primary': '#cccccc',
        'text-secondary': '#999999',
        'text-muted': '#666666',
        'text-inverse': '#ffffff',
        'text-accent': '#007acc',

        // Interactive colors
        'button-bg': '#0e639c',
        'button-hover-bg': '#1177bb',
        'button-active-bg': '#094771',
        'button-text': '#ffffff',

        // Status colors
        'success-color': '#89d185',
        'warning-color': '#ffcc02',
        'error-color': '#f85149',
        'info-color': '#58a6ff',

        // Terminal colors
        'terminal-black': '#000000',
        'terminal-red': '#cd3131',
        'terminal-green': '#0dbc79',
        'terminal-yellow': '#e5e510',
        'terminal-blue': '#2472c8',
        'terminal-magenta': '#bc3fbc',
        'terminal-cyan': '#11a8cd',
        'terminal-white': '#e5e5e5',
        'terminal-bright-black': '#666666',
        'terminal-bright-red': '#f14c4c',
        'terminal-bright-green': '#23d18b',
        'terminal-bright-yellow': '#f5f543',
        'terminal-bright-blue': '#3b8eea',
        'terminal-bright-magenta': '#d670d6',
        'terminal-bright-cyan': '#29b8db',
        'terminal-bright-white': '#e5e5e5',

        // Accent colors
        'accent-primary': '#007acc',
        'accent-secondary': '#68217a',
        'accent-tertiary': '#00bcf2',
      },
      shadows: {
        small: '0 2px 4px rgba(0,0,0,0.1)',
        medium: '0 4px 8px rgba(0,0,0,0.15)',
        large: '0 8px 16px rgba(0,0,0,0.2)',
        window: '0 16px 32px rgba(0,0,0,0.3)',
      },
      borderRadius: {
        small: '4px',
        medium: '6px',
        large: '8px',
        xl: '12px',
      },
      typography: {
        'font-family-sans': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        'font-family-mono': '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
        'font-size-xs': '12px',
        'font-size-sm': '14px',
        'font-size-base': '16px',
        'font-size-lg': '18px',
        'font-size-xl': '20px',
      },
    });

    this.registerTheme('light', {
      name: 'Light',
      type: 'light',
      colors: {
        'app-bg': '#ffffff',
        'panel-bg': '#f8f8f8',
        'sidebar-bg': '#f0f0f0',
        'header-bg': '#f0f0f0',
        'terminal-bg': '#ffffff',
        'modal-bg': '#ffffff',

        'border-color': '#e1e1e1',
        'border-focus': '#0066cc',
        'border-hover': '#d1d1d1',

        'text-primary': '#333333',
        'text-secondary': '#666666',
        'text-muted': '#999999',
        'text-inverse': '#ffffff',
        'text-accent': '#0066cc',

        'button-bg': '#0066cc',
        'button-hover-bg': '#0052a3',
        'button-active-bg': '#004085',
        'button-text': '#ffffff',

        'success-color': '#28a745',
        'warning-color': '#ffc107',
        'error-color': '#dc3545',
        'info-color': '#17a2b8',

        'terminal-black': '#000000',
        'terminal-red': '#cd3131',
        'terminal-green': '#00bc00',
        'terminal-yellow': '#949800',
        'terminal-blue': '#0451a5',
        'terminal-magenta': '#bc05bc',
        'terminal-cyan': '#0598bc',
        'terminal-white': '#555555',
        'terminal-bright-black': '#666666',
        'terminal-bright-red': '#cd3131',
        'terminal-bright-green': '#14ce14',
        'terminal-bright-yellow': '#b5ba00',
        'terminal-bright-blue': '#0451a5',
        'terminal-bright-magenta': '#bc05bc',
        'terminal-bright-cyan': '#0598bc',
        'terminal-bright-white': '#a5a5a5',

        'accent-primary': '#0066cc',
        'accent-secondary': '#6f42c1',
        'accent-tertiary': '#20c997',
      },
      shadows: {
        small: '0 2px 4px rgba(0,0,0,0.08)',
        medium: '0 4px 8px rgba(0,0,0,0.12)',
        large: '0 8px 16px rgba(0,0,0,0.16)',
        window: '0 16px 32px rgba(0,0,0,0.24)',
      },
      borderRadius: {
        small: '4px',
        medium: '6px',
        large: '8px',
        xl: '12px',
      },
      typography: {
        'font-family-sans': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        'font-family-mono': '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
        'font-size-xs': '12px',
        'font-size-sm': '14px',
        'font-size-base': '16px',
        'font-size-lg': '18px',
        'font-size-xl': '20px',
      },
    });

    this.registerTheme('cyberpunk', {
      name: 'Cyberpunk',
      type: 'dark',
      colors: {
        'app-bg': '#0a0a0a',
        'panel-bg': '#111111',
        'sidebar-bg': '#1a1a1a',
        'header-bg': '#1a1a1a',
        'terminal-bg': '#000000',
        'modal-bg': '#111111',

        'border-color': '#333333',
        'border-focus': '#00ff88',
        'border-hover': '#444444',

        'text-primary': '#00ff88',
        'text-secondary': '#66ff99',
        'text-muted': '#336644',
        'text-inverse': '#000000',
        'text-accent': '#ff0088',

        'button-bg': '#ff0088',
        'button-hover-bg': '#cc006a',
        'button-active-bg': '#99004d',
        'button-text': '#ffffff',

        'success-color': '#00ff88',
        'warning-color': '#ffaa00',
        'error-color': '#ff0044',
        'info-color': '#0088ff',

        'terminal-black': '#000000',
        'terminal-red': '#ff0044',
        'terminal-green': '#00ff88',
        'terminal-yellow': '#ffaa00',
        'terminal-blue': '#0088ff',
        'terminal-magenta': '#ff0088',
        'terminal-cyan': '#00ffaa',
        'terminal-white': '#00ff88',
        'terminal-bright-black': '#333333',
        'terminal-bright-red': '#ff3366',
        'terminal-bright-green': '#33ff99',
        'terminal-bright-yellow': '#ffcc33',
        'terminal-bright-blue': '#3399ff',
        'terminal-bright-magenta': '#ff33aa',
        'terminal-bright-cyan': '#33ffcc',
        'terminal-bright-white': '#66ff99',

        'accent-primary': '#00ff88',
        'accent-secondary': '#ff0088',
        'accent-tertiary': '#0088ff',
      },
      shadows: {
        small: '0 2px 4px rgba(0,255,136,0.2)',
        medium: '0 4px 8px rgba(0,255,136,0.25)',
        large: '0 8px 16px rgba(0,255,136,0.3)',
        window: '0 16px 32px rgba(0,255,136,0.4)',
      },
      borderRadius: {
        small: '2px',
        medium: '4px',
        large: '6px',
        xl: '8px',
      },
      typography: {
        'font-family-sans': '"JetBrains Mono", "Fira Code", monospace',
        'font-family-mono': '"JetBrains Mono", "Fira Code", monospace',
        'font-size-xs': '12px',
        'font-size-sm': '14px',
        'font-size-base': '16px',
        'font-size-lg': '18px',
        'font-size-xl': '20px',
      },
    });

    this.registerTheme('ocean', {
      name: 'Ocean Blue',
      type: 'dark',
      colors: {
        'app-bg': '#0f1419',
        'panel-bg': '#1e2430',
        'sidebar-bg': '#232834',
        'header-bg': '#232834',
        'terminal-bg': '#0f1419',
        'modal-bg': '#1e2430',

        'border-color': '#394b59',
        'border-focus': '#4d9de0',
        'border-hover': '#4a5766',

        'text-primary': '#e6e1cf',
        'text-secondary': '#c7c7c7',
        'text-muted': '#8f929a',
        'text-inverse': '#0f1419',
        'text-accent': '#4d9de0',

        'button-bg': '#4d9de0',
        'button-hover-bg': '#3d7cb3',
        'button-active-bg': '#2d5a86',
        'button-text': '#ffffff',

        'success-color': '#7fd962',
        'warning-color': '#ffb454',
        'error-color': '#ff6b6b',
        'info-color': '#4d9de0',

        'terminal-black': '#1c1f24',
        'terminal-red': '#ff6b6b',
        'terminal-green': '#7fd962',
        'terminal-yellow': '#ffb454',
        'terminal-blue': '#4d9de0',
        'terminal-magenta': '#c678dd',
        'terminal-cyan': '#4ecdc4',
        'terminal-white': '#e6e1cf',
        'terminal-bright-black': '#5c6370',
        'terminal-bright-red': '#ff7b7b',
        'terminal-bright-green': '#8fe972',
        'terminal-bright-yellow': '#ffc464',
        'terminal-bright-blue': '#5dadf0',
        'terminal-bright-magenta': '#d688ed',
        'terminal-bright-cyan': '#5eded4',
        'terminal-bright-white': '#f6f1df',

        'accent-primary': '#4d9de0',
        'accent-secondary': '#c678dd',
        'accent-tertiary': '#4ecdc4',
      },
      shadows: {
        small: '0 2px 4px rgba(77,157,224,0.1)',
        medium: '0 4px 8px rgba(77,157,224,0.15)',
        large: '0 8px 16px rgba(77,157,224,0.2)',
        window: '0 16px 32px rgba(77,157,224,0.3)',
      },
      borderRadius: {
        small: '4px',
        medium: '6px',
        large: '8px',
        xl: '12px',
      },
      typography: {
        'font-family-sans': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        'font-family-mono': '"Fira Code", "SF Mono", "Monaco", monospace',
        'font-size-xs': '12px',
        'font-size-sm': '14px',
        'font-size-base': '16px',
        'font-size-lg': '18px',
        'font-size-xl': '20px',
      },
    });
  }

  registerTheme(id, theme) {
    // Validate theme structure
    if (!theme.name || !theme.colors) {
      throw new Error(`Invalid theme structure for ${id}`);
    }

    // Add metadata
    theme.id = id;
    theme.created = new Date();
    theme.version = '1.0.0';

    this.themes.set(id, theme);
    console.log(`✅ Registered theme: ${theme.name}`);
  }

  async setActiveTheme(themeId, options = {}) {
    if (!this.themes.has(themeId)) {
      throw new Error(`Theme ${themeId} not found`);
    }

    const previousTheme = this.activeTheme;
    this.activeTheme = themeId;

    try {
      await this.applyTheme(themeId, options);

      // Save preference
      await this.saveThemePreference(themeId);

      // Notify observers
      this.notifyThemeChange(themeId, previousTheme);

      console.log(`✅ Applied theme: ${this.themes.get(themeId).name}`);
    } catch (error) {
      // Rollback on error
      this.activeTheme = previousTheme;
      throw error;
    }
  }

  async applyTheme(themeId, options = {}) {
    const theme = this.themes.get(themeId);
    if (!theme) return;

    const { animated = true, duration = this.transitionDuration } = options;

    // Create CSS custom properties
    const cssVariables = this.generateCSSVariables(theme);

    // Apply with or without animation
    if (animated) {
      await this.applyThemeAnimated(cssVariables, duration);
    } else {
      this.applyThemeInstant(cssVariables);
    }

    // Update document classes
    this.updateDocumentClasses(theme);

    // Apply theme-specific styles
    this.applyThemeSpecificStyles(theme);
  }

  generateCSSVariables(theme) {
    const variables = {};

    // Process colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      variables[`--${key}`] = value;
    });

    // Process shadows
    if (theme.shadows) {
      Object.entries(theme.shadows).forEach(([key, value]) => {
        variables[`--shadow-${key}`] = value;
      });
    }

    // Process border radius
    if (theme.borderRadius) {
      Object.entries(theme.borderRadius).forEach(([key, value]) => {
        variables[`--radius-${key}`] = value;
      });
    }

    // Process typography
    if (theme.typography) {
      Object.entries(theme.typography).forEach(([key, value]) => {
        variables[`--${key}`] = value;
      });
    }

    return variables;
  }

  async applyThemeAnimated(variables, duration) {
    return new Promise(resolve => {
      const root = document.documentElement;

      // Add transition class
      root.classList.add('theme-transitioning');

      // Set transition duration
      root.style.setProperty('--theme-transition-duration', `${duration}ms`);

      // Apply variables
      Object.entries(variables).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });

      // Remove transition class after animation
      setTimeout(() => {
        root.classList.remove('theme-transitioning');
        root.style.removeProperty('--theme-transition-duration');
        resolve();
      }, duration);
    });
  }

  applyThemeInstant(variables) {
    const root = document.documentElement;

    Object.entries(variables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }

  updateDocumentClasses(theme) {
    const root = document.documentElement;

    // Remove old theme classes
    root.classList.forEach(className => {
      if (className.startsWith('theme-')) {
        root.classList.remove(className);
      }
    });

    // Add new theme classes
    root.classList.add(`theme-${theme.id}`);
    root.classList.add(`theme-type-${theme.type}`);
  }

  applyThemeSpecificStyles(theme) {
    // Remove existing theme-specific styles
    const existingStyle = document.getElementById('theme-specific-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create new theme-specific styles
    const style = document.createElement('style');
    style.id = 'theme-specific-styles';

    let css = `
            /* Theme: ${theme.name} */
            :root.theme-transitioning * {
                transition: background-color var(--theme-transition-duration, 300ms) ease,
                           border-color var(--theme-transition-duration, 300ms) ease,
                           color var(--theme-transition-duration, 300ms) ease,
                           box-shadow var(--theme-transition-duration, 300ms) ease !important;
            }
            
            /* Terminal theme colors */
            .xterm .xterm-color-0 { color: var(--terminal-black) !important; }
            .xterm .xterm-color-1 { color: var(--terminal-red) !important; }
            .xterm .xterm-color-2 { color: var(--terminal-green) !important; }
            .xterm .xterm-color-3 { color: var(--terminal-yellow) !important; }
            .xterm .xterm-color-4 { color: var(--terminal-blue) !important; }
            .xterm .xterm-color-5 { color: var(--terminal-magenta) !important; }
            .xterm .xterm-color-6 { color: var(--terminal-cyan) !important; }
            .xterm .xterm-color-7 { color: var(--terminal-white) !important; }
            .xterm .xterm-color-8 { color: var(--terminal-bright-black) !important; }
            .xterm .xterm-color-9 { color: var(--terminal-bright-red) !important; }
            .xterm .xterm-color-10 { color: var(--terminal-bright-green) !important; }
            .xterm .xterm-color-11 { color: var(--terminal-bright-yellow) !important; }
            .xterm .xterm-color-12 { color: var(--terminal-bright-blue) !important; }
            .xterm .xterm-color-13 { color: var(--terminal-bright-magenta) !important; }
            .xterm .xterm-color-14 { color: var(--terminal-bright-cyan) !important; }
            .xterm .xterm-color-15 { color: var(--terminal-bright-white) !important; }
        `;

    // Add theme-specific customizations
    if (theme.customCSS) {
      css += theme.customCSS;
    }

    style.textContent = css;
    document.head.appendChild(style);
  }

  createCustomTheme(baseThemeId, customizations, name) {
    const baseTheme = this.themes.get(baseThemeId);
    if (!baseTheme) {
      throw new Error(`Base theme ${baseThemeId} not found`);
    }

    const customTheme = {
      ...JSON.parse(JSON.stringify(baseTheme)), // Deep clone
      name: name || `Custom ${baseTheme.name}`,
      id: `custom-${Date.now()}`,
      isCustom: true,
      baseTheme: baseThemeId,
      created: new Date(),
    };

    // Apply customizations
    if (customizations.colors) {
      Object.assign(customTheme.colors, customizations.colors);
    }

    if (customizations.shadows) {
      Object.assign(customTheme.shadows, customizations.shadows);
    }

    if (customizations.borderRadius) {
      Object.assign(customTheme.borderRadius, customizations.borderRadius);
    }

    if (customizations.typography) {
      Object.assign(customTheme.typography, customizations.typography);
    }

    if (customizations.customCSS) {
      customTheme.customCSS = customizations.customCSS;
    }

    this.customThemes.set(customTheme.id, customTheme);
    this.themes.set(customTheme.id, customTheme);

    // Save custom theme
    this.saveCustomTheme(customTheme);

    return customTheme.id;
  }

  async importTheme(themeData) {
    try {
      // Validate theme data
      if (!themeData.name || !themeData.colors) {
        throw new Error('Invalid theme data');
      }

      const themeId = `imported-${Date.now()}`;
      const theme = {
        ...themeData,
        id: themeId,
        isImported: true,
        imported: new Date(),
      };

      this.themes.set(themeId, theme);

      if (theme.isCustom) {
        this.customThemes.set(themeId, theme);
        await this.saveCustomTheme(theme);
      }

      console.log(`✅ Imported theme: ${theme.name}`);
      return themeId;
    } catch (error) {
      console.error('Failed to import theme:', error);
      throw error;
    }
  }

  exportTheme(themeId) {
    const theme = this.themes.get(themeId);
    if (!theme) {
      throw new Error(`Theme ${themeId} not found`);
    }

    // Create exportable theme data
    const exportData = {
      name: theme.name,
      type: theme.type,
      colors: theme.colors,
      shadows: theme.shadows,
      borderRadius: theme.borderRadius,
      typography: theme.typography,
      customCSS: theme.customCSS,
      version: theme.version || '1.0.0',
      created: theme.created,
      isCustom: theme.isCustom || false,
      baseTheme: theme.baseTheme,
    };

    return JSON.stringify(exportData, null, 2);
  }

  async loadCustomThemes() {
    try {
      // Load from localStorage or file system
      const stored = localStorage.getItem('rinawarp-custom-themes');
      if (stored) {
        const customThemes = JSON.parse(stored);

        for (const theme of customThemes) {
          this.themes.set(theme.id, theme);
          this.customThemes.set(theme.id, theme);
        }

        console.log(`✅ Loaded ${customThemes.length} custom themes`);
      }
    } catch (error) {
      console.warn('Failed to load custom themes:', error);
    }
  }

  async saveCustomTheme(_theme) {
    try {
      const customThemes = Array.from(this.customThemes.values());
      localStorage.setItem('rinawarp-custom-themes', JSON.stringify(customThemes));
    } catch (error) {
      console.error('Failed to save custom theme:', error);
    }
  }

  async saveThemePreference(themeId) {
    try {
      localStorage.setItem('rinawarp-active-theme', themeId);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }

  async loadThemePreference() {
    try {
      const stored = localStorage.getItem('rinawarp-active-theme');
      if (stored && this.themes.has(stored)) {
        await this.setActiveTheme(stored, { animated: false });
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
    }
  }

  setupThemeWatchers() {
    // Watch for system theme changes
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

      darkModeQuery.addEventListener('change', e => {
        this.handleSystemThemeChange(e.matches ? 'dark' : 'light');
      });
    }

    // Watch for terminal theme changes from blocks
    document.addEventListener('terminal-theme-change', event => {
      this.handleTerminalThemeChange(event.detail);
    });
  }

  handleSystemThemeChange(preferredType) {
    // Optionally auto-switch theme based on system preference
    const autoSwitch = localStorage.getItem('rinawarp-auto-theme-switch') === 'true';

    if (autoSwitch) {
      const matchingThemes = Array.from(this.themes.values()).filter(
        theme => theme.type === preferredType
      );

      if (matchingThemes.length > 0) {
        this.setActiveTheme(matchingThemes[0].id);
      }
    }
  }

  handleTerminalThemeChange(detail) {
    const { blockId, theme } = detail;

    // Update block-specific theme without changing global theme
    const blockElement = document.getElementById(`block-${blockId}`);
    if (blockElement) {
      this.applyBlockTheme(blockElement, theme);
    }
  }

  applyBlockTheme(blockElement, theme) {
    // Apply theme-specific CSS variables to the block
    const themeData = this.themes.get(theme);
    if (!themeData) return;

    const variables = this.generateCSSVariables(themeData);

    Object.entries(variables).forEach(([property, value]) => {
      blockElement.style.setProperty(property, value);
    });

    blockElement.setAttribute('data-theme', theme);
  }

  addThemeObserver(callback) {
    this.themeObservers.add(callback);

    // Return unsubscribe function
    return () => {
      this.themeObservers.delete(callback);
    };
  }

  notifyThemeChange(newTheme, previousTheme) {
    const event = {
      type: 'theme-changed',
      newTheme,
      previousTheme,
      timestamp: new Date(),
    };

    this.themeObservers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Theme observer error:', error);
      }
    });
  }

  getAvailableThemes() {
    return Array.from(this.themes.values()).map(theme => ({
      id: theme.id,
      name: theme.name,
      type: theme.type,
      isCustom: theme.isCustom || false,
      isActive: theme.id === this.activeTheme,
    }));
  }

  getActiveTheme() {
    return this.themes.get(this.activeTheme);
  }

  getTheme(themeId) {
    return this.themes.get(themeId);
  }

  deleteCustomTheme(themeId) {
    const theme = this.themes.get(themeId);

    if (!theme || !theme.isCustom) {
      throw new Error('Cannot delete built-in theme');
    }

    this.themes.delete(themeId);
    this.customThemes.delete(themeId);

    // If this was the active theme, switch to default
    if (this.activeTheme === themeId) {
      this.setActiveTheme('default');
    }

    // Save changes
    this.saveCustomTheme();

    console.log(`✅ Deleted custom theme: ${theme.name}`);
  }

  generateThemePreview(themeId) {
    const theme = this.themes.get(themeId);
    if (!theme) return null;

    // Create a preview canvas or DOM element
    const preview = document.createElement('div');
    preview.className = 'theme-preview';
    preview.style.cssText = `
            width: 200px;
            height: 120px;
            border-radius: var(--radius-medium, 6px);
            overflow: hidden;
            position: relative;
            background: ${theme.colors['app-bg']};
            border: 1px solid ${theme.colors['border-color']};
        `;

    // Add preview content
    preview.innerHTML = `
            <div style="
                height: 24px;
                background: ${theme.colors['header-bg']};
                border-bottom: 1px solid ${theme.colors['border-color']};
                display: flex;
                align-items: center;
                padding: 0 8px;
                gap: 4px;
            ">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: ${theme.colors['error-color']};"></div>
                <div style="width: 8px; height: 8px; border-radius: 50%; background: ${theme.colors['warning-color']};"></div>
                <div style="width: 8px; height: 8px; border-radius: 50%; background: ${theme.colors['success-color']};"></div>
            </div>
            <div style="
                padding: 8px;
                background: ${theme.colors['terminal-bg']};
                color: ${theme.colors['text-primary']};
                font-family: ${theme.typography?.['font-family-mono'] || 'monospace'};
                font-size: 10px;
                line-height: 1.2;
                height: calc(100% - 24px);
                overflow: hidden;
            ">
                <div style="color: ${theme.colors['terminal-green']};">$ npm start</div>
                <div style="color: ${theme.colors['terminal-blue']};">Starting development server...</div>
                <div style="color: ${theme.colors['text-accent']};">localhost:3000</div>
            </div>
        `;

    return preview;
  }
}

// Theme utility functions
export class ThemeUtils {
  static hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
      : null;
  }

  static rgbToHex(r, g, b) {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  static adjustBrightness(hex, amount) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;

    const adjust = value => Math.max(0, Math.min(255, value + amount));

    return this.rgbToHex(adjust(rgb.r), adjust(rgb.g), adjust(rgb.b));
  }

  static getContrastRatio(color1, color2) {
    const getLuminance = hex => {
      const rgb = this.hexToRgb(hex);
      if (!rgb) return 0;

      const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const lightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (lightest + 0.05) / (darkest + 0.05);
  }

  static generateColorPalette(baseColor, count = 5) {
    const palette = [];
    const baseRgb = this.hexToRgb(baseColor);

    if (!baseRgb) return [baseColor];

    for (let i = 0; i < count; i++) {
      const factor = (i - Math.floor(count / 2)) * 0.2;
      const brightness = factor * 255;

      palette.push(this.adjustBrightness(baseColor, brightness));
    }

    return palette;
  }
}

// Export for integration
export default ModernThemeSystem;
