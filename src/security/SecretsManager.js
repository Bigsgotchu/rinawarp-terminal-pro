/**
 * Secrets Management System for RinaWarp Terminal
 * Provides secure storage and retrieval of sensitive configuration
 */

import logger from '../utilities/logger.js';
import crypto from 'crypto';
import fs from 'fs';
// import path from 'path'; // Currently unused

class SecretsManager {
  constructor() {
    this.encryptionKey = this.getOrCreateEncryptionKey();
    this.secrets = new Map();
    this.loadSecrets();
  }

  /**
   * Get or create encryption key for secrets
   */
  getOrCreateEncryptionKey() {
    const keyPath = process.env.SECRETS_KEY_PATH || './.secrets.key';

    try {
      if (fs.existsSync(keyPath)) {
        return fs.readFileSync(keyPath, 'utf8').trim();
      }
    } catch (error) {
      logger.warn('Could not read existing encryption key');
    }

    // Generate new key
    const key = crypto.randomBytes(32).toString('hex');

    try {
      fs.writeFileSync(keyPath, key, { mode: 0o600 });
      logger.info('✅ Generated new secrets encryption key');
    } catch (error) {
      logger.warn('Could not save encryption key to file');
    }

    return key;
  }

  /**
   * Encrypt a value
   */
  encrypt(text) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(this.encryptionKey, 'hex');

    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('rinawarp-secrets', 'utf8'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypt a value
   */
  decrypt(encryptedData) {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(this.encryptionKey, 'hex');

    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from('rinawarp-secrets', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Store a secret securely
   */
  setSecret(key, value, metadata = {}) {
    try {
      const encryptedValue = this.encrypt(value);

      this.secrets.set(key, {
        ...encryptedValue,
        metadata: {
          ...metadata,
          createdAt: new Date().toISOString(),
          lastAccessed: null,
        },
      });

      this.saveSecrets();
      logger.info(`🔐 Secret '${key}' stored securely`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to store secret '${key}':`, error.message);
      return false;
    }
  }

  /**
   * Retrieve a secret
   */
  getSecret(key) {
    try {
      const secretData = this.secrets.get(key);

      if (!secretData) {
        return null;
      }

      // Update last accessed time
      secretData.metadata.lastAccessed = new Date().toISOString();

      const decryptedValue = this.decrypt(secretData);
      return decryptedValue;
    } catch (error) {
      logger.error(`❌ Failed to retrieve secret '${key}':`, error.message);
      return null;
    }
  }

  /**
   * Check if a secret exists
   */
  hasSecret(key) {
    return this.secrets.has(key);
  }

  /**
   * Delete a secret
   */
  deleteSecret(key) {
    const deleted = this.secrets.delete(key);
    if (deleted) {
      this.saveSecrets();
      logger.info(`🗑️ Secret '${key}' deleted`);
    }
    return deleted;
  }

  /**
   * List all secret keys (not values)
   */
  listSecrets() {
    return Array.from(this.secrets.keys()).map(key => ({
      key,
      metadata: this.secrets.get(key).metadata,
    }));
  }

  /**
   * Load secrets from file
   */
  loadSecrets() {
    const secretsPath = process.env.SECRETS_FILE_PATH || './.secrets.json';

    try {
      if (fs.existsSync(secretsPath)) {
        const data = fs.readFileSync(secretsPath, 'utf8');
        const secretsData = JSON.parse(data);

        for (const [key, value] of Object.entries(secretsData)) {
          this.secrets.set(key, value);
        }

        logger.info(`🔐 Loaded ${this.secrets.size} secrets from storage`);
      }
    } catch (error) {
      logger.warn('Could not load existing secrets:', error.message);
    }
  }

  /**
   * Save secrets to file
   */
  saveSecrets() {
    const secretsPath = process.env.SECRETS_FILE_PATH || './.secrets.json';

    try {
      const secretsData = Object.fromEntries(this.secrets);
      fs.writeFileSync(secretsPath, JSON.stringify(secretsData, null, 2), { mode: 0o600 });
    } catch (error) {
      logger.error('Could not save secrets:', error.message);
    }
  }

  /**
   * Initialize common secrets from environment variables
   */
  initializeFromEnv() {
    const secretMappings = {
      'stripe.secret_key': 'STRIPE_SECRET_KEY',
      'stripe.publishable_key': 'STRIPE_PUBLISHABLE_KEY',
      'stripe.webhook_secret': 'STRIPE_WEBHOOK_SECRET',
      'sendgrid.api_key': 'SENDGRID_API_KEY',
      'sendgrid.from_email': 'SENDGRID_FROM_EMAIL',
      'jwt.secret': 'JWT_SECRET',
      'jwt.refresh_secret': 'REFRESH_SECRET',
      'openai.api_key': 'OPENAI_API_KEY',
      'anthropic.api_key': 'ANTHROPIC_API_KEY',
      'database.url': 'DATABASE_URL',
      'redis.url': 'REDIS_URL',
    };

    let initialized = 0;

    for (const [secretKey, envKey] of Object.entries(secretMappings)) {
      const envValue = process.env[envKey];

      if (envValue && !this.hasSecret(secretKey)) {
        this.setSecret(secretKey, envValue, {
          source: 'environment',
          envKey: envKey,
          type: 'credential',
        });
        initialized++;
      }
    }

    if (initialized > 0) {
      logger.info(`🔐 Initialized ${initialized} secrets from environment variables`);
    }
  }

  /**
   * Rotate a secret (generate new value)
   */
  rotateSecret(key, newValue) {
    if (!this.hasSecret(key)) {
      return false;
    }

    const oldSecret = this.secrets.get(key);
    const backupKey = `${key}.backup.${Date.now()}`;

    // Backup old secret
    this.secrets.set(backupKey, {
      ...oldSecret,
      metadata: {
        ...oldSecret.metadata,
        rotatedAt: new Date().toISOString(),
        originalKey: key,
      },
    });

    // Set new secret
    return this.setSecret(key, newValue, {
      ...oldSecret.metadata,
      rotatedAt: new Date().toISOString(),
      previousBackup: backupKey,
    });
  }

  /**
   * Get secrets for specific service
   */
  getServiceSecrets(service) {
    const serviceSecrets = {};

    for (const [key, _value] of this.secrets.entries()) {
      if (key.startsWith(`${service}.`)) {
        const secretKey = key.replace(`${service}.`, '');
        serviceSecrets[secretKey] = this.getSecret(key);
      }
    }

    return serviceSecrets;
  }

  /**
   * Health check for secrets system
   */
  healthCheck() {
    return {
      status: 'healthy',
      secretsCount: this.secrets.size,
      encryptionEnabled: !!this.encryptionKey,
      lastOperation: new Date().toISOString(),
    };
  }
}

// Singleton instance
let secretsManager = null;

export function getSecretsManager() {
  if (!secretsManager) {
    secretsManager = new SecretsManager();

    // Initialize from environment on first creation
    if (process.env.NODE_ENV !== 'test') {
      secretsManager.initializeFromEnv();
    }
  }

  return secretsManager;
}

export default SecretsManager;
