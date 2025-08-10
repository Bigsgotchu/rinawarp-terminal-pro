/**
 * Frontend client for subscription verification and authentication
 */

class SubscriptionClient {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    this.token = localStorage.getItem('auth_token');
    this.currentUser = null;
    this.currentTier = 'free';
  }

  // Authentication methods
  async login(email, password) {
    try {
      const response = await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      this.token = data.token;
      this.currentUser = data.user;
      this.currentTier = data.user.tier;
      
      localStorage.setItem('auth_token', this.token);
      localStorage.setItem('user_tier', this.currentTier);
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(email, password, name) {
    try {
      const response = await fetch(`${this.baseURL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  logout() {
    this.token = null;
    this.currentUser = null;
    this.currentTier = 'free';
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_tier');
  }

  // Subscription verification
  async verifySubscription(subscriptionId) {
    try {
      const response = await fetch(`${this.baseURL}/api/verify-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({ 
          userId: this.currentUser?.id, 
          subscriptionId 
        }),
      });

      if (!response.ok) {
        throw new Error('Subscription verification failed');
      }

      const data = await response.json();
      
      if (data.success) {
        this.currentTier = data.tier;
        localStorage.setItem('user_tier', this.currentTier);
      }
      
      return data;
    } catch (error) {
      console.error('Subscription verification error:', error);
      throw error;
    }
  }

  // Feature access checks
  async hasFeatureAccess(featureName) {
    try {
      const response = await fetch(`${this.baseURL}/api/feature-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({ 
          featureName,
          tier: this.currentTier 
        }),
      });

      if (!response.ok) {
        return { allowed: false, reason: 'Feature check failed' };
      }

      return await response.json();
    } catch (error) {
      console.error('Feature access check error:', error);
      return { allowed: false, reason: 'Feature check failed' };
    }
  }

  // AI request with tier-based limits
  async makeAIRequest(prompt, model = 'gpt-3.5-turbo') {
    try {
      // Check if user has AI access
      const access = await this.hasFeatureAccess('ai_assistant');
      if (!access.allowed) {
        throw new Error(`AI access denied: ${access.reason}`);
      }

      const response = await fetch(`${this.baseURL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({ 
          prompt, 
          model,
          tier: this.currentTier 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'AI request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('AI request error:', error);
      throw error;
    }
  }

  // Get available features for current tier
  async getAvailableFeatures() {
    try {
      const response = await fetch(`${this.baseURL}/api/features/${this.currentTier}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get features');
      }

      return await response.json();
    } catch (error) {
      console.error('Get features error:', error);
      return [];
    }
  }

  // Utilities
  isAuthenticated() {
    return !!this.token && !!this.currentUser;
  }

  getCurrentTier() {
    return this.currentTier || localStorage.getItem('user_tier') || 'free';
  }

  getCurrentUser() {
    return this.currentUser;
  }

  // Initialize from storage
  init() {
    const storedToken = localStorage.getItem('auth_token');
    const storedTier = localStorage.getItem('user_tier');
    
    if (storedToken) {
      this.token = storedToken;
      this.currentTier = storedTier || 'free';
      // You might want to validate the token here
    }
  }
}

// Create singleton instance
const subscriptionClient = new SubscriptionClient();
subscriptionClient.init();

export default subscriptionClient;
