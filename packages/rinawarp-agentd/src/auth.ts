import crypto from "node:crypto";
import type { IncomingMessage } from "node:http";

type TokenKind = "access" | "refresh";

export type AuthClaims = {
  sub: string;
  email: string;
  role: "owner" | "admin" | "member";
  kind: TokenKind;
  jti?: string;
  iat: number;
  exp: number;
};

function b64urlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64urlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64");
}

function signParts(headerPart: string, payloadPart: string, secret: string): string {
  return b64urlEncode(crypto.createHmac("sha256", secret).update(`${headerPart}.${payloadPart}`, "utf8").digest());
}

function secureCompare(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function createSignedAuthToken(input: {
  sub: string;
  email: string;
  role?: "owner" | "admin" | "member";
  kind: TokenKind;
  jti?: string;
  ttlSec: number;
  secret: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthClaims = {
    sub: input.sub,
    email: input.email.toLowerCase(),
    role: input.role || "owner",
    kind: input.kind,
    ...(input.jti ? { jti: input.jti } : {}),
    iat: now,
    exp: now + Math.max(60, Math.floor(input.ttlSec)),
  };
  const header = { alg: "HS256", typ: "JWT" };
  const h = b64urlEncode(JSON.stringify(header));
  const p = b64urlEncode(JSON.stringify(payload));
  const s = signParts(h, p, input.secret);
  return `${h}.${p}.${s}`;
}

export function verifySignedAuthToken(token: string, secret: string): AuthClaims | null {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = signParts(h, p, secret);
  if (!secureCompare(expected, s)) return null;
  try {
    const parsed = JSON.parse(b64urlDecode(p).toString("utf8")) as AuthClaims;
    if (!parsed || !parsed.sub || !parsed.email || !parsed.kind || !parsed.exp || !parsed.iat) return null;
    if (!["access", "refresh"].includes(parsed.kind)) return null;
    if (!["owner", "admin", "member"].includes(parsed.role)) return null;
    if (Math.floor(Date.now() / 1000) >= parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readBearer(req: IncomingMessage): string {
  const authz = String(req.headers["authorization"] || "").trim();
  if (!authz.toLowerCase().startsWith("bearer ")) return "";
  return authz.slice(7).trim();
}

export function parseAuthClaims(req: IncomingMessage): AuthClaims | null {
  const token = readBearer(req);
  if (!token) return null;
  const secret = String(process.env.RINAWARP_AGENTD_AUTH_SECRET || "").trim();
  if (!secret) return null;
  return verifySignedAuthToken(token, secret);
}

/**
 * Auth mode precedence:
 * 1) Signed JWT-like access token when RINAWARP_AGENTD_AUTH_SECRET is set
 * 2) Legacy static bearer token via RINAWARP_AGENTD_TOKEN
 * 3) Open (dev) when neither is set
 */
export function requireAuth(req: IncomingMessage, opts?: { allowAnonymous?: boolean }) {
  if (opts?.allowAnonymous) return;
  const claims = parseAuthClaims(req);
  if (claims) return;

  const required = String(process.env.RINAWARP_AGENTD_TOKEN || "").trim();
  if (!required) {
    // If no auth is configured, allow local-dev mode.
    if (!process.env.RINAWARP_AGENTD_AUTH_SECRET) return;
    const e = new Error("Unauthorized");
    (e as Error & { statusCode?: number }).statusCode = 401;
    throw e;
  }

  const got = req.headers["authorization"];
  if (!got || got !== `Bearer ${required}`) {
    const e = new Error("Unauthorized");
    (e as Error & { statusCode?: number }).statusCode = 401;
    throw e;
  }
}
