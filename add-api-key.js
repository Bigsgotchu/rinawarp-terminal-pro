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
function encrypt(text) {
  const algorithm = 'aes-256-cbc';
  // Use environment variable or generate a secure key
  const password = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

  // If no encryption key is set, warn the user
  if (!process.env.ENCRYPTION_KEY) {
    console.warn('⚠️  Warning: ENCRYPTION_KEY not set in environment. Using a random key.');
    console.warn('   Set ENCRYPTION_KEY in your .env file for persistent encryption.');
  }

  const salt = process.env.ENCRYPTION_SALT || 'rinawarp-salt-' + Date.now();
  const key = crypto.scryptSync(password, salt, 32);
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
}

// Main function
function main() {
  rl.question('Which provider? (anthropic/openai): ', provider => {
    provider = provider.toLowerCase().trim();

    if (!['anthropic', 'openai'].includes(provider)) {
      console.log('❌ Invalid provider. Please choose "anthropic" or "openai"');
      rl.close();
      return;
    }

    // Hide the input for security
    rl.stdoutMuted = true;

    rl.question('', apiKey => {
      rl.stdoutMuted = false;

      apiKey = apiKey.trim();

      if (!apiKey) {
        rl.close();
        return;
      }

      // Basic validation
      if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
      } else if (provider === 'openai' && !apiKey.startsWith('sk-')) {
      }

      try {
        saveConfig(provider, apiKey);
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
