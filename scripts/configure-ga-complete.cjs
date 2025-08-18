#!/usr/bin/env node

/**
 * Complete Google Analytics Configuration
 * Sets up GA4 tracking across all RinaWarp components
 */

const fs = require('fs');
const _path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

class GAConfigurator {
  constructor() {
    this.trackingId = null;
    this.updatedFiles = [];
    this.errors = [];
  }

  async configure() {
    console.log('🌊 RinaWarp Terminal - Complete Google Analytics Setup');
    console.log('====================================================');
    console.log('');

    // Get tracking ID from user
    await this.getTrackingId();

    if (!this.trackingId) {
      console.log('❌ Setup cancelled');
      rl.close();
      return;
    }

    console.log('');
    console.log('🔧 Configuring Google Analytics across all components...');
    console.log('');

    // Update all components
    await this.updateMarketingWebsite();
    await this.updateDesktopApp();
    await this.updateBackendServer();
    await this.updateEnvironmentFiles();
    await this.updateAnalyticsScripts();

    // Deploy to live server
    await this.deployToLiveServer();

    this.showSummary();
    rl.close();
  }

  async getTrackingId() {
    const hasGA = await ask('Do you have a Google Analytics 4 property? (y/n): ');

    if (hasGA.toLowerCase() === 'y') {
      this.trackingId = await ask('Enter your GA4 Measurement ID (G-XXXXXXXXXX): ');

      if (!/^G-[A-Z0-9]{10}$/.test(this.trackingId)) {
        console.log('❌ Invalid format. Should be like G-ABC1234567');
        return;
      }
    } else {
      console.log('');
      console.log('📋 Create your GA4 property:');
      console.log('1. Go to https://analytics.google.com/');
      console.log('2. Admin → Create Property → "RinaWarp Terminal"');
      console.log('3. Add data stream for rinawarptech.com');
      console.log('4. Copy the Measurement ID');
      console.log('');

      const proceed = await ask('Continue with placeholder? (y/n): ');
      if (proceed.toLowerCase() === 'y') {
        this.trackingId = 'G-PLACEHOLDER';
      }
    }
  }

  async updateFile(filePath, updates, description) {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        return false;
      }

      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      for (const update of updates) {
        if (update.search && update.replace) {
          const regex = new RegExp(update.search, 'g');
          if (content.match(regex)) {
            content = content.replace(regex, update.replace);
            modified = true;
          }
        } else if (update.add && !content.includes(update.check || update.add)) {
          content =
            update.position === 'head'
              ? content.replace('</head>', `${update.add}\n</head>`)
              : content + update.add;
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Updated ${filePath} ${description}`);
        this.updatedFiles.push(filePath);
        return true;
      } else {
        console.log(`ℹ️  No changes needed in ${filePath}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Error updating ${filePath}: ${error.message}`);
      this.errors.push(`${filePath}: ${error.message}`);
      return false;
    }
  }

  async updateMarketingWebsite() {
    console.log('📄 Updating marketing website...');

    const gaScript = `
<!-- Google Analytics 4 - RinaWarp Terminal -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${this.trackingId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${this.trackingId}', {
    send_page_view: true,
    anonymize_ip: true,
    allow_display_features: false,
    cookie_flags: 'SameSite=Strict;Secure'
  });

  // Track key events
  function trackEvent(action, category = 'engagement', label = '') {
    gtag('event', action, {
      event_category: category,
      event_label: label,
      send_to: '${this.trackingId}'
    });
  }

  // Expose for use in other scripts
  window.trackEvent = trackEvent;
</script>`;

    // Update public marketing site
    await this.updateFile(
      './public/index.html',
      [
        {
          search: 'window\\.GA_TRACKING_ID\\s*=\\s*[\'"][^\'"]*[\'"]',
          replace: `window.GA_TRACKING_ID = '${this.trackingId}'`,
        },
        {
          add: gaScript,
          check: 'googletagmanager',
          position: 'head',
        },
      ],
      '(Marketing Website)'
    );

    // Update production website
    await this.updateFile(
      './website/index.html',
      [
        {
          add: gaScript,
          check: 'googletagmanager',
          position: 'head',
        },
      ],
      '(Production Website)'
    );
  }

  async updateDesktopApp() {
    console.log('💻 Updating desktop app...');

    // Update desktop app HTML
    await this.updateFile(
      './RinaWarp-Production-Final/index.html',
      [
        {
          search: 'G-G424CV5GGT',
          replace: this.trackingId,
        },
      ],
      '(Desktop App)'
    );

    // Update GA init script
    await this.updateFile(
      './public/js/ga4-init.js',
      [
        {
          search: 'const GA4_MEASUREMENT_ID = [\'"][^\'"]*[\'"]',
          replace: `const GA4_MEASUREMENT_ID = '${this.trackingId}'`,
        },
      ],
      '(GA4 Init Script)'
    );

    // Update unified analytics
    await this.updateFile(
      './public/js/analytics-unified.js',
      [
        {
          search: 'GA_TRACKING_ID:\\s*[\'"][^\'"]*[\'"]',
          replace: `GA_TRACKING_ID: '${this.trackingId}'`,
        },
      ],
      '(Unified Analytics)'
    );
  }

  async updateBackendServer() {
    console.log('🖥️  Updating backend server...');

    // Update main server file
    const serverFiles = ['./server.js', './backend/server.js'];

    for (const serverFile of serverFiles) {
      if (fs.existsSync(serverFile)) {
        await this.updateFile(
          serverFile,
          [
            {
              search: 'GA_TRACKING_ID:\\s*[\'"][^\'"]*[\'"]',
              replace: `GA_TRACKING_ID: '${this.trackingId}'`,
            },
          ],
          '(Backend Server)'
        );
      }
    }
  }

  async updateEnvironmentFiles() {
    console.log('📝 Updating environment configuration...');

    const envFiles = ['./production.env', './.env.production', './.env.local'];

    for (const envFile of envFiles) {
      if (fs.existsSync(envFile)) {
        let content = fs.readFileSync(envFile, 'utf8');

        // Update or add GA tracking ID
        if (content.includes('GA_TRACKING_ID') || content.includes('GOOGLE_ANALYTICS_ID')) {
          content = content.replace(/GA_TRACKING_ID=.*/g, `GA_TRACKING_ID=${this.trackingId}`);
          content = content.replace(
            /GOOGLE_ANALYTICS_ID=.*/g,
            `GOOGLE_ANALYTICS_ID=${this.trackingId}`
          );
        } else {
          content += `\n# Google Analytics 4\nGA_TRACKING_ID=${this.trackingId}\nGOOGLE_ANALYTICS_ID=${this.trackingId}\n`;
        }

        fs.writeFileSync(envFile, content);
        console.log(`✅ Updated ${envFile}`);
        this.updatedFiles.push(envFile);
      }
    }
  }

  async updateAnalyticsScripts() {
    console.log('📊 Updating analytics scripts...');

    // Update all analytics-related files
    const analyticsFiles = [
      './public/js/analytics/advanced-analytics.js',
      './public/js/analytics/ga4-enhanced-tracking.js',
      './public/js/analytics/conversion-funnel.js',
      './src/analytics/ga4-enhanced-tracking.js',
    ];

    for (const file of analyticsFiles) {
      if (fs.existsSync(file)) {
        await this.updateFile(
          file,
          [
            {
              search: 'G-G424CV5GGT',
              replace: this.trackingId,
            },
          ],
          '(Analytics Script)'
        );
      }
    }
  }

  async deployToLiveServer() {
    console.log('🚀 Deploying to live server...');

    // Update the live website with new GA configuration
    if (this.trackingId !== 'G-PLACEHOLDER') {
      console.log('📤 Uploading updated website to rinawarptech.com...');

      // This would typically use SCP or rsync to deploy
      console.log('ℹ️  Manual deployment required:');
      console.log('   - Upload updated website files to your server');
      console.log('   - Restart your backend service with new environment variables');
    }
  }

  showSummary() {
    console.log('');
    console.log('✅ Google Analytics Configuration Complete!');
    console.log('==========================================');
    console.log('');
    console.log(`📊 Tracking ID: ${this.trackingId}`);
    console.log(`📁 Files Updated: ${this.updatedFiles.length}`);
    console.log(`❌ Errors: ${this.errors.length}`);
    console.log('');

    if (this.updatedFiles.length > 0) {
      console.log('📝 Updated files:');
      this.updatedFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
    }

    if (this.errors.length > 0) {
      console.log('');
      console.log('❌ Errors encountered:');
      this.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }

    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Test tracking: node scripts/test-google-analytics.cjs');
    console.log('2. Deploy changes to production');
    console.log('3. Monitor Real-Time reports in GA dashboard');
    console.log('4. Set up conversion goals and audiences');

    if (this.trackingId === 'G-PLACEHOLDER') {
      console.log('');
      console.log('⚠️  Remember to replace G-PLACEHOLDER with your real GA tracking ID!');
    }
  }
}

// Run the configuration
const configurator = new GAConfigurator();
configurator.configure().catch(console.error);
