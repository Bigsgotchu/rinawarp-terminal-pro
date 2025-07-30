/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 1 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

#!/usr/bin/env node

/**
 * RinaWarp Terminal Diagnostic Script
 * This script identifies common issues preventing terminal functionality
 */

const fs = require('node:fs');

console.log('🔍 RinaWarp Terminal Diagnostic Tool\n');

// Check 1: Core files exist
console.log('1. Checking core files...');
const coreFiles = [
  'src/main.cjs',
  'src/preload.cjs',
  'src/renderer/index.html',
  'src/renderer/renderer.js',
  'src/renderer/xterm-compatibility.js',
  'package.json',
];

let coreFilesOk = true;
coreFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    coreFilesOk = false;
  }
});

// Check 2: Dependencies
console.log('\n2. Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = ['electron', '@xterm/xterm', '@xterm/addon-fit', '@xterm/addon-web-links'];

let depsOk = true;
requiredDeps.forEach(dep => {
  if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
    const nodeModulesPath = `node_modules/${dep}`;
    if (fs.existsSync(nodeModulesPath)) {
      console.log(`   ✅ ${dep} - installed`);
    } else {
      console.log(`   ⚠️  ${dep} - in package.json but not installed`);
      depsOk = false;
    }
  } else {
    console.log(`   ❌ ${dep} - not in package.json`);
    depsOk = false;
  }
});

// Check 3: Main process IPC handlers
console.log('\n3. Checking main process IPC handlers...');
const mainContent = fs.readFileSync('src/main.cjs', 'utf8');
const requiredHandlers = [
  'create-shell-process',
  'write-to-shell',
  'kill-shell-process',
  'get-system-info',
];

let handlersOk = true;
requiredHandlers.forEach(handler => {
  if (mainContent.includes(`'${handler}'`) || mainContent.includes(`"${handler}"`)) {
    console.log(`   ✅ ${handler}`);
  } else {
    console.log(`   ❌ ${handler} - MISSING`);
    handlersOk = false;
  }
});

// Check 4: Preload API exposure
console.log('\n4. Checking preload API exposure...');
const preloadContent = fs.readFileSync('src/preload.cjs', 'utf8');
const requiredAPIs = ['createShellProcess', 'writeToShell', 'onShellData', 'getSystemInfo'];

let apisOk = true;
requiredAPIs.forEach(api => {
  if (preloadContent.includes(api)) {
    console.log(`   ✅ ${api}`);
  } else {
    console.log(`   ❌ ${api} - MISSING FROM PRELOAD`);
    apisOk = false;
  }
});

// Check 5: XTerm initialization
console.log('\n5. Checking XTerm compatibility layer...');
const xtermCompat = fs.readFileSync('src/renderer/xterm-compatibility.js', 'utf8');
if (xtermCompat.includes('initializeXTerm') && xtermCompat.includes('FallbackTerminal')) {
  console.log('   ✅ XTerm compatibility layer looks good');
} else {
  console.log('   ❌ XTerm compatibility layer may have issues');
}

// Check 6: Renderer initialization
console.log('\n6. Checking renderer initialization...');
const rendererContent = fs.readFileSync('src/renderer/renderer.js', 'utf8');
if (
  rendererContent.includes('createTerminal') &&
  rendererContent.includes('electronAPI.createShellProcess')
) {
  console.log('   ✅ Terminal creation logic exists');
} else {
  console.log('   ❌ Terminal creation logic may be missing');
}

// Summary
console.log('\n📊 DIAGNOSTIC SUMMARY:');
console.log('========================');

if (coreFilesOk && depsOk && handlersOk && apisOk) {
  console.log('✅ All core components present');
  console.log('\n🔧 LIKELY ISSUES:');
  console.log('1. Check browser console for JavaScript errors');
  console.log('2. Verify XTerm modules are loading properly');
  console.log('3. Check if shell process creation is failing');
  console.log('4. Verify IPC communication is working');

  console.log('\n💡 DEBUGGING STEPS:');
  console.log('1. Run: npm start');
  console.log('2. Open Developer Tools in the Electron window');
  console.log('3. Check Console tab for errors');
  console.log('4. Look for "createTerminal" logs');
  console.log('5. Check if shell process is created successfully');
} else {
  console.log('❌ Critical issues found - fix these first:');
  if (!coreFilesOk) console.log('   - Missing core files');
  if (!depsOk) console.log('   - Missing dependencies (run: npm install)');
  if (!handlersOk) console.log('   - Missing IPC handlers in main process');
  if (!apisOk) console.log('   - Missing API exposure in preload script');
}

console.log('\n🚀 To get detailed runtime diagnostics:');
console.log('1. Start the app: npm start');
console.log('2. Press F12 to open DevTools');
console.log('3. Check Console for errors');
console.log('4. Try typing in terminal and see if input is processed');
