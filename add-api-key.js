import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Simple encryption for the API key
function encrypt(text, password = 'rinawarp-terminal-2025') {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(password, 'salt', 32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

// Function to save config
function saveConfig(provider, apiKey) {
  const configDir = path.join(__dirname, 'config');
  const configFile = path.join(configDir, 'ai-providers.json');

  // Create config directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Load existing config or create new one
  let config = {};
  if (fs.existsSync(configFile)) {
    const content = fs.readFileSync(configFile, 'utf8');
    config = JSON.parse(content);
  }

  // Save the encrypted API key
  config[provider] = {
    apiKey: encrypt(apiKey),
    addedAt: new Date().toISOString(),
    encrypted: true,
  };

  // Write config file
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

  console.log(`\n✅ ${provider} API key saved successfully!`);
  console.log(`📁 Configuration saved to: ${configFile}`);

  // Also create a .env file for convenience
  const envFile = path.join(__dirname, '.env');
  let envContent = '';

  if (fs.existsSync(envFile)) {
    envContent = fs.readFileSync(envFile, 'utf8');
  }

  // Update or add the API key in .env
  const envKey = `${provider.toUpperCase()}_API_KEY`;
  const envLine = `${envKey}=${apiKey}`;

  if (envContent.includes(envKey)) {
    // Replace existing key
    envContent = envContent.replace(new RegExp(`${envKey}=.*`, 'g'), envLine);
  } else {
    // Add new key
    envContent += (envContent.endsWith('\n') ? '' : '\n') + envLine + '\n';
  }

  fs.writeFileSync(envFile, envContent);
  console.log(`📝 Also saved to .env file as ${envKey}`);
}

// Main function
function main() {
  console.log('🔐 Secure API Key Setup\n');

  rl.question('Which provider? (anthropic/openai): ', provider => {
    provider = provider.toLowerCase().trim();

    if (!['anthropic', 'openai'].includes(provider)) {
      console.log('❌ Invalid provider. Please choose "anthropic" or "openai"');
      rl.close();
      return;
    }

    console.log(`\n📋 Paste your ${provider} API key and press Enter:`);

    // Hide the input for security
    rl.stdoutMuted = true;

    rl.question('', apiKey => {
      rl.stdoutMuted = false;

      apiKey = apiKey.trim();

      if (!apiKey) {
        console.log('\n❌ No API key provided');
        rl.close();
        return;
      }

      // Basic validation
      if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
        console.log('\n⚠️  Warning: Anthropic API keys usually start with "sk-ant-"');
      } else if (provider === 'openai' && !apiKey.startsWith('sk-')) {
        console.log('\n⚠️  Warning: OpenAI API keys usually start with "sk-"');
      }

      try {
        saveConfig(provider, apiKey);

        console.log('\n🎉 Setup complete! Your API key is now available to the terminal.');
        console.log('🚀 Restart the terminal to use the new configuration.\n');
      } catch (error) {
        console.error('\n❌ Error saving API key:', error.message);
      }

      rl.close();
    });

    // Override stdin to hide password input
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted) rl.output.write('*');
      else rl.output.write(stringToWrite);
    };
  });
}

// Run the script
main();

// Handle cleanup
rl.on('close', () => {
  process.exit(0);
});
