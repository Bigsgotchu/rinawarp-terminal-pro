#!/usr/bin/env node

/**
 * Migration script to update all references from old theme managers to unified theme manager
 */

const fs = require('fs');
const path = require('path');

// Files to update imports
const filesToUpdate = [
  'src/renderer/renderer.js',
  'src/utils/global-registry.js',
  'src/plugins/integration/main-plugin-integration.js',
  'src/performance-optimizer.js',
  'src/renderer/enhanced-terminal-features.js',
  'src/terminal.html',
  'src/terminal-simple.html',
  'src/renderer/index.html',
];

// Update imports in JavaScript files
function updateJavaScriptFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace old theme manager imports
    if (content.includes("'./theme-manager'") || content.includes('"./theme-manager"')) {
      content = content.replace(
        /from\s+['"]\.\/theme-manager['"]/g,
        "from '../themes/unified-theme-manager'"
      );
      modified = true;
    }

    if (
      content.includes("'../renderer/theme-manager'") ||
      content.includes('"../renderer/theme-manager"')
    ) {
      content = content.replace(
        /from\s+['"]\.\.\/renderer\/theme-manager['"]/g,
        "from '../themes/unified-theme-manager'"
      );
      modified = true;
    }

    if (
      content.includes("'../ui-enhancements/theme-manager'") ||
      content.includes('"../ui-enhancements/theme-manager"')
    ) {
      content = content.replace(
        /from\s+['"]\.\.\/ui-enhancements\/theme-manager['"]/g,
        "from '../themes/unified-theme-manager'"
      );
      modified = true;
    }

    // Replace ThemeManager class instantiation
    if (content.includes('new ThemeManager()')) {
      content = content.replace(/new\s+ThemeManager\(\)/g, 'getThemeManager()');
      // Add import if not present
      if (!content.includes('getThemeManager')) {
        content = "import { getThemeManager } from '../themes/unified-theme-manager';\n" + content;
      }
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// Update HTML files
function updateHTMLFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace script src references
    if (content.includes('src/renderer/theme-manager.js')) {
      content = content.replace(
        /src\/renderer\/theme-manager\.js/g,
        'src/themes/unified-theme-manager.js'
      );
      modified = true;
    }

    // Replace inline script references
    if (content.includes('new ThemeManager()')) {
      content = content.replace(/new\s+ThemeManager\(\)/g, 'getThemeManager()');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// Main migration function
function migrate() {
  console.log('🔄 Starting theme manager migration...\n');

  filesToUpdate.forEach(file => {
    const filePath = path.join(__dirname, '..', file);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }

    if (file.endsWith('.html')) {
      updateHTMLFile(filePath);
    } else {
      updateJavaScriptFile(filePath);
    }
  });

  console.log('\n✨ Migration complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Remove old theme manager files:');
  console.log('   - src/renderer/theme-manager.js');
  console.log('   - src/themes/theme-manager.cjs');
  console.log('   - src/ui-enhancements/theme-manager.js');
  console.log('2. Test the application to ensure themes work correctly');
  console.log('3. Update any dynamic imports or require() calls manually if needed');
}

// Run migration
migrate();
