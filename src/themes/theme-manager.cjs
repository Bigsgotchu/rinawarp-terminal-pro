/**
 * Enhanced Theme Manager for RinaWarp Terminal
 * Provides beautiful, customizable themes inspired by popular terminals
 */

const _fs = require('fs');
const _path = require('path');
const config = require('../config/unified-config.cjs');

class ThemeManager {
  constructor() {
    this.themes = {
      // Default themes
      'warp-dark': {
        name: 'Warp Dark',
        description: 'Clean dark theme inspired by Warp',
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
        name: 'Ocean Breeze',
        description: 'Calming blue-teal theme',
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

      cyberpunk: {
        name: 'Cyberpunk',
        description: 'Neon-lit futuristic theme',
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

      sunset: {
        name: 'Sunset',
        description: 'Warm orange and pink theme',
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

      forest: {
        name: 'Forest',
        description: 'Nature-inspired green theme',
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

      'high-contrast': {
        name: 'High Contrast',
        description: 'Maximum readability theme',
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
          brightRed: '#ff8080',
          brightGreen: '#80ff80',
          brightYellow: '#ffff80',
          brightBlue: '#8080ff',
          brightMagenta: '#ff80ff',
          brightCyan: '#80ffff',
          brightWhite: '#ffffff',
        },
        ui: {
          headerBg: '#1a1a1a',
          tabBg: '#1a1a1a',
          tabActiveBg: '#000000',
          statusBg: '#1a1a1a',
          borderColor: '#ffffff',
          accentColor: '#ffffff',
        },
      },
    };

    this.currentTheme = config.get('terminal.theme') || 'warp-dark';
  }

  getTheme(themeName = null) {
    const name = themeName || this.currentTheme;
    return this.themes[name] || this.themes['warp-dark'];
  }

  getThemeNames() {
    return Object.keys(this.themes);
  }

  setTheme(themeName) {
    if (this.themes[themeName]) {
      this.currentTheme = themeName;
      config.set('terminal.theme', themeName);
      return true;
    }
    return false;
  }

  generateCSS(themeName = null) {
    const theme = this.getTheme(themeName);

    return `
      /* ${theme.name} Theme */
      :root {
        --bg-primary: ${theme.colors.background};
        --fg-primary: ${theme.colors.foreground};
        --cursor-color: ${theme.colors.cursor};
        --selection-color: ${theme.colors.selection};
        --header-bg: ${theme.ui.headerBg};
        --tab-bg: ${theme.ui.tabBg};
        --tab-active-bg: ${theme.ui.tabActiveBg};
        --status-bg: ${theme.ui.statusBg};
        --border-color: ${theme.ui.borderColor};
        --accent-color: ${theme.ui.accentColor};
      }
      
      .app-container {
        background: var(--bg-primary);
        color: var(--fg-primary);
      }
      
      .header {
        background: var(--header-bg);
        border-bottom: 1px solid var(--border-color);
      }
      
      .header h1 {
        color: var(--accent-color);
      }
      
      .tab-bar {
        background: var(--tab-bg);
        border-bottom: 1px solid var(--border-color);
      }
      
      .tab {
        background: var(--tab-bg);
        border: 1px solid var(--border-color);
        color: var(--fg-primary);
      }
      
      .tab.active {
        background: var(--tab-active-bg);
        color: var(--accent-color);
      }
      
      .terminal-content {
        background: var(--bg-primary);
      }
      
      .status-bar {
        background: var(--status-bg);
        border-top: 1px solid var(--border-color);
      }
      
      .status-right {
        color: var(--accent-color);
      }
      
      /* XTerm.js overrides */
      .xterm {
        background-color: var(--bg-primary) !important;
      }
      
      .xterm .xterm-viewport {
        background-color: var(--bg-primary) !important;
      }
      
      .xterm .xterm-screen {
        background-color: var(--bg-primary) !important;
      }
      
      /* Scrollbar styling */
      .xterm .xterm-viewport::-webkit-scrollbar {
        width: 8px;
      }
      
      .xterm .xterm-viewport::-webkit-scrollbar-track {
        background: var(--bg-primary);
      }
      
      .xterm .xterm-viewport::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: 4px;
      }
      
      .xterm .xterm-viewport::-webkit-scrollbar-thumb:hover {
        background: var(--accent-color);
      }
    `;
  }

  applyTheme(themeName = null) {
    const css = this.generateCSS(themeName);

    // Remove existing theme style
    const existingStyle = document.getElementById('theme-style');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Add new theme style
    const style = document.createElement('style');
    style.id = 'theme-style';
    style.textContent = css;
    document.head.appendChild(style);

    // Update XTerm theme if available
    if (window.terminalManager && window.terminalManager.activeTerminal) {
      const theme = this.getTheme(themeName);
      const xtermTheme = {
        background: theme.colors.background,
        foreground: theme.colors.foreground,
        cursor: theme.colors.cursor,
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

      if (window.terminalManager.activeTerminal.terminal) {
        window.terminalManager.activeTerminal.terminal.options.theme = xtermTheme;
      }
    }
  }

  createThemeSelector() {
    const selector = document.createElement('select');
    selector.id = 'theme-selector';
    selector.className = 'theme-selector';

    this.getThemeNames().forEach(themeName => {
      const option = document.createElement('option');
      option.value = themeName;
      option.textContent = this.themes[themeName].name;
      if (themeName === this.currentTheme) {
        option.selected = true;
      }
      selector.appendChild(option);
    });

    selector.addEventListener('change', e => {
      const selectedTheme = e.target.value;
      this.setTheme(selectedTheme);
      this.applyTheme(selectedTheme);
    });

    return selector;
  }
}

// Export for global use
if (typeof window !== 'undefined') {
  window.ThemeManager = ThemeManager;
}

module.exports = ThemeManager;
