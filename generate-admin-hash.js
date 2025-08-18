#!/usr/bin/env node
/**
 * Generate secure admin password hash for RinaWarp Terminal
 */

import bcrypt from 'bcrypt';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askPassword() {
  return new Promise(resolve => {
    rl.question('Enter admin password (will be hidden): ', password => {
      resolve(password);
    });
  });
}

async function generateHash() {
  const password = await askPassword();

  if (!password || password.length < 8) {
    console.log('❌ Password must be at least 8 characters long');
    process.exit(1);
  }

  const saltRounds = 12; // High security
  const _hash = await bcrypt.hash(password, saltRounds);

  console.log('✅ Generated hash:');

  rl.close();
}

generateHash().catch(error => {
  console.error('❌ Error generating hash:', error);
  process.exit(1);
});
