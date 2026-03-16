/**
 * RinaWarp Stripe Webhook Worker
 * 
 * Handles Stripe webhooks, licenses, and API endpoints with CORS
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    // Add CORS headers to all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    try {
      // Stripe webhook handler
      if (path === '/api/stripe/webhook' && request.method === 'POST') {
        return handleStripeWebhook(request, env, corsHeaders);
      }

      // API health check
      if (path === '/api/health') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // /api/me - Get current user info
      if (path === '/api/me') {
        return new Response(JSON.stringify({ 
          user: null,
          message: 'Auth endpoint - implement with database'
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // /api/events - Telemetry events
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

      // /api/portal - License portal
      if (path === '/api/portal') {
        return new Response(JSON.stringify({ 
          url: 'https://billing.stripe.com/p/login/test'
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Auth endpoints
      if (path.startsWith('/api/auth/')) {
        return new Response(JSON.stringify({ 
          message: 'Auth endpoint'
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // License endpoints
      if (path.startsWith('/api/license/')) {
        return handleLicenseRequest(request, env, corsHeaders);
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

async function handleStripeWebhook(request, env, corsHeaders) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new Response('No signature', { status: 400, headers: corsHeaders });
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
      
      await sendLicenseEmail(customerEmail, tier, licenseToken, env);
      console.log(`License issued: ${customerEmail} - ${tier}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(`Webhook error: ${err.message}`, { status: 400, headers: corsHeaders });
  }
}

async function handleLicenseRequest(request, env, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;

  // /api/license/verify
  if (path === '/api/license/verify' && request.method === 'POST') {
    try {
      const body = await request.json();
      // TODO: Implement with actual license validation
      return new Response(JSON.stringify({ 
    
    <div style="background: #1a1a20; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
      <h2 style="color: #fff; margin-top: 0;">Welcome to RinaWarp! 🎉</h2>
      <p style="color: #ccc; line-height: 1.6;">${accessMessage}</p>
      
      <div style="background: #0a0a0f; border-radius: 8px; padding: 16px; margin: 20px 0; word-break: break-all;">
        <p style="color: #8e8e93; margin: 0 0 8px 0; font-size: 12px;">YOUR LICENSE TOKEN</p>
        <code style="color: #14b8a6; font-size: 11px;">${licenseToken}</code>
      </div>
      
      <p style="color: #8e8e93; font-size: 14px;">
        To activate your license, run:<br>
        <code style="background: #1a1a20; padding: 4px 8px; border-radius: 4px; color: #ff6b6b;">rinawarp license activate ${licenseToken}</code>
      </p>
    </div>
    
    <div style="text-align: center; color: #8e8e93; font-size: 12px;">
      <p>Need help? Reply to this email or visit <a href="https://rinawarptech.com/support" style="color: #14b8a6;">rinawarptech.com/support</a></p>
      <p style="margin-top: 20px;">© 2026 RinaWarp Technologies LLC</p>
    </div>
  </body>
</html>
`;
  
  const response = await fetch('https://api.resend.com/emails', {
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
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to send email:', error);
    throw new Error('Failed to send license email');
  }
  
  return response.json();
}
