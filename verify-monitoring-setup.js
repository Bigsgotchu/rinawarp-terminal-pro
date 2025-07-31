#!/usr/bin/env node

/**
 * Verify Monitoring Setup
 * Checks that all monitoring services are properly configured
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
config({ path: '.env.monitoring' });
config({ path: '.env.local' });
config({ path: '.env' });

console.log('🔍 Verifying Monitoring Setup...\n');

const checks = {
  sentry: {
    name: 'Sentry',
    required: ['SENTRY_DSN'],
    optional: ['SENTRY_ENVIRONMENT', 'SENTRY_TRACES_SAMPLE_RATE', 'SENTRY_PROFILES_SAMPLE_RATE'],
  },
  logrocket: {
    name: 'LogRocket',
    required: ['LOGROCKET_APP_ID'],
    optional: [],
  },
  posthog: {
    name: 'PostHog (Seer)',
    required: ['POSTHOG_SDK_KEY'],
    optional: ['ENABLE_SEER'],
  },
  telemetry: {
    name: 'Telemetry',
    required: [],
    optional: ['ENABLE_TELEMETRY', 'ENABLE_ANALYTICS', 'LOG_LEVEL'],
  },
  github: {
    name: 'GitHub Secrets',
    note: 'These should be set in GitHub repository settings, not in local .env files',
    secrets: ['SONAR_TOKEN', 'GITHUB_TOKEN'],
  },
};

let allGood = true;

// Check each service
Object.entries(checks).forEach(([service, config]) => {
  console.log(`\n📦 ${config.name}:`);

  if (config.secrets) {
    console.log(`   ℹ️  ${config.note}`);
    config.secrets.forEach(secret => {
      console.log(`   - ${secret}: Set in GitHub Secrets`);
    });
    return;
  }

  // Check required vars
  config.required.forEach(varName => {
    if (process.env[varName]) {
      console.log(`   ✅ ${varName}: Configured`);
    } else {
      console.log(`   ❌ ${varName}: Missing (REQUIRED)`);
      allGood = false;
    }
  });

  // Check optional vars
  config.optional.forEach(varName => {
    if (process.env[varName]) {
      console.log(`   ✅ ${varName}: ${process.env[varName]}`);
    } else {
      console.log(`   ⚠️  ${varName}: Not set (optional)`);
    }
  });
});

// Check for config files
console.log('\n📄 Configuration Files:');
const configFiles = [
  { path: '.env.monitoring', required: false },
  { path: 'sonar-project.properties', required: true },
  { path: '.releaserc.json', required: true },
  { path: '.versionrc.json', required: true },
  { path: '.github/dependabot.yml', required: true },
];

configFiles.forEach(file => {
  const fullPath = path.join(__dirname, file.path);
  if (fs.existsSync(fullPath)) {
    console.log(`   ✅ ${file.path}: Found`);
  } else {
    if (file.required) {
      console.log(`   ❌ ${file.path}: Missing (REQUIRED)`);
      allGood = false;
    } else {
      console.log(`   ⚠️  ${file.path}: Not found (optional)`);
    }
  }
});

// Check local services
console.log('\n🌐 Local Services:');
fetch('http://localhost:8081/health')
  .then(res => {
    if (res.status === 200) {
      console.log('   ✅ Nginx: Running on http://localhost:8081');
    } else {
      console.log('   ⚠️  Nginx: Running but health check failed');
    }
  })
  .catch(() => {
    console.log('   ❌ Nginx: Not running (run: brew services start nginx)');
  });

// Summary
console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('✅ All required configurations are in place!');
  console.log('\nNext steps:');
  console.log(
    '1. Add secrets to GitHub: https://github.com/Rinawarp-Terminal/rinawarp-terminal/settings/secrets/actions'
  );
  console.log(
    '2. Monitor workflow: https://github.com/Rinawarp-Terminal/rinawarp-terminal/actions'
  );
} else {
  console.log('❌ Some required configurations are missing!');
  console.log('\nTo fix:');
  console.log('1. Copy .env.monitoring.example to .env.monitoring');
  console.log('2. Fill in the missing values');
  console.log('3. Add GitHub secrets as noted above');
}
console.log('='.repeat(50));
