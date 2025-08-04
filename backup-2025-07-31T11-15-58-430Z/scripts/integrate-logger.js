#!/usr/bin/env node

/**
 * Script to integrate the centralized logger across the RinaWarp Terminal codebase
 * This replaces console.log/error/warn/info statements with the logger system
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// These constants are not used directly, kept for reference
// const LOGGER_IMPORT_ES = 'import logger from \'../utils/logger.js\';';
// const LOGGER_IMPORT_CJS = 'const logger = require(\'../utils/logger.js\').default;';

// Files to skip
const SKIP_FILES = [
  'logger.js',
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  'public/vendor',
  'public/assets/xterm',
  'exec -l /bin/bash',
  'deprecated',
  '.backups',
  'email-templates/testing',
  'tools/rinawarp-cleanup',
  'sdk/javascript/dist',
  'sdk/typescript/dist',
];

// Map of console methods to logger methods
const METHOD_MAP = {
  'console.log': 'logger.info',
  'console.error': 'logger.error',
  'console.warn': 'logger.warn',
  'console.info': 'logger.info',
  'console.debug': 'logger.debug',
};

// Check if file should be skipped
function shouldSkipFile(filePath) {
  return SKIP_FILES.some(skip => filePath.includes(skip));
}

// Get the appropriate logger import based on file path
function getLoggerImport(filePath, fileContent) {
  const relativePath = path.relative(
    path.dirname(filePath),
    path.join(process.cwd(), 'src/utils/logger.js')
  );
  const importPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;

  // Check if file uses ES modules or CommonJS
  const isESModule =
    fileContent.includes('import ') || fileContent.includes('export ') || filePath.endsWith('.mjs');
  const isCJS = fileContent.includes('require(') || filePath.endsWith('.cjs');

  if (isESModule && !isCJS) {
    return `import logger from '${importPath}';`;
  } else {
    return `const logger = require('${importPath}').default;`;
  }
}

// Check if logger is already imported
function hasLoggerImport(content) {
  return (
    content.includes('from \'../utils/logger') ||
    content.includes('from \'./utils/logger') ||
    content.includes('require(\'../utils/logger') ||
    content.includes('require(\'./utils/logger') ||
    content.includes('logger.js')
  );
}

// Process a single file
async function processFile(filePath) {
  if (shouldSkipFile(filePath)) {
    return { skipped: true };
  }

  try {
    let content = await fs.promises.readFile(filePath, 'utf8');
    const _originalContent = content;
    let hasChanges = false;
    let replacements = 0;

    // Check if file already uses logger
    const alreadyHasLogger = hasLoggerImport(content);

    // Replace console statements
    for (const [consoleMethod, loggerMethod] of Object.entries(METHOD_MAP)) {
      const regex = new RegExp(`\\b${consoleMethod.replace('.', '\\.')}\\s*\\(`, 'g');
      const matches = content.match(regex);

      if (matches && matches.length > 0) {
        content = content.replace(regex, `${loggerMethod}(`);
        replacements += matches.length;
        hasChanges = true;
      }
    }

    // Add logger import if needed
    if (hasChanges && !alreadyHasLogger) {
      const loggerImport = getLoggerImport(filePath, content);

      // Find the right place to insert the import
      const importMatch = content.match(/^(import\s+.*?;?\s*\n)+/m);
      const requireMatch = content.match(/^(const\s+.*?=\s*require\(.*?\);?\s*\n)+/m);

      if (importMatch) {
        // Add after existing imports
        const lastImportEnd = importMatch.index + importMatch[0].length;
        content =
          content.slice(0, lastImportEnd) + loggerImport + '\n' + content.slice(lastImportEnd);
      } else if (requireMatch) {
        // Add after existing requires
        const lastRequireEnd = requireMatch.index + requireMatch[0].length;
        content =
          content.slice(0, lastRequireEnd) + loggerImport + '\n' + content.slice(lastRequireEnd);
      } else {
        // Add at the beginning of the file (after any comments/headers)
        const headerMatch = content.match(/^(\/\*[\s\S]*?\*\/|\/\/.*?\n|#!.*?\n)+/);
        if (headerMatch) {
          const headerEnd = headerMatch.index + headerMatch[0].length;
          content =
            content.slice(0, headerEnd) + '\n' + loggerImport + '\n' + content.slice(headerEnd);
        } else {
          content = loggerImport + '\n\n' + content;
        }
      }
    }

    // Write back if changes were made
    if (hasChanges) {
      await fs.promises.writeFile(filePath, content, 'utf8');
      return {
        modified: true,
        replacements,
        filePath: path.relative(process.cwd(), filePath),
      };
    }

    return { modified: false };
  } catch (error) {
    return {
      error: true,
      message: error.message,
      filePath: path.relative(process.cwd(), filePath),
    };
  }
}

// Main function
async function main() {
  console.log('🔧 Starting logger integration...\n');

  // Find all JavaScript and TypeScript files
  const patterns = [
    'src/**/*.js',
    'src/**/*.cjs',
    'src/**/*.mjs',
    'src/**/*.ts',
    'src/**/*.tsx',
    'scripts/**/*.js',
    'scripts/**/*.cjs',
    'tools/**/*.js',
    'sdk/javascript/src/**/*.js',
    'sdk/typescript/src/**/*.ts',
  ];

  let totalFiles = 0;
  let modifiedFiles = 0;
  let totalReplacements = 0;
  const errors = [];

  for (const pattern of patterns) {
    const files = await glob(pattern, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      cwd: process.cwd(),
    });

    for (const file of files) {
      const filePath = path.join(process.cwd(), file);
      const result = await processFile(filePath);

      totalFiles++;

      if (result.modified) {
        modifiedFiles++;
        totalReplacements += result.replacements;
        console.log(`✅ Modified: ${result.filePath} (${result.replacements} replacements)`);
      } else if (result.error) {
        errors.push(result);
        console.log(`❌ Error: ${result.filePath} - ${result.message}`);
      }
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log(`Total files processed: ${totalFiles}`);
  console.log(`Files modified: ${modifiedFiles}`);
  console.log(`Total replacements: ${totalReplacements}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach(err => {
      console.log(`  - ${err.filePath}: ${err.message}`);
    });
  }

  console.log('\n✨ Logger integration complete!');
  console.log('\n💡 Next steps:');
  console.log('1. Review the changes with: git diff');
  console.log('2. Run tests to ensure everything works: npm test');
  console.log('3. Commit the changes when satisfied');
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
