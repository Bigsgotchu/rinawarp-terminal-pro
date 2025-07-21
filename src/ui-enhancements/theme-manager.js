/**
 * Theme Manager
 * Handles theme switching and CSS variable management
 */

class ThemeManager {
  constructor() {
    this.currentTheme = 'light';
    this.themeCache = new Map();
    this.observers = new Set();
    this.prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    this.init();
  }

  init() {
    // Listen for system theme changes
    this.prefersDark.addEventListener('change', (e) => {
      if (this.currentTheme === 'system') {
        this.setTheme(e.matches ? 'dark' : 'light', { system: true });
      }
    });

    // Load saved theme or use system preference
    const savedTheme = localStorage.getItem('rinawarp-theme');
    if (savedTheme) {
      this.setTheme(savedTheme);
    } else {
      this.setTheme('system');
    }
  }

  async setTheme(theme, options = {}) {
    // Handle system theme
    if (theme === 'system') {
      theme = this.prefersDark.matches ? 'dark' : 'light';
      options.system = true;
    }

    // Validate theme
    if (!['light', 'dark', 'mermaid', 'high-contrast'].includes(theme)) {
      console.warn(`Invalid theme: ${theme}, defaulting to light`);
      theme = 'light';
    }

    // Load theme CSS if not already loaded
    if (!this.themeCache.has(theme)) {
      await this.loadThemeCSS(theme);
    }

    // Update data-theme attribute
    document.documentElement.setAttribute('data-theme', theme);

    // Store the theme unless it's from system preference
    if (!options.system) {
      localStorage.setItem('rinawarp-theme', theme);
    }

    this.currentTheme = theme;
    this.notifyObservers(theme);
  }

  async loadThemeCSS(theme) {
    // Only load additional theme CSS for custom themes
    if (['mermaid', 'high-contrast'].includes(theme)) {
      try {
        const module = await import(`../styles/themes/${theme}.css`);
        this.themeCache.set(theme, module.default);
      } catch (error) {
        console.warn(`Failed to load theme CSS for ${theme}:`, error);
      }
    }
  }

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

  // Get current theme properties
  getThemeProperties() {
    const styles = window.getComputedStyle(document.documentElement);
    return {
      background: styles.getPropertyValue('--color-background'),
      surface: styles.getPropertyValue('--color-surface'),
      primary: styles.getPropertyValue('--color-primary'),
      text: styles.getPropertyValue('--color-text-primary'),
      terminal: {
        background: styles.getPropertyValue('--terminal-background'),
        foreground: styles.getPropertyValue('--terminal-foreground'),
        cursor: styles.getPropertyValue('--terminal-cursor'),
        selection: styles.getPropertyValue('--terminal-selection'),
      }
    };
  }

  // Apply custom theme overrides
  applyThemeOverrides(overrides) {
    for (const [property, value] of Object.entries(overrides)) {
      document.documentElement.style.setProperty(`--${property}`, value);
    }
  }

  // Reset theme overrides
  resetThemeOverrides() {
    document.documentElement.removeAttribute('style');
  }

  // Toggle between light and dark themes
  toggleTheme() {
    const nextTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(nextTheme);
  }

  // Get current theme
  getCurrentTheme() {
    return this.currentTheme;
  }

  // Check if current theme is dark
  isDarkTheme() {
    return ['dark', 'mermaid'].includes(this.currentTheme) || 
           (this.currentTheme === 'system' && this.prefersDark.matches);
  }
}

// Create and export singleton instance
const themeManager = new ThemeManager();
export default themeManager;
