/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export async function connectDatabase() {
  try {
    // For development, we'll skip actual MongoDB connection
    if (config.nodeEnv === 'development' && !config.mongodb.uri.includes('mongodb://')) {
      logger.info('📦 Running in development mode without MongoDB');
      return;
    }

    await mongoose.connect(config.mongodb.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info('✅ Connected to MongoDB');
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error);
    // Don't exit in development
    if (config.nodeEnv !== 'development') {
      throw new Error(new Error(error));
    }
  }
}
