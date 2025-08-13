#!/usr/bin/env node

/**
 * RinaWarp Terminal Error Fixing CLI
 * Comprehensive tool to diagnose and fix common issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

class RinaWarpFixCLI {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.fixes = [];
  }

  async run() {
    console.log('🔧 RinaWarp Terminal Fix CLI\n');

    const action = process.argv[2];

    switch (action) {
      case 'lint':
        await this.fixLintingIssues();
        break;
      case 'otto':
        await this.fixOTTOIssues();
        break;
      case 'dependencies':
        await this.fixDependencyIssues();
        break;
      case 'all':
        await this.fixAllIssues();
        break;
      case 'scan':
        await this.scanForIssues();
        break;
      default:
        this.showHelp();
    }

    this.rl.close();
  }

  async fixAllIssues() {
    console.log('🔍 Scanning and fixing all common issues...\n');

    await this.scanForIssues();
    await this.fixOTTOIssues();
    await this.fixLintingIssues();
    await this.fixDependencyIssues();

    console.log('\n🎉 All fixes completed! Run npm run lint to verify.');
  }

  async scanForIssues() {
    console.log('🔍 Scanning for common issues...\n');

    // Check OTTO pixel status
    console.log('📡 Checking OTTO pixel status...');
    try {
      const result = execSync('npm run otto:status', { encoding: 'utf8', cwd: PROJECT_ROOT });
      const pixelCount = (result.match(/✅.*OTTO pixel detected/g) || []).length;
      console.log(`   📊 Found ${pixelCount} pages with OTTO pixel installed`);
    } catch (error) {
      console.log('   ❌ Error checking OTTO status');
    }

    // Check for lint issues
    console.log('\n🔍 Checking for lint issues...');
    try {
      execSync('npx eslint . --ext .js,.ts,.cjs', {
        encoding: 'utf8',
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
      });
      console.log('   ✅ No lint errors found');
    } catch (error) {
      const errorCount = (error.stdout.match(/warning/g) || []).length;
      console.log(`   ⚠️  Found ${errorCount} lint warnings`);
    }

    // Check package.json for issues
    console.log('\n📦 Checking package.json...');
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8')
    );
    console.log(`   📊 ${Object.keys(packageJson.dependencies || {}).length} dependencies`);
    console.log(`   📊 ${Object.keys(packageJson.devDependencies || {}).length} dev dependencies`);

    // Check for missing files
    console.log('\n📁 Checking for essential files...');
    const essentialFiles = ['.env.example', 'README.md', 'package.json', 'server.js'];
    essentialFiles.forEach(file => {
      const exists = fs.existsSync(path.join(PROJECT_ROOT, file));
      console.log(`   ${exists ? '✅' : '❌'} ${file}`);
    });

    console.log('\n📋 Scan complete!');
  }

  async fixOTTOIssues() {
    console.log('🔧 Fixing OTTO pixel issues...\n');

    // Check which pages are missing OTTO pixels
    const missingPages = [];
    try {
      const result = execSync('npm run otto:status', { encoding: 'utf8', cwd: PROJECT_ROOT });
      const lines = result.split('\n');

      lines.forEach(line => {
        if (line.includes('❌') && line.includes('No OTTO pixel')) {
          const pageName = line.match(/❌\s+(.+?)\s+-\s+No OTTO pixel/);
          if (pageName) {
            missingPages.push(pageName[1]);
          }
        }
      });
    } catch (error) {
      console.log('   ❌ Error checking OTTO status');
      return;
    }

    if (missingPages.length > 0) {
      console.log(`📋 Found ${missingPages.length} pages missing OTTO pixels:`);
      missingPages.forEach(page => console.log(`   - ${page}`));

      const shouldFix = await this.askQuestion(
        '\nWould you like to add OTTO pixels to these pages? (y/N): '
      );

      if (shouldFix.toLowerCase() === 'y' || shouldFix.toLowerCase() === 'yes') {
        await this.addMissingOTTOPixels(missingPages);
      }
    } else {
      console.log('✅ All pages have OTTO pixels installed!');
    }
  }

  async addMissingOTTOPixels(missingPages) {
    console.log('\n📡 Adding OTTO pixels to missing pages...');

    const pixelId = '145-919'; // Use the existing pixel ID

    for (const pagePath of missingPages) {
      const fullPath = path.join(PROJECT_ROOT, 'public', pagePath);

      if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');

        if (content.includes('</head>')) {
          const ottoPixelCode = this.generateOTTOPixelCode(pixelId, pagePath);
          content = content.replace('</head>', `${ottoPixelCode}\n</head>`);

          fs.writeFileSync(fullPath, content);
          console.log(`   ✅ Added OTTO pixel to ${pagePath}`);
          this.fixes.push(`Added OTTO pixel to ${pagePath}`);
        }
      }
    }
  }

  generateOTTOPixelCode(pixelId, pagePath) {
    return `
    <!-- OTTO SEO Pixel -->
    <script type="text/javascript">
      (function(w, d, s, i) {
        w.OttoSeoObject = s; w[s] = w[s] || function() {
          (w[s].q = w[s].q || []).push(arguments);
        }; w[s].l = 1 * new Date();
        var a = d.createElement('script'),
        m = d.getElementsByTagName('script')[0];
        a.async = 1; a.src = 'https://pixel.otto-seo.com/pixel.js';
        m.parentNode.insertBefore(a, m);
      })(window, document, 'ottoseo', '${pixelId}');

      // Initialize OTTO pixel
      ottoseo('init', '${pixelId}');
      
      // Track page view
      ottoseo('track', 'PageView', {
        page_url: 'https://www.rinawarptech.com/${pagePath}',
        page_title: document.title || 'RinaWarp Terminal',
        site_name: 'RinaWarp Terminal',
        timestamp: new Date().toISOString()
      });
    </script>
    <!-- End OTTO SEO Pixel -->`;
  }

  async fixLintingIssues() {
    console.log('🔧 Fixing linting issues...\n');

    // Get lint issues
    let lintOutput;
    try {
      execSync('npx eslint . --ext .js,.ts,.cjs', {
        encoding: 'utf8',
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
      });
      console.log('✅ No lint issues found!');
      return;
    } catch (error) {
      lintOutput = error.stdout;
    }

    const issues = this.parseLintOutput(lintOutput);

    if (issues.length === 0) {
      console.log('✅ No fixable lint issues found!');
      return;
    }

    console.log(`📋 Found ${issues.length} lint issues:`);
    issues.slice(0, 10).forEach(issue => {
      console.log(`   ⚠️  ${issue.file}:${issue.line} - ${issue.message}`);
    });

    if (issues.length > 10) {
      console.log(`   ... and ${issues.length - 10} more issues`);
    }

    const shouldFix = await this.askQuestion('\nWould you like to auto-fix these issues? (y/N): ');

    if (shouldFix.toLowerCase() === 'y' || shouldFix.toLowerCase() === 'yes') {
      try {
        console.log('\n🔧 Running auto-fix...');
        execSync('npx eslint . --ext .js,.ts,.cjs --fix', { encoding: 'utf8', cwd: PROJECT_ROOT });
        execSync('npx prettier --write . --ignore-unknown', {
          encoding: 'utf8',
          cwd: PROJECT_ROOT,
        });
        console.log('✅ Auto-fix completed!');
        this.fixes.push('Fixed linting issues');
      } catch (error) {
        console.log('❌ Some issues could not be auto-fixed');
      }
    }
  }

  parseLintOutput(output) {
    const lines = output.split('\n');
    const issues = [];

    for (const line of lines) {
      const match = line.match(/^(.+?):(\d+):(\d+)\s+(\w+)\s+(.+)$/);
      if (match) {
        issues.push({
          file: match[1],
          line: match[2],
          column: match[3],
          type: match[4],
          message: match[5],
        });
      }
    }

    return issues;
  }

  async fixDependencyIssues() {
    console.log('🔧 Checking for dependency issues...\n');

    try {
      // Check for security vulnerabilities
      console.log('🔒 Checking for security vulnerabilities...');
      try {
        execSync('npm audit --audit-level=high', {
          encoding: 'utf8',
          cwd: PROJECT_ROOT,
          stdio: 'pipe',
        });
        console.log('✅ No high-severity vulnerabilities found');
      } catch (error) {
        console.log('⚠️  Found security vulnerabilities');
        const shouldFix = await this.askQuestion('Would you like to run npm audit fix? (y/N): ');

        if (shouldFix.toLowerCase() === 'y') {
          try {
            execSync('npm audit fix', { encoding: 'utf8', cwd: PROJECT_ROOT });
            console.log('✅ Security issues fixed');
            this.fixes.push('Fixed security vulnerabilities');
          } catch (error) {
            console.log('❌ Some vulnerabilities could not be fixed automatically');
          }
        }
      }

      // Check for outdated packages
      console.log('\n📦 Checking for outdated packages...');
      try {
        const outdated = execSync('npm outdated --json', {
          encoding: 'utf8',
          cwd: PROJECT_ROOT,
          stdio: 'pipe',
        });
        const packages = JSON.parse(outdated);
        const count = Object.keys(packages).length;

        if (count > 0) {
          console.log(`⚠️  Found ${count} outdated packages`);
          Object.keys(packages)
            .slice(0, 5)
            .forEach(pkg => {
              console.log(`   - ${pkg}: ${packages[pkg].current} → ${packages[pkg].latest}`);
            });
        } else {
          console.log('✅ All packages are up to date');
        }
      } catch (error) {
        console.log('✅ All packages appear to be up to date');
      }
    } catch (error) {
      console.log('❌ Error checking dependencies');
    }
  }

  askQuestion(question) {
    return new Promise(resolve => {
      this.rl.question(question, answer => {
        resolve(answer);
      });
    });
  }

  showHelp() {
    console.log(`
🔧 RinaWarp Terminal Fix CLI

Usage:
  node bin/fix-cli.js <command>

Commands:
  scan          Scan for all common issues
  otto          Fix OTTO pixel issues
  lint          Fix linting/code style issues
  dependencies  Fix dependency issues
  all           Fix all issues automatically

Examples:
  node bin/fix-cli.js scan
  node bin/fix-cli.js lint
  node bin/fix-cli.js all

This tool helps you:
  ✅ Fix OTTO pixel installation issues
  ✅ Resolve linting warnings and errors
  ✅ Update dependencies and fix security issues
  ✅ Identify and fix common configuration problems
    `);
  }
}

// Run the fix CLI
const fixer = new RinaWarpFixCLI();
fixer.run().catch(console.error);
