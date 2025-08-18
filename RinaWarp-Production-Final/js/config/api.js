/**
 * 💰 RinaWarp Terminal - LIVE Revenue API Configuration
 * Connected to production Stripe and license validation
 */

const API_CONFIG = {
  // 🚀 LIVE PRODUCTION API
  baseURL: 'https://rinawarptech.com/api',
  websiteURL: 'https://rinawarptech.com',

  // 💳 LIVE STRIPE CONFIGURATION
  stripe: {
    publishableKey:
      'pk_live_51RaxSiG2ToGP7Chntmrt8SEr2jO7MxKH6Y6XtFS4MttiPvE5DkQ67aNNzjfnhn9J4SPKRVW0qCIqHF2OjO9T04Vr00qtnxd5Qj',
    environment: 'production',
  },

  // 🎯 LIVE PRICING PLANS
  pricing: {
    personal: {
      monthly: 'price_1RlLBwG2ToGP7ChnhstisPz0', // $15/month
      yearly: 'price_1RayskG2ToGP7ChnotKOPBUs', // $150/year
      name: 'Personal',
      price: '$15/month',
      features: ['Advanced AI Features', 'Voice Commands', 'Cloud Sync', '3 Device License'],
    },
    professional: {
      monthly: 'price_1RlLC4G2ToGP7ChndbHLotM7', // $29/month
      yearly: 'price_1RayrCG2ToGP7ChnKWA7tstz', // $290/year
      name: 'Professional',
      price: '$29/month',
      features: [
        'Everything in Personal',
        'ElevenLabs Voice AI',
        'Team Collaboration',
        '5 Device License',
        'Priority Support',
      ],
    },
    team: {
      monthly: 'price_1RlLCEG2ToGP7ChnZa5Px0ow', // $49/month
      yearly: 'price_1RaypMG2ToGP7ChnzbKQOAPF', // $490/year
      name: 'Team',
      price: '$49/month',
      features: [
        'Everything in Professional',
        'Team Management',
        'Advanced Analytics',
        'Custom Integrations',
      ],
    },
    beta: {
      earlybird: 'price_1Rk9fCG2ToGP7ChnoyFdZTX0', // Special early pricing
      access: 'price_1Rk9fCG2ToGP7ChnkwgjPPdN', // Beta access
      premium: 'price_1Rk9fCG2ToGP7ChnocLnwjie', // Premium beta
      name: 'Beta Access',
      price: '$19/month',
      features: ['Early Access to New Features', 'Beta Testing', 'Direct Developer Access'],
    },
  },

  // 🎛️ FEATURE LIMITS BY TIER
  limits: {
    free: {
      maxDevices: 1,
      aiRequests: 10,
      voiceMinutes: 5,
      savedSessions: 5,
      customThemes: 1,
      features: ['basic-terminal', 'basic-ai', 'themes'],
    },
    personal: {
      maxDevices: 3,
      aiRequests: 100,
      voiceMinutes: 60,
      savedSessions: 50,
      customThemes: 10,
      features: ['advanced-ai', 'voice-commands', 'cloud-sync', 'analytics'],
    },
    professional: {
      maxDevices: 5,
      aiRequests: 500,
      voiceMinutes: 300,
      savedSessions: -1, // unlimited
      customThemes: -1, // unlimited
      features: ['all-features', 'collaboration', 'priority-support', 'elevenlabs-voice'],
    },
    team: {
      maxDevices: -1, // unlimited
      aiRequests: -1, // unlimited
      voiceMinutes: -1, // unlimited
      savedSessions: -1, // unlimited
      customThemes: -1, // unlimited
      features: ['all-features', 'team-management', 'advanced-analytics', 'custom-integrations'],
    },
  },

  // 🔗 API ENDPOINTS
  endpoints: {
    health: '/health',
    license: {
      validate: '/license/validate',
      activate: '/license/activate',
      status: '/license/status',
    },
    payment: {
      createCheckout: '/payment/checkout',
      webhook: '/webhook/stripe',
      portal: '/payment/portal',
    },
    ai: {
      chat: '/ai/chat',
      providers: '/ai/providers',
    },
    user: {
      profile: '/user/profile',
      usage: '/user/usage',
      settings: '/user/settings',
    },
  },

  // ⚙️ REQUEST CONFIGURATION
  request: {
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
  },

  // 📊 ANALYTICS
  analytics: {
    enabled: true,
    endpoint: '/analytics/track',
  },
};

// 🔧 Utility functions for API calls
class APIClient {
  constructor(config = API_CONFIG) {
    this.config = config;
    this.baseURL = config.baseURL;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RinaWarp-Terminal/1.0.0',
      },
      timeout: this.config.request.timeout,
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // 🏥 Health check
  async checkHealth() {
    return this.makeRequest(this.config.endpoints.health);
  }

  // 🏷️ License validation
  async validateLicense(licenseKey, deviceId) {
    return this.makeRequest(this.config.endpoints.license.validate, {
      method: 'POST',
      body: JSON.stringify({ licenseKey, deviceId }),
    });
  }

  // 🤖 AI chat
  async aiChat(message, provider = 'openai') {
    return this.makeRequest(this.config.endpoints.ai.chat, {
      method: 'POST',
      body: JSON.stringify({ message, provider }),
    });
  }

  // 💳 Create checkout session
  async createCheckoutSession(priceId, customerEmail, metadata = {}) {
    return this.makeRequest(this.config.endpoints.payment.createCheckout, {
      method: 'POST',
      body: JSON.stringify({
        priceId,
        customerEmail,
        metadata,
        successUrl: `${this.config.websiteURL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${this.config.websiteURL}/pricing`,
      }),
    });
  }
}

// 🌐 Global API client instance
window.apiClient = new APIClient();
window.API_CONFIG = API_CONFIG;

export { API_CONFIG, APIClient };
