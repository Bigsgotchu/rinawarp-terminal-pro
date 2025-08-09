import logger from '../utilities/logger.js';
/**
 * RinaWarp Terminal - Modern Theme System
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * This module provides a comprehensive theme system with:
 * - Multiple built-in themes (including the signature mermaid theme)
 * - Custom theme creation and editing
 * - Dynamic theme switching with smooth transitions
 * - Responsive design across different screen sizes
 * - Accessibility features and color contrast compliance
 * - Theme synchronization across devices
 */

export class ModernThemeSystem {
  constructor() {
    this.currentTheme = 'mermaid';
    this.themes = new Map();
    this.customThemes = new Map();
    this.transitionDuration = 300;
    this.autoSwitchEnabled = false;
    this.responsiveBreakpoints = {
      mobile: 768,
      tablet: 1024,
      desktop: 1440,
      widescreen: 1920,
    };
    this.accessibilitySettings = {
      highContrast: false,
      reducedMotion: false,
      largeText: false,
      colorBlindFriendly: false,
    };

    this.init();
  }

  async init() {
    // Load built-in themes
    this.loadBuiltInThemes();

    // Load custom themes
    await this.loadCustomThemes();

    // Detect system preferences
    this.detectSystemPreferences();

    // Set up responsive observers
    this.setupResponsiveObservers();

    // Apply saved theme or default
    const savedTheme = await this.loadSavedTheme();
    await this.applyTheme(savedTheme || 'mermaid');

    // Set up accessibility observers
    this.setupAccessibilityObservers();

    logger.debug('✅ Modern Theme System initialized');
  }

  loadBuiltInThemes() {
    // Mermaid Theme (Signature theme)
    this.themes.set('mermaid', {
      name: 'Mermaid',
      category: 'signature',
      colors: {
        primary: '#0ea5e9',
        secondary: '#0284c7',
        accent: '#14b8a6',
        background: '#0f172a',
        surface: '#1e293b',
        surfaceVariant: '#334155',
        text: '#e2e8f0',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
        border: '#334155',
        borderHover: '#475569',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      typography: {
        fontFamily: '"Fira Code", "SF Mono", Consolas, monospace',
        fontSize: '14px',
        lineHeight: '1.6',
        fontWeight: '400',
        letterSpacing: '0.025em',
      },
      effects: {
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        backdropBlur: '12px',
        gradient: 'linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%)',
        animation: 'smooth',
        glowEffect: true,
      },
      terminal: {
        backgroundColor: '#0f172a',
        foregroundColor: '#e2e8f0',
        cursorColor: '#0ea5e9',
        selectionBackground: '#0ea5e9',
        selectionForeground: '#0f172a',
      },
    });

    // Dark Theme
    this.themes.set('dark', {
      name: 'Dark',
      category: 'built-in',
      colors: {
        primary: '#3b82f6',
        secondary: '#1e40af',
        accent: '#8b5cf6',
        background: '#111827',
        surface: '#1f2937',
        surfaceVariant: '#374151',
        text: '#f9fafb',
        textSecondary: '#d1d5db',
        textMuted: '#9ca3af',
        border: '#374151',
        borderHover: '#4b5563',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      typography: {
        fontFamily: '"JetBrains Mono", "SF Mono", Consolas, monospace',
        fontSize: '14px',
        lineHeight: '1.5',
        fontWeight: '400',
        letterSpacing: '0',
      },
      effects: {
        borderRadius: '6px',
        boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
        backdropBlur: '8px',
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        animation: 'smooth',
        glowEffect: false,
      },
      terminal: {
        backgroundColor: '#111827',
        foregroundColor: '#f9fafb',
        cursorColor: '#3b82f6',
        selectionBackground: '#3b82f6',
        selectionForeground: '#111827',
      },
    });

    // Light Theme
    this.themes.set('light', {
      name: 'Light',
      category: 'built-in',
      colors: {
        primary: '#2563eb',
        secondary: '#1d4ed8',
        accent: '#7c3aed',
        background: '#ffffff',
        surface: '#f8fafc',
        surfaceVariant: '#e2e8f0',
        text: '#0f172a',
        textSecondary: '#334155',
        textMuted: '#64748b',
        border: '#e2e8f0',
        borderHover: '#cbd5e1',
        success: '#059669',
        warning: '#d97706',
        error: '#dc2626',
        info: '#2563eb',
      },
      typography: {
        fontFamily: '"Source Code Pro", "SF Mono", Consolas, monospace',
        fontSize: '14px',
        lineHeight: '1.5',
        fontWeight: '400',
        letterSpacing: '0',
      },
      effects: {
        borderRadius: '6px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        backdropBlur: '4px',
        gradient: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
        animation: 'smooth',
        glowEffect: false,
      },
      terminal: {
        backgroundColor: '#ffffff',
        foregroundColor: '#0f172a',
        cursorColor: '#2563eb',
        selectionBackground: '#2563eb',
        selectionForeground: '#ffffff',
      },
    });

    // Ocean Theme
    this.themes.set('ocean', {
      name: 'Ocean',
      category: 'nature',
      colors: {
        primary: '#0891b2',
        secondary: '#0e7490',
        accent: '#06b6d4',
        background: '#0c4a6e',
        surface: '#075985',
        surfaceVariant: '#0369a1',
        text: '#e0f2fe',
        textSecondary: '#b3e5fc',
        textMuted: '#81d4fa',
        border: '#0369a1',
        borderHover: '#0284c7',
        success: '#14b8a6',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#06b6d4',
      },
      typography: {
        fontFamily: '"Cascadia Code", "SF Mono", Consolas, monospace',
        fontSize: '14px',
        lineHeight: '1.6',
        fontWeight: '400',
        letterSpacing: '0.025em',
      },
      effects: {
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(12, 74, 110, 0.3)',
        backdropBlur: '12px',
        gradient: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
        animation: 'wave',
        glowEffect: true,
      },
      terminal: {
        backgroundColor: '#0c4a6e',
        foregroundColor: '#e0f2fe',
        cursorColor: '#06b6d4',
        selectionBackground: '#06b6d4',
        selectionForeground: '#0c4a6e',
      },
    });

    // Cyberpunk Theme
    this.themes.set('cyberpunk', {
      name: 'Cyberpunk',
      category: 'futuristic',
      colors: {
        primary: '#ff0080',
        secondary: '#00ff80',
        accent: '#80ff00',
        background: '#0a0a0a',
        surface: '#1a1a1a',
        surfaceVariant: '#2a2a2a',
        text: '#00ff80',
        textSecondary: '#80ff00',
        textMuted: '#808080',
        border: '#ff0080',
        borderHover: '#ff4080',
        success: '#00ff80',
        warning: '#ffff00',
        error: '#ff0080',
        info: '#00ffff',
      },
      typography: {
        fontFamily: '"Share Tech Mono", "SF Mono", Consolas, monospace',
        fontSize: '14px',
        lineHeight: '1.4',
        fontWeight: '400',
        letterSpacing: '0.05em',
      },
      effects: {
        borderRadius: '2px',
        boxShadow: '0 0 20px rgba(255, 0, 128, 0.5)',
        backdropBlur: '0px',
        gradient: 'linear-gradient(135deg, #ff0080 0%, #00ff80 100%)',
        animation: 'neon',
        glowEffect: true,
      },
      terminal: {
        backgroundColor: '#0a0a0a',
        foregroundColor: '#00ff80',
        cursorColor: '#ff0080',
        selectionBackground: '#ff0080',
        selectionForeground: '#0a0a0a',
      },
    });

    // Forest Theme
    this.themes.set('forest', {
      name: 'Forest',
      category: 'nature',
      colors: {
        primary: '#22c55e',
        secondary: '#16a34a',
        accent: '#84cc16',
        background: '#052e16',
        surface: '#14532d',
        surfaceVariant: '#166534',
        text: '#dcfce7',
        textSecondary: '#bbf7d0',
        textMuted: '#86efac',
        border: '#166534',
        borderHover: '#15803d',
        success: '#22c55e',
        warning: '#eab308',
        error: '#ef4444',
        info: '#3b82f6',
      },
      typography: {
        fontFamily: '"Roboto Mono", "SF Mono", Consolas, monospace',
        fontSize: '14px',
        lineHeight: '1.6',
        fontWeight: '400',
        letterSpacing: '0.025em',
      },
      effects: {
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(5, 46, 22, 0.3)',
        backdropBlur: '10px',
        gradient: 'linear-gradient(135deg, #22c55e 0%, #84cc16 100%)',
        animation: 'gentle',
        glowEffect: false,
      },
      terminal: {
        backgroundColor: '#052e16',
        foregroundColor: '#dcfce7',
        cursorColor: '#22c55e',
        selectionBackground: '#22c55e',
        selectionForeground: '#052e16',
      },
    });
  }

  async loadCustomThemes() {
    try {
      const saved = localStorage.getItem('rinawarp-custom-themes');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([name, theme]) => {
          this.customThemes.set(name, theme);
        });
      }
    } catch (error) {
      console.warn('Failed to load custom themes:', error);
    }
  }

  detectSystemPreferences() {
    // Detect system dark mode preference
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.systemPrefersDark = darkModeQuery.matches;

      darkModeQuery.addEventListener('change', e => {
        this.systemPrefersDark = e.matches;
        if (this.autoSwitchEnabled) {
          this.applyTheme(this.systemPrefersDark ? 'dark' : 'light');
        }
      });
    }

    // Detect reduced motion preference
    if (window.matchMedia) {
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.accessibilitySettings.reducedMotion = reducedMotionQuery.matches;

      reducedMotionQuery.addEventListener('change', e => {
        this.accessibilitySettings.reducedMotion = e.matches;
        this.updateAccessibilitySettings();
      });
    }
  }

  setupResponsiveObservers() {
    // Set up responsive design observers
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        this.handleResize(entry.contentRect);
      }
    });

    resizeObserver.observe(document.body);

    // Set up media queries for different screen sizes
    Object.entries(this.responsiveBreakpoints).forEach(([_size, width]) => {
      const query = window.matchMedia(`(max-width: ${width}px)`);
      query.addEventListener('change', () => {
        this.updateResponsiveDesign();
      });
    });
  }

  setupAccessibilityObservers() {
    // Set up accessibility observers
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-accessibility') {
          this.updateAccessibilitySettings();
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-accessibility'],
    });
  }

  async applyTheme(themeName) {
    const theme = this.getTheme(themeName);
    if (!theme) {
      console.warn(`Theme '${themeName}' not found`);
      return;
    }

    // Start transition
    this.startThemeTransition();

    // Apply CSS variables
    this.applyCSSVariables(theme);

    // Apply typography
    this.applyTypography(theme);

    // Apply effects
    this.applyEffects(theme);

    // Apply terminal theme
    this.applyTerminalTheme(theme);

    // Update responsive design
    this.updateResponsiveDesign();

    // Apply accessibility settings
    this.updateAccessibilitySettings();

    // Save current theme
    await this.saveCurrentTheme(themeName);

    // Complete transition
    this.completeThemeTransition();

    this.currentTheme = themeName;

    // Emit theme change event
    this.emitThemeChange(themeName, theme);
  }

  getTheme(name) {
    return this.themes.get(name) || this.customThemes.get(name);
  }

  applyCSSVariables(theme) {
    const root = document.documentElement;

    // Apply color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Apply typography variables
    Object.entries(theme.typography).forEach(([key, value]) => {
      root.style.setProperty(`--typography-${key}`, value);
    });

    // Apply effect variables
    Object.entries(theme.effects).forEach(([key, value]) => {
      root.style.setProperty(`--effect-${key}`, value);
    });
  }

  applyTypography(theme) {
    const style = document.createElement('style');
    style.id = 'rinawarp-typography';

    // Remove existing typography style
    const existing = document.getElementById('rinawarp-typography');
    if (existing) {
      existing.remove();
    }

    style.textContent = `
      body {
        font-family: ${theme.typography.fontFamily};
        font-size: ${theme.typography.fontSize};
        line-height: ${theme.typography.lineHeight};
        font-weight: ${theme.typography.fontWeight};
        letter-spacing: ${theme.typography.letterSpacing};
      }
      
      .terminal {
        font-family: ${theme.typography.fontFamily};
        font-size: ${theme.typography.fontSize};
        line-height: ${theme.typography.lineHeight};
      }
      
      .code {
        font-family: ${theme.typography.fontFamily};
        font-size: calc(${theme.typography.fontSize} * 0.9);
      }
    `;

    document.head.appendChild(style);
  }

  applyEffects(theme) {
    const style = document.createElement('style');
    style.id = 'rinawarp-effects';

    // Remove existing effects style
    const existing = document.getElementById('rinawarp-effects');
    if (existing) {
      existing.remove();
    }

    let animations = '';

    // Add animations based on theme
    switch (theme.effects.animation) {
      case 'smooth':
        animations = `
          * {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
        `;
        break;
      case 'wave':
        animations = `
          @keyframes wave {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-2px); }
          }
          .wave-effect {
            animation: wave 2s ease-in-out infinite;
          }
        `;
        break;
      case 'neon':
        animations = `
          @keyframes neon-glow {
            0%, 100% { box-shadow: 0 0 5px currentColor; }
            50% { box-shadow: 0 0 20px currentColor; }
          }
          .neon-effect {
            animation: neon-glow 2s ease-in-out infinite;
          }
        `;
        break;
      case 'gentle':
        animations = `
          * {
            transition: all 0.5s ease-in-out;
          }
        `;
        break;
    }

    style.textContent = `
      ${animations}
      
      .card {
        border-radius: ${theme.effects.borderRadius};
        box-shadow: ${theme.effects.boxShadow};
        backdrop-filter: blur(${theme.effects.backdropBlur});
      }
      
      .gradient-bg {
        background: ${theme.effects.gradient};
      }
      
      ${
        theme.effects.glowEffect
          ? `
        .glow-effect {
          box-shadow: 0 0 10px ${theme.colors.primary}40;
        }
      `
          : ''
      }
      
      ${
        this.accessibilitySettings.reducedMotion
          ? `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `
          : ''
      }
    `;

    document.head.appendChild(style);
  }

  applyTerminalTheme(theme) {
    // Apply terminal-specific theme
    const terminal = document.querySelector('.xterm-screen');
    if (terminal) {
      terminal.style.backgroundColor = theme.terminal.backgroundColor;
      terminal.style.color = theme.terminal.foregroundColor;
    }

    // Apply to XTerm.js if available
    if (window.terminal) {
      window.terminal.setOption('theme', {
        background: theme.terminal.backgroundColor,
        foreground: theme.terminal.foregroundColor,
        cursor: theme.terminal.cursorColor,
        selection: theme.terminal.selectionBackground,
        selectionForeground: theme.terminal.selectionForeground,
      });
    }
  }

  updateResponsiveDesign() {
    const width = window.innerWidth;
    let screenSize = 'desktop';

    if (width <= this.responsiveBreakpoints.mobile) {
      screenSize = 'mobile';
    } else if (width <= this.responsiveBreakpoints.tablet) {
      screenSize = 'tablet';
    } else if (width <= this.responsiveBreakpoints.desktop) {
      screenSize = 'desktop';
    } else {
      screenSize = 'widescreen';
    }

    document.body.setAttribute('data-screen-size', screenSize);

    // Apply responsive styles
    const style = document.createElement('style');
    style.id = 'rinawarp-responsive';

    // Remove existing responsive style
    const existing = document.getElementById('rinawarp-responsive');
    if (existing) {
      existing.remove();
    }

    style.textContent = `
      @media (max-width: ${this.responsiveBreakpoints.mobile}px) {
        .container {
          padding: 12px;
        }
        .terminal {
          font-size: 12px;
        }
        .sidebar {
          width: 100%;
          height: auto;
        }
      }
      
      @media (min-width: ${this.responsiveBreakpoints.mobile + 1}px) and (max-width: ${this.responsiveBreakpoints.tablet}px) {
        .container {
          padding: 16px;
        }
        .terminal {
          font-size: 13px;
        }
        .sidebar {
          width: 250px;
        }
      }
      
      @media (min-width: ${this.responsiveBreakpoints.tablet + 1}px) {
        .container {
          padding: 24px;
        }
        .terminal {
          font-size: 14px;
        }
        .sidebar {
          width: 300px;
        }
      }
      
      @media (min-width: ${this.responsiveBreakpoints.widescreen}px) {
        .container {
          padding: 32px;
        }
        .terminal {
          font-size: 15px;
        }
        .sidebar {
          width: 350px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  updateAccessibilitySettings() {
    const body = document.body;

    // Apply accessibility classes
    body.classList.toggle('high-contrast', this.accessibilitySettings.highContrast);
    body.classList.toggle('reduced-motion', this.accessibilitySettings.reducedMotion);
    body.classList.toggle('large-text', this.accessibilitySettings.largeText);
    body.classList.toggle('color-blind-friendly', this.accessibilitySettings.colorBlindFriendly);

    // Apply accessibility styles
    const style = document.createElement('style');
    style.id = 'rinawarp-accessibility';

    // Remove existing accessibility style
    const existing = document.getElementById('rinawarp-accessibility');
    if (existing) {
      existing.remove();
    }

    style.textContent = `
      ${
        this.accessibilitySettings.highContrast
          ? `
        body {
          filter: contrast(1.5);
        }
      `
          : ''
      }
      
      ${
        this.accessibilitySettings.largeText
          ? `
        body {
          font-size: 1.2em;
        }
        .terminal {
          font-size: 1.2em;
        }
      `
          : ''
      }
      
      ${
        this.accessibilitySettings.colorBlindFriendly
          ? `
        .color-primary { background-color: #0066cc; }
        .color-secondary { background-color: #ff6600; }
        .color-success { background-color: #009900; }
        .color-warning { background-color: #ffcc00; }
        .color-error { background-color: #cc0000; }
      `
          : ''
      }
    `;

    document.head.appendChild(style);
  }

  startThemeTransition() {
    document.body.classList.add('theme-transitioning');
  }

  completeThemeTransition() {
    setTimeout(() => {
      document.body.classList.remove('theme-transitioning');
    }, this.transitionDuration);
  }

  handleResize(_rect) {
    // Handle resize events
    this.updateResponsiveDesign();
  }

  emitThemeChange(themeName, theme) {
    const event = new CustomEvent('theme-changed', {
      detail: { name: themeName, theme },
    });
    window.dispatchEvent(event);
  }

  // Theme creation and management
  async createCustomTheme(name, baseTheme, overrides = {}) {
    const base = this.getTheme(baseTheme) || this.themes.get('mermaid');
    const customTheme = {
      ...base,
      name,
      category: 'custom',
      ...overrides,
    };

    this.customThemes.set(name, customTheme);
    await this.saveCustomThemes();

    return customTheme;
  }

  async deleteCustomTheme(name) {
    this.customThemes.delete(name);
    await this.saveCustomThemes();
  }

  async saveCustomThemes() {
    const themes = Object.fromEntries(this.customThemes);
    try {
      localStorage.setItem('rinawarp-custom-themes', JSON.stringify(themes));
    } catch (error) {
      console.error('Failed to save custom themes:', error);
    }
  }

  async loadSavedTheme() {
    try {
      return localStorage.getItem('rinawarp-current-theme');
    } catch (error) {
      console.warn('Failed to load saved theme:', error);
      return null;
    }
  }

  async saveCurrentTheme(themeName) {
    try {
      localStorage.setItem('rinawarp-current-theme', themeName);
    } catch (error) {
      console.error('Failed to save current theme:', error);
    }
  }

  // Utility methods
  getAllThemes() {
    const all = new Map();
    this.themes.forEach((theme, name) => all.set(name, theme));
    this.customThemes.forEach((theme, name) => all.set(name, theme));
    return all;
  }

  getThemesByCategory(category) {
    const themes = new Map();
    this.getAllThemes().forEach((theme, name) => {
      if (theme.category === category) {
        themes.set(name, theme);
      }
    });
    return themes;
  }

  setAccessibilitySettings(settings) {
    this.accessibilitySettings = { ...this.accessibilitySettings, ...settings };
    this.updateAccessibilitySettings();
  }

  enableAutoSwitch() {
    this.autoSwitchEnabled = true;
    if (this.systemPrefersDark) {
      this.applyTheme('dark');
    } else {
      this.applyTheme('light');
    }
  }

  disableAutoSwitch() {
    this.autoSwitchEnabled = false;
  }

  // Export/Import themes
  exportTheme(themeName) {
    const theme = this.getTheme(themeName);
    if (!theme) return null;

    return JSON.stringify(theme, null, 2);
  }

  async importTheme(themeData, name) {
    try {
      const theme = JSON.parse(themeData);
      theme.name = name;
      theme.category = 'imported';

      this.customThemes.set(name, theme);
      await this.saveCustomThemes();

      return theme;
    } catch (error) {
      console.error('Failed to import theme:', error);
      return null;
    }
  }

  // Get current theme info
  getCurrentTheme() {
    return {
      name: this.currentTheme,
      theme: this.getTheme(this.currentTheme),
    };
  }

  // Cleanup
  destroy() {
    // Remove all theme-related styles
    const themeStyles = document.querySelectorAll(
      '#rinawarp-typography, #rinawarp-effects, #rinawarp-responsive, #rinawarp-accessibility'
    );
    themeStyles.forEach(style => style.remove());
  }
}

export default ModernThemeSystem;
