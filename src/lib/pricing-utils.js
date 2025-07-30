/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

import fs from 'fs/promises';
import path from 'path';

// In-memory cache
let cachedPricing = null;
let lastLoaded = 0;

const PRICING_PATH = path.resolve('./src/data/pricing-config.json');

export async function loadPricingConfig(force = false) {
  const now = Date.now();

  // Reload every 5 minutes or if forced
  if (!force && cachedPricing && now - lastLoaded < 5 * 60 * 1000) {
    return cachedPricing;
  }

  try {
    const json = await fs.readFile(PRICING_PATH, 'utf-8');
    const data = JSON.parse(json);
    cachedPricing = data;
    lastLoaded = now;
    return data;
  } catch (error) {
    console.error('Failed to load pricing config:', error);
    throw new Error(new Error('Could not read pricing config'));
  }
}
