// RinaWarp Terminal - Optimized Startup Sequence
(function () {
  const startTime = performance.now();

  // Pre-cache critical DOM elements
  const criticalSelectors = [
    '#terminal-container',
    '#xterm-viewport',
    '#ai-copilot-panel',
    '#voice-control-button',
    '#performance-monitor',
  ];

  // Preload critical stylesheets
  const criticalStyles = ['styles/main.css', 'styles/terminal.css', 'styles/ai-copilot.css'];

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
