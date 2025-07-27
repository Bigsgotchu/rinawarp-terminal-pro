// Strict CSP Configuration (no unsafe-inline for scripts)
// This configuration blocks all inline event handlers and eval()
export const getStrictCSPHeader = nonce => {
  const directives = [
    "default-src 'self'",
    `script-src 'self' https://js.stripe.com https://checkout.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Keeping unsafe-inline for styles temporarily
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' wss: ws: https://api.stripe.com https://checkout.stripe.com https://www.google-analytics.com https://analytics.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
    "form-action 'self' https://checkout.stripe.com",
    'upgrade-insecure-requests',
  ];

  return directives.join('; ');
};

// Development CSP (more permissive for local testing)
export const getDevCSPHeader = () => {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https:",
    "connect-src 'self' wss: ws: https:",
    "object-src 'none'",
    "base-uri 'self'",
  ];

  return directives.join('; ');
};
