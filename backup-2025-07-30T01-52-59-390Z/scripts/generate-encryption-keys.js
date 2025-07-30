#!/usr/bin/env node

/**
 * RinaWarp Terminal - Generate Encryption Keys
 * This script generates secure encryption keys for the application
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function generateSecureKey(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function generateSecureSalt() {
  return 'rinawarp-' + crypto.randomBytes(16).toString('hex');
}

function checkExistingEnvFile() {
  const envPath = path.join(dirname(__dirname), '.env');
  return fs.existsSync(envPath);
}

function updateEnvFile(updates) {
  const envPath = path.join(dirname(__dirname), '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update or add each key
  Object.entries(updates).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'gm');
    const line = `${key}=${value}`;

    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, line);
    } else {
      envContent += (envContent.endsWith('\n') ? '' : '\n') + line + '\n';
    }
  });

  fs.writeFileSync(envPath, envContent);
  return envPath;
}

function main() {
  console.log(
    `${colors.cyan}${colors.bright}🔐 RinaWarp Terminal - Encryption Key Generator${colors.reset}\n`
  );

  const encryptionKey = generateSecureKey(32);
  const encryptionSalt = generateSecureSalt();

  console.log(`${colors.green}✅ Generated secure encryption keys:${colors.reset}\n`);
  console.log(`${colors.bright}ENCRYPTION_KEY:${colors.reset}`);
  console.log(`${colors.blue}${encryptionKey}${colors.reset}\n`);
  console.log(`${colors.bright}ENCRYPTION_SALT:${colors.reset}`);
  console.log(`${colors.blue}${encryptionSalt}${colors.reset}\n`);

  // Check if .env file exists
  const hasEnvFile = checkExistingEnvFile();

  if (hasEnvFile) {
    console.log(`${colors.yellow}📝 Found existing .env file${colors.reset}`);
    console.log('Would you like to update it with these keys? (y/n): ');

    process.stdin.once('data', data => {
      const answer = data.toString().trim().toLowerCase();

      if (answer === 'y' || answer === 'yes') {
        const envPath = updateEnvFile({
          ENCRYPTION_KEY: encryptionKey,
          ENCRYPTION_SALT: encryptionSalt,
        });

        console.log(`\n${colors.green}✅ Updated ${envPath}${colors.reset}`);
        console.log(
          `${colors.yellow}⚠️  Make sure to restart your application to use the new keys${colors.reset}`
        );
      } else {
        console.log(`\n${colors.cyan}ℹ️  Add these to your .env file manually:${colors.reset}`);
        console.log(`ENCRYPTION_KEY=${encryptionKey}`);
        console.log(`ENCRYPTION_SALT=${encryptionSalt}`);
      }

      console.log(`\n${colors.bright}Security Tips:${colors.reset}`);
      console.log('• Never commit these keys to version control');
      console.log('• Store them securely in a password manager');
      console.log('• Use different keys for each environment (dev, staging, prod)');
      console.log('• Rotate keys periodically\n');

      process.exit(0);
    });
  } else {
    console.log(`${colors.yellow}📝 No .env file found${colors.reset}`);
    console.log('\nAdd these to your .env file:');
    console.log(`ENCRYPTION_KEY=${encryptionKey}`);
    console.log(`ENCRYPTION_SALT=${encryptionSalt}`);

    console.log(`\n${colors.bright}To create a new .env file:${colors.reset}`);
    console.log('cp .env.example .env');
    console.log('Then add the keys above to the file.\n');
  }
}

// Run the script
main();
