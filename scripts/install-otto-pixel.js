#!/usr/bin/env node

/**
 * OTTO SEO Pixel Installation Script for RinaWarp Terminal
 * Installs OTTO tracking pixel across all website pages
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

class OTTOPixelInstaller {
  constructor() {
    this.config = {
      // Replace with your actual OTTO pixel ID
      ottoPixelId: process.env.OTTO_PIXEL_ID || 'YOUR_OTTO_PIXEL_ID',
      domain: 'https://www.rinawarptech.com',
      siteName: 'RinaWarp Terminal',
    };

    this.pages = [];
    this.installations = [];
  }

  /**
   * Main installation runner
   */
  async run() {
    console.log('🔧 OTTO SEO Pixel Installation Starting...\n');

    if (this.config.ottoPixelId === 'YOUR_OTTO_PIXEL_ID') {
      console.log('❌ Error: OTTO_PIXEL_ID environment variable not set');
      console.log('Please set your OTTO pixel ID:');
      console.log('export OTTO_PIXEL_ID=your_actual_pixel_id');
      return;
    }

    try {
      await this.scanPages();
      await this.installOTTOPixel();
      await this.createInstallationReport();

      console.log('\n✅ OTTO SEO Pixel Installation Complete!');
      console.log(`📊 Installed on ${this.installations.length} pages`);
      console.log('\n🔍 OTTO should now detect the pixel on your website');
    } catch (error) {
      console.error('❌ Installation Error:', error);
    }
  }

  /**
   * Scan all HTML pages for pixel installation
   */
  async scanPages() {
    console.log('🔍 Scanning pages for OTTO pixel installation...');

    const publicDir = path.join(PROJECT_ROOT, 'public');
    const htmlFiles = this.findHtmlFiles(publicDir);

    this.pages = htmlFiles.map(file => ({
      path: file,
      relativePath: path.relative(publicDir, file),
      url: this.getPageUrl(path.relative(publicDir, file)),
      content: fs.readFileSync(file, 'utf8'),
      hasOTTOPixel: this.hasOTTOPixel(fs.readFileSync(file, 'utf8')),
    }));

    const pagesWithPixel = this.pages.filter(p => p.hasOTTOPixel).length;
    const pagesWithoutPixel = this.pages.length - pagesWithPixel;

    console.log(`   Found ${this.pages.length} pages total`);
    console.log(`   ${pagesWithPixel} pages already have OTTO pixel`);
    console.log(`   ${pagesWithoutPixel} pages need OTTO pixel installation`);
  }

  /**
   * Find all HTML files recursively
   */
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

  /**
   * Get page URL from relative path
   */
  getPageUrl(relativePath) {
    if (relativePath === 'index.html') return this.config.domain + '/';
    return this.config.domain + '/' + relativePath;
  }

  /**
   * Check if page already has OTTO pixel
   */
  hasOTTOPixel(content) {
    return (
      content.includes('otto-seo') ||
      content.includes('otto.seo') ||
      content.includes('ottoseo') ||
      content.includes('data-otto-pixel')
    );
  }

  /**
   * Install OTTO pixel on all pages
   */
  async installOTTOPixel() {
    console.log('📡 Installing OTTO SEO pixel...');

    for (const page of this.pages) {
      if (page.hasOTTOPixel) {
        console.log(`   ⚠️  OTTO pixel already exists on ${page.relativePath}`);
        continue;
      }

      // Skip certain page types
      if (this.shouldSkipPage(page.relativePath)) {
        console.log(`   ⏭️  Skipping ${page.relativePath} (admin/test page)`);
        continue;
      }

      let content = page.content;
      const ottoPixelCode = this.generateOTTOPixelCode(page);

      // Install pixel before closing </head> tag
      if (content.includes('</head>')) {
        content = content.replace('</head>', `${ottoPixelCode}\n</head>`);

        fs.writeFileSync(page.path, content);
        this.installations.push({
          page: page.relativePath,
          url: page.url,
          status: 'installed',
        });

        console.log(`   ✅ Installed OTTO pixel on ${page.relativePath}`);
      } else {
        console.log(`   ❌ Could not install on ${page.relativePath} (no </head> tag found)`);
      }
    }
  }

  /**
   * Check if page should be skipped
   */
  shouldSkipPage(relativePath) {
    const skipPatterns = ['admin', 'test', 'debug', 'private'];

    return skipPatterns.some(pattern => relativePath.toLowerCase().includes(pattern.toLowerCase()));
  }

  /**
   * Generate OTTO pixel tracking code
   */
  generateOTTOPixelCode(page) {
    return `
    <!-- OTTO SEO Pixel -->
    <script type="text/javascript">
      !function(o,t,t,o){
        o.OttoSeoObject=t,o[t]=o[t]||function(){
          (o[t].q=o[t].q||[]).push(arguments)
        },o[t].l=1*new Date();
        var e=document.createElement("script"),
        n=document.getElementsByTagName("script")[0];
        e.async=1,
        e.src="https://pixel.otto-seo.com/pixel.js",
        n.parentNode.insertBefore(e,n)
      }(window,document,"ottoseo","script");
      
      // Initialize OTTO with your pixel ID
      ottoseo('init', '${this.config.ottoPixelId}');
      
      // Track page view
      ottoseo('track', 'PageView', {
        page_url: '${page.url}',
        page_title: document.title,
        site_name: '${this.config.siteName}',
        timestamp: new Date().toISOString()
      });
      
      // Track SEO modifications
      ottoseo('track', 'SEOPageLoad', {
        meta_title: document.querySelector('title') ? document.querySelector('title').textContent : '',
        meta_description: document.querySelector('meta[name="description"]') ? document.querySelector('meta[name="description"]').content : '',
        canonical_url: document.querySelector('link[rel="canonical"]') ? document.querySelector('link[rel="canonical"]').href : '',
        page_path: '${page.relativePath}'
      });
    </script>
    <!-- End OTTO SEO Pixel -->`;
  }

  /**
   * Create installation report
   */
  async createInstallationReport() {
    console.log('📊 Generating installation report...');

    const report = {
      timestamp: new Date().toISOString(),
      domain: this.config.domain,
      ottoPixelId: this.config.ottoPixelId,
      totalPages: this.pages.length,
      installationsCompleted: this.installations.length,
      pagesWithExistingPixel: this.pages.filter(p => p.hasOTTOPixel).length,
      installations: this.installations,
      status: 'completed',
      nextSteps: [
        'Visit OTTO SEO dashboard to verify pixel detection',
        'Enable page modification tracking',
        'Configure SEO monitoring alerts',
        'Set up automated reporting',
      ],
    };

    const reportPath = path.join(PROJECT_ROOT, 'otto-pixel-installation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📋 Installation Report saved to: ${reportPath}`);
  }
}

// Environment variable check and installation
if (process.argv.includes('--help')) {
  console.log(`
OTTO SEO Pixel Installer

Usage:
  node scripts/install-otto-pixel.js

Environment Variables:
  OTTO_PIXEL_ID - Your OTTO SEO pixel ID (required)

Examples:
  export OTTO_PIXEL_ID=your_pixel_id_here
  npm run otto:install
  `);
  process.exit(0);
}

// Run the installer
const installer = new OTTOPixelInstaller();
installer.run().catch(console.error);
