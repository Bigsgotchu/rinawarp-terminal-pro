#!/usr/bin/env node

/**
 * Remove console.log statements from production code
 * Preserves important error logging and replaces with proper logger
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Patterns to preserve (important logs)
const PRESERVE_PATTERNS = [
  /console\.(error|warn)\(/g, // Keep error and warning logs
  /console\.log\(['"`]✅/g, // Keep success indicators
  /console\.log\(['"`]❌/g, // Keep error indicators
  /console\.log\(['"`]⚠️/g, // Keep warning indicators
  /console\.log\(['"`]📊/g, // Keep analytics logs
  /console\.log\(['"`]💰/g, // Keep payment logs
];

// Files/directories to skip
const SKIP_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/*.test.js',
  '**/*.spec.js',
  '**/tests/**',
  '**/scripts/**',
  '**/deprecated/**',
  '**/examples/**',
  '**/*.min.js',
  '**/vendor/**',
  '**/public/vendor/**',
  '**/remove-console-logs.js',
];

// Production logger template
const LOGGER_IMPORT = 'import logger from \'./utils/logger.js\';';
const LOGGER_TEMPLATE = {
  'console.log': 'logger.info',
  'console.debug': 'logger.debug',
  'console.info': 'logger.info',
  'console.warn': 'logger.warn',
  'console.error': 'logger.error',
};

let totalFilesProcessed = 0;
let totalLogsRemoved = 0;
let totalLogsReplaced = 0;

async function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const _originalContent = content;
    let fileModified = false;
    let logsInFile = 0;
    let replacedInFile = 0;

    // Check if this is a critical file that should keep some logs
    const isCriticalFile =
      filePath.includes('payment') ||
      filePath.includes('stripe') ||
      filePath.includes('webhook') ||
      filePath.includes('auth') ||
      filePath.includes('security');

    // First pass: Replace console statements with logger
    if (isCriticalFile) {
      // For critical files, replace with proper logger
      Object.entries(LOGGER_TEMPLATE).forEach(([consoleMethod, loggerMethod]) => {
        const regex = new RegExp(`${consoleMethod}\\(`, 'g');
        const matches = content.match(regex);
        if (matches) {
          content = content.replace(regex, `${loggerMethod}(`);
          replacedInFile += matches.length;
          fileModified = true;
        }
      });

      // Add logger import if we replaced anything and it's not already there
      if (
        fileModified &&
        !content.includes('import logger') &&
        !content.includes('require(\'.*logger')
      ) {
        // Find the right place to insert the import
        const firstImportMatch = content.match(/^import .* from/m);
        if (firstImportMatch) {
          const insertPosition = content.indexOf(firstImportMatch[0]);
          content =
            content.slice(0, insertPosition) + LOGGER_IMPORT + '\n' + content.slice(insertPosition);
        } else {
          // No imports found, add at the beginning
          content = LOGGER_IMPORT + '\n\n' + content;
        }
      }
    } else {
      // For non-critical files, remove console.log statements
      // But preserve important ones
      const lines = content.split('\n');
      const newLines = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let shouldKeep = true;

        // Check if line contains console.log
        if (line.includes('console.log(')) {
          // Check if it matches any preserve pattern
          const shouldPreserve = PRESERVE_PATTERNS.some(pattern => pattern.test(line));

          if (!shouldPreserve) {
            shouldKeep = false;
            logsInFile++;
            fileModified = true;
          }
        }

        if (shouldKeep) {
          newLines.push(line);
        }
      }

      content = newLines.join('\n');
    }

    // Write back if modified
    if (fileModified) {
      fs.writeFileSync(filePath, content, 'utf8');
      totalFilesProcessed++;
      totalLogsRemoved += logsInFile;
      totalLogsReplaced += replacedInFile;

      const action = isCriticalFile
        ? `Replaced ${replacedInFile} logs with logger`
        : `Removed ${logsInFile} console.log statements`;
      console.log(`✅ ${path.relative(process.cwd(), filePath)}: ${action}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

async function createProductionLogger() {
  const loggerPath = path.join(process.cwd(), 'src', 'utils', 'logger.js');

  if (fs.existsSync(loggerPath)) {
    console.log('✅ Logger already exists');
    return;
  }

  const loggerContent = `/**
 * Production Logger
 * Centralized logging system for RinaWarp Terminal
 */

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }

  shouldLog(level) {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + JSON.stringify(args) : '';
    return \`[\${timestamp}] [\${level.toUpperCase()}] \${message}\${formattedArgs}\`;
  }

  debug(message, ...args) {
    if (this.shouldLog('debug')) {
      if (this.isDevelopment) {
        console.debug(message, ...args);
      } else {
        this.writeToFile('debug', message, args);
      }
    }
  }

  info(message, ...args) {
    if (this.shouldLog('info')) {
      if (this.isDevelopment) {
        console.info(message, ...args);
      } else {
        this.writeToFile('info', message, args);
      }
    }
  }

  warn(message, ...args) {
    if (this.shouldLog('warn')) {
      console.warn(message, ...args);
      this.writeToFile('warn', message, args);
    }
  }

  error(message, ...args) {
    if (this.shouldLog('error')) {
      console.error(message, ...args);
      this.writeToFile('error', message, args);
      
      // Send to monitoring service in production
      if (!this.isDevelopment && process.env.SENTRY_DSN) {
        this.sendToSentry(message, args);
      }
    }
  }

  writeToFile(level, message, args) {
    // In production, write to log file or send to log aggregation service
    // This is a placeholder - implement based on your infrastructure
    const logEntry = this.formatMessage(level, message, ...args);
    
    // TODO: Implement file writing or log service integration
    // For now, we'll use a simple approach
    if (typeof process !== 'undefined' && process.send) {
      process.send({ type: 'log', level, message: logEntry });
    }
  }

  sendToSentry(message, args) {
    // Placeholder for Sentry integration
    // TODO: Implement when Sentry is configured
  }
}

// Export singleton instance
export default new Logger();
`;

  // Ensure directory exists
  const dir = path.dirname(loggerPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(loggerPath, loggerContent, 'utf8');
  console.log('✅ Created production logger at:', loggerPath);
}

async function main() {
  console.log('🔧 Removing console.log statements from production code...\n');

  // Create production logger first
  await createProductionLogger();

  // Find all JavaScript and TypeScript files
  const files = await glob('**/*.{js,jsx,ts,tsx}', {
    ignore: SKIP_PATTERNS,
    absolute: true,
  });

  console.log(`Found ${files.length} files to process\n`);

  // Process files in batches
  const batchSize = 10;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await Promise.all(batch.map(file => processFile(file)));
  }

  console.log('\n📊 Summary:');
  console.log(`  - Files processed: ${totalFilesProcessed}`);
  console.log(`  - Console.log statements removed: ${totalLogsRemoved}`);
  console.log(`  - Logs replaced with logger: ${totalLogsReplaced}`);
  console.log('\n✅ Console.log cleanup complete!');

  // Create a report
  const report = {
    timestamp: new Date().toISOString(),
    filesProcessed: totalFilesProcessed,
    logsRemoved: totalLogsRemoved,
    logsReplaced: totalLogsReplaced,
    criticalFilesUpdated: files.filter(
      f => f.includes('payment') || f.includes('stripe') || f.includes('webhook')
    ).length,
  };

  fs.writeFileSync('console-log-cleanup-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Report saved to console-log-cleanup-report.json');
}

// Run the script
main().catch(console.error);
