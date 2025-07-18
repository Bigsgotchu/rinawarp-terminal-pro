#!/usr/bin/env node

/**
 * URL Audit Script for RinaWarp Terminal
 *
 * This script scans the codebase for URLs that may need updating after
 * repository migrations or domain changes.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const CONFIG = {
  // Patterns to check for outdated URLs
  patterns: [
    /bigsgotchu\/rinawarp-terminal/gi,
    /https?:\/\/api\.rinawarp\.com/gi,
    /https?:\/\/docs\.rinawarp\.com/gi,
    /https?:\/\/status\.rinawarp\.com/gi,
    /api-support@rinawarp\.com/gi,
    /github\.com\/Bigsgotchu/gi,
    /v1\.0\.8/gi, // Check for hardcoded old version
  ],

  // File patterns to scan
  filePatterns: [
    '**/*.md',
    '**/*.js',
    '**/*.ts',
    '**/*.json',
    '**/*.yml',
    '**/*.yaml',
    '**/*.html',
    '**/*.css',
    '**/*.txt',
    '**/*.cjs',
    '**/*.mjs',
  ],

  // Directories to ignore
  ignore: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.git/**',
    'coverage/**',
    '.cache/**',
    'logs/**',
    'tmp/**',
    'temp/**',
    '*.log',
    '*.min.*',
    'package-lock.json',
    'yarn.lock',
  ],

  // Correct URLs for reference
  correctUrls: {
    'bigsgotchu/rinawarp-terminal': 'Rinawarp-Terminal/rinawarp-terminal',
    'api.rinawarp.com': 'api.rinawarp-terminal.com',
    'docs.rinawarp.com': 'docs.rinawarp-terminal.com',
    'status.rinawarp.com': 'status.rinawarp-terminal.com',
    'api-support@rinawarp.com': 'api-support@rinawarp-terminal.com',
    'github.com/Bigsgotchu': 'github.com/Rinawarp-Terminal',
    'v1.0.8': 'v1.0.19',
  },
};

class URLAuditor {
  constructor() {
    this.issues = [];
    this.scannedFiles = 0;
    this.totalIssues = 0;
  }

  /**
   * Scan all files in the project for URL issues
   */
  async scanProject() {
    console.log('🔍 Starting URL Audit for RinaWarp Terminal...\n');

    try {
      // Get all files to scan
      const files = await this.getFilesToScan();

      console.log(`📁 Found ${files.length} files to scan\n`);

      // Scan each file
      for (const file of files) {
        await this.scanFile(file);
      }

      // Generate report
      this.generateReport();
    } catch (error) {
      console.error('❌ Error during URL audit:', error);
      process.exit(1);
    }
  }

  /**
   * Get list of files to scan
   */
  async getFilesToScan() {
    const files = [];

    for (const pattern of CONFIG.filePatterns) {
      const matches = glob.sync(pattern, {
        ignore: CONFIG.ignore,
        nodir: true,
        absolute: true,
      });

      files.push(...matches);
    }

    // Remove duplicates
    return [...new Set(files)];
  }

  /**
   * Scan a single file for URL issues
   */
  async scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);

      this.scannedFiles++;

      // Check each pattern
      for (const pattern of CONFIG.patterns) {
        const matches = content.match(pattern);

        if (matches) {
          // Get line numbers for each match
          const lines = content.split('\n');
          const fileIssues = [];

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineMatches = line.match(pattern);

            if (lineMatches) {
              for (const match of lineMatches) {
                fileIssues.push({
                  file: relativePath,
                  line: i + 1,
                  match: match,
                  lineContent: line.trim(),
                  suggestion: this.getSuggestion(match),
                });
              }
            }
          }

          this.issues.push(...fileIssues);
          this.totalIssues += fileIssues.length;
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not scan file: ${filePath} - ${error.message}`);
    }
  }

  /**
   * Get suggestion for fixing a URL
   */
  getSuggestion(match) {
    for (const [oldUrl, newUrl] of Object.entries(CONFIG.correctUrls)) {
      if (match.toLowerCase().includes(oldUrl.toLowerCase())) {
        return match.replace(new RegExp(oldUrl, 'gi'), newUrl);
      }
    }
    return 'Manual review required';
  }

  /**
   * Generate audit report
   */
  generateReport() {
    console.log('📊 URL Audit Report');
    console.log('==================\n');

    console.log(`📁 Files Scanned: ${this.scannedFiles}`);
    console.log(`🔍 Total Issues Found: ${this.totalIssues}\n`);

    if (this.totalIssues === 0) {
      console.log('✅ No URL issues found! All URLs appear to be up-to-date.\n');
      return;
    }

    // Group issues by file
    const issuesByFile = {};
    for (const issue of this.issues) {
      if (!issuesByFile[issue.file]) {
        issuesByFile[issue.file] = [];
      }
      issuesByFile[issue.file].push(issue);
    }

    // Display issues
    let fileCount = 0;
    for (const [file, issues] of Object.entries(issuesByFile)) {
      fileCount++;
      console.log(`📄 ${file} (${issues.length} issues)`);
      console.log('─'.repeat(50));

      for (const issue of issues) {
        console.log(`  Line ${issue.line}: ${issue.match}`);
        console.log(`    Context: ${issue.lineContent}`);
        console.log(`    Suggestion: ${issue.suggestion}`);
        console.log('');
      }
    }

    // Generate fix script
    this.generateFixScript();

    console.log('\n🎯 Summary:');
    console.log(`   Files with issues: ${fileCount}`);
    console.log(`   Total issues: ${this.totalIssues}`);
    console.log('\n💡 Next Steps:');
    console.log('   1. Review the issues above');
    console.log('   2. Run the generated fix script: npm run fix:urls');
    console.log('   3. Manually review any remaining issues');
    console.log('   4. Test the application after fixes');
  }

  /**
   * Generate a fix script for automated URL updates
   */
  generateFixScript() {
    const fixScript = `#!/usr/bin/env node

/**
 * Automated URL Fix Script
 * Generated by url-audit.js
 */

const fs = require('fs');
const path = require('path');

const fixes = [
  { from: /bigsgotchu\\/rinawarp-terminal/gi, to: 'Rinawarp-Terminal/rinawarp-terminal' },
  { from: /https?:\\/\\/api\\.rinawarp\\.com/gi, to: 'https://api.rinawarp-terminal.com' },
  { from: /https?:\\/\\/docs\\.rinawarp\\.com/gi, to: 'https://docs.rinawarp-terminal.com' },
  { from: /https?:\\/\\/status\\.rinawarp\\.com/gi, to: 'https://status.rinawarp-terminal.com' },
  { from: /api-support@rinawarp\\.com/gi, to: 'api-support@rinawarp-terminal.com' },
  { from: /github\\.com\\/Bigsgotchu/gi, to: 'github.com/Rinawarp-Terminal' },
  { from: /v1\\.0\\.8/gi, to: 'v1.0.19' }
];

const filesToFix = [
${this.issues
  .map(issue => `  '${issue.file}'`)
  .filter((v, i, a) => a.indexOf(v) === i)
  .join(',\n')}
];

console.log('🔧 Applying automated URL fixes...');

let fixedFiles = 0;
let totalFixes = 0;

for (const file of filesToFix) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let fileFixed = false;
    
    for (const fix of fixes) {
      const matches = content.match(fix.from);
      if (matches) {
        content = content.replace(fix.from, fix.to);
        totalFixes += matches.length;
        fileFixed = true;
      }
    }
    
    if (fileFixed) {
      fs.writeFileSync(file, content, 'utf8');
      fixedFiles++;
      console.log(\`✅ Fixed: \${file}\`);
    }
    
  } catch (error) {
    console.warn(\`⚠️ Could not fix file: \${file} - \${error.message}\`);
  }
}

console.log(\`\\n🎉 Fixed \${totalFixes} URLs in \${fixedFiles} files\`);
console.log('\\n⚠️ Please review the changes and test the application!');
`;

    const fixScriptPath = path.join(process.cwd(), 'scripts', 'fix-urls.js');
    fs.writeFileSync(fixScriptPath, fixScript);
    fs.chmodSync(fixScriptPath, '755');

    console.log(`\n💾 Generated fix script: ${path.relative(process.cwd(), fixScriptPath)}`);
  }
}

// Main execution
if (require.main === module) {
  const auditor = new URLAuditor();
  auditor.scanProject().catch(console.error);
}

module.exports = URLAuditor;
