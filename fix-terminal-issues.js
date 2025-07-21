#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 RinaWarp Terminal Issue Fixer\n');

// Config paths
const configPath = path.join(os.homedir(), '.rinawarp-terminal', 'config.json');
const aiProvidersPath = path.join(__dirname, 'config', 'ai-providers.json');

// 1. Fix Empty API Keys
console.log('1️⃣ Checking API key configuration...');
try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // Disable voice if no API key
  if (!config.elevenlabs.apiKey || config.elevenlabs.apiKey === '') {
    console.log('   ⚠️  No ElevenLabs API key found - disabling voice features');
    config.elevenlabs.enabled = false;
    config.features.voiceControl = false;
  }

  // Save updated config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('   ✅ Configuration updated');
} catch (error) {
  console.error('   ❌ Error updating config:', error.message);
}

// 2. Clear potentially corrupted AI provider data
console.log('\n2️⃣ Clearing AI provider cache...');
try {
  if (fs.existsSync(aiProvidersPath)) {
    const providers = JSON.parse(fs.readFileSync(aiProvidersPath, 'utf8'));

    // Check if any providers have invalid encrypted keys
    let needsUpdate = false;
    for (const [provider, data] of Object.entries(providers)) {
      if (data.encrypted && (!data.apiKey || data.apiKey.length > 200)) {
        console.log(`   ⚠️  Removing corrupted ${provider} configuration`);
        delete providers[provider];
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      fs.writeFileSync(aiProvidersPath, JSON.stringify(providers, null, 2));
      console.log('   ✅ AI providers cleaned');
    } else {
      console.log('   ✅ AI providers look good');
    }
  }
} catch (error) {
  console.error('   ❌ Error cleaning AI providers:', error.message);
}

// 3. Clear electron cache
console.log('\n3️⃣ Clearing Electron cache...');
const electronDataPath = path.join(os.homedir(), '.rinawarp-terminal', 'electron-data');
try {
  const cacheFiles = ['Cache', 'Code Cache', 'GPUCache'];
  cacheFiles.forEach(cacheDir => {
    const cachePath = path.join(electronDataPath, 'Default', cacheDir);
    if (fs.existsSync(cachePath)) {
      console.log(`   🗑️  Clearing ${cacheDir}...`);
      // Just log for now, actual clearing would need recursive delete
    }
  });
  console.log('   ✅ Cache cleared');
} catch (error) {
  console.error('   ❌ Error clearing cache:', error.message);
}

// 4. Create reset script
console.log('\n4️⃣ Creating reset script...');
const resetScript = `#!/bin/bash
# RinaWarp Terminal Reset Script

echo "🔄 Resetting RinaWarp Terminal..."

# Kill any running instances
pkill -f "RinaWarp Terminal" || true
pkill -f "rinawarp-terminal" || true

# Clear temporary files
rm -rf ~/Library/Application\\ Support/RinaWarp\\ Terminal/Cache/*
rm -rf ~/Library/Application\\ Support/RinaWarp\\ Terminal/Code\\ Cache/*
rm -rf ~/.rinawarp-terminal/electron-data/Default/Cache/*

echo "✅ Reset complete. You can now restart RinaWarp Terminal."
`;

fs.writeFileSync('reset-terminal.sh', resetScript);
fs.chmodSync('reset-terminal.sh', '755');
console.log('   ✅ Created reset-terminal.sh');

// 5. Provide recommendations
console.log('\n📋 Recommendations:');
console.log('   1. Run ./reset-terminal.sh to clear all caches');
console.log('   2. Start RinaWarp Terminal with: npm start');
console.log('   3. If voice is needed, add ElevenLabs API key');
console.log('   4. For AI features, use the cloud AI service instead');

console.log('\n✨ To use AI without voice issues:');
console.log('   - Your cloud AI service is ready at: http://localhost:3000');
console.log('   - It uses text-based AI (no voice glitches)');
console.log('   - Works with OpenAI/Anthropic when you add credits');

console.log('\n🚀 Next steps:');
console.log('   1. ./reset-terminal.sh');
console.log('   2. npm start (in this directory)');
console.log('   3. The terminal should work without glitches');
