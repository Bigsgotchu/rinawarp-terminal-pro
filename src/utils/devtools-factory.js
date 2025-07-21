/**
 * DevTools Factory - Lazy loading implementation for diagnostic tools
 */

let devToolsInstance = null;

export const DevToolsFactory = {
  async initialize() {
    if (!devToolsInstance) {
      // Dynamically import the DevTools module only when needed
      const { RinaWarpDevTools } = await import('../renderer/devtools-overlay.js');
      devToolsInstance = new RinaWarpDevTools();
    }
    return devToolsInstance;
  },

  async showDevTools() {
    const instance = await this.initialize();
    instance.show();
    return instance;
  },

  async hideDevTools() {
    if (devToolsInstance) {
      devToolsInstance.destroy();
      devToolsInstance = null;
    }
  },

  // Expose key functionality through proxied methods
  async runDiagnostics() {
    const instance = await this.initialize();
    return instance.runElementChecks();
  },

  async checkPerformance() {
    const instance = await this.initialize();
    return instance.checkAPI();
  }
};

// Singleton access
export default DevToolsFactory;
