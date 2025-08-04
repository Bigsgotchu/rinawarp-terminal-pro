/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Terminal - Security Manager
 * Consolidated security utilities adapted for Electron environment
 * Copyright (c) 2025 Rinawarp Technologies, LLC
 */

import os from 'os';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import logger from '../logger.js';

class SecurityManager {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.sessionTimeout = 15 * 60 * 1000; // 15 minutes
    this.apiTimeout = 10 * 1000; // 10 seconds
    this.secureStoragePath = path.join(app.getPath('userData'), 'secure-storage');

    // Ensure secure storage directory exists
    this.initSecureStorage();
  }

  static getInstance() {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /**
   * Initialize secure storage directory
   */
  initSecureStorage() {
    try {
      if (!fs.existsSync(this.secureStoragePath)) {
        fs.mkdirSync(this.secureStoragePath, { recursive: true, mode: 0o700 });
      }
    } catch (error) {
      logger.error('Failed to initialize secure storage', { error: error.message });
    }
  }

  /**
   * System Security Checks
   */
  async checkSystemSecurity() {
    try {
      const checks = {
        platform: this.validatePlatform(),
        debugMode: this.isDebugMode(),
        processIntegrity: this.checkProcessIntegrity(),
        fileSystemAccess: this.checkFileSystemAccess(),
      };

      logger.security('System security check completed', checks);
      return checks;
    } catch (error) {
      logger.error('System security check failed', { error: error.message });
      return null;
    }
  }

  /**
   * Platform validation
   */
  validatePlatform() {
    const platform = os.platform();
    const supportedPlatforms = ['win32', 'darwin', 'linux'];

    if (!supportedPlatforms.includes(platform)) {
      logger.warn('Unsupported platform detected', { platform });
      return false;
    }

    return true;
  }

  /**
   * Debug mode detection
   */
  isDebugMode() {
    return this.isDevelopment || process.env.DEBUG === 'true' || process.debugPort > 0;
  }

  /**
   * Process integrity check
   */
  checkProcessIntegrity() {
    try {
      // Check if process is running with elevated privileges
      const isElevated = process.getuid ? process.getuid() === 0 : false;

      if (isElevated && !this.isDevelopment) {
        logger.warn('Application running with elevated privileges');
      }

      return {
        pid: process.pid,
        elevated: isElevated,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      };
    } catch (error) {
      logger.error('Process integrity check failed', { error: error.message });
      return null;
    }
  }

  /**
   * File system access validation
   */
  checkFileSystemAccess() {
    try {
      const testPath = path.join(this.secureStoragePath, 'access-test');

      // Test write access
      fs.writeFileSync(testPath, 'test', { mode: 0o600 });

      // Test read access
      const content = fs.readFileSync(testPath, 'utf8');

      // Cleanup
      fs.unlinkSync(testPath);

      return content === 'test';
    } catch (error) {
      logger.error('File system access check failed', { error: error.message });
      return false;
    }
  }

  /**
   * Secure Storage Operations
   */
  async storeSecureData(key, value) {
    try {
      const encryptedData = this.encrypt(
        JSON.stringify({
          value,
          timestamp: Date.now(),
          checksum: this.generateChecksum(value),
        })
      );

      const filePath = path.join(this.secureStoragePath, this.hashKey(key));
      fs.writeFileSync(filePath, encryptedData, { mode: 0o600 });

      logger.debug('Secure data stored', { key });
    } catch (error) {
      logger.error('Failed to store secure data', { key, error: error.message });
      throw new Error(new Error(new Error('Secure storage failed')));
    }
  }

  async getSecureData(key) {
    try {
      const filePath = path.join(this.secureStoragePath, this.hashKey(key));

      if (!fs.existsSync(filePath)) {
        return null;
      }

      const encryptedData = fs.readFileSync(filePath, 'utf8');
      const decryptedData = this.decrypt(encryptedData);
      const { value, timestamp, checksum } = JSON.parse(decryptedData);

      // Verify checksum
      if (this.generateChecksum(value) !== checksum) {
        logger.warn('Secure data checksum mismatch', { key });
        return null;
      }

      // Check if data is expired (optional)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - timestamp > maxAge) {
        logger.info('Secure data expired', { key });
        this.removeSecureData(key);
        return null;
      }

      return value;
    } catch (error) {
      logger.error('Failed to retrieve secure data', { key, error: error.message });
      return null;
    }
  }

  async removeSecureData(key) {
    try {
      const filePath = path.join(this.secureStoragePath, this.hashKey(key));

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug('Secure data removed', { key });
      }
    } catch (error) {
      logger.error('Failed to remove secure data', { key, error: error.message });
    }
  }

  /**
   * Device/System Fingerprinting
   */
  async getSystemFingerprint() {
    try {
      const systemInfo = {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        release: os.release(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        networkInterfaces: Object.keys(os.networkInterfaces()),
        userInfo: os.userInfo().username,
      };

      const fingerprint = crypto
        .createHash('sha256')
        .update(JSON.stringify(systemInfo))
        .digest('hex');

      logger.debug('System fingerprint generated', {
        fingerprint: fingerprint.substring(0, 8) + '...',
      });
      return fingerprint;
    } catch (error) {
      logger.error('System fingerprint generation failed', { error: error.message });
      return 'unknown-system';
    }
  }

  /**
   * Network Security
   */
  validateApiResponse(response) {
    try {
      if (!response || typeof response !== 'object') {
        logger.warn('Invalid API response format');
        return false;
      }

      // Check for required security headers
      const requiredHeaders = ['x-request-id', 'x-timestamp'];
      const hasRequiredHeaders = requiredHeaders.every(
        header => response.headers && response.headers[header]
      );

      if (!hasRequiredHeaders) {
        logger.warn('Missing required security headers');
        return false;
      }

      return true;
    } catch (error) {
      logger.error('API response validation failed', { error: error.message });
      return false;
    }
  }

  /**
   * Certificate validation (basic)
   */
  validateCertificate(certificate) {
    try {
      const expectedPin = process.env.CERTIFICATE_PIN;

      if (!expectedPin) {
        logger.warn('No certificate pin configured');
        return true; // Allow if no pin is set
      }

      const isValid = certificate === expectedPin;

      if (!isValid) {
        logger.warn('Certificate pin mismatch');
      }

      return isValid;
    } catch (error) {
      logger.error('Certificate validation failed', { error: error.message });
      return false;
    }
  }

  /**
   * Environment validation
   */
  validateEnvironment() {
    try {
      const checks = {
        nodeVersion: this.checkNodeVersion(),
        electronVersion: this.checkElectronVersion(),
        requiredEnvVars: this.checkRequiredEnvVars(),
        secureDefaults: this.checkSecureDefaults(),
      };

      const isValid = Object.values(checks).every(check => check === true);

      logger.info('Environment validation completed', { checks, isValid });
      return isValid;
    } catch (error) {
      logger.error('Environment validation failed', { error: error.message });
      return false;
    }
  }

  /**
   * Utility Methods
   */
  encrypt(data) {
    const key = this.getEncryptionKey();
    const cipher = crypto.createCipher('aes-256-cbc', key);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return 'static' + ':' + encrypted;
  }

  decrypt(encryptedData) {
    const key = this.getEncryptionKey();
    const [ivHex, encrypted] = encryptedData.split(':');
    const _iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher('aes-256-cbc', key);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  getEncryptionKey() {
    // Generate a key based on system characteristics
    const systemKey = os.hostname() + os.platform() + os.arch();
    return crypto.createHash('sha256').update(systemKey).digest('hex');
  }

  hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  generateChecksum(data) {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  checkNodeVersion() {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1));
    return majorVersion >= 14; // Minimum supported version
  }

  checkElectronVersion() {
    try {
      const electronVersion = process.versions.electron;
      return electronVersion && electronVersion.length > 0;
    } catch (error) {
      return false;
    }
  }

  checkRequiredEnvVars() {
    const required = ['NODE_ENV'];
    return required.every(envVar => process.env[envVar] !== undefined);
  }

  checkSecureDefaults() {
    return {
      httpOnly: true, // Cookies should be HTTP-only
      secure: !this.isDevelopment, // HTTPS in production
      sameSite: 'strict', // CSRF protection
    };
  }
}

// Export singleton instance
export default SecurityManager.getInstance();
export { SecurityManager };
