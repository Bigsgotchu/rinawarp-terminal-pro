#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Update the server middleware to allow inline handlers temporarily
const updatedMiddleware = `export const securityHeaders = (req, res, next) => {
  // Generate a nonce for this request
  const nonce = Buffer.from(Math.random().toString()).toString('base64');
  res.locals.nonce = nonce;

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // TEMPORARY: More permissive CSP to allow inline handlers while we migrate
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com",
    "script-src-attr 'unsafe-inline'", // Allow inline event handlers temporarily
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' wss: ws: https://api.stripe.com https://www.google-analytics.com https://analytics.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "form-action 'self' https://hooks.stripe.com",
    "upgrade-insecure-requests"
  ];

  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  // HSTS for HTTPS
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
};

export default securityHeaders;
`;

// Write the updated middleware
fs.writeFileSync('src/middleware/securityHeaders.js', updatedMiddleware);
console.log('✅ Updated security headers to allow inline handlers temporarily\n');

// Also update the final server if it has inline CSP
if (fs.existsSync('final-server.js')) {
  let serverContent = fs.readFileSync('final-server.js', 'utf8');

  // Look for CSP header setting
  if (serverContent.includes('Content-Security-Policy')) {
    // Update to more permissive CSP
    serverContent = serverContent.replace(
      /script-src-attr\s*['"][^'"]*['"]/g,
      'script-src-attr \'unsafe-inline\''
    );

    // If script-src doesn't have unsafe-inline, add it
    serverContent = serverContent.replace(/script-src\s+['"]([^'"]+)['"]/g, (match, p1) => {
      if (!p1.includes('unsafe-inline')) {
        return `script-src '${p1} 'unsafe-inline''`;
      }
      return match;
    });

    fs.writeFileSync('final-server.js', serverContent);
  }
}

console.log('⚠️  IMPORTANT:');
