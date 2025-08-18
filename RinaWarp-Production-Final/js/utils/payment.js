/**
 * Payment Processing System
 * Handles subscription payments via Stripe and license upgrades
 */

class PaymentManager {
  constructor() {
    this.stripe = null;
    // 💰 LIVE STRIPE PRICING (READY FOR REVENUE!)
    this.prices = {
      personal_monthly: 'price_1RlLBwG2ToGP7ChnhstisPz0', // $15/month
      personal_yearly: 'price_1RayskG2ToGP7ChnotKOPBUs', // $150/year
      professional_monthly: 'price_1RlLC4G2ToGP7ChndbHLotM7', // $29/month
      professional_yearly: 'price_1RayrCG2ToGP7ChnKWA7tstz', // $290/year
      team_monthly: 'price_1RlLCEG2ToGP7ChnZa5Px0ow', // $49/month
      team_yearly: 'price_1RaypMG2ToGP7ChnzbKQOAPF', // $490/year
      beta_earlybird: 'price_1Rk9fCG2ToGP7ChnoyFdZTX0', // Beta pricing
      beta_access: 'price_1Rk9fCG2ToGP7ChnkwgjPPdN', // Beta access
      beta_premium: 'price_1Rk9fCG2ToGP7ChnocLnwjie', // Premium beta
    };
    this.init();
  }

  async init() {
    // Load Stripe.js
    await this.loadStripe();
  }

  async loadStripe() {
    try {
      // Load Stripe.js from CDN
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = () => {
        // 💰 LIVE STRIPE KEY (READY FOR REVENUE!)
        this.stripe = Stripe(
          'pk_live_51RaxSiG2ToGP7Chntmrt8SEr2jO7MxKH6Y6XtFS4MttiPvE5DkQ67aNNzjfnhn9J4SPKRVW0qCIqHF2OjO9T04Vr00qtnxd5Qj'
        );
        console.log('✅ Live Stripe initialized for revenue!');
      };
      document.head.appendChild(script);
    } catch (error) {
      console.error('Failed to load Stripe:', error);
    }
  }

  async createCheckoutSession(plan, userEmail = null) {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      // Call your backend to create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: this.prices[plan],
          customerEmail: userEmail,
          successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });

      const session = await response.json();

      if (session.error) {
        throw new Error(session.error);
      }

      // Redirect to Stripe Checkout
      const result = await this.stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      this.showPaymentError(error.message);
    }
  }

  async upgradeToPro(userEmail = null) {
    await this.createCheckoutSession('pro', userEmail);
  }

  async upgradeToTeam(userEmail = null) {
    await this.createCheckoutSession('team', userEmail);
  }

  // License management after successful payment
  async activateLicense(sessionId) {
    try {
      // Verify payment and get license details from backend
      const response = await fetch('/api/activate-license', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local license
        await this.updateLocalLicense(result.license);
        this.showActivationSuccess(result.license);
        return true;
      } else {
        throw new Error(result.error || 'License activation failed');
      }
    } catch (error) {
      console.error('License activation error:', error);
      this.showActivationError(error.message);
      return false;
    }
  }

  async updateLocalLicense(licenseData) {
    try {
      // Update the license configuration
      const license = {
        version: licenseData.tier,
        tier: licenseData.tier,
        customerId: licenseData.customerId,
        subscriptionId: licenseData.subscriptionId,
        expires: licenseData.expires,
        features: this.getFeaturesForTier(licenseData.tier),
        limits: this.getLimitsForTier(licenseData.tier),
      };

      // Save to local storage and update license manager
      localStorage.setItem('rinawarp_license', JSON.stringify(license));

      if (window.licenseManager) {
        window.licenseManager.license = license;
        window.licenseManager.features = license.features;
        window.licenseManager.limits = license.limits;
      }

      return true;
    } catch (error) {
      console.error('Failed to update local license:', error);
      return false;
    }
  }

  getFeaturesForTier(tier) {
    const features = {
      free: {
        ai_integration: true,
        basic_terminal: true,
        themes: true,
        accessibility: true,
        cloud_sync: false,
        analytics: false,
        automation_builder: false,
        voice_control: false,
        collaboration: false,
        unlimited_ai_requests: false,
        priority_support: false,
      },
      pro: {
        ai_integration: true,
        basic_terminal: true,
        themes: true,
        accessibility: true,
        cloud_sync: true,
        analytics: true,
        automation_builder: true,
        voice_control: true,
        collaboration: false,
        unlimited_ai_requests: true,
        priority_support: true,
      },
      team: {
        ai_integration: true,
        basic_terminal: true,
        themes: true,
        accessibility: true,
        cloud_sync: true,
        analytics: true,
        automation_builder: true,
        voice_control: true,
        collaboration: true,
        unlimited_ai_requests: true,
        priority_support: true,
      },
    };

    return features[tier] || features.free;
  }

  getLimitsForTier(tier) {
    const limits = {
      free: {
        ai_requests_per_day: 50,
        saved_sessions: 10,
        custom_themes: 3,
      },
      pro: {
        ai_requests_per_day: -1, // unlimited
        saved_sessions: -1, // unlimited
        custom_themes: -1, // unlimited
      },
      team: {
        ai_requests_per_day: -1, // unlimited
        saved_sessions: -1, // unlimited
        custom_themes: -1, // unlimited
      },
    };

    return limits[tier] || limits.free;
  }

  // Trial management
  async startTrial(plan = 'pro') {
    try {
      const response = await fetch('/api/start-trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });

      const result = await response.json();

      if (result.success) {
        // Activate trial license
        const trialLicense = {
          version: 'trial',
          tier: plan,
          trial: true,
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          features: this.getFeaturesForTier(plan),
          limits: this.getLimitsForTier(plan),
        };

        await this.updateLocalLicense(trialLicense);
        this.showTrialActivated(plan);
        return true;
      }
    } catch (error) {
      console.error('Trial activation error:', error);
      this.showTrialError(error.message);
      return false;
    }
  }

  // Customer portal for managing subscriptions
  async openCustomerPortal() {
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: window.location.origin,
        }),
      });

      const session = await response.json();

      if (session.url) {
        window.open(session.url, '_blank');
      } else {
        throw new Error('Failed to create portal session');
      }
    } catch (error) {
      console.error('Portal error:', error);
      this.showPortalError(error.message);
    }
  }

  // UI feedback methods
  showPaymentError(message) {
    this.showNotification('Payment Error', message, 'error');
  }

  showActivationSuccess(license) {
    this.showNotification(
      'License Activated!',
      `Welcome to RinaWarp Terminal ${license.tier}! Your premium features are now active.`,
      'success'
    );
  }

  showActivationError(message) {
    this.showNotification('Activation Error', message, 'error');
  }

  showTrialActivated(plan) {
    this.showNotification(
      'Trial Started!',
      `Your ${plan} trial is now active for 7 days. Enjoy all premium features!`,
      'success'
    );
  }

  showTrialError(message) {
    this.showNotification('Trial Error', message, 'error');
  }

  showPortalError(message) {
    this.showNotification('Portal Error', message, 'error');
  }

  showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `payment-notification ${type}`;
    notification.innerHTML = `
            <div class="notification-content">
                <h3>${title}</h3>
                <p>${message}</p>
                <button onclick="this.closest('.payment-notification').remove()">Close</button>
            </div>
        `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);

    // Add styles if not already present
    if (!document.getElementById('payment-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'payment-notification-styles';
      style.textContent = `
                .payment-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    color: black;
                    padding: 20px;
                    border-radius: 10px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                    z-index: 10001;
                    max-width: 400px;
                    animation: slideIn 0.3s ease;
                }

                .payment-notification.success {
                    border-left: 4px solid #4CAF50;
                }

                .payment-notification.error {
                    border-left: 4px solid #f44336;
                }

                .payment-notification.info {
                    border-left: 4px solid #2196F3;
                }

                .notification-content h3 {
                    margin: 0 0 10px 0;
                    color: inherit;
                }

                .notification-content p {
                    margin: 0 0 15px 0;
                    color: #666;
                }

                .notification-content button {
                    background: #007cba;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 5px;
                    cursor: pointer;
                }

                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
      document.head.appendChild(style);
    }
  }

  // Pricing utilities
  getPricingInfo() {
    return {
      plans: [
        {
          name: 'Free',
          price: 0,
          period: 'forever',
          features: [
            'Basic AI Integration',
            '50 AI Requests/Day',
            'Core Terminal Features',
            '3 Custom Themes',
            'Community Support',
          ],
          limitations: ['Limited AI usage', 'No cloud sync', 'No advanced features'],
        },
        {
          name: 'Pro',
          price: 9.99,
          period: 'month',
          popular: true,
          features: [
            'Unlimited AI Requests',
            'Advanced AI Features',
            'Cloud Sync',
            'Analytics Dashboard',
            'Automation Builder',
            'Voice Control',
            'Unlimited Themes',
            'Priority Support',
          ],
          trialAvailable: true,
        },
        {
          name: 'Team',
          price: 29.99,
          period: 'month',
          features: [
            'Everything in Pro',
            'Team Collaboration',
            'Shared AI Models',
            'Team Management',
            'Advanced Analytics',
            'SSO Integration',
            'Admin Controls',
            'Dedicated Support',
          ],
        },
      ],
    };
  }
}

// Global payment manager instance
window.paymentManager = new PaymentManager();

export default PaymentManager;
