/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * Browser-based Link Tester using Puppeteer
 * Tests email links in actual browser environment for better accuracy
 */

const puppeteer = require('puppeteer');
const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');

class BrowserLinkTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];

    this.emailTemplates = ['../POWER_USER_EMAIL_TEMPLATE.html', '../BETA_EMAIL_SIMPLE.html'];

    this.devices = [
      { name: 'Desktop', viewport: { width: 1920, height: 1080 } },
      { name: 'iPhone 14 Pro', viewport: { width: 393, height: 852 } },
      { name: 'iPad', viewport: { width: 768, height: 1024 } },
    ];
  }

  async initialize() {
    console.log('🌐 Initializing browser for link testing...');

    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    this.page = await this.browser.newPage();

    // Set up request interception to catch network issues
    await this.page.setRequestInterception(true);

    this.page.on('request', req => {
      req.continue();
    });

    this.page.on('response', res => {
      if (res.status() >= 400) {
        console.log(`⚠️  HTTP ${res.status()}: ${res.url()}`);
      }
    });
  }

  async testAllLinks() {
    console.log('🔗 Starting Browser Link Testing...');

    for (const templatePath of this.emailTemplates) {
      const templateName = path.basename(templatePath);
      console.log(`\n📧 Testing ${templateName}...`);

      try {
        const htmlContent = fs.readFileSync(path.join(__dirname, templatePath), 'utf8');
        await this.testTemplateLinks(htmlContent, templateName);
      } catch (error) {
        console.error(`❌ Error testing ${templateName}:`, error.message);
      }
    }

    await this.generateReport();
  }

  async testTemplateLinks(htmlContent, templateName) {
    // Extract links from HTML
    const $ = cheerio.load(htmlContent);
    const links = [];

    $('a[href]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && href.startsWith('http')) {
        links.push({
          url: href,
          text: $(elem).text().trim(),
          id: $(elem).attr('id') || `link-${i}`,
          class: $(elem).attr('class') || '',
        });
      }
    });

    console.log(`  Found ${links.length} links to test`);

    // Test each link on different devices
    for (const device of this.devices) {
      console.log(`\n  📱 Testing on ${device.name}...`);

      await this.page.setViewport(device.viewport);

      for (const link of links) {
        await this.testLink(link, templateName, device.name);
      }
    }
  }

  async testLink(link, templateName, deviceName) {
    try {
      console.log(`    Testing: ${link.url}`);

      const startTime = Date.now();

      const response = await this.page.goto(link.url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      const endTime = Date.now();
      const loadTime = endTime - startTime;

      // Check for redirects
      const finalUrl = this.page.url();
      const isRedirect = finalUrl !== link.url;

      // Check if page loaded successfully
      const pageTitle = await this.page.title();
      const pageContent = await this.page.content();

      // Check for specific elements that indicate success
      const hasErrorPage =
        pageContent.includes('404') ||
        pageContent.includes('Page not found') ||
        pageContent.includes('Error');

      // Check for payment-related elements if it's a payment link
      const isPaymentLink =
        link.url.includes('stripe') ||
        link.url.includes('payment') ||
        link.url.includes('checkout');

      let paymentElements = {};
      if (isPaymentLink) {
        paymentElements = await this.checkPaymentElements();
      }

      // Check for download links
      const isDownloadLink = link.url.includes('download');
      let downloadInfo = {};
      if (isDownloadLink) {
        downloadInfo = await this.checkDownloadElements();
      }

      const result = {
        template: templateName,
        device: deviceName,
        link: {
          url: link.url,
          text: link.text,
          id: link.id,
          class: link.class,
        },
        response: {
          status: response.status(),
          statusText: response.statusText(),
          headers: response.headers(),
          loadTime: loadTime,
          finalUrl: finalUrl,
          isRedirect: isRedirect,
          pageTitle: pageTitle,
          hasErrorPage: hasErrorPage,
          success: response.ok() && !hasErrorPage,
        },
        paymentElements: paymentElements,
        downloadInfo: downloadInfo,
        timestamp: new Date().toISOString(),
      };

      this.results.push(result);

      const status = result.response.success ? '✅' : '❌';
      console.log(
        `      ${status} ${result.response.status} - ${result.response.statusText} (${loadTime}ms)`
      );

      if (isRedirect) {
        console.log(`      🔄 Redirected to: ${finalUrl}`);
      }

      if (isPaymentLink && paymentElements.hasStripeElements) {
        console.log(`      💳 Payment elements detected`);
      }

      if (isDownloadLink && downloadInfo.hasDownloadButton) {
        console.log(`      📥 Download button found`);
      }
    } catch (error) {
      const result = {
        template: templateName,
        device: deviceName,
        link: {
          url: link.url,
          text: link.text,
          id: link.id,
          class: link.class,
        },
        error: error.message,
        success: false,
        timestamp: new Date().toISOString(),
      };

      this.results.push(result);
      console.log(`      ❌ Failed: ${error.message}`);
    }
  }

  async checkPaymentElements() {
    try {
      const elements = await this.page.evaluate(() => {
        return {
          hasStripeElements:
            document.querySelector('[data-stripe]') !== null ||
            document.querySelector('.stripe-button') !== null ||
            document.querySelector('#stripe-payment-element') !== null,
          hasPaymentForm:
            document.querySelector('form[action*="payment"]') !== null ||
            document.querySelector('form[action*="checkout"]') !== null,
          hasSecureIndicators:
            document.querySelector('[data-secure]') !== null ||
            document.querySelector('.secure-payment') !== null,
          hasSSL: window.location.protocol === 'https:',
        };
      });

      return elements;
    } catch (error) {
      return { error: error.message };
    }
  }

  async checkDownloadElements() {
    try {
      const elements = await this.page.evaluate(() => {
        return {
          hasDownloadButton:
            document.querySelector('a[download]') !== null ||
            document.querySelector('button[data-download]') !== null ||
            document.querySelector('.download-btn') !== null,
          hasDownloadLinks: document.querySelectorAll('a[href*="download"]').length,
          hasFileLinks: document.querySelectorAll(
            'a[href$=".exe"], a[href$=".dmg"], a[href$=".zip"], a[href$=".deb"]'
          ).length,
        };
      });

      return elements;
    } catch (error) {
      return { error: error.message };
    }
  }

  async testResponsiveRendering() {
    console.log('\n📱 Testing Responsive Email Rendering...');

    for (const templatePath of this.emailTemplates) {
      const templateName = path.basename(templatePath);
      console.log(`\n📧 Testing responsive rendering for ${templateName}...`);

      try {
        const htmlContent = fs.readFileSync(path.join(__dirname, templatePath), 'utf8');

        // Create a temporary HTML file for testing
        const tempFile = path.join(__dirname, 'temp-email.html');
        fs.writeFileSync(tempFile, htmlContent);

        for (const device of this.devices) {
          console.log(`  📱 Testing on ${device.name}...`);

          await this.page.setViewport(device.viewport);
          await this.page.goto(`file://${tempFile}`, { waitUntil: 'networkidle2' });

          // Take screenshot
          const screenshotPath = path.join(
            __dirname,
            `screenshots/${templateName}-${device.name}.png`
          );
          await this.page.screenshot({ path: screenshotPath, fullPage: true });

          // Analyze layout
          const layoutInfo = await this.analyzeLayout(device.name);

          console.log(`    📊 Layout analysis complete`);
          console.log(`      - Elements visible: ${layoutInfo.visibleElements}`);
          console.log(`      - Layout width: ${layoutInfo.contentWidth}px`);
          console.log(`      - Overflow detected: ${layoutInfo.hasOverflow ? 'Yes' : 'No'}`);

          this.results.push({
            template: templateName,
            device: device.name,
            type: 'responsive-rendering',
            layoutInfo: layoutInfo,
            screenshotPath: screenshotPath,
            timestamp: new Date().toISOString(),
          });
        }

        // Clean up temp file
        fs.unlinkSync(tempFile);
      } catch (error) {
        console.error(`❌ Error testing responsive rendering for ${templateName}:`, error.message);
      }
    }
  }

  async analyzeLayout(deviceName) {
    try {
      const layoutInfo = await this.page.evaluate(() => {
        return {
          contentWidth: document.body.scrollWidth,
          contentHeight: document.body.scrollHeight,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          hasOverflow: document.body.scrollWidth > window.innerWidth,
          visibleElements: document.querySelectorAll('*').length,
          hasMediaQueries: Array.from(document.styleSheets).some(sheet => {
            try {
              return Array.from(sheet.cssRules).some(rule => rule.type === CSSRule.MEDIA_RULE);
            } catch (e) {
              return false;
            }
          }),
          buttonCount: document.querySelectorAll('button, a[role="button"], .btn').length,
          imageCount: document.querySelectorAll('img').length,
          tableCount: document.querySelectorAll('table').length,
        };
      });

      return layoutInfo;
    } catch (error) {
      return { error: error.message };
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Browser Test Report...');

    // Create screenshots directory if it doesn't exist
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }

    // Analyze results
    const linkResults = this.results.filter(r => r.link);
    const totalLinks = linkResults.length;
    const successfulLinks = linkResults.filter(r => r.response && r.response.success).length;
    const failedLinks = totalLinks - successfulLinks;

    console.log('\n='.repeat(60));
    console.log('🌐 BROWSER LINK TESTING REPORT');
    console.log('='.repeat(60));

    console.log(`\n📊 SUMMARY:`);
    console.log(`Total Links Tested: ${totalLinks}`);
    console.log(
      `Successful: ${successfulLinks} (${((successfulLinks / totalLinks) * 100).toFixed(1)}%)`
    );
    console.log(`Failed: ${failedLinks} (${((failedLinks / totalLinks) * 100).toFixed(1)}%)`);

    // Group results by template and device
    const resultsByTemplate = {};
    linkResults.forEach(result => {
      if (!resultsByTemplate[result.template]) {
        resultsByTemplate[result.template] = {};
      }
      if (!resultsByTemplate[result.template][result.device]) {
        resultsByTemplate[result.template][result.device] = [];
      }
      resultsByTemplate[result.template][result.device].push(result);
    });

    // Detailed breakdown
    console.log(`\n📋 DETAILED BREAKDOWN:`);
    Object.keys(resultsByTemplate).forEach(template => {
      console.log(`\n📧 ${template}:`);

      Object.keys(resultsByTemplate[template]).forEach(device => {
        const deviceResults = resultsByTemplate[template][device];
        const deviceSuccessful = deviceResults.filter(r => r.response && r.response.success).length;
        const deviceTotal = deviceResults.length;

        console.log(
          `  📱 ${device}: ${deviceSuccessful}/${deviceTotal} (${((deviceSuccessful / deviceTotal) * 100).toFixed(1)}%)`
        );

        // Show failed links
        const failedResults = deviceResults.filter(r => !r.response || !r.response.success);
        if (failedResults.length > 0) {
          console.log(`    ❌ Failed Links:`);
          failedResults.forEach(result => {
            console.log(`      - ${result.link.url}`);
            console.log(
              `        ${result.error || (result.response && result.response.statusText)}`
            );
          });
        }
      });
    });

    // Performance analysis
    const performanceResults = linkResults.filter(r => r.response && r.response.loadTime);
    if (performanceResults.length > 0) {
      const avgLoadTime =
        performanceResults.reduce((sum, r) => sum + r.response.loadTime, 0) /
        performanceResults.length;
      const slowLinks = performanceResults.filter(r => r.response.loadTime > 5000);

      console.log(`\n⚡ PERFORMANCE ANALYSIS:`);
      console.log(`Average Load Time: ${avgLoadTime.toFixed(0)}ms`);
      console.log(`Slow Links (>5s): ${slowLinks.length}`);

      if (slowLinks.length > 0) {
        console.log(`  🐌 Slow Links:`);
        slowLinks.forEach(result => {
          console.log(`    - ${result.link.url}: ${result.response.loadTime}ms`);
        });
      }
    }

    // Save detailed report
    const reportPath = path.join(__dirname, 'browser-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    console.log(`📸 Screenshots saved to: ${screenshotsDir}`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.initialize();
      await this.testAllLinks();
      await this.testResponsiveRendering();
    } catch (error) {
      console.error('❌ Error running browser tests:', error.message);
      console.error(error.stack);
    } finally {
      await this.cleanup();
    }
  }
}

// Run if executed directly
if (require.main === module) {
  const tester = new BrowserLinkTester();
  tester.run();
}

module.exports = BrowserLinkTester;
