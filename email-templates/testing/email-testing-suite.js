/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 3 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const cheerio = require('cheerio');
const axios = require('axios');
const htmlValidator = require('html-validator');

class EmailTestingSuite {
  constructor() {
    this.templatePath = '../developer-focused-beta.html';
    this.results = {
      clientTests: [],
      linkValidation: [],
      htmlValidation: [],
      deviceTests: [],
      performanceMetrics: {},
      spamScore: {},
    };
  }

  async loadTemplate() {
    const templateContent = fs.readFileSync(path.join(__dirname, this.templatePath), 'utf8');
    return templateContent;
  }

  // Test 1: Cross-client compatibility testing
  async testEmailClients() {
    const clients = [
      { name: 'Gmail', viewport: { width: 600, height: 800 } },
      { name: 'Outlook', viewport: { width: 640, height: 800 } },
      { name: 'Apple Mail', viewport: { width: 600, height: 800 } },
      { name: 'Yahoo Mail', viewport: { width: 580, height: 800 } },
      { name: 'Thunderbird', viewport: { width: 650, height: 800 } },
    ];

    const browser = await puppeteer.launch({ headless: true });

    for (const client of clients) {
      try {
        const page = await browser.newPage();
        await page.setViewport(client.viewport);

        const template = await this.loadTemplate();
        await page.setContent(template);

        // Take screenshot for visual inspection
        const screenshotPath = `./screenshots/${client.name.toLowerCase()}-test.png`;
        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
        });

        // Check for common rendering issues
        const renderingIssues = await page.evaluate(() => {
          const issues = [];

          // Check for overflowing content
          const elements = document.querySelectorAll('*');
          elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width > window.innerWidth) {
              issues.push(`Element overflow: ${el.tagName} at ${rect.x}, ${rect.y}`);
            }
          });

          // Check for invisible text
          const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div');
          textElements.forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.fontSize === '0px' || style.visibility === 'hidden') {
              issues.push(
                `Invisible text: ${el.tagName} with content: ${el.textContent.slice(0, 50)}...`
              );
            }
          });

          return issues;
        });

        this.results.clientTests.push({
          client: client.name,
          status: renderingIssues.length === 0 ? 'PASS' : 'ISSUES',
          issues: renderingIssues,
          screenshot: screenshotPath,
        });

        await page.close();
        console.log(`✅ ${client.name} test completed`);
      } catch (error) {
        this.results.clientTests.push({
          client: client.name,
          status: 'ERROR',
          error: error.message,
        });
        console.log(`❌ ${client.name} test failed: ${error.message}`);
      }
    }

    await browser.close();
  }

  // Test 2: Link validation
  async validateLinks() {
    const template = await this.loadTemplate();
    const $ = cheerio.load(template);
    const links = [];

    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      links.push({ href, text, element: el.tagName });
    });

    for (const link of links) {
      try {
        // Skip mailto and tel links
        if (link.href.startsWith('mailto:') || link.href.startsWith('tel:')) {
          this.results.linkValidation.push({
            url: link.href,
            status: 'SKIPPED',
            type: 'special',
          });
          continue;
        }

        const response = await axios.head(link.href, {
          timeout: 5000,
          validateStatus: status => status < 500, // Accept redirects
        });

        this.results.linkValidation.push({
          url: link.href,
          text: link.text,
          status: response.status < 400 ? 'PASS' : 'FAIL',
          statusCode: response.status,
          redirected: response.request.res.responseUrl !== link.href,
        });

        console.log(`✅ ${link.href} - ${response.status}`);
      } catch (error) {
        this.results.linkValidation.push({
          url: link.href,
          text: link.text,
          status: 'ERROR',
          error: error.message,
        });
      }
    }
  }

  // Test 3: Device responsiveness
  async testDeviceResponsiveness() {
    const devices = [
      { name: 'Mobile Portrait', width: 320, height: 568 },
      { name: 'Mobile Landscape', width: 568, height: 320 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
      { name: 'Tablet Landscape', width: 1024, height: 768 },
      { name: 'Desktop', width: 1200, height: 800 },
      { name: 'Wide Desktop', width: 1920, height: 1080 },
    ];

    const browser = await puppeteer.launch({ headless: true });

    for (const device of devices) {
      try {
        const page = await browser.newPage();
        await page.setViewport({ width: device.width, height: device.height });

        const template = await this.loadTemplate();
        await page.setContent(template);

        // Check readability and usability
        const deviceIssues = await page.evaluate(deviceName => {
          const issues = [];

          // Check button accessibility
          const buttons = document.querySelectorAll('.cta-button');
          buttons.forEach(btn => {
            const rect = btn.getBoundingClientRect();
            if (rect.height < 44 || rect.width < 44) {
              issues.push(`Button too small on ${deviceName}: ${rect.width}x${rect.height}`);
            }
          });

          // Check text readability
          const textElements = document.querySelectorAll('p, li, span');
          textElements.forEach(el => {
            const style = window.getComputedStyle(el);
            const fontSize = parseInt(style.fontSize);
            if (fontSize < 14 && deviceName.includes('Mobile')) {
              issues.push(`Text too small on ${deviceName}: ${fontSize}px`);
            }
          });

          // Check horizontal scrolling
          const bodyWidth = document.body.scrollWidth;
          const viewportWidth = window.innerWidth;
          if (bodyWidth > viewportWidth) {
            issues.push(`Horizontal scroll on ${deviceName}: ${bodyWidth}px > ${viewportWidth}px`);
          }

          return issues;
        }, device.name);

        // Take screenshot
        const screenshotPath = `./screenshots/${device.name.toLowerCase().replace(/\s/g, '-')}-responsive.png`;
        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
        });

        this.results.deviceTests.push({
          device: device.name,
          dimensions: `${device.width}x${device.height}`,
          status: deviceIssues.length === 0 ? 'PASS' : 'ISSUES',
          issues: deviceIssues,
          screenshot: screenshotPath,
        });

        await page.close();
        console.log(`✅ ${device.name} test completed`);
      } catch (error) {
        this.results.deviceTests.push({
          device: device.name,
          status: 'ERROR',
          error: error.message,
        });
        console.log(`❌ ${device.name} test failed: ${error.message}`);
      }
    }

    await browser.close();
  }

  // Test 4: HTML validation
  async validateHTML() {
    const template = await this.loadTemplate();

    try {
      const result = await htmlValidator({
        data: template,
        format: 'json',
      });

      const errors = result.messages.filter(msg => msg.type === 'error');
      const warnings = result.messages.filter(msg => msg.type === 'warning');

      this.results.htmlValidation = {
        status: errors.length === 0 ? 'PASS' : 'FAIL',
        errors: errors,
        warnings: warnings,
        totalIssues: errors.length + warnings.length,
      };

        `✅ HTML validation completed: ${errors.length} errors, ${warnings.length} warnings`
      );
    } catch (error) {
      this.results.htmlValidation = {
        status: 'ERROR',
        error: error.message,
      };
      console.log(`❌ HTML validation failed: ${error.message}`);
    }
  }

  // Test 5: Performance metrics
  async analyzePerformance() {
    const template = await this.loadTemplate();
    const $ = cheerio.load(template);

    // Calculate file size
    const templateSize = Buffer.byteLength(template, 'utf8');

    // Count elements
    const elementCounts = {
      images: $('img').length,
      links: $('a').length,
      tables: $('table').length,
      inlineStyles: $('[style]').length,
      cssRules: (template.match(/[^}]*{[^}]*}/g) || []).length,
    };

    // Analyze images
    const images = [];
    $('img').each((i, el) => {
      const src = $(el).attr('src');
      const alt = $(el).attr('alt');
      const width = $(el).attr('width');
      const height = $(el).attr('height');

      images.push({
        src,
        alt: alt || 'MISSING ALT TEXT',
        dimensions: width && height ? `${width}x${height}` : 'NOT SPECIFIED',
        hasAlt: !!alt,
      });
    });

    // Calculate load time estimate (rough)
    const estimatedLoadTime = Math.round((templateSize / 1024) * 0.1); // Rough estimate

    this.results.performanceMetrics = {
      fileSize: {
        bytes: templateSize,
        kb: Math.round(templateSize / 1024),
        status: templateSize < 102400 ? 'GOOD' : 'LARGE', // 100KB threshold
      },
      elements: elementCounts,
      images: images,
      estimatedLoadTime: `${estimatedLoadTime}ms`,
      recommendations: [],
    };

    // Generate recommendations
    if (templateSize > 102400) {
      this.results.performanceMetrics.recommendations.push(
        'Consider optimizing HTML size (current: ' + Math.round(templateSize / 1024) + 'KB)'
      );
    }

    if (elementCounts.inlineStyles > 10) {
      this.results.performanceMetrics.recommendations.push('Consider consolidating inline styles');
    }

    if (images.some(img => !img.hasAlt)) {
      this.results.performanceMetrics.recommendations.push(
        'Add alt text to all images for accessibility'
      );
    }

    console.log(`✅ Performance analysis completed`);
  }

  // Test 6: Spam score analysis
  async analyzeSpamScore() {
    const template = await this.loadTemplate();
    const $ = cheerio.load(template);

    let spamScore = 0;
    const issues = [];

    // Check for spam triggers
    const spamWords = [
      'free',
      'urgent',
      'act now',
      'limited time',
      'guarantee',
      'no cost',
      'risk-free',
      'money back',
      'incredible deal',
    ];

    const text = $('body').text().toLowerCase();
    spamWords.forEach(word => {
      if (text.includes(word)) {
        spamScore += 1;
        issues.push(`Spam word detected: "${word}"`);
      }
    });

    // Check for excessive caps
    const capsText = text.match(/[A-Z]/g) || [];
    const totalText = text.replace(/\s/g, '').length;
    const capsPercentage = (capsText.length / totalText) * 100;

    if (capsPercentage > 20) {
      spamScore += 2;
      issues.push(`Excessive caps: ${capsPercentage.toFixed(1)}%`);
    }

    // Check for excessive exclamation marks
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 3) {
      spamScore += 1;
      issues.push(`Too many exclamation marks: ${exclamationCount}`);
    }

    // Check for missing unsubscribe link
    const unsubscribeLinks = $('a[href*="unsubscribe"]').length;
    if (unsubscribeLinks === 0) {
      spamScore += 3;
      issues.push('Missing unsubscribe link');
    }

    // Check for suspicious links
    const suspiciousLinks = [];
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (href.includes('bit.ly') || href.includes('tinyurl') || href.includes('t.co')) {
        suspiciousLinks.push(href);
      }
    });

    if (suspiciousLinks.length > 0) {
      spamScore += 2;
      issues.push(`URL shorteners detected: ${suspiciousLinks.join(', ')}`);
    }

    // Determine spam risk level
    let riskLevel = 'LOW';
    if (spamScore >= 5) riskLevel = 'HIGH';
    else if (spamScore >= 3) riskLevel = 'MEDIUM';

    this.results.spamScore = {
      score: spamScore,
      riskLevel: riskLevel,
      issues: issues,
      recommendations: [],
    };

    // Generate recommendations
    if (spamScore > 0) {
      this.results.spamScore.recommendations.push(
        'Review flagged issues to improve deliverability'
      );
    }

    if (riskLevel === 'HIGH') {
      this.results.spamScore.recommendations.push('Consider significant content revisions');
    }

  }

  // Generate A/B test variations
  async generateABTestVariations() {
    const template = await this.loadTemplate();
    const $ = cheerio.load(template);

    // Subject line variations
    const subjectVariations = [
      '🚀 Early Access: RinaWarp Terminal v1.0.9 Beta - AI-Powered Development',
      'Get Early Access to RinaWarp Terminal v1.0.9 Beta',
      'Your RinaWarp Terminal Beta Invitation is Here',
      'Join the RinaWarp Terminal Beta Program',
      'Exclusive: RinaWarp Terminal v1.0.9 Beta Access',
    ];

    // CTA button variations
    const ctaVariations = [
      '🎯 Download Beta Now',
      'Get Started with Beta',
      'Access Beta Version',
      'Download Now',
      'Try Beta Free',
    ];

    // Create variations
    const variations = [];

    subjectVariations.forEach((subject, subjectIndex) => {
      ctaVariations.forEach((cta, ctaIndex) => {
        const variation = $.load(template);

        // Update title
        variation('title').text(subject);

        // Update CTA buttons
        variation('.cta-button').each((i, el) => {
          variation(el).text(cta);
        });

        variations.push({
          id: `A${subjectIndex + 1}B${ctaIndex + 1}`,
          subject: subject,
          cta: cta,
          html: variation.html(),
        });
      });
    });

    // Save variations
    const variationsDir = './ab-test-variations';
    if (!fs.existsSync(variationsDir)) {
      fs.mkdirSync(variationsDir);
    }

    variations.forEach(variation => {
      fs.writeFileSync(path.join(variationsDir, `variation-${variation.id}.html`), variation.html);
    });

    console.log(`✅ Generated ${variations.length} A/B test variations`);

    return variations;
  }

  // Generate comprehensive report
  async generateReport() {
    console.log('📊 Generating comprehensive test report...');

    const report = {
      timestamp: new Date().toISOString(),
      template: this.templatePath,
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        issues: 0,
      },
      results: this.results,
    };

    // Calculate summary
    const allTests = [
      ...this.results.clientTests,
      ...this.results.deviceTests,
      { status: this.results.htmlValidation.status },
      { status: this.results.performanceMetrics.fileSize.status === 'GOOD' ? 'PASS' : 'ISSUES' },
    ];

    report.summary.totalTests = allTests.length;
    report.summary.passed = allTests.filter(t => t.status === 'PASS').length;
    report.summary.failed = allTests.filter(
      t => t.status === 'FAIL' || t.status === 'ERROR'
    ).length;
    report.summary.issues = allTests.filter(t => t.status === 'ISSUES').length;

    // Save report
    const reportPath = `./test-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`✅ Test report saved to ${reportPath}`);

    return report;
  }

  // Run all tests
  async runAllTests() {
    // Create output directories
    const dirs = ['./screenshots', './ab-test-variations'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
    });

    try {
      await this.testEmailClients();
      await this.validateLinks();
      await this.testDeviceResponsiveness();
      await this.validateHTML();
      await this.analyzePerformance();
      await this.analyzeSpamScore();
      await this.generateABTestVariations();

      const report = await this.generateReport();


      return report;
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      throw new Error(new Error(error));
    }
  }
}

module.exports = EmailTestingSuite;

// Run if called directly
if (require.main === module) {
  const suite = new EmailTestingSuite();
  suite.runAllTests().catch(console.error);
}
