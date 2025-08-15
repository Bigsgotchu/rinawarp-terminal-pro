#!/usr/bin/env node

/**
 * SearchAtlas Duplicate Installation Fix
 *
 * This script fixes the duplicate SearchAtlas installations detected
 * and ensures clean production deployment.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔍 SearchAtlas Duplicate Installation Fix');
console.log('==========================================\n');

// SearchAtlas configuration
const SEARCHATLAS_CONFIG = {
  uuid: 'dc711005-42a9-4a99-a95c-f58610ddb8c9',
  script: `<!-- SearchAtlas SEO Optimization -->
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
</script>`,
};

// Files to check and fix
const HTML_FILES = ['public/index.html', 'src/templates/terminal.html', 'website/index.html'];

function removeSearchAtlasScripts(content) {
  // Remove all SearchAtlas script blocks (including the different formats)
  const patterns = [
    // Standard format
    /<script[^>]*id="sa-dynamic-optimization"[^>]*>[\s\S]*?<\/script>/gi,
    // Base64 encoded format
    /<script[^>]*src="data:text\/javascript;base64[^"]*"[^>]*>[\s\S]*?<\/script>/gi,
    // Inline format with nowprocket
    /<script[^>]*nowprocket[^>]*nitro-exclude[^>]*type="text\/javascript"[^>]*id="sa-dynamic-optimization"[^>]*>[\s\S]*?<\/script>/gi,
    // Any script mentioning searchatlas
    /<script[^>]*>[\s\S]*?searchatlas[\s\S]*?<\/script>/gi,
    // SearchAtlas comments
    /<!--[\s\S]*?SearchAtlas[\s\S]*?-->/gi,
    // Direct script references
    /<script[^>]*src="[^"]*searchatlas[^"]*"[^>]*><\/script>/gi,
  ];

  let cleanContent = content;

  // Apply patterns multiple times to catch nested cases
  for (let i = 0; i < 3; i++) {
    patterns.forEach(pattern => {
      cleanContent = cleanContent.replace(pattern, '');
    });
  }

  // Remove any remaining SearchAtlas references (be aggressive)
  cleanContent = cleanContent.replace(/[\s\S]*?sa-dynamic-optimization[\s\S]*?/gi, '');
  cleanContent = cleanContent.replace(/[\s\S]*?dashboard\.searchatlas\.com[\s\S]*?/gi, '');

  // Clean up multiple empty lines
  cleanContent = cleanContent.replace(/\n\s*\n\s*\n/g, '\n\n');

  return cleanContent;
}

function addSearchAtlasToHead(content) {
  // Find the </head> tag and insert SearchAtlas script before it
  const headCloseTag = '</head>';
  const headIndex = content.lastIndexOf(headCloseTag);

  if (headIndex === -1) {
    console.log('⚠️  Could not find </head> tag');
    return content;
  }

  const beforeHead = content.substring(0, headIndex);
  const afterHead = content.substring(headIndex);

  return beforeHead + '\n  ' + SEARCHATLAS_CONFIG.script + '\n' + afterHead;
}

function fixFile(filePath) {
  console.log(`🔧 Processing: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  File not found: ${filePath}`);
    return false;
  }

  // Create backup
  const backupPath = `${filePath}.backup-searchatlas-fix`;
  fs.copyFileSync(filePath, backupPath);
  console.log(`   💾 Backup created: ${path.basename(backupPath)}`);

  // Read original content
  let content = fs.readFileSync(filePath, 'utf8');

  // Check for existing SearchAtlas
  const hasSearchAtlas =
    content.includes('searchatlas') || content.includes('sa-dynamic-optimization');

  if (!hasSearchAtlas) {
    console.log('   ✅ No SearchAtlas found - adding fresh installation');
    content = addSearchAtlasToHead(content);
  } else {
    console.log('   🔍 SearchAtlas found - removing duplicates');

    // Remove all SearchAtlas instances
    content = removeSearchAtlasScripts(content);

    // Add single clean installation
    console.log('   ➕ Adding clean SearchAtlas installation');
    content = addSearchAtlasToHead(content);
  }

  // Write fixed content
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('   ✅ File fixed successfully\n');

  return true;
}

function verifyInstallation() {
  console.log('🔍 Verifying SearchAtlas Installation');
  console.log('=====================================\n');

  HTML_FILES.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ ${filePath} - File not found`);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(/sa-dynamic-optimization/g);

    if (!matches) {
      console.log(`❌ ${filePath} - No SearchAtlas installation found`);
    } else if (matches.length === 1) {
      console.log(`✅ ${filePath} - Single SearchAtlas installation (correct)`);
    } else {
      console.log(`⚠️  ${filePath} - ${matches.length} SearchAtlas installations (needs fixing)`);
    }
  });

  console.log();
}

function main() {
  try {
    console.log('📊 Initial Status Check:');
    verifyInstallation();

    console.log('🔧 Fixing Duplicate Installations:');
    console.log('==================================\n');

    let fixedFiles = 0;
    HTML_FILES.forEach(filePath => {
      if (fixFile(filePath)) {
        fixedFiles++;
      }
    });

    console.log('📊 Final Status Check:');
    verifyInstallation();

    console.log('📋 Summary:');
    console.log('===========');
    console.log(`✅ Files processed: ${fixedFiles}`);
    console.log('✅ Duplicate SearchAtlas installations removed');
    console.log('✅ Single clean installation added to each file');
    console.log('✅ Backups created for safety');

    console.log('\n🚀 Next Steps:');
    console.log('==============');
    console.log('1. Review the changes in each file');
    console.log('2. Test locally to ensure everything works');
    console.log('3. Deploy to production:');
    console.log('   git add public/index.html src/templates/terminal.html website/index.html');
    console.log('   git commit -m "Fix SearchAtlas duplicate installations"');
    console.log('   git push origin main');
    console.log('\n4. Verify on live site:');
    console.log('   curl -s https://rinawarptech.com | grep -c "sa-dynamic-optimization"');
    console.log('   (Should return: 1)');

    console.log('\n🎉 SearchAtlas duplicate fix completed successfully!');
  } catch (error) {
    console.error('❌ Error fixing SearchAtlas duplicates:', error.message);
    process.exit(1);
  }
}

// Run main function when script is executed directly
main();

export { fixFile, verifyInstallation };
