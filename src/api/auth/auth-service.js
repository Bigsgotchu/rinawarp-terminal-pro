/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Authentication Service for RinaWarp API Gateway
 * Handles JWT tokens, API keys, and user management
 */

export class AuthenticationService {
  constructor(config = {}) {
    this.config = config;
    // In a real implementation, this would connect to a database
    this.users = new Map();
    this.apiKeys = new Map();

    // Mock users for development
    this.initializeMockData();
  }

  /**
   * Initialize mock data for development
   */
  initializeMockData() {
    const mockUser = {
      id: '1',
      email: 'developer@rinawarp.com',
      name: 'Developer User',
      tier: 'enterprise',
      organizationId: 'org-1',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    this.users.set('1', mockUser);
    this.apiKeys.set('rw_test_key_123', mockUser);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    return this.users.get(userId) || null;
  }

  /**
   * Get user by API key
   */
  async getUserByApiKey(apiKey) {
    return this.apiKeys.get(apiKey) || null;
  }

  /**
   * Validate API key format
   */
  isValidApiKeyFormat(apiKey) {
    return /^rw_[a-z]+_[a-zA-Z0-9]+$/.test(apiKey);
  }

  /**
   * Generate new API key
   */
  generateApiKey(userId, type = 'live') {
    const randomSuffix = Math.random().toString(36).substr(2, 15);
    return `rw_${type}_${randomSuffix}`;
  }

  /**
   * Create new user
   */
  async createUser(userData) {
    const userId = Math.random().toString(36).substr(2, 9);
    const user = {
      id: userId,
      ...userData,
      createdAt: new Date().toISOString(),
      lastLogin: null,
    };

    this.users.set(userId, user);
    return user;
  }

  /**
   * Update user last login
   */
  async updateLastLogin(userId) {
    const user = this.users.get(userId);
    if (user) {
      user.lastLogin = new Date().toISOString();
      this.users.set(userId, user);
    }
    return user;
  }

  /**
   * Create API key for user
   */
  async createApiKey(userId, type = 'live') {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(new Error(new Error('User not found')));
    }

    const apiKey = this.generateApiKey(userId, type);
    this.apiKeys.set(apiKey, user);

    return {
      apiKey,
      userId,
      type,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(apiKey) {
    return this.apiKeys.delete(apiKey);
  }

  /**
   * Get user's API keys
   */
  async getUserApiKeys(userId) {
    const keys = [];
    for (const [apiKey, user] of this.apiKeys.entries()) {
      if (user.id === userId) {
        keys.push({
          apiKey: apiKey.replace(/(.{10}).*(.{4})/, '$1****$2'),
          createdAt: new Date().toISOString(), // Mock data
        });
      }
    }
    return keys;
  }

  /**
   * Validate user permissions
   */
  async hasPermission(userId, permission) {
    const user = this.users.get(userId);
    if (!user) return false;

    // Mock permission system
    const permissions = {
      enterprise: ['read', 'write', 'admin', 'analytics', 'mobile'],
      pro: ['read', 'write', 'analytics'],
      free: ['read'],
    };

    return permissions[user.tier]?.includes(permission) || false;
  }

  /**
   * Get organization users
   */
  async getOrganizationUsers(organizationId) {
    const orgUsers = [];
    for (const user of this.users.values()) {
      if (user.organizationId === organizationId) {
        orgUsers.push(user);
      }
    }
    return orgUsers;
  }
}
