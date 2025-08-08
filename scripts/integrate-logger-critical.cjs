#!/usr/bin/env node
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Focused script to integrate logger in critical files
 * This is a more conservative approach targeting specific important files
 */

const fs = require('node:fs');
const path = require('node:path');

// Critical files to update
const CRITICAL_FILES = [
  'src/main.cjs',
  'src/preload.cjs',
  'server.js',
  'src/ai/agent-mode.js',
  'src/renderer/renderer.js',
  'src/renderer/terminal-core.js',
  'src/api/ai.js',
  'src/api/auth.js',
  'src/api/download.js',
  'src/services/telemetry-service.js',
  'src/performance-optimizer.js',
  'src/monitoring/metrics-service.js',
  'src/analytics/google-analytics-integration.js',
  'scripts/build-releases.js',
  'scripts/monitor-live.cjs',
];

// Map of console methods to logger methods with context handling
const METHOD_MAP = {
  'console.log': 'logger.info',
  'console.error': 'logger.error',
  'console.warn': 'logger.warn',
  'console.info': 'logger.info',
  'console.debug': 'logger.debug',
};

// Get relative path for logger import
function getLoggerImportPath(filePath) {
  const fileDir = path.dirname(filePath);
  const loggerPath = path.join(process.cwd(), '../src/utilities/logger.js');
  let relativePath = path.relative(fileDir, loggerPath);

  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }

  return relativePath;
}

// Check if logger is already imported
function hasLoggerImport(content) {
  return (
    content.includes('logger.js') ||
    content.includes('utils/logger') ||
    content.includes('Logger') ||
    content.includes('logger.info') ||
    content.includes('logger.error') ||
    content.includes('logger.warn') ||
    content.includes('logger.debug')
  );
}

// Convert console arguments to logger format
function convertArguments(argsString) {
  // Handle simple string literals
  if (argsString.match(/^['"`].*['"`]$/)) {
    return argsString;
  }

  // Handle template literals
  if (argsString.includes('${')) {
    return argsString;
  }

  // Handle multiple arguments - convert to message + context
  const args = argsString.split(/,\s*(?![^(]*\))/);
  if (args.length === 1) {
    return argsString;
  }

  // First argument is the message, rest become context
  const message = args[0];
  const contextArgs = args.slice(1).join(', ');

  // Try to create a context object
  if (contextArgs.trim()) {
    return `${message}, { data: ${contextArgs} }`;
  }

  return message;
}

// Process a single file
async function processFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    return { error: true, message: 'File not found' };
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    let hasChanges = false;
    let replacements = 0;

    // Check if file already has logger
    const alreadyHasLogger = hasLoggerImport(content);

    // Replace console statements more carefully
    for (const [consoleMethod, loggerMethod] of Object.entries(METHOD_MAP)) {
      // Match console.method( with capturing the arguments
      const regex = new RegExp(`\\b${consoleMethod.replace('.', '\\.')}\\s*\\(([^;]+)\\)`, 'g');

      content = content.replace(regex, (match, args) => {
        replacements++;
        hasChanges = true;
        const convertedArgs = convertArguments(args);
        return `${loggerMethod}(${convertedArgs})`;
      });
    }

    // Add logger import if needed
    if (hasChanges && !alreadyHasLogger) {
      const importPath = getLoggerImportPath(fullPath);
      const isESModule = content.includes('import ') && !filePath.endsWith('.cjs');

      let loggerImport;
      if (isESModule) {
        loggerImport = `import logger from '${importPath}';`;
      } else {
        loggerImport = `const logger = require('${importPath}').default;`;
      }

      // Find where to insert the import
      if (isESModule) {
        // Add after last import
        const lastImport = content.lastIndexOf('import ');
        if (lastImport !== -1) {
          const endOfLine = content.indexOf('\n', lastImport);
          content =
            content.slice(0, endOfLine + 1) + loggerImport + '\n' + content.slice(endOfLine + 1);
        } else {
          // Add at beginning after header comments
          const headerEnd = content.match(/^(\/\*[\s\S]*?\*\/|\/\/.*\n)*/)[0].length;
          content = content.slice(0, headerEnd) + loggerImport + '\n\n' + content.slice(headerEnd);
        }
      } else {
        // Add after last require
        const lastRequire = content.lastIndexOf('require(');
        if (lastRequire !== -1) {
          const lineStart = content.lastIndexOf('\n', lastRequire) + 1;
          const endOfLine = content.indexOf('\n', lastRequire);
          const requireLine = content.substring(lineStart, endOfLine);
          if (
            requireLine.includes('const') ||
            requireLine.includes('let') ||
            requireLine.includes('var')
          ) {
            content =
              content.slice(0, endOfLine + 1) + loggerImport + '\n' + content.slice(endOfLine + 1);
          }
        } else {
          // Add at beginning after header
          const headerEnd = content.match(/^(\/\*[\s\S]*?\*\/|\/\/.*\n)*/)[0].length;
          content =
            content.slice(0, headerEnd) + '\n' + loggerImport + '\n' + content.slice(headerEnd);
        }
      }
    }

    // Write back if changes were made
    if (hasChanges) {
      // Create backup
      const backupPath = fullPath + '.backup';
      fs.writeFileSync(backupPath, originalContent, 'utf8');

      // Write updated content
      fs.writeFileSync(fullPath, content, 'utf8');

      return {
        modified: true,
        replacements,
        backupPath,
      };
    }

    return { modified: false };
  } catch (error) {
    return {
      error: true,
      message: error.message,
    };
  }
}

// Main function
async function main() {
  console.log('🔧 Starting focused logger integration...\n');

  let modifiedFiles = 0;
  let totalReplacements = 0;
  const errors = [];

  for (const file of CRITICAL_FILES) {
    process.stdout.write(`Processing ${file}... `);
    const result = await processFile(file);

    if (result.modified) {
      modifiedFiles++;
      totalReplacements += result.replacements;
      console.log(`✅ Modified (${result.replacements} replacements)`);
      console.log(`   Backup saved: ${path.basename(result.backupPath)}`);
    } else if (result.error) {
      errors.push({ file, message: result.message });
      console.log(`❌ Error: ${result.message}`);
    } else {
      console.log('⏭️  Skipped (no changes needed)');
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log(`Files processed: ${CRITICAL_FILES.length}`);
  console.log(`Files modified: ${modifiedFiles}`);
  console.log(`Total replacements: ${totalReplacements}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(err => {
      console.log(`  - ${err.file}: ${err.message}`);
    });
  }

  console.log('\n✨ Logger integration complete!');
  console.log('\n💡 Next steps:');
  console.log('1. Review changes: git diff');
  console.log('2. Test the application');
  console.log('3. If issues arise, restore from .backup files');
  console.log('4. Remove .backup files when satisfied: rm **/*.backup');
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
