/**
 * RinaWarp Terminal - License Validation Module
 * CONFIDENTIAL - Commercial License Required
 * Copyright (c) 2024 RinaWarp Terminal
 */

const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

class LicenseValidator {
  constructor() {
    this.publicKey = this.getPublicKey();
    this.validationEndpoint = 'https://rinawarp-terminal.web.app/api/validate-license';
    this.localLicensePath = path.join(process.cwd(), '.license-key');
    this.gracePeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  /**
   * Get the public key for license signature verification
   */
  getPublicKey() {
    // In production, this would be embedded or loaded securely
    return `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1234567890abcdef
// This is a placeholder - replace with actual RSA public key
-----END PUBLIC KEY-----`;
  }

  /**
   * Validate license from local file and remote server
   */
  async validateLicense() {
    try {
      const localLicense = this.readLocalLicense();
      if (!localLicense) {
        return this.handleNoLicense();
      }

      // Verify local license signature
      if (!this.verifySignature(localLicense)) {
        return this.handleInvalidLicense('Invalid license signature');
      }

      // Check license expiration
      if (this.isLicenseExpired(localLicense)) {
        return this.handleExpiredLicense(localLicense);
      }

      // Validate with remote server
      const remoteValidation = await this.validateWithServer(localLicense);
      if (!remoteValidation.valid) {
        return this.handleInvalidLicense(remoteValidation.reason);
      }

      return {
        valid: true,
        license: localLicense,
        features: this.parseFeatures(localLicense),
      };
    } catch (error) {
      console.error('License validation error:', error);
      return this.handleValidationError(error);
    }
  }

  /**
   * Read license from local file
   */
  readLocalLicense() {
    try {
      if (!fs.existsSync(this.localLicensePath)) {
        return null;
      }
      const licenseData = fs.readFileSync(this.localLicensePath, 'utf8');
      return JSON.parse(licenseData);
    } catch (error) {
      console.error('Error reading local license:', error);
      return null;
    }
  }

  /**
   * Verify license signature using RSA public key
   */
  verifySignature(license) {
    try {
      const { signature, ...licenseData } = license;
      const dataToVerify = JSON.stringify(licenseData);

      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(dataToVerify);
      verify.end();

      return verify.verify(this.publicKey, signature, 'base64');
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Check if license has expired
   */
  isLicenseExpired(license) {
    if (!license.expirationDate) {
      return false; // Perpetual license
    }
    return new Date(license.expirationDate) < new Date();
  }

  /**
   * Validate license with remote server
   */
  async validateWithServer(license) {
    return new Promise(resolve => {
      const postData = JSON.stringify({
        licenseKey: license.key,
        machineId: this.getMachineId(),
        version: this.getAppVersion(),
      });

      const options = {
        hostname: 'rinawarp-terminal.web.app',
        port: 443,
        path: '/api/validate-license',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            resolve({ valid: false, reason: 'Invalid server response' });
          }
        });
      });

      req.on('error', error => {
        console.error('License server error:', error);
        resolve({ valid: false, reason: 'Server unreachable' });
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve({ valid: false, reason: 'Server timeout' });
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Get unique machine identifier
   */
  getMachineId() {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    const macAddresses = [];

    for (const interfaceName in networkInterfaces) {
      for (const networkInterface of networkInterfaces[interfaceName]) {
        if (!networkInterface.internal && networkInterface.mac) {
          macAddresses.push(networkInterface.mac);
        }
      }
    }

    const machineData = `${os.hostname()}-${macAddresses.join('-')}`;
    return crypto.createHash('sha256').update(machineData).digest('hex');
  }

  /**
   * Get application version
   */
  getAppVersion() {
    try {
      const packageJson = require('../../../package.json');
      return packageJson.version;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Parse license features
   */
  parseFeatures(license) {
    return {
      ai: license.features?.ai || false,
      enterprise: license.features?.enterprise || false,
      commercial: license.features?.commercial || false,
      maxUsers: license.features?.maxUsers || 1,
      support: license.features?.support || 'basic',
    };
  }

  /**
   * Handle cases where no license is found
   */
  handleNoLicense() {
    return {
      valid: false,
      reason: 'No license found',
      action: 'purchase',
      trialMode: true,
      trialDays: 14,
    };
  }

  /**
   * Handle invalid license
   */
  handleInvalidLicense(reason) {
    return {
      valid: false,
      reason: reason,
      action: 'contact_support',
    };
  }

  /**
   * Handle expired license
   */
  handleExpiredLicense(license) {
    const gracePeriodEnd = new Date(license.expirationDate).getTime() + this.gracePeriod;
    const inGracePeriod = Date.now() < gracePeriodEnd;

    return {
      valid: inGracePeriod,
      reason: 'License expired',
      action: 'renew',
      gracePeriod: inGracePeriod,
      graceDaysLeft: inGracePeriod
        ? Math.ceil((gracePeriodEnd - Date.now()) / (24 * 60 * 60 * 1000))
        : 0,
    };
  }

  /**
   * Handle validation errors
   */
  handleValidationError(error) {
    return {
      valid: false,
      reason: 'Validation error',
      error: error.message,
      action: 'retry',
    };
  }
}

module.exports = { LicenseValidator };
