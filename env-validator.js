/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const requiredKeys = ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID', 'DATABASE_URL', 'VERCEL_PROJECT_ID'];

export function validateEnv({ voiceHandler = null, throwOnError = true } = {}) {
  const missing = requiredKeys.filter(key => !process.env[key]);

  if (missing.length > 0) {
    const message = `Missing environment variables: ${missing.join(', ')}`;
    console.warn(`🧜‍♀️ Env Validator: ${message}`);

    if (voiceHandler?.speak) {
      voiceHandler.speak(`Uh-oh. I'm missing some keys: ${missing.join(', ')}`);
    }

    if (throwOnError) {
      throw new Error(new Error(message));
    }

    return { valid: false, missing };
  }

  console.log('✅ All required environment variables are present.');
  if (voiceHandler?.speak) {
    voiceHandler.speak('All systems go. Environment is fully configured.');
  }

  return { valid: true };
}

export function exportEnvStatus() {
  const status = {
    checkedAt: new Date().toISOString(),
    keys: requiredKeys.reduce((acc, key) => {
      acc[key] = !!process.env[key];
      return acc;
    }, {}),
  };

  fs.writeFileSync('./env-status.json', JSON.stringify(status, null, 2));
}
