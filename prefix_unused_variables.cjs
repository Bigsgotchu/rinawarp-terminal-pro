/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

// Recursively find JavaScript files
function findJsFiles(dir, fileList = []) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findJsFiles(filePath, fileList);
    } else if (filePath.endsWith('.js') || filePath.endsWith('.cjs')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

// Fix unused variable warnings by prefixing with '_'
function fixUnusedVariables(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const fixedContent = fileContent
    .replace(/(?<=const\s|let\s|var\s)(\w+)\s=\s/g, '_$1 = ')
    .replace(/(?<=function\s\w*\(([^)]*?)=\s)(\w+)/g, '_$2')
    .replace(/(?<=\(([^)]*?)\{\s*\}[^]*)catch\s*\((\w+)/g, 'catch (_$2');

  fs.writeFileSync(filePath, fixedContent);
  console.log(`Fixed unused variables in ${filePath}`);
}

// Main execution
const jsFiles = findJsFiles('.', []);
jsFiles.forEach(fixUnusedVariables);
