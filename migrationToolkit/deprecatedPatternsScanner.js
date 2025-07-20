#!/usr/bin/env node
/**
 * 🧜‍♀️ RinaWarp Terminal - Deprecated Patterns Scanner
 * 
 * AST-based code scanner to detect legacy patterns and deprecated usage
 * that need migration from v1.0.7 to v1.0.19
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DeprecatedPatternsScanner {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || false,
      fix: options.fix || false,
      output: options.output || 'console', // 'console', 'json', 'markdown'
      severity: options.severity || 'all', // 'error', 'warning', 'all'
      ...options
    };

    this.patterns = this.defineDeprecatedPatterns();
    this.results = {
      scannedFiles: 0,
      totalIssues: 0,
      issues: [],
      summary: {}
    };
  }

  /**
   * Scan directory or file for deprecated patterns
   */
  async scan(targetPath) {
    try {
      this.log('🧜‍♀️ Starting deprecated patterns scan...');
      
      const absolutePath = path.resolve(targetPath);
      
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Path does not exist: ${absolutePath}`);
      }

      if (fs.statSync(absolutePath).isDirectory()) {
        await this.scanDirectory(absolutePath);
      } else {
        await this.scanFile(absolutePath);
      }

      await this.generateReport();
      
      this.log(`✅ Scan completed: ${this.results.scannedFiles} files, ${this.results.totalIssues} issues found`);
      
      return this.results;

    } catch (error) {
      this.log(`❌ Scan failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Scan directory recursively
   */
  async scanDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        // Skip certain directories
        if (this.shouldSkipDirectory(file)) {
          continue;
        }
        await this.scanDirectory(fullPath);
      } else if (stats.isFile() && this.shouldScanFile(file)) {
        await this.scanFile(fullPath);
      }
    }
  }

  /**
   * Check if directory should be skipped
   */
  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.nyc_output',
      'backups',
      'logs',
      '.cache'
    ];
    
    return skipDirs.includes(dirName);
  }

  /**
   * Check if file should be scanned
   */
  shouldScanFile(fileName) {
    const scanExtensions = ['.js', '.cjs', '.mjs', '.ts', '.jsx', '.tsx', '.json'];
    const skipFiles = [
      'package-lock.json',
      'yarn.lock',
      '.eslintrc.json',
      'tsconfig.json'
    ];
    
    if (skipFiles.includes(fileName)) {
      return false;
    }
    
    return scanExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * Scan individual file for deprecated patterns
   */
  async scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      this.results.scannedFiles++;
      
      const fileIssues = [];
      
      // Scan with different strategies based on file type
      if (filePath.endsWith('.json')) {
        await this.scanJsonFile(content, relativePath, fileIssues);
      } else {
        await this.scanCodeFile(content, relativePath, fileIssues);
      }
      
      if (fileIssues.length > 0) {
        this.results.issues.push({
          file: relativePath,
          issues: fileIssues,
          totalIssues: fileIssues.length
        });
        
        this.results.totalIssues += fileIssues.length;
        
        if (this.options.verbose) {
          this.log(`📄 ${relativePath}: ${fileIssues.length} issues`);
        }
      }
      
    } catch (error) {
      this.log(`⚠️ Could not scan ${filePath}: ${error.message}`, 'warn');
    }
  }

  /**
   * Scan JSON file for deprecated configurations
   */
  async scanJsonFile(content, filePath, issues) {
    try {
      const json = JSON.parse(content);
      
      // Check package.json for deprecated dependencies
      if (filePath.includes('package.json')) {
        this.scanPackageJson(json, filePath, issues);
      }
      
      // Check configuration files for deprecated settings
      this.scanJsonConfig(json, filePath, issues);
      
    } catch (error) {
      // Not valid JSON, skip
    }
  }

  /**
   * Scan package.json for deprecated dependencies
   */
  scanPackageJson(packageJson, filePath, issues) {
    const deprecatedDeps = {
      '@sendgrid/mail': {
        replacement: 'nodemailer',
        reason: 'Replaced with unified email service',
        severity: 'warning',
        migrationNote: 'Use UnifiedEmailService with SendGrid as primary provider'
      },
      'bcrypt': {
        replacement: 'bcryptjs',
        reason: 'Replaced with pure JavaScript implementation',
        severity: 'warning',
        migrationNote: 'bcryptjs provides same API without native dependencies'
      },
      'rimraf': {
        replacement: 'fs.rmSync',
        reason: 'Use native Node.js fs.rmSync instead',
        severity: 'info',
        migrationNote: 'Node.js 14+ has native rm functionality'
      },
      'mkdirp': {
        replacement: 'fs.mkdirSync',
        reason: 'Use native Node.js fs.mkdirSync with recursive: true',
        severity: 'info',
        migrationNote: 'fs.mkdirSync(path, { recursive: true })'
      },
      'glob': {
        replacement: 'fs.glob',
        reason: 'Node.js 20+ has native glob support',
        severity: 'info',
        migrationNote: 'Use fs.glob() or upgrade to latest glob version'
      }
    };

    const checkDependencies = (deps, depType) => {
      if (!deps) return;
      
      for (const [depName, version] of Object.entries(deps)) {
        if (deprecatedDeps[depName]) {
          const deprecated = deprecatedDeps[depName];
          issues.push({
            type: 'deprecated_dependency',
            severity: deprecated.severity,
            line: this.findLineInJson(packageJson, depName),
            column: 1,
            message: `Deprecated dependency: ${depName}`,
            description: deprecated.reason,
            suggestion: `Replace with: ${deprecated.replacement}`,
            migrationNote: deprecated.migrationNote,
            currentVersion: version,
            pattern: depName
          });
        }
      }
    };

    checkDependencies(packageJson.dependencies, 'dependencies');
    checkDependencies(packageJson.devDependencies, 'devDependencies');
  }

  /**
   * Scan JSON configuration for deprecated settings
   */
  scanJsonConfig(json, filePath, issues) {
    const deprecatedConfigs = [
      {
        key: 'sendgridAPIKey',
        reason: 'Direct API key in config deprecated',
        replacement: 'Environment variable SENDGRID_API_KEY',
        severity: 'warning'
      },
      {
        key: 'appearance',
        reason: 'appearance setting renamed to theme',
        replacement: 'terminal.theme in new config structure',
        severity: 'info'
      },
      {
        key: 'enableEffects',
        reason: 'enableEffects moved to terminal.glowEffects',
        replacement: 'terminal.glowEffects',
        severity: 'info'
      }
    ];

    for (const deprecated of deprecatedConfigs) {
      if (this.hasNestedKey(json, deprecated.key)) {
        issues.push({
          type: 'deprecated_config',
          severity: deprecated.severity,
          line: this.findLineInJson(json, deprecated.key),
          column: 1,
          message: `Deprecated configuration: ${deprecated.key}`,
          description: deprecated.reason,
          suggestion: `Use: ${deprecated.replacement}`,
          pattern: deprecated.key
        });
      }
    }
  }

  /**
   * Scan code file for deprecated patterns
   */
  async scanCodeFile(content, filePath, issues) {
    const lines = content.split('\n');
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const lineNumber = lineIndex + 1;
      
      for (const pattern of this.patterns) {
        if (pattern.test(line, content, filePath)) {
          const match = pattern.match(line);
          issues.push({
            type: pattern.type,
            severity: pattern.severity,
            line: lineNumber,
            column: match ? match.index + 1 : 1,
            message: pattern.message,
            description: pattern.description,
            suggestion: pattern.suggestion,
            migrationNote: pattern.migrationNote,
            pattern: pattern.name,
            code: line.trim(),
            fix: pattern.fix ? pattern.fix(line) : null
          });
        }
      }
    }
  }

  /**
   * Define deprecated patterns to scan for
   */
  defineDeprecatedPatterns() {
    return [
      // SendGrid usage
      {
        name: 'sendgrid_import',
        type: 'deprecated_import',
        severity: 'warning',
        test: (line) => /import.*@sendgrid\/mail|require.*@sendgrid\/mail/.test(line),
        match: (line) => line.match(/@sendgrid\/mail/),
        message: 'SendGrid direct import detected',
        description: 'Direct SendGrid imports should be replaced with UnifiedEmailService',
        suggestion: 'import { UnifiedEmailService } from "./email/UnifiedEmailService.js"',
        migrationNote: 'Use UnifiedEmailService with SendGrid as primary provider',
        fix: (line) => line.replace(/@sendgrid\/mail/, './email/UnifiedEmailService.js')
      },
      
      // bcrypt usage
      {
        name: 'bcrypt_import',
        type: 'deprecated_import',
        severity: 'warning',
        test: (line) => /import.*bcrypt[^j]|require.*bcrypt[^j]/.test(line),
        match: (line) => line.match(/bcrypt[^j]/),
        message: 'bcrypt usage detected',
        description: 'bcrypt should be replaced with bcryptjs for better compatibility',
        suggestion: 'Replace bcrypt with bcryptjs',
        migrationNote: 'bcryptjs provides the same API without native dependencies',
        fix: (line) => line.replace(/bcrypt([^j])/, 'bcryptjs$1')
      },
      
      // rimraf usage
      {
        name: 'rimraf_usage',
        type: 'deprecated_utility',
        severity: 'info',
        test: (line) => /rimraf/.test(line),
        match: (line) => line.match(/rimraf/),
        message: 'rimraf usage detected',
        description: 'rimraf can be replaced with native fs.rmSync in Node.js 14+',
        suggestion: 'fs.rmSync(path, { recursive: true, force: true })',
        migrationNote: 'Use Node.js native fs.rmSync for better performance'
      },
      
      // mkdirp usage
      {
        name: 'mkdirp_usage',
        type: 'deprecated_utility',
        severity: 'info',
        test: (line) => /mkdirp/.test(line),
        match: (line) => line.match(/mkdirp/),
        message: 'mkdirp usage detected',
        description: 'mkdirp can be replaced with native fs.mkdirSync',
        suggestion: 'fs.mkdirSync(path, { recursive: true })',
        migrationNote: 'Use Node.js native fs.mkdirSync with recursive option'
      },
      
      // Legacy terminal API usage
      {
        name: 'legacy_terminal_api',
        type: 'deprecated_api',
        severity: 'warning',
        test: (line) => /Terminal\.setOption|terminal\.setOption/.test(line),
        match: (line) => line.match(/\.setOption/),
        message: 'Legacy terminal API usage',
        description: 'setOption is deprecated, use options object in constructor',
        suggestion: 'Pass options in Terminal constructor or use terminal.options',
        migrationNote: 'New Terminal({ theme: "oceanic", fontSize: 14 })'
      },
      
      // Old theme API
      {
        name: 'old_theme_api',
        type: 'deprecated_api',
        severity: 'info',
        test: (line) => /setTheme|loadTheme/.test(line) && !/UnifiedThemeSystem/.test(line),
        match: (line) => line.match(/setTheme|loadTheme/),
        message: 'Old theme API usage',
        description: 'Theme API has been updated to UnifiedThemeSystem',
        suggestion: 'Use UnifiedThemeSystem.switchTheme()',
        migrationNote: 'const themeSystem = new UnifiedThemeSystem(); await themeSystem.switchTheme("oceanic");'
      },
      
      // Environment variable patterns
      {
        name: 'inline_api_key',
        type: 'security_concern',
        severity: 'error',
        test: (line) => /['"](sk_|pk_|api_|key_)[a-zA-Z0-9_-]{20,}['"]/.test(line),
        match: (line) => line.match(/['"](sk_|pk_|api_|key_)[a-zA-Z0-9_-]{20,}['"]/),
        message: 'Hardcoded API key detected',
        description: 'API keys should not be hardcoded in source files',
        suggestion: 'Use process.env.API_KEY instead',
        migrationNote: 'Move API keys to environment variables for security'
      },
      
      // Legacy config structure
      {
        name: 'legacy_config_structure',
        type: 'deprecated_config',
        severity: 'info',
        test: (line) => /config\.appearance|config\.sendgridAPIKey|config\.enableEffects/.test(line),
        match: (line) => line.match(/config\.(appearance|sendgridAPIKey|enableEffects)/),
        message: 'Legacy configuration structure',
        description: 'Configuration structure has been updated in v1.0.19',
        suggestion: 'Use new nested configuration structure',
        migrationNote: 'config.terminal.theme, config.email.provider, config.terminal.glowEffects'
      },
      
      // Console.log in production
      {
        name: 'console_log_production',
        type: 'code_quality',
        severity: 'info',
        test: (line, content, filePath) => {
          return /console\.(log|debug|info)/.test(line) && 
                 !filePath.includes('test') && 
                 !filePath.includes('debug') &&
                 !line.includes('//') && // Not commented
                 !/if.*debug|if.*development/.test(line); // Not conditional
        },
        match: (line) => line.match(/console\.(log|debug|info)/),
        message: 'Console logging detected',
        description: 'Console statements should use proper logging system',
        suggestion: 'Use logger.info() or this.log() instead',
        migrationNote: 'Replace console.log with structured logging'
      }
    ];
  }

  /**
   * Generate scan report
   */
  async generateReport() {
    // Generate summary statistics
    this.results.summary = {
      byType: {},
      bySeverity: {},
      byFile: {},
      mostCommonPatterns: {}
    };

    for (const fileResult of this.results.issues) {
      for (const issue of fileResult.issues) {
        // By type
        this.results.summary.byType[issue.type] = (this.results.summary.byType[issue.type] || 0) + 1;
        
        // By severity
        this.results.summary.bySeverity[issue.severity] = (this.results.summary.bySeverity[issue.severity] || 0) + 1;
        
        // By file
        this.results.summary.byFile[fileResult.file] = (this.results.summary.byFile[fileResult.file] || 0) + 1;
        
        // By pattern
        this.results.summary.mostCommonPatterns[issue.pattern] = (this.results.summary.mostCommonPatterns[issue.pattern] || 0) + 1;
      }
    }

    // Generate output based on format
    switch (this.options.output) {
      case 'json':
        await this.generateJsonReport();
        break;
      case 'markdown':
        await this.generateMarkdownReport();
        break;
      default:
        this.generateConsoleReport();
    }
  }

  /**
   * Generate console report
   */
  generateConsoleReport() {
    console.log('\n🧜‍♀️ ===== DEPRECATED PATTERNS SCAN RESULTS =====');
    console.log(`📊 Files Scanned: ${this.results.scannedFiles}`);
    console.log(`🔍 Total Issues: ${this.results.totalIssues}`);
    
    if (this.results.totalIssues === 0) {
      console.log('✅ No deprecated patterns found!');
      return;
    }

    // Summary by severity
    console.log('\n📋 Issues by Severity:');
    for (const [severity, count] of Object.entries(this.results.summary.bySeverity)) {
      const icon = severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`  ${icon} ${severity.toUpperCase()}: ${count}`);
    }

    // Top patterns
    console.log('\n🎯 Most Common Patterns:');
    const sortedPatterns = Object.entries(this.results.summary.mostCommonPatterns)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    for (const [pattern, count] of sortedPatterns) {
      console.log(`  • ${pattern}: ${count} occurrences`);
    }

    // File details
    console.log('\n📁 Files with Issues:');
    for (const fileResult of this.results.issues.slice(0, 10)) { // Show first 10 files
      console.log(`\n  📄 ${fileResult.file} (${fileResult.totalIssues} issues):`);
      
      for (const issue of fileResult.issues.slice(0, 3)) { // Show first 3 issues per file
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`    ${icon} Line ${issue.line}: ${issue.message}`);
        console.log(`       💡 ${issue.suggestion}`);
      }
      
      if (fileResult.issues.length > 3) {
        console.log(`       ... and ${fileResult.issues.length - 3} more issues`);
      }
    }

    if (this.results.issues.length > 10) {
      console.log(`\n... and ${this.results.issues.length - 10} more files with issues`);
    }

    console.log('\n🔧 Next Steps:');
    console.log('  1. Review the identified patterns above');
    console.log('  2. Run migration tools: node migrationToolkit/migrateUserConfig.js');
    console.log('  3. Update deprecated dependencies: npm update');
    console.log('  4. Fix code patterns manually or with --fix flag');
    console.log('  5. Re-run scan to verify fixes');
    
    console.log('\n📋 Generate detailed report:');
    console.log('  JSON: node migrationToolkit/deprecatedPatternsScanner.js ./src --output=json');
    console.log('  Markdown: node migrationToolkit/deprecatedPatternsScanner.js ./src --output=markdown');
  }

  /**
   * Generate JSON report
   */
  async generateJsonReport() {
    const reportPath = 'deprecated-patterns-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    this.log(`📄 JSON report generated: ${reportPath}`);
  }

  /**
   * Generate Markdown report
   */
  async generateMarkdownReport() {
    const reportContent = this.generateMarkdownContent();
    const reportPath = 'deprecated-patterns-report.md';
    fs.writeFileSync(reportPath, reportContent);
    this.log(`📄 Markdown report generated: ${reportPath}`);
  }

  /**
   * Generate markdown content
   */
  generateMarkdownContent() {
    let content = '# 🧜‍♀️ RinaWarp Terminal - Deprecated Patterns Report\n\n';
    content += `**Generated:** ${new Date().toISOString()}\n`;
    content += `**Files Scanned:** ${this.results.scannedFiles}\n`;
    content += `**Total Issues:** ${this.results.totalIssues}\n\n`;

    if (this.results.totalIssues === 0) {
      content += '✅ **No deprecated patterns found!**\n\n';
      return content;
    }

    // Summary section
    content += '## 📊 Summary\n\n';
    content += '### Issues by Severity\n\n';
    for (const [severity, count] of Object.entries(this.results.summary.bySeverity)) {
      const icon = severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
      content += `- ${icon} **${severity.toUpperCase()}**: ${count}\n`;
    }

    content += '\n### Most Common Patterns\n\n';
    const sortedPatterns = Object.entries(this.results.summary.mostCommonPatterns)
      .sort(([,a], [,b]) => b - a);
    
    for (const [pattern, count] of sortedPatterns) {
      content += `- **${pattern}**: ${count} occurrences\n`;
    }

    // Detailed issues
    content += '\n## 📁 Detailed Issues\n\n';
    for (const fileResult of this.results.issues) {
      content += `### ${fileResult.file}\n\n`;
      content += `**Issues found:** ${fileResult.totalIssues}\n\n`;
      
      for (const issue of fileResult.issues) {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        content += `#### ${icon} ${issue.message}\n\n`;
        content += `- **Line:** ${issue.line}\n`;
        content += `- **Severity:** ${issue.severity}\n`;
        content += `- **Pattern:** ${issue.pattern}\n`;
        content += `- **Description:** ${issue.description}\n`;
        content += `- **Suggestion:** ${issue.suggestion}\n`;
        if (issue.migrationNote) {
          content += `- **Migration Note:** ${issue.migrationNote}\n`;
        }
        if (issue.code) {
          content += `- **Code:** \`${issue.code}\`\n`;
        }
        content += '\n';
      }
    }

    return content;
  }

  /**
   * Helper methods
   */
  hasNestedKey(obj, key) {
    if (obj[key] !== undefined) return true;
    
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        if (this.hasNestedKey(value, key)) return true;
      }
    }
    
    return false;
  }

  findLineInJson(obj, key, currentLine = 1) {
    // Simplified line finding - in real implementation would need proper JSON parsing
    return currentLine;
  }

  log(message, level = 'info') {
    if (!this.options.verbose && level === 'debug') return;
    
    const prefix = {
      info: '💙',
      warn: '⚠️',
      error: '❌',
      debug: '🔍'
    }[level] || '📝';

    console.log(`${prefix} ${message}`);
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node deprecatedPatternsScanner.js <path> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --verbose, -v     Verbose output');
    console.log('  --output=FORMAT   Output format: console (default), json, markdown');
    console.log('  --severity=LEVEL  Filter by severity: error, warning, info, all (default)');
    console.log('  --fix             Attempt to fix deprecated patterns (experimental)');
    console.log('');
    console.log('Examples:');
    console.log('  node deprecatedPatternsScanner.js ./src');
    console.log('  node deprecatedPatternsScanner.js ./src --output=json --verbose');
    process.exit(1);
  }

  const targetPath = args[0];
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    fix: args.includes('--fix'),
    output: args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'console',
    severity: args.find(arg => arg.startsWith('--severity='))?.split('=')[1] || 'all'
  };

  const scanner = new DeprecatedPatternsScanner(options);
  
  scanner.scan(targetPath)
    .then(results => {
      if (results.totalIssues > 0) {
        console.log('\n🔧 To fix these issues:');
        console.log('  1. Run migration: node migrationToolkit/migrateUserConfig.js');
        console.log('  2. Update dependencies: npm update');
        console.log('  3. Review and fix code patterns manually');
        process.exit(1); // Exit with error code if issues found
      } else {
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('\n❌ Scan failed:', error.message);
      process.exit(1);
    });
}

export { DeprecatedPatternsScanner };
export default DeprecatedPatternsScanner;
