#!/usr/bin/env node

/**
 * Quick verification script for Visual Command Builder integration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧜‍♀️ Verifying Visual Command Builder Integration...\n');

// Files to check
const filesToCheck = [
  'src/renderer/visual-command-builder.js',
  'src/renderer/visual-command-builder.css',
  'src/renderer/command-builder-integration.js',
  'src/renderer/command-builder-titlebar-integration.js',
  'src/renderer/index.html',
];

let allGood = true;

filesToCheck.forEach(file => {
  const fullPath = path.join(__dirname, file);

  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    const sizeKB = Math.round((stats.size / 1024) * 100) / 100;
    console.log(`✅ ${file} - ${sizeKB}KB`);

    // Check for key content
    const content = fs.readFileSync(fullPath, 'utf8');

    if (file.endsWith('.js')) {
      if (
        content.includes('VisualCommandBuilder') ||
        content.includes('CommandBuilderIntegration')
      ) {
        console.log('   📋 Contains expected classes/functions');
      } else {
        console.log('   ⚠️  Missing expected classes - check file content');
        allGood = false;
      }
    }

    if (file === 'src/renderer/index.html') {
      if (
        content.includes('visual-command-builder.css') &&
        content.includes('visual-command-builder.js')
      ) {
        console.log('   📋 HTML integration looks good');
      } else {
        console.log('   ⚠️  HTML missing command builder integration');
        allGood = false;
      }

      if (content.includes('command-builder-btn')) {
        console.log('   🔨 Title bar button integrated');
      } else {
        console.log('   ⚠️  Title bar button missing');
        allGood = false;
      }
    }
  } else {
    console.log(`❌ ${file} - MISSING`);
    allGood = false;
  }
  console.log('');
});

console.log('📊 Summary:');
if (allGood) {
  console.log('🎉 All files present and integration looks good!');
  console.log('🌐 Test page available at: http://localhost:8080/test-command-builder.html');
  console.log('\n🧪 Manual Testing Steps:');
  console.log('1. Open the test page in your browser');
  console.log('2. Click "Open Command Builder" button');
  console.log('3. Try building a Git commit command');
  console.log('4. Test the keyboard shortcut Ctrl+Shift+B');
  console.log('5. Check browser console for any errors');
  console.log('\n✨ Integration complete! The Visual Command Builder is ready to use.');
} else {
  console.log('⚠️  Some issues detected - check the warnings above');
}

console.log('\n🧜‍♀️ Happy coding with your new Visual Command Builder!');
