// Updated CSP Configuration for Maximum Security
export const getCSPHeader = nonce => {
  const directives = [
    "default-src 'self'",
    `script-src 'self' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com 'nonce-${nonce}'`,
    "script-src-attr 'none'", // Block all inline event handlers
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' wss: ws: https://api.stripe.com https://www.google-analytics.com",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "form-action 'self' https://hooks.stripe.com",
    'upgrade-insecure-requests',
  ];

  return directives.join('; ');
};
