#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Copying xterm assets...');

// Create directories if they don't exist
const publicDir = path.join(__dirname, '..', 'public');
const vendorDir = path.join(publicDir, 'vendor');
const xtermVendorDir = path.join(vendorDir, 'xterm');
const assetsDir = path.join(publicDir, 'assets');
const xtermAssetsDir = path.join(assetsDir, 'xterm');
const distDir = path.join(__dirname, '..', 'dist');
const distAssetsDir = path.join(distDir, 'assets');
const distXtermAssetsDir = path.join(distAssetsDir, 'xterm');

// Create directories
[
  publicDir,
  vendorDir,
  xtermVendorDir,
  assetsDir,
  xtermAssetsDir,
  distDir,
  distAssetsDir,
  distXtermAssetsDir,
].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Copy xterm.js assets from node_modules
const xtermPath = path.join(__dirname, '..', 'node_modules', '@xterm', 'xterm');
const xtermLibPath = path.join(xtermPath, 'lib', 'xterm.js');
const xtermCssPath = path.join(xtermPath, 'css', 'xterm.css');

// Copy to multiple locations for better compatibility
const copyTargets = [
  // Main public directory
  { from: xtermCssPath, to: path.join(publicDir, 'xterm.css') },

  // Vendor directory
  { from: xtermLibPath, to: path.join(xtermVendorDir, 'xterm.js') },
  { from: xtermCssPath, to: path.join(xtermVendorDir, 'xterm.css') },

  // Assets directory
  { from: xtermLibPath, to: path.join(xtermAssetsDir, 'xterm.js') },
  { from: xtermCssPath, to: path.join(xtermAssetsDir, 'xterm.css') },

  // Dist directory (for builds)
  { from: xtermLibPath, to: path.join(distXtermAssetsDir, 'xterm.js') },
  { from: xtermCssPath, to: path.join(distXtermAssetsDir, 'xterm.css') },
];

let copiedCount = 0;
copyTargets.forEach(({ from, to }) => {
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, to);
    console.log(`✅ Copied ${path.basename(from)} to ${path.relative(publicDir, to)}`);
    copiedCount++;
  } else {
    console.log(`⚠️ Source file not found: ${path.relative(__dirname, from)}`);
  }
});

// Copy addon files if they exist
const addonPaths = [
  { name: 'fit', package: '@xterm/addon-fit' },
  { name: 'web-links', package: '@xterm/addon-web-links' },
];

addonPaths.forEach(({ name, package: packageName }) => {
  const addonPath = path.join(__dirname, '..', 'node_modules', packageName, 'lib');

  // Try different possible filenames
  const possibleFiles = [
    `${name}.js`,
    `${name.replace('-', '')}.js`,
    `${packageName.split('/').pop()}.js`,
    'index.js',
  ];

  let found = false;
  for (const filename of possibleFiles) {
    const addonJsPath = path.join(addonPath, filename);

    if (fs.existsSync(addonJsPath)) {
      fs.copyFileSync(addonJsPath, path.join(xtermVendorDir, `${name}.js`));
      fs.copyFileSync(addonJsPath, path.join(xtermAssetsDir, `${name}.js`));
      fs.copyFileSync(addonJsPath, path.join(distXtermAssetsDir, `${name}.js`));
      console.log(`✅ Copied ${name} addon from ${filename}`);
      copiedCount++;
      found = true;
      break;
    }
  }

  if (!found) {
    console.log(`⚠️ Addon not found: ${name} (checked: ${possibleFiles.join(', ')})`);
    console.log(`   Path: ${addonPath}`);

    // List available files in the addon directory
    if (fs.existsSync(addonPath)) {
      const files = fs.readdirSync(addonPath);
      console.log(`   Available files: ${files.join(', ')}`);
    }
  }
});

if (copiedCount > 0) {
  console.log(`✅ Xterm assets copied successfully! (${copiedCount} files)`);
} else {
  console.log('❌ No xterm assets were copied');
  process.exit(1);
}
