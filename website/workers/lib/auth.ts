/**
 * RinaWarp Authentication Library
 * 
 * Provides secure authentication utilities for Cloudflare Workers:
 * - Password hashing using PBKDF2 (Web Crypto API)
 * - JWT token generation and verification
 * - Rate limiting helpers
 * - Email validation
 */

const JWT_SECRET_BYTES = 32;
const JWT_ALGORITHM = 'HS256';
const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days
const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

// Password hashing configuration
const PBKDF2_ITERATIONS = 100000;
const HASH_ALGORITHM = 'SHA-256';
const SALT_BYTES = 16;

/**
 * Generate a cryptographically secure random string
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a salt for password hashing
 */
async function generateSalt(): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  return btoa(String.fromCharCode(...salt));
}

/**
 * Hash a password using PBKDF2
 * Returns format: "salt:hash" (base64 encoded)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await generateSalt();
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Import the password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive the hash
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_ALGORITHM,
    },
    keyMaterial,
    256
  );
  
  const hashArray = new Uint8Array(derivedBits);
  const hash = btoa(String.fromCharCode(...hashArray));
  
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: PBKDF2_ITERATIONS,
        hash: HASH_ALGORITHM,
      },
      keyMaterial,
      256
    );
    
    const hashArray = new Uint8Array(derivedBits);
    const computedHash = btoa(String.fromCharCode(...hashArray));
    
    return crypto.subtle.timingSafeEqual(
      encoder.encode(computedHash),
      encoder.encode(hash)
    );
  } catch {
    return false;
  }
}

/**
 * Create a JWT token
 */
export async function createToken(payload: Record<string, unknown>, secret: string, expiresIn: number = TOKEN_EXPIRY_SECONDS): Promise<string> {
  const header = {
    alg: JWT_ALGORITHM,
    typ: 'JWT',
  };
  
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };
  
  const encoder = new TextEncoder();
  const base64Header = btoa(JSON.stringify(header));
  const base64Payload = btoa(JSON.stringify(tokenPayload));
  
  const signatureInput = `${base64Header}.${base64Payload}`;
  const signatureKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: HASH_ALGORITHM },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    signatureKey,
    encoder.encode(signatureInput)
  );
  
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${signatureInput}.${base64Signature}`;
}

/**
 * Verify a JWT token
 */
export async function verifyToken(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [base64Header, base64Payload, base64Signature] = parts;
    const encoder = new TextEncoder();
    
    // Verify signature
    const signatureInput = `${base64Header}.${base64Payload}`;
    const signatureKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: HASH_ALGORITHM },
      false,
      ['verify']
    );
    
    const signature = Uint8Array.from(atob(base64Signature), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify(
      'HMAC',
      signatureKey,
      signature,
      encoder.encode(signatureInput)
    );
    
    if (!valid) return null;
    
    // Decode payload
    const payload = JSON.parse(atob(base64Payload));
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isStrongPassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Simple rate limiter using in-memory store
 * For production, use Cloudflare Rate Limiting or KV
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(identifier: string, limit: number = 5, windowMs: number = 60000): boolean {
  cleanupRateLimits();
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);
  
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (entry.count >= limit) {
    return false;
  }
  
  entry.count++;
  return true;
}

/**
 * Get remaining rate limit attempts
 */
export function getRateLimitRemaining(identifier: string, limit: number = 5, windowMs: number = 60000): number {
  cleanupRateLimits();
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);
  
  if (!entry || entry.resetAt < now) {
    return limit;
  }
  
  return Math.max(0, limit - entry.count);
}

/**
 * Clean up expired rate limit entries
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Create a password reset token (shorter expiry)
 */
export async function createPasswordResetToken(userId: string, secret: string): Promise<string> {
  return createToken({ userId, type: 'password_reset' }, secret, Math.floor(RESET_TOKEN_EXPIRY_MS / 1000));
}

/**
 * Verify password reset token
 */
export async function verifyPasswordResetToken(token: string, secret: string): Promise<string | null> {
  const payload = await verifyToken(token, secret);
  if (!payload || payload.type !== 'password_reset') return null;
  return payload.userId as string;
}

/**
 * Generate user ID
 */
export function generateUserId(): string {
  return generateSecureToken(24);
}

/**
 * Sanitize user object for API response
 */
export function sanitizeUser(user: { id: string; email: string; name: string | null; created_at: number }): {
  id: string;
  email: string;
  name: string | null;
  createdAt: number;
} {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.created_at,
  };
}
