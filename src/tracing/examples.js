/**
 * Examples of Distributed Tracing Usage in RinaWarp Terminal
 * 
 * This file shows practical examples of how to integrate distributed tracing
 * into your existing codebase.
 */

import { 
  traceAsync, 
  traceHttpRequest, 
  traceAI, 
  tracePayment, 
  traceDatabase,
  createSpan, 
  addTransactionTags,
  addTransactionData,
  setUser 
} from './distributedTracing.js';
import Stripe from 'stripe';

// Example 1: Tracing Stripe Checkout Creation
export const createCheckoutSessionTraced = traceAsync(
  'create_stripe_checkout',
  async function(priceId, customerEmail, metadata) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Add custom tags for this operation
    addTransactionTags({
      'payment.provider': 'stripe',
      'payment.operation': 'create_checkout',
      'payment.price_id': priceId
    });

    // Add customer context
    addTransactionData('customer.email', customerEmail);
    
    return await tracePayment(
      'create_checkout_session',
      { currency: 'usd', price_id: priceId },
      async () => {
        const session = await stripe.checkout.sessions.create({
          mode: 'payment',
          payment_method_types: ['card'],
          line_items: [{ price: priceId, quantity: 1 }],
          customer_email: customerEmail,
          metadata,
          success_url: 'https://your-domain.com/success',
          cancel_url: 'https://your-domain.com/cancel'
        });
        
        return session;
      }
    );
  },
  { 
    op: 'payment.create_checkout',
    logArgs: false, // Don't log sensitive payment data
    data: {
      component: 'stripe',
      service: 'payment'
    }
  }
);

// Example 2: Tracing AI Operations with Anthropic Claude
export const processAICommandTraced = traceAsync(
  'ai_command_processing',
  async function(userCommand, context) {
    // Set user context for tracing
    setUser({
      id: context.userId,
      email: context.userEmail
    });

    addTransactionTags({
      'ai.provider': 'anthropic',
      'ai.model': 'claude-3',
      'command.type': 'terminal'
    });

    return await traceAI(
      'claude-3-sonnet',
      'completion',
      { command: userCommand, context },
      async () => {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: `Help me with this terminal command: ${userCommand}`
            }]
          })
        });

        const data = await response.json();
        return data;
      }
    );
  },
  {
    op: 'ai.process_command',
    data: {
      component: 'ai-assistant',
      service: 'terminal'
    }
  }
);

// Example 3: Tracing Database Operations
export async function getUserLicenseTraced(userId) {
  return await traceDatabase(
    'SELECT * FROM licenses WHERE user_id = ?',
    [userId],
    async () => {
      // Simulated database call
      const span = createSpan('cache.lookup', 'Check license cache', {
        'cache.key': `license:${userId}`,
        'cache.type': 'redis'
      });

      try {
        // Check cache first
        const cachedLicense = await checkLicenseCache(userId);
        if (cachedLicense) {
          span.setTag('cache.hit', true);
          span.finish();
          return cachedLicense;
        }

        span.setTag('cache.hit', false);
        span.finish();

        // Fetch from database
        const dbSpan = createSpan('db.query', 'Fetch user license', {
          'db.operation': 'select',
          'db.table': 'licenses'
        });

        try {
          const license = await fetchLicenseFromDB(userId);
          dbSpan.setTag('db.rows_affected', license ? 1 : 0);
          return license;
        } finally {
          dbSpan.finish();
        }
      } finally {
        // Cache span was already finished above
      }
    }
  );
}

// Example 4: Tracing External API Calls
export async function sendEmailNotificationTraced(to, subject, body) {
  return await traceHttpRequest(
    'POST',
    'https://api.sendgrid.v3/mail/send',
    { to, subject },
    async () => {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: to }]
          }],
          from: { email: 'noreply@rinawarptech.com' },
          subject,
          content: [{
            type: 'text/html',
            value: body
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`SendGrid API error: ${response.statusText}`);
      }

      return response.json();
    }
  );
}

// Example 5: Tracing Complex Business Logic
export async function processLicenseActivationTraced(licenseKey, userInfo) {
  const span = createSpan('business.license_activation', 'Process license activation', {
    'license.type': 'activation',
    'user.id': userInfo.id
  });

  try {
    // Step 1: Validate license
    const validationSpan = createSpan('validation.license', 'Validate license key', {
      'license.key_hash': hashLicenseKey(licenseKey)
    });

    let isValid;
    try {
      isValid = await validateLicenseKey(licenseKey);
      validationSpan.setTag('validation.result', isValid ? 'valid' : 'invalid');
    } finally {
      validationSpan.finish();
    }

    if (!isValid) {
      span.setTag('activation.success', false);
      span.setData('activation.error', 'Invalid license key');
      throw new Error('Invalid license key');
    }

    // Step 2: Check usage limits
    const usageSpan = createSpan('check.usage_limits', 'Check license usage', {
      'license.key_hash': hashLicenseKey(licenseKey)
    });

    let canActivate;
    try {
      canActivate = await checkUsageLimits(licenseKey, userInfo);
      usageSpan.setTag('usage.within_limits', canActivate);
    } finally {
      usageSpan.finish();
    }

    if (!canActivate) {
      span.setTag('activation.success', false);
      span.setData('activation.error', 'Usage limits exceeded');
      throw new Error('License usage limits exceeded');
    }

    // Step 3: Activate license
    const activationSpan = createSpan('db.license_activation', 'Activate license in database', {
      'license.key_hash': hashLicenseKey(licenseKey),
      'user.id': userInfo.id
    });

    let activationResult;
    try {
      activationResult = await activateLicenseInDB(licenseKey, userInfo);
      activationSpan.setTag('activation.success', true);
      activationSpan.setData('activation.id', activationResult.id);
    } finally {
      activationSpan.finish();
    }

    // Step 4: Send confirmation email
    if (userInfo.email) {
      await sendEmailNotificationTraced(
        userInfo.email,
        'License Activated Successfully',
        `Your RinaWarp Terminal license has been activated successfully.`
      );
    }

    span.setTag('activation.success', true);
    span.setData('activation.license_type', activationResult.type);
    
    return activationResult;

  } catch (error) {
    span.setTag('activation.success', false);
    span.setData('activation.error', error.message);
    throw error;
  } finally {
    span.finish();
  }
}

// Example 6: Express Route with Manual Tracing
export function createTracedRoute(app) {
  app.post('/api/license/activate', async (req, res) => {
    const { licenseKey } = req.body;
    
    // The request transaction is automatically created by Sentry middleware
    // We can add additional context to it
    addTransactionTags({
      'endpoint': 'license_activation',
      'license.key_hash': hashLicenseKey(licenseKey)
    });

    // Set user context if available
    if (req.user) {
      setUser({
        id: req.user.id,
        email: req.user.email,
        subscription: req.user.subscription
      });
    }

    try {
      const result = await processLicenseActivationTraced(licenseKey, req.user);
      
      addTransactionData('response.success', true);
      addTransactionData('response.license_type', result.type);
      
      res.json({
        success: true,
        license: result
      });
    } catch (error) {
      addTransactionData('response.success', false);
      addTransactionData('response.error', error.message);
      
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });
}

// Utility functions (these would be implemented elsewhere)
async function checkLicenseCache(userId) {
  // Redis cache lookup
  return null; // Cache miss
}

async function fetchLicenseFromDB(userId) {
  // Database query
  return { id: userId, type: 'professional', status: 'active' };
}

function hashLicenseKey(key) {
  // Return a hash of the license key for logging (don't log the actual key)
  return key ? key.substring(0, 8) + '...' : 'null';
}

async function validateLicenseKey(key) {
  // License validation logic
  return key && key.startsWith('RINAWARP-');
}

async function checkUsageLimits(key, userInfo) {
  // Usage limit checking logic
  return true;
}

async function activateLicenseInDB(key, userInfo) {
  // Database activation logic
  return { id: 'activation-123', type: 'professional', activatedAt: new Date() };
}

export {
  processAICommandTraced,
  getUserLicenseTraced,
  sendEmailNotificationTraced,
  processLicenseActivationTraced,
  createTracedRoute
};
