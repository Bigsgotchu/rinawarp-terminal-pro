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
  console.log('🔐 Secure API Key Setup\n');

  const provider = await question('Which provider? (anthropic/openai): ');

  if (!['anthropic', 'openai'].includes(provider.toLowerCase())) {
    console.log('❌ Invalid provider. Use "anthropic" or "openai"');
    rl.close();
    return;
  }

  console.log('\n📋 Paste your API key and press Enter:');
  const apiKey = await question('');

  // Validate key format
  if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
    console.log('❌ Invalid Anthropic key format. Should start with sk-ant-');
    rl.close();
    return;
  }

  if (provider === 'openai' && !apiKey.startsWith('sk-')) {
    console.log('❌ Invalid OpenAI key format. Should start with sk-');
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
    console.log(`\n✅ Updated ${keyName} in .env file`);
  } else {
    console.log(`\n❌ Could not find ${keyName} in .env file`);
  }

  // Write back
  fs.writeFileSync(envPath, envContent);

  console.log('\n🎉 API key added successfully!');
  console.log('You can now test it with: node test-' + provider + '.js');

  rl.close();
}

addApiKey().catch(console.error);
