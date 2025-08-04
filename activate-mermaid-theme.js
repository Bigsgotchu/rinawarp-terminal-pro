/**
 * Activate Mermaid Color Scheme for RinaWarp Terminal
 * This script properly applies the mermaid theme with all its beautiful underwater colors
 */

function activateMermaidTheme() {
  // Remove any existing theme classes
  const themeClasses = [
    'theme-default-dark',
    'theme-ocean-breeze',
    'theme-sunset-glow',
    'theme-forest-dawn',
    'theme-arctic-aurora',
    'theme-cyberpunk-neon',
    'theme-warm-coffee',
    'theme-pastel-dreams',
    'theme-midnight-blue',
    'theme-retro-terminal',
    'theme-sakura-blossom',
    'theme-space-odyssey',
    'theme-desert-sand',
    'theme-matrix-green',
    'theme-ice-crystal',
    'theme-autumn-leaves',
    'theme-neon-city',
    'theme-high-contrast',
    'theme-lavender-fields',
    'theme-volcanic-ash',
    'theme-rainbow-pride',
    'theme-mermaid-depths',
    'theme-website',
  ];

  themeClasses.forEach(className => {
    document.body.classList.remove(className);
  });

  // Apply the mermaid theme
  document.body.classList.add('theme-mermaid');

  // If theme manager exists, update it
  if (window.ThemeManager) {
    const themeManager = new window.ThemeManager();
    themeManager.currentTheme = 'mermaid-depths';
    themeManager.saveTheme('mermaid-depths');
    console.log('✅ Theme manager updated');
  }

  // Save theme preference to localStorage
  try {
    localStorage.setItem('rinawarp-current-theme', 'mermaid-depths');
    localStorage.setItem('rinawarp-theme-class', 'theme-mermaid');
  } catch (error) {
    console.warn('Failed to save theme preference:', error);
  }

  // Add some visual flair
  showMermaidActivationMessage();

  return true;
}

function showMermaidActivationMessage() {
  // Create a beautiful notification
  const notification = document.createElement('div');
  notification.id = 'mermaid-activation-notification';
  notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #0a0b1e, #2d1b69);
        border: 2px solid #ff1493;
        border-radius: 20px;
        padding: 30px 40px;
        color: #ff69b4;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 18px;
        font-weight: 600;
        text-align: center;
        z-index: 10000;
        box-shadow: 
            0 20px 60px rgba(255, 20, 147, 0.3),
            0 0 40px rgba(0, 229, 255, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        animation: mermaidFadeIn 0.6s ease-out;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
    `;

  notification.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 15px;">🧜‍♀️</div>
        <div style="margin-bottom: 10px;">Mermaid Theme Activated!</div>
        <div style="font-size: 14px; color: #00e5ff; font-weight: 400;">
            Mystical underwater colors with hot pinks and teal blues
        </div>
    `;

  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
        @keyframes mermaidFadeIn {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
            100% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
        }
        
        @keyframes mermaidPulse {
            0%, 100% {
                text-shadow: 0 0 10px rgba(255, 20, 147, 0.5);
            }
            50% {
                text-shadow: 
                    0 0 20px rgba(255, 20, 147, 0.8),
                    0 0 30px rgba(0, 229, 255, 0.5);
            }
        }
    `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.transition = 'all 0.4s ease-out';
    notification.style.opacity = '0';
    notification.style.transform = 'translate(-50%, -50%) scale(0.9)';

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, 400);
  }, 3000);
}

// Auto-activate if this script is run directly
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', activateMermaidTheme);
  } else {
    activateMermaidTheme();
  }

  // Also make function available globally
  window.activateMermaidTheme = activateMermaidTheme;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { activateMermaidTheme };
}
