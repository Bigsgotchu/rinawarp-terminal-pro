#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Fixing CSP Inline Event Handler Issues\n');

// 1. Fix the most critical files first (main website pages)
const criticalFiles = [
  'index.html',
  'pricing.html',
  'public/index.html',
  'public/pricing.html',
  'public/checkout.html',
  'public/success.html',
];

// Function to convert inline handlers to event listeners
function fixInlineHandlers(filePath) {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let scriptCode = '';
  let elementCounter = 0;

  // Pattern to match inline event handlers
  const handlerPattern = /\son(\w+)\s*=\s*["']([^"']+)["']/gi;

  // Extract and replace inline handlers
  content = content.replace(handlerPattern, (match, eventType, handlerCode, offset) => {
    elementCounter++;
    const uniqueId = `csp-safe-${Date.now()}-${elementCounter}`;

    // Add to script code
    scriptCode += `
  // Handler for ${eventType} event
  document.addEventListener('DOMContentLoaded', function() {
    const element = document.querySelector('[data-handler-id="${uniqueId}"]');
    if (element) {
      element.addEventListener('${eventType}', function(event) {
        ${handlerCode.replace(/&quot;/g, '"').replace(/&amp;/g, '&')}
      });
    }
  });
`;

    // Return data attribute instead of inline handler
    return ` data-handler-id="${uniqueId}"`;
  });

  // If we made changes, add the script at the end of body
  if (scriptCode && content !== originalContent) {
    // Find </body> tag and insert script before it
    const bodyEndIndex = content.lastIndexOf('</body>');
    if (bodyEndIndex !== -1) {
      const scriptTag = `
<script>
(function() {
  'use strict';
  ${scriptCode}
})();
</script>
`;
      content = content.slice(0, bodyEndIndex) + scriptTag + content.slice(bodyEndIndex);
    }

    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${filePath}`);
    return true;
  }

  return false;
}

// Fix critical files
console.log('1️⃣ Fixing Critical HTML Files:');
let fixedCount = 0;
criticalFiles.forEach(file => {
  if (fixInlineHandlers(file)) {
    fixedCount++;
  }
});

// 2. Create a safer event handler utility
console.log('\n2️⃣ Creating Safe Event Handler Utility:');

const safeEventHandlerUtil = `// Safe Event Handler Utility for CSP Compliance
// This replaces inline event handlers with programmatic event listeners

class SafeEventHandler {
  static init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.attachHandlers.bind(this));
    } else {
      this.attachHandlers();
    }
  }
  
  static attachHandlers() {
    // Replace purchasePlan inline handlers
    document.querySelectorAll('[data-plan]').forEach(element => {
      const plan = element.getAttribute('data-plan');
      element.addEventListener('click', () => {
        if (typeof purchasePlan === 'function') {
          purchasePlan(plan);
        }
      });
    });
    
    // Replace any remaining onclick handlers
    document.querySelectorAll('[onclick]').forEach(element => {
      console.warn('Found inline onclick handler, converting to event listener');
      const handler = element.getAttribute('onclick');
      element.removeAttribute('onclick');
      element.addEventListener('click', function(event) {
        try {
          // Create a function from the handler string
          const fn = new Function('event', handler);
          fn.call(this, event);
        } catch (e) {
          console.error('Error executing handler:', e);
        }
      });
    });
    
    // Handle other event types
    const eventTypes = ['onchange', 'onsubmit', 'onload', 'onkeyup', 'onkeydown', 'onmouseover'];
    eventTypes.forEach(eventAttr => {
      const eventType = eventAttr.substring(2); // Remove 'on' prefix
      document.querySelectorAll(\`[\${eventAttr}]\`).forEach(element => {
        console.warn(\`Found inline \${eventAttr} handler, converting to event listener\`);
        const handler = element.getAttribute(eventAttr);
        element.removeAttribute(eventAttr);
        element.addEventListener(eventType, function(event) {
          try {
            const fn = new Function('event', handler);
            fn.call(this, event);
          } catch (e) {
            console.error(\`Error executing \${eventType} handler:\`, e);
          }
        });
      });
    });
  }
}

// Initialize when loaded
SafeEventHandler.init();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SafeEventHandler;
}
`;

fs.writeFileSync('public/js/safe-event-handler.js', safeEventHandlerUtil);
console.log('   ✅ Created public/js/safe-event-handler.js');

// 3. Update CSP headers to be more secure
console.log('\n3️⃣ Updating CSP Configuration:');

const cspConfig = `// Updated CSP Configuration for Maximum Security
export const getCSPHeader = (nonce) => {
  const directives = [
    "default-src 'self'",
    \`script-src 'self' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com 'nonce-\${nonce}'\`,
    "script-src-attr 'none'", // Block all inline event handlers
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' wss: ws: https://api.stripe.com https://www.google-analytics.com",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "form-action 'self' https://hooks.stripe.com",
    "upgrade-insecure-requests"
  ];
  
  return directives.join('; ');
};
`;

fs.writeFileSync('src/config/csp-config.js', cspConfig);
console.log('   ✅ Created src/config/csp-config.js');

// 4. Create migration guide
console.log('\n4️⃣ Creating Migration Guide:');

const migrationGuide = `# CSP Inline Handler Migration Guide

## What Changed?
We've removed all inline event handlers (onclick, onload, etc.) to comply with Content Security Policy (CSP) best practices. This makes the website more secure against XSS attacks.

## How to Update Your Code

### Before (Insecure):
\`\`\`html
<button onclick="purchasePlan('basic')">Buy Basic Plan</button>
\`\`\`

### After (Secure):
\`\`\`html
<button data-plan="basic" class="purchase-button">Buy Basic Plan</button>
\`\`\`

\`\`\`javascript
document.querySelectorAll('.purchase-button').forEach(button => {
  button.addEventListener('click', function() {
    const plan = this.getAttribute('data-plan');
    purchasePlan(plan);
  });
});
\`\`\`

## Quick Fixes Applied:

1. **Automatic Handler Conversion**: Inline handlers are converted to data attributes with unique IDs
2. **Safe Event Handler Utility**: Automatically attaches event listeners to elements
3. **CSP Headers Updated**: Blocks all inline event handlers for maximum security

## Include Safe Handler Script:
Add this to your HTML files before closing </body>:
\`\`\`html
<script src="/public/js/safe-event-handler.js"></script>
\`\`\`

## Testing:
1. Check browser console for CSP violations
2. Verify all buttons and forms still work
3. Test payment flow with Stripe
`;

fs.writeFileSync('CSP_MIGRATION_GUIDE.md', migrationGuide);
console.log('   ✅ Created CSP_MIGRATION_GUIDE.md');

console.log(`\n✅ Fixed ${fixedCount} files with inline handlers`);
console.log('\n🎯 Next Steps:');
console.log('1. Deploy these changes');
console.log('2. Test all interactive elements (buttons, forms)');
console.log('3. Check browser console for any remaining CSP violations');
console.log('4. Add safe-event-handler.js to any pages still showing errors');

// 5. Show example of how to fix remaining issues
console.log('\n📝 Example Fix for Remaining Issues:');
console.log('If you see CSP errors on specific pages, add this before </body>:');
console.log(`
<script src="/public/js/safe-event-handler.js"></script>
<script>
  // Page-specific handlers
  document.addEventListener('DOMContentLoaded', function() {
    // Example: Fix purchase buttons
    document.querySelectorAll('button[onclick*="purchasePlan"]').forEach(btn => {
      const match = btn.getAttribute('onclick').match(/purchasePlan\\('(\\w+)'\\)/);
      if (match) {
        btn.removeAttribute('onclick');
        btn.addEventListener('click', () => purchasePlan(match[1]));
      }
    });
  });
</script>
`);
