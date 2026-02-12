export interface Env {
  DOWNLOAD_TOKEN_SECRET: string;
  DB: any;
  INSTALLERS: any;
  DOWNLOAD_TOKEN_EXPIRY_HOURS: string;
  RATE_LIMIT: KVNamespace;
}

// Rate limiting helper
async function rateLimit(
  request: Request,
  env: Env,
  keyPrefix: string,
  limit: number,
  windowSec: number
): Promise<Response | null> {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  const window = Math.floor(Date.now() / 1000 / windowSec);
  const key = `${keyPrefix}:${ip}:${window}`;

  const current = Number((await env.RATE_LIMIT.get(key)) || "0");
  if (current >= limit) {
    return new Response(JSON.stringify({ ok: false, error: "rate_limited" }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": String(windowSec) },
    });
  }

  // increment
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: windowSec + 5 });
  return null;
}

function b64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length + 3) % 4);
  const str = atob(b64);
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i);
  return out;
}

/**
 * Allowed origins for CORS (prevents token minting from random sites)
 */
const ALLOWED_ORIGINS = new Set([
  "https://www.rinawarptech.com",
  "https://rinawarptech.com"
]);

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  return ALLOWED_ORIGINS.has(origin)
    ? { "access-control-allow-origin": origin }
    : {};
}

function bytesToB64url(bytes: Uint8Array): string {
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function verifyToken(secret: string, token: string): Promise<{ customer_id: string; exp: number } | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;

  const payloadBytes = b64urlToBytes(payloadB64);
  const sigBytes = b64urlToBytes(sigB64);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const ok = await crypto.subtle.verify("HMAC", key, sigBytes as unknown as BufferSource, payloadBytes as unknown as BufferSource);
  if (!ok) return null;

  try {
    const claims = JSON.parse(new TextDecoder().decode(payloadBytes));
    return { customer_id: claims.customer_id, exp: claims.exp };
  } catch {
    return null;
  }
}

async function authorizeDownload(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return new Response(JSON.stringify({ ok: false, error: "missing_token" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const claims = await verifyToken(env.DOWNLOAD_TOKEN_SECRET, token);
  if (!claims) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_token" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  if (typeof claims.exp !== "number" || Date.now() > claims.exp) {
    return new Response(JSON.stringify({ ok: false, error: "token_expired" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  if (!claims.customer_id) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_claims" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const ent = await env.DB.prepare(
      "SELECT status FROM entitlements WHERE customer_id = ? LIMIT 1"
    ).bind(claims.customer_id).first();

    if (!ent || ent.status !== "active") {
      return new Response(JSON.stringify({ ok: false, error: "not_entitled" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
  } catch (err) {
    console.error("DB error checking entitlement:", err);
    return new Response(JSON.stringify({ ok: false, error: "server_error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return null;
}

function getInstallerName(filename: string): string {
  if (filename.includes("macOS") || filename.includes("mac")) {
    return `RinaWarp-Terminal-Pro-1.0.0-macOS.zip`;
  }
  if (filename.includes("win32") || filename.includes("Windows")) {
    return `RinaWarp-Terminal-Pro-1.0.0-win32.zip`;
  }
  if (filename.endsWith(".dmg")) {
    return `RinaWarp-Terminal-Pro-1.0.0.dmg`;
  }
  if (filename.endsWith(".exe")) {
    return `RinaWarp-Terminal-Pro-1.0.0.exe`;
  }
  if (filename.endsWith(".AppImage")) {
    return `RinaWarp-Terminal-Pro-1.0.0.AppImage`;
  }
  if (filename.endsWith(".deb") || filename.includes("amd64")) {
    return `RinaWarp-Terminal-Pro-1.0.0.amd64.deb`;
  }
  if (filename.endsWith(".rpm") || filename.includes("x86_64")) {
    return `RinaWarp-Terminal-Pro-1.0.0.x86_64.rpm`;
  }
  return filename;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type, authorization",
        },
      });
    }

    // Public verification files (no token required)
    if (pathname.startsWith("/verify/")) {
      const filename = pathname.slice("/verify/".length);
      if (!filename || filename.includes("..")) {
        return new Response("Invalid path", { status: 400 });
      }

      try {
        const object = await env.INSTALLERS.get(filename);
        if (!object) {
          return new Response("Not found", { status: 404 });
        }

        const headers = new Headers();
        if (filename.endsWith(".asc")) {
          headers.set("content-type", "application/pgp-keys");
        } else if (filename.endsWith(".txt")) {
          headers.set("content-type", "text/plain");
        } else {
          headers.set("content-type", "application/octet-stream");
        }
        headers.set("cache-control", "public, max-age=3600");

        return new Response(object.body, { headers });
      } catch (err) {
        console.error("R2 error:", err);
        return new Response("Server error", { status: 500 });
      }
    }

    if (pathname.startsWith("/downloads/")) {
      const filename = pathname.slice("/downloads/".length);
      if (!filename) {
        return new Response(JSON.stringify({ ok: false, error: "missing_filename" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      const authResp = await authorizeDownload(request, env);
      if (authResp) return authResp;

      const objectKey = getInstallerName(filename);

      try {
        const object = await env.INSTALLERS.get(objectKey);
        if (!object) {
          return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
            status: 404,
            headers: { "content-type": "application/json" },
          });
        }

        const headers = new Headers();
        headers.set("content-type", object.httpMetadata?.contentType || "application/octet-stream");
        headers.set("content-disposition", `attachment; filename="${objectKey}"`);
        headers.set("content-length", object.size.toString());

        return new Response(object.body, { headers });
      } catch (err) {
        console.error("R2 error:", err);
        return new Response(JSON.stringify({ ok: false, error: "server_error" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
    }

    if (pathname === "/api/download-token") {
      const customerId = url.searchParams.get("customer_id");
      if (!customerId) {
        return new Response(JSON.stringify({ ok: false, error: "missing_customer_id" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      // Validate customer_id format (cus_ alphanumeric)
      if (!/^cus_[a-zA-Z0-9]+$/.test(customerId)) {
        return new Response(JSON.stringify({ ok: false, error: "invalid_customer_id_format" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      // Rate limit: 30 requests per minute per IP
      const rl = await rateLimit(request, env, "download-token", 30, 60);
      if (rl) return rl;

      try {
        const ent = await env.DB.prepare(
          "SELECT status, tier FROM entitlements WHERE customer_id = ? LIMIT 1"
        ).bind(customerId).first();

        if (!ent || ent.status !== "active") {
          return new Response(JSON.stringify({ ok: false, error: "not_entitled" }), {
            status: 403,
            headers: { "content-type": "application/json" },
          });
        }

        const expiryHours = parseInt(env.DOWNLOAD_TOKEN_EXPIRY_HOURS) || 24;
        const exp = Date.now() + expiryHours * 60 * 60 * 1000;
        const payload = JSON.stringify({ customer_id: customerId, exp });
        const payloadBytes = new TextEncoder().encode(payload);
        const payloadB64 = bytesToB64url(payloadBytes);

        const key = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(env.DOWNLOAD_TOKEN_SECRET),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );

        const sigBytes = await crypto.subtle.sign("HMAC", key, payloadBytes as unknown as BufferSource);
        const sigB64 = bytesToB64url(new Uint8Array(sigBytes));

        const token = `${payloadB64}.${sigB64}`;

        return new Response(JSON.stringify({
          ok: true,
          token,
          expires_at: new Date(exp).toISOString(),
          tier: ent.tier
        }), {
          headers: { "content-type": "application/json", ...getCorsHeaders(request) },
        });
      } catch (err) {
        console.error("Token generation error:", err);
        return new Response(JSON.stringify({ ok: false, error: "server_error" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  },
};
