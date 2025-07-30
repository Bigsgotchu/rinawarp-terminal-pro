/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

#!/usr/bin/env node

/**
 * 🧜‍♀️ RinaWarp Terminal - Deprecated Modules Scanner
 *
 * This script scans the project to find uses of legacy modules like q, lodash.isequal, or rimraf.
 *
 * Usage: node scan-deprecated.js
 */

const fs = require('node:fs');
const path = require('node:path');

const targets = [
  'require("q")',
  "require('q')",
  'require("lodash.isequal")',
  "require('lodash.isequal')",
  'require("rimraf")',
  "require('rimraf')",
];

function scanDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) return scanDir(fullPath);

    if (file.endsWith('.js')) {
      const contents = fs.readFileSync(fullPath, 'utf8');
      targets.forEach(target => {
        if (contents.includes(target)) {
          console.log(`🔍 Found "${target}" in: ${fullPath}`);
        }
      });
    }
  });
}

scanDir('./'); // start scanning from project root
