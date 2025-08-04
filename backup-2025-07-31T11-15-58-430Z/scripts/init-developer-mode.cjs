#!/usr/bin/env node
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal - Developer Mode Initialization
 * This script permanently sets up the terminal in developer mode with all features unlocked.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('os');

console.log('🔧 Initializing RinaWarp Terminal Developer Mode...');

// Set up developer configuration
const configDir = path.join(os.homedir(), '.rinawarp-terminal');
const configFile = path.join(configDir, 'config.json');

// Ensure config directory exists
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
  console.log('✅ Created config directory:', configDir);
}

// Developer configuration with all features enabled
const developerConfig = {
  terminal: {
    shell: process.platform === 'win32' ? 'pwsh.exe' : process.env.SHELL || '/bin/bash',
    fontSize: 14,
    theme: 'developer-dark',
    scrollback: 5000,
  },
  ui: {
    showWelcomeScreen: true,
    enableDevTools: true,
    windowWidth: 1400,
    windowHeight: 900,
  },
  features: {
    aiAssistant: true,
    voiceControl: true,
    advancedFeatures: true,
    developerMode: true,
    experimentalFeatures: true,
  },
  performance: {
    enableGPUAcceleration: true,
    reducedMotion: false,
    enableAdvancedMetrics: true,
  },
  license: {
    type: 'developer',
    unlimited: true,
    allFeatures: true,
  },
  elevenlabs: {
    enabled: true,
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    voiceId: 'uSI3HxQeb8HZOrDcaj83',
    modelId: 'eleven_monolingual_v1',
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.5,
    },
  },
  developer: {
    debugMode: true,
    showPerformanceMetrics: true,
    enableExperimentalAPIs: true,
    unlockAllFeatures: true,
    bypassRestrictions: true,
  },
};

try {
  // Write the developer configuration
  fs.writeFileSync(configFile, JSON.stringify(developerConfig, null, 2));
  console.log('✅ Developer configuration saved:', configFile);

  // Set localStorage overrides for browser-side license manager
  const localStorageOverrides = `
// RinaWarp Terminal - Developer License Override
localStorage.setItem('rinawarp_license_type', 'developer');
localStorage.setItem('rinawarp_license_key', 'dev-${Date.now()}');
localStorage.setItem('rinawarp_developer_mode', 'true');
localStorage.setItem('rinawarp_all_features_enabled', 'true');
console.log('🎉 RinaWarp Terminal Developer Mode Activated!');
`;

  const overrideFile = path.join(configDir, 'developer-override.js');
  fs.writeFileSync(overrideFile, localStorageOverrides);
  console.log('✅ Developer overrides created:', overrideFile);

  // Create a .env file for environment variables
  const envFile = path.join(process.cwd(), '.env.development');
  const envContent = `# RinaWarp Terminal Developer Mode
NODE_ENV=development
DEVELOPER_MODE=true
LICENSE_TYPE=developer
ENABLE_ALL_FEATURES=true
ELEVENLABS_ENABLED=true
# Add your ElevenLabs API key here:
# ELEVENLABS_API_KEY=your_api_key_here
`;

  if (!fs.existsSync(envFile)) {
    fs.writeFileSync(envFile, envContent);
    console.log('✅ Development environment file created:', envFile);
  }

  console.log('\n🎉 RinaWarp Terminal Developer Mode Setup Complete!');
  console.log('\n📋 What\'s enabled in Developer Mode:');
  console.log('   • 🧠 Unlimited AI Assistant');
  console.log('   • 🎤 Voice Control (ElevenLabs)');
  console.log('   • 🔧 All Advanced Features');
  console.log('   • 📊 Performance Monitoring');
  console.log('   • 🎨 All Themes & Customization');
  console.log('   • 🔍 Debug Tools & Dev Console');
  console.log('   • ⚡ Experimental Features');
  console.log('   • 🚀 No Usage Restrictions');

  console.log('\n🚀 How to run:');
  console.log('   • Development: npm run dev:full');
  console.log('   • Build Developer Version: npm run build:dev');
  console.log('   • Regular Run: npm start');

  console.log('\n💡 Optional Setup:');
  console.log('   • Set ELEVENLABS_API_KEY in .env.development for voice features');
  console.log('   • All features are permanently unlocked');
  console.log('   • No license validation or restrictions');
} catch (error) {
  console.error('❌ Failed to initialize developer mode:', error);
  process.exit(1);
}
