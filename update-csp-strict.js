#!/usr/bin/env node

import { promises as fs } from 'fs';
// import path from 'path'; // Currently unused

async function updateCSPToStrict() {
  // Files to update
  const filesToUpdate = [
    {
      path: './server.js',
      description: 'Main server configuration',
    },
    {
      path: './src/middleware/securityHeaders.js',
      description: 'Security headers middleware',
    },
  ];

  let updatedCount = 0;

  for (const file of filesToUpdate) {
    try {
      if (
        !(await fs
          .access(file.path)
          .then(() => true)
          .catch(() => false))
      ) {
        console.log(`⚠️  File not found: ${file.path}`);
        continue;
      }

      let content = await fs.readFile(file.path, 'utf8');
      const originalContent = content;
      const changes = [];

      // Remove scriptSrcAttr with unsafe-hashes
      if (content.includes('scriptSrcAttr:')) {
        content = content.replace(/scriptSrcAttr:\s*\[[^\]]*\],?\s*/g, '');
        changes.push('Removed scriptSrcAttr directive');
      }

      // For server.js, we need to ensure scriptSrc doesn't have unsafe-inline
      // The current config already doesn't have unsafe-inline for scripts, just for styles
      // So we mainly need to remove the scriptSrcAttr line

      // Also update any comments about inline handlers
      content = content.replace(
        /\/\/ Allow inline event handlers with CSP nonce/g,
        '// Inline event handlers are now blocked for security'
      );

      // Write the file back if changes were made
      if (content !== originalContent) {
        // Create backup
        const backupPath = `${file.path}.backup-${Date.now()}`;
        await fs.writeFile(backupPath, originalContent, 'utf8');

        // Write updated content
        await fs.writeFile(file.path, content, 'utf8');
        updatedCount++;
      } else {
      }
    } catch (error) {
      console.error(`❌ Error processing ${file.path}:`, error.message);
    }
  }

  // Create a new strict CSP config file

  const strictCSPConfig = `// Strict CSP Configuration (no unsafe-inline for scripts)
// This configuration blocks all inline event handlers and eval()
export const getStrictCSPHeader = (nonce) => {
  const directives = [
    "default-src 'self'",
    \`script-src 'self' https://js.stripe.com https://checkout.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com 'nonce-\${nonce}'\`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Keeping unsafe-inline for styles temporarily
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' wss: ws: https://api.stripe.com https://checkout.stripe.com https://www.google-analytics.com https://analytics.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
    "form-action 'self' https://checkout.stripe.com",
    "upgrade-insecure-requests"
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
    "base-uri 'self'"
  ];

  return directives.join('; ');
};
`;

  await fs.writeFile('./src/config/csp-config-strict.js', strictCSPConfig, 'utf8');
  console.log('✅ Created strict CSP configuration file');

  console.log(`📊 Updated ${updatedCount} files`);
}

// Run the update
updateCSPToStrict().catch(console.error);
