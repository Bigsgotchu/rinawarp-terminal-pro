/**
 * RinaWarp API Worker
 * Handles /api/* routes with CORS support and D1 database
 */

const DEFAULT_ALLOW_HEADERS = "Content-Type, Authorization";
const ALLOWED_ORIGINS = new Set([
  "https://rinawarptech.com",
  "https://www.rinawarptech.com",
]);
const AUTH_TOKEN_TTL_SEC = 15 * 60;
const SESSION_TTL_SEC = 7 * 24 * 60 * 60;

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const requestHeaders = request.headers.get("Access-Control-Request-Headers") || "";
  const allowHeaders = requestHeaders.trim() ? requestHeaders : DEFAULT_ALLOW_HEADERS;
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";

  return {
    "Access-Control-Allow-Origin": allowOrigin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": allowHeaders,
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin, Access-Control-Request-Headers, Access-Control-Request-Method",
  };
}

function json(status, body, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  const parts = cookie.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (!part) continue;
    const [key, ...rest] = part.split("=");
    if (key === name) return rest.join("=");
  }
  return "";
}

function base64UrlEncodeBytes(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeString(value) {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlDecodeToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 ? "=".repeat(4 - (normalized.length % 4)) : "";
  const bin = atob(normalized + padding);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function signAuthToken(payloadB64, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return base64UrlEncodeBytes(new Uint8Array(sig));
}

async function verifyAuthToken(token, secret) {
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;
  const expected = await signAuthToken(payloadB64, secret);
  if (expected !== sigB64) return null;
  const payloadJson = new TextDecoder().decode(base64UrlDecodeToBytes(payloadB64));
  const payload = JSON.parse(payloadJson);
  if (!payload?.email || !payload?.exp) return null;
  if (Date.now() / 1000 > Number(payload.exp)) return null;
  return payload;
}

async function issueAuthToken(email, secret, ttlSec) {
  const payload = {
    email,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  };
  const payloadB64 = base64UrlEncodeString(JSON.stringify(payload));
  const sigB64 = await signAuthToken(payloadB64, secret);
  return `${payloadB64}.${sigB64}`;
}

// Password hashing using SHA-256 with salt
async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return salt + ":" + hashHex;
}

async function verifyPassword(password, storedHash) {
  const [salt, expectedHash] = storedHash.split(":");
  if (!salt || !expectedHash) return false;
  const computed = await hashPassword(password, salt);
  return computed === storedHash;
}

function generateId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "usr_";
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function getStripeSecret(env) {
  return String(env.STRIPE_SECRET_KEY || env.STRIPE_KEY || "").trim();
}

function getActiveSubscription(list) {
  if (!Array.isArray(list)) return null;
  return (
    list.find((sub) => ["active", "trialing", "past_due", "unpaid"].includes(String(sub?.status || "").toLowerCase())) ||
    null
  );
}

function inferTierFromPrice(price) {
  const metadataTier = String(price?.metadata?.tier || "").trim().toLowerCase();
  if (metadataTier) return metadataTier;

  const lookupKey = String(price?.lookup_key || "").trim().toLowerCase();
  if (lookupKey.includes("team")) return "team";
  if (lookupKey.includes("creator")) return "creator";
  if (lookupKey.includes("pro")) return "pro";
  if (lookupKey.includes("founder")) return "founder";

  const nickname = String(price?.nickname || "").trim().toLowerCase();
  if (nickname.includes("team")) return "team";
  if (nickname.includes("creator")) return "creator";
  if (nickname.includes("pro")) return "pro";
  if (nickname.includes("founder")) return "founder";

  return "unknown";
}

async function stripeRequest(env, pathname, searchParams) {
  const secret = getStripeSecret(env);
  if (!secret || !secret.startsWith("sk_")) {
    throw new Error("stripe_not_configured");
  }

  const url = new URL(`https://api.stripe.com${pathname}`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || `stripe_request_failed:${response.status}`);
  }
  return payload;
}

async function stripeCustomerByEmail(env, email) {
  const payload = await stripeRequest(env, "/v1/customers/search", {
    query: `email:'${String(email).replace(/'/g, "\\'")}'`,
  });
  const customers = Array.isArray(payload?.data) ? payload.data : [];
  return customers.find((customer) => String(customer?.email || "").toLowerCase() === String(email).toLowerCase()) || customers[0] || null;
}

async function stripeSubscriptionSummary(env, customerId) {
  const payload = await stripeRequest(env, "/v1/subscriptions", {
    customer: customerId,
    status: "all",
    limit: "10",
  });
  const subscription = getActiveSubscription(payload?.data);
  if (!subscription) return null;

  const price = subscription?.items?.data?.[0]?.price || null;
  return {
    subscription,
    price,
    tier: inferTierFromPrice(price),
    status: String(subscription?.status || "active").toLowerCase(),
    expiresAt: Number(subscription?.current_period_end || 0) ? Number(subscription.current_period_end) * 1000 : null,
  };
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

    try {
      const corsHeaders = getCorsHeaders(request);

      if (!env.RINAWARP_AUTH_SECRET) {
        env.RINAWARP_AUTH_SECRET = "";
      }

      // API health check
      if (path === '/api/health' || path === '/api/') {
        return json(200, { status: "ok", timestamp: Date.now() }, corsHeaders);
      }

      // /api/me - lightweight session check
      if (path === '/api/me') {
        const secret = String(env.RINAWARP_AUTH_SECRET || "").trim();
        if (!secret) {
          return json(503, { ok: false, error: "auth_not_configured" }, corsHeaders);
        }
        const bearer = request.headers.get("Authorization") || "";
        const bearerToken = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
        const cookieToken = getCookie(request, "rw_session");
        const token = bearerToken || cookieToken;
        if (!token) {
          return json(401, { ok: false, error: "unauthorized" }, corsHeaders);
        }
        const payload = await verifyAuthToken(token, secret);
        if (!payload) {
          return json(401, { ok: false, error: "invalid_session" }, corsHeaders);
        }
        return json(200, {
          ok: true,
          user: {
            id: null,
            email: payload.email,
            name: payload.email,
          },
          license: { tier: "starter", status: "unknown", expiresAt: null },
        }, corsHeaders);
      }

      // /api/auth/login - not implemented on this worker
      if (path === "/api/auth/login" && request.method === "POST") {
        return json(501, { ok: false, error: "auth_login_not_implemented" }, corsHeaders);
      }

      // License endpoints
      if (path.startsWith('/api/license/')) {
        const subPath = path.replace('/api/license/', '');
        
        // /api/license/verify - Verify a license token
        if (subPath === 'verify' && request.method === 'POST') {
          try {
            const body = await request.json();
            const customerId = String(body?.customer_id || body?.customerId || "").trim();
            if (!customerId) {
              return json(400, { ok: false, error: "customer_id_required" }, corsHeaders);
            }

            const summary = await stripeSubscriptionSummary(env, customerId);
            if (!summary) {
              return json(200, {
                ok: false,
                valid: false,
                customer_id: customerId,
                tier: "starter",
                status: "inactive",
                expires_at: null,
                features: [],
              }, corsHeaders);
            }

            return json(200, {
              ok: true,
              valid: true,
              customer_id: customerId,
              customerId,
              tier: summary.tier,
              status: summary.status,
              expires_at: summary.expiresAt,
              license_token: "",
            }, corsHeaders);
          } catch (e) {
            return json(400, { ok: false, error: e.message || "Invalid JSON" }, corsHeaders);
          }
        }
        
        // /api/license/portal - Get Stripe customer portal URL
        if (subPath === 'portal' && request.method === 'POST') {
          // TODO: Implement with Stripe Customer Portal API
          return json(200, { 
            url: 'https://billing.stripe.com/p/login/test'
          }, corsHeaders);
        }
        
        // /api/license/lookup-by-email - Look up license by email
        if (subPath === 'lookup-by-email' && request.method === 'POST') {
          try {
            const body = await request.json();
            const email = String(body?.email || "").trim().toLowerCase();
            if (!email) {
              return json(400, { ok: false, error: "email_required" }, corsHeaders);
            }

            const customer = await stripeCustomerByEmail(env, email);
            if (!customer) {
              return json(200, { ok: true, customer_id: null, customerId: null, tier: null, status: "not_found" }, corsHeaders);
            }

            const summary = await stripeSubscriptionSummary(env, customer.id);
            return json(200, {
              ok: true,
              email: customer.email || email,
              customer_id: customer.id,
              customerId: customer.id,
              tier: summary?.tier || null,
              status: summary?.status || "no_subscription",
            }, corsHeaders);
          } catch (e) {
            return json(400, { ok: false, error: e.message || "Invalid JSON" }, corsHeaders);
          }
        }
        
        return json(501, { 
          error: 'License endpoint not fully implemented',
          path: subPath
        }, corsHeaders);
      }

      // 404 for unknown paths
      return json(404, { error: "Not found", path }, corsHeaders);

    } catch (e) {
      const corsHeaders = getCorsHeaders(request);
      return json(500, { error: e.message }, corsHeaders);
    }
  }
};
