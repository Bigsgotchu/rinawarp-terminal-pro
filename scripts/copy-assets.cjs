#!/usr/bin/env node
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

const fs = require('node:fs');
const path = require('node:path');

console.log('Copying assets...');

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Create styles directory if it doesn't exist
const stylesDir = path.join(__dirname, '..', 'styles');
if (!fs.existsSync(stylesDir)) {
  fs.mkdirSync(stylesDir, { recursive: true });
}

// Create src directory if it doesn't exist
const srcDir = path.join(__dirname, '..', 'src');
if (!fs.existsSync(srcDir)) {
  fs.mkdirSync(srcDir, { recursive: true });
}

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy xterm.js assets from node_modules if they exist
const xtermPath = path.join(__dirname, '..', 'node_modules', '@xterm', 'xterm');
const xtermCssPath = path.join(xtermPath, 'css', 'xterm.css');
const publicXtermPath = path.join(publicDir, 'xterm.css');

if (fs.existsSync(xtermCssPath)) {
  fs.copyFileSync(xtermCssPath, publicXtermPath);
  console.log('Copied xterm.css to public directory');
} else {
  console.log('xterm.css not found, skipping...');
}

// Copy FontAwesome assets if they exist
const faPath = path.join(__dirname, '..', 'node_modules', '@fortawesome', 'fontawesome-free');
const faCssPath = path.join(faPath, 'css', 'all.min.css');
const publicFaPath = path.join(publicDir, 'fontawesome.css');

if (fs.existsSync(faCssPath)) {
  fs.copyFileSync(faCssPath, publicFaPath);
  console.log('Copied FontAwesome CSS to public directory');
} else {
  console.log('FontAwesome CSS not found, skipping...');
}

// Copy webfonts directory if it exists
const faWebfontsPath = path.join(faPath, 'webfonts');
const publicWebfontsPath = path.join(publicDir, 'webfonts');

if (fs.existsSync(faWebfontsPath)) {
  if (fs.existsSync(publicWebfontsPath)) {
    fs.rmSync(publicWebfontsPath, { recursive: true });
  }
  fs.cpSync(faWebfontsPath, publicWebfontsPath, { recursive: true });
  console.log('Copied FontAwesome webfonts to public directory');
} else {
  console.log('FontAwesome webfonts not found, skipping...');
}

// Ensure sitemap.xml and robots.txt are preserved
const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
const publicSitemapPath = path.join(publicDir, 'sitemap.xml');
const robotsPath = path.join(__dirname, '..', 'robots.txt');
const publicRobotsPath = path.join(publicDir, 'robots.txt');

if (fs.existsSync(sitemapPath)) {
  fs.copyFileSync(sitemapPath, publicSitemapPath);
  console.log('Copied sitemap.xml to public directory');
}

if (fs.existsSync(robotsPath)) {
  fs.copyFileSync(robotsPath, publicRobotsPath);
  console.log('Copied robots.txt to public directory');
}

// Copy logo assets from /assets/ to /public/assets/
const assetsPath = path.join(__dirname, '..', 'assets');
const publicAssetsPath = path.join(publicDir, 'assets');

// Create public/assets directory if it doesn't exist
if (!fs.existsSync(publicAssetsPath)) {
  fs.mkdirSync(publicAssetsPath, { recursive: true });
}

// Define logos to copy for web use
const logosToSync = [
  'rinawarp-icon-final.png',
  'rinawarp-icon-final-2x.png',
  'rinawarp-logo-primary.svg',
  'favicon.svg',
];

logosToSync.forEach(logoFile => {
  const srcPath = path.join(assetsPath, logoFile);
  const destPath = path.join(publicAssetsPath, logoFile);

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${logoFile} to public/assets/`);
  }
});

// Copy favicon to public root
const faviconSrc = path.join(assetsPath, 'favicon.svg');
const faviconDest = path.join(publicDir, 'favicon.svg');
if (fs.existsSync(faviconSrc)) {
  fs.copyFileSync(faviconSrc, faviconDest);
  console.log('Copied favicon.svg to public root');
}

console.log('Assets copied successfully!');
console.log('✅ Logo synchronization complete!');
