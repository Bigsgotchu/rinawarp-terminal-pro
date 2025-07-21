#!/usr/bin/env node
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
