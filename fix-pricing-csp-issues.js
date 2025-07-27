#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

async function fixPricingCSPIssues() {
  console.log('🔧 Fixing CSP inline handler issues in pricing pages...\n');

  // Files to fix
  const filesToFix = ['./pricing.html', './public/html/pricing.html'];

  let totalFixed = 0;

  for (const filePath of filesToFix) {
    try {
      console.log(`\n📄 Processing ${filePath}...`);

      // Read the file
      let content = await fs.readFile(filePath, 'utf8');
      const originalContent = content;
      let fixCount = 0;

      // Fix 1: Replace onclick handlers in buttons with data attributes
      // Pattern 1: onclick="purchasePlan('...')"
      content = content.replace(/onclick="purchasePlan\('([^']+)'\)"/g, (match, plan) => {
        fixCount++;
        return `data-action="purchase" data-plan="${plan}"`;
      });

      // Pattern 2: onclick="purchaseBeta('...')"
      content = content.replace(/onclick="purchaseBeta\('([^']+)'\)"/g, (match, plan) => {
        fixCount++;
        return `data-action="purchase-beta" data-plan="${plan}"`;
      });

      // Pattern 3: onclick="window.open(...)"
      content = content.replace(/onclick="window\.open\('([^']+)'[^"]*\)"/g, (match, url) => {
        fixCount++;
        return `data-action="open-link" data-url="${url}"`;
      });

      // Fix 2: Add event listener script at the end of body if not already present
      if (fixCount > 0 && !content.includes('safe-event-handlers')) {
        // Find the closing body tag
        const bodyCloseIndex = content.lastIndexOf('</body>');
        if (bodyCloseIndex !== -1) {
          const eventHandlerScript = `
    <!-- Safe Event Handlers for CSP Compliance -->
    <script>
        // Safe event handlers for CSP compliance
        document.addEventListener('DOMContentLoaded', function() {
            // Handle purchase buttons
            document.querySelectorAll('[data-action="purchase"]').forEach(button => {
                button.addEventListener('click', function() {
                    const plan = this.getAttribute('data-plan');
                    if (typeof purchasePlan === 'function') {
                        purchasePlan(plan);
                    } else {
                        console.error('purchasePlan function not found');
                    }
                });
            });

            // Handle beta purchase buttons
            document.querySelectorAll('[data-action="purchase-beta"]').forEach(button => {
                button.addEventListener('click', function() {
                    const plan = this.getAttribute('data-plan');
                    if (typeof purchaseBeta === 'function') {
                        purchaseBeta(plan);
                    } else {
                        console.error('purchaseBeta function not found');
                    }
                });
            });

            // Handle external link buttons
            document.querySelectorAll('[data-action="open-link"]').forEach(button => {
                button.addEventListener('click', function() {
                    const url = this.getAttribute('data-url');
                    const target = this.getAttribute('data-target') || '_blank';
                    window.open(url, target);
                });
            });
        });
    </script>
`;
          content =
            content.slice(0, bodyCloseIndex) +
            eventHandlerScript +
            '\n' +
            content.slice(bodyCloseIndex);
        }
      }

      // Write the fixed content back
      if (content !== originalContent) {
        await fs.writeFile(filePath, content, 'utf8');
        totalFixed += fixCount;
        console.log(`✅ Fixed ${fixCount} inline handlers in ${filePath}`);
      } else {
        console.log(`ℹ️  No inline handlers found in ${filePath}`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`⚠️  File not found: ${filePath}`);
      } else {
        console.error(`❌ Error processing ${filePath}:`, error.message);
      }
    }
  }

  console.log(`\n✨ Total inline handlers fixed: ${totalFixed}`);

  // Create or update the unified checkout script to include the purchase functions
  console.log('\n📝 Updating unified checkout script...');

  const checkoutScriptPath = './src/frontend/unified-checkout.js';

  try {
    let checkoutScript = '';
    try {
      checkoutScript = await fs.readFile(checkoutScriptPath, 'utf8');
    } catch (_e) {
      // File doesn't exist, create new
      checkoutScript = '';
    }

    // Add purchase functions if they don't exist
    if (!checkoutScript.includes('function purchasePlan')) {
      const purchaseFunctions = `
// Purchase plan function
function purchasePlan(plan) {
    console.log('Purchasing plan:', plan);
    
    // Map plan names to Stripe price IDs
    const planMap = {
        'personal': 'basic',
        'professional': 'pro',
        'team': 'enterprise',
        'free': 'free',
        'basic': 'basic',
        'pro': 'pro',
        'enterprise': 'enterprise'
    };
    
    const mappedPlan = planMap[plan] || plan;
    
    if (plan === 'free') {
        // Handle free plan signup
        window.location.href = '/signup?plan=free';
        return;
    }
    
    // Redirect to checkout with plan parameter
    window.location.href = \`/checkout?plan=\${mappedPlan}\`;
}

// Purchase beta function
function purchaseBeta(plan) {
    console.log('Purchasing beta plan:', plan);
    
    // Beta plans go through a different flow
    const betaPrices = {
        'earlybird': 29,
        'beta': 39,
        'premium': 59
    };
    
    if (betaPrices[plan]) {
        // Redirect to beta checkout
        window.location.href = \`/checkout?beta=true&plan=\${plan}&price=\${betaPrices[plan]}\`;
    } else {
        console.error('Invalid beta plan:', plan);
    }
}

// Make functions globally available
window.purchasePlan = purchasePlan;
window.purchaseBeta = purchaseBeta;
`;
      checkoutScript = purchaseFunctions + '\n' + checkoutScript;

      // Ensure directory exists
      await fs.mkdir(path.dirname(checkoutScriptPath), { recursive: true });
      await fs.writeFile(checkoutScriptPath, checkoutScript, 'utf8');
      console.log('✅ Updated unified checkout script with purchase functions');
    } else {
      console.log('ℹ️  Purchase functions already exist in checkout script');
    }
  } catch (error) {
    console.error('❌ Error updating checkout script:', error.message);
  }

  console.log('\n🎉 CSP fixes completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Test the pricing pages to ensure buttons still work');
  console.log('2. Verify CSP headers allow the updated scripts');
  console.log('3. Consider updating CSP to remove unsafe-inline if not needed elsewhere');
}

// Run the fix
fixPricingCSPIssues().catch(console.error);
