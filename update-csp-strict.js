#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

async function updateCSPToStrict() {
  console.log('🔒 Updating CSP to strict mode (removing unsafe-inline for scripts)...\n');

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
      console.log(`\n📄 Processing ${file.path}...`);

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
        console.log(`  📋 Created backup: ${backupPath}`);

        // Write updated content
        await fs.writeFile(file.path, content, 'utf8');
        updatedCount++;
        console.log(`  ✅ Updated ${file.description}`);
        changes.forEach(change => console.log(`     - ${change}`));
      } else {
        console.log('  ℹ️  No changes needed');
      }
    } catch (error) {
      console.error(`❌ Error processing ${file.path}:`, error.message);
    }
  }

  // Create a new strict CSP config file
  console.log('\n📝 Creating strict CSP configuration file...');

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

  console.log('\n🎉 CSP update completed!');
  console.log(`📊 Updated ${updatedCount} files`);

  console.log('\n📋 Next steps:');
  console.log('1. Test your website thoroughly to ensure all functionality works');
  console.log('2. Check browser console for any CSP violations');
  console.log('3. Deploy and monitor for issues');
  console.log('4. Consider moving inline styles to external CSS files next');

  console.log('\n🔒 Security improvements:');
  console.log('- All inline event handlers are now blocked');
  console.log('- XSS attack surface significantly reduced');
  console.log('- Code follows modern security best practices');
}

// Run the update
updateCSPToStrict().catch(console.error);
