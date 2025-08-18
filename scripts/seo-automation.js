#!/usr/bin/env node

/**
 * RinaWarp Terminal - SEO Automation Script
 * Automates SEO optimizations and technical fixes
 * Alternative to OTTO SEO Automation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { _createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

class RinaWarpSEOAutomation {
  constructor() {
    this.config = {
      domain: 'https://www.rinawarptech.com',
      siteName: 'RinaWarp Terminal',
      description:
        'AI-powered terminal emulator with voice control, themes, and enterprise features',
      keywords: [
        'terminal emulator',
        'AI terminal',
        'command line interface',
        'developer tools',
        'voice control terminal',
        'RinaWarp',
      ],
      socialMedia: {
        twitter: '@rinawarp',
        github: 'https://github.com/Bigsgotchu/rinawarp-terminal',
        linkedin: 'https://linkedin.com/company/rinawarp',
      },
    };

    this.pages = [];
    this.optimizations = [];
  }

  /**
   * Main automation runner
   */
  async run() {
    console.log('🤖 RinaWarp SEO Automation Starting...\n');

    try {
      await this.scanPages();
      await this.optimizeMetaTags();
      await this.generateStructuredData();
      await this.updateSitemap();
      await this.optimizeImages();
      await this.generateRobotsAdvanced();
      await this.createSEOReport();

      console.log('\n✅ SEO Automation Complete!');
      console.log(`📊 Applied ${this.optimizations.length} optimizations`);
    } catch (error) {
      console.error('❌ SEO Automation Error:', error);
    }
  }

  /**
   * Scan all HTML pages in the project
   */
  async scanPages() {
    console.log('🔍 Scanning pages...');

    const publicDir = path.join(PROJECT_ROOT, 'public');
    const htmlFiles = this.findHtmlFiles(publicDir);

    this.pages = htmlFiles.map(file => ({
      path: file,
      relativePath: path.relative(publicDir, file),
      url: this.getPageUrl(path.relative(publicDir, file)),
      content: fs.readFileSync(file, 'utf8'),
      size: fs.statSync(file).size,
    }));

    console.log(`   Found ${this.pages.length} pages to optimize`);
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
   * Optimize meta tags for all pages
   */
  async optimizeMetaTags() {
    console.log('🏷️  Optimizing meta tags...');

    for (const page of this.pages) {
      let content = page.content;
      let optimized = false;

      // Add viewport meta if missing
      if (!content.includes('<meta name="viewport"')) {
        content = content.replace(
          '<head>',
          '<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">'
        );
        optimized = true;
      }

      // Add charset if missing
      if (!content.includes('charset=')) {
        content = content.replace('<head>', '<head>\n    <meta charset="UTF-8">');
        optimized = true;
      }

      // Add robots meta for important pages
      if (!content.includes('name="robots"')) {
        const robotsValue = this.getRobotsValue(page.relativePath);
        content = content.replace(
          '<head>',
          `<head>\n    <meta name="robots" content="${robotsValue}">`
        );
        optimized = true;
      }

      // Add canonical URL
      if (!content.includes('rel="canonical"')) {
        content = content.replace(
          '</head>',
          `    <link rel="canonical" href="${page.url}">\n</head>`
        );
        optimized = true;
      }

      // Improve meta description if generic
      const descMatch = content.match(/<meta name="description" content="([^"]+)"/);
      if (descMatch && descMatch[1].length < 120) {
        const newDesc = this.generateMetaDescription(page.relativePath);
        content = content.replace(descMatch[0], `<meta name="description" content="${newDesc}"`);
        optimized = true;
      }

      if (optimized) {
        fs.writeFileSync(page.path, content);
        this.optimizations.push(`Meta tags optimized for ${page.relativePath}`);
      }
    }
  }

  /**
   * Get robots meta value based on page type
   */
  getRobotsValue(relativePath) {
    const adminPages = ['admin', 'dashboard', 'test', 'debug'];
    const isAdminPage = adminPages.some(keyword => relativePath.toLowerCase().includes(keyword));

    if (isAdminPage) return 'noindex, nofollow';
    if (relativePath.includes('beta')) return 'index, follow, noarchive';
    return 'index, follow';
  }

  /**
   * Generate meta description based on page
   */
  generateMetaDescription(relativePath) {
    const descriptions = {
      'index.html':
        'RinaWarp Terminal - Advanced AI-powered terminal emulator with voice control, beautiful themes, and enterprise features for developers.',
      'docs.html':
        'Complete documentation for RinaWarp Terminal. Learn installation, features, API usage, and advanced configurations.',
      'pricing.html':
        'RinaWarp Terminal pricing plans. Choose from Personal, Professional, or Team plans with enterprise features and support.',
      'blog.html':
        'Latest news, tutorials, and insights about RinaWarp Terminal development and terminal productivity tips.',
      'beta.html':
        'Join RinaWarp Terminal beta testing program. Early access to new features and help shape the future of terminal development.',
      'downloads.html':
        'Download RinaWarp Terminal for Windows, macOS, and Linux. Get the latest stable releases and beta versions.',
    };

    return (
      descriptions[relativePath] ||
      'RinaWarp Terminal - The future of command line interfaces with AI assistance and professional developer tools.'
    );
  }

  /**
   * Generate JSON-LD structured data
   */
  async generateStructuredData() {
    console.log('📋 Generating structured data...');

    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'SoftwareApplication',
          name: 'RinaWarp Terminal',
          applicationCategory: 'DeveloperTools',
          operatingSystem: ['Windows', 'macOS', 'Linux'],
          description: this.config.description,
          url: this.config.domain,
          downloadUrl: `${this.config.domain}/downloads.html`,
          softwareVersion: '1.3.0',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
          author: {
            '@type': 'Organization',
            name: 'RinaWarp Technologies',
            url: this.config.domain,
          },
          programmingLanguage: ['JavaScript', 'Node.js'],
          screenshot: `${this.config.domain}/assets/screenshots/terminal-main.png`,
          featureList: [
            'AI-powered command assistance',
            'Voice control',
            'Custom themes',
            'Session management',
            'Cross-platform support',
          ],
        },
        {
          '@type': 'Organization',
          name: 'RinaWarp Technologies',
          url: this.config.domain,
          logo: `${this.config.domain}/assets/logo.svg`,
          sameAs: [this.config.socialMedia.github, this.config.socialMedia.linkedin],
        },
        {
          '@type': 'WebSite',
          name: this.config.siteName,
          url: this.config.domain,
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${this.config.domain}/search?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
          },
        },
      ],
    };

    // Add structured data to main pages
    const mainPages = ['index.html', 'docs.html', 'downloads.html'];

    for (const page of this.pages.filter(p => mainPages.includes(p.relativePath))) {
      let content = page.content;

      if (!content.includes('"@type": "SoftwareApplication"')) {
        const scriptTag = `
    <script type="application/ld+json">
${JSON.stringify(structuredData, null, 2)}
    </script>`;

        content = content.replace('</head>', `${scriptTag}\n</head>`);
        fs.writeFileSync(page.path, content);
        this.optimizations.push(`Structured data added to ${page.relativePath}`);
      }
    }
  }

  /**
   * Update sitemap with all discovered pages
   */
  async updateSitemap() {
    console.log('🗺️  Updating sitemap...');

    const sitemapPages = this.pages
      .filter(page => !this.shouldExcludeFromSitemap(page.relativePath))
      .map(page => ({
        url: page.url,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: this.getChangeFreq(page.relativePath),
        priority: this.getPriority(page.relativePath),
      }));

    const sitemap = this.generateSitemapXML(sitemapPages);

    fs.writeFileSync(path.join(PROJECT_ROOT, 'sitemap.xml'), sitemap);
    this.optimizations.push(`Sitemap updated with ${sitemapPages.length} pages`);
  }

  /**
   * Check if page should be excluded from sitemap
   */
  shouldExcludeFromSitemap(relativePath) {
    const excludePatterns = ['admin', 'test', 'debug', 'error', '404', 'private'];

    return excludePatterns.some(pattern =>
      relativePath.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Get change frequency for sitemap
   */
  getChangeFreq(relativePath) {
    if (relativePath === 'index.html') return 'weekly';
    if (relativePath.includes('blog')) return 'daily';
    if (relativePath.includes('docs')) return 'weekly';
    if (relativePath.includes('pricing')) return 'monthly';
    return 'monthly';
  }

  /**
   * Get priority for sitemap
   */
  getPriority(relativePath) {
    if (relativePath === 'index.html') return 1.0;
    if (relativePath.includes('downloads')) return 0.9;
    if (relativePath.includes('docs')) return 0.8;
    if (relativePath.includes('pricing')) return 0.8;
    if (relativePath.includes('blog')) return 0.7;
    return 0.6;
  }

  /**
   * Generate sitemap XML
   */
  generateSitemapXML(pages) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const page of pages) {
      xml += '  <url>\n';
      xml += `    <loc>${page.url}</loc>\n`;
      xml += `    <lastmod>${page.lastmod}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    }

    xml += '</urlset>\n';
    return xml;
  }

  /**
   * Optimize images for SEO
   */
  async optimizeImages() {
    console.log('🖼️  Optimizing images...');

    let imageOptimizations = 0;

    for (const page of this.pages) {
      let content = page.content;
      let optimized = false;

      // Find images without alt text
      const imgRegex = /<img([^>]*?)>/g;
      let match;

      while ((match = imgRegex.exec(content)) !== null) {
        const imgTag = match[0];
        const attributes = match[1];

        // Check if alt attribute is missing or empty
        if (!attributes.includes('alt=') || attributes.includes('alt=""')) {
          const srcMatch = attributes.match(/src="([^"]+)"/);
          if (srcMatch) {
            const src = srcMatch[1];
            const altText = this.generateAltText(src, page.relativePath);

            const newImgTag = imgTag.includes('alt=')
              ? imgTag.replace(/alt="[^"]*"/, `alt="${altText}"`)
              : imgTag.replace('<img', `<img alt="${altText}"`);

            content = content.replace(imgTag, newImgTag);
            optimized = true;
            imageOptimizations++;
          }
        }
      }

      if (optimized) {
        fs.writeFileSync(page.path, content);
      }
    }

    if (imageOptimizations > 0) {
      this.optimizations.push(`Optimized alt text for ${imageOptimizations} images`);
    }
  }

  /**
   * Generate alt text for images
   */
  generateAltText(src, pageContext) {
    const filename = path.basename(src, path.extname(src));

    // Smart alt text generation based on filename and context
    if (filename.includes('logo')) return 'RinaWarp Terminal Logo';
    if (filename.includes('screenshot')) return 'RinaWarp Terminal Screenshot';
    if (filename.includes('terminal')) return 'Terminal Interface Preview';
    if (filename.includes('icon')) return 'RinaWarp Icon';
    if (filename.includes('feature')) return 'RinaWarp Terminal Feature';
    if (filename.includes('demo')) return 'RinaWarp Terminal Demo';

    // Fallback based on page context
    if (pageContext.includes('docs')) return 'Documentation Illustration';
    if (pageContext.includes('pricing')) return 'Pricing Plan Feature';

    return 'RinaWarp Terminal Interface';
  }

  /**
   * Generate advanced robots.txt
   */
  async generateRobotsAdvanced() {
    console.log('🤖 Updating robots.txt...');

    const robotsContent = `User-agent: *
Allow: /

# Important pages
Allow: /index.html
Allow: /docs.html
Allow: /pricing.html
Allow: /downloads.html
Allow: /beta.html

# Disallow admin and test pages
Disallow: /admin/
Disallow: /test/
Disallow: /debug/
Disallow: /private/

# Disallow API endpoints
Disallow: /api/

# Disallow temporary files
Disallow: /*.tmp$
Disallow: /*.temp$
Disallow: /*.log$

# Allow CSS and JS
Allow: /*.css$
Allow: /*.js$

# Sitemap
Sitemap: ${this.config.domain}/sitemap.xml

# Crawl-delay for bots (respectful crawling)
Crawl-delay: 1
`;

    fs.writeFileSync(path.join(PROJECT_ROOT, 'robots.txt'), robotsContent);
    this.optimizations.push('Advanced robots.txt generated');
  }

  /**
   * Create SEO audit report
   */
  async createSEOReport() {
    console.log('📊 Generating SEO report...');

    const report = {
      timestamp: new Date().toISOString(),
      domain: this.config.domain,
      pagesAnalyzed: this.pages.length,
      optimizations: this.optimizations,
      recommendations: this.generateRecommendations(),
      technicalSEO: {
        sitemap: '✅ Generated',
        robots: '✅ Optimized',
        structuredData: '✅ Added',
        metaTags: '✅ Optimized',
        imageAlt: '✅ Optimized',
        canonicalUrls: '✅ Added',
      },
      nextSteps: [
        'Submit sitemap to Google Search Console',
        'Monitor crawl errors',
        'Create quality backlinks',
        'Regular content updates',
        'Performance monitoring',
      ],
    };

    const reportPath = path.join(PROJECT_ROOT, 'seo-automation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📋 SEO Report saved to: ${reportPath}`);
  }

  /**
   * Generate SEO recommendations
   */
  generateRecommendations() {
    return [
      {
        priority: 'High',
        item: 'Set up Google Search Console',
        description: 'Verify your domain and submit sitemap for indexing',
      },
      {
        priority: 'High',
        item: 'Create quality content',
        description: 'Add tutorials, guides, and documentation',
      },
      {
        priority: 'Medium',
        item: 'Build backlinks',
        description: 'Submit to developer directories and communities',
      },
      {
        priority: 'Medium',
        item: 'Social media presence',
        description: 'Active GitHub, Twitter, and LinkedIn profiles',
      },
      {
        priority: 'Low',
        item: 'Schema markup expansion',
        description: 'Add FAQ and HowTo structured data',
      },
    ];
  }
}

// Run the SEO automation
const seoBot = new RinaWarpSEOAutomation();
seoBot.run().catch(console.error);
