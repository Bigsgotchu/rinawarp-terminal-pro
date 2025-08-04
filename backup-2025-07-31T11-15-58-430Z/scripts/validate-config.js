import dotenvFlow from 'dotenv-flow';
// import Joi from 'joi'; // Currently unused
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper function to load environment variables
function loadEnvConfig(nodeEnv) {
  dotenvFlow.config({
    path: path.join(__dirname, '..'),
    node_env: nodeEnv,
    default_node_env: 'development',
  });
}

// Import the schema from the main config module
// import config from '../config/index.js'; // Currently unused

// Validation script
async function validateConfig() {
  console.log('Validating configuration...');

  // Get available .env files
  const envFiles = fs
    .readdirSync(path.join(__dirname, '..'))
    .filter(file => file.startsWith('.env'));

  let hasErrors = false;

  // Validate each environment
  for (const envFile of envFiles) {
    // Extract environment name from filename (e.g., '.env.development' -> 'development')
    const envName = envFile.split('.env.')[1];

    if (!envName) continue; // Skip .env files without a specific environment

    console.log(`\nValidating ${envName} environment configuration...`);

    // Load environment-specific variables
    loadEnvConfig(envName);

    try {
      // Re-import config to get environment-specific values
      const _configModule = await import('../config/index.js?update=' + Date.now());
      console.log(`✓ ${envName} environment configuration is valid`);
    } catch (error) {
      hasErrors = true;
      console.error(`\n❌ Configuration validation failed for ${envName} environment:`);
      if (error.details) {
        error.details.forEach(detail => {
          console.error(`  - ${detail.message}`);
        });
      } else {
        console.error(error.message);
      }
    }
  }

  if (hasErrors) {
    console.error('\n❌ Configuration validation failed');
    process.exit(1);
  } else {
    console.log('\n✓ All configuration files are valid');
  }
}

// Run validation
validateConfig().catch(error => {
  console.error('Validation script error:', error);
  process.exit(1);
});
