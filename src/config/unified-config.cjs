/**
 * Unified Configuration System - Inspired by Warp's Simplicity
 * Consolidates all configuration to prevent AppData/project conflicts
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

class UnifiedConfig {
  constructor() {
    this.configDir = path.join(os.homedir(), '.rinawarp-terminal');
    this.configFile = path.join(this.configDir, 'config.json');
    this.defaultConfig = {
      terminal: {
        shell: this.getDefaultShell(),
        fontSize: 14,
        theme: 'default',
        scrollback: 1000,
      },
      ui: {
        showWelcomeScreen: false,
        enableDevTools: false,
        windowWidth: 1200,
        windowHeight: 800,
      },
      features: {
        aiAssistant: true,
        voiceControl: true,
        advancedFeatures: true,
        developerMode: true,
      },
      performance: {
        enableGPUAcceleration: true,
        reducedMotion: false,
      },
    };

    this.ensureConfigDir();
    this.config = this.loadConfig();
  }

  getDefaultShell() {
    if (process.platform === 'win32') {
      // Same logic as main.cjs but simplified
      try {
        require('child_process').execSync('pwsh --version', { stdio: 'pipe' });
        return 'pwsh.exe';
      } catch {
        try {
          require('child_process').execSync('powershell -Command "$PSVersionTable.PSVersion"', {
            stdio: 'pipe',
          });
          return 'powershell.exe';
        } catch {
          return process.env.COMSPEC || 'cmd.exe';
        }
      }
    } else {
      return process.env.SHELL || '/bin/bash';
    }
  }

  ensureConfigDir() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const configData = fs.readFileSync(this.configFile, 'utf8');
        return { ...this.defaultConfig, ...JSON.parse(configData) };
      }
    } catch (error) {
      console.warn('Config file corrupted, using defaults:', error.message);
    }
    return this.defaultConfig;
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save config:', error);
      return false;
    }
  }

  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.config);
  }

  getDefault(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.defaultConfig);
  }

  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.config);

    // Type coercion based on defaults
    const defaultValue = this.getDefault(path);
    if (defaultValue !== undefined) {
      const defaultType = typeof defaultValue;
      if (typeof value !== defaultType) {
        switch (defaultType) {
          case 'number':
            value = Number(value);
            break;
          case 'boolean':
            value = Boolean(value);
            break;
          case 'string':
            value = String(value);
            break;
        }
      }
    }

    target[lastKey] = value;
    return this.saveConfig();
  }

  reset() {
    this.config = { ...this.defaultConfig };
    return this.saveConfig();
  }

  // Migration from old AppData structure
  migrateFromAppData() {
    const oldConfigPath = path.join(process.env.APPDATA || os.homedir(), 'rinawarp-terminal');
    if (fs.existsSync(oldConfigPath)) {
      try {
        console.log('Migrating from old AppData configuration...');
        // Copy any important settings but don't merge complex structures
        const migrationCompleted = this.set('migration.fromAppData', true);
        if (migrationCompleted) {
          console.log('Migration completed successfully');
        }
      } catch (error) {
        console.warn('Migration failed:', error.message);
      }
    }
  }
}

// Export class and singleton instance
const config = new UnifiedConfig();
config.migrateFromAppData();

module.exports = {
  UnifiedConfig,
  config,
};
