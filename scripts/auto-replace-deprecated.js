#!/usr/bin/env node

/**
 * 🧜‍♀️ RinaWarp Terminal - Fast Auto-Replace Script for Deprecated Patterns
 *
 * This script uses regex patterns to quickly replace deprecated code patterns
 * across your entire codebase. Perfect for batch replacements!
 *
 * Usage: node scripts/auto-replace-deprecated.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧜‍♀️ RinaWarp Terminal - Fast Auto-Replace for Deprecated Patterns');
console.log('================================================================');

// Configuration for file types to process
const FILE_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.cjs', '.mjs'];
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', 'public/vendor'];
const IGNORE_FILES = ['package-lock.json', '*.min.js'];

// Replacement patterns - order matters for some patterns
const REPLACEMENT_PATTERNS = [
  // 1. lodash.isequal → util.isDeepStrictEqual
  {
    name: 'lodash.isequal import',
    find: /const\s+(\w+)\s*=\s*require\(['"]lodash\.isequal['"]\);?/g,
    replace: "const { isDeepStrictEqual } = require('node:util');",
  },
  {
    name: 'lodash.isequal usage',
    find: /\bisEqual\s*\(/g,
    replace: 'isDeepStrictEqual(',
  },

  // 2. Q promises → Native Promises
  {
    name: 'Q promise import',
    find: /const\s+Q\s*=\s*require\(['"]q['"]\);?/g,
    replace: '// Using native Promises instead of Q',
  },
  {
    name: 'Q.fcall patterns',
    find: /Q\.fcall\(\(\)\s*=>\s*([^)]+)\)/g,
    replace: '$1',
  },
  {
    name: 'Q.defer basic',
    find: /Q\.defer\(\)/g,
    replace: 'new Promise((resolve, reject) => { /* TODO: Convert deferred pattern */ })',
  },

  // 3. rimraf → fs.rm()
  {
    name: 'rimraf import',
    find: /const\s+(\w+)\s*=\s*require\(['"]rimraf['"]\);?/g,
    replace: "const fs = require('node:fs').promises;",
  },
  {
    name: 'rimraf.sync usage',
    find: /rimraf\.sync\s*\(\s*(['"][^'"]+['"])\s*\)/g,
    replace: 'fs.rmSync($1, { recursive: true, force: true })',
  },
  {
    name: 'rimraf async usage',
    find: /rimraf\s*\(\s*(['"][^'"]+['"])\s*,\s*([^)]+)\)/g,
    replace: 'fs.rm($1, { recursive: true, force: true }, $2)',
  },

  // 4. uuid → crypto.randomUUID()
  {
    name: 'uuid v4 destructured import',
    find: /const\s*\{\s*v4:\s*(\w+)\s*\}\s*=\s*require\(['"]uuid['"]\);?/g,
    replace: "const crypto = require('node:crypto');",
  },
  {
    name: 'uuid v4 usage',
    find: /\buuidv4\(\)/g,
    replace: 'crypto.randomUUID()',
  },
  {
    name: 'uuid.v4 usage',
    find: /uuid\.v4\(\)/g,
    replace: 'crypto.randomUUID()',
  },

  // 5. mkdirp → fs.mkdir()
  {
    name: 'mkdirp import',
    find: /const\s+(\w+)\s*=\s*require\(['"]mkdirp['"]\);?/g,
    replace: "const fs = require('node:fs').promises;",
  },
  {
    name: 'mkdirp usage',
    find: /mkdirp\s*\(\s*(['"][^'"]+['"])\s*,?\s*([^)]*)\)/g,
    replace: "fs.mkdir($1, { recursive: true }$2 ? ', ' + $2 : '')",
  },

  // 6. request → fetch comments (manual review needed)
  {
    name: 'request import',
    find: /const\s+(\w+)\s*=\s*require\(['"]request['"]\);?/g,
    replace: '// TODO: Replace request with fetch() - manual review needed',
  },

  // 7. async.js patterns → native async/await
  {
    name: 'async.series comment',
    find: /async\.series\s*\(/g,
    replace: '/* TODO: Convert to native async/await */ /* TODO: Convert to native async/await */ async.series(',
  },
  {
    name: 'async.parallel to Promise.all',
    find: /async\.parallel\s*\(\s*\[(.*?)\]\s*,\s*([^)]+)\)/gs,
    replace: 'Promise.all([$1]).then(results => $2(null, results)).catch(error => $2(error))',
  },

  // 8. Common callback-to-Promise patterns
  {
    name: 'fs callback to promises',
    find: /fs\.readFile\s*\(\s*([^,]+)\s*,\s*['"]utf8['"]\s*,\s*([^)]+)\)/g,
    replace: 'fs.promises.readFile($1, "utf8").then(data => $2(null, data)).catch($2)',
  },

  // 9. Error handling improvements
  {
    name: 'throw new Error(to proper error',);
    find: /throw\s+([^;]+);?$/gm,
    replace: 'throw new Error($1);',
  },

  // 10. Modern require statements
  {
    name: 'node: prefix for built-ins',
    find: /require\(['"]util['"]\)/g,
    replace: "require('node:util')",
  },
  {
    name: 'node: prefix for fs',
    find: /require\(['"]fs['"]\)/g,
    replace: "require('node:fs')",
  },
  {
    name: 'node: prefix for crypto',
    find: /require\(['"]crypto['"]\)/g,
    replace: "require('node:crypto')",
  },
  {
    name: 'node: prefix for path',
    find: /require\(['"]path['"]\)/g,
    replace: "require('node:path')",
  },
];

// Performance tracking
const stats = {
  filesProcessed: 0,
  filesModified: 0,
  totalReplacements: 0,
  patternStats: {},
};

// Helper function to check if file should be processed
function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  if (!FILE_EXTENSIONS.includes(ext)) return false;

  const basename = path.basename(filePath);
  if (
    IGNORE_FILES.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(basename);
      }
      return basename === pattern;
    })
  )
    return false;

  return !IGNORE_DIRS.some(dir => filePath.includes(dir));
}

// Process a single file
async function processFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    let modifiedContent = content;
    let fileModified = false;
    let fileReplacements = 0;

    for (const pattern of REPLACEMENT_PATTERNS) {
      const matches = modifiedContent.match(pattern.find);
      if (matches) {
        const oldContent = modifiedContent;
        modifiedContent = modifiedContent.replace(pattern.find, pattern.replace);

        if (oldContent !== modifiedContent) {
          const replacementCount = matches.length;
          fileReplacements += replacementCount;
          stats.totalReplacements += replacementCount;

          if (!stats.patternStats[pattern.name]) {
            stats.patternStats[pattern.name] = 0;
          }
          stats.patternStats[pattern.name] += replacementCount;

          fileModified = true;
          console.log(`  ✅ ${pattern.name}: ${replacementCount} replacement(s)`);
        }
      }
    }

    if (fileModified) {
      // Add modernization header comment
      const headerComment = `/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * ${fileReplacements} deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */\n\n`;

      // Only add header if it doesn't already exist
      if (!modifiedContent.includes('🧜‍♀️ This file has been automatically modernized')) {
        modifiedContent = headerComment + modifiedContent;
      }

      await fs.writeFile(filePath, modifiedContent, 'utf8');
      stats.filesModified++;
      console.log(`📝 Modified: ${filePath} (${fileReplacements} replacements)`);
    }

    stats.filesProcessed++;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Scan directory recursively
async function scanDirectory(dir) {
  const files = [];

  try {
    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        if (!IGNORE_DIRS.includes(item.name)) {
          files.push(...(await scanDirectory(fullPath)));
        }
      } else if (item.isFile() && shouldProcessFile(fullPath)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`❌ Error scanning ${dir}:`, error.message);
  }

  return files;
}

// Create backup before processing
async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `backup-${timestamp}`;

  console.log(`📦 Creating backup in ${backupDir}...`);

  try {
    await fs.mkdir(backupDir, { recursive: true });

    // Copy important source files
    const importantDirs = ['src', 'scripts', 'codemods'];
    for (const dir of importantDirs) {
      try {
        await fs.access(dir);
        await fs.cp(dir, path.join(backupDir, dir), { recursive: true });
      } catch (error) {
        // Directory doesn't exist, skip
      }
    }

    console.log(`✅ Backup created: ${backupDir}`);
    return backupDir;
  } catch (error) {
    console.error('❌ Failed to create backup:', error.message);
    throw new Error(error);
  }
}

// Generate detailed report
function generateReport() {
  console.log('\n📊 Auto-Replace Report');
  console.log('=======================');
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Files modified: ${stats.filesModified}`);
  console.log(`Total replacements: ${stats.totalReplacements}`);

  if (Object.keys(stats.patternStats).length > 0) {
    console.log('\n🔄 Pattern Statistics:');
    for (const [pattern, count] of Object.entries(stats.patternStats)) {
      console.log(`  ${pattern}: ${count} replacement(s)`);
    }
  }

  console.log('\n🧜‍♀️ Next Steps:');
  console.log('1. Review the modified files');
  console.log('2. Run your tests to ensure functionality');
  console.log('3. Check TODO comments for manual review items');
  console.log('4. Consider running the jscodeshift codemod for complex patterns');
}

// Main execution
async function main() {
  try {
    console.log('\n🔍 Scanning for files to process...');
    const filesToProcess = await scanDirectory(process.cwd());

    if (filesToProcess.length === 0) {
      console.log('No files found to process.');
      return;
    }

    console.log(`Found ${filesToProcess.length} files to process.`);

    // Create backup
    await createBackup();

    console.log('\n🔄 Processing files...');

    for (const file of filesToProcess) {
      console.log(`\n🔍 Processing: ${file}`);
      await processFile(file);
    }

    generateReport();

    if (stats.filesModified > 0) {
      console.log('\n🎉 Auto-replacement completed successfully!');
      console.log('Your codebase has been modernized with native Node.js APIs! 🌊');
    } else {
      console.log('\n✨ No deprecated patterns found - your code is already modern!');
    }
  } catch (error) {
    console.error('❌ Auto-replace failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { processFile, REPLACEMENT_PATTERNS };
