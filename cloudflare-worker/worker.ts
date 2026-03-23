export interface Env {
  R2_BUCKET: R2Bucket;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  AUTH_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      if (path.startsWith('/api/updates/')) {
        return handleUpdates(request, env, path, corsHeaders);
      } else if (path.startsWith('/api/billing/')) {
        return handleBilling(request, env, path, corsHeaders);
      } else if (path.startsWith('/api/account/')) {
        return handleAccount(request, env, path, corsHeaders);
      } else if (path.startsWith('/download/')) {
        return handleDownload(request, env, path, corsHeaders);
      } else if (path === '/api/health') {
        return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() }, corsHeaders);
      }

      return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
    } catch (error: any) {
      console.error('Worker error:', error);
      return jsonResponse({ error: error.message }, corsHeaders, 500);
    }
  },
};

// Update feed and download handling
async function handleUpdates(
  request: Request,
  env: Env,
  path: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Get latest release info from R2
  if (path === '/api/updates/latest') {
    const latestFile = await env.R2_BUCKET.get('releases/latest.json');
    
    if (!latestFile) {
      return jsonResponse(
        {
          version: '0.1.0',
          releaseDate: new Date().toISOString(),
          notes: 'Initial release',
          url: 'https://updates.rinawarp.com/download/v0.1.0',
        },
        corsHeaders
      );
    }

    const data = await latestFile.json();
    return jsonResponse(data, corsHeaders);
  }

  // electron-updater feed format
  if (path === '/api/updates/darwin' || path === '/api/updates/win32' || path === '/api/updates/linux') {
    const platform = path.split('/').pop();
    const feedFile = await env.R2_BUCKET.get(`releases/${platform}-latest.yml`);
    
    if (!feedFile) {
      return new Response('Not found', { status: 404, headers: corsHeaders });
    }

    return new Response(await feedFile.text(), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/yaml',
      },
    });
  }

  return jsonResponse({ error: 'Invalid update endpoint' }, corsHeaders, 400);
}

// Download hosting
async function handleDownload(
  request: Request,
  env: Env,
  path: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Extract version and file from path
  // e.g., /download/v0.1.0/RinaWarp-Terminal-Pro-0.1.0.dmg
  const pathParts = path.split('/').filter(Boolean);
  if (pathParts.length < 3) {
    return jsonResponse({ error: 'Invalid download path' }, corsHeaders, 400);
  }

  const version = pathParts[1];
  const filename = pathParts.slice(2).join('/');
  const objectKey = `releases/${version}/${filename}`;

  const object = await env.R2_BUCKET.get(objectKey);
  
  if (!object) {
    return jsonResponse({ error: 'File not found' }, corsHeaders, 404);
  }

  return new Response(object.body, {
    headers: {
      ...corsHeaders,
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=31536000',
    },
  });
}

// Billing endpoints (Stripe integration)
async function handleBilling(
  request: Request,
  env: Env,
  path: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (path === '/api/billing/checkout') {
    // Create Stripe checkout session
    const body = await request.json<{ email: string; plan: string }>();
    
    // Placeholder - integrate with actual Stripe API
    const session = {
      id: 'cs_test_' + Math.random().toString(36).substring(7),
      url: 'https://checkout.stripe.com/pay/cs_test_...',
    };

    return jsonResponse(session, corsHeaders);
  }

  if (path === '/api/billing/webhook') {
    // Handle Stripe webhooks
    // Verify signature and process events
    return jsonResponse({ received: true }, corsHeaders);
  }

  return jsonResponse({ error: 'Invalid billing endpoint' }, corsHeaders, 400);
}

// Account/portal endpoints
async function handleAccount(
  request: Request,
  env: Env,
  path: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (path === '/api/account/portal') {
    // Create customer portal session
    const auth = request.headers.get('Authorization');
    if (!auth) {
      return jsonResponse({ error: 'Unauthorized' }, corsHeaders, 401);
    }

    // Placeholder - integrate with actual Stripe portal
    const portal = {
      url: 'https://billing.stripe.com/p/session/...',
    };

    return jsonResponse(portal, corsHeaders);
  }

  if (path === '/api/account/restore') {
    // Handle license restoration
    const body = await request.json<{ email: string }>();
    
    // Verify license and send email
    return jsonResponse({ success: true, message: 'Restoration email sent' }, corsHeaders);
  }

  return jsonResponse({ error: 'Invalid account endpoint' }, corsHeaders, 400);
}

// Utility functions
function jsonResponse(
  data: any,
  headers: Record<string, string>,
  status: number = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}
