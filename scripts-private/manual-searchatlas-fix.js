#!/usr/bin/env node

/**
 * Manual SearchAtlas Cleanup
 * Simple approach to remove duplicate SearchAtlas installations
 */

import fs from 'fs';

const files = ['public/index.html', 'src/templates/terminal.html', 'website/index.html'];

const SINGLE_SEARCHATLAS = `  <!-- SearchAtlas SEO Optimization -->
  <script nowprocket nitro-exclude type="text/javascript" id="sa-dynamic-optimization" data-uuid="dc711005-42a9-4a99-a95c-f58610ddb8c9">
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

function cleanFile(filePath) {
  console.log(`🧹 Cleaning: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Remove ALL SearchAtlas script blocks
  content = content.replace(
    /<script[^>]*(?:sa-dynamic-optimization|searchatlas)[^>]*>[\s\S]*?<\/script>/gi,
    ''
  );
  content = content.replace(/<!--[\s\S]*?SearchAtlas[\s\S]*?-->/gi, '');
  content = content.replace(
    /<script[^>]*nowprocket[^>]*nitro-exclude[^>]*>[\s\S]*?<\/script>/gi,
    ''
  );

  // Clean up extra whitespace
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

  // Add single SearchAtlas before </head>
  const headIndex = content.lastIndexOf('</head>');
  if (headIndex !== -1) {
    const before = content.substring(0, headIndex);
    const after = content.substring(headIndex);
    content = before + '\n' + SINGLE_SEARCHATLAS + '\n' + after;
  }

  fs.writeFileSync(filePath, content, 'utf8');

  // Verify
  const verifyContent = fs.readFileSync(filePath, 'utf8');
  const matches = (verifyContent.match(/sa-dynamic-optimization/g) || []).length;

  console.log(`   ✅ Complete - ${matches} SearchAtlas installation(s) found`);
}

console.log('🔧 Manual SearchAtlas Cleanup');
console.log('==============================\n');

files.forEach(cleanFile);

console.log('\n✅ Cleanup complete!');
console.log('Now deploy to production:\n');
console.log('git add public/index.html src/templates/terminal.html website/index.html');
console.log('git commit -m "Clean SearchAtlas duplicate installations"');
console.log('git push origin main');
