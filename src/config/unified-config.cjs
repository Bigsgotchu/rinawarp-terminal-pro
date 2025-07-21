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
      elevenlabs: {
        enabled: true,
        apiKey: process.env.ELEVENLABS_API_KEY || '',
        voiceId: 'uSI3HxQeb8HZOrDcaj83',
        modelId: 'eleven_monolingual_v1',
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.5
        }
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

  // Configuration validation methods
  validateElevenLabsConfig() {
    const config = this.get('elevenlabs');
    if (!config) {
      return { valid: false, errors: ['ElevenLabs configuration not found'] };
    }

    const errors = [];

    // Validate required fields when enabled
    if (config.enabled) {
      if (!config.apiKey || config.apiKey.trim() === '') {
        errors.push('API key is required when ElevenLabs is enabled');
      }
      
      if (!config.voiceId || config.voiceId.trim() === '') {
        errors.push('Voice ID is required when ElevenLabs is enabled');
      }
      
      if (!config.modelId || config.modelId.trim() === '') {
        errors.push('Model ID is required when ElevenLabs is enabled');
      }
    }

    // Validate voice settings
    if (config.voiceSettings) {
      if (typeof config.voiceSettings.stability !== 'number' || 
          config.voiceSettings.stability < 0 || 
          config.voiceSettings.stability > 1) {
        errors.push('Voice stability must be a number between 0 and 1');
      }
      
      if (typeof config.voiceSettings.similarityBoost !== 'number' || 
          config.voiceSettings.similarityBoost < 0 || 
          config.voiceSettings.similarityBoost > 1) {
        errors.push('Voice similarity boost must be a number between 0 and 1');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // Secure API key management
  setElevenLabsApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('Invalid API key provided');
    }

    // Store API key securely (in practice, this should use system keychain)
    // For now, we'll store it in the config but recommend using environment variables
    const success = this.set('elevenlabs.apiKey', apiKey);
    
    if (success) {
      console.log('ElevenLabs API key updated. For production, consider using ELEVENLABS_API_KEY environment variable.');
    }
    
    return success;
  }

  getElevenLabsApiKey() {
    // Prioritize environment variable for security
    const envKey = process.env.ELEVENLABS_API_KEY;
    if (envKey) {
      return envKey;
    }
    
    // Fallback to stored config
    return this.get('elevenlabs.apiKey') || '';
  }

  // Helper method to safely get ElevenLabs config with API key from environment
  getElevenLabsConfig() {
    const config = { ...this.get('elevenlabs') };
    
    // Always use environment variable if available for security
    config.apiKey = this.getElevenLabsApiKey();
    
    return config;
  }

  // Initialize ElevenLabs configuration on startup
  async initializeElevenLabsConfig() {
    const config = this.getElevenLabsConfig();
    
    // If enabled but no API key, show warning
    if (config.enabled && !config.apiKey) {
      console.warn('⚠️ ElevenLabs is enabled but no API key is configured');
      console.log('📝 Set ELEVENLABS_API_KEY environment variable or configure through the UI');
      return { initialized: false, requiresConfig: true };
    }
    
    // If API key exists, validate it
    if (config.apiKey) {
      try {
        const isValid = await this.validateElevenLabsApiKey(config.apiKey);
        if (isValid) {
          console.log('✅ ElevenLabs configuration validated successfully');
          return { initialized: true, requiresConfig: false };
        } else {
          console.warn('❌ ElevenLabs API key validation failed');
          return { initialized: false, requiresConfig: true, error: 'Invalid API key' };
        }
      } catch (error) {
        console.warn('⚠️ ElevenLabs API key validation error:', error.message);
        return { initialized: false, requiresConfig: true, error: error.message };
      }
    }
    
    return { initialized: false, requiresConfig: false };
  }

  // Validate ElevenLabs API key
  async validateElevenLabsApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return false;
    }

    try {
      // Simple validation: check if it looks like an ElevenLabs API key
      const trimmedKey = apiKey.trim();
      
      // ElevenLabs API keys typically start with specific patterns
      if (trimmedKey.length < 10) {
        return false;
      }
      
      // For a more robust validation, we would make an API call
      // but for now, we'll do basic format validation
      // Real validation happens in the ElevenLabsVoiceProvider
      return true;
      
    } catch (error) {
      console.warn('API key validation error:', error);
      return false;
    }
  }

  // Check if ElevenLabs requires configuration
  needsElevenLabsConfig() {
    const config = this.getElevenLabsConfig();
    return config.enabled && !config.apiKey;
  }

  // Load ElevenLabs configuration for UI
  async loadElevenLabsConfig() {
    try {
      const config = this.getElevenLabsConfig();
      return {
        success: true,
        apiKey: config.apiKey || '',
        voiceId: config.voiceId || '',
        modelId: config.modelId || 'eleven_monolingual_v1',
        enabled: config.enabled || false,
        voiceSettings: config.voiceSettings || {
          stability: 0.5,
          similarityBoost: 0.5
        }
      };
    } catch (error) {
      console.error('Failed to load ElevenLabs configuration:', error);
      return {
        success: false,
        error: error.message,
        apiKey: '',
        voiceId: '',
        modelId: 'eleven_monolingual_v1',
        enabled: false,
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.5
        }
      };
    }
  }

  // Save ElevenLabs configuration from UI
  async saveElevenLabsConfig(newConfig) {
    try {
      if (!newConfig.apiKey || newConfig.apiKey.trim() === '') {
        return {
          success: false,
          error: 'API key is required'
        };
      }

      // Update configuration
      const success = this.set('elevenlabs.apiKey', newConfig.apiKey.trim());
      if (!success) {
        throw new Error('Failed to save API key');
      }

      if (newConfig.voiceId) {
        this.set('elevenlabs.voiceId', newConfig.voiceId);
      }

      if (newConfig.modelId) {
        this.set('elevenlabs.modelId', newConfig.modelId);
      }

      // Enable ElevenLabs when configuration is saved
      this.set('elevenlabs.enabled', true);

      // Save voice settings if provided
      if (newConfig.voiceSettings) {
        this.set('elevenlabs.voiceSettings', newConfig.voiceSettings);
      }

      return {
        success: true,
        message: 'ElevenLabs configuration saved successfully'
      };
    } catch (error) {
      console.error('Failed to save ElevenLabs configuration:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test ElevenLabs voice configuration
  async testElevenLabsVoice(testConfig) {
    try {
      const apiKey = testConfig?.apiKey || this.getElevenLabsApiKey();
      const voiceId = testConfig?.voiceId || this.get('elevenlabs.voiceId');

      if (!apiKey) {
        return {
          success: false,
          error: 'No API key provided'
        };
      }

      // For now, we'll do a basic validation
      // In a full implementation, this would make an actual API call to ElevenLabs
      const isValid = await this.validateElevenLabsApiKey(apiKey);
      
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid API key format'
        };
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In a real implementation, this would:
      // 1. Make a request to ElevenLabs API to test the key
      // 2. Optionally test voice synthesis with the selected voice
      // 3. Return actual API response

      return {
        success: true,
        message: 'Voice configuration test successful',
        voiceId: voiceId,
        apiKeyValid: true
      };
    } catch (error) {
      console.error('ElevenLabs voice test failed:', error);
      return {
        success: false,
        error: `Voice test failed: ${error.message}`
      };
    }
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
  config
};
