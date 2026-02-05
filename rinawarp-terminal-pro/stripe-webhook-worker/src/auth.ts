import Stripe from "stripe";

type Env = {
  DB: D1Database;
  AUTH_TOKEN_SECRET?: string;
  STRIPE_SECRET_KEY: string;
  RESEND_API_KEY?: string;
  PORTAL_RETURN_URL?: string;
  AUTH_RATE_LIMIT?: KVNamespace;
};

function nowMs() {
  return Date.now();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sha256Hex(data: string) {
  const enc = new TextEncoder().encode(data);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(secret: string, data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomCode6() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return n.toString().padStart(6, "0");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

// IP-based rate limiting using KV
async function rateLimit(env: Env, key: string, limit: number, windowSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `${key}:${Math.floor(now / windowSeconds)}`;
  
  if (!env.AUTH_RATE_LIMIT) {
    return { ok: true as const, retryAfter: 0 };
  }
  
  const currentRaw = await env.AUTH_RATE_LIMIT.get(windowKey);
  const current = currentRaw ? parseInt(currentRaw, 10) : 0;

  if (current >= limit) {
    return { ok: false as const, retryAfter: windowSeconds };
  }

  // increment and set TTL to window
  await env.AUTH_RATE_LIMIT.put(windowKey, String(current + 1), { expirationTtl: windowSeconds });
  return { ok: true as const, retryAfter: 0 };
}

// Get client IP from request
function getClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

// Optional email send (Resend). If no key, you can still use code-based flow in-app.
async function sendOtpEmail(env: Env, email: string, code: string) {
  if (!env.RESEND_API_KEY) return;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "RinaWarp <support@rinawarptech.com>",
      to: [email],
      subject: "Your RinaWarp login code",
      html: `<p>Your login code is:</p><p style="font-size:24px;font-weight:700;letter-spacing:2px">${code}</p><p>This code expires in 10 minutes.</p>`,
    }),
  });

  if (!res.ok) {
    console.log("Resend error:", await res.text());
  }
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = new Set([
  "https://www.rinawarptech.com",
  "https://rinawarptech.com"
]);

function getCorsHeaders(origin: string): Record<string, string> {
  // For cookie-based auth, we need to reflect origin and allow credentials
  const o = ALLOWED_ORIGINS.has(origin) ? origin : "https://www.rinawarptech.com";
  return {
    "access-control-allow-origin": o,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-allow-credentials": "true",
    "vary": "Origin",
  };
}

function clearSessionCookie(): string {
  return [
    "rinawarp_session=;",
    "Path=/;",
    "HttpOnly;",
    "Secure;",
    "SameSite=Lax;",
    "Max-Age=0",
  ].join(" ");
}

export async function authStart(request: Request, env: Env) {
  const origin = request.headers.get("origin") ?? "";
  const corsHeaders = getCorsHeaders(origin);
  const startedAt = Date.now();
  const MIN_MS = 650;

  // Rate limit: 10 requests per minute per IP
  const ip = getClientIp(request);
  const rl = await rateLimit(env, `auth_start:${ip}`, 10, 60);
  if (!rl.ok) {
    // Keep non-enumerable response shape
    await sleep(MIN_MS);
    return Response.json({ ok: true, challenge_id: randomId(), expires_in_seconds: 600 }, { headers: corsHeaders });
  }

  // Random cleanup (5% of requests) to keep D1 small
  if (Math.random() < 0.05) {
    await env.DB.prepare(`
      DELETE FROM auth_challenges
      WHERE expires_at < (strftime('%s','now') - 24*60*60)
    `).run();
  }

  let email = "";
  try {
    const body = await request.json();
    email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  } catch {
    // Always return OK, never reveal parse failures
    await sleep(MIN_MS);
    return Response.json({ ok: true, challenge_id: randomId(), expires_in_seconds: 600 }, { headers: corsHeaders });
  }

  // Always respond OK. Never reveal purchase state.
  // But only do work when email looks valid.
  if (!email || !isValidEmail(email)) {
    // Still create a challenge to maintain consistent timing and response shape
    const dummyChallengeId = randomId();
    const dummyCode = randomCode6();
    const dummyHash = await sha256Hex(`${dummyChallengeId}:${dummyCode}`);
    const dummyExpires = nowMs() + 10 * 60 * 1000;
    
    // Don't insert invalid challenges to DB (cleanup), but still time-delay
    await sleep(MIN_MS);
    return Response.json({ ok: true, challenge_id: dummyChallengeId, expires_in_seconds: 600 }, { headers: corsHeaders });
  }

  // Determine eligibility quietly
  const existing = await env.DB.prepare("SELECT customer_id FROM users WHERE email = ?")
    .bind(email)
    .first<{ customer_id: string }>();

  let eligible = false;
  if (existing?.customer_id) {
    const ent = await env.DB.prepare(
      "SELECT status FROM entitlements WHERE customer_id = ? LIMIT 1"
    )
      .bind(existing.customer_id)
      .first<{ status: string }>();
    eligible = ent?.status === "active";
  }

  // Create challenge record either way (keeps timing consistent)
  const challengeId = randomId();
  const code = randomCode6();
  const codeHash = await sha256Hex(`${challengeId}:${code}`);
  const expiresAt = nowMs() + 10 * 60 * 1000;

  await env.DB.prepare(
    "INSERT INTO auth_challenges (id, email, code_hash, expires_at, attempts, used) VALUES (?, ?, ?, ?, 0, 0)"
  )
    .bind(challengeId, email, codeHash, expiresAt)
    .run();

  // Send email only if eligible
  if (eligible) {
    await sendOtpEmail(env, email, code);
  }

  // Normalize response time
  const elapsed = Date.now() - startedAt;
  if (elapsed < MIN_MS) await sleep(MIN_MS - elapsed);

  return Response.json({ ok: true, challenge_id: challengeId, expires_in_seconds: 600 }, { headers: corsHeaders });
}

export async function authVerify(request: Request, env: Env) {
  const origin = request.headers.get("origin") ?? "";
  const corsHeaders = getCorsHeaders(origin);
  const startedAt = Date.now();
  const MIN_MS = 650;

  // Rate limit: 20 requests per minute per IP
  const ip = getClientIp(request);
  const rl = await rateLimit(env, `auth_verify:${ip}`, 20, 60);
  if (!rl.ok) {
    // Keep non-enumerable response shape
    await sleep(MIN_MS);
    return Response.json({ ok: false, error: "invalid_code" }, { status: 400, headers: corsHeaders });
  }

  const fail = async () => {
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_MS) await sleep(MIN_MS - elapsed);
    return Response.json({ ok: false, error: "invalid_code" }, { status: 400, headers: corsHeaders });
  };

  let email = "";
  let code = "";
  let challengeId = "";
  try {
    const body = await request.json();
    email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    code = typeof body.code === "string" ? body.code.trim() : "";
    challengeId = typeof body.challenge_id === "string" ? body.challenge_id.trim() : "";
  } catch {
    return fail();
  }

  if (!email || !isValidEmail(email) || !/^[a-f0-9]{32}$/.test(challengeId) || !/^\d{6}$/.test(code)) {
    return fail();
  }

  // Find latest unused, unexpired challenge
  const now = nowMs();
  const row = await env.DB.prepare(
    "SELECT id, code_hash, expires_at, attempts, used FROM auth_challenges WHERE email = ? AND used = 0 ORDER BY expires_at DESC LIMIT 1"
  )
    .bind(email)
    .first<{ id: string; code_hash: string; expires_at: number; attempts: number; used: number }>();

  if (!row || row.expires_at < now) return fail();
  if (row.attempts >= 5) return fail();

  // Increment attempts first (prevents brute force)
  await env.DB.prepare("UPDATE auth_challenges SET attempts = attempts + 1 WHERE id = ?")
    .bind(row.id)
    .run();

  // Verify code hash
  const expectedHash = await sha256Hex(`${row.id}:${code}`);
  if (!safeEqual(expectedHash, row.code_hash)) return fail();

  // Mark used
  await env.DB.prepare("UPDATE auth_challenges SET used = 1 WHERE id = ?").bind(row.id).run();

  // Must have active entitlement
  const user = await env.DB.prepare("SELECT customer_id FROM users WHERE email = ?")
    .bind(email)
    .first<{ customer_id: string }>();

  if (!user?.customer_id) return fail();

  const ent = await env.DB.prepare(
    "SELECT status FROM entitlements WHERE customer_id = ? LIMIT 1"
  )
    .bind(user.customer_id)
    .first<{ status: string }>();

  if (ent?.status !== "active") return fail();

  // Delete older sessions for this email (single-use per email)
  await env.DB.prepare(`DELETE FROM sessions WHERE email = ?`).bind(email).run();

  // Create session token (7 days)
  const sessionId = randomId();
  const expiresAt = nowMs() + 7 * 24 * 60 * 60 * 1000;

  const tokenPlain = `${email}:${user.customer_id}:${expiresAt}:${sessionId}`;
  const sig = await hmacHex(env.AUTH_TOKEN_SECRET!, tokenPlain);
  const sessionToken = `rw1.${btoa(tokenPlain)}.${sig}`;

  const tokenHash = await sha256Hex(sessionToken);

  await env.DB.prepare(
    "INSERT OR REPLACE INTO sessions (token_hash, email, customer_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(tokenHash, email, user.customer_id, expiresAt, nowMs())
    .run();

  // Normalize response time
  const elapsed = Date.now() - startedAt;
  if (elapsed < MIN_MS) await sleep(MIN_MS - elapsed);

  return Response.json({ ok: true, session_token: sessionToken, expires_at: expiresAt }, { headers: corsHeaders });
}

export async function requireSession(request: Request, env: Env) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token.startsWith("rw1.")) {
    return { ok: false as const, status: 401, error: "missing_session" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false as const, status: 401, error: "invalid_session" };

  const tokenPlain = atob(parts[1]);
  const sig = parts[2];

  const expectedSig = await hmacHex(env.AUTH_TOKEN_SECRET!, tokenPlain);
  if (sig !== expectedSig) return { ok: false as const, status: 401, error: "bad_signature" };

  const [email, customerId, expiresAtStr] = tokenPlain.split(":");
  const expiresAt = Number(expiresAtStr);

  if (!email || !customerId || !Number.isFinite(expiresAt)) {
    return { ok: false as const, status: 401, error: "invalid_payload" };
  }

  if (nowMs() > expiresAt) return { ok: false as const, status: 401, error: "session_expired" };

  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare("SELECT email, customer_id, expires_at FROM sessions WHERE token_hash = ?")
    .bind(tokenHash)
    .first<{ email: string; customer_id: string; expires_at: number }>();

  if (!row) return { ok: false as const, status: 401, error: "session_not_found" };
  if (nowMs() > row.expires_at) return { ok: false as const, status: 401, error: "session_expired" };

  return { ok: true as const, email: row.email, customer_id: row.customer_id };
}

export async function authLogout(request: Request, env: Env) {
  const origin = request.headers.get("origin") ?? "";
  const corsHeaders = getCorsHeaders(origin);

  // For OPTIONS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  // Get session token from Authorization header
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  // Delete session from database if token is provided
  if (token && token.startsWith("rw1.")) {
    try {
      const tokenHash = await sha256Hex(token);
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
        .bind(tokenHash)
        .run();
    } catch (e) {
      // Best effort - continue anyway
      console.log("Logout: failed to delete session", e);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "content-type": "application/json",
      "Set-Cookie": clearSessionCookie(),
    },
  });
}
