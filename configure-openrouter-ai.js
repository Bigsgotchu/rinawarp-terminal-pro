#!/usr/bin/env node

/**
 * Configure RinaWarp Terminal to use OpenRouter
 * Sets DeepSeek as the default AI provider
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Update the unified config to use OpenRouter
const configPath = path.join(__dirname, 'src', 'config', 'unified-config.cjs');

// Check if unified-config.cjs exists
if (!fs.existsSync(configPath)) {
  console.error('❌ unified-config.cjs not found at:', configPath);
  process.exit(1);
}

// Read the current config
const configContent = fs.readFileSync(configPath, 'utf8');

// Create a backup
const backupPath = configPath + '.backup-' + Date.now();
fs.writeFileSync(backupPath, configContent);

// Update the config to set deepseek as default provider
const updatedConfig = configContent
  .replace(/(ai:\s*{[^}]*provider:\s*['"])([^'"]+)(['"])/g, '$1deepseek$3')
  .replace(/(ai:\s*{[^}]*model:\s*['"])([^'"]+)(['"])/g, '$1deepseek/deepseek-r1-0528:free$3');

// If the replacements didn't work (different format), try a different approach
if (updatedConfig === configContent) {
  console.log('⚠️  Config format different than expected, updating .env instead...');

  // Update .env file
  const envPath = path.join(__dirname, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Update or add AI_PROVIDER and DEFAULT_MODEL
  if (envContent.includes('AI_PROVIDER=')) {
    envContent = envContent.replace(/AI_PROVIDER=.*/g, 'AI_PROVIDER=deepseek');
  } else {
    envContent += '\nAI_PROVIDER=deepseek';
  }

  if (envContent.includes('DEFAULT_MODEL=')) {
    envContent = envContent.replace(
      /DEFAULT_MODEL=.*/g,
      'DEFAULT_MODEL=deepseek/deepseek-r1-0528:free'
    );
  } else {
    envContent += '\nDEFAULT_MODEL=deepseek/deepseek-r1-0528:free';
  }

  fs.writeFileSync(envPath, envContent);
} else {
  fs.writeFileSync(configPath, updatedConfig);
}

// Create a test file to verify the configuration
const testScript = `
import { UnifiedAIClient } from './src/ai-providers/unified-ai-client.js';

async function testConfiguration() {
  const client = new UnifiedAIClient();
  await client.initialize();
  
  const activeProvider = client.config.getActiveProvider();
  
  // Test a simple chat
  try {
    const response = await client.chat('Say "OpenRouter is configured!" and nothing else.');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testConfiguration();
`;

fs.writeFileSync(path.join(__dirname, 'test-ai-config.js'), testScript);
