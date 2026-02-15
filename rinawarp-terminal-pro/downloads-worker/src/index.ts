/// <reference lib="dom" />
/// <reference lib="webworker" />
/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DOWNLOAD_TOKEN_SECRET: string;
  DB: D1Database;
  INSTALLERS: R2Bucket;
  DOWNLOAD_TOKEN_EXPIRY_HOURS: string;
  RATE_LIMIT: KVNamespace;
  RELEASE_VERSION?: string;
}

/**
 * Allowed origins for CORS (prevents token minting from random sites)
 */
const ALLOWED_ORIGINS = new Set([
  "https://www.rinawarptech.com",
  "https://rinawarptech.com",
]);

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  if (!origin) return {};
  if (!ALLOWED_ORIGINS.has(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "vary": "Origin",
  };
}

function preflightHeaders(request: Request): Record<string, string> {
  const cors = corsHeaders(request);
  if (!cors["access-control-allow-origin"]) return {};
  return {
    ...cors,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-max-age": "86400",
  };
}

function jsonResponse(
  request: Request,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(request),
      ...extraHeaders,
    },
  });
}

function textResponse(
  request: Request,
  text: string,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(text, {
    status,
    headers: {
      ...corsHeaders(request),
      ...extraHeaders,
    },
  });
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
    return jsonResponse(
      request,
      { ok: false, error: "rate_limited" },
      429,
      { "retry-after": String(windowSec) },
    );
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

function bytesToB64url(bytes: Uint8Array): string {
  // Avoid spreading large arrays. (Payload/signature are small, but this is cheap.)
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

type TokenClaims = { customer_id: string; exp: number };

function parseClaims(payloadBytes: Uint8Array): TokenClaims | null {
  try {
    const raw = JSON.parse(new TextDecoder().decode(payloadBytes)) as Partial<TokenClaims>;
    if (typeof raw.customer_id !== "string" || raw.customer_id.length < 4) return null;
    if (typeof raw.exp !== "number" || !Number.isFinite(raw.exp)) return null;
    // exp is expected to be ms epoch; reject seconds-epoch and nonsense.
    if (raw.exp < 1_000_000_000_000) return null;
    return { customer_id: raw.customer_id, exp: raw.exp };
  } catch {
    return null;
  }
}

async function verifyToken(secret: string, token: string): Promise<TokenClaims | null> {
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

  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes as unknown as BufferSource,
    payloadBytes as unknown as BufferSource,
  );
  if (!ok) return null;

  return parseClaims(payloadBytes);
}

async function authorizeDownload(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return jsonResponse(request, { ok: false, error: "missing_token" }, 401);

  const claims = await verifyToken(env.DOWNLOAD_TOKEN_SECRET, token);
  if (!claims) return jsonResponse(request, { ok: false, error: "invalid_token" }, 401);

  if (Date.now() > claims.exp) return jsonResponse(request, { ok: false, error: "token_expired" }, 401);

  try {
    const ent = await env.DB.prepare(
      "SELECT status FROM entitlements WHERE customer_id = ? LIMIT 1"
    )
      .bind(claims.customer_id)
      .first<{ status: string }>();

    // Free tier: allow download if the customer_id exists in users (signup), even without a paid entitlement.
    if (!ent || ent.status !== "active") {
      const user = await env.DB.prepare(
        "SELECT customer_id FROM users WHERE customer_id = ? LIMIT 1"
      ).bind(claims.customer_id).first();

      if (!user) {
        return jsonResponse(request, { ok: false, error: "no_account" }, 403);
      }
    }
  } catch (err) {
    console.error("DB error checking entitlement:", err);
    return jsonResponse(request, { ok: false, error: "server_error" }, 500);
  }

  return null;
}

function getInstallerName(filename: string, releaseVersion: string): string {
  if (filename.includes("macOS") || filename.includes("mac")) {
    return `RinaWarp-Terminal-Pro-${releaseVersion}-macOS.zip`;
  }
  if (filename.includes("win32") || filename.includes("Windows")) {
    return `RinaWarp-Terminal-Pro-${releaseVersion}-win32.zip`;
  }
  if (filename.endsWith(".dmg")) {
    return `RinaWarp-Terminal-Pro-${releaseVersion}.dmg`;
  }
  if (filename.endsWith(".exe")) {
    return `RinaWarp-Terminal-Pro-${releaseVersion}.exe`;
  }
  if (filename.endsWith(".AppImage")) {
    return `RinaWarp-Terminal-Pro-${releaseVersion}.AppImage`;
  }
  if (filename.endsWith(".deb") || filename.includes("amd64")) {
    return `RinaWarp-Terminal-Pro-${releaseVersion}.amd64.deb`;
  }
  if (filename.endsWith(".rpm") || filename.includes("x86_64")) {
    return `RinaWarp-Terminal-Pro-${releaseVersion}.x86_64.rpm`;
  }
  return filename;
}

async function readJsonBody<T>(request: Request): Promise<T | null> {
  const ct = request.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return null;
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle CORS preflight (only for allowed origins)
    if (request.method === "OPTIONS") {
      const headers = preflightHeaders(request);
      if (!Object.keys(headers).length) {
        // No origin or not allowlisted. Browsers won't make credentialed calls anyway.
        return new Response(null, { status: 204 });
      }
      return new Response(null, { status: 204, headers });
    }

    // Public verification files (no token required)
    if (pathname.startsWith("/verify/")) {
      const filename = pathname.slice("/verify/".length);
      if (!filename || filename.includes("..")) {
        return textResponse(request, "Invalid path", 400);
      }

      try {
        const object = await env.INSTALLERS.get(filename);
        if (!object) {
          return textResponse(request, "Not found", 404);
        }

        const headers = new Headers();
        if (filename.endsWith(".asc")) {
          headers.set("content-type", "application/pgp-keys");
        } else if (filename.endsWith(".txt")) {
          headers.set("content-type", "text/plain; charset=utf-8");
        } else {
          headers.set("content-type", "application/octet-stream");
        }
        headers.set("cache-control", "public, max-age=3600");
        for (const [k, v] of Object.entries(corsHeaders(request))) headers.set(k, v);

        return new Response(object.body, { headers });
      } catch (err) {
        console.error("R2 error:", err);
        return textResponse(request, "Server error", 500);
      }
    }

    if (pathname.startsWith("/downloads/")) {
      const filename = pathname.slice("/downloads/".length);
      if (!filename) {
        return jsonResponse(request, { ok: false, error: "missing_filename" }, 400);
      }

      const authResp = await authorizeDownload(request, env);
      if (authResp) return authResp;

      const releaseVersion = env.RELEASE_VERSION || "1.0.1";
      const objectKey = getInstallerName(filename, releaseVersion);

      try {
        const object = await env.INSTALLERS.get(objectKey);
        if (!object) {
          return jsonResponse(request, { ok: false, error: "not_found" }, 404);
        }

        const headers = new Headers();
        headers.set("content-type", object.httpMetadata?.contentType || "application/octet-stream");
        headers.set("content-disposition", `attachment; filename="${objectKey}"`);
        headers.set("content-length", object.size.toString());
        headers.set("cache-control", "no-store");
        for (const [k, v] of Object.entries(corsHeaders(request))) headers.set(k, v);

        return new Response(object.body, { headers });
      } catch (err) {
        console.error("R2 error:", err);
        return jsonResponse(request, { ok: false, error: "server_error" }, 500);
      }
    }

    if (pathname === "/api/download-token") {
      if (request.method !== "GET" && request.method !== "POST") {
        return jsonResponse(request, { ok: false, error: "method_not_allowed" }, 405);
      }

      // Back-compat: allow GET with query param, also accept POST JSON body.
      const body = await readJsonBody<{ customer_id?: string }>(request);
      const customerId = body?.customer_id ?? url.searchParams.get("customer_id");
      if (!customerId) {
        return jsonResponse(request, { ok: false, error: "missing_customer_id" }, 400);
      }

      // Validate customer_id format (cus_ or local_ alphanumeric)
      if (!/^(cus|local)_[a-zA-Z0-9_]+$/.test(customerId)) {
        return jsonResponse(request, { ok: false, error: "invalid_customer_id_format" }, 400);
      }

      // Rate limit: 30 requests per minute per IP
      const rl = await rateLimit(request, env, "download-token", 30, 60);
      if (rl) return rl;

      try {
        const ent = await env.DB.prepare(
          "SELECT status, tier FROM entitlements WHERE customer_id = ? LIMIT 1"
        )
          .bind(customerId)
          .first<{ status: string; tier: string | null }>();

        // Free tier: allow token minting for any existing user (signup), even without a paid entitlement.
        let tier = "free";
        if (ent && ent.status === "active") {
          tier = ent.tier || "free";
        } else {
          const user = await env.DB.prepare(
            "SELECT customer_id FROM users WHERE customer_id = ? LIMIT 1"
          ).bind(customerId).first();

          if (!user) {
            return jsonResponse(request, { ok: false, error: "no_account" }, 403);
          }
        }

        const expiryHours = parseInt(env.DOWNLOAD_TOKEN_EXPIRY_HOURS, 10) || 24;
        const exp = Date.now() + expiryHours * 60 * 60 * 1000;
        const payloadBytes = new TextEncoder().encode(JSON.stringify({ customer_id: customerId, exp }));
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

        return jsonResponse(request, {
          ok: true,
          token,
          expires_at: new Date(exp).toISOString(),
          tier,
        });
      } catch (err) {
        console.error("Token generation error:", err);
        return jsonResponse(request, { ok: false, error: "server_error" }, 500);
      }
    }

    return jsonResponse(request, { ok: false, error: "not_found" }, 404);
  },
};
