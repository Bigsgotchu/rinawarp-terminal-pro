# 🧜‍♀️ Mermaid Color Scheme Activation Guide

Welcome to the mystical underwater world of the **Mermaid Theme**! This beautiful color scheme features:

- **Deep blues and purples** (`#0a0b1e`, `#2d1b69`, `#4b0082`)
- **Vibrant hot pinks** (`#ff1493`, `#ff69b4`) 
- **Bright cyan accents** (`#00e5ff`)
- **Turquoise highlights** (`#40e0d0`)

## 🚀 Quick Activation

### Method 1: Run the Activation Script
```bash
node activate-mermaid-theme.js
```

### Method 2: Browser Console (if running the web version)
1. Open Developer Tools (F12)
2. Navigate to the Console tab
3. Run the activation script:
```javascript
// Load and run the activation script
const script = document.createElement('script');
script.src = './activate-mermaid-theme.js';
document.head.appendChild(script);
```

### Method 3: Manual Activation
If you're in the browser environment, you can also manually apply the theme:

```javascript
// Remove any existing theme classes
document.body.className = document.body.className.replace(/theme-\w+/g, '');

// Apply the mermaid theme
document.body.classList.add('theme-mermaid');

// Save the preference
localStorage.setItem('rinawarp-current-theme', 'mermaid-depths');
localStorage.setItem('rinawarp-theme-class', 'theme-mermaid');

console.log('🧜‍♀️ Mermaid theme activated!');
```

## ✨ Theme Features

The mermaid theme includes:

- **Gradient backgrounds** with underwater blues and purples
- **Glowing effects** on buttons and interactive elements
- **Animated shimmer effects** on the tab bar
- **Special scrollbar styling** with mermaid colors
- **Pulsing animations** for active elements
- **Beautiful shadows** and glow effects

## 🎨 Color Palette

```css
/* Primary Colors */
--bg-primary: #0a0b1e;      /* Deep ocean blue */
--bg-secondary: #2d1b69;    /* Mystic purple */
--bg-tertiary: #4b0082;     /* Deep violet */

/* Text Colors */
--text-primary: #ff1493;    /* Hot pink */
--text-secondary: #ff69b4;  /* Light pink */
--text-muted: #da70d6;      /* Orchid */

/* Accent Colors */
--border-color: #ff1493;    /* Hot pink borders */
--accent-color: #00e5ff;    /* Bright cyan */
```

## 🔧 Theme Management

The theme is managed by the `ThemeManager` class in `/src/renderer/theme-manager.js`. It:

- Automatically applies on startup (it's set as the default!)
- Saves your preference to localStorage
- Provides smooth transitions between themes
- Supports easy switching through the UI

## 🌊 Special Effects

The mermaid theme includes several special visual effects:

1. **Gradient backgrounds** that mimic underwater depths
2. **Glow effects** on interactive elements
3. **Shimmer animations** on the tab bar
4. **Pulsing text shadows** for active elements
5. **Beautiful hover states** with enhanced glows

## 🧜‍♀️ Enjoy Your Underwater Terminal!

Once activated, your RinaWarp Terminal will transform into a mystical underwater workspace with beautiful mermaid-inspired colors. The theme is designed to be both visually stunning and easy on the eyes for long coding sessions.

Happy coding in your underwater paradise! 🐚✨
