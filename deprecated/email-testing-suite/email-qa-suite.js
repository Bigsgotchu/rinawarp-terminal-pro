/*
 * 🧜‍♀️ This file has been automatically modernized by RinaWarp Terminal
 * 2 deprecated pattern(s) replaced with modern alternatives
 * Please review and test the changes
 */

/**
 * RinaWarp Email Quality Assurance Suite
 * Comprehensive testing for email rendering, links, personalization, spam score, and deliverability
 */

const fs = require('node:fs');
const path = require('node:path');
const axios = require('axios');
const cheerio = require('cheerio');

class EmailQASuite {
  constructor() {
    this.testResults = {
      linkVerification: [],
      personalization: [],
      spamScore: {},
      responsiveDesign: [],
      attachmentSizes: [],
      summary: {},
    };

    this.emailTemplates = [
      '../POWER_USER_EMAIL_TEMPLATE.html',
      '../BETA_EMAIL_SIMPLE.html',
      '../POWER_USER_EMAIL_TEMPLATE_RESPONSIVE.html',
      '../BETA_EMAIL_SIMPLE_RESPONSIVE.html',
    ];

    this.targetClients = [
      'gmail-web',
      'gmail-mobile',
      'outlook-desktop',
      'outlook-web',
      'apple-mail-macos',
      'apple-mail-ios',
    ];
  }

  /**
   * 1. Link Verification Testing
   */
  async verifyLinks() {
    console.log('🔗 Starting Link Verification...');

    for (const templatePath of this.emailTemplates) {
      const templateName = path.basename(templatePath);
      console.log(`\n📧 Testing links in ${templateName}`);

      try {
        const htmlContent = fs.readFileSync(path.join(__dirname, templatePath), 'utf8');
        const $ = cheerio.load(htmlContent);
        const links = [];
        const utmParams = 'utm_source=newsletter&utm_medium=email&utm_campaign=email_campaign';

        // Extract all links
        $('a[href]').each((i, elem) => {
          const href = $(elem).attr('href');
          if (href && href.startsWith('http')) {
            links.push({
              url: `${href}?${utmParams}`,
              text: $(elem).text().trim(),
              element: $(elem).html(),
            });
          }
        });

        // Test each link
        for (const link of links) {
          await this.testLink(link, templateName);
        }
      } catch (error) {
        console.error(`❌ Error reading template ${templateName}:`, error.message);
      }
    }

    this.generateLinkReport();
  }

  async testLink(link, templateName) {
    try {
      console.log(`  Testing: ${link.url}`);

      const response = await axios.get(link.url, {
        timeout: 10000,
        validateStatus: status => status < 500,
        headers: {
          'User-Agent': 'RinaWarp-EmailQA-Suite/1.0',
        },
      });

      const result = {
        template: templateName,
        url: link.url,
        linkText: link.text,
        status: response.status,
        statusText: response.statusText,
        responseTime: response.headers['x-response-time'] || 'N/A',
        contentType: response.headers['content-type'] || 'N/A',
        success: response.status >= 200 && response.status < 300,
        redirect: response.request.res.responseUrl !== link.url,
        finalUrl: response.request.res.responseUrl,
        timestamp: new Date().toISOString(),
      };

      this.testResults.linkVerification.push(result);

      const status = result.success ? '✅' : '❌';
      console.log(`    ${status} ${result.status} - ${result.statusText}`);

      if (result.redirect) {
        console.log(`    🔄 Redirected to: ${result.finalUrl}`);
      }
    } catch (error) {
      const result = {
        template: templateName,
        url: link.url,
        linkText: link.text,
        error: error.message,
        success: false,
        timestamp: new Date().toISOString(),
      };

      this.testResults.linkVerification.push(result);
      console.log(`    ❌ Failed: ${error.message}`);
    }
  }

  /**
   * 2. Personalization Token Testing
   */
  async testPersonalization() {
    console.log('\n🎯 Starting Personalization Testing...');

    // Load personalization engine
    const PersonalizationEngine = require('../email-templates/beta-campaign/personalization-engine.js');
    const engine = new PersonalizationEngine.default();

    // Sample test data
    const sampleRecipients = [
      {
        user_id: 'test-001',
        firstName: 'Alice',
        name: 'Alice Johnson',
        companyName: 'TechCorp',
        company: 'TechCorp',
        audience_type: 'developer',
        customFields: {
          lastLoginDate: '2024-01-15',
          preferredLanguage: 'JavaScript',
        },
      },
      {
        user_id: 'test-002',
        firstName: 'Bob',
        name: 'Bob Smith',
        companyName: 'StartupInc',
        company: 'StartupInc',
        audience_type: 'enterprise_lead',
        customFields: {
          teamSize: '25',
          industry: 'FinTech',
        },
      },
      {
        user_id: 'test-003',
        firstName: '',
        name: '',
        companyName: '',
        company: '',
        audience_type: 'individual_user',
        customFields: {},
      },
    ];

    // Test templates
    const testTemplates = [
      'Hi {{firstName}}, welcome to {{companyName}}!',
      'Dear {{firstName}}, your {{audience_type}} account is ready.',
      'Hello {{firstName}}, join {{companyName}} team with code {{uniqueCode}}.',
      '{{firstName}} - {{companyName}} needs your {{audienceType}} expertise!',
    ];

    for (const recipient of sampleRecipients) {
      console.log(`\n👤 Testing recipient: ${recipient.firstName || 'Anonymous'}`);

      for (const template of testTemplates) {
        try {
          const result = engine.personalizeEmail(recipient, template);

          const testResult = {
            recipientId: recipient.user_id,
            originalTemplate: template,
            personalizedContent: result.content,
            subject: result.subject,
            discountCode: result.discountCode,
            audienceSegment: result.audienceSegment,
            abTestVariant: result.abTestVariant,
            tokensFound: result.personalizedElements.mergeTags,
            success: true,
            timestamp: new Date().toISOString(),
          };

          this.testResults.personalization.push(testResult);

          console.log(`  ✅ Template: "${template}"`);
          console.log(`     Result: "${result.content}"`);
          console.log(`     Discount: ${result.discountCode}`);
        } catch (error) {
          const testResult = {
            recipientId: recipient.user_id,
            originalTemplate: template,
            error: error.message,
            success: false,
            timestamp: new Date().toISOString(),
          };

          this.testResults.personalization.push(testResult);
          console.log(`  ❌ Template failed: ${error.message}`);
        }
      }
    }

    this.generatePersonalizationReport();
  }

  /**
   * 3. Spam Score and Deliverability Testing
   */
  async testSpamScore() {
    console.log('\n🛡️ Starting Spam Score Testing...');

    // Read email templates
    for (const templatePath of this.emailTemplates) {
      const templateName = path.basename(templatePath);
      console.log(`\n📧 Analyzing ${templateName} for spam indicators...`);

      try {
        const htmlContent = fs.readFileSync(path.join(__dirname, templatePath), 'utf8');
        const spamScore = await this.analyzeSpamScore(htmlContent, templateName);

        this.testResults.spamScore[templateName] = spamScore;
      } catch (error) {
        console.error(`❌ Error analyzing ${templateName}:`, error.message);
      }
    }

    this.generateSpamScoreReport();
  }

  async analyzeSpamScore(htmlContent, templateName) {
    const $ = cheerio.load(htmlContent);
    const analysis = {
      template: templateName,
      score: 0,
      issues: [],
      recommendations: [],
      timestamp: new Date().toISOString(),
    };

    // Check for spam indicators
    const indicators = [
      {
        test: () => $('a[href]').length > 10,
        points: 2,
        issue: 'Too many links (>10)',
        recommendation: 'Reduce number of links to improve deliverability',
      },
      {
        test: () => htmlContent.includes('FREE') || htmlContent.includes('URGENT'),
        points: 3,
        issue: 'Contains spam trigger words (FREE, URGENT)',
        recommendation: 'Avoid spam trigger words in subject and content',
      },
      {
        test: () => !htmlContent.includes('unsubscribe'),
        points: 5,
        issue: 'Missing unsubscribe link',
        recommendation: 'Add unsubscribe link for CAN-SPAM compliance',
      },
      {
        test: () => htmlContent.length > 100000,
        points: 2,
        issue: 'Email content too large',
        recommendation: 'Optimize email size for better deliverability',
      },
      {
        test: () => $('img[src]').length > 5,
        points: 1,
        issue: 'Many images may trigger spam filters',
        recommendation: 'Use fewer images or optimize image loading',
      },
      {
        test: () => !$('img[alt]').length && $('img').length > 0,
        points: 1,
        issue: 'Images missing alt text',
        recommendation: 'Add alt text to all images for accessibility',
      },
    ];

    indicators.forEach(indicator => {
      if (indicator.test()) {
        analysis.score += indicator.points;
        analysis.issues.push(indicator.issue);
        analysis.recommendations.push(indicator.recommendation);
      }
    });

    // Overall assessment
    if (analysis.score <= 2) {
      analysis.assessment = 'GOOD - Low spam risk';
    } else if (analysis.score <= 5) {
      analysis.assessment = 'MODERATE - Some spam risk';
    } else {
      analysis.assessment = 'HIGH - High spam risk';
    }

    console.log(`  📊 Spam Score: ${analysis.score}/10`);
    console.log(`  📋 Assessment: ${analysis.assessment}`);

    if (analysis.issues.length > 0) {
      console.log(`  ⚠️  Issues found:`);
      analysis.issues.forEach(issue => {
        console.log(`     - ${issue}`);
      });
    }

    return analysis;
  }

  /**
   * 4. Responsive Design Testing
   */
  async testResponsiveDesign() {
    console.log('\n📱 Starting Responsive Design Testing...');

    // Device specifications for testing
    const devices = [
      { name: 'iPhone SE', width: 375, height: 667, userAgent: 'iPhone' },
      { name: 'iPhone 14 Pro', width: 393, height: 852, userAgent: 'iPhone' },
      { name: 'iPad', width: 768, height: 1024, userAgent: 'iPad' },
      { name: 'Android Phone', width: 360, height: 640, userAgent: 'Android' },
      { name: 'Desktop', width: 1920, height: 1080, userAgent: 'Desktop' },
    ];

    for (const templatePath of this.emailTemplates) {
      const templateName = path.basename(templatePath);
      console.log(`\n📧 Testing responsive design for ${templateName}`);

      try {
        const htmlContent = fs.readFileSync(path.join(__dirname, templatePath), 'utf8');
        const $ = cheerio.load(htmlContent);

        // Analyze responsive design elements
        const responsiveAnalysis = {
          template: templateName,
          hasViewportMeta: $('meta[name="viewport"]').length > 0,
          hasMediaQueries: htmlContent.includes('@media'),
          hasFlexbox: htmlContent.includes('display: flex') || htmlContent.includes('display:flex'),
          hasPercentageWidths: htmlContent.includes('width:') && htmlContent.includes('%'),
          hasMaxWidth: htmlContent.includes('max-width'),
          tableBasedLayout: $('table').length > 0,
          inlineStyles: $('[style]').length,
          devices: [],
          timestamp: new Date().toISOString(),
        };

        // Simulate device testing
        devices.forEach(device => {
          const deviceTest = {
            device: device.name,
            width: device.width,
            height: device.height,
            issues: [],
            recommendations: [],
          };

          // Check for potential issues on each device
          if (device.width < 400 && !responsiveAnalysis.hasViewportMeta) {
            deviceTest.issues.push('Missing viewport meta tag');
            deviceTest.recommendations.push('Add viewport meta tag for mobile optimization');
          }

          if (device.width < 600 && !responsiveAnalysis.hasMediaQueries) {
            deviceTest.issues.push('No media queries detected');
            deviceTest.recommendations.push('Add media queries for mobile responsiveness');
          }

          if (responsiveAnalysis.inlineStyles > 20) {
            deviceTest.issues.push('Heavy use of inline styles');
            deviceTest.recommendations.push(
              'Consider using CSS classes for better maintainability'
            );
          }

          responsiveAnalysis.devices.push(deviceTest);
        });

        this.testResults.responsiveDesign.push(responsiveAnalysis);

        console.log(`  📱 Viewport Meta: ${responsiveAnalysis.hasViewportMeta ? '✅' : '❌'}`);
        console.log(`  🎨 Media Queries: ${responsiveAnalysis.hasMediaQueries ? '✅' : '❌'}`);
        console.log(`  📐 Flexible Layout: ${responsiveAnalysis.hasFlexbox ? '✅' : '❌'}`);
        console.log(
          `  📏 Percentage Widths: ${responsiveAnalysis.hasPercentageWidths ? '✅' : '❌'}`
        );
      } catch (error) {
        console.error(`❌ Error testing responsive design for ${templateName}:`, error.message);
      }
    }

    this.generateResponsiveDesignReport();
  }

  /**
   * 5. Attachment Size Verification
   */
  async verifyAttachmentSizes() {
    console.log('\n📎 Starting Attachment Size Verification...');

    // Check for attachment directories
    const attachmentPaths = [
      '../email-attachments',
      '../assets',
      '../email-campaign-materials/pdfs',
    ];

    for (const attachmentPath of attachmentPaths) {
      const fullPath = path.join(__dirname, attachmentPath);

      if (fs.existsSync(fullPath)) {
        console.log(`\n📁 Checking ${attachmentPath}...`);
        await this.checkAttachmentSizes(fullPath);
      }
    }

    this.generateAttachmentReport();
  }

  async checkAttachmentSizes(dirPath) {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const file of files) {
      if (file.isFile()) {
        const filePath = path.join(dirPath, file.name);
        const stats = fs.statSync(filePath);
        const sizeInMB = stats.size / (1024 * 1024);

        const attachmentInfo = {
          filename: file.name,
          path: filePath,
          sizeBytes: stats.size,
          sizeMB: sizeInMB,
          withinLimit: sizeInMB < 25,
          mimeType: this.getMimeType(file.name),
          timestamp: new Date().toISOString(),
        };

        this.testResults.attachmentSizes.push(attachmentInfo);

        const status = attachmentInfo.withinLimit ? '✅' : '❌';
        console.log(`  ${status} ${file.name}: ${sizeInMB.toFixed(2)}MB`);

        if (!attachmentInfo.withinLimit) {
          console.log(`    ⚠️  File exceeds 25MB limit!`);
        }
      }
    }
  }

  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.zip': 'application/zip',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Report Generation Methods
   */
  generateLinkReport() {
    console.log('\n📊 Link Verification Report');
    console.log('='.repeat(50));

    const totalLinks = this.testResults.linkVerification.length;
    const successfulLinks = this.testResults.linkVerification.filter(link => link.success).length;
    const failedLinks = totalLinks - successfulLinks;

    console.log(`Total Links Tested: ${totalLinks}`);
    console.log(
      `Successful: ${successfulLinks} (${((successfulLinks / totalLinks) * 100).toFixed(1)}%)`
    );
    console.log(`Failed: ${failedLinks} (${((failedLinks / totalLinks) * 100).toFixed(1)}%)`);

    if (failedLinks > 0) {
      console.log('\n❌ Failed Links:');
      this.testResults.linkVerification
        .filter(link => !link.success)
        .forEach(link => {
          console.log(`  - ${link.url} (${link.template})`);
          console.log(`    Error: ${link.error || link.statusText}`);
        });
    }
  }

  generatePersonalizationReport() {
    console.log('\n📊 Personalization Testing Report');
    console.log('='.repeat(50));

    const totalTests = this.testResults.personalization.length;
    const successfulTests = this.testResults.personalization.filter(test => test.success).length;
    const failedTests = totalTests - successfulTests;

    console.log(`Total Tests: ${totalTests}`);
    console.log(
      `Successful: ${successfulTests} (${((successfulTests / totalTests) * 100).toFixed(1)}%)`
    );
    console.log(`Failed: ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.personalization
        .filter(test => !test.success)
        .forEach(test => {
          console.log(`  - Recipient: ${test.recipientId}`);
          console.log(`    Template: "${test.originalTemplate}"`);
          console.log(`    Error: ${test.error}`);
        });
    }
  }

  generateSpamScoreReport() {
    console.log('\n📊 Spam Score Analysis Report');
    console.log('='.repeat(50));

    Object.values(this.testResults.spamScore).forEach(analysis => {
      console.log(`\n📧 ${analysis.template}`);
      console.log(`   Score: ${analysis.score}/10`);
      console.log(`   Assessment: ${analysis.assessment}`);

      if (analysis.recommendations.length > 0) {
        console.log(`   Recommendations:`);
        analysis.recommendations.forEach(rec => {
          console.log(`     - ${rec}`);
        });
      }
    });
  }

  generateResponsiveDesignReport() {
    console.log('\n📊 Responsive Design Report');
    console.log('='.repeat(50));

    this.testResults.responsiveDesign.forEach(analysis => {
      console.log(`\n📧 ${analysis.template}`);
      console.log(`   Viewport Meta: ${analysis.hasViewportMeta ? '✅' : '❌'}`);
      console.log(`   Media Queries: ${analysis.hasMediaQueries ? '✅' : '❌'}`);
      console.log(`   Flexible Layout: ${analysis.hasFlexbox ? '✅' : '❌'}`);
      console.log(`   Percentage Widths: ${analysis.hasPercentageWidths ? '✅' : '❌'}`);

      // Show device-specific issues
      const devicesWithIssues = analysis.devices.filter(device => device.issues.length > 0);
      if (devicesWithIssues.length > 0) {
        console.log(`   Device Issues:`);
        devicesWithIssues.forEach(device => {
          console.log(`     ${device.device}: ${device.issues.join(', ')}`);
        });
      }
    });
  }

  generateAttachmentReport() {
    console.log('\n📊 Attachment Size Report');
    console.log('='.repeat(50));

    const totalAttachments = this.testResults.attachmentSizes.length;
    const validAttachments = this.testResults.attachmentSizes.filter(att => att.withinLimit).length;
    const oversizedAttachments = totalAttachments - validAttachments;

    console.log(`Total Attachments: ${totalAttachments}`);
    console.log(`Within Limit: ${validAttachments}`);
    console.log(`Oversized: ${oversizedAttachments}`);

    if (oversizedAttachments > 0) {
      console.log('\n❌ Oversized Attachments:');
      this.testResults.attachmentSizes
        .filter(att => !att.withinLimit)
        .forEach(att => {
          console.log(`  - ${att.filename}: ${att.sizeMB.toFixed(2)}MB`);
        });
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateFinalReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🏆 COMPREHENSIVE EMAIL QA SUITE REPORT');
    console.log('='.repeat(60));

    // Summary statistics
    const linkSuccess = this.testResults.linkVerification.filter(l => l.success).length;
    const linkTotal = this.testResults.linkVerification.length;
    const personalizationSuccess = this.testResults.personalization.filter(p => p.success).length;
    const personalizationTotal = this.testResults.personalization.length;
    const attachmentSuccess = this.testResults.attachmentSizes.filter(a => a.withinLimit).length;
    const attachmentTotal = this.testResults.attachmentSizes.length;

    const summary = {
      linkVerification: {
        success: linkSuccess,
        total: linkTotal,
        percentage: linkTotal > 0 ? ((linkSuccess / linkTotal) * 100).toFixed(1) : 0,
      },
      personalization: {
        success: personalizationSuccess,
        total: personalizationTotal,
        percentage:
          personalizationTotal > 0
            ? ((personalizationSuccess / personalizationTotal) * 100).toFixed(1)
            : 0,
      },
      attachments: {
        success: attachmentSuccess,
        total: attachmentTotal,
        percentage:
          attachmentTotal > 0 ? ((attachmentSuccess / attachmentTotal) * 100).toFixed(1) : 0,
      },
    };

    console.log('\n📊 SUMMARY STATISTICS:');
    console.log(
      `🔗 Link Verification: ${summary.linkVerification.success}/${summary.linkVerification.total} (${summary.linkVerification.percentage}%)`
    );
    console.log(
      `🎯 Personalization: ${summary.personalization.success}/${summary.personalization.total} (${summary.personalization.percentage}%)`
    );
    console.log(
      `📎 Attachments: ${summary.attachments.success}/${summary.attachments.total} (${summary.attachments.percentage}%)`
    );

    // Spam score summary
    const spamScores = Object.values(this.testResults.spamScore);
    if (spamScores.length > 0) {
      const avgSpamScore =
        spamScores.reduce((sum, score) => sum + score.score, 0) / spamScores.length;
      console.log(`🛡️  Average Spam Score: ${avgSpamScore.toFixed(1)}/10`);
    }

    // Overall assessment
    const overallScore =
      ((summary.linkVerification.percentage / 100) * 0.3 +
        (summary.personalization.percentage / 100) * 0.3 +
        (summary.attachments.percentage / 100) * 0.2 +
        (spamScores.length > 0
          ? 1 - spamScores.reduce((sum, score) => sum + score.score, 0) / spamScores.length / 10
          : 0.8) *
          0.2) *
      100;

    console.log(`\n🏆 OVERALL QUALITY SCORE: ${overallScore.toFixed(1)}%`);

    if (overallScore >= 90) {
      console.log('✅ EXCELLENT - Ready for production deployment!');
    } else if (overallScore >= 80) {
      console.log('👍 GOOD - Minor improvements recommended');
    } else if (overallScore >= 70) {
      console.log('⚠️  FAIR - Several issues need attention');
    } else {
      console.log('❌ POOR - Significant improvements required');
    }

    // Save detailed report
    this.saveReportToFile();
  }

  /**
   * Save detailed report to file
   */
  saveReportToFile() {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        linkVerification: this.testResults.linkVerification.length,
        personalization: this.testResults.personalization.length,
        spamScore: Object.keys(this.testResults.spamScore).length,
        responsiveDesign: this.testResults.responsiveDesign.length,
        attachments: this.testResults.attachmentSizes.length,
      },
      results: this.testResults,
    };

    const reportPath = path.join(__dirname, 'email-qa-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting RinaWarp Email QA Suite...');
    console.log('='.repeat(60));

    try {
      await this.verifyLinks();
      await this.testPersonalization();
      await this.testSpamScore();
      await this.testResponsiveDesign();
      await this.verifyAttachmentSizes();

      this.generateFinalReport();
    } catch (error) {
      console.error('❌ Error running tests:', error.message);
      console.error(error.stack);
    }
  }
}

// Export for use in other modules
module.exports = EmailQASuite;

// Run tests if this file is executed directly
if (require.main === module) {
  const qaSuite = new EmailQASuite();
  qaSuite.runAllTests();
}
