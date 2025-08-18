/**
 * RinaWarp Terminal Creator Edition - Secure Storage Utility
 * Provides encrypted storage for sensitive data
 */

/**
 * SecureStorage class
 * Provides encrypted local storage with encryption/decryption capabilities
 */
export class SecureStorage {
  constructor() {
    this.initialized = false;
    this.prefix = 'rinawarp_secure_';
    this.encryptionKey = null;
    this.cryptoEnabled =
      typeof window.crypto !== 'undefined' && typeof window.crypto.subtle !== 'undefined';

    // Bind methods
    this.init = this.init.bind(this);
    this.setItem = this.setItem.bind(this);
    this.getItem = this.getItem.bind(this);
    this.removeItem = this.removeItem.bind(this);
    this.clear = this.clear.bind(this);
    this.generateEncryptionKey = this.generateEncryptionKey.bind(this);
  }

  /**
   * Initialize the secure storage system
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async init() {
    try {
      if (!this.cryptoEnabled) {
        console.warn('⚠️ Web Crypto API not available. Secure storage will not be encrypted.');
        this.initialized = true;
        return true;
      }

      // Try to load an existing encryption key or generate a new one
      this.encryptionKey = await this.loadOrGenerateKey();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize secure storage:', error);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Load an existing encryption key or generate a new one
   * @returns {Promise<CryptoKey>} The encryption key
   */
  async loadOrGenerateKey() {
    // Check if we have a stored key
    const storedKeyData = localStorage.getItem(`${this.prefix}encryption_key`);

    if (storedKeyData) {
      try {
        // Convert stored key back to CryptoKey object
        const keyData = JSON.parse(storedKeyData);
        const keyBuffer = this.base64ToArrayBuffer(keyData.k);

        return await window.crypto.subtle.importKey(
          'raw',
          keyBuffer,
          {
            name: 'AES-GCM',
          },
          false,
          ['encrypt', 'decrypt']
        );
      } catch (error) {
        console.warn('⚠️ Failed to load stored encryption key, generating new one:', error);
        // Fall through to key generation
      }
    }

    // Generate a new key
    return await this.generateEncryptionKey();
  }

  /**
   * Generate a new encryption key
   * @returns {Promise<CryptoKey>} The newly generated encryption key
   */
  async generateEncryptionKey() {
    try {
      // Generate a new AES-GCM key
      const key = await window.crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256,
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );

      // Export the key to save it
      const exportedKey = await window.crypto.subtle.exportKey('raw', key);
      const keyBase64 = this.arrayBufferToBase64(exportedKey);

      // Store the key for future use
      localStorage.setItem(`${this.prefix}encryption_key`, JSON.stringify({ k: keyBase64 }));

      return key;
    } catch (error) {
      console.error('❌ Failed to generate encryption key:', error);
      throw error;
    }
  }

  /**
   * Encrypt data before storing
   * @param {any} data - Data to encrypt
   * @returns {Promise<string>} Encrypted data as a string
   */
  async encrypt(data) {
    if (!this.initialized) {
      throw new Error('Secure storage not initialized');
    }

    if (!this.cryptoEnabled) {
      // Fallback to simple encoding if crypto is not available
      return btoa(JSON.stringify(data));
    }

    try {
      // Convert data to string
      const dataString = JSON.stringify(data);
      const dataBuffer = new TextEncoder().encode(dataString);

      // Generate an initialization vector
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Encrypt the data
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        this.encryptionKey,
        dataBuffer
      );

      // Combine IV and encrypted data
      const result = {
        iv: this.arrayBufferToBase64(iv),
        data: this.arrayBufferToBase64(encryptedBuffer),
      };

      return JSON.stringify(result);
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt stored data
   * @param {string} encryptedData - Encrypted data to decrypt
   * @returns {Promise<any>} Decrypted data
   */
  async decrypt(encryptedData) {
    if (!this.initialized) {
      throw new Error('Secure storage not initialized');
    }

    if (!this.cryptoEnabled) {
      // Fallback to simple decoding if crypto is not available
      return JSON.parse(atob(encryptedData));
    }

    try {
      const encryptedObj = JSON.parse(encryptedData);

      // Extract IV and data
      const iv = this.base64ToArrayBuffer(encryptedObj.iv);
      const data = this.base64ToArrayBuffer(encryptedObj.data);

      // Decrypt the data
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        this.encryptionKey,
        data
      );

      // Convert back to original data
      const decryptedString = new TextDecoder().decode(decryptedBuffer);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Convert an ArrayBuffer to a Base64 string
   * @param {ArrayBuffer} buffer - The array buffer to convert
   * @returns {string} Base64 encoded string
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert a Base64 string to an ArrayBuffer
   * @param {string} base64 - Base64 encoded string
   * @returns {ArrayBuffer} The decoded array buffer
   */
  base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Store an item securely
   * @param {string} key - The key to store the data under
   * @param {any} value - The data to store
   * @returns {Promise<void>}
   */
  async setItem(key, value) {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const encryptedValue = await this.encrypt(value);
      localStorage.setItem(`${this.prefix}${key}`, encryptedValue);
    } catch (error) {
      console.error(`❌ Failed to securely store item ${key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve an item from secure storage
   * @param {string} key - The key to retrieve
   * @returns {Promise<any>} The retrieved data
   */
  async getItem(key) {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const encryptedValue = localStorage.getItem(`${this.prefix}${key}`);
      if (encryptedValue === null) {
        return null;
      }

      return await this.decrypt(encryptedValue);
    } catch (error) {
      console.error(`❌ Failed to retrieve secure item ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove an item from secure storage
   * @param {string} key - The key to remove
   * @returns {Promise<void>}
   */
  async removeItem(key) {
    if (!this.initialized) {
      await this.init();
    }

    try {
      localStorage.removeItem(`${this.prefix}${key}`);
    } catch (error) {
      console.error(`❌ Failed to remove secure item ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear all secure storage items
   * @returns {Promise<void>}
   */
  async clear() {
    if (!this.initialized) {
      await this.init();
    }

    try {
      // Only remove items with our prefix
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('❌ Failed to clear secure storage:', error);
      throw error;
    }
  }

  /**
   * Check if an item exists in secure storage
   * @param {string} key - The key to check
   * @returns {Promise<boolean>} Whether the key exists
   */
  async hasItem(key) {
    if (!this.initialized) {
      await this.init();
    }

    return localStorage.getItem(`${this.prefix}${key}`) !== null;
  }

  /**
   * Get all keys in secure storage
   * @returns {Promise<string[]>} Array of all keys
   */
  async keys() {
    if (!this.initialized) {
      await this.init();
    }

    const secureKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.prefix)) {
        secureKeys.push(key.substring(this.prefix.length));
      }
    }

    return secureKeys;
  }

  /**
   * Check if secure storage is available
   * @returns {Promise<boolean>} Whether secure storage is available
   */
  async isAvailable() {
    try {
      if (!this.initialized) {
        await this.init();
      }

      // Test storing and retrieving a value
      await this.setItem('__test__', { test: true });
      const testValue = await this.getItem('__test__');
      await this.removeItem('__test__');

      return testValue && testValue.test === true;
    } catch (error) {
      console.error('❌ Secure storage is not available:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const secureStorage = new SecureStorage();
