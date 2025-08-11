/**
 * RinaWarp Terminal - Command Builder Title Bar Integration
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 *
 * Simple integration to wire up the title bar button to the Visual Command Builder
 */

document.addEventListener('DOMContentLoaded', () => {
  // Wire up the command builder button in the title bar
  const commandBuilderBtn = document.getElementById('command-builder-btn');

  if (commandBuilderBtn) {
    commandBuilderBtn.addEventListener('click', () => {
      // Check if the command builder is available
      if (window.commandBuilder) {
        window.commandBuilder.show();
      } else {
        console.log('🧜‍♀️ Command Builder not loaded yet - waiting...');

        // Wait for it to be available
        const checkBuilder = setInterval(() => {
          if (window.commandBuilder) {
            clearInterval(checkBuilder);
            window.commandBuilder.show();
          }
        }, 100);

        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkBuilder);
          console.warn('🧜‍♀️ Command Builder failed to load within timeout');
        }, 5000);
      }
    });

    console.log('🔨 Command Builder title bar button integrated!');
  }
});
