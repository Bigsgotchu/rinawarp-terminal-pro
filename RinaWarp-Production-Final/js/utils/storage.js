/**
 * Storage Manager - Handles application configuration and data persistence
 */

import { SecureStorage } from './secureStorage.js';

export class StorageManager {
  constructor() {
    this.initialized = false;
    this.secureStorage = null;
    this.config = {};
    this.aiConfig = {};
  }

  async init() {
    console.log('💾 Initializing Storage Manager...');

    // Initialize secure storage
    this.secureStorage = new SecureStorage();
    await this.secureStorage.init();

    // Load existing configuration
    await this.loadConfiguration();

    this.initialized = true;
    console.log('✅ Storage Manager initialized');
  }

  async loadConfiguration() {
    try {
      // Load main configuration
      const storedConfig = await this.secureStorage.get('app-config');
      if (storedConfig) {
        this.config = { ...this.getDefaultConfig(), ...storedConfig };
      } else {
        this.config = this.getDefaultConfig();
      }

      // Load AI configuration
      const storedAIConfig = await this.secureStorage.get('ai-config');
      if (storedAIConfig) {
        this.aiConfig = storedAIConfig;
      } else {
        this.aiConfig = this.getDefaultAIConfig();
      }

      console.log('✅ Configuration loaded');
    } catch (error) {
      console.warn('Failed to load configuration:', error);
      this.config = this.getDefaultConfig();
      this.aiConfig = this.getDefaultAIConfig();
    }
  }

  getDefaultConfig() {
    return {
      theme: 'dark',
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        screenReader: false,
        fontSize: 'medium',
      },
      terminal: {
        fontSize: 14,
        fontFamily: 'Monaco, Consolas, monospace',
        cursorStyle: 'block',
        scrollback: 1000,
      },
      ui: {
        animations: true,
        notifications: true,
        tooltips: true,
      },
      performance: {
        monitoring: true,
        lazy_loading: true,
      },
    };
  }

  getDefaultAIConfig() {
    return {
      provider: 'claude',
      model: 'claude-3-sonnet',
      temperature: 0.7,
      maxTokens: 1000,
      streaming: true,
      contextWindow: 4000,
    };
  }

  async getConfig() {
    if (!this.initialized) {
      await this.init();
    }
    return this.config;
  }

  async setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await this.secureStorage.set('app-config', this.config);
    console.log('✅ Configuration saved');
  }

  async getAIConfig() {
    if (!this.initialized) {
      await this.init();
    }
    return this.aiConfig;
  }

  async setAIConfig(newAIConfig) {
    this.aiConfig = { ...this.aiConfig, ...newAIConfig };
    await this.secureStorage.set('ai-config', this.aiConfig);
    console.log('✅ AI configuration saved');
  }

  async getUserData(key) {
    return await this.secureStorage.get(`user-${key}`);
  }

  async setUserData(key, data) {
    await this.secureStorage.set(`user-${key}`, data);
  }

  async getTerminalHistory() {
    return (await this.secureStorage.get('terminal-history')) || [];
  }

  async setTerminalHistory(history) {
    // Keep only last 100 commands
    const limitedHistory = history.slice(-100);
    await this.secureStorage.set('terminal-history', limitedHistory);
  }

  async addToTerminalHistory(command) {
    const history = await this.getTerminalHistory();
    history.push({
      command,
      timestamp: Date.now(),
    });
    await this.setTerminalHistory(history);
  }

  async clearTerminalHistory() {
    await this.secureStorage.remove('terminal-history');
  }

  async exportData() {
    const data = {
      config: this.config,
      aiConfig: this.aiConfig,
      history: await this.getTerminalHistory(),
      timestamp: Date.now(),
    };
    return JSON.stringify(data, null, 2);
  }

  async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);

      if (data.config) {
        await this.setConfig(data.config);
      }

      if (data.aiConfig) {
        await this.setAIConfig(data.aiConfig);
      }

      if (data.history) {
        await this.setTerminalHistory(data.history);
      }

      console.log('✅ Data imported successfully');
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }

  async clearAll() {
    await this.secureStorage.clear();
    this.config = this.getDefaultConfig();
    this.aiConfig = this.getDefaultAIConfig();
    console.log('✅ All data cleared');
  }
}
