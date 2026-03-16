/**
 * RinaWarp Combined Worker
 * Handles Stripe webhooks + API endpoints with CORS
 */

const DEFAULT_ALLOW_HEADERS = "Content-Type, Authorization, stripe-signature";
const ALLOWED_ORIGINS = new Set([
  "https://rinawarptech.com",
  "https://www.rinawarptech.com",
]);

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const requestHeaders = request.headers.get("Access-Control-Request-Headers") || "";
  const allowHeaders = requestHeaders.trim() ? requestHeaders : DEFAULT_ALLOW_HEADERS;
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "*";
  const headers = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": allowHeaders,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin, Access-Control-Request-Headers, Access-Control-Request-Method",
  };

  if (allowOrigin !== "*") {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return headers;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request),
      });
    }

    // Add CORS headers to all responses
    const corsHeaders = getCorsHeaders(request);

    // Stripe webhook handler
    if (path === '/api/stripe/webhook' && request.method === 'POST') {
      return handleStripeWebhook(request, env, corsHeaders);
    }

    // API endpoints
    try {
      // /api/health
      if (path === '/api/health') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // /api/me
      if (path === '/api/me') {
        return new Response(JSON.stringify({ 
          user: null,
          message: 'Auth endpoint - implement with database'
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // /api/events - Telemetry
      if (path === '/api/events') {
        if (request.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        try {
          const body = await request.json();
          console.log('Event received:', body);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }

      // /api/portal
      if (path === '/api/portal') {
        return new Response(JSON.stringify({ 
          url: 'https://billing.stripe.com/p/login/test'
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // /api/auth/* - Auth endpoints (stub)
      if (path.startsWith('/api/auth/')) {
        return new Response(JSON.stringify({ 
          message: 'Auth not implemented',
          path: path
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // /api/license/* - License endpoints (stub)
      if (path.startsWith('/api/license/')) {
        const subPath = path.replace('/api/license/', '');
        
        if (subPath === 'verify' && request.method === 'POST') {
          return new Response(JSON.stringify({ 
            ok: true,
            tier: 'starter',
            expires_at: null,
            customer_id: null
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        
        if (subPath === 'portal' && request.method === 'POST') {
          return new Response(JSON.stringify({ 
            url: 'https://billing.stripe.com/p/login/test'
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        
        if (subPath === 'lookup-by-email' && request.method === 'POST') {
          return new Response(JSON.stringify({ 
            ok: true,
            customer_id: null,
            tier: null
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }

      return new Response(JSON.stringify({ error: 'Not found', path }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};

// Stripe webhook handler
async function handleStripeWebhook(request, env, corsHeaders) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const payload = await request.text();
    const event = JSON.parse(payload);
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const customerEmail = session.customer_details?.email || session.customer_email;
      
      if (!customerEmail) {
        return new Response(JSON.stringify({ error: 'No email' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      
      const lineItems = session.line_items?.data || [];
      const productId = lineItems[0]?.price?.product;
      const tier = mapProductToTier(productId);
      
      const isLifetime = ['founder', 'pioneer', 'evergreen'].includes(tier);
      const expiresAt = isLifetime 
        ? 0 
        : Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
      
      const licenseToken = await generateLicenseToken({
        tier,
        email: customerEmail,
        exp: expiresAt,
      }, env.LICENSE_SIGNING_SECRET);
      
      if (env.RESEND_API_KEY) {
        await sendLicenseEmail(customerEmail, tier, licenseToken, env);
      }
      
      console.log(`License issued: ${customerEmail} - ${tier}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (err) {
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }
}

function mapProductToTier(productId) {
  const tierMap = {
    'prod_TbA54FTFeLSFN4': 'pro',
    'prod_TbA5j3tRuZhh4a': 'creator',
    'prod_U7yI9Pydv9IlLg': 'team',
    'prod_U7yI6uAQ0yJOWK': 'founder',
    'prod_U7yUdqMZbU6iWr': 'pioneer',
    'prod_U7yUvBy5Gn4eXc': 'evergreen'
  };
  return tierMap[productId] || 'starter';
}

async function generateLicenseToken(data, secret) {
  if (!secret) {
    return 'demo-token-' + Date.now();
  }
  
  const payload = {
    typ: 'license',
    tier: data.tier,
    email: data.email,
    exp: data.exp,
    iat: Math.floor(Date.now() / 1000),
    nonce: Math.random().toString(36).substring(2),
  };
  
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const signature = await hmacSha256(payloadB64, secret);
  
  return `${payloadB64}.${signature}`;
}

async function hmacSha256(message, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return b64UrlEncode(new Uint8Array(signature));
}

function b64urlEncode(str) {
  if (typeof str === 'string') {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return b64UrlEncode(str);
}

function b64UrlEncode(uint8Array) {
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sendLicenseEmail(email, tier, licenseToken, env) {
  const tierDisplayNames = {
    starter: 'Starter',
    creator: 'Creator', 
    pro: 'Pro',
    team: 'Team',
    founder: 'Founder Lifetime',
    pioneer: 'Pioneer Lifetime',
    evergreen: 'Evergreen Lifetime',
  };
  
  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your RinaWarp License</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0a0f; color: #f5f5f7;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #ff3366; margin: 0;">RinaWarp</h1>
    <p style="color: #8e8e93; margin: 5px 0;">Terminal Pro</p>
  </div>
  <div style="background: #1a1a20; border-radius: 12px; padding: 24px;">
    <h2 style="color: #fff;">Welcome to RinaWarp! 🎉</h2>
    <p style="color: #ccc;">Your license token:</p>
    <code style="color: #14b8a6;">${licenseToken}</code>
    <p style="color: #8e8e93;">Run: rinawarp license activate ${licenseToken}</p>
  </div>
</body>
</html>`;
  
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'RinaWarp <noreply@rinawarptech.com>',
      to: email,
      subject: `Your RinaWarp ${tierDisplayNames[tier]} License`,
      html: emailHtml,
    }),
  });
}
