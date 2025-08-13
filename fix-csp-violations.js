#!/usr/bin/env node

/**
 * CSP Violation Fixer for RinaWarp Terminal
 * This script identifies and fixes common CSP violations in HTML files
 */

import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const publicDir = './public';

// Track all the hashes we generate
const scriptHashes = new Set();
const styleHashes = new Set();

// Common inline scripts that need hashing
const _unusedCommonScripts = {
  googleAnalytics: `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-G424CV5GGT');
  `,
  logRocket: `
    window.LogRocket && window.LogRocket.init('xljdaq/rinawarp-terminal', {
      release: '1.0.6',
      console: {
        isEnabled: true,
        shouldAggregateConsoleErrors: true
      }
    });
    
    // Track page view
    window.LogRocket && window.LogRocket.track('Page View', {
      page: window.location.pathname,
      timestamp: new Date().toISOString()
    });
  `,
};

// Function to generate CSP hash for content
function generateCSPHash(content) {
  // Remove leading/trailing whitespace and normalize
  const normalizedContent = content.trim();
  const hash = createHash('sha256').update(normalizedContent, 'utf8').digest('base64');
  return `'sha256-${hash}'`;
}

// Function to extract inline scripts from HTML
function extractInlineScripts(htmlContent) {
  const scriptRegex = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
  const scripts = [];
  let match;

  while ((match = scriptRegex.exec(htmlContent)) !== null) {
    const scriptContent = match[1].trim();
    if (scriptContent) {
      const hash = generateCSPHash(scriptContent);
      scripts.push({
        content: scriptContent,
        hash: hash,
        fullMatch: match[0],
      });
      scriptHashes.add(hash);
    }
  }

  return scripts;
}

// Function to extract inline styles
function extractInlineStyles(htmlContent) {
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  const styles = [];
  let match;

  while ((match = styleRegex.exec(htmlContent)) !== null) {
    const styleContent = match[1].trim();
    if (styleContent) {
      const hash = generateCSPHash(styleContent);
      styles.push({
        content: styleContent,
        hash: hash,
        fullMatch: match[0],
      });
      styleHashes.add(hash);
    }
  }

  return styles;
}

// Function to find inline event handlers
function findInlineEventHandlers(htmlContent) {
  const eventHandlers = [];
  const handlerRegex = /\s(on\w+)=["']([^"']*)["']/gi;
  let match;

  while ((match = handlerRegex.exec(htmlContent)) !== null) {
    eventHandlers.push({
      attribute: match[1],
      content: match[2],
      fullMatch: match[0],
    });
  }

  return eventHandlers;
}

// Function to convert inline event handlers to external scripts
function convertInlineHandlers(htmlContent, fileName) {
  const handlers = findInlineEventHandlers(htmlContent);

  if (handlers.length === 0) {
    return htmlContent;
  }

  let updatedContent = htmlContent;
  let jsContent = `// Auto-generated CSP-safe event handlers for ${fileName}\n`;
  let handlerCounter = 0;

  handlers.forEach(handler => {
    handlerCounter++;
    const functionName = `${handler.attribute}Handler${handlerCounter}`;

    // Add the function to JS content
    jsContent += `
function ${functionName}(element) {
  ${handler.content}
}
`;

    // Replace inline handler with data attribute and class
    const replacement = ` data-${handler.attribute}="${handler.content}" class="csp-event-handler"`;
    updatedContent = updatedContent.replace(handler.fullMatch, replacement);
  });

  if (handlerCounter > 0) {
    // Add event delegation script
    jsContent += `
// Event delegation for CSP compliance
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.csp-event-handler').forEach(function(element) {
    ${handlers
      .map(
        (handler, index) => `
    if (element.hasAttribute('data-${handler.attribute}')) {
      element.addEventListener('${handler.attribute.substring(2)}', function(event) {
        ${handler.attribute}Handler${index + 1}(this);
      });
    }`
      )
      .join('')}
  });
});
`;

    // Write the JS file
    const jsFileName = `js/csp-handlers-${fileName.replace('.html', '')}.js`;
    const _jsFilePath = path.join(publicDir, jsFileName);

    return { updatedContent, jsContent, jsFileName };
  }

  return { updatedContent };
}

// Function to process HTML files
async function processHTMLFile(filePath) {
  console.log(`\n🔍 Processing: ${filePath}`);

  const content = await fs.readFile(filePath, 'utf8');
  const fileName = path.basename(filePath);

  // Extract inline scripts and styles
  const inlineScripts = extractInlineScripts(content);
  const inlineStyles = extractInlineStyles(content);
  const eventHandlers = findInlineEventHandlers(content);

  console.log(`   📜 Found ${inlineScripts.length} inline scripts`);
  console.log(`   🎨 Found ${inlineStyles.length} inline styles`);
  console.log(`   🖱️  Found ${eventHandlers.length} inline event handlers`);

  // Show the hashes needed for scripts
  if (inlineScripts.length > 0) {
    console.log('   🔐 Script hashes needed:');
    inlineScripts.forEach((script, index) => {
      console.log(`      ${index + 1}. ${script.hash}`);
      console.log(`         Content preview: "${script.content.substring(0, 50)}..."`);
    });
  }

  // Convert inline handlers if any exist
  if (eventHandlers.length > 0) {
    console.log('   ⚠️  Converting inline event handlers to external JS');
    const result = convertInlineHandlers(content, fileName);

    if (result.jsContent) {
      // Save the JS file
      const jsFilePath = path.join(publicDir, result.jsFileName);
      await fs.mkdir(path.dirname(jsFilePath), { recursive: true });
      await fs.writeFile(jsFilePath, result.jsContent);
      console.log(`   ✅ Created ${result.jsFileName}`);

      // Add script tag to HTML
      const scriptTag = `    <script src="${result.jsFileName}"></script>\n</head>`;
      result.updatedContent = result.updatedContent.replace('</head>', scriptTag);

      // Save updated HTML
      await fs.writeFile(filePath, result.updatedContent);
      console.log(`   ✅ Updated ${fileName} with external event handlers`);
    }
  }
}

// Function to scan directory for HTML files
async function scanDirectory(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await scanDirectory(fullPath);
      files.push(...subFiles);
    } else if (entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Function to generate updated CSP configuration
function generateUpdatedCSP() {
  const allScriptHashes = Array.from(scriptHashes);
  const allStyleHashes = Array.from(styleHashes);

  console.log('\n🛡️ Updated CSP Configuration needed:');
  console.log(`   📜 Script hashes (${allScriptHashes.length}):`);
  allScriptHashes.forEach(hash => console.log(`      ${hash}`));

  if (allStyleHashes.length > 0) {
    console.log(`   🎨 Style hashes (${allStyleHashes.length}):`);
    allStyleHashes.forEach(hash => console.log(`      ${hash}`));
  }

  const cspConfig = `
// Updated CSP Configuration with all required hashes
export const getCSPHeader = (nonce) => {
  const scriptHashes = [
    ${allScriptHashes.map(hash => `    ${hash}`).join(',\n')}
  ];
  
  const directives = [
    "default-src 'self'",
    \`script-src 'self' \${scriptHashes.join(' ')} https://js.stripe.com https://checkout.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://cdn.logrocket.io\`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob: https://www.google-analytics.com https://www.googletagmanager.com https://*.stripe.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' wss: ws: https://api.stripe.com https://checkout.stripe.com https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://*.railway.app https://*.logrocket.io",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ];

  return directives.join('; ');
};
`;

  return cspConfig;
}

// Main execution
async function main() {
  console.log('🚀 Starting CSP Violation Analysis for RinaWarp Terminal\n');

  try {
    // Scan all HTML files
    const htmlFiles = await scanDirectory(publicDir);
    console.log(`📁 Found ${htmlFiles.length} HTML files to analyze\n`);

    // Process each HTML file
    for (const file of htmlFiles) {
      await processHTMLFile(file);
    }

    console.log('\n📊 Analysis Summary:');
    console.log(`   📜 Total unique script hashes needed: ${scriptHashes.size}`);
    console.log(`   🎨 Total unique style hashes needed: ${styleHashes.size}`);

    // Generate updated CSP configuration
    const updatedCSP = generateUpdatedCSP();

    // Save the updated CSP configuration
    await fs.writeFile('./src/config/csp-config-updated.js', updatedCSP);
    console.log('\n✅ Updated CSP configuration saved to src/config/csp-config-updated.js');

    console.log('\n🎯 Next Steps:');
    console.log('1. Review the generated CSP configuration');
    console.log('2. Update your server.js to use the new CSP hashes');
    console.log('3. Test your pages to ensure no CSP violations');
    console.log('4. Move from CSP-Report-Only to enforcing CSP');
  } catch (error) {
    console.error('❌ Error during CSP analysis:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
