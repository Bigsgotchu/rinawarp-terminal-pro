#!/usr/bin/env node

/**
 * Interactive setup for monitoring configuration
 */

import readline from 'readline';
import fs from 'fs';
import { execSync } from 'child_process';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = query => new Promise(resolve => rl.question(query, resolve));

async function setup() {
  // Check if .env.monitoring exists
  if (!fs.existsSync('.env.monitoring')) {
    fs.copyFileSync('.env.monitoring.example', '.env.monitoring');
  }

  // LogRocket

  const logrocketId = await question('Enter your LogRocket App ID (or press Enter to skip): ');

  // PostHog

  const posthogKey = await question('Enter your PostHog API Key (or press Enter to skip): ');

  // Update .env.monitoring
  let envContent = fs.readFileSync('.env.monitoring', 'utf8');

  if (logrocketId) {
    envContent = envContent.replace(
      'LOGROCKET_APP_ID=your_logrocket_app_id_here',
      `LOGROCKET_APP_ID=${logrocketId}`
    );
    console.log('✅ LogRocket App ID configured');
  }

  if (posthogKey) {
    envContent = envContent.replace(
      'POSTHOG_SDK_KEY=your_posthog_sdk_key_here',
      `POSTHOG_SDK_KEY=${posthogKey}`
    );
  }

  fs.writeFileSync('.env.monitoring', envContent);

  console.log(
    '2. Add secrets to GitHub: https://github.com/Rinawarp-Terminal/rinawarp-terminal/settings/secrets/actions'
  );

  // Open setup guides
  const openDocs = await question(
    '\nWould you like to open the setup guides in your browser? (y/n): '
  );
  if (openDocs.toLowerCase() === 'y') {
    if (process.platform === 'darwin') {
      execSync('open https://logrocket.com/');
      execSync('open https://posthog.com/');
    }
  }

  rl.close();
}

setup().catch(console.error);
