#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Copying xterm assets...');

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy xterm.js assets from node_modules
const xtermPath = path.join(__dirname, '..', 'node_modules', '@xterm', 'xterm');
const xtermCssPath = path.join(xtermPath, 'css', 'xterm.css');
const publicXtermPath = path.join(publicDir, 'xterm.css');

if (fs.existsSync(xtermCssPath)) {
  fs.copyFileSync(xtermCssPath, publicXtermPath);
  console.log('Copied xterm.css to public directory');
} else {
  console.log('xterm.css not found in node_modules');
}

console.log('Xterm assets copied successfully!');
