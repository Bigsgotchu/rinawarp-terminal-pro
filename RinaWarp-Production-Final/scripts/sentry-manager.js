#!/usr/bin/env node
/**
 * RinaWarp Terminal - Sentry Issues Management Tool
 * Helps manage, analyze, and resolve Sentry error tickets
 */

const fs = require('fs');
const path = require('path');

class SentryIssueManager {
  constructor() {
    this.projectId = '4509759649087488';
    this.baseUrl = 'https://rinawarp-technologies-llc.sentry.io';
    this.issuesUrl = `${this.baseUrl}/issues/?project=${this.projectId}`;
  }

  /**
   * Display help for working with Sentry issues
   */
  displayHelp() {
    console.log(`
🎯 RinaWarp Terminal - Sentry Issues Management Guide
==================================================

📊 Your Sentry Dashboard: ${this.issuesUrl}

🔧 WORKFLOW FOR RESOLVING SENTRY ISSUES:

1️⃣  ACCESS ISSUES:
   • Visit: ${this.issuesUrl}
   • Sign in with your credentials
   • Review the Issues tab

2️⃣  TRIAGE ISSUES:
   • Sort by frequency (most common first)
   • Review stack traces and context
   • Categorize: Critical | Error | Warning | Info

3️⃣  ANALYZE EACH ISSUE:
   • Check error frequency and trends
   • Review user impact and affected users
   • Look at breadcrumbs for user actions before error
   • Check if it's environment-specific (dev/prod)

4️⃣  FIX ISSUES:
   • Reproduce the issue locally if possible
   • Implement fix in your codebase
   • Test thoroughly
   • Deploy the fix

5️⃣  CLOSE ISSUES:
   • Mark as "Resolved" once fixed and deployed
   • Mark as "Ignored" if it's a false positive
   • Add comments explaining the resolution

📋 COMMON ISSUE CATEGORIES TO LOOK FOR:

🔴 CRITICAL (Fix immediately):
   • Application crashes
   • Database connection errors
   • Authentication failures
   • Data corruption issues

🟠 HIGH PRIORITY:
   • AI API failures
   • Terminal functionality errors
   • File system errors
   • Performance issues

🟡 MEDIUM PRIORITY:
   • UI rendering issues
   • Non-critical feature failures
   • Validation errors

🟢 LOW PRIORITY:
   • Console warnings
   • Network timeouts (sporadic)
   • Browser compatibility issues

⚠️  FALSE POSITIVES (Ignore):
   • ResizeObserver loop exceeded
   • Network disconnection errors
   • Browser extension interference

🛠️  RESOLUTION STRATEGIES:

For JavaScript Errors:
   • Add try-catch blocks
   • Improve error handling
   • Add user-friendly error messages

For Network Errors:
   • Add retry logic
   • Implement offline detection
   • Add proper loading states

For Performance Issues:
   • Optimize heavy operations
   • Add debouncing/throttling
   • Implement lazy loading

For AI API Errors:
   • Add API key validation
   • Implement fallback providers
   • Add rate limiting awareness

🔍 DEBUGGING TOOLS AVAILABLE:

Local Debugging:
   npm run dev     # Start in debug mode
   F12            # Open DevTools
   console.error() # Check browser console

Sentry Features:
   • Stack traces
   • Breadcrumbs
   • User context
   • Performance data
   • Release tracking

📊 MONITORING AFTER FIXES:

   • Monitor issue trends after deployment
   • Set up alerts for critical errors
   • Review weekly error summaries
   • Track error reduction metrics

🚀 NEXT STEPS:

1. Set up environment variables (create .env file)
2. Add your actual Sentry DSN
3. Run: npm run dev
4. Visit your issues dashboard
5. Start triaging and fixing!

Need help with specific errors? Run this script with error details!
        `);
  }

  /**
   * Check if Sentry is properly configured
   */
  checkSentryConfig() {
    console.log('🔍 Checking Sentry configuration...\n');

    const envPath = path.join(__dirname, '..', '.env');
    const envExamplePath = path.join(__dirname, '..', '.env.example');

    // Check if .env exists
    if (!fs.existsSync(envPath)) {
      console.log('❌ .env file not found');
      console.log(`✅ Solution: Copy ${envExamplePath} to .env and add your Sentry DSN\n`);

      if (fs.existsSync(envExamplePath)) {
        console.log('📝 Example .env content:');
        const envExample = fs.readFileSync(envExamplePath, 'utf8');
        console.log(envExample.split('\n').slice(30, 35).join('\n'));
      }
      return false;
    }

    // Check if Sentry DSN is configured
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasSentryDSN =
      envContent.includes('SENTRY_DSN=') && !envContent.includes('your-sentry-dsn-here');

    if (hasSentryDSN) {
      console.log('✅ Sentry DSN configured');
    } else {
      console.log('❌ Sentry DSN not configured');
      console.log('✅ Solution: Update SENTRY_DSN in your .env file');
    }

    return hasSentryDSN;
  }

  /**
   * Generate issue resolution template
   */
  generateIssueTemplate(errorType = 'general') {
    const templates = {
      javascript: `
// Issue Resolution: JavaScript Error
// 1. Add try-catch block
try {
    // Your existing code here
} catch (error) {
    console.error('Specific operation failed:', error);
    // Add user-friendly error handling
    showUserFriendlyError('Something went wrong. Please try again.');
    
    // Report to Sentry with context
    captureException(error, {
        tags: { component: 'your-component' },
        extra: { userAction: 'describe-what-user-was-doing' }
    });
}
            `,
      network: `
// Issue Resolution: Network Error
async function makeNetworkRequest(url, options = {}) {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            return await response.json();
        } catch (error) {
            attempt++;
            console.warn('Network request attempt ' + attempt + ' failed:', error);
            
            if (attempt >= maxRetries) {
                // Final failure - report to Sentry
                captureException(error, {
                    tags: { type: 'network', url },
                    extra: { attempt, maxRetries }
                });
                throw error;
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}
            `,
      performance: `
// Issue Resolution: Performance Error
import { debounce } from 'lodash';

// For heavy operations, add debouncing
const debouncedFunction = debounce(async (params) => {
    try {
        // Your heavy operation here
        const result = await heavyOperation(params);
        return result;
    } catch (error) {
        captureException(error, {
            tags: { type: 'performance' },
            extra: { operation: 'heavy-operation' }
        });
        throw error;
    }
}, 300);

// For UI updates, use requestAnimationFrame
function smoothUpdate(callback) {
    requestAnimationFrame(() => {
        try {
            callback();
        } catch (error) {
            captureException(error, {
                tags: { type: 'ui-update' }
            });
        }
    });
}
            `,
    };

    const template = templates[errorType] || templates.javascript;
    console.log(`📝 Issue Resolution Template (${errorType}):`);
    console.log(template);
  }

  /**
   * Run diagnostics
   */
  runDiagnostics() {
    console.log('🏥 Running Sentry diagnostics...\n');

    const isConfigured = this.checkSentryConfig();

    console.log('\n🔧 Recommended Actions:');
    if (!isConfigured) {
      console.log('1. Configure Sentry DSN in .env file');
      console.log('2. Restart your application');
    }
    console.log('3. Visit your Sentry dashboard:', this.issuesUrl);
    console.log('4. Review and triage open issues');
    console.log('5. Implement fixes using provided templates');
    console.log('6. Test fixes and mark issues as resolved');
  }
}

// CLI Interface
const manager = new SentryIssueManager();

const command = process.argv[2];
const subCommand = process.argv[3];

switch (command) {
  case 'help':
  case undefined:
    manager.displayHelp();
    break;

  case 'check':
    manager.runDiagnostics();
    break;

  case 'template':
    manager.generateIssueTemplate(subCommand);
    break;

  default:
    console.log('Unknown command. Use: node sentry-manager.js help');
}
