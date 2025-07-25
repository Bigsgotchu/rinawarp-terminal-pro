/**
 * Enhanced Security Headers Middleware
 * Fixes CSP issues with Stripe and improves overall security
 */

import crypto from 'crypto';

// Generate a unique nonce for each request
const generateNonce = () => crypto.randomBytes(16).toString('base64');

const securityHeadersMiddleware = (req, res, next) => {
  // Generate nonce for this request
  const nonce = generateNonce();
  res.locals.nonce = nonce;

  // Enhanced security headers
  const headers = {
    // HSTS - Enforce HTTPS
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Prevent clickjacking
    'X-Frame-Options': 'SAMEORIGIN',

    // Control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions Policy (Feature Policy)
    'Permissions-Policy':
      'geolocation=(), microphone=(), camera=(), payment=(self https://js.stripe.com)',

    // Enhanced CSP that allows Stripe to work properly
    'Content-Security-Policy': [
      "default-src 'self'",
      `script-src 'self' https://js.stripe.com https://checkout.stripe.com 'nonce-${nonce}'`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://checkout.stripe.com",
      "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' wss: ws: https://api.stripe.com https://checkout.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com",
      "frame-ancestors 'self'",
      "media-src 'self'",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      'upgrade-insecure-requests',
    ].join('; '),

    // XSS Protection (legacy, but still useful for older browsers)
    'X-XSS-Protection': '1; mode=block',

    // DNS Prefetch Control
    'X-DNS-Prefetch-Control': 'on',

    // Download Options for IE
    'X-Download-Options': 'noopen',

    // Cross-Origin policies
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
  };

  // Apply all headers
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Special handling for certain routes
  if (req.path === '/api/stripe-webhook') {
    // Stripe webhooks need raw body, adjust CSP
    res.setHeader(
      'Content-Security-Policy',
      headers['Content-Security-Policy'].replace(
        "form-action 'self'",
        "form-action 'self' https://stripe.com"
      )
    );
  }

  next();
};

// Helper middleware to inject nonce into HTML responses
export const nonceInjector = (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    if (res.get('Content-Type')?.includes('text/html') && res.locals.nonce) {
      // Inject nonce into inline scripts
      const modifiedData = data
        .toString()
        .replace(/<script>/g, `<script nonce="${res.locals.nonce}">`)
        .replace(/onclick="/g, 'data-onclick="') // Convert onclick to data attributes
        .replace(/onload="/g, 'data-onload="');

      return originalSend.call(this, modifiedData);
    }
    return originalSend.call(this, data);
  };

  next();
};

export default securityHeadersMiddleware;
