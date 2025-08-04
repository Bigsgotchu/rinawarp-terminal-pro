#!/usr/bin/env node
import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function addApiKey() {
  const provider = await question('Which provider? (anthropic/openai): ');

  if (!['anthropic', 'openai'].includes(provider.toLowerCase())) {
    console.log('❌ Invalid provider. Use "anthropic" or "openai"');
    rl.close();
    return;
  }

  const apiKey = await question('');

  // Validate key format
  if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
    rl.close();
    return;
  }

  if (provider === 'openai' && !apiKey.startsWith('sk-')) {
    rl.close();
    return;
  }

  // Read current .env
  const envPath = join(__dirname, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Update the appropriate key
  const keyName = provider.toUpperCase() + '_API_KEY';
  const regex = new RegExp(`^${keyName}=.*$`, 'm');

  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `${keyName}=${apiKey}`);
  } else {
  }

  // Write back
  fs.writeFileSync(envPath, envContent);

  rl.close();
}

addApiKey().catch(console.error);
