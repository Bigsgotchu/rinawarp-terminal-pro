/**
 * Secure Storage Utility for RinaWarp Terminal
 * Provides encrypted storage for sensitive data like API keys
 */

class SecureStorage {
  constructor() {
    this.keyPrefix = 'rinawarp_secure_';
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
    this.ivLength = 12; // 96 bits for GCM
  }

  /**
   * Generate a key from password using PBKDF2
   */
  async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      passwordKey,
      {
        name: this.algorithm,
        length: this.keyLength,
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate a device-specific password
   */
  async generateDevicePassword() {
    // Use a combination of user agent, screen resolution, and timezone as device fingerprint
    const deviceInfo = [
      navigator.userAgent,
      screen.width + 'x' + screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.language,
    ].join('|');

    // Hash the device info to create a consistent password
    const encoder = new TextEncoder();
    const data = encoder.encode(deviceInfo);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert to base64 for use as password
    return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  }

  /**
   * Encrypt and store sensitive data
   */
  async setItem(key, value) {
    try {
      const password = await this.generateDevicePassword();
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(value));

      // Generate random salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));

      // Derive encryption key
      const cryptoKey = await this.deriveKey(password, salt);

      // Encrypt the data
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv,
        },
        cryptoKey,
        data
      );

      // Store salt, iv, and encrypted data together
      const storageData = {
        salt: Array.from(salt),
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encryptedData)),
        timestamp: Date.now(),
        version: '1.0',
      };

      localStorage.setItem(this.keyPrefix + key, JSON.stringify(storageData));
      return true;
    } catch (error) {
      console.error('Secure storage encryption failed:', error);
      return false;
    }
  }

  /**
   * Retrieve and decrypt sensitive data
   */
  async getItem(key) {
    try {
      const storedData = localStorage.getItem(this.keyPrefix + key);
      if (!storedData) return null;

      const parsedData = JSON.parse(storedData);
      const password = await this.generateDevicePassword();

      // Reconstruct salt, IV, and encrypted data
      const salt = new Uint8Array(parsedData.salt);
      const iv = new Uint8Array(parsedData.iv);
      const encryptedData = new Uint8Array(parsedData.data);

      // Derive decryption key
      const cryptoKey = await this.deriveKey(password, salt);

      // Decrypt the data
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: iv,
        },
        cryptoKey,
        encryptedData
      );

      // Parse and return the original value
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(decryptedData));
    } catch (error) {
      console.error('Secure storage decryption failed:', error);
      return null;
    }
  }

  /**
   * Remove encrypted item
   */
  removeItem(key) {
    localStorage.removeItem(this.keyPrefix + key);
  }

  /**
   * Clear all secure storage items
   */
  clear() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.keyPrefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Validate that the stored data hasn't been tampered with
   */
  async validateIntegrity(key) {
    try {
      const value = await this.getItem(key);
      return value !== null;
    } catch (error) {
      return false;
    }
  }
}

// Export for use in main application
window.SecureStorage = SecureStorage;
