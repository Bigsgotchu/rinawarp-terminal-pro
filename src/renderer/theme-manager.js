/**
 * RinaWarp Terminal - Theme Manager
 * Copyright (c) 2025 RinaWarp Technologies
 *
 * Comprehensive theme management system with 16+ diverse themes
 */

class ThemeManager {
  constructor() {
    this.themes = [
      {
        id: 'default-dark',
        name: '🌙 Default Dark',
        description: 'Classic dark theme with green accents',
        category: 'Dark',
        className: 'theme-default-dark',
      },
      {
        id: 'ocean-breeze',
        name: '🌊 Ocean Breeze',
        description: 'Deep sea blues with aqua accents',
        category: 'Nature',
        className: 'theme-ocean-breeze',
      },
      {
        id: 'sunset-glow',
        name: '🌅 Sunset Glow',
        description: 'Warm purple and orange evening colors',
        category: 'Nature',
        className: 'theme-sunset-glow',
      },
      {
        id: 'forest-dawn',
        name: '🌲 Forest Dawn',
        description: 'Fresh green forest tones',
        category: 'Nature',
        className: 'theme-forest-dawn',
      },
      {
        id: 'arctic-aurora',
        name: '❄️ Arctic Aurora',
        description: 'Cool aurora borealis inspired colors',
        category: 'Nature',
        className: 'theme-arctic-aurora',
      },
      {
        id: 'cyberpunk-neon',
        name: '🦾 Cyberpunk Neon',
        description: 'Futuristic neon magenta and cyan',
        category: 'Futuristic',
        className: 'theme-cyberpunk-neon',
      },
      {
        id: 'warm-coffee',
        name: '☕ Warm Coffee',
        description: 'Cozy brown coffee shop vibes',
        category: 'Warm',
        className: 'theme-warm-coffee',
      },
      {
        id: 'pastel-dreams',
        name: '🌸 Pastel Dreams',
        description: 'Soft pastel colors for gentle eyes',
        category: 'Light',
        className: 'theme-pastel-dreams',
      },
      {
        id: 'midnight-blue',
        name: '🌃 Midnight Blue',
        description: 'GitHub-inspired dark blue theme',
        category: 'Dark',
        className: 'theme-midnight-blue',
      },
      {
        id: 'retro-terminal',
        name: '📟 Retro Terminal',
        description: 'Classic green-on-black terminal',
        category: 'Retro',
        className: 'theme-retro-terminal',
      },
      {
        id: 'sakura-blossom',
        name: '🌺 Sakura Blossom',
        description: 'Elegant Japanese cherry blossom pink',
        category: 'Light',
        className: 'theme-sakura-blossom',
      },
      {
        id: 'space-odyssey',
        name: '🚀 Space Odyssey',
        description: 'Deep space purple with stellar accents',
        category: 'Futuristic',
        className: 'theme-space-odyssey',
      },
      {
        id: 'desert-sand',
        name: '🏜️ Desert Sand',
        description: 'Warm desert browns and oranges',
        category: 'Warm',
        className: 'theme-desert-sand',
      },
      {
        id: 'matrix-green',
        name: '💚 Matrix Green',
        description: 'Iconic matrix digital rain theme',
        category: 'Retro',
        className: 'theme-matrix-green',
      },
      {
        id: 'ice-crystal',
        name: '🧊 Ice Crystal',
        description: 'Cool crystal blue light theme',
        category: 'Light',
        className: 'theme-ice-crystal',
      },
      {
        id: 'autumn-leaves',
        name: '🍂 Autumn Leaves',
        description: 'Warm autumn orange and brown',
        category: 'Warm',
        className: 'theme-autumn-leaves',
      },
      {
        id: 'neon-city',
        name: '🏙️ Neon City',
        description: 'Vibrant neon city night colors',
        category: 'Futuristic',
        className: 'theme-neon-city',
      },
      {
        id: 'high-contrast',
        name: '🔲 High Contrast',
        description: 'Maximum contrast for accessibility',
        category: 'Accessibility',
        className: 'theme-high-contrast',
      },
      {
        id: 'lavender-fields',
        name: '💜 Lavender Fields',
        description: 'Peaceful lavender purple light theme',
        category: 'Light',
        className: 'theme-lavender-fields',
      },
      {
        id: 'volcanic-ash',
        name: '🌋 Volcanic Ash',
        description: 'Dark volcanic grays with red accents',
        category: 'Dark',
        className: 'theme-volcanic-ash',
      },
      {
        id: 'rainbow-pride',
        name: '🏳️‍🌈 Rainbow Pride',
        description: 'Colorful pride-inspired theme',
        category: 'Special',
        className: 'theme-rainbow-pride',
      },
      {
        id: 'mermaid-depths',
        name: '🧜‍♀️ Mermaid Depths',
        description: 'Mystical underwater theme with hot pinks and teal blues',
        category: 'Nature',
        className: 'theme-mermaid-depths',
      },
    ];

    this.currentTheme = 'mermaid-depths';
    this.init();
  }

  init() {
    // Load saved theme
    this.loadSavedTheme();

    // Apply initial theme
    this.applyTheme(this.currentTheme);

    // Setup event listeners
    this.setupEventListeners();
  }

  loadSavedTheme() {
    try {
      const savedTheme = localStorage.getItem('rinawarp-current-theme');
      if (savedTheme && this.themes.find(t => t.id === savedTheme)) {
        this.currentTheme = savedTheme;
      }
    } catch (error) {
      console.log('Failed to load saved theme, using default');
    }
  }

  saveTheme(themeId) {
    try {
      localStorage.setItem('rinawarp-current-theme', themeId);
    } catch (error) {
      console.log('Failed to save theme preference');
    }
  }

  applyTheme(themeId) {
    const theme = this.themes.find(t => t.id === themeId);
    if (!theme) {
      console.error('Theme not found:', themeId);
      return;
    }

    // Remove all existing theme classes
    this.themes.forEach(t => {
      document.body.classList.remove(t.className);
    });

    // Apply new theme class
    if (theme.className !== 'theme-default-dark') {
      document.body.classList.add(theme.className);
    }

    this.currentTheme = themeId;
    this.saveTheme(themeId);

    // Update UI elements
    this.updateThemeIndicators();

    // Emit theme change event
    this.emitThemeChangeEvent(theme);

    console.log(`Theme applied: ${theme.name}`);
  }

  updateThemeIndicators() {
    // Update theme selector if it exists
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.value = this.currentTheme;
    }

    // Update quick theme button
    const quickThemeBtn = document.getElementById('theme-quick-btn');
    if (quickThemeBtn) {
      const currentTheme = this.getTheme(this.currentTheme);
      quickThemeBtn.title = `Current: ${currentTheme.name}`;

      // Cycle to next theme on click
      quickThemeBtn.onclick = () => this.cycleToNextTheme();
    }

    // Update setup theme summary
    const summaryTheme = document.getElementById('summary-theme');
    if (summaryTheme) {
      const currentTheme = this.getTheme(this.currentTheme);
      summaryTheme.textContent = currentTheme.name;
    }
  }

  setupEventListeners() {
    // Theme selector in settings
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.addEventListener('change', e => {
        this.applyTheme(e.target.value);
      });
    }

    // Listen for setup theme changes
    document.addEventListener('DOMContentLoaded', () => {
      this.setupThemeOptions();
    });
  }

  setupThemeOptions() {
    // Update theme selector with all available themes
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.innerHTML = '';

      // Group themes by category
      const categories = [...new Set(this.themes.map(t => t.category))];

      categories.forEach(category => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = category;

        this.themes
          .filter(t => t.category === category)
          .forEach(theme => {
            const option = document.createElement('option');
            option.value = theme.id;
            option.textContent = theme.name;
            option.title = theme.description;
            optgroup.appendChild(option);
          });

        themeSelect.appendChild(optgroup);
      });

      themeSelect.value = this.currentTheme;
    }

    // Setup theme grid in quick setup
    this.setupQuickSetupThemes();
  }

  setupQuickSetupThemes() {
    const themeGrid = document.querySelector('.theme-grid');
    if (!themeGrid) return;

    // Clear existing themes
    themeGrid.innerHTML = '';

    // Add featured themes for quick setup
    const featuredThemes = [
      'default-dark',
      'ocean-breeze',
      'sunset-glow',
      'cyberpunk-neon',
      'pastel-dreams',
      'matrix-green',
    ];

    featuredThemes.forEach(themeId => {
      const theme = this.getTheme(themeId);
      if (!theme) return;

      const themeOption = document.createElement('div');
      themeOption.className = 'theme-option';
      themeOption.dataset.theme = themeId;

      if (themeId === this.currentTheme) {
        themeOption.classList.add('selected');
      }

      themeOption.innerHTML = `
        <div class="theme-preview ${theme.className}-preview">
          <div class="preview-titlebar"></div>
          <div class="preview-terminal">
            <div class="preview-line">
              <span class="preview-prompt">❯</span>
              <span class="preview-command">npm start</span>
            </div>
          </div>
        </div>
        <span class="theme-name">${theme.name}</span>
        <span class="theme-description">${theme.description}</span>
      `;

      themeOption.addEventListener('click', () => {
        // Remove selection from all themes
        document.querySelectorAll('.theme-option').forEach(opt => {
          opt.classList.remove('selected');
        });

        // Select this theme
        themeOption.classList.add('selected');
        this.applyTheme(themeId);
      });

      themeGrid.appendChild(themeOption);
    });
  }

  cycleToNextTheme() {
    const currentIndex = this.themes.findIndex(t => t.id === this.currentTheme);
    const nextIndex = (currentIndex + 1) % this.themes.length;
    const nextTheme = this.themes[nextIndex];

    this.applyTheme(nextTheme.id);

    // Show notification
    this.showThemeChangeNotification(nextTheme);
  }

  showThemeChangeNotification(theme) {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.className = 'theme-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">🎨</span>
        <span class="notification-text">Theme: ${theme.name}</span>
      </div>
    `;

    // Style the notification
    notification.style.cssText = `
      position: fixed;
      top: 50px;
      right: 20px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px 16px;
      z-index: 10000;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 100);

    // Animate out and remove
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 2000);
  }

  getTheme(themeId) {
    return this.themes.find(t => t.id === themeId);
  }

  getCurrentTheme() {
    return this.getTheme(this.currentTheme);
  }

  getThemesByCategory(category) {
    return this.themes.filter(t => t.category === category);
  }

  getAllThemes() {
    return [...this.themes];
  }

  getRandomTheme() {
    const randomIndex = Math.floor(Math.random() * this.themes.length);
    return this.themes[randomIndex];
  }

  applyRandomTheme() {
    const randomTheme = this.getRandomTheme();
    this.applyTheme(randomTheme.id);
    this.showThemeChangeNotification(randomTheme);
  }

  emitThemeChangeEvent(theme) {
    const event = new CustomEvent('themeChanged', {
      detail: {
        theme: theme,
        themeId: theme.id,
        themeName: theme.name,
      },
    });
    document.dispatchEvent(event);
  }

  // Advanced theme features
  createCustomTheme(config) {
    // Allow users to create custom themes
    const customTheme = {
      id: config.id || `custom-${Date.now()}`,
      name: config.name || 'Custom Theme',
      description: config.description || 'User created theme',
      category: 'Custom',
      className: `theme-${config.id}`,
      custom: true,
      colors: config.colors,
    };

    this.themes.push(customTheme);
    this.generateCustomThemeCSS(customTheme);

    return customTheme;
  }

  generateCustomThemeCSS(theme) {
    // Generate CSS for custom themes
    const style = document.createElement('style');
    style.id = `custom-theme-${theme.id}`;

    const css = `
      .${theme.className} {
        --bg-primary: ${theme.colors.bgPrimary};
        --bg-secondary: ${theme.colors.bgSecondary};
        --bg-tertiary: ${theme.colors.bgTertiary};
        --text-primary: ${theme.colors.textPrimary};
        --text-secondary: ${theme.colors.textSecondary};
        --accent-primary: ${theme.colors.accentPrimary};
        --accent-secondary: ${theme.colors.accentSecondary};
        --border-color: ${theme.colors.borderColor};
        --terminal-bg: ${theme.colors.terminalBg};
      }
    `;

    style.textContent = css;
    document.head.appendChild(style);
  }
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
  window.ThemeManager = ThemeManager;
}

export default ThemeManager;
