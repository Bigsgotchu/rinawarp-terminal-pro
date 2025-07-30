#!/usr/bin/env node

/**
 * Script to integrate the centralized logger in critical files of RinaWarp Terminal
 * This replaces console.log/error/warn/info statements with the logger system
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const LOGGER_IMPORT_ES = 'import logger from \'../utils/logger.js\';';
const LOGGER_IMPORT_CJS = 'const logger = require(\'../utils/logger.js\').default;';

// Specific critical files to target
const CRITICAL_FILES = [
  'src/main.cjs',
  'src/preload.cjs',
  'src/terminal/simple-terminal.cjs',
  'src/config/unified-config.cjs',
  'src/renderer/terminal-core.js',
  'src/renderer/shell-process-manager.js'
];

// Map of console methods to logger methods
const METHOD_MAP = {
  'console.log': 'logger.info',
  'console.error': 'logger.error',
  'console.warn': 'logger.warn',
  'console.info': 'logger.info',
  'console.debug': 'logger.debug'
};

// Check if logger is already imported
function hasLoggerImport(content) {
  return content.includes('from \'../utils/logger') || 
         content.includes('from \'./utils/logger') ||
         content.includes('require(\'../utils/logger') ||
         content.includes('require(\'./utils/logger') ||
         content.includes('logger.js');
}

// Get the appropriate logger import based on file path
function getLoggerImport(filePath, fileContent) {
  // Check if file uses ES modules or CommonJS
  const isESModule = fileContent.includes('import ') || fileContent.includes('export ') || filePath.endsWith('.mjs');
  const isCJS = fileContent.includes('require(') || filePath.endsWith('.cjs');
  
  if (isESModule && !isCJS) {
    const relativePath = path.relative(path.dirname(filePath), path.join(process.cwd(), 'src/utils/logger.js'));
    const importPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
    return `import logger from '${importPath}';`;
  } else {
    // For CommonJS files, use the CommonJS wrapper
    const relativePath = path.relative(path.dirname(filePath), path.join(process.cwd(), 'src/utils/logger.cjs'));
    const importPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
    return `const logger = require('${importPath}');`;
  }
}

// Process a single file
async function processFile(filePath) {
  try {
    let content = await fs.promises.readFile(filePath, 'utf8');
    const originalContent = content;
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
        content = content.slice(0, lastImportEnd) + loggerImport + '\n' + content.slice(lastImportEnd);
      } else if (requireMatch) {
        // Add after existing requires
        const lastRequireEnd = requireMatch.index + requireMatch[0].length;
        content = content.slice(0, lastRequireEnd) + loggerImport + '\n' + content.slice(lastRequireEnd);
      } else {
        // Add at the beginning of the file (after any comments/headers)
        const headerMatch = content.match(/^(\/\*[\s\S]*?\*\/|\/\/.*?\n|#!.*?\n)+/);
        if (headerMatch) {
          const headerEnd = headerMatch.index + headerMatch[0].length;
          content = content.slice(0, headerEnd) + '\n' + loggerImport + '\n' + content.slice(headerEnd);
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
        filePath: path.relative(process.cwd(), filePath)
      };
    }

    return { modified: false };
  } catch (error) {
    return { 
      error: true, 
      message: error.message,
      filePath: path.relative(process.cwd(), filePath)
    };
  }
}

// Main function
async function main() {
  console.log('🔧 Starting focused logger integration...\n');

  let totalFiles = 0;
  let modifiedFiles = 0;
  let totalReplacements = 0;
  const errors = [];

  for (const file of CRITICAL_FILES) {
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

  console.log('\n✨ Focused logger integration complete!');
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

