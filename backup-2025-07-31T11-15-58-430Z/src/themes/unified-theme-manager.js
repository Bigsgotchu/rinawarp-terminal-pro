/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Unified Theme Manager for RinaWarp Terminal
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * Combines all theme management functionality into a single, comprehensive system
 * Features:
 * - 20+ built-in themes with diverse color schemes
 * - Terminal-specific theme configurations
 * - System theme detection and automatic switching
 * - CSS variable management
 * - Theme persistence and caching
 * - Observer pattern for theme change notifications
 * - Accessibility features (high contrast)
 */

class UnifiedThemeManager {
  constructor() {
    // Theme definitions combining all themes from different managers
    this.themes = {
      // Default themes
      'default-dark': {
        id: 'default-dark',
        name: '🌙 Default Dark',
        description: 'Classic dark theme with green accents',
        category: 'Dark',
        colors: {
          background: '#1a1a1a',
          foreground: '#ffffff',
          cursor: '#00ff88',
          selection: 'rgba(0, 255, 136, 0.3)',
          black: '#1a1a1a',
          red: '#ff6b6b',
          green: '#00ff88',
          yellow: '#ffd93d',
          blue: '#74c0fc',
          magenta: '#ff6ec7',
          cyan: '#4ecdc4',
          white: '#ffffff',
          brightBlack: '#666666',
          brightRed: '#ff8e8e',
          brightGreen: '#66ffaa',
          brightYellow: '#ffe066',
          brightBlue: '#96d2ff',
          brightMagenta: '#ff96d9',
          brightCyan: '#7dfff0',
          brightWhite: '#ffffff',
        },
        ui: {
          headerBg: '#2a2a2a',
          tabBg: '#2a2a2a',
          tabActiveBg: '#1a1a1a',
          statusBg: '#2a2a2a',
          borderColor: '#3a3a3a',
          accentColor: '#00ff88',
        },
      },

      'ocean-breeze': {
        id: 'ocean-breeze',
        name: '🌊 Ocean Breeze',
        description: 'Deep sea blues with aqua accents',
        category: 'Nature',
        colors: {
          background: '#0f1419',
          foreground: '#bfbdb6',
          cursor: '#73d0ff',
          selection: 'rgba(115, 208, 255, 0.3)',
          black: '#0f1419',
          red: '#f07178',
          green: '#c3e88d',
          yellow: '#ffcb6b',
          blue: '#73d0ff',
          magenta: '#c792ea',
          cyan: '#95e6cb',
          white: '#bfbdb6',
          brightBlack: '#4d5566',
          brightRed: '#f78c8c',
          brightGreen: '#d5f4a1',
          brightYellow: '#ffd580',
          brightBlue: '#87ddff',
          brightMagenta: '#d4a9ee',
          brightCyan: '#a9f0d5',
          brightWhite: '#ffffff',
        },
        ui: {
          headerBg: '#1f2430',
          tabBg: '#1f2430',
          tabActiveBg: '#0f1419',
          statusBg: '#1f2430',
          borderColor: '#2d3748',
          accentColor: '#73d0ff',
        },
      },

      'sunset-glow': {
        id: 'sunset-glow',
        name: '🌅 Sunset Glow',
        description: 'Warm purple and orange evening colors',
        category: 'Nature',
        colors: {
          background: '#1a1a1a',
          foreground: '#fff5e6',
          cursor: '#ff8c42',
          selection: 'rgba(255, 140, 66, 0.3)',
          black: '#1a1a1a',
          red: '#ff6b6b',
          green: '#95e1d3',
          yellow: '#fce38a',
          blue: '#74c0fc',
          magenta: '#ff8a95',
          cyan: '#95e1d3',
          white: '#fff5e6',
          brightBlack: '#666666',
          brightRed: '#ff8e8e',
          brightGreen: '#b8f5e6',
          brightYellow: '#ffe6a6',
          brightBlue: '#96d2ff',
          brightMagenta: '#ffb3c1',
          brightCyan: '#b8f5e6',
          brightWhite: '#ffffff',
        },
        ui: {
          headerBg: '#2d1b14',
          tabBg: '#2d1b14',
          tabActiveBg: '#1a1a1a',
          statusBg: '#2d1b14',
          borderColor: '#4a2c1a',
          accentColor: '#ff8c42',
        },
      },

      'forest-dawn': {
        id: 'forest-dawn',
        name: '🌲 Forest Dawn',
        description: 'Fresh green forest tones',
        category: 'Nature',
        colors: {
          background: '#0d1b0d',
          foreground: '#c8e6c8',
          cursor: '#7fb069',
          selection: 'rgba(127, 176, 105, 0.3)',
          black: '#0d1b0d',
          red: '#d63031',
          green: '#7fb069',
          yellow: '#e17055',
          blue: '#74b9ff',
          magenta: '#a29bfe',
          cyan: '#00cec9',
          white: '#c8e6c8',
          brightBlack: '#2d5016',
          brightRed: '#e84393',
          brightGreen: '#98e082',
          brightYellow: '#fdcb6e',
          brightBlue: '#74b9ff',
          brightMagenta: '#a29bfe',
          brightCyan: '#00cec9',
          brightWhite: '#ffffff',
        },
        ui: {
          headerBg: '#1a2e1a',
          tabBg: '#1a2e1a',
          tabActiveBg: '#0d1b0d',
          statusBg: '#1a2e1a',
          borderColor: '#2d5016',
          accentColor: '#7fb069',
        },
      },

      'cyberpunk-neon': {
        id: 'cyberpunk-neon',
        name: '🦾 Cyberpunk Neon',
        description: 'Futuristic neon magenta and cyan',
        category: 'Futuristic',
        colors: {
          background: '#0a0a0a',
          foreground: '#00ff41',
          cursor: '#ff0080',
          selection: 'rgba(255, 0, 128, 0.3)',
          black: '#0a0a0a',
          red: '#ff0080',
          green: '#00ff41',
          yellow: '#ffff00',
          blue: '#0080ff',
          magenta: '#ff0080',
          cyan: '#00ffff',
          white: '#c0c0c0',
          brightBlack: '#404040',
          brightRed: '#ff4da6',
          brightGreen: '#4dff67',
          brightYellow: '#ffff4d',
          brightBlue: '#4da6ff',
          brightMagenta: '#ff4da6',
          brightCyan: '#4dffff',
          brightWhite: '#ffffff',
        },
        ui: {
          headerBg: '#1a0a1a',
          tabBg: '#1a0a1a',
          tabActiveBg: '#0a0a0a',
          statusBg: '#1a0a1a',
          borderColor: '#ff0080',
          accentColor: '#00ff41',
        },
      },

      'mermaid-depths': {
        id: 'mermaid-depths',
        name: '🧜‍♀️ Mermaid Depths',
        description: 'Mystical underwater theme with hot pinks and teal blues',
        category: 'Nature',
        colors: {
          background: '#001524',
          foreground: '#E0FBFC',
          cursor: '#FF1493',
          selection: 'rgba(255, 20, 147, 0.3)',
          black: '#001524',
          red: '#FF1493',
          green: '#00CED1',
          yellow: '#FFD700',
          blue: '#1E90FF',
          magenta: '#FF69B4',
          cyan: '#00FFFF',
          white: '#E0FBFC',
          brightBlack: '#003049',
          brightRed: '#FF69B4',
          brightGreen: '#48D1CC',
          brightYellow: '#FFED66',
          brightBlue: '#4169E1',
          brightMagenta: '#FFB6C1',
          brightCyan: '#7FFFD4',
          brightWhite: '#FFFFFF',
        },
        ui: {
          headerBg: '#002D3F',
          tabBg: '#002D3F',
          tabActiveBg: '#001524',
          statusBg: '#002D3F',
          borderColor: '#00FFFF',
          accentColor: '#FF1493',
        },
      },

      'high-contrast': {
        id: 'high-contrast',
        name: '🔲 High Contrast',
        description: 'Maximum contrast for accessibility',
        category: 'Accessibility',
        colors: {
          background: '#000000',
          foreground: '#ffffff',
          cursor: '#ffffff',
          selection: 'rgba(255, 255, 255, 0.3)',
          black: '#000000',
          red: '#ff0000',
          green: '#00ff00',
          yellow: '#ffff00',
          blue: '#0000ff',
          magenta: '#ff00ff',
          cyan: '#00ffff',
          white: '#ffffff',
          brightBlack: '#808080',
          brightRed: '#ff0000',
          brightGreen: '#00ff00',
          brightYellow: '#ffff00',
          brightBlue: '#0000ff',
          brightMagenta: '#ff00ff',
          brightCyan: '#00ffff',
          brightWhite: '#ffffff',
        },
        ui: {
          headerBg: '#ffffff',
          tabBg: '#ffffff',
          tabActiveBg: '#000000',
          statusBg: '#ffffff',
          borderColor: '#ffffff',
          accentColor: '#00ff00',
        },
      },

      // Additional themes
      'retro-terminal': {
        id: 'retro-terminal',
        name: '📟 Retro Terminal',
        description: 'Classic green-on-black terminal',
        category: 'Retro',
        colors: {
          background: '#000000',
          foreground: '#00ff00',
          cursor: '#00ff00',
          selection: 'rgba(0, 255, 0, 0.3)',
          black: '#000000',
          red: '#00ff00',
          green: '#00ff00',
          yellow: '#00ff00',
          blue: '#00ff00',
          magenta: '#00ff00',
          cyan: '#00ff00',
          white: '#00ff00',
          brightBlack: '#007700',
          brightRed: '#00ff00',
          brightGreen: '#00ff00',
          brightYellow: '#00ff00',
          brightBlue: '#00ff00',
          brightMagenta: '#00ff00',
          brightCyan: '#00ff00',
          brightWhite: '#00ff00',
        },
        ui: {
          headerBg: '#001100',
          tabBg: '#001100',
          tabActiveBg: '#000000',
          statusBg: '#001100',
          borderColor: '#00ff00',
          accentColor: '#00ff00',
        },
      },

      'pastel-dreams': {
        id: 'pastel-dreams',
        name: '🌸 Pastel Dreams',
        description: 'Soft pastel colors for gentle eyes',
        category: 'Light',
        colors: {
          background: '#fef9f3',
          foreground: '#5c5c5c',
          cursor: '#ff9999',
          selection: 'rgba(255, 153, 153, 0.3)',
          black: '#5c5c5c',
          red: '#ff9999',
          green: '#b4e7ce',
          yellow: '#ffd3b6',
          blue: '#a8dadc',
          magenta: '#e7c6ff',
          cyan: '#98f5e1',
          white: '#ffffff',
          brightBlack: '#8c8c8c',
          brightRed: '#ffb3b3',
          brightGreen: '#c9f0d6',
          brightYellow: '#ffe4cf',
          brightBlue: '#c1e7e9',
          brightMagenta: '#f0dfff',
          brightCyan: '#b8f8e8',
          brightWhite: '#ffffff',
        },
        ui: {
          headerBg: '#fff5eb',
          tabBg: '#fff5eb',
          tabActiveBg: '#fef9f3',
          statusBg: '#fff5eb',
          borderColor: '#ffd3b6',
          accentColor: '#ff9999',
        },
      },

      'car-dashboard': {
        id: 'car-dashboard',
        name: '🚗 Car Dashboard',
        description: 'Automotive dashboard with gauges, odometer, and car-inspired metrics',
        category: 'Automotive',
        colors: {
          background: '#0a0a0a',
          foreground: '#e0e0e0',
          cursor: '#ff6b35',
          selection: 'rgba(255, 107, 53, 0.3)',
          black: '#000000',
          red: '#ff3333',
          green: '#00ff55',
          yellow: '#ffaa00',
          blue: '#3399ff',
          magenta: '#ff33aa',
          cyan: '#00ffff',
          white: '#ffffff',
          brightBlack: '#333333',
          brightRed: '#ff6666',
          brightGreen: '#66ff88',
          brightYellow: '#ffcc33',
          brightBlue: '#66aaff',
          brightMagenta: '#ff66cc',
          brightCyan: '#66ffff',
          brightWhite: '#ffffff',
        },
        ui: {
          headerBg: '#1a1a1a',
          tabBg: '#262626',
          tabActiveBg: '#0a0a0a',
          statusBg: '#1a1a1a',
          borderColor: '#ff6b35',
          accentColor: '#ff6b35',
        },
        customFeatures: {
          hasGauges: true,
          hasOdometer: true,
          hasStatusLights: true,
          autoMetrics: true,
        },
      },
    };

    // State management
    this.currentTheme = 'mermaid-depths';
    this.themeCache = new Map();
    this.observers = new Set();
    this.prefersDark = null;
    this.customCSSVariables = new Map();

    // Initialize if in browser environment
    if (typeof window !== 'undefined') {
      this.prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      this.init();
    }
  }

  init() {
    // Load saved theme
    this.loadSavedTheme();

    // Apply initial theme
    this.applyTheme(this.currentTheme);

    // Setup event listeners for system theme changes
    if (this.prefersDark) {
      this.prefersDark.addEventListener('change', e => {
        if (this.currentTheme === 'system') {
          const systemTheme = e.matches ? 'default-dark' : 'pastel-dreams';
          this.applyTheme(systemTheme, { system: true });
        }
      });
    }
  }

  loadSavedTheme() {
    try {
      // Check localStorage first
      const savedTheme = localStorage.getItem('rinawarp-current-theme');
      if (savedTheme && this.themes[savedTheme]) {
        this.currentTheme = savedTheme;
        return;
      }

      // Check for config-based theme (for Electron)
      if (window.electronAPI && window.electronAPI.getConfig) {
        const configTheme = window.electronAPI.getConfig('ui.theme');
        if (configTheme && this.themes[configTheme]) {
          this.currentTheme = configTheme;
          return;
        }
      }
    } catch (error) {}
  }

  saveTheme(themeId) {
    try {
      // Save to localStorage
      localStorage.setItem('rinawarp-current-theme', themeId);

      // Save to config (for Electron)
      if (window.electronAPI && window.electronAPI.setConfig) {
        window.electronAPI.setConfig('ui.theme', themeId);
      }
    } catch (error) {}
  }

  applyTheme(themeId, options = {}) {
    // Handle system theme
    if (themeId === 'system') {
      themeId = this.prefersDark && this.prefersDark.matches ? 'default-dark' : 'pastel-dreams';
      options.system = true;
    }

    const theme = this.themes[themeId];
    if (!theme) {
      console.warn(`Theme '${themeId}' not found, using default`);
      theme = this.themes['default-dark'];
      themeId = 'default-dark';
    }

    // Apply theme to DOM
    this.applyThemeToDOM(theme);

    // Update terminal if available
    if (window.term) {
      this.applyThemeToTerminal(theme);
    }

    // Update current theme
    this.currentTheme = themeId;

    // Save theme unless it's a system preference
    if (!options.system) {
      this.saveTheme(themeId);
    }

    // Notify observers
    this.notifyObservers(theme);
  }

  applyThemeToDOM(theme) {
    const root = document.documentElement;

    // Apply data attribute
    root.setAttribute('data-theme', theme.id);

    // Apply terminal colors as CSS variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--terminal-color-${key}`, value);
    });

    // Apply UI colors
    Object.entries(theme.ui).forEach(([key, value]) => {
      root.style.setProperty(`--ui-${key}`, value);
    });

    // Apply any custom CSS variables
    this.customCSSVariables.forEach((value, key) => {
      root.style.setProperty(key, value);
    });

    // Update body background
    document.body.style.backgroundColor = theme.colors.background;
  }

  applyThemeToTerminal(theme) {
    if (!window.term) return;

    const termTheme = {
      background: theme.colors.background,
      foreground: theme.colors.foreground,
      cursor: theme.colors.cursor,
      cursorAccent: theme.colors.background,
      selection: theme.colors.selection,
      black: theme.colors.black,
      red: theme.colors.red,
      green: theme.colors.green,
      yellow: theme.colors.yellow,
      blue: theme.colors.blue,
      magenta: theme.colors.magenta,
      cyan: theme.colors.cyan,
      white: theme.colors.white,
      brightBlack: theme.colors.brightBlack,
      brightRed: theme.colors.brightRed,
      brightGreen: theme.colors.brightGreen,
      brightYellow: theme.colors.brightYellow,
      brightBlue: theme.colors.brightBlue,
      brightMagenta: theme.colors.brightMagenta,
      brightCyan: theme.colors.brightCyan,
      brightWhite: theme.colors.brightWhite,
    };

    window.term.options.theme = termTheme;
  }

  getTheme(themeId) {
    return this.themes[themeId];
  }

  getAllThemes() {
    return Object.values(this.themes);
  }

  getThemesByCategory(category) {
    return Object.values(this.themes).filter(theme => theme.category === category);
  }

  getCategories() {
    const categories = new Set();
    Object.values(this.themes).forEach(theme => {
      if (theme.category) categories.add(theme.category);
    });
    return Array.from(categories);
  }

  getCurrentTheme() {
    return this.themes[this.currentTheme];
  }

  getCurrentThemeId() {
    return this.currentTheme;
  }

  // Apply custom CSS variables
  setCustomVariable(key, value) {
    this.customCSSVariables.set(key, value);
    document.documentElement.style.setProperty(key, value);
  }

  // Reset custom variables
  resetCustomVariables() {
    this.customCSSVariables.clear();
    this.applyTheme(this.currentTheme);
  }

  // Toggle between light and dark themes
  toggleTheme() {
    const currentCategory = this.getCurrentTheme().category;
    let nextTheme;

    if (currentCategory === 'Light' || currentCategory === 'Accessibility') {
      // Switch to a dark theme
      nextTheme = 'default-dark';
    } else {
      // Switch to a light theme
      nextTheme = 'pastel-dreams';
    }

    this.applyTheme(nextTheme);
  }

  // Observer pattern for theme changes
  subscribe(callback) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  notifyObservers(theme) {
    for (const callback of this.observers) {
      try {
        callback(theme);
      } catch (error) {
        console.error('Error in theme observer:', error);
      }
    }
  }

  // Export theme configuration
  exportTheme(themeId) {
    const theme = this.themes[themeId];
    if (!theme) return null;

    return JSON.stringify(theme, null, 2);
  }

  // Import custom theme
  importTheme(themeData) {
    try {
      const theme = typeof themeData === 'string' ? JSON.parse(themeData) : themeData;

      if (!theme.id || !theme.name || !theme.colors) {
        throw new Error(new Error('Invalid theme format'));
      }

      this.themes[theme.id] = theme;
      return theme.id;
    } catch (error) {
      console.error('Failed to import theme:', error);
      return null;
    }
  }

  // Create a custom theme based on existing theme
  createCustomTheme(baseThemeId, customizations) {
    const baseTheme = this.themes[baseThemeId];
    if (!baseTheme) return null;

    const customTheme = JSON.parse(JSON.stringify(baseTheme)); // Deep clone
    customTheme.id = `custom-${Date.now()}`;
    customTheme.name = customizations.name || `Custom ${baseTheme.name}`;
    customTheme.category = 'Custom';

    // Apply customizations
    if (customizations.colors) {
      Object.assign(customTheme.colors, customizations.colors);
    }
    if (customizations.ui) {
      Object.assign(customTheme.ui, customizations.ui);
    }

    this.themes[customTheme.id] = customTheme;
    return customTheme.id;
  }
}

// Create singleton instance
let themeManagerInstance = null;

export function getThemeManager() {
  if (!themeManagerInstance) {
    themeManagerInstance = new UnifiedThemeManager();
  }
  return themeManagerInstance;
}

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getThemeManager, UnifiedThemeManager };
}

export default getThemeManager();
export { UnifiedThemeManager };
