// RinaWarp Terminal - Optimized Startup Sequence
(function () {
  // Only run in browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  
  const startTime = performance.now();

  // Pre-cache critical DOM elements (unused for now)
  const _criticalSelectors = [
    '#terminal-container',
    '#xterm-viewport',
    '#ai-copilot-panel',
    '#voice-control-button',
    '#performance-monitor',
  ];

  // Preload critical stylesheets (unused for now)
  const _criticalStyles = ['styles/main.css', 'styles/terminal.css', 'styles/ai-copilot.css'];

  // Optimize font loading
  const fonts = ['FiraCode-Regular.woff2', 'SF-Mono-Regular.woff2'];

  // Preload fonts
  fonts.forEach(font => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = `styles/fonts/${font}`;
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });

  // Optimize initial render
  requestAnimationFrame(() => {
    const endTime = performance.now();
    console.log(`🚀 Startup optimized: ${endTime - startTime}ms`);
  });
})();
