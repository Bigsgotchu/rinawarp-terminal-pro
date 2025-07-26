#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Configuration
const ROOT_DIR = path.join(__dirname, '..');
const EXCLUDE_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  'coverage',
  '.next',
  '.cache',
  'exec -l /bin/bash',
  '.backups',
  'deprecated',
  'ip-evidence',
  'obfuscated',
  'code-evidence',
  'build-evidence'
]);

const FILE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.json', '.yaml', '.yml', '.py', '.env', '.md'
]);

// Issue tracking
const issues = {
  syntaxErrors: [],
  variableScope: [],
  typeErrors: [],
  logicErrors: [],
  asyncErrors: [],
  moduleErrors: [],
  configErrors: [],
  resourceErrors: [],
  testingErrors: [],
  securityIssues: [],
  performanceIssues: [],
  deprecatedCode: [],
  codeQuality: []
};

// Pattern checkers
const patterns = {
  // Syntax Errors
  unclosedBrackets: /[\[{(](?![^[\]{}()]*[\]})])/g,
  extraCommas: /,\s*[}\]\)]|,\s*,/g,
  missingSemicolons: /[^;}]\s*\n\s*(let|const|var|return|break|continue|throw)/g,
  mixedIndentation: /^( +\t|\t+ )/gm,
  unclosedStrings: /(['"`])(?:(?=(\\?))\2.)*?(?!\1)/g,
  
  // Variable Scope
  undeclaredVariable: /(?<![\w.])(?!function|class|if|else|for|while|switch|case|try|catch|finally|return|break|continue|throw|new|typeof|instanceof|delete|void|this|super|import|export|from|as|default|const|let|var|await|async|yield|static|get|set|constructor|extends|of|in)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=[=\+\-\*/%<>&|^!~\?:]|\s*\()/g,
  hoisting: /console\.log\([^)]*\)[\s\S]*?(?:let|const)\s+\1\s*=/g,
  
  // Type Errors
  typeCoercion: /==(?!=)/g,
  implicitTypeConversion: /\+\s*['"`]|['"`]\s*\+/g,
  
  // Logic Errors
  offByOne: /for\s*\([^;]+;\s*\w+\s*<=?\s*\w+\.length\s*;/g,
  
  // Async Handling
  missingAwait: /(?<!await\s+)\b\w+\s*\([^)]*\)\s*\.then\(/g,
  asyncWithoutAwait: /async\s+(?:function\s+)?\w*\s*\([^)]*\)\s*{[^}]*}(?![^{]*\bawait\b)/g,
  unhandledPromise: /new\s+Promise\s*\([^)]+\)(?!\s*\.(?:then|catch|finally))/g,
  
  // Module/Dependency
  circularDependency: /require\(['"`]\.{1,2}\/[^'"]+['"`]\)|import\s+.*\s+from\s+['"`]\.{1,2}\/[^'"]+['"`]/g,
  missingImport: /\b(?:require|import)\s*\(['"`][^'"]+['"`]\)/g,
  
  // Configuration
  hardcodedSecrets: /(?:api[_-]?key|secret|password|token|private[_-]?key)\s*[:=]\s*['"`][^'"`]+['"`]/gi,
  hardcodedUrls: /https?:\/\/(?:localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)/g,
  
  // Resource Handling
  unclosedResources: /(?:open|createReadStream|createWriteStream)\s*\([^)]+\)(?![^{]*\.(?:close|end|destroy))/g,
  
  // Testing
  skippedTests: /\.skip\s*\(|xit\s*\(/g,
  onlyTests: /\.only\s*\(|fit\s*\(/g,
  
  // Security
  dangerousEval: /\beval\s*\(/g,
  sqlInjection: /query\s*\([^)]*\+[^)]*\)/g,
  xss: /innerHTML\s*=|document\.write\s*\(/g,
  
  // Performance
  syncFileOps: /(?:readFileSync|writeFileSync|existsSync|statSync)\s*\(/g,
  inefficientLoops: /for\s*\([^)]+in\s+\w+\)|\.forEach\s*\([^)]+\)\s*(?:{[^}]*push\s*\(|=>.*push\s*\()/g,
  
  // Code Quality
  consoleLogs: /console\.\w+\s*\(/g,
  debugger: /\bdebugger\b/g,
  todoComments: /\/\/\s*(?:TODO|FIXME|HACK|XXX|BUG)/gi,
  longLines: /^.{120,}$/gm,
  deepNesting: /(\{[^{}]*){5,}/g,
  duplicateCode: /(.{30,})\n(?:.*\n)*\1/g
};

// Scan a file for issues
async function scanFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const relativePath = path.relative(ROOT_DIR, filePath);
    const fileIssues = [];
    
    // Check each pattern
    for (const [issueType, pattern] of Object.entries(patterns)) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        // Get line numbers for matches
        const lines = content.split('\n');
        matches.forEach(match => {
          const lineNumber = lines.findIndex(line => line.includes(match)) + 1;
          fileIssues.push({
            file: relativePath,
            type: issueType,
            line: lineNumber,
            match: match.substring(0, 100) + (match.length > 100 ? '...' : ''),
            severity: getSeverity(issueType)
          });
        });
      }
    }
    
    // Special checks for specific file types
    if (filePath.endsWith('.json')) {
      try {
        JSON.parse(content);
      } catch (e) {
        fileIssues.push({
          file: relativePath,
          type: 'invalidJson',
          line: 1,
          match: e.message,
          severity: 'error'
        });
      }
    }
    
    // Check for RinaWarp-specific issues
    if (content.includes('rinawarp') || content.includes('RinaWarp')) {
      // Check for missing error handling in RinaWarp SDK calls
      const sdkCallPattern = /(?:rinawarp|sdk)\.\w+\s*\([^)]*\)(?!\s*\.(?:then|catch)|(?:\s*;?\s*\n\s*)?catch\s*\()/gi;
      const sdkMatches = content.match(sdkCallPattern);
      if (sdkMatches) {
        sdkMatches.forEach(match => {
          fileIssues.push({
            file: relativePath,
            type: 'unhandledSdkCall',
            line: content.split('\n').findIndex(line => line.includes(match)) + 1,
            match: match,
            severity: 'warning'
          });
        });
      }
    }
    
    return fileIssues;
  } catch (error) {
    return [{
      file: path.relative(ROOT_DIR, filePath),
      type: 'fileReadError',
      line: 0,
      match: error.message,
      severity: 'error'
    }];
  }
}

// Get severity level for issue type
function getSeverity(issueType) {
  const errorTypes = ['syntaxError', 'invalidJson', 'fileReadError', 'unclosedBrackets', 'unclosedStrings'];
  const warningTypes = ['missingAwait', 'hardcodedSecrets', 'dangerousEval', 'sqlInjection', 'xss'];
  
  if (errorTypes.includes(issueType)) return 'error';
  if (warningTypes.includes(issueType)) return 'warning';
  return 'info';
}

// Recursively scan directory
async function scanDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const scanPromises = [];
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory() && !EXCLUDE_DIRS.has(entry.name)) {
      scanPromises.push(scanDirectory(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (FILE_EXTENSIONS.has(ext)) {
        scanPromises.push(scanFile(fullPath));
      }
    }
  }
  
  const results = await Promise.all(scanPromises);
  return results.flat();
}

// Generate report
function generateReport(allIssues) {
  const report = {
    timestamp: new Date().toISOString(),
    totalIssues: allIssues.length,
    byType: {},
    bySeverity: {
      error: 0,
      warning: 0,
      info: 0
    },
    byFile: {},
    topIssues: []
  };
  
  // Categorize issues
  allIssues.forEach(issue => {
    // By type
    report.byType[issue.type] = (report.byType[issue.type] || 0) + 1;
    
    // By severity
    report.bySeverity[issue.severity]++;
    
    // By file
    if (!report.byFile[issue.file]) {
      report.byFile[issue.file] = [];
    }
    report.byFile[issue.file].push(issue);
  });
  
  // Get top issues (errors and warnings)
  report.topIssues = allIssues
    .filter(issue => issue.severity !== 'info')
    .sort((a, b) => {
      const severityOrder = { error: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .slice(0, 20);
  
  return report;
}

// Main execution
async function main() {
  console.log('🔍 Starting deep code scan for RinaWarp project...\n');
  
  try {
    const allIssues = await scanDirectory(ROOT_DIR);
    const report = generateReport(allIssues);
    
    // Save detailed report
    await fs.writeFile(
      path.join(ROOT_DIR, 'code-scan-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Print summary
    console.log('📊 Scan Summary:');
    console.log(`Total Issues Found: ${report.totalIssues}`);
    console.log(`  - Errors: ${report.bySeverity.error}`);
    console.log(`  - Warnings: ${report.bySeverity.warning}`);
    console.log(`  - Info: ${report.bySeverity.info}`);
    console.log('\n📈 Issues by Type:');
    
    Object.entries(report.byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
      });
    
    console.log('\n🔥 Top Issues to Fix:');
    report.topIssues.forEach((issue, index) => {
      console.log(`\n${index + 1}. [${issue.severity.toUpperCase()}] ${issue.type}`);
      console.log(`   File: ${issue.file}:${issue.line}`);
      console.log(`   Match: ${issue.match}`);
    });
    
    console.log('\n✅ Full report saved to: code-scan-report.json');
    
    // Exit with error if critical issues found
    if (report.bySeverity.error > 0) {
      console.log('\n❌ Critical errors found! Please fix them before proceeding.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error during scan:', error.message);
    process.exit(1);
  }
}

// Run the scan
main();
