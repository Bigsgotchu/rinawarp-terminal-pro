/**
 * RinaWarp Terminal - Mermaid Theme Bookmarklet
 *
 * Copy this code and paste it into your browser console while on
 * https://rinawarptech.com/ to instantly activate the
 * beautiful mermaid color scheme!
 */

(function () {
  console.log('🧜‍♀️ Activating Mermaid Theme...');

  // Remove any existing theme classes
  const bodyClasses = document.body.className;
  document.body.className = bodyClasses.replace(/\btheme-[\w-]+\b/g, '');

  // Apply the mermaid theme
  document.body.classList.add('theme-mermaid');

  // Save theme preference
  try {
    localStorage.setItem('rinawarp-current-theme', 'mermaid-depths');
    localStorage.setItem('rinawarp-theme-class', 'theme-mermaid');
  } catch (e) {
    console.log('Could not save theme preference:', e);
  }

  // Create and inject mermaid CSS if not present
  if (!document.getElementById('mermaid-theme-styles')) {
    const mermaidCSS = `
        <style id="mermaid-theme-styles">
        /* Mermaid Theme Styles */
        body.theme-mermaid {
            --bg-primary: #0a0b1e !important;
            --bg-secondary: #2d1b69 !important;
            --bg-tertiary: #4b0082 !important;
            --text-primary: #ff1493 !important;
            --text-secondary: #ff69b4 !important;
            --text-muted: #da70d6 !important;
            --border-color: #ff1493 !important;
            --accent-color: #00e5ff !important;
            background: linear-gradient(135deg, #0a0b1e 0%, #1a0b3d 50%, #2d1b69 100%) !important;
            background-attachment: fixed !important;
        }
        
        /* Apply mermaid colors to common elements */
        body.theme-mermaid,
        body.theme-mermaid * {
            color: #ff69b4 !important;
        }
        
        body.theme-mermaid h1,
        body.theme-mermaid h2,
        body.theme-mermaid h3 {
            color: #ff1493 !important;
            text-shadow: 0 0 10px rgba(255, 20, 147, 0.5) !important;
        }
        
        body.theme-mermaid a {
            color: #00e5ff !important;
        }
        
        body.theme-mermaid button,
        body.theme-mermaid .btn {
            background: linear-gradient(135deg, #ff1493, #ff69b4) !important;
            border: 1px solid #00e5ff !important;
            color: #0a0b1e !important;
            box-shadow: 0 2px 4px rgba(0, 229, 255, 0.3) !important;
            transition: all 0.3s ease !important;
        }
        
        body.theme-mermaid button:hover,
        body.theme-mermaid .btn:hover {
            background: linear-gradient(135deg, #00e5ff, #40e0d0) !important;
            color: #0a0b1e !important;
            box-shadow: 0 4px 8px rgba(255, 20, 147, 0.4) !important;
            transform: translateY(-1px) !important;
        }
        
        /* Beautiful scrollbar */
        body.theme-mermaid ::-webkit-scrollbar {
            width: 12px !important;
        }
        
        body.theme-mermaid ::-webkit-scrollbar-track {
            background: linear-gradient(135deg, #0a0b1e, #2d1b69) !important;
            border-radius: 6px !important;
        }
        
        body.theme-mermaid ::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #ff1493, #ff69b4) !important;
            border-radius: 6px !important;
            box-shadow: 0 2px 4px rgba(0, 229, 255, 0.3) !important;
        }
        
        body.theme-mermaid ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #ff69b4, #00e5ff) !important;
            box-shadow: 0 2px 8px rgba(255, 20, 147, 0.5) !important;
        }
        </style>
        `;

    document.head.insertAdjacentHTML('beforeend', mermaidCSS);
  }

  // Show beautiful activation notification
  const notification = document.createElement('div');
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
        z-index: 999999;
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
        <div style="margin-top: 15px;">
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: linear-gradient(135deg, #00e5ff, #40e0d0); 
                           border: none; padding: 8px 16px; border-radius: 6px; 
                           color: #0a0b1e; font-weight: 600; cursor: pointer;">
                ✨ Enjoy!
            </button>
        </div>
    `;

  // Add animation
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
    `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  // Auto-remove after 5 seconds if not manually closed
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.transition = 'all 0.4s ease-out';
      notification.style.opacity = '0';
      notification.style.transform = 'translate(-50%, -50%) scale(0.9)';

      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 400);
    }
  }, 5000);

  console.log('🌊 Mermaid theme activated! Enjoy the mystical underwater colors! 🐚');

  return 'Mermaid theme activated successfully! 🧜‍♀️';
})();
