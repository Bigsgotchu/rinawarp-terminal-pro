#!/usr/bin/env node

/**
 * OTTO SEO CLI - Interactive pixel installation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

class OTTOPixelCLI {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.pages = [];
    this.installations = 0;
  }

  async run() {
    console.log('🔧 OTTO SEO Pixel CLI Installation Tool\n');

    const action = process.argv[2];

    switch (action) {
      case 'install':
        await this.interactiveInstall();
        break;
      case 'demo':
        await this.installDemoPixel();
        break;
      case 'check':
        await this.checkInstallation();
        break;
      case 'remove':
        await this.removePixel();
        break;
      default:
        this.showHelp();
    }

    this.rl.close();
  }

  async interactiveInstall() {
    console.log('📡 OTTO SEO Pixel Interactive Installation\n');

    const pixelId = await this.askQuestion('Enter your OTTO Pixel ID (or press Enter for demo): ');

    if (!pixelId || pixelId.trim() === '') {
      console.log('\n🎮 Installing demo pixel for testing...\n');
      await this.installDemoPixel();
      return;
    }

    console.log(`\n🔧 Installing OTTO pixel: ${pixelId}\n`);
    await this.installPixel(pixelId);
  }

  async installDemoPixel() {
    console.log('🎮 Installing demo OTTO pixel for testing purposes...\n');

    // Use a demo pixel ID that will at least show the pixel code is installed
    const demoPixelId = 'otto_demo_rinawarp_' + Date.now();
    await this.installPixel(demoPixelId);

    console.log('\n📋 Demo Installation Complete!');
    console.log('🔍 This demo pixel will show the tracking code is installed.');
    console.log('⚠️  Replace with your real OTTO pixel ID when available.\n');
  }

  async installPixel(pixelId) {
    await this.scanPages();

    console.log('📡 Installing OTTO pixel...');

    for (const page of this.pages) {
      if (this.hasOTTOPixel(page.content)) {
        console.log(`   ⚠️  OTTO pixel already exists on ${page.relativePath}`);
        continue;
      }

      if (this.shouldSkipPage(page.relativePath)) {
        console.log(`   ⏭️  Skipping ${page.relativePath} (admin/test page)`);
        continue;
      }

      let content = page.content;
      const ottoPixelCode = this.generateOTTOPixelCode(pixelId, page);

      if (content.includes('</head>')) {
        content = content.replace('</head>', `${ottoPixelCode}\n</head>`);
        fs.writeFileSync(page.path, content);
        this.installations++;
        console.log(`   ✅ Installed OTTO pixel on ${page.relativePath}`);
      }
    }

    await this.createReport(pixelId);

    console.log(`\n🎉 Installation Complete!`);
    console.log(`📊 Installed on ${this.installations} pages`);
    console.log(`🔍 OTTO should now detect the pixel on your website\n`);
  }

  async scanPages() {
    console.log('🔍 Scanning pages...');

    const publicDir = path.join(PROJECT_ROOT, 'public');
    const htmlFiles = this.findHtmlFiles(publicDir);

    this.pages = htmlFiles.map(file => ({
      path: file,
      relativePath: path.relative(publicDir, file),
      url: this.getPageUrl(path.relative(publicDir, file)),
      content: fs.readFileSync(file, 'utf8'),
    }));

    console.log(`   Found ${this.pages.length} pages to process\n`);
  }

  findHtmlFiles(dir) {
    const files = [];

    if (!fs.existsSync(dir)) return files;

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.findHtmlFiles(fullPath));
      } else if (item.endsWith('.html')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  getPageUrl(relativePath) {
    const domain = 'https://www.rinawarptech.com';
    if (relativePath === 'index.html') return domain + '/';
    return domain + '/' + relativePath;
  }

  hasOTTOPixel(content) {
    return (
      content.includes('otto-seo') ||
      content.includes('ottoseo') ||
      content.includes('OTTO SEO Pixel') ||
      content.includes('pixel.otto-seo.com')
    );
  }

  shouldSkipPage(relativePath) {
    const skipPatterns = ['admin', 'test', 'debug', 'private'];
    return skipPatterns.some(pattern => relativePath.toLowerCase().includes(pattern.toLowerCase()));
  }

  generateOTTOPixelCode(pixelId, page) {
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
        page_url: '${page.url}',
        page_title: document.title || 'RinaWarp Terminal',
        site_name: 'RinaWarp Terminal',
        timestamp: new Date().toISOString()
      });
    </script>
    <!-- End OTTO SEO Pixel -->`;
  }

  async checkInstallation() {
    console.log('🔍 Checking OTTO pixel installation status...\n');

    await this.scanPages();

    let installedCount = 0;
    let notInstalledCount = 0;

    for (const page of this.pages) {
      const hasPixel = this.hasOTTOPixel(page.content);

      if (hasPixel) {
        console.log(`   ✅ ${page.relativePath} - OTTO pixel detected`);
        installedCount++;
      } else if (!this.shouldSkipPage(page.relativePath)) {
        console.log(`   ❌ ${page.relativePath} - No OTTO pixel`);
        notInstalledCount++;
      }
    }

    console.log(`\n📊 Installation Status:`);
    console.log(`   ✅ Pages with OTTO pixel: ${installedCount}`);
    console.log(`   ❌ Pages without OTTO pixel: ${notInstalledCount}`);

    if (installedCount > 0) {
      console.log(`\n🎉 OTTO pixel is installed! Check your OTTO dashboard for detection.\n`);
    } else {
      console.log(`\n⚠️  No OTTO pixel found. Run 'otto-cli install' to install it.\n`);
    }
  }

  async removePixel() {
    console.log('🗑️  Removing OTTO pixel from all pages...\n');

    const confirm = await this.askQuestion(
      'Are you sure you want to remove all OTTO pixels? (y/N): '
    );

    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('Removal cancelled.\n');
      return;
    }

    await this.scanPages();

    let removedCount = 0;

    for (const page of this.pages) {
      if (this.hasOTTOPixel(page.content)) {
        let content = page.content;

        // Remove OTTO pixel code blocks
        content = content.replace(
          /\s*<!-- OTTO SEO Pixel -->\s*[\s\S]*?<!-- End OTTO SEO Pixel -->\s*/g,
          ''
        );

        fs.writeFileSync(page.path, content);
        console.log(`   ✅ Removed OTTO pixel from ${page.relativePath}`);
        removedCount++;
      }
    }

    console.log(`\n🎉 Removal Complete! Removed from ${removedCount} pages.\n`);
  }

  async createReport(pixelId) {
    const report = {
      timestamp: new Date().toISOString(),
      pixelId: pixelId,
      domain: 'https://www.rinawarptech.com',
      pagesScanned: this.pages.length,
      pagesInstalled: this.installations,
      status: 'completed',
    };

    const reportPath = path.join(PROJECT_ROOT, 'otto-pixel-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
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
🔧 OTTO SEO Pixel CLI

Usage:
  node bin/otto-cli.js <command>

Commands:
  install    Interactive installation of OTTO pixel
  demo       Install demo pixel for testing
  check      Check current pixel installation status
  remove     Remove all OTTO pixels from pages
  
Examples:
  node bin/otto-cli.js install
  node bin/otto-cli.js demo
  node bin/otto-cli.js check

📋 The CLI will guide you through the installation process.
    `);
  }
}

// Run the CLI
const cli = new OTTOPixelCLI();
cli.run().catch(console.error);
