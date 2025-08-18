/**
 * Terminal Theme System for RinaWarp Terminal
 * Provides multiple color themes and customization options
 */

export class TerminalThemes {
  constructor() {
    this.themes = {
      rinawarp: {
        name: 'RinaWarp',
        description: 'Official RinaWarp branded theme with vibrant gradients',
        background: 'linear-gradient(135deg, #FF1493 0%, #FF6B9D 25%, #00CED1 75%, #4169E1 100%)',
        terminalBackground: 'rgba(5, 5, 8, 0.95)',
        terminalBorder: 'rgba(255, 20, 147, 0.3)',
        foreground: '#FFFFFF',
        cursor: '#FF1493',
        selection: 'rgba(255, 20, 147, 0.2)',
        colors: {
          black: '#0a0a0f',
          red: '#FF1493',
          green: '#00FF88',
          yellow: '#FFD93D',
          blue: '#4169E1',
          magenta: '#9B59B6',
          cyan: '#00CED1',
          white: '#FFFFFF',
          brightBlack: '#2a2a33',
          brightRed: '#FF69B4',
          brightGreen: '#00FA9A',
          brightYellow: '#FFFF00',
          brightBlue: '#00BFFF',
          brightMagenta: '#DA70D6',
          brightCyan: '#48D1CC',
          brightWhite: '#FFFFFF',
        },
      },
      'mermaid-ocean': {
        name: 'Mermaid Ocean',
        description: 'Default theme with oceanic colors',
        background: 'linear-gradient(135deg, #008B8B 0%, #FF1493 50%, #00AAFF 100%)',
        terminalBackground: 'rgba(0, 0, 0, 0.8)',
        terminalBorder: 'rgba(0, 170, 255, 0.3)',
        foreground: '#FFFFFF',
        cursor: '#00FF88',
        selection: 'rgba(0, 170, 255, 0.3)',
        colors: {
          black: '#000000',
          red: '#FF1493',
          green: '#00FF88',
          yellow: '#FFD93D',
          blue: '#00AAFF',
          magenta: '#8A2BE2',
          cyan: '#00CED1',
          white: '#FFFFFF',
          brightBlack: '#555555',
          brightRed: '#FF69B4',
          brightGreen: '#00FA9A',
          brightYellow: '#FFFF00',
          brightBlue: '#00BFFF',
          brightMagenta: '#DA70D6',
          brightCyan: '#48D1CC',
          brightWhite: '#FFFFFF',
        },
      },

      cyberpunk: {
        name: 'Cyberpunk',
        description: 'Neon colors with dark background',
        background: 'linear-gradient(135deg, #0F0F0F 0%, #1A0033 50%, #0F0F0F 100%)',
        terminalBackground: 'rgba(0, 0, 0, 0.95)',
        terminalBorder: 'rgba(255, 0, 255, 0.5)',
        foreground: '#00FF00',
        cursor: '#FF00FF',
        selection: 'rgba(255, 0, 255, 0.3)',
        colors: {
          black: '#000000',
          red: '#FF0080',
          green: '#00FF00',
          yellow: '#FFFF00',
          blue: '#00FFFF',
          magenta: '#FF00FF',
          cyan: '#00FFFF',
          white: '#FFFFFF',
          brightBlack: '#333333',
          brightRed: '#FF0080',
          brightGreen: '#00FF00',
          brightYellow: '#FFFF00',
          brightBlue: '#00FFFF',
          brightMagenta: '#FF00FF',
          brightCyan: '#00FFFF',
          brightWhite: '#FFFFFF',
        },
      },

      midnight: {
        name: 'Midnight',
        description: 'Dark theme with subtle colors',
        background: 'linear-gradient(135deg, #0F0F23 0%, #1A1A3E 50%, #0F0F23 100%)',
        terminalBackground: 'rgba(10, 10, 20, 0.95)',
        terminalBorder: 'rgba(100, 100, 255, 0.2)',
        foreground: '#E0E0E0',
        cursor: '#6666FF',
        selection: 'rgba(100, 100, 255, 0.2)',
        colors: {
          black: '#0F0F23',
          red: '#FF6B6B',
          green: '#4ECDC4',
          yellow: '#FFE66D',
          blue: '#4D7FFF',
          magenta: '#C77DFF',
          cyan: '#7DD3FC',
          white: '#E0E0E0',
          brightBlack: '#2A2A4E',
          brightRed: '#FF8787',
          brightGreen: '#6EE7E0',
          brightYellow: '#FFF89E',
          brightBlue: '#6B9FFF',
          brightMagenta: '#E0AAFF',
          brightCyan: '#A5E3FF',
          brightWhite: '#FFFFFF',
        },
      },

      sunset: {
        name: 'Sunset',
        description: 'Warm colors inspired by sunset',
        background: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 50%, #FF6B6B 100%)',
        terminalBackground: 'rgba(40, 20, 10, 0.9)',
        terminalBorder: 'rgba(255, 200, 100, 0.3)',
        foreground: '#FFFAF0',
        cursor: '#FFD700',
        selection: 'rgba(255, 200, 100, 0.3)',
        colors: {
          black: '#2C1810',
          red: '#FF4500',
          green: '#32CD32',
          yellow: '#FFD700',
          blue: '#4169E1',
          magenta: '#FF1493',
          cyan: '#00CED1',
          white: '#FFFAF0',
          brightBlack: '#8B4513',
          brightRed: '#FF6347',
          brightGreen: '#00FF00',
          brightYellow: '#FFFF00',
          brightBlue: '#1E90FF',
          brightMagenta: '#FF69B4',
          brightCyan: '#00FFFF',
          brightWhite: '#FFFFFF',
        },
      },

      matrix: {
        name: 'Matrix',
        description: 'Classic green on black terminal',
        background: 'radial-gradient(circle, #001100 0%, #000000 100%)',
        terminalBackground: 'rgba(0, 0, 0, 0.98)',
        terminalBorder: 'rgba(0, 255, 0, 0.3)',
        foreground: '#00FF00',
        cursor: '#00FF00',
        selection: 'rgba(0, 255, 0, 0.2)',
        colors: {
          black: '#000000',
          red: '#007700',
          green: '#00FF00',
          yellow: '#00CC00',
          blue: '#009900',
          magenta: '#00AA00',
          cyan: '#00DD00',
          white: '#00FF00',
          brightBlack: '#003300',
          brightRed: '#00AA00',
          brightGreen: '#00FF00',
          brightYellow: '#00FF00',
          brightBlue: '#00CC00',
          brightMagenta: '#00DD00',
          brightCyan: '#00FF00',
          brightWhite: '#00FF00',
        },
      },

      dracula: {
        name: 'Dracula',
        description: 'Popular dark theme with vibrant colors',
        background: 'linear-gradient(135deg, #282a36 0%, #44475a 100%)',
        terminalBackground: 'rgba(40, 42, 54, 0.95)',
        terminalBorder: 'rgba(98, 114, 164, 0.3)',
        foreground: '#f8f8f2',
        cursor: '#50fa7b',
        selection: 'rgba(68, 71, 90, 0.5)',
        colors: {
          black: '#21222c',
          red: '#ff5555',
          green: '#50fa7b',
          yellow: '#f1fa8c',
          blue: '#bd93f9',
          magenta: '#ff79c6',
          cyan: '#8be9fd',
          white: '#f8f8f2',
          brightBlack: '#6272a4',
          brightRed: '#ff6e6e',
          brightGreen: '#69ff94',
          brightYellow: '#ffffa5',
          brightBlue: '#d6acff',
          brightMagenta: '#ff92df',
          brightCyan: '#a4ffff',
          brightWhite: '#ffffff',
        },
      },

      'vercel-mermaid': {
        name: 'Vercel Mermaid',
        description: 'Beautiful gradient theme extracted from Vercel deployment',
        background:
          'linear-gradient(135deg, #ff1493 0%, #00ced1 15%, #1e90ff 30%, #ff69b4 45%, #20b2aa 60%, #ff1493 75%, #00ffff 90%, #ff69b4 100%)',
        terminalBackground: 'rgba(255, 255, 255, 0.95)',
        terminalBorder: 'rgba(255, 20, 147, 0.4)',
        foreground: '#2d1b69',
        cursor: '#ff1493',
        selection: 'rgba(255, 20, 147, 0.2)',
        // Enhanced with backdrop blur effect (applied via CSS)
        backdropFilter: 'blur(15px)',
        boxShadow: '0 20px 40px rgba(255, 20, 147, 0.3), 0 0 30px rgba(0, 206, 209, 0.2)',
        colors: {
          black: '#2d1b69',
          red: '#ff1493',
          green: '#20b2aa',
          yellow: '#ffd700',
          blue: '#1e90ff',
          magenta: '#ff69b4',
          cyan: '#00ffff',
          white: '#ffffff',
          brightBlack: '#4a4a69',
          brightRed: '#ff69b4',
          brightGreen: '#00ced1',
          brightYellow: '#ffff00',
          brightBlue: '#00bfff',
          brightMagenta: '#da70d6',
          brightCyan: '#48d1cc',
          brightWhite: '#ffffff',
        },
        // Vercel-specific animations and effects
        animations: {
          gradientShift: '8s ease infinite',
          shimmer: '3s ease-in-out infinite',
          textShimmer: '3s ease-in-out infinite',
        },
      },
    };

    this.currentTheme = 'rinawarp';
    this.customTheme = null;

    // Load saved theme
    this.loadTheme();
  }

  loadTheme() {
    const saved = localStorage.getItem('rinawarp-theme');
    if (saved && this.themes[saved]) {
      this.currentTheme = saved;
    }

    // Load custom theme if exists
    const customSaved = localStorage.getItem('rinawarp-custom-theme');
    if (customSaved) {
      try {
        this.customTheme = JSON.parse(customSaved);
        this.themes['custom'] = this.customTheme;
      } catch (e) {
        console.error('Failed to load custom theme:', e);
      }
    }
  }

  saveTheme() {
    localStorage.setItem('rinawarp-theme', this.currentTheme);
    if (this.customTheme) {
      localStorage.setItem('rinawarp-custom-theme', JSON.stringify(this.customTheme));
    }
  }

  applyTheme(themeName) {
    if (!this.themes[themeName]) {
      console.error('Theme not found:', themeName);
      return;
    }

    const theme = this.themes[themeName];
    this.currentTheme = themeName;

    // Add theme transition class
    document.body.classList.add('theme-transitioning');

    // Remove previous theme classes
    document.body.classList.remove('vercel-mermaid-theme');

    // Apply theme-specific enhancements
    if (themeName === 'vercel-mermaid') {
      this.loadVercelMermaidEnhancements();
      document.body.classList.add('vercel-mermaid-theme');
    } else {
      this.unloadVercelMermaidEnhancements();
    }

    // Apply to document
    this.applyThemeToDocument(theme);

    // Apply to terminal if available
    if (window.terminal) {
      this.applyThemeToTerminal(theme);
    }

    // Remove transition class after animation
    setTimeout(() => {
      document.body.classList.remove('theme-transitioning');
    }, 800);

    // Save preference
    this.saveTheme();
  }

  applyThemeToDocument(theme) {
    const style =
      document.getElementById('terminal-theme-styles') || document.createElement('style');
    style.id = 'terminal-theme-styles';

    style.textContent = `
      body {
        background: ${theme.background};
      }
      
      .terminal-container {
        background: ${theme.terminalBackground};
        border-color: ${theme.terminalBorder};
      }
      
      .header {
        background: ${theme.terminalBackground.replace('0.8', '0.2')};
        border-color: ${theme.terminalBorder};
      }
      
      .status {
        background: ${theme.terminalBackground.replace('0.8', '0.1')};
        border-color: ${theme.terminalBorder};
        color: ${theme.foreground};
      }
      
      button {
        background: linear-gradient(45deg, 
          ${theme.colors.magenta}, 
          ${theme.colors.blue}, 
          ${theme.colors.cyan});
      }
      
      button:hover {
        box-shadow: 0 8px 25px ${theme.terminalBorder};
      }
      
      input[type="text"] {
        background: ${theme.terminalBackground.replace('0.8', '0.3')};
        border-color: ${theme.terminalBorder};
        color: ${theme.foreground};
      }
      
      input[type="text"]:focus {
        border-color: ${theme.colors.cyan};
        box-shadow: 0 0 20px ${theme.terminalBorder};
      }
      
      .ai-section {
        background: ${theme.terminalBackground.replace('0.8', '0.2')};
        border-color: ${theme.terminalBorder};
      }
      
      .settings-panel {
        background: ${theme.terminalBackground.replace('0.8', '0.95')};
        border-color: ${theme.terminalBorder};
      }
      
      .autocomplete-container {
        background: ${theme.terminalBackground.replace('0.8', '0.95')};
        border-color: ${theme.terminalBorder};
      }
      
      .suggestion-item:hover {
        background: ${theme.selection};
        color: ${theme.colors.cyan};
      }
    `;

    document.head.appendChild(style);
  }

  applyThemeToTerminal(theme) {
    if (!window.terminal) return;

    // Apply xterm.js theme
    window.terminal.options.theme = {
      background: this.extractColor(theme.terminalBackground),
      foreground: theme.foreground,
      cursor: theme.cursor,
      cursorAccent: theme.cursor,
      selection: theme.selection,
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
  }

  extractColor(rgba) {
    // Extract hex color from rgba string
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0');
      const g = parseInt(match[2]).toString(16).padStart(2, '0');
      const b = parseInt(match[3]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return rgba;
  }

  getThemeList() {
    return Object.entries(this.themes).map(([id, theme]) => ({
      id,
      name: theme.name,
      description: theme.description,
    }));
  }

  getCurrentTheme() {
    return this.themes[this.currentTheme];
  }

  createCustomTheme(config) {
    this.customTheme = {
      name: config.name || 'Custom Theme',
      description: config.description || 'User created theme',
      ...config,
    };

    this.themes['custom'] = this.customTheme;
    this.saveTheme();

    return this.customTheme;
  }

  exportTheme(themeName) {
    const theme = this.themes[themeName];
    if (!theme) return null;

    return JSON.stringify(theme, null, 2);
  }

  importTheme(themeJson) {
    try {
      const theme = JSON.parse(themeJson);
      const id = theme.name.toLowerCase().replace(/\s+/g, '-');
      this.themes[id] = theme;
      return id;
    } catch (e) {
      console.error('Failed to import theme:', e);
      return null;
    }
  }

  loadVercelMermaidEnhancements() {
    // Load the enhanced CSS for Vercel Mermaid theme
    const existingLink = document.getElementById('vercel-mermaid-css');
    if (existingLink) return; // Already loaded

    const link = document.createElement('link');
    link.id = 'vercel-mermaid-css';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = 'src/renderer/vercel-mermaid-theme.css';
    document.head.appendChild(link);

    console.log('🎨 Vercel Mermaid theme enhancements loaded');
  }

  unloadVercelMermaidEnhancements() {
    // Remove the enhanced CSS
    const existingLink = document.getElementById('vercel-mermaid-css');
    if (existingLink) {
      existingLink.remove();
      console.log('🎨 Vercel Mermaid theme enhancements unloaded');
    }
  }
}

// Export for use in terminal
window.TerminalThemes = TerminalThemes;
