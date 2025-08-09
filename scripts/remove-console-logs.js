#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcDir = path.join(__dirname, '../src');
const mode = process.argv[2] || 'remove'; // 'remove' or 'convert'

// Files to exclude from processing
const excludePatterns = [
  /node_modules/,
  /\.test\.js$/,
  /\.spec\.js$/,
  /test-/,
  /debug/i,
  /logger\.js$/,
];

let totalProcessed = 0;
let totalRemoved = 0;

function shouldProcessFile(filePath) {
  return !excludePatterns.some(pattern => pattern.test(filePath));
}

function processFile(filePath) {
  if (!shouldProcessFile(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  let modified = content;
  let count = 0;

  if (mode === 'remove') {
    // Remove console.log statements entirely
    modified = content.replace(/console\.log\([^)]*\);?\s*/g, () => {
      count++;
      return '';
    });
  } else if (mode === 'convert') {
    // Convert to logger calls (assuming a logger is available)
    modified = content.replace(/console\.log\(/g, () => {
      count++;
      return 'logger.debug(';
    });

    // Add logger import if needed and console.log was found
    if (count > 0 && !content.includes('import logger') && !content.includes('require.*logger')) {
      modified = `import logger from '../src/utilities/logger.js';\n${modified}`;
    }
  }

  if (count > 0) {
    fs.writeFileSync(filePath, modified);
    console.log(
      `✅ Processed ${filePath}: ${count} console.log statements ${mode === 'remove' ? 'removed' : 'converted'}`
    );
    totalRemoved += count;
    totalProcessed++;
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      processDirectory(filePath);
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.ts'))) {
      processFile(filePath);
    }
  }
}

console.log(`🔍 Processing console.log statements (mode: ${mode})...`);
processDirectory(srcDir);

console.log(
  `\n✨ Complete! Processed ${totalProcessed} files, ${totalRemoved} console.log statements ${mode === 'remove' ? 'removed' : 'converted'}.`
);

// Create a backup notice
if (totalProcessed > 0) {
  console.log('\n⚠️  Important: Make sure to review the changes and test thoroughly!');
  console.log('💡 Tip: Use git diff to review all changes before committing.');
}
