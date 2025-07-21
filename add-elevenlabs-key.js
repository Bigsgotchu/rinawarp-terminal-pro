#!/usr/bin/env node

import fs from 'fs';
import readline from 'readline';
import path from 'path';
import os from 'os';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function addElevenLabsKey() {
  console.log('🎙️  ElevenLabs API Key Setup\n');

  const configPath = path.join(os.homedir(), '.rinawarp-terminal', 'config.json');

  try {
    // Read current config
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    console.log('📋 Paste your ElevenLabs API key and press Enter:');
    console.log('   (It should be a long string of letters and numbers)\n');

    const apiKey = await question('API Key: ');

    // Basic validation
    if (!apiKey || apiKey.length < 20) {
      console.log('\n❌ Invalid API key format');
      rl.close();
      return;
    }

    // Update config
    config.elevenlabs.apiKey = apiKey;
    config.elevenlabs.enabled = true;
    config.features.voiceControl = true;

    // Save config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log('\n✅ ElevenLabs API key added successfully!');
    console.log('\n🎙️  Voice features have been enabled:');
    console.log('   - Voice ID: ' + config.elevenlabs.voiceId);
    console.log('   - Model: ' + config.elevenlabs.modelId);
    console.log('   - Stability: ' + config.elevenlabs.voiceSettings.stability);
    console.log('   - Similarity: ' + config.elevenlabs.voiceSettings.similarityBoost);

    console.log('\n🚀 Next steps:');
    console.log('   1. Restart RinaWarp Terminal');
    console.log('   2. Voice features should now work without glitching');
    console.log('   3. Try voice commands or AI assistant with voice');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }

  rl.close();
}

// Also create a quick re-enable script
const reEnableScript = `#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import os from 'os';

const configPath = path.join(os.homedir(), '.rinawarp-terminal', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (config.elevenlabs.apiKey && config.elevenlabs.apiKey.length > 20) {
  config.elevenlabs.enabled = true;
  config.features.voiceControl = true;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('✅ Voice features re-enabled!');
} else {
  console.log('❌ No valid ElevenLabs API key found. Run add-elevenlabs-key.js first.');
}
`;

fs.writeFileSync('enable-voice.js', reEnableScript);
fs.chmodSync('enable-voice.js', '755');

addElevenLabsKey().catch(console.error);
