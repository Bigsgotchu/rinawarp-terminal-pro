/**
 * Terminal Manager - Stub module
 * The actual TerminalManager class is defined in renderer.js
 * This stub exists to satisfy import requirements
 */

// Export the TerminalManager class if it exists on window
export const TerminalManager =
  window.TerminalManager ||
  class TerminalManager {
    constructor() {
      console.warn(
        'Using stub TerminalManager - the real implementation should be loaded from renderer.js'
      );
    }
  };
