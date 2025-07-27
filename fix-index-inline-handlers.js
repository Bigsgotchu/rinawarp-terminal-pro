#!/usr/bin/env node

import { promises as fs } from 'fs';

async function fixIndexInlineHandlers() {
  console.log('🔧 Fixing inline handlers in index.html...\n');

  const filePath = './public/html/index.html';

  try {
    let content = await fs.readFile(filePath, 'utf8');
    const originalContent = content;
    let fixCount = 0;

    // Find the problematic button with inline handlers (line 463)
    const buttonRegex =
      /<button[^>]*onclick="window\.location\.href='\/pricing\.html'"[^>]*onmouseover="[^"]*"[^>]*onmouseout="[^"]*"[^>]*>(.*?)<\/button>/s;

    content = content.replace(buttonRegex, (match, buttonContent) => {
      fixCount++;
      // Extract the styles
      const styleMatch = match.match(/style="([^"]*)"/);
      const style = styleMatch ? styleMatch[1] : '';

      // Create a new button with data attributes instead of inline handlers
      return `<button 
                    data-action="navigate" 
                    data-url="/pricing.html"
                    class="pricing-cta-button"
                    style="${style}">${buttonContent}</button>`;
    });

    // Add the event listeners and styles if not already present
    if (fixCount > 0 && !content.includes('pricing-cta-button-handlers')) {
      const bodyCloseIndex = content.lastIndexOf('</body>');
      if (bodyCloseIndex !== -1) {
        const eventHandlerScript = `
    <!-- Safe Event Handlers for Pricing Button -->
    <script id="pricing-cta-button-handlers">
        // Safe event handlers for CSP compliance
        document.addEventListener('DOMContentLoaded', function() {
            // Handle navigation buttons
            document.querySelectorAll('[data-action="navigate"]').forEach(button => {
                button.addEventListener('click', function() {
                    const url = this.getAttribute('data-url');
                    if (url) {
                        window.location.href = url;
                    }
                });
            });

            // Handle hover effects for pricing CTA button
            document.querySelectorAll('.pricing-cta-button').forEach(button => {
                // Store original styles
                const originalTransform = button.style.transform || 'none';
                const originalBoxShadow = button.style.boxShadow || '0 8px 25px rgba(255, 20, 147, 0.4)';
                
                button.addEventListener('mouseover', function() {
                    this.style.transform = 'translateY(-2px) scale(1.05)';
                    this.style.boxShadow = '0 15px 40px rgba(255, 20, 147, 0.6)';
                });
                
                button.addEventListener('mouseout', function() {
                    this.style.transform = originalTransform;
                    this.style.boxShadow = originalBoxShadow;
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
      console.log(`✅ Fixed ${fixCount} inline handler issues in ${filePath}`);
    } else {
      console.log(`ℹ️  No inline handlers found in ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }

  console.log('\n🎉 Index page CSP fixes completed!');
}

// Run the fix
fixIndexInlineHandlers().catch(console.error);
