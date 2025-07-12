#!/usr/bin/env node

/**
 * 🧜‍♀️ RinaWarp Terminal - Deprecated Modules Scanner
 *
 * This script scans the project to find uses of legacy modules like q, lodash.isequal, or rimraf.
 *
 * Usage: node scan-deprecated.cjs
 */

const fs = require('fs');
const path = require('path');

// Directories to skip
const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', 'backup-'];

// Extended list of deprecated patterns to search for
const targets = [
  // Q promises
  'require("q")',
  'require(\'q\')',
  'import.*from.*[\'"]q[\'"]',
  'Q.fcall',
  'Q.defer',

  // lodash.isequal
  'require("lodash.isequal")',
  'require(\'lodash.isequal\')',
  'import.*from.*[\'"]lodash.isequal[\'"]',
  'isEqual(',

  // rimraf (legacy versions)
  'require("rimraf")',
  'require(\'rimraf\')',
  'import.*from.*[\'"]rimraf[\'"]',
  'rimraf(',
  'rimraf.sync',

  // uuid (old patterns)
  'require("uuid")',
  'require(\'uuid\')',
  'uuid.v4',
  'uuidv4(',

  // mkdirp
  'require("mkdirp")',
  'require(\'mkdirp\')',
  'mkdirp(',

  // request (deprecated HTTP library)
  'require("request")',
  'require(\'request\')',
  'import.*from.*[\'"]request[\'"]',

  // async.js patterns
  'require("async")',
  'require(\'async\')',
  'async.series',
  'async.parallel',
  'async.waterfall',

  // Other deprecated patterns
  'require("bluebird")',
  'require(\'bluebird\')',
  'require("graceful-fs")',
  'require(\'graceful-fs\')',
];

let foundCount = 0;
let fileCount = 0;

function shouldSkipDir(dirName) {
  return skipDirs.some(skip => dirName.includes(skip));
}

function scanFile(filePath) {
  try {
    const contents = fs.readFileSync(filePath, 'utf8');
    const findings = [];

    targets.forEach(target => {
      // For regex patterns (imports)
      if (target.includes('import.*from')) {
        const regex = new RegExp(target, 'gi');
        if (regex.test(contents)) {
          findings.push(target);
        }
      } else {
        // For simple string matches
        if (contents.includes(target)) {
          findings.push(target);
        }
      }
    });

    if (findings.length > 0) {
      console.log(`\n📁 ${filePath}`);
      findings.forEach(finding => {
        console.log(`   🔍 Found: ${finding}`);
        foundCount++;
      });
    }

    fileCount++;
  } catch (error) {
    console.error(`❌ Error reading ${filePath}: ${error.message}`);
  }
}

function scanDir(dir) {
  try {
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);

      if (fs.statSync(fullPath).isDirectory()) {
        if (!shouldSkipDir(file)) {
          scanDir(fullPath);
        }
        return;
      }

      // Check JavaScript and TypeScript files
      if (file.match(/\.(js|ts|jsx|tsx|cjs|mjs)$/)) {
        scanFile(fullPath);
      }
    });
  } catch (error) {
    console.error(`❌ Error scanning directory ${dir}: ${error.message}`);
  }
}

console.log('🧜‍♀️ RinaWarp Terminal - Deprecated Modules Scanner');
console.log('=================================================');
console.log('Scanning for deprecated module usage...\n');

const startTime = Date.now();
scanDir('./'); // start scanning from project root

const endTime = Date.now();
const duration = (endTime - startTime) / 1000;

console.log('\n📊 Scan Results:');
console.log('================');
console.log(`Files scanned: ${fileCount}`);
console.log(`Deprecated patterns found: ${foundCount}`);
console.log(`Scan duration: ${duration.toFixed(2)}s`);

if (foundCount === 0) {
  console.log('\n✅ No deprecated modules found! Your codebase is clean! 🌊');
} else {
  console.log('\n⚠️  Deprecated patterns detected. Consider modernizing these usages.');
  console.log('💡 Run the auto-replacement scripts to modernize automatically!');
}

console.log('\n🧜‍♀️ Happy swimming in modern waters! ✨');
