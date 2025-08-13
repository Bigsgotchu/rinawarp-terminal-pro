#!/usr/bin/env node

/**
 * OTTO SEO Pixel Updater - Updates existing pixel IDs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

class OTTOPixelUpdater {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.pages = [];
    this.updates = 0;
  }

  async run() {
    console.log('🔄 OTTO SEO Pixel Updater\n');

    const action = process.argv[2];

    if (action === 'help' || action === '--help') {
      this.showHelp();
      this.rl.close();
      return;
    }

    await this.updatePixelIds();
    this.rl.close();
  }

  async updatePixelIds() {
    console.log('📡 OTTO SEO Pixel ID Update\n');

    const newPixelId = await this.askQuestion('Enter your new OTTO Pixel ID: ');

    if (!newPixelId || newPixelId.trim() === '') {
      console.log('❌ No pixel ID provided. Exiting.\n');
      return;
    }

    console.log(`\n🔄 Updating OTTO pixel ID to: ${newPixelId}\n`);
    await this.updateAllPixels(newPixelId.trim());
  }

  async updateAllPixels(newPixelId) {
    await this.scanPages();

    console.log('🔄 Updating OTTO pixel IDs...');

    for (const page of this.pages) {
      if (!this.hasOTTOPixel(page.content)) {
        continue;
      }

      if (this.shouldSkipPage(page.relativePath)) {
        console.log(`   ⏭️  Skipping ${page.relativePath} (admin/test page)`);
        continue;
      }

      let content = page.content;
      const originalContent = content;

      // Update ottoseo('init', 'OLD_ID') to ottoseo('init', 'NEW_ID')
      content = content.replace(
        /ottoseo\('init',\s*['"](.*?)['"]\)/g,
        `ottoseo('init', '${newPixelId}')`
      );

      // Update the pixel ID in the initialization script
      content = content.replace(
        /\}\)\(window,\s*document,\s*['"](.*?)['"]\s*,\s*['"](.*?)['"]\);/g,
        `})(window, document, 'ottoseo', '${newPixelId}');`
      );

      // Also update any demo pixel IDs
      content = content.replace(/otto_demo_rinawarp_\d+/g, newPixelId);

      if (content !== originalContent) {
        fs.writeFileSync(page.path, content);
        this.updates++;
        console.log(`   ✅ Updated OTTO pixel ID in ${page.relativePath}`);
      } else {
        console.log(`   ⚠️  No changes needed in ${page.relativePath}`);
      }
    }

    await this.createReport(newPixelId);

    console.log(`\n🎉 Update Complete!`);
    console.log(`📊 Updated ${this.updates} pages with new pixel ID`);
    console.log(`🔍 OTTO should now detect your pixel: ${newPixelId}\n`);
    console.log(`📋 Next steps:`);
    console.log(`   1. Check your OTTO dashboard for pixel detection`);
    console.log(`   2. Verify "OTTO is engaged" status`);
    console.log(`   3. Enable page modification tracking\n`);
  }

  async scanPages() {
    console.log('🔍 Scanning pages for OTTO pixels...');

    const publicDir = path.join(PROJECT_ROOT, 'public');
    const htmlFiles = this.findHtmlFiles(publicDir);

    this.pages = htmlFiles.map(file => ({
      path: file,
      relativePath: path.relative(publicDir, file),
      url: this.getPageUrl(path.relative(publicDir, file)),
      content: fs.readFileSync(file, 'utf8'),
    }));

    const pagesWithPixel = this.pages.filter(p => this.hasOTTOPixel(p.content)).length;

    console.log(`   Found ${this.pages.length} pages total`);
    console.log(`   ${pagesWithPixel} pages have OTTO pixels to update\n`);
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
      content.includes('OTTO SEO Pixel') ||
      content.includes('ottoseo') ||
      content.includes('pixel.otto-seo.com')
    );
  }

  shouldSkipPage(relativePath) {
    const skipPatterns = ['admin', 'test', 'debug', 'private'];
    return skipPatterns.some(pattern => relativePath.toLowerCase().includes(pattern.toLowerCase()));
  }

  async createReport(pixelId) {
    const report = {
      timestamp: new Date().toISOString(),
      action: 'update_pixel_id',
      newPixelId: pixelId,
      domain: 'https://www.rinawarptech.com',
      pagesScanned: this.pages.length,
      pagesUpdated: this.updates,
      status: 'completed',
    };

    const reportPath = path.join(PROJECT_ROOT, 'otto-pixel-update-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📋 Update report saved to: otto-pixel-update-report.json`);
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
🔄 OTTO SEO Pixel ID Updater

Usage:
  node bin/otto-update.js

This tool updates existing OTTO pixel IDs on all pages.

What it does:
  ✅ Scans all HTML pages for existing OTTO pixels
  ✅ Updates the pixel ID to your new ID
  ✅ Preserves all existing pixel functionality
  ✅ Generates a detailed update report

Perfect for:
  • Switching from demo to real pixel ID
  • Updating to a new OTTO account
  • Changing pixel IDs after account changes
    `);
  }
}

// Run the updater
const updater = new OTTOPixelUpdater();
updater.run().catch(console.error);
