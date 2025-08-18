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
Object.entries(checks).forEach(([_service, config]) => {

  if (config.secrets) {
    config.secrets.forEach(secret => {
    });
    return;
  }

  // Check required vars
  config.required.forEach(varName => {
    if (process.env[varName]) {
    } else {
      allGood = false;
    }
  });

  // Check optional vars
  config.optional.forEach(varName => {
    if (process.env[varName]) {
    } else {
    }
  });
});

// Check for config files
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
  } else {
    if (file.required) {
      allGood = false;
    } else {
    }
  }
});

// Check local services
fetch('http://localhost:8081/health')
  .then(res => {
    if (res.status === 200) {
    } else {
    }
  })
  .catch(() => {
  });

// Summary
if (allGood) {
  console.log('✅ All required configurations are in place!');
  console.log(
    '1. Add secrets to GitHub: https://github.com/Rinawarp-Terminal/rinawarp-terminal/settings/secrets/actions'
  );
  console.log(
    '2. Monitor workflow: https://github.com/Rinawarp-Terminal/rinawarp-terminal/actions'
  );
} else {
  console.log('❌ Some required configurations are missing!');
}
