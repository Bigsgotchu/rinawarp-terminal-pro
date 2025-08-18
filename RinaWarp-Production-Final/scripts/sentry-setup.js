#!/usr/bin/env node
/**
 * RinaWarp Terminal - Sentry Project Setup Assistant
 * Helps with the complete Sentry setup process
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SentrySetupAssistant {
  constructor() {
    this.orgSlug = 'rinawarp-technologies-llc';
    this.baseUrl = 'https://rinawarp-technologies-llc.sentry.io';
    this.projectsUrl = `${this.baseUrl}/settings/projects/`;
  }

  /**
   * Display the complete setup guide
   */
  displaySetupGuide() {
    console.log(`
🚀 RinaWarp Terminal - Sentry Setup Assistant
============================================

✅ COMPLETED PREPARATIONS:
• Sentry CLI installed and configured
• Environment configuration file created (.env.sentry)
• Electron Sentry config updated (sentry-main.js)
• Backend Sentry config created (backend/sentry-backend.js)
• @sentry/node dependency added to backend

🎯 NEXT STEPS - CREATE PROJECTS IN WEB INTERFACE:

📋 Step 1: Create Electron Project
• Go to: ${this.projectsUrl}
• Click "Create Project"
• Platform: "Electron" or "Desktop"
• Project Name: "rinawarp-terminal-electron"
• Team: "${this.orgSlug}"
• Alert Settings: High priority, 10+ occurrences/minute, Email notifications

📋 Step 2: Create Backend Project
• Click "Create Project" again
• Platform: "Node.js"  
• Project Name: "rinawarp-terminal-api"
• Team: "${this.orgSlug}"
• Same alert settings

📋 Step 3: Copy DSN Keys
After creating each project, you'll get DSN URLs like:
https://abc123@o4509759648149504.ingest.us.sentry.io/PROJECT_ID

🔧 Step 4: Update Environment Variables
Edit the .env.sentry file and replace the placeholder DSNs:

SENTRY_DSN_ELECTRON=https://YOUR_ELECTRON_DSN_HERE@o4509759648149504.ingest.us.sentry.io/PROJECT_ID
SENTRY_DSN_BACKEND=https://YOUR_BACKEND_DSN_HERE@o4509759648149504.ingest.us.sentry.io/PROJECT_ID

📦 Step 5: Load Environment Variables
Add this to your main.js (Electron) and server.js (Backend):
require('dotenv').config({ path: '.env.sentry' });

🔍 Step 6: Verify Setup
Run: node scripts/sentry-setup.js verify

🚀 QUICK COMMANDS:
node scripts/sentry-setup.js guide    # Show this guide
node scripts/sentry-setup.js verify   # Verify configuration  
node scripts/sentry-setup.js test     # Test Sentry connection
node scripts/sentry-setup.js issues   # Open issues dashboard

Ready to create your projects? Go to: ${this.projectsUrl}
        `);
  }

  /**
   * Verify Sentry configuration
   */
  verifySetup() {
    console.log('🔍 Verifying Sentry setup...\n');

    const checks = [
      this.checkSentryCliConfig(),
      this.checkEnvironmentFile(),
      this.checkElectronConfig(),
      this.checkBackendConfig(),
      this.checkDependencies(),
    ];

    const passed = checks.filter(check => check).length;
    const total = checks.length;

    console.log(`\n📊 Setup Status: ${passed}/${total} checks passed\n`);

    if (passed === total) {
      console.log('✅ Setup is complete! Ready to create projects in web interface.');
      console.log(`   Go to: ${this.projectsUrl}`);
    } else {
      console.log('⚠️  Some issues need attention. Please resolve them and verify again.');
    }

    return passed === total;
  }

  checkSentryCliConfig() {
    try {
      const configPath = path.join(process.cwd(), '.sentryclirc');
      if (fs.existsSync(configPath)) {
        console.log('✅ Sentry CLI config (.sentryclirc) exists');
        return true;
      } else {
        console.log('❌ Sentry CLI config (.sentryclirc) missing');
        return false;
      }
    } catch (error) {
      console.log('❌ Error checking Sentry CLI config:', error.message);
      return false;
    }
  }

  checkEnvironmentFile() {
    try {
      const envPath = path.join(process.cwd(), '.env.sentry');
      if (fs.existsSync(envPath)) {
        console.log('✅ Environment config (.env.sentry) exists');
        const content = fs.readFileSync(envPath, 'utf8');
        if (content.includes('YOUR_ELECTRON_DSN_HERE')) {
          console.log('⚠️  Environment file needs DSN URLs updated');
          return false;
        }
        return true;
      } else {
        console.log('❌ Environment config (.env.sentry) missing');
        return false;
      }
    } catch (error) {
      console.log('❌ Error checking environment file:', error.message);
      return false;
    }
  }

  checkElectronConfig() {
    try {
      const configPath = path.join(process.cwd(), 'sentry-main.js');
      if (fs.existsSync(configPath)) {
        console.log('✅ Electron Sentry config (sentry-main.js) exists');
        return true;
      } else {
        console.log('❌ Electron Sentry config (sentry-main.js) missing');
        return false;
      }
    } catch (error) {
      console.log('❌ Error checking Electron config:', error.message);
      return false;
    }
  }

  checkBackendConfig() {
    try {
      const configPath = path.join(process.cwd(), 'backend', 'sentry-backend.js');
      if (fs.existsSync(configPath)) {
        console.log('✅ Backend Sentry config (backend/sentry-backend.js) exists');
        return true;
      } else {
        console.log('❌ Backend Sentry config (backend/sentry-backend.js) missing');
        return false;
      }
    } catch (error) {
      console.log('❌ Error checking backend config:', error.message);
      return false;
    }
  }

  checkDependencies() {
    try {
      // Check main package.json
      const mainPkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
      const hasElectronSentry = mainPkg.dependencies && mainPkg.dependencies['@sentry/electron'];

      // Check backend package.json
      const backendPkg = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'backend', 'package.json'), 'utf8')
      );
      const hasNodeSentry = backendPkg.dependencies && backendPkg.dependencies['@sentry/node'];

      if (hasElectronSentry && hasNodeSentry) {
        console.log('✅ Sentry dependencies installed');
        return true;
      } else {
        console.log('❌ Missing Sentry dependencies');
        if (!hasElectronSentry) console.log('   - Missing @sentry/electron in main package.json');
        if (!hasNodeSentry) console.log('   - Missing @sentry/node in backend package.json');
        return false;
      }
    } catch (error) {
      console.log('❌ Error checking dependencies:', error.message);
      return false;
    }
  }

  /**
   * Test Sentry connection (after DSNs are configured)
   */
  testConnection() {
    console.log('🧪 Testing Sentry connection...\n');

    try {
      // Load environment variables
      const envPath = path.join(process.cwd(), '.env.sentry');
      if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });

        if (process.env.SENTRY_DSN_ELECTRON && !process.env.SENTRY_DSN_ELECTRON.includes('YOUR_')) {
          console.log('🔌 Testing Electron project connection...');

          // Initialize Sentry and send test event
          const { initSentryMain, captureMainMessage } = require('../sentry-main');
          const success = initSentryMain();

          if (success) {
            captureMainMessage('Sentry setup test - Electron project', 'info', {
              tags: { test: 'setup-verification' },
            });
            console.log('✅ Electron test event sent');
          }
        } else {
          console.log('⚠️  Electron DSN not configured');
        }

        if (process.env.SENTRY_DSN_BACKEND && !process.env.SENTRY_DSN_BACKEND.includes('YOUR_')) {
          console.log('🔌 Testing Backend project connection...');

          // Test backend connection
          const { initSentryBackend, captureBackendMessage } = require('../backend/sentry-backend');
          const success = initSentryBackend();

          if (success) {
            captureBackendMessage('Sentry setup test - Backend project', 'info', {
              tags: { test: 'setup-verification' },
            });
            console.log('✅ Backend test event sent');
          }
        } else {
          console.log('⚠️  Backend DSN not configured');
        }

        console.log('\\n🎯 Check your Sentry dashboard to see the test events!');
        console.log(`   ${this.baseUrl}/issues/`);
      } else {
        console.log('❌ Environment file not found. Run setup first.');
      }
    } catch (error) {
      console.log('❌ Error testing connection:', error.message);
    }
  }

  /**
   * Open Sentry dashboard
   */
  openDashboard() {
    const urls = [
      `Projects: ${this.projectsUrl}`,
      `Issues: ${this.baseUrl}/issues/`,
      `Organization: ${this.baseUrl}/settings/`,
    ];

    console.log('🌐 Sentry Dashboard URLs:');
    urls.forEach(url => console.log(`   ${url}`));

    // Try to open in browser (macOS)
    try {
      execSync(`open "${this.projectsUrl}"`);
      console.log('\\n✅ Opened projects page in browser');
    } catch (error) {
      console.log('\\n⚠️  Could not auto-open browser. Please visit the URLs manually.');
    }
  }
}

// CLI Interface
const assistant = new SentrySetupAssistant();
const command = process.argv[2];

switch (command) {
  case 'guide':
  case undefined:
    assistant.displaySetupGuide();
    break;

  case 'verify':
    assistant.verifySetup();
    break;

  case 'test':
    assistant.testConnection();
    break;

  case 'issues':
  case 'dashboard':
    assistant.openDashboard();
    break;

  default:
    console.log('Unknown command. Available commands:');
    console.log('  guide    - Show setup guide');
    console.log('  verify   - Verify configuration');
    console.log('  test     - Test Sentry connection');
    console.log('  issues   - Open Sentry dashboard');
}
