#!/usr/bin/env node
/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

const fs = require('node:fs').promises;
const path = require('node:path');

// Load the report
async function loadReport() {
  try {
    const reportPath = path.join(process.cwd(), 'rinawarp-code-report.json');
    const content = await fs.readFile(reportPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Could not load report:', error.message);
    return null;
  }
}

// Fix functions for different issue types
const fixes = {
  // Replace == with ===
  typeCoercion: content => {
    return content.replace(/([^=!])={2}(?!=)/g, '$1===');
  },

  // Add .catch() to .then() chains
  missingAwait: content => {
    return content.replace(
      /\.then\s*\(([^)]*)\)(?!\s*\.catch)/g,
      '.then($1).catch(err => console.error("Promise error:", err))'
    );
  },

  // Wrap console.log in production check
  consoleLogs: content => {
    // Skip if already wrapped
    if (content.includes('process.env.NODE_ENV')) {
      return content;
    }

    return content.replace(
      /console\.(log|debug|info)\s*\(/g,
      'process.env.NODE_ENV !== "production" && console.$1('
    );
  },

  // Add try-catch to async functions
  asyncNoAwait: content => {
    // This is more complex, so we'll just add a comment for manual review
    return content.replace(
      /(async\s+function\s*\w*\s*\([^)]*\)\s*{)/g,
      '$1\n  // TODO: Review this async function - may need await or try-catch'
    );
  },

  // Fix unhandled SDK calls
  unhandledSDKCall: content => {
    return content.replace(
      /((?:sdk|rinawarp)\.\w+\s*\([^)]*\))(?!\s*\.(?:then|catch))/g,
      `$1.catch(err => {
        console.error('RinaWarp SDK Error:', err);
        // TODO: Add proper error handling
      })`
    );
  },

  // Remove extra commas
  extraCommas: content => {
    // Remove trailing commas before closing brackets
    content = content.replace(/,\s*([}\]])/g, '$1');
    // Remove double commas
    content = content.replace(/,\s*,/g, ',');
    return content;
  },
};

// Apply fixes to a file
async function fixFile(filePath, issues) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    const originalContent = content;
    let fixCount = 0;

    // Group issues by type for this file
    const issueTypes = new Set(issues.map(i => i.type));

    // Apply fixes for each issue type
    for (const issueType of issueTypes) {
      if (fixes[issueType]) {
        const beforeLength = content.length;
        content = fixes[issueType](content);
        if (content.length !== beforeLength) {
          fixCount++;
        }
      }
    }

    // Only write if changes were made
    if (content !== originalContent) {
      await fs.writeFile(filePath, content, 'utf8');
      console.log(`✅ Fixed ${fixCount} issue types in ${path.relative(process.cwd(), filePath)}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('🔧 RinaWarp Issue Fixer\n');

  const report = await loadReport();
  if (!report) {
    console.error('Please run rinawarp-code-check.cjs first to generate the report.');
    process.exit(1);
  }

  console.log(`Found ${report.totalIssues} issues in ${report.files} files\n`);

  // Group issues by file
  const issuesByFile = {};
  report.allIssues.forEach(issue => {
    if (!issuesByFile[issue.file]) {
      issuesByFile[issue.file] = [];
    }
    issuesByFile[issue.file].push(issue);
  });

  // Fix issues that we can auto-fix
  const autoFixableTypes = Object.keys(fixes);
  let filesFixed = 0;

  for (const [file, issues] of Object.entries(issuesByFile)) {
    const fixableIssues = issues.filter(i => autoFixableTypes.includes(i.type));
    if (fixableIssues.length > 0) {
      const fullPath = path.join(process.cwd(), file);
      if (await fixFile(fullPath, fixableIssues)) {
        filesFixed++;
      }
    }
  }

  console.log('\n📊 Summary:');
  console.log(`- Files fixed: ${filesFixed}`);
  console.log(`- Auto-fixable issue types: ${autoFixableTypes.join(', ')}`);

  // Show remaining manual fixes needed
  const manualFixTypes = new Set();
  report.allIssues.forEach(issue => {
    if (!autoFixableTypes.includes(issue.type)) {
      manualFixTypes.add(issue.type);
    }
  });

  if (manualFixTypes.size > 0) {
    console.log('\n⚠️  Manual fixes needed for:');
    manualFixTypes.forEach(type => {
      const count = report.issuesByType[type]?.length || 0;
      console.log(`- ${type}: ${count} occurrences`);
    });
  }

  console.log('\n💡 Next steps:');
  console.log('1. Review the changes made by this script');
  console.log('2. Run tests to ensure nothing broke');
  console.log('3. Manually fix remaining issues');
  console.log('4. Run rinawarp-code-check.cjs again to verify');
}

main().catch(console.error);
