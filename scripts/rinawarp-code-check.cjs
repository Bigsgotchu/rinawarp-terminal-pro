#!/usr/bin/env node
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

const fs = require('node:fs').promises;
const path = require('node:path');

// Focus on RinaWarp-specific files - Currently using custom logic in findRinaWarpFiles
// const RINAWARP_PATTERNS = [
//   '**/rinawarp*.js',
//   '**/rinawarp*.ts',
//   '**/rinawarp*.cjs',
//   '**/RinaWarp*.js',
//   '**/RinaWarp*.ts',
//   'sdk/**/*.js',
//   'sdk/**/*.ts',
//   'tools/rinawarp-cleanup/**/*.js'
// ];

// Common code issues to check
const ISSUE_PATTERNS = {
  // 1. Syntax Errors
  missingCommas: {
    pattern: /\}\s*{|\]\s*\[|\)\s*\(/g,
    message: 'Missing comma between objects/arrays',
  },
  unclosedBrackets: {
    pattern: /[\[{(](?![^[\]{}()]*[\]})])/g,
    message: 'Potentially unclosed bracket',
  },
  extraCommas: {
    pattern: /,\s*[}\])]|,\s*,/g,
    message: 'Extra or trailing comma',
  },

  // 2. Variable Issues
  undefinedVars: {
    pattern: /\b(undefined|null)\s*\.\w+/g,
    message: 'Accessing property of undefined/null',
  },
  typeCoercion: {
    pattern: /===(?!=)/g,
    message: 'Use === instead of === to avoid type coercion',
  },

  // 3. Async Issues
  missingAwait: {
    pattern: /\.then\s*\([^)]*\)\s*(?!\.catch)/g,
    message: 'Promise without error handling',
  },
  asyncNoAwait: {
    pattern: /async\s+function[^{]*{[^}]*}(?![^{]*await)/g,
    message: 'Async function without await',
  },

  // 4. Module Issues
  requireInESM: {
    pattern: /\brequire\s*\(/g,
    message: 'Using require() in ES module',
    checkFileType: true,
  },

  // 5. Security Issues
  hardcodedSecrets: {
    pattern: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*['"`][^'"`]{10}['"`]/gi,
    message: 'Possible hardcoded secret',
  },
  evalUsage: {
    pattern: /\beval\s*\(/g,
    message: 'Dangerous use of eval()',
  },

  // 6. Resource Management
  unclosedStreams: {
    pattern: /createReadStream|createWriteStream(?![^}]*\.(?:close|end))/g,
    message: 'Stream may not be properly closed',
  },

  // 7. Code Quality
  consoleLogs: {
    pattern: /console\.\w+\s*\(/g,
    message: 'Console statement (remove for production)',
  },
  longLines: {
    pattern: /^.{120}$/gm,
    message: 'Line exceeds 120 characters',
  },
  todoComments: {
    pattern: /\/\/\s*(?:TODO|FIXME|HACK|XXX)/gi,
    message: 'Unresolved TODO/FIXME comment',
  },
};

async function findRinaWarpFiles(dir) {
  const files = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip common directories
      if (entry.isDirectory()) {
        if (['node_modules', 'dist', 'build', '.git', 'coverage'].includes(entry.name)) {
          continue;
        }
        files.push(...(await findRinaWarpFiles(fullPath)));
      } else if (entry.isFile()) {
        // Check if file matches RinaWarp patterns
        const fileName = entry.name.toLowerCase();
        if (
          fileName.includes('rinawarp') ||
          fullPath.includes('/sdk/') ||
          fullPath.includes('/tools/rinawarp-cleanup/')
        ) {
          if (fileName.endsWith('.js') || fileName.endsWith('.ts') || fileName.endsWith('.cjs')) {
            files.push(fullPath);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }

  return files;
}

async function checkFile(filePath) {
  const issues = [];

  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const relativePath = path.relative(process.cwd(), filePath);
    const isESModule = filePath.endsWith('.js') && !filePath.endsWith('.cjs');

    for (const [issueType, config] of Object.entries(ISSUE_PATTERNS)) {
      // Skip require check for .cjs files
      if (config.checkFileType && !isESModule) continue;

      const matches = content.matchAll(new RegExp(config.pattern));
      for (const match of matches) {
        const position = match.index;
        let lineNumber = 1;
        let charCount = 0;

        for (let i = 0; i < lines.length; i++) {
          charCount += lines[i].length + 1; // +1 for newline
          if (charCount > position) {
            lineNumber = i + 1;
            break;
          }
        }

        issues.push({
          file: relativePath,
          line: lineNumber,
          type: issueType,
          message: config.message,
          snippet: match[0].substring(0, 50) + (match[0].length > 50 ? '...' : ''),
        });
      }
    }

    // Check for RinaWarp-specific patterns
    if (content.includes('RinaWarpSDK') || content.includes('rinawarp')) {
      // Check for unhandled SDK errors
      const sdkCalls = content.matchAll(/(?:sdk|rinawarp)\.\w+\s*\([^)]*\)/g);
      for (const match of sdkCalls) {
        const position = match.index;
        const afterCall = content.substring(
          position + match[0].length,
          position + match[0].length + 50
        );
        if (!afterCall.match(/\.catch|\.then.*catch|try\s*{|catch\s*\(/)) {
          const lineNumber = content.substring(0, position).split('\n').length;
          issues.push({
            file: relativePath,
            line: lineNumber,
            type: 'unhandledSDKCall',
            message: 'RinaWarp SDK call without error handling',
            snippet: match[0],
          });
        }
      }
    }
  } catch (error) {
    issues.push({
      file: path.relative(process.cwd(), filePath),
      line: 0,
      type: 'fileError',
      message: `Could not read file: ${error.message}`,
      snippet: '',
    });
  }

  return issues;
}

async function main() {
  try {
    process.env.NODE_ENV !== 'production' && console.log('🔍 RinaWarp Code Quality Check\n');
  process.env.NODE_ENV !== 'production' && console.log('Scanning for RinaWarp-specific files...\n');

  const rootDir = process.cwd();
  const files = await findRinaWarpFiles(rootDir);

  process.env.NODE_ENV !== 'production' &&
    console.log(`Found ${files.length} RinaWarp-related files\n`);

  let allIssues = [];

  // Check each file
  for (const file of files) {
    const issues = await checkFile(file);
    allIssues = allIssues.concat(issues);
  }

  // Group issues by type
  const issuesByType = {};
  allIssues.forEach(issue => {
    if (!issuesByType[issue.type]) {
      issuesByType[issue.type] = [];
    }
    issuesByType[issue.type].push(issue);
  });

  // Display results
  process.env.NODE_ENV !== 'production' && console.log('📊 Summary:');
  process.env.NODE_ENV !== 'production' && console.log(`Total issues found: ${allIssues.length}\n`);

  if (allIssues.length === 0) {
    process.env.NODE_ENV !== 'production' &&
      console.log('✅ No issues found! Your RinaWarp code looks good.');
    return;
  }

  process.env.NODE_ENV !== 'production' && console.log('Issues by type:');
  Object.entries(issuesByType).forEach(([type, issues]) => {
    process.env.NODE_ENV !== 'production' && console.log(`  ${type}: ${issues.length}`);
  });

  process.env.NODE_ENV !== 'production' && console.log('\n🔥 Critical Issues to Fix:\n');

  // Show critical issues first
  const criticalTypes = [
    'syntaxError',
    'unclosedBrackets',
    'evalUsage',
    'hardcodedSecrets',
    'unhandledSDKCall',
  ];
  const criticalIssues = allIssues.filter(issue => criticalTypes.includes(issue.type));

  if (criticalIssues.length > 0) {
    criticalIssues.slice(0, 10).forEach((issue, index) => {
      process.env.NODE_ENV !== 'production' &&
        console.log(`${index + 1}. [${issue.type}] ${issue.message}`);
      process.env.NODE_ENV !== 'production' && console.log(`   File: ${issue.file}:${issue.line}`);
      process.env.NODE_ENV !== 'production' && console.log(`   Code: ${issue.snippet}\n`);
    });
  }

  // Show other issues
  process.env.NODE_ENV !== 'production' && console.log('⚠️  Other Issues:\n');
  const otherIssues = allIssues.filter(issue => !criticalTypes.includes(issue.type));
  otherIssues.slice(0, 10).forEach((issue, index) => {
    process.env.NODE_ENV !== 'production' &&
      console.log(`${index + 1}. [${issue.type}] ${issue.message}`);
    process.env.NODE_ENV !== 'production' && console.log(`   File: ${issue.file}:${issue.line}`);
    process.env.NODE_ENV !== 'production' && console.log(`   Code: ${issue.snippet}\n`);
  });

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    totalIssues: allIssues.length,
    issuesByType,
    files: files.length,
    allIssues,
  };

  await fs.writeFile(
    path.join(rootDir, 'rinawarp-code-report.json'),
    JSON.stringify(report, null, 2)
  );

  process.env.NODE_ENV !== 'production' &&
    console.log('\n📝 Full report saved to: rinawarp-code-report.json');

  // Provide fixing tips
  process.env.NODE_ENV !== 'production' && console.log('\n💡 Quick Fixes:');
  process.env.NODE_ENV !== 'production' &&
    console.log('1. Replace === with === for strict equality');
  process.env.NODE_ENV !== 'production' && console.log('2. Add .catch() to all promise chains');
  process.env.NODE_ENV !== 'production' && console.log('3. Remove or guard console.log statements');
  process.env.NODE_ENV !== 'production' && console.log('4. Move secrets to environment variables');
  process.env.NODE_ENV !== 'production' && console.log('5. Add try-catch blocks around SDK calls');
  } catch (error) {
    console.error('Code quality check failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
