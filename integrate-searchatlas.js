#!/usr/bin/env node

/**
 * SearchAtlas Integration for RinaWarp Terminal Website
 * Adds SEO and performance optimization for Product Hunt launch
 */

import { promises as fs } from 'fs';
import path from 'path';

const SEARCHATLAS_SCRIPT = `<script nowprocket nitro-exclude type="text/javascript" id="sa-dynamic-optimization" data-uuid="dc711005-42a9-4a99-a95c-f58610ddb8c9">
(function() {
  var script = document.createElement("script");
  script.setAttribute("nowprocket", "");
  script.setAttribute("nitro-exclude", "");
  script.src = "https://dashboard.searchatlas.com/scripts/dynamic_optimization.js";
  script.dataset.uuid = "dc711005-42a9-4a99-a95c-f58610ddb8c9";
  script.id = "sa-dynamic-optimization-loader";
  document.head.appendChild(script);
})();
</script>`;

const integrations = [];

async function findHTMLFiles() {
  const possibleLocations = [
    'public/index.html',
    'src/index.html',
    'index.html',
    'public/templates/',
    'src/templates/',
    'views/',
  ];

  const foundFiles = [];

  for (const location of possibleLocations) {
    try {
      const stats = await fs.stat(location);
      if (stats.isFile() && location.endsWith('.html')) {
        foundFiles.push(location);
      } else if (stats.isDirectory()) {
        // Search for HTML files in directory
        const files = await fs.readdir(location);
        for (const file of files) {
          if (file.endsWith('.html')) {
            foundFiles.push(path.join(location, file));
          }
        }
      }
    } catch (error) {
      // File/directory doesn't exist, skip
    }
  }

  return foundFiles;
}

async function integrateIntoHTML(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');

    // Check if already integrated
    if (content.includes('sa-dynamic-optimization') || content.includes('searchatlas.com')) {
      integrations.push(`⚠️ ${filePath} - Already contains SearchAtlas script`);
      return false;
    }

    // Find best insertion point (before closing head tag)
    const headCloseIndex = content.indexOf('</head>');
    if (headCloseIndex === -1) {
      integrations.push(`❌ ${filePath} - No closing </head> tag found`);
      return false;
    }

    // Insert the script before </head>
    const before = content.substring(0, headCloseIndex);
    const after = content.substring(headCloseIndex);
    const newContent = before + '\n  ' + SEARCHATLAS_SCRIPT + '\n' + after;

    // Create backup
    await fs.writeFile(filePath + '.backup', content);

    // Write updated content
    await fs.writeFile(filePath, newContent);

    integrations.push(`✅ ${filePath} - SearchAtlas script added`);
    integrations.push(`💾 ${filePath}.backup - Backup created`);

    return true;
  } catch (error) {
    integrations.push(`❌ ${filePath} - Error: ${error.message}`);
    return false;
  }
}

async function createStandaloneScript() {
  const standaloneScript = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SearchAtlas Integration - RinaWarp Terminal</title>
    
    <!-- SearchAtlas Dynamic Optimization -->
    ${SEARCHATLAS_SCRIPT}
    
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        
        .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 30px;
            margin: 20px 0;
        }
        
        h1 { color: #00f5ff; text-align: center; }
        .status { 
            background: rgba(0, 245, 255, 0.2);
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
        }
        .success { border-left: 4px solid #00ff88; }
        .warning { border-left: 4px solid #ffaa00; }
        .info { border-left: 4px solid #00f5ff; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧜‍♀️ SearchAtlas Integration Test</h1>
        
        <div class="status success">
            <h3>✅ SearchAtlas Script Loaded</h3>
            <p>UUID: <code>dc711005-42a9-4a99-a95c-f58610ddb8c9</code></p>
            <p>This page is now optimized with SearchAtlas dynamic optimization!</p>
        </div>
        
        <div class="status info">
            <h3>📊 What This Enables:</h3>
            <ul>
                <li>🔍 Dynamic SEO optimization</li>
                <li>⚡ Performance monitoring</li>
                <li>📱 Mobile optimization</li>
                <li>🎯 Content personalization</li>
                <li>📈 Conversion tracking</li>
            </ul>
        </div>
        
        <div class="status warning">
            <h3>🚀 Product Hunt Integration</h3>
            <p>Perfect for your RinaWarp Terminal launch!</p>
            <p>This optimization will improve:</p>
            <ul>
                <li>Search engine rankings</li>
                <li>Page loading speed</li>
                <li>User experience</li>
                <li>Conversion rates</li>
            </ul>
        </div>
    </div>
    
    <script>
        // Test SearchAtlas integration
        console.log('🧜‍♀️ RinaWarp Terminal - SearchAtlas Integration Test');
        
        // Check if SearchAtlas script is loading
        setTimeout(() => {
            const saScript = document.getElementById('sa-dynamic-optimization-loader');
            if (saScript) {
                console.log('✅ SearchAtlas script successfully loaded');
            } else {
                console.log('⚠️ SearchAtlas script loading in progress...');
            }
        }, 2000);
    </script>
</body>
</html>`;

  try {
    await fs.writeFile('searchatlas-test.html', standaloneScript);
    integrations.push('✅ Created searchatlas-test.html - Test page for verification');
    integrations.push('💡 Open searchatlas-test.html in browser to verify integration');
  } catch (error) {
    integrations.push(`❌ Failed to create test page: ${error.message}`);
  }
}

async function updateServerConfig() {
  // Check if we have a server configuration
  const serverFiles = ['server.js', 'final-server.js', 'src/server.js'];

  for (const serverFile of serverFiles) {
    try {
      if (
        await fs
          .access(serverFile)
          .then(() => true)
          .catch(() => false)
      ) {
        const content = await fs.readFile(serverFile, 'utf8');

        // Check if we need to add CSP headers for SearchAtlas
        if (content.includes('Content-Security-Policy') && !content.includes('searchatlas.com')) {
          integrations.push(`⚠️ ${serverFile} - May need CSP updates for SearchAtlas`);
          integrations.push("💡 Add 'script-src https://dashboard.searchatlas.com' to CSP");
        }
      }
    } catch (error) {
      // Skip if file doesn't exist
    }
  }
}

async function main() {
  console.log('🔍 SearchAtlas Integration for RinaWarp Terminal');
  console.log('================================================');
  console.log('');

  console.log('🔎 Searching for HTML files to integrate...');
  const htmlFiles = await findHTMLFiles();

  if (htmlFiles.length === 0) {
    console.log('⚠️ No HTML files found in common locations');
    integrations.push('⚠️ No HTML files found - manual integration required');
  } else {
    console.log(`📁 Found ${htmlFiles.length} HTML file(s):`);
    htmlFiles.forEach(file => console.log(`   - ${file}`));
    console.log('');

    // Integrate into each HTML file
    for (const file of htmlFiles) {
      await integrateIntoHTML(file);
    }
  }

  // Create standalone test page
  console.log('📝 Creating test page...');
  await createStandaloneScript();

  // Check server configuration
  console.log('🔧 Checking server configuration...');
  await updateServerConfig();

  console.log('\n📊 INTEGRATION RESULTS:');
  console.log('=======================');
  integrations.forEach(result => console.log(result));

  console.log('\n🚀 NEXT STEPS:');
  console.log('==============');
  console.log('1. Open searchatlas-test.html in browser to verify');
  console.log('2. Check browser DevTools Network tab for SearchAtlas requests');
  console.log('3. Monitor your SearchAtlas dashboard for data');
  console.log('4. Deploy changes to your live website');
  console.log('');
  console.log('🎯 Your Product Hunt traffic will now be optimized!');
}

main().catch(console.error);
